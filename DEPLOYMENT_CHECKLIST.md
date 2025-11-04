# Railway Deployment Checklist

Use this checklist to ensure your application is ready for Railway deployment.

## Pre-Deployment

- [ ] Code is pushed to Git repository (GitHub/GitLab/Bitbucket)
- [ ] All dependencies are listed in `package.json` and `composer.json`
- [ ] Environment variables are documented
- [ ] `.gitignore` is properly configured
- [ ] Build process works locally (`npm run build`)

## Railway Configuration

- [ ] `nixpacks.toml` file exists in project root
- [ ] `railway.json` file exists (optional but recommended)
- [ ] `.railwayignore` file exists (optional)

## Environment Variables

Required environment variables:
- [ ] `APP_NAME` - Application name
- [ ] `APP_ENV=production` - Environment
- [ ] `APP_DEBUG=false` - Debug mode (MUST be false in production)
- [ ] `APP_KEY` - Laravel encryption key (CRITICAL)
- [ ] `APP_URL` - Your Railway app URL (e.g., `https://your-app.railway.app`)

Optional environment variables:
- [ ] `DB_CONNECTION` - Database connection type
- [ ] `DB_HOST` - Database host
- [ ] `DB_PORT` - Database port
- [ ] `DB_DATABASE` - Database name
- [ ] `DB_USERNAME` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `FRONTEND_URL` - Frontend URL (if different from APP_URL)
- [ ] `BACKEND_URL` - Backend URL (if different from APP_URL)

## Build Configuration

- [ ] `nixpacks.toml` specifies Node.js 18+ and PHP 8.1+
- [ ] Build process installs dependencies correctly
- [ ] Frontend build outputs to `dist/public`
- [ ] Laravel configuration is cached during build
- [ ] Laravel routes are cached during build

## Laravel Configuration

- [ ] `TrustProxies` middleware is configured for Railway
- [ ] CORS is configured if needed
- [ ] Storage directory is writable
- [ ] Logs directory is writable
- [ ] `.env` file is NOT committed to Git

## Testing

- [ ] Application builds successfully
- [ ] Application starts without errors
- [ ] Frontend loads correctly
- [ ] API endpoints work
- [ ] File uploads work (if applicable)
- [ ] PDF operations work correctly

## Post-Deployment

- [ ] Application is accessible via Railway URL
- [ ] Frontend loads correctly
- [ ] API endpoints respond correctly
- [ ] No errors in Railway logs
- [ ] Custom domain is configured (if applicable)
- [ ] HTTPS is enabled (Railway provides this automatically)

## Troubleshooting

If deployment fails:

1. **Check Railway build logs** - Look for errors during build phase
2. **Check Railway runtime logs** - Look for errors when application starts
3. **Verify environment variables** - Ensure all required variables are set
4. **Check APP_KEY** - Ensure it's set and valid
5. **Verify PORT** - Railway provides PORT automatically, don't set it manually
6. **Check file permissions** - Ensure storage directories are writable

## Common Issues

### Build Fails
- Missing dependencies in `package.json` or `composer.json`
- Node.js or PHP version mismatch
- Build script errors

### Application Won't Start
- Missing `APP_KEY`
- Incorrect `APP_URL`
- Port binding issues
- Missing environment variables

### Frontend Not Loading
- Frontend not built (check `dist/public` exists)
- Incorrect routing configuration
- API proxy issues

### API Errors
- CORS configuration issues
- Missing API routes
- Database connection issues (if applicable)

## Need Help?

- Check [Railway Documentation](https://docs.railway.app)
- Review [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md)
- Check Railway Discord community
- Review application logs in Railway dashboard

