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
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "✅ Build completed successfully!"

