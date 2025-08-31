import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, 
  Plus, 
  Search, 
  User, 
  Mail, 
  MapPin, 
  Building,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Star,
  MessageSquare,
  Video,
  Share
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

  // State management
  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState(null);

  // Form state for new/edit contact
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phones: [{ value: '', type: 'mobile' }],
    emails: [{ value: '', type: 'work' }],
    address: '',
    notes: '',
    favorite: false,
    photoURL: ''
  });

  // Load contacts from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'phoneContacts'), (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setContacts(contactsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Group contacts alphabetically
  const groupedContacts = useMemo(() => {
    let filtered = contacts.filter(contact => {
      const searchLower = searchQuery.toLowerCase();
      const contactName = (contact.name || contact.firstName || '').toLowerCase();
      const phoneMatch = contact.phones?.some(p => p.value?.includes(searchQuery)) || contact.phone?.includes(searchQuery);
      const emailMatch = contact.emails?.some(e => e.value?.toLowerCase().includes(searchLower)) || contact.email?.toLowerCase().includes(searchLower);
      return contactName.includes(searchLower) ||
             phoneMatch ||
             emailMatch ||
             contact.company?.toLowerCase().includes(searchLower);
    });

    if (selectedLetter) {
      filtered = filtered.filter(contact => {
        const nameToUse = contact.name || contact.firstName || '#';
        return nameToUse[0].toUpperCase() === selectedLetter;
      });
    }

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
  }, [contacts, searchQuery, selectedLetter]);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      const storageRef = ref(storage, `contact-photos/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setFormData(prev => ({ ...prev, photoURL: downloadURL }));
      setImagePreview(downloadURL);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Save contact
  const saveContact = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    try {
      const contactData = {
        ...formData,
        phones: formData.phones.filter(p => p.value),
        emails: formData.emails.filter(e => e.value),
        updatedAt: new Date().toISOString()
      };

      if (editingContact) {
        await updateDoc(doc(db, 'phoneContacts', editingContact.id), contactData);
      } else {
        contactData.createdAt = new Date().toISOString();
        await setDoc(doc(collection(db, 'phoneContacts')), contactData);
      }

      // Reset form
      setFormData({
        name: '',
        company: '',
        phones: [{ value: '', type: 'mobile' }],
        emails: [{ value: '', type: 'work' }],
        address: '',
        notes: '',
        favorite: false,
        photoURL: ''
      });
      setImagePreview(null);
      setShowAddContact(false);
      setEditingContact(null);
      setSelectedContact(null);
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
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
        alert('Failed to delete contact');
      }
    }
  };

  // Edit contact
  const handleEdit = (contact) => {
    const phones = contact.phones || [];
    if (contact.phone && !phones.find(p => p.value === contact.phone)) {
      phones.push({ value: contact.phone, type: 'mobile' });
    }
    const emails = contact.emails || [];
    if (contact.email && !emails.find(e => e.value === contact.email)) {
      emails.push({ value: contact.email, type: 'work' });
    }
    
    setFormData({
      name: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      company: contact.company || '',
      phones: phones.length > 0 ? phones : [{ value: '', type: 'mobile' }],
      emails: emails.length > 0 ? emails : [{ value: '', type: 'work' }],
      address: contact.address || '',
      notes: contact.notes || '',
      favorite: contact.favorite || false,
      photoURL: contact.photoURL || ''
    });
    setImagePreview(contact.photoURL || null);
    setEditingContact(contact);
    setShowAddContact(true);
    setSelectedContact(null);
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

  return (
    <div className={`phones-page ${deviceMode}`}>
      {/* Mobile Header */}
      {deviceMode === 'mobile' && (
        <div className="ios-header">
          {showAddContact ? (
            // Add/Edit Contact Header
            <>
              <button 
                className="ios-nav-btn cancel"
                onClick={() => {
                  setShowAddContact(false);
                  setEditingContact(null);
                  setSelectedContact(null);
                }}
              >
                Cancel
              </button>
              <h1 className="ios-title">
                {editingContact ? 'Edit Contact' : 'New Contact'}
              </h1>
              <button 
                className="ios-nav-btn done"
                onClick={saveContact}
                disabled={!formData.name.trim()}
              >
                Done
              </button>
            </>
          ) : selectedContact ? (
            // Contact View Header
            <>
              <button 
                className="ios-nav-btn back"
                onClick={() => setSelectedContact(null)}
              >
                <ChevronLeft size={20} />
                Contacts
              </button>
              <div className="flex-grow" />
              <button 
                className="ios-nav-btn edit"
                onClick={() => handleEdit(selectedContact)}
              >
                Edit
              </button>
            </>
          ) : (
            // Main Contacts List Header
            <>
              <h1 className="ios-title">Contacts</h1>
              <button 
                className="ios-add-btn"
                onClick={() => {
                  setFormData({
                    name: '',
                    company: '',
                    phones: [{ value: '', type: 'mobile' }],
                    emails: [{ value: '', type: 'work' }],
                    address: '',
                    notes: '',
                    favorite: false,
                    photoURL: ''
                  });
                  setImagePreview(null);
                  setShowAddContact(true);
                }}
              >
                <Plus size={22} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Desktop/Tablet Header */}
      {deviceMode !== 'mobile' && (
        <div className="desktop-header">
          <div className="header-left">
            <h1 className="page-title">Contacts</h1>
            <span className="contact-count">{contacts.length}</span>
          </div>
          <div className="header-center">
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="header-right">
            <button 
              className="add-btn"
              onClick={() => {
                setFormData({
                  name: '',
                  company: '',
                  phones: [{ value: '', type: 'mobile' }],
                  emails: [{ value: '', type: 'work' }],
                  address: '',
                  notes: '',
                  favorite: false,
                  photoURL: ''
                });
                setImagePreview(null);
                setShowAddContact(true);
              }}
            >
              <Plus size={18} />
              <span>Add Contact</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Search Bar */}
      {deviceMode === 'mobile' && !showAddContact && !selectedContact && (
        <div className="ios-search-container">
          <div className="ios-search-bar">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ios-search-input"
            />
            {searchQuery && (
              <button 
                className="clear-btn"
                onClick={() => setSearchQuery('')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="content-area">
        {/* Contacts List */}
        {!showAddContact && (!selectedContact || deviceMode !== 'mobile') && (
          <div className={`contacts-list ${deviceMode}`}>
            <div className="contacts-content">
              {loading ? (
                <div className="loading-state">
                  <div className="spinner" />
                  <span>Loading...</span>
                </div>
              ) : Object.keys(groupedContacts).length === 0 ? (
                <div className="empty-state">
                  <User size={60} strokeWidth={1} />
                  <h3>No Contacts</h3>
                  <p>Tap + to add your first contact</p>
                </div>
              ) : (
                <div className="contacts-scroll">
                  {Object.keys(groupedContacts).sort().map(letter => (
                    <div key={letter} className="contact-section" id={`section-${letter}`}>
                      <div className="section-header">{letter}</div>
                      {groupedContacts[letter].map((contact, index) => (
                        <div
                          key={contact.id}
                          className={`contact-row ${index === groupedContacts[letter].length - 1 ? 'last' : ''}`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <div className="contact-content">
                            {contact.favorite && <Star size={14} className="favorite-icon" fill="currentColor" />}
                            <span className="contact-name">
                              {contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim()}
                            </span>
                          </div>
                          <ChevronRight size={16} className="chevron" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Alphabet Navigation */}
            {Object.keys(groupedContacts).length > 0 && (
              <div className="alphabet-navigation">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(letter => (
                  <div
                    key={letter}
                    className={`alphabet-letter ${groupedContacts[letter] ? '' : 'disabled'}`}
                    onClick={() => {
                      if (groupedContacts[letter]) {
                        document.getElementById(`section-${letter}`)?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {letter}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contact View */}
        {selectedContact && !showAddContact && (
          <div className={`contact-view ${deviceMode}`}>
            <div className="contact-header">
              <div className="contact-photo">
                {selectedContact.photoURL ? (
                  <img src={selectedContact.photoURL} alt={selectedContact.name} />
                ) : (
                  <div className="photo-placeholder">
                    <User size={60} strokeWidth={1} />
                  </div>
                )}
              </div>
              <h2 className="contact-name-large">
                {selectedContact.name || `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim()}
              </h2>
              {selectedContact.company && (
                <p className="contact-company">{selectedContact.company}</p>
              )}
            </div>


            <div className="contact-details">
              {/* Phone Numbers */}
              {(selectedContact.phones?.length > 0 || selectedContact.phone) && (
                <div className="detail-section">
                  {selectedContact.phones?.map((phone, index) => (
                    <div key={index} className="detail-row">
                      <span className="detail-label">{phone.type}</span>
                      <a href={`tel:${phone.value}`} className="detail-value link">
                        {phone.value}
                      </a>
                    </div>
                  )) || (
                    <div className="detail-row">
                      <span className="detail-label">mobile</span>
                      <a href={`tel:${selectedContact.phone}`} className="detail-value link">
                        {selectedContact.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Email Addresses */}
              {(selectedContact.emails?.length > 0 || selectedContact.email) && (
                <div className="detail-section">
                  {selectedContact.emails?.map((email, index) => (
                    <div key={index} className="detail-row">
                      <span className="detail-label">{email.type}</span>
                      <a href={`mailto:${email.value}`} className="detail-value link">
                        {email.value}
                      </a>
                    </div>
                  )) || (
                    <div className="detail-row">
                      <span className="detail-label">email</span>
                      <a href={`mailto:${selectedContact.email}`} className="detail-value link">
                        {selectedContact.email}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Address */}
              {selectedContact.address && (
                <div className="detail-section">
                  <div className="detail-row">
                    <span className="detail-label">address</span>
                    <span className="detail-value">{selectedContact.address}</span>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div className="detail-section">
                  <div className="detail-row">
                    <span className="detail-label">notes</span>
                    <span className="detail-value">{selectedContact.notes}</span>
                  </div>
                </div>
              )}
            </div>

            {deviceMode !== 'mobile' && (
              <div className="contact-footer">
                <button 
                  className="footer-btn edit"
                  onClick={() => handleEdit(selectedContact)}
                >
                  <Edit2 size={16} />
                  Edit Contact
                </button>
                <button 
                  className="footer-btn delete"
                  onClick={() => deleteContact(selectedContact.id)}
                >
                  <Trash2 size={16} />
                  Delete Contact
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Contact Form */}
        {showAddContact && (
          <div className={`contact-form ${deviceMode}`}>
            <div className="form-content">
              {/* Photo Section */}
              <div className="photo-section">
                <div className="photo-upload">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Contact" className="photo-preview" />
                  ) : (
                    <div className="photo-placeholder">
                      <Camera size={30} strokeWidth={1} />
                      <span>Add Photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="photo-input"
                    disabled={uploadingImage}
                  />
                </div>
              </div>

              {/* Name Fields */}
              <div className="form-section">
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  className="form-input"
                />
              </div>

              {/* Phone Numbers */}
              <div className="form-section">
                <div className="section-title">Phone</div>
                {formData.phones.map((phone, index) => (
                  <div key={index} className="field-row">
                    <select
                      value={phone.type}
                      onChange={(e) => {
                        const newPhones = [...formData.phones];
                        newPhones[index].type = e.target.value;
                        setFormData(prev => ({ ...prev, phones: newPhones }));
                      }}
                      className="field-type"
                    >
                      <option value="mobile">mobile</option>
                      <option value="home">home</option>
                      <option value="work">work</option>
                      <option value="other">other</option>
                    </select>
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={phone.value}
                      onChange={(e) => {
                        const newPhones = [...formData.phones];
                        newPhones[index].value = e.target.value;
                        setFormData(prev => ({ ...prev, phones: newPhones }));
                      }}
                      className="form-input"
                    />
                    {formData.phones.length > 1 && (
                      <button
                        className="remove-btn"
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
                  className="add-field-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      phones: [...prev.phones, { value: '', type: 'mobile' }]
                    }));
                  }}
                >
                  <Plus size={16} />
                  add phone
                </button>
              </div>

              {/* Email Addresses */}
              <div className="form-section">
                <div className="section-title">Email</div>
                {formData.emails.map((email, index) => (
                  <div key={index} className="field-row">
                    <select
                      value={email.type}
                      onChange={(e) => {
                        const newEmails = [...formData.emails];
                        newEmails[index].type = e.target.value;
                        setFormData(prev => ({ ...prev, emails: newEmails }));
                      }}
                      className="field-type"
                    >
                      <option value="work">work</option>
                      <option value="home">home</option>
                      <option value="other">other</option>
                    </select>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email.value}
                      onChange={(e) => {
                        const newEmails = [...formData.emails];
                        newEmails[index].value = e.target.value;
                        setFormData(prev => ({ ...prev, emails: newEmails }));
                      }}
                      className="form-input"
                    />
                    {formData.emails.length > 1 && (
                      <button
                        className="remove-btn"
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
                  className="add-field-btn"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      emails: [...prev.emails, { value: '', type: 'work' }]
                    }));
                  }}
                >
                  <Plus size={16} />
                  add email
                </button>
              </div>

              {/* Address */}
              <div className="form-section">
                <div className="section-title">Address</div>
                <textarea
                  placeholder="Street Address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              {/* Notes */}
              <div className="form-section">
                <div className="section-title">Notes</div>
                <textarea
                  placeholder="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                />
              </div>

              {/* Delete Button for Edit Mode */}
              {editingContact && (
                <div className="form-section">
                  <button
                    className="delete-contact-btn"
                    onClick={() => {
                      deleteContact(editingContact.id);
                      setShowAddContact(false);
                      setEditingContact(null);
                    }}
                  >
                    Delete Contact
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Phones;