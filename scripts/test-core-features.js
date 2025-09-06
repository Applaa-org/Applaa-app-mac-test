#!/usr/bin/env node

/**
 * 🚨 CRITICAL: Core Features Test Runner
 * 
 * This script runs comprehensive tests for Applaa's core features:
 * - Chat stream and file creation
 * - Dependency management
 * - Mobile app creation (Capacitor)
 * - Expo app creation
 * - Integration tests
 * 
 * Run this before any manual testing to catch infrastructure issues early.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}🚀 ${msg}${colors.reset}\n`)
};

// Test suites to run
const testSuites = [
  {
    name: 'Chat Stream Integration',
    pattern: 'src/__tests__/core/chat-stream-integration.test.ts',
    critical: true,
    description: 'Tests file creation, tag parsing, and stream processing'
  },
  {
    name: 'Dependency Management',
    pattern: 'src/__tests__/core/dependency-management.test.ts',
    critical: true,
    description: 'Tests package manager detection and dependency installation'
  },
  {
    name: 'Capacitor Mobile Creation',
    pattern: 'src/__tests__/core/capacitor-mobile-creation.test.ts',
    critical: true,
    description: 'Tests mobile app source generation and configuration'
  },
  {
    name: 'Intelligent Preview System',
    pattern: 'src/__tests__/intelligent_preview_system.test.ts',
    critical: false,
    description: 'Tests preview system performance and reliability'
  },
  {
    name: 'Preview Integration',
    pattern: 'src/__tests__/preview_integration.test.ts',
    critical: false,
    description: 'Tests preview system integration with chat stream'
  }
];

// Performance thresholds
const performanceThresholds = {
  maxTestDuration: 30000, // 30 seconds per test suite
  maxTotalDuration: 120000, // 2 minutes total
  minPassRate: 0.95 // 95% of tests must pass
};

async function runTestSuite(suite) {
  return new Promise((resolve, reject) => {
    log.info(`Running ${suite.name}...`);
    log.info(`Description: ${suite.description}`);
    
    const startTime = Date.now();
    
    // Check if test file exists
    if (!fs.existsSync(suite.pattern)) {
      log.warning(`Test file not found: ${suite.pattern}`);
      resolve({
        name: suite.name,
        status: 'skipped',
        reason: 'Test file not found',
        duration: 0,
        passed: 0,
        failed: 0,
        total: 0
      });
      return;
    }

    const jest = spawn('npx', ['jest', suite.pattern, '--verbose', '--no-cache'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';

    jest.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      // Show real-time output for critical tests
      if (suite.critical) {
        process.stdout.write(text);
      }
    });

    jest.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      if (suite.critical) {
        process.stderr.write(text);
      }
    });

    jest.on('close', (code) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Parse Jest output to get test results
      const results = parseJestOutput(output);
      
      const result = {
        name: suite.name,
        status: code === 0 ? 'passed' : 'failed',
        duration,
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        output: output,
        errorOutput: errorOutput
      };

      if (code === 0) {
        log.success(`${suite.name} completed successfully (${duration}ms)`);
        log.info(`Tests: ${results.passed} passed, ${results.failed} failed, ${results.total} total`);
      } else {
        log.error(`${suite.name} failed (${duration}ms)`);
        log.error(`Tests: ${results.passed} passed, ${results.failed} failed, ${results.total} total`);
        if (suite.critical) {
          log.error('This is a critical test suite failure!');
        }
      }

      resolve(result);
    });

    jest.on('error', (error) => {
      log.error(`Failed to run ${suite.name}: ${error.message}`);
      reject(error);
    });

    // Timeout handling
    setTimeout(() => {
      jest.kill();
      log.error(`${suite.name} timed out after ${performanceThresholds.maxTestDuration}ms`);
      resolve({
        name: suite.name,
        status: 'timeout',
        duration: performanceThresholds.maxTestDuration,
        passed: 0,
        failed: 0,
        total: 0
      });
    }, performanceThresholds.maxTestDuration);
  });
}

function parseJestOutput(output) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Parse Jest summary line
  const summaryMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (summaryMatch) {
    results.failed = parseInt(summaryMatch[1]);
    results.passed = parseInt(summaryMatch[2]);
    results.total = parseInt(summaryMatch[3]);
  } else {
    // Try alternative format
    const passedMatch = output.match(/(\d+)\s+passing/);
    const failedMatch = output.match(/(\d+)\s+failing/);
    
    if (passedMatch) results.passed = parseInt(passedMatch[1]);
    if (failedMatch) results.failed = parseInt(failedMatch[1]);
    results.total = results.passed + results.failed;
  }

  return results;
}

function generateReport(results) {
  log.header('TEST RESULTS SUMMARY');

  const totalTests = results.reduce((sum, r) => sum + r.total, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  // Overall statistics
  console.log(`📊 Overall Results:`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${colors.green}${totalPassed}${colors.reset}`);
  console.log(`   Failed: ${colors.red}${totalFailed}${colors.reset}`);
  console.log(`   Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
  
  const passRate = totalTests > 0 ? (totalPassed / totalTests) : 0;
  console.log(`   Pass Rate: ${passRate >= performanceThresholds.minPassRate ? colors.green : colors.red}${(passRate * 100).toFixed(1)}%${colors.reset}`);

  console.log(`\n📋 Test Suite Details:`);
  
  // Individual test suite results
  results.forEach(result => {
    const statusColor = result.status === 'passed' ? colors.green : 
                       result.status === 'failed' ? colors.red : colors.yellow;
    
    console.log(`   ${statusColor}${result.status.toUpperCase()}${colors.reset} ${result.name}`);
    console.log(`     Duration: ${result.duration}ms`);
    console.log(`     Tests: ${result.passed} passed, ${result.failed} failed`);
    
    if (result.status === 'failed' || result.status === 'timeout') {
      console.log(`     ${colors.red}⚠️ Requires attention${colors.reset}`);
    }
  });

  // Performance analysis
  console.log(`\n⚡ Performance Analysis:`);
  
  const slowSuites = results.filter(r => r.duration > 10000);
  if (slowSuites.length > 0) {
    log.warning(`Slow test suites (>10s):`);
    slowSuites.forEach(suite => {
      console.log(`   - ${suite.name}: ${suite.duration}ms`);
    });
  }

  if (totalDuration > performanceThresholds.maxTotalDuration) {
    log.warning(`Total test duration (${totalDuration}ms) exceeds threshold (${performanceThresholds.maxTotalDuration}ms)`);
  }

  // Critical failures
  const criticalFailures = results.filter(r => 
    testSuites.find(s => s.name === r.name)?.critical && r.status !== 'passed'
  );

  if (criticalFailures.length > 0) {
    log.error(`🚨 CRITICAL TEST FAILURES:`);
    criticalFailures.forEach(failure => {
      console.log(`   - ${failure.name}: ${failure.status}`);
    });
    console.log(`\n${colors.red}${colors.bright}These failures may indicate serious issues with core functionality!${colors.reset}`);
  }

  // Recommendations
  console.log(`\n💡 Recommendations:`);
  
  if (passRate < performanceThresholds.minPassRate) {
    log.error(`Pass rate (${(passRate * 100).toFixed(1)}%) is below threshold (${(performanceThresholds.minPassRate * 100)}%)`);
    console.log(`   - Review and fix failing tests before proceeding`);
  }
  
  if (criticalFailures.length > 0) {
    console.log(`   - Fix critical test failures immediately`);
    console.log(`   - Do not proceed with manual testing until critical tests pass`);
  }
  
  if (totalFailed === 0) {
    log.success(`All tests passed! Core features are working correctly.`);
    console.log(`   - Safe to proceed with manual testing`);
    console.log(`   - Consider adding more edge case tests`);
  }

  return {
    totalTests,
    totalPassed,
    totalFailed,
    passRate,
    criticalFailures: criticalFailures.length,
    overallStatus: criticalFailures.length === 0 && passRate >= performanceThresholds.minPassRate ? 'success' : 'failure'
  };
}

async function main() {
  log.header('APPLAA CORE FEATURES TEST SUITE');
  
  console.log(`Running comprehensive tests for core features...`);
  console.log(`This will help catch infrastructure issues before manual testing.\n`);

  const startTime = Date.now();
  const results = [];

  // Run all test suites
  for (const suite of testSuites) {
    try {
      const result = await runTestSuite(suite);
      results.push(result);
    } catch (error) {
      log.error(`Failed to run ${suite.name}: ${error.message}`);
      results.push({
        name: suite.name,
        status: 'error',
        duration: 0,
        passed: 0,
        failed: 1,
        total: 1,
        error: error.message
      });
    }
  }

  const endTime = Date.now();
  const totalDuration = endTime - startTime;

  // Generate comprehensive report
  const summary = generateReport(results);

  console.log(`\n⏱️ Total execution time: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);

  // Exit with appropriate code
  if (summary.overallStatus === 'success') {
    log.success('All core feature tests completed successfully!');
    process.exit(0);
  } else {
    log.error('Some core feature tests failed. Please review and fix before proceeding.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log.error(`Uncaught exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main().catch(error => {
    log.error(`Test runner failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { runTestSuite, generateReport };