import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Phone, Video, Search, Bot, User, Clock, CheckCheck } from 'lucide-react';
import './Chat.css';

const Chat = () => {
  const [selectedContact, setSelectedContact] = useState(1);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  
  // Sample contacts
  const [contacts] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Smith',
      role: 'Specialist',
      avatar: 'S',
      lastMessage: 'Your next appointment is scheduled for...',
      time: '10:30 AM',
      unread: 2,
      online: true
    },
    {
      id: 2,
      name: 'Nurse Johnson',
      role: 'Primary Nurse',
      avatar: 'J',
      lastMessage: 'Medication reminder sent',
      time: 'Yesterday',
      unread: 0,
      online: true
    },
    {
      id: 3,
      name: 'Lab Assistant',
      role: 'Lab Team',
      avatar: 'L',
      lastMessage: 'Lab results are ready',
      time: '2 days ago',
      unread: 1,
      online: false
    },
    {
      id: 4,
      name: 'RxAssist AI',
      role: 'AI Assistant',
      avatar: <Bot size={24} />,
      lastMessage: 'How can I help you today?',
      time: 'Now',
      unread: 0,
      online: true,
      isBot: true
    }
  ]);

  // Sample messages
  const [messages] = useState({
    1: [
      {
        id: 1,
        sender: 'Dr. Sarah Smith',
        content: 'Good morning! How are you feeling today?',
        time: '9:00 AM',
        sent: false,
        read: true
      },
      {
        id: 2,
        sender: 'You',
        content: 'Hi Dr. Smith! I\'m feeling much better, thank you.',
        time: '9:15 AM',
        sent: true,
        read: true
      },
      {
        id: 3,
        sender: 'Dr. Sarah Smith',
        content: 'That\'s great to hear! Your lab results came back normal. Your next appointment is scheduled for Monday at 2 PM.',
        time: '10:30 AM',
        sent: false,
        read: true
      }
    ],
    2: [
      {
        id: 1,
        sender: 'Nurse Johnson',
        content: 'Medication reminder: Please take your evening dose at 6 PM.',
        time: 'Yesterday',
        sent: false,
        read: true
      }
    ],
    3: [
      {
        id: 1,
        sender: 'Lab Assistant',
        content: 'Your lab results are ready for review.',
        time: '2 days ago',
        sent: false,
        read: false
      }
    ],
    4: [
      {
        id: 1,
        sender: 'RxAssist AI',
        content: 'Hello! I\'m RxAssist, your AI medical assistant. How can I help you today?',
        time: 'Now',
        sent: false,
        read: true,
        isBot: true
      }
    ]
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      // Handle sending message
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentContact = contacts.find(c => c.id === selectedContact);
  const currentMessages = messages[selectedContact] || [];

  return (
    <div className="chat-page page-container">
      <div className="chat-content">
        <div className="chat-container">
          {/* Contacts Sidebar */}
          <div className="contacts-sidebar">
            <div className="contacts-header">
              <h3>Messages</h3>
              <div className="search-container">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            <div className="contacts-list">
              {contacts.filter(contact => 
                contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contact.role.toLowerCase().includes(searchQuery.toLowerCase())
              ).map(contact => (
                <div
                  key={contact.id}
                  className={`contact-item ${selectedContact === contact.id ? 'active' : ''}`}
                  onClick={() => setSelectedContact(contact.id)}
                >
                  <div className="contact-avatar">
                    {contact.isBot ? contact.avatar : (
                      <>
                        {contact.avatar}
                        {contact.online && <div className="online-indicator" />}
                      </>
                    )}
                  </div>
                  <div className="contact-info">
                    <div className="contact-header">
                      <h4>{contact.name}</h4>
                      <span className="message-time">{contact.time}</span>
                    </div>
                    <div className="contact-preview">
                      <p>{contact.lastMessage}</p>
                      {contact.unread > 0 && (
                        <span className="unread-badge">{contact.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="chat-area">
            {currentContact && (
              <>
                {/* Chat Header */}
                <div className="chat-header">
                  <div className="chat-header-info">
                    <div className="contact-avatar small">
                      {currentContact.isBot ? currentContact.avatar : currentContact.avatar}
                      {currentContact.online && !currentContact.isBot && <div className="online-indicator" />}
                    </div>
                    <div>
                      <h3>{currentContact.name}</h3>
                      <p>{currentContact.online ? 'Online' : 'Offline'} • {currentContact.role}</p>
                    </div>
                  </div>
                  <div className="chat-actions">
                    <button className="action-btn">
                      <Phone size={20} />
                    </button>
                    <button className="action-btn">
                      <Video size={20} />
                    </button>
                    <button className="action-btn">
                      <MoreVertical size={20} />
                    </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="messages-area">
                  <div className="messages-container">
                    {currentMessages.map(msg => (
                      <div key={msg.id} className={`message ${msg.sent ? 'sent' : 'received'} ${msg.isBot ? 'bot' : ''}`}>
                        <div className="message-bubble">
                          <p>{msg.content}</p>
                          <div className="message-meta">
                            <span className="message-time">{msg.time}</span>
                            {msg.sent && (
                              <CheckCheck 
                                size={16} 
                                className={msg.read ? 'read' : ''}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Message Input */}
                <div className="message-input-container">
                  <button className="attach-btn">
                    <Paperclip size={20} />
                  </button>
                  <div className="input-wrapper">
                    <textarea
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="message-input"
                      rows="1"
                    />
                    <button className="emoji-btn">
                      <Smile size={20} />
                    </button>
                  </div>
                  <button 
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;