import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import './CustomFields.css';

const CustomFields = ({ 
  customFields = [], 
  isEditing = false, 
  onAddField, 
  onUpdateField, 
  onDeleteField 
}) => {
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ title: '', content: '' });

  const handleAddCustomField = () => {
    if (newField.title.trim() && newField.content.trim()) {
      onAddField({
        id: `field_${Date.now()}_${Math.random()}`,
        title: newField.title.trim(),
        content: newField.content.trim()
      });
      setNewField({ title: '', content: '' });
      setShowAddField(false);
    }
  };

  // If no fields and not editing, don't show the section at all
  if (customFields.length === 0 && !isEditing) {
    return null;
  }

  return (
    <>
      {/* Display each custom field with its own section header and table */}
      {customFields.map((field, index) => (
        <div className="modal-table-section" key={field.id}>
          {/* Section Header with field name - Like "ADDITIONAL INFORMATION" */}
          <h3 className="modal-table-title">
            {isEditing ? (
              <div className="custom-field-header-edit-inline">
                <input
                  type="text"
                  value={field.title}
                  onChange={(e) => onUpdateField(field.id, 'title', e.target.value)}
                  className="custom-field-title-input"
                  placeholder="Field name"
                />
                <button
                  onClick={() => onDeleteField(field.id)}
                  className="custom-field-delete-inline-btn"
                  type="button"
                  title="Delete field"
                >
                  <X size={14} />
                  Delete Field
                </button>
              </div>
            ) : (
              field.title.toUpperCase()
            )}
          </h3>
          
          {/* Table with full-width content - Like the Additional Information table */}
          <div className="modal-table-wrapper">
            <table className="modal-prescriptions-table">
              <tbody>
                <tr>
                  <td style={{ width: '100%' }}>
                    {isEditing ? (
                      <textarea
                        className="modal-table-input modal-textarea"
                        value={field.content}
                        onChange={(e) => onUpdateField(field.id, 'content', e.target.value)}
                        placeholder="Enter field content"
                        rows="4"
                        style={{ width: '100%', minHeight: '80px' }}
                      />
                    ) : (
                      <div className="modal-field-display">
                        {field.content}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Add Custom Field Button and Form */}
      {isEditing && (
        <div className="modal-table-section">
          {!showAddField ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <button
                className="add-custom-field-main-btn"
                onClick={() => setShowAddField(true)}
                type="button"
              >
                <Plus size={16} />
                Add Custom Field
              </button>
            </div>
          ) : (
            <>
              <h3 className="modal-table-title">ADD NEW CUSTOM FIELD</h3>
              <div className="modal-table-wrapper">
                <table className="modal-prescriptions-table">
                  <tbody>
                    <tr>
                      <td style={{ width: '30%', fontWeight: '600', fontSize: '12px', backgroundColor: '#f9f9f9' }}>
                        Field Name:
                      </td>
                      <td style={{ width: '70%' }}>
                        <input
                          type="text"
                          className="modal-table-input"
                          value={newField.title}
                          onChange={(e) => setNewField({ ...newField, title: e.target.value })}
                          placeholder="Enter field name (e.g., DOSAGE CALCULATION)"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: '600', fontSize: '12px', backgroundColor: '#f9f9f9' }}>
                        Field Content:
                      </td>
                      <td>
                        <textarea
                          className="modal-table-input modal-textarea"
                          value={newField.content}
                          onChange={(e) => setNewField({ ...newField, content: e.target.value })}
                          placeholder="Enter field content"
                          rows="4"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'right', padding: '10px', backgroundColor: '#f9f9f9' }}>
                        <button
                          onClick={() => {
                            setShowAddField(false);
                            setNewField({ title: '', content: '' });
                          }}
                          className="custom-field-form-cancel-btn"
                          type="button"
                          style={{ marginRight: '10px' }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddCustomField}
                          className="custom-field-form-save-btn"
                          type="button"
                        >
                          Save Field
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {customFields.length === 0 && !isEditing && !showAddField && (
        <div className="modal-table-section">
          <h3 className="modal-table-title">CUSTOM FIELDS</h3>
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#6c757d',
            fontSize: '14px',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px'
          }}>
            No custom fields added
          </div>
        </div>
      )}
    </>
  );
};

export default CustomFields;