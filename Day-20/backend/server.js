const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB & Auto-Seed
const connectDB = async () => {
  let mongoUri = process.env.MONGO_URI;
  const Product = require('./models/Product');
  const User = require('./models/User');

  const seedIfEmpty = async () => {
    try {
      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        console.log('🔄 Database is empty. Seeding sample products...');
        const { sampleProducts } = require('./seed');
        await Product.insertMany(sampleProducts);
        console.log(`✅ Seeded ${sampleProducts.length} products.`);
      }
      const adminExists = await User.findOne({ email: 'admin@shop.com' });
      if (!adminExists) {
        await User.create({
          name: 'Admin User',
          email: 'admin@shop.com',
          password: 'admin123',
          role: 'admin'
        });
        console.log('✅ Admin user created: admin@shop.com / admin123');
      }
    } catch (err) {
      console.error('❌ Auto-seeding error:', err);
    }
  };

  // If MONGO_URI is default/missing/template, try local port or in-memory
  if (!mongoUri || mongoUri.includes('<username>') || mongoUri === '') {
    try {
      mongoUri = 'mongodb://127.0.0.1:27017/ecommerce';
      console.log('🔌 Attempting connection to local MongoDB...');
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ MongoDB Connected (Local)');
      await seedIfEmpty();
      return;
    } catch (err) {
      console.log('⚠️ Local MongoDB not running. Starting In-Memory MongoDB...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB Connected (In-Memory)');
        await seedIfEmpty();
        return;
      } catch (memErr) {
        console.error('❌ Failed to start In-Memory MongoDB:', memErr);
        process.exit(1);
      }
    }
  }

  // Otherwise connect to user-defined MONGO_URI
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected (Configured URI)');
    await seedIfEmpty();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: '🛒 E-Commerce API is running!', status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
