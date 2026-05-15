"""Training entrypoint for AntiCheatTransformer.

Implements the complete training loop with MSE loss, AdamW optimizer, StepLR scheduler,
best-model checkpointing, and structured JSON logging.

Usage:
    python python/ml/train.py --epochs 50 --batch-size 128 --output-dir data/models/
    python python/ml/train.py --help
"""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from ml.config import load_config
from ml.dataset import load_cs2cd_dataset, prepare_dataloaders
from ml.model import create_model, set_seed


def log_event(event: str, **fields) -> None:
    """Log structured event as JSON (per D-21).

    Args:
        event: Event name (e.g., "epoch_start", "batch_loss", "checkpoint_saved")
        **fields: Additional fields to include in log (epoch, batch, loss, etc.)
    """
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event": event,
        **fields,
    }
    print(json.dumps(payload, separators=(",", ":")), flush=True)


def train_epoch(
    model: nn.Module,
    train_loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    loss_fn: nn.Module,
    device: torch.device,
    epoch: int = 0,
) -> float:
    """Train for one epoch.

    Args:
        model: AntiCheatTransformer instance
        train_loader: DataLoader for training data
        optimizer: AdamW optimizer (per D-22)
        loss_fn: MSE loss (per D-22)
        device: torch device (cpu or cuda)
        epoch: Current epoch number (for logging)

    Returns:
        Average training loss for the epoch
    """
    model.train()  # Enable dropout during training
    total_loss = 0.0
    num_batches = 0

    log_event("epoch_start", epoch=epoch, learning_rate=optimizer.param_groups[0]["lr"])

    for batch_idx, (X, y) in enumerate(train_loader):
        X, y = X.to(device), y.to(device)

        optimizer.zero_grad()
        logits = model(X)
        loss = loss_fn(logits, y)

        # Check for NaN loss (D-33)
        if torch.isnan(loss):
            log_event(
                "error",
                event="nan_loss",
                epoch=epoch,
                batch=batch_idx,
            )
            raise ValueError(f"NaN loss at epoch {epoch}, batch {batch_idx}")

        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        num_batches += 1

        if batch_idx % 10 == 0:
            log_event(
                "batch_loss",
                epoch=epoch,
                batch=batch_idx,
                loss=loss.item(),
            )

    avg_loss = total_loss / num_batches if num_batches > 0 else float("inf")
    return avg_loss


def validate(
    model: nn.Module,
    val_loader: DataLoader,
    loss_fn: nn.Module,
    device: torch.device,
    epoch: int = 0,
) -> float:
    """Compute validation loss (per D-20, D-19).

    Args:
        model: AntiCheatTransformer instance
        val_loader: DataLoader for validation data
        loss_fn: MSE loss
        device: torch device
        epoch: Current epoch number (for logging)

    Returns:
        Average validation loss
    """
    model.eval()  # Disable dropout during validation
    total_loss = 0.0
    num_batches = 0

    with torch.no_grad():
        for X, y in val_loader:
            X, y = X.to(device), y.to(device)
            logits = model(X)
            loss = loss_fn(logits, y)
            total_loss += loss.item()
            num_batches += 1

    avg_loss = total_loss / num_batches if num_batches > 0 else float("inf")
    log_event("val_loss", epoch=epoch, val_loss=avg_loss)
    return avg_loss


def train_with_checkpoint(
    model: nn.Module,
    train_loader: DataLoader,
    val_loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    scheduler: torch.optim.lr_scheduler.LRScheduler,
    loss_fn: nn.Module,
    num_epochs: int,
    checkpoint_dir: Path,
    device: torch.device,
) -> None:
    """Train model with best-model checkpointing (D-19, D-20, D-34).

    Saves best model by lowest validation loss to checkpoint_dir/model_best.pt.
    Also saves final model to checkpoint_dir/model_final.pt.

    Args:
        model: AntiCheatTransformer instance
        train_loader: DataLoader for training
        val_loader: DataLoader for validation
        optimizer: AdamW optimizer
        scheduler: StepLR scheduler (per D-22)
        loss_fn: MSE loss
        num_epochs: Number of epochs to train
        checkpoint_dir: Directory to save checkpoints
        device: torch device
    """
    best_val_loss = float("inf")
    best_epoch = 0

    checkpoint_dir.mkdir(parents=True, exist_ok=True)

    for epoch in range(num_epochs):
        # Train and validate
        train_loss = train_epoch(model, train_loader, optimizer, loss_fn, device, epoch)
        val_loss = validate(model, val_loader, loss_fn, device, epoch)

        # Checkpoint if validation loss improved (D-20)
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_epoch = epoch
            best_checkpoint = checkpoint_dir / "model_best.pt"
            torch.save(model.state_dict(), str(best_checkpoint))
            log_event(
                "checkpoint_saved",
                path=str(best_checkpoint),
                epoch=epoch,
                val_loss=val_loss,
            )

        # Warn if diverging (D-34)
        if val_loss > best_val_loss * 2.0 and epoch > best_epoch:
            log_event(
                "warning",
                event="validation_divergence",
                current_loss=val_loss,
                best_loss=best_val_loss,
                epoch=epoch,
            )

        # Step scheduler (D-22)
        scheduler.step()

    # Save final checkpoint (D-30)
    final_checkpoint = checkpoint_dir / "model_final.pt"
    torch.save(model.state_dict(), str(final_checkpoint))
    log_event(
        "training_complete",
        best_epoch=best_epoch,
        best_val_loss=best_val_loss,
        final_checkpoint=str(final_checkpoint),
    )


def main():
    """CLI entrypoint for training (D-24)."""
    parser = argparse.ArgumentParser(description="Train AntiCheatTransformer model")
    parser.add_argument("--epochs", type=int, default=50, help="Number of epochs (default 50)")
    parser.add_argument("--batch-size", type=int, default=None, help="Batch size (default from config)")
    parser.add_argument("--learning-rate", type=float, default=None, help="Learning rate (default from config)")
    parser.add_argument("--output-dir", type=str, default=None, help="Output directory for checkpoints")
    parser.add_argument("--no-augment", action="store_true", help="Disable data augmentation")
    parser.add_argument("--device", type=str, default=None, help="Device (cuda or cpu)")

    args = parser.parse_args()

    # Load config
    cfg = load_config()

    # Set seed for reproducibility
    set_seed(cfg.ML_SEED)

    # Setup device
    if args.device:
        device = torch.device(args.device)
    else:
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    log_event("training_start", device=str(device), epochs=args.epochs)

    # Load dataset
    log_event("loading_dataset")
    hf_dataset = load_cs2cd_dataset()

    # Prepare dataloaders
    batch_size = args.batch_size or cfg.BATCH_SIZE
    apply_augmentation = not args.no_augment
    train_loader, val_loader, test_loader, augmentation = prepare_dataloaders(
        hf_dataset,
        apply_augmentation=apply_augmentation,
        batch_size=batch_size,
    )

    log_event(
        "dataloaders_created",
        train_batches=len(train_loader),
        val_batches=len(val_loader),
        test_batches=len(test_loader),
    )

    # Create model
    model = create_model()
    model.to(device)
    log_event("model_created")

    # Loss function: MSE for regression (D-22)
    loss_fn = nn.MSELoss()

    # Optimizer: AdamW (D-22)
    learning_rate = args.learning_rate or cfg.LEARNING_RATE
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)

    # Scheduler: StepLR (D-22)
    scheduler = torch.optim.lr_scheduler.StepLR(
        optimizer,
        step_size=cfg.STEP_SIZE,
        gamma=cfg.GAMMA,
    )

    log_event(
        "training_config",
        optimizer="AdamW",
        learning_rate=learning_rate,
        loss_fn="MSELoss",
        scheduler="StepLR",
        step_size=cfg.STEP_SIZE,
        gamma=cfg.GAMMA,
    )

    # Training loop with checkpointing
    output_dir = Path(args.output_dir or cfg.ML_OUTPUT_DIR)
    train_with_checkpoint(
        model,
        train_loader,
        val_loader,
        optimizer,
        scheduler,
        loss_fn,
        args.epochs,
        output_dir,
        device,
    )

    log_event("training_finished", output_dir=str(output_dir))


if __name__ == "__main__":
    main()
