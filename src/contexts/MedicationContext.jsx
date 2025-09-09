import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { defaultMedications } from '../data/defaultMedications';
import dailyMedService from '../services/dailyMedService';
import dailyMedParser from '../utils/dailyMedParser';

const MedicationContext = createContext();

export const useMedications = () => {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error('useMedications must be used within a MedicationProvider');
  }
  return context;
};

export const MedicationProvider = ({ children }) => {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyMedResults, setDailyMedResults] = useState(null);
  const [searchingDailyMed, setSearchingDailyMed] = useState(false);

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setLoading(true);
      
      if (!firestore) {
        // Use default medications as fallback
        const fallbackMedications = defaultMedications.map(med => ({
          ...med,
          selected: false
        }));
        
        const sortedMedications = fallbackMedications.sort((a, b) => {
          const brandA = (a.brandName || '').toLowerCase();
          const brandB = (b.brandName || '').toLowerCase();
          return brandA.localeCompare(brandB);
        });
        
        setMedications(sortedMedications);
        setLoading(false);
        return;
      }

      const medicationsRef = collection(firestore, 'medications');
      const snapshot = await getDocs(medicationsRef);
      
      if (snapshot.empty) {
        // Load default medications if collection is empty
        const fallbackMedications = defaultMedications.map(med => ({
          ...med,
          selected: false
        }));
        
        const sortedMedications = fallbackMedications.sort((a, b) => {
          const brandA = (a.brandName || '').toLowerCase();
          const brandB = (b.brandName || '').toLowerCase();
          return brandA.localeCompare(brandB);
        });
        
        setMedications(sortedMedications);
      } else {
        const medicationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          selected: false
        }));
        
        const sortedMedications = medicationsData.sort((a, b) => {
          const brandA = (a.brandName || '').toLowerCase();
          const brandB = (b.brandName || '').toLowerCase();
          return brandA.localeCompare(brandB);
        });
        
        setMedications(sortedMedications);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
      
      // Fallback to default medications on error
      const fallbackMedications = defaultMedications.map(med => ({
        ...med,
        selected: false
      }));
      
      const sortedMedications = fallbackMedications.sort((a, b) => {
        const brandA = (a.brandName || '').toLowerCase();
        const brandB = (b.brandName || '').toLowerCase();
        return brandA.localeCompare(brandB);
      });
      
      setMedications(sortedMedications);
    } finally {
      setLoading(false);
    }
  };

  // Search DailyMed database
  const searchDailyMed = async (query, filters = {}) => {
    setSearchingDailyMed(true);
    try {
      const results = await dailyMedService.searchMedications(query, filters);
      setDailyMedResults(results);
      return results;
    } catch (error) {
      console.error('Error searching DailyMed:', error);
      setDailyMedResults({ results: [], count: 0, error: error.message });
      return { results: [], count: 0, error: error.message };
    } finally {
      setSearchingDailyMed(false);
    }
  };

  // Import medication from DailyMed to Firebase
  const importFromDailyMed = async (dailyMedData) => {
    try {
      // Convert DailyMed data to our medication format
      const medicationData = dailyMedParser.convertToMedicationFormat(dailyMedData);
      
      if (!medicationData) {
        throw new Error('Failed to parse medication data');
      }

      // Generate a unique ID for the medication
      const medicationId = `dailymed_${dailyMedData.setId || Date.now()}`;
      
      // Save to Firebase if available
      if (firestore) {
        const medicationRef = doc(collection(firestore, 'medications'), medicationId);
        await setDoc(medicationRef, {
          ...medicationData,
          id: medicationId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Add to local state
      const newMedication = {
        ...medicationData,
        id: medicationId,
        selected: false
      };
      
      setMedications(prev => {
        // Check if medication already exists
        const exists = prev.some(med => 
          med.setId === dailyMedData.setId || 
          (med.brandName === medicationData.brandName && 
           med.genericName === medicationData.genericName)
        );
        
        if (exists) {
          // Update existing medication
          return prev.map(med => 
            med.setId === dailyMedData.setId || 
            (med.brandName === medicationData.brandName && 
             med.genericName === medicationData.genericName)
              ? { ...med, ...newMedication }
              : med
          );
        } else {
          // Add new medication and sort
          const updated = [...prev, newMedication];
          return updated.sort((a, b) => {
            const brandA = (a.brandName || '').toLowerCase();
            const brandB = (b.brandName || '').toLowerCase();
            return brandA.localeCompare(brandB);
          });
        }
      });
      
      return newMedication;
    } catch (error) {
      console.error('Error importing medication from DailyMed:', error);
      throw error;
    }
  };

  // Clear DailyMed search results
  const clearDailyMedResults = () => {
    setDailyMedResults(null);
  };

  const value = {
    medications,
    loading,
    refreshMedications: loadMedications,
    dailyMedResults,
    searchingDailyMed,
    searchDailyMed,
    importFromDailyMed,
    clearDailyMedResults
  };

  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  );
};