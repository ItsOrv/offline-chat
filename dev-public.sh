#!/bin/bash

# Get the local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Set environment variables
export NODE_ENV=development
export PORT=5000
export HOST=0.0.0.0

# Print information
echo "Starting server in development mode with public access"
echo "Server API will be accessible at http://$LOCAL_IP:5000"
echo "Client will be accessible at http://$LOCAL_IP:3000"

# Change to the server directory
cd "$(dirname "$0")"

# Kill any existing node processes
pkill -f "node server/index.js" || true

# Start the development server
npm run dev 