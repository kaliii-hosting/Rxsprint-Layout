import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { defaultMedications } from '../data/defaultMedications';

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

  const value = {
    medications,
    loading,
    refreshMedications: loadMedications
  };

  return (
    <MedicationContext.Provider value={value}>
      {children}
    </MedicationContext.Provider>
  );
};