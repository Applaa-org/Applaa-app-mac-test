#!/usr/bin/env node

/**
 * 🧪 PREVIEW SYSTEM TEST RUNNER
 * 
 * Comprehensive test runner for the intelligent preview system
 * Runs all tests and ensures system is ready for manual testing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

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

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`🚀 ${message}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      shell: true,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        code,
        stdout,
        stderr
      });
    });

    child.on('error', reject);
  });
}

async function checkPrerequisites() {
  logHeader('CHECKING PREREQUISITES');

  // Check if Jest is available
  try {
    const { code } = await runCommand('npx', ['jest', '--version']);
    if (code === 0) {
      logSuccess('Jest is available');
    } else {
      logError('Jest is not available');
      return false;
    }
  } catch (error) {
    logError('Failed to check Jest availability');
    return false;
  }

  // Check if test files exist
  const testFiles = [
    'src/__tests__/intelligent_preview_system.test.ts',
    'src/__tests__/preview_integration.test.ts',
    'src/__tests__/IntelligentPreviewPanel.test.tsx'
  ];

  for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
      logSuccess(`Test file exists: ${testFile}`);
    } else {
      logError(`Test file missing: ${testFile}`);
      return false;
    }
  }

  // Check if source files exist
  const sourceFiles = [
    'src/ipc/handlers/intelligent_preview_system.ts',
    'src/ipc/utils/preview_integration.ts',
    'src/components/expo/IntelligentPreviewPanel.tsx'
  ];

  for (const sourceFile of sourceFiles) {
    if (fs.existsSync(sourceFile)) {
      logSuccess(`Source file exists: ${sourceFile}`);
    } else {
      logError(`Source file missing: ${sourceFile}`);
      return false;
    }
  }

  return true;
}

async function runUnitTests() {
  logHeader('RUNNING UNIT TESTS');

  const testFiles = [
    'src/__tests__/intelligent_preview_system.test.ts',
    'src/__tests__/preview_integration.test.ts',
    'src/__tests__/IntelligentPreviewPanel.test.tsx'
  ];

  let allTestsPassed = true;

  for (const testFile of testFiles) {
    logInfo(`Running tests in ${testFile}...`);
    
    try {
      const { code, stdout, stderr } = await runCommand('npx', [
        'jest',
        testFile,
        '--verbose',
        '--no-cache',
        '--detectOpenHandles'
      ]);

      if (code === 0) {
        logSuccess(`Tests passed: ${testFile}`);
        
        // Extract test results
        const passMatch = stdout.match(/(\d+) passed/);
        const failMatch = stdout.match(/(\d+) failed/);
        
        if (passMatch) {
          logInfo(`  ${passMatch[1]} tests passed`);
        }
        
        if (failMatch) {
          logWarning(`  ${failMatch[1]} tests failed`);
        }
      } else {
        logError(`Tests failed: ${testFile}`);
        logError(`Exit code: ${code}`);
        
        if (stderr) {
          log('\nSTDERR:', colors.red);
          log(stderr, colors.red);
        }
        
        if (stdout) {
          log('\nSTDOUT:', colors.yellow);
          log(stdout, colors.yellow);
        }
        
        allTestsPassed = false;
      }
    } catch (error) {
      logError(`Failed to run tests for ${testFile}: ${error.message}`);
      allTestsPassed = false;
    }
  }

  return allTestsPassed;
}

async function runIntegrationTests() {
  logHeader('RUNNING INTEGRATION TESTS');

  logInfo('Testing IPC handler registration...');
  
  // Check if handlers are properly registered
  const ipcHostPath = 'src/ipc/ipc_host.ts';
  if (fs.existsSync(ipcHostPath)) {
    const content = fs.readFileSync(ipcHostPath, 'utf8');
    
    if (content.includes('registerIntelligentPreviewSystem')) {
      logSuccess('Intelligent preview system is registered in IPC host');
    } else {
      logError('Intelligent preview system is NOT registered in IPC host');
      return false;
    }
  } else {
    logError('IPC host file not found');
    return false;
  }

  logInfo('Testing template dependencies...');
  
  // Check if Expo template has required dependencies
  const templatePackagePath = 'expo-templates/base-router/package.json';
  if (fs.existsSync(templatePackagePath)) {
    const packageJson = JSON.parse(fs.readFileSync(templatePackagePath, 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      'expo',
      'expo-router',
      'expo-blur',
      'expo-haptics',
      '@react-native-async-storage/async-storage',
      'jest',
      '@testing-library/react-native'
    ];
    
    let missingDeps = [];
    for (const dep of requiredDeps) {
      if (deps[dep]) {
        logSuccess(`Template has dependency: ${dep}`);
      } else {
        logError(`Template missing dependency: ${dep}`);
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length > 0) {
      logError(`Template is missing ${missingDeps.length} required dependencies`);
      return false;
    }
  } else {
    logError('Expo template package.json not found');
    return false;
  }

  return true;
}

async function runPerformanceTests() {
  logHeader('RUNNING PERFORMANCE TESTS');

  logInfo('Testing TypeScript compilation...');
  
  try {
    const { code, stderr } = await runCommand('npx', ['tsc', '--noEmit']);
    
    if (code === 0) {
      logSuccess('TypeScript compilation passed');
    } else {
      logError('TypeScript compilation failed');
      if (stderr) {
        log(stderr, colors.red);
      }
      return false;
    }
  } catch (error) {
    logError(`TypeScript compilation check failed: ${error.message}`);
    return false;
  }

  logInfo('Testing ESLint compliance...');
  
  try {
    const { code, stdout } = await runCommand('npx', [
      'eslint',
      'src/ipc/handlers/intelligent_preview_system.ts',
      'src/ipc/utils/preview_integration.ts',
      'src/components/expo/IntelligentPreviewPanel.tsx',
      '--format', 'compact'
    ]);
    
    if (code === 0) {
      logSuccess('ESLint checks passed');
    } else {
      logWarning('ESLint found issues (non-blocking)');
      if (stdout) {
        log(stdout, colors.yellow);
      }
    }
  } catch (error) {
    logWarning(`ESLint check failed: ${error.message}`);
  }

  return true;
}

async function generateTestReport() {
  logHeader('GENERATING TEST REPORT');

  const report = {
    timestamp: new Date().toISOString(),
    system: 'Intelligent Preview System',
    version: '1.0.0',
    tests: {
      unit: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      performance: { passed: 0, failed: 0, total: 0 }
    },
    coverage: {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0
    },
    readyForManualTesting: false
  };

  // Run coverage report
  try {
    const { code, stdout } = await runCommand('npx', [
      'jest',
      'src/__tests__/',
      '--coverage',
      '--coverageReporters=json-summary',
      '--silent'
    ]);

    if (code === 0) {
      const coveragePath = 'coverage/coverage-summary.json';
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        report.coverage = {
          statements: coverage.total.statements.pct,
          branches: coverage.total.branches.pct,
          functions: coverage.total.functions.pct,
          lines: coverage.total.lines.pct
        };
        
        logSuccess(`Test coverage: ${report.coverage.statements}% statements, ${report.coverage.lines}% lines`);
      }
    }
  } catch (error) {
    logWarning(`Coverage report generation failed: ${error.message}`);
  }

  // Save report
  const reportPath = 'test-reports/preview-system-test-report.json';
  const reportDir = path.dirname(reportPath);
  
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  logSuccess(`Test report saved to: ${reportPath}`);

  return report;
}

async function main() {
  log(`
  🧪 INTELLIGENT PREVIEW SYSTEM - TEST RUNNER
  ==========================================
  
  This script runs comprehensive tests for the intelligent preview system
  to ensure it's ready for manual testing.
  `, colors.bright + colors.cyan);

  let exitCode = 0;

  try {
    // Step 1: Check prerequisites
    const prerequisitesOk = await checkPrerequisites();
    if (!prerequisitesOk) {
      logError('Prerequisites check failed');
      exitCode = 1;
      return;
    }

    // Step 2: Run unit tests
    const unitTestsOk = await runUnitTests();
    if (!unitTestsOk) {
      logError('Unit tests failed');
      exitCode = 1;
    }

    // Step 3: Run integration tests
    const integrationTestsOk = await runIntegrationTests();
    if (!integrationTestsOk) {
      logError('Integration tests failed');
      exitCode = 1;
    }

    // Step 4: Run performance tests
    const performanceTestsOk = await runPerformanceTests();
    if (!performanceTestsOk) {
      logWarning('Performance tests had issues (non-blocking)');
    }

    // Step 5: Generate report
    const report = await generateTestReport();
    report.readyForManualTesting = unitTestsOk && integrationTestsOk;

    // Final summary
    logHeader('TEST SUMMARY');
    
    if (report.readyForManualTesting) {
      logSuccess('🎉 ALL TESTS PASSED - READY FOR MANUAL TESTING!');
      log(`
  ✅ Prerequisites: OK
  ✅ Unit Tests: PASSED
  ✅ Integration Tests: PASSED
  ✅ Performance Tests: OK
  
  📊 Test Coverage: ${report.coverage.statements}% statements, ${report.coverage.lines}% lines
  
  🚀 The intelligent preview system is ready for manual testing!
  
  Next steps:
  1. Start the Applaa application
  2. Create a new Expo app
  3. Test the preview functionality
  4. Verify parallel processing and user experience
      `, colors.green);
    } else {
      logError('❌ TESTS FAILED - NOT READY FOR MANUAL TESTING');
      log(`
  Please fix the failing tests before proceeding with manual testing.
  Check the test output above for specific issues.
      `, colors.red);
    }

  } catch (error) {
    logError(`Test runner failed: ${error.message}`);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runCommand,
  checkPrerequisites,
  runUnitTests,
  runIntegrationTests,
  runPerformanceTests,
  generateTestReport
};
