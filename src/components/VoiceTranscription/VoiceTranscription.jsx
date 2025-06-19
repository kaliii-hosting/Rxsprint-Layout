import React, { useState, useEffect, useRef } from 'react';
import { X, Mic } from 'lucide-react';
import gsap from 'gsap';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, firestore } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';
import ConfirmationPopup from '../ConfirmationPopup/ConfirmationPopup';
import './VoiceTranscription.css';

const VoiceTranscription = ({ isOpen, onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState(null);
  const navigate = useNavigate();
  
  const waveformRef = useRef(null);
  const animationRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingStartTimeRef = useRef(null);
  const finalTranscriptionRef = useRef('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setTranscription('');
      setConnectionStatus('disconnected');
      setIsSaving(false);
      finalTranscriptionRef.current = '';
      
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
      if (isRecording) {
        stopRecording(false); // Don't save on cleanup
      }
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
      console.log('Starting recording...');
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log('Got media stream');
      
      // Initialize Web Speech API for transcription
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser');
      }
      
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        console.log('Speech recognition started');
        setConnectionStatus('connected');
      };
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update transcription with both final and interim results
        const currentFinal = finalTranscriptionRef.current;
        const newTranscription = currentFinal + finalTranscript + interimTranscript;
        setTranscription(newTranscription.trim());
        
        // Update final transcription reference
        if (finalTranscript) {
          finalTranscriptionRef.current = currentFinal + finalTranscript;
          console.log('Updated transcription:', finalTranscriptionRef.current);
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setConnectionStatus('error');
        if (event.error === 'not-allowed') {
          alert('Microphone access was denied. Please allow microphone access and try again.');
        }
      };
      
      recognition.onend = () => {
        console.log('Speech recognition ended');
        // Restart if still recording
        if (isRecording && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Error restarting recognition:', e);
          }
        }
      };
      
      // Start speech recognition
      recognition.start();
      
      // Start media recorder for audio recording
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      setConnectionStatus('error');
      alert(error.message || 'Failed to start recording. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = async (shouldSave = true) => {
    console.log('Stopping recording...');
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Wait for any remaining data
      await new Promise(resolve => {
        mediaRecorderRef.current.onstop = resolve;
      });
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Save to Firebase if we have audio data and shouldSave is true
    if (shouldSave && audioChunksRef.current.length > 0) {
      await saveToFirebase();
    } else if (shouldSave && audioChunksRef.current.length === 0) {
      console.log('No audio data to save');
      alert('No audio was recorded. Please try again.');
    }
    
    setIsRecording(false);
  };

  const saveToFirebase = async () => {
    try {
      setIsSaving(true);
      setConnectionStatus('saving');
      
      // Calculate duration
      const duration = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
      
      let audioUrl = null;
      let fileName = null;
      
      // Try to upload audio to Firebase Storage
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fileName = `voice-notes/audio_${timestamp}.webm`;
        const storageRef = ref(storage, fileName);
        
        const snapshot = await uploadBytes(storageRef, audioBlob);
        audioUrl = await getDownloadURL(snapshot.ref);
        console.log('Audio uploaded successfully');
      } catch (storageError) {
        console.error('Error uploading audio to storage:', storageError);
        // Continue without audio URL - just save the transcription
      }
      
      // Save transcription to Firestore (with or without audio)
      const notesRef = collection(firestore, 'notes');
      const noteData = {
        title: `Voice Note - ${new Date().toLocaleString()}`,
        content: finalTranscriptionRef.current || 'No transcription available',
        category: 'voice',
        duration: duration,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Only add audio fields if upload was successful
      if (audioUrl) {
        noteData.audioUrl = audioUrl;
        noteData.fileName = fileName;
      }
      
      const docRef = await addDoc(notesRef, noteData);
      
      console.log('Voice note saved successfully');
      setSavedNoteId(docRef.id);
      setConnectionStatus('saved');
      setIsSaving(false);
      
      // Show confirmation popup
      setShowConfirmation(true);
      
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
    setShowConfirmation(false);
    onClose();
  };
  
  const handleStopRecording = async () => {
    if (isRecording) {
      await stopRecording();
    }
  };
  
  const handleViewNote = () => {
    setShowConfirmation(false);
    onClose();
    navigate('/notes', { state: { highlightNoteId: savedNoteId } });
  };
  
  const handleContinue = () => {
    setShowConfirmation(false);
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
            {transcription || (connectionStatus === 'connected' ? 'Listening... Speak now!' : connectionStatus === 'error' ? 'Connection error. Please try again.' : 'Connecting...')}
          </div>
          
          {/* Stop Recording Button */}
          <button 
            className="stop-recording-btn"
            onClick={handleStopRecording}
            title="Stop Recording"
            disabled={!isRecording || isSaving}
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
      
      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={showConfirmation}
        message="Voice note has been transcribed and saved to the notes page"
        onClose={handleContinue}
        showButtons={true}
        onContinue={handleContinue}
        onViewMedication={handleViewNote}
        viewButtonText="View Note"
      />
    </div>
  );
};

export default VoiceTranscription;