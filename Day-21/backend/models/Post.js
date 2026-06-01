const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    summary: {
      type: String,
      required: [true, 'Post summary is required'],
      trim: true,
      maxlength: [250, 'Summary cannot be more than 250 characters'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
    },
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model('Post', postSchema);

// Dynamically route queries to mock local database if MongoDB is offline
const postProxy = new Proxy(Post, {
  get(target, prop, receiver) {
    if (global.isMockDB) {
      const { MockPost } = require('../config/mockDbEngine');
      return MockPost[prop];
    }
    return Reflect.get(target, prop, receiver);
  },
  construct(target, args) {
    if (global.isMockDB) {
      const { MockPost } = require('../config/mockDbEngine');
      const data = args[0] || {};
      return {
        ...data,
        save: async function() {
          return await MockPost.create(this);
        }
      };
    }
    return new target(...args);
  }
});

module.exports = postProxy;
