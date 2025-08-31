import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Move, 
  Edit3, 
  Highlighter, 
  Circle, 
  Square, 
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
  Image as ImageIcon
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import './BoardEnhanced.css';
import './BoardMobileFix.css';

const Board = () => {
  console.log('Board component loaded - Version 2.0 with all fixes');
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
  const [showPenMenu, setShowPenMenu] = useState(false);
  const [showHighlighterMenu, setShowHighlighterMenu] = useState(false);
  const [showEraserMenu, setShowEraserMenu] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop'); // desktop, tablet, mobile
  
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
  
  // Canvas properties - Match viewport size for 1:1 drawing
  const [canvasSize, setCanvasSize] = useState({
    width: window.innerWidth,  // Match viewport width
    height: window.innerHeight * 2  // 2x height for scrolling
  });
  
  // Auto-expand canvas when drawing near edges
  const expandCanvasIfNeeded = useCallback((x, y) => {
    const padding = 200;
    let needsUpdate = false;
    let newWidth = canvasSize.width;
    let newHeight = canvasSize.height;
    
    if (x > canvasSize.width - padding) {
      newWidth = Math.max(canvasSize.width + 1000, x + padding);
      needsUpdate = true;
    }
    if (y > canvasSize.height - padding) {
      newHeight = Math.max(canvasSize.height + 1000, y + padding);
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      setCanvasSize({ width: newWidth, height: newHeight });
    }
  }, [canvasSize]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // const fileInputRef = useRef(null); // Removed - using paste only
  
  // Auto-save to localStorage
  const STORAGE_KEY = 'drawingBoardData';
  const AUTOSAVE_DELAY = 1000; // 1 second
  const autosaveTimer = useRef(null);
  
  // Image cache for performance
  const imageCache = useRef(new Map());

  // Detect device mode based on screen size
  useEffect(() => {
    const updateDeviceMode = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceMode('mobile');
      } else if (width < 1024) {
        setDeviceMode('tablet');
      } else {
        setDeviceMode('desktop');
      }
    };
    
    updateDeviceMode();
    window.addEventListener('resize', updateDeviceMode);
    return () => window.removeEventListener('resize', updateDeviceMode);
  }, []);
  
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
    
    // Draw grid pattern for infinite canvas
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    // Vertical lines
    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines  
    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Apply zoom transformation
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
        
        img.onerror = () => {
          console.error('Failed to load screenshot:', screenshot.id);
          imageCache.current.delete(screenshot.id);
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
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            screenshot.x - 2, 
            screenshot.y - 2, 
            screenshot.width + 4, 
            screenshot.height + 4
          );
          ctx.setLineDash([]);
          
          // Draw resize handles when resize tool is active
          if (currentTool === 'resize') {
            const handleSize = 16; // Increased from 10 to 16
            ctx.fillStyle = '#0066ff';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3; // Increased border width
            
            // Corner handles
            const handles = [
              { x: screenshot.x, y: screenshot.y }, // top-left
              { x: screenshot.x + screenshot.width, y: screenshot.y }, // top-right
              { x: screenshot.x, y: screenshot.y + screenshot.height }, // bottom-left
              { x: screenshot.x + screenshot.width, y: screenshot.y + screenshot.height } // bottom-right
            ];
            
            handles.forEach(handle => {
              // Draw larger, more prominent handles
              ctx.save();
              
              // Draw white border (larger)
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(
                handle.x - handleSize / 2 - 2,
                handle.y - handleSize / 2 - 2,
                handleSize + 4,
                handleSize + 4
              );
              
              // Draw main blue handle
              ctx.fillStyle = '#0066ff';
              ctx.fillRect(
                handle.x - handleSize / 2,
                handle.y - handleSize / 2,
                handleSize,
                handleSize
              );
              
              // Add corner indicator lines for better visibility
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              
              // Draw corner indicators
              const cornerSize = 6;
              if (handle.x === screenshot.x && handle.y === screenshot.y) {
                // Top-left corner
                ctx.moveTo(handle.x - cornerSize, handle.y);
                ctx.lineTo(handle.x, handle.y);
                ctx.lineTo(handle.x, handle.y - cornerSize);
              } else if (handle.x === screenshot.x + screenshot.width && handle.y === screenshot.y) {
                // Top-right corner  
                ctx.moveTo(handle.x + cornerSize, handle.y);
                ctx.lineTo(handle.x, handle.y);
                ctx.lineTo(handle.x, handle.y - cornerSize);
              } else if (handle.x === screenshot.x && handle.y === screenshot.y + screenshot.height) {
                // Bottom-left corner
                ctx.moveTo(handle.x - cornerSize, handle.y);
                ctx.lineTo(handle.x, handle.y);
                ctx.lineTo(handle.x, handle.y + cornerSize);
              } else {
                // Bottom-right corner
                ctx.moveTo(handle.x + cornerSize, handle.y);
                ctx.lineTo(handle.x, handle.y);
                ctx.lineTo(handle.x, handle.y + cornerSize);
              }
              ctx.stroke();
              
              ctx.restore();
            });
          } else if (currentTool === 'move' && selectedScreenshot?.id === screenshot.id) {
            // Show move cursor indicator
            ctx.fillStyle = 'rgba(0, 102, 255, 0.1)';
            ctx.fillRect(
              screenshot.x,
              screenshot.y,
              screenshot.width,
              screenshot.height
            );
          }
        }
      }
      
      ctx.restore();
    });
    
    // Draw paths (foreground layer)
    paths.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.save();
      
      if (path.tool === 'eraser') {
        // Eraser tool - use destination-out to erase
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = path.width * 2; // Make eraser wider
      } else {
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.globalAlpha = path.tool === 'highlighter' ? 0.5 : 1.0;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
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
      
      if (currentTool === 'eraser') {
        // Eraser tool for current path
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = strokeWidth * 2; // Make eraser wider
      } else {
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = strokeWidth;
        ctx.globalAlpha = currentTool === 'highlighter' ? 0.5 : 1.0;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
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

  // Enhanced paste handler for screenshots with Ctrl+V support
  useEffect(() => {
    const handlePaste = async (e) => {
      try {
        const items = e.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            e.stopPropagation();
            
            const blob = item.getAsFile();
            if (!blob) continue;
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
              const img = new Image();
              img.onload = () => {
                const canvas = canvasRef.current;
                const container = containerRef.current;
                
                if (!canvas || !container) return;
              
              // Calculate optimal size
              const maxWidth = 400;
              const maxHeight = 400;
              const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
              const scaledWidth = img.width * scale;
              const scaledHeight = img.height * scale;
              
              // Get current viewport position
              const rect = canvas.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              
              // Calculate center of current view
              const viewCenterX = (container.scrollLeft + container.clientWidth / 2);
              const viewCenterY = (container.scrollTop + container.clientHeight / 2);
              
              // Position screenshot at center of current view
              const x = viewCenterX - scaledWidth / 2;
              const y = viewCenterY - scaledHeight / 2;
              
              const newScreenshot = {
                id: `screenshot_${Date.now()}_${Math.random()}`,
                src: event.target.result,
                x: Math.max(20, x),
                y: Math.max(20, y),
                width: scaledWidth,
                height: scaledHeight,
                originalWidth: img.width,
                originalHeight: img.height,
                opacity: 1,
                zIndex: screenshots.length
              };
              
              setScreenshots(prev => [...prev, newScreenshot]);
              setSelectedScreenshot(newScreenshot);
              setCurrentTool('move'); // Auto-switch to move tool
              
              // Save to history
              saveToHistory();
              
              // Force immediate redraw
              setTimeout(() => {
                redrawCanvas();
              }, 10);
              
              console.log('Screenshot pasted successfully:', newScreenshot.id);
            };
            
            img.onerror = (error) => {
              console.error('Error loading pasted image:', error);
            };
            
            img.src = event.target.result;
          };
          
          reader.onerror = (error) => {
            console.error('Error reading pasted file:', error);
          };
          
          reader.readAsDataURL(blob);
          return; // Exit after processing first image
        }
      }
    } catch (error) {
      console.error('Paste error:', error);
    }
  };

    // Add paste listener with capture phase for better handling
    document.addEventListener('paste', handlePaste, true);
    
    // Add keyboard shortcut handler
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // The paste event will be triggered automatically by the browser
        // Just ensure focus is on the document
        e.stopPropagation();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [screenshots, saveToHistory, redrawCanvas]);

  // Redraw on dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Get mouse/touch position relative to canvas with proper offset handling
  const getCanvasPosition = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Get the actual event coordinates (works for both mouse and touch)
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      // Touch end event
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate scale factor between canvas internal size and display size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Calculate position relative to canvas accounting for the scale and zoom
    // NOTE: For handle detection, we want the raw canvas coordinates without zoom/pan
    // since the handles are drawn in the transformed coordinate system
    const x = ((clientX - rect.left) * scaleX) / zoom - pan.x;
    const y = ((clientY - rect.top) * scaleY) / zoom - pan.y;
    
    return { x, y };
  }, [zoom, pan]);

  // Enhanced mouse/touch handlers
  const handlePointerDown = useCallback((e) => {
    // Prevent default only for touch to avoid scrolling
    if (e.type.includes('touch')) {
      e.preventDefault();
    }
    const pos = getCanvasPosition(e);
    
    if (currentTool === 'move' || currentTool === 'resize') {
      let handleClicked = false;
      
      // PRIORITY 1: If resize tool and screenshot is already selected, check handles FIRST
      if (currentTool === 'resize' && selectedScreenshot) {
        const handleDetectionSize = 50; // Even larger detection area
        const handles = [
          { type: 'nw', x: selectedScreenshot.x, y: selectedScreenshot.y },
          { type: 'ne', x: selectedScreenshot.x + selectedScreenshot.width, y: selectedScreenshot.y },
          { type: 'sw', x: selectedScreenshot.x, y: selectedScreenshot.y + selectedScreenshot.height },
          { type: 'se', x: selectedScreenshot.x + selectedScreenshot.width, y: selectedScreenshot.y + selectedScreenshot.height }
        ];
        
        // Find the closest handle within detection range
        let closestHandle = null;
        let closestDistance = Infinity;
        
        handles.forEach(h => {
          const distance = Math.sqrt(Math.pow(pos.x - h.x, 2) + Math.pow(pos.y - h.y, 2));
          if (distance < handleDetectionSize && distance < closestDistance) {
            closestDistance = distance;
            closestHandle = h;
          }
        });
        
        if (closestHandle) {
          handleClicked = true;
          setIsResizing(true);
          setResizeHandle(closestHandle.type);
          setDragStart({
            x: pos.x,
            y: pos.y,
            // Store original screenshot bounds for smooth resizing
            originalX: selectedScreenshot.x,
            originalY: selectedScreenshot.y,
            originalWidth: selectedScreenshot.width,
            originalHeight: selectedScreenshot.height
          });
          console.log('✅ RESIZE STARTED - Handle:', closestHandle.type, 'Distance:', closestDistance, 'Screenshot:', selectedScreenshot.id);
        } else {
          // Debug: Show distances to all handles
          console.log('❌ NO HANDLE DETECTED - Click pos:', pos);
          handles.forEach(h => {
            const distance = Math.sqrt(Math.pow(pos.x - h.x, 2) + Math.pow(pos.y - h.y, 2));
            console.log(`  ${h.type}: distance=${distance.toFixed(2)}, threshold=${handleDetectionSize}`);
          });
        }
      }
      
      // PRIORITY 2: If no handle was clicked, check for screenshot selection
      if (!handleClicked) {
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
            // For newly selected screenshots, check handles too
            const handleDetectionSize = 40;
            const handles = [
              { type: 'nw', x: clickedScreenshot.x, y: clickedScreenshot.y },
              { type: 'ne', x: clickedScreenshot.x + clickedScreenshot.width, y: clickedScreenshot.y },
              { type: 'sw', x: clickedScreenshot.x, y: clickedScreenshot.y + clickedScreenshot.height },
              { type: 'se', x: clickedScreenshot.x + clickedScreenshot.width, y: clickedScreenshot.y + clickedScreenshot.height }
            ];
            
            const clickedHandle = handles.find(h => 
              Math.abs(pos.x - h.x) < handleDetectionSize && 
              Math.abs(pos.y - h.y) < handleDetectionSize
            );
            
            if (clickedHandle) {
              setIsResizing(true);
              setResizeHandle(clickedHandle.type);
              setDragStart({
                x: pos.x,
                y: pos.y,
                originalX: clickedScreenshot.x,
                originalY: clickedScreenshot.y,
                originalWidth: clickedScreenshot.width,
                originalHeight: clickedScreenshot.height
              });
              console.log('Handle clicked on new selection:', clickedHandle.type);
            }
          }
        } else {
          // Click outside - deselect
          setSelectedScreenshot(null);
        }
      }
    } else if (currentTool === 'pen' || currentTool === 'highlighter' || currentTool === 'eraser') {
      setIsDrawing(true);
      setCurrentPath([pos]);
    }
  }, [currentTool, screenshots, selectedScreenshot, getCanvasPosition]);

  const handlePointerMove = useCallback((e) => {
    const pos = getCanvasPosition(e);
    
    // Expand canvas if drawing near edge
    if (isDrawing) {
      expandCanvasIfNeeded(pos.x, pos.y);
    }
    
    if (isDragging && selectedScreenshot) {
      // Update screenshot position
      setScreenshots(prev => prev.map(s => 
        s.id === selectedScreenshot.id 
          ? { ...s, x: pos.x - dragStart.x, y: pos.y - dragStart.y }
          : s
      ));
    } else if (isResizing && selectedScreenshot && resizeHandle && dragStart) {
      // Smooth, responsive resize with better calculations
      const deltaX = pos.x - dragStart.x;
      const deltaY = pos.y - dragStart.y;
      const minSize = 30; // Minimum size for screenshot
      
      setScreenshots(prev => prev.map(s => {
        if (s.id !== selectedScreenshot.id) return s;
        
        let newX = dragStart.originalX;
        let newY = dragStart.originalY;
        let newWidth = dragStart.originalWidth;
        let newHeight = dragStart.originalHeight;
        
        switch (resizeHandle) {
          case 'se': // Bottom-right handle
            newWidth = Math.max(minSize, dragStart.originalWidth + deltaX);
            newHeight = Math.max(minSize, dragStart.originalHeight + deltaY);
            break;
          case 'sw': // Bottom-left handle  
            newWidth = Math.max(minSize, dragStart.originalWidth - deltaX);
            newHeight = Math.max(minSize, dragStart.originalHeight + deltaY);
            newX = dragStart.originalX + (dragStart.originalWidth - newWidth);
            break;
          case 'ne': // Top-right handle
            newWidth = Math.max(minSize, dragStart.originalWidth + deltaX);
            newHeight = Math.max(minSize, dragStart.originalHeight - deltaY);
            newY = dragStart.originalY + (dragStart.originalHeight - newHeight);
            break;
          case 'nw': // Top-left handle
            newWidth = Math.max(minSize, dragStart.originalWidth - deltaX);
            newHeight = Math.max(minSize, dragStart.originalHeight - deltaY);
            newX = dragStart.originalX + (dragStart.originalWidth - newWidth);
            newY = dragStart.originalY + (dragStart.originalHeight - newHeight);
            break;
        }
        
        return { ...s, x: newX, y: newY, width: newWidth, height: newHeight };
      }));
    } else if (isDrawing) {
      setCurrentPath(prev => [...prev, pos]);
    }
  }, [isDragging, isResizing, isDrawing, selectedScreenshot, dragStart, resizeHandle, getCanvasPosition, expandCanvasIfNeeded, zoom, pan]);

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
    // Toggle menus for pen and highlighter in mobile/tablet
    if (deviceMode !== 'desktop') {
      if (tool === 'pen' && currentTool !== 'pen') {
        setShowPenMenu(true);
        setShowHighlighterMenu(false);
      } else if (tool === 'highlighter' && currentTool !== 'highlighter') {
        setShowHighlighterMenu(true);
        setShowPenMenu(false);
        setShowEraserMenu(false);
      } else if (tool === 'eraser' && currentTool !== 'eraser') {
        setShowEraserMenu(true);
        setShowPenMenu(false);
        setShowHighlighterMenu(false);
      } else if (tool === currentTool) {
        // Toggle off if clicking same tool
        setShowPenMenu(false);
        setShowHighlighterMenu(false);
        setShowEraserMenu(false);
      } else {
        setShowPenMenu(false);
        setShowHighlighterMenu(false);
        setShowEraserMenu(false);
      }
    }
    
    setCurrentTool(tool);
    if (tool !== 'move' && tool !== 'resize') {
      setSelectedScreenshot(null);
    }
    
    // Auto-select colors for specific tools (only if switching from a different tool type)
    if (tool === 'highlighter' && currentTool !== 'highlighter') {
      setCurrentColor('#ffff00');
      // Don't reset stroke width if user has customized it
      if (currentTool !== 'pen') {
        setStrokeWidth(15);
      }
    } else if (tool === 'pen' && currentTool !== 'pen') {
      setCurrentColor('#000000');
      // Don't reset stroke width if user has customized it
      if (currentTool !== 'highlighter') {
        setStrokeWidth(2);
      }
    } else if (tool === 'eraser' && currentTool !== 'eraser') {
      setStrokeWidth(20);
    }
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
  
  // Handle file upload
  /* Removed - using paste only
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
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
        
        // Position in center of viewport
        const x = container.scrollLeft + (container.clientWidth - scaledWidth) / 2;
        const y = container.scrollTop + (container.clientHeight - scaledHeight) / 2;
        
        const newScreenshot = {
          id: `upload_${Date.now()}_${Math.random()}`,
          src: event.target.result,
          x: Math.max(20, x),
          y: Math.max(20, y),
          width: scaledWidth,
          height: scaledHeight,
          originalWidth: img.width,
          originalHeight: img.height,
          opacity: 1,
          zIndex: screenshots.length
        };
        
        setScreenshots(prev => [...prev, newScreenshot]);
        setSelectedScreenshot(newScreenshot);
        setCurrentTool('move');
        saveToHistory();
        
        // Force redraw
        setTimeout(() => redrawCanvas(), 10);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    
    // Reset input
    // Reset tool to pen after clearing
    setCurrentTool('pen');
  }; */

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
      {/* Responsive Toolbar - v2.0 */}
      <div className={`board-toolbar board-toolbar-${deviceMode}`} title={`Device: ${deviceMode} | Version: 2.0`}>
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
            <Move size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'pen' ? 'active' : ''}`}
            onClick={() => handleToolChange('pen')}
            title="Pen (P)"
          >
            <Edit3 size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'highlighter' ? 'active' : ''}`}
            onClick={() => handleToolChange('highlighter')}
            title="Highlighter (H)"
          >
            <Highlighter size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'eraser' ? 'active' : ''}`}
            onClick={() => handleToolChange('eraser')}
            title="Eraser (E)"
          >
            <Eraser size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
          <button 
            className={`tool-button ${currentTool === 'resize' ? 'active' : ''}`}
            onClick={() => handleToolChange('resize')}
            title="Resize (R)"
          >
            <Square size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
        </div>

        {/* Desktop Mode - Inline Color & Stroke */}
        {deviceMode === 'desktop' && (currentTool === 'pen' || currentTool === 'highlighter') && (
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
              {[3, 8, 15, 25, 40].map(width => (
                <button
                  key={width}
                  className={`stroke-button ${strokeWidth === width ? 'active' : ''}`}
                  onClick={() => setStrokeWidth(width)}
                >
                  <div 
                    className="stroke-indicator" 
                    style={{ 
                      width: Math.min(width / 2, 16) + 'px', 
                      height: Math.min(width / 2, 16) + 'px',
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
            <ZoomOut size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="tool-button" onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
          {deviceMode !== 'mobile' && (
            <button className="tool-button" onClick={handleZoomReset} title="Reset View">
              <Maximize2 size={20} />
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile/Tablet Horizontal Menus */}
      {deviceMode !== 'desktop' && showPenMenu && (
        <div className="toolbar-submenu toolbar-submenu-horizontal">
          <div className="submenu-section">
            <span className="submenu-label">Colors:</span>
            <div className="color-picker-horizontal">
              {['#000000', '#ffffff', '#0066ff', '#ff0000', '#00cc00', '#ffaa00'].map(color => (
                <button
                  key={color}
                  className={`color-button ${currentColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                />
              ))}
            </div>
          </div>
          <div className="submenu-section">
            <span className="submenu-label">Size:</span>
            <div className="stroke-picker-horizontal">
              {[3, 8, 15, 25, 40].map(width => (
                <button
                  key={width}
                  className={`stroke-button ${strokeWidth === width ? 'active' : ''}`}
                  onClick={() => setStrokeWidth(width)}
                >
                  <div 
                    className="stroke-indicator" 
                    style={{ 
                      width: Math.min(width / 2, 16) + 'px', 
                      height: Math.min(width / 2, 16) + 'px',
                      backgroundColor: currentColor
                    }} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {deviceMode !== 'desktop' && showEraserMenu && (
        <div className="toolbar-submenu toolbar-submenu-horizontal">
          <div className="submenu-section">
            <span className="submenu-label">Eraser Size:</span>
            <div className="stroke-picker-horizontal">
              {[10, 20, 30, 50, 80].map(width => (
                <button
                  key={width}
                  className={`stroke-button ${strokeWidth === width ? 'active' : ''}`}
                  onClick={() => setStrokeWidth(width)}
                >
                  <div 
                    className="stroke-indicator" 
                    style={{ 
                      width: Math.min(width / 4, 18) + 'px', 
                      height: Math.min(width / 4, 18) + 'px',
                      backgroundColor: '#666'
                    }} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {deviceMode !== 'desktop' && showHighlighterMenu && (
        <div className="toolbar-submenu toolbar-submenu-horizontal">
          <div className="submenu-section">
            <span className="submenu-label">Colors:</span>
            <div className="color-picker-horizontal">
              {['#ffff00', '#00ff00', '#00ffff', '#ff00ff', '#ff9900', '#ff0000'].map(color => (
                <button
                  key={color}
                  className={`color-button ${currentColor === color ? 'active' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCurrentColor(color)}
                />
              ))}
            </div>
          </div>
          <div className="submenu-section">
            <span className="submenu-label">Size:</span>
            <div className="stroke-picker-horizontal">
              {[20, 30, 40, 50, 70].map(width => (
                <button
                  key={width}
                  className={`stroke-button ${strokeWidth === width ? 'active' : ''}`}
                  onClick={() => setStrokeWidth(width)}
                >
                  <div 
                    className="stroke-indicator" 
                    style={{ 
                      width: Math.min(width / 3.5, 18) + 'px', 
                      height: Math.min(width / 3.5, 18) + 'px',
                      backgroundColor: currentColor,
                      opacity: 0.5
                    }} 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Canvas Container with infinite scroll */}
      <div 
        ref={containerRef}
        className="board-content"
        data-tool={currentTool}
        style={{ 
          overflow: 'auto',
          flex: 1,
          position: 'relative'
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="board-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          style={{ 
            touchAction: 'none',
            display: 'block',
            width: '100%',
            height: 'auto',
            maxWidth: `${canvasSize.width}px`
          }}
        />
      </div>
    </div>
  );
};

export default Board;