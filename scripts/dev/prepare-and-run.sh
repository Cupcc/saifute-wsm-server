#!/bin/sh
set -eu

ENV_FILE="${DEV_ENV_FILE:-.env.dev}"

if [ ! -f "$ENV_FILE" ]; then
  echo "dev bootstrap failed: env file not found: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

echo "[dev-bootstrap] prisma generate"
bun run prisma:generate

exec "$@"
