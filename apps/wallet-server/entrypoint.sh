#!/bin/sh
set -e

# Refuse to start if the wallet database directory is not explicitly mounted from
# outside the container. Without an external mount, wallet data (DIDs, credentials,
# keys) is written to the container's ephemeral writable layer and lost on restart.
WALLET_DB_DIR="$(dirname "${WALLET_DB_PATH:-/data/wallet-db}")"
if ! grep -qs " ${WALLET_DB_DIR} " /proc/mounts; then
  echo "Error: ${WALLET_DB_DIR} is not externally mounted." >&2
  echo "Wallet data requires a persistent bind mount. Example:" >&2
  echo "  docker run --mount type=bind,source=/your/wallet-data,target=${WALLET_DB_DIR} ..." >&2
  exit 1
fi

exec "$@"
