#!/usr/bin/env bash

set -euo pipefail

BRANCH="master"
REMOTE="origin"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Deploying $(basename "$SCRIPT_DIR") from ${REMOTE}/${BRANCH}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed."
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash changes before deploy."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$BRANCH" ]]; then
  echo "Current branch is '$CURRENT_BRANCH'. Expected '$BRANCH'."
  exit 1
fi

echo "==> Pull latest code"
git pull "$REMOTE" "$BRANCH"

echo "==> Install dependencies"
npm ci

echo "==> Build app"
npm run build
