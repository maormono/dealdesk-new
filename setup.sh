#!/bin/bash

# DealDesk Setup Script
echo "🚀 Setting up DealDesk development environment..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install backend dependencies  
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo "✅ Setup complete!"
echo ""
echo "To start the development servers:"
echo "  Frontend: cd frontend && npm run dev"
echo "  Backend:  cd backend && npm run dev"
echo ""
echo "Or run both together from root:"
echo "  npm run dev"