# Production Deployment Guide & Operator Runbook

**Document Version:** 1.0  
**Phase:** 7 — Enhanced ML & Production  
**Last Updated:** 2026-05-15

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial VPS Setup](#initial-vps-setup)
3. [Verify Deployment](#verify-deployment)
4. [Monitoring & Observability](#monitoring--observability)
5. [Deployment Checklist](#deployment-checklist)
6. [Rollback Procedure](#rollback-procedure)
7. [Graceful Shutdown & Model Updates](#graceful-shutdown--model-updates)
8. [Backup & Disaster Recovery](#backup--disaster-recovery)
9. [Troubleshooting](#troubleshooting)
10. [Performance Tuning](#performance-tuning)

---

## Prerequisites

### Infrastructure Requirements

**VPS Specifications:**
- **CPU:** 2 cores (4+ cores recommended for high-volume deployments)
- **RAM:** 4 GB minimum (8 GB recommended)
- **Storage:** 50 GB minimum (100 GB+ for demo archive and Prometheus retention)
- **OS:** Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- **Network:** Public IP with SSH access (port 22)

**Firewall Rules (allow inbound):**
- Port 22 (SSH) — restricted to known IP ranges
- Port 80 (HTTP) — open to all (Nginx frontend)
- Port 443 (HTTPS) — open to all (reserved for future)
- Port 9090 (Prometheus) — restricted to VPS admins only
- Port 3001 (Grafana) — restricted to VPS admins only
- Port 3100 (Loki) — internal only (no external access)

**Required Software (pre-installed on VPS):**
- Docker 20.10 or later
- Docker Compose 2.0 or later
- Git 2.25 or later
- curl and wget

**Local Prerequisites (for deployer):**
- SSH key pair (`~/.ssh/vps_key`) with private key permissions `600`
- Docker Hub account (or private registry credentials)
- Access to repository GitHub token (for pulling private images)
- HuggingFace token (for model downloads)

---

## Initial VPS Setup

### Step 1: SSH Access & Environment

```bash
# 1. SSH into VPS
ssh -i ~/.ssh/vps_key ubuntu@vps.example.com

# 2. Verify SSH key access works (should not prompt for password)
# If prompted for password, SSH key not configured correctly
```

### Step 2: Install Docker & Docker Compose

```bash
# 1. Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Docker using official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Add current user to docker group (no sudo for docker commands)
sudo usermod -aG docker $USER
newgrp docker

# 4. Install Docker Compose (v2.0+)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5. Verify installations
docker --version
docker-compose --version
```

### Step 3: Clone Repository

```bash
# 1. Navigate to home directory
cd ~

# 2. Clone repository
git clone https://github.com/YOUR_ORG/cs2-detection.git cs2-detection
cd cs2-detection

# 3. Verify main branch
git status
```

### Step 4: Create & Configure Environment File

```bash
# 1. Copy example environment file
cp .env.example .env

# 2. Edit .env with production values
nano .env  # or vim, or your preferred editor
```

**Required .env values for production:**

```env
# Application
APP_ENV=prod
APP_DEBUG=0
APP_SECRET=<generate: head -c 32 /dev/urandom | base64>
APP_URL=https://your-vps-domain.com

# Database
DATABASE_URL=postgresql://cs2_app:SECURE_PASSWORD@postgres:5432/cs2_production
POSTGRES_DB=cs2_production
POSTGRES_USER=cs2_app
POSTGRES_PASSWORD=SECURE_PASSWORD

# Redis
REDIS_URL=redis://redis:6379

# Storage
DEMO_STORAGE_PATH=/storage/demos
DEMO_STORAGE_DISK=local

# Queues & Messaging
SYMFONY_ANALYSIS_QUEUE=cs2.analysis.dispatch
PYTHON_WORKER_QUEUE=cs2.analysis
RESULT_INGEST_QUEUE=cs2.results
RESULT_INGEST_TOKEN=<secure-token>

# API CORS
CORS_ALLOW_ORIGIN=https://your-frontend-domain.com

# Docker
DOCKER_USERNAME=your-docker-hub-username
DOCKER_PASSWORD=your-docker-hub-token

# ML Models & HuggingFace
HF_TOKEN=hf_your_huggingface_token
HF_HOME=/app/.cache/huggingface
CS2CD_DATASET_ID=CS2CD/CS2CD.Counter-Strike_2_Cheat_Detection
CS2CD_DATA_DIR=/data/cs2cd
ANTICHEATPT_MODEL_ID=CS2CD/AntiCheatPT_256

# ML Configuration
ML_DATA_DIR=/data/ml
ML_CHECKPOINT_DIR=/data/checkpoints
ML_BATCH_SIZE=128
ML_LEARNING_RATE=0.0001
ML_DEVICE=cpu

# Observability
GRAFANA_ADMIN_PASSWORD=SECURE_GRAFANA_PASSWORD

# Worker Settings
WORKER_IDLE_ON_START=false
WORKER_LOG_LEVEL=INFO
WORKER_POLL_TIMEOUT_SECONDS=5
WORKER_SHUTDOWN_GRACE_SECONDS=15
PYTHON_ENV=production

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-token
```

**Security Notes:**
- Generate strong passwords with: `openssl rand -base64 32`
- Use different passwords for each environment (dev, staging, prod)
- Store .env file outside of Git repository
- Limit .env file permissions: `chmod 600 .env`
- Rotate Docker Hub tokens monthly
- Rotate RESULT_INGEST_TOKEN every 90 days

### Step 5: Create Required Directories

```bash
# 1. Create data directories
mkdir -p /storage/demos
mkdir -p /data/cs2cd
mkdir -p /data/ml
mkdir -p /data/checkpoints
mkdir -p /backups

# 2. Set permissions (docker containers run as specified user)
sudo chown -R 1000:1000 /storage/demos /data /backups
chmod -R 755 /storage/demos /data /backups
```

### Step 6: Start Services

```bash
# 1. Start all services in background
docker-compose -f docker-compose.prod.yml up -d

# 2. Watch logs during startup (first 30 seconds)
docker-compose -f docker-compose.prod.yml logs -f

# 3. Wait for services to stabilize (2-3 minutes)
sleep 120

# 4. Check service health
docker-compose -f docker-compose.prod.yml ps
```

---

## Verify Deployment

### Health Checks

```bash
# 1. Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps
# Expected: All services showing "healthy" or "Up" status

# 2. Check individual service logs for errors
docker logs cs2-php
docker logs cs2-python
docker logs cs2-postgres

# 3. Test API health endpoint
curl http://localhost/api/health
# Expected response: HTTP 200 OK with health status JSON
```

### Database Migrations

```bash
# 1. Run pending migrations (if any)
docker-compose -f docker-compose.prod.yml exec -T php \
  php bin/console doctrine:migrations:migrate --no-interaction

# 2. Verify database is initialized
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cs2_app -d cs2_production -c "\dt"
# Expected: Tables list (analysis_results, recoil_patterns, etc.)
```

### Monitoring Stack

```bash
# 1. Test Prometheus metrics
curl http://localhost:9090/api/v1/targets
# Expected: JSON with list of active scrape targets

# 2. Access Grafana dashboard
# Open browser: http://YOUR_VPS_IP:3001/
# Login: admin / GRAFANA_ADMIN_PASSWORD
# Expected: Dashboards list visible

# 3. Test Loki logs
curl http://localhost:3100/ready
# Expected: HTTP 200 OK
```

---

## Monitoring & Observability

### Prometheus Metrics Endpoint

**Access:**
```
http://YOUR_VPS_IP:9090
```

**Key Queries:**
```promql
# System health
up                                      # All targets status
node_cpu_seconds_total                  # CPU usage
node_memory_MemAvailable_bytes          # Available memory
node_filesystem_avail_bytes             # Disk space

# Application metrics
demo_analysis_duration_seconds          # Analysis time distribution
demo_analysis_requests_total            # Total analyses processed
demo_analysis_errors_total              # Analysis errors
model_inference_duration_seconds        # Model inference latency
model_inference_retries_total           # Retry attempts
```

**Scrape Jobs Configured:**
- `prometheus` — Prometheus self-metrics
- `python-worker` — Python worker metrics (port 8000)
- `node-exporter` — System metrics (CPU, memory, disk, network)

### Grafana Dashboards

**Access:**
```
http://YOUR_VPS_IP:3001
Username: admin
Password: [from .env GRAFANA_ADMIN_PASSWORD]
```

**Default Dashboards:**
1. **System Health** — CPU, memory, disk usage, network I/O
2. **Demo Analysis** — Request rate, latency P50/P95/P99, error rate
3. **Model Inference** — Model version, inference latency, retry counts
4. **Docker Containers** — Container resource usage and health

### Loki Logs

**Access:**
```
http://YOUR_VPS_IP:3100
Query logs from Grafana Explore tab
```

**Log Sources:**
- `container_name=cs2-python` — Python worker logs
- `container_name=cs2-php` — Symfony application logs
- `container_name=cs2-nginx` — HTTP request logs

**Example Queries:**
```logql
# Python worker errors
{container_name="cs2-python"} | json | level="error"

# Failed analyses
{container_name="cs2-python"} | json | event="feature_error"

# Slow analyses (> 30 seconds)
{container_name="cs2-python"} | json | event="job_processing" | duration_ms > 30000
```

### Alert Thresholds

**Critical Alerts:**
| Metric | Threshold | Action |
|--------|-----------|--------|
| P95 API latency | > 2 seconds | Page on-call engineer |
| Analysis time | > 5 minutes | Log warning, investigate |
| Error rate | > 5% (1/20) | Page on-call engineer |
| Disk usage | > 90% | Stop demo uploads, investigate |
| Memory usage | > 85% | Restart problematic service |

---

## Deployment Checklist

Use this checklist before deploying each new release:

```
PRE-DEPLOYMENT (before pulling code)
☐ All GitHub Actions CI tests pass (check workflow status)
☐ Docker images built and pushed to Docker Hub
☐ VPS has sufficient disk space: `df -h /` (needs > 20 GB free)
☐ Recent backup exists: `ls -lh /backups | head -3`
☐ Notify team: "Deploying v1.0.X at HH:MM UTC"

DEPLOYMENT (code pull and service restart)
☐ SSH to VPS: `ssh -i ~/.ssh/vps_key ubuntu@vps.example.com`
☐ Navigate to repo: `cd ~/cs2-detection`
☐ Validate .env file: `test -f .env && echo "OK"`
☐ Validate compose config: `docker-compose -f docker-compose.prod.yml config --quiet`
☐ Pull latest code: `git pull origin main`
☐ Pull latest Docker images: `docker-compose -f docker-compose.prod.yml pull`
☐ Start services: `docker-compose -f docker-compose.prod.yml up -d`

POST-DEPLOYMENT (within 5 minutes)
☐ Wait 60 seconds for services to stabilize
☐ Verify all services healthy: `docker-compose -f docker-compose.prod.yml ps`
☐ Check for startup errors: `docker logs cs2-python | grep -i error | head -5`
☐ Test API: `curl http://localhost/api/health` (should return 200 OK)
☐ Test Prometheus: `curl http://localhost:9090/api/v1/targets` (targets should be "UP")
☐ Check logs for errors: `docker logs cs2-python | tail -20`
☐ Run integration test (if available): `curl -X POST http://localhost/api/demos -F "file=@test.dem"`
☐ Monitor Grafana: open http://VPS:3001/ and verify dashboards updating
☐ Notify team: "Deployment complete. Monitoring for issues."

VALIDATION (1 hour post-deployment)
☐ Review error logs: no new errors in last 60 minutes
☐ Check error rate in Prometheus: `rate(demo_analysis_errors_total[5m])`
☐ Review analysis latency: P95 should be < 2 seconds
☐ Memory usage stable: no continuous growth
☐ No database connection errors in logs
```

---

## Rollback Procedure

**If deployment fails or causes issues, follow this procedure:**

### Option 1: Revert to Previous Commit (Fastest)

```bash
# 1. SSH to VPS
ssh -i ~/.ssh/vps_key ubuntu@vps.example.com
cd ~/cs2-detection

# 2. Identify previous working commit
git log --oneline | head -5

# 3. Reset to previous commit
git reset --hard HEAD~1

# 4. Re-pull images and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 5. Monitor logs
docker logs cs2-python | tail -20
```

### Option 2: Revert Specific Service (if only one service broken)

```bash
# 1. Identify problematic service (e.g., python worker)
docker-compose -f docker-compose.prod.yml logs cs2-python | grep -i error

# 2. Rollback that service's image tag in docker-compose.prod.yml
# Change: image: myregistry/cs2-python:latest
# To:     image: myregistry/cs2-python:v1.0.0

# 3. Restart service
docker-compose -f docker-compose.prod.yml up -d python

# 4. Verify
docker logs cs2-python | tail -10
```

### Option 3: Database Rollback (if migrations caused issues)

```bash
# 1. Check current migration status
docker-compose -f docker-compose.prod.yml exec -T php \
  php bin/console doctrine:migrations:status

# 2. Rollback last migration
docker-compose -f docker-compose.prod.yml exec -T php \
  php bin/console doctrine:migrations:migrate prev

# 3. Restart PHP container
docker-compose -f docker-compose.prod.yml restart php

# 4. Verify
docker logs cs2-php | tail -10
```

### Option 4: Full Stack Recovery (nuclear option)

```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml down

# 2. Reset to previous working state
git reset --hard <LAST_WORKING_COMMIT_HASH>

# 3. Bring stack back up
docker-compose -f docker-compose.prod.yml up -d

# 4. Watch startup logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## Graceful Shutdown & Model Updates

### Graceful Shutdown (for updates, maintenance)

When updating the Python worker model or making breaking changes:

```bash
# 1. Stop accepting new jobs (graceful mode)
docker stop -t 300 cs2-python
# Gives worker 5 minutes (300 seconds) to finish in-flight analyses

# 2. Monitor shutdown progress
docker logs cs2-python | tail -20
# Look for: "All in-flight analyses completed"

# 3. Once shutdown, pull new image
docker-compose -f docker-compose.prod.yml pull python

# 4. Restart with new model
docker-compose -f docker-compose.prod.yml up -d python

# 5. Verify
docker logs cs2-python | head -10
# Should see: "worker_ready" or "pipeline_initialized"
```

### Model Update Workflow

```bash
# 1. New model committed to repo with updated checkpoint path
git pull origin main

# 2. Update python image in Docker Hub (CI/CD handles this)
# GitHub Actions builds new image with new model checkpoint

# 3. Deploy (see Graceful Shutdown section above)
docker-compose -f docker-compose.prod.yml pull python
docker-compose -f docker-compose.prod.yml up -d python

# 4. Verify model version in logs
docker logs cs2-python | grep model_version
# Should show new version
```

### Handling Inference Failures During Model Update

If model inference fails during transition:

```bash
# 1. Check error logs
docker logs cs2-python | grep -i "inference\|error"

# 2. Rollback to previous working model
git reset --hard <PREVIOUS_WORKING_COMMIT>
docker-compose -f docker-compose.prod.yml pull python
docker-compose -f docker-compose.prod.yml up -d python

# 3. Investigate new model offline (don't update VPS)
# Debug locally, re-test, then retry deployment
```

---

## Backup & Disaster Recovery

### Database Backup

```bash
# 1. Create daily backup directory
BACKUP_DIR=/backups
mkdir -p $BACKUP_DIR

# 2. Manual backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U cs2_app cs2_production > $BACKUP_DIR/db_$TIMESTAMP.sql

# 3. Verify backup
file $BACKUP_DIR/db_$TIMESTAMP.sql
wc -l $BACKUP_DIR/db_$TIMESTAMP.sql
# Should be > 100 lines

# 4. Upload to S3 (requires aws-cli)
aws s3 cp $BACKUP_DIR/db_$TIMESTAMP.sql s3://your-bucket/backups/ --sse AES256
```

### Automated Daily Backup Script

Create `/home/ubuntu/backup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR=/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE=$BACKUP_DIR/db_$TIMESTAMP.sql

# Create backup
cd ~/cs2-detection
docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U cs2_app cs2_production > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

# Upload to S3 (optional)
if command -v aws &> /dev/null; then
  aws s3 cp $BACKUP_FILE.gz s3://your-bucket/backups/ --sse AES256
fi

echo "Backup complete: $BACKUP_FILE.gz"
```

Add to crontab (runs daily at 2 AM UTC):

```bash
0 2 * * * /home/ubuntu/backup.sh >> /var/log/backup.log 2>&1
```

### Demo Storage Backup

```bash
# 1. Backup demo volume (if using local volume)
docker run --rm -v demo_storage:/source -v /backups:/backup \
  alpine tar czf /backup/demo_storage_$(date +%Y%m%d).tar.gz -C /source .

# 2. Upload to S3
aws s3 cp /backups/demo_storage_*.tar.gz s3://your-bucket/backups/
```

### Restore from Backup

```bash
# 1. Stop services
docker-compose -f docker-compose.prod.yml down

# 2. Restore database
BACKUP_FILE=$BACKUP_DIR/db_20260515_140000.sql
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10  # Wait for postgres to start

docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U cs2_app -d cs2_production < $BACKUP_FILE

# 3. Restart all services
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
docker-compose -f docker-compose.prod.yml ps
```

---

## Troubleshooting

| Issue | Symptom | Diagnosis | Fix |
|-------|---------|-----------|-----|
| **Nginx returns 502 Bad Gateway** | API calls fail with "Bad Gateway" | PHP container is down or unreachable | `docker-compose -f docker-compose.prod.yml logs php` \| Check for errors; restart: `docker-compose -f docker-compose.prod.yml restart php` |
| **Python worker not processing demos** | Demos stuck in "pending" state | Redis or Python container down | Check Redis: `docker-compose -f docker-compose.prod.yml exec redis redis-cli ping`; Check worker logs: `docker logs cs2-python` |
| **High memory usage** | VPS memory > 80%, services slow | Large demos being analyzed or memory leak | Check memory by service: `docker stats`; Increase VM RAM or implement demo size limits |
| **Metrics not appearing in Prometheus** | Grafana shows "No data" | Scrape job failing or targets unreachable | Check targets: `curl http://localhost:9090/api/v1/targets`; Verify scrape config: `/etc/prometheus/prometheus.yml` |
| **Grafana shows empty dashboards** | Dashboards exist but no data | No data in Prometheus or wrong time range | Check data exists: query `up` in Prometheus; Ensure time range includes data (last 24h); Wait 60s for metrics accumulation |
| **Database connection timeout** | "Connection refused" errors in logs | PostgreSQL container down or volume issue | Check postgres: `docker-compose -f docker-compose.prod.yml ps postgres`; Verify volume: `docker volume ls \| grep postgres` |
| **Docker image pull fails** | "Repository not found" or "access denied" | Docker Hub credentials invalid or registry unavailable | Verify credentials in .env: `grep DOCKER_ .env`; Test manually: `docker login -u $DOCKER_USERNAME` |
| **Model inference failing with retries** | Worker logs show "inference timeout" | Model loading issues, insufficient GPU/RAM, or corrupted checkpoint | Check available RAM: `free -h`; Check model logs: `docker logs cs2-python \| grep model_version`; Re-download model: delete cache and restart |
| **Disk space exhausted** | "No space left" errors, services crash | Demo archive growing too large | Check usage: `du -sh /storage/demos`; Delete old demos: `find /storage/demos -mtime +90 -delete`; Consider S3 offload |
| **Services hang on startup** | Docker-compose up never completes | Health check failing on dependent service | Check health: `docker-compose -f docker-compose.prod.yml ps`; Increase health check timeout in compose file; Check logs: `docker logs <service>` |
| **Periodic 99th percentile latency spikes** | P99 latency sometimes > 5s | GC pauses, large demo processing, or resource contention | Monitor CPU/memory during spikes: `docker stats`; Consider splitting large demos; Increase resource limits |
| **Loki logs not appearing** | `curl http://localhost:3100/ready` returns error | Loki not running or config invalid | Check Loki: `docker logs cs2-loki`; Verify config: `cat docker/loki/loki-config.yml`; Restart: `docker-compose -f docker-compose.prod.yml restart loki` |

---

## Performance Tuning

### PostgreSQL Configuration

For high-volume deployments (100+ demos/hour):

```bash
# 1. Connect to postgres container
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U cs2_app -d cs2_production

# 2. Adjust settings
SET work_mem = '256MB';
SET maintenance_work_mem = '512MB';
SET shared_buffers = '256MB';

# 3. Enable query logging (for optimization)
ALTER SYSTEM SET log_min_duration_statement = 100;  -- Log queries > 100ms
SELECT pg_reload_conf();

# 4. Create indexes on frequently queried columns
CREATE INDEX idx_analysis_result_demo_id ON analysis_results(demo_id);
CREATE INDEX idx_analysis_result_created_at ON analysis_results(created_at DESC);
```

### Redis Configuration

For large queue depths:

```bash
# 1. Monitor queue depth
docker-compose -f docker-compose.prod.yml exec redis redis-cli LLEN cs2.analysis

# 2. Check memory usage
docker-compose -f docker-compose.prod.yml exec redis redis-cli INFO memory

# 3. Enable persistence for durability
# Already configured in docker-compose.prod.yml: "redis-server --appendonly yes"
```

### Python Worker Scaling

For bottleneck analysis processing:

```bash
# 1. Increase worker concurrency (spawn multiple workers)
# Scale python service: docker-compose -f docker-compose.prod.yml up -d --scale python=3

# 2. Monitor queue consumption
docker-compose -f docker-compose.prod.yml exec redis redis-cli LLEN cs2.analysis

# 3. Check worker resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Network Optimization

```bash
# 1. Check network bandwidth usage
iftop  # On VPS (requires installation)

# 2. Review slow queries
# Check PostgreSQL slow query log:
docker-compose -f docker-compose.prod.yml exec postgres \
  tail -100 /var/log/postgresql/postgresql.log | grep slow
```

### Monitoring & Alerting Setup

Create Prometheus alert rules for critical thresholds:

```yaml
# File: docker/prometheus/alert.rules.yml
groups:
  - name: cs2-detection
    interval: 30s
    rules:
      - alert: HighP95Latency
        expr: histogram_quantile(0.95, demo_analysis_duration_seconds) > 2
        for: 5m
        annotations:
          summary: "High API latency detected (P95 > 2s)"

      - alert: HighErrorRate
        expr: rate(demo_analysis_errors_total[5m]) > 0.05
        for: 2m
        annotations:
          summary: "Error rate > 5% (1 in 20)"

      - alert: DiskSpaceWarning
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 10m
        annotations:
          summary: "Disk space < 10% remaining"
```

---

## Support & Escalation

### Getting Help

1. **Check logs first:**
   ```bash
   docker-compose -f docker-compose.prod.yml logs <service_name>
   ```

2. **Consult Troubleshooting section** (above)

3. **Check Grafana dashboards** for trends and alerts

4. **Review Prometheus queries** for system health

### Alerting

Set up notifications (recommended, post-v1):
- Slack integration: alert on P95 latency > 2s, error rate > 5%
- PagerDuty: critical alerts (disk full, database down)
- Email: daily summary of error rates and resource usage

### On-Call Runbook

When alerted:
1. Check VPS status: `docker-compose -f docker-compose.prod.yml ps`
2. Review recent logs: `docker logs <service> | tail -50`
3. Check Grafana dashboards for anomalies
4. If service down: restart with `docker-compose -f docker-compose.prod.yml restart <service>`
5. If persistent: consider rollback (see Rollback Procedure)
6. Document incident: what failed, when, what fixed it

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-15 | Initial production deployment guide |

---

## Appendix: Useful Commands

```bash
# Service management
docker-compose -f docker-compose.prod.yml up -d          # Start all services
docker-compose -f docker-compose.prod.yml down           # Stop all services
docker-compose -f docker-compose.prod.yml restart php    # Restart single service
docker-compose -f docker-compose.prod.yml logs -f        # Stream logs

# Monitoring
docker stats                                              # Real-time resource usage
docker ps -a                                              # List all containers
docker images                                             # List available images
curl http://localhost:9090/targets                       # Prometheus targets
curl http://localhost:3001/api/health                    # Grafana health

# Database
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U cs2_app -d cs2_production                      # Connect to DB

# Testing
curl -X GET http://localhost/api/health                  # API health check
curl -X POST http://localhost/api/demos -F "file=@test.dem"  # Upload demo

# Cleanup
docker system prune                                       # Remove unused images/volumes
docker volume ls                                          # List volumes
docker volume rm demo_storage                             # Delete specific volume (caution!)
```

---

**For questions or issues, contact the development team or file an issue on GitHub.**
