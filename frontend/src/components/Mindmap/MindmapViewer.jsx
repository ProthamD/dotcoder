import { useState, useEffect, useCallback } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../../services/api';
import { RefreshCw, Download } from 'lucide-react';
import './MindmapViewer.css';

const MindmapViewer = ({ chapterId, chapterTitle }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [hasMap, setHasMap] = useState(false);

    useEffect(() => {
        fetchMindmap();
    }, [chapterId]);

    const fetchMindmap = async () => {
        try {
            const res = await api.get(`/ai/mindmap/${chapterId}`);
            if (res.data.data) {
                formatMindmapData(res.data.data);
                setHasMap(true);
            }
        } catch (error) {
            // No mindmap exists yet
            setHasMap(false);
        }
    };

    const formatMindmapData = (mindmap) => {
        const formattedNodes = mindmap.nodes.map((node) => ({
            id: node.id,
            data: { label: node.label },
            position: { x: node.x || 0, y: node.y || 0 },
            type: node.type === 'root' ? 'input' : 'default',
            style: getNodeStyle(node.type),
        }));

        const formattedEdges = mindmap.edges.map((edge, index) => ({
            id: `edge-${index}`,
            source: edge.source,
            target: edge.target,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#64748b' },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#64748b',
            },
        }));

        setNodes(formattedNodes);
        setEdges(formattedEdges);
    };

    const getNodeStyle = (type) => {
        const baseStyle = {
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 500,
        };

        switch (type) {
            case 'root':
                return {
                    ...baseStyle,
                    background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
                    color: 'white',
                    border: 'none',
                };
            case 'branch':
                return {
                    ...baseStyle,
                    background: '#1a1a1a',
                    color: '#e5e5e5',
                    border: '2px solid #64748b',
                };
            default:
                return {
                    ...baseStyle,
                    background: '#1a1a1a',
                    color: '#a3a3a3',
                    border: '1px solid #333',
                };
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await api.post('/ai/mindmap', { chapterId });
            formatMindmapData(res.data.data);
            setHasMap(true);
        } catch (error) {
            console.error('Error generating mindmap:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!hasMap) {
        return (
            <div className="mindmap-empty">
                <div className="mindmap-empty-content">
                    <div className="mindmap-empty-icon">🧠</div>
                    <h3>Generate a Mindmap</h3>
                    <p>Create an AI-powered mindmap from your chapter notes and questions</p>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={18} className="spinning" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={18} />
                                Generate Mindmap
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mindmap-container">
            <div className="mindmap-header">
                <h3>{chapterTitle} - Mindmap</h3>
                <div className="mindmap-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleGenerate}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Regenerate
                    </button>
                </div>
            </div>

            <div className="mindmap-canvas">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    attributionPosition="bottom-left"
                >
                    <Controls />
                    <Background color="#333" gap={20} />
                </ReactFlow>
            </div>
        </div>
    );
};

export default MindmapViewer;
