import express from 'express';
import Test from '../models/Test.js';
import Chapter from '../models/Chapter.js';
import Mindmap from '../models/Mindmap.js';
import Question from '../models/Question.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// AI Provider with Groq integration (fast & free!)
class AIProvider {
    constructor() {
        this.model = 'llama-3.3-70b-versatile'; // Best free model on Groq
    }

    async chat(messages) {
        const apiKey = process.env.GROQ_API_KEY;
        
        if (!apiKey) {
            throw new Error('GROQ_API_KEY not configured');
        }
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4096
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error('Groq error:', data.error);
            throw new Error(data.error.message || 'Groq API error');
        }
        
        console.log('Groq response received successfully');
        return data.choices[0].message.content;
    }

    async generateMindmap(chapterTitle, content) {
        const prompt = `You are a study assistant. Analyze the following study notes and create a detailed mindmap structure.

Chapter: ${chapterTitle}

Content:
${content}

Create a mindmap with:
1. A root node for the main topic
2. Branch nodes for major concepts (3-6 branches)
3. Leaf nodes for details under each branch

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "nodes": [
    {"id": "root", "label": "Main Topic Name", "type": "root", "x": 400, "y": 300},
    {"id": "branch-1", "label": "Concept 1", "type": "branch", "x": 200, "y": 150},
    {"id": "leaf-1-1", "label": "Detail 1", "type": "leaf", "x": 100, "y": 100}
  ],
  "edges": [
    {"source": "root", "target": "branch-1"},
    {"source": "branch-1", "target": "leaf-1-1"}
  ]
}

Position nodes in a radial layout around the root (x: 400, y: 300).`;

        try {
            let text = await this.chat([{ role: 'user', content: prompt }]);

            // Clean up the response
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            // Extract JSON if there's extra text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }

            const mindmapData = JSON.parse(text);
            return mindmapData;
        } catch (error) {
            console.error('OpenRouter mindmap error:', error);
            // Return a basic fallback structure
            return this.extractTopicsManually(chapterTitle, content);
        }
    }

    async generateTestQuestions(chapterTitle, questionsContent, difficulty = 'medium', count = 5, existingTags = []) {
        // Build tag context for better problem matching
        const tagContext = existingTags.length > 0 
            ? `\n\nKnown concept tags from the study material: ${existingTags.join(', ')}\nPrioritize finding problems that match these concepts!`
            : '';

        const prompt = `You are a study assistant creating practice questions with links to similar problems on coding platforms.

Based on this study material:
Chapter: ${chapterTitle}

Study Notes:
${questionsContent}${tagContext}

Generate ${count} ${difficulty} difficulty practice questions to test understanding of this material.

IMPORTANT: For each question, find and include a REAL link to a similar problem on LeetCode, HackerRank, GeeksforGeeks, or Codeforces that matches the concepts. 

Return ONLY a valid JSON array (no markdown, no code blocks) with this exact structure:
[
  {
    "question": "Clear, specific question about the material",
    "source": "LeetCode" or "HackerRank" or "GeeksforGeeks" or "Codeforces",
    "sourceUrl": "https://leetcode.com/problems/problem-name/" (actual URL to a similar problem),
    "solution": "Detailed step-by-step solution or explanation",
    "solutionCode": "// Code if applicable, otherwise empty string",
    "difficulty": "${difficulty}",
    "tags": ["tag1", "tag2"] (relevant concept tags like "arrays", "dp", "strings", etc.)
  }
]

Guidelines for finding similar problems:
- Match the core concept being tested (e.g., arrays → Two Sum, DP → Climbing Stairs)
- Use REAL problem URLs from these platforms:
  * LeetCode: https://leetcode.com/problems/[problem-slug]/
  * HackerRank: https://www.hackerrank.com/challenges/[problem-name]/
  * GeeksforGeeks: https://www.geeksforgeeks.org/problems/[problem-name]/
  * Codeforces: https://codeforces.com/problemset/problem/[id]/[letter]
- Include 2-4 relevant tags per question (e.g., "arrays", "two-pointers", "dynamic-programming")

Make the questions varied:
- Some conceptual understanding questions
- Some application/problem-solving questions  
- If the material includes code, include coding questions`;

        try {
            let text = await this.chat([{ role: 'user', content: prompt }]);

            // Clean up the response
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            // Extract JSON array if there's extra text
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }

            const questions = JSON.parse(text);
            return questions;
        } catch (error) {
            console.error('OpenRouter test generation error:', error);
            // Return fallback questions based on content
            return this.generateFallbackQuestions(chapterTitle, questionsContent, difficulty, count);
        }
    }

    async getStudyGuide(chapterTitle, questionsContent, userQuery) {
        const prompt = `You are an expert study tutor helping a student.

The student is studying: ${chapterTitle}

Their study notes include:
${questionsContent}

The student asks: "${userQuery}"

Provide a helpful, detailed response that:
1. Directly answers their question
2. Relates it to their study material if relevant
3. Gives examples or analogies to aid understanding
4. Suggests related topics they should also understand

Be conversational but educational. Use markdown formatting for clarity.`;

        try {
            const response = await this.chat([{ role: 'user', content: prompt }]);
            return response;
        } catch (error) {
            console.error('Groq guide error:', error);
            return `I couldn't generate a response right now. Please check your API key configuration.

**Troubleshooting:**
1. Make sure GROQ_API_KEY is set in your .env file
2. Get a free API key from: https://console.groq.com/
3. Restart the backend server after updating the key`;
        }
    }

    async getSuggestions(content, chapterTitle) {
        const prompt = `You are a study assistant analyzing study notes.

Chapter: ${chapterTitle}
Content:
${content}

Provide 3-5 helpful suggestions to improve these study notes. Consider:
- Missing important concepts
- Areas that need more detail
- Related topics to explore
- Study tips for this material

Return ONLY a valid JSON object (no markdown) with this structure:
{
  "suggestions": [
    {"type": "enhancement", "icon": "💡", "text": "Suggestion text here"},
    {"type": "topic", "icon": "📚", "text": "Related topic suggestion"},
    {"type": "tip", "icon": "✨", "text": "Study tip"}
  ]
}`;

        try {
            let text = await this.chat([{ role: 'user', content: prompt }]);
            text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            // Extract JSON object if there's extra text
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }

            return JSON.parse(text);
        } catch (error) {
            console.error('OpenRouter suggestions error:', error);
            return {
                suggestions: [
                    { type: 'enhancement', icon: '💡', text: 'Consider adding more examples to illustrate key concepts' },
                    { type: 'topic', icon: '📚', text: 'Explore related topics to deepen understanding' },
                    { type: 'tip', icon: '✨', text: 'Review this material regularly for better retention' }
                ]
            };
        }
    }

    // Extract concept tags from question content using AI ONLY
    // Analyzes BOTH code and logic - prioritizes code for accuracy
    async extractTags(questionTitle, logicContent, codeContent) {
        const prompt = `Analyze this code and return accurate LeetCode-style tags.

IMPORTANT: Ignore the title "${questionTitle}" - it may be wrong. Only analyze the actual code.

Code:
${codeContent || 'No code'}

Description (may be inaccurate):
${logicContent || 'No description'}

Instructions:
1. Read the code carefully
2. Identify data structures used (array, string, hash-table, stack, queue, tree, graph, linked-list, heap)
3. Identify algorithm patterns (greedy, dp, two-pointers, binary-search, bfs, dfs, backtracking, sliding-window, sorting)
4. Be specific - only tag what you actually see in the code
5. A frequency array like freq[26] or count[] is effectively a hash-table for counting

Return ONLY a JSON array of 3-5 lowercase tags. Example: ["string", "hash-table", "greedy"]`;

        // Try up to 2 times with AI
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                let text = await this.chat([{ role: 'user', content: prompt }]);
                text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                
                const jsonMatch = text.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    text = jsonMatch[0];
                }

                const tags = JSON.parse(text);
                const validTags = tags
                    .filter(tag => typeof tag === 'string' && tag.length > 0)
                    .map(tag => tag.toLowerCase().trim());
                
                if (validTags.length >= 2) {
                    console.log(`✅ AI extracted tags (attempt ${attempt}): ${validTags.join(', ')}`);
                    return validTags;
                }
                
                console.log(`⚠️ AI returned insufficient tags, attempt ${attempt}`);
            } catch (error) {
                console.error(`❌ AI tag extraction attempt ${attempt} failed:`, error.message);
            }
        }
        
        // If AI fails twice, throw error instead of using bad fallback
        throw new Error('AI tag extraction failed after 2 attempts. Please check your API key or try again.');
    }

    // Fallback methods when AI is unavailable
    extractTopicsManually(chapterTitle, content) {
        const words = content.split(/\s+/).filter(w => w.length > 4 && !w.match(/^[^a-zA-Z]/));
        const uniqueWords = [...new Set(words)].slice(0, 8);

        const nodes = [
            { id: 'root', label: chapterTitle || 'Main Topic', type: 'root', x: 400, y: 300 }
        ];

        uniqueWords.forEach((word, i) => {
            const angle = (i / uniqueWords.length) * 2 * Math.PI;
            nodes.push({
                id: `node-${i}`,
                label: word.charAt(0).toUpperCase() + word.slice(1),
                type: i < 3 ? 'branch' : 'leaf',
                x: 400 + Math.cos(angle) * (i < 3 ? 180 : 280),
                y: 300 + Math.sin(angle) * (i < 3 ? 180 : 280)
            });
        });

        const edges = nodes.slice(1).map((node, i) => ({
            source: node.type === 'leaf' ? 'node-0' : 'root',
            target: node.id
        }));

        return { nodes, edges };
    }

    generateFallbackQuestions(chapterTitle, content, difficulty, count) {
        const questions = [];
        const topics = content.split('\n').filter(line => line.trim().length > 10).slice(0, count);

        // Common LeetCode problems mapped by concept
        const leetcodeProblems = {
            default: { url: 'https://leetcode.com/problems/two-sum/', name: 'LeetCode', tags: ['arrays', 'hash-table'] },
            array: { url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/', name: 'LeetCode', tags: ['arrays', 'dynamic-programming'] },
            string: { url: 'https://leetcode.com/problems/valid-anagram/', name: 'LeetCode', tags: ['strings', 'hash-table'] },
            dp: { url: 'https://leetcode.com/problems/climbing-stairs/', name: 'LeetCode', tags: ['dynamic-programming', 'recursion'] },
            tree: { url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', name: 'LeetCode', tags: ['trees', 'dfs', 'recursion'] },
            graph: { url: 'https://leetcode.com/problems/number-of-islands/', name: 'LeetCode', tags: ['graphs', 'bfs', 'dfs'] },
            linked: { url: 'https://leetcode.com/problems/reverse-linked-list/', name: 'LeetCode', tags: ['linked-list', 'recursion'] }
        };

        for (let i = 0; i < count; i++) {
            const topic = topics[i] || chapterTitle;
            const lowerTopic = topic.toLowerCase();
            
            // Find matching problem based on topic keywords
            let problem = leetcodeProblems.default;
            if (lowerTopic.includes('array')) problem = leetcodeProblems.array;
            else if (lowerTopic.includes('string')) problem = leetcodeProblems.string;
            else if (lowerTopic.includes('dynamic') || lowerTopic.includes('dp')) problem = leetcodeProblems.dp;
            else if (lowerTopic.includes('tree')) problem = leetcodeProblems.tree;
            else if (lowerTopic.includes('graph')) problem = leetcodeProblems.graph;
            else if (lowerTopic.includes('linked') || lowerTopic.includes('list')) problem = leetcodeProblems.linked;

            questions.push({
                question: `Explain the concept: ${topic.substring(0, 100)}...`,
                source: problem.name,
                sourceUrl: problem.url,
                solution: `Review your notes on this topic and explain it in your own words.`,
                solutionCode: '',
                difficulty,
                tags: problem.tags
            });
        }
        return questions;
    }
}

const ai = new AIProvider();

// Helper function to get chapter content with tags
async function getChapterContent(chapterId, includeTags = false) {
    const questions = await Question.find({ chapter: chapterId });
    let content = '';
    let allTags = [];
    
    questions.forEach(q => {
        content += `Question: ${q.title}\n`;
        if (q.logic?.content) {
            // Strip HTML tags for AI processing
            const cleanLogic = q.logic.content.replace(/<[^>]*>/g, '');
            content += `Logic: ${cleanLogic}\n`;
        }
        if (q.code?.content) {
            content += `Code: ${q.code.content}\n`;
        }
        if (q.tags && q.tags.length > 0) {
            content += `Concept Tags: ${q.tags.join(', ')}\n`;
            allTags.push(...q.tags);
        }
        content += '\n';
    });
    
    if (includeTags) {
        // Return unique tags
        const uniqueTags = [...new Set(allTags)];
        return { content, tags: uniqueTags };
    }
    return content;
}

// @desc    Generate mindmap from chapter content
// @route   POST /api/ai/mindmap
// @access  Private
router.post('/mindmap', protect, async (req, res) => {
    try {
        const { chapterId } = req.body;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter || chapter.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Get all content from chapter
        const content = await getChapterContent(chapterId);
        const fullContent = `${chapter.description || ''}\n\n${content}`;

        // Generate mindmap using AI
        const mindmapData = await ai.generateMindmap(chapter.title, fullContent);

        // Delete old mindmap if exists
        await Mindmap.deleteMany({ chapter: chapterId, user: req.user.id });

        // Save new mindmap
        const mindmap = await Mindmap.create({
            title: `${chapter.title} - Mindmap`,
            chapter: chapterId,
            user: req.user.id,
            nodes: mindmapData.nodes,
            edges: mindmapData.edges,
            generatedFrom: 'chapter',
            rawData: fullContent
        });

        res.status(201).json({
            success: true,
            data: mindmap
        });
    } catch (error) {
        console.error('Mindmap error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get mindmap for chapter
// @route   GET /api/ai/mindmap/:chapterId
// @access  Private
router.get('/mindmap/:chapterId', protect, async (req, res) => {
    try {
        const mindmap = await Mindmap.findOne({
            chapter: req.params.chapterId,
            user: req.user.id
        }).sort({ createdAt: -1 });

        if (!mindmap) {
            return res.status(404).json({
                success: false,
                message: 'No mindmap found for this chapter'
            });
        }

        res.status(200).json({
            success: true,
            data: mindmap
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Generate test questions
// @route   POST /api/ai/test
// @access  Private
router.post('/test', protect, async (req, res) => {
    try {
        const { chapterId, difficulty = 'medium', count = 5 } = req.body;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter || chapter.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Get chapter content with tags for better problem matching
        const { content, tags } = await getChapterContent(chapterId, true);

        // Generate questions using AI with concept tags
        const questions = await ai.generateTestQuestions(
            chapter.title,
            content,
            difficulty,
            count,
            tags // Pass existing tags to help AI find better matches
        );

        // Delete old tests for this chapter
        await Test.deleteMany({ chapter: chapterId, user: req.user.id });

        // Create test
        const test = await Test.create({
            title: `${chapter.title} - Practice Test`,
            chapter: chapterId,
            user: req.user.id,
            questions,
            generatedBy: 'ai',
            score: { completed: 0, total: questions.length }
        });

        res.status(201).json({
            success: true,
            data: test
        });
    } catch (error) {
        console.error('Test generation error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get tests for chapter
// @route   GET /api/ai/tests/:chapterId
// @access  Private
router.get('/tests/:chapterId', protect, async (req, res) => {
    try {
        const tests = await Test.find({
            chapter: req.params.chapterId,
            user: req.user.id
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tests.length,
            data: tests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Update test question status
// @route   PUT /api/ai/tests/:testId/questions/:questionIndex
// @access  Private
router.put('/tests/:testId/questions/:questionIndex', protect, async (req, res) => {
    try {
        const test = await Test.findById(req.params.testId);

        if (!test || test.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Test not found'
            });
        }

        const index = parseInt(req.params.questionIndex);
        if (index < 0 || index >= test.questions.length) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question index'
            });
        }

        test.questions[index].isCompleted = req.body.isCompleted;
        test.score.completed = test.questions.filter(q => q.isCompleted).length;

        if (test.score.completed === test.score.total) {
            test.status = 'completed';
        } else if (test.score.completed > 0) {
            test.status = 'in_progress';
        }

        await test.save();

        res.status(200).json({
            success: true,
            data: test
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    AI Study Guide - Chat with AI about your notes
// @route   POST /api/ai/guide
// @access  Private
router.post('/guide', protect, async (req, res) => {
    try {
        const { chapterId, query } = req.body;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter || chapter.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Get chapter content for context
        const content = await getChapterContent(chapterId);

        // Generate AI response
        const response = await ai.getStudyGuide(chapter.title, content, query);

        res.status(200).json({
            success: true,
            data: {
                query,
                response,
                chapterTitle: chapter.title
            }
        });
    } catch (error) {
        console.error('Guide error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Get AI suggestions
// @route   POST /api/ai/suggestions
// @access  Private
router.post('/suggestions', protect, async (req, res) => {
    try {
        const { chapterId } = req.body;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter || chapter.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        const content = await getChapterContent(chapterId);
        const suggestions = await ai.getSuggestions(content, chapter.title);

        res.status(200).json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Extract concept tags from question
// @route   POST /api/ai/extract-tags
// @access  Private
router.post('/extract-tags', protect, async (req, res) => {
    try {
        const { questionId } = req.body;

        const question = await Question.findById(questionId);
        if (!question || question.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Question not found'
            });
        }

        // Extract tags using AI
        const cleanLogic = question.logic?.content?.replace(/<[^>]*>/g, '') || '';
        const tags = await ai.extractTags(
            question.title,
            cleanLogic,
            question.code?.content || ''
        );

        // Update question with extracted tags
        question.tags = tags;
        await question.save();

        res.status(200).json({
            success: true,
            data: {
                questionId: question._id,
                tags
            }
        });
    } catch (error) {
        console.error('Tag extraction error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @desc    Auto-tag all questions in a chapter
// @route   POST /api/ai/auto-tag-chapter
// @access  Private
router.post('/auto-tag-chapter', protect, async (req, res) => {
    try {
        const { chapterId } = req.body;

        const chapter = await Chapter.findById(chapterId);
        if (!chapter || chapter.user.toString() !== req.user.id) {
            return res.status(404).json({
                success: false,
                message: 'Chapter not found'
            });
        }

        // Get all questions in chapter
        const questions = await Question.find({ chapter: chapterId, user: req.user.id });
        
        const results = [];
        for (const question of questions) {
            try {
                const cleanLogic = question.logic?.content?.replace(/<[^>]*>/g, '') || '';
                const tags = await ai.extractTags(
                    question.title,
                    cleanLogic,
                    question.code?.content || ''
                );
                
                question.tags = tags;
                await question.save();
                
                results.push({
                    questionId: question._id,
                    title: question.title,
                    tags,
                    success: true
                });
            } catch (err) {
                results.push({
                    questionId: question._id,
                    title: question.title,
                    success: false,
                    error: err.message
                });
            }
        }

        res.status(200).json({
            success: true,
            data: {
                chapterId,
                totalQuestions: questions.length,
                tagged: results.filter(r => r.success).length,
                results
            }
        });
    } catch (error) {
        console.error('Auto-tag chapter error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;
