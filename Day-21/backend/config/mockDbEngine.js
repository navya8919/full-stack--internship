const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../data/db.json');

// Ensure data folder and db.json file exist
const initMockDB = () => {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(
      dbPath,
      JSON.stringify({ users: [], posts: [], comments: [] }, null, 2)
    );
  }
};

// Read database
const readDB = () => {
  initMockDB();
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { users: [], posts: [], comments: [] };
  }
};

// Write database
const writeDB = (data) => {
  initMockDB();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

// Generate custom hex object IDs
const generateId = () => {
  return Array.from({ length: 24 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

module.exports = {
  readDB,
  writeDB,
  generateId,
  
  // Custom MOCK MODELS Simulation
  MockUser: {
    find: async () => {
      const db = readDB();
      return db.users;
    },
    findOne: async (query) => {
      const db = readDB();
      // Handle $or query
      if (query.$or) {
        return db.users.find((u) => {
          return query.$or.some((q) => {
            if (q.email) {
              const emailVal = typeof q.email === 'string' ? q.email : (q.email.$regex || q.email);
              return u.email.toLowerCase() === String(emailVal).toLowerCase() || u.username === String(emailVal);
            }
            if (q.username) return u.username === q.username;
            return false;
          });
        });
      }
      // Standard query
      return db.users.find((u) => {
        if (query.email) return u.email.toLowerCase() === query.email.toLowerCase();
        if (query.username) return u.username === query.username;
        return false;
      });
    },
    findById: (id) => {
      const db = readDB();
      const user = db.users.find((u) => u._id === String(id));
      if (!user) return null;

      // Return user with helper functions
      return {
        ...user,
        select: function(fields) {
          if (fields.includes('-password')) {
            const { password, ...rest } = this;
            return rest;
          }
          return this;
        },
        matchPassword: async function(enteredPassword) {
          return await bcrypt.compare(enteredPassword, user.password);
        }
      };
    },
    create: async (userData) => {
      const db = readDB();
      // Pre-save password hash
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = {
        _id: generateId(),
        username: userData.username,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        avatar: userData.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.username)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      writeDB(db);
      
      return {
        ...newUser,
        matchPassword: async function(enteredPassword) {
          return await bcrypt.compare(enteredPassword, this.password);
        }
      };
    },
    deleteMany: async () => {
      const db = readDB();
      db.users = [];
      writeDB(db);
      return true;
    }
  },

  MockPost: {
    find: async (query = {}) => {
      const db = readDB();
      let results = [...db.posts];

      // Handle search queries
      if (query.$or) {
        const searchTerms = query.$or.map(q => q.title || q.summary);
        results = results.filter(p => {
          return searchTerms.some(term => {
            const regex = new RegExp(term.$regex, 'i');
            return regex.test(p.title) || regex.test(p.summary);
          });
        });
      }

      // Filter by tag
      if (query.tags) {
        results = results.filter(p => p.tags.includes(query.tags));
      }

      // Sort by newest first
      results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Simulate populate('author')
      return results.map(post => {
        const author = db.users.find(u => u._id === post.author);
        return {
          ...post,
          author: author ? { _id: author._id, username: author.username, email: author.email, avatar: author.avatar } : null
        };
      });
    },
    
    findById: (id) => {
      const db = readDB();
      const post = db.posts.find(p => p._id === String(id));
      if (!post) return null;

      const author = db.users.find(u => u._id === post.author);
      const populatedPost = {
        ...post,
        author: author ? { _id: author._id, username: author.username, email: author.email, avatar: author.avatar } : null
      };

      return {
        ...populatedPost,
        populate: async function(path) {
          return this; // Already populated!
        },
        save: async function() {
          const innerDb = readDB();
          const index = innerDb.posts.findIndex(p => p._id === post._id);
          if (index !== -1) {
            innerDb.posts[index] = {
              ...innerDb.posts[index],
              title: this.title,
              summary: this.summary,
              content: this.content,
              coverImage: this.coverImage,
              tags: this.tags,
              updatedAt: new Date().toISOString()
            };
            writeDB(innerDb);
            return innerDb.posts[index];
          }
          return this;
        }
      };
    },

    create: async (postData) => {
      const db = readDB();
      const newPost = {
        _id: generateId(),
        title: postData.title,
        summary: postData.summary,
        content: postData.content,
        coverImage: postData.coverImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
        author: String(postData.author),
        tags: postData.tags || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.posts.push(newPost);
      writeDB(db);

      const author = db.users.find(u => u._id === newPost.author);
      return {
        ...newPost,
        populate: async function(path) {
          return {
            ...newPost,
            author: author ? { _id: author._id, username: author.username, email: author.email, avatar: author.avatar } : null
          };
        }
      };
    },

    findByIdAndDelete: async (id) => {
      const db = readDB();
      db.posts = db.posts.filter(p => p._id !== String(id));
      db.comments = db.comments.filter(c => c.post !== String(id)); // clean cascade comments
      writeDB(db);
      return true;
    },
    deleteMany: async () => {
      const db = readDB();
      db.posts = [];
      db.comments = [];
      writeDB(db);
      return true;
    }
  },

  MockComment: {
    find: async (query = {}) => {
      const db = readDB();
      let results = [...db.comments];

      if (query.post) {
        results = results.filter(c => c.post === String(query.post));
      }

      // Sort by oldest first for readable threads
      results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Simulate populate('author')
      return results.map(c => {
        const author = db.users.find(u => u._id === c.author);
        return {
          ...c,
          author: author ? { _id: author._id, username: author.username, email: author.email, avatar: author.avatar } : null
        };
      });
    },

    create: async (commentData) => {
      const db = readDB();
      const newComment = {
        _id: generateId(),
        post: String(commentData.post),
        author: String(commentData.author),
        content: commentData.content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.comments.push(newComment);
      writeDB(db);

      const author = db.users.find(u => u._id === newComment.author);
      return {
        ...newComment,
        populate: async function(path) {
          return {
            ...newComment,
            author: author ? { _id: author._id, username: author.username, email: author.email, avatar: author.avatar } : null
          };
        }
      };
    },

    deleteMany: async (query = {}) => {
      const db = readDB();
      if (query.post) {
        db.comments = db.comments.filter(c => c.post !== String(query.post));
        writeDB(db);
      }
      return true;
    },

    findById: (id) => {
      const db = readDB();
      const comment = db.comments.find(c => c._id === String(id));
      if (!comment) return null;

      const post = db.posts.find(p => p._id === comment.post);
      return {
        ...comment,
        post: post ? { _id: post._id, author: post.author } : null
      };
    },

    findByIdAndDelete: async (id) => {
      const db = readDB();
      db.comments = db.comments.filter(c => c._id !== String(id));
      writeDB(db);
      return true;
    }
  }
};
