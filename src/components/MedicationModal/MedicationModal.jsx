import React, { useState, useEffect } from 'react';
import { 
  X, Edit3, Save, ArrowLeft, 
  Package, Heart, Pill, Beaker, 
  TestTube, Droplet, Timer, Calendar,
  Activity, Zap, FlaskConical, Filter,
  FileText, AlertCircle, Star
} from 'lucide-react';
import './MedicationModal.css';

const MedicationModal = ({ medication, isOpen, onClose, onSave, onRequestEdit, allowEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    brandName: '',
    indication: '',
    genericName: '',
    dosageForm: '',
    vialSize: '',
    reconstitutionSolution: '',
    reconstitutionVolume: '',
    dose: '',
    doseFrequency: '',
    infusionRate: '',
    normalSalineBag: '',
    overfillRule: '',
    filter: '',
    infusionSteps: '',
    notes: '',
    specialDosing: ''
  });

  useEffect(() => {
    if (medication) {
      setFormData({
        brandName: medication.brandName || '',
        indication: medication.indication || '',
        genericName: medication.genericName || '',
        dosageForm: medication.dosageForm || '',
        vialSize: medication.vialSize || '',
        reconstitutionSolution: medication.reconstitutionSolution || '',
        reconstitutionVolume: medication.reconstitutionVolume || '',
        dose: medication.dose || '',
        doseFrequency: medication.doseFrequency || '',
        infusionRate: medication.infusionRate || '',
        normalSalineBag: medication.normalSalineBag || '',
        overfillRule: medication.overfillRule || '',
        filter: medication.filter || '',
        infusionSteps: medication.infusionSteps || '',
        notes: medication.notes || '',
        specialDosing: medication.specialDosing || ''
      });
      // If this is a new medication, start in editing mode
      setIsEditing(medication.isNew === true || allowEdit === true);
    }
  }, [medication, allowEdit]);

  // Initialize textarea heights when editing mode changes
  useEffect(() => {
    if (isEditing) {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }
  }, [isEditing, formData]);

  // Define handlers before conditional return
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Enter key for new lines
  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const cursorPosition = e.target.selectionStart;
      const currentValue = formData[field] || '';
      const newValue = 
        currentValue.substring(0, cursorPosition) + 
        '\n' + 
        currentValue.substring(cursorPosition);
      
      handleInputChange(field, newValue);
      
      // Set cursor position after state update
      setTimeout(() => {
        if (e.target) {
          e.target.selectionStart = cursorPosition + 1;
          e.target.selectionEnd = cursorPosition + 1;
          // Trigger resize
          handleTextareaResize({ target: e.target });
        }
      }, 0);
    }
  };

  // Auto-resize textarea
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Conditional return AFTER all hooks
  if (!isOpen || !medication) {
    return null;
  }

  const handleSave = () => {
    console.log('=== MedicationModal handleSave ===');
    console.log('medication object:', medication);
    console.log('medication.id:', medication.id, 'type:', typeof medication.id);
    console.log('formData:', formData);
    
    // Ensure we pass all original medication data plus updated form fields
    const dataToSave = {
      ...medication, // Preserve all original fields
      ...formData,  // Override with edited fields
      id: medication.id // Explicitly ensure ID is included
    };
    
    console.log('dataToSave:', dataToSave);
    console.log('dataToSave.id:', dataToSave.id, 'type:', typeof dataToSave.id);
    
    onSave(dataToSave);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      brandName: medication.brandName || '',
      indication: medication.indication || '',
      genericName: medication.genericName || '',
      dosageForm: medication.dosageForm || '',
      vialSize: medication.vialSize || '',
      reconstitutionSolution: medication.reconstitutionSolution || '',
      reconstitutionVolume: medication.reconstitutionVolume || '',
      dose: medication.dose || '',
      doseFrequency: medication.doseFrequency || '',
      infusionRate: medication.infusionRate || '',
      normalSalineBag: medication.normalSalineBag || '',
      overfillRule: medication.overfillRule || '',
      filter: medication.filter || '',
      infusionSteps: medication.infusionSteps || '',
      notes: medication.notes || '',
      specialDosing: medication.specialDosing || ''
    });
    setIsEditing(false);
  };

  // Field configurations with icons
  const fieldConfigs = {
    // Primary fields (displayed in cards)
    primary: [
      { key: 'brandName', label: 'Brand Name', icon: Package, color: '#FF5500' },
      { key: 'indication', label: 'Indication', icon: Heart, color: '#E91E63' },
      { key: 'genericName', label: 'Generic Name', icon: Pill, color: '#9C27B0' },
      { key: 'dosageForm', label: 'Dosage Form', icon: FlaskConical, color: '#673AB7' },
      { key: 'vialSize', label: 'Vial Size', icon: TestTube, color: '#3F51B5' },
      { key: 'reconstitutionSolution', label: 'Reconstitution Solution', icon: Droplet, color: '#2196F3' },
      { key: 'reconstitutionVolume', label: 'Reconstitution Volume', icon: Beaker, color: '#00BCD4' },
      { key: 'dose', label: 'Dose', icon: Zap, color: '#009688' },
      { key: 'doseFrequency', label: 'Dose Frequency', icon: Calendar, color: '#4CAF50' }
    ],
    // Secondary fields (displayed in full-width cards)
    secondary: [
      { key: 'infusionRate', label: 'Infusion Rate', icon: Activity, color: '#FF9800' },
      { key: 'normalSalineBag', label: 'Normal Saline Bag', icon: Droplet, color: '#795548' },
      { key: 'overfillRule', label: 'Overfill Rule', icon: AlertCircle, color: '#607D8B' },
      { key: 'filter', label: 'Filter', icon: Filter, color: '#FF5722' },
      { key: 'infusionSteps', label: 'Infusion Steps', icon: FileText, color: '#00ACC1' },
      { key: 'notes', label: 'Notes', icon: FileText, color: '#8BC34A' },
      { key: 'specialDosing', label: 'Special Dosing', icon: Star, color: '#FFC107' }
    ]
  };

  return (
    <div 
      className="medication-modal-overlay" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}>
      <div className="medication-modal">
        {/* Enhanced Header */}
        <div className="modal-header-enhanced">
          <div className="header-top">
            <button className="back-button" onClick={onClose}>
              <ArrowLeft size={20} />
              Back
            </button>
            <div className="header-actions">
              {!isEditing ? (
                <button className="edit-button" onClick={() => {
                  if (onRequestEdit && !medication?.isNew) {
                    onRequestEdit();
                  } else {
                    setIsEditing(true);
                  }
                }}>
                  <Edit3 size={18} />
                  Edit
                </button>
              ) : (
                <>
                  <button className="cancel-button" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button className="save-button" onClick={handleSave}>
                    <Save size={18} />
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Medication Info Display */}
          <div className="header-medication-info">
            <div className="med-info-primary">
              <h1 className="brand-name-display">
                {medication?.isNew ? 'New Medication' : (formData.brandName || 'Medication')}
              </h1>
              <span className="generic-name-display">
                {medication?.isNew && !formData.genericName ? 'Enter medication details' : (formData.genericName || 'Generic Name')}
              </span>
            </div>
            {(!medication?.isNew || formData.indication) && (
              <div className="indication-display">
                <Heart size={16} />
                <span>{formData.indication || 'Indication'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-content-dashboard">
          {/* Primary Fields Grid */}
          <div className="dashboard-grid">
            {fieldConfigs.primary.map((field) => {
              const Icon = field.icon;
              return (
                <div key={field.key} className="dashboard-card">
                  <div className="card-icon" style={{ backgroundColor: `${field.color}20`, color: field.color }}>
                    <Icon size={24} />
                  </div>
                  <div className="card-content">
                    <label className="card-label">{field.label}</label>
                    {isEditing ? (
                      <textarea
                        className="card-input card-textarea"
                        value={formData[field.key] ?? ''}
                        onChange={(e) => {
                          handleInputChange(field.key, e.target.value);
                          handleTextareaResize(e);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, field.key)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        rows={1}
                      />
                    ) : (
                      <div className="card-value" style={{ whiteSpace: 'pre-wrap' }}>{formData[field.key] || 'Not specified'}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Secondary Fields - Full Width */}
          <div className="dashboard-full-width">
            {fieldConfigs.secondary.map((field) => {
              const Icon = field.icon;
              const isTextArea = ['infusionSteps', 'notes', 'specialDosing'].includes(field.key);
              
              return (
                <div key={field.key} className="full-width-card">
                  <div className="full-card-header">
                    <div className="card-icon" style={{ backgroundColor: `${field.color}20`, color: field.color }}>
                      <Icon size={24} />
                    </div>
                    <h3 className="full-card-label">{field.label}</h3>
                  </div>
                  <div className="full-card-content">
                    {isEditing ? (
                      isTextArea ? (
                        <textarea
                          className="full-card-textarea"
                          value={formData[field.key] ?? ''}
                          onChange={(e) => {
                            handleInputChange(field.key, e.target.value);
                            handleTextareaResize(e);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, field.key)}
                          onInput={handleTextareaResize}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          rows={3}
                        />
                      ) : (
                        <textarea
                          className="full-card-input full-card-single-line"
                          value={formData[field.key] ?? ''}
                          onChange={(e) => {
                            handleInputChange(field.key, e.target.value);
                            handleTextareaResize(e);
                          }}
                          onKeyDown={(e) => handleKeyDown(e, field.key)}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          rows={1}
                        />
                      )
                    ) : (
                      <div className="full-card-value" style={{ whiteSpace: 'pre-wrap' }}>
                        {formData[field.key] || 'Not specified'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationModal;