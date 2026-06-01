const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [500, 'Comment cannot be more than 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

const Comment = mongoose.model('Comment', commentSchema);

// Dynamically route queries to mock local database if MongoDB is offline
const commentProxy = new Proxy(Comment, {
  get(target, prop, receiver) {
    if (global.isMockDB) {
      const { MockComment } = require('../config/mockDbEngine');
      return MockComment[prop];
    }
    return Reflect.get(target, prop, receiver);
  },
  construct(target, args) {
    if (global.isMockDB) {
      const { MockComment } = require('../config/mockDbEngine');
      const data = args[0] || {};
      return {
        ...data,
        save: async function() {
          return await MockComment.create(this);
        }
      };
    }
    return new target(...args);
  }
});

module.exports = commentProxy;
