#!/bin/bash

# Build script for the National Internet Platform

echo "=== Building National Internet Platform ==="
echo "This script will prepare the application for production deployment"

# Install server dependencies
echo "Installing server dependencies..."
npm install

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install

# Build client for production
echo "Building client for production..."
npm run build
cd ..

# Create a production .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating production .env file..."
    cat > .env << EOF
NODE_ENV=production
PORT=5000
DB_PATH=./database.sqlite
JWT_SECRET=change_this_to_a_secure_random_string
JWT_EXPIRE=30d
HOST=0.0.0.0
EOF
    echo "Created .env file. Please edit it to set a secure JWT_SECRET"
fi

echo "=== Build complete ==="
echo "To run the application in production mode, use: npm start"
echo "The application will be accessible from any device on your network" 