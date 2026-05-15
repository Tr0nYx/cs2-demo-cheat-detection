# Agent Guide

## Project

CS2 Demo Cheat Detection is a post-game research tool for analyzing Counter-Strike 2 `.dem` files and producing player-level suspicion scores. Read `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and `.planning/STATE.md` before planning or implementing major work.

## Workflow

- Current next step: `$gsd-plan-phase 1`
- Work in roadmap order unless the user explicitly redirects.
- Keep the ethical boundary intact: no live cheats, no memory reading, no client tampering, no ban automation.
- Preserve the Symfony/Python split: Symfony owns API, queue dispatch, persistence, and product boundaries; Python owns parsing, feature extraction, scoring, and ML.
- Use environment variables for secrets and do not commit `.env`, demos, checkpoints, caches, or generated dependencies.

## Quality Bar

- Symfony code should follow the requested Domain, Application, Infrastructure, and UI structure.
- Python code should use type hints, docstrings, abstract feature extractor classes, structured JSON logs, and real implementations.
- Docker services should use healthchecks and non-root runtime users where feasible.
- Any detection label must remain explainable and framed as a research signal, not proof.

## Known Research Anchors

- AntiCheatPT: https://arxiv.org/abs/2508.06348
- CS2CD organization: https://huggingface.co/CS2CD
- CS2CD dataset: https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection

The source brief mentions DOI `10.57967/hf/5315`; the live Hugging Face dataset page currently shows `10.57967/hf/5654`.
