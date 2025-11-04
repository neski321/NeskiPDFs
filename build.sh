#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

echo "📦 Installing Node.js dependencies..."
npm ci

echo "🏗️  Building frontend..."
npm run build

echo "📦 Installing PHP dependencies..."
cd backend
# Use --ignore-platform-reqs to skip packages that require missing extensions
# This allows the build to succeed even if spatie/pdf-to-image can't install (requires ext-imagick)
composer install --no-dev --optimize-autoloader --no-interaction --ignore-platform-reqs || {
  echo "⚠️  Composer install with --ignore-platform-reqs failed, trying without it..."
  composer install --no-dev --optimize-autoloader --no-interaction
}

echo "⚙️  Caching Laravel configuration..."
php artisan config:cache || echo "⚠️  Config cache failed (may need APP_KEY)"
php artisan route:cache || echo "⚠️  Route cache failed"
php artisan view:cache || echo "⚠️  View cache failed"

echo "✅ Build completed successfully!"

