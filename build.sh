#!/bin/bash
set -e

echo "🚀 Starting Railway build process..."

echo "📦 Installing Node.js dependencies..."
npm ci

echo "🏗️  Building frontend..."
npm run build

echo "📦 Installing PHP dependencies..."
cd backend
composer install --no-dev --optimize-autoloader --no-interaction

echo "⚙️  Caching Laravel configuration..."
php artisan config:cache || echo "⚠️  Config cache failed (may need APP_KEY)"
php artisan route:cache || echo "⚠️  Route cache failed"
php artisan view:cache || echo "⚠️  View cache failed"

echo "✅ Build completed successfully!"

