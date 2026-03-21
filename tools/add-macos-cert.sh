#!/bin/bash
# Install macOS code signing certificate in CI from GitHub Actions secrets:
# MACOS_CERT_P12 (base64-encoded .p12) and MACOS_CERT_PASSWORD.

set -euo pipefail

if [ -z "${MACOS_CERT_P12:-}" ] || [ -z "${MACOS_CERT_PASSWORD:-}" ]; then
  echo "MACOS_CERT_P12 and MACOS_CERT_PASSWORD must be set"
  exit 1
fi

KEYCHAIN_PATH="${RUNNER_TEMP}/app-signing.keychain-db"
KEYCHAIN_PASSWORD="$(openssl rand -base64 32)"

echo "$MACOS_CERT_P12" | base64 --decode > certificate.p12

security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

security import certificate.p12 -k "$KEYCHAIN_PATH" -P "$MACOS_CERT_PASSWORD" -T /usr/bin/codesign

security list-keychain -d user -s "$KEYCHAIN_PATH"
security default-keychain -s "$KEYCHAIN_PATH"

security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

rm -f certificate.p12

echo "Certificate installed successfully"
