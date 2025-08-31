import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus, Bell, Filter, Tag, X, Save, Edit2, Trash2, Check, Menu } from 'lucide-react';
import { firestore } from '../../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import EnterpriseHeader, { TabGroup, TabButton, HeaderDivider, ActionGroup, ActionButton } from '../../components/EnterpriseHeader/EnterpriseHeader';
import './LightCalendar.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [nextMonthDate, setNextMonthDate] = useState(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    return next;
  });
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

  // Event colors array for variety (using lighter, pastel colors)
  const eventColors = ['#FF6900', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#00BCD4'];
  
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
    const firstDay = new Date(year, month, 1).getDay();
    // Convert Sunday (0) to Monday-first week (Sunday becomes 6)
    return firstDay === 0 ? 6 : firstDay - 1;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    const newNextDate = new Date(currentDate);
    // Always navigate by month since we're only using month view
    newDate.setMonth(currentDate.getMonth() + direction);
    newNextDate.setMonth(currentDate.getMonth() + direction + 1);
    setCurrentDate(newDate);
    setNextMonthDate(newNextDate);
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

  const renderIOSCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const days = [];
    
    // Previous month days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), day);
      days.push(
        <div key={`prev-${day}`} className="ios-day other-month">
          <div className="ios-day-number">{day}</div>
        </div>
      );
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isFirstClicked = firstClickedDate && date.toDateString() === firstClickedDate.toDateString();
      
      const minDate = firstClickedDate && secondClickedDate ? 
        (firstClickedDate < secondClickedDate ? firstClickedDate : secondClickedDate) : null;
      const maxDate = firstClickedDate && secondClickedDate ? 
        (firstClickedDate > secondClickedDate ? firstClickedDate : secondClickedDate) : null;
      
      const isInRange = minDate && maxDate && date > minDate && date < maxDate;
      const isRangeStart = minDate && date.toDateString() === minDate.toDateString();
      const isRangeEnd = maxDate && date.toDateString() === maxDate.toDateString();
      
      const classNames = [
        'ios-day',
        isToday && 'today',
        (isSelected || (isFirstClicked && !secondClickedDate)) && 'selected',
        isInRange && 'in-range',
        isRangeStart && 'range-start',
        isRangeEnd && 'range-end'
      ].filter(Boolean).join(' ');
      
      days.push(
        <div
          key={day}
          className={classNames}
          onClick={() => handleDayClick(date)}
        >
          <div className="ios-day-number">{day}</div>
          {dayEvents.length > 0 && (
            <div className="ios-event-dots">
              {dayEvents.slice(0, 3).map((_, idx) => (
                <div key={idx} className="ios-event-dot" />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Next month days
    const totalCells = days.length;
    const remainingCells = 42 - totalCells;
    
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push(
        <div key={`next-${day}`} className="ios-day other-month">
          <div className="ios-day-number">{day}</div>
        </div>
      );
    }
    
    return days;
  };

  const renderEnterpriseCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Get previous month days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    const daysInPrevMonth = getDaysInMonth(prevMonth);
    
    // Add empty cells for alignment (Sunday-first)
    const startDay = firstDay === 0 ? 0 : firstDay + 1;
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i);
      days.push(
        <div key={`prev-${i}`} className="calendar-day other-month">
          <div className="day-number">{daysInPrevMonth - i}</div>
        </div>
      );
    }
    
    // Add days of current month
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
      
      const isInRange = minDate && maxDate && date > minDate && date < maxDate;
      const isRangeStart = minDate && date.toDateString() === minDate.toDateString();
      const isRangeEnd = maxDate && date.toDateString() === maxDate.toDateString();
      
      const classNames = [
        'calendar-day',
        isToday && 'today',
        isSelected && 'selected',
        isFirstClicked && !secondClickedDate && 'selected',
        isInRange && 'in-range',
        isRangeStart && 'range-start',
        isRangeEnd && 'range-end',
        dayEvents.length > 0 && 'has-events'
      ].filter(Boolean).join(' ');
      
      days.push(
        <div
          key={day}
          className={classNames}
          onClick={() => handleDayClick(date)}
          onContextMenu={(e) => handleDayRightClick(e, date)}
        >
          <div className="day-number">{day}</div>
          <div className="day-events">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div key={idx} className="event-indicator" />
            ))}
            {dayEvents.length > 0 && (
              <div className="event-count">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</div>
            )}
          </div>
        </div>
      );
    }
    
    // Add next month days to fill the grid
    const totalCells = days.length;
    const remainingCells = 42 - totalCells; // 6 weeks * 7 days
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push(
        <div key={`next-${day}`} className="calendar-day other-month">
          <div className="day-number">{day}</div>
        </div>
      );
    }
    
    return days;
  };

  const renderCalendarDays = (monthDate = currentDate, monthOffset = 0) => {
    const daysInMonth = getDaysInMonth(monthDate);
    const firstDay = getFirstDayOfMonth(monthDate);
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
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
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
          className={`calendar-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${isFirstClicked && !secondClickedDate ? 'first-clicked' : ''} ${isInRange ? 'in-range' : ''} ${isRangeStart ? 'range-start' : ''} ${isRangeEnd ? 'range-end' : ''}`}
          onClick={() => handleDayClick(date)}
        >
          <span className="day-number">{day}</span>
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
    <div className="calendar-page">
      {/* Compact Header Toolbar - All in One Row */}
      <div className="calendar-header-toolbar">
        {/* Month Navigation */}
        <div className="header-nav-section">
          <button className="nav-btn" onClick={() => navigate(-1)} title="Previous month">
            <ChevronLeft size={18} />
          </button>
          <div className="month-display">
            <span className="month-text">{monthNames[currentDate.getMonth()]}</span>
            <span className="year-text">{currentDate.getFullYear()}</span>
          </div>
          <button className="nav-btn" onClick={() => navigate(1)} title="Next month">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Date Range Display */}
        <div className="header-range-section">
          {dayCountDisplay ? (
            <div className="date-range-display">
              <span className="range-text">
                {dayCountDisplay.count} days
              </span>
              <span className="range-dates">
                {dayCountDisplay.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - 
                {dayCountDisplay.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <button className="range-clear" onClick={() => {
                setDayCountDisplay(null);
                setFirstClickedDate(null);
                setSecondClickedDate(null);
              }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="range-placeholder">
              Click dates to select range
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="header-actions-section">
          <button className="action-btn today-btn" onClick={() => setCurrentDate(new Date())}>
            Today
          </button>
          <button className="action-btn add-btn" onClick={() => {
            const dateToUse = selectedDate || new Date();
            setSelectedDate(dateToUse);
            setEventForm(prev => ({ ...prev, date: dateToUse }));
            setShowEventModal(true);
          }}>
            <Plus size={16} />
            <span className="btn-text">Add</span>
          </button>
        </div>
      </div>
      
      {/* iOS Calendar Container */}
      <div className="ios-calendar-container">
        {/* Calendar Grid */}
        <div className="ios-calendar-grid">
          {/* Weekdays */}
          <div className="ios-weekdays">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="ios-weekday">{day}</div>
            ))}
          </div>
          
          {/* Days Grid */}
          <div className="ios-days-grid">
            {renderIOSCalendarDays()}
          </div>
        </div>

        {/* Events Section */}
        {selectedDate && getEventsForDate(selectedDate).length > 0 && (
          <div className="ios-events-section">
            <div className="ios-events-header">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {getEventsForDate(selectedDate).map((event, idx) => (
              <div key={event.id} className="ios-event-item" onClick={() => editEvent(event)}>
                <div className="ios-event-color" style={{ background: getEventColor(idx) }} />
                <div className="ios-event-content">
                  <div className="ios-event-title">{event.title}</div>
                  <div className="ios-event-time">{formatEventTime(event.date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Floating Add Button */}
      <button className="ios-add-button" onClick={() => {
        const dateToUse = selectedDate || new Date();
        setSelectedDate(dateToUse);
        setEventForm(prev => ({ ...prev, date: dateToUse }));
        setShowEventModal(true);
      }}>
        <Plus size={24} />
      </button>

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

      {/* iOS Modal */}
      {showEventModal && (
        <div className="ios-modal-overlay" onClick={(e) => {
          // Only close on overlay click for desktop
          if (window.innerWidth > 768 && e.target === e.currentTarget) {
            setShowEventModal(false);
          }
        }}>
          <div className="ios-modal" onClick={e => e.stopPropagation()}>
            <div className="ios-modal-header">
              <button className="ios-modal-button" onClick={() => {
                setShowEventModal(false);
                resetEventForm();
              }}>
                Cancel
              </button>
              <div className="ios-modal-title">{editingEvent ? 'Edit Event' : 'New Event'}</div>
              <button className="ios-modal-button bold" onClick={saveEvent} disabled={!eventForm.title}>
                {editingEvent ? 'Save' : 'Add'}
              </button>
            </div>
            
            <div className="ios-modal-body">
              <div className="ios-form-group">
                <label className="ios-form-label">Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Event title"
                  className="ios-form-input"
                  autoFocus
                />
              </div>

              <div className="ios-form-row">
                <div className="ios-form-group">
                  <label className="ios-form-label">Date</label>
                  <input
                    type="date"
                    value={eventForm.date.toISOString().split('T')[0]}
                    onChange={(e) => setEventForm(prev => ({ ...prev, date: new Date(e.target.value) }))}
                    className="ios-form-input"
                  />
                </div>
                <div className="ios-form-group">
                  <label className="ios-form-label">Time</label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                    className="ios-form-input"
                  />
                </div>
              </div>

              <div className="ios-form-group">
                <label className="ios-form-label">Duration</label>
                <select 
                  value={eventForm.duration}
                  onChange={(e) => setEventForm(prev => ({ ...prev, duration: e.target.value }))}
                  className="ios-form-select"
                >
                  <option value="30 minutes">30 minutes</option>
                  <option value="1 hour">1 hour</option>
                  <option value="2 hours">2 hours</option>
                  <option value="All day">All day</option>
                </select>
              </div>

              <div className="ios-form-group">
                <label className="ios-form-label">Location</label>
                <input
                  type="text"
                  value={eventForm.location}
                  onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Add location"
                  className="ios-form-input"
                />
              </div>

              <div className="ios-form-group">
                <label className="ios-form-label">Notes</label>
                <textarea
                  value={eventForm.notes}
                  onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes"
                  className="ios-form-textarea"
                  rows={3}
                />
              </div>
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
