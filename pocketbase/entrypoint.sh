#!/bin/sh
set -e

DATA_DIR="/pb_data"
KEY_FILE="${DATA_DIR}/.encryption_key"

mkdir -p "$DATA_DIR"

if [ ! -f "$KEY_FILE" ]; then
  echo "[PocketBase] No encryption key found — generating one..."
  # Use dd + base64, available in the base Alpine image (no openssl needed)
  dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n=' | head -c 32 > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "[PocketBase] Encryption key saved to volume."
fi

export PB_ENCRYPTION_KEY
PB_ENCRYPTION_KEY=$(cat "$KEY_FILE")

echo "[PocketBase] Starting with encryption enabled."
exec /usr/local/bin/pocketbase serve \
  --http=0.0.0.0:8090 \
  --dir="$DATA_DIR" \
  --encryptionEnv=PB_ENCRYPTION_KEY \
  "$@"
