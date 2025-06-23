import React, { useState, useEffect } from 'react';
import { Plus, Minus, Type, Table, GripVertical, X } from 'lucide-react';
import './InfusionStepsEditor.css';

const InfusionStepsEditor = ({ value, onChange, isEditing }) => {
  const [items, setItems] = useState([]);

  // Parse the value from Firebase on mount or when value changes
  useEffect(() => {
    if (value) {
      try {
        // Try to parse as JSON first (new format)
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        } else {
          // Fallback to old format (plain text with newlines)
          const steps = value.split('\n').filter(step => step.trim() !== '');
          setItems(steps.map((step, index) => ({
            id: `step-${Date.now()}-${index}`,
            type: 'step',
            content: step
          })));
        }
      } catch (e) {
        // If JSON parse fails, treat as old format
        const steps = value.split('\n').filter(step => step.trim() !== '');
        setItems(steps.map((step, index) => ({
          id: `step-${Date.now()}-${index}`,
          type: 'step',
          content: step
        })));
      }
    } else {
      setItems([]);
    }
  }, [value]);

  // Update parent component whenever items change
  const updateParent = (newItems) => {
    setItems(newItems);
    // Store as JSON string in Firebase
    onChange(JSON.stringify(newItems));
  };

  const addItem = (type) => {
    const newItem = {
      id: `${type}-${Date.now()}`,
      type: type,
      content: type === 'title' ? '' : '',
      columns: type === 'table' ? [
        { id: `col-${Date.now()}-1`, header: 'Column 1', rows: [''] },
        { id: `col-${Date.now()}-2`, header: 'Column 2', rows: [''] }
      ] : undefined
    };
    updateParent([...items, newItem]);
  };

  const removeItem = (id) => {
    updateParent(items.filter(item => item.id !== id));
  };

  const updateItem = (id, updates) => {
    updateParent(items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const addColumn = (itemId) => {
    updateParent(items.map(item => {
      if (item.id === itemId && item.type === 'table') {
        const newColumn = {
          id: `col-${Date.now()}`,
          header: `Column ${item.columns.length + 1}`,
          rows: ['']
        };
        return {
          ...item,
          columns: [...item.columns, newColumn]
        };
      }
      return item;
    }));
  };

  const removeColumn = (itemId, columnId) => {
    updateParent(items.map(item => {
      if (item.id === itemId && item.type === 'table' && item.columns.length > 1) {
        return {
          ...item,
          columns: item.columns.filter(col => col.id !== columnId)
        };
      }
      return item;
    }));
  };

  const updateColumn = (itemId, columnId, updates) => {
    updateParent(items.map(item => {
      if (item.id === itemId && item.type === 'table') {
        return {
          ...item,
          columns: item.columns.map(col =>
            col.id === columnId ? { ...col, ...updates } : col
          )
        };
      }
      return item;
    }));
  };

  const addRow = (itemId) => {
    updateParent(items.map(item => {
      if (item.id === itemId && item.type === 'table') {
        return {
          ...item,
          columns: item.columns.map(col => ({
            ...col,
            rows: [...col.rows, '']
          }))
        };
      }
      return item;
    }));
  };

  const removeRow = (itemId, rowIndex) => {
    updateParent(items.map(item => {
      if (item.id === itemId && item.type === 'table' && item.columns[0].rows.length > 1) {
        return {
          ...item,
          columns: item.columns.map(col => ({
            ...col,
            rows: col.rows.filter((_, index) => index !== rowIndex)
          }))
        };
      }
      return item;
    }));
  };

  const updateCell = (itemId, columnId, rowIndex, value) => {
    updateParent(items.map(item => {
      if (item.id === itemId && item.type === 'table') {
        return {
          ...item,
          columns: item.columns.map(col => {
            if (col.id === columnId) {
              const newRows = [...col.rows];
              newRows[rowIndex] = value;
              return { ...col, rows: newRows };
            }
            return col;
          })
        };
      }
      return item;
    }));
  };

  const moveItem = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    updateParent(newItems);
  };

  if (!isEditing) {
    // Display mode
    return (
      <div className="infusion-steps-display">
        {items.length === 0 ? (
          <p className="no-steps-message">No infusion steps specified</p>
        ) : (
          items.map((item, index) => {
            if (item.type === 'title') {
              return (
                <h4 key={item.id} className="infusion-step-title">
                  {item.content}
                </h4>
              );
            } else if (item.type === 'step') {
              // Don't count titles and tables in step numbering
              const stepIndex = items.slice(0, index).filter(i => i.type === 'step').length + 1;
              return (
                <div key={item.id} className="infusion-step-item">
                  <span className="step-number">{stepIndex}.</span>
                  <span className="step-content">{item.content}</span>
                </div>
              );
            } else if (item.type === 'table' && item.columns) {
              return (
                <div key={item.id} className="infusion-table-container">
                  <table className="infusion-steps-table">
                    <thead>
                      <tr>
                        {item.columns.map(col => (
                          <th key={col.id}>{col.header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {item.columns[0].rows.map((_, rowIndex) => (
                        <tr key={rowIndex}>
                          {item.columns.map(col => (
                            <td key={col.id}>{col.rows[rowIndex] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="infusion-steps-editor">
      <div className="editor-toolbar">
        <button
          type="button"
          className="add-item-btn"
          onClick={() => addItem('step')}
          title="Add Step"
        >
          <Plus size={16} />
          Add Step
        </button>
        <button
          type="button"
          className="add-item-btn"
          onClick={() => addItem('title')}
          title="Add Title"
        >
          <Type size={16} />
          Add Title
        </button>
        <button
          type="button"
          className="add-item-btn"
          onClick={() => addItem('table')}
          title="Add Table"
        >
          <Table size={16} />
          Add Table
        </button>
      </div>

      <div className="editor-items">
        {items.map((item, index) => (
          <div key={item.id} className="editor-item">
            <div className="item-controls">
              <button
                type="button"
                className="move-btn"
                onMouseDown={(e) => {
                  e.preventDefault();
                  // Simple drag handle - you can enhance this with proper drag and drop
                }}
                title="Drag to reorder"
              >
                <GripVertical size={16} />
              </button>
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeItem(item.id)}
                title="Remove"
              >
                <X size={16} />
              </button>
            </div>

            {item.type === 'title' && (
              <input
                type="text"
                className="title-input"
                value={item.content}
                onChange={(e) => updateItem(item.id, { content: e.target.value })}
                placeholder="Enter title..."
              />
            )}

            {item.type === 'step' && (
              <div className="step-input-container">
                <span className="step-number">{items.slice(0, index).filter(i => i.type === 'step').length + 1}.</span>
                <input
                  type="text"
                  className="step-input"
                  value={item.content}
                  onChange={(e) => updateItem(item.id, { content: e.target.value })}
                  placeholder="Enter step..."
                />
              </div>
            )}

            {item.type === 'table' && item.columns && (
              <div className="table-editor">
                <div className="table-controls">
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => addColumn(item.id)}
                  >
                    <Plus size={14} /> Add Column
                  </button>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => addRow(item.id)}
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
                <table className="editable-table">
                  <thead>
                    <tr>
                      {item.columns.map((col, colIndex) => (
                        <th key={col.id}>
                          <div className="header-cell">
                            <input
                              type="text"
                              value={col.header}
                              onChange={(e) => updateColumn(item.id, col.id, { header: e.target.value })}
                              placeholder={`Header ${colIndex + 1}`}
                            />
                            {item.columns.length > 1 && (
                              <button
                                type="button"
                                className="remove-col-btn"
                                onClick={() => removeColumn(item.id, col.id)}
                                title="Remove column"
                              >
                                <Minus size={14} />
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {item.columns[0].rows.map((_, rowIndex) => (
                      <tr key={rowIndex}>
                        {item.columns.map((col, colIndex) => (
                          <td key={col.id}>
                            <div className="cell-container">
                              <input
                                type="text"
                                value={col.rows[rowIndex] || ''}
                                onChange={(e) => updateCell(item.id, col.id, rowIndex, e.target.value)}
                                placeholder="Enter value..."
                              />
                              {colIndex === item.columns.length - 1 && item.columns[0].rows.length > 1 && (
                                <button
                                  type="button"
                                  className="remove-row-btn"
                                  onClick={() => removeRow(item.id, rowIndex)}
                                  title="Remove row"
                                >
                                  <Minus size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InfusionStepsEditor;