import express from 'express';
import Cheatsheet from '../models/Cheatsheet.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all cheatsheets for user
// @route   GET /api/cheatsheets
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const cheatsheets = await Cheatsheet.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: cheatsheets.length,
            data: cheatsheets
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get single cheatsheet
// @route   GET /api/cheatsheets/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const cheatsheet = await Cheatsheet.findById(req.params.id);

        if (!cheatsheet) {
            return res.status(404).json({
                success: false,
                message: 'Cheatsheet not found'
            });
        }

        if (cheatsheet.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        res.status(200).json({
            success: true,
            data: cheatsheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Create cheatsheet
// @route   POST /api/cheatsheets
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        req.body.user = req.user.id;

        const cheatsheet = await Cheatsheet.create(req.body);

        res.status(201).json({
            success: true,
            data: cheatsheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Update cheatsheet
// @route   PUT /api/cheatsheets/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let cheatsheet = await Cheatsheet.findById(req.params.id);

        if (!cheatsheet) {
            return res.status(404).json({
                success: false,
                message: 'Cheatsheet not found'
            });
        }

        if (cheatsheet.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        cheatsheet = await Cheatsheet.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: cheatsheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Add item to cheatsheet
// @route   POST /api/cheatsheets/:id/items
// @access  Private
router.post('/:id/items', protect, async (req, res) => {
    try {
        const cheatsheet = await Cheatsheet.findById(req.params.id);

        if (!cheatsheet) {
            return res.status(404).json({
                success: false,
                message: 'Cheatsheet not found'
            });
        }

        if (cheatsheet.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const maxOrder = cheatsheet.items.length > 0
            ? Math.max(...cheatsheet.items.map(i => i.order)) + 1
            : 0;

        cheatsheet.items.push({
            ...req.body,
            order: maxOrder
        });

        await cheatsheet.save();

        res.status(201).json({
            success: true,
            data: cheatsheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Update item in cheatsheet
// @route   PUT /api/cheatsheets/:id/items/:itemId
// @access  Private
router.put('/:id/items/:itemId', protect, async (req, res) => {
    try {
        const cheatsheet = await Cheatsheet.findById(req.params.id);

        if (!cheatsheet) {
            return res.status(404).json({
                success: false,
                message: 'Cheatsheet not found'
            });
        }

        if (cheatsheet.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const itemIndex = cheatsheet.items.findIndex(
            item => item._id.toString() === req.params.itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        cheatsheet.items[itemIndex] = {
            ...cheatsheet.items[itemIndex].toObject(),
            ...req.body
        };

        await cheatsheet.save();

        res.status(200).json({
            success: true,
            data: cheatsheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Delete item from cheatsheet
// @route   DELETE /api/cheatsheets/:id/items/:itemId
// @access  Private
router.delete('/:id/items/:itemId', protect, async (req, res) => {
    try {
        const cheatsheet = await Cheatsheet.findById(req.params.id);

        if (!cheatsheet) {
            return res.status(404).json({
                success: false,
                message: 'Cheatsheet not found'
            });
        }

        if (cheatsheet.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        cheatsheet.items = cheatsheet.items.filter(
            item => item._id.toString() !== req.params.itemId
        );

        await cheatsheet.save();

        res.status(200).json({
            success: true,
            data: cheatsheet
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Delete cheatsheet
// @route   DELETE /api/cheatsheets/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const cheatsheet = await Cheatsheet.findById(req.params.id);

        if (!cheatsheet) {
            return res.status(404).json({
                success: false,
                message: 'Cheatsheet not found'
            });
        }

        if (cheatsheet.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await cheatsheet.deleteOne();

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

export default router;
