import React, { useState, useEffect } from 'react';
import { 
  X, Edit3, Save, ArrowLeft
} from 'lucide-react';
import './MedicationModal.css';

const MedicationModal = ({ medication, isOpen, onClose, onSave, onRequestEdit, allowEdit, onDelete }) => {
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
      
      if (allowEdit) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    }
  }, [medication, allowEdit]);

  useEffect(() => {
    if (allowEdit && medication?.isNew) {
      setIsEditing(true);
    }
  }, [allowEdit, medication]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!medication || !medication.id) {
      console.error('Cannot save: No medication or medication ID');
      return;
    }
    
    const dataToSave = {
      ...medication,
      ...formData,
      id: medication.id
    };
    
    onSave(dataToSave);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      brandName: medication?.brandName || '',
      indication: medication?.indication || '',
      genericName: medication?.genericName || '',
      dosageForm: medication?.dosageForm || '',
      vialSize: medication?.vialSize || '',
      reconstitutionSolution: medication?.reconstitutionSolution || '',
      reconstitutionVolume: medication?.reconstitutionVolume || '',
      dose: medication?.dose || '',
      doseFrequency: medication?.doseFrequency || '',
      infusionRate: medication?.infusionRate || '',
      normalSalineBag: medication?.normalSalineBag || '',
      overfillRule: medication?.overfillRule || '',
      filter: medication?.filter || '',
      infusionSteps: medication?.infusionSteps || '',
      notes: medication?.notes || '',
      specialDosing: medication?.specialDosing || ''
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    onRequestEdit();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this medication?')) {
      onDelete(medication.id);
    }
  };

  const updateFieldAndSave = (field, value) => {
    const updatedData = {
      ...medication,
      ...formData,
      [field]: value,
      id: medication.id
    };
    onSave(updatedData);
  };

  const incrementDecrementValues = [
    { field: 'vialSize', label: 'Vial Size' },
    { field: 'reconstitutionVolume', label: 'Reconstitution Volume' },
    { field: 'dose', label: 'Dose' },
    { field: 'infusionRate', label: 'Infusion Rate' },
    { field: 'normalSalineBag', label: 'Normal Saline Bag' }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-prescription-profile">
          <div className="modal-profile-header">
            <h1 className="modal-profile-title">
              {isEditing ? (medication?.isNew ? 'NEW MEDICATION' : `EDITING: ${medication?.brandName?.toUpperCase() || 'MEDICATION'}`) : (medication?.brandName?.toUpperCase() || 'MEDICATION')}
            </h1>
            <button className="modal-header-back-button" onClick={onClose}>
              <ArrowLeft size={18} />
              Back to Medications
            </button>
          </div>
          
          <div className="modal-prescriptions-section">
            {isEditing && (
              <div className="modal-brand-name-section">
                <input
                  className="modal-brand-name-input"
                  value={formData.brandName}
                  onChange={(e) => handleInputChange('brandName', e.target.value)}
                  placeholder="Enter brand name"
                />
              </div>
            )}
            
            <div className="modal-table-wrapper">
              <table className="modal-prescriptions-table">
                <thead>
                  <tr>
                    <th>Indication</th>
                    <th>Generic Name</th>
                    <th>Dosage Form</th>
                    <th>Vial Size</th>
                    <th>Reconstitution Solution</th>
                    <th>Reconstitution Volume</th>
                    <th>Dose</th>
                    <th>Dose Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {isEditing ? (
                        <textarea
                          className="modal-table-input"
                          value={formData.indication}
                          onChange={(e) => handleInputChange('indication', e.target.value)}
                          placeholder="Enter indication"
                          rows="2"
                        />
                      ) : (
                        <div className="modal-field-display">
                          {formData.indication || 'Not specified'}
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.genericName}
                          onChange={(e) => handleInputChange('genericName', e.target.value)}
                          placeholder="Enter generic name"
                        />
                      ) : (
                        formData.genericName || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.dosageForm}
                          onChange={(e) => handleInputChange('dosageForm', e.target.value)}
                          placeholder="Enter dosage form"
                        />
                      ) : (
                        formData.dosageForm || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.vialSize}
                          onChange={(e) => handleInputChange('vialSize', e.target.value)}
                          placeholder="Enter vial size"
                        />
                      ) : (
                        formData.vialSize || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.reconstitutionSolution}
                          onChange={(e) => handleInputChange('reconstitutionSolution', e.target.value)}
                          placeholder="Enter solution"
                        />
                      ) : (
                        formData.reconstitutionSolution || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.reconstitutionVolume}
                          onChange={(e) => handleInputChange('reconstitutionVolume', e.target.value)}
                          placeholder="Enter volume"
                        />
                      ) : (
                        formData.reconstitutionVolume || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.dose}
                          onChange={(e) => handleInputChange('dose', e.target.value)}
                          placeholder="Enter dose"
                        />
                      ) : (
                        formData.dose || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.doseFrequency}
                          onChange={(e) => handleInputChange('doseFrequency', e.target.value)}
                          placeholder="Enter frequency"
                        />
                      ) : (
                        formData.doseFrequency || 'Not specified'
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="modal-table-wrapper">
              <table className="modal-prescriptions-table">
                <thead>
                  <tr>
                    <th>Infusion Rate</th>
                    <th>Normal Saline Bag</th>
                    <th>Overfill Rule</th>
                    <th>Filter</th>
                    <th>Infusion Steps</th>
                    <th>Notes</th>
                    <th>Special Dosing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.infusionRate}
                          onChange={(e) => handleInputChange('infusionRate', e.target.value)}
                          placeholder="Enter rate"
                        />
                      ) : (
                        formData.infusionRate || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.normalSalineBag}
                          onChange={(e) => handleInputChange('normalSalineBag', e.target.value)}
                          placeholder="Enter bag size"
                        />
                      ) : (
                        formData.normalSalineBag || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.overfillRule}
                          onChange={(e) => handleInputChange('overfillRule', e.target.value)}
                          placeholder="Enter rule"
                        />
                      ) : (
                        formData.overfillRule || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          className="modal-table-input"
                          value={formData.filter}
                          onChange={(e) => handleInputChange('filter', e.target.value)}
                          placeholder="Enter filter"
                        />
                      ) : (
                        formData.filter || 'Not specified'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <textarea
                          className="modal-table-input"
                          value={formData.infusionSteps}
                          onChange={(e) => handleInputChange('infusionSteps', e.target.value)}
                          placeholder="Enter infusion steps"
                          rows="2"
                        />
                      ) : (
                        <div className="modal-field-display">
                          {formData.infusionSteps || 'Not specified'}
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <textarea
                          className="modal-table-input"
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          placeholder="Enter notes"
                          rows="2"
                        />
                      ) : (
                        <div className="modal-field-display">
                          {formData.notes || 'Not specified'}
                        </div>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <textarea
                          className="modal-table-input"
                          value={formData.specialDosing}
                          onChange={(e) => handleInputChange('specialDosing', e.target.value)}
                          placeholder="Enter dosing"
                          rows="2"
                        />
                      ) : (
                        <div className="modal-field-display">
                          {formData.specialDosing || 'Not specified'}
                        </div>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div className="modal-prescription-actions">
                {!isEditing ? (
                  <>
                    <button className="modal-prescription-btn edit" onClick={handleEdit} style={{ color: 'white' }}>
                      Edit
                    </button>
                    <button className="modal-prescription-btn delete" onClick={handleDelete} style={{ color: 'white' }}>
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button className="modal-prescription-btn save" onClick={handleSave} style={{ color: 'white' }}>
                      Save
                    </button>
                    <button className="modal-prescription-btn cancel" onClick={handleCancel} style={{ color: 'white' }}>
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
  );
};

export default MedicationModal;