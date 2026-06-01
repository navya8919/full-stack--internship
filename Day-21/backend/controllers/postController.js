const Post = require('../models/Post');
const Comment = require('../models/Comment');

// @desc    Get all posts
// @route   GET /api/posts
// @access  Public
const getPosts = async (req, res) => {
  try {
    const { search, tag } = req.query;
    let query = {};

    // Search query for title or summary
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by tag
    if (tag) {
      query.tags = tag;
    }

    const posts = await Post.find(query)
      .populate('author', 'username email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Public
const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'username email avatar');
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, data: post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { title, summary, content, coverImage, tags } = req.body;

    if (!title || !summary || !content) {
      return res.status(400).json({ success: false, message: 'Please provide title, summary and content' });
    }

    // Process tags (supporting dynamic tag array or comma-separated string)
    let processedTags = [];
    if (Array.isArray(tags)) {
      processedTags = tags;
    } else if (typeof tags === 'string' && tags.trim()) {
      processedTags = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    }

    const post = new Post({
      title,
      summary,
      content,
      coverImage: coverImage || undefined,
      author: req.user._id,
      tags: processedTags,
    });

    const savedPost = await post.save();
    const populatedPost = await savedPost.populate('author', 'username email avatar');

    res.status(201).json({ success: true, data: populatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
  try {
    const { title, summary, content, coverImage, tags } = req.body;

    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'User not authorized to update this post' });
    }

    // Process tags
    let processedTags = post.tags;
    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        processedTags = tags;
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
      }
    }

    post.title = title || post.title;
    post.summary = summary || post.summary;
    post.content = content || post.content;
    post.coverImage = coverImage !== undefined ? coverImage : post.coverImage;
    post.tags = processedTags;

    const updatedPost = await post.save();
    const populatedPost = await updatedPost.populate('author', 'username email avatar');

    res.json({ success: true, data: populatedPost });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check ownership
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'User not authorized to delete this post' });
    }

    // Delete post comments as well
    await Comment.deleteMany({ post: req.params.id });

    // Delete post
    await Post.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Post and associated comments removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
};
