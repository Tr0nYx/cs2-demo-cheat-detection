# Stack Research

## Recommendation

Use the requested two-runtime architecture:

- Symfony 7 on PHP 8.3-FPM for API, domain model, Doctrine persistence, Messenger dispatch, validation, serialization, CORS, CLI, and later web UI.
- Python 3.12 for `demoparser2`, numeric feature extraction, statistical scoring, dataset preparation, and PyTorch training.
- PostgreSQL 16 as the canonical database for demos, players, analysis results, state transitions, and feature JSON.
- Redis 7 as async queue and cache, with an explicit worker queue contract shared between Symfony and Python.
- Docker Compose as the local production-like baseline.

## Rationale

This split keeps long-running numeric analysis out of PHP request lifecycles while still letting Symfony own the product boundary. Redis queue payloads are simple enough to inspect and replay, and PostgreSQL gives a durable coordination point for status, result ingestion, and failure reporting.

## Notes

- Python should not expose an HTTP service in v1. A BRPOP worker is enough and matches the brief.
- Use JSON schemas or typed DTOs for queue payloads so Symfony and Python cannot drift silently.
- Keep Python dependencies pinned; `torch`, `datasets`, and `demoparser2` can shift behavior across versions.
- Store raw feature data in JSONB, but keep top-level scores in typed columns for querying.

## Sources

- AntiCheatPT arXiv page: https://arxiv.org/abs/2508.06348
- CS2CD Hugging Face organization: https://huggingface.co/CS2CD
- CS2CD dataset page: https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection
