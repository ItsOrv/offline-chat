// Get the current hostname (IP or domain)
const currentHost = window.location.hostname;

// Server API URL configuration
const API_URL = process.env.REACT_APP_API_URL || 
  `${window.location.protocol}//${currentHost}:5000`;

// Socket.io configuration
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 
  `${window.location.protocol}//${currentHost}:5000`;

console.log('Using API URL:', API_URL);
console.log('Using Socket URL:', SOCKET_URL);

export { API_URL, SOCKET_URL }; 