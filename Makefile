.SHELL := /bin/bash
.PHONY: help build up down restart clean logs test test-all test-php test-python test-ml lint format analyze-demo train

# Default target
.DEFAULT_GOAL := help

# ============================================================================
# CORE TARGETS - Essential development commands
# ============================================================================

.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Core targets:"
	@echo "  up              Start all services (nginx, php, postgres, redis, python)"
	@echo "  down            Stop all services"
	@echo "  restart         Restart all services"
	@echo "  clean           Stop services and remove volumes and data"
	@echo "  logs            Tail Docker Compose logs"
	@echo "  test            Run all tests (PHP, Python, ML)"
	@echo "  test-php        Run PHP (Symfony) tests"
	@echo "  test-python     Run Python worker/feature/parser tests"
	@echo "  test-ml         Run ML pipeline tests"
	@echo "  help            Show this message"
	@echo ""
	@echo "Advanced targets:"
	@echo "  build           Build Docker images (php, python)"
	@echo "  lint            Run linters (PHP-CS-Fixer, pylint)"
	@echo "  format          Auto-fix code style (PHP-CS-Fixer, black)"
	@echo "  analyze-demo    Analyze a local demo file (FILE=path/to/demo.dem)"
	@echo "  train           Train the ML model (EPOCHS=50, OUTPUT_DIR=data/models)"
	@echo ""
	@echo "Examples:"
	@echo "  make up"
	@echo "  make test-all"
	@echo "  make analyze-demo FILE=demo.dem"
	@echo "  make train EPOCHS=100 OUTPUT_DIR=models/exp1"

.PHONY: build
build:
	docker compose build

.PHONY: up
up:
	docker compose up -d

.PHONY: down
down:
	docker compose down

.PHONY: restart
restart:
	docker compose restart

.PHONY: clean
clean: down
	docker compose down -v
	rm -rf data/models/ data/datasets/ data/demo-storage/*
	@echo "Kept .gitkeep files in data/demo-storage"

.PHONY: logs
logs:
	docker compose logs -f

# ============================================================================
# TEST TARGETS - Explicit and separate test commands
# ============================================================================

.PHONY: test
test: test-all

.PHONY: test-all
test-all: test-php test-python test-ml
	@echo "All tests passed!"

.PHONY: test-php
test-php:
	@echo "Running PHP tests..."
	docker compose exec -T php ./vendor/bin/phpunit --configuration phpunit.xml.dist

.PHONY: test-python
test-python:
	@echo "Running Python worker, feature, and parser tests..."
	docker compose exec -T python pytest python/tests/ --tb=short -v

.PHONY: test-ml
test-ml:
	@echo "Running ML pipeline tests..."
	docker compose exec -T python pytest python/tests/test_ml_pipeline.py --tb=short -v

# ============================================================================
# ADVANCED TARGETS - Linting, formatting, analysis, and training
# ============================================================================

.PHONY: lint
lint:
	@echo "Running PHP linter (PHP-CS-Fixer check)..."
	docker compose exec -T php ./vendor/bin/php-cs-fixer --dry-run --diff . || true
	@echo "Running Python linter (pylint)..."
	docker compose exec -T python pylint python/ || true

.PHONY: format
format:
	@echo "Fixing PHP code style (PHP-CS-Fixer)..."
	docker compose exec -T php ./vendor/bin/php-cs-fixer fix . || true
	@echo "Fixing Python code style (black)..."
	docker compose exec -T python black python/ || true

.PHONY: analyze-demo
analyze-demo:
	@if [ -z "$(FILE)" ]; then \
		echo "ERROR: FILE parameter required"; \
		echo "Usage: make analyze-demo FILE=path/to/demo.dem"; \
		exit 1; \
	fi
	@echo "analyze-demo: Not yet implemented. Phase 5-03 will wire the analysis entrypoint."
	@echo "FILE=$(FILE)"

.PHONY: train
train:
	@echo "train: Requires Phase 4 training entrypoint."
	@echo "EPOCHS=$(EPOCHS)"
	@echo "OUTPUT_DIR=$(OUTPUT_DIR)"
