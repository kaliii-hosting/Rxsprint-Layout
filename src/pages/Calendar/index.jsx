import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, Bell, Filter, Tag, X, Save, Edit2, Trash2, Check, Menu } from 'lucide-react';
import { firestore } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import EnterpriseHeader, { TabGroup, TabButton, HeaderDivider, ActionGroup, ActionButton } from '../../components/EnterpriseHeader/EnterpriseHeader';
import './Calendar.css';
import './CalendarSidebarFix.css';
import './CalendarResponsive.css';
import './CalendarCompact.css';
import './CalendarMobileFull.css';
import './CalendarMobileHeader.css';
import './CalendarHeaderFixed.css';
import './CalendarMobileHeaderFix.css';
import './CalendarMobileFinal.css';
import './CalendarResponsiveFix.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Removed view state - now only using month view
  const [showEventModal, setShowEventModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [rightClickedDate, setRightClickedDate] = useState(null);
  const [firstClickedDate, setFirstClickedDate] = useState(null);
  const [secondClickedDate, setSecondClickedDate] = useState(null);
  const [dayCountDisplay, setDayCountDisplay] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [editingEvent, setEditingEvent] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageText, setSuccessMessageText] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [deviceMode, setDeviceMode] = useState('desktop'); // For responsive toolbar
  const contextMenuRef = useRef(null);
  
  // Event form state
  const [eventForm, setEventForm] = useState({
    title: '',
    date: new Date(),
    time: '10:00',
    location: '',
    attendees: '',
    duration: '1 hour',
    notes: ''
  });
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // Event colors array for variety
  const eventColors = ['#ff5500', '#ff6b1a', '#ff8533', '#ffa04d', '#ff4d00', '#ff7333'];
  
  const getEventColor = (index) => {
    return eventColors[index % eventColors.length];
  };

  // Load events from Firebase
  useEffect(() => {
    loadEvents();
  }, []);

  // Handle window resize for mobile detection and device mode
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
      
      // Update device mode for responsive toolbar
      const width = window.innerWidth;
      if (width < 640) {
        setDeviceMode('mobile');
      } else if (width < 1024) {
        setDeviceMode('tablet');
      } else {
        setDeviceMode('desktop');
      }
    };
    
    handleResize(); // Set initial values
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenuPosition({ x: 0, y: 0 });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(firestore, 'calendarEvents');
      const q = query(eventsRef, orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      
      const loadedEvents = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedEvents.push({
          id: doc.id,
          ...data,
          date: data.date.toDate()
        });
      });
      
      setEvents(loadedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save event to Firebase
  const saveEvent = async () => {
    try {
      const eventDate = new Date(eventForm.date);
      const [hours, minutes] = eventForm.time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));

      const eventData = {
        title: eventForm.title,
        date: eventDate,
        location: eventForm.location,
        attendees: eventForm.attendees.split(',').map(a => a.trim()).filter(a => a),
        duration: eventForm.duration,
        notes: eventForm.notes,
        createdAt: editingEvent ? editingEvent.createdAt : new Date(),
        updatedAt: new Date()
      };

      if (editingEvent) {
        // Update existing event
        await updateDoc(doc(firestore, 'calendarEvents', editingEvent.id), eventData);
        setSuccessMessageText('Event updated successfully!');
      } else {
        // Create new event
        await addDoc(collection(firestore, 'calendarEvents'), eventData);
        setSuccessMessageText('Event created successfully!');
      }
      
      await loadEvents();
      resetEventForm();
      setEditingEvent(null);
      setShowEventModal(false);
      
      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      date: new Date(),
      time: '10:00',
      location: '',
      attendees: '',
      duration: '1 hour',
      notes: ''
    });
    setEditingEvent(null);
  };
  
  // Delete event
  const deleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(firestore, 'calendarEvents', eventId));
        await loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };
  
  // Edit event
  const editEvent = (event) => {
    const eventDate = new Date(event.date);
    const time = eventDate.toTimeString().slice(0, 5);
    
    setEventForm({
      title: event.title,
      date: eventDate,
      time: time,
      location: event.location || '',
      attendees: event.attendees ? event.attendees.join(', ') : '',
      duration: event.duration || '1 hour',
      notes: event.notes || ''
    });
    setEditingEvent(event);
    setShowEventModal(true);
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    // Always navigate by month since we're only using month view
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  // Handle right click on calendar day
  const handleDayRightClick = (e, date) => {
    e.preventDefault();
    setRightClickedDate(date);
    setEventForm(prev => ({ ...prev, date: date }));
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
  };

  // Handle day click for counting and range selection
  const handleDayClick = (date) => {
    // Ensure date is a valid Date object
    const clickedDate = new Date(date);
    
    if (firstClickedDate && !secondClickedDate) {
      // Second click - set range
      setSecondClickedDate(clickedDate);
      const daysDiff = Math.abs(Math.ceil((clickedDate - firstClickedDate) / (1000 * 60 * 60 * 24))) + 1; // +1 to include both days
      setDayCountDisplay({
        start: firstClickedDate < clickedDate ? firstClickedDate : clickedDate,
        end: firstClickedDate > clickedDate ? firstClickedDate : clickedDate,
        count: daysDiff
      });
    } else {
      // First click or resetting
      setFirstClickedDate(clickedDate);
      setSecondClickedDate(null);
      setDayCountDisplay(null);
    }
    setSelectedDate(clickedDate);
  };

  const formatEventTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Get week dates for week view
  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      week.push(weekDay);
    }
    return week;
  };

  // Render week view
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="week-view">
        <div className="week-header">
          <div className="time-column-header">Time</div>
          {weekDates.map((date, index) => (
            <div key={index} className={`week-day-header ${date.toDateString() === new Date().toDateString() ? 'today' : ''}`}>
              <div className="week-day-name">{dayNames[date.getDay()]}</div>
              <div className="week-day-number">{date.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="week-body">
          {hours.map(hour => (
            <div key={hour} className="week-row">
              <div className="time-column">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {weekDates.map((date, index) => {
                const hourEvents = events.filter(event => {
                  const eventDate = new Date(event.date);
                  return eventDate.toDateString() === date.toDateString() && 
                         eventDate.getHours() === hour;
                });
                return (
                  <div key={index} className="week-cell" onClick={() => handleDayClick(date)}>
                    {hourEvents.map((event, idx) => (
                      <div 
                        key={event.id}
                        className="week-event"
                        style={{ background: getEventColor(events.indexOf(event)) }}
                        onClick={(e) => { e.stopPropagation(); editEvent(event); }}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(selectedDate);
    
    return (
      <div className="day-view">
        <div className="day-view-header">
          <h3>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        </div>
        <div className="day-view-body">
          {hours.map(hour => {
            const hourEvents = dayEvents.filter(event => {
              const eventDate = new Date(event.date);
              return eventDate.getHours() === hour;
            });
            
            return (
              <div key={hour} className="day-hour-row">
                <div className="time-label">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </div>
                <div className="day-hour-events">
                  {hourEvents.map((event, idx) => (
                    <div 
                      key={event.id}
                      className="day-event-block"
                      style={{ background: getEventColor(events.indexOf(event)) }}
                      onClick={() => editEvent(event)}
                    >
                      <div className="event-time">{formatEventTime(event.date)}</div>
                      <div className="event-title">{event.title}</div>
                      {event.location && <div className="event-location">{event.location}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const weeks = [];
    let week = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      week.push(
        <td key={`empty-${i}`} className="calendar-cell empty"></td>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isFirstClicked = firstClickedDate && date.toDateString() === firstClickedDate.toDateString();
      const isSecondClicked = secondClickedDate && date.toDateString() === secondClickedDate.toDateString();
      const minDate = firstClickedDate && secondClickedDate ? 
        (firstClickedDate < secondClickedDate ? firstClickedDate : secondClickedDate) : null;
      const maxDate = firstClickedDate && secondClickedDate ? 
        (firstClickedDate > secondClickedDate ? firstClickedDate : secondClickedDate) : null;
      
      const isInRange = minDate && maxDate && 
        date > minDate && date < maxDate;
      const isRangeStart = minDate && 
        date.toDateString() === minDate.toDateString();
      const isRangeEnd = maxDate && 
        date.toDateString() === maxDate.toDateString();

      week.push(
        <td
          key={day}
          className={`calendar-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''} ${isFirstClicked && !secondClickedDate ? 'first-clicked' : ''} ${isInRange ? 'in-range' : ''} ${isRangeStart ? 'range-start' : ''} ${isRangeEnd ? 'range-end' : ''}`}
          onClick={() => handleDayClick(date)}
          onContextMenu={(e) => handleDayRightClick(e, date)}
        >
          <div className="cell-content">
            <span className="day-number">{day}</span>
            {dayEvents.length > 0 && (
              <>
                <div className="event-indicators">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div 
                      key={event.id} 
                      className="event-dot"
                      style={{ backgroundColor: getEventColor(events.indexOf(event)) }}
                      title={`${formatEventTime(event.date).split(' ')[0]} - ${event.title}`}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="more-count">+{dayEvents.length - 3}</span>
                  )}
                </div>
                {/* Mobile event count display */}
                <span className="event-count d-block d-md-none">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </td>
      );

      // Start new week
      if ((firstDay + day) % 7 === 0) {
        weeks.push(<tr key={`week-${weeks.length}`}>{week}</tr>);
        week = [];
      }
    }

    // Add remaining days and empty cells
    if (week.length > 0) {
      while (week.length < 7) {
        week.push(
          <td key={`empty-end-${week.length}`} className="calendar-cell empty"></td>
        );
      }
      weeks.push(<tr key={`week-${weeks.length}`}>{week}</tr>);
    }

    return weeks;
  };

  // Get current month and day for header display
  const getCurrentDateInfo = () => {
    const today = new Date();
    const monthName = monthNames[today.getMonth()];
    const dayNum = today.getDate();
    const year = today.getFullYear();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    return { monthName, dayNum, year, dayName };
  };

  const dateInfo = getCurrentDateInfo();

  return (
    <div className={`calendar-page page-container ${isCreating ? 'is-creating' : ''}`}>
      {/* Responsive Toolbar - Notes page style */}
      <div className={`board-toolbar board-toolbar-${deviceMode}`}>
        {/* Title Section */}
        <div className="toolbar-section">
          <div className="calendar-title-section">
            <button className="tool-button" onClick={() => navigate(-1)} title="Previous month">
              <ChevronLeft size={deviceMode === 'mobile' ? 18 : 20} />
            </button>
            <div className="calendar-month-display">
              <CalendarIcon size={deviceMode === 'mobile' ? 16 : 18} />
              <h2>
                {deviceMode === 'mobile' 
                  ? `${monthNames[currentDate.getMonth()].slice(0, 3)} ${currentDate.getFullYear()}`
                  : `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                }
              </h2>
            </div>
            <button className="tool-button" onClick={() => navigate(1)} title="Next month">
              <ChevronRight size={deviceMode === 'mobile' ? 18 : 20} />
            </button>
          </div>
        </div>
        
        {/* Actions Section */}
        <div className="toolbar-section actions">
          <button 
            className="tool-button accent icon-only"
            onClick={() => {
              const dateToUse = selectedDate || new Date();
              setSelectedDate(dateToUse);
              setEventForm(prev => ({ ...prev, date: dateToUse }));
              setIsCreating(true);
            }}
            title="Add Event"
          >
            <Plus size={deviceMode === 'mobile' ? 18 : 20} />
          </button>
        </div>
      </div>
      
      <div className="calendar-content">
        {/* Modern Minimal Calendar */}
        <div className="modern-calendar-container">
          {/* Day Counter Badge */}
          {dayCountDisplay && (
            <div className="day-counter-badge">
              <span className="badge-icon">📅</span>
              <span className="badge-text">
                {dayCountDisplay.count} days between {dayCountDisplay.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dayCountDisplay.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button className="badge-close" onClick={() => {
                setDayCountDisplay(null);
                setFirstClickedDate(null);
                setSecondClickedDate(null);
              }}>×</button>
            </div>
          )}

          {/* Calendar Month View Only */}
          <table className="modern-calendar-table">
            <thead>
              <tr>
                {dayNames.map(day => (
                  <th key={day} className="calendar-weekday">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderCalendarDays()}
            </tbody>
          </table>
        </div>

        {/* Events Sidebar with Form */}
        {selectedDate && (
          <div className="events-sidebar">
            {/* Show event form when Add Event is clicked */}
            {isCreating && !editingEvent ? (
              <div className="sidebar-form">
                <div className="sidebar-header">
                  <h3>Add New Event</h3>
                  <button className="close-form-btn" onClick={() => {
                    setIsCreating(false);
                    resetEventForm();
                  }}>
                    <X size={20} />
                  </button>
                </div>
                <div className="sidebar-form-content">
                  <div className="form-group">
                    <label>Event Title</label>
                    <input
                      type="text"
                      value={eventForm.title}
                      onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter event title"
                      className="form-input"
                      autoFocus
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      value={eventForm.date.toISOString().split('T')[0]}
                      onChange={(e) => setEventForm(prev => ({ ...prev, date: new Date(e.target.value) }))}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      value={eventForm.time}
                      onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="btn-secondary" 
                      onClick={() => {
                        setIsCreating(false);
                        resetEventForm();
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn-primary"
                      onClick={saveEvent}
                      disabled={!eventForm.title.trim()}
                    >
                      <Save size={16} />
                      Save Event
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="sidebar-header">
                  <h3>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                  <span className="event-count">{getEventsForDate(selectedDate).length} events</span>
                </div>
                <div className="sidebar-events">
                  {loading ? (
                    <div className="events-empty">
                      <div className="spinner-mini"></div>
                      <p>Loading events...</p>
                    </div>
                  ) : getEventsForDate(selectedDate).length === 0 ? (
                    <div className="events-empty">
                      <Bell size={32} strokeWidth={1.5} />
                      <p>No events scheduled</p>
                      <button className="btn-add-event" onClick={() => {
                        setEventForm(prev => ({ ...prev, date: selectedDate }));
                        setIsCreating(true);
                      }}>
                        <Plus size={16} />
                        <span>Add Event</span>
                      </button>
                    </div>
                  ) : (
                    <div className="events-list-modern">
                      {getEventsForDate(selectedDate).map((event, eventIndex) => (
                        <div key={event.id} className="event-item-modern" style={{ '--event-color': getEventColor(eventIndex) }}>
                          <div className="event-time">{formatEventTime(event.date)}</div>
                          <div className="event-content">
                            <h4>{event.title}</h4>
                            {event.location && (
                              <p className="event-meta">
                                <MapPin size={12} /> {event.location}
                              </p>
                            )}
                            {event.duration && (
                              <p className="event-meta">
                                <Clock size={12} /> {event.duration}
                              </p>
                            )}
                          </div>
                          <div className="event-actions">
                            <button onClick={() => editEvent(event)} className="btn-icon">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => deleteEvent(event.id)} className="btn-icon btn-delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Context Menu for Right Click */}
      {contextMenuPosition.x > 0 && (
        <div 
          ref={contextMenuRef}
          className="calendar-context-menu"
          style={{ 
            position: 'fixed', 
            left: contextMenuPosition.x, 
            top: contextMenuPosition.y 
          }}
        >
          <button onClick={() => {
            setIsCreating(true);
            setContextMenuPosition({ x: 0, y: 0 });
          }}>
            <Plus size={16} />
            Add Event
          </button>
        </div>
      )}

      {/* Event Modal - Removed, using sidebar instead */}
      {false && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="event-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
              <button className="close-btn" onClick={() => {
                setShowEventModal(false);
                resetEventForm();
              }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Event Title*</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter event title"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date*</label>
                  <input
                    type="date"
                    value={eventForm.date.toISOString().split('T')[0]}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: new Date(e.target.value) }))}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Time*</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Duration</label>
                <input
                  type="text"
                  value={eventForm.duration}
                  onChange={(e) => setEventForm(prev => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., 2 hours"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Enter location"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Attendees</label>
                <input
                  type="text"
                  value={eventForm.attendees}
                  onChange={(e) => setEventForm(prev => ({ ...prev, attendees: e.target.value }))}
                  placeholder="Enter attendees (comma separated)"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="form-input form-textarea"
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => {
                setShowEventModal(false);
                resetEventForm();
              }}>
                Cancel
              </button>
              <button 
                className="save-btn"
                onClick={saveEvent}
                disabled={!eventForm.title}
              >
                <Save size={16} />
                {editingEvent ? 'Update Event' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-message">
          <div className="success-content">
            <Check size={20} />
            <span>{successMessageText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;