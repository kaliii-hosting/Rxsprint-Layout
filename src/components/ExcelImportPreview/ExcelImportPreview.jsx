import React, { useState } from 'react';
import { 
  X, CheckCircle, AlertCircle, Upload, 
  FileSpreadsheet, Eye, EyeOff, RefreshCw,
  AlertTriangle, Check
} from 'lucide-react';
import './ExcelImportPreview.css';

const ExcelImportPreview = ({ 
  isOpen, 
  parsedData, 
  onConfirm, 
  onCancel,
  existingMedications = []
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(true);
  const [importMode, setImportMode] = useState('create'); // 'create' or 'update'
  const [showDetails, setShowDetails] = useState(true);

  if (!isOpen || !parsedData) return null;

  const { data = [], errors = [], rowCount = 0 } = parsedData;

  // Check for duplicates with existing medications
  const analyzedData = data.map((row, index) => {
    const existing = existingMedications.find(med => 
      med.brandName?.toLowerCase() === row.brandName?.toLowerCase() &&
      med.genericName?.toLowerCase() === row.genericName?.toLowerCase()
    );
    
    return {
      ...row,
      rowIndex: index + 2, // Excel rows start at 1, plus header
      isDuplicate: !!existing,
      existingId: existing?.id,
      existingMedCode: existing?.medicationCode,
      selected: !selectedRows.length ? true : selectedRows.includes(index)
    };
  });

  const duplicateCount = analyzedData.filter(row => row.isDuplicate).length;
  const newCount = analyzedData.filter(row => !row.isDuplicate).length;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(analyzedData.map((_, index) => index));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (index) => {
    if (selectedRows.includes(index)) {
      setSelectedRows(selectedRows.filter(i => i !== index));
    } else {
      setSelectedRows([...selectedRows, index]);
    }
  };

  const handleConfirm = () => {
    const selectedData = analyzedData.filter((row, index) => 
      !selectedRows.length ? true : selectedRows.includes(index)
    );
    
    onConfirm({
      data: selectedData,
      mode: importMode,
      totalSelected: selectedData.length
    });
  };

  const getSelectedCount = () => {
    return selectedRows.length || analyzedData.length;
  };

  return (
    <div className="import-preview-overlay" onClick={onCancel}>
      <div className="import-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="header-title">
            <FileSpreadsheet size={24} />
            <h2>Import Preview</h2>
          </div>
          <button className="close-button" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <div className="preview-summary">
          <div className="summary-card total">
            <FileSpreadsheet size={20} />
            <div>
              <span className="count">{rowCount}</span>
              <span className="label">Total Rows</span>
            </div>
          </div>
          
          <div className="summary-card new">
            <CheckCircle size={20} />
            <div>
              <span className="count">{newCount}</span>
              <span className="label">New Medications</span>
            </div>
          </div>
          
          <div className="summary-card duplicate">
            <RefreshCw size={20} />
            <div>
              <span className="count">{duplicateCount}</span>
              <span className="label">Existing</span>
            </div>
          </div>
          
          <div className="summary-card errors">
            <AlertCircle size={20} />
            <div>
              <span className="count">{errors.length}</span>
              <span className="label">Errors</span>
            </div>
          </div>
        </div>

        {duplicateCount > 0 && (
          <div className="import-mode-selector">
            <label className="mode-option">
              <input
                type="radio"
                value="create"
                checked={importMode === 'create'}
                onChange={(e) => setImportMode(e.target.value)}
              />
              <span>Create all as new medications</span>
            </label>
            <label className="mode-option">
              <input
                type="radio"
                value="update"
                checked={importMode === 'update'}
                onChange={(e) => setImportMode(e.target.value)}
              />
              <span>Update existing medications</span>
            </label>
          </div>
        )}

        <div className="preview-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
            />
            <span>Select All ({analyzedData.length})</span>
          </label>
          
          <button 
            className="toggle-details"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        <div className="preview-table-container">
          <table className="preview-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Row</th>
                <th>Status</th>
                <th>Brand Name</th>
                <th>Generic Name</th>
                {showDetails && (
                  <>
                    <th>Indication</th>
                    <th>Dosage Form</th>
                    <th>Vial Size</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {analyzedData.map((row, index) => (
                <tr 
                  key={index} 
                  className={`${row.isDuplicate ? 'duplicate-row' : ''} ${row.selected ? 'selected' : ''}`}
                >
                  <td className="checkbox-col">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => handleSelectRow(index)}
                    />
                  </td>
                  <td className="row-number">{row.rowIndex}</td>
                  <td className="status-col">
                    {row.isDuplicate ? (
                      <span className="status-badge duplicate">
                        <RefreshCw size={14} />
                        {importMode === 'update' ? 'Update' : 'Duplicate'}
                      </span>
                    ) : (
                      <span className="status-badge new">
                        <Check size={14} />
                        New
                      </span>
                    )}
                  </td>
                  <td className="brand-name">{row.brandName || '-'}</td>
                  <td className="generic-name">{row.genericName || '-'}</td>
                  {showDetails && (
                    <>
                      <td>{row.indication || '-'}</td>
                      <td>{row.dosageForm || '-'}</td>
                      <td>{row.vialSize || '-'}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {errors.length > 0 && (
          <div className="error-section">
            <h3 className="error-title">
              <AlertTriangle size={18} />
              Import Errors ({errors.length})
            </h3>
            <div className="error-list">
              {errors.map((error, index) => (
                <div key={index} className="error-item">
                  <span className="error-row">Row {error.row}:</span>
                  <span className="error-message">{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="preview-actions">
          <button className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="import-btn"
            onClick={handleConfirm}
            disabled={getSelectedCount() === 0}
          >
            <Upload size={18} />
            Import {getSelectedCount()} Medication{getSelectedCount() !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelImportPreview;