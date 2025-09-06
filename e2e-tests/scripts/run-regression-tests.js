#!/usr/bin/env node

/**
 * APPLAA REGRESSION TEST RUNNER
 * 
 * This script runs critical regression tests to ensure core functionality
 * remains stable across releases and feature additions.
 * 
 * Usage:
 *   npm run test:regression
 *   node e2e-tests/scripts/run-regression-tests.js
 * 
 * Test Categories:
 * - Core Flows (App Creation → Chat Navigation)
 * - Authentication & Provider Status
 * - Error Recovery & Resilience
 * - Navigation State Management
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const COLORS = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

function log(message, color = COLORS.WHITE) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function logHeader(message) {
  log(`\n${COLORS.BOLD}${COLORS.CYAN}🚀 ${message}${COLORS.RESET}\n`);
}

function logSuccess(message) {
  log(`${COLORS.GREEN}✅ ${message}${COLORS.RESET}`);
}

function logError(message) {
  log(`${COLORS.RED}❌ ${message}${COLORS.RESET}`);
}

function logWarning(message) {
  log(`${COLORS.YELLOW}⚠️  ${message}${COLORS.RESET}`);
}

function logInfo(message) {
  log(`${COLORS.BLUE}ℹ️  ${message}${COLORS.RESET}`);
}

async function runCommand(command, description) {
  try {
    logInfo(`Running: ${description}`);
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '../..')
    });
    logSuccess(`${description} - PASSED`);
    return { success: true, output };
  } catch (error) {
    logError(`${description} - FAILED`);
    logError(error.message);
    return { success: false, error: error.message };
  }
}

async function checkPrerequisites() {
  logHeader('Checking Prerequisites');
  
  // Check if Playwright is installed
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    logSuccess('Playwright is installed');
  } catch (error) {
    logError('Playwright is not installed. Run: npm install @playwright/test');
    return false;
  }
  
  // Check if build exists
  const buildPath = path.resolve(__dirname, '../../out');
  if (!fs.existsSync(buildPath)) {
    logWarning('Build not found. Running pre:e2e to build application...');
    try {
      execSync('npm run pre:e2e', { stdio: 'inherit' });
      logSuccess('Application built successfully');
    } catch (error) {
      logError('Failed to build application');
      return false;
    }
  } else {
    logSuccess('Application build found');
  }
  
  // Check if fake LLM server dependencies are installed
  const fakeServerPath = path.resolve(__dirname, '../../testing/fake-llm-server');
  if (fs.existsSync(fakeServerPath)) {
    try {
      execSync('npm list', { cwd: fakeServerPath, stdio: 'pipe' });
      logSuccess('Fake LLM server dependencies are installed');
    } catch (error) {
      logWarning('Installing fake LLM server dependencies...');
      execSync('npm install', { cwd: fakeServerPath, stdio: 'inherit' });
    }
  }
  
  return true;
}

async function runRegressionTests() {
  logHeader('Running Critical Regression Tests');
  
  const testResults = [];
  
  // Core regression tests
  const coreTest = await runCommand(
    'npx playwright test e2e-tests/regression/core_flows.spec.ts --reporter=line',
    'Core App Creation & Chat Navigation Flow Tests'
  );
  testResults.push({ name: 'Core Flows', ...coreTest });
  
  // Existing critical tests that should not break
  const existingTests = [
    {
      command: 'npx playwright test e2e-tests/main.spec.ts --reporter=line',
      name: 'Basic Message Tests',
      description: 'Basic messaging functionality'
    },
    {
      command: 'npx playwright test e2e-tests/new_chat.spec.ts --reporter=line', 
      name: 'New Chat Tests',
      description: 'New chat creation and navigation'
    },
    {
      command: 'npx playwright test e2e-tests/ui_screens.spec.ts --reporter=line',
      name: 'UI Screens Tests', 
      description: 'Core UI screen functionality'
    }
  ];
  
  for (const test of existingTests) {
    const result = await runCommand(test.command, test.description);
    testResults.push({ name: test.name, ...result });
  }
  
  return testResults;
}

function generateReport(testResults) {
  logHeader('Test Results Summary');
  
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  const total = testResults.length;
  
  testResults.forEach(result => {
    if (result.success) {
      logSuccess(`${result.name}: PASSED`);
    } else {
      logError(`${result.name}: FAILED`);
    }
  });
  
  log(`\n${COLORS.BOLD}Overall Results:${COLORS.RESET}`);
  log(`Total Tests: ${total}`);
  logSuccess(`Passed: ${passed}`);
  if (failed > 0) {
    logError(`Failed: ${failed}`);
  }
  
  const successRate = ((passed / total) * 100).toFixed(1);
  if (successRate >= 90) {
    logSuccess(`Success Rate: ${successRate}% - EXCELLENT`);
  } else if (successRate >= 75) {
    logWarning(`Success Rate: ${successRate}% - GOOD`);
  } else {
    logError(`Success Rate: ${successRate}% - NEEDS ATTENTION`);
  }
  
  if (failed > 0) {
    log(`\n${COLORS.RED}${COLORS.BOLD}⚠️  REGRESSION DETECTED! ⚠️${COLORS.RESET}`);
    log(`${COLORS.RED}Some critical tests are failing. Please review and fix before release.${COLORS.RESET}`);
    return false;
  } else {
    log(`\n${COLORS.GREEN}${COLORS.BOLD}🎉 ALL REGRESSION TESTS PASSED! 🎉${COLORS.RESET}`);
    log(`${COLORS.GREEN}Core functionality is stable and ready for release.${COLORS.RESET}`);
    return true;
  }
}

async function main() {
  logHeader('Applaa Regression Test Suite');
  log('Ensuring core functionality remains stable across releases...\n');
  
  // Check prerequisites
  const prereqsOk = await checkPrerequisites();
  if (!prereqsOk) {
    process.exit(1);
  }
  
  // Run regression tests
  const testResults = await runRegressionTests();
  
  // Generate report
  const allPassed = generateReport(testResults);
  
  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logError(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  logError(`Script failed: ${error.message}`);
  process.exit(1);
});

