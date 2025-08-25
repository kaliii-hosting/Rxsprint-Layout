import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, AlertCircle, Trash2, Edit3, ArrowLeft } from 'lucide-react';
import './ScdMedicationModal.css';

const ScdMedicationModal = ({ medication, isOpen, onClose, onSave, allowEdit = false, onRequestEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMedication, setEditedMedication] = useState({});
  const [showSaveWarning, setShowSaveWarning] = useState(false);

  useEffect(() => {
    if (medication) {
      setEditedMedication({
        drug: medication.drug || '',
        generic: medication.generic || '',
        indication: medication.indication || '',
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        rateAdministered: medication.rateAdministered || '',
        howSupplied: medication.howSupplied || '',
        vialSizes: medication.vialSizes || '',
        dilutionSolution: medication.dilutionSolution || '',
        reconstitutionSolution: medication.reconstitutionSolution || '',
        sideEffects: medication.sideEffects || '',
        nsBagsD5w: medication.nsBagsD5w || '',
        overfill: medication.overfill || '',
        preMedRecommendation: medication.preMedRecommendation || '',
        filters: medication.filters || '',
        storageAndHandling: medication.storageAndHandling || '',
        extendedStability: medication.extendedStability || '',
        bbw: medication.bbw || '',
        specialNotes: medication.specialNotes || '',
        additionalNotes: medication.additionalNotes || '',
        pregnancyCategory: medication.pregnancyCategory || ''
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
    setEditedMedication(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    if (!editedMedication.drug) {
      alert('Drug name is required');
      return;
    }
    // Include the medication ID and all fields when saving
    onSave({
      ...medication,
      ...editedMedication,
      id: medication.id
    });
    setIsEditing(false);
    setShowSaveWarning(false);
  };

  const handleCancel = () => {
    setEditedMedication({
      drug: medication?.drug || '',
      generic: medication?.generic || '',
      indication: medication?.indication || '',
      dosage: medication?.dosage || '',
      frequency: medication?.frequency || '',
      rateAdministered: medication?.rateAdministered || '',
      howSupplied: medication?.howSupplied || '',
      vialSizes: medication?.vialSizes || '',
      dilutionSolution: medication?.dilutionSolution || '',
      reconstitutionSolution: medication?.reconstitutionSolution || '',
      sideEffects: medication?.sideEffects || '',
      nsBagsD5w: medication?.nsBagsD5w || '',
      overfill: medication?.overfill || '',
      preMedRecommendation: medication?.preMedRecommendation || '',
      filters: medication?.filters || '',
      storageAndHandling: medication?.storageAndHandling || '',
      extendedStability: medication?.extendedStability || '',
      bbw: medication?.bbw || '',
      specialNotes: medication?.specialNotes || '',
      additionalNotes: medication?.additionalNotes || '',
      pregnancyCategory: medication?.pregnancyCategory || ''
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    onRequestEdit();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this SCD medication?')) {
      onDelete(medication);
    }
  };

  const handleClose = () => {
    if (isEditing && JSON.stringify(editedMedication) !== JSON.stringify(medication)) {
      setShowSaveWarning(true);
    } else {
      onClose();
    }
  };

  const confirmClose = () => {
    setShowSaveWarning(false);
    setIsEditing(false);
    setEditedMedication(medication || {});
    onClose();
  };

  const cancelClose = () => {
    setShowSaveWarning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-prescription-profile">
      {/* Modal Header - Matching HAE/Lyso style */}
      <div className="modal-profile-header">
        <h1 className="modal-profile-title">
          {isEditing ? (medication?.isNew ? 'NEW SCD MEDICATION' : `EDITING: ${medication?.drug?.toUpperCase() || 'SCD MEDICATION'}`) : (medication?.drug?.toUpperCase() || 'SCD MEDICATION')}
        </h1>
        <div className="modal-header-actions">
          {!isEditing ? (
            <>
              <button className="modal-header-icon-button" onClick={handleEdit} title="Edit">
                <Edit2 size={20} />
              </button>
              <button className="modal-header-icon-button delete" onClick={handleDelete} title="Delete">
                <Trash2 size={20} />
              </button>
            </>
          ) : (
            <>
              <button className="modal-header-icon-button save" onClick={handleSave} title="Save">
                <Save size={20} />
              </button>
              <button className="modal-header-icon-button cancel" onClick={handleCancel} title="Cancel">
                <X size={20} />
              </button>
            </>
          )}
          <button className="modal-header-back-button" onClick={handleClose}>
            <ArrowLeft size={18} />
            Back to Medications
          </button>
        </div>
      </div>

      <div className="modal-prescriptions-section">
        {isEditing && (
          <div className="modal-brand-name-section">
            <input
              className="modal-brand-name-input"
              value={editedMedication.drug}
              onChange={(e) => handleInputChange('drug', e.target.value)}
              placeholder="Enter drug name"
            />
          </div>
        )}

        {/* First Table - Basic Information */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Basic Information</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>DRUG</th>
                  <th>GENERIC</th>
                  <th>INDICATION</th>
                  <th>DOSAGE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.drug}
                        onChange={(e) => handleInputChange('drug', e.target.value)}
                        placeholder="ENTER DRUG"
                      />
                    ) : (
                      editedMedication.drug || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.generic}
                        onChange={(e) => handleInputChange('generic', e.target.value)}
                        placeholder="ENTER GENERIC"
                      />
                    ) : (
                      editedMedication.generic || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={editedMedication.indication}
                        onChange={(e) => handleInputChange('indication', e.target.value)}
                        placeholder="Enter indication"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {editedMedication.indication || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.dosage}
                        onChange={(e) => handleInputChange('dosage', e.target.value)}
                        placeholder="ENTER DOSAGE"
                      />
                    ) : (
                      editedMedication.dosage || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Second Table - Administration Details */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Administration Details</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>FREQUENCY</th>
                  <th>RATE ADMINISTERED</th>
                  <th>HOW SUPPLIED</th>
                  <th>VIAL SIZES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.frequency}
                        onChange={(e) => handleInputChange('frequency', e.target.value)}
                        placeholder="ENTER FREQUENCY"
                      />
                    ) : (
                      editedMedication.frequency || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.rateAdministered}
                        onChange={(e) => handleInputChange('rateAdministered', e.target.value)}
                        placeholder="ENTER RATE"
                      />
                    ) : (
                      editedMedication.rateAdministered || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.howSupplied}
                        onChange={(e) => handleInputChange('howSupplied', e.target.value)}
                        placeholder="ENTER SUPPLY"
                      />
                    ) : (
                      editedMedication.howSupplied || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.vialSizes}
                        onChange={(e) => handleInputChange('vialSizes', e.target.value)}
                        placeholder="ENTER VIAL SIZE"
                      />
                    ) : (
                      editedMedication.vialSizes || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Third Table - Preparation Information */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Preparation Information</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>DILUTION SOLUTION</th>
                  <th>RECONSTITUTION</th>
                  <th>NS BAGS/D5W</th>
                  <th>OVERFILL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.dilutionSolution}
                        onChange={(e) => handleInputChange('dilutionSolution', e.target.value)}
                        placeholder="ENTER DILUTION"
                      />
                    ) : (
                      editedMedication.dilutionSolution || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.reconstitutionSolution}
                        onChange={(e) => handleInputChange('reconstitutionSolution', e.target.value)}
                        placeholder="ENTER RECON"
                      />
                    ) : (
                      editedMedication.reconstitutionSolution || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.nsBagsD5w}
                        onChange={(e) => handleInputChange('nsBagsD5w', e.target.value)}
                        placeholder="ENTER NS/D5W"
                      />
                    ) : (
                      editedMedication.nsBagsD5w || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.overfill}
                        onChange={(e) => handleInputChange('overfill', e.target.value)}
                        placeholder="ENTER OVERFILL"
                      />
                    ) : (
                      editedMedication.overfill || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fourth Table - Safety & Handling */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Safety & Handling</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>FILTERS</th>
                  <th>PRE-MED</th>
                  <th>STORAGE</th>
                  <th>STABILITY</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.filters}
                        onChange={(e) => handleInputChange('filters', e.target.value)}
                        placeholder="ENTER FILTERS"
                      />
                    ) : (
                      editedMedication.filters || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={editedMedication.preMedRecommendation}
                        onChange={(e) => handleInputChange('preMedRecommendation', e.target.value)}
                        placeholder="Enter pre-med"
                        rows="2"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {editedMedication.preMedRecommendation || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={editedMedication.storageAndHandling}
                        onChange={(e) => handleInputChange('storageAndHandling', e.target.value)}
                        placeholder="Enter storage"
                        rows="2"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {editedMedication.storageAndHandling || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.extendedStability}
                        onChange={(e) => handleInputChange('extendedStability', e.target.value)}
                        placeholder="ENTER STABILITY"
                      />
                    ) : (
                      editedMedication.extendedStability || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fifth Table - Clinical Information */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Clinical Information</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>SIDE EFFECTS</th>
                  <th>BBW</th>
                  <th>PREGNANCY CATEGORY</th>
                  <th>SPECIAL NOTES</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={editedMedication.sideEffects}
                        onChange={(e) => handleInputChange('sideEffects', e.target.value)}
                        placeholder="Enter side effects"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {editedMedication.sideEffects || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={editedMedication.bbw}
                        onChange={(e) => handleInputChange('bbw', e.target.value)}
                        placeholder="Enter BBW"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {editedMedication.bbw || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={editedMedication.pregnancyCategory}
                        onChange={(e) => handleInputChange('pregnancyCategory', e.target.value)}
                        placeholder="CATEGORY"
                      />
                    ) : (
                      editedMedication.pregnancyCategory || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={editedMedication.specialNotes}
                        onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                        placeholder="Enter notes"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {editedMedication.specialNotes || 'Not specified'}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Notes Section */}
        {editedMedication.additionalNotes && (
          <div className="modal-table-section">
            <h3 className="modal-table-title">Additional Notes</h3>
            <div className="modal-table-wrapper">
              <div className="modal-notes-section">
                {isEditing ? (
                  <textarea
                    className="modal-table-input modal-textarea-large"
                    value={editedMedication.additionalNotes}
                    onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                    placeholder="Enter additional notes"
                    rows="5"
                  />
                ) : (
                  <div className="modal-field-display">
                    {editedMedication.additionalNotes}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Warning Modal */}
      {showSaveWarning && (
        <div className="warning-overlay">
          <div className="warning-modal">
            <AlertCircle size={24} className="warning-icon" />
            <h3>Unsaved Changes</h3>
            <p>You have unsaved changes. Are you sure you want to close without saving?</p>
            <div className="warning-actions">
              <button className="cancel-button" onClick={cancelClose}>
                Continue Editing
              </button>
              <button className="confirm-button" onClick={confirmClose}>
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScdMedicationModal;