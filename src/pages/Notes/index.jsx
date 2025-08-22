import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Trash2, Save, X, Calendar, Clock, FileText, Star, Image as ImageIcon, Tag, Copy, Check, Edit3, CheckCircle, Download, ChevronRight, Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Code, Strikethrough, Undo, Redo, Type, MessageSquare, Table, TableProperties, RowsIcon, ColumnsIcon, GripVertical, GripHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { firestore as db, storage } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import RichTextEditor from '../../components/RichTextEditor/RichTextEditor';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Notes.css';
import './NotesResponsiveFix.css';
import './BannerFixes.css';
import './BannerPaleColors.css';
import './TitleBanners.css';
import './BannerAlignmentFixes.css';
import './CalloutBanners.css';
import './EditorViewerConsistency.css';
import './EditorViewerIdentical.css';
import './BannerControlsRedesign.css';
import './EditorLayoutFix.css';
import './NeonColorCircles.css';
import './EditorViewerIdenticalFix.css';
import './CompleteFinalFix.css';
import './UnifiedToolbarLayout.css';
import './PerfectToolbarMatch.css';
import './TableContextMenu.css';
import './TableResize.css';
import './TableContentFlow.css';
import './TableViewerStyles.css';
import './TableVisibleScrollbars.css';
import './TableScrollbarFix.css'; // Enhanced scrollbar fix
import './EditorPaddingFix.css'; // Must be last to override all other styles
import EnterpriseHeader, { TabGroup, TabButton, ActionButton, ActionGroup, HeaderDivider } from '../../components/EnterpriseHeader/EnterpriseHeader';
import NoteDeleteConfirmPopup from '../../components/NoteDeleteConfirmPopup/NoteDeleteConfirmPopup';
import InlineTableEditor from '../../components/InlineTableEditor/InlineTableEditor';

const Notes = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    starred: false,
    images: [],
    banners: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [newBannerText, setNewBannerText] = useState('');
  const [showBannerInput, setShowBannerInput] = useState(false);
  const [copiedBannerId, setCopiedBannerId] = useState(null);
  const [bannerLineBreak, setBannerLineBreak] = useState(false); // false = existing line (default)
  const [currentLineNumber, setCurrentLineNumber] = useState(0); // Track which line we're on
  const [bannerColor, setBannerColor] = useState('blue'); // 'blue', 'orange', 'green', or 'grey'
  const [isTitleMode, setIsTitleMode] = useState(false); // false = banner mode, true = title mode
  const [isCalloutMode, setIsCalloutMode] = useState(false); // false = banner/title mode, true = callout mode
  const bannerInputRef = useRef(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track if user has manually interacted
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, bannerId: null });
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editingBannerText, setEditingBannerText] = useState('');
  const longPressTimer = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [noteContextMenu, setNoteContextMenu] = useState({ visible: false, x: 0, y: 0, noteId: null });
  const noteLongPressTimer = useRef(null);
  const [showBannerSection, setShowBannerSection] = useState(true); // Always show banner section
  const editorRef = useRef(null);
  const noteContentRef = useRef(null);
  const [inlineTableEditors, setInlineTableEditors] = useState([]);
  const [tableContextMenu, setTableContextMenu] = useState({ visible: false, x: 0, y: 0, table: null });
  const [currentTableElement, setCurrentTableElement] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  
  // Delete confirmation state
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!db) {
      console.error('Firebase database not initialized');
      setLoading(false);
      return;
    }

    let unsubscribe;

    try {
      const notesRef = collection(db, 'notes');
      unsubscribe = onSnapshot(notesRef, 
        (snapshot) => {
          const notesData = snapshot.docs.map(doc => {
            const data = doc.data();
            
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date()
            };
          });
          
          // Sort by updated date (newest first)
          notesData.sort((a, b) => b.updatedAt - a.updatedAt);
          
          setNotes(notesData);
          setLoading(false);
        }, 
        (error) => {
          console.error('Error loading notes:', error);
          setLoading(false);
          setNotes([]);
        }
      );
      
      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (error) {
      console.error('Firebase connection error:', error);
      setLoading(false);
      setNotes([]);
    }
  }, []);

  // Handle navigation state to auto-select note when coming from homepage map
  useEffect(() => {
    const selectedNoteId = location.state?.selectedNoteId;
    if (selectedNoteId && notes.length > 0) {
      const noteToSelect = notes.find(note => note.id === selectedNoteId);
      if (noteToSelect) {
        handleSelectNote(noteToSelect);
      }
    }
  }, [notes, location.state, selectedNote, isCreating, loading, hasUserInteracted]);

  const handleCreateNote = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setFormData({
      title: 'New Note',
      content: '',
      starred: false,
      images: [],
      banners: []
    });
    // Reset line tracking for new note
    setCurrentLineNumber(0);
    setBannerLineBreak(false);
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    // Ensure banners have isDone property for backward compatibility
    const banners = (note.banners || []).map(banner => ({
      ...banner,
      isDone: banner.isDone !== undefined ? banner.isDone : false
    }));
    
    setFormData({
      title: note.title || '',
      content: note.content || '',
      starred: note.starred || false,
      images: note.images || [],
      banners: banners
    });
    setIsEditing(false);
    setIsCreating(false);
    // Reset line tracking when selecting a note
    const maxLineNumber = banners.reduce((max, banner) => 
      Math.max(max, banner.lineNumber || 0), 0);
    setCurrentLineNumber(maxLineNumber);
    setBannerLineBreak(false);
    // Mark that user has interacted
    setHasUserInteracted(true);
    // Close mobile menu when note is selected
    setIsMobileMenuOpen(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title for the note.');
      return;
    }

    if (!db) {
      alert('Database connection not available. Please refresh the page and try again.');
      return;
    }
    
    // Get the current editor content and replace RevoGrid containers with updated HTML
    let finalContent = formData.content;
    if (editorRef.current) {
      const editorContent = editorRef.current.querySelector('.ProseMirror') || 
                          editorRef.current.querySelector('.ql-editor') || 
                          editorRef.current;
      
      if (editorContent) {
        // Clone the content to avoid modifying the actual editor
        const contentClone = editorContent.cloneNode(true);
        
        // Find all inline RevoGrid containers in the clone
        const containers = contentClone.querySelectorAll('.inline-revo-container');
        containers.forEach(container => {
          // Get updated HTML or use original
          const updatedHtml = container.dataset.updatedHtml || container.dataset.originalHtml;
          if (updatedHtml) {
            // Create temporary div to hold the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = updatedHtml;
            const newTable = tempDiv.querySelector('table');
            
            if (newTable) {
              // Replace container with the updated table
              container.parentNode.replaceChild(newTable, container);
            }
          }
        });
        
        // Use the modified content for saving
        finalContent = contentClone.innerHTML;
      }
    }

    try {
      if (isCreating) {
        const notesRef = collection(db, 'notes');
        
        const noteData = {
          title: formData.title,
          content: finalContent,
          starred: formData.starred,
          images: formData.images || [],
          banners: formData.banners || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(notesRef, noteData);
        
        // Create a temporary note object to display immediately
        // Note: Keep the original formData with parsed arrays for display
        const newNote = {
          id: docRef.id,
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setSelectedNote(newNote);
        setIsCreating(false);
      } else if (selectedNote) {
        const noteRef = doc(db, 'notes', selectedNote.id);
        const updateData = {
          title: formData.title,
          content: finalContent,
          starred: formData.starred,
          images: formData.images || [],
          banners: formData.banners || [],
          updatedAt: serverTimestamp()
        };
        await updateDoc(noteRef, updateData);
        
        // Update the selectedNote with the new data
        const updatedNote = {
          ...selectedNote,
          title: formData.title,
          content: formData.content,
          starred: formData.starred,
          images: formData.images || [],
          banners: formData.banners || [],
          updatedAt: new Date()
        };
        setSelectedNote(updatedNote);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDelete = (noteId = null) => {
    // Use provided noteId or fall back to selectedNote
    const noteIdToDelete = noteId || selectedNote?.id;
    
    if (noteIdToDelete) {
      // Find the note to get its title for the popup
      const note = notes.find(n => n.id === noteIdToDelete);
      if (note) {
        setNoteToDelete(note);
        setShowDeletePopup(true);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete || !db) return;
    
    const noteIdToDelete = noteToDelete.id;
    setShowDeletePopup(false);
    setNoteToDelete(null);
    
    await confirmDelete(noteIdToDelete);
  };
  
  const handleCancelDelete = () => {
    setShowDeletePopup(false);
    setNoteToDelete(null);
  };

  const confirmDelete = async (noteIdToDelete) => {
    if (!noteIdToDelete || !db) return;

    try {
      await deleteDoc(doc(db, 'notes', noteIdToDelete));
      
      // Clear selected note if we deleted the currently selected one
      if (selectedNote && selectedNote.id === noteIdToDelete) {
        setSelectedNote(null);
        setFormData({ title: '', content: '', starred: false, images: [], banners: [] });
      }
      
      // Remove from notes array
      setNotes(prevNotes => prevNotes.filter(note => note.id !== noteIdToDelete));
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const toggleStar = async (note, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!db) return;

    try {
      const noteRef = doc(db, 'notes', note.id);
      await updateDoc(noteRef, {
        starred: !note.starred
      });
      
      // Update local state if this is the selected note
      if (selectedNote && selectedNote.id === note.id) {
        setFormData(prev => ({ ...prev, starred: !note.starred }));
      }
    } catch (error) {
      console.error('Error updating star status:', error);
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file, isScreenshot = false) => {
    if (!storage) {
      alert('Storage service not available');
      return null;
    }
    
    setUploadingImage(true);
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileExtension = file.type.split('/')[1] || 'png';
      const baseName = isScreenshot ? 'screenshot' : (file.name?.split('.')[0] || 'image');
      const fileName = `notes/${timestamp}_${baseName}.${fileExtension}`;
      
      // Set metadata for better organization
      const metadata = {
        contentType: file.type || 'image/png',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          isScreenshot: isScreenshot.toString()
        }
      };
      
      // Upload to Firebase Storage with metadata
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Also store image URL in images array for reference
      const newImages = [...(formData.images || []), downloadURL];
      setFormData(prev => ({ ...prev, images: newImages }));
      
      // Auto-save after image upload if editing existing note
      if (!isCreating && selectedNote) {
        setTimeout(() => {
          handleSave();
        }, 500);
      }
      
      return downloadURL;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload ${isScreenshot ? 'screenshot' : 'image'}: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };
  
  // Helper function to get current banners array based on mode
  const getCurrentBanners = () => {
    return (isEditing || isCreating) ? formData.banners : selectedNote?.banners || [];
  };

  // Replace tables with RevoGrid editors in edit mode
  useEffect(() => {
    if ((isEditing || isCreating) && editorRef.current) {
      // Wait for editor to render and content to load
      const setupEditors = () => {
        const editorContent = editorRef.current.querySelector('.ProseMirror') || 
                            editorRef.current.querySelector('.ql-editor') || 
                            editorRef.current.querySelector('.tiptap-editor') ||
                            editorRef.current;
        
        if (!editorContent) {
          setTimeout(setupEditors, 200);
          return;
        }
        
        // Find all tables in the editor
        const tables = editorContent.querySelectorAll('table:not([data-revo-replaced])');
        
        if (tables.length === 0) {
          return;
        }
        
        const newEditors = [];
        
        tables.forEach((table, index) => {
          // Create a container for the RevoGrid editor
          const container = document.createElement('div');
          container.id = `inline-revo-${Date.now()}-${index}`;
          container.className = 'inline-revo-container';
          
          // Store original HTML
          container.dataset.originalHtml = table.outerHTML;
          
          // Replace table with container
          table.parentNode.replaceChild(container, table);
          
          // Mark as replaced
          table.dataset.revoReplaced = 'true';
          
          // Store info for React portal
          newEditors.push({
            id: `${Date.now()}-${index}`,
            containerId: container.id,
            tableElement: table,
            originalHtml: table.outerHTML
          });
        });
        
        if (newEditors.length > 0) {
          setInlineTableEditors(newEditors);
        }
      };
      
      setTimeout(setupEditors, 500);
    } else {
      // Clear inline editors when not editing
      setInlineTableEditors([]);
    }
  }, [isEditing, isCreating, formData.content]);

  // Fix table scrollbars in viewer mode
  useEffect(() => {
    // Apply to viewer mode tables
    if (!isEditing && !isCreating && selectedNote && noteContentRef.current) {
      const fixTableScrollbars = () => {
        const tables = noteContentRef.current.querySelectorAll('table');
        tables.forEach(table => {
          // Ensure table is block element for scrolling
          table.style.display = 'block';
          table.style.overflow = 'scroll';
          table.style.maxHeight = '500px';
          table.style.maxWidth = '100%';
          table.style.border = '2px solid #e0e0e0';
          table.style.borderRadius = '6px';
          table.style.margin = '1.5rem 0';
          
          // Force scrollbar visibility
          table.style.overflowX = 'scroll';
          table.style.overflowY = 'scroll';
        });
      };
      
      // Run immediately and after a delay to catch dynamic content
      fixTableScrollbars();
      setTimeout(fixTableScrollbars, 100);
      setTimeout(fixTableScrollbars, 500);
    }
  }, [isEditing, isCreating, selectedNote, formData.content]);

  // Add right-click context menu for tables in editor mode
  useEffect(() => {
    if ((isEditing || isCreating)) {
      const handleTableRightClick = (e) => {
        // Check if right-click is on a table element
        const clickedElement = e.target;
        const table = clickedElement.closest('table');
        const row = clickedElement.closest('tr');
        
        if (table) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log('Table right-clicked:', table);
          console.log('Row clicked:', row);
          
          // Store the clicked row for delete row functionality
          setTableContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            table: table,
            row: row
          });
          
          return false; // Prevent default context menu
        }
      };
      
      // Add listener to document for broader coverage
      const setupContextMenu = () => {
        // Listen on document level to catch all table clicks
        document.addEventListener('contextmenu', handleTableRightClick, true);
        
        return () => {
          document.removeEventListener('contextmenu', handleTableRightClick, true);
        };
      };
      
      // Setup immediately
      const cleanup = setupContextMenu();
      
      return cleanup;
    }
  }, [isEditing, isCreating]);

  // Handle closing table context menu
  const handleCloseTableContextMenu = () => {
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null });
  };
  
  // Handle table editor save
  const handleTableEditorSave = (tableHtml, tableData) => {
    if (currentTableElement && editingTable) {
      // Replace the old table with the new one
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = tableHtml;
      const newTable = tempDiv.querySelector('table');
      
      if (newTable && currentTableElement.parentNode) {
        // Copy classes and styles from original table
        newTable.className = currentTableElement.className;
        // Add Dongle font styling
        newTable.style.fontFamily = '"Dongle", sans-serif';
        newTable.style.fontSize = '1.8rem';
        
        // Show the new table
        newTable.style.display = '';
        currentTableElement.parentNode.replaceChild(newTable, currentTableElement);
        
        // Remove the editor container
        if (editingTable && editingTable.parentNode) {
          editingTable.parentNode.removeChild(editingTable);
        }
      }
      
      // Save the updated content
      const saveContent = () => {
        if (isEditing || isCreating) {
          // In editor mode
          const editorContent = editorRef.current?.querySelector('.ProseMirror') || 
                              editorRef.current?.querySelector('.ql-editor') || 
                              editorRef.current;
          if (editorContent) {
            const updatedContent = editorContent.innerHTML;
            setFormData(prev => ({ ...prev, content: updatedContent }));
          }
        } else if (noteContentRef.current) {
          // In viewer mode
          const updatedContent = noteContentRef.current.innerHTML;
          setFormData(prev => ({ ...prev, content: updatedContent }));
          if (selectedNote) {
            handleSave();
          }
        }
      };
      
      setTimeout(saveContent, 100);
    }
    
    // Close the editor
    setShowTableEditor(false);
    setCurrentTableElement(null);
    setEditingTable(null);
  };
  
  const handleTableEditorClose = () => {
    // Restore original table if closing without saving
    if (currentTableElement && editingTable) {
      currentTableElement.style.display = '';
      if (editingTable && editingTable.parentNode) {
        editingTable.parentNode.removeChild(editingTable);
      }
    }
    
    setShowTableEditor(false);
    setCurrentTableElement(null);
    setEditingTable(null);
  };
  
  // Simplified table resizing for fallback
  const makeTableResizable = (table) => {
    if (!table) return;
    
    // Set table to fixed layout for better control
    table.style.tableLayout = 'fixed';
    table.setAttribute('data-resizable', 'true');
    
    // Add resize handles to table cells
    const addResizeHandles = () => {
      // Remove existing handles
      table.querySelectorAll('.resize-handle').forEach(handle => handle.remove());
      table.querySelectorAll('.resize-indicator').forEach(indicator => indicator.remove());
      
      // Get all cells for column handles
      const firstRow = table.querySelector('tr');
      if (!firstRow) return;
      
      const headerCells = firstRow.querySelectorAll('th, td');
      
      // Add column resize handles
      headerCells.forEach((cell, colIndex) => {
        // Set initial width if not set
        if (!cell.style.width) {
          cell.style.width = cell.offsetWidth + 'px';
        }
        
        if (colIndex < headerCells.length - 1) { // Don't add to last column
          const colHandle = document.createElement('div');
          colHandle.className = 'resize-handle resize-handle-col';
          colHandle.setAttribute('data-col-index', colIndex);
          colHandle.style.cssText = `
            position: absolute;
            right: -4px;
            top: 0;
            bottom: 0;
            width: 8px;
            background: transparent;
            cursor: col-resize;
            z-index: 10;
          `;
          
          let startX = 0;
          let startWidth = 0;
          let isResizing = false;
          
          // Add visual indicator line
          const resizeLine = document.createElement('div');
          resizeLine.className = 'resize-indicator resize-indicator-col';
          resizeLine.style.cssText = `
            position: absolute;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #FF6900;
            opacity: 0;
            pointer-events: none;
            z-index: 1001;
            transition: opacity 0.2s;
          `;
          
          colHandle.onmouseenter = () => {
            resizeLine.style.opacity = '0.5';
          };
          
          colHandle.onmouseleave = () => {
            if (!isResizing) {
              resizeLine.style.opacity = '0';
            }
          };
          
          colHandle.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            startX = e.pageX;
            startWidth = cell.offsetWidth;
            
            // Show resize line
            resizeLine.style.opacity = '1';
            
            // Add resizing class to table
            table.classList.add('resizing-table');
            
            // Create overlay to prevent text selection and cursor issues
            const overlay = document.createElement('div');
            overlay.className = 'resize-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; cursor: col-resize; user-select: none;';
            document.body.appendChild(overlay);
            
            const handleMouseMove = (e) => {
              if (!isResizing) return;
              e.preventDefault();
              const width = Math.max(30, startWidth + (e.pageX - startX));
              
              // Update all cells in this column
              table.querySelectorAll('tr').forEach(row => {
                const targetCell = row.children[colIndex];
                if (targetCell) {
                  targetCell.style.width = width + 'px';
                }
              });
              
              // Update resize line position
              const cellRect = cell.getBoundingClientRect();
              const tableRect = table.getBoundingClientRect();
              resizeLine.style.left = (cellRect.right - tableRect.left - 1) + 'px';
            };
            
            const handleMouseUp = () => {
              isResizing = false;
              resizeLine.style.opacity = '0';
              table.classList.remove('resizing-table');
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              document.querySelector('.resize-overlay')?.remove();
              // Save the changes after a small delay
              setTimeout(() => saveTableChanges(), 100);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          };
          
          cell.style.position = 'relative';
          cell.appendChild(colHandle);
          cell.appendChild(resizeLine);
        }
      });
      
      // Add row resize handles
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, rowIndex) => {
        // Set initial height if not set
        if (!row.style.height) {
          row.style.height = row.offsetHeight + 'px';
        }
        
        if (rowIndex < rows.length - 1) { // Don't add to last row
          const firstCell = row.querySelector('td, th');
          if (firstCell) {
            const rowHandle = document.createElement('div');
            rowHandle.className = 'resize-handle resize-handle-row';
            rowHandle.setAttribute('data-row-index', rowIndex);
            rowHandle.style.cssText = `
              position: absolute;
              bottom: -4px;
              left: 0;
              right: 0;
              height: 8px;
              background: transparent;
              cursor: row-resize;
              z-index: 10;
            `;
            
            // Add visual indicator line
            const resizeLine = document.createElement('div');
            resizeLine.className = 'resize-indicator resize-indicator-row';
            resizeLine.style.cssText = `
              position: absolute;
              left: 0;
              right: 0;
              height: 2px;
              background: #FF6900;
              opacity: 0;
              pointer-events: none;
              z-index: 1001;
              transition: opacity 0.2s;
            `;
            
            rowHandle.onmouseenter = () => {
              resizeLine.style.opacity = '0.5';
            };
            
            rowHandle.onmouseleave = () => {
              if (!isResizing) {
                resizeLine.style.opacity = '0';
              }
            };
            
            let startY = 0;
            let startHeight = 0;
            let isResizing = false;
            
            rowHandle.onmousedown = (e) => {
              e.preventDefault();
              e.stopPropagation();
              isResizing = true;
              startY = e.pageY;
              startHeight = row.offsetHeight;
              
              // Show resize line
              resizeLine.style.opacity = '1';
              
              // Add resizing class to table
              table.classList.add('resizing-table');
              
              // Create overlay
              const overlay = document.createElement('div');
              overlay.className = 'resize-overlay';
              overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; cursor: row-resize; user-select: none;';
              document.body.appendChild(overlay);
              
              const handleMouseMove = (e) => {
                if (!isResizing) return;
                e.preventDefault();
                const height = Math.max(20, startHeight + (e.pageY - startY));
                row.style.height = height + 'px';
                
                // Update resize line position
                const rowRect = row.getBoundingClientRect();
                const tableRect = table.getBoundingClientRect();
                resizeLine.style.top = (rowRect.bottom - tableRect.top - 1) + 'px';
              };
              
              const handleMouseUp = () => {
                isResizing = false;
                resizeLine.style.opacity = '0';
                table.classList.remove('resizing-table');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.querySelector('.resize-overlay')?.remove();
                // Save the changes after a small delay
                setTimeout(() => saveTableChanges(), 100);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            };
            
            firstCell.style.position = 'relative';
            firstCell.appendChild(rowHandle);
            firstCell.appendChild(resizeLine);
          }
        }
      });
    };
    
    // Save table changes to Firebase
    const saveTableChanges = () => {
      setTimeout(() => {
        if (isEditing || isCreating) {
          // In editor mode
          const editorContent = editorRef.current?.querySelector('.ProseMirror') || 
                              editorRef.current?.querySelector('.ql-editor') || 
                              editorRef.current;
          if (editorContent) {
            const updatedContent = editorContent.innerHTML;
            setFormData(prev => ({ ...prev, content: updatedContent }));
          }
        } else if (noteContentRef.current) {
          // In viewer mode
          const updatedContent = noteContentRef.current.innerHTML;
          setFormData(prev => ({ ...prev, content: updatedContent }));
          if (selectedNote) {
            handleSave();
          }
        }
      }, 100);
    };
    
    addResizeHandles();
  };
  
  const handleEditTable = () => {
    if (!tableContextMenu.table) return;
    
    // If in viewer mode, switch to edit mode first
    if (!isEditing && !isCreating) {
      setIsEditing(true);
      // Wait for editor to be ready before proceeding
      setTimeout(() => {
        // Find the table in the editor after mode switch
        const editorContent = editorRef.current?.querySelector('.ProseMirror') || 
                            editorRef.current?.querySelector('.ql-editor') || 
                            editorRef.current;
        if (editorContent) {
          const tables = editorContent.querySelectorAll('table');
          // Find matching table by content or position
          tables.forEach(editorTable => {
            if (editorTable.innerHTML === tableContextMenu.table.innerHTML) {
              setupTableEditing(editorTable);
            }
          });
        }
      }, 300);
    } else {
      // Already in edit mode, proceed directly
      setupTableEditing(tableContextMenu.table);
    }
    
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null });
  };
  
  const setupTableEditing = (table) => {
    if (!table) return;
    
    // Use Handsontable editor instead of inline editing
    setCurrentTableElement(table);
    setShowTableEditor(true);
    setEditingTable(table);
    
    // Table editor will handle saving
  };
  
  const handleAddTableRow = () => {
    if (!tableContextMenu.table) return;
    
    const table = tableContextMenu.table;
    const tbody = table.querySelector('tbody') || table;
    const rows = tbody.querySelectorAll('tr');
    const lastRow = rows[rows.length - 1];
    
    if (lastRow) {
      // Clone the last row structure but with empty content
      const newRow = lastRow.cloneNode(true);
      
      // Clear all cell contents in the new row
      const newCells = newRow.querySelectorAll('td, th');
      newCells.forEach(cell => {
        // Clear content but preserve structure and styles
        cell.innerHTML = '&nbsp;'; // Non-breaking space to maintain cell height
        
        // If it's a header cell in the body, convert it to td
        if (cell.tagName === 'TH' && tbody.tagName === 'TBODY') {
          const newTd = document.createElement('td');
          // Copy all attributes and styles
          Array.from(cell.attributes).forEach(attr => {
            newTd.setAttribute(attr.name, attr.value);
          });
          newTd.innerHTML = '&nbsp;';
          cell.parentNode.replaceChild(newTd, cell);
        }
      });
      
      // Append the new row to the table body
      tbody.appendChild(newRow);
      
      // Save the updated content
      const saveContent = () => {
        if (isEditing || isCreating) {
          // In editor mode
          const editorContent = editorRef.current?.querySelector('.ProseMirror') || 
                              editorRef.current?.querySelector('.ql-editor') || 
                              editorRef.current;
          if (editorContent) {
            const updatedContent = editorContent.innerHTML;
            setFormData(prev => ({ ...prev, content: updatedContent }));
          }
        } else if (noteContentRef.current) {
          // In viewer mode
          const updatedContent = noteContentRef.current.innerHTML;
          setFormData(prev => ({ ...prev, content: updatedContent }));
          if (selectedNote) {
            handleSave();
          }
        }
      };
      
      // Small delay to ensure DOM is updated
      setTimeout(saveContent, 100);
    }
    
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null });
  };
  
  const handleDeleteTable = () => {
    if (!tableContextMenu.table) return;
    
    const table = tableContextMenu.table;
    
    console.log('Deleting table:', table);
    
    // Check if table is wrapped in a container
    const wrapper = table.closest('.table-with-copy') || table.closest('.table-wrapper') || table.closest('.tableWrapper');
    const elementToRemove = wrapper || table;
    
    // Remove the table or its wrapper
    if (elementToRemove && elementToRemove.parentNode) {
      elementToRemove.parentNode.removeChild(elementToRemove);
      
      // Force update the editor content
      if (editorRef.current) {
        const editor = editorRef.current.editor || window.editor;
        if (editor && editor.commands) {
          // For TipTap editor
          const editorElement = editorRef.current.querySelector('.ProseMirror');
          if (editorElement) {
            // Get the updated HTML
            const updatedHtml = editorElement.innerHTML;
            // Set it back to trigger update
            editor.commands.setContent(updatedHtml);
          }
        } else {
          // For regular content editable
          const editorContent = editorRef.current.querySelector('.ProseMirror') || 
                              editorRef.current.querySelector('.ql-editor') || 
                              editorRef.current.querySelector('.tiptap-editor') ||
                              editorRef.current.querySelector('.note-content-edit-area') ||
                              editorRef.current;
          
          if (editorContent) {
            // Trigger input event to notify React
            const event = new Event('input', { bubbles: true });
            editorContent.dispatchEvent(event);
            
            // Update form data
            const updatedContent = editorContent.innerHTML;
            setFormData(prev => ({ ...prev, content: updatedContent }));
          }
        }
      }
    }
    
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null, row: null });
  };

  // Delete a specific row from the table
  const handleDeleteTableRow = () => {
    if (!tableContextMenu.table || !tableContextMenu.row) return;
    
    const table = tableContextMenu.table;
    const row = tableContextMenu.row;
    
    console.log('Deleting row:', row);
    
    // Count remaining rows
    const tbody = table.querySelector('tbody') || table;
    const allRows = tbody.querySelectorAll('tr');
    
    // Don't delete if it's the last row
    if (allRows.length <= 1) {
      alert('Cannot delete the last row. Use "Delete Table" instead.');
      setTableContextMenu({ visible: false, x: 0, y: 0, table: null, row: null });
      return;
    }
    
    // Remove the row
    if (row.parentNode) {
      row.parentNode.removeChild(row);
      
      // Force update the editor content
      if (editorRef.current) {
        const editor = editorRef.current.editor || window.editor;
        if (editor && editor.commands) {
          // For TipTap editor
          const editorElement = editorRef.current.querySelector('.ProseMirror');
          if (editorElement) {
            // Get the updated HTML
            const updatedHtml = editorElement.innerHTML;
            // Set it back to trigger update
            editor.commands.setContent(updatedHtml);
          }
        } else {
          // For regular content editable
          const editorContent = editorRef.current.querySelector('.ProseMirror') || 
                              editorRef.current.querySelector('.ql-editor') || 
                              editorRef.current.querySelector('.tiptap-editor') ||
                              editorRef.current.querySelector('.note-content-edit-area') ||
                              editorRef.current;
          
          if (editorContent) {
            // Trigger input event to notify React
            const event = new Event('input', { bubbles: true });
            editorContent.dispatchEvent(event);
            
            // Update form data
            const updatedContent = editorContent.innerHTML;
            setFormData(prev => ({ ...prev, content: updatedContent }));
          }
        }
      }
    }
    
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null, row: null });
  };

  // Copy table content to clipboard
  const handleCopyTable = () => {
    if (!tableContextMenu.table) return;
    
    const table = tableContextMenu.table;
    console.log('Copying table:', table);
    
    try {
      // Convert table to tab-separated text
      const rows = table.querySelectorAll('tr');
      let tabDelimitedText = '';
      
      rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td, th');
        const cellTexts = Array.from(cells).map(cell => {
          return cell.textContent.trim().replace(/\t/g, ' ').replace(/\n/g, ' ');
        });
        
        tabDelimitedText += cellTexts.join('\t');
        if (rowIndex < rows.length - 1) {
          tabDelimitedText += '\n';
        }
      });
      
      // Copy to clipboard
      navigator.clipboard.writeText(tabDelimitedText).then(() => {
        console.log('Table copied to clipboard');
        // Show success feedback
        const originalText = 'Copy Table';
        const successText = 'Copied!';
        
        // Find the copy button and temporarily change its text
        const copyButton = document.querySelector('.table-context-menu .context-menu-item span');
        if (copyButton && copyButton.textContent === originalText) {
          copyButton.textContent = successText;
          setTimeout(() => {
            if (copyButton.textContent === successText) {
              copyButton.textContent = originalText;
            }
          }, 1500);
        }
      }).catch(err => {
        console.error('Failed to copy table: ', err);
        alert('Failed to copy table to clipboard');
      });
      
    } catch (error) {
      console.error('Error copying table:', error);
      alert('Error copying table');
    }
    
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null, row: null });
  };
  
  const handleAddTableColumn = () => {
    if (!tableContextMenu.table) return;
    
    const table = tableContextMenu.table;
    const rows = table.querySelectorAll('tr');
    
    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td, th');
      const lastCell = cells[cells.length - 1];
      
      if (lastCell) {
        // Create new cell with same type (td or th)
        const newCell = document.createElement(lastCell.tagName.toLowerCase());
        newCell.innerHTML = '&nbsp;'; // Add non-breaking space
        newCell.style.padding = lastCell.style.padding || '8px';
        newCell.style.border = lastCell.style.border || '1px solid #ddd';
        
        // Copy other styles if needed
        if (lastCell.tagName === 'TH') {
          newCell.style.fontWeight = lastCell.style.fontWeight || 'bold';
          newCell.style.backgroundColor = lastCell.style.backgroundColor || '#f0f0f0';
        }
        
        row.appendChild(newCell);
      }
    });
    
    // Save the updated content
    const saveContent = () => {
      if (isEditing || isCreating) {
        // In editor mode
        const editorContent = editorRef.current?.querySelector('.ProseMirror') || 
                            editorRef.current?.querySelector('.ql-editor') || 
                            editorRef.current;
        if (editorContent) {
          const updatedContent = editorContent.innerHTML;
          setFormData(prev => ({ ...prev, content: updatedContent }));
        }
      } else if (noteContentRef.current) {
        // In viewer mode
        const updatedContent = noteContentRef.current.innerHTML;
        setFormData(prev => ({ ...prev, content: updatedContent }));
        if (selectedNote) {
          handleSave();
        }
      }
    };
    
    // Small delay to ensure DOM is updated
    setTimeout(saveContent, 100);
    
    setTableContextMenu({ visible: false, x: 0, y: 0, table: null });
  };

  // Render content with HTML support
  const renderContent = (content) => {
    if (!content) return <p className="empty-content">No content</p>;
    
    return (
      <div 
        ref={noteContentRef}
        className="note-content-wrapper"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };

  // Filter notes based on search term
  const filteredNotes = Array.isArray(notes) ? notes.filter(note => {
    const matchesSearch = (note.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (note.content?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) : [];

  // Handle note context menu actions
  const handleEditNoteFromMenu = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      handleSelectNote(note);
      setIsEditing(true);
    }
    setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };

  const handleDeleteNoteFromMenu = async (noteId) => {
    // handleDelete already shows confirmation, so just call it directly
    await handleDelete(noteId);
    setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };

  const handleToggleStarFromMenu = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      await toggleStar(note);
    }
    setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null });
      setContextMenu({ visible: false, x: 0, y: 0, bannerId: null });
      setTableContextMenu({ visible: false, x: 0, y: 0, table: null });
    };

    if (noteContextMenu.visible || contextMenu.visible || tableContextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [noteContextMenu.visible, contextMenu.visible, tableContextMenu.visible]);

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file' && 
            e.dataTransfer.items[i].type.match(/^image\//)) {
          setIsDragging(true);
          break;
        }
      }
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.match(/^image\//)) {
          await uploadImage(file);
        }
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Add a new banner
  const addBanner = async () => {
    if (!newBannerText.trim()) return;
    
    const newBanner = {
      id: Date.now().toString(),
      text: newBannerText.trim(),
      createdAt: new Date(),
      newLine: bannerLineBreak,  // This applies to ALL banner types and colors
      color: isCalloutMode ? 'callout' : isTitleMode ? 'title' : bannerColor,  // 'blue', 'orange', 'green', 'grey', 'title', or 'callout'
      isTitle: isTitleMode,  // Track if this is a title banner
      isCallout: isCalloutMode,  // Track if this is a callout banner
      isDone: bannerColor === 'green' ? false : false  // Track if banner is marked as done (green banners can also use line toggle)
    };
    
    // Insert banner directly into editor content at cursor position instead of separate array
    if (editorRef.current?.editor) {
      const editor = editorRef.current.editor;
      
      // Create banner HTML that will be embedded in the content
      const bannerClass = isCalloutMode ? 'callout-banner' : 
                         isTitleMode ? 'title-banner' : 
                         bannerColor === 'orange' ? 'new-line' : 
                         bannerColor === 'green' ? 'done' : 
                         bannerColor === 'grey' ? 'grey' : 'banner-blue';
      
      const bannerHtml = `<div class="content-banner-item ${bannerClass}" data-banner-id="${newBanner.id}" data-banner-color="${newBanner.color}">
        <span class="banner-text">${newBanner.text}</span>
        <div class="banner-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="m5 5 6 6m4 0 6 6m-6-6 6-6m-6 6-6 6"></path>
          </svg>
        </div>
      </div>`;
      
      // Insert at current cursor position
      editor.chain().focus().insertContent(bannerHtml).run();
    } else {
      // Fallback to old method if editor not available
      const updatedBanners = [...(formData.banners || []), newBanner];
      setFormData({ ...formData, banners: updatedBanners });
    }
    
    // Clear the input after adding banner
    setNewBannerText('');
    setShowBannerInput(false);
    
    // Focus the input field again for quick multiple banner creation
    setTimeout(() => {
      if (bannerInputRef.current) {
        bannerInputRef.current.focus();
      }
    }, 100);
    
    // Auto-save content to Firebase if editing existing note (banner is now part of content)
    if (selectedNote && !isCreating && editorRef.current?.editor) {
      try {
        const noteRef = doc(db, 'notes', selectedNote.id);
        const updatedContent = editorRef.current.editor.getHTML();
        await updateDoc(noteRef, {
          content: updatedContent,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error adding banner:', error);
        alert('Failed to add banner. Please try again.');
      }
    }
  };

  // Remove a banner
  const removeBanner = async (bannerId) => {
    const updatedBanners = formData.banners.filter(banner => banner.id !== bannerId);
    setFormData(prev => ({
      ...prev,
      banners: updatedBanners
    }));
    
    // Auto-save to Firebase if editing existing note
    if (selectedNote && !isCreating) {
      try {
        const noteRef = doc(db, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          banners: updatedBanners,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error removing banner:', error);
        alert('Failed to remove banner. Please try again.');
      }
    }
  };

  // Copy banner text to clipboard
  const copyBannerToClipboard = async (banner) => {
    try {
      await navigator.clipboard.writeText(banner.text);
      setCopiedBannerId(banner.id);
      setTimeout(() => {
        setCopiedBannerId(null);
      }, 1500); // Show purple color for 1.5 seconds
    } catch (err) {
      console.error('Failed to copy text:', err);
      alert('Failed to copy text to clipboard');
    }
  };



  // Handle right-click context menu
  const handleContextMenu = (e, bannerId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      bannerId: bannerId
    });
  };

  // Handle long press for mobile
  const handleTouchStart = (bannerId) => {
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      // Show context menu for mobile
      const banner = formData.banners.find(b => b.id === bannerId);
      if (banner) {
        setContextMenu({
          visible: true,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          bannerId: bannerId
        });
      }
    }, 500); // 500ms for long press
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, bannerId: null });
    };

    if (contextMenu.visible) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [contextMenu.visible]);

  // Start editing a banner
  const startEditingBanner = (bannerId) => {
    const banner = formData.banners.find(b => b.id === bannerId);
    if (banner) {
      setEditingBannerId(bannerId);
      setEditingBannerText(banner.text);
      setContextMenu({ visible: false, x: 0, y: 0, bannerId: null });
    }
  };

  // Save edited banner
  const saveEditedBanner = async (bannerId) => {
    if (editingBannerText.trim()) {
      const updatedBanners = formData.banners.map(banner =>
        banner.id === bannerId ? { ...banner, text: editingBannerText.trim() } : banner
      );
      setFormData(prev => ({ ...prev, banners: updatedBanners }));
      
      // Also update selectedNote to reflect changes immediately in view mode
      if (selectedNote) {
        setSelectedNote(prev => ({
          ...prev,
          banners: updatedBanners
        }));
      }
      
      // Auto-save to Firebase if editing existing note
      if (selectedNote && !isCreating) {
        try {
          const noteRef = doc(db, 'notes', selectedNote.id);
          await updateDoc(noteRef, {
            banners: updatedBanners,
            updatedAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error saving banner edit:', error);
          alert('Failed to save banner edit. Please try again.');
        }
      }
    }
    setEditingBannerId(null);
    setEditingBannerText('');
  };

  // Cancel editing
  const cancelEditingBanner = () => {
    setEditingBannerId(null);
    setEditingBannerText('');
  };

  // Mark banner as done
  const toggleBannerDone = async (bannerId) => {
    const updatedBanners = formData.banners.map(banner =>
      banner.id === bannerId ? { ...banner, isDone: !banner.isDone } : banner
    );
    setFormData(prev => ({ ...prev, banners: updatedBanners }));
    setContextMenu({ visible: false, x: 0, y: 0, bannerId: null });
    
    // Auto-save to Firebase if editing existing note
    if (selectedNote && !isCreating) {
      try {
        const noteRef = doc(db, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          banners: updatedBanners,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error saving banner done status:', error);
        alert('Failed to save banner status. Please try again.');
      }
    }
  };

  // Enterprise text processing for optimal PDF formatting
  const processEnterpriseText = (text, maxWidth, pdf) => {
    // Clean and optimize text for enterprise formatting
    const cleanText = text
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .replace(/\.\s+/g, '. ') // Consistent sentence spacing
      .replace(/,\s+/g, ', ') // Consistent comma spacing
      .replace(/;\s+/g, '; ') // Consistent semicolon spacing
      .replace(/:\s+/g, ': ') // Consistent colon spacing
      .replace(/\?\s+/g, '? ') // Consistent question mark spacing
      .replace(/!\s+/g, '! ') // Consistent exclamation spacing
      .trim();

    // Use intelligent line breaking for better text flow
    const lines = pdf.splitTextToSize(cleanText, maxWidth);
    
    // Post-process lines to avoid orphaned words and improve readability
    const optimizedLines = [];
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // If line ends with a single word that's very short, try to pull it up
      if (i < lines.length - 1 && line.split(' ').length > 1) {
        const words = line.split(' ');
        const lastWord = words[words.length - 1];
        
        // If last word is very short (1-3 chars), consider moving it to next line
        if (lastWord.length <= 3 && lines[i + 1]) {
          const nextLineWords = lines[i + 1].trim().split(' ');
          if (nextLineWords.length <= 3) { // Only if next line is short
            const newCurrentLine = words.slice(0, -1).join(' ');
            const newNextLine = lastWord + ' ' + lines[i + 1].trim();
            
            // Check if the new arrangement fits
            const newCurrentWidth = pdf.getTextWidth(newCurrentLine);
            const newNextWidth = pdf.getTextWidth(newNextLine);
            
            if (newCurrentWidth <= maxWidth && newNextWidth <= maxWidth) {
              optimizedLines.push(newCurrentLine);
              lines[i + 1] = newNextLine; // Update next line
              continue;
            }
          }
        }
      }
      
      optimizedLines.push(line);
    }
    
    return optimizedLines;
  };

  // Enterprise banner rendering for compact PDF format
  const renderBannersInPDF = (pdf, banners, leftMargin, yPosition, contentWidth) => {
    const bannerHeight = 10; // Compact banner height for enterprise format
    const bannerPadding = 2; // Minimal padding inside banner
    const bannerGap = 3; // Reduced gap between banners
    const fontSize = 9; // Smaller font for compact enterprise format
    const lineSpacing = 1; // Minimal space between banner lines
    
    let currentY = yPosition;
    let currentX = leftMargin;
    const maxLineWidth = contentWidth;
    
    // Group banners into lines based on newLine property
    const bannerLines = [];
    let currentLine = [];
    
    banners.forEach((banner, index) => {
      if (banner.newLine && index > 0 && currentLine.length > 0) {
        bannerLines.push(currentLine);
        currentLine = [];
      }
      currentLine.push(banner);
    });
    if (currentLine.length > 0) {
      bannerLines.push(currentLine);
    }
    
    // Render each line of banners
    bannerLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) {
        currentY += bannerHeight + lineSpacing;
      }
      
      currentX = leftMargin;
      
      // Calculate banner widths based on text content
      const bannerWidths = line.map(banner => {
        pdf.setFontSize(fontSize);
        const prefix = banner.isDone ? '✓ ' : '';
        const text = prefix + banner.text;
        const textWidth = pdf.getTextWidth(text);
        return Math.max(textWidth + (bannerPadding * 4), 25); // Minimum 25mm width
      });
      
      // Check if all banners fit on one line
      const totalWidth = bannerWidths.reduce((sum, width) => sum + width, 0) + (bannerGap * (line.length - 1));
      
      if (totalWidth <= maxLineWidth) {
        // All banners fit on one line
        line.forEach((banner, bannerIndex) => {
          const width = bannerWidths[bannerIndex];
          
          // Set banner color
          if (banner.isDone) {
            pdf.setFillColor(0, 255, 136); // Bright green
          } else if (banner.isOrange) {
            pdf.setFillColor(255, 105, 0); // Orange
          } else {
            pdf.setFillColor(59, 130, 246); // Blue
          }
          
          // Draw banner background
          pdf.roundedRect(currentX, currentY, width, bannerHeight, 2, 2, 'F');
          
          // Set text properties
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', 'normal');
          if (banner.isDone) {
            pdf.setTextColor(0, 100, 0); // Dark green text for done banners
          } else {
            pdf.setTextColor(255, 255, 255); // White text
          }
          
          // Add text centered in banner
          const prefix = banner.isDone ? '✓ ' : '';
          const text = prefix + banner.text;
          const textY = currentY + (bannerHeight / 2) + (fontSize / 3);
          pdf.text(text, currentX + bannerPadding * 2, textY);
          
          currentX += width + bannerGap;
        });
      } else {
        // Banners don't fit, scale them down proportionally
        const scaleFactor = maxLineWidth / totalWidth;
        
        line.forEach((banner, bannerIndex) => {
          const width = bannerWidths[bannerIndex] * scaleFactor;
          
          // Set banner color
          if (banner.isDone) {
            pdf.setFillColor(0, 255, 136); // Bright green
          } else if (banner.isOrange) {
            pdf.setFillColor(255, 105, 0); // Orange
          } else {
            pdf.setFillColor(59, 130, 246); // Blue
          }
          
          // Draw banner background
          pdf.roundedRect(currentX, currentY, width, bannerHeight, 2, 2, 'F');
          
          // Set text properties
          pdf.setFontSize(fontSize);
          pdf.setFont('helvetica', 'normal');
          if (banner.isDone) {
            pdf.setTextColor(0, 100, 0); // Dark green text for done banners
          } else {
            pdf.setTextColor(255, 255, 255); // White text
          }
          
          // Add text with intelligent truncation if needed
          const prefix = banner.isDone ? '✓ ' : '';
          let text = prefix + banner.text;
          const maxTextWidth = width - (bannerPadding * 4);
          
          if (pdf.getTextWidth(text) > maxTextWidth) {
            // Truncate text to fit
            while (pdf.getTextWidth(text + '...') > maxTextWidth && text.length > 3) {
              text = text.substring(0, text.length - 1);
            }
            text += '...';
          }
          
          const textY = currentY + (bannerHeight / 2) + (fontSize / 3);
          pdf.text(text, currentX + bannerPadding * 2, textY);
          
          currentX += width + (bannerGap * scaleFactor);
        });
      }
      
      currentY += bannerHeight;
    });
    
    return currentY - yPosition + lineSpacing * 2; // Return total height used
  };

  // Helper function to convert image URL to base64
  const getImageAsBase64 = async (url) => {
    try {
      // Handle Firebase Storage URLs
      if (url.includes('firebasestorage.googleapis.com')) {
        // Firebase URLs can be fetched directly with CORS
        const response = await fetch(url);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else if (url.startsWith('data:') || url.startsWith('blob:')) {
        // Already in correct format
        return url;
      } else {
        // For other URLs, try to fetch
        const response = await fetch(url);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };


  // Export note to PDF
  const exportToPDF = async () => {
    if (!selectedNote && !isCreating) return;
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.innerHTML = '<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 10px; z-index: 9999;">Generating PDF...</div>';
    document.body.appendChild(loadingDiv);
    
    try {
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Load logo image
      const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logoUrl;
    
      // A4 dimensions: 210mm x 297mm - Optimized for maximum content
      const pageWidth = 210;
      const pageHeight = 297;
      // Reduced margins for more content per page
      const leftMargin = 20; // Reduced for more content
      const rightMargin = 20; // Equal to left margin for centering
      const topMargin = 35; // Reduced header space
      const bottomMargin = 20; // Reduced footer space
      const contentWidth = pageWidth - leftMargin - rightMargin; // Maximized content area
      const maxY = pageHeight - bottomMargin;
      
      // Optimized Typography settings for A4
      const titleSize = 14;
      const headingSize = 12;
      const bodySize = 9; // Optimal for readability and space
      const metaSize = 8;
      const lineSpacing = 0.9; // Tighter line spacing for more content
      const paragraphSpacing = 1.0; // Minimal paragraph spacing
      const sectionSpacing = 2; // Compact section spacing
      
      let yPosition = topMargin;
      let pageNumber = 1;
      const totalPages = 1; // Will be updated after content is added
      
      // Logo loading
      logoImg.onload = function() {
        generatePDFContent(true);
      };
      
      logoImg.onerror = function() {
        generatePDFContent(false);
      };
      
      // Function to generate PDF content
      const generatePDFContent = async (withLogo = false) => {
        // Reset variables for fresh generation
        yPosition = topMargin;
        pageNumber = 1;
        
        // Helper function to draw header and footer
        const drawHeaderFooter = (pageNum, hasLogo = withLogo) => {
          // Professional light theme header
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          
          // Compact header section
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 0, pageWidth, 30, 'F');
          
          // Orange accent line
          pdf.setFillColor(255, 85, 0);
          pdf.rect(0, 30, pageWidth, 1, 'F');
          
          // Logo or text fallback
          if (hasLogo && logoImg.complete) {
            // Logo - smaller for compact header
            const logoMaxWidth = 35;
            const logoMaxHeight = 15;
            const imgRatio = logoImg.width / logoImg.height;
            let logoWidth = logoMaxWidth;
            let logoHeight = logoMaxWidth / imgRatio;
            
            if (logoHeight > logoMaxHeight) {
              logoHeight = logoMaxHeight;
              logoWidth = logoMaxHeight * imgRatio;
            }
            
            pdf.addImage(logoImg, 'PNG', leftMargin, 8, logoWidth, logoHeight);
          } else {
            // Fallback to text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.setTextColor(255, 85, 0);
            pdf.text('RX SPRINT', leftMargin, 18);
          }
          
          // Date and note info
          const currentDate = new Date();
          const formattedDate = currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const formattedTime = currentDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(71, 85, 105);
          pdf.text(`${formattedDate} ${formattedTime}`, pageWidth - rightMargin, 12, { align: 'right' });
          pdf.text(`Note: ${formData.title || 'Untitled'}`, pageWidth - rightMargin, 18, { align: 'right' });
          
          // Compact footer
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.line(0, pageHeight - 15, pageWidth, pageHeight - 15);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(100, 116, 139);
          // Only show page number in footer to avoid duplication
          pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        };
        
        // Draw header and footer for first page
        drawHeaderFooter(pageNumber);
        
        // Helper function to add a new page
        const addNewPage = () => {
          // Add new page
          pdf.addPage();
          pageNumber++;
          drawHeaderFooter(pageNumber);
          yPosition = 35; // Start content right after header
          // Reset font to ensure consistency on new page
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(bodySize);
          pdf.setTextColor(0);
        };
    
    // Helper function to check and add new page if needed
    const checkPageBreak = (requiredSpace = bodySize * lineSpacing) => {
      // Ensure we have enough space, considering the footer area
      if (yPosition + requiredSpace > maxY - 15) { // Increased safety margin to prevent footer overlap
        addNewPage();
      }
    };
    
    // Start content below header with appropriate spacing
    yPosition = 35; // Optimized for compact A4 layout
    
    // Reset text formatting with Roboto font
    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(bodySize);
    
    
    // Add banners if any using direct PDF rendering for fast performance
    if (formData.banners && formData.banners.length > 0) {
      const bannerPadding = 3; // Reduced padding for more content
      const bannerGap = 2; // Reduced gap between banners
      const bannerFontSize = 9; // Smaller font to fit more
      const minBannerHeight = 8; // Reduced height for compactness
      
      // Group banners by line breaks - same as editor/viewer
      const bannerGroups = [];
      let currentGroup = [];
      
      formData.banners.forEach((banner, index) => {
        if (banner.newLine && index > 0 && currentGroup.length > 0) {
          bannerGroups.push(currentGroup);
          currentGroup = [];
        }
        currentGroup.push(banner);
      });
      if (currentGroup.length > 0) {
        bannerGroups.push(currentGroup);
      }
      
      // Process each group of banners
      bannerGroups.forEach((group, groupIndex) => {
        // Add spacing between groups
        if (groupIndex > 0) {
          yPosition += 3;
        }
        
        // Initialize currentX for regular banners in this group
        let currentX = leftMargin;
        
        // Track position for regular banners
        let lineHeight = 0;
        
        // Process each banner in the group  
        group.forEach((banner, bannerIndex) => {
          // Handle title banners - full width, break line first
          if (banner.isTitle || banner.color === 'title') {
            // Finish current line if we have regular banners pending
            if (currentX > leftMargin) {
              yPosition += lineHeight + 3;
              currentX = leftMargin;
              lineHeight = 0;
            }
            
            checkPageBreak(12);
            // Title banner with yellowish salmon design matching viewer exactly
            pdf.setFillColor(255, 212, 163); // Yellowish salmon background #FFD4A3
            pdf.roundedRect(leftMargin, yPosition, contentWidth, 12, 2, 2, 'F');
            pdf.setFont('helvetica', 'bold'); // Medium/bold weight to match viewer font-weight: 500
            pdf.setFontSize(8.5); // Slightly larger to match 0.875rem
            pdf.setTextColor(139, 69, 19); // Brown text #8B4513
            const titleText = banner.text.toUpperCase(); // Uppercase to match CSS
            // Perfect vertical centering for jsPDF text baseline
            const titleTextY = yPosition + 7.5; // Center of 12px height banner
            pdf.text(titleText, leftMargin + 6, titleTextY);
            yPosition += 14;
            return;
          }
        
          // Handle callout banners - full width, break line first
          if (banner.isCallout || banner.color === 'callout') {
            // Finish current line if we have regular banners pending
            if (currentX > leftMargin) {
              yPosition += lineHeight + 3;
              currentX = leftMargin;
              lineHeight = 0;
            }
            
            const calloutLines = pdf.splitTextToSize(banner.text, contentWidth - 10);
            const calloutHeight = Math.max(12, calloutLines.length * 4 + 6);
            checkPageBreak(calloutHeight + 4);
            
            // Callout with compact styling
            pdf.setFillColor(250, 250, 250); // Light background
            pdf.setDrawColor(230, 230, 230);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(leftMargin, yPosition, contentWidth, calloutHeight, 2, 2, 'FD');
            
            // Orange left border
            pdf.setFillColor(255, 105, 0);
            pdf.rect(leftMargin, yPosition, 2, calloutHeight, 'F');
            
            // Text - centered vertically in callout
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(66, 66, 66);
            // Calculate starting Y to center text block
            const lineCount = calloutLines.length;
            const textBlockHeight = (lineCount - 1) * 4; // Space between lines
            const startY = yPosition + (calloutHeight - textBlockHeight) / 2 + 2;
            let calloutY = startY;
            calloutLines.forEach(line => {
              pdf.text(line, leftMargin + 6, calloutY);
              calloutY += 4;
            });
            yPosition += calloutHeight + 4;
            return;
          }
        
          // Handle regular banners - inline layout
          const fullText = banner.text;
          pdf.setFontSize(bannerFontSize);
          const textWidth = pdf.getTextWidth(fullText);
          const bannerWidth = Math.max(textWidth + (bannerPadding * 2), 30); // Reduced min width
          const bannerHeight = minBannerHeight;
          
          // Check if banner fits on current line
          if (currentX > leftMargin && currentX + bannerWidth > leftMargin + contentWidth) {
            // Move to next line
            yPosition += lineHeight + 3; // Reduced spacing
            currentX = leftMargin;
            lineHeight = 0;
          }
          
          checkPageBreak(bannerHeight + 3);
          
          // Set banner colors to match viewer exactly
          if (banner.isDone || banner.color === 'green') {
            pdf.setFillColor(232, 245, 233); // Pale green
            pdf.setTextColor(46, 125, 50);
          } else if (banner.color === 'orange' || banner.isOrange) {
            pdf.setFillColor(255, 228, 209); // Pale orange
            pdf.setTextColor(230, 81, 0);
          } else if (banner.color === 'grey') {
            pdf.setFillColor(245, 245, 245); // Grey
            pdf.setTextColor(66, 66, 66);
          } else {
            pdf.setFillColor(227, 242, 253); // Pale blue
            pdf.setTextColor(21, 101, 192);
          }
          
          // Draw banner with rounded corners like viewer
          pdf.roundedRect(currentX, yPosition, bannerWidth, bannerHeight, 2, 2, 'F');
          
          // Add text
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(bannerFontSize);
          
          let displayText = fullText;
          if (pdf.getTextWidth(displayText) > bannerWidth - (bannerPadding * 2)) {
            while (pdf.getTextWidth(displayText + '...') > bannerWidth - (bannerPadding * 2) && displayText.length > 1) {
              displayText = displayText.substring(0, displayText.length - 1);
            }
            displayText += '...';
          }
          
          const textX = currentX + bannerPadding;
          // Perfect vertical centering for jsPDF (baseline positioning)
          const textY = yPosition + 5.5; // Center of 8px height banner
          pdf.text(displayText, textX, textY);
          
          // Update position for next banner
          currentX += bannerWidth + bannerGap;
          lineHeight = Math.max(lineHeight, bannerHeight);
        });
        
        // Finish the line if there are pending regular banners
        if (currentX > leftMargin) {
          yPosition += lineHeight + 3;
        }
      });
      
      // Add minimal spacing after all banners
      yPosition += 4;
      
      // Reset text formatting
      pdf.setTextColor(0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(bodySize);
    }
    
    // Add content with proper spacing
    if (formData.content) {
      // Add additional spacing before content if there were banners
      if (formData.banners && formData.banners.length > 0) {
        yPosition += sectionSpacing * 1.0;
      }
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(bodySize);
      
      // Create a temporary div to parse HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formData.content;
      
      // Process each child element
      const processNode = async (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          // Handle text nodes
          const text = node.textContent.trim();
          if (text) {
            // Ensure consistent helvetica font for all text nodes
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(bodySize);
            pdf.setTextColor(0);
            
            // Center content with proper text formatting
            const maxTextWidth = contentWidth; // Use full content width for better layout
            const optimizedLines = processEnterpriseText(text, maxTextWidth, pdf);
            
            optimizedLines.forEach(line => {
              checkPageBreak(bodySize * lineSpacing + 2);
              pdf.text(line, leftMargin, yPosition);
              yPosition += bodySize * lineSpacing + 1; // Better line spacing
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Handle element nodes
          const tagName = node.tagName.toLowerCase();
          
          if (tagName === 'table') {
            // Handle tables using jspdf-autotable
            try {
              yPosition += paragraphSpacing * 0.5;
              
              // Extract table data
              const headers = [];
              const rows = [];
              
              // Get headers from th elements
              const headerCells = node.querySelectorAll('th');
              if (headerCells.length > 0) {
                headerCells.forEach(th => {
                  headers.push(th.textContent.trim());
                });
              } else {
                // If no th elements, try first row as headers
                const firstRow = node.querySelector('tr');
                if (firstRow) {
                  firstRow.querySelectorAll('td').forEach(td => {
                    headers.push(td.textContent.trim());
                  });
                }
              }
              
              // Get data rows
              const dataRows = node.querySelectorAll('tr');
              const startIndex = (headerCells.length > 0 || headers.length === 0) ? 0 : 1; // Skip first row if used as headers
              
              for (let i = startIndex; i < dataRows.length; i++) {
                const row = [];
                const cells = dataRows[i].querySelectorAll('td');
                // Skip rows that only have th elements (they're headers)
                if (cells.length === 0 && dataRows[i].querySelectorAll('th').length > 0) {
                  continue;
                }
                
                // Get all cells (td or th)
                const allCells = dataRows[i].querySelectorAll('td, th');
                allCells.forEach(cell => {
                  row.push(cell.textContent.trim());
                });
                if (row.length > 0) {
                  rows.push(row);
                }
              }
              
              // Only add table if we have data
              if (headers.length > 0 || rows.length > 0) {
                // Check if table fits on current page
                const estimatedTableHeight = (rows.length + 1) * 10; // Rough estimate
                checkPageBreak(estimatedTableHeight);
                
                // Configure and add the table with same font as banners
                const tableConfig = {
                  head: headers.length > 0 ? [headers] : [],
                  body: rows,
                  startY: yPosition,
                  margin: { left: leftMargin, right: rightMargin },
                  styles: {
                    font: 'helvetica',
                    fontSize: bodySize - 1,
                    cellPadding: 3,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.5,
                  },
                  headStyles: {
                    font: 'helvetica',
                    fillColor: [59, 130, 246],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                  },
                  alternateRowStyles: {
                    fillColor: [245, 245, 245],
                  }
                };
                
                // Add the table
                autoTable(pdf, tableConfig);
                
                // Update yPosition based on where the table ended
                if (pdf.previousAutoTable && pdf.previousAutoTable.finalY) {
                  yPosition = pdf.previousAutoTable.finalY + paragraphSpacing * 0.5;
                } else if (pdf.lastAutoTable && pdf.lastAutoTable.finalY) {
                  yPosition = pdf.lastAutoTable.finalY + paragraphSpacing * 0.5;
                } else {
                  // Fallback if autoTable position is not available
                  yPosition += estimatedTableHeight + paragraphSpacing * 0.5;
                }
              }
            } catch (tableError) {
              console.error('Error processing table:', tableError);
              // Add a placeholder for the table
              pdf.setDrawColor(200);
              pdf.rect(leftMargin, yPosition, contentWidth, 30, 'D');
              pdf.setFontSize(9);
              pdf.setTextColor(200, 0, 0);
              pdf.text('Table could not be rendered', leftMargin + contentWidth / 2, yPosition + 15, { align: 'center' });
              pdf.setTextColor(0);
              pdf.setFontSize(bodySize);
              yPosition += 35;
            }
          } else if (tagName === 'p') {
            // Handle paragraphs with advanced enterprise formatting
            const text = node.textContent.trim();
            if (text) {
              const maxTextWidth = contentWidth - 2; // Maximum text width within content area
              const optimizedLines = processEnterpriseText(text, maxTextWidth, pdf);
              
              optimizedLines.forEach(line => {
                checkPageBreak(bodySize * lineSpacing + 1);
                pdf.text(line, leftMargin, yPosition);
                yPosition += bodySize * lineSpacing + 0.3; // Ultra-compact line spacing
              });
              yPosition += paragraphSpacing; // Minimal paragraph spacing
            } else {
              // Empty paragraph - minimal spacing
              yPosition += bodySize * 0.1;
            }
          } else if (tagName === 'br') {
            // Handle line breaks - ultra-minimal spacing for enterprise format
            yPosition += bodySize * 0.4;
          } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
            // Handle headings
            const text = node.textContent.trim();
            if (text) {
              const fontSize = tagName === 'h1' ? 16 : tagName === 'h2' ? 14 : 12;
              pdf.setFontSize(fontSize);
              pdf.setFont('helvetica', 'bold');
              
              checkPageBreak(fontSize * lineSpacing);
              pdf.text(text, leftMargin, yPosition);
              yPosition += fontSize * lineSpacing + paragraphSpacing * 0.5;
              
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(bodySize);
            }
          } else if (tagName === 'ul' || tagName === 'ol') {
            // Handle lists with proper font and wrapping
            const listItems = node.querySelectorAll('li');
            listItems.forEach((li, index) => {
              // Ensure helvetica font for lists
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(bodySize);
              pdf.setTextColor(0);
              
              const prefix = tagName === 'ul' ? '• ' : `${index + 1}. `;
              const listItemText = li.textContent.trim();
              
              // Calculate indent for wrapped lines
              const prefixWidth = pdf.getTextWidth(prefix);
              const indentX = leftMargin + prefixWidth;
              
              // Enterprise list formatting with advanced text optimization
              const maxTextWidth = contentWidth - prefixWidth - 3; // Maximize text space
              const optimizedLines = processEnterpriseText(listItemText, maxTextWidth, pdf);
              
              optimizedLines.forEach((line, lineIndex) => {
                checkPageBreak(bodySize * lineSpacing + 1);
                if (lineIndex === 0) {
                  // First line with prefix
                  pdf.text(prefix + line, leftMargin, yPosition);
                } else {
                  // Subsequent lines indented
                  pdf.text(line, indentX, yPosition);
                }
                yPosition += bodySize * lineSpacing + 0.3; // Ultra-compact list spacing
              });
            });
            yPosition += paragraphSpacing * 0.5;
          } else if (tagName === 'blockquote') {
            // Handle blockquotes with enterprise formatting
            const text = node.textContent.trim();
            if (text) {
              pdf.setFont('helvetica', 'italic');
              pdf.setTextColor(80); // Slightly darker for better readability
              
              // Advanced blockquote text processing
              const maxTextWidth = contentWidth - 12; // Minimal indentation for enterprise format
              const optimizedLines = processEnterpriseText(text, maxTextWidth, pdf);
              
              optimizedLines.forEach(line => {
                checkPageBreak(bodySize * lineSpacing + 1);
                pdf.text(line, leftMargin + 6, yPosition); // Minimal indentation
                yPosition += bodySize * lineSpacing + 0.3; // Ultra-compact spacing
              });
              yPosition += paragraphSpacing * 0.3; // Minimal blockquote spacing
              
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(0);
            }
          } else if (tagName === 'img') {
            // Handle images
            const src = node.getAttribute('src');
            if (src) {
              try {
                // Add some space before image
                yPosition += paragraphSpacing;
                
                // Calculate image dimensions
                const maxImageWidth = contentWidth;
                const maxImageHeight = 150; // Maximum height in mm
                
                // Default dimensions if not specified
                let imgWidth = maxImageWidth;
                let imgHeight = 100;
                
                // Try to get natural dimensions from attributes
                const naturalWidth = parseInt(node.getAttribute('width')) || 0;
                const naturalHeight = parseInt(node.getAttribute('height')) || 0;
                
                if (naturalWidth && naturalHeight) {
                  const aspectRatio = naturalWidth / naturalHeight;
                  
                  // Scale to fit within max dimensions while maintaining aspect ratio
                  if (naturalWidth > naturalHeight) {
                    imgWidth = Math.min(maxImageWidth, naturalWidth * 0.264583); // Convert px to mm
                    imgHeight = imgWidth / aspectRatio;
                  } else {
                    imgHeight = Math.min(maxImageHeight, naturalHeight * 0.264583);
                    imgWidth = imgHeight * aspectRatio;
                  }
                  
                  // Ensure it fits within bounds
                  if (imgWidth > maxImageWidth) {
                    imgWidth = maxImageWidth;
                    imgHeight = imgWidth / aspectRatio;
                  }
                  if (imgHeight > maxImageHeight) {
                    imgHeight = maxImageHeight;
                    imgWidth = imgHeight * aspectRatio;
                  }
                } else {
                  // Use default size for images without dimensions
                  imgWidth = maxImageWidth * 0.8; // 80% of content width
                  imgHeight = imgWidth * 0.6; // Default aspect ratio
                }
                
                // Check if image fits on current page
                checkPageBreak(imgHeight + paragraphSpacing);
                
                // Center the image
                const imgX = leftMargin + (contentWidth - imgWidth) / 2;
                
                // Add image to PDF
                // Convert Firebase Storage URLs to base64 for embedding
                const base64Image = await getImageAsBase64(src);
                
                if (base64Image) {
                  try {
                    // Determine image type from data URL or default to JPEG
                    let imageType = 'JPEG';
                    if (base64Image.includes('image/png')) {
                      imageType = 'PNG';
                    } else if (base64Image.includes('image/gif')) {
                      imageType = 'GIF';
                    } else if (base64Image.includes('image/webp')) {
                      imageType = 'WEBP';
                    }
                    
                    // Add the image to PDF
                    pdf.addImage(base64Image, imageType, imgX, yPosition, imgWidth, imgHeight);
                  } catch (imgError) {
                    console.error('Error adding image to PDF:', imgError);
                    // Fallback to placeholder if image fails
                    pdf.setDrawColor(200);
                    pdf.setFillColor(245, 245, 245);
                    pdf.rect(imgX, yPosition, imgWidth, imgHeight, 'FD');
                    
                    pdf.setFontSize(9);
                    pdf.setTextColor(100);
                    pdf.text('Image could not be loaded', imgX + imgWidth / 2, yPosition + imgHeight / 2, { align: 'center' });
                    pdf.setTextColor(0);
                    pdf.setFontSize(bodySize);
                  }
                } else {
                  // If image couldn't be fetched, show placeholder
                  pdf.setDrawColor(200);
                  pdf.setFillColor(245, 245, 245);
                  pdf.rect(imgX, yPosition, imgWidth, imgHeight, 'FD');
                  
                  pdf.setFontSize(9);
                  pdf.setTextColor(100);
                  const placeholderText = 'Image unavailable';
                  pdf.text(placeholderText, imgX + imgWidth / 2, yPosition + imgHeight / 2, { align: 'center' });
                  pdf.setTextColor(0);
                  pdf.setFontSize(bodySize);
                }
                
                yPosition += imgHeight + paragraphSpacing * 0.5;
              } catch (error) {
                console.error('Error adding image to PDF:', error);
                // Add error placeholder
                pdf.setDrawColor(200);
                pdf.rect(leftMargin, yPosition, contentWidth, 30, 'D');
                pdf.setFontSize(9);
                pdf.setTextColor(200, 0, 0);
                pdf.text('Error loading image', leftMargin + contentWidth / 2, yPosition + 15, { align: 'center' });
                pdf.setTextColor(0);
                pdf.setFontSize(bodySize);
                yPosition += 30 + paragraphSpacing * 0.5;
              }
            }
          } else if (tagName === 'div' && node.className && node.className.includes('tableWrapper')) {
            // Handle table wrapper divs
            const table = node.querySelector('table');
            if (table) {
              await processNode(table);
            }
          } else {
            // For other elements, ensure font is set and process their children
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(bodySize);
            pdf.setTextColor(0);
            
            for (const child of Array.from(node.childNodes)) {
              await processNode(child);
            }
          }
        }
      };
      
      // Process all child nodes of the content
      for (const child of Array.from(tempDiv.childNodes)) {
        await processNode(child);
      }
        }
        
        // Update all page footers with total page count
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          // Cover the old page number with footer background color
          pdf.setFillColor(248, 250, 252);
          pdf.rect(pageWidth / 2 - 30, pageHeight - 12, 60, 8, 'F');
          // Add updated page number centered
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
        
        // Save the PDF
        const filename = `RX-Sprint-Note-${formData.title || 'note'}_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(filename);
      };
      
      // Start loading the image, which will trigger PDF generation
      // If logo fails to load, the onerror handler will still generate PDF without logo
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.message, error.stack);
      alert(`Failed to generate PDF: ${error.message}. Please check the console for details.`);
    } finally {
      // Remove loading indicator
      if (loadingDiv && loadingDiv.parentNode) {
        loadingDiv.parentNode.removeChild(loadingDiv);
      }
    }
  };


  return (
    <div className={`notes-page page-container ${(isEditing || isCreating) ? 'editing-mode' : ''}`}>
      {/* Header */}
      {/* Dynamic Header - Shows toggle buttons or note info */}
      <div className="notes-dynamic-header">
        {(selectedNote || isCreating) ? (
          /* Note Header - Compact Version */
          <div className="note-header-compact">
            <div className="note-header-left">
              <button 
                className="back-to-notes-btn"
                onClick={() => {
                  setSelectedNote(null);
                  setIsCreating(false);
                  setIsEditing(false);
                  setFormData({ title: '', content: '', starred: false, images: [], banners: [] });
                  setHasUserInteracted(true); // Mark as user interaction
                  // Clear navigation state to fix button click issue after search navigation
                  navigate('/notes', { replace: true });
                }}
                title="Back to All Notes"
              >
                <FileText size={18} />
              </button>
              {isEditing || isCreating ? (
                <input
                  type="text"
                  className="note-title-input-compact"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Note title..."
                  autoFocus
                />
              ) : (
                <div className="note-title-display">
                  <h1>{formData.title || 'Untitled'}</h1>
                  {selectedNote && (
                    <span className="note-meta-inline">
                      <Clock size={12} />
                      {formatDate(selectedNote.updatedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="note-header-actions">
              {isEditing || isCreating ? (
                <>
                  <button className="action-btn-compact" onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    if (isCreating) {
                      setSelectedNote(null);
                      setFormData({ title: '', content: '', starred: false, images: [], banners: [] });
                    } else {
                      setFormData({
                        title: selectedNote?.title || '',
                        content: selectedNote?.content || '',
                        starred: selectedNote?.starred || false,
                        images: selectedNote?.images || [],
                        banners: selectedNote?.banners || []
                      });
                    }
                  }}>
                    <X size={16} />
                    <span>Cancel</span>
                  </button>
                  <button className="action-btn-compact primary" onClick={handleSave}>
                    <Save size={16} />
                    <span>Save</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`star-btn-compact ${formData.starred ? 'starred' : ''}`}
                    onClick={(e) => selectedNote && toggleStar(selectedNote, e)}
                    title={formData.starred ? 'Remove star' : 'Add star'}
                  >
                    <Star size={18} fill={formData.starred ? 'currentColor' : 'none'} />
                  </button>
                  <button className="action-btn-compact" onClick={exportToPDF} title="Export as PDF">
                    <Download size={16} />
                    <span>Export PDF</span>
                  </button>
                  <button className="action-btn-compact" onClick={() => setIsEditing(true)}>
                    <FileText size={16} />
                    <span>Edit</span>
                  </button>
                  <button className="action-btn-compact danger" onClick={() => handleDelete()}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Enterprise Header - When no note is selected */
          <EnterpriseHeader>
            <div className="notes-header-content">
              <div className="notes-header-left">
                <div className="notes-header-title">
                  <h2>All Notes</h2>
                  <span className="notes-count-badge">{filteredNotes.length}</span>
                </div>
                <div className="notes-header-search">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="notes-header-search-input"
                  />
                </div>
              </div>
              <ActionGroup>
                <ActionButton
                  onClick={handleCreateNote}
                  icon={Plus}
                >
                  New Note
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setIsCreating(true);
                    setIsEditing(true);
                    setSelectedNote(null);
                    setFormData({
                      title: 'New Note',
                      content: '',
                      starred: false,
                      images: [],
                      banners: []
                    });
                    // Reset line tracking for new note
                    setCurrentLineNumber(0);
                    setBannerLineBreak(false);
                    setBannerColor('blue');
                    setIsTitleMode(false);
                    setIsCalloutMode(false);
                    // Activate banner field after creating note
                    setTimeout(() => {
                      if (bannerInputRef.current) {
                        bannerInputRef.current.focus();
                      }
                    }, 100);
                  }}
                  icon={Tag}
                  secondary
                >
                  Add Banner
                </ActionButton>
              </ActionGroup>
            </div>
          </EnterpriseHeader>
        )}
      </div>

      <div className="notes-layout">
        {/* Main content area */}
        <div className="notes-content">
          {selectedNote || isCreating ? (
            <>
              <div 
                className={`note-editor ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isEditing || isCreating ? (
                  <>
                    {/* Add Banner Controls - Exactly Like Header */}
                    <div className="editor-banner-controls-container">
                      <div className="banner-controls-single-row">
                        {/* Search-style input wrapper matching header */}
                        <div className="banner-input-search-style">
                          <div className="banner-input-icon-btn">
                            <Tag size={18} />
                          </div>
                          <input
                            ref={bannerInputRef}
                            type="text"
                            className="banner-input-redesign"
                            placeholder={isCalloutMode ? "Enter callout text..." : isTitleMode ? "Enter title text..." : "Enter banner text..."}
                            value={newBannerText}
                            onChange={(e) => setNewBannerText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newBannerText.trim()) {
                                e.preventDefault();
                                addBanner();
                              }
                            }}
                            autoFocus={false}
                          />
                        </div>
                        
                        {/* Right section with buttons - matches header actions */}
                        <div className="banner-button-group">
                          {/* Mode buttons */}
                          <button
                            className={`filter-style-btn ${!isTitleMode && !isCalloutMode ? 'active' : ''}`}
                            onClick={() => {
                              if (newBannerText.trim()) {
                                addBanner();
                              } else {
                                setIsTitleMode(false);
                                setIsCalloutMode(false);
                              }
                            }}
                            title="Add Banner"
                          >
                            <Tag size={14} />
                            <span>Banner</span>
                          </button>
                          
                          <button
                            className={`filter-style-btn ${isTitleMode ? 'active' : ''}`}
                            onClick={() => {
                              setIsTitleMode(!isTitleMode);
                              setIsCalloutMode(false);
                            }}
                            title="Title Mode"
                          >
                            <Type size={14} />
                            <span>Title</span>
                          </button>
                          
                          <button
                            className={`filter-style-btn ${isCalloutMode ? 'active' : ''}`}
                            onClick={() => {
                              setIsCalloutMode(!isCalloutMode);
                              setIsTitleMode(false);
                            }}
                            title="Callout Mode"
                          >
                            <MessageSquare size={14} />
                            <span>Callout</span>
                          </button>
                          
                          {/* Line toggle */}
                          <button
                            className={`line-toggle-btn ${bannerLineBreak ? 'active' : ''}`}
                            onClick={() => setBannerLineBreak(!bannerLineBreak)}
                            title={bannerLineBreak ? "New line" : "Same line"}
                          >
                            <span className="line-toggle-icon">{bannerLineBreak ? "↵" : "→"}</span>
                            <span>{bannerLineBreak ? "New" : "Same"}</span>
                          </button>
                          
                          {/* Color selectors - only for regular banners */}
                          {!isTitleMode && !isCalloutMode && (
                            <div className="color-selector-group">
                              <button
                                className={`color-circle-btn blue ${bannerColor === 'blue' ? 'active' : ''}`}
                                onClick={() => setBannerColor('blue')}
                                title="Blue"
                                aria-label="Blue color"
                              />
                              <button
                                className={`color-circle-btn orange ${bannerColor === 'orange' ? 'active' : ''}`}
                                onClick={() => setBannerColor('orange')}
                                title="Orange"
                                aria-label="Orange color"
                              />
                              <button
                                className={`color-circle-btn green ${bannerColor === 'green' ? 'active' : ''}`}
                                onClick={() => setBannerColor('green')}
                                title="Green"
                                aria-label="Green color"
                              />
                              <button
                                className={`color-circle-btn grey ${bannerColor === 'grey' ? 'active' : ''}`}
                                onClick={() => setBannerColor('grey')}
                                title="Grey"
                                aria-label="Grey color"
                              />
                            </div>
                          )}
                          
                          {/* Submit button - far right */}
                          <button
                            className="banner-submit-btn"
                            onClick={() => {
                              if (newBannerText.trim()) {
                                addBanner();
                              }
                            }}
                            disabled={!newBannerText.trim()}
                            title="Submit (Enter)"
                          >
                            <Plus size={16} />
                            <span>Submit</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="note-content-edit-area">
                      {/* Display banners in content area during edit mode - identical to viewer */}
                      {formData.banners && formData.banners.length > 0 && (
                        <div className="content-banners-container edit-mode">
                          {(() => {
                            // Group banners by line breaks
                            const bannerGroups = [];
                            let currentGroup = [];
                            
                            formData.banners.forEach((banner, index) => {
                              if (banner.newLine && index > 0 && currentGroup.length > 0) {
                                bannerGroups.push(currentGroup);
                                currentGroup = [];
                              }
                              currentGroup.push(banner);
                            });
                            if (currentGroup.length > 0) {
                              bannerGroups.push(currentGroup);
                            }
                            
                            return bannerGroups.map((group, groupIndex) => (
                              <div key={`group-${groupIndex}`} className="banner-line-wrapper">
                                {group.map((banner) => (
                                  <React.Fragment key={banner.id}>
                                    {editingBannerId === banner.id ? (
                                      <div className="banner-edit-wrapper">
                                        <input
                                          type="text"
                                          className="banner-edit-input"
                                          value={editingBannerText}
                                          onChange={(e) => setEditingBannerText(e.target.value)}
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              saveEditedBanner(banner.id);
                                            }
                                          }}
                                          autoFocus
                                        />
                                        <button
                                          className="banner-edit-btn save"
                                          onClick={() => saveEditedBanner(banner.id)}
                                          title="Save"
                                        >
                                          <Check size={16} />
                                        </button>
                                        <button
                                          className="banner-edit-btn cancel"
                                          onClick={cancelEditingBanner}
                                          title="Cancel"
                                        >
                                          <X size={16} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div 
                                        className={`content-banner-item ${
                                          banner.isCallout || banner.color === 'callout' ? 'callout-banner' :
                                          banner.isTitle || banner.color === 'title' ? 'title-banner' :
                                          banner.color === 'orange' || banner.isOrange ? 'new-line' : 
                                          banner.color === 'green' ? 'done' : 
                                          banner.color === 'grey' ? 'grey' : ''
                                        } ${banner.isDone ? 'done' : ''}`}
                                        onContextMenu={(e) => handleContextMenu(e, banner.id)}
                                      >
                                        <span className="banner-text">{banner.text}</span>
                                      </div>
                                    )}
                                  </React.Fragment>
                                ))}
                              </div>
                            ));
                          })()}
                        </div>
                      )}


                      
                      <RichTextEditor
                        ref={editorRef}
                        value={formData.content}
                        onChange={(content) => {
                          setFormData({ ...formData, content });
                        }}
                        placeholder="Start typing your note or paste Excel data..."
                        onImageUpload={uploadImage}
                        hideToolbar={true}
                      />
                    </div>
                    {uploadingImage && (
                      <div className="upload-indicator">
                        <div className="spinner" />
                        <span>Uploading image...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="note-content">
                    {/* Display banners in the content area when viewing */}
                    {getCurrentBanners().length > 0 && (
                      <div className="content-banners-container">
                        {(() => {
                          // Group banners by line breaks - same as editor
                          const bannerGroups = [];
                          let currentGroup = [];
                          
                          getCurrentBanners().forEach((banner, index) => {
                            if (banner.newLine && index > 0 && currentGroup.length > 0) {
                              bannerGroups.push(currentGroup);
                              currentGroup = [];
                            }
                            currentGroup.push(banner);
                          });
                          if (currentGroup.length > 0) {
                            bannerGroups.push(currentGroup);
                          }
                          
                          return bannerGroups.map((group, groupIndex) => (
                            <div key={`group-${groupIndex}`} className="banner-line-wrapper">
                              {group.map((banner) => (
                                <React.Fragment key={banner.id}>
                            {editingBannerId === banner.id ? (
                              <div className="banner-edit-wrapper">
                                <input
                                  type="text"
                                  className="banner-edit-input"
                                  value={editingBannerText}
                                  onChange={(e) => setEditingBannerText(e.target.value)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      saveEditedBanner(banner.id);
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  className="banner-edit-btn save"
                                  onClick={() => saveEditedBanner(banner.id)}
                                  title="Save"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  className="banner-edit-btn cancel"
                                  onClick={cancelEditingBanner}
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : (
                              <div 
                                className={`content-banner-item ${
                                  banner.isCallout || banner.color === 'callout' ? 'callout-banner' :
                                  banner.isTitle || banner.color === 'title' ? 'title-banner' :
                                  banner.color === 'orange' || banner.isOrange ? 'new-line' : 
                                  banner.color === 'green' ? 'done' : 
                                  banner.color === 'grey' ? 'grey' : ''
                                } ${banner.isDone ? 'done' : ''} ${copiedBannerId === banner.id ? 'copied' : ''}`}
                                onClick={() => !isLongPress && !banner.isTitle && !banner.isCallout && copyBannerToClipboard(banner)}
                                onContextMenu={(e) => handleContextMenu(e, banner.id)}
                                onTouchStart={() => handleTouchStart(banner.id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchMove}
                                title="Click to copy, right-click for options"
                              >
                                <span className="banner-text">{banner.text}</span>
                                <div className="banner-icon">
                                  {copiedBannerId === banner.id ? (
                                    <Check size={18} className="copied-icon" />
                                  ) : banner.isDone ? (
                                    <CheckCircle size={18} className="done-icon" />
                                  ) : (
                                    <Copy size={18} className="copy-icon" />
                                  )}
                                </div>
                              </div>
                            )}
                                </React.Fragment>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                    
                    
                    {renderContent(selectedNote?.content)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="notes-main-list">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading notes...</p>
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="notes-grid-layout">
                  {filteredNotes.map((note, index) => {
                    
                    // Extract plain text from HTML content for preview
                    const getPlainTextPreview = (htmlContent) => {
                      if (!htmlContent) return '';
                      const temp = document.createElement('div');
                      temp.innerHTML = htmlContent;
                      const text = temp.textContent || temp.innerText || '';
                      return text.substring(0, 150) + (text.length > 150 ? '...' : '');
                    };
                    
                    const contentPreview = getPlainTextPreview(note.content);
                    
                    return (
                      <div
                        key={note.id}
                        className="modern-note-card enterprise-card"
                        onClick={() => handleSelectNote(note)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setNoteContextMenu({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            noteId: note.id
                          });
                        }}
                        onTouchStart={(e) => {
                          noteLongPressTimer.current = setTimeout(() => {
                            e.preventDefault();
                            const touch = e.touches[0];
                            setNoteContextMenu({
                              visible: true,
                              x: touch.clientX,
                              y: touch.clientY,
                              noteId: note.id
                            });
                          }, 500);
                        }}
                        onTouchEnd={() => {
                          if (noteLongPressTimer.current) {
                            clearTimeout(noteLongPressTimer.current);
                          }
                        }}
                        onTouchMove={() => {
                          if (noteLongPressTimer.current) {
                            clearTimeout(noteLongPressTimer.current);
                          }
                        }}
                      >
                        <h3 className="modern-note-title">{note.title || 'Untitled'}</h3>
                        <div className="banner-content">
                          {/* Show banner pills if note has banners */}
                          {note.banners && note.banners.length > 0 && (
                            <div className="card-banner-preview">
                              {note.banners
                                .filter(banner => !banner.isTitle && banner.color !== 'title' && !banner.isCallout && banner.color !== 'callout')
                                .slice(0, 3)
                                .map((banner, idx) => (
                                  <span 
                                    key={idx} 
                                    className={`card-banner-pill ${
                                      banner.color === 'orange' || banner.isOrange ? 'orange' : 
                                      banner.color === 'green' ? 'done' : 
                                      banner.color === 'grey' ? 'grey' : ''
                                    } ${banner.isDone ? 'done' : ''}`}
                                  >
                                    {banner.text}
                                  </span>
                                ))}
                              {note.banners.length > 3 && (
                                <span className="card-banner-pill">+{note.banners.length - 3} more</span>
                              )}
                            </div>
                          )}
                          {contentPreview && (
                            <p className="modern-note-preview">{contentPreview}</p>
                          )}
                        </div>
                        <div className="modern-note-footer">
                          <span className="modern-note-date">
                            {formatDate(note.updatedAt)}
                          </span>
                          {note.images && note.images.length > 0 && (
                            <ImageIcon size={14} className="modern-note-icon" />
                          )}
                          {note.starred && (
                            <div className="modern-note-star">
                              <Star size={16} fill="currentColor" />
                            </div>
                          )}
                          <ChevronRight size={20} className="banner-chevron" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-notes-state">
                  <FileText size={48} />
                  <h3>No notes found</h3>
                  <p>{searchTerm ? 'Try a different search term' : 'Create your first note to get started'}</p>
                  {!searchTerm && (
                    <button className="action-btn primary" onClick={handleCreateNote}>
                      <Plus size={18} />
                      Create New Note
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>


      {/* Context Menu */}
      {contextMenu.visible && ReactDOM.createPortal(
        <div 
          className="banner-context-menu"
          style={{ 
            position: 'fixed',
            left: contextMenu.x, 
            top: contextMenu.y,
            zIndex: 2147483648
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={() => startEditingBanner(contextMenu.bannerId)}
          >
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
          <button
            className="context-menu-item"
            onClick={() => toggleBannerDone(contextMenu.bannerId)}
          >
            <CheckCircle size={16} />
            <span>
              {formData.banners.find(b => b.id === contextMenu.bannerId)?.isDone ? 'Mark as Undone' : 'Mark as Done'}
            </span>
          </button>
          <button
            className="context-menu-item delete"
            onClick={() => {
              removeBanner(contextMenu.bannerId);
              setContextMenu({ visible: false, x: 0, y: 0, bannerId: null });
            }}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}

      {/* Note Card Context Menu */}
      {noteContextMenu.visible && ReactDOM.createPortal(
        <div 
          className="note-context-menu"
          style={{ 
            position: 'fixed',
            left: noteContextMenu.x, 
            top: noteContextMenu.y,
            zIndex: 2147483648
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`context-menu-item ${notes.find(n => n.id === noteContextMenu.noteId)?.starred ? 'favorite' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const note = notes.find(n => n.id === noteContextMenu.noteId);
              handleToggleStarFromMenu(noteContextMenu.noteId);
            }}
          >
            <Star size={16} fill={notes.find(n => n.id === noteContextMenu.noteId)?.starred ? 'currentColor' : 'none'} />
            <span>{notes.find(n => n.id === noteContextMenu.noteId)?.starred ? 'Unfavorite' : 'Favorite'}</span>
          </button>
          <button
            className="context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              handleEditNoteFromMenu(noteContextMenu.noteId);
            }}
          >
            <Edit3 size={16} />
            <span>Edit</span>
          </button>
          <button
            className="context-menu-item delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteNoteFromMenu(noteContextMenu.noteId);
            }}
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}

      {/* Table Context Menu */}
      {tableContextMenu.visible && ReactDOM.createPortal(
        <div 
          className="table-context-menu"
          style={{ 
            position: 'fixed',
            left: tableContextMenu.x, 
            top: tableContextMenu.y,
            zIndex: 2147483648
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="context-menu-item"
            onClick={handleCopyTable}
          >
            <Copy size={16} />
            <span>Copy Table</span>
          </button>
          <button
            className="context-menu-item"
            onClick={handleEditTable}
          >
            <Edit3 size={16} />
            <span>Edit Table</span>
          </button>
          <button
            className="context-menu-item"
            onClick={handleAddTableRow}
          >
            <Plus size={16} />
            <span>Add Row</span>
          </button>
          <button
            className="context-menu-item"
            onClick={handleAddTableColumn}
          >
            <Plus size={16} />
            <span>Add Column</span>
          </button>
          <div className="context-menu-divider"></div>
          {tableContextMenu.row && (
            <button
              className="context-menu-item delete"
              onClick={handleDeleteTableRow}
            >
              <Trash2 size={16} />
              <span>Delete Row</span>
            </button>
          )}
          <button
            className="context-menu-item delete"
            onClick={handleDeleteTable}
          >
            <Trash2 size={16} />
            <span>Delete Table</span>
          </button>
        </div>,
        document.body
      )}
      {/* Delete Confirmation Popup */}
      <NoteDeleteConfirmPopup
        isOpen={showDeletePopup}
        noteTitle={noteToDelete?.title || 'this note'}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
      
      {/* Inline Table Editors for Edit Mode */}
      {inlineTableEditors.map(editor => {
        const container = document.getElementById(editor.containerId);
        if (!container) return null;
        
        return ReactDOM.createPortal(
          <InlineTableEditor
            key={editor.id}
            tableElement={editor.tableElement}
            onUpdate={(htmlContent) => {
              // Update the content when table is edited
              container.dataset.updatedHtml = htmlContent;
            }}
          />,
          container
        );
      })}

    </div>
  );
};

export default Notes;