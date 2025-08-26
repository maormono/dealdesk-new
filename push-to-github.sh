#!/bin/bash

echo "📦 DealDesk Repository Push Script"
echo "=================================="
echo ""
echo "⚠️  Before running this script, make sure you've created the repository on GitHub:"
echo "   1. Go to https://github.com/new"
echo "   2. Name it 'dealdesk'"
echo "   3. Don't initialize with README"
echo ""
read -p "Have you created the GitHub repository? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "🔄 Setting up remote and pushing..."
    
    # Remove existing remote if any
    git remote remove origin 2>/dev/null
    
    # Add the correct remote
    git remote add origin https://github.com/maormono/dealdesk.git
    
    # Push to main branch
    git push -u origin main
    
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 View your repository at: https://github.com/maormono/dealdesk"
else
    echo ""
    echo "📝 Steps to create repository:"
    echo "   1. Go to https://github.com/new"
    echo "   2. Repository name: dealdesk"
    echo "   3. Keep it public or private as you prefer"
    echo "   4. DON'T check 'Add a README file'"
    echo "   5. Click 'Create repository'"
    echo "   6. Run this script again"
fi