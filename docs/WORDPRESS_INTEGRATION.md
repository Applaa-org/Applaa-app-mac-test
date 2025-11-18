# WordPress Authentication Integration

This guide shows you how to integrate your existing WordPress authentication with the Electron app.

## Option 1: Environment Variables (Simplest)

Add to your `.env` file:

```bash
WORDPRESS_URL=https://your-wordpress-site.com
```

## Option 2: Configuration File (More Flexible)

Create a `wordpress-config.json` file in your project root:

```json
{
  "url": "https://your-wordpress-site.com",
  "apiEndpoint": "https://your-wordpress-site.com/wp-json/wp/v2",
  "authEndpoint": "https://your-wordpress-site.com/wp-json/wp/v2/users/me",
  "customHeaders": {
    "X-Custom-Header": "value"
  }
}
```

## How It Works

1. **Authentication**: Uses your existing WordPress REST API
2. **Login**: Username/password authentication via WordPress REST API
3. **Session**: Stores authentication state locally
4. **Mandatory**: Users must authenticate before using the app

## Usage in Your App

### 1. Wrap your app with AuthGuard:

```tsx
import { AuthGuard } from './components/auth/AuthGuard';

function App() {
  return (
    <AuthGuard>
      {/* Your app content */}
    </AuthGuard>
  );
}
```

### 2. Use authentication in components:

```tsx
import { useWordPressAuth } from './hooks/useWordPressAuth';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useWordPressAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Welcome, {user?.display_name}!</div>;
}
```

## Features

- ✅ **Works with your existing WordPress setup**
- ✅ **Mandatory authentication** - users must log in
- ✅ **Session persistence** - remembers login between app restarts
- ✅ **User roles and capabilities** - access to WordPress user data
- ✅ **Simple configuration** - just set your WordPress URL

## Testing

1. Set your WordPress URL in `.env` or `wordpress-config.json`
2. Start the app: `npm start`
3. The app will show a login dialog
4. Enter your WordPress username and password
5. You'll be authenticated and can use the app

## Troubleshooting

- **"WordPress not configured"**: Make sure you set `WORDPRESS_URL` in `.env` or create `wordpress-config.json`
- **"Invalid username or password"**: Check your WordPress credentials
- **"Authentication failed"**: Verify your WordPress site is accessible and REST API is enabled
