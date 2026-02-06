import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
    },
    subtitle: {
        type: String,
        trim: true,
        maxlength: [300, 'Subtitle cannot be more than 300 characters']
    },
    content: {
        type: String,
        required: [true, 'Please add content']
    },
    coverImage: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'pending', 'published', 'rejected'],
        default: 'draft'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    readTime: {
        type: Number,
        default: 1
    },
    views: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Calculate read time before saving
blogSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        const plainText = this.content.replace(/<[^>]+>/g, '');
        const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
        this.readTime = Math.max(1, Math.ceil(wordCount / 200));
    }
    next();
});

const Blog = mongoose.model('Blog', blogSchema);

export default Blog;
