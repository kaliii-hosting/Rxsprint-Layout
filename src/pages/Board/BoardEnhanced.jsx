import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Move, 
  Edit3, 
  Highlighter, 
  Circle, 
  Square, 
  Link2, 
  Eraser,
  Undo,
  Redo,
  Download,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Type,
  Image
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import './BoardEnhanced.css';

const BoardEnhanced = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  // Core states
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTool, setCurrentTool] = useState('move');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  
  // Screenshot management
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);
  
  // Drawing paths
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  
  // History for undo/redo
  const [history, setHistory] = useState([{ paths: [], screenshots: [] }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Canvas properties
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth * 2,
    height: window.innerHeight * 2
  });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  
  // Auto-save to localStorage
  const STORAGE_KEY = 'drawingBoardData';
  const AUTOSAVE_DELAY = 1000; // 1 second
  const autosaveTimer = useRef(null);
  
  // Image cache for performance
  const imageCache = useRef(new Map());

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const data = JSON.parse(saved);
          if (data.paths) setPaths(data.paths);
          if (data.screenshots) setScreenshots(data.screenshots);
          if (data.history) setHistory(data.history);
          if (data.historyIndex !== undefined) setHistoryIndex(data.historyIndex);
          console.log('Loaded saved drawing board data');
        }
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    };
    
    loadSavedData();
  }, []);

  // Auto-save functionality
  const autoSave = useCallback(() => {
    try {
      const dataToSave = {
        paths,
        screenshots: screenshots.map(s => ({
          ...s,
          src: s.src.length > 100000 ? '' : s.src // Don't save large images
        })),
        history: history.slice(-10), // Keep last 10 history states
        historyIndex,
        timestamp: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      console.log('Auto-saved drawing board data');
    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  }, [paths, screenshots, history, historyIndex]);

  // Trigger auto-save when data changes
  useEffect(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }
    
    autosaveTimer.current = setTimeout(() => {
      autoSave();
    }, AUTOSAVE_DELAY);
    
    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [paths, screenshots, autoSave]);

  // Enhanced paste handler with top-right positioning
  useEffect(() => {
    const handlePaste = async (e) => {
      e.preventDefault();
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = canvasRef.current;
              const container = containerRef.current;
              
              if (!canvas || !container) return;
              
              // Calculate optimal size
              const maxWidth = 600;
              const maxHeight = 800;
              const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              
              // Position in top-right with padding
              const padding = 20;
              const scrollLeft = container.scrollLeft;
              const scrollTop = container.scrollTop;
              const viewportWidth = container.clientWidth;
              
              // Calculate position in canvas coordinates
              const x = scrollLeft + viewportWidth - scaledWidth - padding;
              const y = scrollTop + padding;
              
              const newScreenshot = {
                id: `screenshot_${Date.now()}_${Math.random()}`,
                src: event.target.result,
                x: Math.max(padding, x),
                y: Math.max(padding, y),
                width: scaledWidth,
                height: scaledHeight,
                originalWidth: img.width,
                originalHeight: img.height,
                opacity: 1,
                zIndex: screenshots.length
              };
              
              // Pre-cache the image for immediate rendering
              imageCache.current.set(newScreenshot.id, img);
              
              setScreenshots(prev => [...prev, newScreenshot]);
              setSelectedScreenshot(newScreenshot);
              setCurrentTool('move'); // Auto-switch to move tool
              
              // Force immediate redraw - multiple frames to ensure visibility
              requestAnimationFrame(() => {
                redrawCanvas();
                // Double-tap redraw to ensure image appears
                requestAnimationFrame(() => redrawCanvas());
              });
              
              // Save to history
              saveToHistory();
            };
            img.src = event.target.result;
          };
          
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [screenshots, redrawCanvas, saveToHistory]);

  // Save to history
  const saveToHistory = useCallback(() => {
    const state = {
      paths: [...paths],
      screenshots: [...screenshots],
      timestamp: Date.now()
    };
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    // Limit history
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [paths, screenshots, history, historyIndex]);

  // Enhanced canvas redraw with better performance
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and pan transformation
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);
    
    // Draw screenshots first (background layer)
    screenshots.forEach(screenshot => {
      let img = imageCache.current.get(screenshot.id);
      
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        imageCache.current.set(screenshot.id, img);
        
        img.onload = () => {
          requestAnimationFrame(() => redrawCanvas());
        };
        
        img.src = screenshot.src;
      }
      
      if (img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.globalAlpha = screenshot.opacity || 1;
        
        // Draw image
        ctx.drawImage(
          img, 
          screenshot.x, 
          screenshot.y, 
          screenshot.width, 
          screenshot.height
        );
        
        // Draw selection border if selected
        if (selectedScreenshot?.id === screenshot.id) {
          ctx.strokeStyle = '#0066ff';
          ctx.lineWidth = 2 / zoom;
          ctx.setLineDash([5 / zoom, 5 / zoom]);
          ctx.strokeRect(
            screenshot.x - 2, 
            screenshot.y - 2, 
            screenshot.width + 4, 
            screenshot.height + 4
          );
          ctx.setLineDash([]);
          
          // Draw resize handles
          if (currentTool === 'resize') {
            const handleSize = Math.max(12 / zoom, 8); // Minimum 8px visual size
            
            // Corner handles with better visibility
            const handles = [
              { x: screenshot.x, y: screenshot.y }, // top-left
              { x: screenshot.x + screenshot.width, y: screenshot.y }, // top-right
              { x: screenshot.x, y: screenshot.y + screenshot.height }, // bottom-left
              { x: screenshot.x + screenshot.width, y: screenshot.y + screenshot.height } // bottom-right
            ];
            
            handles.forEach((handle, index) => {
              // White background for contrast
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(
                handle.x - handleSize / 2 - 1,
                handle.y - handleSize / 2 - 1,
                handleSize + 2,
                handleSize + 2
              );
              
              // Blue handle
              ctx.fillStyle = '#0066ff';
              ctx.fillRect(
                handle.x - handleSize / 2,
                handle.y - handleSize / 2,
                handleSize,
                handleSize
              );
              
              // Add hover cursor hint
              const cursorTypes = ['nw-resize', 'ne-resize', 'sw-resize', 'se-resize'];
              ctx.canvas.style.cursor = isResizing ? cursorTypes[index] : 'default';
            });
          }
        }
        
        ctx.restore();
      }
    });
    
    // Draw paths (foreground layer)
    paths.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = path.tool === 'highlighter' ? 0.5 : 1.0;
      
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      
      ctx.stroke();
      ctx.restore();
    });
    
    // Draw current path being drawn
    if (currentPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = currentTool === 'highlighter' ? 0.5 : 1.0;
      
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      
      ctx.stroke();
      ctx.restore();
    }
    
    ctx.restore();
  }, [screenshots, paths, currentPath, currentColor, strokeWidth, currentTool, selectedScreenshot, zoom, pan]);

  // Redraw on dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Get mouse position relative to canvas
  const getCanvasPosition = useCallback((e) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    const x = (e.clientX - containerRect.left + container.scrollLeft) / zoom - pan.x;
    const y = (e.clientY - containerRect.top + container.scrollTop) / zoom - pan.y;
    
    return { x, y };
  }, [zoom, pan]);

  // Enhanced mouse/touch handlers
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    const pos = getCanvasPosition(e);
    
    if (currentTool === 'move' || currentTool === 'resize') {
      // Check if clicking on a screenshot
      const clickedScreenshot = [...screenshots].reverse().find(s => 
        pos.x >= s.x && 
        pos.x <= s.x + s.width && 
        pos.y >= s.y && 
        pos.y <= s.y + s.height
      );
      
      if (clickedScreenshot) {
        setSelectedScreenshot(clickedScreenshot);
        
        if (currentTool === 'move') {
          setIsDragging(true);
          setDragStart({
            x: pos.x - clickedScreenshot.x,
            y: pos.y - clickedScreenshot.y
          });
        } else if (currentTool === 'resize') {
          // Determine which resize handle was clicked
          // Make handle size larger and account for zoom level
          const handleSize = Math.max(30, 20 / zoom); // Bigger click area, minimum 30px
          const handles = [
            { type: 'nw', x: clickedScreenshot.x, y: clickedScreenshot.y },
            { type: 'ne', x: clickedScreenshot.x + clickedScreenshot.width, y: clickedScreenshot.y },
            { type: 'sw', x: clickedScreenshot.x, y: clickedScreenshot.y + clickedScreenshot.height },
            { type: 'se', x: clickedScreenshot.x + clickedScreenshot.width, y: clickedScreenshot.y + clickedScreenshot.height }
          ];
          
          const clickedHandle = handles.find(h => 
            Math.abs(pos.x - h.x) < handleSize && 
            Math.abs(pos.y - h.y) < handleSize
          );
          
          if (clickedHandle) {
            setIsResizing(true);
            setResizeHandle(clickedHandle.type);
            setDragStart(pos);
          } else {
            // If no handle clicked, but clicked on screenshot, start dragging instead
            setIsDragging(true);
            setDragStart({
              x: pos.x - clickedScreenshot.x,
              y: pos.y - clickedScreenshot.y
            });
          }
        }
      } else {
        setSelectedScreenshot(null);
      }
    } else if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
      setIsDrawing(true);
      setCurrentPath([pos]);
    }
  }, [currentTool, screenshots, getCanvasPosition]);

  const handlePointerMove = useCallback((e) => {
    const pos = getCanvasPosition(e);
    
    // Update cursor for resize handles when hovering
    if (currentTool === 'resize' && selectedScreenshot && !isResizing && !isDragging) {
      const handleSize = Math.max(30, 20 / zoom);
      const handles = [
        { type: 'nw', x: selectedScreenshot.x, y: selectedScreenshot.y, cursor: 'nw-resize' },
        { type: 'ne', x: selectedScreenshot.x + selectedScreenshot.width, y: selectedScreenshot.y, cursor: 'ne-resize' },
        { type: 'sw', x: selectedScreenshot.x, y: selectedScreenshot.y + selectedScreenshot.height, cursor: 'sw-resize' },
        { type: 'se', x: selectedScreenshot.x + selectedScreenshot.width, y: selectedScreenshot.y + selectedScreenshot.height, cursor: 'se-resize' }
      ];
      
      const hoveredHandle = handles.find(h => 
        Math.abs(pos.x - h.x) < handleSize && 
        Math.abs(pos.y - h.y) < handleSize
      );
      
      if (hoveredHandle) {
        canvasRef.current.style.cursor = hoveredHandle.cursor;
      } else if (pos.x >= selectedScreenshot.x && 
                 pos.x <= selectedScreenshot.x + selectedScreenshot.width && 
                 pos.y >= selectedScreenshot.y && 
                 pos.y <= selectedScreenshot.y + selectedScreenshot.height) {
        canvasRef.current.style.cursor = 'move';
      } else {
        canvasRef.current.style.cursor = 'crosshair';
      }
    }
    
    if (isDragging && selectedScreenshot) {
      // Update screenshot position
      setScreenshots(prev => prev.map(s => 
        s.id === selectedScreenshot.id 
          ? { ...s, x: pos.x - dragStart.x, y: pos.y - dragStart.y }
          : s
      ));
    } else if (isResizing && selectedScreenshot && resizeHandle) {
      // Update screenshot size
      setScreenshots(prev => prev.map(s => {
        if (s.id !== selectedScreenshot.id) return s;
        
        let newX = s.x;
        let newY = s.y;
        let newWidth = s.width;
        let newHeight = s.height;
        
        switch (resizeHandle) {
          case 'se':
            newWidth = Math.max(50, pos.x - s.x);
            newHeight = Math.max(50, pos.y - s.y);
            break;
          case 'sw':
            newWidth = Math.max(50, s.x + s.width - pos.x);
            newX = pos.x;
            newHeight = Math.max(50, pos.y - s.y);
            break;
          case 'ne':
            newWidth = Math.max(50, pos.x - s.x);
            newHeight = Math.max(50, s.y + s.height - pos.y);
            newY = pos.y;
            break;
          case 'nw':
            newWidth = Math.max(50, s.x + s.width - pos.x);
            newHeight = Math.max(50, s.y + s.height - pos.y);
            newX = pos.x;
            newY = pos.y;
            break;
        }
        
        return { ...s, x: newX, y: newY, width: newWidth, height: newHeight };
      }));
    } else if (isDrawing) {
      setCurrentPath(prev => [...prev, pos]);
    }
  }, [isDragging, isResizing, isDrawing, selectedScreenshot, dragStart, resizeHandle, getCanvasPosition, currentTool, zoom]);

  const handlePointerUp = useCallback(() => {
    if (isDrawing && currentPath.length > 1) {
      const newPath = {
        id: Date.now(),
        points: currentPath,
        color: currentColor,
        width: strokeWidth,
        tool: currentTool
      };
      setPaths(prev => [...prev, newPath]);
      saveToHistory();
    }
    
    if (isDragging || isResizing) {
      saveToHistory();
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setIsResizing(false);
    setCurrentPath([]);
    setResizeHandle(null);
  }, [isDrawing, isDragging, isResizing, currentPath, currentColor, strokeWidth, currentTool, saveToHistory]);

  // Tool handlers
  const handleToolChange = (tool) => {
    setCurrentTool(tool);
    setSelectedScreenshot(null);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setPaths(state.paths || []);
      setScreenshots(state.screenshots || []);
      setHistoryIndex(newIndex);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setPaths(state.paths || []);
      setScreenshots(state.screenshots || []);
      setHistoryIndex(newIndex);
    }
  };

  // Clear board
  const clearBoard = () => {
    if (window.confirm('Clear the entire drawing board?')) {
      setPaths([]);
      setScreenshots([]);
      setSelectedScreenshot(null);
      imageCache.current.clear();
      saveToHistory();
    }
  };

  // Download board
  const downloadBoard = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `drawing-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Save as note (existing functionality)
  const saveAsNote = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const title = `Drawing ${new Date().toLocaleString()}`;
      
      const noteData = {
        title,
        content: `<img src="${imageDataUrl}" alt="${title}" style="max-width: 100%;" />`,
        starred: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      if (db) {
        const notesRef = collection(db, 'notes');
        await addDoc(notesRef, noteData);
        alert(`Drawing saved as "${title}" in Notes!`);
      }
    } catch (error) {
      console.error('Error saving as note:', error);
      alert('Failed to save drawing as note');
    } finally {
      setIsSaving(false);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.5));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className={`board-enhanced ${theme}`}>
      {/* Minimal Toolbar */}
      <div className="board-toolbar-minimal">
        <div className="toolbar-section">
          <button className="tool-button" onClick={handleUndo} disabled={historyIndex <= 0}>
            <Undo size={20} />
          </button>
          <button className="tool-button" onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
            <Redo size={20} />
          </button>
        </div>

        <div className="toolbar-section tools">
          <button 
            className={`tool-button ${currentTool === 'move' ? 'active' : ''}`}
            onClick={() => handleToolChange('move')}
            title="Move (V)"
          >
            <Move size={20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => handleToolChange('pen')}
            title="Pen (P)"
          >
            <Edit3 size={20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'highlighter' ? 'active' : ''}`}
            onClick={() => handleToolChange('highlighter')}
            title="Highlighter (H)"
          >
            <Highlighter size={20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => handleToolChange('eraser')}
            title="Eraser (E)"
          >
            <Eraser size={20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'resize' ? 'active' : ''}`}
            onClick={() => handleToolChange('resize')}
            title="Resize (R)"
          >
            <Square size={20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'link' ? 'active' : ''}`}
            onClick={() => handleToolChange('link')}
            title="Link (L)"
          >
            <Link2 size={20} />
          </button>
        </div>

        {/* Color Picker - Show only for drawing tools */}
        {(currentTool === 'pen' || currentTool === 'highlighter') && (
          <div className="toolbar-section colors">
            <div className="color-picker">
              {currentTool === 'pen' ? (
                // Pen colors
                ['#000000', '#ffffff', '#0066ff', '#ff0000', '#00cc00', '#ffaa00'].map(color => (
                  <button
                    key={color}
                    className={`color-button ${currentColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCurrentColor(color)}
                  />
                ))
              ) : (
                // Highlighter colors
                ['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900', '#ff0000'].map(color => (
                  <button
                    key={color}
                    className={`color-button ${currentColor === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCurrentColor(color)}
                  />
                ))
              )}
            </div>
            
            {/* Stroke width */}
            <div className="stroke-picker">
              {[1, 2, 3, 5, 8].map(width => (
                <button
                  key={width}
                  className={`stroke-button ${strokeWidth === width ? 'active' : ''}`}
                  onClick={() => setStrokeWidth(width)}
                >
                  <div 
                    className="stroke-indicator" 
                    style={{ 
                      width: width * 2 + 'px', 
                      height: width * 2 + 'px',
                      backgroundColor: currentColor
                    }} 
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="toolbar-section actions">
          <button className="tool-button" onClick={clearBoard} title="Clear All">
            <Trash2 size={20} />
          </button>
          <button className="tool-button" onClick={downloadBoard} title="Download">
            <Download size={20} />
          </button>
          <button className="tool-button" onClick={saveAsNote} disabled={isSaving} title="Save to Notes">
            <Save size={20} />
          </button>
        </div>

        <div className="toolbar-section zoom">
          <button className="tool-button" onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={20} />
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="tool-button" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={20} />
          </button>
          <button className="tool-button" onClick={handleZoomReset} title="Reset View">
            <Maximize2 size={20} />
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="board-container"
        style={{ cursor: currentTool === 'move' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ touchAction: 'none' }}
        />
      </div>
    </div>
  );
};

export default BoardEnhanced;