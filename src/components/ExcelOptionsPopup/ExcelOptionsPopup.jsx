import React from 'react';
import { Upload, Download } from 'lucide-react';
import './ExcelOptionsPopup.css';

const ExcelOptionsPopup = ({ isOpen, onClose, onUpload, onDownload }) => {
  if (!isOpen) return null;

  return (
    <div className="excel-options-popup-overlay">
      <div className="excel-options-popup">
        <div className="excel-options-header">
          <h2>Excel Options</h2>
        </div>
        
        <div className="excel-options-content">
          <p className="excel-options-description">
            Choose an option to manage your medications data
          </p>
          
          <div className="excel-options-buttons">
            <button 
              className="excel-option-button upload"
              onClick={onUpload}
            >
              <Upload size={24} />
              <span>Upload Excel Sheet</span>
            </button>
            
            <button 
              className="excel-option-button download"
              onClick={onDownload}
            >
              <Download size={24} />
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>
        
        <div className="excel-options-footer">
          <button className="excel-cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExcelOptionsPopup;