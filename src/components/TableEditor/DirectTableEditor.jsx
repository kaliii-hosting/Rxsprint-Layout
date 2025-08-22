import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { RevoGrid } from '@revolist/react-datagrid';

const DirectTableEditor = () => {
  const [tables, setTables] = useState([]);
  
  useEffect(() => {
    // Find all tables on the page
    const findAndReplaceTables = () => {
      const allTables = document.querySelectorAll('table');
      console.log('Found tables:', allTables.length);
      
      allTables.forEach((table, index) => {
        // Skip if already replaced
        if (table.dataset.revoReplaced) return;
        
        // Parse table data
        const rows = table.querySelectorAll('tr');
        const data = [];
        const columns = [];
        let maxCols = 0;
        
        // Find max columns
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          maxCols = Math.max(maxCols, cells.length);
        });
        
        // Create columns
        for (let i = 0; i < maxCols; i++) {
          columns.push({
            prop: `col${i}`,
            name: `Column ${i + 1}`,
            size: 150
          });
        }
        
        // Parse data
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          const rowData = {};
          cells.forEach((cell, i) => {
            rowData[`col${i}`] = cell.textContent || '';
          });
          // Fill empty cells
          for (let i = cells.length; i < maxCols; i++) {
            rowData[`col${i}`] = '';
          }
          data.push(rowData);
        });
        
        // Create container for RevoGrid
        const container = document.createElement('div');
        container.id = `revo-table-${index}`;
        container.style.width = '100%';
        container.style.minHeight = '300px';
        container.style.border = '2px solid green';
        container.style.marginBottom = '20px';
        
        // Replace table with container
        table.style.display = 'none';
        table.dataset.revoReplaced = 'true';
        table.parentNode.insertBefore(container, table);
        
        // Store table data
        setTables(prev => [...prev, { id: index, data, columns, containerId: `revo-table-${index}` }]);
      });
    };
    
    // Wait for DOM to be ready
    setTimeout(findAndReplaceTables, 1000);
  }, []);
  
  return (
    <>
      {tables.map(table => (
        <div key={table.id}>
          {document.getElementById(table.containerId) && ReactDOM.createPortal(
            <div>
              <div style={{ padding: '10px', background: '#f0f0f0' }}>
                RevoGrid Table Editor (Auto-replaced)
              </div>
              <RevoGrid
                source={table.data}
                columns={table.columns}
                resize={true}
                range={true}
              />
            </div>,
            document.getElementById(table.containerId)
          )}
        </div>
      ))}
    </>
  );
};

export default DirectTableEditor;