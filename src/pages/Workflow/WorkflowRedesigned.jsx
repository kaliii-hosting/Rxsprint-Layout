import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  GitBranch, 
  Clock, 
  User, 
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  Link,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Save,
  X
} from 'lucide-react';
import { firestore as db } from '../../config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import './WorkflowRedesigned.css';

const WorkflowRedesigned = () => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignee: '',
    priority: 'medium',
    status: 'pending',
    steps: []
  });

  // Step form state
  const [newStep, setNewStep] = useState({
    title: '',
    description: '',
    duration: '',
    link: '',
    linkTitle: ''
  });

  // Load workflows from Firebase
  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Database connection not available');
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
        setError('Failed to load workflows');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Create new workflow
  const handleCreateWorkflow = async () => {
    if (!formData.name.trim()) return;

    try {
      const workflowData = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedSteps: 0,
        totalSteps: formData.steps.length
      };

      if (db) {
        await addDoc(collection(db, 'workflows'), workflowData);
      }
      
      setIsCreating(false);
      resetForm();
    } catch (error) {
      console.error('Error creating workflow:', error);
      setError('Failed to create workflow');
    }
  };

  // Update workflow
  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflow || !formData.name.trim()) return;

    try {
      const updatedData = {
        ...formData,
        updatedAt: new Date().toISOString(),
        totalSteps: formData.steps.length,
        completedSteps: formData.steps.filter(step => step.completed).length
      };

      if (db) {
        await updateDoc(doc(db, 'workflows', selectedWorkflow.id), updatedData);
      }
      
      setIsEditing(false);
      setSelectedWorkflow(null);
      resetForm();
    } catch (error) {
      console.error('Error updating workflow:', error);
      setError('Failed to update workflow');
    }
  };

  // Delete workflow
  const handleDeleteWorkflow = async (workflowId) => {
    if (!window.confirm('Are you sure you want to delete this workflow?')) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'workflows', workflowId));
      }
      
      if (selectedWorkflow?.id === workflowId) {
        setSelectedWorkflow(null);
      }
    } catch (error) {
      console.error('Error deleting workflow:', error);
      setError('Failed to delete workflow');
    }
  };

  // Toggle step completion
  const toggleStepCompletion = async (workflowId, stepIndex) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedSteps = [...workflow.steps];
    updatedSteps[stepIndex].completed = !updatedSteps[stepIndex].completed;
    
    const completedSteps = updatedSteps.filter(step => step.completed).length;

    try {
      if (db) {
        await updateDoc(doc(db, 'workflows', workflowId), {
          steps: updatedSteps,
          completedSteps,
          status: completedSteps === updatedSteps.length ? 'completed' : 'active',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error updating step:', error);
      setError('Failed to update step');
    }
  };

  // Add step to form
  const handleAddStep = () => {
    if (!newStep.title.trim()) return;

    const step = {
      ...newStep,
      completed: false,
      id: Date.now().toString()
    };

    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, step]
    }));

    setNewStep({
      title: '',
      description: '',
      duration: '',
      link: '',
      linkTitle: ''
    });
  };

  // Remove step from form
  const handleRemoveStep = (stepId) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      assignee: '',
      priority: 'medium',
      status: 'pending',
      steps: []
    });
    setNewStep({
      title: '',
      description: '',
      duration: '',
      link: '',
      linkTitle: ''
    });
  };

  // Start editing workflow
  const startEdit = (workflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      assignee: workflow.assignee || '',
      priority: workflow.priority || 'medium',
      status: workflow.status || 'pending',
      steps: workflow.steps || []
    });
    setIsEditing(true);
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'active': return '#3b82f6';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  // Calculate progress
  const calculateProgress = (workflow) => {
    if (!workflow.steps || workflow.steps.length === 0) return 0;
    const completed = workflow.steps.filter(step => step.completed).length;
    return Math.round((completed / workflow.steps.length) * 100);
  };

  if (loading) {
    return (
      <div className="workflow-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-page">
      <div className="workflow-container">
        {/* Main List View */}
        {!selectedWorkflow && !isCreating && (
          <>
            {/* Header */}
            <div className="workflow-header">
              <div className="header-content">
                <div className="header-title">
                  <GitBranch size={28} />
                  <h1>Workflows</h1>
                </div>
                <button 
                  className="add-workflow-btn"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={20} />
                  Add New Workflow
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            {/* Workflows List */}
            <div className="workflows-list">
              {workflows.length === 0 ? (
                <div className="empty-state">
                  <GitBranch size={48} />
                  <h3>No workflows yet</h3>
                  <p>Create your first workflow to get started</p>
                </div>
              ) : (
                workflows.map(workflow => (
                  <div 
                    key={workflow.id} 
                    className="workflow-card"
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <div className="workflow-card-header">
                      <div className="workflow-info">
                        <h3>{workflow.name}</h3>
                        {workflow.description && (
                          <p className="workflow-description">{workflow.description}</p>
                        )}
                      </div>
                      <div className="workflow-actions">
                        <button
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(workflow);
                          }}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(workflow.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="workflow-meta">
                      <div className="meta-item">
                        <User size={16} />
                        <span>{workflow.assignee || 'Unassigned'}</span>
                      </div>
                      <div className="meta-item">
                        <Clock size={16} />
                        <span>{workflow.steps?.length || 0} steps</span>
                      </div>
                      <div 
                        className="meta-item priority"
                        style={{ color: getPriorityColor(workflow.priority) }}
                      >
                        <AlertCircle size={16} />
                        <span>{workflow.priority} priority</span>
                      </div>
                    </div>

                    <div className="workflow-progress">
                      <div className="progress-header">
                        <span className="progress-label">Progress</span>
                        <span className="progress-value">{calculateProgress(workflow)}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${calculateProgress(workflow)}%`,
                            backgroundColor: getStatusColor(workflow.status)
                          }}
                        />
                      </div>
                    </div>

                    <ChevronRight className="workflow-chevron" size={20} />
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Workflow Detail View */}
        {selectedWorkflow && !isCreating && !isEditing && (
          <div className="workflow-detail">
            <div className="detail-header">
              <button 
                className="back-btn"
                onClick={() => setSelectedWorkflow(null)}
              >
                <ArrowLeft size={20} />
                Back to Workflows
              </button>
              <div className="detail-actions">
                <button
                  className="edit-workflow-btn"
                  onClick={() => startEdit(selectedWorkflow)}
                >
                  <Edit size={20} />
                  Edit Workflow
                </button>
              </div>
            </div>

            <div className="detail-content">
              <div className="detail-info">
                <h1>{selectedWorkflow.name}</h1>
                {selectedWorkflow.description && (
                  <p className="detail-description">{selectedWorkflow.description}</p>
                )}
                
                <div className="detail-meta">
                  <div className="meta-item">
                    <User size={20} />
                    <span>{selectedWorkflow.assignee || 'Unassigned'}</span>
                  </div>
                  <div className="meta-item">
                    <Calendar size={20} />
                    <span>Created {new Date(selectedWorkflow.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div 
                    className="meta-item"
                    style={{ color: getStatusColor(selectedWorkflow.status) }}
                  >
                    <CheckCircle size={20} />
                    <span>{selectedWorkflow.status}</span>
                  </div>
                </div>
              </div>

              <div className="workflow-steps">
                <h2>Workflow Steps</h2>
                {selectedWorkflow.steps && selectedWorkflow.steps.length > 0 ? (
                  <div className="steps-list">
                    {selectedWorkflow.steps.map((step, index) => (
                      <div 
                        key={step.id} 
                        className={`step-item ${step.completed ? 'completed' : ''}`}
                      >
                        <button
                          className="step-checkbox"
                          onClick={() => toggleStepCompletion(selectedWorkflow.id, index)}
                        >
                          {step.completed ? (
                            <CheckCircle size={24} />
                          ) : (
                            <Circle size={24} />
                          )}
                        </button>
                        
                        <div className="step-content">
                          <h4>{step.title}</h4>
                          {step.description && (
                            <p className="step-description">{step.description}</p>
                          )}
                          <div className="step-meta">
                            {step.duration && (
                              <span className="step-duration">
                                <Clock size={14} />
                                {step.duration}
                              </span>
                            )}
                            {step.link && (
                              <a 
                                href={step.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="step-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link size={14} />
                                {step.linkTitle || 'View Resource'}
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-steps">
                    <p>No steps defined for this workflow</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Form */}
        {(isCreating || isEditing) && (
          <div className="workflow-form">
            <div className="form-header">
              <h2>{isCreating ? 'Create New Workflow' : 'Edit Workflow'}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                  setSelectedWorkflow(null);
                  resetForm();
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="form-content">
              {/* Basic Info */}
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Workflow Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter workflow name"
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Assignee</label>
                    <input
                      type="text"
                      value={formData.assignee}
                      onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                      placeholder="Assign to..."
                      className="form-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter workflow description"
                      className="form-textarea"
                      rows="3"
                    />
                  </div>

                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="form-select"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="form-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Steps Section */}
              <div className="form-section">
                <h3>Workflow Steps</h3>
                
                {/* Existing Steps */}
                {formData.steps.length > 0 && (
                  <div className="existing-steps">
                    {formData.steps.map((step, index) => (
                      <div key={step.id} className="existing-step">
                        <div className="step-number">{index + 1}</div>
                        <div className="step-info">
                          <h4>{step.title}</h4>
                          {step.description && <p>{step.description}</p>}
                          <div className="step-details">
                            {step.duration && (
                              <span><Clock size={14} /> {step.duration}</span>
                            )}
                            {step.link && (
                              <span><Link size={14} /> {step.linkTitle || 'Link'}</span>
                            )}
                          </div>
                        </div>
                        <button
                          className="remove-step-btn"
                          onClick={() => handleRemoveStep(step.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Step Form */}
                <div className="add-step-form">
                  <h4>Add New Step</h4>
                  <div className="step-form-grid">
                    <div className="form-group">
                      <label>Step Title *</label>
                      <input
                        type="text"
                        value={newStep.title}
                        onChange={(e) => setNewStep(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter step title"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Duration</label>
                      <input
                        type="text"
                        value={newStep.duration}
                        onChange={(e) => setNewStep(prev => ({ ...prev, duration: e.target.value }))}
                        placeholder="e.g., 30 minutes"
                        className="form-input"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea
                        value={newStep.description}
                        onChange={(e) => setNewStep(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter step description"
                        className="form-textarea"
                        rows="2"
                      />
                    </div>

                    <div className="form-group">
                      <label>Link URL</label>
                      <input
                        type="url"
                        value={newStep.link}
                        onChange={(e) => setNewStep(prev => ({ ...prev, link: e.target.value }))}
                        placeholder="https://..."
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Link Title</label>
                      <input
                        type="text"
                        value={newStep.linkTitle}
                        onChange={(e) => setNewStep(prev => ({ ...prev, linkTitle: e.target.value }))}
                        placeholder="Link display text"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <button 
                    className="add-step-btn"
                    onClick={handleAddStep}
                    disabled={!newStep.title.trim()}
                  >
                    <Plus size={16} />
                    Add Step
                  </button>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(false);
                    setSelectedWorkflow(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn"
                  onClick={isCreating ? handleCreateWorkflow : handleUpdateWorkflow}
                  disabled={!formData.name.trim()}
                >
                  <Save size={20} />
                  {isCreating ? 'Create Workflow' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowRedesigned;