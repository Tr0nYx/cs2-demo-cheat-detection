# Configuration Guide

Environment setup and configuration for CS2 Demo Cheat Detection.

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

### Core Configuration

#### Database (PostgreSQL)

```env
DATABASE_URL=postgresql://cs2_app:cs2_demo@postgres:5432/cs2_detection
# Format: postgresql://user:password@host:port/dbname
# Default user: cs2_app
# Default password: cs2_demo
```

**Production Settings:**
- Use strong password (minimum 16 characters)
- Enable SSL: `postgresql://...?sslmode=require`
- Use managed database service (AWS RDS, Heroku Postgres)

#### Cache & Queue (Redis)

```env
REDIS_URL=redis://redis:6379/0
# Format: redis://[user:password@]host:port/db
# Default: redis://localhost:6379/0
```

**Production Settings:**
- Enable Redis AUTH: `redis://:password@host:6379`
- Use Redis Cluster for high availability
- Enable TLS: `rediss://...`

#### File Storage

```env
DEMO_STORAGE_PATH=data/demo-storage
# Local directory for uploaded demo files
# Create directory if it doesn't exist
```

**Production Settings:**
- Use S3 or cloud storage (recommended)
- Configure via `STORAGE_DRIVER=s3` (future)
- Set permissions: readable by API, writable by worker

### API Configuration

#### Symfony

```env
APP_ENV=dev                    # dev, test, prod
APP_SECRET=your-secret-key    # Generate: symfony var:set APP_SECRET $(openssl rand -hex 16)
APP_DEBUG=1                    # 0 = disable debug (production)
```

**Generate Secret:**
```bash
# Docker
docker exec cs2-symfony symfony var:set APP_SECRET $(openssl rand -hex 16)

# Local
symfony var:set APP_SECRET $(openssl rand -hex 16)
```

#### API Server

```env
API_PORT=8000
API_HOST=0.0.0.0

# CORS (development only)
CORS_ALLOW_ORIGIN=http://localhost:3000
```

### Frontend Configuration

#### Next.js

```env
# Frontend API endpoint
NEXT_PUBLIC_API_URL=http://localhost:8000/api
# For production: https://api.yourdomain.com/api

# Environment
NEXT_PUBLIC_ENV=development  # development, production
```

#### Authentication (Steam)

```env
NEXT_PUBLIC_STEAM_OPENID_RETURN_URL=http://localhost:3000/auth/callback
STEAM_API_SECRET=your-steam-secret
# Get from: https://steamcommunity.com/dev/apikey
```

**Production Settings:**
- Use HTTPS URLs
- Whitelist callback domain with Steam
- Rotate secret regularly

### Machine Learning Configuration

#### Training

```env
ML_SEED=42                 # Random seed for reproducibility
BATCH_SIZE=32             # Training batch size (memory dependent)
LEARNING_RATE=0.0001      # Initial learning rate
NUM_EPOCHS=50             # Default training epochs
VALIDATION_SPLIT=0.2      # 20% validation data
```

**Performance Tuning:**
- Increase `BATCH_SIZE` for faster training (requires more GPU memory)
- Decrease `LEARNING_RATE` for more stable training
- Use `ML_SEED` for reproducible results across runs

#### Inference

```env
MODEL_PATH=data/models/latest_model.pt
# Path to trained PyTorch model
```

### Python Worker Configuration

```env
WORKER_CONCURRENCY=4         # Number of parallel analysis jobs
WORKER_JOB_TIMEOUT=3600      # Max seconds per job (1 hour)
REDIS_QUEUE_NAME=demo_analysis
```

**Scaling:**
- Increase `WORKER_CONCURRENCY` for high volume (requires more CPU/RAM)
- Reduce for resource-constrained environments

### Monitoring & Logging

#### Logging Levels

```env
LOG_LEVEL=info              # debug, info, warning, error
SYMFONY_LOG_LEVEL=info      # PHP logging
PYTHON_LOG_LEVEL=INFO       # Python logging
```

#### Performance Monitoring (Production)

```env
SENTRY_DSN=https://...@sentry.io/...   # Error tracking
PROMETHEUS_ENABLED=1                    # Metrics collection
GRAFANA_URL=http://localhost:3001       # Grafana dashboard
```

### Feature Flags

```env
FEATURE_HEATMAP_VISUALIZATION=1     # Enable heatmap viewer
FEATURE_LEADERBOARD_FILTERING=1     # Enable leaderboard filters
FEATURE_DEMO_SHARING=0              # Coming soon
```

## Docker Compose Configuration

### Services

**php-fpm** (Symfony API)
```yaml
environment:
  DATABASE_URL: postgresql://...
  REDIS_URL: redis://...
  APP_SECRET: ...
ports:
  - "8000:9000"  # PHP-FPM port
```

**postgres** (Database)
```yaml
environment:
  POSTGRES_USER: cs2_app
  POSTGRES_PASSWORD: cs2_demo
  POSTGRES_DB: cs2_detection
volumes:
  - postgres_data:/var/lib/postgresql/data
```

**redis** (Cache/Queue)
```yaml
ports:
  - "6379:6379"
volumes:
  - redis_data:/data
```

**python-worker** (Demo Analysis)
```yaml
environment:
  REDIS_URL: redis://redis:6379/0
  DEMO_STORAGE_PATH: /app/data/demo-storage
```

**nginx** (Reverse Proxy)
```yaml
ports:
  - "80:80"
  - "443:443"
depends_on:
  - php
  - next
```

### Custom Configuration

Edit `docker-compose.yml` to customize:

**Expose database to host:**
```yaml
postgres:
  ports:
    - "5432:5432"
```

**Add volume mount:**
```yaml
volumes:
  - ./data/demos:/app/data/demo-storage
```

**Override environment:**
```yaml
environment:
  - DATABASE_URL=postgresql://user:pass@postgres:5432/db
```

## Development vs Production

### Development

```env
APP_ENV=dev
APP_DEBUG=1
DATABASE_URL=postgresql://cs2_app:cs2_demo@localhost:5432/cs2_detection
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=debug
CORS_ALLOW_ORIGIN=*
```

### Production

```env
APP_ENV=prod
APP_DEBUG=0
DATABASE_URL=postgresql://user:secure-password@db-host:5432/dbname
REDIS_URL=redis://:password@cache-host:6379/0
LOG_LEVEL=warning
CORS_ALLOW_ORIGIN=https://yourdomain.com
```

**Security Checklist:**
- [ ] Use strong, unique passwords
- [ ] Enable HTTPS/TLS
- [ ] Set `APP_DEBUG=0`
- [ ] Use `LOG_LEVEL=warning` or higher
- [ ] Configure firewall rules
- [ ] Enable database backups
- [ ] Use managed services (RDS, ElastiCache)

## Configuration Files

### Symfony (`symfony/config/`)

- `services.yaml` — Service definitions
- `bundles.php` — Bundle configuration
- `routes.yaml` — API route definitions
- `packages/` — Package-specific config

### Frontend (`frontend/`)

- `next.config.ts` — Next.js configuration
- `tsconfig.json` — TypeScript configuration
- `jest.config.ts` — Test configuration
- `playwright.config.ts` — E2E test configuration
- `.eslintrc.json` — Linter configuration

### Python (`python/`)

- `config.py` — Application config (if exists)
- `pyproject.toml` — Python project config
- `pytest.ini` — Test configuration

## Secrets Management

### Local Development

Store secrets in `.env` (git-ignored):

```bash
# Add to .gitignore
echo ".env.local" >> .gitignore

# Source environment before running
source .env
```

### Docker Secrets (Production)

Use Docker secrets for sensitive data:

```bash
# Create secret
echo "supersecret" | docker secret create db_password -

# Reference in compose
secrets:
  db_password:
    external: true
```

### Environment Variable Rotation

Periodically rotate:
- Database passwords
- API keys
- JWT secrets
- OAuth credentials

## Performance Tuning

### Database Connection Pooling

```env
DATABASE_POOL_SIZE=10
DATABASE_IDLE_TIMEOUT=300
```

### Redis Memory Limits

```env
REDIS_MAXMEMORY=256mb
REDIS_EVICTION_POLICY=allkeys-lru
```

### Python Worker Optimization

```env
WORKER_CONCURRENCY=8           # Match CPU cores
WORKER_JOB_TIMEOUT=1800        # 30 minutes for large demos
BATCH_SIZE=64                  # Larger batches = faster training
```

## Troubleshooting

### Database Connection Refused

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec cs2-postgres psql -U cs2_app -d cs2_detection -c "SELECT 1"

# Check credentials in .env
grep DATABASE_URL .env
```

### Redis Connection Errors

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec cs2-redis redis-cli ping
# Should output: PONG
```

### Model Loading Fails

```bash
# Check model file exists
ls -la data/models/

# Check permissions
chmod 644 data/models/*.pt

# Check MODEL_PATH in .env
grep MODEL_PATH .env
```

## Migration Guide

### Update Environment

When updating the application:

```bash
# 1. Backup .env
cp .env .env.backup

# 2. Check .env.example for new variables
diff .env .env.example

# 3. Add new variables to .env
# 4. Run migrations if needed
make migrate
```

## Additional Resources

- [Symfony Configuration](https://symfony.com/doc/current/configuration.html)
- [Next.js Environment](https://nextjs.org/docs/basic-features/environment-variables)
- [PostgreSQL Configuration](https://www.postgresql.org/docs/current/runtime-config.html)
- [Redis Configuration](https://redis.io/docs/manual/config/)
- [PyTorch Configuration](https://pytorch.org/docs/stable/)
