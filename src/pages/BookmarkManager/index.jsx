import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Plus, 
  Folder, 
  Link, 
  Edit2, 
  Trash2, 
  Grid3x3, 
  List, 
  Square,
  X,
  ExternalLink,
  FolderOpen,
  Globe,
  Star,
  Clock,
  Tag,
  MoreVertical,
  Move,
  ChevronLeft,
  Settings,
  Download,
  Upload
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { db, auth } from '../../config/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import BookmarkDeletionPopup from './BookmarkDeletionPopup';
import './BookmarkManager.css';

// Drag and Drop Item Types
const ItemTypes = {
  BOOKMARK: 'bookmark',
  FOLDER: 'folder'
};

// Default colors for items - Neon palette
const defaultColors = [
  '#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF',  // Neon pink, orange, yellow, purple, blue
  '#06FFB4', '#FF4365', '#00F5FF', '#C77DFF', '#7209B7',  // Neon mint, coral, cyan, lavender, deep purple
  '#F72585', '#4CC9F0', '#4361EE', '#3F37C9', '#480CA8',  // Hot pink, sky blue, electric blue, royal blue, violet
  '#560BAD', '#B5179E', '#E0AAFF', '#5390D9', '#5E60CE',  // Deep violet, magenta, light purple, cornflower, slate blue
  '#6930C3', '#7400B8', '#9D4EDD', '#BF0603', '#DC2F02'   // Purple, dark purple, bright purple, red, orange red
];

// Default icons
const defaultIcons = {
  bookmark: Globe,
  folder: Folder
};

// Draggable Item Component
const DraggableItem = ({ item, index, moveItem, onOpen, viewMode, onContextMenu, onTouchStart, onTouchEnd }) => {
  const [{ isDragging }, drag] = useDrag({
    type: item.type === 'folder' ? ItemTypes.FOLDER : ItemTypes.BOOKMARK,
    item: { id: item.id, index, type: item.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: [ItemTypes.BOOKMARK, ItemTypes.FOLDER],
    drop: (draggedItem) => {
      if (draggedItem.id !== item.id) {
        moveItem(draggedItem.index, index);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const ref = React.useRef(null);
  drag(drop(ref));

  const handleClick = () => {
    if (item.type === 'folder') {
      onOpen(item);
    } else if (item.url) {
      try {
        // Ensure URL has protocol
        let url = item.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        window.open(url, '_blank');
      } catch (e) {
        console.error('Error opening URL:', e);
      }
    }
  };

  const Icon = item.type === 'folder' ? (item.isOpen ? FolderOpen : Folder) : Globe;

  if (viewMode === 'list') {
    return (
      <div
        ref={ref}
        className={`bookmark-item list-view ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        onContextMenu={(e) => onContextMenu(e, item)}
        onTouchStart={() => onTouchStart(item)}
        onTouchEnd={onTouchEnd}
      >
        <div className="item-content" onClick={handleClick}>
          <div className="item-icon" style={{ color: item.color || defaultColors[0] }}>
            <Icon size={20} />
          </div>
          <div className="item-details">
            <h4>{item.title}</h4>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (Stream Deck style)
  return (
    <div
      ref={ref}
      className={`bookmark-item grid-view ${viewMode} ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
      style={{ 
        backgroundColor: item.color || defaultColors[0],
        opacity: isDragging ? 0.5 : 1
      }}
      onClick={handleClick}
      onContextMenu={(e) => onContextMenu(e, item)}
      onTouchStart={() => onTouchStart(item)}
      onTouchEnd={onTouchEnd}
    >
      <div className="item-icon">
        <Icon size={viewMode === 'compact' ? 24 : 32} />
      </div>
      <h4 className="item-title">{item.title}</h4>
      {item.type === 'bookmark' && viewMode !== 'compact' && item.url && (
        <p className="item-subtitle">
          {(() => {
            try {
              return new URL(item.url).hostname;
            } catch (e) {
              return item.url;
            }
          })()}
        </p>
      )}
    </div>
  );
};

const BookmarkManager = () => {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  // Check if mobile device on initial load
  const isMobile = window.innerWidth <= 768;
  const [viewMode, setViewMode] = useState(isMobile ? 'compact' : 'grid'); // grid, list, compact
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('bookmark'); // bookmark or folder
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  
  // Context menu states
  const [contextMenu, setContextMenu] = useState({
    show: false,
    x: 0,
    y: 0,
    item: null
  });
  const [touchTimer, setTouchTimer] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    color: defaultColors[0],
    folderId: null
  });

  // Handle window resize to maintain mobile view mode
  useEffect(() => {
    const handleResize = () => {
      const isMobileNow = window.innerWidth <= 768;
      // Only auto-switch to compact on mobile if currently in grid mode
      if (isMobileNow && viewMode === 'grid') {
        setViewMode('compact');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Firebase listeners
  useEffect(() => {
    // Check if db is available
    if (!db) {
      console.error('Firestore database is not initialized');
      setLoading(false);
      return;
    }
    
    // Use a default user ID if no auth is set up
    const userId = auth?.currentUser?.uid || 'default-user';
    
    try {
      // Subscribe to bookmarks - simplified query
      const bookmarksQuery = collection(db, 'bookmarks');

      const unsubscribeBookmarks = onSnapshot(
        bookmarksQuery, 
        (snapshot) => {
          const bookmarksData = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              type: 'bookmark'
            }))
            .filter(item => item.userId === userId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setBookmarks(bookmarksData);
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching bookmarks:', error);
          setLoading(false);
        }
      );

      // Subscribe to folders - simplified query
      const foldersQuery = collection(db, 'folders');

      const unsubscribeFolders = onSnapshot(
        foldersQuery,
        (snapshot) => {
          const foldersData = snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data(),
              type: 'folder'
            }))
            .filter(item => item.userId === userId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
          setFolders(foldersData);
        },
        (error) => {
          console.error('Error fetching folders:', error);
        }
      );

      return () => {
        unsubscribeBookmarks();
        unsubscribeFolders();
      };
    } catch (error) {
      console.error('Error setting up Firebase listeners:', error);
      setLoading(false);
    }
  }, []);

  // Get items for current view
  const getCurrentItems = useCallback(() => {
    let items = [];
    
    if (currentFolder) {
      // Show items in current folder
      items = bookmarks.filter(b => b.folderId === currentFolder.id);
    } else {
      // Show root level items
      items = [
        ...folders.filter(f => !f.parentId),
        ...bookmarks.filter(b => !b.folderId)
      ];
    }

    return items.sort((a, b) => a.order - b.order);
  }, [bookmarks, folders, currentFolder]);

  // Move item (drag and drop)
  const moveItem = useCallback(async (fromIndex, toIndex) => {
    const items = getCurrentItems();
    const draggedItem = items[fromIndex];
    const newItems = [...items];
    
    // Remove from old position
    newItems.splice(fromIndex, 1);
    // Insert at new position
    newItems.splice(toIndex, 0, draggedItem);

    // Update order in Firebase
    const updates = newItems.map((item, index) => ({
      ...item,
      order: index
    }));

    // Batch update
    for (const item of updates) {
      const collection = item.type === 'folder' ? 'folders' : 'bookmarks';
      await setDoc(doc(db, collection, item.id), {
        ...item,
        order: item.order
      }, { merge: true });
    }
  }, [getCurrentItems]);

  // Add new item
  const handleAdd = async () => {
    if (!formData.title || (modalType === 'bookmark' && !formData.url)) return;

    // Validate URL for bookmarks
    if (modalType === 'bookmark' && formData.url) {
      let validUrl = formData.url;
      // Add protocol if missing
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl;
      }
      
      try {
        new URL(validUrl);
        formData.url = validUrl;
      } catch (e) {
        console.error('Invalid URL:', formData.url);
        alert('Please enter a valid URL');
        return;
      }
    }

    const userId = auth?.currentUser?.uid || 'default-user';
    const items = getCurrentItems();
    const newOrder = items.length;

    const newItem = {
      title: formData.title,
      color: formData.color,
      userId,
      order: newOrder,
      createdAt: new Date(),
      ...(modalType === 'bookmark' ? {
        url: formData.url,
        folderId: currentFolder?.id || null
      } : {
        parentId: currentFolder?.id || null
      })
    };

    const collection = modalType === 'folder' ? 'folders' : 'bookmarks';
    await setDoc(doc(db, collection, `${userId}_${Date.now()}`), newItem);

    setShowAddModal(false);
    resetForm();
  };

  // Edit item
  const handleEdit = async () => {
    if (!editingItem || !formData.title) return;

    // Validate URL for bookmarks
    if (editingItem.type === 'bookmark' && formData.url) {
      let validUrl = formData.url;
      // Add protocol if missing
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl;
      }
      
      try {
        new URL(validUrl);
        formData.url = validUrl;
      } catch (e) {
        console.error('Invalid URL:', formData.url);
        alert('Please enter a valid URL');
        return;
      }
    }

    const collection = editingItem.type === 'folder' ? 'folders' : 'bookmarks';
    await setDoc(doc(db, collection, editingItem.id), {
      ...editingItem,
      title: formData.title,
      color: formData.color,
      ...(editingItem.type === 'bookmark' && { url: formData.url })
    }, { merge: true });

    setShowEditModal(false);
    setEditingItem(null);
    resetForm();
  };

  // Open folder
  const handleOpenFolder = (folder) => {
    setCurrentFolder(folder);
  };

  // Navigate back
  const handleBack = () => {
    if (currentFolder?.parentId) {
      const parentFolder = folders.find(f => f.id === currentFolder.parentId);
      setCurrentFolder(parentFolder || null);
    } else {
      setCurrentFolder(null);
    }
  };

  // Open add modal
  const openAddModal = (type) => {
    setModalType(type);
    setShowAddModal(true);
    resetForm();
  };

  // Open edit modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setModalType(item.type);
    setFormData({
      title: item.title,
      url: item.url || '',
      color: item.color || defaultColors[0],
      folderId: item.folderId || null
    });
    setShowEditModal(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      url: '',
      color: defaultColors[0],
      folderId: null
    });
  };

  const currentItems = getCurrentItems();

  // Show delete confirmation
  const showDeleteConfirmation = (item) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  // Context menu handlers
  const handleContextMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const handleTouchStart = (item) => {
    const timer = setTimeout(() => {
      // Get the touch position from the ongoing touch
      const touch = window.event?.touches?.[0];
      if (touch) {
        setContextMenu({
          show: true,
          x: touch.clientX,
          y: touch.clientY,
          item
        });
      }
    }, 500); // 500ms hold
    setTouchTimer(timer);
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
  };

  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, item: null });
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => closeContextMenu();
    if (contextMenu.show) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.show]);

  // Delete item after confirmation
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    if (!db) {
      console.error('Database not initialized');
      alert('Database connection error. Please refresh the page.');
      return;
    }
    
    try {
      if (itemToDelete.type === 'folder') {
        await deleteDoc(doc(db, 'folders', itemToDelete.id));
      } else {
        await deleteDoc(doc(db, 'bookmarks', itemToDelete.id));
      }
      
      // If it's a folder, also delete all bookmarks inside it
      if (itemToDelete.type === 'folder') {
        const bookmarksInFolder = bookmarks.filter(b => b.folderId === itemToDelete.id);
        for (const bookmark of bookmarksInFolder) {
          await deleteDoc(doc(db, 'bookmarks', bookmark.id));
        }
      }
      
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`bookmark-manager ${theme} page-container`}>
        {/* Toggle Banner - Analyzer Style */}
        <div className="section-toggle-banner">
          {currentFolder && (
            <button className="toggle-btn" onClick={handleBack}>
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <button
            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 size={16} />
            <span>Grid</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
            <span>List</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => setViewMode('compact')}
          >
            <Square size={16} />
            <span>Compact</span>
          </button>
          <button className="toggle-btn" onClick={() => openAddModal('folder')}>
            <Folder size={16} />
            <span>New Folder</span>
          </button>
          <button className="toggle-btn" onClick={() => openAddModal('bookmark')}>
            <Plus size={16} />
            <span>Add Bookmark</span>
          </button>
        </div>

        {/* Content */}
        <div className={`bookmark-content ${viewMode}-view`}>
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading bookmarks...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="empty-state">
              <Globe size={64} />
              <h3>No bookmarks yet</h3>
              <p>Add your first bookmark to get started</p>
              <button className="add-first-btn" onClick={() => openAddModal('bookmark')}>
                <Plus size={18} />
                Add Bookmark
              </button>
            </div>
          ) : (
            <div className={`items-grid ${viewMode}`}>
              {currentItems.map((item, index) => (
                <DraggableItem
                  key={item.id}
                  item={item}
                  index={index}
                  moveItem={moveItem}
                  onOpen={handleOpenFolder}
                  viewMode={viewMode}
                  onContextMenu={handleContextMenu}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                />
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="modal-overlay" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {showEditModal ? 'Edit' : 'Add'} {modalType === 'folder' ? 'Folder' : 'Bookmark'}
                </h2>
                <button className="close-btn" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label>Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={`Enter ${modalType} title`}
                    autoFocus
                  />
                </div>

                {modalType === 'bookmark' && (
                  <div className="form-group">
                    <label>URL</label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Color</label>
                  <div className="color-picker">
                    {defaultColors.map(color => (
                      <button
                        key={color}
                        className={`color-option ${formData.color === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                  Cancel
                </button>
                <button 
                  className="save-btn" 
                  onClick={showEditModal ? handleEdit : handleAdd}
                  disabled={!formData.title || (modalType === 'bookmark' && !formData.url)}
                >
                  {showEditModal ? 'Save Changes' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Popup */}
        <BookmarkDeletionPopup
          isOpen={showDeleteConfirm}
          item={itemToDelete}
          onConfirm={handleDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setItemToDelete(null);
          }}
        />

        {/* Context Menu */}
        {contextMenu.show && (
          <div 
            className="context-menu" 
            style={{ 
              top: contextMenu.y, 
              left: contextMenu.x,
              position: 'fixed',
              zIndex: 1001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="context-menu-item" 
              onClick={() => {
                openEditModal(contextMenu.item);
                closeContextMenu();
              }}
            >
              <Edit2 size={16} />
              <span>Edit</span>
            </button>
            <button 
              className="context-menu-item delete" 
              onClick={() => {
                showDeleteConfirmation(contextMenu.item);
                closeContextMenu();
              }}
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default BookmarkManager;