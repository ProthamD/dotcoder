import mongoose from 'mongoose';
import crypto from 'crypto';

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index: auto-deletes when expired
    }
}, {
    timestamps: true
});

// Generate a 6-digit OTP
otpSchema.statics.generateOTP = function () {
    return crypto.randomInt(100000, 999999).toString();
};

const OTP = mongoose.model('OTP', otpSchema);

export default OTP;
