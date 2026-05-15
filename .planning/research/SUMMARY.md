# Research Summary

## Stack

The requested Symfony 7 plus Python 3.12 split is appropriate. Symfony should own API, persistence, queue dispatch, and product boundaries; Python should own demo parsing, feature extraction, scoring, dataset preparation, and training. PostgreSQL and Redis are sufficient for v1 coordination.

## Table Stakes

- Repeatable Docker Compose infrastructure with non-root containers and healthchecks.
- Symfony entities, migrations, REST endpoints, and Messenger handlers.
- Redis queue contract consumed by Python with BRPOP.
- Python parser adapter, feature extractors, weighted scorer, and worker error handling.
- CS2CD dataset preparation and AntiCheatPT_256-style model scaffold.
- Makefile, `.env.example`, recoil pattern seed data, README, and ignore rules.

## Watch Out For

- Demo parser drift and missing event fields.
- False certainty in cheat labels.
- Redis payload drift between Symfony and Python.
- Demos stuck in processing after worker crashes.
- ML effort blocking the simpler weighted scoring flow.
- Dataset DOI mismatch: the live Hugging Face dataset page currently shows `10.57967/hf/5654`, while the project brief mentions `10.57967/hf/5315`.

## Source Links

- AntiCheatPT: https://arxiv.org/abs/2508.06348
- CS2CD organization: https://huggingface.co/CS2CD
- CS2CD dataset: https://huggingface.co/datasets/CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection
- AntiCheatPT_256 model: https://huggingface.co/CS2CD/AntiCheatPT_256
