import React, { useState, useRef, useEffect } from 'react';
import { Plus, Mic, Send } from 'lucide-react';
import { useModel } from '../../contexts/ModelContext';
import './Terminal.css';

// Function to parse markdown-like content
const parseMarkdownContent = (text) => {
    let result = text;
    
    // Parse markdown tables
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    let match;
    
    while ((match = tableRegex.exec(text)) !== null) {
        const headers = match[1].split('|').map(h => h.trim()).filter(h => h);
        const rows = match[2].trim().split('\n').map(row => 
            row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
        );
        
        // Determine if we should use card layout on mobile
        const useCardLayout = headers.length <= 4 ? 'table-responsive-cards' : '';
        
        // Build HTML table
        let tableHtml = `<div class="table-wrapper ${useCardLayout}"><table>`;
        
        // Add headers
        tableHtml += '<thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th>${escapeHtml(header)}</th>`;
        });
        tableHtml += '</tr></thead>';
        
        // Add rows
        tableHtml += '<tbody>';
        rows.forEach(row => {
            if (row.length > 0) {
                tableHtml += '<tr>';
                row.forEach((cell, index) => {
                    // Add data-label for mobile responsive cards
                    const cellContent = escapeHtml(cell);
                    tableHtml += `<td data-label="${escapeHtml(headers[index] || '')}">${cellContent}</td>`;
                });
                tableHtml += '</tr>';
            }
        });
        tableHtml += '</tbody></table></div>';
        
        result = result.replace(match[0], tableHtml);
    }
    
    // Parse bullet lists (- or *)
    result = result.replace(/^[\*\-]\s+(.+)$/gm, '<li>$1</li>');
    result = result.replace(/(<li>.*<\/li>)\n(?!<li>)/g, '<ul>$1</ul>\n');
    result = result.replace(/(<li>.*<\/li>)(<li>.*<\/li>)/g, '$1\n$2');
    result = result.replace(/(<ul>)\n?(<li>)/g, '$1$2');
    result = result.replace(/(<\/li>)\n?(<\/ul>)/g, '$1$2');
    
    // Parse numbered lists
    result = result.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    result = result.replace(/(<li>.*<\/li>)(?=\n(?!<li>))/g, '<ol>$1</ol>');
    
    // Parse code blocks
    result = result.replace(/```([\\s\\S]*?)```/g, '<pre><code>$1</code></pre>');
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Parse headers
    result = result.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    result = result.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    result = result.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    result = result.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Parse bold and italic
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Parse links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    return result;
};

// Helper function to escape HTML
const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

// Component for rendering message content with table support
const MessageContent = ({ content }) => {
    const processedContent = parseMarkdownContent(content);
    
    // If content contains HTML (tables, lists, etc.), render as HTML
    if (processedContent !== content) {
        return (
            <div 
                className="message-content-pro"
                dangerouslySetInnerHTML={{ __html: processedContent }}
            />
        );
    }
    
    // Otherwise render as plain text
    return (
        <div className="message-content-pro">
            {content}
        </div>
    );
};

export default function Terminal() {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const chatContainerRef = useRef(null);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    
    // Use global model context
    const { selectedModel, getActualModelName } = useModel();

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Hide all floating assistant buttons on terminal page
        const hideAssistantButtons = () => {
            // Hide the global AI assistant button
            const globalAIButton = document.querySelector('.floating-ai-assistant');
            if (globalAIButton) {
                globalAIButton.style.display = 'none';
            }
            
            // Hide the medication chatbot toggle button
            const chatToggleBtn = document.querySelector('.chat-toggle-btn');
            if (chatToggleBtn) {
                chatToggleBtn.style.display = 'none';
            }
        };
        
        // Initial hide
        hideAssistantButtons();
        
        // Set up observer to catch dynamically added buttons
        const observer = new MutationObserver(() => {
            hideAssistantButtons();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        return () => {
            observer.disconnect();
            // Show buttons again when leaving the page
            const globalAIButton = document.querySelector('.floating-ai-assistant');
            if (globalAIButton) {
                globalAIButton.style.display = '';
            }
            const chatToggleBtn = document.querySelector('.chat-toggle-btn');
            if (chatToggleBtn) {
                chatToggleBtn.style.display = '';
            }
        };
    }, []);

    useEffect(() => {
        // Initialize speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setInputValue(prev => prev + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsRecording(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const scrollToBottom = () => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() && !uploadedFile) return;

        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: inputValue.trim(),
            file: uploadedFile,
            timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => [...prev, userMessage]);
        const currentInput = inputValue.trim();
        setInputValue('');
        setUploadedFile(null);
        setIsLoading(true);
        setIsInputExpanded(false);
        
        // Reset textarea height
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }

        // Get the actual model name from the global context
        const actualModel = getActualModelName(selectedModel);
        
        // Log the exact model being used for debugging
        console.log(`Using model: ${actualModel} (${selectedModel})`);

        try {
            const response = await fetch('https://rxsprint-ai.ngrok.app/api/generate', {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: actualModel, // Use exact Ollama model name
                    prompt: currentInput,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            const aiMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: data.response || 'Sorry, I could not generate a response.',
                timestamp: new Date().toLocaleTimeString()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = {
                id: Date.now() + 1,
                type: 'ai',
                content: 'Sorry, there was an error connecting to the AI service. Please try again.',
                timestamp: new Date().toLocaleTimeString(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        
        // Auto-expand input based on content
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            const scrollHeight = inputRef.current.scrollHeight;
            const maxHeight = window.innerWidth <= 768 ? 100 : 120;
            inputRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
            
            // Set expansion state based on content length or height
            setIsInputExpanded(scrollHeight > 50 || value.length > 50);
        }
    };


    const toggleRecording = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            recognitionRef.current.start();
            setIsRecording(true);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadedFile({
                name: file.name,
                size: file.size,
                type: file.type
            });
        }
    };

    return (
        <div className="professional-chat-container">
            {/* Chat Content Area */}
            <div className="chat-content-area">
                {/* Chat Messages */}
                <div className="chat-messages-pro" ref={chatContainerRef}>
                    {messages.length === 0 && (
                        <div className="welcome-section">
                            <h1 className="welcome-title">How can I help, Kaliii?</h1>
                        </div>
                    )}

                    {messages.map(message => (
                        <div key={message.id} className={`message-wrapper ${message.type}`}>
                            <div className="message-bubble">
                                {message.file && (
                                    <div className="file-attachment-label">
                                        📎 {message.file.name}
                                    </div>
                                )}
                                <MessageContent content={message.content} />
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message-wrapper ai">
                            <div className="message-bubble">
                                <div className="typing-indicator-pro">
                                    <div className="typing-dots-pro">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area - Fixed at bottom */}
                <div className={`input-section-pro ${isInputExpanded ? 'expanded' : ''}`}>
                    <div className={`input-wrapper-pro ${isInputExpanded ? 'expanded' : ''}`}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        
                        <button 
                            className="input-icon-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload file"
                        >
                            <Plus size={18} />
                        </button>
                        
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask anything"
                            className="input-field-pro"
                            disabled={isLoading}
                            rows={1}
                            style={{ resize: 'none' }}
                        />
                        
                        <button 
                            className={`input-icon-btn voice-btn ${isRecording ? 'recording' : ''}`}
                            onClick={toggleRecording}
                            title={isRecording ? 'Stop recording' : 'Start voice recording'}
                        >
                            <Mic size={18} />
                            {isRecording && (
                                <div className="recording-pulse"></div>
                            )}
                        </button>
                        
                        <button 
                            className="input-icon-btn submit-btn"
                            onClick={handleSendMessage}
                            title="Send message"
                            disabled={isLoading || (!inputValue.trim() && !uploadedFile)}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    
                    {uploadedFile && (
                        <div className="file-preview-inline">
                            <span>📎 {uploadedFile.name}</span>
                            <button 
                                onClick={() => setUploadedFile(null)} 
                                className="remove-file-btn"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}