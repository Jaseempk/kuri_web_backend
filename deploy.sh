#!/bin/bash

# Exit on error
set -e

echo "🧹 Cleaning up..."
rm -rf dist/
rm -rf node_modules/

echo "📦 Installing dependencies..."
npm install

echo "🏗️ Building project..."
npm run build

echo "✅ Build complete!"

# If we're in a git repository
if [ -d .git ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "chore: clean build for deployment" || true
    git push || echo "⚠️ Failed to push changes"
fi

echo "🚀 Ready for deployment!" 