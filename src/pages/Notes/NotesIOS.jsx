import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Trash2, X, Calendar, Clock, FileText, Star, 
  Image as ImageIcon, Copy, Check, Edit3, CheckCircle, 
  Download, ChevronLeft, Bold, Italic, Underline, List, 
  Grid3x3, Table, Link, Camera, Share2, MoreHorizontal,
  Folder, FolderPlus, MessageSquare, CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import './AppleNotesDesign.css';

const NotesIOS = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  // State Management
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'gallery'
  const [selectedFolder, setSelectedFolder] = useState('notes');
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    starred: false,
    images: [],
    banners: []
  });
  
  // Banner States
  const [newBannerText, setNewBannerText] = useState('');
  const [bannerColor, setBannerColor] = useState('blue');
  const [showBannerSection, setShowBannerSection] = useState(false);
  const [isTitleMode, setIsTitleMode] = useState(false);
  const [isCalloutMode, setIsCalloutMode] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editingBannerText, setEditingBannerText] = useState('');
  
  // Refs
  const editorRef = useRef(null);
  const bannerInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load notes from Firebase
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

  // Filter notes based on search term
  const filteredNotes = notes.filter(note => {
    const matchesSearch = (note.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (note.content?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Create new note
  const handleCreateNote = async () => {
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
    setShowBannerSection(false);
    
    if (isMobileView) {
      setShowMobileEditor(true);
    }
  };

  // Select note
  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      starred: note.starred || false,
      images: note.images || [],
      banners: note.banners || []
    });
    setIsEditing(false);
    setIsCreating(false);
    setShowBannerSection(note.banners && note.banners.length > 0);
    
    if (isMobileView) {
      setShowMobileEditor(true);
    }
  };

  // Save note
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title for the note.');
      return;
    }

    if (!db) {
      alert('Database connection not available.');
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
        
        const updatedNote = {
          ...selectedNote,
          ...formData,
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

  // Delete note
  const handleDelete = async () => {
    if (!selectedNote || !db) return;

    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', selectedNote.id));
        setSelectedNote(null);
        setFormData({ title: '', content: '', starred: false, images: [], banners: [] });
        
        if (isMobileView) {
          setShowMobileEditor(false);
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note. Please try again.');
      }
    }
  };

  // Toggle star
  const toggleStar = async () => {
    if (!selectedNote || !db) return;

    try {
      const noteRef = doc(db, 'notes', selectedNote.id);
      const newStarred = !formData.starred;
      await updateDoc(noteRef, {
        starred: newStarred,
        updatedAt: serverTimestamp()
      });
      setFormData(prev => ({ ...prev, starred: newStarred }));
    } catch (error) {
      console.error('Error updating star:', error);
    }
  };

  // Add banner
  const addBanner = () => {
    if (!newBannerText.trim()) return;

    const newBanner = {
      id: Date.now().toString(),
      text: newBannerText.trim(),
      color: isTitleMode ? 'title' : isCalloutMode ? 'callout' : bannerColor,
      isTitle: isTitleMode,
      isCallout: isCalloutMode,
      isDone: false
    };

    setFormData(prev => ({
      ...prev,
      banners: [...(prev.banners || []), newBanner]
    }));
    setNewBannerText('');
    setShowBannerSection(true);
  };

  // Toggle banner done
  const toggleBannerDone = (bannerId) => {
    setFormData(prev => ({
      ...prev,
      banners: prev.banners.map(banner =>
        banner.id === bannerId ? { ...banner, isDone: !banner.isDone } : banner
      )
    }));
  };

  // Delete banner
  const deleteBanner = (bannerId) => {
    setFormData(prev => ({
      ...prev,
      banners: prev.banners.filter(banner => banner.id !== bannerId)
    }));
  };

  // Format date
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
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get note preview
  const getNotePreview = (content) => {
    if (!content) return 'No additional text';
    const div = document.createElement('div');
    div.innerHTML = content;
    const text = div.textContent || div.innerText || '';
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  };

  // Get note info (attachments, links, etc.)
  const getNoteInfo = (note) => {
    const info = [];
    if (note.images?.length > 0) {
      info.push(`${note.images.length} attachment${note.images.length > 1 ? 's' : ''}`);
    }
    if (note.banners?.length > 0) {
      info.push(`${note.banners.length} item${note.banners.length > 1 ? 's' : ''}`);
    }
    // Count links in content
    const linkCount = (note.content?.match(/<a /g) || []).length;
    if (linkCount > 0) {
      info.push(`${linkCount} web link${linkCount > 1 ? 's' : ''}`);
    }
    return info.join(', ');
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !storage) return;

    try {
      const storageRef = ref(storage, `notes-images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), downloadURL]
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    }
  };

  // Handle table insertion
  const insertTable = () => {
    if (isEditing || isCreating) {
      const tableHTML = `
        <table style="border-collapse: collapse; width: 100%; margin: 10px 0;">
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 1</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 2</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 3</td>
            <td style="border: 1px solid #ddd; padding: 8px;">Cell 4</td>
          </tr>
        </table>
      `;
      setFormData(prev => ({
        ...prev,
        content: prev.content + tableHTML
      }));
    }
  };

  // Handle share functionality
  const handleShare = async () => {
    if (!selectedNote) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedNote.title,
          text: getNotePreview(selectedNote.content),
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback - copy to clipboard
      const textToCopy = `${selectedNote.title}\n\n${getNotePreview(selectedNote.content)}`;
      navigator.clipboard.writeText(textToCopy);
      alert('Note content copied to clipboard!');
    }
  };

  // Create new folder
  const handleCreateFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      // In a real app, this would create a folder in the database
      alert(`Folder "${folderName}" would be created`);
    }
  };

  // Get thumbnail for note
  const getNoteThumbnail = (note) => {
    if (note.images?.length > 0) {
      return note.images[0];
    }
    return null;
  };

  return (
    <div className={`apple-notes-container ${theme}`}>
      {/* Column 1: Sidebar */}
      <aside className={`apple-sidebar ${showMobileSidebar ? 'mobile-visible' : ''}`}>
        <div className="apple-sidebar-header">
          <span className="apple-sidebar-title">Folders</span>
        </div>
        
        <div className="apple-folders-list">
          <div 
            className={`apple-folder-item ${selectedFolder === 'notes' ? 'active' : ''}`}
            onClick={() => setSelectedFolder('notes')}
          >
            <div className="apple-folder-icon">📁</div>
            <span className="apple-folder-name">Notes</span>
            <span className="apple-folder-count">{notes.length}</span>
          </div>
        </div>
        
        <div className="apple-new-folder" onClick={handleCreateFolder}>
          <FolderPlus size={16} />
          <span>New Folder</span>
        </div>
      </aside>

      {/* Column 2: Notes List */}
      <div className={`apple-notes-list ${isMobileView && showMobileEditor ? 'mobile-hidden' : ''}`}>
        <div className="apple-list-header">
          <h2 className="apple-list-title">Today</h2>
          <div className="apple-view-toggle">
            <button 
              className={`apple-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
            <button 
              className={`apple-view-btn ${viewMode === 'gallery' ? 'active' : ''}`}
              onClick={() => setViewMode('gallery')}
            >
              <Grid3x3 size={16} />
            </button>
          </div>
        </div>
        
        <div className="apple-search-container">
          <div className="apple-search-bar">
            <Search className="apple-search-icon" />
            <input
              type="text"
              className="apple-search-input"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {viewMode === 'list' ? (
          <div className="apple-notes-items">
            {loading ? (
              <div className="apple-loading">
                <div className="apple-spinner" />
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="apple-empty-state">
                <FileText className="apple-empty-icon" />
                <div className="apple-empty-title">No Notes</div>
                <div className="apple-empty-text">
                  {searchTerm ? 'No notes match your search' : 'Tap the compose button to create a note'}
                </div>
              </div>
            ) : (
              filteredNotes.map(note => {
                const thumbnail = getNoteThumbnail(note);
                const info = getNoteInfo(note);
                
                return (
                  <div
                    key={note.id}
                    className={`apple-note-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                    onClick={() => handleSelectNote(note)}
                  >
                    {thumbnail && (
                      <img src={thumbnail} alt="" className="apple-note-thumbnail" />
                    )}
                    <div className="apple-note-content">
                      <div className="apple-note-title">{note.title || 'New Note'}</div>
                      <div className="apple-note-meta">
                        <span className="apple-note-date">
                          {formatDate(note.updatedAt)}
                        </span>
                        {info && <span className="apple-note-info">{info}</span>}
                      </div>
                      <div className="apple-note-preview">
                        {getNotePreview(note.content)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="apple-notes-gallery">
            {filteredNotes.map(note => {
              const thumbnail = getNoteThumbnail(note);
              
              return (
                <div
                  key={note.id}
                  className={`apple-gallery-item ${selectedNote?.id === note.id ? 'selected' : ''}`}
                  onClick={() => handleSelectNote(note)}
                >
                  {thumbnail ? (
                    <img src={thumbnail} alt="" className="apple-gallery-thumbnail" />
                  ) : (
                    <div className="apple-gallery-thumbnail" />
                  )}
                  <div className="apple-gallery-content">
                    <div className="apple-gallery-title">{note.title || 'New Note'}</div>
                    <div className="apple-gallery-date">{formatDate(note.updatedAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Column 3: Note Editor */}
      <div className="apple-note-editor">
        {/* Mobile Back Button */}
        {isMobileView && showMobileEditor && (
          <div className="apple-mobile-nav">
            <button className="apple-back-btn" onClick={() => setShowMobileEditor(false)}>
              <ChevronLeft size={20} />
            </button>
          </div>
        )}
        
        {/* Main Toolbar - All Functions */}
        <div className="apple-editor-toolbar">
          <div className="apple-toolbar-group">
            {/* Note Management */}
            <button 
              className="apple-tool-btn" 
              onClick={handleCreateNote}
              title="New Note"
            >
              <Plus size={18} />
            </button>
            <button 
              className="apple-tool-btn" 
              onClick={() => selectedNote && setIsEditing(true)}
              disabled={!selectedNote || isEditing || isCreating}
              title="Edit Note"
            >
              <Edit3 size={18} />
            </button>
            <button 
              className="apple-tool-btn" 
              onClick={handleDelete} 
              disabled={!selectedNote}
              title="Delete Note"
            >
              <Trash2 size={18} />
            </button>
            
            <div className="apple-toolbar-divider" />
            
            {/* Text Formatting */}
            <button 
              className="apple-tool-btn" 
              onClick={() => document.execCommand('bold')}
              disabled={!isEditing && !isCreating}
              title="Bold"
            >
              <Bold size={18} />
            </button>
            <button 
              className="apple-tool-btn" 
              onClick={() => document.execCommand('italic')}
              disabled={!isEditing && !isCreating}
              title="Italic"
            >
              <Italic size={18} />
            </button>
            <button 
              className="apple-tool-btn" 
              onClick={() => document.execCommand('underline')}
              disabled={!isEditing && !isCreating}
              title="Underline"
            >
              <Underline size={18} />
            </button>
            
            <div className="apple-toolbar-divider" />
            
            {/* Lists and Tables */}
            <button 
              className="apple-tool-btn" 
              onClick={() => document.execCommand('insertUnorderedList')}
              disabled={!isEditing && !isCreating}
              title="Bullet List"
            >
              <List size={18} />
            </button>
            <button 
              className="apple-tool-btn" 
              onClick={() => setShowBannerSection(!showBannerSection)}
              title="Add Checklist/Banner"
            >
              <CheckSquare size={18} />
            </button>
            <button 
              className="apple-tool-btn"
              onClick={insertTable}
              disabled={!isEditing && !isCreating}
              title="Insert Table"
            >
              <Table size={18} />
            </button>
            
            <div className="apple-toolbar-divider" />
            
            {/* Media */}
            <button 
              className="apple-tool-btn"
              onClick={() => imageInputRef.current?.click()}
              title="Add Photo"
            >
              <Camera size={18} />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            
            <div className="apple-toolbar-divider" />
            
            {/* View and Share */}
            <button 
              className="apple-tool-btn" 
              onClick={() => setViewMode(viewMode === 'list' ? 'gallery' : 'list')}
              title={viewMode === 'list' ? 'Gallery View' : 'List View'}
            >
              <Grid3x3 size={18} />
            </button>
            <button 
              className="apple-tool-btn"
              onClick={handleShare}
              disabled={!selectedNote}
              title="Share Note"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>
        
        {/* Editor Content */}
        {selectedNote || isCreating ? (
          <div className="apple-editor-content">
            <div className="apple-note-datetime">
              {selectedNote ? formatDate(selectedNote.updatedAt) : 'Today'} at {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </div>
            
            {/* Title */}
            {isEditing || isCreating ? (
              <input
                type="text"
                className="apple-editor-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
                autoFocus
              />
            ) : (
              <h1 className="apple-editor-title">{formData.title}</h1>
            )}
            
            {/* Banner Section - Original Design */}
            {showBannerSection && (
              <div className="banner-section">
                {(isEditing || isCreating) && (
                  <div className="banner-controls">
                    <div className="banner-input-container">
                      <input
                        ref={bannerInputRef}
                        className="banner-input"
                        placeholder={isCalloutMode ? "Enter callout..." : isTitleMode ? "Enter title..." : "Enter banner text..."}
                        value={newBannerText}
                        onChange={(e) => setNewBannerText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newBannerText.trim()) {
                            e.preventDefault();
                            addBanner();
                          }
                        }}
                      />
                      <button 
                        className="add-banner-btn"
                        onClick={addBanner}
                        disabled={!newBannerText.trim()}
                      >
                        Add Banner
                      </button>
                    </div>
                    
                    <div className="banner-style-options">
                      <button 
                        className={`style-btn ${isTitleMode ? 'active' : ''}`}
                        onClick={() => {
                          setIsTitleMode(!isTitleMode);
                          setIsCalloutMode(false);
                        }}
                      >
                        Title
                      </button>
                      <button 
                        className={`style-btn ${isCalloutMode ? 'active' : ''}`}
                        onClick={() => {
                          setIsCalloutMode(!isCalloutMode);
                          setIsTitleMode(false);
                        }}
                      >
                        Callout
                      </button>
                      <div className="color-picker">
                        {['blue', 'green', 'orange', 'red'].map(color => (
                          <button
                            key={color}
                            className={`color-btn ${bannerColor === color ? 'selected' : ''}`}
                            style={{ backgroundColor: 
                              color === 'blue' ? '#007aff' :
                              color === 'green' ? '#34c759' :
                              color === 'orange' ? '#ff9500' :
                              '#ff3b30'
                            }}
                            onClick={() => setBannerColor(color)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {formData.banners?.length > 0 && (
                  <div className="banners-list">
                    {formData.banners.map(banner => (
                      <div 
                        key={banner.id}
                        className={`banner-item ${banner.isDone ? 'done' : ''} ${banner.isTitle ? 'title-banner' : ''} ${banner.isCallout ? 'callout-banner' : ''}`}
                        style={{
                          '--banner-color': 
                            banner.color === 'green' ? '#34c759' :
                            banner.color === 'orange' ? '#ff9500' :
                            banner.color === 'red' ? '#ff3b30' :
                            banner.isTitle ? '#af52de' :
                            banner.isCallout ? '#ff2d55' :
                            '#007aff'
                        }}
                      >
                        <button 
                          className="banner-checkbox"
                          onClick={() => toggleBannerDone(banner.id)}
                        >
                          {banner.isDone && <Check size={16} />}
                        </button>
                        <span className="banner-text">{banner.text}</span>
                        {(isEditing || isCreating) && (
                          <button 
                            className="delete-banner-btn"
                            onClick={() => deleteBanner(banner.id)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Display Images */}
            {formData.images?.length > 0 && (
              <div className="apple-note-images">
                {formData.images.map((img, index) => (
                  <div key={index} className="apple-note-image-container">
                    <img src={img} alt={`Attachment ${index + 1}`} className="apple-note-image" />
                    {(isEditing || isCreating) && (
                      <button 
                        className="apple-image-remove"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Content Editor */}
            <div className="apple-note-content">
              {isEditing || isCreating ? (
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="Start typing..."
                  showToolbar={false}
                  editorClassName="apple-note-editor-field"
                />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: formData.content }} />
              )}
            </div>
            
            {/* Save/Cancel Buttons */}
            {/* Action Buttons */}
            {(isEditing || isCreating) && (
              <div style={{ display: 'flex', gap: '12px', margin: '20px', marginTop: '20px' }}>
                <button 
                  className="apple-banner-add-btn"
                  onClick={handleSave}
                >
                  Save
                </button>
                <button 
                  className="apple-banner-add-btn"
                  style={{ background: '#8e8e93' }}
                  onClick={() => {
                    setIsEditing(false);
                    setIsCreating(false);
                    if (isCreating) {
                      setSelectedNote(null);
                      setFormData({ title: '', content: '', starred: false, images: [], banners: [] });
                    }
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="apple-empty-state">
            <FileText className="apple-empty-icon" />
            <div className="apple-empty-title">Select a note to view</div>
            <div className="apple-empty-text">
              Choose a note from the list or create a new one
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesIOS;