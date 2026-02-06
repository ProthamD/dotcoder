import { useState } from 'react';
import { X } from 'lucide-react';

const DIFFICULTY_OPTIONS = [
    { value: 'easy', label: 'Easy', color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f97316' },
    { value: 'hard', label: 'Hard', color: '#ef4444' },
];

const CreateQuestionModal = ({ onClose, onCreate }) => {
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('medium');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        await onCreate({
            title,
            difficulty,
            logic: { content: '', isVisible: true },
            code: { content: '', language: 'javascript', isVisible: true }
        });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Add New Question</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label">Question Title</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Two Sum Problem"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label">Difficulty</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {DIFFICULTY_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setDifficulty(opt.value)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            background: difficulty === opt.value ? `${opt.color}20` : 'var(--bg-tertiary)',
                                            border: difficulty === opt.value ? `2px solid ${opt.color}` : '1px solid var(--border-subtle)',
                                            borderRadius: 'var(--radius-md)',
                                            color: difficulty === opt.value ? opt.color : 'var(--text-secondary)',
                                            fontWeight: 500,
                                            fontSize: 'var(--font-size-sm)',
                                            cursor: 'pointer',
                                            transition: 'all var(--transition-fast)'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
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
                            {loading ? 'Adding...' : 'Add Question'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateQuestionModal;
