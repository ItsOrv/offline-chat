#!/bin/bash

# Get the local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')

# Set environment variables for the build
export REACT_APP_API_URL="http://$LOCAL_IP:5000"
export REACT_APP_SOCKET_URL="http://$LOCAL_IP:5000"

# Print information
echo "Building application for production with public access"
echo "API URL: $REACT_APP_API_URL"
echo "Socket URL: $REACT_APP_SOCKET_URL"

# Change to the project directory
cd "$(dirname "$0")"

# Install dependencies if needed
echo "Installing server dependencies..."
npm install

echo "Installing client dependencies..."
npm run client-install

# Build the client
echo "Building client..."
cd client
npm run build
cd ..

echo "Build completed. Run ./start-public.sh to start the server." 