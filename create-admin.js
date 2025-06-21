const User = require('./server/models/User');
const db = require('./server/config/db');

// Function to create admin user
async function createAdminUser(username, password) {
  try {
    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    
    if (existingUser) {
      console.log(`User "${username}" already exists.`);
      
      // If user exists but is not admin, promote to admin
      if (existingUser.isAdmin !== 1) {
        await User.updateRole(existingUser.id, true);
        console.log(`User "${username}" has been promoted to admin.`);
      } else {
        console.log(`User "${username}" is already an admin.`);
      }
    } else {
      // Create new admin user
      const user = await User.create({
        username,
        password,
        isAdmin: 1
      });
      
      console.log(`Admin user "${username}" created successfully!`);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close database connection
    db.close();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const username = args[0];
const password = args[1];

// Validate inputs
if (!username || !password) {
  console.log('Usage: node create-admin.js <username> <password>');
  process.exit(1);
}

// Create admin user
createAdminUser(username, password); 