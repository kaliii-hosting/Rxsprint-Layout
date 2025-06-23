import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Plus, Upload, Grid, FileSpreadsheet, CheckCircle, AlertCircle, Download, Pill } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { storage, firestore } from '../../config/firebase';
import { defaultMedications } from '../../data/defaultMedications';
import { parseExcelFile } from '../../utils/excelParser';
import { downloadExcelTemplate } from '../../utils/excelTemplate';
import MedicationModal from '../../components/MedicationModal/MedicationModal';
import ConfirmationPopup from '../../components/ConfirmationPopup/ConfirmationPopup';
import DeletionConfirmPopup from '../../components/DeletionConfirmPopup/DeletionConfirmPopup';
import EditConfirmPopup from '../../components/EditConfirmPopup/EditConfirmPopup';
import ExcelImportPreview from '../../components/ExcelImportPreview/ExcelImportPreview';
import ExcelOptionsPopup from '../../components/ExcelOptionsPopup/ExcelOptionsPopup';
import { generateMedicationCode } from '../../utils/medicationCode';
import { useLocation } from 'react-router-dom';
import { useSearch } from '../../contexts/SearchContext';
import './Medications.css';

const Medications = () => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectAll, setSelectAll] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [uploadMessage, setUploadMessage] = useState('');
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allowModalEdit, setAllowModalEdit] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [savedMedicationId, setSavedMedicationId] = useState(null);
  const [showDeletionPopup, setShowDeletionPopup] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState(null);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [medicationToEdit, setMedicationToEdit] = useState(null);
  const [editPopupMode, setEditPopupMode] = useState('edit'); // 'edit' or 'save'
  const [pendingSaveData, setPendingSaveData] = useState(null);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [parsedExcelData, setParsedExcelData] = useState(null);
  const [showExcelOptions, setShowExcelOptions] = useState(false);
  const fileInputRef = useRef(null);
  
  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Filter state
  const [showSterileSolutions, setShowSterileSolutions] = useState(false);
  const [showLyophilizedPowders, setShowLyophilizedPowders] = useState(false);
  const [showCapsules, setShowCapsules] = useState(false);
  
  const location = useLocation();
  const { loadMedications: reloadSearchData } = useSearch();

  // Load medications from Firebase on component mount
  useEffect(() => {
    loadMedications();
  }, []);

  // Handle navigation from search
  useEffect(() => {
    if (location.state?.selectedMedicationId && location.state?.openModal) {
      const medication = medications.find(med => med.id === location.state.selectedMedicationId);
      if (medication) {
        setSelectedMedication(medication);
        setIsModalOpen(true);
      }
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, medications]);

  const loadMedications = async () => {
    try {
      setLoading(true);
      
      // Check if firestore is available
      if (!firestore) {
        console.error('Firestore is not initialized, using default medications');
        // Use default medications as fallback
        const fallbackMedications = defaultMedications.map(med => ({
          ...med,
          selected: false
        }));
        
        // Sort medications alphabetically by brand name
        const sortedMedications = fallbackMedications.sort((a, b) => {
          const brandA = (a.brandName || '').toLowerCase();
          const brandB = (b.brandName || '').toLowerCase();
          return brandA.localeCompare(brandB);
        });
        
        setMedications(sortedMedications);
        setUploadStatus('error');
        setUploadMessage('Database connection not available. Running in offline mode with default medications.');
        
        // Clear message after delay
        setTimeout(() => {
          setUploadStatus(null);
          setUploadMessage('');
        }, 5000);
        return;
      }
      
      const medicationsRef = collection(firestore, 'medications');
      const snapshot = await getDocs(medicationsRef);
      
      const medicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        selected: false
      }));
      
      // Sort medications alphabetically by brand name
      const sortedMedications = medicationsData.sort((a, b) => {
        const brandA = (a.brandName || '').toLowerCase();
        const brandB = (b.brandName || '').toLowerCase();
        return brandA.localeCompare(brandB);
      });
      
      setMedications(sortedMedications);
      console.log(`Loaded ${sortedMedications.length} medications from Firebase`);
      
      // Also reload search data
      if (reloadSearchData) {
        reloadSearchData();
      }
    } catch (error) {
      console.error('Error loading medications:', error);
      console.error('Error details:', error.code, error.message);
      
      // Use default medications as fallback
      console.log('Loading default medications as fallback');
      const fallbackMedications = defaultMedications.map(med => ({
        ...med,
        selected: false
      }));
      
      // Sort medications alphabetically by brand name
      const sortedMedications = fallbackMedications.sort((a, b) => {
        const brandA = (a.brandName || '').toLowerCase();
        const brandB = (b.brandName || '').toLowerCase();
        return brandA.localeCompare(brandB);
      });
      
      setMedications(sortedMedications);
      
      setUploadStatus('error');
      if (error.code === 'permission-denied') {
        setUploadMessage('Permission denied. Please check Firebase security rules. Using default medications.');
      } else if (error.code === 'unavailable') {
        setUploadMessage('Firebase is unavailable. Using default medications.');
      } else {
        setUploadMessage(`Failed to load from Firebase. Using default medications.`);
      }
      
      // Clear message after delay
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

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
      setMedicationToEdit(medication);
      setEditPopupMode('edit');
      setShowEditPopup(true);
    }
  };

  const handleConfirmEdit = async () => {
    setShowEditPopup(false);
    if (editPopupMode === 'edit' && medicationToEdit) {
      setSelectedMedication(medicationToEdit);
      setAllowModalEdit(true);
      setIsModalOpen(true);
      setMedicationToEdit(null);
    } else if (editPopupMode === 'save' && pendingSaveData) {
      // Process the save after PIN confirmation
      await processMedicationSave(pendingSaveData);
    }
  };

  const handleRequestEditFromModal = () => {
    // Called when edit button is clicked inside the modal
    setMedicationToEdit(selectedMedication);
    setEditPopupMode('edit');
    setShowEditPopup(true);
  };

  const handleCancelEdit = () => {
    setShowEditPopup(false);
    setMedicationToEdit(null);
    setPendingSaveData(null);
  };

  const handleDelete = (id) => {
    const medication = medications.find(med => med.id === id);
    if (medication) {
      setMedicationToDelete(medication);
      setShowDeletionPopup(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!medicationToDelete) return;
    
    try {
      const id = medicationToDelete.id;
      console.log('Deleting medication with ID:', id, 'Type:', typeof id);
      
      // Ensure ID is a string
      const medicationId = String(id).trim();
      
      // Check if this is a numeric ID (not in Firebase)
      const isNumericId = /^\d+$/.test(medicationId);
      
      if (isNumericId) {
        // This medication is not in Firebase yet, just remove from local state
        setMedications(medications.filter(med => String(med.id) !== medicationId));
        
        setUploadStatus('success');
        setUploadMessage('Medication removed successfully');
      } else {
        // Delete from Firestore
        await deleteDoc(doc(firestore, 'medications', medicationId));
        
        // Update local state
        setMedications(medications.filter(med => med.id !== id));
        
        setUploadStatus('success');
        setUploadMessage('Medication deleted successfully');
      }
      
      // Also reload search data
      if (reloadSearchData) {
        reloadSearchData();
      }
      
      // Close deletion popup
      setShowDeletionPopup(false);
      setMedicationToDelete(null);
      
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error deleting medication:', error);
      console.error('Error details:', error.message, error.code);
      
      setUploadStatus('error');
      setUploadMessage(`Failed to delete medication: ${error.message}`);
      
      // Close deletion popup
      setShowDeletionPopup(false);
      setMedicationToDelete(null);
      
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    }
  };

  const handleCancelDelete = () => {
    setShowDeletionPopup(false);
    setMedicationToDelete(null);
  };

  const handleAddDrug = () => {
    // Create a new blank medication object
    const newMedication = {
      id: `new_${Date.now()}`, // Temporary ID for new medications
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
      specialDosing: '',
      isNew: true // Flag to indicate this is a new medication
    };
    
    setSelectedMedication(newMedication);
    setIsModalOpen(true);
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
      
      // Store parsed data and file for later use
      setParsedExcelData({ ...parseResult, file });
      setShowImportPreview(true);
      
      // Clear status since we're showing preview
      setUploadStatus(null);
      setUploadMessage('');
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to parse Excel file');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    }
  };

  const handleConfirmImport = async (importData) => {
    setShowImportPreview(false);
    
    const { data: selectedMedications, mode } = importData;
    const file = parsedExcelData.file;
    
    // Reset status
    setUploadStatus('uploading');
    setUploadMessage('Importing medications...');

    try {
      // Upload to Firebase Storage
      setUploadMessage('Uploading Excel file to cloud storage...');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `medications/excel_${timestamp}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Save medications to Firestore
      setUploadMessage('Saving medications to database...');
      const medicationsRef = collection(firestore, 'medications');
      const processedMedications = [];
      let successCount = 0;
      let updateCount = 0;
      
      for (const medication of selectedMedications) {
        try {
          // Generate medication code
          const medicationCode = await generateMedicationCode(firestore);
          
          // Clean medication data - remove import-specific fields and undefined values
          const { isDuplicate, existingId, existingMedCode, rowIndex, selected, ...cleanMedication } = medication;
          
          // Remove any undefined fields to prevent Firebase errors
          Object.keys(cleanMedication).forEach(key => {
            if (cleanMedication[key] === undefined) {
              delete cleanMedication[key];
            }
          });
          
          if (mode === 'update' && medication.isDuplicate && medication.existingId) {
            // Update existing medication
            const medicationDoc = doc(firestore, 'medications', medication.existingId);
            await updateDoc(medicationDoc, {
              ...cleanMedication,
              medicationCode: medication.existingMedCode || medicationCode,
              updatedAt: serverTimestamp()
            });
            updateCount++;
          } else {
            // Create new medication
            const docRef = await addDoc(medicationsRef, {
              ...cleanMedication,
              medicationCode,
              createdAt: serverTimestamp()
            });
            
            processedMedications.push({
              id: docRef.id,
              ...medication,
              medicationCode,
              selected: false
            });
            successCount++;
          }
        } catch (error) {
          console.error('Error processing medication:', error, medication);
        }
      }
      
      // Reload medications to show all updates
      await loadMedications();
      
      // Show success message
      const message = mode === 'update' 
        ? `Updated ${updateCount} medications and created ${successCount} new medications`
        : `Successfully imported ${successCount} medications`;
      
      setUploadStatus('success');
      setUploadMessage(message);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
      
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.message || 'Failed to import medications');
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    }
    
    // Clear parsed data
    setParsedExcelData(null);
  };

  const handleCancelImport = () => {
    setShowImportPreview(false);
    setParsedExcelData(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleExcelUpload = () => {
    setShowExcelOptions(false);
    triggerFileInput();
  };

  const handleExcelDownload = () => {
    setShowExcelOptions(false);
    downloadExcelTemplate();
  };

  const handleSelectAction = () => {
    const selectedMeds = medications.filter(med => med.selected);
    console.log('Selected medications:', selectedMeds);
    // TODO: Implement bulk actions
  };

  const handleRowClick = (medication) => {
    console.log('=== handleRowClick ===');
    console.log('medication clicked:', medication);
    console.log('medication.id:', medication.id, 'type:', typeof medication.id);
    setSelectedMedication(medication);
    setAllowModalEdit(false);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedMedication(null);
    setAllowModalEdit(false);
  };

  const handleConfirmationContinue = () => {
    setShowConfirmation(false);
    setSavedMedicationId(null);
  };

  const handleConfirmationViewMedication = () => {
    setShowConfirmation(false);
    
    // Find the saved medication and open it
    if (savedMedicationId) {
      const medication = medications.find(med => med.id === savedMedicationId);
      if (medication) {
        setSelectedMedication(medication);
        setIsModalOpen(true);
      }
    }
    
    setSavedMedicationId(null);
  };

  const handleModalSave = async (updatedMedication) => {
    // Check if this is a new medication (bypass PIN)
    if (updatedMedication.isNew || updatedMedication.id?.startsWith('new_')) {
      // Directly save new medications without PIN
      await processMedicationSave(updatedMedication);
    } else {
      // Show PIN confirmation for existing medications
      setPendingSaveData(updatedMedication);
      setMedicationToEdit(updatedMedication);
      setEditPopupMode('save');
      setShowEditPopup(true);
    }
  };

  const processMedicationSave = async (updatedMedication) => {
    // This is the actual save logic, separated from the PIN confirmation
    console.log('=== handleModalSave START ===');
    console.log('Full medication object:', updatedMedication);
    
    try {
      // Validate medication object
      if (!updatedMedication || !updatedMedication.id) {
        throw new Error('Invalid medication data: missing ID');
      }
      
      const medicationId = String(updatedMedication.id).trim();
      console.log('Processing medication ID:', medicationId, 'Type:', typeof medicationId);
      
      // Prepare data for Firebase - only include defined fields
      const dataToUpdate = {};
      
      // Only add fields that have values
      if (updatedMedication.brandName) dataToUpdate.brandName = updatedMedication.brandName;
      if (updatedMedication.indication) dataToUpdate.indication = updatedMedication.indication;
      if (updatedMedication.genericName) dataToUpdate.genericName = updatedMedication.genericName;
      if (updatedMedication.dosageForm) dataToUpdate.dosageForm = updatedMedication.dosageForm;
      if (updatedMedication.vialSize) dataToUpdate.vialSize = updatedMedication.vialSize;
      if (updatedMedication.reconstitutionSolution) dataToUpdate.reconstitutionSolution = updatedMedication.reconstitutionSolution;
      if (updatedMedication.reconstitutionVolume) dataToUpdate.reconstitutionVolume = updatedMedication.reconstitutionVolume;
      if (updatedMedication.dose) dataToUpdate.dose = updatedMedication.dose;
      if (updatedMedication.doseFrequency) dataToUpdate.doseFrequency = updatedMedication.doseFrequency;
      if (updatedMedication.infusionRate) dataToUpdate.infusionRate = updatedMedication.infusionRate;
      if (updatedMedication.normalSalineBag) dataToUpdate.normalSalineBag = updatedMedication.normalSalineBag;
      if (updatedMedication.overfillRule) dataToUpdate.overfillRule = updatedMedication.overfillRule;
      if (updatedMedication.filter) dataToUpdate.filter = updatedMedication.filter;
      if (updatedMedication.infusionSteps) dataToUpdate.infusionSteps = updatedMedication.infusionSteps;
      if (updatedMedication.notes) dataToUpdate.notes = updatedMedication.notes;
      if (updatedMedication.specialDosing) dataToUpdate.specialDosing = updatedMedication.specialDosing;
      if (updatedMedication.medicationCode) dataToUpdate.medicationCode = updatedMedication.medicationCode;
      
      // Always add timestamp
      dataToUpdate.updatedAt = serverTimestamp();
      
      console.log('Data to update in Firebase:', dataToUpdate);
      
      // Check if this is a new medication (temp_ prefix from handleCreateMedication)
      const isNewMedication = medicationId.startsWith('new_') || medicationId.startsWith('temp_');
      
      // All other IDs are treated as Firebase document IDs
      const isFirebaseId = !isNewMedication;
      
      if (isFirebaseId) {
        // This is an existing Firebase document, just update it
        console.log('Firebase ID detected, updating existing document');
        
        const medicationRef = doc(firestore, 'medications', medicationId);
        
        // First check if document exists
        const docSnap = await getDoc(medicationRef);
        if (!docSnap.exists()) {
          throw new Error(`Document with ID ${medicationId} not found in Firebase`);
        }
        
        // Update the document
        await updateDoc(medicationRef, {
          ...dataToUpdate,
          updatedAt: serverTimestamp()
        });
        console.log('Document updated successfully in Firebase');
        
        // Update local state
        setMedications(prevMeds => {
          const updatedMeds = prevMeds.map(med => {
            if (med.id === medicationId) {
              return {
                ...med,
                ...dataToUpdate,
                id: medicationId,
                selected: false,
                updatedAt: new Date() // Local timestamp for immediate UI update
              };
            }
            return med;
          });
          
          return updatedMeds.sort((a, b) => {
            const brandA = (a.brandName || '').toLowerCase();
            const brandB = (b.brandName || '').toLowerCase();
            return brandA.localeCompare(brandB);
          });
        });
        
        // Store the medication ID for the saved medication
        setSavedMedicationId(medicationId);
        
      } else if (isNewMedication) {
        console.log('New medication detected, creating in Firebase');
        
        // Generate medication code
        const medicationCode = await generateMedicationCode(firestore);
        
        // Create a new document in Firebase
        const medicationsRef = collection(firestore, 'medications');
        const docRef = await addDoc(medicationsRef, {
          ...dataToUpdate,
          medicationCode,
          createdAt: serverTimestamp()
        });
        
        console.log('New medication created with Firebase ID:', docRef.id);
        
        // Remove the temporary medication and add the new one with Firebase ID
        setMedications(prevMeds => {
          const filteredMeds = prevMeds.filter(med => med.id !== medicationId);
          const newMed = {
            ...dataToUpdate,
            id: docRef.id,
            medicationCode,
            selected: false
          };
          const allMeds = [...filteredMeds, newMed];
          
          return allMeds.sort((a, b) => {
            const brandA = (a.brandName || '').toLowerCase();
            const brandB = (b.brandName || '').toLowerCase();
            return brandA.localeCompare(brandB);
          });
        });
        
        // Store the new Firebase ID for the saved medication
        setSavedMedicationId(docRef.id);
        
        setConfirmationMessage('New medication created successfully');
      }
      
      // Close modal and show success
      setIsModalOpen(false);
      setSelectedMedication(null);
      
      // Message is already set for new medications above
      if (!isNewMedication) {
        setConfirmationMessage('Medication saved successfully');
      }
      setShowConfirmation(true);
      
      // Reload search data
      if (reloadSearchData) {
        reloadSearchData();
      }
      
      console.log('=== handleModalSave COMPLETE ===');
      
      // Cleanup
      setPendingSaveData(null);
      setMedicationToEdit(null);
      
    } catch (error) {
      console.error('=== handleModalSave ERROR ===');
      console.error('Error object:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Failed to save medication';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your Firebase security rules.';
      } else if (error.code === 'not-found') {
        errorMessage = 'Medication not found in database.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setUploadStatus('error');
      setUploadMessage(errorMessage);
      
      // Cleanup
      setPendingSaveData(null);
      setMedicationToEdit(null);
      
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    }
  };

  // Handler for Add Medication button
  const handleCreateMedication = async () => {
    try {
      // Create a new medication object with a temporary ID
      const newMedication = {
        id: `temp_${Date.now()}`, // Temporary ID until saved to Firebase
        brandName: '',
        genericName: '',
        dosageForm: '',
        vialSize: '',
        indication: '',
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
        specialDosing: '',
        isNew: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      setSelectedMedication(newMedication);
      setAllowModalEdit(true);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error creating new medication:', error);
      alert('Failed to create new medication');
    }
  };

  // Handler for Edit button
  const handleEditSelected = () => {
    const selectedMeds = medications.filter(med => med.selected);
    if (selectedMeds.length === 0) {
      alert('Please select a medication to edit');
      return;
    }
    if (selectedMeds.length > 1) {
      alert('Please select only one medication to edit');
      return;
    }
    handleEdit(selectedMeds[0].id);
  };

  // Handler for Delete button
  const handleDeleteSelected = () => {
    const selectedMeds = medications.filter(med => med.selected);
    if (selectedMeds.length === 0) {
      alert('Please select at least one medication to delete');
      return;
    }
    if (selectedMeds.length === 1) {
      handleDelete(selectedMeds[0].id);
    } else {
      if (confirm(`Are you sure you want to delete ${selectedMeds.length} medications?`)) {
        selectedMeds.forEach(med => handleDelete(med.id));
      }
    }
  };

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort medications
  const getFilteredAndSortedMedications = () => {
    // Ensure medications is always an array
    if (!Array.isArray(medications)) {
      console.error('Medications is not an array:', medications);
      return [];
    }

    let filtered = [...medications];

    // Apply filters
    if (showSterileSolutions || showLyophilizedPowders || showCapsules) {
      filtered = filtered.filter(med => {
        const dosageForm = med.dosageForm?.toLowerCase() || '';
        if (showSterileSolutions && dosageForm.includes('solution')) return true;
        if (showLyophilizedPowders && dosageForm.includes('powder')) return true;
        if (showCapsules && dosageForm.includes('capsule')) return true;
        return false;
      });
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = a[sortField] || '';
        let bValue = b[sortField] || '';

        // Convert to uppercase for case-insensitive sorting
        if (typeof aValue === 'string') aValue = aValue.toUpperCase();
        if (typeof bValue === 'string') bValue = bValue.toUpperCase();

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered || [];
  };

  const displayMedications = getFilteredAndSortedMedications();

  return (
    <div className="medications-page page-container">
      {/* Show modal directly if open, otherwise show normal page */}
      {isModalOpen ? (
        <MedicationModal
          medication={selectedMedication}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleModalSave}
          onRequestEdit={handleRequestEditFromModal}
          allowEdit={allowModalEdit}
          onDelete={(med) => {
            handleModalClose();
            handleDelete(med.id);
          }}
        />
      ) : (
        <>
          
          <div className="medications-content">
            <div className="medications-dashboard">
              <div className="dashboard-card">
                <div className="card-header">
                  <h3>Medication Database</h3>
                  <Pill size={24} />
                </div>
                <div className="card-body">
                  <div className="filter-options">
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox" 
                        checked={showSterileSolutions}
                        onChange={(e) => setShowSterileSolutions(e.target.checked)}
                      />
                      <span>Show Sterile Solutions</span>
                    </label>
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox" 
                        checked={showLyophilizedPowders}
                        onChange={(e) => setShowLyophilizedPowders(e.target.checked)}
                      />
                      <span>Show Lyophilized Powders</span>
                    </label>
                    <label className="filter-checkbox">
                      <input 
                        type="checkbox" 
                        checked={showCapsules}
                        onChange={(e) => setShowCapsules(e.target.checked)}
                      />
                      <span>Show Capsules</span>
                    </label>
                    <div className="results-count">{displayMedications.length} Results</div>
                  </div>
                  
                  <div className="medications-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading medications...</p>
          </div>
        ) : displayMedications && displayMedications.length > 0 ? (
          <div className="table-wrapper">
            <table className="prescriptions-table">
              <thead>
                <tr>
                  <th className="checkbox-cell">
                    <div className="add-icon" onClick={() => setShowExcelOptions(true)}>+</div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('brandName')}>
                    <span>Brand Name</span>
                    {sortField === 'brandName' && (
                      <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('genericName')}>
                    <span>Generic Name</span>
                    {sortField === 'genericName' && (
                      <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('dosageForm')}>
                    <span>Dosage Form</span>
                    {sortField === 'dosageForm' && (
                      <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('vialSize')}>
                    <span>Vial Size</span>
                    {sortField === 'vialSize' && (
                      <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayMedications.map((medication, index) => (
                  <tr 
                    key={medication.id} 
                    className="prescription-row"
                    onClick={(e) => {
                      if (!e.target.closest('.checkbox-cell') && !e.target.closest('.view-link')) {
                        handleRowClick(medication);
                      }
                    }}
                  >
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        className="prescription-checkbox"
                        checked={medication.selected}
                        onChange={() => handleSelectMedication(medication.id)}
                      />
                    </td>
                    <td className="brand-name">{medication.brandName?.toUpperCase() || 'DUPIXENT PEN'}</td>
                    <td className="generic-name">{medication.genericName?.toUpperCase() || 'DUPILUMAB'}</td>
                    <td className="dosage-form">{medication.dosageForm || 'INJECTION'}</td>
                    <td className="vial-size">{medication.vialSize || '300MG/ML'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="prescription-actions">
              <button className="prescription-btn add-medication" onClick={() => handleCreateMedication()}>Add Medication</button>
              <button className="prescription-btn edit" onClick={() => handleEditSelected()}>Edit</button>
              <button className="prescription-btn delete" onClick={() => handleDeleteSelected()}>Delete</button>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No medications added yet</h3>
            <p>Click "Add Drug" to start adding medications</p>
          </div>
        )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={showConfirmation}
        message={confirmationMessage}
        onClose={() => setShowConfirmation(false)}
        showButtons={true}
        onContinue={handleConfirmationContinue}
        onViewMedication={handleConfirmationViewMedication}
      />
      
      {/* Deletion Confirmation Popup */}
      <DeletionConfirmPopup
        isOpen={showDeletionPopup}
        medicationName={medicationToDelete?.brandName || 'this medication'}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      
      {/* Edit Confirmation Popup */}
      <EditConfirmPopup
        isOpen={showEditPopup}
        medicationName={medicationToEdit?.brandName || 'this medication'}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
        mode={editPopupMode}
      />
      
      {/* Excel Import Preview */}
      <ExcelImportPreview
        isOpen={showImportPreview}
        parsedData={parsedExcelData}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
        existingMedications={medications}
      />
      
      {/* Excel Options Popup */}
      <ExcelOptionsPopup
        isOpen={showExcelOptions}
        onClose={() => setShowExcelOptions(false)}
        onUpload={handleExcelUpload}
        onDownload={handleExcelDownload}
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        style={{ display: 'none' }}
      />

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
    </div>
  );
};

export default Medications;