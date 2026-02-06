import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    ArrowLeft,
    Heart,
    Eye,
    Clock,
    Calendar,
    User,
    Edit3,
    Trash2
} from 'lucide-react';
import './Blog.css';

const BlogDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [blog, setBlog] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBlog();
    }, [id]);

    const fetchBlog = async () => {
        try {
            const res = await api.get(`/blogs/${id}`);
            setBlog(res.data.data);
        } catch (error) {
            console.error('Error fetching blog:', error);
            navigate('/blogs');
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        try {
            const res = await api.put(`/blogs/${id}/like`);
            setBlog(res.data.data);
        } catch (error) {
            console.error('Error liking blog:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Delete this blog?')) return;
        try {
            await api.delete(`/blogs/${id}`);
            navigate('/blogs');
        } catch (error) {
            console.error('Error deleting blog:', error);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const isAuthor = blog?.author?._id === user?._id;
    const isLiked = blog?.likes?.includes(user?._id);

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="skeleton" style={{ height: 600 }}></div>
                </div>
            </div>
        );
    }

    if (!blog) return null;

    return (
        <div className="page">
            <div className="container">
                <div className="blog-detail">
                    <Link to="/blogs" className="blog-detail-back">
                        <ArrowLeft size={16} />
                        Back to Blogs
                    </Link>

                    {/* Status notices */}
                    {blog.status === 'pending' && (
                        <div className="blog-pending-notice">
                            ⏳ This blog is pending review by an admin. It will be visible to everyone once approved.
                        </div>
                    )}
                    {blog.status === 'rejected' && (
                        <div className="blog-rejected-notice">
                            <strong>❌ Rejected:</strong> {blog.rejectionReason || 'This blog was not approved.'}
                        </div>
                    )}

                    {/* Cover Image */}
                    {blog.coverImage && (
                        <div className="blog-detail-cover">
                            <img src={blog.coverImage} alt={blog.title} />
                        </div>
                    )}

                    {/* Header */}
                    <div className="blog-detail-header">
                        {blog.tags?.length > 0 && (
                            <div className="blog-detail-tags">
                                {blog.tags.map((tag, i) => (
                                    <span key={i} className="blog-tag">{tag}</span>
                                ))}
                            </div>
                        )}
                        <h1 className="blog-detail-title">{blog.title}</h1>
                        {blog.subtitle && (
                            <p className="blog-detail-subtitle">{blog.subtitle}</p>
                        )}
                    </div>

                    {/* Meta bar */}
                    <div className="blog-detail-meta">
                        <div className="blog-author-info">
                            <div className="blog-author-avatar">
                                <User size={20} />
                            </div>
                            <div>
                                <div className="blog-author-name">{blog.author?.name}</div>
                                <div className="blog-author-date">{formatDate(blog.createdAt)}</div>
                            </div>
                        </div>
                        <div className="blog-meta-divider"></div>
                        <div className="blog-meta-item">
                            <Clock size={14} />
                            <span>{blog.readTime} min read</span>
                        </div>
                        <div className="blog-meta-item">
                            <Eye size={14} />
                            <span>{blog.views} views</span>
                        </div>
                        <div className="blog-detail-actions">
                            <button
                                className={`like-btn ${isLiked ? 'liked' : ''}`}
                                onClick={handleLike}
                            >
                                <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
                                {blog.likes?.length || 0}
                            </button>
                            {(isAuthor || isAdmin) && (
                                <>
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={() => navigate(`/blogs/write?edit=${blog._id}`)}
                                        title="Edit"
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-icon"
                                        onClick={handleDelete}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div
                        className="blog-detail-content ql-editor"
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                    />
                </div>
            </div>
        </div>
    );
};

export default BlogDetail;
