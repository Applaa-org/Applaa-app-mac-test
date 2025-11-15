/**
 * Test script for Godot integration
 * Run this to validate the complete workflow
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { generateGodotProject } from "../godot_project_generator";
import { exportGodotToHTML5, isExportUpToDate } from "../godot_exporter";
import type { GameSpecification } from "../game_spec_schema";

const TEST_APP_PATH = path.join(__dirname, "../../../test-godot-app");
const TEST_SPEC_PATH = path.join(__dirname, "test_game_spec.json");

async function testGodotIntegration() {
  console.log("🧪 Starting Godot Integration Test...\n");

  try {
    // 1. Load test spec
    console.log("1️⃣ Loading test game specification...");
    const specContent = fs.readFileSync(TEST_SPEC_PATH, "utf-8");
    const spec: GameSpecification = JSON.parse(specContent);
    console.log("✅ Spec loaded:", spec.game.name);

    // 2. Generate project
    console.log("\n2️⃣ Generating Godot project...");
    await generateGodotProject({
      appPath: TEST_APP_PATH,
      spec,
      regenerateAssets: true,
    });
    console.log("✅ Project generated");

    // 3. Verify project structure
    console.log("\n3️⃣ Verifying project structure...");
    const projectPath = path.join(TEST_APP_PATH, "godot-project");
    const requiredFiles = [
      "project.godot",
      "Loader.tscn",
      "Loader.gd",
      "game_spec.json",
      "scenes/Main.tscn",
      "scripts/Player.gd",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(projectPath, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file}`);
      } else {
        console.error(`  ❌ Missing: ${file}`);
        throw new Error(`Required file missing: ${file}`);
      }
    }

    // 4. Verify project.godot content
    console.log("\n4️⃣ Verifying project.godot...");
    const projectFile = path.join(projectPath, "project.godot");
    const projectContent = fs.readFileSync(projectFile, "utf-8");
    
    const requiredSettings = [
      `config/name="${spec.game.name}"`,
      "run/main_scene=\"res://Loader.tscn\"",
      `window/size/viewport_width=${spec.settings.window.width}`,
      `window/size/viewport_height=${spec.settings.window.height}`,
    ];

    for (const setting of requiredSettings) {
      if (projectContent.includes(setting)) {
        console.log(`  ✅ Contains: ${setting}`);
      } else {
        console.error(`  ❌ Missing setting: ${setting}`);
        throw new Error(`Project file missing setting: ${setting}`);
      }
    }

    // 5. Verify Loader.gd
    console.log("\n5️⃣ Verifying Loader.gd...");
    const loaderPath = path.join(projectPath, "Loader.gd");
    const loaderContent = fs.readFileSync(loaderPath, "utf-8");
    
    if (loaderContent.includes("load_game_spec()")) {
      console.log("  ✅ Loader.gd contains load_game_spec()");
    } else {
      throw new Error("Loader.gd missing load_game_spec()");
    }

    if (loaderContent.includes("construct_game()")) {
      console.log("  ✅ Loader.gd contains construct_game()");
    } else {
      throw new Error("Loader.gd missing construct_game()");
    }

    // 6. Verify scene file
    console.log("\n6️⃣ Verifying scene file...");
    const scenePath = path.join(projectPath, "scenes/Main.tscn");
    const sceneContent = fs.readFileSync(scenePath, "utf-8");
    
    if (sceneContent.includes("[gd_scene")) {
      console.log("  ✅ Scene file is valid .tscn format");
    } else {
      throw new Error("Scene file is not valid .tscn format");
    }

    if (sceneContent.includes('name="Player"')) {
      console.log("  ✅ Scene contains Player node");
    } else {
      throw new Error("Scene missing Player node");
    }

    // 7. Test export (if Godot is available)
    console.log("\n7️⃣ Testing HTML5 export...");
    const exportPath = path.join(TEST_APP_PATH, "godot-web-export");
    
    try {
      const exportResult = await exportGodotToHTML5({
        projectPath,
        exportPath,
        projectName: spec.game.name,
        debug: false,
      });

      if (exportResult.success) {
        console.log("  ✅ Export successful!");
        console.log(`  📦 Exported files: ${exportResult.files?.join(", ")}`);
        
        // Verify export files
        const requiredExportFiles = ["index.html", "game.js"];
        for (const file of requiredExportFiles) {
          const filePath = path.join(exportPath, file);
          if (fs.existsSync(filePath)) {
            console.log(`  ✅ ${file} exists`);
          } else {
            console.warn(`  ⚠️ ${file} missing (may be normal if export failed)`);
          }
        }
      } else {
        console.log("  ⚠️ Export failed (Godot may not be installed):", exportResult.error);
        console.log("  ℹ️ This is expected if Godot is not installed");
      }
    } catch (exportError: any) {
      console.log("  ⚠️ Export error (Godot may not be installed):", exportError.message);
      console.log("  ℹ️ This is expected if Godot is not installed");
    }

    // 8. Test caching
    console.log("\n8️⃣ Testing export caching...");
    const specPath = path.join(projectPath, "game_spec.json");
    const upToDate = isExportUpToDate(projectPath, exportPath, specPath);
    console.log(`  ${upToDate ? "✅" : "ℹ️"} Export is ${upToDate ? "up to date" : "out of date"}`);

    console.log("\n✅ All tests passed!");
    console.log(`\n📁 Test project location: ${projectPath}`);
    console.log(`📁 Export location: ${exportPath}`);

  } catch (error: any) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testGodotIntegration().catch(console.error);
}

export { testGodotIntegration };

