import * as XLSX from 'xlsx';

export const parseScdExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file is empty or has no data rows'));
          return;
        }
        
        // Get headers from the first row
        const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
        
        // Map headers to field names
        const fieldMapping = {
          'drug': 'drug',
          'drug name': 'drug',
          'medication': 'drug',
          'generic': 'generic',
          'generic name': 'generic',
          'indication': 'indication',
          'dosage': 'dosage',
          'dose': 'dosage',
          'frequency': 'frequency',
          'rate administered': 'rateAdministered',
          'rate': 'rateAdministered',
          'administration rate': 'rateAdministered',
          'how supplied': 'howSupplied',
          'supplied': 'howSupplied',
          'vial sizes': 'vialSizes',
          'vial size': 'vialSizes',
          'dilution solution': 'dilutionSolution',
          'dilution': 'dilutionSolution',
          'reconstitution solution': 'reconstitutionSolution',
          'reconstitution': 'reconstitutionSolution',
          'side effects': 'sideEffects',
          'adverse effects': 'sideEffects',
          'ns bags/d5w': 'nsBagsD5w',
          'ns bags': 'nsBagsD5w',
          'd5w': 'nsBagsD5w',
          'overfill': 'overfill',
          'pre-med recommendation': 'preMedRecommendation',
          'premed recommendation': 'preMedRecommendation',
          'pre-medication': 'preMedRecommendation',
          'premedication': 'preMedRecommendation',
          'filters': 'filters',
          'filter': 'filters',
          'storage and handling': 'storageAndHandling',
          'storage & handling': 'storageAndHandling',
          'storage': 'storageAndHandling',
          'extended stability': 'extendedStability',
          'stability': 'extendedStability',
          'bbw': 'bbw',
          'black box warning': 'bbw',
          'black box': 'bbw',
          'special notes': 'specialNotes',
          'special note': 'specialNotes',
          'additional notes': 'additionalNotes',
          'additional note': 'additionalNotes',
          'notes': 'additionalNotes',
          'pregnancy category': 'pregnancyCategory',
          'pregnancy': 'pregnancyCategory'
        };
        
        // Create field index mapping
        const fieldIndices = {};
        headers.forEach((header, index) => {
          const mappedField = fieldMapping[header];
          if (mappedField) {
            fieldIndices[mappedField] = index;
          }
        });
        
        // Check if we have at least the drug field
        if (fieldIndices.drug === undefined) {
          reject(new Error('Excel file must have a "Drug" column'));
          return;
        }
        
        // Parse data rows
        const medications = [];
        const errors = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Skip empty rows
          if (!row || row.length === 0 || !row[fieldIndices.drug]) {
            continue;
          }
          
          try {
            const medication = {
              drug: row[fieldIndices.drug] ? String(row[fieldIndices.drug]).trim() : '',
              generic: row[fieldIndices.generic] ? String(row[fieldIndices.generic]).trim() : '',
              indication: row[fieldIndices.indication] ? String(row[fieldIndices.indication]).trim() : '',
              dosage: row[fieldIndices.dosage] ? String(row[fieldIndices.dosage]).trim() : '',
              frequency: row[fieldIndices.frequency] ? String(row[fieldIndices.frequency]).trim() : '',
              rateAdministered: row[fieldIndices.rateAdministered] ? String(row[fieldIndices.rateAdministered]).trim() : '',
              howSupplied: row[fieldIndices.howSupplied] ? String(row[fieldIndices.howSupplied]).trim() : '',
              vialSizes: row[fieldIndices.vialSizes] ? String(row[fieldIndices.vialSizes]).trim() : '',
              dilutionSolution: row[fieldIndices.dilutionSolution] ? String(row[fieldIndices.dilutionSolution]).trim() : '',
              reconstitutionSolution: row[fieldIndices.reconstitutionSolution] ? String(row[fieldIndices.reconstitutionSolution]).trim() : '',
              sideEffects: row[fieldIndices.sideEffects] ? String(row[fieldIndices.sideEffects]).trim() : '',
              nsBagsD5w: row[fieldIndices.nsBagsD5w] ? String(row[fieldIndices.nsBagsD5w]).trim() : '',
              overfill: row[fieldIndices.overfill] ? String(row[fieldIndices.overfill]).trim() : '',
              preMedRecommendation: row[fieldIndices.preMedRecommendation] ? String(row[fieldIndices.preMedRecommendation]).trim() : '',
              filters: row[fieldIndices.filters] ? String(row[fieldIndices.filters]).trim() : '',
              storageAndHandling: row[fieldIndices.storageAndHandling] ? String(row[fieldIndices.storageAndHandling]).trim() : '',
              extendedStability: row[fieldIndices.extendedStability] ? String(row[fieldIndices.extendedStability]).trim() : '',
              bbw: row[fieldIndices.bbw] ? String(row[fieldIndices.bbw]).trim() : '',
              specialNotes: row[fieldIndices.specialNotes] ? String(row[fieldIndices.specialNotes]).trim() : '',
              additionalNotes: row[fieldIndices.additionalNotes] ? String(row[fieldIndices.additionalNotes]).trim() : '',
              pregnancyCategory: row[fieldIndices.pregnancyCategory] ? String(row[fieldIndices.pregnancyCategory]).trim() : ''
            };
            
            // Only add if drug name is present
            if (medication.drug) {
              medications.push(medication);
            }
          } catch (error) {
            errors.push(`Row ${i + 1}: ${error.message}`);
          }
        }
        
        if (medications.length === 0) {
          reject(new Error('No valid medication data found in the Excel file'));
          return;
        }
        
        resolve({
          data: medications,  // Changed from 'medications' to 'data' for consistency
          medications,  // Keep for backward compatibility
          errors,
          totalRows: jsonData.length - 1,
          rowCount: jsonData.length - 1,  // Added for consistency with ExcelImportPreview
          successCount: medications.length
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

export const downloadScdExcelTemplate = () => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Define headers with all SCD fields
  const headers = [
    'Drug',
    'Generic',
    'Indication',
    'Dosage',
    'Frequency',
    'Rate Administered',
    'How Supplied',
    'Vial Sizes',
    'Dilution Solution',
    'Reconstitution Solution',
    'Side Effects',
    'NS Bags/D5W',
    'Overfill',
    'Pre-med Recommendation',
    'Filters',
    'Storage and Handling',
    'Extended Stability',
    'BBW',
    'Special Notes',
    'Additional Notes',
    'Pregnancy Category'
  ];
  
  // Create sample data
  const sampleData = [
    headers,
    [
      'ADAKVEO',
      'Crizanlizumab-tmca',
      'Sickle Cell Disease',
      '5 mg/kg',
      'Every 4 weeks',
      'Over 30 minutes',
      'Injection 100mg/10mL',
      '10mL vial',
      'NS or D5W',
      'N/A',
      'Headache, nausea, back pain, arthralgia',
      '100-500mL NS or D5W',
      'Yes',
      'None required',
      '0.2 micron in-line filter',
      'Store refrigerated 2-8°C',
      '4 hours at room temperature',
      'None',
      'Dilute in 100mL for ≤100kg or 500mL for >100kg',
      'Monitor for infusion reactions',
      'Not established'
    ],
    [
      'OXBRYTA',
      'Voxelotor',
      'Sickle Cell Disease',
      '1500 mg',
      'Once daily',
      'Oral',
      'Tablets 500mg',
      'N/A',
      'N/A',
      'N/A',
      'Headache, diarrhea, abdominal pain, nausea',
      'N/A',
      'N/A',
      'N/A',
      'N/A',
      'Store at room temperature',
      'N/A',
      'None',
      'Take with or without food',
      'May cause laboratory interference',
      'Not established'
    ]
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  
  // Set column widths
  const colWidths = headers.map(header => ({ wch: Math.max(header.length + 2, 15) }));
  ws['!cols'] = colWidths;
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'SCD Medications');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, 'scd_medications_template.xlsx');
};