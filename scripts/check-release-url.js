#!/usr/bin/env node

/**
 * Check the latest release and provide direct download URLs for Windows EXE
 */
async function checkReleaseUrl() {
  try {
    const owner = "Applaa-Builder";
    const repo = "Applaa-Builder-v1";
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "applaa-release-checker",
    };

    if (token) {
      headers.Authorization = `token ${token}`;
      console.log("🔐 Using GitHub token for authentication");
    } else {
      console.log("⚠️  No GitHub token - using public access");
    }

    // Fetch all releases (including drafts)
    console.log(`\n📡 Fetching all releases from ${owner}/${repo}...\n`);

    const releasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const response = await fetch(releasesUrl, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        console.error("❌ Repository not found or no access!");
        if (!token) {
          console.log("\n💡 This might be a private repository. Set GITHUB_TOKEN environment variable.");
        }
        process.exit(1);
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const allReleases = await response.json();
    
    if (allReleases.length === 0) {
      console.error("❌ No releases found!");
      console.log("\n💡 The release might still be processing. Try:");
      console.log("   1. Wait a few minutes and check again");
      console.log("   2. Check all releases: https://github.com/Applaa-Builder/Applaa-Builder-v1/releases");
      process.exit(1);
    }

    // Get the latest release (first in the list, or find v1.0.8)
    const version = require('../package.json').version;
    const tagName = `v${version}`;
    
    let release = allReleases.find(r => r.tag_name === tagName);
    if (!release) {
      release = allReleases[0]; // Use latest if specific version not found
      console.log(`⚠️  Release ${tagName} not found, showing latest release instead: ${release.tag_name}\n`);
    }

    console.log("✅ Release Found!");
    console.log(`   Name: ${release.name || release.tag_name}`);
    console.log(`   Tag: ${release.tag_name}`);
    console.log(`   Published: ${release.published_at || "Not published yet"}`);
    console.log(`   Draft: ${release.draft ? "Yes ⚠️" : "No ✅"}`);
    console.log(`   Prerelease: ${release.prerelease ? "Yes" : "No"}`);
    console.log(`   URL: ${release.html_url}\n`);

    const assets = release.assets || [];
    console.log(`📦 Found ${assets.length} assets:\n`);

    if (assets.length === 0) {
      console.log("⚠️  No assets found in this release!");
      console.log("   Assets might still be uploading...");
      return;
    }

    // Find Windows EXE files
    const windowsAssets = assets.filter((asset) =>
      asset.name.match(/\.(exe|msi|nupkg|zip)$/i) ||
      asset.name === "RELEASES"
    );

    if (windowsAssets.length === 0) {
      console.log("⚠️  No Windows assets found!");
      console.log("\n📋 All assets:");
      assets.forEach((asset) => {
        console.log(`   - ${asset.name} (${(asset.size / 1024 / 1024).toFixed(2)} MB)`);
      });
      return;
    }

    console.log("🪟 Windows Assets:\n");
    windowsAssets.forEach((asset) => {
      const sizeMB = (asset.size / 1024 / 1024).toFixed(2);
      const isExe = asset.name.endsWith(".exe");
      const isNupkg = asset.name.endsWith(".nupkg");
      const isReleases = asset.name === "RELEASES";
      
      let icon = "📄";
      if (isExe) icon = "💾";
      if (isNupkg) icon = "📦";
      if (isReleases) icon = "📋";

      console.log(`${icon} ${asset.name}`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Download: ${asset.browser_download_url}`);
      console.log("");
    });

    // Find the main EXE installer
    const exeInstaller = assets.find((asset) =>
      asset.name.match(/Setup\.exe$/i)
    );

    if (exeInstaller) {
      console.log("🎯 Direct EXE Download URL:\n");
      console.log(`   ${exeInstaller.browser_download_url}\n`);
      console.log("📋 Copy this URL to download the EXE directly!\n");
    }

    // Check for OTA files
    const nupkg = assets.find((asset) => asset.name.endsWith(".nupkg"));
    const releases = assets.find((asset) => asset.name === "RELEASES");

    if (nupkg && releases) {
      console.log("✅ Windows OTA update files found!");
      console.log(`   - ${nupkg.name}`);
      console.log(`   - ${releases.name}\n`);
    } else {
      console.log("⚠️  Missing OTA update files:");
      if (!nupkg) console.log("   - Missing .nupkg file");
      if (!releases) console.log("   - Missing RELEASES file");
      console.log("");
    }

    console.log("🔗 Release Page:");
    console.log(`   ${release.html_url}\n`);

  } catch (error) {
    console.error("❌ Error checking release:", error.message);
    process.exit(1);
  }
}

// Run the check
checkReleaseUrl();
