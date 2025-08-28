# Applaa Expo Base Master

Canonical base for any new Expo app (apps or games). This template contains:

- **Expo SDK 53** with Router v4 (tabs + guards + prefetch + typegen)
- **Gluestack UI + NativeWind**; tokens in `constants/colors.ts`
- **Offline-first SQLite** KV (`lib/storage.ts`) and first-run seed (`lib/seed.ts`)
- **Background tasks** (`lib/background.ts`)
- **ErrorBoundary** wrapper, typed providers, utilities
- **i18n + RTL** scaffold (`lib/i18n.ts`), deep-links (`lib/links.ts`)
- **Notifications** scaffold (`lib/notifications.ts`) gated by Dev Client
- **Analytics** interface (`lib/analytics.ts`) with Console adapter
- **Mock data** folder with repositories
- **Gluestack MCP** integration for AI-powered UI generation
- **SnapAI icon** generation and auto-apply

## Getting Started

```bash
npm install
npm start
```

## AI Icon Generation

Generate professional app icons using SnapAI:

```bash
# Set your icon prompt and generate
ICON_PROMPT="modern fitness app icon, blue gradient, minimalist" npm run icon:gen

# Apply the latest generated icon
npm run icon:apply
```

**Requirements:** Set `OPENAI_API_KEY` in your environment for SnapAI to work.

## Gluestack MCP

Generate UI components and screens with AI:

```bash
# Start the MCP server
npm run mcp:start
```

Then use AI prompts like "create a user profile screen" to generate components automatically.
