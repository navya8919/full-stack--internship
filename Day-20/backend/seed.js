const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('./models/Product');
const User = require('./models/User');

dotenv.config();

const sampleProducts = [
  {
    name: 'Apple iPhone 15 Pro',
    description: 'Experience the pinnacle of smartphone technology with the iPhone 15 Pro. Featuring a titanium design, A17 Pro chip, and a pro camera system that captures stunning detail.',
    price: 129999,
    originalPrice: 139999,
    category: 'Electronics',
    brand: 'Apple',
    images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500'],
    stock: 25,
    rating: 4.8,
    numReviews: 124,
    featured: true,
    tags: ['smartphone', 'apple', 'iphone', '5G']
  },
  {
    name: 'Samsung 4K OLED Smart TV 55"',
    description: 'Immerse yourself in a world of stunning visuals with this 55-inch 4K OLED Smart TV. Features Quantum HDR, built-in Alexa, and ultra-thin bezels.',
    price: 84999,
    originalPrice: 99999,
    category: 'Electronics',
    brand: 'Samsung',
    images: ['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500'],
    stock: 15,
    rating: 4.6,
    numReviews: 89,
    featured: true,
    tags: ['tv', 'oled', '4k', 'smart tv']
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    description: 'Industry-leading noise canceling with two processors and eight microphones. Crystal clear hands-free calling and Alexa voice control.',
    price: 29990,
    originalPrice: 34990,
    category: 'Electronics',
    brand: 'Sony',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'],
    stock: 40,
    rating: 4.9,
    numReviews: 215,
    featured: true,
    tags: ['headphones', 'noise canceling', 'wireless', 'sony']
  },
  {
    name: 'Men\'s Premium Leather Jacket',
    description: 'A timeless classic crafted from genuine full-grain leather. Features a slim fit design, multiple pockets, and premium YKK zippers.',
    price: 7999,
    originalPrice: 12999,
    category: 'Fashion',
    brand: 'LeatherCraft',
    images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
    stock: 30,
    rating: 4.5,
    numReviews: 67,
    featured: false,
    tags: ['jacket', 'leather', 'men', 'fashion']
  },
  {
    name: 'Women\'s Floral Maxi Dress',
    description: 'Elegant floral print maxi dress perfect for any occasion. Made from breathable 100% cotton with adjustable straps and a flowing silhouette.',
    price: 1999,
    originalPrice: 2999,
    category: 'Fashion',
    brand: 'StyleVibe',
    images: ['https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=500'],
    stock: 60,
    rating: 4.3,
    numReviews: 43,
    featured: false,
    tags: ['dress', 'women', 'floral', 'maxi']
  },
  {
    name: 'Ergonomic Office Chair',
    description: 'Designed for all-day comfort with lumbar support, adjustable armrests, and breathable mesh back. Perfect for home office or professional environments.',
    price: 15999,
    originalPrice: 22999,
    category: 'Home & Living',
    brand: 'ComfortPlus',
    images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500'],
    stock: 20,
    rating: 4.7,
    numReviews: 156,
    featured: true,
    tags: ['chair', 'office', 'ergonomic', 'furniture']
  },
  {
    name: 'Stainless Steel Cookware Set',
    description: '10-piece professional-grade stainless steel cookware set. Compatible with all cooktops including induction. Dishwasher safe and oven-ready up to 500°F.',
    price: 8499,
    originalPrice: 12999,
    category: 'Home & Living',
    brand: 'KitchenPro',
    images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500'],
    stock: 35,
    rating: 4.4,
    numReviews: 78,
    featured: false,
    tags: ['cookware', 'kitchen', 'stainless steel', 'cooking']
  },
  {
    name: 'Atomic Habits by James Clear',
    description: 'No.1 New York Times bestseller. Learn how tiny changes can lead to remarkable results. A comprehensive guide to building good habits and breaking bad ones.',
    price: 499,
    originalPrice: 799,
    category: 'Books',
    brand: 'Penguin',
    images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500'],
    stock: 100,
    rating: 4.9,
    numReviews: 432,
    featured: true,
    tags: ['book', 'self-help', 'habits', 'productivity']
  },
  {
    name: 'Yoga Mat Premium Non-Slip',
    description: 'Professional-grade yoga mat with superior grip and cushioning. Made from eco-friendly TPE material. Includes carrying strap and alignment lines.',
    price: 1299,
    originalPrice: 1999,
    category: 'Sports',
    brand: 'ZenFit',
    images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500'],
    stock: 75,
    rating: 4.6,
    numReviews: 189,
    featured: false,
    tags: ['yoga', 'fitness', 'mat', 'exercise']
  },
  {
    name: 'Wireless Gaming Mouse',
    description: 'Ultra-fast 25,600 DPI optical sensor with 70-hour battery life. Customizable RGB lighting and 11 programmable buttons for competitive gaming.',
    price: 4999,
    originalPrice: 6999,
    category: 'Electronics',
    brand: 'Logitech',
    images: ['https://images.unsplash.com/photo-1527814050087-3793815479db?w=500'],
    stock: 50,
    rating: 4.7,
    numReviews: 267,
    featured: false,
    tags: ['gaming', 'mouse', 'wireless', 'logitech']
  },
  {
    name: 'Vitamin C Serum with Hyaluronic Acid',
    description: 'Brightening vitamin C serum with 20% L-ascorbic acid and hyaluronic acid. Reduces dark spots, firms skin, and provides all-day hydration.',
    price: 899,
    originalPrice: 1499,
    category: 'Beauty',
    brand: 'GlowLab',
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500'],
    stock: 90,
    rating: 4.5,
    numReviews: 312,
    featured: false,
    tags: ['skincare', 'vitamin c', 'serum', 'beauty']
  },
  {
    name: 'MacBook Air M2',
    description: 'Supercharged by the next-generation M2 chip, MacBook Air is strikingly thin and incredibly capable. With up to 18 hours of battery life and an all-day powerhouse.',
    price: 114900,
    originalPrice: 119900,
    category: 'Electronics',
    brand: 'Apple',
    images: ['https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500'],
    stock: 18,
    rating: 4.9,
    numReviews: 198,
    featured: true,
    tags: ['laptop', 'apple', 'macbook', 'm2']
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for seeding...');

    await Product.deleteMany({});
    console.log('Existing products cleared.');

    await Product.insertMany(sampleProducts);
    console.log(`✅ ${sampleProducts.length} products seeded successfully!`);

    // Create admin user
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

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

module.exports = { sampleProducts, seedDB };

if (require.main === module) {
  seedDB();
}
