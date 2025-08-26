#!/bin/bash

echo "🔨 Building DealDesk for production..."
echo ""

# Build frontend with Tailwind CSS
echo "📦 Building frontend with optimized Tailwind CSS..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build for production
npm run build

echo "✅ Frontend built successfully!"
echo ""

# Build backend
echo "📦 Building backend..."
cd ../backend

# Install dependencies if needed  
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Build TypeScript
npm run build

echo "✅ Backend built successfully!"
echo ""

echo "🚀 Production build complete!"
echo ""
echo "To deploy:"
echo "1. Frontend: Deploy the 'frontend/dist' folder to your static hosting service"
echo "2. Backend: Deploy the 'backend/dist' folder to your Node.js hosting service"
echo ""
echo "Note: The Tailwind CSS CDN warning has been resolved - production build uses compiled CSS!"