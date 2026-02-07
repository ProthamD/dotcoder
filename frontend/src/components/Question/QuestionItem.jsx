import { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Register custom font sizes with Quill
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'];
Quill.register(Size, true);
import {
    ChevronDown,
    ChevronUp,
    Edit3,
    Trash2,
    Code,
    FileText,
    Check,
    X,
    Tag,
    ExternalLink
} from 'lucide-react';
import './QuestionItem.css';

const QuestionItem = ({
    question,
    index,
    onUpdate,
    onDelete,
    onToggleLogic,
    onToggleCode
}) => {
    const [expanded, setExpanded] = useState(false);
    const [editingTitle, setEditingTitle] = useState(false);
    const [editingLogic, setEditingLogic] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [editingCodeInModal, setEditingCodeInModal] = useState(false);
    const [title, setTitle] = useState(question.title);
    const [logic, setLogic] = useState(question.logic?.content || '');
    const [code, setCode] = useState(question.code?.content || '');
    const [link, setLink] = useState(question.link || '');
    const [editingLink, setEditingLink] = useState(false);

    // Quill toolbar configuration - like Google Docs
    const quillModules = useMemo(() => ({
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            [{ 'size': ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '32px'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'indent': '-1' }, { 'indent': '+1' }],
            [{ 'align': [] }],
            ['link', 'image'],
            ['code-block'],
            ['clean']
        ],
    }), []);

    const quillFormats = [
        'header', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'list', 'bullet', 'indent', 'align',
        'link', 'image',
        'code-block'
    ];

    const handleSaveTitle = () => {
        onUpdate({ title });
        setEditingTitle(false);
    };

    const handleSaveLogic = () => {
        onUpdate({ logic: { ...question.logic, content: logic } });
        setEditingLogic(false);
    };

    const handleSaveCode = () => {
        onUpdate({ code: { ...question.code, content: code } });
        setEditingCodeInModal(false);
    };

    const openCodeModal = () => {
        setCode(question.code?.content || '');
        setShowCodeModal(true);
    };

    const closeCodeModal = () => {
        setShowCodeModal(false);
        setEditingCodeInModal(false);
    };

    return (
        <>
            <div
                className="question-item animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
            >
                {/* Header */}
                <div className="question-header" onClick={() => setExpanded(!expanded)}>
                    <div className="question-number">{index + 1}</div>

                    {editingTitle ? (
                        <div className="question-title-edit" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="text"
                                className="input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={handleSaveTitle}>
                                <Check size={16} />
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingTitle(false)}>
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="question-title-section">
                            <h3 className="question-title">{question.title}</h3>
                            {question.tags && question.tags.length > 0 && (
                                <div className="question-item-tags">
                                    {question.tags.slice(0, 4).map((tag, idx) => (
                                        <span key={idx} className="question-item-tag">
                                            {tag}
                                        </span>
                                    ))}
                                    {question.tags.length > 4 && (
                                        <span className="question-item-tag more">
                                            +{question.tags.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="question-actions" onClick={(e) => e.stopPropagation()}>
                        {question.link ? (
                            <div className="question-link-group">
                                <a
                                    href={question.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="question-action-btn question-link-btn"
                                    title="Open question link"
                                >
                                    <ExternalLink size={18} />
                                </a>
                                <button
                                    className="question-action-btn question-link-edit-btn"
                                    onClick={() => { setEditingLink(true); setExpanded(true); }}
                                    title="Edit link"
                                >
                                    <Edit3 size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                className="question-action-btn question-link-btn-empty"
                                onClick={() => { setEditingLink(true); setExpanded(true); }}
                                title="Add link"
                            >
                                <ExternalLink size={18} />
                            </button>
                        )}
                        <button
                            className="question-action-btn"
                            onClick={() => setEditingTitle(true)}
                            title="Edit title"
                        >
                            <Edit3 size={18} />
                        </button>
                        <button
                            className="question-action-btn question-delete-btn"
                            onClick={onDelete}
                            title="Delete"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button className="question-action-btn question-expand-btn">
                            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    </div>
                </div>

                {/* Expanded Content */}
                {expanded && (
                    <div className="question-content">
                        {/* Link editor */}
                        {editingLink && (
                            <div className="question-link-edit" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink size={16} />
                                <input
                                    type="url"
                                    className="input"
                                    placeholder="Paste question link (e.g. leetcode.com/problems/...)"
                                    value={link}
                                    onChange={(e) => setLink(e.target.value)}
                                    autoFocus
                                />
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { onUpdate({ link }); setEditingLink(false); }}>
                                    <Check size={16} />
                                </button>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditingLink(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="question-toggles">
                            <button
                                className={`toggle-btn ${question.logic?.isVisible ? 'active' : ''}`}
                                onClick={onToggleLogic}
                            >
                                <FileText size={16} />
                                Logic
                                <span className="toggle-indicator"></span>
                            </button>
                            <button
                                className="toggle-btn code-view-btn"
                                onClick={openCodeModal}
                                title="View code in larger window"
                            >
                                <Code size={16} />
                                View Code
                            </button>
                        </div>

                        {/* Logic Section with Rich Text Editor */}
                        {question.logic?.isVisible && (
                            <div className="question-section">
                                <div className="section-header-small">
                                    <h4>Logic / Explanation</h4>
                                    {!editingLogic && (
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => setEditingLogic(true)}
                                        >
                                            <Edit3 size={14} />
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {editingLogic ? (
                                    <div className="logic-editor">
                                        <ReactQuill
                                            theme="snow"
                                            value={logic}
                                            onChange={setLogic}
                                            modules={quillModules}
                                            formats={quillFormats}
                                            placeholder="Write your logic/explanation here... Use the toolbar to format text, add images, and more!"
                                            className="quill-editor"
                                        />
                                        <div className="editor-actions">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingLogic(false)}>
                                                Cancel
                                            </button>
                                            <button className="btn btn-primary btn-sm" onClick={handleSaveLogic}>
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="logic-content ql-editor"
                                        dangerouslySetInnerHTML={{
                                            __html: question.logic?.content || '<span class="text-muted">No explanation added yet. Click Edit to add.</span>'
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Code Modal - Opens when clicking "View Code" */}
            {showCodeModal && (
                <div className="code-modal-overlay" onClick={closeCodeModal}>
                    <div className="code-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="code-modal-header">
                            <h3>
                                <Code size={20} />
                                {question.title} - Code
                            </h3>
                            <div className="code-modal-actions">
                                {!editingCodeInModal ? (
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setEditingCodeInModal(true)}
                                    >
                                        <Edit3 size={14} />
                                        Edit
                                    </button>
                                ) : (
                                    <>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingCodeInModal(false)}>
                                            Cancel
                                        </button>
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveCode}>
                                            Save
                                        </button>
                                    </>
                                )}
                                <button className="btn btn-ghost btn-icon" onClick={closeCodeModal}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="code-modal-body">
                            <Editor
                                height="100%"
                                language={question.code?.language || 'cpp'}
                                theme="vs-dark"
                                value={editingCodeInModal ? code : (question.code?.content || '// No code added yet\n// Click Edit to add your code')}
                                onChange={editingCodeInModal ? (value) => setCode(value || '') : undefined}
                                options={{
                                    readOnly: !editingCodeInModal,
                                    minimap: { enabled: true },
                                    fontSize: 16,
                                    lineNumbers: 'on',
                                    roundedSelection: true,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 20 },
                                    wordWrap: 'on',
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default QuestionItem;
