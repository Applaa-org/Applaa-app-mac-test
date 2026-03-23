#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Verifies that expected artifacts exist on the GitHub release used by PublisherGithub
 * (see forge.config.ts publishers). Defaults to Applaa-Builder/applaa-releases.
 *
 * Env overrides:
 *   RELEASE_ASSETS_OWNER — GitHub org/user (default Applaa-Builder)
 *   RELEASE_ASSETS_REPO  — repo name (default applaa-releases)
 *   RELEASE_VERIFY_TOKEN — PAT with repo read on applaa-releases if GITHUB_TOKEN cannot read that repo
 */
async function verifyReleaseAssets() {
  try {
    const packagePath = path.join(__dirname, "..", "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const version = packageJson.version;

    const owner = process.env.RELEASE_ASSETS_OWNER || "Applaa-Builder";
    const repo = process.env.RELEASE_ASSETS_REPO || "applaa-releases";
    const token =
      process.env.RELEASE_VERIFY_TOKEN || process.env.GITHUB_TOKEN;

    if (!token) {
      throw new Error("GITHUB_TOKEN environment variable is required");
    }

    const tagName = `v${version}`;

    console.log(`🔍 Verifying release assets for ${owner}/${repo} @ ${tagName}...`);

    const allReleasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const response = await fetch(allReleasesUrl, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "applaa-release-verifier",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const allReleases = await response.json();
    const release = allReleases.find((r) => r.tag_name === tagName);

    if (!release) {
      throw new Error(
        `Release ${tagName} not found in ${owner}/${repo}. Ensure publish completed.`,
      );
    }

    const assets = release.assets || [];
    const actualNames = assets.map((a) => a.name);

    console.log(`📦 Found ${assets.length} assets`);
    console.log(`📄 Release: ${release.draft ? "DRAFT" : "PUBLISHED"}`);

    const escapeRegExp = (s) =>
      String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Windows "creation" installer should be the Squirrel setup EXE.
    // If Forge version changes, the filename might vary slightly; we enforce
    // the expected Setup.exe name OR a broad Applaa-*.Setup.exe pattern.
    const expectedWindowsSetupExe = `Applaa-${version}.Setup.exe`;
    const windowsSetupExeOk =
      actualNames.some((n) => n === expectedWindowsSetupExe) ||
      actualNames.some((n) =>
        new RegExp(`^Applaa-.*${escapeRegExp(version)}.*\\.Setup\\.exe$`, "i").test(n),
      );

    const expectedWindowsZip = `Applaa-win32-x64-${version}.zip`;
    const windowsZipOk =
      actualNames.some((n) => n === expectedWindowsZip) ||
      actualNames.some((n) =>
        new RegExp(`^Applaa-win32-x64-${escapeRegExp(version)}\\.zip$`, "i").test(n),
      );

    // Loose checks — exact Squirrel/zip names vary by forge version and platform
    const checks = [
      {
        label: "Squirrel RELEASES manifest",
        ok: actualNames.some((n) => n === "RELEASES"),
      },
      {
        label: `Windows setup installer (${expectedWindowsSetupExe})`,
        ok: windowsSetupExeOk,
      },
      {
        label: `Windows zip (${expectedWindowsZip})`,
        ok: windowsZipOk,
      },
      {
        label: "NuGet package (.nupkg)",
        ok: actualNames.some((n) => /\.nupkg$/i.test(n)),
      },
      {
        label: "macOS zip (darwin + .zip)",
        ok: actualNames.some(
          (n) => /\.zip$/i.test(n) && /darwin/i.test(n),
        ),
      },
    ];

    const failed = checks.filter((c) => !c.ok);

    console.log("\n📋 Checks:");
    checks.forEach((c) =>
      console.log(`  ${c.ok ? "✔" : "✖"} ${c.label}`),
    );

    if (failed.length > 0) {
      console.error("\n❌ VERIFICATION FAILED — missing artifact types:");
      failed.forEach((c) => console.error(`  - ${c.label}`));
      console.error("\nActual asset names:");
      actualNames.forEach((n) => console.error(`  - ${n}`));
      process.exit(1);
    }

    console.log("\n✅ VERIFICATION PASSED!");
    console.log(`  URL: ${release.html_url}`);
  } catch (error) {
    console.error("❌ Error verifying release assets:", error.message);
    process.exit(1);
  }
}

verifyReleaseAssets();
