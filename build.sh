#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

echo "📦 Installing Node.js dependencies..."
npm ci

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

