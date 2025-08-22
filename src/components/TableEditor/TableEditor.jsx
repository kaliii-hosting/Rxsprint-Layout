import React, { useState, useEffect, useRef } from 'react';
import { RevoGrid } from '@revolist/react-datagrid';
import './TableEditor.css';

const TableEditor = ({ 
  initialData, 
  onSave, 
  onClose,
  isReadOnly = false,
  tableElement = null,
  inline = false
}) => {
  const [source, setSource] = useState([]);
  const [columns, setColumns] = useState([]);
  
  // Initialize with some default data
  useEffect(() => {
    // Default columns configuration
    const defaultColumns = [
      { prop: 'name', name: 'A' },
      { prop: 'details', name: 'B' },
      { prop: 'qty', name: 'C' },
      { prop: 'price', name: 'D' },
      { prop: 'total', name: 'E' }
    ];
    
    // Default data
    const defaultSource = [];
    for (let i = 0; i < 20; i++) {
      defaultSource.push({
        name: '',
        details: '',
        qty: '',
        price: '',
        total: ''
      });
    }
    
    // If we have initial data or table element, parse it
    if (tableElement) {
      const { data, cols } = parseTableElement(tableElement);
      setSource(data);
      setColumns(cols);
    } else if (initialData && initialData.length > 0) {
      const { data, cols } = parseInitialData(initialData);
      setSource(data);
      setColumns(cols);
    } else {
      setSource(defaultSource);
      setColumns(defaultColumns);
    }
  }, [initialData, tableElement]);
  
  const parseTableElement = (table) => {
    const rows = table.querySelectorAll('tr');
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
        sortable: false,
        readonly: isReadOnly
      });
    }
    
    // Parse data
    rows.forEach((row, rowIndex) => {
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
    
    // Ensure at least 20 rows
    while (data.length < 20) {
      const emptyRow = {};
      for (let i = 0; i < maxCols; i++) {
        emptyRow[`col${i}`] = '';
      }
      data.push(emptyRow);
    }
    
    return { data, cols };
  };
  
  const parseInitialData = (initData) => {
    const data = [];
    let maxCols = 0;
    
    // Find max columns
    initData.forEach(row => {
      if (Array.isArray(row)) {
        maxCols = Math.max(maxCols, row.length);
      }
    });
    
    maxCols = Math.max(maxCols, 5); // Minimum 5 columns
    
    // Create column definitions
    const cols = [];
    for (let i = 0; i < maxCols; i++) {
      cols.push({
        prop: `col${i}`,
        name: getExcelColumnName(i)
      });
    }
    
    // Parse data
    initData.forEach(row => {
      const rowData = {};
      if (Array.isArray(row)) {
        row.forEach((cell, index) => {
          rowData[`col${index}`] = cell || '';
        });
      }
      // Fill empty cells
      for (let i = (Array.isArray(row) ? row.length : 0); i < maxCols; i++) {
        rowData[`col${i}`] = '';
      }
      data.push(rowData);
    });
    
    // Ensure at least 20 rows
    while (data.length < 20) {
      const emptyRow = {};
      for (let i = 0; i < maxCols; i++) {
        emptyRow[`col${i}`] = '';
      }
      data.push(emptyRow);
    }
    
    return { data, cols };
  };
  
  const getExcelColumnName = (index) => {
    let name = '';
    while (index >= 0) {
      name = String.fromCharCode(65 + (index % 26)) + name;
      index = Math.floor(index / 26) - 1;
    }
    return name;
  };
  
  const handleSave = () => {
    // Convert data back to table HTML
    let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    html += '<tbody>';
    
    source.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        const value = row[col.prop] || '';
        html += `<td style="border: 1px solid #ddd; padding: 8px;">${value}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    // Convert to array format
    const arrayData = source.map(row => 
      columns.map(col => row[col.prop] || '')
    );
    
    if (onSave) {
      onSave(html, arrayData);
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
      sortable: false,
      readonly: isReadOnly
    };
    
    setColumns([...columns, newCol]);
    
    // Add empty cell to all rows
    const newSource = source.map(row => ({
      ...row,
      [`col${newColIndex}`]: ''
    }));
    setSource(newSource);
  };
  
  const containerClass = inline ? 'revo-container-inline' : 'revo-container';
  
  return (
    <>
      {!inline && <div className="revo-overlay" onClick={onClose} />}
      <div className={containerClass}>
        <div className="revo-header">
          <div className="revo-title">
            📊 Excel Editor
          </div>
          <div className="revo-info">
            {source.length} rows × {columns.length} columns
          </div>
        </div>
        
        <div className="revo-toolbar">
          <button onClick={handleAddRow} className="revo-btn">
            ➕ Add Row
          </button>
          <button onClick={handleAddColumn} className="revo-btn">
            ➕ Add Column
          </button>
          <div className="revo-toolbar-spacer" />
          <button onClick={handleSave} className="revo-btn revo-btn-save">
            💾 Save
          </button>
          {!inline && onClose && (
            <button onClick={onClose} className="revo-btn revo-btn-close">
              ❌ Close
            </button>
          )}
        </div>
        
        <div className="revo-grid-wrapper">
          <RevoGrid
            source={source}
            columns={columns}
            range={true}
            resize={true}
            autoSizeColumn={false}
            rowHeaders={true}
            canFocus={true}
            useClipboard={true}
            canMoveColumns={true}
            canMoveRows={true}
            rowSize={35}
            colSize={150}
            stretch={false}
            readonly={isReadOnly}
            exporting={true}
            theme="compact"
            additionalData={{}}
            onAfterEdit={(e) => {
              const { row, col, val } = e.detail;
              const updatedSource = [...source];
              if (updatedSource[row] && columns[col]) {
                updatedSource[row][columns[col].prop] = val;
                setSource(updatedSource);
              }
            }}
            onBeforeRangeEdit={() => true}
            onAfterRangeEdit={(e) => {
              const { row, col, val } = e.detail;
              const updatedSource = [...source];
              if (updatedSource[row] && columns[col]) {
                updatedSource[row][columns[col].prop] = val;
                setSource(updatedSource);
              }
            }}
          />
        </div>
        
        <div className="revo-footer">
          Double-click to edit • Drag to select • Copy/Paste supported
        </div>
      </div>
    </>
  );
};

export default TableEditor;