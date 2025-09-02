// Excel Paste Handler - Consistent handling of Excel/table pastes across the app

export const handleExcelPaste = (clipboardData) => {
  const htmlData = clipboardData.getData('text/html');
  const plainText = clipboardData.getData('text/plain');
  
  let result = {
    isTable: false,
    html: null,
    data: null,
    rows: 0,
    columns: 0
  };
  
  // Check for HTML table data (from Excel or other sources)
  if (htmlData && (htmlData.includes('<table') || htmlData.includes('<TABLE'))) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlData;
    const table = tempDiv.querySelector('table');
    
    if (table) {
      // Clean Excel formatting
      cleanExcelTable(table);
      
      // Extract data
      const data = extractTableData(table);
      const rows = table.querySelectorAll('tr').length;
      const cols = table.querySelector('tr')?.querySelectorAll('td, th').length || 0;
      
      result = {
        isTable: true,
        html: table.outerHTML,
        data: data,
        rows: rows,
        columns: cols
      };
    }
  }
  // Check for tab-separated data (plain text Excel paste)
  else if (plainText && plainText.includes('\t')) {
    const rows = plainText.trim().split('\n');
    if (rows.length > 0) {
      const tableData = rows.map(row => row.split('\t').map(cell => ({
        value: cell.trim(),
        isHeader: false
      })));
      
      // Mark first row as headers if it looks like headers
      if (tableData.length > 0) {
        const firstRow = tableData[0];
        const hasNumbers = firstRow.some(cell => !isNaN(cell.value) && cell.value !== '');
        if (!hasNumbers) {
          // Likely headers
          firstRow.forEach(cell => cell.isHeader = true);
        }
      }
      
      const htmlTable = createTableFromData(tableData);
      
      result = {
        isTable: true,
        html: htmlTable,
        data: tableData,
        rows: tableData.length,
        columns: tableData[0]?.length || 0
      };
    }
  }
  
  return result;
};

// Clean Excel-specific formatting
export const cleanExcelTable = (table) => {
  // Remove table-level Excel styles
  table.removeAttribute('style');
  table.removeAttribute('width');
  table.removeAttribute('height');
  table.removeAttribute('border');
  table.removeAttribute('cellpadding');
  table.removeAttribute('cellspacing');
  
  // Add clean class
  table.className = 'excel-pasted-table';
  
  // Clean all rows
  const rows = table.querySelectorAll('tr');
  rows.forEach(row => {
    row.removeAttribute('style');
    row.removeAttribute('height');
  });
  
  // Clean all cells
  const cells = table.querySelectorAll('td, th');
  cells.forEach(cell => {
    // Remove inline styles that might have small font sizes
    const style = cell.getAttribute('style');
    if (style) {
      // Parse and keep only essential styles
      const styles = style.split(';').filter(s => s.trim());
      const cleanedStyles = [];
      
      styles.forEach(styleRule => {
        const [property, value] = styleRule.split(':').map(s => s.trim());
        
        // Skip font-size, font-family, width, height styles
        const skipProperties = [
          'font-size', 'font-family', 'line-height', 
          'width', 'height', 'min-width', 'max-width',
          'min-height', 'max-height', 'padding', 'margin'
        ];
        
        if (property && !skipProperties.includes(property.toLowerCase())) {
          // Keep background colors and text colors
          if (property.toLowerCase().includes('background') || 
              property.toLowerCase().includes('color')) {
            cleanedStyles.push(styleRule);
          }
        }
      });
      
      if (cleanedStyles.length > 0) {
        cell.setAttribute('style', cleanedStyles.join(';'));
      } else {
        cell.removeAttribute('style');
      }
    }
    
    // Remove Excel-specific classes
    const className = cell.className;
    if (className) {
      // Remove Excel classes (usually start with 'xl' or contain 'mso')
      const cleanedClasses = className
        .split(' ')
        .filter(cls => !cls.startsWith('xl') && !cls.includes('mso'))
        .join(' ');
      
      if (cleanedClasses) {
        cell.className = cleanedClasses;
      } else {
        cell.removeAttribute('class');
      }
    }
    
    // Remove other Excel attributes
    cell.removeAttribute('width');
    cell.removeAttribute('height');
    cell.removeAttribute('nowrap');
    cell.removeAttribute('valign');
    cell.removeAttribute('align');
  });
  
  return table;
};

// Extract table data
export const extractTableData = (table) => {
  const data = [];
  const rows = table.querySelectorAll('tr');
  
  rows.forEach((row, rowIndex) => {
    const rowData = [];
    const cells = row.querySelectorAll('td, th');
    
    cells.forEach(cell => {
      // Get text content, preserving line breaks
      const textContent = cell.innerText || cell.textContent || '';
      
      rowData.push({
        value: textContent.trim(),
        isHeader: cell.tagName === 'TH' || rowIndex === 0,
        colspan: cell.getAttribute('colspan') || 1,
        rowspan: cell.getAttribute('rowspan') || 1,
        style: cell.getAttribute('style') || ''
      });
    });
    
    if (rowData.length > 0) {
      data.push(rowData);
    }
  });
  
  return data;
};

// Create HTML table from data
export const createTableFromData = (data) => {
  let html = '<table class="excel-pasted-table">\n';
  
  // Check if first row should be header
  const hasHeaders = data[0] && data[0][0]?.isHeader;
  
  if (hasHeaders) {
    html += '  <thead>\n    <tr>\n';
    data[0].forEach(cell => {
      const value = escapeHtml(cell.value || cell);
      html += `      <th>${value}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n';
    html += '  <tbody>\n';
    
    // Add remaining rows as body
    data.slice(1).forEach(row => {
      html += '    <tr>\n';
      row.forEach(cell => {
        const value = escapeHtml(cell.value || cell);
        html += `      <td>${value}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n';
  } else {
    // All rows in tbody
    html += '  <tbody>\n';
    data.forEach(row => {
      html += '    <tr>\n';
      row.forEach(cell => {
        const value = escapeHtml(cell.value || cell);
        html += `      <td>${value}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n';
  }
  
  html += '</table>';
  return html;
};

// Escape HTML special characters
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Detect if table is large
export const isLargeTable = (rows, columns) => {
  // Consider a table large if it has many rows or columns
  return rows > 20 || columns > 10;
};

// Format table for display
export const formatTableForDisplay = (table) => {
  // Ensure table has proper structure
  if (!table.querySelector('tbody')) {
    const tbody = document.createElement('tbody');
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.forEach(row => tbody.appendChild(row));
    table.appendChild(tbody);
  }
  
  // Ensure headers are in thead if present
  const firstRow = table.querySelector('tr');
  if (firstRow) {
    const firstCells = firstRow.querySelectorAll('th');
    if (firstCells.length > 0 && !table.querySelector('thead')) {
      const thead = document.createElement('thead');
      thead.appendChild(firstRow);
      table.insertBefore(thead, table.firstChild);
    }
  }
  
  return table;
};