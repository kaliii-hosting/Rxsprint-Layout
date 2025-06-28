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
  const [bookmarks, setBookmarks] = useState([]);
  const [shopProducts, setShopProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();

  // Load medications, bookmarks, and shop products on mount
  useEffect(() => {
    loadMedications();
    loadBookmarks();
    loadShopProducts();
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

    // Collect from bookmarks
    bookmarks.forEach(bookmark => {
      if (bookmark.title && bookmark.title.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(bookmark.title);
      }
    });

    // Collect from shop products
    shopProducts.forEach(product => {
      if (product.name && product.name.toLowerCase().startsWith(lowerQuery)) {
        allTerms.add(product.name);
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

    // Search shop products
    const shopResults = shopProducts.filter(product => {
      const name = (product.name || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      const purpose = (product.purpose || '').toLowerCase();
      const ircCode = (product.irc_code || '').toLowerCase();
      
      return name.includes(lowerQuery) || 
             description.includes(lowerQuery) || 
             purpose.includes(lowerQuery) ||
             ircCode.includes(lowerQuery);
    }).map(product => ({ ...product, resultType: 'shopProduct' }));

    // Combine results and limit to 12
    const combinedResults = [...medicationResults, ...bookmarkResults, ...shopResults].slice(0, 12);

    setSearchResults(combinedResults);
    setShowDropdown(combinedResults.length > 0);
  };

  // Navigate to medication, bookmark, or shop product
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
      loadBookmarks,
      loadShopProducts
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export default SearchContext;