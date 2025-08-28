import React, { useState, useEffect } from 'react';
import { X, Edit3, Save, ArrowLeft, Trash2, Edit2 } from 'lucide-react';
import CustomFields from '../CustomFields/CustomFields';
import './HaeMedicationModal.css';

const HaeMedicationModal = ({ 
  medication, 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  onRequestEdit,
  allowEdit = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    drug: '',
    brand: '',
    company: '',
    source: '',
    moa: '',
    adminRoute: '',
    concentration: '',
    strength: '',
    filter: '',
    dosing: '',
    maxDose: '',
    bbw: '',
    pregCategoryLactation: '',
    se: '',
    rateAdmin: '',
    reconAmt: '',
    howSupplied: '',
    storage: '',
    extraNotes: '',
    customFields: []
  });

  useEffect(() => {
    if (medication) {
      setFormData({
        drug: medication.drug || '',
        brand: medication.brand || '',
        company: medication.company || '',
        source: medication.source || '',
        moa: medication.moa || '',
        adminRoute: medication.adminRoute || '',
        concentration: medication.concentration || '',
        strength: medication.strength || '',
        filter: medication.filter || '',
        dosing: medication.dosing || '',
        maxDose: medication.maxDose || '',
        bbw: medication.bbw || '',
        pregCategoryLactation: medication.pregCategoryLactation || '',
        se: medication.se || '',
        rateAdmin: medication.rateAdmin || '',
        reconAmt: medication.reconAmt || '',
        howSupplied: medication.howSupplied || '',
        storage: medication.storage || '',
        extraNotes: medication.extraNotes || '',
        customFields: medication.customFields || []
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

  const handleAddCustomField = (field) => {
    setFormData(prev => ({
      ...prev,
      customFields: [...prev.customFields, field]
    }));
  };

  const handleUpdateCustomField = (fieldId, field, value) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.map(cf =>
        cf.id === fieldId ? { ...cf, [field]: value } : cf
      )
    }));
  };

  const handleDeleteCustomField = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      customFields: prev.customFields.filter(cf => cf.id !== fieldId)
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
      drug: medication?.drug || '',
      brand: medication?.brand || '',
      company: medication?.company || '',
      source: medication?.source || '',
      moa: medication?.moa || '',
      adminRoute: medication?.adminRoute || '',
      concentration: medication?.concentration || '',
      strength: medication?.strength || '',
      filter: medication?.filter || '',
      dosing: medication?.dosing || '',
      maxDose: medication?.maxDose || '',
      bbw: medication?.bbw || '',
      pregCategoryLactation: medication?.pregCategoryLactation || '',
      se: medication?.se || '',
      rateAdmin: medication?.rateAdmin || '',
      reconAmt: medication?.reconAmt || '',
      howSupplied: medication?.howSupplied || '',
      storage: medication?.storage || '',
      extraNotes: medication?.extraNotes || '',
      customFields: medication?.customFields || []
    });
    setIsEditing(false);
  };

  const handleEdit = () => {
    onRequestEdit();
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this HAE medication?')) {
      onDelete(medication.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-prescription-profile">
      <div className="modal-profile-header">
        <h1 className="modal-profile-title">
          {isEditing ? (medication?.isNew ? 'NEW HAE MEDICATION' : `EDITING: ${medication?.brand?.toUpperCase() || 'HAE MEDICATION'}`) : (medication?.brand?.toUpperCase() || 'HAE MEDICATION')}
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
          <button className="modal-header-back-button" onClick={onClose}>
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
              value={formData.drug}
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
                  <th>BRAND</th>
                  <th>COMPANY</th>
                  <th>SOURCE</th>
                  <th>MOA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.brand}
                        onChange={(e) => handleInputChange('brand', e.target.value)}
                        placeholder="ENTER BRAND"
                      />
                    ) : (
                      formData.brand || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        placeholder="ENTER COMPANY"
                      />
                    ) : (
                      formData.company || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.source}
                        onChange={(e) => handleInputChange('source', e.target.value)}
                        placeholder="ENTER SOURCE"
                      />
                    ) : (
                      formData.source || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={formData.moa}
                        onChange={(e) => handleInputChange('moa', e.target.value)}
                        placeholder="Enter MOA"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {formData.moa || 'Not specified'}
                      </div>
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
                  <th>ADMIN ROUTE</th>
                  <th>CONCENTRATION</th>
                  <th>STRENGTH</th>
                  <th>FILTER</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.adminRoute}
                        onChange={(e) => handleInputChange('adminRoute', e.target.value)}
                        placeholder="ENTER ROUTE"
                      />
                    ) : (
                      formData.adminRoute || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.concentration}
                        onChange={(e) => handleInputChange('concentration', e.target.value)}
                        placeholder="ENTER CONC."
                      />
                    ) : (
                      formData.concentration || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.strength}
                        onChange={(e) => handleInputChange('strength', e.target.value)}
                        placeholder="ENTER STRENGTH"
                      />
                    ) : (
                      formData.strength || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.filter}
                        onChange={(e) => handleInputChange('filter', e.target.value)}
                        placeholder="ENTER FILTER"
                      />
                    ) : (
                      formData.filter || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Third Table - Dosing Information */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Dosing Information</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>DOSING</th>
                  <th>MAX DOSE</th>
                  <th>RATE ADMIN</th>
                  <th>RECON AMT</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={formData.dosing}
                        onChange={(e) => handleInputChange('dosing', e.target.value)}
                        placeholder="Enter dosing"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {formData.dosing || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.maxDose}
                        onChange={(e) => handleInputChange('maxDose', e.target.value)}
                        placeholder="ENTER MAX DOSE"
                      />
                    ) : (
                      formData.maxDose || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.rateAdmin}
                        onChange={(e) => handleInputChange('rateAdmin', e.target.value)}
                        placeholder="ENTER RATE"
                      />
                    ) : (
                      formData.rateAdmin || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.reconAmt}
                        onChange={(e) => handleInputChange('reconAmt', e.target.value)}
                        placeholder="ENTER RECON AMT"
                      />
                    ) : (
                      formData.reconAmt || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fourth Table - Supply & Storage */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Supply & Storage</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>HOW SUPPLIED</th>
                  <th>STORAGE</th>
                  <th>BBW</th>
                  <th>PREG/LACTATION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.howSupplied}
                        onChange={(e) => handleInputChange('howSupplied', e.target.value)}
                        placeholder="ENTER HOW SUPPLIED"
                      />
                    ) : (
                      formData.howSupplied || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.storage}
                        onChange={(e) => handleInputChange('storage', e.target.value)}
                        placeholder="ENTER STORAGE"
                      />
                    ) : (
                      formData.storage || 'Not specified'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={formData.bbw}
                        onChange={(e) => handleInputChange('bbw', e.target.value)}
                        placeholder="Enter BBW"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {formData.bbw || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="modal-table-input"
                        value={formData.pregCategoryLactation}
                        onChange={(e) => handleInputChange('pregCategoryLactation', e.target.value)}
                        placeholder="Enter category"
                      />
                    ) : (
                      formData.pregCategoryLactation || 'Not specified'
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fifth Table - Additional Information */}
        <div className="modal-table-section">
          <h3 className="modal-table-title">Additional Information</h3>
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <thead>
                <tr>
                  <th>SIDE EFFECTS</th>
                  <th>EXTRA NOTES</th>
                  <th>STATUS</th>
                  <th>LAST UPDATED</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={formData.se}
                        onChange={(e) => handleInputChange('se', e.target.value)}
                        placeholder="Enter side effects"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {formData.se || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={formData.extraNotes}
                        onChange={(e) => handleInputChange('extraNotes', e.target.value)}
                        placeholder="Enter extra notes"
                        rows="3"
                      />
                    ) : (
                      <div className="modal-field-display">
                        {formData.extraNotes || 'Not specified'}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="modal-field-display">
                      {medication?.isNew ? 'New' : 'Active'}
                    </div>
                  </td>
                  <td>
                    <div className="modal-field-display">
                      {new Date().toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="modal-table-section">
          <CustomFields
            customFields={formData.customFields}
            isEditing={isEditing}
            onAddField={handleAddCustomField}
            onUpdateField={handleUpdateCustomField}
            onDeleteField={handleDeleteCustomField}
          />
        </div>

        {/* Action buttons moved to header */}
      </div>
    </div>
  );
};

export default HaeMedicationModal;