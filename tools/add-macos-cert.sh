#!/bin/bash

# Script to install macOS code signing certificate in GitHub Actions

set -e

echo "🔐 Installing macOS code signing certificate..."

# Create a temporary keychain
KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db
KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

# Decode the certificate
echo "$MACOS_CERT_P12" | base64 --decode > certificate.p12

# Create temporary keychain
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Import certificate to keychain
security import certificate.p12 -k "$KEYCHAIN_PATH" -P "$MACOS_CERT_PASSWORD" -T /usr/bin/codesign

# Set the keychain as default
security list-keychain -d user -s "$KEYCHAIN_PATH"
security default-keychain -s "$KEYCHAIN_PATH"

# Allow codesign to access the keychain
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Clean up certificate file
rm -f certificate.p12

echo "✅ Certificate installed successfully"
