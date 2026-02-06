import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import QuestionItem from '../../components/Question/QuestionItem';
import CreateQuestionModal from '../../components/Question/CreateQuestionModal';
import MindmapViewer from '../../components/Mindmap/MindmapViewer';
import TestSection from '../../components/Test/TestSection';
import AIGuide from '../../components/AIGuide/AIGuide';
import {
    ArrowLeft,
    Plus,
    BookOpen,
    Brain,
    ClipboardList,
    Sparkles,
    RefreshCw,
    Tag
} from 'lucide-react';
import './ChapterDetail.css';

const TABS = [
    { id: 'questions', label: 'Questions', icon: BookOpen },
    { id: 'mindmap', label: 'Mindmap', icon: Brain },
    { id: 'tests', label: 'Tests', icon: ClipboardList },
    { id: 'guide', label: 'AI Guide', icon: Sparkles },
];

const ChapterDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [chapter, setChapter] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [activeTab, setActiveTab] = useState('questions');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [autoTagging, setAutoTagging] = useState(false);

    useEffect(() => {
        fetchChapterData();
    }, [id]);

    const fetchChapterData = async () => {
        try {
            const [chapterRes, questionsRes] = await Promise.all([
                api.get(`/chapters/${id}`),
                api.get(`/questions/chapter/${id}`)
            ]);
            setChapter(chapterRes.data.data);
            setQuestions(questionsRes.data.data);
        } catch (error) {
            console.error('Error fetching chapter data:', error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateQuestion = async (questionData) => {
        try {
            const res = await api.post('/questions', {
                ...questionData,
                chapterId: id
            });
            setQuestions([...questions, res.data.data]);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating question:', error);
        }
    };

    const handleUpdateQuestion = async (questionId, updates) => {
        try {
            const res = await api.put(`/questions/${questionId}`, updates);
            setQuestions(questions.map(q =>
                q._id === questionId ? res.data.data : q
            ));
        } catch (error) {
            console.error('Error updating question:', error);
        }
    };

    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('Delete this question?')) return;

        try {
            await api.delete(`/questions/${questionId}`);
            setQuestions(questions.filter(q => q._id !== questionId));
        } catch (error) {
            console.error('Error deleting question:', error);
        }
    };

    const handleToggleLogic = async (questionId) => {
        try {
            const res = await api.put(`/questions/${questionId}/toggle-logic`);
            setQuestions(questions.map(q =>
                q._id === questionId ? res.data.data : q
            ));
        } catch (error) {
            console.error('Error toggling logic:', error);
        }
    };

    const handleToggleCode = async (questionId) => {
        try {
            const res = await api.put(`/questions/${questionId}/toggle-code`);
            setQuestions(questions.map(q =>
                q._id === questionId ? res.data.data : q
            ));
        } catch (error) {
            console.error('Error toggling code:', error);
        }
    };

    const handleAutoTagChapter = async () => {
        if (questions.length === 0) {
            alert('No questions to tag!');
            return;
        }
        
        setAutoTagging(true);
        try {
            const res = await api.post('/ai/auto-tag-chapter', { chapterId: id });
            const { results } = res.data.data;
            
            // Update questions with new tags
            setQuestions(questions.map(q => {
                const result = results.find(r => r.questionId === q._id);
                if (result && result.success) {
                    return { ...q, tags: result.tags };
                }
                return q;
            }));
            
            alert(`✅ Tagged ${res.data.data.tagged} of ${res.data.data.totalQuestions} questions!`);
        } catch (error) {
            console.error('Error auto-tagging:', error);
            alert('Failed to auto-tag questions');
        } finally {
            setAutoTagging(false);
        }
    };

    if (loading) {
        return (
            <div className="page">
                <div className="container">
                    <div className="skeleton" style={{ height: 200, marginBottom: 20 }}></div>
                    <div className="skeleton" style={{ height: 400 }}></div>
                </div>
            </div>
        );
    }

    if (!chapter) return null;

    return (
        <div className="page">
            <div className="container">
                {/* Header */}
                <div className="chapter-detail-header">
                    <button
                        className="btn btn-ghost"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <div className="chapter-detail-info">
                        <div className="chapter-detail-icon">
                            {chapter.icon || '📚'}
                        </div>
                        <div>
                            <h1 className="chapter-detail-title">{chapter.title}</h1>
                            {chapter.description && (
                                <p className="chapter-detail-description">{chapter.description}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="chapter-tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`chapter-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="chapter-tab-content">
                    {activeTab === 'questions' && (
                        <div className="questions-section">
                            <div className="section-header">
                                <h2 className="section-title">
                                    Questions ({questions.length})
                                </h2>
                                <div className="section-actions">
                                    {questions.length > 0 && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={handleAutoTagChapter}
                                            disabled={autoTagging}
                                            title="Auto-generate concept tags for all questions using AI"
                                        >
                                            {autoTagging ? (
                                                <>
                                                    <RefreshCw size={16} className="spinning" />
                                                    Tagging...
                                                </>
                                            ) : (
                                                <>
                                                    <Tag size={16} />
                                                    Auto-Tag All
                                                </>
                                            )}
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <Plus size={18} />
                                        Add Question
                                    </button>
                                </div>
                            </div>

                            {questions.length === 0 ? (
                                <div className="empty-state">
                                    <div className="empty-state-icon">📝</div>
                                    <h3 className="empty-state-title">No questions yet</h3>
                                    <p className="empty-state-description">
                                        Add your first question to start building your knowledge base
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <Plus size={18} />
                                        Add First Question
                                    </button>
                                </div>
                            ) : (
                                <div className="questions-list">
                                    {questions.map((question, index) => (
                                        <QuestionItem
                                            key={question._id}
                                            question={question}
                                            index={index}
                                            onUpdate={(updates) => handleUpdateQuestion(question._id, updates)}
                                            onDelete={() => handleDeleteQuestion(question._id)}
                                            onToggleLogic={() => handleToggleLogic(question._id)}
                                            onToggleCode={() => handleToggleCode(question._id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'mindmap' && (
                        <MindmapViewer chapterId={id} chapterTitle={chapter.title} />
                    )}

                    {activeTab === 'tests' && (
                        <TestSection chapterId={id} chapterTitle={chapter.title} />
                    )}

                    {activeTab === 'guide' && (
                        <AIGuide chapterId={id} chapterTitle={chapter.title} />
                    )}
                </div>
            </div>

            {/* Create Question Modal */}
            {showCreateModal && (
                <CreateQuestionModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateQuestion}
                />
            )}
        </div>
    );
};

export default ChapterDetail;
