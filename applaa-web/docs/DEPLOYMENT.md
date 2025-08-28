# Deployment Guide

This guide covers deploying the Applaa Web Platform to production.

## Prerequisites

- Supabase project (production)
- Vercel account
- Google OAuth credentials (production)
- Domain name (optional)

## Environment Variables

Set up the following environment variables in your deployment platform:

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min
NEXTAUTH_URL=https://your-domain.com

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Optional Variables

```env
# Deployment Integrations
VERCEL_TOKEN=your_vercel_token
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# MCP Services (when implemented)
PLAYWRIGHT_MCP_URL=https://your-playwright-service.com
SEMGREP_MCP_URL=https://your-semgrep-service.com
FLUTTER_MCP_URL=https://your-flutter-service.com

# Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id
POSTHOG_KEY=your_posthog_key
POSTHOG_HOST=https://app.posthog.com
```

## Vercel Deployment (Recommended)

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the `applaa-web` folder as the root directory

### 2. Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `applaa-web`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 3. Set Environment Variables

In the Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all required environment variables
3. Set them for Production, Preview, and Development environments

### 4. Configure Domains

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### 5. Deploy

1. Push to your main branch
2. Vercel will automatically deploy
3. Check deployment logs for any issues

## Manual Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Start Production Server

```bash
npm start
```

### 3. Use Process Manager (PM2)

```bash
npm install -g pm2
pm2 start npm --name "applaa-web" -- start
pm2 save
pm2 startup
```

## Database Setup

### 1. Create Production Database

1. Create a new Supabase project for production
2. Note down the project URL and keys
3. Configure authentication providers

### 2. Run Database Schema

Execute the SQL schema in your Supabase SQL editor:

```sql
-- Copy contents from scripts/create-database-schema.sql
```

### 3. Configure RLS Policies

Ensure all Row Level Security policies are properly configured for production data.

## Authentication Setup

### 1. Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Configure authorized origins and redirect URIs:
   - Origins: `https://your-domain.com`
   - Redirect URIs: `https://your-project.supabase.co/auth/v1/callback`

### 2. Supabase Auth Configuration

1. Go to Supabase Dashboard → Authentication → Settings
2. Configure Google OAuth:
   - Client ID: Your Google Client ID
   - Client Secret: Your Google Client Secret
3. Set site URL to your production domain
4. Configure redirect URLs

## Security Considerations

### 1. Environment Variables

- Never commit secrets to version control
- Use different keys for development and production
- Rotate keys regularly

### 2. CORS Configuration

Configure CORS in Supabase for your production domain:
1. Go to Supabase Dashboard → Settings → API
2. Add your domain to CORS origins

### 3. Rate Limiting

Consider implementing rate limiting for production:
- API endpoints
- Authentication attempts
- File uploads

## Monitoring and Logging

### 1. Vercel Analytics

Enable Vercel Analytics for performance monitoring:
1. Go to Project Settings → Analytics
2. Enable Web Analytics
3. Configure custom events

### 2. Error Tracking

Consider integrating error tracking:
- Sentry
- LogRocket
- Bugsnag

### 3. Database Monitoring

Monitor your Supabase project:
- Database performance
- API usage
- Storage usage
- Authentication metrics

## Backup and Recovery

### 1. Database Backups

Supabase automatically backs up your database, but consider:
- Manual backups before major deployments
- Export critical data regularly
- Test restore procedures

### 2. File Storage Backups

- Supabase Storage has built-in redundancy
- Consider additional backups for critical files
- Document recovery procedures

## Performance Optimization

### 1. Next.js Optimization

- Enable static generation where possible
- Optimize images with Next.js Image component
- Use dynamic imports for code splitting

### 2. Database Optimization

- Add indexes for frequently queried columns
- Monitor slow queries
- Optimize RLS policies

### 3. CDN Configuration

- Vercel automatically provides CDN
- Configure caching headers appropriately
- Optimize static assets

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables
   - Verify dependencies
   - Review build logs

2. **Authentication Issues**
   - Verify OAuth configuration
   - Check redirect URLs
   - Confirm environment variables

3. **Database Connection Issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Review RLS policies

### Health Checks

Create health check endpoints:
- `/api/health` - Basic health check
- `/api/health/db` - Database connectivity
- `/api/health/auth` - Authentication service

## Rollback Procedures

### 1. Vercel Rollback

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "Promote to Production"

### 2. Database Rollback

1. Use Supabase point-in-time recovery
2. Restore from manual backup
3. Run migration rollback scripts

## Maintenance

### Regular Tasks

- Update dependencies monthly
- Review security advisories
- Monitor performance metrics
- Clean up old data
- Rotate secrets quarterly

### Scaling Considerations

- Monitor Supabase usage limits
- Consider database scaling options
- Plan for increased traffic
- Implement caching strategies

---

For additional support, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)