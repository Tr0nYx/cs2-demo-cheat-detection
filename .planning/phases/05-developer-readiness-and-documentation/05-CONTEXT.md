# Phase 5: Developer Readiness and Documentation - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers developer-ready documentation and build infrastructure: a Makefile that exposes both core commands (build, up, test, clean) and advanced targets (analyze-demo, lint, format, train); a README optimized for researchers with reproducibility guide, paper/dataset links, extension points, and end-to-end example walkthrough; recoil pattern data for AK-47 (complete and documented) and M4A4/M4A1-S stubs (complete if available) with metadata (weapon_id, game_version, source, calibrated_date); GitHub Actions CI with test execution, coverage reporting, coverage gates (80% minimum for Python/PHP), and manual testing guide; .gitignore covering generated artifacts (PHP, Python, ML, demo files, environment config).

The phase does NOT include (deferred to v2): interactive web UI, production deployment guide, monitoring/observability setup, performance benchmarking, or API versioning strategy.

</domain>

<decisions>
## Implementation Decisions

### Makefile Design
- **D-01:** Makefile uses a layered approach: core targets (build, up, down, test, clean, help) are exposed and well-documented; advanced targets (analyze-demo, lint, format, train) are available via `make help` and `make <target>` but not prompted in default usage.
- **D-02:** Core targets assume Docker-first development (no local PHP/Python setup required). `make up` starts all services, `make test` runs all tests in containers, `make clean` stops containers and removes artifacts.
- **D-03:** Advanced targets support both Docker and optional local development: `make lint` runs PHP/Python linters in containers; `make format` auto-fixes style via PHP-CS-Fixer + Black; `make train` is a wrapper for `python/ml/train.py` with sensible defaults (epochs=50, output_dir=data/models/).
- **D-04:** `make analyze-demo FILE=path/to/demo.dem` simulates the full analysis pipeline locally (bypasses Redis queue, writes results to PostgreSQL directly). Used for quick testing and verification without the async worker.
- **D-05:** Test targets are explicit and separate: `make test-php` (PHPUnit), `make test-python` (pytest for worker and features), `make test-ml` (pytest for ML pipeline), `make test-all` (all three in sequence). `make test` is an alias for `make test-all` for convenience.
- **D-06:** Makefile includes verbose help output (`make help`) explaining each target, its prerequisites, and common flags/options.

### README Structure and Audience
- **D-07:** README is optimized for researchers and practitioners extending the system. Primary audience: someone who cloned the repo, understands the AntiCheatPT paper, and wants to integrate or modify the pipeline.
- **D-08:** README includes these sections (in order): (1) What is this?, (2) Quick start (clone, .env, `make up`, `make test`), (3) Prerequisites and Environment Setup, (4) API Reference (upload, status, retrieve results), (5) End-to-End Example (curl/Python walkthrough with sample JSON), (6) Architecture Overview (system diagram or text description), (7) Reproducibility Guide (random seeds, dataset version, dependency versions), (8) AntiCheatPT Paper and CS2CD Dataset Links, (9) Extension Points (swap model, add feature extractors, tune augmentation), (10) Troubleshooting FAQ, (11) Contributing (tests, code style, commit conventions).
- **D-09:** Architecture overview is a text description (not a diagram tool) embedded in the README. It covers: Symfony API → Redis queue → Python worker → PostgreSQL persistence, plus the ML training pipeline and recoil pattern integration.
- **D-10:** End-to-end example walks through: create .env from .env.example, start services with `make up`, upload a demo via curl or Python, poll status, retrieve results, and interpret the analysis (suspicion score, feature contributions).
- **D-11:** Reproducibility guide documents: random seed in .env, exact Python/PyTorch versions (from requirements.txt), CS2CD dataset DOI (10.57967/hf/5654), ML augmentation parameters (scaling factor 0.01 by default), and how to ensure deterministic results across runs.
- **D-12:** Extension points section explains: (a) how to swap nn.Transformer for a different model (modify python/ml/model.py, retrain), (b) how to add new feature extractors (extend abstract FeatureExtractor class), (c) how to modify augmentation (edit python/ml/dataset.py), (d) how to adjust hyperparameters (modify .env or python/ml/config.py).

### Recoil Pattern Data
- **D-13:** Recoil patterns are stored as structured Python data (Pydantic models or dataclasses) in `python/data/recoil_patterns/`. Each weapon file (ak47.py, m4a4.py, m4a1_s.py) exports a RecoilPattern dataclass with fields: weapon_id, name, game_version, source, calibrated_date, spray_pattern (list of [x, y] vectors).
- **D-14:** AK-47 data is complete and realistic (researched/validated from CS2 or community data). M4A4 and M4A1-S are complete if publicly available; otherwise minimal but functional placeholders are acceptable (simple curves, ~5-10 ticks).
- **D-15:** Metadata is included in each RecoilPattern: weapon_id (string, e.g., "ak47"), name (human-readable), game_version (e.g., "CS2" or "CS:GO"), source (e.g., "Community spray tests, 2025"), calibrated_date (ISO 8601 date).
- **D-16:** Recoil patterns are imported and validated in python/features/recoil.py during initialization. Invalid patterns (missing weapon_id, empty spray_pattern) raise clear errors at import time.
- **D-17:** Phase 5 includes tests that verify recoil pattern structure: weapon_id is string, spray_pattern is list of [float, float], game_version is set, etc. Tests are in python/tests/test_recoil_patterns.py.

### Testing and CI
- **D-18:** Test targets are explicit and separate (no default `make test`): developers choose `make test-php`, `make test-python`, `make test-ml`, or `make test-all`. This makes test scope clear and avoids unintended long test runs.
- **D-19:** All test targets run in Docker containers to match CI environment. Local Python/PHP setup is not required or supported for Phase 5 (developers use Docker).
- **D-20:** GitHub Actions workflow (`.github/workflows/test.yml`) runs on every push to main and on pull requests. Workflow runs: `make test-all` (all tests), then reports coverage to stdout or codecov.io.
- **D-21:** Coverage gates enforce minimum thresholds: Python (pytest with coverage plugin) must achieve ≥80% line coverage, PHP (PHPUnit with xdebug) must achieve ≥75% line coverage. CI blocks merge if coverage falls below these thresholds.
- **D-22:** Coverage reporting includes: absolute coverage % per module (worker, features, ml, parser, persistence), diff coverage (% change from previous commit), and per-file coverage breakdown. Output to GitHub Actions summary and optional codecov.io upload.
- **D-23:** README includes a "Manual Testing Guide" section that explains how to verify the full pipeline end-to-end with real data: (a) configure .env with HF_TOKEN, (b) `make up` to start services, (c) download a sample CS2 demo, (d) `make analyze-demo FILE=demo.dem` to run local analysis, (e) verify results in PostgreSQL or via API, (f) check logs with `make logs`.
- **D-24:** Test-related files and directories (.gitignore additions, CI config) are created by Phase 5 planning/execution. Existing PHP and Python test suites (from Phases 1-4) are discovered and integrated into Makefile targets.

### .gitignore and Repository Cleanliness
- **D-25:** .gitignore additions (Phase 5) cover: .env (environment file), .env.local (local overrides), data/demos/ (uploaded demo files), data/models/ (trained model artifacts), data/datasets/ (cached HuggingFace datasets), __pycache__/ (Python bytecode), *.pyc (compiled Python), .pytest_cache/, .coverage (coverage reports), htmlcov/ (coverage HTML), build/ and dist/ (Python packaging), *.egg-info/, venv/ and .venv/ (virtual environments), .DS_Store (macOS), *.swp, *.swo (editor temp files).
- **D-26:** Existing .gitignore entries (from Phases 1-2) are preserved. Phase 5 adds new entries for ML and testing artifacts without modifying prior entries.

### The Agent's Discretion
- Exact Makefile variable names and helper functions (as long as core targets remain public and discoverable via `make help`).
- Specific PHP linter (PHPStan, Psalm, or similar) and Python linter (Pylint, Flake8, or similar) choices for `make lint`.
- Exact coverage reporting format (plain text, HTML, JSON, codecov.io integration) as long as the minimum threshold (80% Python, 75% PHP) is enforced.
- Specific README section ordering and depth (as long as all required topics are covered: quick start, API, end-to-end example, architecture, reproducibility, paper links, extension points, troubleshooting).
- Exact Pydantic/dataclass structure for recoil patterns (as long as metadata fields and validation are present).
- Specific GitHub Actions syntax or CI tool (GitHub Actions is recommended but alternatives acceptable as long as tests run on every push and coverage gates are enforced).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` - Phase 5 goal, success criteria, and planned plan split (Makefile, recoil data, README).
- `.planning/REQUIREMENTS.md` - DEVX-01 through DEVX-05 define Phase 5 requirements.
- `.planning/PROJECT.md` - Project-level constraints: tech stack (Symfony, Python, Docker), quality standards (type hints, docstrings, structured logging), and ethical boundaries.

### Prior Phase Contracts
- `.planning/phases/04-ml-dataset-and-transformer-prep/04-CONTEXT.md` - ML phase delivers models and training entrypoint; Phase 5 references `data/models/model_best.pt` and `python/ml/train.py`.
- `.planning/phases/03-python-analysis-pipeline/03-CONTEXT.md` - Python worker and feature extraction pipeline (if Phase 3 is completed; Phase 5 wraps testing and documentation).
- `.planning/phases/02-symfony-api-and-domain/02-CONTEXT.md` - Symfony backend API and entity schemas (Demo, Player, AnalysisResult).
- `.planning/phases/01-container-foundation/01-CONTEXT.md` - Docker, environment, and runtime decisions.

### Source Brief
- `tasks/setup.md` - Project requirements, tech stack, AntiCheatPT reference, and expectations for developer ergonomics.

### External Research References
- AntiCheatPT paper (arXiv 2508.06348) - Transformer architecture and feature engineering rationale for README extension points.
- CS2CD dataset on HuggingFace (DOI 10.57967/hf/5654) - Dataset format, schema, and availability for reproducibility guide.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing Makefile (if any) in repository root — Phase 5 extends or replaces with new targets.
- PHP test suite (Symfony PHPUnit tests from Phase 2) — Phase 5 integrates into `make test-php`.
- Python test suite (pytest tests from Phases 3-4: worker, features, ML) — Phase 5 integrates into `make test-python` and `make test-ml`.
- `.env.example` (from Phase 1) — Phase 5 adds ML training and optional local dev variables.
- Structured logging pattern in `python/worker.py` — Phase 5 README examples reference this pattern.
- Docker Compose setup (from Phase 1) — Phase 5 Makefile targets assume Docker Compose is present and working.

### Established Patterns
- Environment-driven configuration (.env) applied consistently across Symfony, Python, and ML phases.
- Docker-first development (Compose for all services) is the established pattern.
- Structured JSON logging in Python (worker baseline) applies to training logs and analysis output.
- Non-root container runtime (Phase 1) applies to all services.

### Integration Points
- Makefile targets wrap Docker Compose commands and Python/PHP test runners.
- README examples use curl and Python client libraries to call Symfony API endpoints.
- Recoil patterns are imported by feature extractors in `python/features/` and used during analysis.
- CI tests run the same commands as `make test-all` locally, ensuring consistency.

</code_context>

<specifics>
## Specific Ideas

- User confirmed research-focused README (not quick-start-only) with complete end-to-end examples, reproducibility guide, and extension points for model swaps and feature modifications.
- Explicit test targets (not bundled) for clarity on scope: `make test-php`, `make test-python`, `make test-ml` reflect the three major test suites.
- Layered Makefile (core + advanced) balances simplicity with power: beginners use `make up` and `make test`, experts use `make format`, `make lint`, `make analyze-demo`.
- Recoil data in structured Python (Pydantic/dataclass) ensures type safety and validation at import time.
- Coverage gates (80% Python, 75% PHP) enforce code quality while remaining achievable for a research project.
- Manual testing guide complements CI by showing how to verify the full pipeline with real data.
- GitHub Actions CI is the default; deployment is out of scope for v1.

</specifics>

<deferred>
## Deferred Ideas

- Interactive web UI (frontend) for demo upload and result visualization — future phase.
- Production deployment guide (Kubernetes, cloud deployment) — Phase 5 covers local/Docker development only.
- Monitoring and observability (Prometheus, Grafana, Loki) — deferred to v2.
- API versioning strategy and backwards compatibility — deferred.
- Performance benchmarking and optimization guide — deferred.
- Contributor code of conduct and governance — deferred.
- Full API documentation generation (OpenAPI/Swagger) — README curl examples are sufficient for v1.
- Multi-language support for README (translations) — English only in v1.
- Docker image optimization and vulnerability scanning — deferred to DevOps/security phase.

</deferred>

---
