# Expo Orbit — Integration Brainstorm for Applaa

## Source / Reference
- Expo Orbit repository: [expo/orbit](https://github.com/expo/orbit)

## What is Orbit (quick take)
Expo Orbit is a desktop menu‑bar/task‑tray app that streamlines device and simulator workflows:
- Install and launch apps on simulators/devices in one click (Android .apk, iOS Simulator .app)
- List/launch simulators and emulators; start Android emulators headless
- Pull the latest EAS builds and install them on selected devices
- Install updates onto simulators and real Android devices quickly
- Launch Snack projects on simulators on demand

MIT licensed. Cross‑platform (Windows, macOS, Linux).

## Why it matters for Applaa
Applaa already provides in‑app previews (web + Expo local server). Orbit complements this with a frictionless “run on device/simulator” path, avoiding manual adb/simctl invocation and reducing context switching.

### Expected benefits
- One‑click device validation: Faster loop from code → simulator/device
- Consistent device management UX regardless of platform
- Tight EAS build handoff: trigger build in Applaa, install/run via Orbit
- Optional Snack bridge for quick throwaway previews when local envs are noisy

## Integration approach (pragmatic, incremental)

### Phase 0 — Foundations (No Orbit dependency)
- Keep Applaa’s local Expo preview first‑class and reliable (in progress)
- Ensure generated apps avoid heavy deps; rely on NativeWind, icons, gradients

### Phase 1 — Light Orbit handoff (MVP)
- UI additions
  - "Run on Device" button in `MobilePreview`
  - "Devices" quick panel: shows detected simulators/emulators (read‑only list if Orbit not installed)
- Behavior
  - If Orbit is installed: hand off the most recent artifact to Orbit for install+launch
  - If Orbit is not installed: gracefully fall back to `adb install` / `xcrun simctl install` + `launch`
- Artifacts supported
  - Android: debug `.apk` (from `gradle assembleDebug`) and EAS Android builds
  - iOS: simulator `.app` bundles and EAS iOS simulator artifacts (macOS)

### Phase 2 — EAS build pipeline glue
- In Applaa: trigger non‑interactive EAS builds, stream logs, surface artifacts
- Post‑build: "Open in Orbit" action installs/runs on selected devices
- Cache recent artifacts per app; quick re‑install to alternate devices

### Phase 3 — Convenience & multi‑device
- Multi‑device launch (install/run N devices at once)
- Device presets (e.g., "Pixel 7 + iPad Pro")
- Remember last target per app

### Phase 4 — Optional Snack bridge (guarded)
- "Fast Preview (Snack)" button: push a minimal preview to Snack and ask Orbit to open it on a simulator
- Labeled as optional to avoid confusion; local preview remains default

## UX notes
- If Orbit present → primary action shows "Run on Device (via Orbit)"
- If not present → show secondary tooltip with "Install Orbit" link and fall back to native tooling automatically
- Devices panel: name, OS, version, status, quick actions (Launch, Relaunch, Clear data)
- Builds panel: list recent EAS builds; action menu → "Open in Orbit"

## Technical design sketch

### Detection & handoff
- Detect Orbit presence via one of:
  - Registered protocol/URL handler (if Orbit exposes one in the future)
  - Known install locations / running process detection
  - Optional CLI shim (if provided); else fallback to native tooling
- Handoff payload
  - Artifact path/URL + requested target device/simulator identifier
  - Action type: `install_and_launch`

### Fallbacks (no Orbit)
- Android: `adb -s <deviceId> install -r <apk>` then `adb shell monkey -p <package> 1`
- iOS (macOS): `xcrun simctl install <udid> <app>` then `xcrun simctl launch <udid> <bundleId>`

### Security & settings
- Store EAS tokens in Electron Safe Storage
- Setting: "Prefer Orbit for device runs" (default on if detected)
- Setting: default target platform & last‑used device

### IPC & modules (Applaa)
- Renderer → IPC → main: `mobile:run-on-device` with `{ appId, platform, target, artifact }`
- Main decides Orbit vs fallback, executes, returns structured status updates
- Reuse existing `expo_handlers` for server/start/stop; new `device_handlers` for install/run

## Risks & mitigations
- Orbit availability differences across OSes → always provide native fallbacks
- EAS artifacts not ready → surface progress, enable retry
- iOS signing/simulator constraints → scope to simulator `.app` first (no real iOS devices without extra setup)
- Snack cross‑origin quirks → keep behind explicit toggle and only as a backup path

## Open questions
- Does Orbit expose a protocol/CLI for artifact handoff? If not, we’ll keep fallbacks as the primary path and add Orbit integration once public hooks exist
- How to surface device logs cleanly in Applaa? (phase‑2+)
- Should we auto‑select most recently used device per app? (yes, phase‑3)

## Success criteria (for when we revisit)
- From Applaa, user can: build → open on simulator/device in ≤ 2 clicks
- End‑to‑end flow is reliable on Windows + macOS (Android), macOS (iOS Simulator)
- No prompts to run manual commands; no dependency popups

## Reference
- Expo Orbit — features and releases: [expo/orbit](https://github.com/expo/orbit)







