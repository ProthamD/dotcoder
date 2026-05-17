import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import redis from '../config/redis.js';

// Protect routes
export const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }

    try {
        // Check if token is blacklisted (fail open if Redis is unavailable)
        try {
            const isBlacklisted = await redis.get(`bl:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({
                    success: false,
                    message: 'Token has been invalidated'
                });
            }
        } catch (redisErr) {
            console.error('Redis unavailable — skipping blacklist check:', redisErr.message);
            // Fail open: allow the request if Redis is down
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.token = token; // Attach token for logout
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized to access this route'
        });
    }
};

// Generate JWT Token
export const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Admin only middleware - must be used AFTER protect
export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
};

// Trusted or admin middleware - must be used AFTER protect
export const trustedOnly = (req, res, next) => {
    if (req.user && (req.user.role === 'trusted' || req.user.role === 'admin')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Trusted user access required'
        });
    }
};

// Admin or owner of resource middleware - must be used AFTER protect
// ownerIdFn = (req) => the owner's userId string
export const adminOrOwner = (ownerIdFn) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (req.user.role === 'admin') return next();
    const ownerId = ownerIdFn(req);
    if (ownerId && ownerId.toString() === req.user.id.toString()) return next();
    return res.status(403).json({
        success: false,
        message: 'Not authorized'
    });
};
