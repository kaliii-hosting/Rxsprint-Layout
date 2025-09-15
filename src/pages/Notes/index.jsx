import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Trash2, Save, X, Calendar, Clock, FileText, Star, Image as ImageIcon, Tag, Copy, Check, Edit3, CheckCircle, Download, ChevronRight, Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, Heading3, Code, Strikethrough, Undo, Redo, Type, MessageSquare, Table, TableProperties, RowsIcon, ColumnsIcon, GripVertical, GripHorizontal, AlertCircle, Shield, Info, Sparkles, ScanLine, Zap, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { firestore as db, storage, auth } from '../../config/firebase';
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
// import LexicalEditor from '../../components/LexicalEditor/LexicalEditor';
// import SimpleLexicalEditor from '../../components/SimpleLexicalEditor/SimpleLexicalEditor';
// import BasicLexicalEditor from '../../components/BasicLexicalEditor/BasicLexicalEditor';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Notes.css';
import './NotesResponsiveFix.css';
import './NotesToolbar.css';
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
import './EditorPaddingFix.css';
import './NotesTableStyles.css'; // Excel table styles with padding and text wrapping
import './StreamlinedLayout.css'; // Streamlined layout fixes for spacing and scrolling
import './LexicalIntegration.css'; // Lexical editor integration styles
import './BannerMultilineSupport.css'; // Multi-line text support for banners
import './NotesListResponsive.css'; // Responsive styles for horizontal banner notes list
import './NotesTableResponsive.css'; // Responsive styles for table view notes list
// CRITICAL: BannerVibrantColors.css must be imported LAST to override all other styles
// This file contains the EXACT banner designs from commit 76d2eae
import './BannerVibrantColors.css';
import NoteDeleteConfirmPopup from '../../components/NoteDeleteConfirmPopup/NoteDeleteConfirmPopup';
import AddConfirmPopup from '../../components/AddConfirmPopup/AddConfirmPopup';
import NoteEditConfirmPopup from '../../components/NoteEditConfirmPopup/NoteEditConfirmPopup';
import InlineTableEditor from '../../components/InlineTableEditor/InlineTableEditor';

const Notes = () => {
  const { theme } = useTheme();
  const [isLoadingBanners, setIsLoadingBanners] = useState(false);
  
  // Add keyframe animations for banner glow effects
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes neonGlow {
        from {
          box-shadow: 0 4px 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2);
        }
        to {
          box-shadow: 0 4px 30px rgba(0, 255, 136, 0.6), 0 0 60px rgba(0, 255, 136, 0.3);
        }
      }
      
      @keyframes purpleGlow {
        0% {
          transform: scale(1);
          box-shadow: 0 4px 12px rgba(147, 51, 234, 0.25);
        }
        50% {
          transform: scale(1.02);
          box-shadow: 0 6px 25px rgba(147, 51, 234, 0.5), 0 0 40px rgba(147, 51, 234, 0.3);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 4px 20px rgba(147, 51, 234, 0.4), 0 0 30px rgba(147, 51, 234, 0.2);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const location = useLocation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);  // Start with true to prevent 'not found' message
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
  
  // Add confirmation state
  const [showAddPopup, setShowAddPopup] = useState(false);
  
  // Banner add confirmation state
  const [showAddBannerPopup, setShowAddBannerPopup] = useState(false);
  
  // Edit confirmation state
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [noteToEdit, setNoteToEdit] = useState(null);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop'); // For responsive toolbar

  // Handle window resize for responsive toolbar
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceMode('mobile');
      } else if (width < 1024) {
        setDeviceMode('tablet');
      } else {
        setDeviceMode('desktop');
      }
    };
    
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

          // Data loaded - hide loading immediately
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
    // Show the add confirmation popup first
    setShowAddPopup(true);
  };

  // Handle confirmation from AddConfirmPopup
  const handleAddConfirm = () => {
    setShowAddPopup(false);
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

  const handleCreateBanner = () => {
    if (!newBannerText.trim()) return;
    // Show the banner add confirmation popup first
    setShowAddBannerPopup(true);
  };

  // Handle in-editor banner creation - NO passcode protection
  const handleCreateBannerDirectly = () => {
    if (!newBannerText.trim()) return;
    // Directly add the banner without passcode popup
    addBannerDirectly();
  };

  // Handle toolbar "Add Banner" button - creates new note and shows passcode popup
  const handleToolbarAddBanner = () => {
    // Show the banner add confirmation popup first
    setShowAddBannerPopup(true);
  };

  // Handle confirmation from AddConfirmPopup for banners
  const handleAddBannerConfirm = () => {
    setShowAddBannerPopup(false);
    
    // Check if we need to create a new note (toolbar button) or just add banner (in-editor)
    if (!selectedNote && !isCreating) {
      // Toolbar "Add Banner" button - create new note first
      handleToolbarAddBannerDirectly();
    } else {
      // In-editor banner creation - just add the banner
      addBannerDirectly();
    }
  };

  // Create new note and focus banner input (after passcode confirmation)
  const handleToolbarAddBannerDirectly = () => {
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
      const editorContainer = editorRef.current?.container || editorRef.current;
      const editorContent = (editorContainer?.querySelector ? editorContainer.querySelector('.ProseMirror') : null) || 
                          (editorContainer?.querySelector ? editorContainer.querySelector('.ql-editor') : null) || 
                          null;
      
      if (editorContent && editorContent.cloneNode) {
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
      } else if (editorRef.current?.editor) {
        // If we have a TipTap editor instance, get HTML directly from it
        finalContent = editorRef.current.editor.getHTML();
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
    console.log('=== IMAGE UPLOAD START ===');
    console.log('File:', file);
    console.log('Is Screenshot:', isScreenshot);
    console.log('File type:', file.type);
    console.log('File size:', file.size);

    setUploadingImage(true);

    // For screenshots and small images, convert directly to base64
    // This avoids Firebase permission issues
    if (isScreenshot || file.size < 5000000) { // Less than 5MB
      try {
        console.log('Converting image to base64 directly (avoiding Firebase)...');
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        console.log('Base64 conversion successful, length:', base64.length);
        console.log('=== IMAGE UPLOAD COMPLETE (base64) ===');

        // Still update the images array for reference
        const newImages = [...(formData.images || []), base64];
        setFormData(prev => ({ ...prev, images: newImages }));

        setUploadingImage(false);
        return base64;
      } catch (error) {
        console.error('Error converting to base64:', error);
        setUploadingImage(false);
        alert('Failed to process image');
        return null;
      }
    }

    // For larger files, still try Firebase
    if (!storage) {
      console.error('Storage service not available for large file');
      alert('Storage service not available');
      setUploadingImage(false);
      return null;
    }

    try {
      // Create a unique filename with simpler approach
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.type?.split('/')[1] || 'png';
      const baseName = isScreenshot ? 'screenshot' : (file.name?.split('.')[0] || 'image');
      const fileName = `notes/${timestamp}-${randomStr}-${baseName}.${fileExtension}`;
      
      console.log('Uploading file:', fileName, 'Type:', file.type, 'Size:', file.size);
      
      // Set metadata for better organization
      const metadata = {
        contentType: file.type || 'image/png',
        cacheControl: 'public, max-age=3600',
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          isScreenshot: isScreenshot.toString()
        }
      };
      
      // Upload to Firebase Storage with metadata
      const storageRef = ref(storage, fileName);
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('Upload successful!');
      console.log('Download URL:', downloadURL);

      // Also store image URL in images array for reference
      const newImages = [...(formData.images || []), downloadURL];
      setFormData(prev => ({ ...prev, images: newImages }));

      console.log('Updated images array:', newImages);
      console.log('=== IMAGE UPLOAD COMPLETE ===');

      // Don't auto-save - just update the content without closing the editor
      // The user can save manually when they're done editing

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
        try {
          const editorContainer = editorRef.current?.container || editorRef.current;
          
          // Only proceed if we have a valid container with querySelector
          if (!editorContainer || typeof editorContainer.querySelector !== 'function') {
            setTimeout(setupEditors, 200);
            return;
          }
          
          const editorContent = editorContainer.querySelector('.ProseMirror') || 
                              editorContainer.querySelector('.ql-editor') || 
                              editorContainer.querySelector('.tiptap-editor');
          
          // Ensure editorContent is a valid DOM element
          if (!editorContent || typeof editorContent.querySelectorAll !== 'function') {
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
        } catch (error) {
          console.error('Error setting up table editors:', error);
          // Retry after a delay if there was an error
          setTimeout(setupEditors, 500);
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
      // Store the table context for later
      const tableToEdit = tableContextMenu.table;
      setNoteToEdit(selectedNote);
      setShowEditPopup(true);
      // We'll handle the table editing after password confirmation
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
        const editor = editorRef.current?.editor || window.editor;
        if (editor && editor.commands) {
          // For TipTap editor
          const editorContainer = editorRef.current?.container || editorRef.current;
          const editorElement = editorContainer?.querySelector ? editorContainer.querySelector('.ProseMirror') : null;
          if (editorElement) {
            // Get the updated HTML
            const updatedHtml = editorElement.innerHTML;
            // Set it back to trigger update
            editor.commands.setContent(updatedHtml);
          }
        } else {
          // For regular content editable
          const editorContainer = editorRef.current?.container || editorRef.current;
          const editorContent = (editorContainer?.querySelector ? editorContainer.querySelector('.ProseMirror') : null) || 
                              (editorContainer?.querySelector ? editorContainer.querySelector('.ql-editor') : null) || 
                              (editorContainer?.querySelector ? editorContainer.querySelector('.tiptap-editor') : null) ||
                              (editorContainer?.querySelector ? editorContainer.querySelector('.note-content-edit-area') : null) ||
                              editorContainer;
          
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
        const editor = editorRef.current?.editor || window.editor;
        if (editor && editor.commands) {
          // For TipTap editor
          const editorContainer = editorRef.current?.container || editorRef.current;
          const editorElement = editorContainer?.querySelector ? editorContainer.querySelector('.ProseMirror') : null;
          if (editorElement) {
            // Get the updated HTML
            const updatedHtml = editorElement.innerHTML;
            // Set it back to trigger update
            editor.commands.setContent(updatedHtml);
          }
        } else {
          // For regular content editable
          const editorContainer = editorRef.current?.container || editorRef.current;
          const editorContent = (editorContainer?.querySelector ? editorContainer.querySelector('.ProseMirror') : null) || 
                              (editorContainer?.querySelector ? editorContainer.querySelector('.ql-editor') : null) || 
                              (editorContainer?.querySelector ? editorContainer.querySelector('.tiptap-editor') : null) ||
                              (editorContainer?.querySelector ? editorContainer.querySelector('.note-content-edit-area') : null) ||
                              editorContainer;
          
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
      setNoteToEdit(note);
      setShowEditPopup(true);
    }
    setNoteContextMenu({ visible: false, x: 0, y: 0, noteId: null });
  };
  
  // Handle edit confirmation
  const handleEditConfirm = () => {
    setShowEditPopup(false);
    if (noteToEdit) {
      handleSelectNote(noteToEdit);
      setIsEditing(true);
      setNoteToEdit(null);
    }
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

  // Handle paste events globally for better screenshot capture
  useEffect(() => {
    const handleGlobalPaste = async (e) => {
      // Only handle if we're editing/creating and target is within the editor
      if (!(isEditing || isCreating)) return;
      
      const isInEditor = e.target.closest('.note-editor, .ProseMirror, .rich-text-editor');
      if (!isInEditor) return;

      const items = Array.from(e.clipboardData?.items || []);
      const imageItem = items.find(item => item.type && item.type.indexOf('image') !== -1);
      
      if (imageItem) {
        console.log('Global paste: Detected image in clipboard');
        // Let the RichTextEditor handle it, but log for debugging
      }
    };

    document.addEventListener('paste', handleGlobalPaste, true);
    return () => document.removeEventListener('paste', handleGlobalPaste, true);
  }, [isEditing, isCreating]);

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

  // Add a new banner directly (after passcode confirmation)
  const addBannerDirectly = async () => {
    if (!newBannerText.trim()) return;
    
    // Add banner to formData for persistence
    const newBanner = {
      id: Date.now().toString(),
      text: newBannerText, // Keep original text with line breaks
      createdAt: new Date(),
      newLine: bannerLineBreak,
      color: isCalloutMode ? 'callout' : isTitleMode ? 'title' : bannerColor,
      isTitle: isTitleMode,
      isCallout: isCalloutMode,
      isDone: bannerColor === 'green'
    };
    
    setFormData(prev => ({
      ...prev,
      banners: [...(prev.banners || []), newBanner]
    }));
    
    // Clear the input
    setNewBannerText('');
    
    // Focus the input field again for quick multiple banner creation
    setTimeout(() => {
      if (bannerInputRef.current) {
        bannerInputRef.current.focus();
      }
    }, 100);
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

  // Professional text processing for optimal PDF formatting
  const processEnterpriseText = (text, maxWidth, pdf) => {
    // Clean and optimize text for professional formatting
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

    // Return properly formatted lines
    return lines.map(line => line.trim());
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
      console.log('getImageAsBase64 called with URL:', url?.substring(0, 100));

      // Clean the URL and decode HTML entities
      url = url.trim();
      url = url.replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&quot;/g, '"')
               .replace(/&#39;/g, "'");

      console.log('Cleaned URL:', url?.substring(0, 100));

      // Handle different URL types
      if (url.startsWith('data:')) {
        // Already in base64 format
        console.log('URL is already a data URL');
        return url;
      }

      // Handle Firebase Storage URLs
      if (url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app')) {
        console.log('Detected Firebase Storage URL');
        try {
          // Parse and clean the URL
          const urlObj = new URL(url);

          // Ensure alt=media parameter is present
          if (!urlObj.searchParams.has('alt')) {
            urlObj.searchParams.set('alt', 'media');
          }

          const finalUrl = urlObj.toString();
          console.log('Final Firebase URL:', finalUrl);

          // Try to fetch with different methods
          let response;

          // Method 1: Try without credentials first (most Firebase storage is public read)
          try {
            response = await fetch(finalUrl, {
              mode: 'cors',
              credentials: 'omit'
            });
            console.log('Fetch attempt status:', response.status);
          } catch (fetchError) {
            console.error('Initial fetch failed:', fetchError);
          }

          // Method 2: If auth is available and we have a user, try with token
          if ((!response || !response.ok) && auth && auth.currentUser) {
            try {
              const token = await auth.currentUser.getIdToken();
              response = await fetch(finalUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                },
                mode: 'cors'
              });
              console.log('Auth token attempt status:', response.status);
            } catch (authError) {
              console.log('Auth token method failed:', authError);
            }
          }

          if (!response || !response.ok) {
            console.error(`Firebase fetch failed with status: ${response?.status || 'no response'}`);

            // If 403, it's likely a permissions issue
            if (response?.status === 403) {
              console.error('403 Forbidden - Firebase Storage permissions issue');
              console.log('URL that failed:', finalUrl);

              // Try to use the download URL directly without modifications
              const originalResponse = await fetch(url, { mode: 'no-cors' });
              if (originalResponse.type === 'opaque') {
                console.log('Got opaque response, trying alternative methods...');
              }
            }
            throw new Error(`HTTP error! status: ${response?.status || 'unknown'}`);
          }

          const blob = await response.blob();
          console.log('Firebase image fetched, blob size:', blob.size);

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('Firebase image converted to base64');
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (fbError) {
          console.error('Error fetching Firebase image:', fbError);
          return null;
        }
      }

      // Handle Supabase URLs
      if (url.includes('supabase')) {
        console.log('Detected Supabase URL');
        try {
          const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (supabaseError) {
          console.error('Error fetching Supabase image:', supabaseError);
          return null;
        }
      }

      // Handle blob URLs (common for screenshots that haven't been uploaded)
      if (url.startsWith('blob:')) {
        console.log('Detected blob URL');
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          console.log('Blob fetched, size:', blob.size);

          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('Blob converted to base64');
              resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (blobError) {
          console.error('Error fetching blob URL (might be revoked):', blobError);
          return null;
        }
      }

      // For other URLs, try generic fetch
      console.log('Trying generic fetch for URL');
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('Image fetched, blob size:', blob.size);

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('Image converted to base64');
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error, 'URL:', url?.substring(0, 100));
      return null;
    }
  };


  // Export note to PDF
  const exportToPDF = async () => {
    if (!selectedNote && !isCreating) return;

    // Debug: Log the actual content being exported
    console.log('=== PDF EXPORT DEBUG START ===');
    console.log('Note title:', formData.title);
    console.log('Content length:', formData.content?.length);
    console.log('Content preview (first 1000 chars):', formData.content?.substring(0, 1000));
    console.log('Images array:', formData.images);
    console.log('=== PDF EXPORT DEBUG END ===');

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

      // A4 dimensions: 210mm x 297mm - Professional margins to prevent overlap
      const pageWidth = 210;
      const pageHeight = 297;
      // Professional margins for proper content display
      const leftMargin = 15; // Standard left margin
      const rightMargin = 15; // Standard right margin
      const topMargin = 25; // Space for header
      const bottomMargin = 25; // Space for footer
      const contentWidth = pageWidth - leftMargin - rightMargin; // Content area
      const maxY = pageHeight - bottomMargin;

      // Optimized Typography settings for professional PDF
      const titleSize = 16;
      const headingSize = 14;
      const bodySize = 11; // Readable size
      const metaSize = 9;
      const lineSpacing = 1.5; // Professional line spacing
      const paragraphSpacing = 3; // Clear paragraph separation
      const sectionSpacing = 5; // Clear section separation

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
          // Clear white background
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');

          // Professional header with proper spacing
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, 0, pageWidth, 20, 'F');

          // Orange accent line
          pdf.setFillColor(255, 85, 0);
          pdf.rect(0, 20, pageWidth, 0.5, 'F');

          // Logo or text fallback
          if (hasLogo && logoImg.complete) {
            // Logo with proper sizing
            const logoMaxWidth = 40;
            const logoMaxHeight = 12;
            const imgRatio = logoImg.width / logoImg.height;
            let logoWidth = logoMaxWidth;
            let logoHeight = logoMaxWidth / imgRatio;

            if (logoHeight > logoMaxHeight) {
              logoHeight = logoMaxHeight;
              logoWidth = logoMaxHeight * imgRatio;
            }

            pdf.addImage(logoImg, 'PNG', leftMargin, 4, logoWidth, logoHeight);
          } else {
            // Fallback to text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(14);
            pdf.setTextColor(255, 85, 0);
            pdf.text('RX SPRINT', leftMargin, 12);
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
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          pdf.text(`${formattedDate} ${formattedTime}`, pageWidth - rightMargin, 8, { align: 'right' });
          pdf.text(`Note: ${formData.title || 'Untitled'}`, pageWidth - rightMargin, 14, { align: 'right' });

          // Professional footer
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
          pdf.setDrawColor(226, 232, 240);
          pdf.line(0, pageHeight - 20, pageWidth, pageHeight - 20);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139);
          pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        };
        
        // Draw header and footer for first page
        drawHeaderFooter(pageNumber);
        
        // Helper function to add a new page
        const addNewPage = () => {
          // Add new page
          pdf.addPage();
          pageNumber++;
          drawHeaderFooter(pageNumber);
          yPosition = topMargin + 5; // Start content after header with proper spacing
          // Reset font to ensure consistency on new page
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(bodySize);
          pdf.setTextColor(0);
        };
    
    // Helper function to check and add new page if needed
    const checkPageBreak = (requiredSpace = bodySize * lineSpacing) => {
      // Ensure we have enough space, considering the footer area
      if (yPosition + requiredSpace > maxY - 5) { // Safety margin to prevent footer overlap
        addNewPage();
      }
    };
    
    // Start content below header with appropriate spacing
    yPosition = topMargin + 5; // Professional spacing after header
    
    // Reset text formatting with Roboto font
    pdf.setTextColor(0);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(bodySize);
    
    
    // Add banners if any using direct PDF rendering for professional display
    if (formData.banners && formData.banners.length > 0) {
      const bannerPadding = 4; // Professional padding
      const bannerGap = 3; // Clear gap between banners
      const bannerFontSize = 10; // Readable font size
      const minBannerHeight = 12; // Professional height
      
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
          // Handle title banners - full width, professional design
          if (banner.isTitle || banner.color === 'title') {
            // Finish current line if we have regular banners pending
            if (currentX > leftMargin) {
              yPosition += lineHeight + 4;
              currentX = leftMargin;
              lineHeight = 0;
            }

            // Calculate title banner height based on text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            const titleLines = pdf.splitTextToSize(banner.text.toUpperCase(), contentWidth - 12);
            const titleHeight = Math.max(15, titleLines.length * 5 + 8);

            checkPageBreak(titleHeight + 2);

            // Title banner with yellowish salmon design
            pdf.setFillColor(255, 212, 163); // Yellowish salmon background
            pdf.roundedRect(leftMargin, yPosition, contentWidth, titleHeight, 3, 3, 'F');

            // Add subtle border
            pdf.setDrawColor(255, 149, 0);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(leftMargin, yPosition, contentWidth, titleHeight, 3, 3, 'D');

            // Draw text
            pdf.setTextColor(139, 69, 19); // Brown text
            let titleY = yPosition + (titleHeight - (titleLines.length - 1) * 5) / 2 + 2;
            titleLines.forEach(line => {
              pdf.text(line, leftMargin + 6, titleY);
              titleY += 5;
            });

            yPosition += titleHeight + 3;
            return;
          }
        
          // Handle callout banners - full width, professional design
          if (banner.isCallout || banner.color === 'callout') {
            // Finish current line if we have regular banners pending
            if (currentX > leftMargin) {
              yPosition += lineHeight + 4;
              currentX = leftMargin;
              lineHeight = 0;
            }

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            const calloutLines = pdf.splitTextToSize(banner.text, contentWidth - 12);
            const calloutHeight = Math.max(20, calloutLines.length * 5 + 10);
            checkPageBreak(calloutHeight + 4);

            // Callout with professional styling
            pdf.setFillColor(255, 248, 243); // Light orange background
            pdf.setDrawColor(255, 105, 0);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(leftMargin, yPosition, contentWidth, calloutHeight, 3, 3, 'FD');

            // Orange left border accent
            pdf.setFillColor(255, 105, 0);
            pdf.rect(leftMargin, yPosition, 3, calloutHeight, 'F');

            // Text with proper spacing
            pdf.setTextColor(66, 66, 66);
            // Calculate starting Y to center text block
            const textBlockHeight = (calloutLines.length - 1) * 5;
            const startY = yPosition + (calloutHeight - textBlockHeight) / 2 + 2;
            let calloutY = startY;
            calloutLines.forEach(line => {
              pdf.text(line, leftMargin + 8, calloutY);
              calloutY += 5;
            });
            yPosition += calloutHeight + 4;
            return;
          }
        
          // Handle regular banners - inline layout with type label
          const fullText = banner.text;
          
          // Determine banner type label
          let bannerTypeLabel = 'STANDARD';
          if (banner.color === 'orange' || banner.isOrange) {
            bannerTypeLabel = 'PRIORITY';
          } else if (banner.color === 'green') {
            bannerTypeLabel = 'SUCCESS';
          } else if (banner.color === 'grey') {
            bannerTypeLabel = 'INFO';
          }
          
          // Calculate banner dimensions to fit both label and text
          pdf.setFontSize(8); // Font for label
          const labelWidth = pdf.getTextWidth(bannerTypeLabel);
          pdf.setFontSize(bannerFontSize);

          // Handle multi-line text properly
          const textLines = banner.text.split('\n').filter(line => line.trim());
          const maxLineWidth = 80; // Maximum width for a single banner

          // Process each line to handle long text
          const processedLines = [];
          textLines.forEach(line => {
            const wrappedLines = pdf.splitTextToSize(line, maxLineWidth - bannerPadding * 2);
            processedLines.push(...wrappedLines);
          });

          const maxTextWidth = Math.max(...processedLines.map(line => pdf.getTextWidth(line)));
          const bannerWidth = Math.min(maxLineWidth, Math.max(labelWidth + 10, maxTextWidth + (bannerPadding * 2), 45));
          const bannerHeight = minBannerHeight + (processedLines.length - 1) * 4.5 + 4; // Height for all lines
          
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
          
          // Add type label
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          const labelX = currentX + bannerPadding;
          const labelY = yPosition + 4;
          pdf.text(bannerTypeLabel, labelX, labelY);

          // Add banner text (supports multi-line)
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(bannerFontSize);

          const textX = currentX + bannerPadding;
          let textY = yPosition + 9; // Start below the label

          // Draw processed lines
          processedLines.forEach((line, lineIndex) => {
            pdf.text(line, textX, textY + (lineIndex * 4.5));
          });
          
          // Update position for next banner
          currentX += bannerWidth + bannerGap;
          lineHeight = Math.max(lineHeight, bannerHeight);
        });
        
        // Finish the line if there are pending regular banners
        if (currentX > leftMargin) {
          yPosition += lineHeight + 3;
        }
      });
      
      // Add professional spacing after all banners
      yPosition += sectionSpacing;
      
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

      // Extract images using multiple methods to ensure we catch everything
      const imageUrls = new Set(); // Use Set to avoid duplicates

      // Method 1: Standard img tags with quotes
      const imgRegex1 = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
      let match1;
      while ((match1 = imgRegex1.exec(formData.content)) !== null) {
        // Decode HTML entities in the URL
        let url = match1[1];
        url = url.replace(/&amp;/g, '&')
                 .replace(/&lt;/g, '<')
                 .replace(/&gt;/g, '>')
                 .replace(/&quot;/g, '"')
                 .replace(/&#39;/g, "'");
        imageUrls.add(url);
      }

      // Method 2: Img tags without quotes (edge case)
      const imgRegex2 = /<img[^>]*src=([^\s>]+)[^>]*>/gi;
      let match2;
      while ((match2 = imgRegex2.exec(formData.content)) !== null) {
        const url = match2[1].replace(/["']/g, '');
        if (url && !imageUrls.has(url)) {
          imageUrls.add(url);
        }
      }

      // Method 3: Check for data-src attributes (some editors use this)
      const dataSrcRegex = /<img[^>]*data-src=["']([^"']+)["'][^>]*>/gi;
      let match3;
      while ((match3 = dataSrcRegex.exec(formData.content)) !== null) {
        imageUrls.add(match3[1]);
      }

      // Method 4: Also check the images array stored separately
      if (formData.images && Array.isArray(formData.images)) {
        formData.images.forEach(url => {
          if (url) imageUrls.add(url);
        });
      }

      // Method 5: Try to get current editor content if available
      if (editorRef.current?.editor) {
        try {
          const currentContent = editorRef.current.editor.getHTML();
          console.log('Got current editor content, length:', currentContent?.length);

          // Extract images from current editor content
          const editorImgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
          let editorMatch;
          while ((editorMatch = editorImgRegex.exec(currentContent)) !== null) {
            imageUrls.add(editorMatch[1]);
          }
        } catch (e) {
          console.log('Could not get editor content:', e);
        }
      }

      // Convert Set to Array
      const uniqueImageUrls = Array.from(imageUrls);

      console.log('\n=== COMPREHENSIVE IMAGE EXTRACTION ===');
      console.log('Total unique images found:', uniqueImageUrls.length);
      console.log('Content length:', formData.content?.length || 0);
      console.log('From saved content:', Array.from(imageUrls).filter(url => formData.content?.includes(url)).length);
      console.log('From images array:', formData.images?.length || 0);

      if (uniqueImageUrls.length === 0) {
        console.warn('⚠️ NO IMAGES FOUND!');
        console.log('Content sample (first 500 chars):', formData.content?.substring(0, 500));
        console.log('Images array:', formData.images);
      } else {
        uniqueImageUrls.forEach((url, index) => {
          console.log(`Image ${index + 1}:`, url?.substring(0, 150));
        });
      }
      console.log('=== END EXTRACTION ===\n');

      // Create a temporary div to parse HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = formData.content || '';

      // Debug: More comprehensive logging
      console.log('=== PDF CONTENT PARSING DEBUG ===');
      console.log('Raw HTML content length:', formData.content?.length);
      console.log('Raw HTML content (first 2000 chars):', formData.content?.substring(0, 2000));

      // Check if content contains img tags using string search
      const imgTagCount = (formData.content?.match(/<img[^>]*>/gi) || []).length;
      console.log('IMG tags found via regex:', imgTagCount);

      // Find all images in the parsed content
      const allImages = tempDiv.querySelectorAll('img');
      console.log(`Found ${allImages.length} images via querySelectorAll`);

      // Also try other methods
      const imgTags = tempDiv.getElementsByTagName('img');
      console.log(`Found ${imgTags.length} img tags via getElementsByTagName`);

      // Check all elements
      const allElements = tempDiv.getElementsByTagName('*');
      console.log(`Total elements in tempDiv: ${allElements.length}`);

      // Log detailed info about each image
      if (allImages.length > 0) {
        allImages.forEach((img, index) => {
          console.log(`\nImage ${index + 1} complete details:`);
          console.log('- getAttribute("src"):', img.getAttribute('src'));
          console.log('- .src property:', img.src);
          console.log('- getAttribute("data-src"):', img.getAttribute('data-src'));
          console.log('- .alt:', img.alt);
          console.log('- .width:', img.width);
          console.log('- .height:', img.height);
          console.log('- .naturalWidth:', img.naturalWidth);
          console.log('- .naturalHeight:', img.naturalHeight);
          console.log('- .className:', img.className);
          console.log('- Parent element:', img.parentElement?.tagName);
          console.log('- outerHTML:', img.outerHTML);
        });
      } else {
        console.log('NO IMAGES FOUND IN PARSED CONTENT!');
        console.log('Checking if HTML parsing is the issue...');
        console.log('TempDiv innerHTML:', tempDiv.innerHTML?.substring(0, 500));
      }
      console.log('=== END PDF CONTENT PARSING DEBUG ===');
      
      // Helper function to process images that were found
      const processExtractedImages = async () => {
        if (uniqueImageUrls.length > 0) {
          console.log('\n=== PROCESSING IMAGES FOR PDF ===');
          console.log(`Processing ${uniqueImageUrls.length} images...`);

          for (let i = 0; i < uniqueImageUrls.length; i++) {
            const imageUrl = uniqueImageUrls[i];
            console.log(`\nProcessing image ${i + 1}/${uniqueImageUrls.length}`);
            console.log('URL:', imageUrl?.substring(0, 150));
            try {
              // Add spacing before image
              yPosition += sectionSpacing;

              // Determine if it's a screenshot
              const isScreenshot = imageUrl.toLowerCase().includes('screenshot') ||
                                 imageUrl.includes('paste') ||
                                 imageUrl.includes('clipboard');

              // Calculate dimensions
              const maxImageWidth = contentWidth * 0.95;
              const maxImageHeight = isScreenshot ? 200 : 180;

              // Default dimensions
              let imgWidth = maxImageWidth;
              let imgHeight = isScreenshot ? imgWidth * 0.5625 : imgWidth * 0.75;

              // Ensure it fits
              if (imgHeight > maxImageHeight) {
                imgHeight = maxImageHeight;
                imgWidth = imgHeight * (isScreenshot ? 1.78 : 1.33);
              }

              // Check page break
              checkPageBreak(imgHeight + sectionSpacing * 2);

              // Center the image
              const imgX = leftMargin + (contentWidth - imgWidth) / 2;

              // Add border
              pdf.setDrawColor(240, 240, 240);
              pdf.setLineWidth(0.1);
              pdf.rect(imgX - 1, yPosition - 1, imgWidth + 2, imgHeight + 2, 'D');

              // Convert to base64 and add to PDF
              console.log('Converting to base64...');
              let base64Image = null;

              // Try multiple conversion methods
              try {
                base64Image = await getImageAsBase64(imageUrl);
              } catch (error) {
                console.error('First attempt failed:', error);
                // Try alternative fetch method
                try {
                  if (imageUrl.startsWith('http') || imageUrl.startsWith('//')) {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    base64Image = await new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result);
                      reader.readAsDataURL(blob);
                    });
                  }
                } catch (altError) {
                  console.error('Alternative fetch also failed:', altError);
                }
              }

              if (base64Image) {
                console.log('Base64 conversion successful, size:', base64Image.length);

                // Determine image type
                let imageType = 'PNG'; // Default to PNG
                if (base64Image.includes('image/jpeg') || base64Image.includes('image/jpg')) {
                  imageType = 'JPEG';
                } else if (base64Image.includes('image/gif')) {
                  imageType = 'GIF';
                } else if (base64Image.includes('image/webp')) {
                  imageType = 'WEBP';
                }

                console.log('Image type:', imageType);

                try {
                  // Add image to PDF
                  pdf.addImage(base64Image, imageType, imgX, yPosition, imgWidth, imgHeight, undefined, 'FAST');
                  console.log('✓ Image added to PDF successfully at position:', {x: imgX, y: yPosition, width: imgWidth, height: imgHeight});
                } catch (addError) {
                  console.error('Error adding image to PDF:', addError);
                  // Try with different format
                  try {
                    pdf.addImage(base64Image, 'PNG', imgX, yPosition, imgWidth, imgHeight);
                    console.log('✓ Image added with PNG format as fallback');
                  } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    throw fallbackError;
                  }
                }
              } else {
                console.error('Failed to convert image to base64');
                // Add placeholder
                pdf.setFillColor(245, 245, 245);
                pdf.rect(imgX, yPosition, imgWidth, imgHeight, 'FD');
                pdf.setFontSize(10);
                pdf.setTextColor(100);
                pdf.text('Image could not be loaded', imgX + imgWidth / 2, yPosition + imgHeight / 2, { align: 'center' });
                pdf.setTextColor(0);
                pdf.setFontSize(bodySize);
              }

              yPosition += imgHeight + sectionSpacing;
            } catch (error) {
              console.error(`Error processing image ${i + 1}:`, error);
              // Add error placeholder
              pdf.setDrawColor(255, 0, 0);
              pdf.setLineWidth(1);
              pdf.rect(leftMargin, yPosition, contentWidth, 40, 'D');
              pdf.setFontSize(10);
              pdf.setTextColor(255, 0, 0);
              pdf.text(`Failed to load image: ${imageUrl?.substring(0, 50)}...`, leftMargin + 5, yPosition + 20);
              pdf.setTextColor(0);
              pdf.setFontSize(bodySize);
              yPosition += 45;
            }
          }
          console.log('=== IMAGE PROCESSING COMPLETE ===\n');
        } else {
          console.log('No images found to process');
        }
      };

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
          const tagName = node.tagName ? node.tagName.toLowerCase() : '';

          // Skip non-element nodes but process children of containers
          if (!tagName) {
            // Process children of unknown elements
            for (const child of Array.from(node.childNodes)) {
              await processNode(child);
            }
            return;
          }
          
          if (tagName === 'table') {
            // Handle tables with professional formatting
            try {
              yPosition += sectionSpacing;

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
                const estimatedTableHeight = (rows.length + 2) * 8; // Better estimate
                checkPageBreak(estimatedTableHeight + 10);

                // Configure table with professional styling
                const tableConfig = {
                  head: headers.length > 0 ? [headers] : [],
                  body: rows,
                  startY: yPosition,
                  margin: { left: leftMargin, right: rightMargin },
                  tableWidth: 'auto',
                  styles: {
                    font: 'helvetica',
                    fontSize: 10,
                    cellPadding: 4,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.3,
                    overflow: 'linebreak',
                    cellWidth: 'wrap'
                  },
                  headStyles: {
                    font: 'helvetica',
                    fillColor: [255, 105, 0],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 11,
                    halign: 'left'
                  },
                  alternateRowStyles: {
                    fillColor: [252, 252, 252],
                  },
                  columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 'auto' },
                    3: { cellWidth: 'auto' }
                  },
                  didDrawPage: function(data) {
                    // Ensure proper page breaks for tables
                    if (data.pageNumber > pageNumber) {
                      pageNumber = data.pageNumber;
                      drawHeaderFooter(pageNumber);
                    }
                  },
                  willDrawCell: function(data) {
                    // Ensure text doesn't overflow cells
                    if (data.cell.text && data.cell.text.length > 50) {
                      data.cell.text = data.cell.text.substring(0, 47) + '...';
                    }
                  }
                };
                
                // Add the table
                autoTable(pdf, tableConfig);
                
                // Update yPosition based on where the table ended
                if (pdf.previousAutoTable && pdf.previousAutoTable.finalY) {
                  yPosition = pdf.previousAutoTable.finalY + sectionSpacing;
                } else if (pdf.lastAutoTable && pdf.lastAutoTable.finalY) {
                  yPosition = pdf.lastAutoTable.finalY + sectionSpacing;
                } else {
                  // Fallback if autoTable position is not available
                  yPosition += estimatedTableHeight + sectionSpacing;
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
            // Handle paragraphs with professional formatting
            const text = node.textContent.trim();
            if (text) {
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(bodySize);
              pdf.setTextColor(0);

              const maxTextWidth = contentWidth;
              const optimizedLines = processEnterpriseText(text, maxTextWidth, pdf);

              optimizedLines.forEach(line => {
                checkPageBreak(bodySize * lineSpacing + 2);
                pdf.text(line, leftMargin, yPosition);
                yPosition += bodySize * lineSpacing;
              });
              yPosition += paragraphSpacing; // Professional paragraph spacing
            } else {
              // Empty paragraph - add small spacing
              yPosition += paragraphSpacing * 0.5;
            }
          } else if (tagName === 'br') {
            // Handle line breaks with proper spacing
            yPosition += bodySize * lineSpacing * 0.5;
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
              
              // Professional list formatting
              const maxTextWidth = contentWidth - prefixWidth - 5;
              const optimizedLines = processEnterpriseText(listItemText, maxTextWidth, pdf);

              optimizedLines.forEach((line, lineIndex) => {
                checkPageBreak(bodySize * lineSpacing + 2);
                if (lineIndex === 0) {
                  // First line with prefix
                  pdf.text(prefix + line, leftMargin, yPosition);
                } else {
                  // Subsequent lines indented
                  pdf.text(line, indentX, yPosition);
                }
                yPosition += bodySize * lineSpacing;
              });
            });
            yPosition += paragraphSpacing * 0.5;
          } else if (tagName === 'blockquote') {
            // Handle blockquotes with enterprise formatting
            const text = node.textContent.trim();
            if (text) {
              pdf.setFont('helvetica', 'italic');
              pdf.setTextColor(80); // Slightly darker for better readability
              
              // Professional blockquote text processing
              const maxTextWidth = contentWidth - 15;
              const optimizedLines = processEnterpriseText(text, maxTextWidth, pdf);

              // Add left border for blockquote
              const blockquoteHeight = optimizedLines.length * bodySize * lineSpacing;
              pdf.setDrawColor(200, 200, 200);
              pdf.setLineWidth(0.5);
              pdf.line(leftMargin + 3, yPosition - 2, leftMargin + 3, yPosition + blockquoteHeight);

              optimizedLines.forEach(line => {
                checkPageBreak(bodySize * lineSpacing + 2);
                pdf.text(line, leftMargin + 8, yPosition);
                yPosition += bodySize * lineSpacing;
              });
              yPosition += paragraphSpacing;
              
              pdf.setFont('helvetica', 'normal');
              pdf.setTextColor(0);
            }
          } else if (tagName === 'img') {
            // Handle images with optimized sizing for screenshots
            console.log('Processing img tag:', node.outerHTML?.substring(0, 200));

            // Try multiple ways to get the src
            let src = node.getAttribute('src') ||
                     node.getAttribute('data-src') ||
                     node.src ||
                     '';

            // If src is empty, check the outerHTML
            if (!src && node.outerHTML) {
              const srcMatch = node.outerHTML.match(/src=["']([^"']+)["']/i);
              if (srcMatch) {
                src = srcMatch[1];
              }
            }

            console.log('Image src extracted:', src?.substring(0, 100));

            if (src) {
              try {
                // Add proper spacing before image
                yPosition += sectionSpacing;

                // Check if this is likely a screenshot based on dimensions or src
                const naturalWidth = parseInt(node.getAttribute('width')) ||
                                   parseInt(node.getAttribute('data-width')) ||
                                   parseInt(node.style?.width) ||
                                   node.naturalWidth || 0;
                const naturalHeight = parseInt(node.getAttribute('height')) ||
                                    parseInt(node.getAttribute('data-height')) ||
                                    parseInt(node.style?.height) ||
                                    node.naturalHeight || 0;
                const isScreenshot = src.toLowerCase().includes('screenshot') ||
                                   src.includes('Screenshot') ||
                                   src.includes('paste') ||
                                   src.includes('clipboard') ||
                                   (naturalWidth > 800 && naturalHeight > 600) ||
                                   (naturalWidth > 1200) ||
                                   node.alt?.toLowerCase().includes('screenshot') ||
                                   node.alt?.toLowerCase().includes('screen') ||
                                   node.className?.includes('screenshot');

                // Calculate optimal image dimensions
                const maxImageWidth = contentWidth * 0.95; // Use more width for screenshots
                const maxImageHeight = isScreenshot ? 200 : 180; // More height for screenshots

                // Default dimensions for optimal display
                let imgWidth = maxImageWidth;
                let imgHeight = 120; // Default height

                if (naturalWidth && naturalHeight) {
                  const aspectRatio = naturalWidth / naturalHeight;

                  if (isScreenshot) {
                    // For screenshots, maximize usage of page width
                    imgWidth = maxImageWidth;
                    imgHeight = imgWidth / aspectRatio;

                    // If height is too much, limit it and recalculate width
                    if (imgHeight > maxImageHeight) {
                      imgHeight = maxImageHeight;
                      imgWidth = imgHeight * aspectRatio;
                    }
                  } else {
                    // Regular images
                    imgWidth = Math.min(maxImageWidth * 0.8, contentWidth * 0.8);
                    imgHeight = imgWidth / aspectRatio;

                    // Ensure it fits within maximum height
                    if (imgHeight > maxImageHeight) {
                      imgHeight = maxImageHeight;
                      imgWidth = imgHeight * aspectRatio;
                    }
                  }

                  // Ensure minimum size for visibility
                  if (imgWidth < 50) {
                    imgWidth = 50;
                    imgHeight = imgWidth / aspectRatio;
                  }
                  if (imgHeight < 30) {
                    imgHeight = 30;
                    imgWidth = imgHeight * aspectRatio;
                  }
                } else {
                  // Use optimal default size based on type
                  if (isScreenshot) {
                    // Screenshots typically have landscape orientation
                    imgWidth = maxImageWidth;
                    imgHeight = imgWidth * 0.5625; // 16:9 aspect ratio
                  } else {
                    imgWidth = maxImageWidth * 0.75;
                    imgHeight = imgWidth * 0.75; // Square aspect ratio as default
                  }
                }

                // For screenshots that might need a full page
                if (isScreenshot && imgHeight > (maxY - yPosition - 10)) {
                  // Start screenshot on a new page if it doesn't fit
                  addNewPage();
                  yPosition = topMargin + 5;
                }

                // Check if image fits on current page with proper spacing
                checkPageBreak(imgHeight + sectionSpacing * 2);

                // Center the image
                const imgX = leftMargin + (contentWidth - imgWidth) / 2;

                // Add subtle border around image area (lighter for screenshots)
                pdf.setDrawColor(isScreenshot ? 240 : 230, isScreenshot ? 240 : 230, isScreenshot ? 240 : 230);
                pdf.setLineWidth(isScreenshot ? 0.1 : 0.2);
                pdf.rect(imgX - 1, yPosition - 1, imgWidth + 2, imgHeight + 2, 'D');

                // Convert image to base64 for embedding
                console.log('Processing image for PDF:', {
                  src: src?.substring(0, 100),
                  isScreenshot,
                  dimensions: `${imgWidth}x${imgHeight}mm`
                });

                let base64Image = null;

                // Try to get the image as base64
                if (src.startsWith('data:')) {
                  // Already a data URL, use directly
                  console.log('Image is already a data URL');
                  base64Image = src;
                } else if (src.startsWith('blob:')) {
                  // Handle blob URLs
                  console.log('Converting blob URL to base64');
                  base64Image = await getImageAsBase64(src);
                } else if (src.startsWith('http') || src.startsWith('//')) {
                  // Handle remote URLs
                  console.log('Fetching remote image');
                  base64Image = await getImageAsBase64(src);
                } else {
                  // Try as relative URL
                  const fullUrl = new URL(src, window.location.origin).href;
                  console.log('Trying with full URL:', fullUrl);
                  base64Image = await getImageAsBase64(fullUrl);
                }

                if (!base64Image) {
                  console.error('Failed to get base64 for image:', src);
                }
                
                if (base64Image) {
                  try {
                    // Determine image type from data URL
                    let imageType = 'PNG'; // Default to PNG for screenshots
                    if (base64Image.includes('image/jpeg') || base64Image.includes('image/jpg')) {
                      imageType = 'JPEG';
                    } else if (base64Image.includes('image/png')) {
                      imageType = 'PNG';
                    } else if (base64Image.includes('image/gif')) {
                      imageType = 'GIF';
                    } else if (base64Image.includes('image/webp')) {
                      imageType = 'WEBP';
                    }

                    // Add the image to PDF with proper compression
                    pdf.addImage(base64Image, imageType, imgX, yPosition, imgWidth, imgHeight, undefined, 'FAST');
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
                  
                  pdf.setFontSize(10);
                  pdf.setTextColor(100);
                  const placeholderText = src.includes('screenshot') ? 'Screenshot unavailable' : 'Image unavailable';
                  const noteText = 'Please ensure the image is still available in the editor';
                  pdf.text(placeholderText, imgX + imgWidth / 2, yPosition + imgHeight / 2 - 3, { align: 'center' });
                  pdf.setFontSize(8);
                  pdf.text(noteText, imgX + imgWidth / 2, yPosition + imgHeight / 2 + 3, { align: 'center' });
                  pdf.setTextColor(0);
                  pdf.setFontSize(bodySize);
                }
                
                // Add proper spacing after image
                yPosition += imgHeight + sectionSpacing;
              } catch (error) {
                console.error('Error adding image to PDF:', error);
                // Add error placeholder
                pdf.setDrawColor(200);
                pdf.rect(leftMargin, yPosition, contentWidth, 30, 'D');
                pdf.setFontSize(10);
                pdf.setTextColor(200, 0, 0);
                const errorText = src.includes('screenshot') ? 'Error loading screenshot' : 'Error loading image';
                pdf.text(errorText, leftMargin + contentWidth / 2, yPosition + 15, { align: 'center' });
                console.error('Failed to load image for PDF:', src);
                pdf.setTextColor(0);
                pdf.setFontSize(bodySize);
                yPosition += 30 + sectionSpacing;
              }
            }
          } else if (tagName === 'div') {
            // Handle div elements
            // Check for table wrappers
            if (node.className && node.className.includes('tableWrapper')) {
              const table = node.querySelector('table');
              if (table) {
                await processNode(table);
              }
            } else {
              // Process all children of divs (they might contain images)
              for (const child of Array.from(node.childNodes)) {
                await processNode(child);
              }
            }
          } else if (tagName === 'span' || tagName === 'strong' || tagName === 'em' || tagName === 'b' || tagName === 'i' || tagName === 'u') {
            // Process inline elements and their children
            for (const child of Array.from(node.childNodes)) {
              await processNode(child);
            }
          } else {
            // For other unknown elements, process their children
            for (const child of Array.from(node.childNodes)) {
              await processNode(child);
            }
          }
        }
      };
      
      // First, process any images we found via regex
      // This ensures images are included even if HTML parsing fails
      await processExtractedImages();

      // Then process the rest of the content (text, tables, etc)
      // but skip img tags since we already processed them
      const processNodeWithoutImages = async (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent.trim();
          if (text) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(bodySize);
            pdf.setTextColor(0);
            const optimizedLines = processEnterpriseText(text, contentWidth, pdf);
            optimizedLines.forEach(line => {
              checkPageBreak(bodySize * lineSpacing + 2);
              pdf.text(line, leftMargin, yPosition);
              yPosition += bodySize * lineSpacing + 1;
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName ? node.tagName.toLowerCase() : '';
          // Skip img tags since we already processed them
          if (tagName === 'img') {
            return;
          }
          // Process other elements normally
          await processNode(node);
        }
      };

      // Process all child nodes of the content (except images)
      for (const child of Array.from(tempDiv.childNodes)) {
        await processNodeWithoutImages(child);
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
                  <button className="action-btn-compact" onClick={() => {
                    setNoteToEdit(selectedNote);
                    setShowEditPopup(true);
                  }}>
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
          /* Board-style Responsive Toolbar - When no note is selected */
          <div className={`board-toolbar board-toolbar-${deviceMode}`}>
            {/* Title Section */}
            <div className="toolbar-section">
              <div className="notes-title-section">
                <FileText size={deviceMode === 'mobile' ? 18 : 20} />
                <h2>{deviceMode === 'mobile' ? 'Notes' : 'All Notes'}</h2>
                <span className="notes-count-badge">{filteredNotes.length}</span>
              </div>
            </div>

            {/* Search Section */}
            <div className="toolbar-section search-section" style={{ flex: 1, maxWidth: '400px' }}>
              <div className="notes-search-wrapper" style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  className="notes-search-input"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f8fafc',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.backgroundColor = '#fff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#f8fafc';
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8'
                    }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Actions Section */}
            <div className="toolbar-section actions">
              <button
                className="tool-button accent"
                onClick={handleCreateNote}
                title="New Note"
              >
                <Plus size={deviceMode === 'mobile' ? 18 : 20} />
              </button>
              <button
                className="tool-button"
                onClick={handleToolbarAddBanner}
                title="Add Banner"
              >
                <Tag size={deviceMode === 'mobile' ? 18 : 20} />
              </button>
            </div>
          </div>
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
                          <textarea
                            ref={bannerInputRef}
                            className="banner-input-redesign"
                            placeholder={isCalloutMode ? "Enter callout text..." : isTitleMode ? "Enter title text..." : "Enter banner text..."}
                            value={newBannerText}
                            onChange={(e) => setNewBannerText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey && newBannerText.trim()) {
                                e.preventDefault();
                                handleCreateBannerDirectly();
                              }
                              // Allow Shift+Enter for new lines
                            }}
                            rows={1}
                            style={{
                              resize: 'vertical',
                              minHeight: '38px',
                              maxHeight: '120px',
                              lineHeight: '1.5',
                              overflow: 'auto'
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
                                handleCreateBannerDirectly();
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
                                handleCreateBannerDirectly();
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
                      {/* Display banners above the editor */}
                      {formData.banners && formData.banners.length > 0 && (
                        <div className="content-banners-container edit-mode">
                          {formData.banners.map((banner) => (
                            <div 
                              key={banner.id}
                              className={`modern-banner-card ${
                                banner.isCallout || banner.color === 'callout' ? 'banner-callout' :
                                banner.isTitle || banner.color === 'title' ? 'banner-title' :
                                banner.color === 'orange' || banner.isOrange ? 'banner-orange' : 
                                banner.color === 'green' ? 'banner-green' : 
                                banner.color === 'grey' ? 'banner-grey' : 'banner-blue'
                              } ${banner.isDone ? 'banner-done' : ''} ${copiedBannerId === banner.id ? 'banner-copied' : ''}`}
                              onClick={() => !banner.isTitle && !banner.isCallout && copyBannerToClipboard(banner)}
                              onContextMenu={(e) => handleContextMenu(e, banner.id)}
                            >
                              <div className="banner-icon-wrapper">
                                {banner.isCallout ? <AlertCircle size={20} /> :
                                 banner.isTitle ? <Zap size={20} /> :
                                 banner.color === 'orange' || banner.isOrange ? <AlertCircle size={20} /> : 
                                 banner.color === 'green' ? <Shield size={20} /> : 
                                 banner.color === 'grey' ? <Info size={20} /> : <Star size={20} />}
                              </div>
                              <div className="banner-content-wrapper">
                                <div className="banner-header">
                                  <span className="banner-label">
                                    {banner.isCallout ? 'CALLOUT' :
                                     banner.isTitle ? 'TITLE' :
                                     banner.color === 'orange' || banner.isOrange ? 'PRIORITY' : 
                                     banner.color === 'green' ? 'SUCCESS' : 
                                     banner.color === 'grey' ? 'INFO' : 'STANDARD'}
                                  </span>
                                  <span className="banner-timestamp">
                                    {banner.createdAt && !isNaN(Date.parse(banner.createdAt)) ? 
                                      (banner.createdAt instanceof Date ? banner.createdAt : new Date(banner.createdAt)).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      }) : ''}
                                  </span>
                                </div>
                                <div className="banner-message" style={{ whiteSpace: 'pre-wrap' }}>{banner.text}</div>
                              </div>
                              <button
                                className="banner-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeBanner(banner.id);
                                }}
                                title="Remove banner"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <RichTextEditor
                        ref={editorRef}
                        value={formData.content}
                        onChange={(content) => {
                          console.log('RichTextEditor onChange triggered');
                          console.log('New content length:', content?.length);
                          console.log('Contains img tags:', content?.includes('<img'));
                          if (content?.includes('<img')) {
                            const imgMatches = content.match(/<img[^>]*>/gi) || [];
                            console.log('Number of img tags:', imgMatches.length);
                            imgMatches.forEach((img, index) => {
                              console.log(`Img tag ${index + 1}:`, img);
                            });
                          }
                          setFormData({ ...formData, content });
                        }}
                        placeholder="Start typing your note or paste Excel data..."
                        onImageUpload={uploadImage}
                        hideToolbar={false}
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
                                <textarea
                                  className="banner-edit-input"
                                  value={editingBannerText}
                                  onChange={(e) => {
                                    setEditingBannerText(e.target.value);
                                    // Auto-resize textarea
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      saveEditedBanner(banner.id);
                                    }
                                    // Allow Shift+Enter for new lines
                                  }}
                                  rows={1}
                                  style={{
                                    resize: 'vertical',
                                    minHeight: '38px',
                                    overflow: 'hidden',
                                    lineHeight: '1.5'
                                  }}
                                  autoFocus
                                  onFocus={(e) => {
                                    // Auto-resize on focus
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                  }}
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
                                className={`modern-banner-card ${
                                  banner.isCallout || banner.color === 'callout' ? 'banner-callout' :
                                  banner.isTitle || banner.color === 'title' ? 'banner-title' :
                                  banner.color === 'orange' || banner.isOrange ? 'banner-orange' : 
                                  banner.color === 'green' ? 'banner-green' : 
                                  banner.color === 'grey' ? 'banner-grey' : 'banner-blue'
                                } ${banner.isDone ? 'banner-done' : ''} ${copiedBannerId === banner.id ? 'banner-copied' : ''}`}
                                onClick={() => !isLongPress && !banner.isTitle && !banner.isCallout && copyBannerToClipboard(banner)}
                                onContextMenu={(e) => handleContextMenu(e, banner.id)}
                                onTouchStart={() => handleTouchStart(banner.id)}
                                onTouchEnd={handleTouchEnd}
                                onTouchMove={handleTouchMove}
                                title="Click to copy, right-click for options"
                              >
                                <div className="banner-icon-wrapper">
                                  {banner.isCallout ? <AlertCircle size={20} /> :
                                   banner.isTitle ? <Zap size={20} /> :
                                   banner.color === 'orange' || banner.isOrange ? <AlertCircle size={20} /> : 
                                   banner.color === 'green' ? <Shield size={20} /> : 
                                   banner.color === 'grey' ? <Info size={20} /> : <Star size={20} />}
                                </div>
                                <div className="banner-content-wrapper">
                                  <div className="banner-header">
                                    <span className="banner-label">
                                      {banner.isCallout ? 'CALLOUT' :
                                       banner.isTitle ? 'TITLE' :
                                       banner.color === 'orange' || banner.isOrange ? 'PRIORITY' : 
                                       banner.color === 'green' ? 'SUCCESS' : 
                                       banner.color === 'grey' ? 'INFO' : 'STANDARD'}
                                    </span>
                                    <span className="banner-timestamp">
                                      {banner.createdAt && !isNaN(Date.parse(banner.createdAt)) ? 
                                        (banner.createdAt instanceof Date ? banner.createdAt : new Date(banner.createdAt)).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        }) : ''}
                                    </span>
                                  </div>
                                  <div className="banner-message" style={{ whiteSpace: 'pre-wrap' }}>{banner.text}</div>
                                </div>
                                <div className="banner-status-icon">
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
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '400px',
                  padding: '40px 20px',
                  width: '100%',
                  position: 'relative'
                }}>
                  {/* New Preloader Animation */}
                  <div className="load">
                    <hr/><hr/><hr/><hr/>
                  </div>

                  {/* Preloader CSS */}
                  <style>{`
                    .load {
                      position: absolute;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%);
                      width: 100px;
                      height: 100px;
                    }

                    .load hr {
                      border: 0;
                      margin: 0;
                      width: 40%;
                      height: 40%;
                      position: absolute;
                      border-radius: 50%;
                      animation: spin 2s ease infinite;
                    }

                    .load :first-child {
                      background: #19A68C;
                      animation-delay: -1.5s;
                    }

                    .load :nth-child(2) {
                      background: #F63D3A;
                      animation-delay: -1s;
                    }

                    .load :nth-child(3) {
                      background: #FDA543;
                      animation-delay: -0.5s;
                    }

                    .load :last-child {
                      background: #193B48;
                    }

                    @keyframes spin {
                      0%, 100% {
                        transform: translate(0);
                      }
                      25% {
                        transform: translate(160%);
                      }
                      50% {
                        transform: translate(160%, 160%);
                      }
                      75% {
                        transform: translate(0, 160%);
                      }
                    }
                  `}</style>
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="notes-table-container" style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  margin: '20px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  width: 'calc(100% - 40px)',
                  border: '1px solid #e5e7eb'
                }}>
                  {/* Table Header */}
                  <div className="notes-table-header" style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 180px',
                    padding: '14px 24px',
                    backgroundColor: '#ff6b35',
                    background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
                    borderBottom: '2px solid #ff6b35',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff',
                    letterSpacing: '0.5px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="#ffffff" />
                      <span>Note Title</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Tag size={18} color="#ffffff" />
                      <span>Banners</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <Calendar size={18} color="#ffffff" />
                      <span>Date Created</span>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="notes-table-body">
                    {filteredNotes.map((note, index) => {
                      return (
                        <div
                          key={note.id}
                          className="notes-table-row"
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
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 120px 180px',
                            padding: '16px 24px',
                            borderBottom: '1px solid #e5e7eb',
                            borderRight: '1px solid #e5e7eb',
                            borderLeft: '1px solid #e5e7eb',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            alignItems: 'center',
                            backgroundColor: '#ffffff'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fff5f0';
                            e.currentTarget.style.borderLeftColor = '#ff6b35';
                            e.currentTarget.style.borderLeftWidth = '3px';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffffff';
                            e.currentTarget.style.borderLeftColor = '#e5e7eb';
                            e.currentTarget.style.borderLeftWidth = '1px';
                          }}
                        >
                          {/* Note Title Column */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            minWidth: 0,
                            borderRight: '1px solid #f3f4f6',
                            paddingRight: '20px'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: note.starred ? '#fff7ed' : '#f9fafb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {note.starred ? (
                                <Star size={18} fill="#ff6b35" color="#ff6b35" />
                              ) : (
                                <FileText size={18} color="#6b7280" />
                              )}
                            </div>
                            <span style={{
                              fontSize: '15px',
                              fontWeight: '500',
                              color: '#1f2937',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {note.title || 'Untitled Note'}
                            </span>
                          </div>

                          {/* Banners Column */}
                          <div style={{
                            textAlign: 'center',
                            borderRight: '1px solid #f3f4f6'
                          }}>
                            {note.banners && note.banners.length > 0 ? (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: '#fff7ed',
                                borderRadius: '20px',
                                border: '1px solid #fed7aa'
                              }}>
                                <Tag size={14} color="#ff6b35" />
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#ff6b35'
                                }}>
                                  {note.banners.length}
                                </span>
                              </div>
                            ) : (
                              <span style={{
                                fontSize: '14px',
                                color: '#9ca3af'
                              }}>0</span>
                            )}
                          </div>

                          {/* Date Column */}
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '400',
                            color: '#6b7280',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}>
                            <Calendar size={14} color="#9ca3af" />
                            <span>
                              {note.createdAt ? (
                                note.createdAt.seconds ?
                                  new Date(note.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  }) :
                                  note.createdAt instanceof Date ?
                                    note.createdAt.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    }) :
                                    new Date(note.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                              ) : 'No date'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
      
      {/* Add Confirmation Popup */}
      <AddConfirmPopup
        isOpen={showAddPopup}
        itemType="note"
        onConfirm={handleAddConfirm}
        onCancel={() => setShowAddPopup(false)}
      />
      
      {/* Add Banner Confirmation Popup */}
      <AddConfirmPopup
        isOpen={showAddBannerPopup}
        itemType="banner"
        onConfirm={handleAddBannerConfirm}
        onCancel={() => setShowAddBannerPopup(false)}
      />
      
      {/* Edit Confirmation Popup */}
      <NoteEditConfirmPopup
        isOpen={showEditPopup}
        noteTitle={noteToEdit?.title || 'this note'}
        onConfirm={handleEditConfirm}
        onCancel={() => {
          setShowEditPopup(false);
          setNoteToEdit(null);
        }}
        mode="edit"
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