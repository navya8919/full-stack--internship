const Comment = require('../models/Comment');
const Post = require('../models/Post');

// @desc    Get comments for a specific post
// @route   GET /api/comments/post/:postId
// @access  Public
const getCommentsByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username email avatar')
      .sort({ createdAt: 1 }); // Oldest first to read naturally like a conversation

    res.json({ success: true, count: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new comment
// @route   POST /api/comments
// @access  Private
const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content) {
      return res.status(400).json({ success: false, message: 'Please provide post id and content' });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = new Comment({
      post: postId,
      author: req.user._id,
      content,
    });

    const savedComment = await comment.save();
    const populatedComment = await savedComment.populate('author', 'username email avatar');

    res.status(201).json({ success: true, data: populatedComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).populate('post');

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    // Verify permission: comment author OR post author can delete it
    const isCommentAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = comment.post && comment.post.author.toString() === req.user._id.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ success: false, message: 'User not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCommentsByPost,
  createComment,
  deleteComment,
};
