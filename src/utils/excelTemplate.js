import * as XLSX from 'xlsx';

export const downloadExcelTemplate = () => {
  // Sample data with all required columns
  const templateData = [
    {
      'Brand Name': 'Example Drug 1',
      'Indication': 'Hypertension',
      'Generic Name': 'Example Generic 1',
      'Dosage Form': 'Tablet',
      'Vial Size': '10mg',
      'Reconstitution Solution': 'N/A',
      'Reconstitution Volume': 'N/A',
      'Dose': '10mg',
      'Dose Frequency': 'Once daily',
      'Route of Administration': 'Oral',
      'Normal Saline Bag': 'N/A',
      'Overall Rate': 'N/A',
      'Filter': 'N/A',
      'Infusion Steps': 'N/A',
      'Notes': 'Take with food',
      'Special Dosing': 'Adjust for renal impairment'
    },
    {
      'Brand Name': 'Example Drug 2',
      'Indication': 'Infection',
      'Generic Name': 'Example Generic 2',
      'Dosage Form': 'Injection',
      'Vial Size': '500mg',
      'Reconstitution Solution': 'Sterile Water',
      'Reconstitution Volume': '10mL',
      'Dose': '250mg',
      'Dose Frequency': 'Every 12 hours',
      'Route of Administration': 'IV',
      'Normal Saline Bag': '100mL',
      'Overall Rate': '30 minutes',
      'Filter': '0.22 micron',
      'Infusion Steps': '1. Reconstitute with 10mL sterile water\n2. Add to 100mL NS\n3. Infuse over 30 minutes',
      'Notes': 'Monitor for allergic reactions',
      'Special Dosing': 'Reduce dose in hepatic impairment'
    }
  ];

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(templateData);

  // Set column widths
  const columnWidths = [
    { wch: 15 }, // Brand Name
    { wch: 15 }, // Indication
    { wch: 20 }, // Generic Name
    { wch: 12 }, // Dosage Form
    { wch: 10 }, // Vial Size
    { wch: 20 }, // Reconstitution Solution
    { wch: 20 }, // Reconstitution Volume
    { wch: 10 }, // Dose
    { wch: 15 }, // Dose Frequency
    { wch: 20 }, // Route of Administration
    { wch: 15 }, // Normal Saline Bag
    { wch: 12 }, // Overall Rate
    { wch: 10 }, // Filter
    { wch: 30 }, // Infusion Steps
    { wch: 25 }, // Notes
    { wch: 25 }, // Special Dosing
  ];
  ws['!cols'] = columnWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Medications Template');

  // Generate filename
  const filename = 'medications_template.xlsx';

  // Write file
  XLSX.writeFile(wb, filename);
};