import * as XLSX from 'xlsx';

// Define required columns for medication data
export const REQUIRED_COLUMNS = [
  'Brand Name',
  'Indication',
  'Generic Name',
  'Dosage Form',
  'Vial Size',
  'Reconstitution Solution',
  'Reconstitution Volume',
  'Dose',
  'Dose Frequency',
  'Infusion Rate',
  'Normal Saline Bag',
  'Overfill Rule',
  'Filter',
  'Infusion Steps',
  'Notes',
  'Special Dosing'
];

// Column mapping to normalize different variations
const COLUMN_MAPPING = {
  'brand name': 'brandName',
  'indication': 'indication',
  'generic name': 'genericName',
  'dosage form': 'dosageForm',
  'vial size': 'vialSize',
  'reconstitution solution': 'reconstitutionSolution',
  'reconstitution volume': 'reconstitutionVolume',
  'dose': 'dose',
  'dose frequency': 'doseFrequency',
  'infusion rate': 'infusionRate',
  'normal saline bag': 'normalSalineBag',
  'overfill rule': 'overfillRule',
  'filter': 'filter',
  'infusion steps': 'infusionSteps',
  'notes': 'notes',
  'special dosing': 'specialDosing'
};

export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file must contain at least a header row and one data row'));
          return;
        }
        
        // Get headers from first row
        const headers = jsonData[0];
        
        // Parse data rows
        const medications = [];
        const errors = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          const rowNumber = i + 1; // Excel row numbers are 1-based
          
          // Check if row has any data
          const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
          if (!hasData) continue;
          
          const medication = {};
          let hasRequiredField = false;
          
          // Map row data to medication object
          headers.forEach((header, index) => {
            const normalizedHeader = header.toString().toLowerCase().trim();
            const mappedKey = COLUMN_MAPPING[normalizedHeader];
            
            if (mappedKey) {
              const value = row[index];
              medication[mappedKey] = value !== null && value !== undefined ? value.toString().trim() : '';
              
              // Check if we have at least brand name or generic name
              if ((mappedKey === 'brandName' || mappedKey === 'genericName') && medication[mappedKey]) {
                hasRequiredField = true;
              }
            }
          });
          
          // Validate the medication
          if (!medication.brandName && !medication.genericName) {
            errors.push({
              row: rowNumber,
              message: 'Missing both Brand Name and Generic Name'
            });
            continue;
          }
          
          if (!medication.brandName) {
            errors.push({
              row: rowNumber,
              message: 'Missing Brand Name',
              severity: 'warning'
            });
          }
          
          medications.push(medication);
        }
        
        if (medications.length === 0 && errors.length === 0) {
          reject(new Error('No valid medication data found in the Excel file'));
          return;
        }
        
        resolve({
          data: medications,
          errors: errors,
          rowCount: medications.length,
          totalRows: jsonData.length - 1,
          headers: headers
        });
        
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

const validateColumns = (headers) => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const missingColumns = [];
  
  REQUIRED_COLUMNS.forEach(requiredCol => {
    const normalizedRequired = requiredCol.toLowerCase();
    if (!normalizedHeaders.includes(normalizedRequired)) {
      missingColumns.push(requiredCol);
    }
  });
  
  return {
    isValid: missingColumns.length === 0,
    missingColumns
  };
};

const transformData = (jsonData) => {
  return jsonData.map((row, index) => {
    const transformedRow = {
      id: Date.now() + index,
      selected: false
    };
    
    // Map each column to our schema
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key.toLowerCase().trim();
      const mappedKey = COLUMN_MAPPING[normalizedKey];
      
      if (mappedKey) {
        // Clean and format the value
        transformedRow[mappedKey] = value ? value.toString().trim() : '';
      }
    });
    
    return transformedRow;
  });
};

export const exportToExcel = (medications) => {
  // Transform medications back to Excel format
  const excelData = medications.map(med => ({
    'Brand Name': med.brandName || '',
    'Indication': med.indication || '',
    'Generic Name': med.genericName || '',
    'Dosage Form': med.dosageForm || '',
    'Vial Size': med.vialSize || '',
    'Reconstitution Solution': med.reconstitutionSolution || '',
    'Reconstitution Volume': med.reconstitutionVolume || '',
    'Dose': med.dose || '',
    'Dose Frequency': med.doseFrequency || '',
    'Infusion Rate': med.infusionRate || '',
    'Normal Saline Bag': med.normalSalineBag || '',
    'Overfill Rule': med.overfillRule || '',
    'Filter': med.filter || '',
    'Infusion Steps': med.infusionSteps || '',
    'Notes': med.notes || '',
    'Special Dosing': med.specialDosing || ''
  }));
  
  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Medications');
  
  // Generate filename with timestamp
  const filename = `medications_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
};