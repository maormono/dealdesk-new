#!/bin/bash

echo "Checking DealDesk deployment status..."
echo ""

# Check if the auth callback route is accessible
echo "Testing auth callback route..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://dealdesk-monogoto.netlify.app/auth/callback

echo ""
echo "Testing main page..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" https://dealdesk-monogoto.netlify.app/

echo ""
echo "Checking latest commit on GitHub..."
git log --oneline -1

echo ""
echo "If you're still getting 404:"
echo "1. Check Netlify deploy status: https://app.netlify.com/sites/dealdesk-monogoto/deploys"
echo "2. Wait for deployment to complete (usually 1-3 minutes)"
echo "3. Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)"
echo ""
echo "Current time: $(date)"