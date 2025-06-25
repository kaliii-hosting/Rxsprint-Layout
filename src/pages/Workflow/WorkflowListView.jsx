import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  GitBranch, 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2
} from 'lucide-react';
import { firestore as db } from '../../config/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import WorkflowVisualEditor from './WorkflowVisualEditor';
import './WorkflowListView.css';

const WorkflowListView = () => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(null);

  // Load workflows from Firebase
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, 'workflows'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const workflowData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setWorkflows(workflowData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching workflows:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter workflows based on search and status
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || workflow.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <PlayCircle className="status-icon active" size={16} />;
      case 'completed':
        return <CheckCircle className="status-icon completed" size={16} />;
      case 'error':
        return <AlertCircle className="status-icon error" size={16} />;
      default:
        return <Clock className="status-icon pending" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'error':
        return 'status-error';
      default:
        return 'status-pending';
    }
  };

  const handleWorkflowClick = (workflow, e) => {
    // Don't open editor if clicking on menu button
    if (e.target.closest('.workflow-menu-btn') || e.target.closest('.workflow-menu')) {
      return;
    }
    setSelectedWorkflow(workflow);
    setShowEditor(true);
  };

  const handleCreateNew = () => {
    setSelectedWorkflow(null);
    setShowEditor(true);
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setSelectedWorkflow(null);
  };

  const handleDeleteWorkflow = async (workflowId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await deleteDoc(doc(db, 'workflows', workflowId));
        setShowMenu(null);
      } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Failed to delete workflow');
      }
    }
  };

  const handleEditWorkflow = (workflow, e) => {
    e.stopPropagation();
    setSelectedWorkflow(workflow);
    setShowEditor(true);
    setShowMenu(null);
  };

  if (showEditor) {
    return (
      <WorkflowVisualEditor 
        workflow={selectedWorkflow} 
        onClose={handleEditorClose}
      />
    );
  }

  return (
    <div className="workflow-page">
      <div className="workflow-content">
        <div className="workflow-dashboard">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>
                <GitBranch size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Workflow Management
              </h3>
              <button className="create-workflow-btn" onClick={handleCreateNew}>
                <Plus size={18} />
                Create New Workflow
              </button>
            </div>
            <div className="card-body">
              <div className="workflow-controls">
                <div className="search-section">
                  <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search workflows..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="filter-controls">
                    <Filter size={18} className="filter-icon" />
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
              </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading workflows...</p>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <div className="empty-state">
          <GitBranch size={64} className="empty-icon" />
          <h3>No workflows found</h3>
          <p>Create your first workflow to get started</p>
          <button className="create-first-btn" onClick={handleCreateNew}>
            <Plus size={20} />
            Create First Workflow
          </button>
        </div>
      ) : (
        <div className="workflow-grid">
          {filteredWorkflows.map((workflow) => (
            <div 
              key={workflow.id} 
              className={`workflow-card ${getStatusColor(workflow.status)}`}
              onClick={(e) => handleWorkflowClick(workflow, e)}
            >
              <div className="workflow-card-header">
                <div className="workflow-status">
                  {getStatusIcon(workflow.status)}
                  <span className="status-text">{workflow.status}</span>
                </div>
                <div className="workflow-meta">
                  {workflow.priority && (
                    <span className={`priority-badge priority-${workflow.priority}`}>
                      {workflow.priority}
                    </span>
                  )}
                  <div className="workflow-menu-container">
                    <button 
                      className="workflow-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === workflow.id ? null : workflow.id);
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                    {showMenu === workflow.id && (
                      <div className="workflow-menu">
                        <button onClick={(e) => handleEditWorkflow(workflow, e)}>
                          <Edit size={14} />
                          Edit
                        </button>
                        <button 
                          onClick={(e) => handleDeleteWorkflow(workflow.id, e)}
                          className="delete-btn"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="workflow-card-body">
                <h3 className="workflow-name">{workflow.name}</h3>
                {workflow.description && (
                  <p className="workflow-description">{workflow.description}</p>
                )}
                
                <div className="workflow-tags">
                  {workflow.tags && workflow.tags.map((tag, index) => (
                    <span key={index} className="workflow-tag">{tag}</span>
                  ))}
                </div>
              </div>
              
              <div className="workflow-card-footer">
                <div className="workflow-info">
                  {workflow.assignee && (
                    <div className="info-item">
                      <User size={14} />
                      <span>{workflow.assignee}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <Calendar size={14} />
                    <span>{new Date(workflow.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {workflow.totalSteps > 0 && (
                  <div className="workflow-progress">
                    <div className="progress-text">
                      {workflow.completedSteps || 0} / {workflow.totalSteps} steps
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${((workflow.completedSteps || 0) / workflow.totalSteps) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowListView;