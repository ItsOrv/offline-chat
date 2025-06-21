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
const messageRoutesFn = require('./routes/messages'); // Changed to function
const userRoutes = require('./routes/users');

// Import socket handler
const { initSocket } = require('./socket'); // Changed import

// Config
dotenv.config();

// Determine environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS Configuration
const clientOrigin = process.env.CLIENT_ORIGIN;
const corsOptions = {
  origin: NODE_ENV === 'development' ? '*' : clientOrigin, // Allow all in dev, specific in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

if (NODE_ENV === 'production' && !clientOrigin) {
  console.warn('WARNING: CLIENT_ORIGIN is not set in production. CORS might block frontend access.');
  // corsOptions.origin = false; // More restrictive: blocks if not set
}


const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: corsOptions // Use defined CORS options
});

// Middleware
app.use(cors(corsOptions)); // Use defined CORS options
app.use(express.json());

// Log connection to database - This is already handled in the db.js file

// Socket.io (initialize before routes that need io)
initSocket(io); // Changed to initSocket

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutesFn(io)); // Pass io to message routes
app.use('/api/users', userRoutes);

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