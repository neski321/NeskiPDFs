#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

echo "📦 Installing Node.js dependencies..."
# Clear npm cache to avoid EBUSY errors in Docker/Railway
# Try multiple times with delays if the directory is locked
for i in 1 2 3; do
  rm -rf node_modules/.cache 2>/dev/null && break || sleep 1
done
# Use a temporary cache directory to avoid EBUSY errors
export npm_config_cache=/tmp/.npm
# Temporarily disable exit on error for npm ci
set +e
npm ci --prefer-offline --no-audit
NPM_EXIT_CODE=$?
set -e
if [ $NPM_EXIT_CODE -ne 0 ]; then
  echo "⚠️  npm ci failed (exit code: $NPM_EXIT_CODE), trying with clean node_modules..."
  rm -rf node_modules
  npm ci --prefer-offline --no-audit
fi

echo "🏗️  Building frontend..."
npm run build

echo "📦 Installing PHP dependencies..."
cd backend
# Use composer.phar from project root, or try to find composer in PATH
if [ -f ../composer.phar ]; then
  COMPOSER_CMD="php ../composer.phar"
elif command -v composer >/dev/null 2>&1; then
  COMPOSER_CMD="composer"
elif [ -f /usr/local/bin/composer ]; then
  COMPOSER_CMD="/usr/local/bin/composer"
else
  COMPOSER_CMD="php composer"
fi
echo "Using composer: $COMPOSER_CMD"
# Use --ignore-platform-reqs to skip packages that require missing extensions
# This allows the build to succeed even if spatie/pdf-to-image can't install (requires ext-imagick)
$COMPOSER_CMD install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs || {
  echo "⚠️  Composer install with --ignore-platform-reqs failed, trying without it..."
  $COMPOSER_CMD install --no-dev --optimize-autoloader --no-interaction
}

echo "⚙️  Caching Laravel configuration..."
php artisan config:cache || echo "⚠️  Config cache failed (may need APP_KEY)"
php artisan route:cache || echo "⚠️  Route cache failed"
php artisan view:cache || echo "⚠️  View cache failed"

echo "✅ Build completed successfully!"

