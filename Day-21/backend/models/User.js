const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    avatar: {
      type: String,
      default: function () {
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(this.username || 'default')}`;
      },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password input to hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Dynamically route queries to mock local database if MongoDB is offline
const userProxy = new Proxy(User, {
  get(target, prop, receiver) {
    if (global.isMockDB) {
      const { MockUser } = require('../config/mockDbEngine');
      return MockUser[prop];
    }
    return Reflect.get(target, prop, receiver);
  },
  construct(target, args) {
    if (global.isMockDB) {
      const { MockUser } = require('../config/mockDbEngine');
      const data = args[0] || {};
      return {
        ...data,
        save: async function() {
          return await MockUser.create(this);
        }
      };
    }
    return new target(...args);
  }
});

module.exports = userProxy;
