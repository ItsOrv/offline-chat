const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '../../database.sqlite'),
  JWT_SECRET: process.env.JWT_SECRET || 'secret_key_change_in_production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d'
}; 