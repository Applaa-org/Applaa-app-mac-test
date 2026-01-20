/**
 * Check all GitHub releases (not just latest) to see what's available
 */

const https = require('https');
const packageJson = require('../package.json');

const currentVersion = packageJson.version;
const owner = 'Applaa-Builder';
const repo = 'Applaa-Builder-v1';

// Get GitHub token from environment (for private repositories)
const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

console.log('='.repeat(70));
console.log('GitHub Releases Check (All Releases)');
console.log('='.repeat(70));
console.log(`Repository: ${owner}/${repo}`);
console.log(`Current version: ${currentVersion}`);
console.log(`GitHub token: ${githubToken ? '✓ Found' : '✗ Not found (will try public access)'}`);
console.log('='.repeat(70));
console.log('');

// Prepare headers with optional authentication
const headers = {
  'User-Agent': 'Applaa-Update-Checker',
  'Accept': 'application/vnd.github.v3+json'
};

if (githubToken) {
  headers['Authorization'] = `token ${githubToken}`;
  console.log('🔐 Using GitHub token for authentication (private repository support)');
  console.log('');
}

// Check if repository exists first
const repoUrl = `https://api.github.com/repos/${owner}/${repo}`;
console.log(`Checking if repository exists: ${repoUrl}`);
console.log('');

https.get(repoUrl, {
  headers: headers
}, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      const repoInfo = JSON.parse(data);
      console.log('✓ Repository exists');
      console.log(`  Name: ${repoInfo.name}`);
      console.log(`  Private: ${repoInfo.private ? 'Yes' : 'No'}`);
      console.log(`  Description: ${repoInfo.description || 'N/A'}`);
      console.log('');
      
      // Now check releases
      checkReleases();
    } else if (res.statusCode === 404) {
      console.log('✗ Repository not found (404)');
      console.log('');
      console.log('Possible causes:');
      console.log('1. Repository name is incorrect');
      console.log('2. Repository is private and requires authentication');
      console.log('3. Repository does not exist');
      console.log('');
      console.log('Note: If the repository is private, you need to:');
      console.log('1. Create a GitHub Personal Access Token');
      console.log('2. Add it to the script or use it in the app');
    } else {
      console.log(`✗ Error checking repository: ${res.statusCode}`);
      console.log('Response:', data.substring(0, 500));
    }
  });
}).on('error', (error) => {
  console.error('Network error:', error.message);
});

function checkReleases() {
  const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
  console.log(`Checking all releases: ${releasesUrl}`);
  console.log('');

  // Use same headers with token if available
  const headers = {
    'User-Agent': 'Applaa-Update-Checker',
    'Accept': 'application/vnd.github.v3+json'
  };

  if (githubToken) {
    headers['Authorization'] = `token ${githubToken}`;
  }

  https.get(releasesUrl, {
    headers: headers
  }, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        try {
          const releases = JSON.parse(data);
          
          if (releases.length === 0) {
            console.log('='.repeat(70));
            console.log('⚠ NO RELEASES FOUND');
            console.log('='.repeat(70));
            console.log('The repository exists but has no published releases yet.');
            console.log('');
            console.log('To enable OTA updates:');
            console.log('1. Run the release workflow: https://github.com/Applaa-Builder/Applaa-Builder-v1/actions/workflows/release.yml');
            console.log('2. Or manually create a release on GitHub');
            console.log('3. Make sure the release includes Windows .nupkg and RELEASES files');
            console.log('='.repeat(70));
          } else {
            console.log('='.repeat(70));
            console.log(`✓ FOUND ${releases.length} RELEASE(S)`);
            console.log('='.repeat(70));
            console.log('');
            
            releases.forEach((release, index) => {
              const version = release.tag_name.replace(/^v/, '');
              const isLatest = index === 0;
              const needsUpdate = version !== currentVersion;
              
              console.log(`${isLatest ? '→' : ' '} Release ${index + 1}: ${release.tag_name}`);
              console.log(`   Name: ${release.name || release.tag_name}`);
              console.log(`   Published: ${release.published_at || 'Not published'}`);
              console.log(`   Draft: ${release.draft ? 'Yes' : 'No'}`);
              console.log(`   Prerelease: ${release.prerelease ? 'Yes' : 'No'}`);
              
              if (isLatest && needsUpdate) {
                console.log(`   ⚠ UPDATE AVAILABLE (you have ${currentVersion})`);
              } else if (isLatest && !needsUpdate) {
                console.log(`   ✓ You are up to date`);
              }
              
              // Check for Windows update files
              const hasNupkg = release.assets?.some(a => a.name.endsWith('.nupkg'));
              const hasReleases = release.assets?.some(a => a.name === 'RELEASES');
              console.log(`   Windows files: .nupkg=${hasNupkg ? '✓' : '✗'}, RELEASES=${hasReleases ? '✓' : '✗'}`);
              
              if (release.assets && release.assets.length > 0) {
                console.log(`   Assets (${release.assets.length}):`);
                release.assets.forEach(asset => {
                  console.log(`     - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`);
                });
              }
              
              console.log('');
            });
            
            // Summary
            const latestRelease = releases[0];
            const latestVersion = latestRelease.tag_name.replace(/^v/, '');
            const needsUpdate = latestVersion !== currentVersion;
            
            console.log('='.repeat(70));
            if (needsUpdate) {
              console.log('🔄 UPDATE AVAILABLE!');
              console.log(`   Current: ${currentVersion}`);
              console.log(`   Latest:  ${latestVersion}`);
            } else {
              console.log('✓ YOU ARE UP TO DATE');
              console.log(`   Version: ${currentVersion}`);
            }
            console.log('='.repeat(70));
          }
        } catch (error) {
          console.error('Error parsing releases:', error.message);
          console.log('Raw response:', data.substring(0, 500));
        }
      } else if (res.statusCode === 404) {
        console.log('✗ Releases endpoint not found (404)');
        console.log('This might mean the repository is private.');
      } else {
        console.log(`✗ Error: ${res.statusCode}`);
        console.log('Response:', data.substring(0, 500));
      }
    });
  }).on('error', (error) => {
    console.error('Network error:', error.message);
  });
}
