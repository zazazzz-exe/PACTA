#!/usr/bin/env bash
#
# Pacta — MAINNET deploy (real funds, real fees).
#
# ⚠️  WARNING: This deploys the escrow contract to the Stellar PUBLIC network.
#     Any Pact created against it custodies REAL money in code that has NOT been
#     independently security-audited. Deploy/transaction fees are paid in REAL XLM.
#     A contract bug can mean permanent, unrecoverable loss of funds.
#
# Prerequisites:
#   1. `stellar` CLI + Rust wasm target installed (same as testnet).
#   2. A MAINNET Stellar account funded with real XLM, imported as a CLI identity.
#        stellar keys add pacta_mainnet --secret-key   # paste your funded S... key
#      (There is NO friendbot on mainnet — the account must already hold XLM.)
#
# Run from the REPO ROOT, in bash (WSL on Windows — not PowerShell):
#     DEPLOYER=pacta_mainnet bash scripts/deploy-mainnet.sh
#
set -euo pipefail

# ---- config ----
NETWORK="mainnet"
RPC_URL="${RPC_URL:-https://mainnet.sorobanrpc.com}"
PASSPHRASE="Public Global Stellar Network ; September 2015"
DEPLOYER="${DEPLOYER:-pacta_mainnet}"   # a FUNDED mainnet identity (override via env)
ALIAS="pacta_escrow_mainnet"
CONTRACT_DIR="contracts/pacta-escrow"

# Settlement asset the frontend expects on mainnet (USDC by Circle). If you intend
# to settle in a different asset, change USDC_ASSET accordingly.
USDC_ASSET="USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"

echo "############################################################"
echo "#  MAINNET DEPLOY — this spends REAL XLM and deploys code  #"
echo "#  that custodies REAL funds. Ctrl-C now to abort.         #"
echo "############################################################"
read -r -p "Type 'DEPLOY MAINNET' to continue: " CONFIRM
[ "$CONFIRM" = "DEPLOY MAINNET" ] || { echo "Aborted."; exit 1; }

echo "==> Ensuring wasm target"
rustup target add wasm32v1-none >/dev/null 2>&1 || true

echo "==> Configuring '$NETWORK' network (ok if it already exists)"
stellar network add "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" 2>/dev/null || true

echo "==> Resolving deployer / admin address (must be funded on mainnet)"
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
  --admin "$ADMIN" | tail -n 1)"
echo "    contract id: $CONTRACT_ID"

echo "==> Resolving USDC settlement SAC on mainnet"
SETTLEMENT_SAC="$(stellar contract id asset --network "$NETWORK" --asset "$USDC_ASSET")"
echo "    settlement SAC (USDC): $SETTLEMENT_SAC"

cat <<EOF

============================================================
 Pacta deployed to MAINNET.

 Put these into Vercel (Project Settings > Environment Variables),
 Production scope, then REDEPLOY the site:

   VITE_MAINNET_PACTS_ENABLED      = true
   VITE_MAINNET_ESCROW_CONTRACT_ID = $CONTRACT_ID
   VITE_MAINNET_SETTLEMENT_SAC     = $SETTLEMENT_SAC
   VITE_MAINNET_READ_SOURCE        = $ADMIN

 Verify the contract on Stellar Expert (public network) before use:
   https://stellar.expert/explorer/public/contract/$CONTRACT_ID
============================================================
EOF
