# Applaa E2E Test Suite

This directory contains comprehensive end-to-end tests for the Applaa application using Playwright.

## Test Categories

### Core Functionality Tests
- **main.spec.ts** - Basic chat functionality and model interaction
- **problems.spec.ts** - Problem detection, auto-fix, and manual problem resolution
- **env_var.spec.ts** - Environment variable management
- **chat_mode.spec.ts** - Chat modes (build vs ask)
- **edit_code.spec.ts** - Code editing functionality

### Mobile App Tests (NEW)
- **mobile_apps.spec.ts** - Comprehensive mobile app generation and detection
  - Capacitor native app generation
  - Flutter app generation  
  - Mobile app detection after restart
  - App categorization in sidebar
  - Error handling for mobile generation

### UI/UX Tests (NEW)
- **ui_screens.spec.ts** - All major screen functionality
  - App details screen
  - Preview screen controls
  - Problems screen
  - Code screen and file browser
  - Configure screen (environment variables)
  - Chat interface and input controls
  - App list sidebar categorization
  - Settings screen
  - Navigation between screens
  - Responsive layout
  - Error and loading states

### Database & Migration Tests (NEW)
- **database_migration.spec.ts** - Database compatibility and migration
  - Legacy database compatibility
  - New schema operations
  - Chat functionality with database
  - App versioning and git operations
  - Settings persistence
  - Error recovery and data integrity
  - Concurrent operations handling
  - Large app handling

### Smart Naming Tests (NEW)
- **smart_naming.spec.ts** - Intelligent app naming system
  - Meaningful names based on app concept
  - Different app types get appropriate names
  - Fallback mechanism for generic prompts
  - Display vs technical name formats
  - Consistency across sessions
  - Mobile app integration
  - Special character handling

### Database Column Compatibility Tests (NEW)
- **database_column_compatibility.spec.ts** - Legacy database column compatibility
  - Legacy database without display_name column
  - Legacy database without updated_at column
  - Proposal approval with legacy database
  - Fix All functionality with legacy database
  - App operations (create, navigate, problems, versions)
  - Chat streaming without column errors
  - Console error detection and validation
  - Length constraints

### Existing Tests
- **capacitor.spec.ts** - Capacitor-specific functionality
- **import.spec.ts** - App import functionality
- **backup.spec.ts** - Backup and restore operations
- **github.spec.ts** - GitHub integration
- **supabase_*.spec.ts** - Supabase integration tests
- **template_*.spec.ts** - Template-based app creation
- And many more...

## Running Tests

### Prerequisites
```bash
# Build the app for E2E testing
npm run pre:e2e
```

### Test Commands

```bash
# Run all tests
npm run e2e:all

# Run specific test categories
npm run e2e:mobile     # Mobile app tests
npm run e2e:ui         # UI/UX tests  
npm run e2e:db         # Database tests
npm run e2e:naming     # Smart naming tests
npm run e2e:db-compat  # Database column compatibility tests
npm run e2e:core       # Core functionality tests

# Run new tests only
npm run e2e:new

# Debug mode (opens browser)
npm run e2e:headed
npm run e2e:debug

# Run specific test file
npm run e2e -- e2e-tests/mobile_apps.spec.ts

# Run with specific options
npm run e2e -- --workers=1 --timeout=60000
```

### Test Environment

Tests run against a packaged Electron app with:
- Fake LLM server for consistent responses
- Temporary user data directory for isolation
- Mock external services (Ollama, LM Studio, etc.)
- Test-specific environment variables

## Test Structure

### Page Object Model
Tests use a comprehensive Page Object (`PageObject` class in `helpers/test_helper.ts`) that provides:
- Setup and teardown utilities
- Navigation helpers
- UI interaction methods
- Assertion helpers
- Screenshot and snapshot utilities

### Test Fixtures
- **fixtures/import-app/** - Sample apps for import testing
- **fixtures/backups/** - Legacy database files for migration testing
- **fixtures/*.md** - Test prompts and scenarios

### Snapshots
Tests use Playwright's snapshot testing for:
- Message content verification
- UI state verification
- Server request/response verification
- App file structure verification

## Key Test Patterns

### Database Compatibility
```typescript
// Test with legacy database
testWithConfig({
  preLaunchHook: async ({ userDataDir }) => {
    // Copy legacy DB without new columns
    const legacyDbPath = path.join(__dirname, "fixtures", "backups", "empty-v0.12.0-beta.1.db");
    const targetDbPath = path.join(userDataDir, "sqlite.db");
    fs.copyFileSync(legacyDbPath, targetDbPath);
  }
})
```

### Mobile App Testing
```typescript
// Test mobile app generation
await po.clickAppUpgradeButton({ upgradeId: "capacitor" });
await po.expectAppUpgradeButtonIsNotVisible({ upgradeId: "capacitor" });
await po.expectMobileDevelopmentSection();
await po.expectCapacitorControls();
```

### UI State Verification
```typescript
// Test screen functionality
await po.selectPreviewMode("problems");
await po.snapshotProblemsPane();
await po.clickRecheckProblems();
```

## Debugging Tests

### View Test Reports
```bash
npx playwright show-report
```

### Debug Specific Test
```bash
npm run e2e:debug -- --grep "capacitor mobile app generation"
```

### Screenshots on Failure
Tests automatically capture screenshots on failure and attach them to the test report.

### Console Logs
Set `DEBUG_LOGS=true` environment variable to see detailed console output from the Electron app.

## Test Data Management

### Isolation
Each test runs with:
- Fresh temporary user data directory
- Clean database state
- Isolated app directories
- Mock external services

### Cleanup
Tests automatically clean up:
- Temporary directories
- Generated apps
- Background processes
- Database connections

## Contributing

### Adding New Tests
1. Create test file in appropriate category
2. Use existing Page Object methods when possible
3. Add new Page Object methods for new functionality
4. Follow existing naming conventions
5. Add appropriate timeouts for async operations
6. Use snapshots for complex state verification

### Test Naming
- Use descriptive test names: `"capacitor mobile app generation and detection"`
- Group related tests in same file
- Use `test.skip` for platform-specific tests when needed

### Assertions
- Use Playwright's `expect()` for all assertions
- Set appropriate timeouts for async operations
- Use `toBeVisible()`, `toBeHidden()`, `toContainText()` etc.
- Prefer semantic selectors (`getByRole`, `getByText`) over CSS selectors

## CI/CD Integration

Tests are designed to run in CI environments with:
- Headless mode by default
- Configurable timeouts (longer on CI)
- Blob reports for parallel execution
- Platform-specific test skipping
- Retry logic for flaky tests

## Performance Considerations

- Tests use single worker by default to avoid conflicts
- Database operations are optimized for test speed
- Mock services reduce external dependencies
- Snapshot comparisons are fast and reliable
- Background processes are properly managed
