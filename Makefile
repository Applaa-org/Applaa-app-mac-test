.PHONY: help make sign check-env

# Default target
.DEFAULT_GOAL := make

# Apple Team ID (default from forge.config.ts)
APPLE_TEAM_ID ?= P7VCYRVVPQ

# Check for required environment variables
check-env:
	@echo "🔍 Checking environment variables..."
	@if [ -f .env ]; then \
		set -a; \
		. .env; \
		set +a; \
	fi; \
	if [ -z "$$APPLE_ID" ]; then \
		echo "❌ Error: APPLE_ID is not set"; \
		echo "   Please set it in your .env file or export it:"; \
		echo "   export APPLE_ID=your-apple-id@example.com"; \
		exit 1; \
	fi; \
	if [ -z "$$APPLE_APP_SPECIFIC_PASSWORD" ] && [ -z "$$APPLE_PASSWORD" ]; then \
		echo "❌ Error: APPLE_APP_SPECIFIC_PASSWORD or APPLE_PASSWORD is not set"; \
		echo "   Please set one in your .env file or export it:"; \
		echo "   export APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password"; \
		echo "   Or:"; \
		echo "   export APPLE_PASSWORD=your-apple-password"; \
		exit 1; \
	fi; \
	if [ -z "$$APPLE_TEAM_ID" ]; then \
		export APPLE_TEAM_ID="$(APPLE_TEAM_ID)"; \
	fi; \
	echo "✅ Environment variables check passed"; \
	echo "   APPLE_ID: $$APPLE_ID"; \
	echo "   APPLE_TEAM_ID: $${APPLE_TEAM_ID:-$(APPLE_TEAM_ID)}"; \
	echo "   APPLE_APP_SPECIFIC_PASSWORD: $$([ -n "$$APPLE_APP_SPECIFIC_PASSWORD" ] && echo "***set***" || echo "not set")"; \
	echo "   APPLE_PASSWORD: $$([ -n "$$APPLE_PASSWORD" ] && echo "***set***" || echo "not set")"

# Verify code signing identity is available
check-signing-identity:
	@echo "🔐 Checking code signing identity..."
	@if ! security find-identity -v -p codesigning | grep -q "Developer ID Application: Applaa Ltd (P7VCYRVVPQ)"; then \
		echo "❌ Error: Code signing identity not found"; \
		echo "   Expected: Developer ID Application: Applaa Ltd (P7VCYRVVPQ)"; \
		echo "   Please install the certificate in Keychain Access"; \
		exit 1; \
	fi
	@echo "✅ Code signing identity found"

# Main make target - builds, signs, and notarizes
make: check-env check-signing-identity
	@echo "🚀 Starting build with signing and notarization..."
	@echo "📦 This may take several minutes..."
	@bash -c '\
		if [ -f .env ]; then \
			set -a; \
			. .env; \
			set +a; \
		fi; \
		export APPLE_TEAM_ID="$${APPLE_TEAM_ID:-$(APPLE_TEAM_ID)}"; \
		export NODE_OPTIONS="--max-old-space-size=4096"; \
		npm run make'
	@echo "✅ Build complete! The app is signed and notarized."
	@echo "📱 Users can now use the app without warnings."

# Help target
help:
	@echo "Applaa Build Makefile"
	@echo ""
	@echo "Usage:"
	@echo "  make          - Build, sign, and notarize the app"
	@echo "  make check-env - Check if required environment variables are set"
	@echo "  make help     - Show this help message"
	@echo ""
	@echo "Required Environment Variables:"
	@echo "  APPLE_ID                    - Your Apple ID email"
	@echo "  APPLE_APP_SPECIFIC_PASSWORD - App-specific password (preferred)"
	@echo "  APPLE_PASSWORD              - Apple ID password (alternative)"
	@echo "  APPLE_TEAM_ID               - Apple Team ID (default: P7VCYRVVPQ)"
	@echo ""
	@echo "You can set these in a .env file or export them in your shell."
	@echo ""
	@echo "Example .env file:"
	@echo "  APPLE_ID=your-email@example.com"
	@echo "  APPLE_APP_SPECIFIC_PASSWORD=abcd-efgh-ijkl-mnop"
	@echo "  APPLE_TEAM_ID=P7VCYRVVPQ"

