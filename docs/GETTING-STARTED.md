# Getting Started

Get the CS2 Demo Cheat Detection system running locally in 5 minutes.

## Prerequisites

- **Docker & Docker Compose:** [Install Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Git:** [Install Git](https://git-scm.com/)
- **Make:** Usually pre-installed on macOS/Linux; Windows users can use `make` via WSL or use individual commands

**Optional (for local development without Docker):**
- Python 3.12+
- PHP 8.3+
- Node.js 18+

## Quick Start (Docker)

### 1. Clone and Setup

```bash
git clone https://github.com/Tr0nYx/cs2-demo-cheat-detection.git
cd cs2-demo-cheat-detection

# Copy environment file
cp .env.example .env
```

### 2. Start All Services

```bash
make up
```

This starts:
- Nginx (http://localhost:80)
- Symfony API (http://localhost:8000/api)
- PostgreSQL (port 5432)
- Redis (port 6379)
- Python worker (background process)
- Next.js frontend (http://localhost:3000)

### 3. Verify Installation

```bash
# Check service health
make logs

# Run tests
make test
```

### 4. Access the Application

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/api/docs
- **Nginx:** http://localhost

### 5. Upload and Analyze a Demo

```bash
# Option A: Use the web UI
# 1. Open http://localhost:3000
# 2. Click "Login with Steam"
# 3. Upload a demo file

# Option B: Use the API
curl -X POST -F "file=@demo.dem" http://localhost/api/demos
# Response:
# {"id": "demo-uuid", "status": "queued"}

# Check analysis status
curl http://localhost/api/demos/demo-uuid
```

## Project Structure

```
cs2-demo-cheat-detection/
├── frontend/              # Next.js React app (UI)
│   ├── app/              # App router (Next.js 16)
│   ├── components/       # React components
│   ├── lib/              # Utilities and hooks
│   ├── __tests__/        # Jest unit tests
│   ├── e2e/              # Playwright E2E tests
│   └── package.json
├── symfony/              # Symfony PHP API
│   ├── src/
│   │   ├── Application/  # Use cases & handlers
│   │   ├── Domain/       # Business logic
│   │   ├── Infrastructure/ # Database & external services
│   │   └── Presentation/ # Controllers & HTTP
│   ├── tests/           # PHPUnit tests
│   └── composer.json
├── python/              # Python worker & ML
│   ├── parser/         # CS2 demo file parser
│   ├── features/       # Feature extraction
│   ├── ml/            # Model training & inference
│   ├── viewer/        # Heatmap & visualization
│   ├── tests/         # Pytest tests
│   └── requirements.txt
├── docker/             # Docker configuration
├── docs/              # Documentation
├── .env.example       # Example environment config
├── Makefile           # Convenient make targets
└── docker-compose.yml # Service orchestration
```

## Common Commands

```bash
# Start services
make up

# Stop services
make down

# View logs
make logs

# Run all tests
make test

# Run specific tests
make test-php          # PHPUnit tests
make test-python       # Python/ML tests

# Development
make format           # Auto-fix code style
make lint            # Check code style

# Demo analysis (advanced)
make analyze-demo FILE=path/to/demo.dem
```

## Configuration

See [CONFIGURATION.md](./CONFIGURATION.md) for detailed environment variable setup.

Key variables:
- `DATABASE_URL` — PostgreSQL connection
- `REDIS_URL` — Redis connection
- `DEMO_STORAGE_PATH` — Where uploaded demos are saved
- `STEAM_API_KEY` — Steam authentication (optional for local dev)

## Development Workflow

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Run tests
npm test
npm run test:watch

# Run E2E tests
npm run e2e
```

### Backend Development

```bash
cd symfony

# Install dependencies
composer install

# Run Symfony dev server (if not using Docker)
symfony server:start

# Run tests
php -d memory_limit=-1 vendor/bin/phpunit
```

### Python Development

```bash
cd python

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Run worker locally
python -m rq worker demo_analysis
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker status
docker ps
docker logs <container-name>

# Rebuild services
make clean
make build
make up
```

### Database Connection Errors

```bash
# Check PostgreSQL
docker exec cs2-postgres psql -U cs2_app -d cs2_detection -c "SELECT 1;"

# Reset database
docker exec cs2-postgres dropdb -U cs2_app cs2_detection
docker exec cs2-postgres createdb -U cs2_app cs2_detection
```

### Redis Connection Errors

```bash
# Check Redis
docker exec cs2-redis redis-cli ping
```

### Port Already in Use

```bash
# Find process on port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process and restart
make down
make up
```

## Next Steps

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for dev guidelines
- Read [TESTING.md](./TESTING.md) for testing strategy
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup

## API Quick Reference

### Upload Demo

```bash
curl -X POST -F "file=@demo.dem" http://localhost/api/demos
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "created_at": "2026-05-17T12:00:00Z"
}
```

### Check Status

```bash
curl http://localhost/api/demos/550e8400-e29b-41d4-a716-446655440000
```

### Get Results

```bash
curl http://localhost/api/demos/550e8400-e29b-41d4-a716-446655440000/results
```

## Support

For issues:
1. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for troubleshooting
2. Review Docker logs: `make logs`
3. Check existing GitHub issues
4. Open a new issue with logs attached
