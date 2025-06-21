const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const DEFAULT_JWT_SECRET = '!!replace_this_secret_in_production_env_variable!!';
const defaultDbPath = path.join(__dirname, '../data/database.sqlite'); // Changed path

if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn('WARNING: Default JWT_SECRET is used in production. This is a security risk. Please set a strong JWT_SECRET in your environment variables.');
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  DB_PATH: process.env.DB_PATH || defaultDbPath,
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d'
}; 