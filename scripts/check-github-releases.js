/**
 * Simple script to check GitHub releases for Applaa-Builder/Applaa-Builder-v1
 * This checks what versions are available on GitHub
 */

const https = require('https');
const packageJson = require('../package.json');

const currentVersion = packageJson.version;
const owner = 'Applaa-Builder';
const repo = 'Applaa-Builder-v1';

console.log('='.repeat(70));
console.log('GitHub Releases Check');
console.log('='.repeat(70));
console.log(`Repository: ${owner}/${repo}`);
console.log(`Current version: ${currentVersion}`);
console.log('='.repeat(70));
console.log('');

const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

console.log(`Fetching latest release from: ${url}`);
console.log('');

https.get(url, {
  headers: {
    'User-Agent': 'Applaa-Update-Checker',
    'Accept': 'application/vnd.github.v3+json'
  }
}, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const release = JSON.parse(data);
        
        console.log('='.repeat(70));
        console.log('✓ LATEST RELEASE FOUND');
        console.log('='.repeat(70));
        console.log(`Latest version: ${release.tag_name}`);
        console.log(`Current version: ${currentVersion}`);
        console.log(`Release name: ${release.name || release.tag_name}`);
        console.log(`Published: ${release.published_at}`);
        console.log(`Draft: ${release.draft ? 'Yes' : 'No'}`);
        console.log(`Prerelease: ${release.prerelease ? 'Yes' : 'No'}`);
        console.log('');
        
        // Check if update is available
        const latestVersion = release.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
        const needsUpdate = latestVersion !== currentVersion;
        
        if (needsUpdate) {
          console.log('='.repeat(70));
          console.log('🔄 UPDATE AVAILABLE!');
          console.log('='.repeat(70));
          console.log(`You are running version ${currentVersion}`);
          console.log(`Latest version is ${latestVersion}`);
          console.log('');
          console.log('Release notes:');
          console.log(release.body ? release.body.substring(0, 500) + '...' : 'No release notes');
          console.log('='.repeat(70));
        } else {
          console.log('='.repeat(70));
          console.log('✓ YOU ARE UP TO DATE');
          console.log('='.repeat(70));
          console.log(`You are running the latest version: ${currentVersion}`);
          console.log('='.repeat(70));
        }
        
        // List assets
        if (release.assets && release.assets.length > 0) {
          console.log('');
          console.log('Release assets:');
          release.assets.forEach(asset => {
            console.log(`  - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`);
          });
        }
        
        // Check for Windows update files
        console.log('');
        console.log('Windows OTA Update Files:');
        const hasNupkg = release.assets?.some(a => a.name.endsWith('.nupkg'));
        const hasReleases = release.assets?.some(a => a.name === 'RELEASES');
        console.log(`  - .nupkg file: ${hasNupkg ? '✓ Found' : '✗ Missing'}`);
        console.log(`  - RELEASES file: ${hasReleases ? '✓ Found' : '✗ Missing'}`);
        
        if (!hasNupkg || !hasReleases) {
          console.log('');
          console.log('⚠ WARNING: Missing required files for Windows OTA updates!');
          console.log('Windows auto-updates require both .nupkg and RELEASES files.');
        }
        
      } catch (error) {
        console.error('Error parsing response:', error.message);
        console.log('Raw response:', data.substring(0, 500));
      }
    } else if (res.statusCode === 404) {
      console.log('='.repeat(70));
      console.log('✗ REPOSITORY OR RELEASE NOT FOUND');
      console.log('='.repeat(70));
      console.log(`Status: ${res.statusCode}`);
      console.log(`Repository: ${owner}/${repo}`);
      console.log('');
      console.log('Possible causes:');
      console.log('1. Repository is private (requires authentication)');
      console.log('2. Repository does not exist');
      console.log('3. No releases have been published yet');
      console.log('='.repeat(70));
    } else {
      console.log('='.repeat(70));
      console.log('✗ ERROR');
      console.log('='.repeat(70));
      console.log(`Status: ${res.statusCode}`);
      console.log('Response:', data.substring(0, 500));
      console.log('='.repeat(70));
    }
  });
}).on('error', (error) => {
  console.log('='.repeat(70));
  console.log('✗ NETWORK ERROR');
  console.log('='.repeat(70));
  console.error('Error:', error.message);
  console.log('');
  console.log('Possible causes:');
  console.log('1. No internet connection');
  console.log('2. GitHub API is down');
  console.log('3. Firewall blocking the request');
  console.log('='.repeat(70));
});
