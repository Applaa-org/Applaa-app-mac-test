# Release Notes - v1.0.8

We are excited to announce Applaa v1.0.8! This release focuses on stability, enhanced game development tools, and streamlining the build process.

## 🚀 New Features

*   **Game Development Hub**: 
    *   Enhanced support for **Minecraft** Behavior Packs.
    *   **Godot** Game Engine project generation.
    *   **Roblox** scripting and asset helpers.
*   **Applaa Academy Integration**:
    *   New guided learning modes and interactive tutorials.
*   **Visual Coding**:
    *   Integrated **Blockly** editor for drag-and-drop logic building.
*   **Database Power**:
    *   Native integration/handlers for **Supabase** and **Neon** databases.

## 🛠 Improvements

*   **Build Stability**: 
    *   Fixed module resolution issues for native dependencies (`sqlite-vec`, `playwright-core`).
    *   Optimized `package.json` handling in production builds.
    *   Removed unused heavy dependencies for a slimmer executable.
*   **Updater**: 
    *   Replaced external updater library with a robust, custom native implementation for smoother OTA updates.
*   **Mobile Support**:
    *   Improved handlers for **Expo** and **Flutter** mobile app generation.
*   **Deep Linking**:
    *   Enhanced protocol handlers for `applaa://` functionality (OAuth, imports).
