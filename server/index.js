const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Import config and database
const config = require('./config/config');
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const userRoutes = require('./routes/users');

// Import socket handler
const socketHandler = require('./socket');

// Config
dotenv.config();

// Force production mode
process.env.NODE_ENV = 'production';

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow connections from any origin
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Log connection to database - This is already handled in the db.js file

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Socket.io
socketHandler(io);

// Check if client build directory exists
const clientBuildPath = path.join(__dirname, '../client/build');
const clientIndexPath = path.join(clientBuildPath, 'index.html');

// Serve static assets in production mode
if (fs.existsSync(clientBuildPath)) {
  console.log('Client build directory found, serving static files');
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    if (fs.existsSync(clientIndexPath)) {
      res.sendFile(clientIndexPath);
    } else {
      res.status(404).send('Client build not found. Please run "npm run build" in the client directory.');
    }
  });
} else {
  console.log('Client build directory not found, API-only mode');
  app.get('/', (req, res) => {
    res.send('Server is running in API-only mode. Client build not found.');
  });
}

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all available network interfaces

server.listen(PORT, HOST, () => {
  console.log(`Server running in production mode`);
  console.log(`Server accessible at http://${HOST}:${PORT}`);
}); 