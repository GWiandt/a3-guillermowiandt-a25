// test-mongo.js
require('dotenv').config();
const mongoose = require('mongoose');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas (test)');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Connection error (test):');
    console.error(err);
    process.exit(1);
  }
}
test();
