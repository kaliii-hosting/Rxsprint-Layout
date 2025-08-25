import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useNavigate } from 'react-router-dom';
import suppliesData from '../pages/Shop/combined_supplies.json';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [medications, setMedications] = useState([]);
  const [haeMedications, setHaeMedications] = useState([]);
  const [scdMedications, setScdMedications] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [notes, setNotes] = useState([]);
  const [workflowSections, setWorkflowSections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  // Load all searchable data on mount
  useEffect(() => {
    loadMedications();
    loadHaeMedications();
    loadScdMedications();
    // Only load medications - remove other data sources
    // loadBookmarks();
    // loadShopProducts();
    // loadNotes();
    // loadWorkflowSections();
  }, []);

  const loadMedications = async () => {
    try {
      setIsLoading(true);
      // Check if firestore is initialized
      if (!firestore) {
        console.warn('Firestore not initialized yet');
        return;
      }
      
      const medicationsRef = collection(firestore, 'medications');
      const snapshot = await getDocs(medicationsRef);
      
      const medicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort medications alphabetically by brand name
      const sortedMedications = medicationsData.sort((a, b) => {
        const brandA = (a.brandName || '').toLowerCase();
        const brandB = (b.brandName || '').toLowerCase();
        return brandA.localeCompare(brandB);
      });
      
      setMedications(sortedMedications);
    } catch (error) {
      console.error('Error loading medications for search:', error);
      // Don't crash the app if medications can't be loaded
      setMedications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadHaeMedications = async () => {
    try {
      // Check if firestore is initialized
      if (!firestore) {
        console.warn('Firestore not initialized yet');
        return;
      }
      
      const haeMedicationsRef = collection(firestore, 'haeMedications');
      const snapshot = await getDocs(haeMedicationsRef);
      
      const haeMedicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'haeMedication'
      }));
      
      // Sort HAE medications alphabetically by drug name
      const sortedHaeMedications = haeMedicationsData.sort((a, b) => {
        const drugA = (a.drug || '').toLowerCase();
        const drugB = (b.drug || '').toLowerCase();
        return drugA.localeCompare(drugB);
      });
      
      setHaeMedications(sortedHaeMedications);
    } catch (error) {
      console.error('Error loading HAE medications for search:', error);
      // Don't crash the app if HAE medications can't be loaded
      setHaeMedications([]);
    }
  };

  const loadScdMedications = async () => {
    try {
      // Check if firestore is initialized
      if (!firestore) {
        console.warn('Firestore not initialized yet');
        return;
      }
      
      const scdMedicationsRef = collection(firestore, 'scdMedications');
      const snapshot = await getDocs(scdMedicationsRef);
      
      const scdMedicationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'scdMedication'
      }));
      
      // Sort SCD medications alphabetically by drug name
      const sortedScdMedications = scdMedicationsData.sort((a, b) => {
        const drugA = (a.drug || '').toLowerCase();
        const drugB = (b.drug || '').toLowerCase();
        return drugA.localeCompare(drugB);
      });
      
      setScdMedications(sortedScdMedications);
    } catch (error) {
      console.error('Error loading SCD medications for search:', error);
      // Don't crash the app if SCD medications can't be loaded
      setScdMedications([]);
    }
  };

  const loadBookmarks = async () => {
    try {
      // Check if firestore is initialized
      if (!firestore) {
        console.warn('Firestore not initialized yet');
        return;
      }
      
      const bookmarksRef = collection(firestore, 'bookmarks');
      const snapshot = await getDocs(bookmarksRef);
      
      const bookmarksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'bookmark'
      }));
      
      // Sort bookmarks alphabetically by title
      const sortedBookmarks = bookmarksData.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
      
      setBookmarks(sortedBookmarks);
    } catch (error) {
      console.error('Error loading bookmarks for search:', error);
      // Don't crash the app if bookmarks can't be loaded
      setBookmarks([]);
    }
  };

  const loadShopProducts = () => {
    try {
      const allProducts = [];
      const uniqueItems = new Map();
      const { infusion_supplies, additional_supplies } = suppliesData.medical_supplies_database;
      
      // First collect unique items
      Object.entries(infusion_supplies).forEach(([category, items]) => {
        items.forEach(item => {
          const key = item.irc_code || item.name;
          if (!uniqueItems.has(key)) {
            uniqueItems.set(key, { ...item, originalCategory: category });
          }
        });
      });
      
      // Process each unique item once for search
      uniqueItems.forEach((item, key) => {
        allProducts.push({
          id: `${item.originalCategory}-${item.irc_code}`,
          category: item.originalCategory,
          name: item.name,
          irc_code: item.irc_code,
          description: item.description,
          purpose: item.purpose,
          image_url: item.image_url,
          type: 'shopProduct'
        });
      });

      // Process additional supplies
      if (additional_supplies) {
        additional_supplies.forEach((item, index) => {
          allProducts.push({
            id: `GENERAL-${item.irc_code || index}`,
            category: 'GENERAL',
            name: item.name,
            irc_code: item.irc_code || `GEN${index + 1}`,
            description: item.description,
            purpose: item.purpose,
            image_url: item.image_url,
            type: 'shopProduct'
          });
        });
      }

      setShopProducts(allProducts);
    } catch (error) {
      console.error('Error loading shop products for search:', error);
      setShopProducts([]);
    }
  };

  const loadNotes = async () => {
    try {
      // Check if firestore is initialized
      if (!firestore) {
        console.warn('Firestore not initialized yet');
        return;
      }
      
      const notesRef = collection(firestore, 'notes');
      const snapshot = await getDocs(notesRef);
      
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'note'
      }));
      
      // Sort notes by creation date
      const sortedNotes = notesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      setNotes(sortedNotes);
    } catch (error) {
      console.error('Error loading notes for search:', error);
      setNotes([]);
    }
  };

  const loadWorkflowSections = () => {
    // Define workflow sections statically as they're not stored in a database
    const sections = [
      { id: 'pre-procedure', title: 'Pre-Procedure', description: 'Patient assessment and preparation steps' },
      { id: 'assessment', title: 'Patient Assessment', description: 'Initial patient evaluation and vital signs' },
      { id: 'vascular-access', title: 'Vascular Access', description: 'IV insertion and access management' },
      { id: 'medication-prep', title: 'Medication Preparation', description: 'Drug calculation and preparation procedures' },
      { id: 'infusion-setup', title: 'Infusion Setup', description: 'Pump programming and setup instructions' },
      { id: 'during-infusion', title: 'During Infusion', description: 'Monitoring and management during therapy' },
      { id: 'post-infusion', title: 'Post-Infusion', description: 'Completion and documentation procedures' },
      { id: 'documentation', title: 'Documentation', description: 'Record keeping and reporting requirements' },
      { id: 'emergency', title: 'Emergency Protocols', description: 'Emergency response and troubleshooting' }
    ];
    
    setWorkflowSections(sections);
  };

  // Generate search suggestions for 1-3 letter queries
  const generateSuggestions = (query) => {
    if (!query || query.length < 1 || query.length > 3) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const allTerms = new Set();

    // Collect all possible search terms from medications
    medications.forEach(med => {
      if (med.brandName && med.brandName.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(med.brandName);
      }
      if (med.genericName && med.genericName.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(med.genericName);
      }
    });

    // Collect from HAE medications
    haeMedications.forEach(med => {
      if (med.drug && med.drug.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(med.drug);
      }
      if (med.brand && med.brand.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(med.brand);
      }
    });

    // Collect from SCD medications
    scdMedications.forEach(med => {
      if (med.drug && med.drug.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(med.drug);
      }
      if (med.generic && med.generic.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(med.generic);
      }
    });

    // Sort alphabetically and limit to top 10
    const sortedSuggestions = Array.from(allTerms)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .slice(0, 10);

    setSearchSuggestions(sortedSuggestions);
    setShowSuggestions(sortedSuggestions.length > 0);
  };

  // Search function
  const performSearch = (query) => {
    setSearchQuery(query);
    
    // Generate suggestions for short queries
    if (query.length >= 1 && query.length <= 3) {
      generateSuggestions(query);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
    
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Search medications - Only search by medication names
    const medicationResults = medications.filter(med => {
      const brandName = (med.brandName || '').toLowerCase();
      const genericName = (med.genericName || '').toLowerCase();
      
      // Only search by brand name and generic name
      return brandName.includes(lowerQuery) || 
             genericName.includes(lowerQuery);
    }).map(med => ({ ...med, resultType: 'medication', displayName: med.brandName || med.genericName }));

    // Search HAE medications - Only search by medication names
    const haeMedicationResults = haeMedications.filter(med => {
      const drug = (med.drug || '').toLowerCase();
      const brand = (med.brand || '').toLowerCase();
      
      // Only search by drug name and brand name
      return drug.includes(lowerQuery) || 
             brand.includes(lowerQuery);
    }).map(med => ({ ...med, resultType: 'haeMedication', displayName: med.drug || med.brand }));

    // Search SCD medications - Only search by medication names
    const scdMedicationResults = scdMedications.filter(med => {
      const drug = (med.drug || '').toLowerCase();
      const generic = (med.generic || '').toLowerCase();
      
      // Only search by drug name and generic name
      return drug.includes(lowerQuery) || 
             generic.includes(lowerQuery);
    }).map(med => ({ ...med, resultType: 'scdMedication', displayName: med.drug || med.generic }));

    // Remove non-medication searches
    const bookmarkResults = [];
    const shopResults = [];
    const noteResults = [];
    const workflowResults = [];

    // Combine results and limit to 20 (only medications)
    const combinedResults = [
      ...medicationResults,
      ...haeMedicationResults,
      ...scdMedicationResults
    ].slice(0, 20);

    setSearchResults(combinedResults);
    setShowDropdown(combinedResults.length > 0);
  };

  // Navigate to medication, bookmark, shop product, note, or workflow section
  const navigateToMedication = (item) => {
    try {
      setShowDropdown(false);
      setSearchQuery('');
      setSearchResults([]);
      
      if (navigate) {
        if (item.resultType === 'bookmark') {
          // Open bookmark URL
          if (item.url) {
            let url = item.url;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = 'https://' + url;
            }
            window.open(url, '_blank');
          }
        } else if (item.resultType === 'shopProduct') {
          // Navigate to shop page with selected product
          navigate('/shop', { 
            state: { 
              selectedProductId: item.id,
              scrollToProduct: true 
            } 
          });
        } else if (item.resultType === 'note') {
          // Navigate to notes page with selected note
          navigate('/notes', { 
            state: { 
              selectedNoteId: item.id,
              openNote: true 
            } 
          });
        } else if (item.resultType === 'workflow') {
          // Navigate to workflow page with selected section
          navigate('/workflow', { 
            state: { 
              selectedSectionId: item.id,
              scrollToSection: true 
            } 
          });
        } else if (item.resultType === 'haeMedication') {
          // Navigate to medications page with HAE medication selected
          navigate('/medications', { 
            state: { 
              selectedHaeMedicationId: item.id,
              openHaeModal: true,
              medicationType: 'hae'
            } 
          });
        } else if (item.resultType === 'scdMedication') {
          // Navigate to medications page with SCD medication selected
          navigate('/medications', { 
            state: { 
              selectedScdMedicationId: item.id,
              openScdModal: true,
              medicationType: 'scd'
            } 
          });
        } else {
          // Navigate to medications page and open the modal
          navigate('/medications', { 
            state: { 
              selectedMedicationId: item.id,
              openModal: true 
            } 
          });
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  return (
    <SearchContext.Provider value={{
      searchQuery,
      searchResults,
      searchSuggestions,
      isLoading,
      showDropdown,
      showSuggestions,
      setShowDropdown,
      setShowSuggestions,
      performSearch,
      navigateToMedication,
      clearSearch,
      loadMedications,
      loadHaeMedications,
      loadScdMedications,
      loadBookmarks,
      loadShopProducts,
      loadNotes,
      loadWorkflowSections
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;