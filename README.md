# National Internet Platform

This project is a communication platform for the national internet that provides public and private chat capabilities with message management.

## Features

- **Public Chat** with admin message approval
- **Private Messaging** between users
- **Admin Panel** for administrators
- **Authentication** system with registration and login

## Project Structure

```
offline/
│
├── client/                # Frontend (React)
│   ├── public/            # Public files
│   └── src/               # React source code
│       ├── components/    # Reusable components
│       ├── context/       # React contexts
│       └── pages/         # Main application pages
│
└── server/                # Backend (Node.js/Express)
    ├── config/            # Configuration
    ├── controllers/       # Controllers
    ├── middleware/        # Middleware
    ├── models/            # Database models
    └── routes/            # API routes
```

## Prerequisites

To run this project, you need:

- Node.js (version 14 or higher)
- MongoDB
- npm or yarn

## Installation and Setup

### Install Dependencies

```
# Install backend and frontend dependencies
npm run install-all

# Or separately
npm install        # Install backend dependencies
cd client && npm install  # Install frontend dependencies
```

### Environment Configuration

Create an `.env` file in the project root directory and set the following environment variables:

```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/offline-platform
JWT_SECRET=your_jwt_secret_key
```

### Running the Project

#### Development Mode

```
# Run server and client simultaneously
npm run dev:both

# Run separately
npm run dev      # Run server
npm run client   # Run client
```

#### Production Mode

```
# Build production version
npm run build

# Run server in production mode
npm start
```

## Platform Capabilities

### Registration and Login
- User registration system with username and password
- User storage in MongoDB database
- Security with bcrypt encryption and JWT

### Public Chat
- Display public chat for all users
- Send messages to public chat (pending admin approval)
- Show approved messages to all users

### Private Messaging
- Send direct messages to other users
- Search users by username
- Display read/unread message status

### Admin Panel
- Approve or reject public chat messages
- Manage users (promote to admin or revoke access)
- View activity logs

## Technologies Used

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io for real-time communication
- JSON Web Token (JWT) for authentication
- bcrypt for encryption

### Frontend
- React
- React Router
- Context API for state management
- Styled Components for styling
- Socket.io-client for server communication
- Axios for HTTP requests 