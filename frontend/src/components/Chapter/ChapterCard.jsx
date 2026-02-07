import { MoreVertical, Trash2, Edit3, BookOpen } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import './ChapterCard.css';

const GRADIENT_PRESETS = {
    'default': 'linear-gradient(135deg, #ff9843 0%, #ffdd95 100%)',
    '#ff9843': 'linear-gradient(135deg, #ff9843 0%, #ffdd95 100%)',
    '#7c3aed': 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
    '#3b82f6': 'linear-gradient(135deg, #3b82f6 0%, #93c5fd 100%)',
    '#06b6d4': 'linear-gradient(135deg, #06b6d4 0%, #67e8f9 100%)',
    '#10b981': 'linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)',
    '#f97316': 'linear-gradient(135deg, #f97316 0%, #fdba74 100%)',
    '#ec4899': 'linear-gradient(135deg, #ec4899 0%, #f9a8d4 100%)',
    '#f43f5e': 'linear-gradient(135deg, #f43f5e 0%, #fda4af 100%)',
    '#8b5cf6': 'linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%)',
    '#6366f1': 'linear-gradient(135deg, #6366f1 0%, #a5b4fc 100%)',
    'gradient-sunset': 'linear-gradient(135deg, #ff9843 0%, #ec4899 100%)',
    'gradient-ocean': 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
    'gradient-forest': 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    'gradient-purple': 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
    'gradient-fire': 'linear-gradient(135deg, #f43f5e 0%, #f97316 100%)',
    'gradient-aurora': 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)',
};

const getGradient = (color) => {
    if (!color) return GRADIENT_PRESETS['default'];
    if (GRADIENT_PRESETS[color]) return GRADIENT_PRESETS[color];
    // If it's a raw hex that's not in presets, create a lighter gradient
    if (color.startsWith('#')) {
        return `linear-gradient(135deg, ${color} 0%, ${color}88 100%)`;
    }
    return GRADIENT_PRESETS['default'];
};

const ChapterCard = ({ chapter, index, onClick, onDelete, onEdit }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    const gradient = getGradient(chapter.color);
    const gradientStyle = { background: gradient };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleMenuClick = (e) => {
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        setShowMenu(false);
        onDelete();
    };

    return (
        <div
            className="chapter-card animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={onClick}
        >
            {/* Gradient Accent */}
            <div className="chapter-card-accent" style={gradientStyle}></div>

            {/* Content */}
            <div className="chapter-card-content">
                <div className="chapter-card-header">
                    <div className="chapter-icon" style={gradientStyle}>
                        {chapter.icon || '📚'}
                    </div>
                    <div className="chapter-menu" ref={menuRef}>
                        <button
                            className="btn btn-ghost btn-icon chapter-menu-btn"
                            onClick={handleMenuClick}
                        >
                            <MoreVertical size={18} />
                        </button>
                        {showMenu && (
                            <div className="chapter-menu-dropdown">
                                <button className="menu-item" onClick={(e) => { e.stopPropagation(); setShowMenu(false); onEdit && onEdit(); }}>
                                    <Edit3 size={16} />
                                    Edit
                                </button>
                                <button className="menu-item menu-item-danger" onClick={handleDelete}>
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="chapter-title">{chapter.title}</h3>

                {chapter.description && (
                    <p className="chapter-description">{chapter.description}</p>
                )}

                <div className="chapter-meta">
                    <div className="chapter-stat">
                        <BookOpen size={14} />
                        <span>{chapter.questionCount || 0} questions</span>
                    </div>
                    {chapter.tags && chapter.tags.length > 0 && (
                        <div className="chapter-tags">
                            {chapter.tags.slice(0, 2).map((tag, i) => (
                                <span key={i} className="tag">{tag}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Hover Glow */}
            <div className="chapter-card-glow" style={gradientStyle}></div>
        </div>
    );
};

export { GRADIENT_PRESETS, getGradient };
export default ChapterCard;
