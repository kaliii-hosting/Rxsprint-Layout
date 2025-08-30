import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  Plus, 
  Search, 
  User, 
  Mail, 
  MapPin, 
  Building,
  Edit,
  Trash2,
  X,
  Check,
  ChevronRight,
  UserPlus,
  Star,
  Save,
  Users
} from 'lucide-react';
import { db, storage } from '../../config/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Phones.css';

const Phones = () => {
  // Device mode detection
  const [deviceMode, setDeviceMode] = useState('desktop');
  
  useEffect(() => {
    const checkDeviceMode = () => {
      const width = window.innerWidth;
      if (width <= 768) {
        setDeviceMode('mobile');
      } else if (width <= 1024) {
        setDeviceMode('tablet');
      } else {
        setDeviceMode('desktop');
      }
    };
    
    checkDeviceMode();
    window.addEventListener('resize', checkDeviceMode);
    return () => window.removeEventListener('resize', checkDeviceMode);
  }, []);
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, contactId: null });
  const [groups, setGroups] = useState(['Family', 'Work', 'Friends']);
  const [selectedGroup, setSelectedGroup] = useState('All Contacts');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state for new/edit contact
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phones: [{ value: '', type: 'mobile' }],
    emails: [{ value: '', type: 'personal' }],
    address: '',
    notes: '',
    favorite: false,
    photoURL: ''
  });

  // Load contacts from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'phoneContacts'),
      (snapshot) => {
        const contactsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort alphabetically by name
        contactsList.sort((a, b) => {
          const nameA = (a.name || a.firstName || '').toLowerCase();
          const nameB = (b.name || b.firstName || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setContacts(contactsList);
        
        // Update selectedContact if it exists in the updated list
        if (selectedContact) {
          const updatedContact = contactsList.find(c => c.id === selectedContact.id);
          if (updatedContact) {
            setSelectedContact(updatedContact);
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching contacts:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedContact?.id]); // Only depend on the ID to avoid infinite loops

  // Group contacts alphabetically
  const groupedContacts = useMemo(() => {
    const filtered = contacts.filter(contact => {
      const searchLower = searchQuery.toLowerCase();
      const contactName = (contact.name || contact.firstName || '').toLowerCase();
      const phoneMatch = contact.phones?.some(p => p.value?.includes(searchQuery)) || contact.phone?.includes(searchQuery);
      const emailMatch = contact.emails?.some(e => e.value?.toLowerCase().includes(searchLower)) || contact.email?.toLowerCase().includes(searchLower);
      return contactName.includes(searchLower) ||
             phoneMatch ||
             emailMatch ||
             contact.company?.toLowerCase().includes(searchLower);
    });

    const grouped = {};
    filtered.forEach(contact => {
      const nameToUse = contact.name || contact.firstName || '#';
      const firstLetter = nameToUse[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(contact);
    });

    return grouped;
  }, [contacts, searchQuery]);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      setUploadingImage(true);
      try {
        const storageRef = ref(storage, `contact-photos/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Update form data with the download URL
        setFormData(prev => ({ ...prev, photoURL: downloadURL }));
        
        // Also update the image preview to use the actual URL
        setImagePreview(downloadURL);
        console.log('Image uploaded successfully:', downloadURL);
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  // Save contact to Firebase
  const saveContact = async () => {
    try {
      const contactData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };

      if (editingContact) {
        // Update existing contact
        await updateDoc(doc(db, 'phoneContacts', editingContact.id), contactData);
        
        // Update selectedContact if we're editing the currently selected contact
        if (selectedContact?.id === editingContact.id) {
          setSelectedContact({
            ...selectedContact,
            ...contactData,
            id: editingContact.id
          });
        }
      } else {
        // Create new contact
        const newContactRef = doc(collection(db, 'phoneContacts'));
        await setDoc(newContactRef, {
          ...contactData,
          createdAt: new Date().toISOString()
        });
        
        // Select the newly created contact
        const newContact = {
          ...contactData,
          id: newContactRef.id,
          createdAt: new Date().toISOString()
        };
        setSelectedContact(newContact);
      }

      // Reset form
      setFormData({
        name: '',
        company: '',
        phones: [{ value: '', type: 'mobile' }],
        emails: [{ value: '', type: 'personal' }],
        address: '',
        notes: '',
        favorite: false,
        photoURL: ''
      });
      setImagePreview(null);
      setShowAddContact(false);
      setEditingContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact. Please try again.');
    }
  };

  // Delete contact
  const deleteContact = async (contactId) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteDoc(doc(db, 'phoneContacts', contactId));
        setSelectedContact(null);
      } catch (error) {
        console.error('Error deleting contact:', error);
      }
    }
  };

  // Toggle favorite
  const toggleFavorite = async (contact) => {
    try {
      await updateDoc(doc(db, 'phoneContacts', contact.id), {
        favorite: !contact.favorite
      });
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  // Start editing
  const startEdit = (contact) => {
    setEditingContact(contact);
    // Convert old format to new format if needed
    const phones = contact.phones || [];
    if (contact.phone && !phones.find(p => p.value === contact.phone)) {
      phones.push({ value: contact.phone, type: 'phone' });
    }
    if (contact.mobile && !phones.find(p => p.value === contact.mobile)) {
      phones.push({ value: contact.mobile, type: 'mobile' });
    }
    const emails = contact.emails || [];
    if (contact.email && !emails.find(e => e.value === contact.email)) {
      emails.push({ value: contact.email, type: 'personal' });
    }
    
    setFormData({
      name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      company: contact.company || '',
      phones: phones.length > 0 ? phones : [{ value: '', type: 'mobile' }],
      emails: emails.length > 0 ? emails : [{ value: '', type: 'personal' }],
      address: contact.address || '',
      notes: contact.notes || '',
      favorite: contact.favorite || false,
      photoURL: contact.photoURL || ''
    });
    setImagePreview(contact.photoURL || null);
    setShowAddContact(true);
  };

  const getInitials = (contact) => {
    const name = contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <div className="phones-page">
      {/* Board-style Toolbar */}
      <div className={`board-toolbar board-toolbar-${deviceMode}`}>
        {/* Title Section */}
        <div className="toolbar-section title-section">
          <h1 className="toolbar-title">Contacts</h1>
          <span className="contact-count">{contacts.length}</span>
        </div>

        {/* Search Section */}
        <div className="toolbar-section search-section flex-grow">
          <div className="toolbar-search">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div className="toolbar-section actions">
          {showAddContact && (
            <>
              <button 
                className="tool-button secondary"
                onClick={() => {
                  setShowAddContact(false);
                  setEditingContact(null);
                }}
                title="Cancel"
              >
                <X size={deviceMode === 'mobile' ? 18 : 20} />
                {deviceMode !== 'mobile' && <span>Cancel</span>}
              </button>
              <button 
                className="tool-button primary"
                onClick={saveContact}
                disabled={!formData.name}
                title="Save Contact"
              >
                <Save size={deviceMode === 'mobile' ? 18 : 20} />
              </button>
            </>
          )}
          {!showAddContact && (
            <button 
              className="tool-button primary"
              onClick={() => {
                setShowAddContact(true);
                setEditingContact(null);
                setFormData({
                  name: '',
                  company: '',
                  phones: [{ value: '', type: 'mobile' }],
                  emails: [{ value: '', type: 'personal' }],
                  address: '',
                  notes: '',
                  favorite: false,
                  photoURL: ''
                });
                setImagePreview(null);
              }}
              title="Add Contact"
            >
              <Plus size={deviceMode === 'mobile' ? 18 : 20} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="phones-content">
        {/* Apple-style Contacts Container */}
        <div className="apple-contacts-container">
          {/* Groups Sidebar */}
          <div className="groups-sidebar">
            <div className="groups-header">
              <span>Groups</span>
              <button className="add-group-btn" title="Add Group">
                <Plus size={14} />
              </button>
            </div>
            <div className="groups-list">
              <div 
                className={`group-item ${selectedGroup === 'All Contacts' ? 'active' : ''}`}
                onClick={() => setSelectedGroup('All Contacts')}
              >
                All Contacts
              </div>
              {groups.map(group => (
                <div 
                  key={group}
                  className={`group-item ${selectedGroup === group ? 'active' : ''}`}
                  onClick={() => setSelectedGroup(group)}
                >
                  {group}
                </div>
              ))}
            </div>
          </div>

          {/* Contacts List */}
          <div className="contacts-list apple-style">
            {/* Search Bar */}
            <div className="apple-search-bar">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Contacts */}
            <div className="contacts-scroll">
              {loading ? (
                <div className="loading-state">Loading contacts...</div>
              ) : Object.keys(groupedContacts).length === 0 ? (
                <div className="empty-state">
                  <User size={48} />
                  <p>No contacts found</p>
                </div>
              ) : (
                Object.keys(groupedContacts).sort().map(letter => (
                  <div key={letter} className="contact-group" id={`letter-${letter}`}>
                    <div className="group-letter">{letter}</div>
                    {groupedContacts[letter].map(contact => (
                      <div
                        key={contact.id}
                        className={`apple-contact-item ${selectedContact?.id === contact.id ? 'selected' : ''}`}
                        onClick={() => setSelectedContact(contact)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            contactId: contact.id
                          });
                        }}
                      >
                        <div className="contact-name">
                          {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Alphabet Navigation */}
          <div className="alphabet-nav">
            {Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(letter => (
              <div
                key={letter}
                className={`nav-letter ${groupedContacts[letter] ? 'active' : ''}`}
                onClick={() => {
                  const element = document.getElementById(`letter-${letter}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="context-menu"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onMouseLeave={() => setContextMenu({ visible: false, x: 0, y: 0, contactId: null })}
          >
            <div className="context-menu-item" onClick={() => {
              // Add to group logic
              setContextMenu({ visible: false, x: 0, y: 0, contactId: null });
            }}>
              <Users size={14} />
              <span>Add to Group</span>
            </div>
            <div className="context-menu-item" onClick={() => {
              const contact = contacts.find(c => c.id === contextMenu.contactId);
              if (contact) {
                toggleFavorite(contact);
              }
              setContextMenu({ visible: false, x: 0, y: 0, contactId: null });
            }}>
              <Star size={14} />
              <span>Add to Favorites</span>
            </div>
            <div className="context-menu-separator"></div>
            <div className="context-menu-item danger" onClick={() => {
              if (contextMenu.contactId) {
                deleteContact(contextMenu.contactId);
              }
              setContextMenu({ visible: false, x: 0, y: 0, contactId: null });
            }}>
              <Trash2 size={14} />
              <span>Delete Contact</span>
            </div>
          </div>
        )}

        {/* Contact Details / Add Form */}
        {(selectedContact || showAddContact) && (
          <div className="contact-details">
            {showAddContact ? (
              /* Add/Edit Contact Form */
              <div className="contact-form">
                <div className="form-header">
                  <h2>{editingContact ? 'Edit Contact' : 'New Contact'}</h2>
                </div>

                <div className="form-body">
                  {/* Photo Upload */}
                  <div className="photo-upload-section">
                    <div className="photo-preview">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Contact" />
                      ) : (
                        <div className="photo-placeholder">
                          <UserPlus size={32} />
                        </div>
                      )}
                    </div>
                    <label className="photo-upload-btn">
                      {uploadingImage ? 'Uploading...' : 'Add Photo'}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        hidden
                      />
                    </label>
                  </div>

                  {/* Form Fields */}
                  <div className="form-fields">
                    {/* Name and Company Section */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          placeholder="Enter full name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Company</label>
                        <input
                          type="text"
                          placeholder="Enter company"
                          value={formData.company}
                          onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* Phone Numbers Section */}
                    <div className="form-section">
                      <label className="section-label">Phone Numbers</label>
                      {formData.phones.map((phone, index) => (
                        <div key={index} className="form-row multi-field">
                          <div className="form-group flex-grow">
                            <input
                              type="tel"
                              placeholder="(000) 000-0000"
                              value={phone.value}
                              onChange={(e) => {
                                const newPhones = [...formData.phones];
                                newPhones[index].value = e.target.value;
                                setFormData(prev => ({ ...prev, phones: newPhones }));
                              }}
                            />
                          </div>
                          <select
                            className="field-type"
                            value={phone.type}
                            onChange={(e) => {
                              const newPhones = [...formData.phones];
                              newPhones[index].type = e.target.value;
                              setFormData(prev => ({ ...prev, phones: newPhones }));
                            }}
                          >
                            <option value="mobile">Mobile</option>
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="main">Main</option>
                          </select>
                          {index > 0 && (
                            <button
                              type="button"
                              className="remove-field-btn"
                              onClick={() => {
                                const newPhones = formData.phones.filter((_, i) => i !== index);
                                setFormData(prev => ({ ...prev, phones: newPhones }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-field-btn"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            phones: [...prev.phones, { value: '', type: 'mobile' }]
                          }));
                        }}
                      >
                        <Plus size={16} /> Add Phone
                      </button>
                    </div>

                    {/* Email Addresses Section */}
                    <div className="form-section">
                      <label className="section-label">Email Addresses</label>
                      {formData.emails.map((email, index) => (
                        <div key={index} className="form-row multi-field">
                          <div className="form-group flex-grow">
                            <input
                              type="email"
                              placeholder="email@example.com"
                              value={email.value}
                              onChange={(e) => {
                                const newEmails = [...formData.emails];
                                newEmails[index].value = e.target.value;
                                setFormData(prev => ({ ...prev, emails: newEmails }));
                              }}
                            />
                          </div>
                          <select
                            className="field-type"
                            value={email.type}
                            onChange={(e) => {
                              const newEmails = [...formData.emails];
                              newEmails[index].type = e.target.value;
                              setFormData(prev => ({ ...prev, emails: newEmails }));
                            }}
                          >
                            <option value="personal">Personal</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </select>
                          {index > 0 && (
                            <button
                              type="button"
                              className="remove-field-btn"
                              onClick={() => {
                                const newEmails = formData.emails.filter((_, i) => i !== index);
                                setFormData(prev => ({ ...prev, emails: newEmails }));
                              }}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        className="add-field-btn"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            emails: [...prev.emails, { value: '', type: 'personal' }]
                          }));
                        }}
                      >
                        <Plus size={16} /> Add Email
                      </button>
                    </div>

                    <div className="form-group full-width">
                      <label>Address</label>
                      <textarea
                        placeholder="Enter full address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Notes</label>
                      <textarea
                        placeholder="Additional notes or comments"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>

                    <div className="form-group checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.favorite}
                          onChange={(e) => setFormData(prev => ({ ...prev, favorite: e.target.checked }))}
                        />
                        <span>Add to Favorites</span>
                        <Star size={16} className={formData.favorite ? 'star-checked' : ''} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Contact Details View */
              <div className="contact-view">
                <div className="contact-view-header">
                  <div className="contact-view-avatar">
                    {selectedContact.photoURL ? (
                      <img src={selectedContact.photoURL} alt={selectedContact.name || `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim()} />
                    ) : (
                      <div className="avatar-large">
                        {getInitials(selectedContact)}
                      </div>
                    )}
                    <label className="edit-photo-btn" title={uploadingImage ? "Uploading..." : "Change Photo"} style={{ opacity: uploadingImage ? 0.5 : 1, cursor: uploadingImage ? 'wait' : 'pointer' }}>
                      <input 
                        type="file" 
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file && !uploadingImage) {
                            setUploadingImage(true);
                            try {
                              const storageRef = ref(storage, `contact-photos/${Date.now()}_${file.name}`);
                              const snapshot = await uploadBytes(storageRef, file);
                              const downloadURL = await getDownloadURL(snapshot.ref);
                              
                              // Update in Firebase
                              await updateDoc(doc(db, 'phoneContacts', selectedContact.id), {
                                photoURL: downloadURL,
                                updatedAt: new Date().toISOString()
                              });
                              
                              // Update local state to show the new image immediately
                              setSelectedContact(prev => ({ ...prev, photoURL: downloadURL }));
                              console.log('Contact photo updated:', downloadURL);
                            } catch (error) {
                              console.error('Error uploading image:', error);
                              alert('Failed to upload image. Please try again.');
                            } finally {
                              setUploadingImage(false);
                            }
                          }
                        }}
                        hidden
                      />
                      <Edit size={16} />
                    </label>
                  </div>
                  <h2>{selectedContact.name || `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim()}</h2>
                  {selectedContact.company && (
                    <p className="contact-company">{selectedContact.company}</p>
                  )}
                  <div className="contact-actions">
                    <button 
                      className="action-btn"
                      onClick={() => toggleFavorite(selectedContact)}
                    >
                      <Star 
                        size={20} 
                        className={selectedContact.favorite ? 'favorite-active' : ''}
                        fill={selectedContact.favorite ? '#FFD700' : 'none'}
                      />
                    </button>
                    <button 
                      className="action-btn"
                      onClick={() => startEdit(selectedContact)}
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => deleteContact(selectedContact.id)}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="contact-view-body">
                  {/* Display phones */}
                  {(selectedContact.phones || []).map((phone, index) => (
                    phone.value && (
                      <div key={`phone-${index}`} className="detail-item">
                        <Phone size={18} />
                        <div className="detail-content">
                          <span className="detail-label">{phone.type || 'Phone'}</span>
                          <a href={`tel:${phone.value}`}>{phone.value}</a>
                        </div>
                      </div>
                    )
                  ))}
                  
                  {/* Legacy phone fields */}
                  {!selectedContact.phones?.length && selectedContact.phone && (
                    <div className="detail-item">
                      <Phone size={18} />
                      <div className="detail-content">
                        <span className="detail-label">Phone</span>
                        <a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>
                      </div>
                    </div>
                  )}
                  
                  {!selectedContact.phones?.length && selectedContact.mobile && (
                    <div className="detail-item">
                      <Phone size={18} />
                      <div className="detail-content">
                        <span className="detail-label">Mobile</span>
                        <a href={`tel:${selectedContact.mobile}`}>{selectedContact.mobile}</a>
                      </div>
                    </div>
                  )}

                  {/* Display emails */}
                  {(selectedContact.emails || []).map((email, index) => (
                    email.value && (
                      <div key={`email-${index}`} className="detail-item">
                        <Mail size={18} />
                        <div className="detail-content">
                          <span className="detail-label">{email.type || 'Email'}</span>
                          <a href={`mailto:${email.value}`}>{email.value}</a>
                        </div>
                      </div>
                    )
                  ))}
                  
                  {/* Legacy email field */}
                  {!selectedContact.emails?.length && selectedContact.email && (
                    <div className="detail-item">
                      <Mail size={18} />
                      <div className="detail-content">
                        <span className="detail-label">Email</span>
                        <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>
                      </div>
                    </div>
                  )}

                  {selectedContact.address && (
                    <div className="detail-item">
                      <MapPin size={18} />
                      <div className="detail-content">
                        <span className="detail-label">Address</span>
                        <p>{selectedContact.address}</p>
                      </div>
                    </div>
                  )}

                  {selectedContact.notes && (
                    <div className="detail-item">
                      <Building size={18} />
                      <div className="detail-content">
                        <span className="detail-label">Notes</span>
                        <p>{selectedContact.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Phones;