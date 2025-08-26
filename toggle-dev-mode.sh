#!/bin/bash

# Toggle between development mode (no auth) and production mode (with auth)

MODE=${1:-check}

if [ "$MODE" = "dev" ]; then
    echo "Enabling development mode (authentication bypassed)..."
    
    # Backup original App.tsx
    cp frontend/src/App.tsx frontend/src/App.tsx.backup
    
    # Modify App.tsx to use dev auth context
    sed -i '' "s|from './contexts/AuthContext'|from './contexts/AuthContext.dev'|g" frontend/src/App.tsx
    
    echo "✅ Development mode enabled!"
    echo "📝 You are now logged in as maor@monogoto.io"
    echo "🔄 Run './toggle-dev-mode.sh prod' to restore production mode"
    
elif [ "$MODE" = "prod" ]; then
    echo "Restoring production mode (authentication required)..."
    
    # Restore original App.tsx
    if [ -f frontend/src/App.tsx.backup ]; then
        sed -i '' "s|from './contexts/AuthContext.dev'|from './contexts/AuthContext'|g" frontend/src/App.tsx
        rm frontend/src/App.tsx.backup
    fi
    
    echo "✅ Production mode restored!"
    echo "🔐 Authentication is now required"
    
else
    # Check current mode
    if grep -q "AuthContext.dev" frontend/src/App.tsx 2>/dev/null; then
        echo "📍 Current mode: DEVELOPMENT (auth bypassed)"
        echo "   Logged in as: maor@monogoto.io"
    else
        echo "📍 Current mode: PRODUCTION (auth required)"
    fi
    
    echo ""
    echo "Usage:"
    echo "  ./toggle-dev-mode.sh dev    # Enable dev mode (bypass auth)"
    echo "  ./toggle-dev-mode.sh prod   # Enable production mode (require auth)"
    echo "  ./toggle-dev-mode.sh        # Check current mode"
fi