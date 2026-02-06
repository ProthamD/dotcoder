import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import './AIGuide.css';

const AIGuide = ({ chapterId, chapterTitle }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Initial welcome message
    useEffect(() => {
        setMessages([{
            type: 'ai',
            content: `👋 Hi! I'm your AI study guide for **${chapterTitle}**.\n\nI can help you with:\n- 📖 Explaining concepts from your notes\n- 🤔 Answering questions about the material\n- 💡 Providing examples and analogies\n- 🔗 Suggesting related topics to study\n\nWhat would you like to learn about?`
        }]);
    }, [chapterTitle]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const res = await api.post('/ai/guide', {
                chapterId,
                query: userMessage
            });

            setMessages(prev => [...prev, {
                type: 'ai',
                content: res.data.data.response
            }]);
        } catch (error) {
            console.error('AI Guide error:', error);
            setMessages(prev => [...prev, {
                type: 'ai',
                content: `❌ Sorry, I couldn't process your request.\n\n**Possible reasons:**\n- The OpenRouter API key may not be configured\n- Network connectivity issues\n\n**To fix:**\n1. Get a free API key from [OpenRouter](https://openrouter.ai/)\n2. Add it to \`backend/.env\` as \`OPENROUTER_API_KEY=your_key_here\`\n3. Restart the backend server`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setInput(suggestion);
    };

    const suggestions = [
        `Explain the main concepts in ${chapterTitle}`,
        'What are the key takeaways from my notes?',
        'Give me an example to understand this better',
        'What related topics should I also study?'
    ];

    return (
        <div className="ai-guide">
            <div className="ai-guide-header">
                <div className="ai-guide-title">
                    <Sparkles size={24} />
                    <h3>AI Study Guide</h3>
                </div>
                <span className="ai-guide-badge">Powered by Llama 3.3</span>
            </div>

            <div className="ai-guide-chat">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.type}`}>
                        <div className="chat-avatar">
                            {msg.type === 'ai' ? <Bot size={20} /> : <User size={20} />}
                        </div>
                        <div className="chat-content">
                            <div
                                className="chat-text"
                                dangerouslySetInnerHTML={{
                                    __html: formatMessage(msg.content)
                                }}
                            />
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="chat-message ai">
                        <div className="chat-avatar">
                            <Bot size={20} />
                        </div>
                        <div className="chat-content">
                            <div className="chat-loading">
                                <RefreshCw size={16} className="spinning" />
                                Thinking...
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 && (
                <div className="ai-guide-suggestions">
                    <p>Try asking:</p>
                    <div className="suggestions-list">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                className="suggestion-chip"
                                onClick={() => handleSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <form className="ai-guide-input" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="input"
                    placeholder="Ask me anything about your notes..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!input.trim() || loading}
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
};

// Markdown formatting function
function formatMessage(text) {
    let html = text
        // Code blocks (must be first)
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
        // Headers
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^# (.*$)/gm, '<h2>$1</h2>')
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
        // Links
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        // Unordered lists with *
        .replace(/^\* (.*$)/gm, '<li>$1</li>')
        // Unordered lists with -
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        // Numbered lists
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        // Line breaks (but not after block elements)
        .replace(/\n(?!<)/g, '<br>');
    
    return html;
}

export default AIGuide;
