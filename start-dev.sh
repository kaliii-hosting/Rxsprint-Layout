#!/bin/bash

echo "🚀 Starting RxSprint Development Server..."
echo "----------------------------------------"

# Kill any process on port 5173
echo "📍 Checking port 5173..."
npx kill-port 5173 2>/dev/null

# Clear terminal
clear

echo "🌟 RxSprint Development Server"
echo "=============================="
echo ""
echo "📦 Starting Vite on port 5173..."
echo ""

# Start Vite
npm run dev