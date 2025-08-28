# Applaa Web Platform

A cloud-native web platform for building amazing web, mobile, and Flutter applications with AI assistance. This is the web version of the Applaa desktop application with full feature parity plus new user-centric capabilities.

## 🚀 Features

### Phase 1 (Foundation) - ✅ Implemented
- **Next.js 14** with App Router, TypeScript, and Tailwind CSS
- **Authentication** with Google OAuth via Supabase Auth
- **User Profiles** with skill assessment (beginner/intermediate/advanced)
- **App Management** - Create, read, update, delete applications
- **File System** abstraction over Supabase Storage
- **Database Schema** with Row Level Security (RLS)
- **Core APIs** for apps and files operations

### Phase 2 (Core Features) - 🚧 In Progress
- **Development Environments** - Docker containers for React/Expo/Flutter
- **AI Agent System** - Specialized agents (UI/UX, Security, QA, etc.)
- **MCP Services** - Playwright, Semgrep, Flutter SDK integrations
- **Quality Pipeline** - Build → Security → Tests orchestration
- **Real-time Collaboration** basics

### Phase 3 (Polish & Deploy) - 📋 Planned
- **Deployment Integrations** - Vercel, GitHub, EAS
- **Team Management** and permissions
- **Analytics** and monitoring
- **Documentation** and setup guides

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes + Supabase
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth with Google OAuth
- **State Management**: Jotai (planned)
- **Code Editor**: Monaco Editor (planned)
- **Infrastructure**: Vercel, Docker, Cloud Run

## 📋 Prerequisites

- Node.js 18+
- Docker (for development environments)
- Supabase project
- Vercel account (for deployment)
- Google OAuth credentials

## 🚀 Quick Start

1. **Clone and Setup**
   ```bash
   cd applaa-web
   npm install
   ```

2. **Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

3. **Database Setup**
   - Create a new Supabase project
   - Run the database schema:
     ```sql
     -- Copy and paste the contents of scripts/create-database-schema.sql
     -- into your Supabase SQL editor and execute
     ```

4. **Configure Google OAuth**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins
   - Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Open Application**
   Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
applaa-web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Main application
│   │   ├── api/               # API endpoints
│   │   └── globals.css
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── auth/             # Auth components
│   │   ├── apps/             # App management
│   │   ├── chat/             # Chat interface (planned)
│   │   ├── editor/           # Code editor (planned)
│   │   └── agents/           # Agent interfaces (planned)
│   ├── lib/                  # Utilities
│   │   ├── supabase/         # Database client
│   │   ├── containers/       # Container management (planned)
│   │   ├── mcp/              # MCP integrations (planned)
│   │   └── utils/            # Helper functions
│   └── hooks/                # Custom React hooks (planned)
├── docker/                   # Container definitions (planned)
├── docs/                     # Documentation
├── scripts/                  # Setup and migration scripts
└── README.md
```

## 🗄 Database Schema

The application uses a comprehensive PostgreSQL schema with the following main tables:

- **users** - User profiles with skill levels and subscription tiers
- **apps** - Application projects with metadata
- **app_files** - Virtual file system over Supabase Storage
- **chats** - AI conversations (planned)
- **user_agents** - Agent configurations (planned)
- **dev_environments** - Container management (planned)
- **mcp_service_logs** - Quality pipeline logs (planned)
- **team_members** - Collaboration (planned)
- **usage_analytics** - Telemetry (planned)

All tables include Row Level Security (RLS) policies for data protection.

## 🔐 Security

- **Row Level Security** on all user data
- **Signed URLs** for file downloads
- **Rate limiting** on sensitive endpoints (planned)
- **Container resource limits** (planned)
- **Structured logging** with request IDs

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linting
npm run lint

# Type checking
npm run type-check
```

## 📦 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- Check the [documentation](./docs/)
- Review existing [issues](https://github.com/your-org/applaa-web/issues)
- Create a new issue for bugs or feature requests

## 🗺 Roadmap

See [TASKMASTER.md](../docs/applaa-web/TASKMASTER.md) for detailed implementation roadmap and milestones.

---

Built with ❤️ by the Applaa team