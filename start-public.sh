#!/bin/bash

# Get the local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Set environment variables
export NODE_ENV=production
export PORT=5000
export HOST=0.0.0.0

# Print information
echo "Starting server in production mode"
echo "Server will be accessible at http://$LOCAL_IP:5000"

# Change to the server directory
cd "$(dirname "$0")"

# Kill any existing node processes
pkill -f "node server/index.js" || true

# Start the server
node server/index.js 