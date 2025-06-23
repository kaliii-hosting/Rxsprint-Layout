import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  FileText,
  Lock,
  ChevronDown,
  Wand2,
  Save,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Clock,
  Archive
} from 'lucide-react';
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
import { useTheme } from '../../contexts/ThemeContext';
import PinLock from '../../components/PinLock/PinLock';
import './NoteGenerator.css';

const NoteGenerator = () => {
  const { theme } = useTheme();
  const [noteTemplates, setNoteTemplates] = useState([]);
  const [filledTemplates, setFilledTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('templates'); // 'templates' or 'generator'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPinLock, setShowPinLock] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedNote, setSelectedNote] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPinned, setShowPinned] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  // Form state for create/edit templates
  const [formData, setFormData] = useState({
    title: '',
    fields: [
      { title: '', content: '' }
    ],
    isPinned: false
  });

  // Form state for filling out templates
  const [templateFormData, setTemplateFormData] = useState({
    templateId: '',
    templateTitle: '',
    fields: []
  });

  // Load templates and filled templates from Firebase
  useEffect(() => {
    if (!firestore) {
      console.warn('Firestore not available, running in offline mode');
      setLoading(false);
      return;
    }

    try {
      // Load templates
      const templatesQ = query(collection(firestore, 'noteTemplates'), orderBy('createdAt', 'desc'));
      const templatesUnsubscribe = onSnapshot(templatesQ, (snapshot) => {
        const templatesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNoteTemplates(templatesData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading note templates:', error);
        setLoading(false);
      });

      // Load filled templates
      const filledQ = query(collection(firestore, 'filledTemplates'), orderBy('createdAt', 'desc'));
      const filledUnsubscribe = onSnapshot(filledQ, (snapshot) => {
        const filledData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFilledTemplates(filledData);
      }, (error) => {
        console.error('Error loading filled templates:', error);
      });

      return () => {
        templatesUnsubscribe();
        filledUnsubscribe();
      };
    } catch (error) {
      console.error('Firebase connection error:', error);
      setLoading(false);
    }
  }, []);

  // Filter templates based on search and pin status
  const filteredTemplates = noteTemplates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPinFilter = showPinned ? template.isPinned : true;
    return matchesSearch && matchesPinFilter;
  });

  // Handle pin unlock
  const handlePinUnlock = useCallback(() => {
    setShowPinLock(false);
    if (pendingAction) {
      if (pendingAction.type === 'edit') {
        handleEdit(pendingAction.note);
      } else if (pendingAction.type === 'delete') {
        handleDelete(pendingAction.note);
      }
      setPendingAction(null);
    }
  }, [pendingAction]);

  // Add field to form
  const addField = () => {
    if (formData.fields.length < 10) {
      setFormData(prev => ({
        ...prev,
        fields: [...prev.fields, { title: '', content: '' }]
      }));
    }
  };

  // Remove field from form
  const removeField = (index) => {
    if (formData.fields.length > 1) {
      setFormData(prev => ({
        ...prev,
        fields: prev.fields.filter((_, i) => i !== index)
      }));
    }
  };

  // Update field in form
  const updateField = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((f, i) => 
        i === index ? { ...f, [field]: value } : f
      )
    }));
  };

  // Create new template
  const handleCreate = async () => {
    if (!formData.title || formData.fields.every(f => !f.title)) {
      return;
    }

    if (!firestore) {
      console.error('Firebase not available');
      alert('Database connection not available. Please check your connection.');
      return;
    }
    
    try {
      await addDoc(collection(firestore, 'noteTemplates'), {
        title: formData.title,
        fields: formData.fields.map(f => ({ title: f.title, placeholder: f.content || '' })),
        isPinned: formData.isPinned,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setShowCreateModal(false);
      setFormData({
        title: '',
        fields: [{ title: '', content: '' }],
        isPinned: false
      });
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  // Update existing template
  const handleUpdate = async () => {
    if (!selectedNote || !formData.title || formData.fields.every(f => !f.title)) {
      return;
    }

    try {
      await updateDoc(doc(firestore, 'noteTemplates', selectedNote.id), {
        title: formData.title,
        fields: formData.fields.map(f => ({ title: f.title, placeholder: f.content || '' })),
        isPinned: formData.isPinned,
        updatedAt: serverTimestamp()
      });

      setShowEditModal(false);
      setSelectedNote(null);
      setFormData({
        title: '',
        fields: [{ title: '', content: '' }],
        isPinned: false
      });
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  // Open template for generator
  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      templateId: template.id,
      templateTitle: template.title,
      fields: template.fields.map(f => ({ title: f.title, content: '', placeholder: f.placeholder }))
    });
    setActiveSection('generator');
  };

  // Save filled template to Firebase
  const saveFilledTemplate = async () => {
    if (!firestore) {
      console.error('Firebase not available');
      return;
    }

    if (!templateFormData.fields.some(f => f.content)) {
      return;
    }

    try {
      const content = templateFormData.fields
        .filter(f => f.content)
        .map(f => f.content)
        .join('. ');

      await addDoc(collection(firestore, 'filledTemplates'), {
        templateId: templateFormData.templateId,
        templateTitle: templateFormData.templateTitle,
        fields: templateFormData.fields,
        generatedContent: content,
        createdAt: serverTimestamp(),
        patientInfo: {
          // Add any patient-specific fields here if needed
        }
      });

      // Reset form after saving
      setTemplateFormData({
        templateId: '',
        templateTitle: '',
        fields: []
      });
      setSelectedTemplate(null);
      setActiveSection('templates');
    } catch (error) {
      console.error('Error saving filled template:', error);
    }
  };

  // Delete template
  const handleDelete = async (template) => {
    try {
      await deleteDoc(doc(firestore, 'noteTemplates', template.id));
      setShowDeleteConfirm(false);
      setSelectedNote(null);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  // Request edit (with pin check)
  const requestEdit = (note) => {
    setPendingAction({ type: 'edit', note });
    setShowPinLock(true);
  };

  // Request delete (with pin check)
  const requestDelete = (note) => {
    setSelectedNote(note);
    setPendingAction({ type: 'delete', note });
    setShowPinLock(true);
  };

  // Handle edit after pin unlock
  const handleEdit = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title,
      fields: note.fields || [{ title: '', content: '' }],
      isPinned: note.isPinned || false
    });
    setShowEditModal(true);
  };

  // Copy to clipboard
  const copyToClipboard = async (item) => {
    try {
      const textToCopy = item.content || item.generatedContent || '';
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Toggle pin status (only for templates)
  const togglePin = async (template) => {
    try {
      await updateDoc(doc(firestore, 'noteTemplates', template.id), {
        isPinned: !template.isPinned,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling pin status:', error);
    }
  };

  if (loading) {
    return (
      <div className="note-generator-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading note generator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="note-generator-page page-container">
      <div className="note-generator-content">
        <div className="note-generator-dashboard">
          {/* Section Selector Card */}
          <div className="dashboard-card section-card">
            <div className="card-header">
              <h3>Note Generator</h3>
              <FileText size={20} />
            </div>
            <div className="card-body">
              <div className="section-grid">
                <button
                  className={`section-tile ${activeSection === 'templates' ? 'selected' : ''}`}
                  onClick={() => setActiveSection('templates')}
                >
                  <div className="section-icon">
                    <Archive size={24} />
                  </div>
                  <span className="section-name">Manage Templates</span>
                  <span className="section-description">Create and edit note templates</span>
                  {activeSection === 'templates' && (
                    <Check className="check-icon" size={16} />
                  )}
                </button>
                
                <button
                  className={`section-tile ${activeSection === 'generator' ? 'selected' : ''}`}
                  onClick={() => setActiveSection('generator')}
                  disabled={!selectedTemplate}
                >
                  <div className="section-icon">
                    <Wand2 size={24} />
                  </div>
                  <span className="section-name">Generate Notes</span>
                  <span className="section-description">Use templates to create notes</span>
                  {activeSection === 'generator' && (
                    <Check className="check-icon" size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Templates Section */}
          {activeSection === 'templates' && (
            <>
              {/* Template Controls Card */}
              <div className="dashboard-card controls-card">
                <div className="card-header">
                  <h3>Template Management</h3>
                  <div className="header-actions">
                    <button className="create-btn" onClick={() => setShowCreateModal(true)}>
                      <Plus size={18} />
                      Create Template
                    </button>
                    <button className="table-view-btn" onClick={() => setShowTableView(true)}>
                      <FileText size={18} />
                      View Filled Templates
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="controls-grid">
                    <div className="search-container">
                      <Search size={18} />
                      <input
                        type="text"
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                      />
                    </div>
                    
                    <div className="filter-controls">
                      <button 
                        className={`filter-btn ${showPinned ? 'active' : ''}`}
                        onClick={() => setShowPinned(!showPinned)}
                      >
                        <Lock size={16} />
                        Pinned Only
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Templates Grid Card */}
              <div className="dashboard-card templates-card">
                <div className="card-header">
                  <h3>Available Templates</h3>
                  <span className="template-count">{filteredTemplates.length} templates</span>
                </div>
                <div className="card-body">
                  {filteredTemplates.length === 0 ? (
                    <div className="empty-state">
                      <FileText size={64} />
                      <h3>No templates yet</h3>
                      <p>Create your first template to get started</p>
                      <button className="create-note-cta" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} />
                        Create Template
                      </button>
                    </div>
                  ) : (
                    <div className="templates-grid">
                      {filteredTemplates.map(template => (
                        <div key={template.id} className="template-card">
                          <div className="template-header">
                            <h4 className="template-title">{template.title}</h4>
                            <div className="template-actions">
                              <button 
                                className={`icon-btn ${template.isPinned ? 'pinned' : ''}`}
                                onClick={() => togglePin(template)}
                                title={template.isPinned ? 'Unpin' : 'Pin'}
                              >
                                <Lock size={16} />
                              </button>
                              <button 
                                className="icon-btn"
                                onClick={() => requestEdit(template)}
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className="icon-btn delete"
                                onClick={() => requestDelete(template)}
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="template-content">
                            <div className="template-fields">
                              {template.fields?.map((field, index) => (
                                <div key={index} className="template-field">
                                  <strong>{field.title}</strong>
                                  {field.placeholder && <span className="placeholder">({field.placeholder})</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="template-footer">
                            <span className="template-date">
                              <Calendar size={12} />
                              {template.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently created'}
                            </span>
                            <button 
                              className="use-template-btn"
                              onClick={() => handleUseTemplate(template)}
                            >
                              <Wand2 size={16} />
                              Use Template
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Generator Section */}
          {activeSection === 'generator' && selectedTemplate && (
            <div className="dashboard-card generator-card">
              <div className="card-header">
                <h3>Fill Template</h3>
                <div className="header-actions">
                  <button 
                    className="back-btn"
                    onClick={() => {
                      setActiveSection('templates');
                      setSelectedTemplate(null);
                      setTemplateFormData({ templateId: '', templateTitle: '', fields: [] });
                    }}
                  >
                    ← Back to Templates
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="generator-form">
                  {/* Template Selection Display */}
                  <div className="template-form-section">
                    <div className="section-header">
                      <h3>Selected Template</h3>
                      <FileText size={20} />
                    </div>
                    <div className="selected-template-display">
                      <div className="template-info-card">
                        <h4>{selectedTemplate.title}</h4>
                        <span className="field-count">{selectedTemplate.fields?.length || 0} fields to complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Input Fields Section */}
                  <div className="template-form-section">
                    <div className="section-header">
                      <h3>Complete Template Fields</h3>
                      <Wand2 size={20} />
                    </div>
                    <div className="input-grid">
                      {templateFormData.fields.map((field, index) => (
                        <div key={index} className="input-group">
                          <label>{field.title}</label>
                          {field.placeholder && (
                            <span className="field-hint">{field.placeholder}</span>
                          )}
                          <textarea
                            value={field.content}
                            onChange={(e) => setTemplateFormData(prev => ({
                              ...prev,
                              fields: prev.fields.map((f, i) => 
                                i === index ? { ...f, content: e.target.value } : f
                              )
                            }))}
                            placeholder={field.placeholder || `Enter ${field.title}`}
                            className="pump-input template-textarea"
                            rows="4"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generated Note Output */}
                  {templateFormData.fields.some(f => f.content) && (
                    <div className="template-form-section">
                      <div className="section-header">
                        <h3>Generated Note Preview</h3>
                        <Check size={20} />
                      </div>
                      <div className="generated-output-card">
                        <div 
                          className="generated-note-display"
                          onClick={() => {
                            const content = templateFormData.fields
                              .filter(f => f.content)
                              .map(f => f.content)
                              .join('. ');
                            copyToClipboard({ id: 'temp', content });
                          }}
                          title="Click to copy generated note"
                        >
                          <p>
                            {templateFormData.fields
                              .filter(f => f.content)
                              .map(f => f.content)
                              .join('. ')}
                          </p>
                          {copiedId === 'temp' && (
                            <div className="copied-indicator">
                              <Check size={16} />
                              Copied!
                            </div>
                          )}
                        </div>
                        
                        <div className="action-buttons">
                          <button 
                            className="reset-btn"
                            onClick={() => {
                              setTemplateFormData(prev => ({
                                ...prev,
                                fields: prev.fields.map(f => ({ ...f, content: '' }))
                              }));
                            }}
                          >
                            Clear All
                          </button>
                          <button 
                            className="copy-note-btn"
                            onClick={() => {
                              const content = templateFormData.fields
                                .filter(f => f.content)
                                .map(f => f.content)
                                .join('. ');
                              copyToClipboard({ id: 'temp', content });
                            }}
                          >
                            <Copy size={16} />
                            Copy Note
                          </button>
                          <button 
                            className="calculate-btn save-template-btn"
                            onClick={saveFilledTemplate}
                            disabled={!templateFormData.fields.some(f => f.content)}
                          >
                            <Save size={16} />
                            Save Note
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Statistics Card */}
          <div className="dashboard-card stats-card">
            <div className="card-header">
              <h3>Statistics</h3>
              <Archive size={20} />
            </div>
            <div className="card-body">
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{noteTemplates.length}</div>
                  <div className="stat-label">Total Templates</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{noteTemplates.filter(t => t.isPinned).length}</div>
                  <div className="stat-label">Pinned</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{filledTemplates.length}</div>
                  <div className="stat-label">Generated Notes</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">
                    {filledTemplates.filter(f => {
                      const dayAgo = new Date();
                      dayAgo.setDate(dayAgo.getDate() - 1);
                      return f.createdAt?.toDate() > dayAgo;
                    }).length}
                  </div>
                  <div className="stat-label">Generated Today</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          setSelectedNote(null);
          setFormData({
            title: '',
            fields: [{ title: '', content: '' }],
            isPinned: false
          });
        }}>
          <div className="template-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="template-modal-header">
              <h2>{showEditModal ? 'Edit Template' : 'New Template'}</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedNote(null);
                  setFormData({
                    title: '',
                    fields: [{ title: '', content: '' }],
                    isPinned: false
                  });
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="template-modal-body">
              <div className="template-form-section">
                <div className="section-header">
                  <h3>Template Details</h3>
                  <FileText size={20} />
                </div>
                <div className="input-grid">
                  <div className="input-group">
                    <label>Template Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter template title"
                      className="pump-input"
                    />
                  </div>
                  <div className="input-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isPinned}
                        onChange={(e) => setFormData(prev => ({ ...prev, isPinned: e.target.checked }))}
                      />
                      <span>Pin this template for quick access</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="template-form-section">
                <div className="section-header">
                  <h3>Template Fields</h3>
                  <div className="header-actions">
                    {formData.fields.length < 10 && (
                      <button className="calculate-btn add-field-btn" onClick={addField}>
                        <Plus size={16} />
                        Add Field
                      </button>
                    )}
                  </div>
                </div>

                <div className="input-grid">
                  {formData.fields.map((field, index) => (
                    <div key={index} className="field-entry-section">
                      <div className="field-entry-header">
                        <span className="field-number">Field {index + 1}</span>
                        {formData.fields.length > 1 && (
                          <button 
                            className="remove-field-btn"
                            onClick={() => removeField(index)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                      <div className="input-group">
                        <label>Field Title</label>
                        <input
                          type="text"
                          value={field.title}
                          onChange={(e) => updateField(index, 'title', e.target.value)}
                          placeholder="e.g., Patient Name, Diagnosis, Treatment Plan"
                          className="pump-input"
                        />
                      </div>
                      <div className="input-group">
                        <label>Placeholder Text (optional)</label>
                        <textarea
                          value={field.content}
                          onChange={(e) => updateField(index, 'content', e.target.value)}
                          placeholder="Helpful text to guide users when filling this field"
                          className="pump-input template-textarea"
                          rows="3"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="action-buttons template-modal-footer">
              <button 
                className="reset-btn cancel-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedNote(null);
                  setFormData({
                    title: '',
                    fields: [{ title: '', content: '' }],
                    isPinned: false
                  });
                }}
              >
                Cancel
              </button>
              <button 
                className="calculate-btn save-btn"
                onClick={showEditModal ? handleUpdate : handleCreate}
                disabled={!formData.title || formData.fields.every(f => !f.title)}
              >
                <Save size={16} />
                {showEditModal ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filled Templates Table View */}
      {showTableView && (
        <div className="modal-overlay" onClick={() => setShowTableView(false)}>
          <div className="table-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Filled Templates Database</h2>
              <button 
                className="close-btn"
                onClick={() => setShowTableView(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="table-modal-body">
              {filledTemplates.length === 0 ? (
                <div className="empty-table-state">
                  <FileText size={48} />
                  <h3>No filled templates yet</h3>
                  <p>Use a template to generate your first note</p>
                </div>
              ) : (
                <div className="filled-templates-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Template</th>
                        <th>Fields</th>
                        <th>Generated Content</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filledTemplates.map((filled) => (
                        <tr key={filled.id}>
                          <td className="date-cell">
                            {filled.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently created'}
                          </td>
                          <td className="template-cell">
                            <strong>{filled.templateTitle}</strong>
                          </td>
                          <td className="fields-cell">
                            <div 
                              className="fields-summary-paragraph"
                              onClick={() => {
                                const fieldsText = filled.fields?.map(field => field.content).filter(content => content).join(', ') + '.';
                                copyToClipboard({ id: `fields-${filled.id}`, content: fieldsText, generatedContent: fieldsText });
                              }}
                              title="Click to copy fields content"
                            >
                              {filled.fields?.map(field => field.content).filter(content => content).join(', ')}.
                              {copiedId === `fields-${filled.id}` && (
                                <div className="copied-indicator-small">
                                  <Check size={12} />
                                  Copied!
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="content-cell">
                            <div 
                              className="content-preview"
                              onClick={() => copyToClipboard(filled)}
                              title="Click to copy"
                            >
                              {filled.generatedContent}
                              {copiedId === filled.id && (
                                <div className="copied-indicator-small">
                                  <Check size={12} />
                                  Copied!
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="actions-cell">
                            <button 
                              className="copy-btn-small"
                              onClick={() => copyToClipboard(filled)}
                              title="Copy content"
                            >
                              <Copy size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="table-modal-footer">
              <p className="table-info">
                Total filled templates: {filledTemplates.length}
              </p>
              <button 
                className="close-table-btn"
                onClick={() => setShowTableView(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Lock */}
      {showPinLock && (
        <PinLock onUnlock={handlePinUnlock} />
      )}
    </div>
  );
};

export default NoteGenerator;