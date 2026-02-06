import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
    Plus,
    Eye,
    Heart,
    Clock,
    User,
    Calendar,
    PenTool,
    Shield,
    ChevronRight,
    BookOpen
} from 'lucide-react';
import './Blog.css';

const Blogs = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);
    const [myBlogs, setMyBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('published');

    useEffect(() => {
        fetchBlogs();
    }, []);

    const fetchBlogs = async () => {
        try {
            const [pubRes, myRes] = await Promise.all([
                api.get('/blogs'),
                api.get('/blogs/mine')
            ]);
            setBlogs(pubRes.data.data);
            setMyBlogs(myRes.data.data);
        } catch (error) {
            console.error('Error fetching blogs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: { bg: 'rgba(100, 116, 139, 0.2)', color: '#94a3b8', label: 'Draft' },
            pending: { bg: 'rgba(234, 179, 8, 0.2)', color: '#eab308', label: 'Pending Review' },
            published: { bg: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', label: 'Published' },
            rejected: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Rejected' }
        };
        const s = styles[status] || styles.draft;
        return (
            <span className="blog-status-badge" style={{ background: s.bg, color: s.color }}>
                {s.label}
            </span>
        );
    };

    const displayBlogs = activeTab === 'published' ? blogs : myBlogs;

    return (
        <div className="page">
            <div className="container">
                <div className="blog-page-header">
                    <div>
                        <h1 className="page-title">
                            <span className="text-gradient">Blogs</span>
                        </h1>
                        <p className="page-description">
                            Read and share knowledge with the community
                        </p>
                    </div>
                    <div className="blog-header-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/blogs/write')}
                        >
                            <PenTool size={18} />
                            Write Blog
                        </button>
                        {isAdmin && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/admin/blogs')}
                            >
                                <Shield size={18} />
                                Admin
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="blog-tabs">
                    <button
                        className={`blog-tab ${activeTab === 'published' ? 'active' : ''}`}
                        onClick={() => setActiveTab('published')}
                    >
                        <BookOpen size={16} />
                        Published
                    </button>
                    <button
                        className={`blog-tab ${activeTab === 'mine' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mine')}
                    >
                        <PenTool size={16} />
                        My Blogs
                    </button>
                </div>

                {loading ? (
                    <div className="skeleton" style={{ height: 400 }}></div>
                ) : displayBlogs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <h3 className="empty-state-title">
                            {activeTab === 'published'
                                ? 'No blogs published yet'
                                : 'You haven\'t written any blogs yet'
                            }
                        </h3>
                        <p className="empty-state-description">
                            {activeTab === 'published'
                                ? 'Be the first to share your knowledge!'
                                : 'Start writing and share your insights with the community.'
                            }
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/blogs/write')}
                        >
                            <PenTool size={18} />
                            Write Your First Blog
                        </button>
                    </div>
                ) : (
                    <div className="blog-grid">
                        {displayBlogs.map((blog) => (
                            <Link
                                key={blog._id}
                                to={`/blogs/${blog._id}`}
                                className="blog-card"
                            >
                                {blog.coverImage && (
                                    <div className="blog-card-cover">
                                        <img src={blog.coverImage} alt={blog.title} />
                                    </div>
                                )}
                                <div className="blog-card-body">
                                    <div className="blog-card-tags">
                                        {blog.tags?.slice(0, 3).map((tag, i) => (
                                            <span key={i} className="blog-tag">{tag}</span>
                                        ))}
                                        {activeTab === 'mine' && getStatusBadge(blog.status)}
                                    </div>
                                    <h3 className="blog-card-title">{blog.title}</h3>
                                    {blog.subtitle && (
                                        <p className="blog-card-subtitle">{blog.subtitle}</p>
                                    )}
                                    <div className="blog-card-meta">
                                        <div className="blog-meta-item">
                                            <User size={14} />
                                            <span>{blog.author?.name || user?.name}</span>
                                        </div>
                                        <div className="blog-meta-item">
                                            <Calendar size={14} />
                                            <span>{formatDate(blog.createdAt)}</span>
                                        </div>
                                        <div className="blog-meta-item">
                                            <Clock size={14} />
                                            <span>{blog.readTime} min read</span>
                                        </div>
                                    </div>
                                    <div className="blog-card-stats">
                                        <span className="blog-stat">
                                            <Eye size={14} /> {blog.views}
                                        </span>
                                        <span className="blog-stat">
                                            <Heart size={14} /> {blog.likes?.length || 0}
                                        </span>
                                        <ChevronRight size={16} className="blog-card-arrow" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Blogs;
