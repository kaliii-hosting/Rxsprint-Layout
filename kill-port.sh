#!/bin/bash

# Kill any process using port 5173
PORT=5173

# Check if port is in use
if lsof -i :$PORT > /dev/null 2>&1; then
  echo "Port $PORT is in use. Killing process..."
  lsof -i :$PORT | grep LISTEN | awk '{print $2}' | xargs -r kill -9 2>/dev/null
  echo "Port $PORT cleared!"
else
  echo "Port $PORT is already free"
fi

# Start Vite
echo "Starting Vite dev server on port $PORT..."
exec npx vite