import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Route imports
import authRoutes from './routes/auth.js';
import chapterRoutes from './routes/chapters.js';
import questionRoutes from './routes/questions.js';
import cheatsheetRoutes from './routes/cheatsheets.js';
import aiRoutes from './routes/ai.js';
import threadRoutes from './routes/threads.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json({ limit: '10mb' }));

// Enable CORS
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/cheatsheets', cheatsheetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/threads', threadRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: '.coder API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   📚 .coder API Server Running                            ║
║                                                           ║
║   Port: ${PORT}                                              ║
║   Mode: ${process.env.NODE_ENV || 'development'}                                    ║
║                                                           ║
║   Endpoints:                                              ║
║   - Auth:        /api/auth                                ║
║   - Chapters:    /api/chapters                            ║
║   - Questions:   /api/questions                           ║
║   - Cheatsheets: /api/cheatsheets                         ║
║   - AI:          /api/ai                                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export default app;
