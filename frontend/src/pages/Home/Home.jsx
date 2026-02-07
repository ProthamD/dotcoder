import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ChapterCard from '../../components/Chapter/ChapterCard';
import CreateChapterModal from '../../components/Chapter/CreateChapterModal';
import { Plus, BookOpen } from 'lucide-react';
import './Home.css';

const Home = () => {
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingChapter, setEditingChapter] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchChapters();
    }, []);

    const fetchChapters = async () => {
        try {
            const res = await api.get('/chapters');
            setChapters(res.data.data);
        } catch (error) {
            console.error('Error fetching chapters:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateChapter = async (chapterData) => {
        try {
            const res = await api.post('/chapters', chapterData);
            setChapters([...chapters, res.data.data]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating chapter:', error);
        }
    };

    const handleEditChapter = async (chapterId, chapterData) => {
        try {
            const res = await api.put(`/chapters/${chapterId}`, chapterData);
            setChapters(chapters.map(c => c._id === chapterId ? res.data.data : c));
            setEditingChapter(null);
        } catch (error) {
            console.error('Error updating chapter:', error);
        }
    };

    const handleDeleteChapter = async (chapterId) => {
        if (!window.confirm('Are you sure you want to delete this chapter?')) return;

        try {
            await api.delete(`/chapters/${chapterId}`);
            setChapters(chapters.filter(c => c._id !== chapterId));
        } catch (error) {
            console.error('Error deleting chapter:', error);
        }
    };

    const handleChapterClick = (chapterId) => {
        navigate(`/chapter/${chapterId}`);
    };

    return (
        <div className="page">
            <div className="container">
                {/* Hero Section */}
                <div className="home-hero">
                    <div className="home-hero-content">
                        <h1 className="home-hero-title">
                            Master Your Learning
                            <br />
                            <span className="text-gradient">One Chapter at a Time</span>
                        </h1>
                        <p className="home-hero-description">
                            Organize your study notes, create cheatsheets, and test your knowledge
                        </p>
                        <div className="home-hero-actions">
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Plus size={20} />
                                Create New Chapter
                            </button>
                            <button className="btn btn-secondary btn-lg">
                                <BookOpen size={20} />
                                Browse Chapters
                            </button>
                        </div>
                    </div>
                    <div className="home-hero-glow"></div>
                </div>

                {/* Stats Section */}
                <div className="home-stats">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--gradient-purple)' }}>
                            <BookOpen size={24} />
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{chapters.length}</div>
                            <div className="stat-label">Total Chapters</div>
                        </div>
                    </div>
                </div>

                {/* Chapters Header */}
                <div className="home-section-header">
                    <h2 className="section-title">Your Chapters</h2>
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowCreateModal(true)}
                    >
                        <Plus size={18} />
                        New Chapter
                    </button>
                </div>

                {/* Chapters Grid */}
                {loading ? (
                    <div className="chapters-grid">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="chapter-card-skeleton">
                                <div className="skeleton" style={{ height: 140 }}></div>
                            </div>
                        ))}
                    </div>
                ) : chapters.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <BookOpen size={64} />
                        </div>
                        <h3 className="empty-state-title">No chapters yet</h3>
                        <p className="empty-state-description">
                            Create your first chapter to start organizing your study notes
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} />
                            Create First Chapter
                        </button>
                    </div>
                ) : (
                    <div className="chapters-grid">
                        {chapters.map((chapter, index) => (
                            <ChapterCard
                                key={chapter._id}
                                chapter={chapter}
                                index={index}
                                onClick={() => handleChapterClick(chapter._id)}
                                onDelete={() => handleDeleteChapter(chapter._id)}
                                onEdit={() => setEditingChapter(chapter)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create Chapter Modal */}
            {showCreateModal && (
                <CreateChapterModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateChapter}
                />
            )}

            {/* Edit Chapter Modal */}
            {editingChapter && (
                <CreateChapterModal
                    chapter={editingChapter}
                    onClose={() => setEditingChapter(null)}
                    onCreate={(data) => handleEditChapter(editingChapter._id, data)}
                />
            )}
        </div>
    );
};

export default Home;
