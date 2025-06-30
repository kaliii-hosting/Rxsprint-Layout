import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Save, X, Calendar, Clock, FileText, Star } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { firestore as db } from '../../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import './Notes.css';

const Notes = () => {
  const { theme } = useTheme();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    starred: false
  });
  
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

  const handleCreateNote = () => {
    setIsCreating(true);
    setIsEditing(true);
    setSelectedNote(null);
    setFormData({
      title: 'New Note',
      content: '',
      starred: false
    });
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setFormData({
      title: note.title || '',
      content: note.content || '',
      starred: note.starred || false
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
        const docRef = await addDoc(notesRef, {
          ...formData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
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
      setFormData({ title: '', content: '', starred: false });
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

  // Handle paste event for Excel tables
  const handlePaste = (e) => {
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
  
  // Render content with HTML support for tables
  const renderContent = (content) => {
    if (!content) return <p className="empty-content">No content</p>;
    
    // Check if content contains HTML table
    if (content.includes('<table>')) {
      // Split content by tables to handle mixed content
      const parts = content.split(/(<table>[\s\S]*?<\/table>)/g);
      
      return (
        <div className="note-content-wrapper">
          {parts.map((part, index) => {
            if (part.startsWith('<table>')) {
              // Render table as HTML
              return (
                <div 
                  key={index}
                  className="table-container"
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
    
    // Regular content without tables
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
      <div className="notes-header">
        <div className="notes-header-content">
          <div className="notes-header-title">
            <FileText size={32} />
            <div>
              <h1>Notes</h1>
              <p>Create and manage your notes</p>
            </div>
          </div>
          <div className="notes-header-actions">
            <button className="notes-action-btn secondary" onClick={() => setSearchTerm('')}>
              <Search size={18} />
              <span>Clear Search</span>
            </button>
            <button className="notes-action-btn primary" onClick={handleCreateNote}>
              <Plus size={18} />
              <span>New Note</span>
            </button>
          </div>
        </div>
      </div>

      <div className="notes-layout">
        {/* Mobile backdrop */}
        <div 
          className={`mobile-backdrop ${isMobileMenuOpen ? 'show' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        
        {/* Sidebar with notes list */}
        <div className={`notes-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="sidebar-header">
            <h2>My Notes</h2>
            <button className="new-note-btn" onClick={handleCreateNote} title="Create new note">
              <Plus size={20} />
            </button>
          </div>
          
          <div className="sidebar-search">
            <Search size={18} />
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
                  onClick={() => handleSelectNote(note)}
                >
                  <div className="note-item-header">
                    <h3>{note.title || 'Untitled'}</h3>
                    <button
                      className={`star-btn ${note.starred ? 'starred' : ''}`}
                      onClick={(e) => toggleStar(note, e)}
                    >
                      <Star size={16} fill={note.starred ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <p className="note-preview">
                    {note.content ? 
                      ((() => {
                        // Strip HTML tags for preview
                        const textContent = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                        return textContent.length > 60 ? 
                          textContent.substring(0, 60) + '...' : 
                          textContent;
                      })()
                      ) : 
                      'No content'
                    }
                  </p>
                  <span className="note-date">{formatDate(note.updatedAt)}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <FileText size={48} />
                <h3>No notes found</h3>
                <p>{searchTerm ? 'Try a different search term' : 'Create your first note'}</p>
              </div>
            )}
          </div>
        </div>

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
                            setFormData({ title: '', content: '', starred: false });
                          } else {
                            setFormData({
                              title: selectedNote?.title || '',
                              content: selectedNote?.content || '',
                              starred: selectedNote?.starred || false
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
              
              <div className="note-editor">
                {isEditing || isCreating ? (
                  <textarea
                    className="note-textarea"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    onPaste={handlePaste}
                    placeholder="Start typing your note..."
                  />
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

    </div>
  );
};

export default Notes;