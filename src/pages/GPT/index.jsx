import React, { useState } from 'react';
import { Bot, Send, User } from 'lucide-react';
import './GPT.css';

const GPT = () => {
  // Toggle state
  const [activeSection, setActiveSection] = useState('drug-search'); // 'drug-search' or 'drug-interactions'
  
  // Drug Search states
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Drug Interactions states
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState('');
  
  // Refs
  const queryInputRef = useRef(null);
  const drug1Ref = useRef(null);
  const drug2Ref = useRef(null);
  
  // API Configuration
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
  // GitHub Models endpoint
  const ENDPOINT = "https://models.inference.ai.azure.com";
  const MODEL = "gpt-4o";
=======
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
>>>>>>> d97450f (Stage30)

  // Use environment variable for GitHub token
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Here you would implement your GitHub API call or other AI service
      // For now, this is a placeholder response
      if (!token) {
        throw new Error('GitHub token not found. Please set VITE_GITHUB_TOKEN in your environment variables.');
      }

      // Simulate API response
      setTimeout(() => {
        const botMessage = { 
          role: 'assistant', 
          content: 'This is a placeholder response. GitHub token is properly configured from environment variables.' 
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
      }, 1000);

    } catch (error) {
      const errorMessage = { 
        role: 'assistant', 
        content: `Error: ${error.message}` 
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="gpt-page page-container">
      <div className="content-header">
        <Bot size={28} />
        <h1>GPT Assistant</h1>
      </div>
      
      <div className="gpt-content">
        <div className="chat-container">
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="empty-state">
                <Bot size={64} />
                <h2>AI Assistant</h2>
                <p>Start a conversation with your AI assistant</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  <div className="message-icon">
                    {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                  </div>
                  <div className="message-content">
                    {message.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="message assistant">
                <div className="message-icon">
                  <Bot size={20} />
                </div>
                <div className="message-content loading">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                rows={1}
              />
              <button 
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="send-button"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPT;
