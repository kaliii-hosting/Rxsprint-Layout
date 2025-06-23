import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { mapLegacyMedicationData } from '../data/medicationDataModel';

// Migrate all medications to the new structure
export const migrateMedications = async () => {
  try {
    console.log('Starting medication migration...');
    const medicationsRef = collection(firestore, 'medications');
    const snapshot = await getDocs(medicationsRef);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const docSnapshot of snapshot.docs) {
      try {
        const medicationData = docSnapshot.data();
        
        // Check if already migrated
        if (medicationData.standardDose && typeof medicationData.standardDose === 'object') {
          console.log(`Medication ${medicationData.brandName} already migrated, skipping...`);
          continue;
        }
        
        // Map to new structure
        const migratedData = mapLegacyMedicationData(medicationData);
        
        // Update in Firebase
        await updateDoc(doc(firestore, 'medications', docSnapshot.id), migratedData);
        
        console.log(`Migrated: ${medicationData.brandName}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`Error migrating medication ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }
    
    console.log(`Migration complete: ${migratedCount} migrated, ${errorCount} errors`);
    return { migratedCount, errorCount };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

// Check if a medication needs migration
export const needsMigration = (medication) => {
  return !medication.standardDose || typeof medication.standardDose !== 'object';
};

// Batch check for medications needing migration
export const checkMigrationStatus = async () => {
  try {
    const medicationsRef = collection(firestore, 'medications');
    const snapshot = await getDocs(medicationsRef);
    
    let needMigration = 0;
    let alreadyMigrated = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (needsMigration(data)) {
        needMigration++;
      } else {
        alreadyMigrated++;
      }
    });
    
    return {
      total: snapshot.docs.length,
      needMigration,
      alreadyMigrated
    };
    
  } catch (error) {
    console.error('Failed to check migration status:', error);
    throw error;
  }
};