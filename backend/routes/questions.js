import express from 'express';
import Question from '../models/Question.js';
import Chapter from '../models/Chapter.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all questions for a chapter
// @route   GET /api/chapters/:chapterId/questions
// @access  Private
router.get('/chapter/:chapterId', protect, async (req, res) => {
    try {
        const chapter = await Chapter.findById(req.params.chapterId);

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        if (chapter.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const questions = await Question.find({ chapter: req.params.chapterId })
            .sort({ order: 1, createdAt: -1 });

        res.status(200).json({
            success: true,
            count: questions.length,
            data: questions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        if (question.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Create question
// @route   POST /api/questions
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { chapterId, title, logic, code, tags, difficulty, link } = req.body;

        const chapter = await Chapter.findById(chapterId);

        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        if (chapter.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        // Get max order
        const maxOrder = await Question.findOne({ chapter: chapterId })
            .sort({ order: -1 })
            .select('order');

        const question = await Question.create({
            title,
            chapter: chapterId,
            user: req.user.id,
            logic: logic || { content: '', isVisible: true },
            code: code || { content: '', language: 'javascript', isVisible: true },
            link: link || '',
            tags,
            difficulty,
            order: maxOrder ? maxOrder.order + 1 : 0
        });

        res.status(201).json({
            success: true,
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
    try {
        let question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        if (question.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        question = await Question.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Toggle logic visibility
// @route   PUT /api/questions/:id/toggle-logic
// @access  Private
router.put('/:id/toggle-logic', protect, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        if (question.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        question.logic.isVisible = !question.logic.isVisible;
        await question.save();

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Toggle code visibility
// @route   PUT /api/questions/:id/toggle-code
// @access  Private
router.put('/:id/toggle-code', protect, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        if (question.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        question.code.isVisible = !question.code.isVisible;
        await question.save();

        res.status(200).json({
            success: true,
            data: question
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        if (question.user.toString() !== req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        await question.deleteOne();

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
