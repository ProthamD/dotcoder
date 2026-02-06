import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, MessageSquare, Eye, Clock, X } from 'lucide-react';
import './Discussion.css';

const Discussion = () => {
    const [threads, setThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tags: ''
    });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchThreads();
    }, []);

    const fetchThreads = async () => {
        try {
            const res = await api.get('/threads');
            setThreads(res.data.data);
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim() || !formData.content.trim()) {
            setError('Title and content are required');
            return;
        }

        try {
            const threadData = {
                title: formData.title,
                content: formData.content,
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
            };

            const res = await api.post('/threads', threadData);
            setThreads([res.data.data, ...threads]);
            setShowCreateModal(false);
            setFormData({ title: '', content: '', tags: '' });
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create thread');
        }
    };

    const handleThreadClick = (threadId) => {
        navigate(`/discussion/${threadId}`);
    };

    const formatDate = (date) => {
        const now = new Date();
        const threadDate = new Date(date);
        const diffMs = now - threadDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return threadDate.toLocaleDateString();
    };

    return (
        <div className="page">
            <div className="container">
                <div className="discussion-header">
                    <div className="discussion-header-content">
                        <h1>
                            <span className="text-gradient">Discussions</span>
                        </h1>
                        <p>Share knowledge and discuss topics with the community</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        New Thread
                    </button>
                </div>

                {loading ? (
                    <div className="threads-container">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="thread-card">
                                <div className="skeleton" style={{ height: 100 }}></div>
                            </div>
                        ))}
                    </div>
                ) : threads.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <MessageSquare size={40} />
                        </div>
                        <h3 className="empty-state-title">No threads yet</h3>
                        <p className="empty-state-description">
                            Be the first to start a discussion
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} />
                            Create First Thread
                        </button>
                    </div>
                ) : (
                    <div className="threads-container">
                        {threads.map((thread) => (
                            <div
                                key={thread._id}
                                className="thread-card"
                                onClick={() => handleThreadClick(thread._id)}
                            >
                                <div className="thread-card-header">
                                    <div style={{ flex: 1 }}>
                                        <h3 className="thread-title">{thread.title}</h3>
                                        <p className="thread-content">{thread.content}</p>
                                        {thread.tags && thread.tags.length > 0 && (
                                            <div className="thread-tags">
                                                {thread.tags.map((tag, index) => (
                                                    <span key={index} className="thread-tag">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="thread-meta">
                                    <div className="thread-meta-item">
                                        <MessageSquare size={16} />
                                        <span>{thread.replies?.length || 0} replies</span>
                                    </div>
                                    <div className="thread-meta-item">
                                        <Eye size={16} />
                                        <span>{thread.views || 0} views</span>
                                    </div>
                                    <div className="thread-meta-item">
                                        <Clock size={16} />
                                        <span>{formatDate(thread.createdAt)}</span>
                                    </div>
                                    <div className="thread-meta-item">
                                        <span>by {thread.user?.name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Create Thread Modal */}
                {showCreateModal && (
                    <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Create New Thread</h2>
                                <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {error && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#f87171',
                                    marginBottom: 'var(--spacing-lg)'
                                }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="modal-form">
                                <div className="form-group">
                                    <label>Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="What's your question or topic?"
                                        maxLength={100}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Content *</label>
                                    <textarea
                                        value={formData.content}
                                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Provide more details..."
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Tags (comma separated)</label>
                                    <input
                                        type="text"
                                        value={formData.tags}
                                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        placeholder="javascript, react, nodejs"
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Create Thread
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Discussion;
