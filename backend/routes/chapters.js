import express from 'express';
import Chapter from '../models/Chapter.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all chapters for user
// @route   GET /api/chapters
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const chapters = await Chapter.find({ user: req.user.id })
            .sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: chapters.length,
            data: chapters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get single chapter
// @route   GET /api/chapters/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.id).populate('questions');

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Make sure user owns chapter
        if (chapter.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this chapter'
            });
        }

        res.status(200).json({
            success: true,
            data: chapter
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Create new chapter
// @route   POST /api/chapters
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        req.body.user = req.user.id;

        // Get max order for ordering new chapter
        const maxOrder = await Chapter.findOne({ user: req.user.id })
            .sort({ order: -1 })
            .select('order');

        req.body.order = maxOrder ? maxOrder.order + 1 : 0;

        const chapter = await Chapter.create(req.body);

        res.status(201).json({
            success: true,
            data: chapter
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Update chapter
// @route   PUT /api/chapters/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let chapter = await Chapter.findById(req.params.id);

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Make sure user owns chapter
        if (chapter.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to update this chapter'
            });
        }

        chapter = await Chapter.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: chapter
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Delete chapter
// @route   DELETE /api/chapters/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.id);

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Make sure user owns chapter
        if (chapter.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to delete this chapter'
            });
        }

        await chapter.deleteOne();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Reorder chapters
// @route   PUT /api/chapters/reorder
// @access  Private
router.put('/reorder/all', protect, async (req, res) => {
    try {
        const { chapters } = req.body; // Array of { id, order }

        const bulkOps = chapters.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id, user: req.user.id },
                update: { order }
            }
        }));

        await Chapter.bulkWrite(bulkOps);

        const updatedChapters = await Chapter.find({ user: req.user.id })
            .sort({ order: 1 });

        res.status(200).json({
            success: true,
            data: updatedChapters
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
