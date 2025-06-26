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
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // Load medications and bookmarks on mount
  useEffect(() => {
    loadMedications();
    loadBookmarks();
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

  // Search function
  const performSearch = (query) => {
    setSearchQuery(query);
    
    if (!query || query.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Search medications
    const medicationResults = medications.filter(med => {
      const brandName = (med.brandName || '').toLowerCase();
      const genericName = (med.genericName || '').toLowerCase();
      const indication = (med.indication || '').toLowerCase();
      
      return brandName.includes(lowerQuery) || 
             genericName.includes(lowerQuery) || 
             indication.includes(lowerQuery);
    }).map(med => ({ ...med, resultType: 'medication' }));

    // Search bookmarks
    const bookmarkResults = bookmarks.filter(bookmark => {
      const title = (bookmark.title || '').toLowerCase();
      const url = (bookmark.url || '').toLowerCase();
      
      return title.includes(lowerQuery) || url.includes(lowerQuery);
    }).map(bookmark => ({ ...bookmark, resultType: 'bookmark' }));

    // Combine results and limit to 8
    const combinedResults = [...medicationResults, ...bookmarkResults].slice(0, 8);

    setSearchResults(combinedResults);
    setShowDropdown(combinedResults.length > 0);
  };

  // Navigate to medication or bookmark
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
      isLoading,
      showDropdown,
      setShowDropdown,
      performSearch,
      navigateToMedication,
      clearSearch,
      loadMedications,
      loadBookmarks
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;