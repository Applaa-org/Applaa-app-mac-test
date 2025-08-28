const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create backup with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupName = `applaa-backup-${timestamp}`;
const backupDir = path.join('..', backupName);

console.log(`🚀 Creating comprehensive backup: ${backupName}`);

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Files and directories to include in backup
const includePatterns = [
  'src/**/*',
  'e2e-tests/**/*',
  'drizzle/**/*',
  'workers/**/*',
  'testing/**/*',
  'scripts/**/*',
  'package.json',
  'package-lock.json',
  'tsconfig*.json',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'electron.vite.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  '.gitignore',
  '.env.example',
  'README.md',
  'CHANGELOG.md',
  'forge.config.js',
  '.husky/**/*',
  'lint-staged.config.js'
];

// Files and directories to exclude
const excludePatterns = [
  'node_modules/**/*',
  'out/**/*',
  'dist/**/*',
  '.git/**/*',
  'userData/**/*',
  'applaa-apps/**/*',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  'test-results/**/*',
  'playwright-report/**/*',
  'blob-report/**/*'
];

console.log('📁 Copying source files...');

// Function to copy files matching patterns
function copyWithPatterns(sourceDir, targetDir, includePatterns, excludePatterns = []) {
  const glob = require('glob');
  
  includePatterns.forEach(pattern => {
    const files = glob.sync(pattern, { 
      cwd: sourceDir,
      dot: true,
      ignore: excludePatterns
    });
    
    files.forEach(file => {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      
      // Skip if it's a directory (will be created when copying files)
      if (fs.statSync(sourcePath).isDirectory()) {
        return;
      }
      
      // Ensure target directory exists
      const targetDirPath = path.dirname(targetPath);
      if (!fs.existsSync(targetDirPath)) {
        fs.mkdirSync(targetDirPath, { recursive: true });
      }
      
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    });
  });
}

try {
  // Copy files using patterns
  copyWithPatterns('.', backupDir, includePatterns, excludePatterns);
  
  console.log('📊 Creating backup manifest...');
  
  // Create backup manifest
  const manifest = {
    backupName,
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
    description: 'Comprehensive Applaa backup after mobile app integration and E2E test enhancement',
    features: [
      'Mobile app generation (Capacitor & Flutter)',
      'Smart app naming system',
      'Enhanced E2E test suite',
      'Database migration compatibility',
      'UI improvements and reorganization',
      'Legacy database fallback support'
    ],
    fixes: [
      'Fixed "no such column: display_name" errors across all IPC handlers',
      'Fixed "Rendered fewer hooks than expected" React error',
      'Fixed cross-platform clean script for Windows',
      'Added legacy-safe database fallbacks',
      'Improved mobile app detection and UI integration'
    ],
    testCoverage: [
      'Mobile app generation and detection',
      'All UI screens and navigation',
      'Database migration and legacy compatibility',
      'Smart naming system',
      'Error handling and recovery',
      'Performance and concurrent operations'
    ],
    structure: {
      'src/': 'Main application source code',
      'e2e-tests/': 'Comprehensive E2E test suite',
      'drizzle/': 'Database schema and migrations',
      'workers/': 'Background workers',
      'testing/': 'Test utilities and mock servers',
      'scripts/': 'Build and utility scripts'
    },
    keyFiles: [
      'src/ipc/handlers/app_handlers.ts - Core app operations with legacy fallbacks',
      'src/ipc/handlers/capacitor_handlers.ts - Capacitor mobile app integration',
      'src/ipc/handlers/flutter_mobile_handlers.ts - Flutter mobile app integration',
      'src/ipc/utils/smart_naming.ts - Intelligent app naming system',
      'src/components/AppList.tsx - Fixed React hooks order issue',
      'e2e-tests/mobile_apps.spec.ts - Mobile app testing',
      'e2e-tests/ui_screens.spec.ts - UI functionality testing',
      'e2e-tests/database_migration.spec.ts - Database compatibility testing',
      'e2e-tests/smart_naming.spec.ts - Smart naming testing'
    ],
    instructions: {
      restore: 'Copy contents to project directory and run: npm install && npm run db:generate',
      test: 'Run: npm run pre:e2e && npm run e2e:new',
      development: 'Run: npm start',
      build: 'Run: npm run package'
    }
  };
  
  fs.writeFileSync(
    path.join(backupDir, 'BACKUP_MANIFEST.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  console.log('📝 Creating backup README...');
  
  // Create backup README
  const backupReadme = `# Applaa Backup - ${backupName}

## Backup Information
- **Created:** ${new Date().toISOString()}
- **Version:** ${require('../package.json').version}
- **Description:** Comprehensive Applaa backup after mobile app integration and E2E test enhancement

## What's Included

### ✅ Major Features Added
- **Mobile App Generation:** Capacitor native apps and Flutter apps with proper detection
- **Smart App Naming:** AI-powered meaningful app names instead of random animal names
- **Enhanced E2E Tests:** Comprehensive test suite covering all functionality
- **Database Migration:** Legacy compatibility with graceful fallbacks
- **UI Improvements:** Reorganized chat controls, better mobile app display

### ✅ Critical Fixes Applied
- Fixed "no such column: display_name" errors across all IPC handlers
- Fixed "Rendered fewer hooks than expected" React error in AppList
- Fixed cross-platform clean script for Windows compatibility
- Added legacy-safe database fallbacks for all handlers
- Improved mobile app detection and UI integration

### ✅ Test Coverage
- Mobile app generation and detection (Capacitor & Flutter)
- All UI screens and navigation flows
- Database migration and legacy compatibility
- Smart naming system with fallbacks
- Error handling and recovery scenarios
- Performance and concurrent operations

## Directory Structure
\`\`\`
${backupName}/
├── src/                    # Main application source
│   ├── ipc/               # IPC handlers with legacy fallbacks
│   ├── components/        # React components (fixed hooks)
│   ├── pages/             # Application pages
│   ├── utils/             # Utilities including smart naming
│   └── db/                # Database schema and operations
├── e2e-tests/             # Comprehensive E2E test suite
│   ├── mobile_apps.spec.ts      # Mobile app testing
│   ├── ui_screens.spec.ts       # UI functionality testing
│   ├── database_migration.spec.ts # DB compatibility testing
│   ├── smart_naming.spec.ts     # Smart naming testing
│   └── helpers/           # Test utilities and page objects
├── drizzle/               # Database migrations
├── workers/               # Background workers
├── testing/               # Test utilities and mock servers
└── scripts/               # Build and utility scripts
\`\`\`

## Restoration Instructions

### 1. Restore Files
\`\`\`bash
# Copy backup contents to your project directory
cp -r ${backupName}/* /path/to/your/project/

# Or on Windows
xcopy /E /I ${backupName} C:\\path\\to\\your\\project
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Setup Database
\`\`\`bash
npm run db:generate
\`\`\`

### 4. Run Tests (Optional)
\`\`\`bash
# Build for E2E testing
npm run pre:e2e

# Run new tests
npm run e2e:new

# Or run all tests
npm run e2e:all
\`\`\`

### 5. Start Development
\`\`\`bash
npm start
\`\`\`

## Key Changes Since Last Backup

### Mobile App Integration
- Capacitor native app generation with Android/iOS support
- Flutter app generation with full Flutter project structure
- Proper mobile app detection and UI integration
- Mobile Development sections in app details
- App categorization by type (Web, Capacitor, Flutter)

### Smart Naming System
- AI-powered app name generation based on app concept
- Meaningful names like "task-manager" instead of "happy-kraken-bop"
- Fallback system for when AI naming fails
- Separate display names and technical names
- Package ID and slug generation for mobile apps

### Database Robustness
- Legacy database compatibility for existing users
- Graceful fallbacks when new columns don't exist
- Migration system for schema updates
- Error recovery and data integrity protection

### Enhanced Testing
- 4 new comprehensive test files
- Mobile app generation testing
- UI functionality testing across all screens
- Database migration and compatibility testing
- Smart naming system testing
- Updated test helpers and documentation

### UI/UX Improvements
- Reorganized chat input controls
- Icon-only buttons with tooltips for cleaner layout
- Better mobile app display and controls
- Fixed React hooks order issues
- Improved error handling and loading states

## Troubleshooting

### If you see "no such column" errors:
The legacy fallbacks should handle this automatically. If issues persist, check that all IPC handlers have the \`getAppSafe\` or similar fallback functions.

### If mobile apps don't generate:
Check that the upgrade detection logic is working and that the file system has proper permissions for creating sibling directories.

### If tests fail:
Ensure you've run \`npm run pre:e2e\` to build the app before running E2E tests.

## Contact
If you need help restoring this backup or have questions about the changes, refer to the commit history or the comprehensive test documentation in \`e2e-tests/README.md\`.
`;

  fs.writeFileSync(path.join(backupDir, 'README.md'), backupReadme);
  
  // Get backup size
  function getDirectorySize(dirPath) {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }
  
  const backupSize = getDirectorySize(backupDir);
  const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);
  
  console.log('✅ Backup completed successfully!');
  console.log(`📍 Location: ${path.resolve(backupDir)}`);
  console.log(`📊 Size: ${backupSizeMB} MB`);
  console.log(`📋 Files: ${manifest.keyFiles.length} key files + complete source`);
  console.log('');
  console.log('🎯 Backup includes:');
  console.log('   ✅ All source code with mobile app integration');
  console.log('   ✅ Enhanced E2E test suite');
  console.log('   ✅ Database migration compatibility');
  console.log('   ✅ Smart naming system');
  console.log('   ✅ All critical bug fixes');
  console.log('   ✅ Complete restoration instructions');
  console.log('');
  console.log(`📖 See ${backupName}/README.md for detailed restoration instructions`);
  
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}



