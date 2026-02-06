import mongoose from 'mongoose';

const cheatsheetItemSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add an item title'],
        trim: true
    },
    content: {
        type: String,
        default: ''
    },
    questionLinks: {
        type: String,
        default: ''
    },
    answerLinks: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    order: {
        type: Number,
        default: 0
    }
});

const cheatsheetSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a cheatsheet title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    subject: {
        type: String,
        trim: true,
        maxlength: [50, 'Subject cannot be more than 50 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [300, 'Description cannot be more than 300 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    color: {
        type: String,
        default: '#10b981' // Green default
    },
    icon: {
        type: String,
        default: '📋'
    },
    items: [cheatsheetItemSchema],
    isPublic: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Cheatsheet = mongoose.model('Cheatsheet', cheatsheetSchema);

export default Cheatsheet;
