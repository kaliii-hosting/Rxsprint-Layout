import React, { useState, useEffect } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import './InlineTableEditor.css';

const InlineTableEditor = ({ tableElement, onUpdate }) => {
  const [source, setSource] = useState([]);
  const [columns, setColumns] = useState([]);
  
  useEffect(() => {
    if (!tableElement) return;
    
    // Parse the table element
    const rows = tableElement.querySelectorAll('tr');
    const data = [];
    const cols = [];
    let maxCols = 0;
    
    // Find max columns
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      maxCols = Math.max(maxCols, cells.length);
    });
    
    // Create column definitions
    for (let i = 0; i < maxCols; i++) {
      cols.push({
        prop: `col${i}`,
        name: getExcelColumnName(i),
        size: 150,
        resizable: true,
        sortable: false
      });
    }
    
    // Parse data from table
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td, th');
      const rowData = {};
      
      cells.forEach((cell, cellIndex) => {
        rowData[`col${cellIndex}`] = cell.textContent || '';
      });
      
      // Fill empty cells
      for (let i = cells.length; i < maxCols; i++) {
        rowData[`col${i}`] = '';
      }
      
      data.push(rowData);
    });
    
    // Add extra empty rows for easier editing
    for (let i = 0; i < 5; i++) {
      const emptyRow = {};
      for (let j = 0; j < maxCols; j++) {
        emptyRow[`col${j}`] = '';
      }
      data.push(emptyRow);
    }
    
    setSource(data);
    setColumns(cols);
  }, [tableElement]);
  
  const getExcelColumnName = (index) => {
    let name = '';
    while (index >= 0) {
      name = String.fromCharCode(65 + (index % 26)) + name;
      index = Math.floor(index / 26) - 1;
    }
    return name;
  };
  
  const handleAfterEdit = (e) => {
    // Update source data
    const newSource = [...source];
    setSource(newSource);
    
    // Generate HTML table
    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    html += '<tbody>';
    
    // Only include non-empty rows
    newSource.forEach(row => {
      const hasContent = columns.some(col => row[col.prop] && row[col.prop].trim());
      if (hasContent) {
        html += '<tr>';
        columns.forEach(col => {
          const value = row[col.prop] || '';
          html += `<td style="border: 1px solid #ddd; padding: 8px;">${value}</td>`;
        });
        html += '</tr>';
      }
    });
    
    html += '</tbody></table>';
    
    // Notify parent of changes
    if (onUpdate) {
      onUpdate(html);
    }
  };
  
  const handleAddRow = () => {
    const newRow = {};
    columns.forEach(col => {
      newRow[col.prop] = '';
    });
    setSource([...source, newRow]);
  };
  
  const handleAddColumn = () => {
    const newColIndex = columns.length;
    const newCol = {
      prop: `col${newColIndex}`,
      name: getExcelColumnName(newColIndex),
      size: 150,
      resizable: true,
      sortable: false
    };
    
    setColumns([...columns, newCol]);
    
    // Add empty cell to all rows
    const newSource = source.map(row => ({
      ...row,
      [`col${newColIndex}`]: ''
    }));
    setSource(newSource);
  };
  
  if (!source.length || !columns.length) {
    return <div>Loading table...</div>;
  }
  
  return (
    <div className="inline-table-editor">
      <div className="inline-table-toolbar">
        <button onClick={handleAddRow} className="inline-table-btn">
          ➕ Row
        </button>
        <button onClick={handleAddColumn} className="inline-table-btn">
          ➕ Column
        </button>
        <span className="inline-table-info">
          {source.filter(row => columns.some(col => row[col.prop]?.trim())).length} rows × {columns.length} columns
        </span>
      </div>
      <div className="inline-table-grid">
        <RevoGrid
          source={source}
          columns={columns}
          resize={true}
          autoSizeColumn={false}
          range={true}
          clipboard={true}
          rowHeaders={true}
          canFocus={true}
          canMoveColumns={true}
          canMoveRows={true}
          rowSize={35}
          colSize={150}
          stretch={false}
          useClipboard={true}
          readonly={false}
          exporting={true}
          theme="compact"
          additionalData={{}}
          onAfterEdit={handleAfterEdit}
          onBeforeRangeEdit={() => true}
          onAfterRangeEdit={handleAfterEdit}
        />
      </div>
    </div>
  );
};

export default InlineTableEditor;