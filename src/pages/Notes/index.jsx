import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Trash2, Save, X, Calendar, Clock, FileText, Star, Image as ImageIcon } from 'lucide-react';
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
    images: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showAllNotesPopup, setShowAllNotesPopup] = useState(true); // Auto-open by default
  
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
        setShowAllNotesPopup(false); // Close the popup since we're selecting a specific note
      }
    }
  }, [notes, location.state]);

  const handleCreateNote = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setFormData({
      title: 'New Note',
      content: '',
      starred: false,
      images: []
    });
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      starred: note.starred || false,
      images: note.images || []
    });
    setIsEditing(false);
    setIsCreating(false);
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
      setFormData({ title: '', content: '', starred: false, images: [] });
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

  // Handle paste event for Excel tables and images
  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    // Check for any image type including screenshots
    const imageItem = items.find(item => 
      item.type.startsWith('image/') || 
      item.kind === 'file' && item.type.match(/^image\//)
    );
    
    if (imageItem) {
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) {
        // Handle screenshots specifically
        const isScreenshot = !blob.name || blob.name === 'image.png' || 
                           blob.name.includes('screenshot') || 
                           blob.name.includes('Screenshot');
        await uploadImage(blob, isScreenshot);
      }
    } else {
      // Handle text/table paste
      e.preventDefault();
      
      // Get clipboard data
      const clipboardData = e.clipboardData || window.clipboardData;
      const pastedData = clipboardData.getData('text/plain');
      
      // Check if it's likely a table (has tabs and newlines)
      if (pastedData.includes('\t')) {
        // Convert to HTML table
        const htmlTable = convertToHTMLTable(pastedData);
        
        // Insert at cursor position
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        const newContent = text.substring(0, start) + htmlTable + text.substring(end);
        setFormData({ ...formData, content: newContent });
      } else {
        // Regular paste
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        const newContent = text.substring(0, start) + pastedData + text.substring(end);
        setFormData({ ...formData, content: newContent });
      }
    }
  };
  
  // Upload image to Firebase Storage
  const uploadImage = async (file, isScreenshot = false) => {
    if (!storage) {
      alert('Storage service not available');
      return;
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
      
      // Add image URL to the content with better formatting
      const altText = isScreenshot ? 'Screenshot' : 'Pasted image';
      const imageMarkup = `\n\n<img src="${downloadURL}" alt="${altText}" style="max-width: 100%; height: auto; display: block; margin: 10px auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />\n\n`;
      
      // Insert at cursor position or at the end
      const textarea = document.querySelector('.note-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.content || '';
        const newContent = text.substring(0, start) + imageMarkup + text.substring(end);
        setFormData(prev => ({ ...prev, content: newContent }));
        
        // Move cursor after the inserted image
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + imageMarkup.length;
          textarea.focus();
        }, 10);
      } else {
        // If not in edit mode, just append
        setFormData(prev => ({ ...prev, content: (prev.content || '') + imageMarkup }));
      }
      
      // Also store image URL in images array for reference
      const newImages = [...(formData.images || []), downloadURL];
      setFormData(prev => ({ ...prev, images: newImages }));
      
      // Auto-save after image upload if editing existing note
      if (!isCreating && selectedNote) {
        setTimeout(() => {
          handleSave();
        }, 500);
      }
      
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(`Failed to upload ${isScreenshot ? 'screenshot' : 'image'}: ${error.message}`);
    } finally {
      setUploadingImage(false);
    }
  };
  
  // Convert tab-separated data to HTML table
  const convertToHTMLTable = (data) => {
    const rows = data.trim().split('\n');
    let html = '<table>\n';
    
    rows.forEach((row, index) => {
      const cells = row.split('\t');
      html += '  <tr>\n';
      
      cells.forEach(cell => {
        const tag = index === 0 ? 'th' : 'td';
        html += `    <${tag}>${cell.trim()}</${tag}>\n`;
      });
      
      html += '  </tr>\n';
    });
    
    html += '</table>\n';
    return html;
  };
  
  // Render content with HTML support for tables and images
  const renderContent = (content) => {
    if (!content) return <p className="empty-content">No content</p>;
    
    // Check if content contains HTML (tables or images)
    if (content.includes('<table>') || content.includes('<img')) {
      // Split content by HTML elements to handle mixed content
      const parts = content.split(/(<table>[\s\S]*?<\/table>|<img[^>]*>)/g);
      
      return (
        <div className="note-content-wrapper">
          {parts.map((part, index) => {
            if (part.startsWith('<table>') || part.startsWith('<img')) {
              // Render HTML elements
              return (
                <div 
                  key={index}
                  className={part.startsWith('<table>') ? 'table-container' : 'image-container'}
                  dangerouslySetInnerHTML={{ __html: part }}
                />
              );
            } else {
              // Render regular text with line breaks
              return (
                <div key={index} className="text-content">
                  {part.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < part.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              );
            }
          })}
        </div>
      );
    }
    
    // Regular content without HTML
    return (
      <div className="text-content">
        {content.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < content.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
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

  return (
    <div className="notes-page page-container">
      {/* Header */}
      {/* Toggle Banner - Analyzer Style */}
      <div className="section-toggle-banner">
        <button 
          className={`toggle-btn ${showAllNotesPopup ? 'active' : ''}`}
          onClick={() => setShowAllNotesPopup(true)}
        >
          <FileText size={16} />
          <span>All Notes</span>
        </button>
        <button 
          className={`toggle-btn ${isCreating ? 'active' : ''}`}
          onClick={handleCreateNote}
        >
          <Plus size={16} />
          <span>New Note</span>
        </button>
      </div>

      <div className="notes-layout">
        {/* Main content area */}
        <div className="notes-content">
          {selectedNote || isCreating ? (
            <>
              <div className="content-header">
                <div className="content-header-wrapper">
                  {isEditing || isCreating ? (
                    <input
                      type="text"
                      className="note-title-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Note title..."
                      autoFocus
                    />
                  ) : (
                    <h1>{formData.title || 'Untitled'}</h1>
                  )}
                  
                  <div className="content-actions">
                    {isEditing || isCreating ? (
                      <>
                        <button className="action-btn" onClick={() => {
                          setIsEditing(false);
                          setIsCreating(false);
                          if (isCreating) {
                            setSelectedNote(null);
                            setFormData({ title: '', content: '', starred: false, images: [] });
                          } else {
                            setFormData({
                              title: selectedNote?.title || '',
                              content: selectedNote?.content || '',
                              starred: selectedNote?.starred || false,
                              images: selectedNote?.images || []
                            });
                          }
                        }}>
                          <X size={18} />
                          Cancel
                        </button>
                        <button className="action-btn primary" onClick={handleSave}>
                          <Save size={18} />
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={`star-btn large ${formData.starred ? 'starred' : ''}`}
                          onClick={(e) => selectedNote && toggleStar(selectedNote, e)}
                        >
                          <Star size={20} fill={formData.starred ? 'currentColor' : 'none'} />
                        </button>
                        <button className="action-btn" onClick={() => setIsEditing(true)}>
                          Edit
                        </button>
                        <button className="action-btn danger" onClick={() => handleDelete()}>
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {!isCreating && selectedNote && (
                <div className="note-meta">
                  <span className="meta-item">
                    <Calendar size={14} />
                    Created {selectedNote.createdAt?.toLocaleDateString()}
                  </span>
                  <span className="meta-item">
                    <Clock size={14} />
                    Updated {formatDate(selectedNote.updatedAt)}
                  </span>
                </div>
              )}
              
              <div 
                className={`note-editor ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isEditing || isCreating ? (
                  <>
                    <textarea
                      className="note-textarea"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      onPaste={handlePaste}
                      placeholder="Start typing your note, paste a screenshot, or drop an image..."
                    />
                    {uploadingImage && (
                      <div className="upload-indicator">
                        <div className="spinner" />
                        <span>Uploading image...</span>
                      </div>
                    )}
                    <div className="paste-hint">
                      <ImageIcon size={16} />
                      <span>Paste screenshots (Ctrl+V/Cmd+V) or drag & drop images</span>
                    </div>
                  </>
                ) : (
                  <div className="note-content">
                    {renderContent(formData.content)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-note-selected">
              <FileText size={64} />
              <h2>Select a note to view</h2>
              <p>Choose a note from the sidebar or create a new one</p>
              <button className="action-btn primary" onClick={handleCreateNote}>
                <Plus size={18} />
                Create New Note
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen notes popup - Rendered via Portal */}
      {showAllNotesPopup && ReactDOM.createPortal(
        <div className="notes-popup-overlay" onClick={() => setShowAllNotesPopup(false)}>
          <div className="notes-popup-content" onClick={(e) => e.stopPropagation()}>
            {/* Include the header with toggle buttons */}
            <div className="popup-page-header">
              <div className="section-toggle-banner">
                <button 
                  className="toggle-btn active"
                  onClick={() => {/* Already on All Notes */}}
                >
                  <FileText size={16} />
                  <span>All Notes</span>
                </button>
                <button 
                  className="toggle-btn"
                  onClick={() => {
                    handleCreateNote();
                    setShowAllNotesPopup(false);
                  }}
                >
                  <Plus size={16} />
                  <span>New Note</span>
                </button>
                <button 
                  className="close-popup-btn" 
                  onClick={() => setShowAllNotesPopup(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="popup-search">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="popup-search-input"
              />
            </div>
            
            <div className="popup-notes-list">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <p>Loading notes...</p>
                </div>
              ) : filteredNotes.length > 0 ? (
                <div className="notes-grid">
                  {filteredNotes.map(note => (
                    <div
                      key={note.id}
                      className="popup-note-card"
                      onClick={() => {
                        handleSelectNote(note);
                        setShowAllNotesPopup(false);
                      }}
                    >
                      <div className="note-card-header">
                        <h3>{note.title || 'Untitled'}</h3>
                        {note.starred && <Star size={16} fill="currentColor" className="starred-icon" />}
                      </div>
                      <p className="note-card-content">
                        {note.content ? 
                          ((() => {
                            const textContent = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                            return textContent.length > 150 ? 
                              textContent.substring(0, 150) + '...' : 
                              textContent;
                          })()) : 
                          'No content'
                        }
                      </p>
                      <div className="note-card-footer">
                        <span className="note-card-date">
                          <Clock size={14} />
                          {formatDate(note.updatedAt)}
                        </span>
                        {note.images && note.images.length > 0 && (
                          <span className="note-card-images">
                            <ImageIcon size={14} />
                            {note.images.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <FileText size={48} />
                  <h3>No notes found</h3>
                  <p>{searchTerm ? 'Try a different search term' : 'Create your first note'}</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Notes;