import { useState, useEffect } from 'react';
import api from '../../services/api';
import { RefreshCw, CheckCircle, Circle, ExternalLink, Code } from 'lucide-react';
import './TestSection.css';

const TestSection = ({ chapterId, chapterTitle }) => {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    useEffect(() => {
        fetchTests();
    }, [chapterId]);

    const fetchTests = async () => {
        try {
            const res = await api.get(`/ai/tests/${chapterId}`);
            setTests(res.data.data);
            if (res.data.data.length > 0) {
                setSelectedTest(res.data.data[0]);
            }
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateTest = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/ai/test', {
                chapterId,
                difficulty: 'medium',
                count: 5
            });
            setTests([res.data.data, ...tests]);
            setSelectedTest(res.data.data);
        } catch (error) {
            console.error('Error generating test:', error);
        } finally {
            setGenerating(false);
        }
    };

    const handleToggleQuestion = async (testId, questionIndex, isCompleted) => {
        try {
            const res = await api.put(`/ai/tests/${testId}/questions/${questionIndex}`, {
                isCompleted
            });
            setTests(tests.map(t => t._id === testId ? res.data.data : t));
            if (selectedTest?._id === testId) {
                setSelectedTest(res.data.data);
            }
        } catch (error) {
            console.error('Error updating question:', error);
        }
    };

    if (loading) {
        return (
            <div className="test-loading">
                <div className="skeleton" style={{ height: 200 }}></div>
            </div>
        );
    }

    if (tests.length === 0) {
        return (
            <div className="test-empty">
                <div className="test-empty-content">
                    <div className="test-empty-icon">📝</div>
                    <h3>Generate Practice Tests</h3>
                    <p>Create AI-generated practice questions based on similar concepts from LeetCode and other sources</p>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerateTest}
                        disabled={generating}
                    >
                        {generating ? (
                            <>
                                <RefreshCw size={18} className="spinning" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                Generate Test
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="test-section">
            <div className="test-header">
                <div className="test-tabs">
                    {tests.map((test, index) => (
                        <button
                            key={test._id}
                            className={`test-tab ${selectedTest?._id === test._id ? 'active' : ''}`}
                            onClick={() => setSelectedTest(test)}
                        >
                            Test {index + 1}
                            <span className="test-score">
                                {test.score.completed}/{test.score.total}
                            </span>
                        </button>
                    ))}
                </div>
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleGenerateTest}
                    disabled={generating}
                >
                    <RefreshCw size={16} className={generating ? 'spinning' : ''} />
                    New Test
                </button>
            </div>

            {selectedTest && (
                <div className="test-content">
                    <div className="test-info">
                        <h3>{selectedTest.title}</h3>
                        <div className="test-progress">
                            <div
                                className="test-progress-bar"
                                style={{
                                    width: `${(selectedTest.score.completed / selectedTest.score.total) * 100}%`
                                }}
                            ></div>
                        </div>
                        <span className="test-progress-text">
                            {selectedTest.score.completed} of {selectedTest.score.total} completed
                        </span>
                    </div>

                    <div className="test-questions">
                        {selectedTest.questions.map((question, index) => (
                            <div
                                key={index}
                                className={`test-question ${question.isCompleted ? 'completed' : ''}`}
                            >
                                <button
                                    className="question-checkbox"
                                    onClick={() => handleToggleQuestion(
                                        selectedTest._id,
                                        index,
                                        !question.isCompleted
                                    )}
                                >
                                    {question.isCompleted ? (
                                        <CheckCircle size={20} className="check-icon" />
                                    ) : (
                                        <Circle size={20} />
                                    )}
                                </button>

                                <div className="question-content">
                                    <div className="question-header">
                                        <span className="question-number">Q{index + 1}</span>
                                        <span className={`difficulty-badge ${question.difficulty}`}>
                                            {question.difficulty}
                                        </span>
                                        {question.sourceUrl && (
                                            <a
                                                href={question.sourceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="source-link"
                                                title={`Practice on ${question.source}`}
                                            >
                                                <Code size={14} />
                                                <span>Practice on {question.source}</span>
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                    <p className="question-text">{question.question}</p>
                                    
                                    {question.tags && question.tags.length > 0 && (
                                        <div className="question-tags">
                                            {question.tags.map((tag, tagIndex) => (
                                                <span key={tagIndex} className="question-tag">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {question.isCompleted && question.solution && (
                                        <div className="question-solution">
                                            <h4>Solution</h4>
                                            <p>{question.solution}</p>
                                            {question.solutionCode && (
                                                <pre className="solution-code">
                                                    <code>{question.solutionCode}</code>
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TestSection;
