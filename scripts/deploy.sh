#!/bin/bash

# Deploy script for Voice Recognition App
# This script builds the app and prepares it for deployment

echo "🚀 Building Voice Recognition App..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Built files are in the 'dist' directory"
    echo ""
    echo "🌐 To deploy to GitHub Pages:"
    echo "   1. Push your changes to the main branch"
    echo "   2. GitHub Actions will automatically deploy to Pages"
    echo ""
    echo "🔗 Your app will be available at:"
    echo "   https://[your-username].github.io/voice_recognition/"
    echo ""
    echo "📝 To test locally:"
    echo "   npm run preview"
else
    echo "❌ Build failed!"
    exit 1
fi 