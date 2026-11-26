#!/bin/bash

echo "🎬 AutoViews Multi-Player Dashboard - Setup Guide"
echo "=================================================="
echo ""
echo "This script will help you set up the development environment."
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js found: $(node --version)"
echo "✓ npm found: $(npm --version)"
echo ""

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..
echo "✓ Server dependencies installed"
echo ""

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..
echo "✓ Client dependencies installed"
echo ""

# Create .env file
if [ ! -f server/.env ]; then
    cp server/.env.example server/.env
    echo "✓ Created server/.env file"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start development, run these commands in separate terminals:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd server && npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd client && npm run dev"
echo ""
echo "Then open http://localhost:5173 in your browser"
echo ""
