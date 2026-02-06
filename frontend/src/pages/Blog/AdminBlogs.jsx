import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Clock, Eye, CheckCircle, XCircle, Filter, ChevronDown } from 'lucide-react';
import './Blog.css';

const AdminBlogs = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('pending');
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/blogs');
            return;
        }
        fetchBlogs();
    }, [tab, isAdmin]);

    const fetchBlogs = async () => {
        setLoading(true);
        try {
            const endpoint = tab === 'pending' ? '/blogs/pending' : '/blogs/admin/all';
            const res = await api.get(endpoint);
            setBlogs(res.data.data);
        } catch (error) {
            console.error('Error fetching blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (blogId) => {
        try {
            await api.put(`/blogs/${blogId}/review`, {
                status: 'published'
            });
            fetchBlogs();
        } catch (error) {
            console.error('Error approving blog:', error);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        try {
            await api.put(`/blogs/${rejectModal}/review`, {
                status: 'rejected',
                rejectionReason
            });
            setRejectModal(null);
            setRejectionReason('');
            fetchBlogs();
        } catch (error) {
            console.error('Error rejecting blog:', error);
        }
    };

    const getStatusBadge = (status) => {
        const classes = {
            draft: 'status-badge-draft',
            pending: 'status-badge-pending',
            published: 'status-badge-published',
            rejected: 'status-badge-rejected'
        };
        return <span className={`blog-status-badge ${classes[status]}`}>{status}</span>;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="page">
            <div className="container">
                <div className="admin-blogs">
                    <div className="admin-blogs-header">
                        <div>
                            <Link to="/blogs" className="blog-detail-back">
                                <ArrowLeft size={16} />
                                Back to Blogs
                            </Link>
                            <h1 className="page-title" style={{ marginTop: '8px' }}>
                                Admin — Blog Review
                            </h1>
                        </div>
                    </div>

                    <div className="blog-tabs">
                        <button
                            className={`blog-tab ${tab === 'pending' ? 'active' : ''}`}
                            onClick={() => setTab('pending')}
                        >
                            <Clock size={16} />
                            Pending Review
                        </button>
                        <button
                            className={`blog-tab ${tab === 'all' ? 'active' : ''}`}
                            onClick={() => setTab('all')}
                        >
                            <Filter size={16} />
                            All Blogs
                        </button>
                    </div>

                    {loading ? (
                        <div className="loading">Loading...</div>
                    ) : blogs.length === 0 ? (
                        <div className="no-blogs">
                            <p>{tab === 'pending' ? 'No blogs pending review' : 'No blogs found'}</p>
                        </div>
                    ) : (
                        <div className="admin-blog-list">
                            {blogs.map((blog) => (
                                <div className="admin-blog-card" key={blog._id}>
                                    <div className="admin-blog-info">
                                        <div className="admin-blog-top">
                                            <h3
                                                className="admin-blog-title"
                                                onClick={() => navigate(`/blogs/${blog._id}`)}
                                            >
                                                {blog.title}
                                            </h3>
                                            {getStatusBadge(blog.status)}
                                        </div>
                                        {blog.subtitle && (
                                            <p className="admin-blog-subtitle">{blog.subtitle}</p>
                                        )}
                                        <div className="admin-blog-meta">
                                            <span>By {blog.author?.username || 'Unknown'}</span>
                                            <span>•</span>
                                            <span>{formatDate(blog.createdAt)}</span>
                                            <span>•</span>
                                            <span>{blog.readTime} min read</span>
                                            {blog.views > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span><Eye size={13} /> {blog.views}</span>
                                                </>
                                            )}
                                        </div>
                                        {blog.tags?.length > 0 && (
                                            <div className="admin-blog-tags">
                                                {blog.tags.map((tag, i) => (
                                                    <span key={i} className="blog-tag">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {blog.status === 'pending' && (
                                        <div className="admin-blog-actions">
                                            <button
                                                className="admin-approve-btn"
                                                onClick={() => handleApprove(blog._id)}
                                            >
                                                <CheckCircle size={16} />
                                                Approve
                                            </button>
                                            <button
                                                className="admin-reject-btn"
                                                onClick={() => setRejectModal(blog._id)}
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {rejectModal && (
                    <div className="rejection-modal-overlay" onClick={() => setRejectModal(null)}>
                        <div className="rejection-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>Reject Blog</h3>
                            <p>Please provide a reason for rejection:</p>
                            <textarea
                                className="rejection-textarea"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Add feedback for the author..."
                                rows={4}
                            />
                            <div className="rejection-modal-actions">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setRejectModal(null);
                                        setRejectionReason('');
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="admin-reject-btn"
                                    onClick={handleReject}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBlogs;
