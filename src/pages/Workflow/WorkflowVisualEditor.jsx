import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft,
  Save,
  Plus,
  Play,
  GitBranch,
  Zap,
  Filter,
  Activity,
  X,
  ChevronDown,
  Check,
  Circle,
  AlertCircle,
  User,
  Mail,
  Database,
  FileText,
  Bell,
  Code,
  Edit,
  ExternalLink
} from 'lucide-react';
import { firestore as db } from '../../config/firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import './WorkflowVisualEditor.css';

const WorkflowVisualEditor = ({ workflow, onClose }) => {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [workflowName, setWorkflowName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [tempConnection, setTempConnection] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeFormData, setNodeFormData] = useState({ title: '', description: '', link: '' });
  const [workflowId, setWorkflowId] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState(null);

  // Initialize workflow data
  useEffect(() => {
    if (workflow) {
      setWorkflowId(workflow.id);
      setWorkflowName(workflow.name);
      // Convert existing workflow to visual format
      if (workflow.nodes) {
        setNodes(workflow.nodes);
        setConnections(workflow.connections || []);
      } else {
        // Convert linear steps to visual nodes
        convertStepsToNodes(workflow.steps || []);
      }
    } else {
      // New workflow - add initial trigger node
      const triggerId = generateId();
      setNodes([{
        id: triggerId,
        type: 'trigger',
        position: { x: 300, y: 100 },
        data: {
          title: 'New Candidate from Submission',
          icon: 'zap',
          completed: false,
          link: ''
        }
      }]);
    }
  }, [workflow]);

  // Set up real-time sync for existing workflows
  useEffect(() => {
    if (!workflowId || !db) return;

    const unsubscribe = onSnapshot(doc(db, 'workflows', workflowId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.nodes) {
          setNodes(data.nodes);
          setConnections(data.connections || []);
        }
      }
    });

    return () => unsubscribe();
  }, [workflowId]);

  const generateId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const convertStepsToNodes = (steps) => {
    const newNodes = [];
    const newConnections = [];
    
    // Add trigger node
    const triggerId = generateId();
    newNodes.push({
      id: triggerId,
      type: 'trigger',
      position: { x: 300, y: 100 },
      data: {
        title: 'Workflow Start',
        icon: 'play'
      }
    });

    // Convert steps to action nodes
    let previousNodeId = triggerId;
    steps.forEach((step, index) => {
      const nodeId = generateId();
      const yPosition = 200 + (index * 150);
      
      newNodes.push({
        id: nodeId,
        type: 'action',
        position: { x: 300, y: yPosition },
        data: {
          title: step.title,
          description: step.description,
          icon: 'activity',
          completed: step.completed || false,
          link: step.link || ''
        }
      });

      newConnections.push({
        id: generateId(),
        from: previousNodeId,
        to: nodeId
      });

      previousNodeId = nodeId;
    });

    setNodes(newNodes);
    setConnections(newConnections);
  };

  const getNodeIcon = (iconName) => {
    const icons = {
      zap: Zap,
      play: Play,
      filter: Filter,
      activity: Activity,
      user: User,
      mail: Mail,
      database: Database,
      filetext: FileText,
      bell: Bell,
      code: Code
    };
    const Icon = icons[iconName] || Activity;
    return <Icon size={16} />;
  };

  const handleCanvasClick = (e) => {
    if (e.target === e.currentTarget) {
      setSelectedNode(null);
    }
  };

  const handleCanvasRightClick = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    setMenuPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setShowNodeMenu(true);
  };

  const handleNodeClick = (nodeId, e) => {
    e.stopPropagation();
    if (isConnecting && connectingFrom) {
      // Complete connection
      if (connectingFrom !== nodeId) {
        const newConnection = {
          id: generateId(),
          from: connectingFrom,
          to: nodeId
        };
        setConnections([...connections, newConnection]);
        autoSave();
      }
      setIsConnecting(false);
      setConnectingFrom(null);
      setTempConnection(null);
    } else {
      setSelectedNode(nodeId);
    }
  };

  const toggleNodeCompletion = async (nodeId, e) => {
    e.stopPropagation();
    const updatedNodes = nodes.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            completed: !node.data.completed
          }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    autoSave(updatedNodes);
  };

  const openNodeEditor = (node, e) => {
    e.stopPropagation();
    setEditingNode(node);
    setNodeFormData({
      title: node.data.title,
      description: node.data.description || '',
      link: node.data.link || ''
    });
  };

  const updateNode = () => {
    const updatedNodes = nodes.map(node => {
      if (node.id === editingNode.id) {
        return {
          ...node,
          data: {
            ...node.data,
            title: nodeFormData.title,
            description: nodeFormData.description,
            link: nodeFormData.link
          }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    setEditingNode(null);
    setNodeFormData({ title: '', description: '', link: '' });
    autoSave(updatedNodes);
  };

  const autoSave = async (updatedNodes = nodes, updatedConnections = connections) => {
    if (!workflowId || !db) return;
    
    try {
      await updateDoc(doc(db, 'workflows', workflowId), {
        nodes: updatedNodes,
        connections: updatedConnections,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  };

  const handleNodeDrag = (nodeId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Don't start drag if clicking on buttons or inputs
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    
    setIsDragging(true);
    setDraggedNode(nodeId);
    
    const rect = canvasRef.current.getBoundingClientRect();
    const node = nodes.find(n => n.id === nodeId);
    const startX = e.clientX - rect.left - node.position.x;
    const startY = e.clientY - rect.top - node.position.y;

    const handleMouseMove = (e) => {
      const newX = e.clientX - rect.left - startX;
      const newY = e.clientY - rect.top - startY;
      
      // Ensure node stays within canvas bounds
      const boundedX = Math.max(0, Math.min(newX, rect.width - 300));
      const boundedY = Math.max(0, Math.min(newY, rect.height - 200));
      
      setNodes(prevNodes => prevNodes.map(n => 
        n.id === nodeId 
          ? { ...n, position: { x: boundedX, y: boundedY } }
          : n
      ));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedNode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Auto-save position after drag
      setTimeout(() => {
        autoSave();
      }, 100);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const startConnection = (nodeId) => {
    setIsConnecting(true);
    setConnectingFrom(nodeId);
  };

  const addNode = (type) => {
    const nodeTypes = {
      trigger: {
        title: 'New Trigger',
        icon: 'zap',
        color: 'trigger'
      },
      condition: {
        title: 'If/Else Condition',
        icon: 'filter',
        color: 'condition'
      },
      action: {
        title: 'New Action',
        icon: 'activity',
        color: 'action'
      }
    };

    const newNode = {
      id: generateId(),
      type,
      position: { x: menuPosition.x, y: menuPosition.y },
      data: {
        ...nodeTypes[type],
        outputs: type === 'condition' ? ['true', 'false'] : ['next'],
        completed: false,
        link: ''
      }
    };

    setNodes([...nodes, newNode]);
    setShowNodeMenu(false);
  };

  const deleteNode = (nodeId) => {
    const updatedNodes = nodes.filter(n => n.id !== nodeId);
    const updatedConnections = connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    setNodes(updatedNodes);
    setConnections(updatedConnections);
    setSelectedNode(null);
    autoSave(updatedNodes, updatedConnections);
  };

  const saveWorkflow = async () => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    setIsSaving(true);
    try {
      const workflowData = {
        name: workflowName,
        nodes,
        connections,
        updatedAt: new Date().toISOString(),
        status: 'pending'
      };

      if (workflow?.id) {
        await updateDoc(doc(db, 'workflows', workflow.id), workflowData);
      } else {
        await addDoc(collection(db, 'workflows'), {
          ...workflowData,
          createdAt: new Date().toISOString()
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const renderNode = (node) => {
    const isSelected = selectedNode === node.id;
    const isCompleted = node.data.completed;
    
    return (
      <div
        key={node.id}
        className={`workflow-node ${node.type} ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''}`}
        style={{ left: node.position.x, top: node.position.y }}
        onClick={(e) => handleNodeClick(node.id, e)}
        onMouseDown={(e) => handleNodeDrag(node.id, e)}
      >
        <div className="node-header">
          <span className="node-type">{node.type}</span>
          {node.type === 'action' && (
            <span className="node-action-type">Action</span>
          )}
          <div className="node-actions">
            <button
              className="node-complete-btn"
              onClick={(e) => toggleNodeCompletion(node.id, e)}
              title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
            >
              {isCompleted ? <Check size={16} /> : <Circle size={16} />}
            </button>
            <button
              className="node-edit-btn"
              onClick={(e) => openNodeEditor(node, e)}
              title="Edit node"
            >
              <Edit size={16} />
            </button>
          </div>
        </div>
        <div className="node-content">
          <div className="node-icon">
            {getNodeIcon(node.data.icon)}
          </div>
          <div>
            <div className="node-title">{node.data.title}</div>
            {node.data.description && (
              <div className="node-description">{node.data.description}</div>
            )}
            {node.data.link && (
              <div className="node-link">
                <a 
                  href={node.data.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="node-link-button"
                >
                  <ExternalLink size={12} />
                  Open Link
                </a>
              </div>
            )}
          </div>
        </div>
        
        {node.type === 'condition' ? (
          <div className="node-outputs">
            <div 
              className="node-output output-true"
              onClick={(e) => {
                e.stopPropagation();
                startConnection(node.id + '_true');
              }}
            >
              <span>Is True</span>
              <div className="connection-point"></div>
            </div>
            <div 
              className="node-output output-false"
              onClick={(e) => {
                e.stopPropagation();
                startConnection(node.id + '_false');
              }}
            >
              <span>If False</span>
              <div className="connection-point"></div>
            </div>
          </div>
        ) : (
          <div className="node-footer">
            <button 
              className="add-step-btn"
              onClick={(e) => {
                e.stopPropagation();
                startConnection(node.id);
              }}
            >
              <Plus size={14} />
              <span>New Step</span>
            </button>
          </div>
        )}
        
        {isSelected && (
          <button 
            className="delete-node-btn"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(node.id);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  const renderConnections = () => {
    return connections.map(conn => {
      const fromNode = nodes.find(n => n.id === conn.from || n.id + '_true' === conn.from || n.id + '_false' === conn.from);
      const toNode = nodes.find(n => n.id === conn.to);
      
      if (!fromNode || !toNode) return null;

      const fromX = fromNode.position.x + 150;
      const fromY = fromNode.position.y + 100;
      const toX = toNode.position.x + 150;
      const toY = toNode.position.y;

      return (
        <svg
          key={conn.id}
          className="connection-svg"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke="var(--border-color)"
            strokeWidth="2"
          />
          <circle
            cx={toX}
            cy={toY}
            r="4"
            fill="var(--border-color)"
          />
        </svg>
      );
    });
  };

  return (
    <div className="workflow-editor-page">
      <div className="workflow-editor-content">
        <div className="workflow-editor-dashboard">
          <div className="dashboard-card">
            <div className="card-header">
              <div className="header-left">
                <button className="back-btn" onClick={onClose}>
                  <ArrowLeft size={18} />
                  Back
                </button>
                <h3>
                  <GitBranch size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Visual Workflow Editor
                </h3>
              </div>
              <div className="header-actions">
                <input
                  type="text"
                  className="workflow-name-input"
                  placeholder="Enter workflow name..."
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                />
                <button className="test-btn">
                  <Play size={16} />
                  Test
                </button>
                <button 
                  className="save-btn" 
                  onClick={saveWorkflow}
                  disabled={isSaving}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className="card-body">
              <div className="editor-toolbar">
                <div className="toolbar-hint">
                  Right-click on canvas to add nodes • Click and drag to move nodes • Click "New Step" to connect
                </div>
              </div>

              <div 
                ref={canvasRef}
                className="workflow-canvas"
                onClick={handleCanvasClick}
                onContextMenu={handleCanvasRightClick}
              >
        {renderConnections()}
        {nodes.map(renderNode)}
        
        {showNodeMenu && (
          <div 
            className="node-context-menu"
            style={{ left: menuPosition.x, top: menuPosition.y }}
          >
            <div className="menu-header">Add Node</div>
            <button onClick={() => addNode('trigger')}>
              <Zap size={16} />
              Trigger
            </button>
            <button onClick={() => addNode('condition')}>
              <Filter size={16} />
              If/Else Condition
            </button>
            <button onClick={() => addNode('action')}>
              <Activity size={16} />
              Action
            </button>
          </div>
        )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Node Editor Modal */}
      {editingNode && (
        <div className="node-editor-overlay" onClick={() => setEditingNode(null)}>
          <div className="node-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="editor-header">
              <h3>Edit Node</h3>
              <button 
                className="close-btn"
                onClick={() => setEditingNode(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="editor-body">
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={nodeFormData.title}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, title: e.target.value })}
                  placeholder="Enter node title..."
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={nodeFormData.description}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, description: e.target.value })}
                  placeholder="Enter node description..."
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Link (Optional)</label>
                <input
                  type="url"
                  value={nodeFormData.link}
                  onChange={(e) => setNodeFormData({ ...nodeFormData, link: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="editor-footer">
              <button 
                className="cancel-btn"
                onClick={() => setEditingNode(null)}
              >
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={updateNode}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowVisualEditor;