import * as XLSX from 'xlsx';

// Define required columns for HAE medication data
export const HAE_REQUIRED_COLUMNS = [
  'Drug',
  'Brand',
  'Company',
  'Source',
  'MOA',
  'Admin Route',
  'Concentration',
  'Strength',
  'Filter',
  'Dosing',
  'MAX Dose',
  'BBW',
  'Preg. Category & Lactation',
  'SE',
  'Rate Admin',
  'Recon amt',
  'How supplied',
  'Storage',
  'Extra Notes'
];

// Column mapping to normalize different variations
const HAE_COLUMN_MAPPING = {
  'drug': 'drug',
  'brand': 'brand',
  'company': 'company',
  'source': 'source',
  'moa': 'moa',
  'admin route': 'adminRoute',
  'concentration': 'concentration',
  'strength': 'strength',
  'filter': 'filter',
  'dosing': 'dosing',
  'max dose': 'maxDose',
  'bbw': 'bbw',
  'preg. category & lactation': 'pregCategoryLactation',
  'se': 'se',
  'rate admin': 'rateAdmin',
  'recon amt': 'reconAmt',
  'how supplied': 'howSupplied',
  'storage': 'storage',
  'extra notes': 'extraNotes'
};

export const parseHaeExcelFile = async (file) => {
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
        
        if (jsonData.length === 0) {
          throw new Error('Excel file is empty');
        }
        
        // Extract headers from first row
        const headers = jsonData[0];
        const normalizedHeaders = headers.map(h => h.toString().toLowerCase().trim());
        
        // Create column index map
        const columnIndexMap = {};
        normalizedHeaders.forEach((header, index) => {
          const mappedKey = HAE_COLUMN_MAPPING[header];
          if (mappedKey) {
            columnIndexMap[mappedKey] = index;
          }
        });
        
        // Parse data rows
        const medications = [];
        const errors = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Skip empty rows
          if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }
          
          const medication = {};
          let hasRequiredData = false;
          
          // Map each column to medication object
          Object.entries(columnIndexMap).forEach(([key, index]) => {
            const value = row[index];
            if (value && value.toString().trim()) {
              medication[key] = value.toString().trim();
              if (key === 'drug' || key === 'brand') {
                hasRequiredData = true;
              }
            }
          });
          
          // Only add if has at least drug or brand name
          if (hasRequiredData) {
            medications.push(medication);
          } else {
            errors.push({
              row: i + 1,
              message: 'Missing drug or brand name'
            });
          }
        }
        
        resolve({
          data: medications,
          errors,
          rowCount: jsonData.length - 1,
          missingColumns: []
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

// Export function to download HAE template
export const downloadHaeExcelTemplate = () => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Create template data with headers
  const templateData = [
    HAE_REQUIRED_COLUMNS,
    // Sample row
    [
      'BERINERT',
      'C1 Esterase Inhibitor',
      'CSL Behring',
      'Human plasma',
      'C1-INH replacement',
      'IV',
      '500 units',
      '500 units/vial',
      'No',
      '20 units/kg',
      '20 units/kg',
      'Risk of thrombosis',
      'Category C',
      'Hypersensitivity reactions',
      '4 mL/min',
      '10 mL SWFI',
      '500 unit vial',
      'Store at 2-25°C',
      'For acute HAE attacks'
    ]
  ];
  
  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(templateData);
  
  // Set column widths
  const colWidths = HAE_REQUIRED_COLUMNS.map(() => ({ wch: 15 }));
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'HAE Medications Template');
  
  // Generate and download file
  XLSX.writeFile(wb, 'HAE_Medications_Template.xlsx');
};