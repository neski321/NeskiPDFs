#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

# Ensure Node.js is in PATH (it should be installed in /usr/local during install phase)
export PATH="/usr/local/bin:$PATH"

# Verify Node.js is available
if ! command -v node >/dev/null 2>&1; then
  echo "⚠️  Node.js not found in PATH, installing Node.js 20..."
  NODE_VERSION=20.18.0
  curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz -o /tmp/node.tar.xz
  tar -xJf /tmp/node.tar.xz -C /tmp
  cp -r /tmp/node-v${NODE_VERSION}-linux-x64/* /usr/local/
  rm -rf /tmp/node-v${NODE_VERSION}-linux-x64 /tmp/node.tar.xz
  export PATH="/usr/local/bin:$PATH"
fi

echo "📦 Node.js version: $(node --version)"
echo "📦 npm version: $(npm --version)"

echo "📦 Installing Node.js dependencies..."
# Use a temporary cache directory to avoid conflicts with Railway's mounted cache
# Railway mounts node_modules/.cache as a Docker cache volume, so we can't delete it
export npm_config_cache=/tmp/.npm
# Run npm ci with error handling
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

