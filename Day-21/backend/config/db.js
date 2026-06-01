const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Attempt standard MongoDB connection with a short 2-second timeout
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/blogging-platform', {
      serverSelectionTimeoutMS: 2000, 
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    global.isMockDB = false;
  } catch (error) {
    console.warn(`\n⚠️  MongoDB Connection Refused! [${error.message}]`);
    console.warn(`👉 Falling back to standard JSON-File Mock Database (backend/data/db.json) for bulletproof zero-setup execution! 🎉\n`);
    global.isMockDB = true;
  }
};

module.exports = connectDB;
