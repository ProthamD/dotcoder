import express from 'express';
import Blog from '../models/Blog.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all published blogs (public feed)
// @route   GET /api/blogs
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const blogs = await Blog.find({ status: 'published' })
            .populate('author', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get my blogs (all statuses)
// @route   GET /api/blogs/mine
// @access  Private
router.get('/mine', protect, async (req, res) => {
    try {
        const blogs = await Blog.find({ author: req.user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get pending blogs (admin)
// @route   GET /api/blogs/pending
// @access  Private/Admin
router.get('/pending', protect, adminOnly, async (req, res) => {
    try {
        const blogs = await Blog.find({ status: 'pending' })
            .populate('author', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get all blogs for admin (all statuses)
// @route   GET /api/blogs/admin/all
// @access  Private/Admin
router.get('/admin/all', protect, adminOnly, async (req, res) => {
    try {
        const blogs = await Blog.find()
            .populate('author', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: blogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Get single blog
// @route   GET /api/blogs/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name email');

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Only author or admin can see non-published blogs
        if (blog.status !== 'published' &&
            blog.author._id.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Increment views
        blog.views += 1;
        await blog.save();

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Create blog
// @route   POST /api/blogs
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { title, subtitle, content, coverImage, tags, status } = req.body;

        const blog = await Blog.create({
            title,
            subtitle,
            content,
            coverImage,
            tags: tags || [],
            author: req.user._id,
            // Admins can publish directly, users must submit for review
            status: req.user.role === 'admin' && status === 'published'
                ? 'published'
                : (status === 'pending' ? 'pending' : 'draft')
        });

        res.status(201).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Update blog
// @route   PUT /api/blogs/:id
// @access  Private (author only, or admin)
router.put('/:id', protect, async (req, res) => {
    try {
        let blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        // Only author or admin can update
        if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { title, subtitle, content, coverImage, tags, status } = req.body;

        blog.title = title || blog.title;
        blog.subtitle = subtitle !== undefined ? subtitle : blog.subtitle;
        blog.content = content || blog.content;
        blog.coverImage = coverImage !== undefined ? coverImage : blog.coverImage;
        blog.tags = tags || blog.tags;

        // Handle status changes
        if (status) {
            if (req.user.role === 'admin') {
                blog.status = status; // Admin can set any status
            } else if (status === 'pending' && (blog.status === 'draft' || blog.status === 'rejected')) {
                blog.status = 'pending'; // User can submit draft/rejected for review
            } else if (status === 'draft') {
                blog.status = 'draft'; // User can move back to draft
            }
        }

        await blog.save();

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Admin approve/reject blog
// @route   PUT /api/blogs/:id/review
// @access  Private/Admin
router.put('/:id/review', protect, adminOnly, async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;

        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        if (action === 'approve') {
            blog.status = 'published';
            blog.rejectionReason = '';
        } else if (action === 'reject') {
            blog.status = 'rejected';
            blog.rejectionReason = rejectionReason || 'Does not meet guidelines';
        } else {
            return res.status(400).json({ success: false, message: 'Invalid action' });
        }

        await blog.save();

        const populated = await Blog.findById(blog._id).populate('author', 'name email');
        res.status(200).json({ success: true, data: populated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Like/unlike blog
// @route   PUT /api/blogs/:id/like
// @access  Private
router.put('/:id/like', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        const index = blog.likes.indexOf(req.user._id);
        if (index > -1) {
            blog.likes.splice(index, 1);
        } else {
            blog.likes.push(req.user._id);
        }

        await blog.save();

        res.status(200).json({ success: true, data: blog });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Delete blog
// @route   DELETE /api/blogs/:id
// @access  Private (author or admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog not found' });
        }

        if (blog.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await blog.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
