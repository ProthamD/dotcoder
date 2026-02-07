import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a question title'],
        trim: true,
        maxlength: [200, 'Title cannot be more than 200 characters']
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
    logic: {
        content: {
            type: String,
            default: ''
        },
        isVisible: {
            type: Boolean,
            default: true
        }
    },
    code: {
        content: {
            type: String,
            default: ''
        },
        language: {
            type: String,
            default: 'javascript'
        },
        isVisible: {
            type: Boolean,
            default: true
        }
    },
    order: {
        type: Number,
        default: 0
    },
    link: {
        type: String,
        default: ''
    },
    tags: [{
        type: String,
        trim: true
    }],
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    }
}, {
    timestamps: true
});

// Update chapter question count after save
questionSchema.post('save', async function () {
    const Chapter = mongoose.model('Chapter');
    const chapter = await Chapter.findById(this.chapter);
    if (chapter) {
        await chapter.updateQuestionCount();
    }
});

// Update chapter question count after remove
questionSchema.post('deleteOne', { document: true, query: false }, async function () {
    const Chapter = mongoose.model('Chapter');
    const chapter = await Chapter.findById(this.chapter);
    if (chapter) {
        await chapter.updateQuestionCount();
    }
});

const Question = mongoose.model('Question', questionSchema);

export default Question;
