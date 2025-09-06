#!/bin/bash

# Web App Quality Testing Framework Runner
# This script runs comprehensive quality tests on 30 diverse web apps

echo "🚀 Applaa Web App Quality Testing Framework"
echo "============================================="
echo ""

# Ensure test-results directory exists
mkdir -p test-results

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js and try again."
    exit 1
fi

echo "📊 Starting quality tests for 30 diverse web applications..."
echo "⏱️  This may take 10-15 minutes to complete."
echo ""

# Run the quality tester
node scripts/webapp-quality-tester.js

# Check if tests completed successfully
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Quality testing completed successfully!"
    echo ""
    echo "📁 Results saved in test-results/ directory:"
    echo "   📄 webapp-quality-test-*.json (detailed data)"
    echo "   📋 quality-report-*.md (human-readable report)"
    echo "   🔧 system-prompt-improvements-*.md (actionable improvements)"
    echo ""
    echo "🎯 Next Steps:"
    echo "1. Review the quality report for error patterns"
    echo "2. Implement system prompt improvements"
    echo "3. Enhance syntax validator with new rules"
    echo "4. Re-run tests to measure improvement"
    echo ""
    echo "🎉 Ready to achieve 100% web app creation quality!"
else
    echo ""
    echo "❌ Quality testing failed. Please check the error messages above."
    exit 1
fi





