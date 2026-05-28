#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="cs2-demo-cheat-detection"
DEFAULT_PROJECT_DIR="/opt/cs2-demo-cheat-detection"
PROJECT_DIR="${PROJECT_DIR:-$DEFAULT_PROJECT_DIR}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env}"
BACKUP_DIR="${BACKUP_DIR:-../cs2-demo-cheat-detection-backups}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/}"
WAIT_SECONDS="${WAIT_SECONDS:-45}"
SKIP_BACKUP="${SKIP_BACKUP:-0}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-0}"
SKIP_PULL="${SKIP_PULL:-0}"
SKIP_PRUNE="${SKIP_PRUNE:-0}"
BUILD_LOCAL="${BUILD_LOCAL:-0}"
LOCAL_IMAGE_NAMESPACE="${LOCAL_IMAGE_NAMESPACE:-local}"
FORCE="${FORCE:-0}"

usage() {
    cat <<USAGE
Usage: deploy.sh [options]

Pulls the latest GitHub version and deploys the production Docker Compose stack.

Options:
  --project-dir PATH       Project checkout path (default: ${DEFAULT_PROJECT_DIR})
  --repo-url URL           Git repository URL, required when PROJECT_DIR does not exist
  --branch NAME            Git branch to deploy (default: main)
  --compose-file FILE      Compose file (default: docker-compose.prod.yml)
  --env-file FILE          Environment file relative to project dir (default: .env)
  --backup-dir PATH        Database backup directory (default: ../cs2-demo-cheat-detection-backups)
  --health-url URL         Healthcheck URL (default: http://localhost:3000/)
  --wait SECONDS           Seconds to wait before healthcheck (default: 45)
  --skip-backup            Do not create a PostgreSQL dump before deployment
  --skip-migrations        Do not run Doctrine migrations
  --skip-pull              Do not pull Docker images before starting services
  --build-local            Build php/python/frontend images locally before startup
  --local-image-namespace  Image namespace for --build-local (default: local)
  --skip-prune             Do not run docker image prune
  --force                  Continue even if local checkout has uncommitted changes
  -h, --help               Show this help

Environment variables with the same uppercase names are also supported.
USAGE
}

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

run() {
    log "+ $*"
    "$@"
}

git_auth_help() {
    local remote_url
    remote_url="$(git remote get-url origin 2>/dev/null || true)"

    cat >&2 <<HELP

GitHub authentication failed while reading from origin.

Current user: $(id -un)
Origin URL: ${remote_url:-unknown}

If the origin URL starts with git@github.com:, this deployment user needs an SSH key
that GitHub accepts. Common fixes:

  1. Run the deploy as the Linux user that owns the GitHub SSH key.
  2. Add a read-only GitHub deploy key for this server/user.
  3. Switch origin to HTTPS with a GitHub token if that is your preferred setup.

Quick SSH check:
  ssh -T git@github.com

For a read-only deploy key as the current user:
  ssh-keygen -t ed25519 -C "${APP_NAME}-deploy" -f ~/.ssh/${APP_NAME}_deploy -N ""
  cat ~/.ssh/${APP_NAME}_deploy.pub

Then add the printed public key in GitHub:
  Repository -> Settings -> Deploy keys -> Add deploy key

HELP
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --project-dir)
                PROJECT_DIR="${2:?Missing value for --project-dir}"
                shift 2
                ;;
            --project-dir=*)
                PROJECT_DIR="${1#*=}"
                shift
                ;;
            --repo-url)
                REPO_URL="${2:?Missing value for --repo-url}"
                shift 2
                ;;
            --repo-url=*)
                REPO_URL="${1#*=}"
                shift
                ;;
            --branch)
                BRANCH="${2:?Missing value for --branch}"
                shift 2
                ;;
            --branch=*)
                BRANCH="${1#*=}"
                shift
                ;;
            --compose-file)
                COMPOSE_FILE="${2:?Missing value for --compose-file}"
                shift 2
                ;;
            --compose-file=*)
                COMPOSE_FILE="${1#*=}"
                shift
                ;;
            --env-file)
                ENV_FILE="${2:?Missing value for --env-file}"
                shift 2
                ;;
            --env-file=*)
                ENV_FILE="${1#*=}"
                shift
                ;;
            --backup-dir)
                BACKUP_DIR="${2:?Missing value for --backup-dir}"
                shift 2
                ;;
            --backup-dir=*)
                BACKUP_DIR="${1#*=}"
                shift
                ;;
            --health-url)
                HEALTH_URL="${2:?Missing value for --health-url}"
                shift 2
                ;;
            --health-url=*)
                HEALTH_URL="${1#*=}"
                shift
                ;;
            --wait)
                WAIT_SECONDS="${2:?Missing value for --wait}"
                shift 2
                ;;
            --wait=*)
                WAIT_SECONDS="${1#*=}"
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=1
                shift
                ;;
            --skip-migrations)
                SKIP_MIGRATIONS=1
                shift
                ;;
            --skip-pull)
                SKIP_PULL=1
                shift
                ;;
            --build-local)
                BUILD_LOCAL=1
                SKIP_PULL=1
                shift
                ;;
            --local-image-namespace)
                LOCAL_IMAGE_NAMESPACE="${2:?Missing value for --local-image-namespace}"
                shift 2
                ;;
            --local-image-namespace=*)
                LOCAL_IMAGE_NAMESPACE="${1#*=}"
                shift
                ;;
            --skip-prune)
                SKIP_PRUNE=1
                shift
                ;;
            --force)
                FORCE=1
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                fail "Unknown option: $1"
                ;;
        esac
    done
}

require_command() {
    command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

compose() {
    if docker compose version >/dev/null 2>&1; then
        docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
    elif command -v docker-compose >/dev/null 2>&1; then
        docker-compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
    else
        fail "Docker Compose v2 or docker-compose is required"
    fi
}

clone_or_enter_repo() {
    if [[ ! -d "$PROJECT_DIR/.git" ]]; then
        [[ -n "$REPO_URL" ]] || fail "PROJECT_DIR does not contain a Git checkout. Pass --repo-url to clone it."
        run mkdir -p "$(dirname "$PROJECT_DIR")"
        run git clone --branch "$BRANCH" "$REPO_URL" "$PROJECT_DIR"
    fi

    cd "$PROJECT_DIR"
    [[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $PROJECT_DIR/$COMPOSE_FILE"
    [[ -f "$ENV_FILE" ]] || fail "Environment file not found: $PROJECT_DIR/$ENV_FILE"
}

validate_checkout() {
    git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "Not inside a Git worktree"

    if [[ "$FORCE" != "1" ]] && [[ -n "$(git status --porcelain)" ]]; then
        fail "Local checkout has uncommitted changes. Commit/stash them or rerun with --force."
    fi
}

pull_latest() {
    local previous_sha
    previous_sha="$(git rev-parse --short HEAD)"

    if ! run git fetch --prune origin; then
        git_auth_help
        exit 1
    fi
    run git checkout "$BRANCH"
    if ! run git pull --ff-only origin "$BRANCH"; then
        git_auth_help
        exit 1
    fi

    local current_sha
    current_sha="$(git rev-parse --short HEAD)"
    log "Git revision: ${previous_sha} -> ${current_sha}"
}

backup_database() {
    if [[ "$SKIP_BACKUP" == "1" ]]; then
        log "Skipping database backup."
        return
    fi

    local postgres_container
    postgres_container="$(compose ps -q postgres 2>/dev/null || true)"

    if [[ -z "$postgres_container" ]] || [[ "$(docker inspect -f '{{.State.Running}}' "$postgres_container" 2>/dev/null || true)" != "true" ]]; then
        log "PostgreSQL service is not running yet; skipping pre-deployment backup."
        return
    fi

    mkdir -p "$BACKUP_DIR"

    local backup_file
    backup_file="${BACKUP_DIR%/}/postgres_$(date '+%Y%m%d_%H%M%S').sql.gz"

    log "Creating PostgreSQL backup: $backup_file"
    compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$backup_file"
}

deploy_stack() {
    if [[ "$BUILD_LOCAL" == "1" ]]; then
        log "Building application images locally with namespace '${LOCAL_IMAGE_NAMESPACE}'."
        export DOCKER_USERNAME="$LOCAL_IMAGE_NAMESPACE"
        run docker build -f docker/php/Dockerfile -t "${DOCKER_USERNAME}/cs2-php:latest" .
        run docker build -f docker/python/Dockerfile -t "${DOCKER_USERNAME}/cs2-python:latest" .
        run docker build -f frontend/Dockerfile -t "${DOCKER_USERNAME}/cs2-frontend:latest" frontend
    fi

    run compose config --quiet
    if [[ "$SKIP_PULL" == "1" ]]; then
        log "Skipping Docker image pull."
    else
        run compose pull
    fi
    run compose up -d --remove-orphans
}

run_migrations() {
    if [[ "$SKIP_MIGRATIONS" == "1" ]]; then
        log "Skipping Doctrine migrations."
        return
    fi

    log "Running Doctrine migrations."
    run compose exec -T php php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration
    run compose exec -T php php bin/console cache:clear --env=prod --no-debug
}

verify_deployment() {
    log "Waiting ${WAIT_SECONDS}s for services to settle."
    sleep "$WAIT_SECONDS"

    run compose ps

    log "Checking API health: $HEALTH_URL"
    curl --fail --silent --show-error --max-time 15 "$HEALTH_URL" >/dev/null

    log "Deployment healthcheck passed."
}

cleanup_images() {
    if [[ "$SKIP_PRUNE" == "1" ]]; then
        log "Skipping Docker image prune."
        return
    fi

    run docker image prune -f
}

main() {
    parse_args "$@"

    require_command git
    require_command docker
    require_command curl
    require_command gzip

    log "Starting ${APP_NAME} deployment."
    clone_or_enter_repo
    validate_checkout
    pull_latest
    backup_database
    deploy_stack
    run_migrations
    verify_deployment
    cleanup_images
    log "Deployment complete."
}

main "$@"
