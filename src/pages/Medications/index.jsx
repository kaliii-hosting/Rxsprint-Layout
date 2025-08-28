import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Plus, Upload, Grid, FileSpreadsheet, CheckCircle, AlertCircle, Download, Droplet, Package, Pill, Beaker, Save, RefreshCw } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { storage, firestore } from '../../config/firebase';
import { defaultMedications } from '../../data/defaultMedications';
import { parseExcelFile } from '../../utils/excelParser';
import { downloadExcelTemplate } from '../../utils/excelTemplate';
import { parseHaeExcelFile, downloadHaeExcelTemplate } from '../../utils/haeExcelParser';
import { parseScdExcelFile, downloadScdExcelTemplate } from '../../utils/scdExcelParser';
import MedicationModal from '../../components/MedicationModal/MedicationModal';
import HaeMedicationModal from '../../components/HaeMedicationModal/HaeMedicationModal';
import ScdMedicationModal from '../../components/ScdMedicationModal/ScdMedicationModal';
import ConfirmationPopup from '../../components/ConfirmationPopup/ConfirmationPopup';
import DeletionConfirmPopup from '../../components/DeletionConfirmPopup/DeletionConfirmPopup';
import EditConfirmPopup from '../../components/EditConfirmPopup/EditConfirmPopup';
import ExcelImportPreview from '../../components/ExcelImportPreview/ExcelImportPreview';
import ExcelOptionsPopup from '../../components/ExcelOptionsPopup/ExcelOptionsPopup';
import { generateMedicationCode } from '../../utils/medicationCode';
import { useLocation } from 'react-router-dom';
import { useSearch } from '../../contexts/SearchContext';
import EnterpriseHeader, { TabGroup, TabButton, HeaderDivider, ActionGroup, ActionButton } from '../../components/EnterpriseHeader/EnterpriseHeader';
import './Medications.css';

const Medications = () => {
  const [medications, setMedications] = useState([]);
  const [haeMedications, setHaeMedications] = useState([]);
  const [scdMedications, setScdMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [medicationType, setMedicationType] = useState('lyso'); // 'lyso', 'hae', or 'scd'

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
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef(null);
  
  // Sorting state
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Filter state for Lyso medications
  const [showSterileSolutions, setShowSterileSolutions] = useState(false);
  const [showLyophilizedPowders, setShowLyophilizedPowders] = useState(false);
  const [showCapsules, setShowCapsules] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  
  // Filter state for HAE medications (by howSupplied field)
  const [haeFilters, setHaeFilters] = useState({});
  
  const location = useLocation();
  const { loadMedications: reloadSearchData } = useSearch();

  // Load medications from Firebase on component mount
  useEffect(() => {
    loadMedications();
    loadHaeMedications();
    loadScdMedications(false); // Don't auto-clear on initial load
  }, []);

  // Update selectAll state based on current medications
  useEffect(() => {
    const currentMedications = medicationType === 'hae' 
      ? haeMedications 
      : medicationType === 'scd' 
      ? scdMedications 
      : medications;
    
    if (currentMedications.length > 0) {
      const allSelected = currentMedications.every(med => med.selected);
      setSelectAll(allSelected);
    } else {
      setSelectAll(false);
    }
  }, [medications, haeMedications, scdMedications, medicationType]);

  // Auto-save functionality
  const saveToFirebase = async () => {
    if (!firestore || isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Save based on medication type
      if (medicationType === 'scd') {
        // Save SCD medications
        const batch = [];
        for (const med of scdMedications) {
          if (med.id && !med.id.startsWith('new_') && !med.id.startsWith('temp_')) {
            const docRef = doc(firestore, 'scdMedications', med.id);
            batch.push(updateDoc(docRef, {
              ...med,
              selected: false, // Don't save selection state
              updatedAt: serverTimestamp()
            }));
          }
        }
        await Promise.all(batch);
      } else if (medicationType === 'hae') {
        // Save HAE medications
        const batch = [];
        for (const med of haeMedications) {
          if (med.id && !med.id.startsWith('new_') && !med.id.startsWith('temp_')) {
            const docRef = doc(firestore, 'haeMedications', med.id);
            batch.push(updateDoc(docRef, {
              ...med,
              selected: false,
              updatedAt: serverTimestamp()
            }));
          }
        }
        await Promise.all(batch);
      } else {
        // Save LYSO medications
        const batch = [];
        for (const med of medications) {
          if (med.id && !med.id.startsWith('new_') && !med.id.startsWith('temp_')) {
            const docRef = doc(firestore, 'medications', med.id);
            batch.push(updateDoc(docRef, {
              ...med,
              selected: false,
              updatedAt: serverTimestamp()
            }));
          }
        }
        await Promise.all(batch);
      }
      
      setHasUnsavedChanges(false);
      setUploadStatus('success');
      setUploadMessage('All changes saved');
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      setUploadStatus('error');
      setUploadMessage('Failed to save changes');
      setTimeout(() => {
        setUploadStatus(null);
        setUploadMessage('');
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced auto-save
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save (3 seconds after last change)
      saveTimeoutRef.current = setTimeout(() => {
        saveToFirebase();
      }, 3000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, medications, haeMedications, scdMedications]);

  // Manual save function
  const handleManualSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveToFirebase();
  };

  // Handle navigation from search
  useEffect(() => {
    // Handle regular medication selection
    if (location.state?.selectedMedicationId && location.state?.openModal) {
      const medication = medications.find(med => med.id === location.state.selectedMedicationId);
      if (medication) {
        setSelectedMedication(medication);
        setIsModalOpen(true);
      }
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
    
    // Handle HAE medication selection
    if (location.state?.selectedHaeMedicationId && location.state?.openHaeModal) {
      // Switch to HAE tab if specified
      if (location.state?.medicationType === 'hae') {
        setMedicationType('hae');
      }
      
      // Find and open the HAE medication
      const haeMedication = haeMedications.find(med => med.id === location.state.selectedHaeMedicationId);
      if (haeMedication) {
        setSelectedMedication(haeMedication);
        setIsModalOpen(true);
      }
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
    
    // Handle SCD medication selection
    if (location.state?.selectedScdMedicationId && location.state?.openScdModal) {
      // Switch to SCD tab if specified
      if (location.state?.medicationType === 'scd') {
        setMedicationType('scd');
      }
      
      // Find and open the SCD medication
      const scdMedication = scdMedications.find(med => med.id === location.state.selectedScdMedicationId);
      if (scdMedication) {
        setSelectedMedication(scdMedication);
        setIsModalOpen(true);
      }
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, medications, haeMedications, scdMedications]);

  const clearDemoScdMedications = async () => {
    try {
      if (!firestore) return;
      
      const scdMedicationsRef = collection(firestore, 'scdMedications');
      const snapshot = await getDocs(scdMedicationsRef);
      
      // Delete all existing SCD medications (demo data)
      const batch = writeBatch(firestore);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      console.log('Cleared all demo SCD medications from Firebase');
    } catch (error) {
      console.error('Error clearing demo SCD medications:', error);
    }
  };

  const loadScdMedications = async (clearDemoData = false) => {
    try {
      setLoading(true);
      console.log('Loading SCD medications, clearDemoData:', clearDemoData);
      
      // Check if firestore is available and load existing SCD medications
      if (!firestore) {
        console.log('Firestore not available for SCD medications');
        setScdMedications([]);
        setLoading(false);
        return;
      }

      // Clear demo medications if requested (default: false now)
      if (clearDemoData) {
        console.log('Clearing demo SCD medications');
        await clearDemoScdMedications();
      }
      
      // Load SCD medications
      const scdMedicationsRef = collection(firestore, 'scdMedications');
      const snapshot = await getDocs(scdMedicationsRef);
      console.log('SCD medications snapshot size:', snapshot.size);
      
      const scdMedicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        selected: false
      }));
      
      // Sort SCD medications alphabetically by drug name
      const sortedScdMedications = scdMedicationsData.sort((a, b) => {
        const drugA = (a.drug || '').toLowerCase();
        const drugB = (b.drug || '').toLowerCase();
        return drugA.localeCompare(drugB);
      });
      
      setScdMedications(sortedScdMedications);
      console.log('Loaded SCD medications count:', sortedScdMedications.length);
      console.log('First SCD medication:', sortedScdMedications[0]);
    } catch (error) {
      console.error('Error loading SCD medications:', error);
      setScdMedications([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHaeMedications = async () => {
    try {
      setLoading(true);
      
      if (!firestore) {
        console.log('Firestore not available for HAE medications');
        setHaeMedications([]);
        setLoading(false);
        return;
      }

      const haeMedicationsRef = collection(firestore, 'haeMedications');
      const snapshot = await getDocs(haeMedicationsRef);
      
      const haeMedicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        selected: false
      }));
      
      // Sort HAE medications alphabetically by drug name
      const sortedHaeMedications = haeMedicationsData.sort((a, b) => {
        const drugA = (a.drug || '').toLowerCase();
        const drugB = (b.drug || '').toLowerCase();
        return drugA.localeCompare(drugB);
      });
      
      setHaeMedications(sortedHaeMedications);
    } catch (error) {
      console.error('Error loading HAE medications:', error);
      setHaeMedications([]);
    } finally {
      setLoading(false);
    }
  };

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
    
    if (medicationType === 'hae') {
      setHaeMedications(haeMedications.map(med => ({ ...med, selected: newSelectAll })));
    } else if (medicationType === 'scd') {
      setScdMedications(scdMedications.map(med => ({ ...med, selected: newSelectAll })));
    } else {
      setMedications(medications.map(med => ({ ...med, selected: newSelectAll })));
    }
  };

  const handleSelectMedication = (id) => {
    console.log('Selecting medication with ID:', id, 'Type:', medicationType);
    
    if (medicationType === 'hae') {
      setHaeMedications(prevMeds => prevMeds.map(med => 
        med.id === id ? { ...med, selected: !med.selected } : med
      ));
    } else if (medicationType === 'scd') {
      setScdMedications(prevMeds => {
        const updated = prevMeds.map(med => 
          med.id === id ? { ...med, selected: !med.selected } : med
        );
        console.log('Updated SCD medications:', updated);
        return updated;
      });
    } else {
      setMedications(prevMeds => prevMeds.map(med => 
        med.id === id ? { ...med, selected: !med.selected } : med
      ));
    }
  };

  const handleEdit = (id) => {
    const medication = medicationType === 'hae' 
      ? haeMedications.find(med => med.id === id)
      : medicationType === 'scd'
      ? scdMedications.find(med => med.id === id)
      : medications.find(med => med.id === id);
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
    const medication = medicationType === 'hae' 
      ? haeMedications.find(med => med.id === id)
      : medicationType === 'scd'
      ? scdMedications.find(med => med.id === id)
      : medications.find(med => med.id === id);
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
      
      // Determine medication type
      const isHaeMedication = medicationType === 'hae';
      const isScdMedication = medicationType === 'scd';
      
      // Check if this is a numeric ID (not in Firebase)
      const isNumericId = /^\d+$/.test(medicationId);
      
      if (isNumericId) {
        // This medication is not in Firebase yet, just remove from local state
        if (isScdMedication) {
          setScdMedications(scdMedications.filter(med => String(med.id) !== medicationId));
        } else if (isHaeMedication) {
          setHaeMedications(haeMedications.filter(med => String(med.id) !== medicationId));
        } else {
          setMedications(medications.filter(med => String(med.id) !== medicationId));
        }
        
        setUploadStatus('success');
        setUploadMessage('Medication removed successfully');
      } else {
        // Delete from Firestore
        const collectionName = isScdMedication ? 'scdMedications' : isHaeMedication ? 'haeMedications' : 'medications';
        await deleteDoc(doc(firestore, collectionName, medicationId));
        
        // Update local state
        if (isScdMedication) {
          setScdMedications(scdMedications.filter(med => med.id !== id));
        } else if (isHaeMedication) {
          setHaeMedications(haeMedications.filter(med => med.id !== id));
        } else {
          setMedications(medications.filter(med => med.id !== id));
        }
        
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
    // Create a new blank medication object based on medication type
    if (medicationType === 'scd') {
      const newScdMedication = {
        id: `new_${Date.now()}`,
        drug: '',
        generic: '',
        indication: '',
        dosage: '',
        frequency: '',
        rateAdministered: '',
        howSupplied: '',
        vialSizes: '',
        dilutionSolution: '',
        reconstitutionSolution: '',
        sideEffects: '',
        nsBagsD5w: '',
        overfill: '',
        preMedRecommendation: '',
        filters: '',
        storageAndHandling: '',
        extendedStability: '',
        bbw: '',
        specialNotes: '',
        additionalNotes: '',
        pregnancyCategory: ''
      };
      setSelectedMedication(newScdMedication);
      setIsModalOpen(true);
      setAllowModalEdit(true);
    } else if (medicationType === 'hae') {
      const newHaeMedication = {
        id: `new_${Date.now()}`, // Temporary ID for new medications
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
        isNew: true // Flag to indicate this is a new medication
      };
      
      setSelectedMedication(newHaeMedication);
      setAllowModalEdit(true);
      setIsModalOpen(true);
    } else {
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
    }
  };

  const handleAddField = () => {
    console.log('Add new field');
    // TODO: Implement add field functionality
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('Importing Excel file:', file.name, 'for medication type:', medicationType);

    // Reset status
    setUploadStatus('uploading');
    setUploadMessage('Processing Excel file...');

    try {
      // Parse Excel file based on medication type
      setUploadMessage('Parsing Excel file...');
      const parseResult = medicationType === 'hae' 
        ? await parseHaeExcelFile(file)
        : medicationType === 'scd'
        ? await parseScdExcelFile(file)
        : await parseExcelFile(file);
      
      console.log('Parse result:', parseResult);
      
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
      console.error('Error importing Excel:', error);
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
      // Try to upload to Firebase Storage
      let downloadURL = null;
      try {
        setUploadMessage('Uploading Excel file to cloud storage...');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const folderName = medicationType === 'hae' ? 'haeMedications' : medicationType === 'scd' ? 'scdMedications' : 'medications';
        const fileName = `${folderName}/excel_${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        
        const snapshot = await uploadBytes(storageRef, file);
        downloadURL = await getDownloadURL(snapshot.ref);
      } catch (storageError) {
        console.warn('Storage upload failed, continuing without file backup:', storageError);
        // Continue without storage URL - data will still be saved to Firestore
      }
      
      // Save medications to Firestore
      setUploadMessage('Saving medications to database...');
      const collectionName = medicationType === 'hae' ? 'haeMedications' : medicationType === 'scd' ? 'scdMedications' : 'medications';
      const medicationsRef = collection(firestore, collectionName);
      const processedMedications = [];
      let successCount = 0;
      let updateCount = 0;
      
      for (const medication of selectedMedications) {
        try {
          // Generate medication code only for non-SCD medications
          let medicationCode = null;
          if (medicationType !== 'scd' && medicationType !== 'hae') {
            medicationCode = await generateMedicationCode(firestore);
          }
          
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
            const medicationDoc = doc(firestore, collectionName, medication.existingId);
            const updateData = {
              ...cleanMedication,
              updatedAt: serverTimestamp()
            };
            
            // Only add medication code for Lyso medications
            if (medicationType !== 'scd' && medicationType !== 'hae') {
              updateData.medicationCode = medication.existingMedCode || medicationCode;
            }
            
            await updateDoc(medicationDoc, updateData);
            updateCount++;
          } else {
            // Create new medication
            const newMedData = {
              ...cleanMedication,
              createdAt: serverTimestamp()
            };
            
            // Only add medication code for Lyso medications
            if (medicationType !== 'scd' && medicationType !== 'hae') {
              newMedData.medicationCode = medicationCode;
            }
            
            const docRef = await addDoc(medicationsRef, newMedData);
            
            const processedMed = {
              id: docRef.id,
              ...medication,
              selected: false
            };
            
            // Only add medication code for Lyso medications
            if (medicationType !== 'scd' && medicationType !== 'hae') {
              processedMed.medicationCode = medicationCode;
            }
            
            processedMedications.push(processedMed);
            successCount++;
          }
        } catch (error) {
          console.error('Error processing medication:', error, medication);
        }
      }
      
      // Reload medications to show all updates
      if (medicationType === 'hae') {
        await loadHaeMedications();
      } else if (medicationType === 'scd') {
        // Don't clear demo data after import - we just added new medications!
        await loadScdMedications(false);
      } else {
        await loadMedications();
      }
      
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
    // Download appropriate template based on medication type
    if (medicationType === 'hae') {
      downloadHaeExcelTemplate();
    } else if (medicationType === 'scd') {
      downloadScdExcelTemplate();
    } else {
      downloadExcelTemplate();
    }
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

  // Add/remove modal-open class to control scrolling
  useEffect(() => {
    const medicationsPage = document.querySelector('.medications-page');
    if (medicationsPage) {
      if (isModalOpen) {
        medicationsPage.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
      } else {
        medicationsPage.classList.remove('modal-open');
        document.body.style.overflow = '';
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      if (medicationsPage) {
        medicationsPage.classList.remove('modal-open');
      }
    };
  }, [isModalOpen]);

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
      
      // Check medication type
      const isScdMedication = medicationType === 'scd';
      const isHaeMedication = !isScdMedication && (updatedMedication.drug !== undefined || updatedMedication.brand !== undefined || medicationType === 'hae');
      
      // Prepare data for Firebase - only include defined fields
      const dataToUpdate = {};
      
      if (isScdMedication) {
        // SCD medication fields
        if (updatedMedication.drug) dataToUpdate.drug = updatedMedication.drug;
        if (updatedMedication.generic) dataToUpdate.generic = updatedMedication.generic;
        if (updatedMedication.indication) dataToUpdate.indication = updatedMedication.indication;
        if (updatedMedication.dosage) dataToUpdate.dosage = updatedMedication.dosage;
        if (updatedMedication.frequency) dataToUpdate.frequency = updatedMedication.frequency;
        if (updatedMedication.rateAdministered) dataToUpdate.rateAdministered = updatedMedication.rateAdministered;
        if (updatedMedication.howSupplied) dataToUpdate.howSupplied = updatedMedication.howSupplied;
        if (updatedMedication.vialSizes) dataToUpdate.vialSizes = updatedMedication.vialSizes;
        if (updatedMedication.dilutionSolution) dataToUpdate.dilutionSolution = updatedMedication.dilutionSolution;
        if (updatedMedication.reconstitutionSolution) dataToUpdate.reconstitutionSolution = updatedMedication.reconstitutionSolution;
        if (updatedMedication.sideEffects) dataToUpdate.sideEffects = updatedMedication.sideEffects;
        if (updatedMedication.nsBagsD5w) dataToUpdate.nsBagsD5w = updatedMedication.nsBagsD5w;
        if (updatedMedication.overfill) dataToUpdate.overfill = updatedMedication.overfill;
        if (updatedMedication.preMedRecommendation) dataToUpdate.preMedRecommendation = updatedMedication.preMedRecommendation;
        if (updatedMedication.filters) dataToUpdate.filters = updatedMedication.filters;
        if (updatedMedication.storageAndHandling) dataToUpdate.storageAndHandling = updatedMedication.storageAndHandling;
        if (updatedMedication.extendedStability) dataToUpdate.extendedStability = updatedMedication.extendedStability;
        if (updatedMedication.bbw) dataToUpdate.bbw = updatedMedication.bbw;
        if (updatedMedication.specialNotes) dataToUpdate.specialNotes = updatedMedication.specialNotes;
        if (updatedMedication.additionalNotes) dataToUpdate.additionalNotes = updatedMedication.additionalNotes;
        if (updatedMedication.pregnancyCategory) dataToUpdate.pregnancyCategory = updatedMedication.pregnancyCategory;
      } else if (isHaeMedication) {
        // HAE medication fields
        if (updatedMedication.drug) dataToUpdate.drug = updatedMedication.drug;
        if (updatedMedication.brand) dataToUpdate.brand = updatedMedication.brand;
        if (updatedMedication.company) dataToUpdate.company = updatedMedication.company;
        if (updatedMedication.source) dataToUpdate.source = updatedMedication.source;
        if (updatedMedication.moa) dataToUpdate.moa = updatedMedication.moa;
        if (updatedMedication.adminRoute) dataToUpdate.adminRoute = updatedMedication.adminRoute;
        if (updatedMedication.concentration) dataToUpdate.concentration = updatedMedication.concentration;
        if (updatedMedication.strength) dataToUpdate.strength = updatedMedication.strength;
        if (updatedMedication.filter) dataToUpdate.filter = updatedMedication.filter;
        if (updatedMedication.dosing) dataToUpdate.dosing = updatedMedication.dosing;
        if (updatedMedication.maxDose) dataToUpdate.maxDose = updatedMedication.maxDose;
        if (updatedMedication.bbw) dataToUpdate.bbw = updatedMedication.bbw;
        if (updatedMedication.pregCategoryLactation) dataToUpdate.pregCategoryLactation = updatedMedication.pregCategoryLactation;
        if (updatedMedication.se) dataToUpdate.se = updatedMedication.se;
        if (updatedMedication.rateAdmin) dataToUpdate.rateAdmin = updatedMedication.rateAdmin;
        if (updatedMedication.reconAmt) dataToUpdate.reconAmt = updatedMedication.reconAmt;
        if (updatedMedication.howSupplied) dataToUpdate.howSupplied = updatedMedication.howSupplied;
        if (updatedMedication.storage) dataToUpdate.storage = updatedMedication.storage;
        if (updatedMedication.extraNotes) dataToUpdate.extraNotes = updatedMedication.extraNotes;
      } else {
        // Lysosomal medication fields
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
      }
      
      // Add custom fields for all medication types
      if (updatedMedication.customFields) {
        dataToUpdate.customFields = updatedMedication.customFields;
      }
      
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
        
        const collectionName = isScdMedication ? 'scdMedications' : isHaeMedication ? 'haeMedications' : 'medications';
        const medicationRef = doc(firestore, collectionName, medicationId);
        
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
        if (isScdMedication) {
          setScdMedications(prevMeds => {
            const updatedMeds = prevMeds.map(med => {
              if (med.id === medicationId) {
                return {
                  ...med,
                  ...dataToUpdate,
                  id: medicationId,
                  selected: false,
                  updatedAt: new Date()
                };
              }
              return med;
            });
            
            return updatedMeds.sort((a, b) => {
              const drugA = (a.drug || '').toLowerCase();
              const drugB = (b.drug || '').toLowerCase();
              return drugA.localeCompare(drugB);
            });
          });
        } else if (isHaeMedication) {
          setHaeMedications(prevMeds => {
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
              const drugA = (a.drug || '').toLowerCase();
              const drugB = (b.drug || '').toLowerCase();
              return drugA.localeCompare(drugB);
            });
          });
        } else {
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
        }
        
        // Store the medication ID for the saved medication
        setSavedMedicationId(medicationId);
        
      } else if (isNewMedication) {
        console.log('New medication detected, creating in Firebase');
        
        const collectionName = isScdMedication ? 'scdMedications' : isHaeMedication ? 'haeMedications' : 'medications';
        
        // Only generate medication code for lysosomal medications
        let medicationCode = null;
        if (!isHaeMedication && !isScdMedication) {
          medicationCode = await generateMedicationCode(firestore);
          dataToUpdate.medicationCode = medicationCode;
        }
        
        // Create a new document in Firebase
        const medicationsRef = collection(firestore, collectionName);
        const docRef = await addDoc(medicationsRef, {
          ...dataToUpdate,
          createdAt: serverTimestamp()
        });
        
        console.log('New medication created with Firebase ID:', docRef.id);
        
        // Remove the temporary medication and add the new one with Firebase ID
        if (isScdMedication) {
          setScdMedications(prevMeds => {
            const filteredMeds = prevMeds.filter(med => med.id !== medicationId);
            const newMed = {
              ...dataToUpdate,
              id: docRef.id,
              selected: false
            };
            const allMeds = [...filteredMeds, newMed];
            
            return allMeds.sort((a, b) => {
              const drugA = (a.drug || '').toLowerCase();
              const drugB = (b.drug || '').toLowerCase();
              return drugA.localeCompare(drugB);
            });
          });
        } else if (isHaeMedication) {
          setHaeMedications(prevMeds => {
            const filteredMeds = prevMeds.filter(med => med.id !== medicationId);
            const newMed = {
              ...dataToUpdate,
              id: docRef.id,
              selected: false
            };
            const allMeds = [...filteredMeds, newMed];
            
            return allMeds.sort((a, b) => {
              const drugA = (a.drug || '').toLowerCase();
              const drugB = (b.drug || '').toLowerCase();
              return drugA.localeCompare(drugB);
            });
          });
        } else {
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
        }
        
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
      // Create a new medication object based on type
      let newMedication;
      
      if (medicationType === 'scd') {
        // SCD medication fields
        newMedication = {
          id: `temp_${Date.now()}`,
          drug: '',
          generic: '',
          indication: '',
          dosage: '',
          frequency: '',
          rateAdministered: '',
          howSupplied: '',
          vialSizes: '',
          dilutionSolution: '',
          reconstitutionSolution: '',
          sideEffects: '',
          nsBagsD5w: '',
          overfill: '',
          preMedRecommendation: '',
          filters: '',
          storageAndHandling: '',
          extendedStability: '',
          bbw: '',
          specialNotes: '',
          additionalNotes: '',
          pregnancyCategory: ''
        };
      } else if (medicationType === 'hae') {
        // HAE medication fields
        newMedication = {
          id: `temp_${Date.now()}`, // Temporary ID until saved to Firebase
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
          isNew: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
      } else {
        // Lyso medication fields
        newMedication = {
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
      }
      
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
    const currentMedications = medicationType === 'hae' ? haeMedications : medicationType === 'scd' ? scdMedications : medications;
    const selectedMeds = currentMedications.filter(med => med.selected);
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
    const currentMedications = medicationType === 'hae' ? haeMedications : medicationType === 'scd' ? scdMedications : medications;
    const selectedMeds = currentMedications.filter(med => med.selected);
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

  // Get unique howSupplied values from HAE medications
  const getUniqueHowSuppliedValues = () => {
    const values = new Set();
    haeMedications.forEach(med => {
      const howSupplied = med.howSupplied;
      if (howSupplied && howSupplied !== '' && howSupplied !== 'N/A') {
        values.add(howSupplied);
      }
    });
    
    // Add "None" for N/A values
    const hasNoneValues = haeMedications.some(med => 
      !med.howSupplied || med.howSupplied === '' || med.howSupplied === 'N/A'
    );
    
    const sortedValues = Array.from(values).sort();
    if (hasNoneValues) {
      sortedValues.push('None');
    }
    
    return sortedValues;
  };

  // Filter and sort medications
  const getFilteredAndSortedMedications = () => {
    // Select the appropriate medication list based on type
    const currentMedications = medicationType === 'scd' ? scdMedications : medicationType === 'hae' ? haeMedications : medications;
    
    // Ensure medications is always an array
    if (!Array.isArray(currentMedications)) {
      console.error('Medications is not an array:', currentMedications);
      return [];
    }

    let filtered = [...currentMedications];

    // Apply filters based on medication type
    if (medicationType === 'hae') {
      // Apply HAE filters based on howSupplied field
      const activeFilters = Object.keys(haeFilters).filter(key => haeFilters[key]);
      if (activeFilters.length > 0) {
        filtered = filtered.filter(med => {
          const howSupplied = med.howSupplied || 'N/A';
          
          // Check if medication matches any active filter
          return activeFilters.some(filterValue => {
            if (filterValue === 'None') {
              return howSupplied === 'N/A' || howSupplied === '' || !howSupplied;
            }
            return howSupplied === filterValue;
          });
        });
      }
    } else {
      // Apply Lyso filters based on dosageForm field
      if (showSterileSolutions || showLyophilizedPowders || showCapsules) {
        filtered = filtered.filter(med => {
          const dosageForm = med.dosageForm?.toLowerCase() || '';
          if (showSterileSolutions && dosageForm.includes('solution')) return true;
          if (showLyophilizedPowders && dosageForm.includes('powder')) return true;
          if (showCapsules && dosageForm.includes('capsule')) return true;
          return false;
        });
      }
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
  console.log('Display medications for type', medicationType, ':', displayMedications.length, displayMedications);

  return (
    <div className="medications-page page-container page-with-enterprise-header">
      {/* Show modal directly if open, otherwise show normal page */}
      {isModalOpen ? (
        medicationType === 'scd' ? (
          <ScdMedicationModal
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
        ) : medicationType === 'hae' ? (
          <HaeMedicationModal
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
        )
      ) : (
        <>
          {/* Enterprise Header with Filter Tabs */}
          <EnterpriseHeader>
            {/* Medication Type Toggle */}
            <TabGroup>
              <TabButton
                active={medicationType === 'lyso'}
                onClick={() => setMedicationType('lyso')}
                style={{ background: medicationType === 'lyso' ? '#FF6900' : 'transparent', color: medicationType === 'lyso' ? 'white' : '#666' }}
              >
                LYSO
              </TabButton>
              <TabButton
                active={medicationType === 'hae'}
                onClick={() => setMedicationType('hae')}
                style={{ background: medicationType === 'hae' ? '#FF6900' : 'transparent', color: medicationType === 'hae' ? 'white' : '#666' }}
              >
                HAE
              </TabButton>
              <TabButton
                active={medicationType === 'scd'}
                onClick={() => setMedicationType('scd')}
                style={{ background: medicationType === 'scd' ? '#FF6900' : 'transparent', color: medicationType === 'scd' ? 'white' : '#666' }}
              >
                SCD
              </TabButton>
            </TabGroup>
            
            <HeaderDivider />
            
            {/* Filter Tabs */}
            {medicationType === 'lyso' && (
              <TabGroup>
                <TabButton
                  active={showSterileSolutions}
                  onClick={() => setShowSterileSolutions(!showSterileSolutions)}
                >
                  Sterile Solutions
                </TabButton>
                <TabButton
                  active={showLyophilizedPowders}
                  onClick={() => setShowLyophilizedPowders(!showLyophilizedPowders)}
                >
                  Lyophilized Powders
                </TabButton>
                <TabButton
                  active={showCapsules}
                  onClick={() => setShowCapsules(!showCapsules)}
                >
                  Capsules
                </TabButton>
                <TabButton
                  active={showSolutions}
                  onClick={() => setShowSolutions(!showSolutions)}
                >
                  Solutions
                </TabButton>
              </TabGroup>
            )}
            
            {/* Filter Tabs for HAE medications by howSupplied */}
            {medicationType === 'hae' && (
              <TabGroup>
                {getUniqueHowSuppliedValues().map(value => (
                  <TabButton
                    key={value}
                    active={haeFilters[value] || false}
                    onClick={() => setHaeFilters(prev => ({
                      ...prev,
                      [value]: !prev[value]
                    }))}
                  >
                    {value}
                  </TabButton>
                ))}
              </TabGroup>
            )}
            
            <HeaderDivider />
            
            {/* Save Status Indicator */}
            <div className={`save-status ${isSaving ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved'}`}>
              {isSaving ? (
                <>
                  <span>⏳</span>
                  <span>Saving...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span>⚠️</span>
                  <span>Unsaved changes</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>All changes saved</span>
                </>
              )}
            </div>
            
            {/* Action Buttons */}
            <ActionGroup>
              <ActionButton
                onClick={handleManualSave}
                icon={Save}
                disabled={isSaving || !hasUnsavedChanges}
                primary={hasUnsavedChanges}
              >
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </ActionButton>
              <ActionButton
                onClick={() => handleCreateMedication()}
                icon={Plus}
                primary
              >
                Add
              </ActionButton>
              <ActionButton
                onClick={() => handleEditSelected()}
                icon={Edit2}
                secondary
              >
                Edit
              </ActionButton>
              <ActionButton
                onClick={() => handleDeleteSelected()}
                icon={Trash2}
                secondary
              >
                Delete
              </ActionButton>
              {medicationType === 'scd' && (
                <>
                  <ActionButton
                    onClick={async () => {
                      console.log('Refreshing SCD medications...');
                      await loadScdMedications(false);
                    }}
                    icon={RefreshCw}
                    secondary
                  >
                    Refresh
                  </ActionButton>
                  {scdMedications.length > 0 && (
                    <ActionButton
                      onClick={async () => {
                        if (confirm('This will clear ALL SCD medications. Are you sure?')) {
                          await clearDemoScdMedications();
                          await loadScdMedications(false);
                        }
                      }}
                      icon={Trash2}
                      secondary
                    >
                      Clear All
                    </ActionButton>
                  )}
                </>
              )}
            </ActionGroup>
          </EnterpriseHeader>
          
          <div className="medications-content fullscreen">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading medications...</p>
          </div>
        ) : (
            <table className="prescriptions-table fullscreen-table">
              <thead>
                <tr>
                  <th className="checkbox-header">
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        className="select-all-checkbox"
                        checked={selectAll || false}
                        onChange={handleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="add-icon" onClick={() => setShowExcelOptions(true)}>+</div>
                  </th>
                  {medicationType === 'scd' ? (
                    <>
                      <th className="sortable" onClick={() => handleSort('drug')}>
                        <span>Drug</span>
                        {sortField === 'drug' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('generic')}>
                        <span>Generic</span>
                        {sortField === 'generic' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('indication')}>
                        <span>Indication</span>
                        {sortField === 'indication' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('dosage')}>
                        <span>Dosage</span>
                        {sortField === 'dosage' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('frequency')}>
                        <span>Frequency</span>
                        {sortField === 'frequency' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    </>
                  ) : medicationType === 'lyso' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <th className="sortable" onClick={() => handleSort('brand')}>
                        <span>Brand</span>
                        {sortField === 'brand' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('drug')}>
                        <span>Drug</span>
                        {sortField === 'drug' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('company')}>
                        <span>Company</span>
                        {sortField === 'company' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                      <th className="sortable" onClick={() => handleSort('strength')}>
                        <span>Strength</span>
                        {sortField === 'strength' && (
                          <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                        )}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayMedications.length > 0 ? displayMedications.map((medication, index) => (
                  <tr 
                    key={medication.id} 
                    className="prescription-row"
                    onClick={(e) => {
                      if (!e.target.closest('.checkbox-cell') && !e.target.closest('.view-link')) {
                        handleRowClick(medication);
                      }
                    }}
                  >
                    <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="prescription-checkbox"
                        checked={medication.selected || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectMedication(medication.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      />
                    </td>
                    {medicationType === 'scd' ? (
                      <>
                        <td className="drug-name">{medication.drug || 'N/A'}</td>
                        <td className="generic-name">{medication.generic || 'N/A'}</td>
                        <td className="indication">{medication.indication || 'N/A'}</td>
                        <td className="dosage">{medication.dosage || 'N/A'}</td>
                        <td className="frequency">{medication.frequency || 'N/A'}</td>
                      </>
                    ) : medicationType === 'lyso' ? (
                      <>
                        <td className="brand-name">{medication.brandName?.toUpperCase() || 'DUPIXENT PEN'}</td>
                        <td className="generic-name">{medication.genericName?.toUpperCase() || 'DUPILUMAB'}</td>
                        <td className="dosage-form">{medication.dosageForm || 'INJECTION'}</td>
                        <td className="vial-size">{medication.vialSize || '300MG/ML'}</td>
                      </>
                    ) : (
                      <>
                        <td className="brand-name">{medication.brand?.toUpperCase() || '-'}</td>
                        <td className="generic-name">{medication.drug?.toUpperCase() || '-'}</td>
                        <td className="dosage-form">{medication.company || '-'}</td>
                        <td className="vial-size">{medication.strength || '-'}</td>
                      </>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      <div className="empty-state-inline">
                        <h3>No {medicationType === 'hae' ? 'HAE' : medicationType === 'scd' ? 'SCD' : ''} medications added yet</h3>
                        <p>Click the "+" button above to import medications from Excel or click "Add Medication" below</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        )}
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
        existingMedications={medicationType === 'hae' ? haeMedications : medicationType === 'scd' ? scdMedications : medications}
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