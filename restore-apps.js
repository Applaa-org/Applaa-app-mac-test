// Simple script to restore apps from the file system to the database
const fs = require('fs');
const path = require('path');
const os = require('os');

// Get the apps directory
const appsDir = path.join(os.homedir(), 'applaa-apps');

console.log('🔍 Checking apps directory:', appsDir);

if (!fs.existsSync(appsDir)) {
  console.log('❌ Apps directory not found');
  process.exit(1);
}

// List all directories in the apps folder
const appFolders = fs.readdirSync(appsDir).filter(item => {
  const itemPath = path.join(appsDir, item);
  return fs.statSync(itemPath).isDirectory();
});

console.log(`📁 Found ${appFolders.length} app folders:`);
appFolders.forEach(folder => {
  console.log(`  - ${folder}`);
});

// Create SQL statements to insert these apps
const sqlStatements = [];
const now = Math.floor(Date.now() / 1000);

appFolders.forEach((folder, index) => {
  const id = index + 1;
  sqlStatements.push(`INSERT OR REPLACE INTO apps (id, name, path, created_at, updated_at) VALUES (${id}, '${folder}', '${folder}', ${now}, ${now});`);
});

// Write SQL file that can be executed
const sqlContent = `-- Restore apps from file system
${sqlStatements.join('\n')}
`;

fs.writeFileSync('restore-apps.sql', sqlContent);
console.log('✅ Created restore-apps.sql file');
console.log('📋 SQL statements:');
console.log(sqlContent);




