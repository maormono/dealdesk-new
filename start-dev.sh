#!/bin/bash

echo "🚀 Starting DealDesk Development Servers..."
echo ""
echo "⚠️  Note: If you see errors, you need to fix npm permissions first:"
echo "   sudo chown -R $(whoami) ~/.npm"
echo "   Then run: npm install in both frontend and backend folders"
echo ""

# Try to start frontend
echo "Starting frontend server..."
cd frontend
if [ -d "node_modules" ]; then
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ Frontend started (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend dependencies not installed. Run: cd frontend && npm install"
fi

# Try to start backend
echo "Starting backend server..."
cd ../backend
if [ -d "node_modules" ]; then
    npm run dev &
    BACKEND_PID=$!
    echo "✅ Backend started (PID: $BACKEND_PID)"
else
    echo "❌ Backend dependencies not installed. Run: cd backend && npm install"
fi

echo ""
echo "Servers attempting to start..."
echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user interrupt
wait