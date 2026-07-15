#!/usr/bin/env bash

set -euo pipefail

APP_NAME="create-content"
ECOSYSTEM_FILE="ecosystem.config.cjs"
TARGET_BRANCH="master"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required but not installed."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

if [[ "${CURRENT_BRANCH}" != "${TARGET_BRANCH}" ]]; then
  echo "Refusing to deploy from branch '${CURRENT_BRANCH}'. Switch to '${TARGET_BRANCH}' first."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing to deploy with uncommitted changes in the working tree."
  exit 1
fi

echo "Fetching latest ${TARGET_BRANCH}..."
git fetch origin "${TARGET_BRANCH}"

echo "Pulling latest ${TARGET_BRANCH}..."
git pull --ff-only origin "${TARGET_BRANCH}"

echo "Installing dependencies with npm ci..."
npm ci

echo "Building production bundle..."
npm run build

if pm2 describe "${APP_NAME}" >/dev/null 2>&1; then
  echo "Reloading PM2 app '${APP_NAME}'..."
  pm2 reload "${ECOSYSTEM_FILE}" --update-env
else
  echo "Starting PM2 app '${APP_NAME}'..."
  pm2 start "${ECOSYSTEM_FILE}" --update-env
fi

echo "Deployment completed successfully."
