import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Plus, FileText, Trash2, Edit3, ChevronDown, ChevronUp, X, Check, Link } from 'lucide-react';
import './Cheatsheets.css';

// Register custom font sizes with Quill
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
Quill.register(Size, true);

const Cheatsheets = () => {
    const [cheatsheets, setCheatsheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [expandedItems, setExpandedItems] = useState({});
    const [editingItem, setEditingItem] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editQuestionLinks, setEditQuestionLinks] = useState('');
    const [editAnswerLinks, setEditAnswerLinks] = useState('');

    // Quill toolbar with font sizes like Google Docs
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['link'],
            ['code-block'],
            ['clean']
        ],
    }), []);

    const quillFormats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet', 'indent', 'align',
        'link',
        'code-block'
    ];

    useEffect(() => {
        fetchCheatsheets();
    }, []);

    const fetchCheatsheets = async () => {
        try {
            const res = await api.get('/cheatsheets');
            setCheatsheets(res.data.data);
            if (res.data.data.length > 0) {
                setSelectedSheet(res.data.data[0]);
            }
        } catch (error) {
            console.error('Error fetching cheatsheets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCheatsheet = async (data) => {
        try {
            const res = await api.post('/cheatsheets', data);
            setCheatsheets([res.data.data, ...cheatsheets]);
            setSelectedSheet(res.data.data);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating cheatsheet:', error);
        }
    };

    const handleAddItem = async (title, content) => {
        if (!selectedSheet) return;

        try {
            const res = await api.post(`/cheatsheets/${selectedSheet._id}/items`, {
                title,
                content
            });
            setSelectedSheet(res.data.data);
            setCheatsheets(cheatsheets.map(c =>
                c._id === selectedSheet._id ? res.data.data : c
            ));
        } catch (error) {
            console.error('Error adding item:', error);
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!selectedSheet) return;

        try {
            const res = await api.delete(`/cheatsheets/${selectedSheet._id}/items/${itemId}`);
            setSelectedSheet(res.data.data);
            setCheatsheets(cheatsheets.map(c =>
                c._id === selectedSheet._id ? res.data.data : c
            ));
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };

    const handleEditItem = (item) => {
        setEditingItem(item._id);
        setEditTitle(item.title);
        setEditContent(item.content || '');
        setEditQuestionLinks(item.questionLinks || '');
        setEditAnswerLinks(item.answerLinks || '');
        setExpandedItems(prev => ({ ...prev, [item._id]: true }));
    };

    const handleUpdateItem = async (itemId) => {
        if (!selectedSheet) return;

        try {
            const res = await api.put(`/cheatsheets/${selectedSheet._id}/items/${itemId}`, {
                title: editTitle,
                content: editContent,
                questionLinks: editQuestionLinks,
                answerLinks: editAnswerLinks
            });
            
            setEditingItem(null);
            setEditTitle('');
            setEditContent('');
            setEditQuestionLinks('');
            setEditAnswerLinks('');
            setSelectedSheet(res.data.data);
            setCheatsheets(cheatsheets.map(c =>
                c._id === selectedSheet._id ? res.data.data : c
            ));
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditTitle('');
        setEditContent('');
        setEditQuestionLinks('');
        setEditAnswerLinks('');
    };

    const handleDeleteCheatsheet = async (id) => {
        if (!window.confirm('Delete this cheatsheet?')) return;

        try {
            await api.delete(`/cheatsheets/${id}`);
            const updated = cheatsheets.filter(c => c._id !== id);
            setCheatsheets(updated);
            if (selectedSheet?._id === id) {
                setSelectedSheet(updated[0] || null);
            }
        } catch (error) {
            console.error('Error deleting cheatsheet:', error);
        }
    };

    const toggleItem = (itemId) => {
        setExpandedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    // Render links as clickable
    const renderLinks = (linksText) => {
        if (!linksText) return <span className="text-muted">No links added</span>;
        const lines = linksText.split('\n').filter(l => l.trim());
        if (lines.length === 0) return <span className="text-muted">No links added</span>;
        return lines.map((line, i) => {
            const trimmed = line.trim();
            const isUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://');
            return (
                <div key={i} className="link-item">
                    <Link size={12} />
                    {isUrl ? (
                        <a href={trimmed} target="_blank" rel="noopener noreferrer">{trimmed}</a>
                    ) : (
                        <span>{trimmed}</span>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">
                            <span className="text-gradient">Cheatsheets</span>
                        </h1>
                        <p className="page-description">
                            Quick reference guides for any subject
                        </p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        New Cheatsheet
                    </button>
                </div>

                {loading ? (
                    <div className="skeleton" style={{ height: 400 }}></div>
                ) : cheatsheets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <h3 className="empty-state-title">No cheatsheets yet</h3>
                        <p className="empty-state-description">
                            Create your first cheatsheet to store quick reference notes
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} />
                            Create First Cheatsheet
                        </button>
                    </div>
                ) : (
                    <div className="cheatsheets-layout">
                        {/* Sidebar */}
                        <div className="cheatsheets-sidebar">
                            <div className="sidebar-header">
                                <h3>Your Sheets</h3>
                            </div>
                            <div className="sidebar-list">
                                {cheatsheets.map((sheet) => (
                                    <div
                                        key={sheet._id}
                                        className={`sidebar-item ${selectedSheet?._id === sheet._id ? 'active' : ''}`}
                                        onClick={() => setSelectedSheet(sheet)}
                                    >
                                        <div className="sidebar-item-icon" style={{ background: sheet.color }}>
                                            {sheet.icon || '📋'}
                                        </div>
                                        <div className="sidebar-item-info">
                                            <span className="sidebar-item-title">{sheet.title}</span>
                                            <span className="sidebar-item-count">
                                                {sheet.items?.length || 0} items
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-icon btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCheatsheet(sheet._id);
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="cheatsheets-content">
                            {selectedSheet && (
                                <>
                                    <div className="content-header">
                                        <div className="content-title-section">
                                            <div
                                                className="content-icon"
                                                style={{ background: selectedSheet.color }}
                                            >
                                                {selectedSheet.icon || '📋'}
                                            </div>
                                            <div>
                                                <h2>{selectedSheet.title}</h2>
                                                {selectedSheet.subject && (
                                                    <span className="content-subject">{selectedSheet.subject}</span>
                                                )}
                                            </div>
                                        </div>
                                        <AddItemForm onAdd={handleAddItem} />
                                    </div>

                                    <div className="cheatsheet-items">
                                        {selectedSheet.items?.length === 0 ? (
                                            <div className="items-empty">
                                                <p>No items yet. Add your first item above!</p>
                                            </div>
                                        ) : (
                                            selectedSheet.items?.map((item) => (
                                                <div
                                                    key={item._id}
                                                    className={`cheatsheet-item ${expandedItems[item._id] ? 'expanded' : ''}`}
                                                >
                                                    <div
                                                        className="item-header"
                                                        onClick={() => editingItem !== item._id && toggleItem(item._id)}
                                                    >
                                                        {editingItem === item._id ? (
                                                            <input
                                                                type="text"
                                                                className="item-edit-title"
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <h4>{item.title}</h4>
                                                        )}
                                                        <div className="item-actions">
                                                            {editingItem === item._id ? (
                                                                <>
                                                                    <button
                                                                        className="btn btn-primary btn-sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleUpdateItem(item._id);
                                                                        }}
                                                                        style={{ 
                                                                            padding: '8px 16px',
                                                                            minWidth: '80px',
                                                                            fontSize: '14px'
                                                                        }}
                                                                    >
                                                                        <Check size={16} />
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-secondary btn-sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleCancelEdit();
                                                                        }}
                                                                        style={{ 
                                                                            padding: '8px 16px',
                                                                            minWidth: '80px',
                                                                            fontSize: '14px'
                                                                        }}
                                                                    >
                                                                        <X size={16} />
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        className="btn btn-ghost btn-icon btn-sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditItem(item);
                                                                        }}
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-ghost btn-icon btn-sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteItem(item._id);
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {!editingItem && (
                                                                expandedItems[item._id] ? (
                                                                    <ChevronUp size={18} />
                                                                ) : (
                                                                    <ChevronDown size={18} />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                    {expandedItems[item._id] && (
                                                        <div className="item-content">
                                                            {/* Content Section */}
                                                            {editingItem === item._id ? (
                                                                <div className="item-editor">
                                                                    <label className="item-section-label">Content</label>
                                                                    <ReactQuill
                                                                        theme="snow"
                                                                        value={editContent}
                                                                        onChange={setEditContent}
                                                                        modules={quillModules}
                                                                        formats={quillFormats}
                                                                        placeholder="Write your content here... Use the toolbar for bold, italic, font sizes, and more!"
                                                                        className="quill-editor cheatsheet-quill"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div
                                                                    className="item-content-display ql-editor"
                                                                    dangerouslySetInnerHTML={{
                                                                        __html: item.content || '<span class="text-muted">No content added yet. Click edit to add.</span>'
                                                                    }}
                                                                />
                                                            )}

                                                            {/* Question & Answer Links */}
                                                            <div className="item-links-section">
                                                                <div className="item-links-box">
                                                                    <h5 className="links-box-title">📝 Question Links</h5>
                                                                    {editingItem === item._id ? (
                                                                        <textarea
                                                                            className="links-textarea"
                                                                            value={editQuestionLinks}
                                                                            onChange={(e) => setEditQuestionLinks(e.target.value)}
                                                                            placeholder="Paste question links here (one per line)..."
                                                                            rows={3}
                                                                        />
                                                                    ) : (
                                                                        <div className="links-display">
                                                                            {renderLinks(item.questionLinks)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="item-links-box">
                                                                    <h5 className="links-box-title">✅ Answer Links</h5>
                                                                    {editingItem === item._id ? (
                                                                        <textarea
                                                                            className="links-textarea"
                                                                            value={editAnswerLinks}
                                                                            onChange={(e) => setEditAnswerLinks(e.target.value)}
                                                                            placeholder="Paste answer/solution links here (one per line)..."
                                                                            rows={3}
                                                                        />
                                                                    ) : (
                                                                        <div className="links-display">
                                                                            {renderLinks(item.answerLinks)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <CreateCheatsheetModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateCheatsheet}
                />
            )}
        </div>
    );
};

// Add Item Form Component
const AddItemForm = ({ onAdd }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [expanded, setExpanded] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onAdd(title, content);
        setTitle('');
        setContent('');
        setExpanded(false);
    };

    if (!expanded) {
        return (
            <button
                className="btn btn-secondary"
                onClick={() => setExpanded(true)}
            >
                <Plus size={18} />
                Add Item
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="add-item-form">
            <input
                type="text"
                className="input"
                placeholder="Item title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
            />
            <textarea
                className="input"
                placeholder="Content (optional - you can add rich content after creating)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={2}
            />
            <div className="add-item-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(false)}>
                    Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!title.trim()}>
                    Add
                </button>
            </div>
        </form>
    );
};

// Create Cheatsheet Modal
const CreateCheatsheetModal = ({ onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        await onCreate({ title, subject });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Create Cheatsheet</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label">Title</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Python Basics"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Subject (optional)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Programming"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !title.trim()}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Cheatsheets;
