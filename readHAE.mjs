import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/mnt/c/Users/egyph/Desktop/hae input sample.xlsx';

try {
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', filePath);
    process.exit(1);
  }

  // Read the workbook
  const workbook = XLSX.readFile(filePath);
  
  console.log('Sheet names:', workbook.SheetNames);
  
  // Read the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Get the range of the worksheet
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  
  // Extract headers (first row)
  const headers = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = worksheet[cellAddress];
    headers.push(cell ? cell.v : `Column${col + 1}`);
  }
  
  console.log('\nHAE Excel Columns:');
  headers.forEach(header => {
    console.log('  -', header);
  });
  
  // Convert to JSON to see data
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('\nNumber of rows:', data.length);
  
  if (data.length > 0) {
    console.log('\nFirst 2 rows of data:');
    data.slice(0, 2).forEach((row, idx) => {
      console.log(`\nRow ${idx + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    });
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
}