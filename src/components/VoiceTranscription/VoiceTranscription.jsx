import React, { useState, useEffect, useRef } from 'react';
import { X, Mic } from 'lucide-react';
import gsap from 'gsap';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, firestore } from '../../config/firebase';
import './VoiceTranscription.css';

const VoiceTranscription = ({ isOpen, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isSaving, setIsSaving] = useState(false);
  
  const waveformRef = useRef(null);
  const animationRef = useRef(null);
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const finalTranscriptionRef = useRef('');
  
  // AssemblyAI configuration
  const ASSEMBLYAI_API_KEY = 'f88de59cabf64215982d489b1b14f888';
  const ASSEMBLYAI_WS_URL = 'wss://api.assemblyai.com/v2/realtime/ws';

  useEffect(() => {
    if (isOpen) {
      // Start recording automatically when opened
      startRecording();
      
      // Initialize GSAP animation
      animateWaveform();
    }
    
    return () => {
      // Cleanup
      if (animationRef.current) {
        animationRef.current.kill();
      }
      stopRecording();
    };
  }, [isOpen]);

  const animateWaveform = () => {
    if (!waveformRef.current) return;
    
    const bars = waveformRef.current.querySelectorAll('.waveform-bar');
    
    // Kill any existing animation
    if (animationRef.current) {
      animationRef.current.kill();
    }
    
    // Create timeline
    const tl = gsap.timeline({ repeat: -1 });
    
    bars.forEach((bar, index) => {
      const delay = index * 0.05;
      
      tl.to(bar, {
        scaleY: () => Math.random() * 2 + 0.5,
        duration: 0.3,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1,
        delay: delay,
      }, 0);
      
      // Add glow effect
      tl.to(bar, {
        filter: "blur(0px) drop-shadow(0 0 10px #FF5500)",
        duration: 0.3,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 1,
        delay: delay,
      }, 0);
    });
    
    animationRef.current = tl;
  };

  const startRecording = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Initialize WebSocket connection to AssemblyAI
      const socket = new WebSocket(`${ASSEMBLYAI_WS_URL}?sample_rate=16000`);
      socketRef.current = socket;
      
      socket.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        
        // Send auth token
        socket.send(JSON.stringify({
          audio_data: '',
          token: ASSEMBLYAI_API_KEY
        }));
        
        // Start media recorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        recordingStartTimeRef.current = Date.now();
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            
            // Convert to base64 and send to AssemblyAI
            const reader = new FileReader();
            reader.onload = () => {
              const base64data = reader.result.split(',')[1];
              if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  audio_data: base64data
                }));
              }
            };
            reader.readAsDataURL(event.data);
          }
        };
        
        mediaRecorder.start(100); // Collect data every 100ms
        setIsRecording(true);
      };
      
      socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        
        if (data.text) {
          // Append new transcription to existing
          setTranscription(prev => {
            const newText = prev ? `${prev} ${data.text}` : data.text;
            finalTranscriptionRef.current = newText;
            return newText;
          });
        }
        
        if (data.message_type === 'FinalTranscript') {
          // Final transcript received
          console.log('Final transcript:', data.text);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      socket.onclose = () => {
        console.log('WebSocket closed');
        setConnectionStatus('disconnected');
      };
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = async () => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Wait for any remaining data
      await new Promise(resolve => {
        mediaRecorderRef.current.onstop = resolve;
      });
    }
    
    // Close WebSocket
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Save to Firebase if we have transcription
    if (finalTranscriptionRef.current && audioChunksRef.current.length > 0) {
      await saveToFirebase();
    }
    
    setIsRecording(false);
  };

  const saveToFirebase = async () => {
    try {
      setIsSaving(true);
      setConnectionStatus('saving');
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Calculate duration
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      
      // Upload audio to Firebase Storage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `voice-notes/audio_${timestamp}.webm`;
      const storageRef = ref(storage, fileName);
      
      const snapshot = await uploadBytes(storageRef, audioBlob);
      const audioUrl = await getDownloadURL(snapshot.ref);
      
      // Save transcription to Firestore
      const notesRef = collection(firestore, 'notes');
      await addDoc(notesRef, {
        title: `Voice Note - ${new Date().toLocaleString()}`,
        content: finalTranscriptionRef.current || 'No transcription available',
        category: 'voice',
        audioUrl: audioUrl,
        fileName: fileName,
        duration: duration,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('Voice note saved successfully');
      setConnectionStatus('saved');
      
      // Show saved status briefly before closing
      setTimeout(() => {
        setIsSaving(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      setIsSaving(false);
      setConnectionStatus('error');
      alert('Failed to save voice note. Please try again.');
    }
  };

  const handleClose = async () => {
    if (isRecording) {
      await stopRecording();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="voice-transcription-overlay">
      <div className="voice-transcription-container">
        <button className="close-button" onClick={handleClose}>
          <X size={24} />
        </button>
        
        <div className="transcription-content">
          <div className="transcription-text">
            {transcription || 'Listening...'}
          </div>
          
          {/* Stop Recording Button */}
          <button 
            className="stop-recording-btn"
            onClick={handleClose}
            title="Stop Recording"
          >
            <Mic size={32} />
          </button>
          
          <div className="waveform-container" ref={waveformRef}>
            {[...Array(40)].map((_, i) => (
              <div 
                key={i} 
                className="waveform-bar"
                style={{
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>
          
          <div className="status-indicator">
            <div className={`status-dot ${connectionStatus}`} />
            <span className="status-text">
              {connectionStatus === 'connected' ? 'Recording' : 
               connectionStatus === 'error' ? 'Connection Error' : 
               connectionStatus === 'saving' ? 'Saving...' :
               connectionStatus === 'saved' ? 'Saved!' :
               'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTranscription;