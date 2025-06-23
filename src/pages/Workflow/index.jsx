import React, { useState, useEffect } from 'react';
import { GitBranch, CheckCircle2, Circle, Clock, AlertCircle, Play, Pause, RotateCw, 
         Plus, Filter, Settings, ArrowRight, User, Calendar, Tag, BarChart3, Edit2, 
         Trash2, Save, X, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import './Workflow.css';

const Workflow = () => {
  const { theme } = useTheme();
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [filter, setFilter] = useState('all');
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWorkflowDesigner, setShowWorkflowDesigner] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showResults, setShowResults] = useState(false);
  
  // Form state for creating/editing workflows
  const [workflowForm, setWorkflowForm] = useState({
    name: '',
    description: '',
    assignee: '',
    priority: 'medium',
    steps: [
      { id: 1, name: 'Initial Step', status: 'pending', duration: '30 min', description: '' }
    ]
  });

  // Load workflows from Firebase
  useEffect(() => {
    if (!firestore) {
      console.warn('Firestore not available, using default workflows');
      setWorkflows(getDefaultWorkflows());
      setLoading(false);
      return;
    }

    try {
      const workflowsQ = query(collection(firestore, 'workflows'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(workflowsQ, (snapshot) => {
        const workflowsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setWorkflows(workflowsData.length > 0 ? workflowsData : getDefaultWorkflows());
        setLoading(false);
      }, (error) => {
        console.error('Error loading workflows:', error);
        setWorkflows(getDefaultWorkflows());
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Firebase connection error:', error);
      setWorkflows(getDefaultWorkflows());
      setLoading(false);
    }
  }, []);

  // Get default workflows
  const getDefaultWorkflows = () => [
    {
      id: 1,
      name: 'Patient Infusion Process',
      description: 'Complete workflow for patient infusion therapy',
      status: 'active',
      progress: 65,
      lastUpdated: '2 hours ago',
      assignee: 'Dr. Smith',
      priority: 'high',
      steps: [
        { id: 1, name: 'Pre-Assessment', status: 'completed', duration: '15 min', description: 'Patient assessment and vitals' },
        { id: 2, name: 'Lab Work Review', status: 'completed', duration: '10 min', description: 'Review lab results' },
        { id: 3, name: 'Medication Preparation', status: 'in-progress', duration: '30 min', description: 'Prepare infusion medication' },
        { id: 4, name: 'Infusion Administration', status: 'pending', duration: '3 hours', description: 'Administer medication to patient' },
        { id: 5, name: 'Post-Infusion Monitoring', status: 'pending', duration: '1 hour', description: 'Monitor patient after infusion' }
      ]
    },
    {
      id: 2,
      name: 'Insurance Authorization',
      description: 'Insurance approval and documentation process',
      status: 'pending',
      progress: 30,
      lastUpdated: '1 day ago',
      assignee: 'Admin Team',
      priority: 'medium',
      steps: [
        { id: 1, name: 'Submit Request', status: 'completed', duration: '20 min', description: 'Submit authorization request' },
        { id: 2, name: 'Documentation Review', status: 'in-progress', duration: '2 days', description: 'Review submitted documentation' },
        { id: 3, name: 'Insurance Response', status: 'pending', duration: '5 days', description: 'Wait for insurance response' },
        { id: 4, name: 'Final Approval', status: 'pending', duration: '1 day', description: 'Process final approval' }
      ]
    }
  ];

  const currentWorkflow = workflows.find(w => w.id === activeWorkflow);

  // Firebase CRUD operations
  const createWorkflow = async () => {
    if (!firestore) {
      console.error('Firebase not available');
      return;
    }

    try {
      const workflowData = {
        ...workflowForm,
        status: 'pending',
        progress: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(firestore, 'workflows'), workflowData);
      setShowCreateModal(false);
      resetWorkflowForm();
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const updateWorkflow = async (workflowId, updates) => {
    if (!firestore) return;

    try {
      await updateDoc(doc(firestore, 'workflows', workflowId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating workflow:', error);
    }
  };

  const deleteWorkflow = async (workflowId) => {
    if (!firestore) return;

    try {
      await deleteDoc(doc(firestore, 'workflows', workflowId));
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  // Toggle step completion
  const toggleStepCompletion = async (workflowId, stepId) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedSteps = workflow.steps.map(step => {
      if (step.id === stepId) {
        return {
          ...step,
          status: step.status === 'completed' ? 'pending' : 'completed'
        };
      }
      return step;
    });

    const completedSteps = updatedSteps.filter(step => step.status === 'completed').length;
    const progress = Math.round((completedSteps / updatedSteps.length) * 100);
    
    const status = progress === 100 ? 'completed' : progress > 0 ? 'active' : 'pending';

    if (firestore) {
      await updateWorkflow(workflowId, {
        steps: updatedSteps,
        progress,
        status
      });
    } else {
      // Update local state for demo
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId 
          ? { ...w, steps: updatedSteps, progress, status }
          : w
      ));
    }
  };

  // Form management
  const resetWorkflowForm = () => {
    setWorkflowForm({
      name: '',
      description: '',
      assignee: '',
      priority: 'medium',
      steps: [
        { id: 1, name: 'Initial Step', status: 'pending', duration: '30 min', description: '' }
      ]
    });
  };

  const addStep = () => {
    const newStep = {
      id: workflowForm.steps.length + 1,
      name: `Step ${workflowForm.steps.length + 1}`,
      status: 'pending',
      duration: '30 min',
      description: ''
    };
    setWorkflowForm(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (stepId) => {
    if (workflowForm.steps.length > 1) {
      setWorkflowForm(prev => ({
        ...prev,
        steps: prev.steps.filter(step => step.id !== stepId)
      }));
    }
  };

  const updateStep = (stepId, field, value) => {
    setWorkflowForm(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, [field]: value } : step
      )
    }));
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed':
        return <CheckCircle2 size={20} className="status-icon completed" />;
      case 'in-progress':
        return <div className="status-icon in-progress"><Clock size={20} /></div>;
      case 'pending':
        return <Circle size={20} className="status-icon pending" />;
      case 'failed':
        return <AlertCircle size={20} className="status-icon failed" />;
      default:
        return <Circle size={20} className="status-icon" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'completed': return '#2196f3';
      default: return '#666';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ff5500';
      case 'medium': return '#ff8533';
      case 'low': return '#ffa04d';
      default: return '#666';
    }
  };

  return (
    <div className="workflow-page page-container">
      <div className="workflow-content">
        <div className="workflow-dashboard">
          {/* Header Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Workflow Management</h3>
              <GitBranch size={20} />
            </div>
            <div className="card-body">
              <div className="workflow-intro">
                <p>Create and manage step-by-step workflows for your processes</p>
                <button 
                  className="calculate-btn create-workflow-main"
                  onClick={() => {
                    setShowCreateModal(true);
                    resetWorkflowForm();
                  }}
                >
                  <Plus size={20} />
                  Create New Workflow
                </button>
              </div>
            </div>
          </div>
          {/* Workflows List */}
          <div className="dashboard-card workflows-card">
            <div className="card-header">
              <h3>Your Workflows</h3>
              <div className="header-actions">
                <span className="workflow-count">{workflows.length} workflows</span>
              </div>
            </div>
            <div className="card-body">
              {/* Filter Tabs */}
              <div className="filter-tabs">
                <button 
                  className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All
                </button>
                <button 
                  className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                  onClick={() => setFilter('active')}
                >
                  Active
                </button>
                <button 
                  className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilter('pending')}
                >
                  Pending
                </button>
                <button 
                  className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
                  onClick={() => setFilter('completed')}
                >
                  Completed
                </button>
              </div>

              {/* Workflows List */}
              <div className="workflows-list">
                {workflows.filter(workflow => 
                  filter === 'all' || workflow.status === filter
                ).map(workflow => (
                  <div 
                    key={workflow.id}
                    className={`workflow-item ${activeWorkflow === workflow.id ? 'active' : ''}`}
                    onClick={() => setActiveWorkflow(workflow.id)}
                  >
                    <div className="workflow-header">
                      <div>
                        <h4>{workflow.name}</h4>
                        <p>{workflow.description}</p>
                      </div>
                      <div className="workflow-status" style={{ color: getStatusColor(workflow.status) }}>
                        {workflow.status}
                      </div>
                    </div>
                    <div className="workflow-meta">
                      <div className="meta-item">
                        <User size={14} />
                        <span>{workflow.assignee}</span>
                      </div>
                      <div className="meta-item">
                        <Clock size={14} />
                        <span>{workflow.lastUpdated}</span>
                      </div>
                      <div className="meta-item">
                        <Tag size={14} style={{ color: getPriorityColor(workflow.priority) }} />
                        <span style={{ color: getPriorityColor(workflow.priority) }}>
                          {workflow.priority}
                        </span>
                      </div>
                    </div>
                    <div className="workflow-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${workflow.progress}%` }}
                        />
                      </div>
                      <span className="progress-text">{workflow.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {workflows.length === 0 && (
                <div className="empty-state">
                  <GitBranch size={48} />
                  <h3>No workflows yet</h3>
                  <p>Create your first workflow to get started</p>
                  <button 
                    className="calculate-btn"
                    onClick={() => {
                      setShowCreateModal(true);
                      resetWorkflowForm();
                    }}
                  >
                    <Plus size={20} />
                    Create New Workflow
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Workflow Details */}
          {currentWorkflow && (
            <div className="dashboard-card workflow-details">
              <div className="card-header">
                <h3>{currentWorkflow.name}</h3>
                <div className="header-actions">
                  <button className="action-btn">
                    <Play size={16} />
                  </button>
                  <button className="action-btn">
                    <Pause size={16} />
                  </button>
                  <button className="action-btn">
                    <RotateCw size={16} />
                  </button>
                  <button className="action-btn">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                {/* Workflow Info */}
                <div className="workflow-info">
                  <div className="info-item">
                    <span className="label">Status:</span>
                    <span className="value" style={{ color: getStatusColor(currentWorkflow.status) }}>
                      {currentWorkflow.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Assignee:</span>
                    <span className="value">{currentWorkflow.assignee}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Priority:</span>
                    <span className="value" style={{ color: getPriorityColor(currentWorkflow.priority) }}>
                      {currentWorkflow.priority}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Last Updated:</span>
                    <span className="value">{currentWorkflow.lastUpdated}</span>
                  </div>
                </div>

                {/* Workflow Steps */}
                <div className="workflow-steps">
                  <h4>Process Steps - Click to Mark as Done</h4>
                  <div className="steps-flowchart">
                    {currentWorkflow.steps.map((step, index) => (
                      <div key={step.id} className="step-flowchart-container">
                        <div 
                          className={`step-flowchart-item ${step.status} ${step.status === 'completed' ? 'completed-step' : ''}`}
                          onClick={() => toggleStepCompletion(currentWorkflow.id, step.id)}
                          style={{
                            backgroundColor: step.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : '',
                            borderColor: step.status === 'completed' ? '#22c55e' : '',
                            cursor: 'pointer'
                          }}
                        >
                          <div className="step-status-icon">
                            {step.status === 'completed' ? (
                              <div className="completed-icon-wrapper">
                                <CheckCircle2 size={24} className="completed-icon" style={{ color: '#22c55e' }} />
                              </div>
                            ) : step.status === 'in-progress' ? (
                              <Clock size={24} className="progress-icon" />
                            ) : (
                              <Circle size={24} className="pending-icon" />
                            )}
                          </div>
                          <div className="step-content">
                            <div className="step-header">
                              <h5 style={{ color: step.status === 'completed' ? '#22c55e' : '' }}>{step.name}</h5>
                              <span className="step-duration">{step.duration}</span>
                            </div>
                            {step.description && (
                              <div className="step-description">{step.description}</div>
                            )}
                            <div className="step-status-label" style={{ color: step.status === 'completed' ? '#22c55e' : '' }}>
                              {step.status === 'completed' ? 'Completed' : step.status.replace('-', ' ')}
                            </div>
                          </div>
                          {step.status === 'completed' && (
                            <div className="completion-badge" style={{ backgroundColor: '#22c55e', color: 'white' }}>
                              <CheckCircle2 size={16} />
                              Done
                            </div>
                          )}
                        </div>
                        {index < currentWorkflow.steps.length - 1 && (
                          <div className="step-connector-line" style={{ color: step.status === 'completed' ? '#22c55e' : '' }}>
                            <ArrowRight className="step-arrow" size={20} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="action-buttons">
                  <button 
                    className="reset-btn"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this workflow?')) {
                        deleteWorkflow(currentWorkflow.id);
                        setActiveWorkflow(null);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button 
                    className="calculate-btn"
                    onClick={() => {
                      setEditingWorkflow(currentWorkflow);
                      setWorkflowForm({
                        name: currentWorkflow.name,
                        description: currentWorkflow.description,
                        assignee: currentWorkflow.assignee,
                        priority: currentWorkflow.priority,
                        steps: currentWorkflow.steps
                      });
                      setShowCreateModal(true);
                    }}
                  >
                    <Edit2 size={16} />
                    Edit Workflow
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="dashboard-card stats-card">
            <div className="card-header">
              <h3>Workflow Statistics</h3>
              <BarChart3 size={20} />
            </div>
            <div className="card-body">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">12</div>
                  <div className="stat-label">Active Workflows</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">8</div>
                  <div className="stat-label">Pending Tasks</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">45</div>
                  <div className="stat-label">Completed Today</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">92%</div>
                  <div className="stat-label">Success Rate</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h4>Quick Actions</h4>
                <div className="actions-list">
                  <button className="quick-action-btn">
                    <Filter size={16} />
                    Filter Workflows
                  </button>
                  <button className="quick-action-btn">
                    <Calendar size={16} />
                    Schedule Task
                  </button>
                  <button className="quick-action-btn">
                    <User size={16} />
                    Assign Task
                  </button>
                  <button className="quick-action-btn">
                    <BarChart3 size={16} />
                    View Reports
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="workflow-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingWorkflow ? 'Edit Workflow' : 'Create New Workflow'}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingWorkflow(null);
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="workflow-form-section">
                <div className="section-header">
                  <h3>Workflow Information</h3>
                  <GitBranch size={20} />
                </div>
                <div className="input-grid">
                  <div className="input-group">
                    <label>Workflow Name</label>
                    <input
                      type="text"
                      value={workflowForm.name}
                      onChange={(e) => setWorkflowForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Patient Infusion Process"
                      className="pump-input"
                      autoFocus
                    />
                  </div>
                  <div className="input-group">
                    <label>Description</label>
                    <textarea
                      value={workflowForm.description}
                      onChange={(e) => setWorkflowForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe what this workflow does..."
                      className="pump-input workflow-textarea"
                      rows="3"
                    />
                  </div>
                  <div className="input-group">
                    <label>Assigned To</label>
                    <input
                      type="text"
                      value={workflowForm.assignee}
                      onChange={(e) => setWorkflowForm(prev => ({ ...prev, assignee: e.target.value }))}
                      placeholder="e.g., Dr. Smith, Nursing Team"
                      className="pump-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Priority Level</label>
                    <div className="custom-dropdown">
                      <select
                        value={workflowForm.priority}
                        onChange={(e) => setWorkflowForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="pump-dropdown"
                      >
                        <option value="low">Low Priority</option>
                        <option value="medium">Medium Priority</option>
                        <option value="high">High Priority</option>
                      </select>
                      <ChevronDown className="dropdown-icon" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="workflow-form-section">
                <div className="section-header">
                  <h3>Design Workflow Steps</h3>
                  <div className="header-actions">
                    <span className="step-count">{workflowForm.steps.length} steps</span>
                  </div>
                </div>

                <div className="steps-designer">
                  {workflowForm.steps.map((step, index) => (
                    <div key={step.id} className="step-designer-item">
                      <div className="step-number-badge">
                        <span>{index + 1}</span>
                      </div>
                      
                      <div className="step-content-card">
                        <div className="step-header">
                          <h4>Step {index + 1}</h4>
                          {workflowForm.steps.length > 1 && (
                            <button 
                              className="remove-step-btn"
                              onClick={() => removeStep(step.id)}
                              title="Remove step"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Step Name</label>
                            <input
                              type="text"
                              value={step.name}
                              onChange={(e) => updateStep(step.id, 'name', e.target.value)}
                              placeholder="e.g., Patient Assessment"
                              className="pump-input"
                            />
                          </div>
                          
                          <div className="input-group">
                            <label>Estimated Duration</label>
                            <input
                              type="text"
                              value={step.duration}
                              onChange={(e) => updateStep(step.id, 'duration', e.target.value)}
                              placeholder="e.g., 30 minutes"
                              className="pump-input"
                            />
                          </div>
                          
                          <div className="input-group full-width">
                            <label>Step Description</label>
                            <textarea
                              value={step.description}
                              onChange={(e) => updateStep(step.id, 'description', e.target.value)}
                              placeholder="What happens in this step?"
                              className="pump-input workflow-textarea"
                              rows="2"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {index < workflowForm.steps.length - 1 && (
                        <div className="step-connector">
                          <ArrowRight size={20} style={{ color: '#ff5500' }} />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button className="add-step-btn" onClick={addStep}>
                    <Plus size={20} />
                    Add New Step
                  </button>
                </div>
              </div>
            </div>
            
            <div className="action-buttons modal-footer">
              <button 
                className="reset-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingWorkflow(null);
                  resetWorkflowForm();
                }}
              >
                Cancel
              </button>
              <button 
                className="calculate-btn"
                onClick={editingWorkflow ? () => updateWorkflow(editingWorkflow.id, workflowForm) : createWorkflow}
                disabled={!workflowForm.name || workflowForm.steps.every(s => !s.name)}
              >
                <Save size={16} />
                {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflow;