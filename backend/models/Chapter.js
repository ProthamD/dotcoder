import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a chapter title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot be more than 500 characters']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    color: {
        type: String,
        default: '' // Empty = golden/orange default gradient
    },
    icon: {
        type: String,
        default: '📚'
    },
    tags: [{
        type: String,
        trim: true
    }],
    questionCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for questions
chapterSchema.virtual('questions', {
    ref: 'Question',
    localField: '_id',
    foreignField: 'chapter',
    justOne: false
});

// Update question count
chapterSchema.methods.updateQuestionCount = async function () {
    const Question = mongoose.model('Question');
    const count = await Question.countDocuments({ chapter: this._id });
    this.questionCount = count;
    await this.save();
};

const Chapter = mongoose.model('Chapter', chapterSchema);

export default Chapter;
