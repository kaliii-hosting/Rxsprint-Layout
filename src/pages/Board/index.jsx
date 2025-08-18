import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Highlighter, Pen, RotateCcw, Download, Trash2, Move, Square, Undo, Redo, Maximize2, Save } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { firestore as db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import './Board.css';

const Board = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentTool, setCurrentTool] = useState('highlighter'); // highlighter, marker, move, resize
  const [currentColor, setCurrentColor] = useState('#ffff00'); // yellow highlighter
  const [strokeWidth, setStrokeWidth] = useState(20);
  const [screenshots, setScreenshots] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null);

  // Canvas drawing state
  const [paths, setPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  
  // Undo/Redo state - Initialize with empty state
  const [history, setHistory] = useState([{
    paths: [],
    screenshots: [],
    timestamp: Date.now()
  }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Image cache for better performance
  const imageCache = useRef(new Map());
  
  // Save state to history
  const saveToHistory = useCallback(() => {
    const state = {
      paths: [...paths],
      screenshots: [...screenshots],
      timestamp: Date.now()
    };
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    // Limit history to 50 states
    if (newHistory.length > 50) {
      newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } else {
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [paths, screenshots, history, historyIndex]);

  // Calculate canvas size based on content
  const calculateCanvasSize = useCallback(() => {
    if (screenshots.length === 0) {
      return {
        width: Math.max(window.innerWidth, 1200),
        height: Math.max(window.innerHeight - 120, 800)
      };
    }

    let maxX = 0;
    let maxY = 0;
    let minX = 0;
    let minY = 0;

    screenshots.forEach(screenshot => {
      minX = Math.min(minX, screenshot.x);
      minY = Math.min(minY, screenshot.y);
      maxX = Math.max(maxX, screenshot.x + screenshot.width);
      maxY = Math.max(maxY, screenshot.y + screenshot.height);
    });

    // Add padding around content
    const padding = 200;
    const contentWidth = maxX - minX + (padding * 2);
    const contentHeight = maxY - minY + (padding * 2);

    return {
      width: Math.max(contentWidth, window.innerWidth, 1200),
      height: Math.max(contentHeight, window.innerHeight - 120, 800)
    };
  }, [screenshots]);

  // Initialize and resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const { width, height } = calculateCanvasSize();
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [calculateCanvasSize]);

  // Resize canvas when screenshots change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { width, height } = calculateCanvasSize();
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, [screenshots, calculateCanvasSize]);

  // Redraw canvas with fixed image handling
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let pendingImages = 0;

    // Draw screenshots first (as background)
    screenshots.forEach((screenshot) => {
      let img = imageCache.current.get(screenshot.id);
      
      if (!img) {
        img = new Image();
        img.crossOrigin = 'anonymous';
        imageCache.current.set(screenshot.id, img);
        
        img.onload = () => {
          pendingImages--;
          if (pendingImages === 0) {
            requestAnimationFrame(() => redrawCanvas());
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load image:', screenshot.src);
          pendingImages--;
        };
        
        pendingImages++;
        img.src = screenshot.src;
      }
      
      if (img.complete && img.naturalWidth > 0) {
        try {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
          ctx.drawImage(img, screenshot.x, screenshot.y, screenshot.width, screenshot.height);
          
          // Draw selection border if selected
          if (currentTool === 'move' && selectedScreenshot?.id === screenshot.id) {
            ctx.strokeStyle = '#FF6900';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 4]);
            ctx.strokeRect(screenshot.x - 1, screenshot.y - 1, screenshot.width + 2, screenshot.height + 2);
            ctx.setLineDash([]);
          }
          ctx.restore();
        } catch (error) {
          console.error('Error drawing image:', error);
        }
      }
    });

    // Draw all completed paths
    paths.forEach((path) => {
      if (path.points.length < 2) return;

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
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
      ctx.globalCompositeOperation = 'source-over';
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
  }, [screenshots, paths, currentPath, currentTool, currentColor, strokeWidth, selectedScreenshot]);

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Handle paste events for screenshots
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              // Calculate optimal size for A4 prescriptions
              const canvas = canvasRef.current;
              const maxWidth = canvas ? canvas.width * 0.7 : 600;
              const maxHeight = canvas ? canvas.height * 0.7 : 800;
              
              // Calculate scaling to fit within max dimensions while preserving aspect ratio
              const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              
              // Center the image
              const centerX = canvas ? (canvas.width - scaledWidth) / 2 : 100;
              const centerY = canvas ? (canvas.height - scaledHeight) / 2 : 100;
              
              const newScreenshot = {
                id: Date.now() + Math.random(), // Unique ID
                src: event.target.result,
                x: Math.max(20, centerX),
                y: Math.max(20, centerY),
                width: scaledWidth,
                height: scaledHeight,
                originalWidth: img.width,
                originalHeight: img.height
              };
              
              setScreenshots(prev => [...prev, newScreenshot]);
              // Save to history after screenshot is added
              setTimeout(() => saveToHistory(), 100);
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
  }, []);

  // Mouse and touch event position handler with accurate scroll consideration
  const getEventPosition = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 1 };
    
    // Handle both mouse, touch, and pen/pointer events
    let clientX, clientY, pressure = 1;
    
    if (e.touches && e.touches.length > 0) {
      // Touch events
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Touch pressure if available
      if (e.touches[0].force !== undefined) {
        pressure = e.touches[0].force || 1;
      }
    } else if (e.pointerType) {
      // Pointer events (pen, touch, mouse)
      clientX = e.clientX;
      clientY = e.clientY;
      // Pen pressure support
      if (e.pointerType === 'pen' && e.pressure !== undefined) {
        pressure = e.pressure;
      }
    } else {
      // Mouse events
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Get canvas bounding rect (accounts for scroll automatically)
    const rect = canvas.getBoundingClientRect();
    
    // Calculate position relative to canvas
    // getBoundingClientRect already accounts for page scroll position
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    // Scale coordinates if canvas display size differs from canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return { 
      x: x * scaleX, 
      y: y * scaleY,
      pressure: pressure
    };
  };

  // Mouse and touch event handlers with improved accuracy
  const handleStart = (e) => {
    e.preventDefault(); // Prevent scrolling on touch
    
    if (currentTool === 'move' || currentTool === 'resize') {
      handleScreenshotMouseDown(e);
      return;
    }

    const { x, y } = getEventPosition(e);

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const handleMove = (e) => {
    e.preventDefault(); // Prevent scrolling on touch
    
    if ((currentTool === 'move' || currentTool === 'resize') && selectedScreenshot) {
      handleScreenshotMouseMove(e);
      return;
    }

    if (!isDrawing) return;

    const { x, y } = getEventPosition(e);
    setCurrentPath(prev => [...prev, { x, y }]);
  };

  const handleEnd = (e) => {
    e.preventDefault();
    handleMouseUp();
  };

  const handleMouseUp = () => {
    if (currentTool === 'move') {
      if (selectedScreenshot && (dragOffset.x !== 0 || dragOffset.y !== 0)) {
        saveToHistory();
      }
      // Keep selectedScreenshot for move mode
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    if (currentTool === 'resize') {
      if (selectedScreenshot && resizeHandle) {
        saveToHistory();
      }
      // Keep selectedScreenshot for resize mode
      setResizeHandle(null);
      return;
    }

    if (isDrawing && currentPath.length > 1) {
      const newPath = {
        points: currentPath,
        tool: currentTool,
        color: currentColor,
        width: strokeWidth
      };
      setPaths(prev => [...prev, newPath]);
      saveToHistory();
    }

    setIsDrawing(false);
    setCurrentPath([]);
  };

  // Screenshot interaction handlers with separate move/resize logic
  const handleScreenshotMouseDown = (e) => {
    const { x, y } = getEventPosition(e);

    let screenshotFound = false;

    // Check if clicking on a screenshot (with tolerance)
    const tolerance = 10;
    for (let i = screenshots.length - 1; i >= 0; i--) {
      const screenshot = screenshots[i];
      if (x >= screenshot.x - tolerance && x <= screenshot.x + screenshot.width + tolerance &&
          y >= screenshot.y - tolerance && y <= screenshot.y + screenshot.height + tolerance) {
        
        screenshotFound = true;
        setSelectedScreenshot(screenshot);
        
        if (currentTool === 'resize') {
          // In resize mode, only check for resize handles
          const handleSize = 25; // Larger for easier interaction
          const handles = [
            { name: 'nw', x: screenshot.x, y: screenshot.y },
            { name: 'ne', x: screenshot.x + screenshot.width, y: screenshot.y },
            { name: 'sw', x: screenshot.x, y: screenshot.y + screenshot.height },
            { name: 'se', x: screenshot.x + screenshot.width, y: screenshot.y + screenshot.height }
          ];
          
          for (const handle of handles) {
            if (x >= handle.x - handleSize && x <= handle.x + handleSize &&
                y >= handle.y - handleSize && y <= handle.y + handleSize) {
              setResizeHandle(handle.name);
              e.preventDefault();
              e.stopPropagation();
              return;
            }
          }
        } else if (currentTool === 'move') {
          // In move mode, only set up dragging
          if (x >= screenshot.x && x <= screenshot.x + screenshot.width &&
              y >= screenshot.y && y <= screenshot.y + screenshot.height) {
            setDragOffset({
              x: x - screenshot.x,
              y: y - screenshot.y
            });
          }
        }
        
        break;
      }
    }

    // If no screenshot was clicked, deselect current selection
    if (!screenshotFound && (currentTool === 'move' || currentTool === 'resize')) {
      setSelectedScreenshot(null);
      setResizeHandle(null);
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleScreenshotMouseMove = (e) => {
    if (!selectedScreenshot) return;

    const { x, y } = getEventPosition(e);

    if (currentTool === 'resize' && resizeHandle) {
      // Handle resizing only in resize mode
      const newScreenshots = screenshots.map(screenshot => {
        if (screenshot.id !== selectedScreenshot.id) return screenshot;

        const aspectRatio = screenshot.originalWidth / screenshot.originalHeight;
        let newWidth = screenshot.width;
        let newHeight = screenshot.height;
        let newX = screenshot.x;
        let newY = screenshot.y;

        switch (resizeHandle) {
          case 'se': // Southeast
            newWidth = Math.max(50, x - screenshot.x);
            newHeight = newWidth / aspectRatio;
            break;
          case 'sw': // Southwest
            newWidth = Math.max(50, screenshot.x + screenshot.width - x);
            newHeight = newWidth / aspectRatio;
            newX = screenshot.x + screenshot.width - newWidth;
            break;
          case 'ne': // Northeast
            newWidth = Math.max(50, x - screenshot.x);
            newHeight = newWidth / aspectRatio;
            newY = screenshot.y + screenshot.height - newHeight;
            break;
          case 'nw': // Northwest
            newWidth = Math.max(50, screenshot.x + screenshot.width - x);
            newHeight = newWidth / aspectRatio;
            newX = screenshot.x + screenshot.width - newWidth;
            newY = screenshot.y + screenshot.height - newHeight;
            break;
        }

        return {
          ...screenshot,
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: newWidth,
          height: newHeight
        };
      });

      setScreenshots(newScreenshots);
      setSelectedScreenshot(newScreenshots.find(s => s.id === selectedScreenshot.id));
    } else if (currentTool === 'move' && dragOffset.x !== undefined && dragOffset.y !== undefined) {
      // Handle dragging only in move mode
      const newScreenshots = screenshots.map(screenshot => {
        if (screenshot.id !== selectedScreenshot.id) return screenshot;
        
        return {
          ...screenshot,
          x: Math.max(0, x - dragOffset.x),
          y: Math.max(0, y - dragOffset.y)
        };
      });

      setScreenshots(newScreenshots);
      setSelectedScreenshot(newScreenshots.find(s => s.id === selectedScreenshot.id));
    }
  };

  // Tool handlers
  const handleToolChange = (tool) => {
    setCurrentTool(tool);
    
    // Clear selection when switching away from move/resize tools
    if (tool !== 'move' && tool !== 'resize') {
      setSelectedScreenshot(null);
      setResizeHandle(null);
      setDragOffset({ x: 0, y: 0 });
    }
    
    // Clear resize handle when switching to move mode
    if (tool === 'move') {
      setResizeHandle(null);
    }
    
    // Clear drag offset when switching to resize mode
    if (tool === 'resize') {
      setDragOffset({ x: 0, y: 0 });
    }
    
    if (tool === 'highlighter') {
      setCurrentColor('#ffff00');
      setStrokeWidth(20);
    } else if (tool === 'marker') {
      setCurrentColor('#000000'); // Default to black for marker
      setStrokeWidth(5);
    }
  };

  const handleStrokeWidthChange = (width) => {
    setStrokeWidth(width);
  };

  const handleColorChange = (color) => {
    setCurrentColor(color);
  };

  // Undo functionality
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      
      setPaths([...prevState.paths]);
      setScreenshots([...prevState.screenshots]);
      setHistoryIndex(prevIndex);
      
      // Clear current drawing path
      setCurrentPath([]);
      setIsDrawing(false);
      
      // Clear image cache to force refresh
      imageCache.current.clear();
    }
  }, [historyIndex, history]);

  // Redo functionality
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      
      setPaths([...nextState.paths]);
      setScreenshots([...nextState.screenshots]);
      setHistoryIndex(nextIndex);
      
      // Clear current drawing path
      setCurrentPath([]);
      setIsDrawing(false);
      
      // Clear image cache to force refresh
      imageCache.current.clear();
    }
  }, [historyIndex, history]);

  const clearBoard = useCallback(() => {
    // Save current state before clearing
    saveToHistory();
    
    // Clear all content
    setPaths([]);
    setScreenshots([]);
    setCurrentPath([]);
    setSelectedScreenshot(null);
    setIsDrawing(false);
    
    // Clear image cache completely
    imageCache.current.clear();
  }, [saveToHistory]);

  const getNextDrawingNumber = async () => {
    try {
      if (!db) return 1;
      
      const notesRef = collection(db, 'notes');
      const q = query(notesRef, where('title', '>=', 'Drawing '), where('title', '<=', 'Drawing ~'));
      const snapshot = await getDocs(q);
      
      let maxNumber = 0;
      snapshot.forEach(doc => {
        const title = doc.data().title;
        const match = title.match(/^Drawing (\d+)$/);
        if (match) {
          const num = parseInt(match[1]);
          maxNumber = Math.max(maxNumber, num);
        }
      });
      
      return maxNumber + 1;
    } catch (error) {
      console.error('Error getting drawing number:', error);
      return 1;
    }
  };

  const saveAsNote = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        alert('No canvas found');
        return;
      }
      
      // Get the drawing as a data URL
      const imageDataUrl = canvas.toDataURL('image/png');
      
      // Get the next drawing number
      const drawingNumber = await getNextDrawingNumber();
      const title = `Drawing ${drawingNumber}`;
      
      // Create note data
      const noteData = {
        title: title,
        content: `<img src="${imageDataUrl}" alt="${title}" style="max-width: 100%; height: auto;" />`,
        starred: false,
        images: [imageDataUrl],
        banners: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Save to Firebase
      if (db) {
        const notesRef = collection(db, 'notes');
        await addDoc(notesRef, noteData);
        
        // Show success message
        alert(`Drawing saved as "${title}" in Notes!`);
        
        // Optionally navigate to notes page
        // navigate('/notes');
      } else {
        alert('Database connection not available. Please try again.');
      }
    } catch (error) {
      console.error('Error saving drawing as note:', error);
      alert('Failed to save drawing. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadBoard = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `board-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className={`board-page ${theme} page-container`}>
      <div className="board-toolbar">
        <div className="toolbar-row">
          {/* Tool Selection Group */}
          <div className="toolbar-group tool-group">
            <button
              className={`toolbar-btn tool-btn ${currentTool === 'highlighter' ? 'active' : ''}`}
              onClick={() => handleToolChange('highlighter')}
              title="Highlighter"
            >
              <Highlighter size={16} />
              <span>Highlighter</span>
            </button>
            <button
              className={`toolbar-btn tool-btn ${currentTool === 'marker' ? 'active' : ''}`}
              onClick={() => handleToolChange('marker')}
              title="Marker"
            >
              <Pen size={16} />
              <span>Marker</span>
            </button>
            <button
              className={`toolbar-btn tool-btn ${currentTool === 'move' ? 'active' : ''}`}
              onClick={() => handleToolChange('move')}
              title="Move"
            >
              <Move size={16} />
              <span>Move</span>
            </button>
            <button
              className={`toolbar-btn tool-btn ${currentTool === 'resize' ? 'active' : ''}`}
              onClick={() => handleToolChange('resize')}
              title="Resize"
            >
              <Maximize2 size={16} />
              <span>Resize</span>
            </button>
          </div>

          {/* Size and Color wrapper for mobile */}
          <div className="size-color-wrapper">
            {/* Size Selection Group - Always visible */}
            <div className="toolbar-group size-group">
              <span className="toolbar-label">Size:</span>
              <div className="size-buttons">
                {[5, 10, 20, 30, 40].map(width => (
                  <button
                    key={width}
                    className={`size-btn ${strokeWidth === width ? 'active' : ''} ${
                      (currentTool !== 'highlighter' && currentTool !== 'marker') ? 'disabled' : ''
                    }`}
                    onClick={() => (currentTool === 'highlighter' || currentTool === 'marker') && handleStrokeWidthChange(width)}
                    disabled={currentTool !== 'highlighter' && currentTool !== 'marker'}
                    title={`Size ${width}`}
                  >
                    <div 
                      className="size-indicator"
                      style={{
                        width: width <= 5 ? '4px' : width <= 10 ? '6px' : width <= 20 ? '8px' : width <= 30 ? '10px' : '12px',
                        height: width <= 5 ? '4px' : width <= 10 ? '6px' : width <= 20 ? '8px' : width <= 30 ? '10px' : '12px',
                        borderRadius: '50%'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection Group - Always visible */}
            <div className="toolbar-group color-group">
              <span className="toolbar-label">Color:</span>
              <div className="color-buttons">
                {(() => {
                  // Different colors for marker vs highlighter
                  const colors = currentTool === 'marker' 
                    ? ['#0000ff', '#ff0000', '#000000', '#00ff00', '#ff6900'] // Blue, Red, Black, Green, Orange for marker
                    : ['#ffff00', '#00ff00', '#ff6900', '#ff69b4', '#00bfff']; // Yellow, Green, Orange, Pink, Blue for highlighter
                  
                  return colors.map(color => (
                    <button
                      key={color}
                      className={`color-btn ${currentColor === color ? 'active' : ''} ${
                        (currentTool !== 'highlighter' && currentTool !== 'marker') ? 'disabled' : ''
                      }`}
                      onClick={() => (currentTool === 'highlighter' || currentTool === 'marker') && handleColorChange(color)}
                      disabled={currentTool !== 'highlighter' && currentTool !== 'marker'}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="toolbar-group action-group">
            <button
              className="toolbar-btn action-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo"
            >
              <Undo size={16} />
              <span>Undo</span>
            </button>
            <button
              className="toolbar-btn action-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
            >
              <Redo size={16} />
              <span>Redo</span>
            </button>
            <button
              className="toolbar-btn action-btn"
              onClick={clearBoard}
              title="Clear"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
            <button
              className="toolbar-btn action-btn"
              onClick={saveAsNote}
              disabled={isSaving}
              title="Save as Note"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save as Note'}</span>
            </button>
            <button
              className="toolbar-btn action-btn"
              onClick={downloadBoard}
              title="Download"
            >
              <Download size={16} />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      <div className="board-content">
        <canvas
          ref={canvasRef}
          className={`board-canvas ${
            currentTool === 'move' ? 'move-cursor' : 
            currentTool === 'resize' ? 'resize-cursor' :
            'draw-cursor'
          }`}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          onTouchCancel={handleEnd}
          onPointerDown={handleStart}
          onPointerMove={handleMove}
          onPointerUp={handleEnd}
          onPointerCancel={handleEnd}
          style={{ touchAction: 'none' }}
        />

        {/* Resize handles only show in resize mode */}
        {currentTool === 'resize' && selectedScreenshot && (() => {
          const canvas = canvasRef.current;
          if (!canvas) return null;
          
          const rect = canvas.getBoundingClientRect();
          const scaleX = rect.width / canvas.width;
          const scaleY = rect.height / canvas.height;
          
          return (
            <div className="resize-handles">
              {['nw', 'ne', 'sw', 'se'].map(handle => (
                <div
                  key={handle}
                  className={`resize-handle ${handle}`}
                  style={{
                    left: (handle.includes('e') ? selectedScreenshot.x + selectedScreenshot.width : selectedScreenshot.x) * scaleX,
                    top: (handle.includes('s') ? selectedScreenshot.y + selectedScreenshot.height : selectedScreenshot.y) * scaleY
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizeHandle(handle);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizeHandle(handle);
                  }}
                />
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default Board;