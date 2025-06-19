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
  'Route of Administration',
  'Normal Saline Bag',
  'Overall Rate',
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
  'route of administration': 'routeOfAdministration',
  'normal saline bag': 'normalSalineBag',
  'overall rate': 'overallRate',
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
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }
        
        // Validate columns
        const headers = Object.keys(jsonData[0]);
        const validation = validateColumns(headers);
        
        if (!validation.isValid) {
          reject(new Error(`Missing required columns: ${validation.missingColumns.join(', ')}`));
          return;
        }
        
        // Transform data to match our schema
        const transformedData = transformData(jsonData);
        
        resolve({
          data: transformedData,
          rowCount: transformedData.length,
          columns: headers
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
    'Route of Administration': med.routeOfAdministration || '',
    'Normal Saline Bag': med.normalSalineBag || '',
    'Overall Rate': med.overallRate || '',
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