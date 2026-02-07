import { useState } from 'react';
import { X } from 'lucide-react';

const EMOJI_OPTIONS = ['📚', '💻', '🧮', '🔬', '📊', '🎨', '🌐', '⚡', '🎯', '📝'];
const COLOR_OPTIONS = [
    '#7c3aed', '#3b82f6', '#06b6d4', '#10b981',
    '#f97316', '#ec4899', '#8b5cf6', '#f43f5e'
];
const GRADIENT_OPTIONS = [
    { id: 'gradient-sunset', label: 'Sunset', gradient: 'linear-gradient(135deg, #ff9843 0%, #ec4899 100%)' },
    { id: 'gradient-ocean', label: 'Ocean', gradient: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)' },
    { id: 'gradient-forest', label: 'Forest', gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)' },
    { id: 'gradient-purple', label: 'Purple', gradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' },
    { id: 'gradient-fire', label: 'Fire', gradient: 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)' },
    { id: 'gradient-aurora', label: 'Aurora', gradient: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)' },
];

const CreateChapterModal = ({ onClose, onCreate, chapter }) => {
    const isEditing = !!chapter;
    const [title, setTitle] = useState(chapter?.title || '');
    const [description, setDescription] = useState(chapter?.description || '');
    const [icon, setIcon] = useState(chapter?.icon || '📚');
    const [color, setColor] = useState(chapter?.color || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        await onCreate({ title, description, icon, color });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{isEditing ? 'Edit Chapter' : 'Create New Chapter'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label">Chapter Title</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Introduction to Algorithms"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Description (optional)</label>
                            <textarea
                                className="input"
                                placeholder="Brief description of this chapter..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Icon</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {EMOJI_OPTIONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setIcon(emoji)}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            fontSize: '1.25rem',
                                            background: icon === emoji ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
                                            border: icon === emoji ? '2px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            transition: 'all var(--transition-fast)'
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label">Color</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            background: c,
                                            border: color === c ? '3px solid white' : 'none',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            transition: 'transform var(--transition-fast)',
                                            transform: color === c ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                    />
                                ))}
                            </div>
                            <label className="input-label" style={{ marginTop: '8px' }}>Gradients</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {GRADIENT_OPTIONS.map((g) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => setColor(g.id)}
                                        title={g.label}
                                        style={{
                                            width: 40,
                                            height: 32,
                                            background: g.gradient,
                                            border: color === g.id ? '3px solid white' : 'none',
                                            borderRadius: 'var(--radius-sm)',
                                            cursor: 'pointer',
                                            transition: 'transform var(--transition-fast)',
                                            transform: color === g.id ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !title.trim()}
                        >
                            {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Chapter')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateChapterModal;
