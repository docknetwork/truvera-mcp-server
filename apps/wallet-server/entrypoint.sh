#!/bin/sh
set -e

# Refuse to start if /data is not explicitly mounted from outside the container.
# Without an external mount, wallet data (DIDs, credentials, keys) is written to
# the container's ephemeral writable layer and is lost on every restart or rm.
if ! grep -qs ' /data ' /proc/mounts; then
  echo "Error: /data is not externally mounted." >&2
  echo "Wallet data requires a persistent bind mount. Example:" >&2
  echo "  docker run --mount type=bind,source=/your/wallet-data,target=/data ..." >&2
  exit 1
fi

exec "$@"
