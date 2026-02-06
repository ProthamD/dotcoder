import mongoose from 'mongoose';

const mindmapNodeSchema = new mongoose.Schema({
    id: String,
    label: String,
    x: Number,
    y: Number,
    type: {
        type: String,
        enum: ['root', 'branch', 'leaf'],
        default: 'branch'
    }
});

const mindmapEdgeSchema = new mongoose.Schema({
    source: String,
    target: String
});

const mindmapSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a mindmap title'],
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
    nodes: [mindmapNodeSchema],
    edges: [mindmapEdgeSchema],
    generatedFrom: {
        type: String,
        enum: ['chapter', 'questions', 'cheatsheet', 'manual'],
        default: 'chapter'
    },
    rawData: {
        type: String // Store the original AI response for regeneration
    }
}, {
    timestamps: true
});

const Mindmap = mongoose.model('Mindmap', mindmapSchema);

export default Mindmap;
