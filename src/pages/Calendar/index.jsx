import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, Bell, Filter, Tag, X, Save, Edit2, Trash2, Check } from 'lucide-react';
import { firestore } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import './Calendar.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day
  const [showEventModal, setShowEventModal] = useState(false);
  const [rightClickedDate, setRightClickedDate] = useState(null);
  const [firstClickedDate, setFirstClickedDate] = useState(null);
  const [dayCountDisplay, setDayCountDisplay] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [editingEvent, setEditingEvent] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageText, setSuccessMessageText] = useState('');
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

  // Event colors array for variety
  const eventColors = ['#ff5500', '#ff6b1a', '#ff8533', '#ffa04d', '#ff4d00', '#ff7333'];
  
  const getEventColor = (index) => {
    return eventColors[index % eventColors.length];
  };

  // Load events from Firebase
  useEffect(() => {
    loadEvents();
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
    
    if (view === 'month') {
      newDate.setMonth(currentDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (view === 'day') {
      newDate.setDate(currentDate.getDate() + direction);
      setSelectedDate(newDate);
    }
    
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

  // Handle day click for counting
  const handleDayClick = (date) => {
    if (firstClickedDate) {
      // Calculate days between first and second click
      const daysDiff = Math.abs(Math.ceil((date - firstClickedDate) / (1000 * 60 * 60 * 24)));
      setDayCountDisplay({
        start: firstClickedDate,
        end: date,
        count: daysDiff
      });
      setFirstClickedDate(null);
    } else {
      setFirstClickedDate(date);
      setDayCountDisplay(null);
    }
    setSelectedDate(date);
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
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isFirstClicked = firstClickedDate && date.toDateString() === firstClickedDate.toDateString();
      const isInRange = dayCountDisplay && 
        date >= Math.min(dayCountDisplay.start, dayCountDisplay.end) && 
        date <= Math.max(dayCountDisplay.start, dayCountDisplay.end);

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''} ${isFirstClicked ? 'first-clicked' : ''} ${isInRange ? 'in-range' : ''}`}
          onClick={() => handleDayClick(date)}
          onContextMenu={(e) => handleDayRightClick(e, date)}
        >
          <div className="day-number">{day}</div>
          {dayEvents.length > 0 && (
            <div className="day-events">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div 
                  key={event.id} 
                  className="day-event-item"
                  style={{ background: getEventColor(events.indexOf(event)) }}
                  title={event.title}
                >
                  <span className="event-time">{formatEventTime(event.date).split(' ')[0]}</span>
                  <span className="event-title-mini">{event.title}</span>
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="more-events">+{dayEvents.length - 3} more</div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="calendar-page page-container">
      <div className="calendar-content">
        <div className="calendar-dashboard">
          {/* Calendar Controls */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Calendar View</h3>
              <CalendarIcon size={20} />
            </div>
            <div className="card-body">
              <div className="calendar-controls">
                <div className="month-navigation">
                  <button className="nav-btn" onClick={() => navigate(-1)}>
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="current-month">
                    {view === 'month' ? 
                      `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` :
                      view === 'week' ?
                      `Week of ${currentDate.toLocaleDateString()}` :
                      `${currentDate.toLocaleDateString()}`
                    }
                  </h2>
                  <button className="nav-btn" onClick={() => navigate(1)}>
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className="view-controls">
                  <button 
                    className={`view-btn ${view === 'month' ? 'active' : ''}`}
                    onClick={() => setView('month')}
                  >
                    Month
                  </button>
                  <button 
                    className={`view-btn ${view === 'week' ? 'active' : ''}`}
                    onClick={() => setView('week')}
                  >
                    Week
                  </button>
                  <button 
                    className={`view-btn ${view === 'day' ? 'active' : ''}`}
                    onClick={() => setView('day')}
                  >
                    Day
                  </button>
                </div>
              </div>

              {/* Day Counter Display */}
              {dayCountDisplay && (
                <div className="day-counter-display">
                  <div className="day-counter-content">
                    <span className="day-counter-label">Days between</span>
                    <span className="day-counter-dates">
                      {dayCountDisplay.start.toLocaleDateString()} - {dayCountDisplay.end.toLocaleDateString()}
                    </span>
                    <span className="day-counter-count">{dayCountDisplay.count} days</span>
                  </div>
                </div>
              )}

              {/* Calendar Views */}
              {view === 'month' && (
                <div className="calendar-grid">
                  <div className="calendar-header">
                    {dayNames.map(day => (
                      <div key={day} className="calendar-day-name">{day}</div>
                    ))}
                  </div>
                  <div className="calendar-body">
                    {renderCalendarDays()}
                  </div>
                </div>
              )}
              
              {view === 'week' && renderWeekView()}
              
              {view === 'day' && renderDayView()}
            </div>
          </div>

          {/* Selected Date Events */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Events for {selectedDate.toLocaleDateString()}</h3>
              <Bell size={20} />
            </div>
            <div className="card-body">
              <div className="events-list">
                {loading ? (
                  <div className="no-events">
                    <p>Loading events...</p>
                  </div>
                ) : getEventsForDate(selectedDate).length === 0 ? (
                  <div className="no-events">
                    <p>No events scheduled for this date</p>
                    <button className="add-event-btn" onClick={() => {
                      setEventForm(prev => ({ ...prev, date: selectedDate }));
                      setShowEventModal(true);
                    }}>
                      <Plus size={16} />
                      Add Event
                    </button>
                  </div>
                ) : (
                  getEventsForDate(selectedDate).map(event => {
                    const eventIndex = events.indexOf(event);
                    return (
                      <div key={event.id} className="event-card" style={{ borderLeftColor: getEventColor(eventIndex) }}>
                        <div className="event-header">
                          <h4>{event.title}</h4>
                          <div className="event-actions">
                            <button className="event-action-btn" onClick={() => editEvent(event)} title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button className="event-action-btn delete" onClick={() => deleteEvent(event.id)} title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="event-details">
                          <div className="event-detail">
                            <Clock size={14} />
                            <span>{formatEventTime(event.date)} - {event.duration}</span>
                          </div>
                          {event.location && (
                            <div className="event-detail">
                              <MapPin size={14} />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="event-detail">
                              <Users size={14} />
                              <span>{event.attendees.join(', ')}</span>
                            </div>
                          )}
                          {event.notes && (
                            <div className="event-detail">
                              <span className="event-notes">{event.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Calendar Tips</h3>
              <Filter size={20} />
            </div>
            <div className="card-body">
              <div className="calendar-instructions">
                <ul>
                  <li>Right-click on any day to add an event</li>
                  <li>Click on two days to count days between them</li>
                  <li>Click the edit icon on any event to modify it</li>
                  <li>Events are color-coded for easy identification</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
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
            setShowEventModal(true);
            setContextMenuPosition({ x: 0, y: 0 });
          }}>
            <Plus size={16} />
            Add Event
          </button>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
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