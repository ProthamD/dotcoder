import mongoose from 'mongoose';

const channelSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Channel name is required'],
        trim: true,
        maxlength: [50, 'Channel name cannot exceed 50 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [200, 'Description cannot exceed 200 characters'],
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

channelSchema.index({ name: 1 }, { unique: true });

export default mongoose.model('Channel', channelSchema);
