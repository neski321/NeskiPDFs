#!/bin/bash
set -e

echo "🧪 Testing Railway build locally..."
echo ""

# Check if required tools are installed
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed."; exit 1; }
command -v php >/dev/null 2>&1 || { echo "❌ PHP is required but not installed."; exit 1; }
echo "✅ All prerequisites found"
echo ""

# Test Node.js version
NODE_VERSION=$(node -v)
echo "📦 Node.js version: $NODE_VERSION"
echo ""

# Test PHP version
PHP_VERSION=$(php -v | head -n 1)
echo "📦 PHP version: $PHP_VERSION"
echo ""

# Test build.sh script
echo "🚀 Testing build.sh script..."
echo ""

# Make build.sh executable
chmod +x build.sh

# Run the build script
./build.sh

echo ""
echo "✅ Build test completed successfully!"
echo ""

# Optionally test if the app can start
read -p "🧪 Test if the app can start? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "🚀 Testing app start (will run for 5 seconds, then stop)..."
  echo ""
  
  # Set a test PORT
  export PORT=${PORT:-3000}
  
  # Start the app in background
  cd backend
  timeout 5 php artisan serve --host=0.0.0.0 --port=$PORT &
  SERVER_PID=$!
  sleep 2
  
  # Test if server started
  if ps -p $SERVER_PID > /dev/null; then
    echo "✅ App started successfully on port $PORT"
    echo "   You can test it at: http://localhost:$PORT"
    echo ""
    echo "⚠️  Stopping test server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
  else
    echo "❌ App failed to start"
    exit 1
  fi
  
  cd ..
fi

echo ""
echo "📝 Next steps:"
echo "   1. If build.sh works, your nixpacks.toml should work on Railway"
echo "   2. Railway will automatically use the [start] command from nixpacks.toml"
echo "   3. To test with nixpacks CLI, install it: cargo install nixpacks"
echo "   4. Then run: nixpacks build ."

