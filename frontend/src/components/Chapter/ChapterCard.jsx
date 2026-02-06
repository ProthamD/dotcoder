import { MoreVertical, Trash2, Edit3, BookOpen } from 'lucide-react';
import { useState } from 'react';
import './ChapterCard.css';

const GRADIENT_COLORS = [
    'linear-gradient(135deg, #ff9843 0%, #ffdd95 100%)', // Orange-Yellow
    'linear-gradient(135deg, #86a7fc 0%, #a8c5ff 100%)', // Blue
    'linear-gradient(135deg, #ff9843 0%, #86a7fc 100%)', // Orange-Blue
    'linear-gradient(135deg, #ffdd95 0%, #86a7fc 100%)', // Yellow-Blue
    'linear-gradient(135deg, #ffb366 0%, #ffc989 100%)', // Orange shades
    'linear-gradient(135deg, #86a7fc 0%, #d4e4ff 100%)', // Blue shades
];

const ChapterCard = ({ chapter, index, onClick, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);

    const gradientStyle = {
        background: GRADIENT_COLORS[index % GRADIENT_COLORS.length]
    };

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
            style={{ animationDelay: `${index * 50} ms` }}
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
                    <div className="chapter-menu">
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={handleMenuClick}
                        >
                            <MoreVertical size={18} />
                        </button>
                        {showMenu && (
                            <div className="chapter-menu-dropdown">
                                <button className="menu-item">
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

export default ChapterCard;
