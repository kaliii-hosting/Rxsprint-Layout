import React, { useState, useRef } from 'react';
import { Edit2, Trash2, Plus, Upload, Grid, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { parseExcelFile } from '../../utils/excelParser';
import { downloadExcelTemplate } from '../../utils/excelTemplate';
import MedicationModal from '../../components/MedicationModal/MedicationModal';
import './Medications.css';

const Medications = () => {
  const [medications, setMedications] = useState([
    {
      id: 1,
      brandName: 'Tafluprost',
      genericName: 'Tafluprost',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '0.0015%',
      selected: false
    },
    {
      id: 2,
      brandName: 'Fluocinolone',
      genericName: 'Fluocinolone acetonide',
      indication: 'Inflammation',
      dosageForm: 'Topical',
      vialSize: '0.01%',
      selected: false
    },
    {
      id: 3,
      brandName: 'Dorzolamide',
      genericName: 'Dorzolamide HCl',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '2%',
      selected: false
    },
    {
      id: 4,
      brandName: 'Latanoprost',
      genericName: 'Latanoprost',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '0.005%',
      selected: false
    },
    {
      id: 5,
      brandName: 'Prednisolone',
      genericName: 'Prednisolone acetate',
      indication: 'Inflammation',
      dosageForm: 'Eye drops',
      vialSize: '1%',
      selected: false
    },
    {
      id: 6,
      brandName: 'Brinzolamide',
      genericName: 'Brinzolamide',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '1%',
      selected: false
    },
    {
      id: 7,
      brandName: 'Bimatoprost',
      genericName: 'Bimatoprost',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '0.03%',
      selected: false
    },
    {
      id: 8,
      brandName: 'Travoprost',
      genericName: 'Travoprost',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '0.004%',
      selected: false
    },
    {
      id: 9,
      brandName: 'Timolol',
      genericName: 'Timolol maleate',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '0.5%',
      selected: false
    },
    {
      id: 10,
      brandName: 'Brimonidine',
      genericName: 'Brimonidine tartrate',
      indication: 'Glaucoma',
      dosageForm: 'Eye drops',
      vialSize: '0.2%',
      selected: false
    },
    {
      id: 11,
      brandName: 'Cyclosporine',
      genericName: 'Cyclosporine',
      indication: 'Dry eye',
      dosageForm: 'Eye drops',
      vialSize: '0.05%',
      selected: false
    },
    {
      id: 12,
      brandName: 'Olopatadine',
      genericName: 'Olopatadine HCl',
      indication: 'Allergy',
      dosageForm: 'Eye drops',
      vialSize: '0.1%',
      selected: false
    },
    {
      id: 13,
      brandName: 'Nepafenac',
      genericName: 'Nepafenac',
      indication: 'Inflammation',
      dosageForm: 'Eye drops',
      vialSize: '0.1%',
      selected: false
    },
    {
      id: 14,
      brandName: 'Ketorolac',
      genericName: 'Ketorolac tromethamine',
      indication: 'Inflammation',
      dosageForm: 'Eye drops',
      vialSize: '0.5%',
      selected: false
    },
    {
      id: 15,
      brandName: 'Moxifloxacin',
      genericName: 'Moxifloxacin HCl',
      indication: 'Infection',
      dosageForm: 'Eye drops',
      vialSize: '0.5%',
      selected: false
    }
  ]);

  const [selectAll, setSelectAll] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setMedications(medications.map(med => ({ ...med, selected: newSelectAll })));
  };

  const handleSelectMedication = (id) => {
    setMedications(medications.map(med => 
      med.id === id ? { ...med, selected: !med.selected } : med
    ));
  };

  const handleEdit = (id) => {
    const medication = medications.find(med => med.id === id);
    if (medication) {
      handleRowClick(medication);
    }
  };

  const handleDelete = (id) => {
    setMedications(medications.filter(med => med.id !== id));
  };

  const handleAddDrug = () => {
    console.log('Add new drug');
    // TODO: Implement add drug functionality
  };

  const handleAddField = () => {
    console.log('Add new field');
    // TODO: Implement add field functionality
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Reset status
    setUploadStatus('uploading');
    setUploadMessage('Processing Excel file...');

    try {
      // Parse Excel file first
      setUploadMessage('Parsing Excel file...');
      const parseResult = await parseExcelFile(file);
      
      // Upload to Firebase Storage
      setUploadMessage('Uploading to Firebase Storage...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `medications/excel_${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Add parsed medications to the list
      setMedications(prevMeds => [...parseResult.data, ...prevMeds]);
      
      setUploadStatus('success');
      setUploadMessage(`Successfully imported ${parseResult.rowCount} medications from Excel`);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
      
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to import Excel file');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSelectAction = () => {
    const selectedMeds = medications.filter(med => med.selected);
    console.log('Selected medications:', selectedMeds);
    // TODO: Implement bulk actions
  };

  const handleRowClick = (medication) => {
    setSelectedMedication(medication);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMedication(null);
  };

  const handleModalSave = (updatedMedication) => {
    setMedications(medications.map(med => 
      med.id === updatedMedication.id ? updatedMedication : med
    ));
    setIsModalOpen(false);
    setSelectedMedication(null);
  };

  return (
    <div className="medications-page">
      <div className="medications-header">
        <h1 className="header-title">Medications</h1>
        <div className="header-actions">
          <button className="header-btn primary" onClick={handleAddDrug}>
            <Plus size={18} />
            Add Drug
          </button>
          <button className="header-btn" onClick={handleAddField}>
            <Grid size={18} />
            Add Field
          </button>
          <button className="header-btn" onClick={triggerFileInput}>
            <Upload size={18} />
            Import Excel
          </button>
          <button className="header-btn" onClick={downloadExcelTemplate} title="Download Excel template">
            <Download size={18} />
            Template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Upload Status Notification */}
      {uploadStatus && (
        <div className={`upload-notification ${uploadStatus}`}>
          <div className="notification-content">
            {uploadStatus === 'uploading' && <div className="spinner" />}
            {uploadStatus === 'success' && <CheckCircle size={20} />}
            {uploadStatus === 'error' && <AlertCircle size={20} />}
            <span>{uploadMessage}</span>
          </div>
        </div>
      )}

      <div className="medications-container">
        {medications.length > 0 ? (
          <div className="table-wrapper">
            <table className="medications-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      className="medication-checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Brand Name</th>
                  <th>Generic Name</th>
                  <th>Indication</th>
                  <th>Dosage Form</th>
                  <th>Vial Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medications.map((medication) => (
                  <tr 
                    key={medication.id} 
                    className={`${medication.selected ? 'selected' : ''} clickable-row`}
                    onClick={(e) => {
                      // Don't open modal if clicking on checkbox or action buttons
                      if (!e.target.closest('.checkbox-cell') && !e.target.closest('.actions-cell')) {
                        handleRowClick(medication);
                      }
                    }}
                  >
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        className="medication-checkbox"
                        checked={medication.selected}
                        onChange={() => handleSelectMedication(medication.id)}
                      />
                    </td>
                    <td className="brand-name">{medication.brandName}</td>
                    <td className="generic-name">{medication.genericName}</td>
                    <td className="indication">{medication.indication}</td>
                    <td className="dosage-form">{medication.dosageForm}</td>
                    <td className="vial-size">{medication.vialSize}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn edit"
                          onClick={() => handleEdit(medication.id)}
                          title="Edit medication"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(medication.id)}
                          title="Delete medication"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No medications added yet</h3>
            <p>Click "Add Drug" to start adding medications</p>
          </div>
        )}
      </div>

      {/* Medication Modal */}
      <MedicationModal
        medication={selectedMedication}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default Medications;