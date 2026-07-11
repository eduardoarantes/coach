#!/usr/bin/env bash
# Generate MCP Registry domain verification keys and the public proof file.
# Run once, then:
#   1. Commit public/.well-known/mcp-registry-auth
#   2. Deploy to production (coachwatts.com)
#   3. Add MCP_PRIVATE_KEY to GitHub repo secrets
#   4. mcp-publisher login http --domain coachwatts.com --private-key "$MCP_PRIVATE_KEY"
#   5. mcp-publisher publish

set -euo pipefail

DOMAIN="${MCP_REGISTRY_DOMAIN:-coachwatts.com}"
KEY_FILE="${MCP_REGISTRY_KEY_FILE:-./.mcp-registry-key.pem}"
PROOF_FILE="./public/.well-known/mcp-registry-auth"

if command -v /opt/homebrew/opt/openssl@3/bin/openssl >/dev/null 2>&1; then
  OPENSSL=/opt/homebrew/opt/openssl@3/bin/openssl
elif openssl version 2>/dev/null | grep -q 'OpenSSL 3'; then
  OPENSSL=openssl
else
  echo "OpenSSL 3+ is required for Ed25519. On macOS: brew install openssl@3" >&2
  exit 1
fi

mkdir -p "$(dirname "$PROOF_FILE")"

if [[ -f "$KEY_FILE" ]]; then
  echo "Reusing existing key: $KEY_FILE"
else
  echo "Generating Ed25519 key pair at $KEY_FILE"
  "$OPENSSL" genpkey -algorithm Ed25519 -out "$KEY_FILE"
  chmod 600 "$KEY_FILE"
fi

PUBLIC_KEY="$("$OPENSSL" pkey -in "$KEY_FILE" -pubout -outform DER | tail -c 32 | base64)"
PRIVATE_KEY="$("$OPENSSL" pkey -in "$KEY_FILE" -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"

echo "v=MCPv1; k=ed25519; p=${PUBLIC_KEY}" > "$PROOF_FILE"
echo "Wrote public proof to $PROOF_FILE"
echo
echo "Next steps:"
echo "  1. git add public/.well-known/mcp-registry-auth"
echo "  2. Deploy to production and verify:"
echo "       curl https://${DOMAIN}/.well-known/mcp-registry-auth"
echo "  3. Add GitHub secret MCP_PRIVATE_KEY (value below)"
echo "  4. Authenticate and publish:"
echo "       mcp-publisher login http --domain ${DOMAIN} --private-key \"\$MCP_PRIVATE_KEY\""
echo "       mcp-publisher publish"
echo
echo "MCP_PRIVATE_KEY=${PRIVATE_KEY}"
