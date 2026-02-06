import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const threadSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    replies: [replySchema],
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for faster queries
threadSchema.index({ user: 1, createdAt: -1 });
threadSchema.index({ createdAt: -1 });

export default mongoose.model('Thread', threadSchema);
