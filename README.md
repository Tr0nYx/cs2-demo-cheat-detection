# CS2 Demo Cheat Detection

Post-game statistical analysis of Counter-Strike 2 demonstrations using transformer-based deep learning.

## What is This?

CS2 Demo Cheat Detection is a post-game analysis system for Counter-Strike 2 `.dem` files. It parses demo telemetry, extracts statistical and ML-ready behavior signals, and reports player-level suspicion scores for patterns such as aimbot, wallhack, triggerbot, and recoil compensation.

The project is research-oriented and explicitly avoids live cheating detection, memory reading, client tampering, or invasive anti-cheat behavior. Users upload or point to a CS2 demo and receive a reproducible, explainable, player-level cheat suspicion analysis based only on post-game demo data.

**Core value:** Users can analyze a CS2 demo and understand the statistical signals that indicate potential cheating, with no invasive client-side monitoring.

## Quick Start

Get the system running in 5 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/cs2-demo-cheat-detection.git
cd cs2-demo-cheat-detection

# 2. Copy environment file (use defaults or customize)
cp .env.example .env

# 3. Start all services
make up

# 4. Verify installation
make test

# 5. Upload a demo
DEMO_ID=$(curl -s -X POST -F "file=@demo.dem" http://localhost:8080/api/demos | jq -r '.id')

# 6. Check status and results
curl http://localhost:8080/api/demos/$DEMO_ID
```

## Prerequisites and Environment Setup

### System Requirements

- **Docker & Docker Compose:** Required for all services (PHP, PostgreSQL, Redis, Python)
- **Python 3.12+:** Only if running outside Docker
- **Git:** For cloning and version control

### Environment Configuration

Copy `.env.example` to `.env` and optionally customize:

```bash
cp .env.example .env
```

**Key environment variables:**

- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://cs2_app:cs2_demo@postgres:5432/cs2_detection`)
- `REDIS_URL`: Redis connection string (default: `redis://redis:6379/0`)
- `DEMO_STORAGE_PATH`: Location to store uploaded demo files (default: `data/demo-storage`)
- `HF_TOKEN`: Hugging Face API token for dataset access (optional, required for private datasets)
- `ML_SEED`: Random seed for reproducible training (default: `42`)
- `BATCH_SIZE`: Training batch size (default: `128`)
- `LEARNING_RATE`: Initial learning rate for optimizer (default: `0.0001`)
- `NUM_EPOCHS`: Default number of training epochs (default: `50`)

### Service Configuration

The Docker Compose setup includes:

1. **Symfony API (PHP-FPM):** Accepts demo uploads, manages job queue, persists results
2. **PostgreSQL:** Stores demos, players, and analysis results
3. **Redis:** Asynchronous job queue for demo analysis
4. **Python Worker:** Processes analysis jobs, computes suspicion scores
5. **Nginx:** Reverse proxy for the Symfony API

All services start automatically with `make up`.

## API Reference

### POST /api/demos - Upload a Demo

Upload a CS2 demo file for analysis.

**Request:**
```bash
curl -X POST -F "file=@demo.dem" http://localhost:8080/api/demos
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2026-05-15T12:00:00Z"
}
```

### GET /api/demos/{id} - Fetch Demo Status and Results

Check analysis status and retrieve results when complete.

**Request:**
```bash
curl http://localhost:8080/api/demos/550e8400-e29b-41d4-a716-446655440000
```

**Response (200 OK) - Pending:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "created_at": "2026-05-15T12:00:00Z",
  "result": null
}
```

**Response (200 OK) - Complete:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "done",
  "created_at": "2026-05-15T12:00:00Z",
  "result": {
    "suspicion_score": 0.72,
    "label": "suspicious",
    "features": {
      "aimbot_score": 0.85,
      "wallhack_score": 0.45,
      "triggerbot_score": 0.20,
      "recoil_score": 0.80,
      "bhop_score": 0.10,
      "session_consistency_score": 0.65
    },
    "analysis_duration_seconds": 45
  }
}
```

### GET /api/players/{steamId}/history - Fetch Player Analysis History

Retrieve all analysis results for a specific player.

**Request:**
```bash
curl http://localhost:8080/api/players/76561198000000000/history
```

**Response (200 OK):**
```json
{
  "steam_id": "76561198000000000",
  "analyses": [
    {
      "demo_id": "550e8400-e29b-41d4-a716-446655440000",
      "suspicion_score": 0.72,
      "label": "suspicious",
      "created_at": "2026-05-15T12:00:00Z"
    }
  ]
}
```

## End-to-End Example

### Using curl

```bash
#!/bin/bash

# Make sure services are running
make up

# 1. Upload a demo
echo "Uploading demo..."
RESPONSE=$(curl -s -X POST -F "file=@demo.dem" http://localhost:8080/api/demos)
DEMO_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Demo ID: $DEMO_ID"

# 2. Poll status (with 30-second timeout)
echo "Waiting for analysis..."
for i in {1..30}; do
  STATUS=$(curl -s http://localhost:8080/api/demos/$DEMO_ID | jq -r '.status')
  if [ "$STATUS" = "done" ]; then
    echo "Analysis complete!"
    break
  fi
  echo "Status: $STATUS (attempt $i/30)"
  sleep 1
done

# 3. Retrieve results
echo "Results:"
curl -s http://localhost:8080/api/demos/$DEMO_ID | jq '.result'
```

### Using Python

```python
import requests
import time
import json

# Base URL
BASE_URL = "http://localhost:8080/api"

# 1. Upload demo
print("Uploading demo...")
with open("demo.dem", "rb") as f:
    response = requests.post(f"{BASE_URL}/demos", files={"file": f})
    
demo = response.json()
demo_id = demo["id"]
print(f"Demo ID: {demo_id}")

# 2. Poll status
print("Waiting for analysis...")
max_attempts = 30
for attempt in range(max_attempts):
    response = requests.get(f"{BASE_URL}/demos/{demo_id}")
    status = response.json()["status"]
    
    if status == "done":
        print("Analysis complete!")
        break
    
    print(f"Status: {status} (attempt {attempt+1}/{max_attempts})")
    time.sleep(1)

# 3. Retrieve results
result = requests.get(f"{BASE_URL}/demos/{demo_id}").json()
print(f"\nSuspicion Score: {result['result']['suspicion_score']:.2%}")
print(f"Label: {result['result']['label']}")
print("\nFeature Breakdown:")
for feature, score in result['result']['features'].items():
    print(f"  {feature}: {score:.2%}")
```

## Architecture Overview

The system uses a modular architecture that separates concerns between Symfony (API and job dispatch), Redis (async queueing), Python (analysis and ML), and PostgreSQL (persistence):

**Data Flow:**

1. **User uploads demo** → Symfony API validates and stores file, creates Demo record
2. **Job dispatch** → Symfony writes analysis job to Redis queue
3. **Worker picks up job** → Python worker BRPOPs from queue
4. **Demo parsing** → Python parses CS2 telemetry, extracts ticks and events
5. **Feature extraction** → Python computes behavioral scores (aim patterns, recoil, movement, etc.)
6. **Suspicion scoring** → Weighted aggregation produces final suspicion_score (0.0-1.0) and label
7. **Result persistence** → Python writes AnalysisResult to PostgreSQL
8. **API retrieval** → Symfony serves results via REST API

**Component Responsibilities:**

- **Symfony API:** Handles HTTP, validation, storage abstraction, job dispatch, and result ingestion
- **Redis Queue:** Decouples web request handling from long-running analysis (async, fault-tolerant)
- **Python Worker:** Parses demos, computes features, aggregates scores, logs structured JSON
- **PostgreSQL:** Single source of truth for demos, players, and analysis results
- **ML Pipeline (separate):** Trains AntiCheatPT transformer on CS2CD dataset (not invoked during normal analysis)

**Interaction Example:**

```
User                      Symfony API         Redis Queue      Python Worker      PostgreSQL
  |                             |                   |                 |                |
  |-- POST /api/demos -------->|                   |                 |                |
  |                             |-- validate ------>|                 |                |
  |                             |-- store file ----->|                 |                |
  |                             |-- dispatch to queue ------>|         |                |
  |                             |                   |                 |                |
  |<-- demo_id (queued) --------|                   |                 |                |
  |                             |                   |<- BRPOP --------|                |
  |                             |                   |                 |-- parse ------>|
  |                             |                   |                 |-- score ----->|
  |                             |                   |                 |-- write result->|
  |                             |                   |                 |                |
  |-- GET /api/demos/{id} ---->|                   |                 |-- read ------->|
  |<-- result (done) ----------|                   |                 |                |
```

## Reproducibility Guide

### Random Seed

Set `ML_SEED` in `.env` to ensure deterministic model training:

```bash
ML_SEED=42 make train EPOCHS=50
```

The seed is applied to Python's `random`, NumPy, and PyTorch to ensure identical model initialization and data shuffling across runs.

### Dependencies and Versions

Exact versions are pinned in `python/requirements.txt`:

- **Python:** 3.12
- **PyTorch:** 2.3.0+
- **NumPy:** 1.24+
- **scikit-learn:** 1.4.0+
- **pandas:** 2.0+
- **demoparser2:** Latest from GitHub (for CS2 demo parsing)

**Verify installed versions:**
```bash
docker compose exec python pip list | grep -E "torch|numpy|scikit-learn|pandas"
```

### CS2CD Dataset

The model is trained on the **CS2CD dataset** (DOI: `10.57967/hf/5654`), hosted on Hugging Face.

**Dataset details:**
- **Size:** 90,707 context windows (256x44 feature matrices)
- **Source:** ITU Brainlab / itubrainlab/CS2CD
- **Stratified split:** 70% train, 15% validation, 15% test
- **Access:** Public; optional HF_TOKEN for private mirrors

**Download and cache:**
```bash
# Set HF_TOKEN if using private access
export HF_TOKEN="hf_..."

# Training script caches dataset automatically
make train EPOCHS=50
```

### Augmentation Parameters

Data augmentation is applied during training only (not during analysis):

- **Type:** Per-feature Gaussian noise
- **Scaling factor:** 0.01 (default, configurable via environment)
- **Preservation:** Relative distances between features are preserved

**Configure augmentation:**
```bash
# Modify .env
ML_AUGMENTATION_SCALE=0.02

# Run training with augmentation
make train EPOCHS=50
```

### Deterministic Results

To reproduce results exactly:

```bash
# Set seed and disable randomness
ML_SEED=42 make train EPOCHS=50 --no-augment

# Results will be bit-identical across machines with the same GPU/CPU architecture
```

## AntiCheatPT Paper and CS2CD Dataset

This project implements the architecture and training pipeline described in:

**AntiCheatPT: Transformer-based Detection of Cheating in Counter-Strike 2**  
arXiv: [2508.06348](https://arxiv.org/abs/2508.06348)

**Key contributions:**
- Transformer-based architecture for behavioral cheat detection
- Context window feature engineering (256x44 matrices)
- Evaluated on the public CS2CD dataset with 89.17% accuracy and 93.36% AUC

**Public Dataset:**
- **Name:** CS2CD (Counter-Strike 2 Cheat Detection)
- **DOI:** [10.57967/hf/5654](https://huggingface.co/datasets/itubrainlab/CS2CD)
- **Hugging Face:** [itubrainlab/CS2CD](https://huggingface.co/datasets/itubrainlab/CS2CD)
- **Size:** 90,707 context windows, 50+ GB

The paper provides detailed justification for the feature engineering, architecture choices, and training methodology used in this system.

## Extension Points

### Swapping the Model

The AntiCheatPT architecture is implemented in `python/ml/model.py`. To use a different architecture:

1. **Edit `python/ml/model.py`:**
   ```python
   import torch.nn as nn
   
   class MyCustomModel(nn.Module):
       def __init__(self, input_size=44, output_size=1):
           super().__init__()
           # Your custom architecture here
           self.encoder = nn.Linear(input_size, 128)
           self.decoder = nn.Linear(128, output_size)
       
       def forward(self, x):
           return self.decoder(self.encoder(x))
   ```

2. **Update `python/ml/model.py` `create_model()` function** to return your custom model

3. **Retrain:**
   ```bash
   make train EPOCHS=50
   ```

### Adding Feature Extractors

Feature extraction happens in `python/features/`. To add a new behavioral signal:

1. **Create a new feature module** (`python/features/my_signal.py`):
   ```python
   from abc import ABC, abstractmethod
   
   class FeatureExtractor(ABC):
       @abstractmethod
       def extract(self, demo_data) -> dict:
           """Return {'score': float, 'raw_features': {...}}"""
   
   class MySignalExtractor(FeatureExtractor):
       def extract(self, demo_data):
           # Analyze demo_data for your signal
           score = compute_score(demo_data)
           return {
               'score': min(1.0, max(0.0, score)),  # Normalize to [0, 1]
               'raw_features': {'signal_metric': score}
           }
   ```

2. **Integrate into `python/features/__init__.py`:**
   ```python
   from .my_signal import MySignalExtractor
   
   EXTRACTORS = [
       AimbotExtractor(),
       MySignalExtractor(),
       # ...
   ]
   ```

3. **Update weighted scoring** in `python/scoring.py` to include your feature

### Modifying Augmentation

Data augmentation is configured in `python/ml/dataset.py`. To change augmentation strategy:

1. **Edit `python/ml/dataset.py`:**
   ```python
   class Augmentation:
       def __init__(self, noise_scale=0.01):
           self.noise_scale = noise_scale
       
       def augment(self, X):
           # Replace with your augmentation strategy
           return X + np.random.normal(0, self.noise_scale, X.shape)
   ```

2. **Update configuration** in `python/ml/config.py` or `.env`

3. **Retrain:**
   ```bash
   make train EPOCHS=50
   ```

### Adjusting Hyperparameters

Hyperparameters are configured via environment variables and `python/ml/config.py`:

**Via `.env`:**
```bash
BATCH_SIZE=256
LEARNING_RATE=0.0005
NUM_EPOCHS=100
ML_SEED=123
STEP_SIZE=10
GAMMA=0.1
```

**Via `python/ml/config.py`:**
```python
class MLConfig:
    D_MODEL = 256          # Embedding dimension
    NHEAD = 8              # Number of attention heads
    NUM_ENCODER_LAYERS = 6 # Transformer depth
    DIM_FEEDFORWARD = 2048 # FFN hidden dimension
    DROPOUT = 0.1          # Dropout rate
```

**Retrain with custom parameters:**
```bash
make train EPOCHS=200 LEARNING_RATE=0.0001 BATCH_SIZE=64
```

## Troubleshooting FAQ

### Services Won't Start

**Problem:** `docker compose up` fails or services are unhealthy

**Solution:**
```bash
# Check Docker daemon is running
docker ps

# Check port availability (default: 8080 for Nginx)
lsof -i :8080  # macOS/Linux
netstat -ano | grep :8080  # Windows

# Verify disk space
df -h  # macOS/Linux
dir  # Windows (check free space)

# Try clean rebuild
make clean
make build
make up
```

### Python Worker is Idle

**Problem:** Worker starts but doesn't process jobs

**Solution:**
```bash
# Check WORKER_IDLE_ON_START in .env
grep WORKER_IDLE_ON_START .env

# If true, restart worker to pick up jobs
docker compose restart python

# Check logs
make logs | grep python
```

### Database Migration Errors

**Problem:** PostgreSQL connection fails or migrations don't run

**Solution:**
```bash
# Ensure PostgreSQL is running
docker compose ps postgres

# Run migrations manually
docker compose exec php php bin/console doctrine:migrations:migrate

# Check database exists
docker compose exec postgres psql -U cs2_app -d cs2_detection -c "SELECT 1"
```

### HF_TOKEN Authentication Failure

**Problem:** Dataset download fails with auth error

**Solution:**
```bash
# Ensure HF_TOKEN is set in .env
echo $HF_TOKEN

# Get token from: https://huggingface.co/settings/tokens
# Update .env and restart
docker compose restart python

# Test dataset access
docker compose exec python python -c "from datasets import load_dataset; load_dataset('itubrainlab/CS2CD')"
```

### Test Failures

**Problem:** `make test` or `make test-python` fails

**Solution:**
```bash
# Verify all services are running
docker compose ps

# Check for stale containers or volumes
make clean
make up

# Run individual test suites with verbose output
docker compose exec -T python pytest python/tests/ -v

# Check coverage
docker compose exec -T python pytest python/tests/ --cov=python --cov-report=term-missing
```

### Model Training is Slow or Crashes

**Problem:** Training takes too long or runs out of memory

**Solution:**
```bash
# Reduce batch size and epochs
make train BATCH_SIZE=32 EPOCHS=10

# Use CPU instead of GPU
docker compose exec -T python python python/ml/train.py --device cpu --epochs 10

# Check available GPU memory
docker compose exec -T python nvidia-smi

# Monitor container memory usage
docker compose stats python
```

## Contributing

### Code Style and Quality

**PHP Code:** Formatted via PHP-CS-Fixer
```bash
make format  # Auto-fix PHP and Python style
```

**Python Code:** Formatted via Black, checked via Pylint
```bash
make lint    # Check style violations
make format  # Auto-fix
```

### Running Tests Locally

**All tests:**
```bash
make test  # Equivalent to make test-all
```

**Specific test suites:**
```bash
make test-php     # PHP/Symfony tests
make test-python  # Python worker and features
make test-ml      # ML pipeline and training
```

**With coverage reporting:**
```bash
docker compose exec -T python pytest python/tests/ --cov=python --cov-report=html
open htmlcov/index.html
```

### Coverage Requirements

- **Python:** Minimum 80% line coverage
- **PHP:** Minimum 75% line coverage
- Coverage is checked in CI and blocks merge if below threshold

### Commit Message Format

Follow conventional commit style:

```
feat: add new feature
fix: resolve bug
docs: update documentation
test: add or improve tests
refactor: restructure code without behavior change
chore: dependency or config update
```

Example:
```
feat(ml): add L2 regularization to transformer model

Adds configurable L2 regularization to prevent overfitting.
Controlled via ML_L2_LAMBDA environment variable (default 0.0001).
```

### Submitting a Pull Request

1. **Create feature branch:** `git checkout -b feature/your-feature-name`
2. **Make changes and commit:** Follow commit format above
3. **Run tests locally:** `make test-all`
4. **Push and create PR:** Tests and coverage gates run automatically in CI
5. **Address feedback:** Push additional commits (no squash needed)
6. **Merge:** Maintainers merge after approval

## Manual Testing Guide

This guide shows how to verify the full analysis pipeline end-to-end with real data.

### Prerequisites

- Services running: `make up`
- Sample CS2 demo (optional; test with any .dem file)
- PostgreSQL client (included in Docker)

### Step-by-Step

**1. Configure environment (optional)**

```bash
# Edit .env if you need HF_TOKEN for dataset access
nano .env
```

**2. Start services**

```bash
make up
```

**3. Obtain a sample CS2 demo**

You can use your own demo or download a public example:
```bash
# Example: download a demo (replace URL with real source)
wget -O demo.dem https://example-demo-repository/sample.dem
```

**4. Analyze the demo locally**

```bash
# This bypasses Redis queue and writes results directly to PostgreSQL
make analyze-demo FILE=demo.dem
```

**5. Verify results in PostgreSQL**

```bash
# Connect to PostgreSQL
docker compose exec postgres psql -U cs2_app -d cs2_detection

# Check analysis results
SELECT id, status, created_at FROM demo LIMIT 5;
SELECT demo_id, suspicion_score, label FROM analysis_result LIMIT 5;

# Exit
\q
```

**6. Verify results via API**

```bash
# Get the demo ID from PostgreSQL, then query the API
curl http://localhost:8080/api/demos/{demo_id}
```

**7. Check logs for worker output**

```bash
# View Python worker logs with structured events
make logs | grep -E "python.*event|python.*suspicion"
```

**8. (Optional) Run full ML training**

```bash
# Train a fresh model
make train EPOCHS=10

# Check output directory
ls -la data/models/
```

### Expected Results

After running the manual test, you should see:

✓ Demo uploaded and queued  
✓ Python worker picked up job  
✓ Analysis completed with suspicion score (0.0-1.0)  
✓ Results persisted to PostgreSQL  
✓ Results available via REST API  
✓ Structured JSON logs with timestamps and events  

---

**Last updated:** 2026-05-15  
**Version:** 1.0  
**License:** MIT
