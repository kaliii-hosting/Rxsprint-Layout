import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Calendar, Clock, FileText, Menu, ArrowLeft } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import NoteEditConfirmPopup from '../../components/NoteEditConfirmPopup/NoteEditConfirmPopup';
import NoteSaveConfirmPopup from '../../components/NoteSaveConfirmPopup/NoteSaveConfirmPopup';
import './Notes.css';

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  
  // Popup states
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [editPopupMode, setEditPopupMode] = useState('edit'); // 'edit', 'save', 'delete'
  const [pendingAction, setPendingAction] = useState(null);
  const [savedNoteId, setSavedNoteId] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [showMobileContent, setShowMobileContent] = useState(false);

  const categories = [
    { value: 'general', label: 'General', color: '#FF5500' },
    { value: 'medical', label: 'Medical', color: '#E91E63' },
    { value: 'dosing', label: 'Dosing', color: '#9C27B0' },
    { value: 'protocols', label: 'Protocols', color: '#3F51B5' },
    { value: 'reminders', label: 'Reminders', color: '#00BCD4' }
  ];

  useEffect(() => {
    // Set up real-time listener
    const notesRef = collection(firestore, 'notes');
    const unsubscribe = onSnapshot(notesRef, (snapshot) => {
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
      
      // Sort by updated date, most recent first
      const sortedNotes = notesData.sort((a, b) => b.updatedAt - a.updatedAt);
      setNotes(sortedNotes);
      setLoading(false);
    }, (error) => {
      console.error('Error loading notes:', error);
      setLoading(false);
    });
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const notesRef = collection(firestore, 'notes');
      const snapshot = await getDocs(notesRef);
      
      const notesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
      
      // Sort by updated date, most recent first
      const sortedNotes = notesData.sort((a, b) => b.updatedAt - a.updatedAt);
      
      setNotes(sortedNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setFormData({
      title: '',
      content: '',
      category: 'general'
    });
    
    // Show content on mobile when creating new note
    if (window.innerWidth <= 768) {
      setShowMobileContent(true);
    }
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      category: note.category || 'general'
    });
    setIsEditing(false);
    setIsCreating(false);
    
    // Show content on mobile when note is selected
    if (window.innerWidth <= 768) {
      setShowMobileContent(true);
    }
  };

  const handleEdit = () => {
    // Show PIN confirmation for editing
    setEditPopupMode('edit');
    setShowEditPopup(true);
    setPendingAction(() => () => {
      setIsEditing(true);
    });
  };

  const handleCancel = () => {
    if (isCreating) {
      setIsCreating(false);
      setSelectedNote(null);
      setFormData({
        title: '',
        content: '',
        category: 'general'
      });
      // Go back to list on mobile
      if (window.innerWidth <= 768) {
        setShowMobileContent(false);
      }
    } else if (selectedNote) {
      setFormData({
        title: selectedNote.title || '',
        content: selectedNote.content || '',
        category: selectedNote.category || 'general'
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    // If creating new note, bypass PIN
    if (isCreating) {
      await processSave();
    } else {
      // Show PIN confirmation for saving existing note
      setEditPopupMode('save');
      setShowEditPopup(true);
      setPendingAction(() => processSave);
    }
  };
  
  const processSave = async () => {
    try {
      if (isCreating) {
        // Create new note
        const notesRef = collection(firestore, 'notes');
        const docRef = await addDoc(notesRef, {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        setSavedNoteId(docRef.id);
        setIsCreating(false);
        setConfirmationMessage('New note created successfully');
      } else if (selectedNote) {
        // Update existing note
        const noteRef = doc(firestore, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
        
        setSavedNoteId(selectedNote.id);
        setConfirmationMessage('Note saved successfully');
      }
      
      setIsEditing(false);
      setShowSaveConfirmation(true);
      
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDelete = async (noteId) => {
    // Show PIN confirmation for deletion
    setEditPopupMode('delete');
    setShowEditPopup(true);
    setPendingAction(() => () => processDelete(noteId));
  };
  
  const processDelete = async (noteId) => {
    try {
      await deleteDoc(doc(firestore, 'notes', noteId));
      
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setFormData({
          title: '',
          content: '',
          category: 'general'
        });
      }
      
      setConfirmationMessage('Note deleted successfully');
      setShowSaveConfirmation(true);
      
      // Auto-hide after 2 seconds for deletion
      setTimeout(() => {
        setShowSaveConfirmation(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getCategoryColor = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.color : '#FF5500';
  };
  
  const handleConfirmEdit = () => {
    setShowEditPopup(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };
  
  const handleCancelEdit = () => {
    setShowEditPopup(false);
    setPendingAction(null);
  };
  
  const handleSaveConfirmationClose = () => {
    setShowSaveConfirmation(false);
    setSavedNoteId(null);
  };
  
  const handleViewSavedNote = () => {
    setShowSaveConfirmation(false);
    if (savedNoteId) {
      const note = notes.find(n => n.id === savedNoteId);
      if (note) {
        handleSelectNote(note);
      }
    }
    setSavedNoteId(null);
  };

  const handleBackToList = () => {
    setShowMobileContent(false);
    setSelectedNote(null);
    setIsEditing(false);
  };

  return (
    <div className="notes-page">
      <div className="notes-container">
        {/* Mobile Header */}
        <div className="mobile-header">
          <h2>Notes</h2>
        </div>
        
        {/* Sidebar - always visible on desktop, conditional on mobile */}
        <div className="notes-sidebar">
          <div className="sidebar-header">
            <button 
              className="mobile-back-btn"
              onClick={() => setShowMobileSidebar(false)}
            >
              <ArrowLeft size={20} />
            </button>
            <h2>Notes</h2>
            <button className="create-note-btn" onClick={handleCreateNote}>
              <Plus size={20} />
            </button>
          </div>
          
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="notes-list">
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <p>Loading notes...</p>
              </div>
            ) : filteredNotes.length > 0 ? (
              filteredNotes.map(note => (
                <div
                  key={note.id}
                  className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                  onClick={(e) => {
                    // Don't select note if clicking on delete button
                    if (!e.target.closest('.note-delete-btn')) {
                      handleSelectNote(note);
                    }
                  }}
                >
                  <div className="note-item-header">
                    <h3>{note.title || 'Untitled'}</h3>
                    <div className="note-item-actions">
                      <span 
                        className="note-category"
                        style={{ backgroundColor: getCategoryColor(note.category) }}
                      >
                        {categories.find(c => c.value === note.category)?.label || 'General'}
                      </span>
                      <button
                        className="note-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(note.id);
                        }}
                        title="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="note-preview">
                    {note.content?.substring(0, 100)}
                    {note.content?.length > 100 ? '...' : ''}
                  </p>
                  <div className="note-meta">
                    <Clock size={12} />
                    <span>{formatDate(note.updatedAt)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FileText size={48} />
                <p>No notes found</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Main Content */}
        <div className={`notes-content ${showMobileContent ? 'active' : ''}`}>
          {selectedNote || isCreating ? (
            <div className="note-editor">
              <div className="editor-header">
                <button className="mobile-editor-back" onClick={handleBackToList}>
                  <ArrowLeft size={24} />
                </button>
                {isEditing ? (
                  <>
                    <input
                      type="text"
                      className="note-title-input"
                      placeholder="Note title..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <div className="editor-actions">
                      <select
                        className="category-select"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        style={{ borderColor: getCategoryColor(formData.category) }}
                      >
                        {categories.map(cat => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                      <button className="cancel-btn" onClick={handleCancel}>
                        <X size={18} />
                        Cancel
                      </button>
                      <button className="save-btn" onClick={handleSave}>
                        <Save size={18} />
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="note-title-display">
                      <h1>{formData.title || 'Untitled'}</h1>
                      <span 
                        className="note-category-display"
                        style={{ backgroundColor: getCategoryColor(formData.category) }}
                      >
                        {categories.find(c => c.value === formData.category)?.label || 'General'}
                      </span>
                    </div>
                    <div className="editor-actions">
                      <button className="edit-btn" onClick={handleEdit}>
                        <Edit2 size={18} />
                        Edit
                      </button>
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDelete(selectedNote.id)}
                      >
                        <Trash2 size={18} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <div className="editor-body">
                {isEditing ? (
                  <textarea
                    className="note-content-input"
                    placeholder="Start typing your note..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                ) : (
                  <div className="note-content-display">
                    {formData.content || 'No content'}
                  </div>
                )}
              </div>
              
              {selectedNote && !isCreating && (
                <div className="note-footer">
                  <div className="note-timestamp">
                    <Calendar size={14} />
                    <span>Created: {selectedNote.createdAt?.toLocaleDateString()}</span>
                  </div>
                  <div className="note-timestamp">
                    <Clock size={14} />
                    <span>Updated: {formatDate(selectedNote.updatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-note-selected">
              <FileText size={64} />
              <h2>Select a note to view</h2>
              <p>Choose a note from the sidebar or create a new one</p>
              <button className="create-note-cta" onClick={handleCreateNote}>
                <Plus size={20} />
                Create New Note
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Edit/Delete Confirmation Popup */}
      <NoteEditConfirmPopup
        isOpen={showEditPopup}
        noteTitle={selectedNote?.title || formData.title || 'this note'}
        onConfirm={handleConfirmEdit}
        onCancel={handleCancelEdit}
        mode={editPopupMode}
      />
      
      {/* Save Confirmation Popup */}
      <NoteSaveConfirmPopup
        isOpen={showSaveConfirmation}
        message={confirmationMessage}
        onClose={handleSaveConfirmationClose}
        onViewNote={handleViewSavedNote}
        showButtons={!confirmationMessage.includes('deleted')}
      />
    </div>
  );
};

export default Notes;