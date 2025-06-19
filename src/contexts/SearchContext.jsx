import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { useNavigate } from 'react-router-dom';

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
  const [medications, setMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // Load medications on mount
  useEffect(() => {
    loadMedications();
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

  // Search function
  const performSearch = (query) => {
    setSearchQuery(query);
    
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Search medications
    const lowerQuery = query.toLowerCase();
    const results = medications.filter(med => {
      const brandName = (med.brandName || '').toLowerCase();
      const genericName = (med.genericName || '').toLowerCase();
      const indication = (med.indication || '').toLowerCase();
      
      return brandName.includes(lowerQuery) || 
             genericName.includes(lowerQuery) || 
             indication.includes(lowerQuery);
    }).slice(0, 8); // Limit to 8 results

    setSearchResults(results);
    setShowDropdown(results.length > 0);
  };

  // Navigate to medication
  const navigateToMedication = (medication) => {
    try {
      setShowDropdown(false);
      setSearchQuery('');
      setSearchResults([]);
      
      // Navigate to medications page and open the modal
      if (navigate) {
        navigate('/medications', { 
          state: { 
            selectedMedicationId: medication.id,
            openModal: true 
          } 
        });
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
      isLoading,
      showDropdown,
      setShowDropdown,
      performSearch,
      navigateToMedication,
      clearSearch,
      loadMedications
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;