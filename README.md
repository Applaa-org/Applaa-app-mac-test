# Applaa

Applaa is a local, open-source AI app builder with a beautiful orange and green design. It's fast, private, and fully under your control — like Lovable, v0, or Bolt, but running right on your machine.

## 🎥 Demo

Watch Applaa in action - from prompt to app in minutes:

📺 [View Demo Video](https://github.com/Applaa-Builder/applaa-desktop-mvp)

More info at: [Applaa Builder](https://github.com/Applaa-Builder)

## 🚀 Features

🍊 **Beautiful Design**: Stunning orange and green UI that's both modern and intuitive
⚡️ **Local**: Fast, private and no lock-in — everything runs on your machine
🛠 **Bring your own keys**: Use your own AI API keys — no vendor lock-in
🖥️ **Cross-platform**: Easy to run on Mac or Windows
🎨 **AI-Powered**: Build beautiful apps with the power of AI assistance
🔒 **Privacy First**: Your code and data never leave your machine

## 📦 Download

No sign-up required. Just download and go.

👉 [Download for your platform](https://github.com/Applaa-Builder/applaa-desktop-mvp/releases)

## 🤝 Community

Join our growing community of AI app builders! Share your projects and get help from the community:

- **GitHub**: [Applaa Builder Organization](https://github.com/Applaa-Builder)
- **Issues & Discussions**: [Project Repository](https://github.com/Applaa-Builder/applaa-desktop-mvp)

## 💻 Development Setup

Want to build Applaa from source? Follow these steps:

### Prerequisites

1. **Node.js 20+** - Required for development
2. **Git** - For cloning the repository
3. **WiX Toolset v3.11** (Windows only, for MSI builds)
   - Download: https://github.com/wixtoolset/wix3/releases/tag/wix3112rtm

### Installation

```bash
# Clone the repository
git clone https://github.com/Applaa-Builder/Applaa-Builder-v1.git
cd Applaa-Builder-v1

# Install dependencies (this will install all required packages including transitive dependencies)
npm install

# Start development mode
npm start
```

### Building Installers

```bash
# Build EXE and MSI installers
npm run make:release  # Auto-increments version and builds

# Or build without version increment
npm run make
```

**Expected Output:**
- `ApplaaSetup.msi` (~141 MB) - Windows Installer
- `Applaa-X.X.X Setup.exe` (~142 MB) - Squirrel Installer
- `Applaa-X.X.X-full.nupkg` - NuGet Package
- `Applaa-win32-x64-X.X.X.zip` - Portable version

### Common Issues

**Q: I see "missing webidl-conversions" or similar dependency warnings**  
A: These are transitive dependencies that install automatically with `npm install`. Just run:
```bash
npm install
```

**Q: MSI file not created**  
A: Install WiX Toolset v3.11 and restart your terminal. See [EXE_RELEASE_CHECKLIST.md](docs/EXE_RELEASE_CHECKLIST.md) for details.

**Q: Build fails with native module errors**  
A: Run `npm rebuild` to recompile native modules for your platform.

For more detailed build instructions, see [docs/EXE_RELEASE_CHECKLIST.md](docs/EXE_RELEASE_CHECKLIST.md)

---

## 🛠️ Contributing

Applaa is open-source (MIT licensed).

If you're interested in contributing to Applaa, please read our contributing doc.
