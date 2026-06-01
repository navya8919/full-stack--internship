const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

dotenv.config();

const usersData = [
  {
    username: 'alex_dev',
    email: 'alex@example.com',
    password: 'password123',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alex_dev',
  },
  {
    username: 'sarah_designer',
    email: 'sarah@example.com',
    password: 'password123',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=sarah_designer',
  },
  {
    username: 'cosmic_coder',
    email: 'cosmic@example.com',
    password: 'password123',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=cosmic_coder',
  },
];

const postsData = [
  {
    title: 'The Future of Web Design: Glassmorphism & Cosmic Themes',
    summary: 'Explore how translucent layers, dynamic neon glow, and rich gradients are defining the next wave of high-end consumer web interfaces.',
    content: `## The Evolution of Sleek Interfaces

Modern web interfaces are evolving rapidly. We are moving away from simple, flat, sterile layouts to organic, multi-dimensional workspaces that feel alive. One of the strongest design styles leading this charge is **Glassmorphism**.

### Key Principles of Glassmorphism:
1. **Translucency:** Using backdrop-filter blur effects to let elements melt into their backgrounds.
2. **Layering:** Creating visual hierarchy through borders and shadows.
3. **Vibrant Backgrounds:** Multi-colored linear gradients that peek through translucent containers.
4. **Subtle Outlines:** 1px white or semi-transparent borders mimicking glass refraction.

\`\`\`css
/* Standard Glassmorphism card utility */
.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  border-radius: 16px;
}
\`\`\`

### Enhancing Engagement with Micro-Animations
Designing a beautiful static layout is no longer enough. Interactive elements must respond to user actions. Buttons should hover with ease-out spring transitions. Textboxes should glow like neon when focused. This is how you make a site feel truly premium.`,
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    tags: ['design', 'css', 'trends'],
  },
  {
    title: 'Mastering Async/Await in JavaScript',
    summary: 'A deep dive into writing clean, asynchronous JavaScript. Learn error handling patterns, concurrent execution, and performance strategies.',
    content: `## Asynchronous Programming Made Clean

Writing asynchronous code can easily lead to "callback hell" or unreadable promise chains. Modern JavaScript solved this with \`async/await\`, but are you using it to its full potential?

### Parallel Execution vs. Sequential Waiting
One of the most common mistakes in async/await code is running tasks sequentially when they could run concurrently:

\`\`\`javascript
// Sequential (SLOW)
const posts = await getPosts();
const users = await getUsers(); // Waits for getPosts to complete

// Parallel (FAST)
const [posts, users] = await Promise.all([
  getPosts(),
  getUsers()
]);
\`\`\`

### Robust Error Handling Pattern
To prevent crashes, always wrap async requests in clean \`try/catch\` blocks, or use a helper wrapper:

\`\`\`javascript
const fetchPostDetails = async (id) => {
  try {
    const post = await Post.findById(id);
    if (!post) throw new Error('Post not found');
    return post;
  } catch (error) {
    console.error('Database fetch failed:', error.message);
    throw error;
  }
};
\`\`\`

By mastering promise parallelism and writing clear error frameworks, you will build applications that load instantly and handle crashes gracefully.`,
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    tags: ['javascript', 'backend', 'async'],
  },
  {
    title: 'Designing MongoDB Schemas for Speed and Scale',
    summary: 'Should you reference or embed documents? Learn standard guidelines to architect high-performance Mongoose schemas.',
    content: `## Architecting NoSQL Databases

MongoDB is incredibly flexible, but that flexibility can lead to poor schema design. In this tutorial, we will explore the trade-offs between referencing and embedding in Mongoose.

### Embedding (Denormalization)
Embedding is ideal for "one-to-few" relationships, where details are strictly fetched alongside the parent document:

* **Example:** Storing tags inside a blog post as an array of strings.
* **Benefits:** Single read operation, high performance, atomic updates.
* **Drawbacks:** Document size limit (16MB), redundant data storage.

### Referencing (Normalization)
Referencing is ideal for "one-to-many" or "many-to-many" relationships where documents are highly dynamic:

* **Example:** Linking comments to a blog post, or posts to authors.
* **Benefits:** Avoids document size limits, maintains data integrity.
* **Drawbacks:** Requires dynamic populating (\`populate()\`) which translates to multiple DB lookups.

\`\`\`javascript
const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String
});
\`\`\`

Understanding your query access patterns is the absolute golden key. Design your schema based on how your client requests data, not strictly on database norms!`,
    coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80',
    tags: ['mongodb', 'mongoose', 'database'],
  },
];

const connectDB = require('./config/db');

const seedDB = async () => {
  try {
    await connectDB();
    if (global.isMockDB) {
      console.log('MongoDB connection offline. Seeding local JSON-file fallback database instead...');
    } else {
      console.log('Connected to MongoDB successfully for database seeding...');
    }

    // Clear DB
    await User.deleteMany();
    await Post.deleteMany();
    await Comment.deleteMany();
    console.log('Existing data cleared successfully.');

    // Seed Users (need to manually trigger bcrypt pre-save, so we map create calls)
    const createdUsers = [];
    for (const u of usersData) {
      const user = await User.create(u);
      createdUsers.push(user);
    }
    console.log(`Seeded ${createdUsers.length} users successfully.`);

    // Seed Posts
    const createdPosts = [];
    for (let i = 0; i < postsData.length; i++) {
      const post = postsData[i];
      // Assign authors round-robin
      post.author = createdUsers[i % createdUsers.length]._id;
      const newPost = await Post.create(post);
      createdPosts.push(newPost);
    }
    console.log(`Seeded ${createdPosts.length} posts successfully.`);

    // Seed Comments
    const commentsData = [
      {
        post: createdPosts[0]._id, // Future of web design
        author: createdUsers[1]._id, // Sarah
        content: 'Wow! This glassmorphism CSS code works beautifully. The background backdrop-filter creates a really premium feeling. Excellent writeup!',
      },
      {
        post: createdPosts[0]._id,
        author: createdUsers[2]._id, // Cosmic coder
        content: 'I agree, Sarah. Glassmorphism mixed with standard linear gradients is a killer combo. Do you have any tips on performance when using backdrop-filter blur on heavy pages?',
      },
      {
        post: createdPosts[1]._id, // Async/Await
        author: createdUsers[0]._id, // Alex
        content: 'Promise.all is a lifesaver. I used to run all my DB reads sequentially, and moving to parallel execution cut my API response time in half!',
      },
    ];

    for (const c of commentsData) {
      await Comment.create(c);
    }
    console.log('Seeded comments successfully.');

    console.log('Database seeding finished successfully! 🎉');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
};

seedDB();
