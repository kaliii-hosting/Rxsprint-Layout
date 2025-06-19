import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, Save, ArrowLeft } from 'lucide-react';
import './MedicationModal.css';

const MedicationModal = ({ medication, isOpen, onClose, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

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
        routeOfAdministration: medication.routeOfAdministration || '',
        normalSalineBag: medication.normalSalineBag || '',
        overallRate: medication.overallRate || '',
        filter: medication.filter || '',
        infusionSteps: medication.infusionSteps || '',
        notes: medication.notes || '',
        specialDosing: medication.specialDosing || ''
      });
    }
  }, [medication]);

  if (!isOpen || !medication) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Auto-resize textarea
  const handleTextareaResize = (e) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  // Initialize textarea heights when editing mode changes
  useEffect(() => {
    if (isEditing) {
      const textareas = document.querySelectorAll('.field-input.textarea');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      });
    }
  }, [isEditing, formData]);

  const handleSave = () => {
    onSave({
      ...medication,
      ...formData
    });
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
      routeOfAdministration: medication.routeOfAdministration || '',
      normalSalineBag: medication.normalSalineBag || '',
      overallRate: medication.overallRate || '',
      filter: medication.filter || '',
      infusionSteps: medication.infusionSteps || '',
      notes: medication.notes || '',
      specialDosing: medication.specialDosing || ''
    });
    setIsEditing(false);
  };

  const fields = [
    { key: 'brandName', label: 'Brand Name', type: 'text' },
    { key: 'indication', label: 'Indication', type: 'text' },
    { key: 'genericName', label: 'Generic Name', type: 'text' },
    { key: 'dosageForm', label: 'Dosage Form', type: 'text' },
    { key: 'vialSize', label: 'Vial Size', type: 'text' },
    { key: 'reconstitutionSolution', label: 'Reconstitution Solution', type: 'text' },
    { key: 'reconstitutionVolume', label: 'Reconstitution Volume', type: 'text' },
    { key: 'dose', label: 'Dose', type: 'text' },
    { key: 'doseFrequency', label: 'Dose Frequency', type: 'text' },
    { key: 'routeOfAdministration', label: 'Route of Administration', type: 'text' },
    { key: 'normalSalineBag', label: 'Normal Saline Bag', type: 'text' },
    { key: 'overallRate', label: 'Overall Rate', type: 'text' },
    { key: 'filter', label: 'Filter', type: 'text' },
    { key: 'infusionSteps', label: 'Infusion Steps', type: 'textarea' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
    { key: 'specialDosing', label: 'Special Dosing', type: 'textarea' }
  ];

  return (
    <div className="medication-modal-overlay">
      <div className="medication-modal">
        <div className="modal-header">
          <button className="back-button" onClick={onClose}>
            <ArrowLeft size={24} />
            Back
          </button>
          <h2 className="modal-title">{formData.brandName || 'Medication Details'}</h2>
          <div className="header-actions">
            {!isEditing ? (
              <button className="edit-button" onClick={() => setIsEditing(true)}>
                <Edit3 size={20} />
                Edit
              </button>
            ) : (
              <>
                <button className="cancel-button" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="save-button" onClick={handleSave}>
                  <Save size={20} />
                  Save
                </button>
              </>
            )}
          </div>
        </div>

        <div className="modal-content">
          <div className="fields-grid">
            {fields.map(field => (
              <div key={field.key} className={`field-group ${field.type === 'textarea' ? 'full-width' : ''}`}>
                <label className="field-label">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    className="field-input textarea"
                    value={formData[field.key] || ''}
                    onChange={(e) => {
                      handleInputChange(field.key, e.target.value);
                      handleTextareaResize(e);
                    }}
                    onInput={handleTextareaResize}
                    disabled={!isEditing}
                    rows={4}
                    placeholder={isEditing ? `Enter ${field.label.toLowerCase()}` : 'Not specified'}
                    tabIndex={isEditing ? 0 : -1}
                  />
                ) : (
                  <input
                    type="text"
                    className="field-input"
                    value={formData[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    disabled={!isEditing}
                    placeholder={isEditing ? `Enter ${field.label.toLowerCase()}` : 'Not specified'}
                    tabIndex={isEditing ? 0 : -1}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationModal;