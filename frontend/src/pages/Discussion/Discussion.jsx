import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, MessageSquare, Eye, Clock, X, Hash, Pin, Shield, Trash2, Globe } from 'lucide-react';
import './Discussion.css';

const Discussion = () => {
    const { user, isAdmin } = useAuth();
    const [threads, setThreads] = useState([]);
    const [channels, setChannels] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showChannelModal, setShowChannelModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        tags: ''
    });
    const [channelForm, setChannelForm] = useState({ name: '', description: '' });
    const [error, setError] = useState('');
    const [channelError, setChannelError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchChannels();
    }, []);

    useEffect(() => {
        if (activeChannel !== null) {
            fetchThreads();
        }
    }, [activeChannel]);

    const fetchChannels = async () => {
        try {
            const res = await api.get('/channels');
            const channelList = res.data.data;
            setChannels(channelList);
            // Default to Global channel
            const global = channelList.find(c => c.isDefault);
            setActiveChannel(global ? global._id : (channelList[0]?._id || null));
        } catch (error) {
            console.error('Error fetching channels:', error);
            setLoading(false);
        }
    };

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const url = activeChannel ? `/threads?channel=${activeChannel}` : '/threads';
            const res = await api.get(url);
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
                tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
                channel: activeChannel
            };

            const res = await api.post('/threads', threadData);
            setThreads([res.data.data, ...threads]);
            setShowCreateModal(false);
            setFormData({ title: '', content: '', tags: '' });
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to create thread');
        }
    };

    const handleCreateChannel = async (e) => {
        e.preventDefault();
        setChannelError('');

        if (!channelForm.name.trim()) {
            setChannelError('Channel name is required');
            return;
        }

        try {
            const res = await api.post('/channels', channelForm);
            setChannels([...channels, res.data.data]);
            setShowChannelModal(false);
            setChannelForm({ name: '', description: '' });
        } catch (error) {
            setChannelError(error.response?.data?.message || 'Failed to create channel');
        }
    };

    const handleDeleteChannel = async (channelId) => {
        if (!window.confirm('Delete this channel? All threads will be moved to Global.')) return;
        try {
            await api.delete(`/channels/${channelId}`);
            setChannels(channels.filter(c => c._id !== channelId));
            // Switch to Global if we deleted the active channel
            if (activeChannel === channelId) {
                const global = channels.find(c => c.isDefault);
                setActiveChannel(global?._id || null);
            }
        } catch (error) {
            console.error('Error deleting channel:', error);
        }
    };

    const handleDeleteThread = async (e, threadId) => {
        e.stopPropagation();
        if (!window.confirm('Delete this thread?')) return;
        try {
            await api.delete(`/threads/${threadId}`);
            setThreads(threads.filter(t => t._id !== threadId));
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete thread');
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

    const activeChannelData = channels.find(c => c._id === activeChannel);

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

                <div className="discussion-layout">
                    {/* Channel Sidebar */}
                    <div className="channel-sidebar">
                        <div className="channel-sidebar-header">
                            <h3>Channels</h3>
                            {isAdmin && (
                                <button
                                    className="btn btn-ghost btn-icon btn-sm"
                                    onClick={() => setShowChannelModal(true)}
                                    title="Create Channel"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>
                        <div className="channel-list">
                            {channels.map((channel) => (
                                <div
                                    key={channel._id}
                                    className={`channel-item ${activeChannel === channel._id ? 'active' : ''}`}
                                    onClick={() => setActiveChannel(channel._id)}
                                >
                                    <div className="channel-item-info">
                                        {channel.isDefault ? <Globe size={16} /> : <Hash size={16} />}
                                        <span className="channel-name">{channel.name}</span>
                                    </div>
                                    {isAdmin && !channel.isDefault && (
                                        <button
                                            className="btn btn-ghost btn-icon channel-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteChannel(channel._id);
                                            }}
                                            title="Delete channel"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Thread List */}
                    <div className="threads-main">
                        {activeChannelData && (
                            <div className="channel-info-bar">
                                {activeChannelData.isDefault ? <Globe size={18} /> : <Hash size={18} />}
                                <span className="channel-info-name">{activeChannelData.name}</span>
                                {activeChannelData.description && (
                                    <span className="channel-info-desc">— {activeChannelData.description}</span>
                                )}
                            </div>
                        )}

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
                                    Be the first to start a discussion in this channel
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
                                {threads.map((thread) => {
                                    const isOwner = user && user.id === thread.user?._id;
                                    const canDelete = isAdmin || (isOwner && !thread.isPrioritized);

                                    return (
                                        <div
                                            key={thread._id}
                                            className={`thread-card ${thread.isPinned ? 'pinned' : ''} ${thread.isPrioritized ? 'prioritized' : ''}`}
                                            onClick={() => handleThreadClick(thread._id)}
                                        >
                                            {(thread.isPinned || thread.isPrioritized) && (
                                                <div className="thread-badges">
                                                    {thread.isPinned && (
                                                        <span className="thread-badge pinned-badge">
                                                            <Pin size={12} /> Pinned
                                                        </span>
                                                    )}
                                                    {thread.isPrioritized && (
                                                        <span className="thread-badge priority-badge">
                                                            <Shield size={12} /> Prioritized
                                                        </span>
                                                    )}
                                                </div>
                                            )}
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
                                                {canDelete && (
                                                    <button
                                                        className="btn btn-ghost btn-icon thread-delete-btn"
                                                        onClick={(e) => handleDeleteThread(e, thread._id)}
                                                        title="Delete thread"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
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
                                                    {(thread.user?.role === 'admin' || thread.user?.role === 'trusted') && (
                                                        <span className={`role-badge role-${thread.user.role}`}>
                                                            {thread.user.role === 'admin' ? 'Admin' : 'Trusted'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

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
                                    <label>Channel</label>
                                    <div className="channel-indicator">
                                        {activeChannelData?.isDefault ? <Globe size={16} /> : <Hash size={16} />}
                                        <span>{activeChannelData?.name || 'Global'}</span>
                                    </div>
                                </div>

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

                {/* Create Channel Modal (Admin only) */}
                {showChannelModal && (
                    <div className="modal-overlay" onClick={() => setShowChannelModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Create Channel</h2>
                                <button
                                    className="btn btn-ghost btn-icon"
                                    onClick={() => setShowChannelModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {channelError && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    color: '#f87171',
                                    marginBottom: 'var(--spacing-lg)'
                                }}>
                                    {channelError}
                                </div>
                            )}

                            <form onSubmit={handleCreateChannel} className="modal-form">
                                <div className="form-group">
                                    <label>Channel Name *</label>
                                    <input
                                        type="text"
                                        value={channelForm.name}
                                        onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                                        placeholder="e.g. javascript, react-help"
                                        maxLength={50}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <input
                                        type="text"
                                        value={channelForm.description}
                                        onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                                        placeholder="What is this channel about?"
                                        maxLength={200}
                                    />
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowChannelModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Create Channel
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
