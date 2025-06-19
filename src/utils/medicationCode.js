// Generate unique medication codes in format MED-YYYY-XXXX

export const generateMedicationCode = async (firestore) => {
  const year = new Date().getFullYear();
  
  try {
    // Get the last medication code for this year
    const medicationsRef = collection(firestore, 'medications');
    const snapshot = await getDocs(medicationsRef);
    
    let maxNumber = 0;
    const yearPrefix = `MED-${year}-`;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.medicationCode && data.medicationCode.startsWith(yearPrefix)) {
        const numberPart = parseInt(data.medicationCode.replace(yearPrefix, ''), 10);
        if (!isNaN(numberPart) && numberPart > maxNumber) {
          maxNumber = numberPart;
        }
      }
    });
    
    // Generate next number
    const nextNumber = maxNumber + 1;
    const paddedNumber = String(nextNumber).padStart(4, '0');
    
    return `${yearPrefix}${paddedNumber}`;
  } catch (error) {
    console.error('Error generating medication code:', error);
    // Fallback to timestamp-based code
    const timestamp = Date.now().toString().slice(-6);
    return `MED-${year}-${timestamp}`;
  }
};

// Import required Firebase functions
import { collection, getDocs } from 'firebase/firestore';