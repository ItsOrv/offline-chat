#!/bin/bash

# Startup script for the National Internet Platform

echo "=== Starting National Internet Platform ==="
echo "Running in production mode"

# Check if build exists
if [ ! -d "client/build" ]; then
    echo "Error: Client build not found!"
    echo "Please run ./build.sh first to prepare the application for production"
    exit 1
fi

# Set production mode
export NODE_ENV=production

# Start the server
echo "Starting server..."
node server/index.js 