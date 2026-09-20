#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

APP_NAME="create-content"
ECOSYSTEM_FILE="ecosystem.config.cjs"
TARGET_BRANCH="${TARGET_BRANCH:-master}"
ENV_FILE=""

if [[ -f .env.local ]]; then
  ENV_FILE=".env.local"
elif [[ -f .env ]]; then
  ENV_FILE=".env"
fi

PORT="${PORT:-}"
if [[ -z "${PORT}" && -n "${ENV_FILE}" ]]; then
  PORT="$(grep -E '^[[:space:]]*PORT=' "${ENV_FILE}" | tail -n 1 | cut -d= -f2- | tr -d '[:space:]' | tr -d '"' | tr -d "'")"
fi
PORT="${PORT:-3004}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

need npm
need node

echo "Deploying ${APP_NAME} on port ${PORT}"
echo "Working directory: $(pwd)"

if [[ -d .git ]] && command -v git >/dev/null 2>&1; then
  CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "${CURRENT_BRANCH}" != "${TARGET_BRANCH}" ]]; then
    echo "Refusing to deploy from branch '${CURRENT_BRANCH}'. Switch to '${TARGET_BRANCH}' first."
    exit 1
  fi
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Refusing to deploy with uncommitted changes. Commit or stash first, or upload a clean copy."
    exit 1
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    echo "Pulling latest ${TARGET_BRANCH}..."
    git fetch origin "${TARGET_BRANCH}"
    git pull --ff-only origin "${TARGET_BRANCH}"
  fi
else
  echo "No git repository detected. Building uploaded files as-is."
fi

if [[ -f package-lock.json ]]; then
  echo "Installing dependencies with npm ci..."
  npm ci
else
  echo "Installing dependencies with npm install..."
  npm install --omit=dev=false
fi

echo "Building production bundle..."
npm run build

if command -v pm2 >/dev/null 2>&1; then
  export PORT
  if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
    echo "Reloading PM2 app '${APP_NAME}' on port ${PORT}..."
    pm2 reload "${ECOSYSTEM_FILE}" --update-env
  else
    echo "Starting PM2 app '${APP_NAME}' on port ${PORT}..."
    pm2 start "${ECOSYSTEM_FILE}" --update-env
  fi
  pm2 save
else
  echo "pm2 is not installed. Starting with npm..."
  echo "Run in background: PORT=${PORT} NODE_ENV=production npm run start"
  PORT="${PORT}" NODE_ENV=production npm run start
fi

echo "Deployment completed. App should listen on port ${PORT}."
