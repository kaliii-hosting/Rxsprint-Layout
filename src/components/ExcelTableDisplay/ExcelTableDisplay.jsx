import React, { useEffect, useRef, useState } from 'react';
import './ExcelTableDisplay.css';

const ExcelTableDisplay = ({ 
  tableHtml, 
  data, 
  rows, 
  columns,
  readOnly = false,
  onChange
}) => {
  const tableRef = useRef(null);
  const containerRef = useRef(null);
  const [tableData, setTableData] = useState(data || []);
  const [isEditing, setIsEditing] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});

  // Parse HTML table if no data provided
  useEffect(() => {
    if (tableHtml && !data) {
      parseHtmlTable();
    }
  }, [tableHtml]);

  // Auto-calculate column widths based on content
  useEffect(() => {
    if (tableRef.current) {
      calculateColumnWidths();
    }
  }, [tableData]);

  const parseHtmlTable = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(tableHtml, 'text/html');
    const table = doc.querySelector('table');
    
    if (table) {
      const parsedData = [];
      const rows = table.querySelectorAll('tr');
      
      rows.forEach(row => {
        const rowData = [];
        const cells = row.querySelectorAll('td, th');
        cells.forEach(cell => {
          rowData.push({
            value: cell.textContent.trim(),
            isHeader: cell.tagName === 'TH',
            className: cell.className,
            style: cell.getAttribute('style')
          });
        });
        parsedData.push(rowData);
      });
      
      setTableData(parsedData);
    }
  };

  const calculateColumnWidths = () => {
    if (!tableRef.current) return;
    
    const table = tableRef.current;
    const cells = table.querySelectorAll('th, td');
    const widths = {};
    
    cells.forEach(cell => {
      const columnIndex = cell.cellIndex;
      const cellWidth = cell.scrollWidth + 20; // Add padding
      
      if (!widths[columnIndex] || widths[columnIndex] < cellWidth) {
        widths[columnIndex] = Math.min(cellWidth, 400); // Max width 400px
      }
    });
    
    setColumnWidths(widths);
  };

  const handleCellEdit = (rowIndex, colIndex, value) => {
    const newData = [...tableData];
    if (!newData[rowIndex][colIndex]) {
      newData[rowIndex][colIndex] = {};
    }
    newData[rowIndex][colIndex].value = value;
    setTableData(newData);
    
    if (onChange) {
      onChange(newData);
    }
  };

  const handleCellClick = (rowIndex, colIndex) => {
    if (!readOnly) {
      setIsEditing({ row: rowIndex, col: colIndex });
    }
  };

  const handleCellBlur = () => {
    setIsEditing(null);
  };

  const handleKeyDown = (e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next row
      if (rowIndex < tableData.length - 1) {
        setIsEditing({ row: rowIndex + 1, col: colIndex });
      } else {
        setIsEditing(null);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Move to next column
      if (colIndex < tableData[rowIndex].length - 1) {
        setIsEditing({ row: rowIndex, col: colIndex + 1 });
      } else if (rowIndex < tableData.length - 1) {
        // Move to next row, first column
        setIsEditing({ row: rowIndex + 1, col: 0 });
      } else {
        setIsEditing(null);
      }
    } else if (e.key === 'Escape') {
      setIsEditing(null);
    }
  };

  // Render table from data
  const renderTable = () => {
    if (tableData.length === 0) {
      return <div className="empty-table">No data available</div>;
    }

    return (
      <table ref={tableRef} className="excel-table-display">
        <thead>
          {tableData[0] && tableData[0][0]?.isHeader && (
            <tr>
              {tableData[0].map((cell, colIndex) => (
                <th 
                  key={colIndex}
                  style={{ 
                    minWidth: columnWidths[colIndex] || 'auto',
                    width: columnWidths[colIndex] || 'auto'
                  }}
                  onClick={() => handleCellClick(0, colIndex)}
                >
                  {isEditing?.row === 0 && isEditing?.col === colIndex ? (
                    <input
                      type="text"
                      value={cell.value || ''}
                      onChange={(e) => handleCellEdit(0, colIndex, e.target.value)}
                      onBlur={handleCellBlur}
                      onKeyDown={(e) => handleKeyDown(e, 0, colIndex)}
                      autoFocus
                      className="cell-editor"
                    />
                  ) : (
                    <div className="cell-content">{cell.value || ''}</div>
                  )}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {tableData.slice(tableData[0]?.[0]?.isHeader ? 1 : 0).map((row, rowIndex) => {
            const actualRowIndex = tableData[0]?.[0]?.isHeader ? rowIndex + 1 : rowIndex;
            return (
              <tr key={actualRowIndex}>
                {row.map((cell, colIndex) => (
                  <td 
                    key={colIndex}
                    style={{ 
                      minWidth: columnWidths[colIndex] || 'auto',
                      width: columnWidths[colIndex] || 'auto'
                    }}
                    onClick={() => handleCellClick(actualRowIndex, colIndex)}
                    className={isEditing?.row === actualRowIndex && isEditing?.col === colIndex ? 'editing' : ''}
                  >
                    {isEditing?.row === actualRowIndex && isEditing?.col === colIndex ? (
                      <input
                        type="text"
                        value={cell?.value || ''}
                        onChange={(e) => handleCellEdit(actualRowIndex, colIndex, e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={(e) => handleKeyDown(e, actualRowIndex, colIndex)}
                        autoFocus
                        className="cell-editor"
                      />
                    ) : (
                      <div className="cell-content">{cell?.value || ''}</div>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  return (
    <div className="excel-table-container" ref={containerRef}>
      <div className="table-info-bar">
        <span className="table-size">{rows || tableData.length} rows × {columns || (tableData[0]?.length || 0)} columns</span>
        {!readOnly && (
          <span className="edit-hint">Click any cell to edit</span>
        )}
      </div>
      <div className="table-scroll-wrapper">
        {tableHtml && !tableData.length ? (
          <div 
            className="table-html-wrapper"
            dangerouslySetInnerHTML={{ __html: tableHtml }}
          />
        ) : (
          renderTable()
        )}
      </div>
    </div>
  );
};

export default ExcelTableDisplay;