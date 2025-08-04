import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Trash2, Save, X, Calendar, Clock, FileText, Star, Image as ImageIcon, Tag, Copy, Check, Edit3, CheckCircle, Download } from 'lucide-react';
import { useLocation } from 'react-router-dom';
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

const Notes = () => {
  const { theme } = useTheme();
  const location = useLocation();
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
  const [bannerColorOrange, setBannerColorOrange] = useState(false); // false = blue (default), true = orange
  const bannerInputRef = useRef(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // Track if user has manually interacted
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, bannerId: null });
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editingBannerText, setEditingBannerText] = useState('');
  const longPressTimer = useRef(null);
  const [isLongPress, setIsLongPress] = useState(false);
  
  // Delete confirmation state removed - using window.confirm instead
  
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
          const notesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          }));
          
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

    try {
      if (isCreating) {
        const notesRef = collection(db, 'notes');
        const noteData = {
          title: formData.title,
          content: formData.content,
          starred: formData.starred,
          images: formData.images || [],
          banners: formData.banners || [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(notesRef, noteData);
        
        // Create a temporary note object to display immediately
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
          content: formData.content,
          starred: formData.starred,
          images: formData.images || [],
          banners: formData.banners || [],
          updatedAt: serverTimestamp()
        };
        await updateDoc(noteRef, updateData);
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDelete = () => {
    if (selectedNote) {
      if (window.confirm('Are you sure you want to delete this note?')) {
        confirmDelete();
      }
    }
  };

  const confirmDelete = async () => {
    if (!selectedNote || !db) return;

    try {
      await deleteDoc(doc(db, 'notes', selectedNote.id));
      setSelectedNote(null);
      setFormData({ title: '', content: '', starred: false, images: [], banners: [] });
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
  
  // Render content with HTML support
  const renderContent = (content) => {
    if (!content) return <p className="empty-content">No content</p>;
    
    // For rich text HTML content, render it directly
    return (
      <div 
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
      newLine: bannerLineBreak,
      isOrange: bannerColorOrange,  // Track if this banner should be orange
      isDone: false  // Track if banner is marked as done
    };
    
    const updatedBanners = [...(formData.banners || []), newBanner];
    
    setFormData(prev => ({
      ...prev,
      banners: updatedBanners
    }));
    
    setNewBannerText('');
    setShowBannerInput(false);
    
    // Focus the input field again for quick multiple banner creation
    setTimeout(() => {
      if (bannerInputRef.current) {
        bannerInputRef.current.focus();
      }
    }, 100);
    
    // Auto-save to Firebase if editing existing note
    if (selectedNote && !isCreating) {
      try {
        const noteRef = doc(db, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          banners: updatedBanners,
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
    
    // A4 dimensions: 210mm x 297mm
    const pageWidth = 210;
    const pageHeight = 297;
    const leftMargin = 20;
    const rightMargin = 20;
    const topMargin = 50; // Space for header
    const bottomMargin = 30; // Space for footer
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const maxY = pageHeight - bottomMargin;
    
    // Typography settings
    const titleSize = 18;
    const headingSize = 14;
    const bodySize = 11;
    const metaSize = 9;
    const lineSpacing = 1.5;
    const paragraphSpacing = 8;
    const sectionSpacing = 12;
    
    let yPosition = topMargin;
    let pageNumber = 1;
    const totalPages = 1; // Will be updated after content is added
    
    // Helper function to draw header and footer
    const drawHeaderFooter = (pageNum) => {
      // Professional light theme header
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Light header section
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      // Orange accent line
      pdf.setFillColor(255, 85, 0);
      pdf.rect(0, 45, pageWidth, 2, 'F');
      
      // Logo - RX SPRINT text
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(255, 85, 0);
      pdf.text('RX SPRINT', 20, 25);
      
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
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Generated: ${formattedDate} at ${formattedTime}`, pageWidth - 20, 20, { align: 'right' });
      pdf.text(`Note ID: NOTE-${Date.now().toString().slice(-6)}`, pageWidth - 20, 30, { align: 'right' });
      
      // Professional footer
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.line(0, pageHeight - 25, pageWidth, pageHeight - 25);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text('RX Sprint Medical Supplies', 20, pageHeight - 12);
      pdf.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 12, { align: 'right' });
    };
    
    // Draw header and footer for first page
    drawHeaderFooter(pageNumber);
    
    // Helper function to add a new page
    const addNewPage = () => {
      // Add new page
      pdf.addPage();
      pageNumber++;
      drawHeaderFooter(pageNumber);
      yPosition = topMargin + 5; // Start below header
      pdf.setTextColor(0);
    };
    
    // Helper function to check and add new page if needed
    const checkPageBreak = (requiredSpace = bodySize * lineSpacing) => {
      if (yPosition + requiredSpace > maxY) {
        addNewPage();
      }
    };
    
    // Start content below header
    yPosition = 65;
    
    // Add title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(51, 65, 85);
    const title = formData.title || 'Untitled Note';
    const titleLines = pdf.splitTextToSize(title, contentWidth);
    titleLines.forEach((line, index) => {
      checkPageBreak(16 * lineSpacing);
      pdf.text(line, leftMargin, yPosition);
      yPosition += 16 * lineSpacing;
    });
    yPosition += sectionSpacing;
    
    // Add metadata subtitle
    checkPageBreak(metaSize * lineSpacing);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    const dateStr = selectedNote ? 
      `Last updated: ${selectedNote.updatedAt.toLocaleDateString()} at ${selectedNote.updatedAt.toLocaleTimeString()}` :
      `Created: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
    pdf.text(dateStr, leftMargin, yPosition);
    yPosition += 12 * lineSpacing + sectionSpacing;
    pdf.setTextColor(0);
    
    // Add banners if any
    if (formData.banners && formData.banners.length > 0) {
      checkPageBreak(headingSize * lineSpacing);
      pdf.setFontSize(headingSize);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0);
      pdf.text('Banners', leftMargin, yPosition);
      yPosition += headingSize * lineSpacing + paragraphSpacing;
      
      pdf.setFont(undefined, 'normal');
      
      // Banner styling constants to match UI
      const bannerPadding = 3; // 0.75rem ≈ 3mm
      const bannerPaddingX = 5; // 1.25rem ≈ 5mm
      const bannerGap = 3; // 0.75rem ≈ 3mm
      const bannerRadius = 2.5; // 10px ≈ 2.5mm
      const bannerFontSize = 10; // 0.9375rem ≈ 10pt
      const bannerHeight = 14; // Calculated height with padding
      
      // Group banners by line
      const bannerLines = [];
      let currentLine = [];
      
      formData.banners.forEach((banner, index) => {
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
        // Add line spacing for new lines (except first)
        if (lineIndex > 0) {
          yPosition += 2; // Small gap between lines
        }
        
        // Check if the line fits on current page
        checkPageBreak(bannerHeight + 5);
        
        // Calculate banner widths for this line
        let xPosition = leftMargin;
        const maxLineWidth = contentWidth;
        
        // Measure each banner's text width
        const bannerMeasurements = line.map(banner => {
          pdf.setFontSize(bannerFontSize);
          const prefix = banner.isDone ? '✓ ' : '';
          const text = prefix + banner.text;
          const textWidth = pdf.getTextWidth(text);
          return {
            banner,
            text,
            width: Math.min(textWidth + (bannerPaddingX * 2), maxLineWidth / line.length - bannerGap)
          };
        });
        
        // Render each banner in the line
        bannerMeasurements.forEach((measurement, bannerIndex) => {
          const { banner, text, width } = measurement;
          
          // Set colors based on banner state
          if (banner.isDone) {
            // Neon green for done banners
            pdf.setFillColor(0, 255, 136);
            pdf.setDrawColor(0, 204, 106);
          } else if (banner.isOrange) {
            // Orange for new line banners
            pdf.setFillColor(203, 96, 21);
            pdf.setDrawColor(160, 78, 17);
          } else {
            // Blue for regular banners
            pdf.setFillColor(59, 130, 246);
            pdf.setDrawColor(37, 99, 235);
          }
          
          // Draw shadow
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(xPosition + 1, yPosition + 1, width, bannerHeight, bannerRadius, bannerRadius, 'F');
          
          // Reset fill color
          if (banner.isDone) {
            pdf.setFillColor(0, 255, 136);
          } else if (banner.isOrange) {
            pdf.setFillColor(203, 96, 21);
          } else {
            pdf.setFillColor(59, 130, 246);
          }
          
          // Draw banner background
          pdf.roundedRect(xPosition, yPosition, width, bannerHeight, bannerRadius, bannerRadius, 'FD');
          
          // Set text style
          pdf.setFontSize(bannerFontSize);
          if (banner.isDone) {
            pdf.setTextColor(0, 61, 31); // Dark green text
            pdf.setFont(undefined, 'bold');
          } else {
            pdf.setTextColor(255, 255, 255); // White text
            pdf.setFont(undefined, 'normal');
          }
          
          // Add text (centered vertically in banner)
          const textY = yPosition + (bannerHeight / 2) + (bannerFontSize / 3);
          
          // Check if text fits, otherwise truncate with ellipsis
          let displayText = text;
          const maxTextWidth = width - (bannerPaddingX * 2);
          if (pdf.getTextWidth(text) > maxTextWidth) {
            while (pdf.getTextWidth(displayText + '...') > maxTextWidth && displayText.length > 0) {
              displayText = displayText.substring(0, displayText.length - 1);
            }
            displayText += '...';
          }
          
          pdf.text(displayText, xPosition + bannerPaddingX, textY);
          
          // Move x position for next banner
          xPosition += width + bannerGap;
          
          // Reset font
          pdf.setFont(undefined, 'normal');
        });
        
        // Move y position for next line
        yPosition += bannerHeight + bannerGap;
      });
      
      yPosition += sectionSpacing;
      pdf.setTextColor(0);
      pdf.setFont(undefined, 'normal');
    }
    
    // Add content
    if (formData.content) {
      checkPageBreak(headingSize * lineSpacing);
      pdf.setFontSize(headingSize);
      pdf.setFont(undefined, 'bold');
      pdf.text('Content', leftMargin, yPosition);
      yPosition += headingSize * lineSpacing + paragraphSpacing;
      
      pdf.setFont(undefined, 'normal');
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
            const lines = pdf.splitTextToSize(text, contentWidth);
            lines.forEach(line => {
              checkPageBreak(bodySize * lineSpacing);
              pdf.text(line, leftMargin, yPosition);
              yPosition += bodySize * lineSpacing;
            });
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Handle element nodes
          const tagName = node.tagName.toLowerCase();
          
          if (tagName === 'table') {
            // Handle tables using jspdf-autotable
            try {
              yPosition += paragraphSpacing;
              
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
                
                // Configure and add the table
                const tableConfig = {
                  head: headers.length > 0 ? [headers] : [],
                  body: rows,
                  startY: yPosition,
                  margin: { left: leftMargin, right: rightMargin },
                  styles: {
                    fontSize: bodySize - 1,
                    cellPadding: 3,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.5,
                  },
                  headStyles: {
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
                  yPosition = pdf.previousAutoTable.finalY + paragraphSpacing;
                } else if (pdf.lastAutoTable && pdf.lastAutoTable.finalY) {
                  yPosition = pdf.lastAutoTable.finalY + paragraphSpacing;
                } else {
                  // Fallback if autoTable position is not available
                  yPosition += estimatedTableHeight + paragraphSpacing;
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
            // Handle paragraphs
            const text = node.textContent.trim();
            if (text) {
              const lines = pdf.splitTextToSize(text, contentWidth);
              lines.forEach(line => {
                checkPageBreak(bodySize * lineSpacing);
                pdf.text(line, leftMargin, yPosition);
                yPosition += bodySize * lineSpacing;
              });
              yPosition += paragraphSpacing;
            }
          } else if (tagName === 'br') {
            // Handle line breaks
            yPosition += bodySize * lineSpacing;
          } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
            // Handle headings
            const text = node.textContent.trim();
            if (text) {
              const fontSize = tagName === 'h1' ? 16 : tagName === 'h2' ? 14 : 12;
              pdf.setFontSize(fontSize);
              pdf.setFont(undefined, 'bold');
              
              checkPageBreak(fontSize * lineSpacing);
              pdf.text(text, leftMargin, yPosition);
              yPosition += fontSize * lineSpacing + paragraphSpacing;
              
              pdf.setFont(undefined, 'normal');
              pdf.setFontSize(bodySize);
            }
          } else if (tagName === 'ul' || tagName === 'ol') {
            // Handle lists
            const listItems = node.querySelectorAll('li');
            listItems.forEach((li, index) => {
              const prefix = tagName === 'ul' ? '• ' : `${index + 1}. `;
              const text = prefix + li.textContent.trim();
              const lines = pdf.splitTextToSize(text, contentWidth - 10);
              
              lines.forEach((line, lineIndex) => {
                checkPageBreak(bodySize * lineSpacing);
                const xPos = lineIndex === 0 ? leftMargin : leftMargin + 10;
                pdf.text(line, xPos, yPosition);
                yPosition += bodySize * lineSpacing;
              });
            });
            yPosition += paragraphSpacing;
          } else if (tagName === 'blockquote') {
            // Handle blockquotes
            const text = node.textContent.trim();
            if (text) {
              pdf.setFont(undefined, 'italic');
              pdf.setTextColor(100);
              
              const lines = pdf.splitTextToSize(text, contentWidth - 20);
              lines.forEach(line => {
                checkPageBreak(bodySize * lineSpacing);
                pdf.text(line, leftMargin + 10, yPosition);
                yPosition += bodySize * lineSpacing;
              });
              yPosition += paragraphSpacing;
              
              pdf.setFont(undefined, 'normal');
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
                
                yPosition += imgHeight + paragraphSpacing;
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
                yPosition += 30 + paragraphSpacing;
              }
            }
          } else if (tagName === 'div' && node.className && node.className.includes('tableWrapper')) {
            // Handle table wrapper divs
            const table = node.querySelector('table');
            if (table) {
              await processNode(table);
            }
          } else {
            // For other elements, process their children
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
    
    // Save the PDF
    const filename = `RX-Sprint-Note-${formData.title || 'note'}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    
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
    <div className="notes-page page-container">
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
                        images: selectedNote?.images || []
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
                    className="action-btn-compact"
                    onClick={() => {
                      setShowBannerInput(true);
                      setBannerLineBreak(false);
                      setBannerColorOrange(false);
                    }}
                  >
                    <Tag size={16} />
                    <span>Add Banner</span>
                  </button>
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
          /* Toggle Banner - When no note is selected */
          <div className="section-toggle-banner">
            <button 
              className={`toggle-btn ${isCreating ? 'active' : ''}`}
              onClick={handleCreateNote}
            >
              <Plus size={16} />
              <span>New Note</span>
            </button>
            <button 
              className="toggle-btn"
              onClick={() => {
                if (selectedNote) {
                  setShowBannerInput(true);
                  setBannerLineBreak(false);
                  setBannerColorOrange(false);
                }
              }}
              disabled={!selectedNote}
            >
              <Tag size={16} />
              <span>Add Banner</span>
            </button>
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
                    {/* Add Banner Controls - Always visible */}
                    <div className="editor-banner-controls">
                      <div className="banner-input-wrapper">
                        <textarea
                          ref={bannerInputRef}
                          className="banner-input"
                          placeholder="Enter banner text..."
                          value={newBannerText}
                          onChange={(e) => {
                            setNewBannerText(e.target.value);
                            // Auto-resize textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && newBannerText.trim()) {
                              e.preventDefault();
                              addBanner();
                            }
                          }}
                          rows={1}
                        />
                        <button
                          className="add-banner-btn"
                          onClick={addBanner}
                          disabled={!newBannerText.trim()}
                          title="Add new banner"
                        >
                          <Tag size={16} />
                          Add Banner
                        </button>
                        <button
                          className="banner-toggle-btn"
                          onClick={() => setBannerLineBreak(!bannerLineBreak)}
                          title={bannerLineBreak ? "New line" : "Existing line"}
                        >
                          {bannerLineBreak ? "New Line" : "Existing Line"}
                        </button>
                        <button
                          className={`banner-color-toggle-btn ${bannerColorOrange ? 'orange' : 'blue'}`}
                          onClick={() => setBannerColorOrange(!bannerColorOrange)}
                          title={bannerColorOrange ? "Orange color" : "Blue color"}
                        >
                          {bannerColorOrange ? "Orange" : "Blue"}
                        </button>
                      </div>
                    </div>

                    <div className="note-content-edit-area">
                      {/* Display banners in content area during edit mode */}
                      {formData.banners && formData.banners.length > 0 && (
                        <div className="content-banners-container edit-mode">
                          {formData.banners.map((banner, index) => (
                            <React.Fragment key={banner.id}>
                              {banner.newLine && index > 0 && <div className="banner-line-break" />}
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
                                  className={`content-banner-item ${banner.isOrange ? 'new-line' : ''} ${banner.isDone ? 'done' : ''} ${copiedBannerId === banner.id ? 'copied' : ''}`}
                                  onClick={() => !isLongPress && copyBannerToClipboard(banner)}
                                  onContextMenu={(e) => handleContextMenu(e, banner.id)}
                                  onTouchStart={() => handleTouchStart(banner.id)}
                                  onTouchEnd={handleTouchEnd}
                                  onTouchMove={handleTouchMove}
                                  title="Click to copy, right-click for options"
                                >
                                  <span className="banner-text">{banner.text}</span>
                                  <button
                                    className="remove-banner-btn inline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeBanner(banner.id);
                                    }}
                                    title="Remove banner"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      <RichTextEditor
                        value={formData.content}
                        onChange={(content) => setFormData({ ...formData, content })}
                        placeholder="Start typing your note..."
                        onImageUpload={uploadImage}
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
                    {formData.banners && formData.banners.length > 0 && (
                      <div className="content-banners-container">
                        {formData.banners.map((banner, index) => (
                          <React.Fragment key={banner.id}>
                            {banner.newLine && index > 0 && <div className="banner-line-break" />}
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
                                className={`content-banner-item ${banner.isOrange ? 'new-line' : ''} ${banner.isDone ? 'done' : ''} ${copiedBannerId === banner.id ? 'copied' : ''}`}
                                onClick={() => !isLongPress && copyBannerToClipboard(banner)}
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
                    )}
                    {renderContent(formData.content)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="notes-main-list">
              <div className="notes-list-header">
                <h2>All Notes</h2>
                <span className="notes-count">{filteredNotes.length} notes</span>
              </div>
              
              <div className="notes-search-bar">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="notes-search-input"
                />
              </div>
              
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading notes...</p>
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="notes-main-grid">
                  {filteredNotes.map(note => (
                    <div
                      key={note.id}
                      className="main-note-card"
                      onClick={() => {
                        handleSelectNote(note);
                      }}
                    >
                      <div className="main-note-header">
                        <h3>{note.title || 'Untitled'}</h3>
                        <div className="main-note-actions">
                          {note.starred && (
                            <Star size={16} fill="currentColor" className="starred-icon" />
                          )}
                          <button
                            className="star-btn-card"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(note, e);
                            }}
                            title={note.starred ? 'Remove star' : 'Add star'}
                          >
                            <Star 
                              size={14} 
                              fill={note.starred ? 'currentColor' : 'none'} 
                              className={note.starred ? 'starred' : ''}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="main-note-footer">
                        <span className="main-note-date">
                          <Clock size={14} />
                          {formatDate(note.updatedAt)}
                        </span>
                        {note.images && note.images.length > 0 && (
                          <span className="main-note-images">
                            <ImageIcon size={14} />
                            {note.images.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
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
        </div>,
        document.body
      )}

    </div>
  );
};

export default Notes;