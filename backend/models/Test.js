import mongoose from 'mongoose';

const testQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    source: {
        type: String,
        default: 'AI Generated'
    },
    sourceUrl: {
        type: String
    },
    solution: {
        type: String,
        default: ''
    },
    solutionCode: {
        type: String,
        default: ''
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    tags: [{
        type: String
    }],
    isCompleted: {
        type: Boolean,
        default: false
    }
});

const testSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a test title'],
        trim: true
    },
    chapter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chapter',
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    questions: [testQuestionSchema],
    generatedBy: {
        type: String,
        enum: ['ai', 'manual', 'web'],
        default: 'ai'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
    },
    score: {
        completed: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

const Test = mongoose.model('Test', testSchema);

export default Test;
