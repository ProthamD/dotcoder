import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, MessageSquare, Eye, Clock, Send, Trash2, Code } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ThreadDetail.css';

const ThreadDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messageContent, setMessageContent] = useState('');
    const [error, setError] = useState('');
    const [isCodeMode, setIsCodeMode] = useState(false);
    const [expandedCodeBlocks, setExpandedCodeBlocks] = useState({});
    const messagesEndRef = useRef(null);
    const chatMessagesRef = useRef(null);

    useEffect(() => {
        fetchThread();
    }, [id]);

    useEffect(() => {
        scrollToBottom();
    }, [thread?.replies]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchThread = async () => {
        try {
            const res = await api.get(`/threads/${id}`);
            setThread(res.data.data);
        } catch (error) {
            console.error('Error fetching thread:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        setError('');

        if (!messageContent.trim()) {
            setError('Message cannot be empty');
            return;
        }

        try {
            const content = isCodeMode ? `[CODE]${messageContent}[/CODE]` : messageContent;
            const res = await api.post(`/threads/${id}/replies`, {
                content: content
            });
            setThread(res.data.data);
            setMessageContent('');
            setIsCodeMode(false);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to send message');
        }
    };

    const handleDeleteMessage = async (replyId) => {
        if (!window.confirm('Delete this message?')) return;

        try {
            const res = await api.delete(`/threads/${id}/replies/${replyId}`);
            setThread(res.data.data);
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    const formatTime = (date) => {
        const messageDate = new Date(date);
        const now = new Date();
        const diffMs = now - messageDate;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        return messageDate.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const parseContent = (content) => {
        const codeRegex = /\[CODE\](.*?)\[\/CODE\]/s;
        const match = content.match(codeRegex);
        
        if (match) {
            return {
                isCode: true,
                code: match[1]
            };
        }
        return {
            isCode: false,
            text: content
        };
    };

    const toggleCodeExpansion = (replyId) => {
        setExpandedCodeBlocks(prev => ({
            ...prev,
            [replyId]: !prev[replyId]
        }));
    };

    if (loading) {
        return (
            <div className="page">
                <div className="container thread-detail-container">
                    <div className="skeleton" style={{ height: 400 }}></div>
                </div>
            </div>
        );
    }

    if (!thread) {
        return (
            <div className="page">
                <div className="container thread-detail-container">
                    <div className="empty-state">
                        <h3>Thread not found</h3>
                        <button className="btn btn-primary" onClick={() => navigate('/discussion')}>
                            Back to Discussions
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container thread-detail-container">
                <button
                    className="btn btn-ghost back-button"
                    onClick={() => navigate('/discussion')}
                >
                    <ArrowLeft size={18} />
                    Back to Discussions
                </button>

                {/* Sticky Thread Header */}
                <div className="thread-detail-header">
                    <h1 className="thread-detail-title">{thread.title}</h1>
                    <div className="thread-detail-meta">
                        <div className="thread-meta-item">
                            <MessageSquare size={16} />
                            <span>{thread.replies?.length || 0} messages</span>
                        </div>
                        <div className="thread-meta-item">
                            <Eye size={16} />
                            <span>{thread.views || 0} views</span>
                        </div>
                        <div className="thread-meta-item">
                            <Clock size={16} />
                            <span>{formatTime(thread.createdAt)}</span>
                        </div>
                        <div className="thread-meta-item">
                            <span>by {thread.user?.name}</span>
                        </div>
                    </div>
                    {thread.tags && thread.tags.length > 0 && (
                        <div className="thread-detail-tags">
                            {thread.tags.map((tag, index) => (
                                <span key={index} className="thread-tag">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="thread-detail-content">
                        <p>{thread.content}</p>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="chat-container">
                    <div className="chat-header">
                        <MessageSquare size={20} />
                        <h3>Discussion</h3>
                    </div>

                    {/* Chat Messages */}
                    <div className="chat-messages" ref={chatMessagesRef}>
                        {thread.replies && thread.replies.length > 0 ? (
                            <>
                                {thread.replies.map((reply) => (
                                    <div
                                        key={reply._id}
                                        className={`chat-message ${
                                            user && user.id === reply.user?._id ? 'own-message' : ''
                                        }`}
                                    >
                                        <div className="chat-avatar">
                                            {getInitials(reply.user?.name || 'U')}
                                        </div>
                                        <div className="chat-message-content">
                                            <div className="chat-message-header">
                                                <span className="chat-author-name">
                                                    {reply.user?.name}
                                                </span>
                                                <span className="chat-time">
                                                    {formatTime(reply.createdAt)}
                                                </span>
                                            </div>
                                            <div className="chat-bubble">
                                                {(() => {
                                                    const parsed = parseContent(reply.content);
                                                    if (parsed.isCode) {
                                                        const isExpanded = expandedCodeBlocks[reply._id];
                                                        return (
                                                            <div className="code-block-container">
                                                                <div className="code-block-header">
                                                                    <Code size={14} />
                                                                    <span>Code Snippet</span>
                                                                    <button
                                                                        className="btn btn-ghost btn-sm code-toggle"
                                                                        onClick={() => toggleCodeExpansion(reply._id)}
                                                                    >
                                                                        {isExpanded ? 'Collapse' : 'Expand'}
                                                                    </button>
                                                                </div>
                                                                <pre className={`code-block ${isExpanded ? 'expanded' : 'collapsed'}`}>
                                                                    <code>{parsed.code}</code>
                                                                </pre>
                                                            </div>
                                                        );
                                                    }
                                                    return reply.content;
                                                })()}
                                                {user && user.id === reply.user?._id && (
                                                    <div className="chat-bubble-actions">
                                                        <button
                                                            className="btn btn-ghost btn-icon"
                                                            style={{ padding: '4px' }}
                                                            onClick={() => handleDeleteMessage(reply._id)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        ) : (
                            <div className="chat-empty">
                                <div className="chat-empty-icon">
                                    <MessageSquare size={28} />
                                </div>
                                <p>No messages yet. Start the conversation!</p>
                            </div>
                        )}
                    </div>

                    {/* Chat Input */}
                    <div className="chat-input-container">
                        {error && (
                            <div style={{
                                padding: 'var(--spacing-sm)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                color: '#f87171',
                                marginBottom: 'var(--spacing-sm)',
                                fontSize: 'var(--font-size-sm)'
                            }}>
                                {error}
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="chat-input-form">
                            <textarea
                                className={`chat-input ${isCodeMode ? 'code-mode' : ''}`}
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={isCodeMode ? "Paste your code here..." : "Type a message... (Enter to send, Shift+Enter for new line)"}
                                rows={isCodeMode ? 3 : 1}
                            />
                            <div className="chat-button-group">
                                <button 
                                    type="button"
                                    className={`btn chat-code-button ${isCodeMode ? 'active' : ''}`}
                                    onClick={() => setIsCodeMode(!isCodeMode)}
                                    title="Send Code"
                                >
                                    <Code size={20} />
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary chat-send-button"
                                    disabled={!messageContent.trim()}
                                >
                                    <Send size={20} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThreadDetail;
