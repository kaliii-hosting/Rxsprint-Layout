import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Calendar, Clock, FileText, Star, Filter, ChevronDown } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../config/firebase';
import { useTheme } from '../../contexts/ThemeContext';
import './Notes.css';

const Notes = () => {
  const { theme } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState('updated');
  const [selectAll, setSelectAll] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    starred: false
  });
  
  // Simple confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState(null);
  
  // Sort field and direction states
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    if (!firestore) {
      console.warn('Firestore not available, running in offline mode');
      setLoading(false);
      return;
    }

    try {
      const notesRef = collection(firestore, 'notes');
      const unsubscribe = onSnapshot(notesRef, (snapshot) => {
        const notesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          selected: false
        }));
        
        setNotes(notesData);
        setLoading(false);
      }, (error) => {
        console.error('Error loading notes:', error);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Firebase connection error:', error);
      setLoading(false);
    }
  }, []);

  const handleCreateNote = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setFormData({
      title: '',
      content: '',
      starred: false
    });
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setNotes(notes.map(note => ({ ...note, selected: newSelectAll })));
  };

  const handleSelectNote = (id) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, selected: !note.selected } : note
    ));
  };
  
  const handleRowClick = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      starred: note.starred || false
    });
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (isCreating) {
      setIsCreating(false);
      setSelectedNote(null);
      setFormData({
        title: '',
        content: '',
        starred: false
      });
    } else if (selectedNote) {
      setFormData({
        title: selectedNote.title || '',
        content: selectedNote.content || '',
        starred: selectedNote.starred || false
      });
    }
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title for the note.');
      return;
    }

    if (!firestore) {
      alert('Database connection not available. Please check your connection.');
      return;
    }

    try {
      if (isCreating) {
        const notesRef = collection(firestore, 'notes');
        const docRef = await addDoc(notesRef, {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        setIsCreating(false);
        setSelectedNote({ id: docRef.id, ...formData });
      } else if (selectedNote) {
        const noteRef = doc(firestore, 'notes', selectedNote.id);
        await updateDoc(noteRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDelete = (noteId) => {
    setDeleteNoteId(noteId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteNoteId || !firestore) return;
    
    try {
      await deleteDoc(doc(firestore, 'notes', deleteNoteId));
      
      if (selectedNote?.id === deleteNoteId) {
        setSelectedNote(null);
        setFormData({
          title: '',
          content: '',
          category: 'general',
          starred: false
        });
        setIsCreating(false);
        setIsEditing(false);
      }
      
      setShowDeleteConfirm(false);
      setDeleteNoteId(null);
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const toggleStar = async (note) => {
    if (!firestore) return;
    
    try {
      const noteRef = doc(firestore, 'notes', note.id);
      await updateDoc(noteRef, {
        starred: !note.starred
      });
    } catch (error) {
      console.error('Error updating star status:', error);
    }
  };

  // Filter and sort notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Sorting function
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort notes
  const getFilteredAndSortedNotes = () => {
    let filtered = [...filteredNotes];

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = a[sortField] || '';
        let bValue = b[sortField] || '';

        // Convert to uppercase for case-insensitive sorting
        if (typeof aValue === 'string') aValue = aValue.toUpperCase();
        if (typeof bValue === 'string') bValue = bValue.toUpperCase();

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const displayNotes = getFilteredAndSortedNotes();

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

  // Handler for Edit button
  const handleEditSelected = () => {
    const selectedNotes = notes.filter(note => note.selected);
    if (selectedNotes.length === 0) {
      alert('Please select a note to edit');
      return;
    }
    if (selectedNotes.length > 1) {
      alert('Please select only one note to edit');
      return;
    }
    handleRowClick(selectedNotes[0]);
    setIsEditing(true);
  };

  // Handler for Delete button
  const handleDeleteSelected = () => {
    const selectedNotes = notes.filter(note => note.selected);
    if (selectedNotes.length === 0) {
      alert('Please select at least one note to delete');
      return;
    }
    if (selectedNotes.length === 1) {
      handleDelete(selectedNotes[0].id);
    } else {
      if (confirm(`Are you sure you want to delete ${selectedNotes.length} notes?`)) {
        selectedNotes.forEach(note => handleDelete(note.id));
      }
    }
  };

  const closeNote = () => {
    setSelectedNote(null);
    setIsEditing(false);
    setIsCreating(false);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      starred: false
    });
  };

  return (
    <div className="notes-page page-container">
      <div className="notes-content">
        <div className="notes-dashboard">
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Notes Database</h3>
              <FileText size={24} />
            </div>
            <div className="card-body">
              <div className="filter-options">
                <div className="search-container">
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <div className="results-count">{displayNotes.length} Results</div>
              </div>
              
              <div className="notes-container">
                {loading ? (
                  <div className="loading-state">
                    <div className="spinner" />
                    <p>Loading notes...</p>
                  </div>
                ) : displayNotes.length > 0 ? (
                  <div className="table-wrapper">
                    <table className="prescriptions-table">
                      <thead>
                        <tr>
                          <th className="checkbox-cell">
                            <div className="add-icon" onClick={handleCreateNote}>+</div>
                          </th>
                          <th className="sortable" onClick={() => handleSort('title')}>
                            <span>Title</span>
                            {sortField === 'title' && (
                              <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                            )}
                          </th>
                          <th className="sortable" onClick={() => handleSort('content')}>
                            <span>Content Preview</span>
                            {sortField === 'content' && (
                              <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                            )}
                          </th>
                          <th className="sortable" onClick={() => handleSort('updatedAt')}>
                            <span>Last Updated</span>
                            {sortField === 'updatedAt' && (
                              <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                            )}
                          </th>
                          <th>Starred</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayNotes.map((note, index) => (
                          <tr 
                            key={note.id} 
                            className="prescription-row"
                            onClick={(e) => {
                              if (!e.target.closest('.checkbox-cell') && !e.target.closest('.view-link')) {
                                handleRowClick(note);
                              }
                            }}
                          >
                            <td className="checkbox-cell">
                              <input
                                type="checkbox"
                                className="prescription-checkbox"
                                checked={note.selected || false}
                                onChange={() => handleSelectNote(note.id)}
                              />
                            </td>
                            <td className="brand-name">{note.title?.toUpperCase() || 'UNTITLED'}</td>
                            <td className="generic-name">
                              {note.content ? 
                                (note.content.length > 100 ? 
                                  note.content.substring(0, 100) + '...' : 
                                  note.content
                                ) : 
                                'No content'
                              }
                            </td>
                            <td className="dosage-form">{formatDate(note.updatedAt)}</td>
                            <td className="vial-size">
                              {note.starred ? (
                                <Star size={16} className="starred-icon" fill="currentColor" />
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    <div className="action-buttons prescription-actions">
                      <button className="calculate-btn add-note-btn" onClick={handleCreateNote}>
                        <Plus size={16} />
                        Add New Note
                      </button>
                      <button className="reset-btn edit" onClick={handleEditSelected}>
                        <Edit2 size={16} />
                        Edit
                      </button>
                      <button className="reset-btn delete" onClick={handleDeleteSelected}>
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>No notes added yet</h3>
                    <p>Click "Add Note" to start adding notes</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Editor Modal */}
      {(selectedNote || isCreating) && (
        <div className="modal-overlay" onClick={closeNote}>
          <div className="note-editor-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isCreating ? 'Create New Note' : (isEditing ? 'Edit Note' : 'View Note')}</h2>
              <button 
                className="close-btn"
                onClick={closeNote}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {isEditing || isCreating ? (
                <div className="note-form-section">
                  <div className="section-header">
                    <h3>Note Details</h3>
                    <FileText size={20} />
                  </div>
                  <div className="input-grid">
                    <div className="input-group">
                      <label>Note Title</label>
                      <input
                        type="text"
                        className="pump-input"
                        placeholder="Enter note title..."
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        autoFocus
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>Note Content</label>
                      <textarea
                        className="pump-input note-textarea"
                        placeholder="Write your note here..."
                        value={formData.content}
                        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        rows="12"
                      />
                    </div>

                    <div className="input-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.starred}
                          onChange={(e) => setFormData({ ...formData, starred: e.target.checked })}
                        />
                        <span>Star this note for quick access</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="note-view-section">
                  <div className="section-header">
                    <h3>{formData.title || 'Untitled'}</h3>
                    {selectedNote?.starred && (
                      <Star className="starred-indicator" size={20} fill="#ff5500" />
                    )}
                  </div>
                  
                  <div className="note-meta-info">
                    {selectedNote && (
                      <div className="timestamps">
                        <span className="timestamp">
                          <Calendar size={14} />
                          Created {selectedNote.createdAt?.toLocaleDateString()}
                        </span>
                        <span className="timestamp">
                          <Clock size={14} />
                          Updated {formatDate(selectedNote.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="note-content-display">
                    <div className="content-wrapper">
                      {formData.content || <em style={{ color: '#999' }}>No content</em>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="action-buttons modal-footer">
              {isEditing || isCreating ? (
                <>
                  <button className="reset-btn" onClick={handleCancel}>
                    Cancel
                  </button>
                  <button className="calculate-btn" onClick={handleSave}>
                    <Save size={16} />
                    Save Note
                  </button>
                </>
              ) : (
                <>
                  <button className="reset-btn" onClick={() => handleDelete(selectedNote.id)}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                  <button className="calculate-btn" onClick={handleEdit}>
                    <Edit2 size={16} />
                    Edit Note
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Note</h3>
              <button 
                className="close-modal-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this note? This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="delete-confirm-btn"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notes;