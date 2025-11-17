# Railway Deployment Guide

This guide will help you deploy NeskiPDFs to Railway.

## Prerequisites

1. A Railway account (sign up at [railway.app](https://railway.app))
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Create a New Project on Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or your Git provider)
4. Choose your repository

### 2. Configure Environment Variables

In your Railway project settings, add these environment variables:

```bash
# Laravel Configuration
APP_NAME=NeskiPDFs
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:YOUR_APP_KEY_HERE
APP_URL=https://your-app-name.railway.app

# Database (if needed)
DB_CONNECTION=postgresql
DB_HOST=your-db-host
DB_PORT=5432
DB_DATABASE=your-db-name
DB_USERNAME=your-db-user
DB_PASSWORD=your-db-password

# CORS (if needed)
FRONTEND_URL=https://your-app-name.railway.app
```

### 3. Generate App Key

**CRITICAL**: You must generate a Laravel app key before deployment. Railway can auto-generate it, or you can do it manually:

**Option A - Auto-generate (Recommended):**
Railway will automatically generate an APP_KEY if you don't set one. However, it's better to set it manually for consistency.

**Option B - Manual generation:**
1. Run locally:
```bash
cd backend
php artisan key:generate --show
```
2. Copy the output (it will look like `base64:...`)
3. Set it as `APP_KEY` in Railway environment variables

**Important**: If you don't set `APP_KEY`, Laravel will fail to start. Railway may auto-generate it, but it's safer to set it explicitly.

### 4. Build Configuration

Railway will automatically detect the `nixpacks.toml` file and use it for building. The build process runs a single script (`build.sh`) that executes:

1. Install Node.js dependencies (`npm ci`)
2. Build the frontend with Vite (`npm run build`)
3. Install PHP dependencies with Composer
4. Cache Laravel configuration (config, routes, views)

**Everything is automated!** Railway will automatically:
- Detect your project structure
- Install Node.js 18 and PHP 8.1
- Run the build script
- Start your application

### 5. Start Command

Railway will use the start command from `nixpacks.toml`:
```bash
cd backend && php artisan serve --host=0.0.0.0 --port=$PORT
```

### 6. Custom Domain (Optional)

1. Go to your Railway project settings
2. Click "Settings" → "Domains"
3. Add your custom domain

## Important Notes

1. **Port Configuration**: Railway automatically provides a `PORT` environment variable. The application uses `$PORT` to bind to the correct port.

2. **Static Files**: The frontend is built and served from `dist/public` directory. Laravel routes handle serving these files.

3. **Storage**: Railway uses ephemeral storage. If you need persistent storage, consider using Railway's PostgreSQL or external storage services.

4. **File Uploads**: PDF file uploads are stored temporarily. Consider using Railway's volume storage or external storage (S3, etc.) for production.

5. **Logs**: Railway provides built-in logging. Check your project's logs tab for application logs.

## Troubleshooting

### Build Fails

- Check that all dependencies are listed in `package.json` and `composer.json`
- Ensure Node.js and PHP versions are compatible
- Check Railway build logs for specific errors

### Application Won't Start

- Verify `APP_KEY` is set in environment variables
- Check that `PORT` environment variable is available
- Ensure Laravel routes are properly cached

### Frontend Not Loading

- Verify that `npm run build` completed successfully
- Check that `dist/public` directory exists with built files
- Ensure Laravel routes are serving static files correctly

### API Errors

- Check CORS configuration if accessing from different domains
- Verify API routes are properly cached
- Check Laravel logs for specific error messages

## Production Recommendations

1. **Enable HTTPS**: Railway provides HTTPS by default
2. **Set APP_DEBUG=false**: Always disable debug mode in production
3. **Use Database**: If using a database, configure it properly
4. **Storage**: Consider using external storage for file uploads
5. **Monitoring**: Set up error tracking (Sentry, etc.)
6. **Backup**: Regularly backup your database if using one

## Support

For Railway-specific issues, check:
- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)

For application-specific issues, check the project README or open an issue on GitHub.

