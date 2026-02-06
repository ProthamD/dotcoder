import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { ArrowLeft, Save, Send, Eye } from 'lucide-react';
import './Blog.css';

// Register custom font sizes
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
Quill.register(Size, true);

const WriteBlog = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const { user, isAdmin } = useAuth();

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [content, setContent] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [tagsInput, setTagsInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [existingBlog, setExistingBlog] = useState(null);

    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            ['blockquote', 'code-block'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['clean']
        ],
    }), []);

    const quillFormats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'blockquote', 'code-block',
        'list', 'bullet', 'indent', 'align',
        'link', 'image'
    ];

    useEffect(() => {
        if (editId) {
            fetchBlog();
        }
    }, [editId]);

    const fetchBlog = async () => {
        try {
            const res = await api.get(`/blogs/${editId}`);
            const blog = res.data.data;
            setExistingBlog(blog);
            setTitle(blog.title);
            setSubtitle(blog.subtitle || '');
            setContent(blog.content);
            setCoverImage(blog.coverImage || '');
            setTagsInput(blog.tags?.join(', ') || '');
        } catch (error) {
            console.error('Error fetching blog:', error);
            navigate('/blogs');
        }
    };

    const parseTags = () => {
        return tagsInput
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);
    };

    const handleSave = async (status) => {
        if (!title.trim() || !content.trim()) {
            alert('Please add a title and content');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title,
                subtitle,
                content,
                coverImage,
                tags: parseTags(),
                status
            };

            if (editId && existingBlog) {
                await api.put(`/blogs/${editId}`, payload);
            } else {
                await api.post('/blogs', payload);
            }

            navigate('/blogs');
        } catch (error) {
            console.error('Error saving blog:', error);
            alert('Error saving blog');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="page">
            <div className="container">
                <div className="write-blog">
                    <div className="write-blog-header">
                        <div>
                            <Link to="/blogs" className="blog-detail-back">
                                <ArrowLeft size={16} />
                                Back to Blogs
                            </Link>
                            <h1 className="page-title" style={{ marginTop: '8px' }}>
                                {editId ? 'Edit Blog' : 'Write Blog'}
                            </h1>
                        </div>
                        <div className="write-blog-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleSave('draft')}
                                disabled={saving}
                            >
                                <Save size={16} />
                                Save Draft
                            </button>
                            {isAdmin ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSave('published')}
                                    disabled={saving}
                                >
                                    <Eye size={16} />
                                    Publish
                                </button>
                            ) : (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleSave('pending')}
                                    disabled={saving}
                                >
                                    <Send size={16} />
                                    Submit for Review
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="write-blog-form">
                        <input
                            type="text"
                            className="write-blog-title-input"
                            placeholder="Blog title..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <input
                            type="text"
                            className="write-blog-subtitle-input"
                            placeholder="Add a subtitle (optional)..."
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                        />

                        <div className="write-blog-meta-row">
                            <div className="write-blog-field">
                                <label>Cover Image URL</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="https://example.com/image.jpg"
                                    value={coverImage}
                                    onChange={(e) => setCoverImage(e.target.value)}
                                />
                            </div>
                            <div className="write-blog-field">
                                <label>Tags (comma separated)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="competitive programming, algorithms, tips"
                                    value={tagsInput}
                                    onChange={(e) => setTagsInput(e.target.value)}
                                />
                            </div>
                        </div>

                        <ReactQuill
                            theme="snow"
                            value={content}
                            onChange={setContent}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Write your blog content here..."
                            className="blog-quill"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WriteBlog;
