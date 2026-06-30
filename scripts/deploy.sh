#!/usr/bin/env bash
#
# Pacta — one-command testnet bootstrap / redeploy.
# Re-runnable: safe to run again after a testnet archive or a contract change.
# Run from the REPO ROOT, in bash (WSL on Windows — not PowerShell):
#     bash scripts/deploy.sh
#
# Assumes the workspace layout from PRD.md §10.

set -euo pipefail

# ---- config ----
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
PASSPHRASE="Test SDF Network ; September 2015"
DEPLOYER="deployer"            # identity used to deploy (also the contract admin)
ALIAS="pacta_escrow"           # contract alias
CONTRACT_DIR="contracts/pacta-escrow"
BINDINGS_DIR="packages/pacta"

echo "==> Ensuring wasm target"
rustup target add wasm32v1-none >/dev/null 2>&1 || true

echo "==> Configuring '$NETWORK' network (ok if it already exists)"
stellar network add "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" 2>/dev/null || true

echo "==> Ensuring funded deployer identity (ok if it already exists)"
stellar keys generate --fund "$DEPLOYER" --network "$NETWORK" 2>/dev/null || true
ADMIN="$(stellar keys address "$DEPLOYER")"
echo "    deployer / admin: $ADMIN"

echo "==> Building contract"
stellar contract build

WASM="$(find . -path '*wasm32v1-none/release/pacta_escrow.wasm' | head -n 1)"
if [ -z "$WASM" ]; then
  echo "ERROR: pacta_escrow.wasm not found after build." >&2
  exit 1
fi
echo "    wasm: $WASM"

echo "==> Running tests (GATE — must pass)"
( cd "$CONTRACT_DIR" && cargo test )

echo "==> Deploying to $NETWORK (constructor admin = $ADMIN)"
CONTRACT_ID="$(stellar contract deploy \
  --wasm "$WASM" \
  --source-account "$DEPLOYER" \
  --network "$NETWORK" \
  --alias "$ALIAS" \
  -- \
  --admin "$ADMIN" 2>/dev/null | tail -n 1)"
echo "    contract id: $CONTRACT_ID"

echo "==> Resolving native XLM SAC token address"
TOKEN_ADDRESS="$(stellar contract id asset --network "$NETWORK" --asset native)"
echo "    token (XLM SAC): $TOKEN_ADDRESS"

echo "==> Generating TypeScript bindings -> $BINDINGS_DIR"
rm -rf "$BINDINGS_DIR"
stellar contract bindings typescript \
  --network "$NETWORK" \
  --contract-id "$ALIAS" \
  --output-dir "$BINDINGS_DIR"

cat <<EOF

============================================================
 Pacta deployed to $NETWORK.

   CONTRACT_ID   = $CONTRACT_ID
   TOKEN_ADDRESS = $TOKEN_ADDRESS   (native XLM SAC)
   RPC_URL       = $RPC_URL
   PASSPHRASE    = $PASSPHRASE

 Next:
   1) Put CONTRACT_ID + TOKEN_ADDRESS into frontend/src/lib/config.ts
   2) cd frontend && npm install && npm run dev
   3) View the contract on Stellar Expert (testnet) using CONTRACT_ID
============================================================
EOF
