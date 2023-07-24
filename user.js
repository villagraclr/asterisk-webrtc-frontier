// You can implement user registration and authentication logic here
// using a database (e.g., MongoDB, MySQL) and any authentication mechanism you prefer.
const mongoose = require('mongoose');
// Load environment variables from .env file
require('dotenv').config();

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define the user schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String,
});

const User = mongoose.model('User', userSchema);

// Function to register a new user
async function registerUser(userData) {
  try {
    // You can implement user registration logic here (e.g., store user data in a database)
    // For this example, we will store users in an in-memory object
    const newUser = new User(userData);
    await newUser.save();

    console.log('New user registered:', userData.username);
    return { username: userData.username };
  } catch (error) {
    console.error('Error registering user:', error.message);
    throw error;
  }
}

// Function to authenticate a user
async function loginUser(userData) {
  try {
    // You can implement user authentication logic here (e.g., check credentials against a database)
    // For this example, we will authenticate users against the in-memory object
    const user = users[userData.username];
    if (!user || user.password !== userData.password) {
      throw new Error('Invalid credentials');
    }

    console.log('User authenticated:', userData.username);
    return { username: userData.username };
  } catch (error) {
    console.error('Error authenticating user:', error.message);
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
};
