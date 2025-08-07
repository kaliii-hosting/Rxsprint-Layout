import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  Copy, 
  Check, 
  RefreshCw,
  Info,
  Calendar,
  User,
  Pill,
  AlertCircle,
  Activity,
  Heart,
  Baby,
  Plane,
  Home,
  Clock,
  Package,
  ChevronDown,
  ChevronRight,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './NoteGenerator.css';

const NoteGenerator = () => {
  const { theme } = useTheme();
  const [copiedNote, setCopiedNote] = useState(null);
  const formRefs = useRef({});
  const [filledFields, setFilledFields] = useState(new Set());
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedNote, setEditedNote] = useState('');
  const noteTextareaRef = useRef(null);
  const [dragState, setDragState] = useState({ isDragging: false, fieldName: null, dragPosition: null, yesValue: null, noValue: null });
  const toggleRefs = useRef({});
  const [isPatientInfoExpanded, setIsPatientInfoExpanded] = useState(false);
  const dragStartPosition = useRef(null);
  const lastUpdateTime = useRef(0);
  const animationFrameRef = useRef(null);
  const actualDraggedRef = useRef(false);
  const dragStartPositionRef = useRef(null);
  
  // Patient Information Form State
  const [patientInfoForm, setPatientInfoForm] = useState({
    unitNumber: '',
    accountNumber: '',
    patientName: '',
    medicationName: '',
    changes: ''
  });

  // Intervention Note Form State - Rearranged fields in requested order
  const [interventionForm, setInterventionForm] = useState({
    // Basic Information
    reviewedNotesFor: '',
    sig: '',
    dose: '',
    patientWeight: '',
    previousPatientWeight: '',
    pregnancyStatus: '',
    orderLastFilled: '',
    numberOfDoses: '',
    ivAccessIssues: '',
    ivAccessDetails: '',
    epipenStatus: '',
    epipenExpiryDate: '',
    travelPlans: '',
    travelDetails: '',
    hasRecentHospitalization: '',
    hospitalizationDate: '',
    hasRecentER: '',
    erDetails: '',
    hasWorseningSymptoms: '',
    symptomsDetails: '',
    hasMissedDoses: '',
    missedDosesDetails: '',
    hasAllergyChanges: '',
    allergyChangesDetails: '',
    hasMedicationChanges: '',
    medicationChangesDetails: '',
    nextDoseDate: '',
    lastDoseDate2: '', // Second instance of last dose
    compliance: '',
    infusionMethod: '',
    infusionMethodOther: '',
    pharmacistQuestions: '',
    pharmacistQuestionsDetails: '',
    ade: '',
    shippingStatus: '',
    shippingDetails: '',
    stao: ''
  });

  // Field order for navigation
  const fieldOrder = [
    'reviewedNotesFor',
    'sig',
    'dose',
    'patientWeight',
    'previousPatientWeight',
    'pregnancyStatus',
    'orderLastFilled',
    'numberOfDoses',
    'ivAccessIssues',
    'ivAccessDetails',
    'epipenStatus',
    'epipenExpiryDate',
    'travelPlans',
    'travelDetails',
    'hasRecentHospitalization',
    'hospitalizationDate',
    'hasRecentER',
    'erDetails',
    'hasWorseningSymptoms',
    'symptomsDetails',
    'hasMissedDoses',
    'missedDosesDetails',
    'hasAllergyChanges',
    'allergyChangesDetails',
    'hasMedicationChanges',
    'medicationChangesDetails',
    'nextDoseDate',
    'lastDoseDate2',
    'compliance',
    'infusionMethod',
    'infusionMethodOther',
    'pharmacistQuestions',
    'pharmacistQuestionsDetails',
    'ade',
    'shippingStatus',
    'shippingDetails',
    'stao'
  ];

  // Update intervention form field
  const updateInterventionField = (field, value) => {
    setInterventionForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update filled fields for highlighting
    if (value && value !== '') {
      setFilledFields(prev => new Set([...prev, field]));
    } else {
      setFilledFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }
  };

  // Render three-way switch toggle component with drag support
  const renderSwitchToggle = (fieldName, yesValue, noValue, yesLabel = 'Yes', noLabel = 'No') => {
    const currentValue = interventionForm[fieldName];
    const isFieldDragging = dragState.isDragging && dragState.fieldName === fieldName;
    
    let dataValue = '';
    
    if (currentValue === yesValue) {
      dataValue = 'yes';
    } else if (currentValue === noValue) {
      dataValue = 'no';
    } else {
      dataValue = '';
    }
    
    const updateValueFromPosition = (position) => {
      let newValue;
      if (position < 0.33) {
        newValue = yesValue;
      } else if (position > 0.66) {
        newValue = noValue;
      } else {
        newValue = '';
      }
      updateInterventionField(fieldName, newValue);
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Store initial mouse position for drag detection
      dragStartPositionRef.current = { x: e.clientX, y: e.clientY };
      actualDraggedRef.current = false;
      
      // Store initial position for smooth transitions
      const rect = toggleRefs.current[fieldName]?.getBoundingClientRect();
      if (rect) {
        const initialX = e.clientX - rect.left;
        const initialPosition = Math.max(0, Math.min(1, initialX / rect.width));
        dragStartPosition.current = initialPosition;
      }
      
      setDragState({ isDragging: true, fieldName, dragPosition: null, yesValue, noValue });
      
      // Prevent text selection during potential drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      document.body.style.cursor = 'grabbing';
    };
    
    // Touch events for mobile
    const handleTouchStart = (e) => {
      e.preventDefault();
      
      // Store initial touch position for drag detection
      if (e.touches[0]) {
        dragStartPositionRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        actualDraggedRef.current = false;
      }
      
      // Store initial touch position
      const rect = toggleRefs.current[fieldName]?.getBoundingClientRect();
      if (rect && e.touches[0]) {
        const initialX = e.touches[0].clientX - rect.left;
        const initialPosition = Math.max(0, Math.min(1, initialX / rect.width));
        dragStartPosition.current = initialPosition;
      }
      
      setDragState({ isDragging: true, fieldName, dragPosition: null, yesValue, noValue });
    };
    
    const handleToggleClick = (e) => {
      // Only handle click if user didn't actually drag
      if (actualDraggedRef.current) return;
      
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const position = clickX / width;
      
      updateValueFromPosition(position);
    };

    // Simple click handler that works independently of drag system
    const handleDirectClick = (e) => {
      e.stopPropagation();
      
      // If currently dragging, let drag system handle it
      if (dragState.isDragging && dragState.fieldName === fieldName) {
        return;
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      const position = clickX / width;
      
      // Direct position-based toggle
      let newValue;
      if (position < 0.33) {
        newValue = yesValue;
      } else if (position > 0.66) {
        newValue = noValue;
      } else {
        newValue = '';
      }
      
      updateInterventionField(fieldName, newValue);
    };
    
    const handleToggleKeyPress = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Cycle through: neutral -> yes -> no -> neutral
        let newValue;
        if (currentValue === '') {
          newValue = yesValue;
        } else if (currentValue === yesValue) {
          newValue = noValue;
        } else {
          newValue = '';
        }
        updateInterventionField(fieldName, newValue);
        handleKeyPress(e, fieldName);
      }
    };
    
    // Calculate visual position for smooth slider movement
    const getVisualPosition = () => {
      if (isFieldDragging && dragState.dragPosition !== null) {
        // Direct mapping of drag position to visual position for smooth movement
        const position = Math.max(0, Math.min(1, dragState.dragPosition));
        
        // Convert 0-1 drag position to percentage position
        // Switch toggle width is 180px with 4px padding on each side
        // Slider button is 60px wide (33.33% of 180px)
        // Left position: 4px (2.22%), Center: 60px (33.33%), Right: 116px (64.44%)
        
        if (position <= 0.33) {
          // Interpolate from left position to center
          const localPos = position / 0.33;
          return 2.22 + (localPos * (33.33 - 2.22)); // 2.22% to 33.33%
        } else if (position >= 0.67) {
          // Interpolate from center to right position  
          const localPos = (position - 0.67) / 0.33;
          return 33.33 + (localPos * (64.44 - 33.33)); // 33.33% to 64.44%
        } else {
          // Stay in center zone
          return 33.33;
        }
      }
      
      // Return static positions based on current value
      if (currentValue === yesValue) {
        return 2.22; // Left position (4px from edge = 2.22% of 180px)
      } else if (currentValue === noValue) {
        return 64.44; // Right position (116px = 64.44% of 180px)
      } else {
        return 33.33; // Center position
      }
    };
    
    return (
      <div className="toggle-button-group-label">
        <div
          ref={(el) => {
            formRefs.current[fieldName] = el;
            toggleRefs.current[fieldName] = el;
          }}
          className={`switch-toggle ${isFieldDragging ? 'dragging' : ''}`}
          data-value={dataValue}
          onClick={handleDirectClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onKeyPress={handleToggleKeyPress}
          tabIndex={0}
          role="switch"
          aria-checked={dataValue === 'yes' ? 'true' : dataValue === 'no' ? 'false' : 'mixed'}
        >
          <div 
            className="switch-toggle-slider"
            style={{
              '--slider-position': `${getVisualPosition()}%`
            }}
          >
            <span className="switch-toggle-text left">{yesLabel}</span>
            <span className="switch-toggle-text middle">-</span>
            <span className="switch-toggle-text right">{noLabel}</span>
          </div>
        </div>
      </div>
    );
  };

  // Handle Enter key press
  const handleKeyPress = (e, currentField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Find current field index
      const currentIndex = fieldOrder.indexOf(currentField);
      
      // Find next visible field
      let nextIndex = currentIndex + 1;
      while (nextIndex < fieldOrder.length) {
        const nextField = fieldOrder[nextIndex];
        const nextElement = formRefs.current[nextField];
        
        // Check if element exists and is visible
        if (nextElement && nextElement.offsetParent !== null) {
          // Focus on the next field
          if (nextElement.type === 'checkbox') {
            nextElement.focus();
          } else {
            nextElement.focus();
            nextElement.select();
          }
          break;
        }
        nextIndex++;
      }
    }
  };

  // Generate patient info note
  const generatePatientInfoNote = () => {
    const fields = [];
    
    if (patientInfoForm.unitNumber) fields.push(patientInfoForm.unitNumber);
    if (patientInfoForm.accountNumber) fields.push(patientInfoForm.accountNumber);
    if (patientInfoForm.patientName) fields.push(patientInfoForm.patientName);
    if (patientInfoForm.medicationName) fields.push(patientInfoForm.medicationName);
    if (patientInfoForm.changes) fields.push(patientInfoForm.changes);
    
    return fields.join(' - ');
  };

  // Generate intervention note
  const generateInterventionNote = () => {
    const fields = [];
    
    // Start with basic information
    if (interventionForm.reviewedNotesFor) {
      fields.push(`Reviewed notes and order for ${interventionForm.reviewedNotesFor}`);
    } else {
      fields.push('Reviewed notes and order for');
    }
    
    if (interventionForm.sig) {
      fields.push(`Sig: ${interventionForm.sig}`);
    }
    
    if (interventionForm.dose) {
      fields.push(`Dose is appropriate at ${interventionForm.dose}`);
    }
    
    if (interventionForm.patientWeight) {
      fields.push(`Patient's weight is ${interventionForm.patientWeight} kg`);
    }
    
    // Weight change detection
    if (interventionForm.patientWeight && interventionForm.previousPatientWeight) {
      const currentWeight = parseFloat(interventionForm.patientWeight);
      const previousWeight = parseFloat(interventionForm.previousPatientWeight);
      
      if (!isNaN(currentWeight) && !isNaN(previousWeight)) {
        const weightDifference = currentWeight - previousWeight;
        const weightDifferenceAbs = Math.abs(weightDifference);
        
        if (weightDifference > 0) {
          fields.push(`Patient gained ${weightDifferenceAbs.toFixed(1)} kg`);
          fields.push(`Will keep monitoring patient's weight changes`);
        } else if (weightDifference < 0) {
          fields.push(`Patient lost ${weightDifferenceAbs.toFixed(1)} kg`);
          fields.push(`Will keep monitoring patient's weight changes`);
        }
      }
    }
    
    if (interventionForm.pregnancyStatus) {
      fields.push(`Patient is ${interventionForm.pregnancyStatus}`);
    }
    
    if (interventionForm.orderLastFilled) {
      fields.push(`Order last filled: ${interventionForm.orderLastFilled}`);
    }
    
    if (interventionForm.numberOfDoses) {
      fields.push(`Number of doses on hand with patient: ${interventionForm.numberOfDoses}`);
    }
    
    // IV Access Issues
    if (interventionForm.ivAccessIssues === 'no-issues') {
      fields.push('No reports of any IV access issues');
    } else if (interventionForm.ivAccessIssues === 'has-issues') {
      fields.push(`Patient reported IV access issue${interventionForm.ivAccessDetails ? `, ${interventionForm.ivAccessDetails}` : ''}`);
    }
    
    // Epipen Status
    if (interventionForm.epipenStatus === 'has-epipen') {
      fields.push(`Yes, patient has Epipen on hand${interventionForm.epipenExpiryDate ? ` (expires: ${interventionForm.epipenExpiryDate})` : ''}`);
    } else if (interventionForm.epipenStatus === 'no-epipen') {
      fields.push('Patient does not have Epipen on hand');
    }
    
    // Travel Plans
    if (interventionForm.travelPlans === 'has-travel') {
      fields.push(`Patient has upcoming travel plans${interventionForm.travelDetails ? `, ${interventionForm.travelDetails}` : ''}`);
    } else if (interventionForm.travelPlans === 'no-travel') {
      fields.push('Patient has no upcoming travel plans');
    }
    
    // Recent Hospitalizations
    if (interventionForm.hasRecentHospitalization === 'yes') {
      fields.push(`Patient had recent hospitalization${interventionForm.hospitalizationDate ? `, ${interventionForm.hospitalizationDate}` : ''}`);
    } else if (interventionForm.hasRecentHospitalization === 'no') {
      fields.push('Patient has no recent hospitalization');
    }
    
    // Recent ER Visits
    if (interventionForm.hasRecentER === 'yes') {
      fields.push(`Patient has recent ER visit${interventionForm.erDetails ? `, ${interventionForm.erDetails}` : ''}`);
    } else if (interventionForm.hasRecentER === 'no') {
      fields.push('Patient has no recent ER visit');
    }
    
    // Symptom Changes
    if (interventionForm.hasWorseningSymptoms === 'yes') {
      fields.push(`Patient had recent worsening of symptoms${interventionForm.symptomsDetails ? `, ${interventionForm.symptomsDetails}` : ''}`);
    } else if (interventionForm.hasWorseningSymptoms === 'no') {
      fields.push('Patient has no worsening of symptoms');
    }
    
    // Missed Doses
    if (interventionForm.hasMissedDoses === 'yes') {
      fields.push(`Patient had missed doses${interventionForm.missedDosesDetails ? `, ${interventionForm.missedDosesDetails}` : ''}`);
    } else if (interventionForm.hasMissedDoses === 'no') {
      fields.push('Patient has no missed doses');
    }
    
    // Allergy Changes
    if (interventionForm.hasAllergyChanges === 'yes') {
      fields.push(`Patient had recent changes to allergies${interventionForm.allergyChangesDetails ? `, ${interventionForm.allergyChangesDetails}` : ''}`);
    } else if (interventionForm.hasAllergyChanges === 'no') {
      fields.push('Patient has no recent changes to allergies');
    }
    
    // Medication Changes
    if (interventionForm.hasMedicationChanges === 'yes') {
      fields.push(`Patient had recent changes to medications${interventionForm.medicationChangesDetails ? `, ${interventionForm.medicationChangesDetails}` : ''}`);
    } else if (interventionForm.hasMedicationChanges === 'no') {
      fields.push('Patient has no recent changes to medications');
    }
    
    // Dosing Schedule
    if (interventionForm.nextDoseDate) {
      fields.push(`Next dose due on ${interventionForm.nextDoseDate}`);
    }
    
    if (interventionForm.lastDoseDate2) {
      fields.push(`Last dose was administered on ${interventionForm.lastDoseDate2}`);
    }
    
    // Compliance
    if (interventionForm.compliance === 'compliant') {
      fields.push('Patient compliant');
    } else if (interventionForm.compliance === 'not-compliant') {
      fields.push('Patient not compliant');
    }
    
    // Infusion Method
    if (interventionForm.infusionMethod === 'hhn') {
      fields.push('Patient has HHN');
    } else if (interventionForm.infusionMethod === 'self-infuses') {
      fields.push('Patient self-infuses');
    } else if (interventionForm.infusionMethod === 'md-office') {
      fields.push('Infusing at MD office or clinic');
    } else if (interventionForm.infusionMethod === 'other' && interventionForm.infusionMethodOther) {
      fields.push(interventionForm.infusionMethodOther);
    }
    
    // Pharmacist Interaction
    if (interventionForm.pharmacistQuestions === 'no-questions') {
      fields.push('Patient had no questions for RPh');
    } else if (interventionForm.pharmacistQuestions === 'had-questions') {
      fields.push(`Patient had questions for RPh${interventionForm.pharmacistQuestionsDetails ? `: ${interventionForm.pharmacistQuestionsDetails}` : ''}`);
    }
    
    // ADE
    if (interventionForm.ade === 'yes') {
      fields.push('ADE SUBMITTED');
    }
    
    // Shipping Status
    if (interventionForm.shippingStatus === 'okay-to-ship') {
      fields.push('Okay to ship supplies');
    } else if (interventionForm.shippingStatus === 'okay-to-ship-supplies-medication') {
      const medicationName = interventionForm.reviewedNotesFor || '';
      fields.push(`Okay to ship supplies and ${medicationName}`);
    } else if (interventionForm.shippingStatus === 'medication-only') {
      const medicationName = interventionForm.reviewedNotesFor || '';
      fields.push(`Okay to ship ${medicationName}`);
    } else if (interventionForm.shippingStatus === 'will-not-ship' && interventionForm.shippingDetails) {
      fields.push(`Order will not ship due to ${interventionForm.shippingDetails}`);
    }
    
    // STAO
    if (interventionForm.stao) {
      fields.push(`STAO: ${interventionForm.stao}`);
    }
    
    return fields.join(' . ').toUpperCase() + ' .';
  };

  // Copy to clipboard
  const copyToClipboard = async (text, section = 'intervention') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(section);
      setTimeout(() => setCopiedNote(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Handle edit mode
  const handleEditNote = () => {
    const currentNote = isEditingNote ? editedNote : generateInterventionNote();
    setEditedNote(currentNote);
    setIsEditingNote(true);
    setTimeout(() => {
      if (noteTextareaRef.current) {
        noteTextareaRef.current.focus();
        noteTextareaRef.current.setSelectionRange(currentNote.length, currentNote.length);
      }
    }, 100);
  };

  // Save edited note
  const handleSaveEdit = () => {
    setIsEditingNote(false);
    // Keep the edited note in state
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditingNote(false);
    setEditedNote('');
  };

  // Get the current note text
  const getCurrentNoteText = () => {
    return editedNote || generateInterventionNote();
  };

  // Reset patient info form
  const resetPatientInfoForm = () => {
    setPatientInfoForm({
      unitNumber: '',
      accountNumber: '',
      patientName: '',
      medicationName: '',
      changes: ''
    });
  };

  // Reset form
  const resetInterventionForm = () => {
    setInterventionForm({
      reviewedNotesFor: '',
      sig: '',
      dose: '',
      patientWeight: '',
      previousPatientWeight: '',
      pregnancyStatus: '',
      orderLastFilled: '',
      numberOfDoses: '',
      ivAccessIssues: '',
      ivAccessDetails: '',
      epipenStatus: '',
      epipenExpiryDate: '',
      travelPlans: '',
      travelDetails: '',
      hasRecentHospitalization: '',
      hospitalizationDate: '',
      hasRecentER: '',
      erDetails: '',
      hasWorseningSymptoms: '',
      symptomsDetails: '',
      hasMissedDoses: '',
      missedDosesDetails: '',
      hasAllergyChanges: '',
      allergyChangesDetails: '',
      hasMedicationChanges: '',
      medicationChangesDetails: '',
      nextDoseDate: '',
      lastDoseDate2: '',
      compliance: '',
      infusionMethod: '',
      infusionMethodOther: '',
      pharmacistQuestions: '',
      pharmacistQuestionsDetails: '',
      ade: '',
      shippingStatus: '',
      shippingDetails: '',
      stao: ''
    });
    setFilledFields(new Set());
    setIsEditingNote(false);
    setEditedNote('');
  };

  // Global event listeners for drag functionality
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!dragState.isDragging || !dragState.fieldName || !toggleRefs.current[dragState.fieldName]) return;
      
      // Check if user has moved mouse enough to count as dragging
      const dragStartPos = dragStartPositionRef.current;
      if (dragStartPos) {
        const distance = Math.sqrt(
          Math.pow(e.clientX - dragStartPos.x, 2) + 
          Math.pow(e.clientY - dragStartPos.y, 2)
        );
        
        // Lower threshold for more responsive fast drags
        if (distance > 3) {
          actualDraggedRef.current = true;
        }
      }
      
      e.preventDefault();
      
      const rect = toggleRefs.current[dragState.fieldName].getBoundingClientRect();
      const x = e.clientX - rect.left;
      // Improved boundary handling
      const padding = 2;
      const effectiveWidth = rect.width - (padding * 2);
      const adjustedX = Math.max(padding, Math.min(rect.width - padding, x));
      const position = Math.max(0, Math.min(1, (adjustedX - padding) / effectiveWidth));
      
      // Update drag position immediately for fast response
      setDragState(prev => ({
        ...prev,
        dragPosition: position
      }));
      
      // Update value immediately for fast drags - don't throttle the value updates
      let newValue;
      if (position < 0.33) {
        newValue = dragState.yesValue;
      } else if (position > 0.66) {
        newValue = dragState.noValue;
      } else {
        newValue = '';
      }
      
      // Only update if value actually changed
      const fieldName = dragState.fieldName;
      const currentValue = interventionForm[fieldName];
      
      if (currentValue !== newValue) {
        updateInterventionField(fieldName, newValue);
      }
    };
    
    const handleGlobalMouseUp = (e) => {
      if (dragState.isDragging) {
        // Final value update on release - use current mouse position for accuracy
        if (dragState.fieldName && toggleRefs.current[dragState.fieldName]) {
          const rect = toggleRefs.current[dragState.fieldName].getBoundingClientRect();
          const x = e.clientX - rect.left;
          const position = Math.max(0, Math.min(1, x / rect.width));
          
          let finalValue;
          if (position < 0.33) {
            finalValue = dragState.yesValue;
          } else if (position > 0.66) {
            finalValue = dragState.noValue;
          } else {
            finalValue = '';
          }
          updateInterventionField(dragState.fieldName, finalValue);
        }
        
        // Cleanup animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        setDragState({ isDragging: false, fieldName: null, dragPosition: null, yesValue: null, noValue: null });
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        document.body.style.cursor = '';
        dragStartPosition.current = null;
        dragStartPositionRef.current = null;
        
        // Reset drag tracking after a short delay to allow click handler to check
        setTimeout(() => {
          actualDraggedRef.current = false;
        }, 50);
      }
    };
    
    const handleGlobalTouchMove = (e) => {
      if (!dragState.isDragging || !dragState.fieldName || !toggleRefs.current[dragState.fieldName]) return;
      
      // Check if user has moved touch enough to count as dragging
      const dragStartPos = dragStartPositionRef.current;
      if (dragStartPos && e.touches[0]) {
        const distance = Math.sqrt(
          Math.pow(e.touches[0].clientX - dragStartPos.x, 2) + 
          Math.pow(e.touches[0].clientY - dragStartPos.y, 2)
        );
        
        // Lower threshold for more responsive fast drags
        if (distance > 3) {
          actualDraggedRef.current = true;
        }
      }
      
      e.preventDefault();
      
      const touch = e.touches[0];
      const rect = toggleRefs.current[dragState.fieldName].getBoundingClientRect();
      const x = touch.clientX - rect.left;
      // Improved boundary handling
      const padding = 2;
      const effectiveWidth = rect.width - (padding * 2);
      const adjustedX = Math.max(padding, Math.min(rect.width - padding, x));
      const position = Math.max(0, Math.min(1, (adjustedX - padding) / effectiveWidth));
      
      // Update drag position immediately for fast touch response
      setDragState(prev => ({
        ...prev,
        dragPosition: position
      }));
      
      // Update value immediately for fast touch drags
      let newValue;
      if (position < 0.33) {
        newValue = dragState.yesValue;
      } else if (position > 0.66) {
        newValue = dragState.noValue;
      } else {
        newValue = '';
      }
      
      const fieldName = dragState.fieldName;
      const currentValue = interventionForm[fieldName];
      
      if (currentValue !== newValue) {
        updateInterventionField(fieldName, newValue);
      }
    };
    
    const handleGlobalTouchEnd = () => {
      if (dragState.isDragging) {
        // Final value update on touch end
        if (dragState.dragPosition !== null && dragState.fieldName) {
          const position = dragState.dragPosition;
          let finalValue;
          if (position < 0.33) {
            finalValue = dragState.yesValue;
          } else if (position > 0.66) {
            finalValue = dragState.noValue;
          } else {
            finalValue = '';
          }
          updateInterventionField(dragState.fieldName, finalValue);
        }
        
        // Cleanup animation frame
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        setDragState({ isDragging: false, fieldName: null, dragPosition: null, yesValue: null, noValue: null });
        dragStartPosition.current = null;
        dragStartPositionRef.current = null;
        
        // Reset drag tracking after a short delay to allow click handler to check
        setTimeout(() => {
          actualDraggedRef.current = false;
        }, 50);
      }
    };
    
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove);
      document.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
        document.removeEventListener('touchmove', handleGlobalTouchMove);
        document.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [dragState, interventionForm]);

  return (
    <div className="note-generator-page page-container">
      <div className="note-generator-content">
        <div className="note-generator-dashboard">

          {/* Patient Information Section - Collapsible Dropdown */}
          <div className="dashboard-card patient-info-card full-width">
            <div className="card-header collapsible-header" onClick={() => setIsPatientInfoExpanded(!isPatientInfoExpanded)}>
              <div className="header-left">
                <h3>Patient Information</h3>
                <User size={20} />
              </div>
              <div className="collapse-indicator">
                {isPatientInfoExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
              </div>
            </div>
            {isPatientInfoExpanded && (
              <div className="card-body">
              <div className="patient-info-container">
                <div className="input-grid patient-info-grid">
                  <div className="input-group">
                    <label>Unit #</label>
                    <input
                      type="text"
                      value={patientInfoForm.unitNumber}
                      onChange={(e) => setPatientInfoForm(prev => ({ ...prev, unitNumber: e.target.value }))}
                      placeholder="Enter unit number"
                      className="note-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Account #</label>
                    <input
                      type="text"
                      value={patientInfoForm.accountNumber}
                      onChange={(e) => setPatientInfoForm(prev => ({ ...prev, accountNumber: e.target.value }))}
                      placeholder="Enter account number"
                      className="note-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Patient Name</label>
                    <input
                      type="text"
                      value={patientInfoForm.patientName}
                      onChange={(e) => setPatientInfoForm(prev => ({ ...prev, patientName: e.target.value }))}
                      placeholder="Enter patient name"
                      className="note-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Medication Name</label>
                    <input
                      type="text"
                      value={patientInfoForm.medicationName}
                      onChange={(e) => setPatientInfoForm(prev => ({ ...prev, medicationName: e.target.value }))}
                      placeholder="Enter medication name"
                      className="note-input"
                    />
                  </div>
                  <div className="input-group">
                    <label>Changes</label>
                    <input
                      type="text"
                      value={patientInfoForm.changes}
                      onChange={(e) => setPatientInfoForm(prev => ({ ...prev, changes: e.target.value }))}
                      placeholder="Enter changes"
                      className="note-input"
                    />
                  </div>
                </div>
                
                {/* Generated Patient Info Note - Matching Intervention Note Design */}
                <div className="generated-note-section intervention-style">
                  <h4 className="section-title">
                    <FileText size={16} />
                    Generated Patient Information Note
                  </h4>
                  <div className="note-output-container">
                    {isEditingNote ? (
                      <textarea
                        ref={noteTextareaRef}
                        className="note-edit-textarea"
                        value={editedNote}
                        onChange={(e) => setEditedNote(e.target.value)}
                        onBlur={() => {
                          setIsEditingNote(false);
                          setEditedNote('');
                        }}
                      />
                    ) : (
                      <div className="note-display" onClick={() => {
                        const note = generatePatientInfoNote();
                        if (note) {
                          setEditedNote(note);
                          setIsEditingNote(true);
                          setTimeout(() => noteTextareaRef.current?.focus(), 0);
                        }
                      }}>
                        {generatePatientInfoNote() || 'Fill in the fields above to generate the note'}
                      </div>
                    )}
                    <div className="note-actions">
                      <button
                        className="edit-note-btn"
                        onClick={() => {
                          const note = generatePatientInfoNote();
                          if (note) {
                            setEditedNote(note);
                            setIsEditingNote(true);
                            setTimeout(() => noteTextareaRef.current?.focus(), 0);
                          }
                        }}
                        disabled={!generatePatientInfoNote()}
                      >
                        <Edit size={16} />
                        Edit Note
                      </button>
                      <button
                        className="copy-note-btn primary"
                        onClick={() => copyToClipboard(editedNote || generatePatientInfoNote(), 'patient')}
                        disabled={!generatePatientInfoNote()}
                      >
                        {copiedNote === 'patient' ? (
                          <>
                            <Check size={16} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy Note to Clipboard
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>

          {/* Intervention Note Form */}
          <div className="dashboard-card note-form-card">
            <div className="card-header">
              <h3>Intervention Note Information</h3>
              <Activity size={20} />
            </div>
            <div className="card-body">
              <div className="intervention-form-container">
                {/* All fields in requested order */}
                <div className="form-section">
                  <h4 className="section-title">
                    <User size={16} />
                    Patient Information
                  </h4>
                  <div className="input-grid compact-grid">
                    <div className="input-group">
                      <label>Reviewed notes and order for</label>
                      <input
                        ref={el => formRefs.current['reviewedNotesFor'] = el}
                        type="text"
                        value={interventionForm.reviewedNotesFor}
                        onChange={(e) => updateInterventionField('reviewedNotesFor', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'reviewedNotesFor')}
                        placeholder="Enter medication/order details"
                        className={`note-input ${filledFields.has('reviewedNotesFor') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Sig</label>
                      <input
                        ref={el => formRefs.current['sig'] = el}
                        type="text"
                        value={interventionForm.sig}
                        onChange={(e) => updateInterventionField('sig', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'sig')}
                        placeholder="Enter sig"
                        className={`note-input ${filledFields.has('sig') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Dose is appropriate at</label>
                      <input
                        ref={el => formRefs.current['dose'] = el}
                        type="text"
                        value={interventionForm.dose}
                        onChange={(e) => updateInterventionField('dose', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'dose')}
                        placeholder="Enter dose"
                        className={`note-input ${filledFields.has('dose') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Current patient's weight</label>
                      <input
                        ref={el => formRefs.current['patientWeight'] = el}
                        type="number"
                        step="0.1"
                        value={interventionForm.patientWeight}
                        onChange={(e) => updateInterventionField('patientWeight', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'patientWeight')}
                        placeholder="Enter weight in kg"
                        className={`note-input ${filledFields.has('patientWeight') ? 'filled' : ''}`}
                      />
                    </div>
                    <div className="input-group">
                      <label>Previous patient's weight</label>
                      <input
                        ref={el => formRefs.current['previousPatientWeight'] = el}
                        type="number"
                        step="0.1"
                        value={interventionForm.previousPatientWeight}
                        onChange={(e) => updateInterventionField('previousPatientWeight', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'previousPatientWeight')}
                        placeholder="Enter weight in kg"
                        className={`note-input ${filledFields.has('previousPatientWeight') ? 'filled' : ''}`}
                      />
                    </div>
                    <div className="input-group">
                      <label>Patient Pregnancy Status</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['pregnancyStatus'] = el}
                          value={interventionForm.pregnancyStatus}
                          onChange={(e) => updateInterventionField('pregnancyStatus', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'pregnancyStatus')}
                          className={`note-dropdown ${filledFields.has('pregnancyStatus') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="pregnant">Pregnant</option>
                          <option value="not pregnant">Not pregnant</option>
                          <option value="not of child bearing age">Not of child bearing age</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Order last filled</label>
                      <input
                        ref={el => formRefs.current['orderLastFilled'] = el}
                        type="text"
                        value={interventionForm.orderLastFilled}
                        onChange={(e) => updateInterventionField('orderLastFilled', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'orderLastFilled')}
                        placeholder="Enter date"
                        className={`note-input ${filledFields.has('orderLastFilled') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Number of doses on hand with patient</label>
                      <input
                        ref={el => formRefs.current['numberOfDoses'] = el}
                        type="text"
                        value={interventionForm.numberOfDoses}
                        onChange={(e) => updateInterventionField('numberOfDoses', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'numberOfDoses')}
                        placeholder="Enter number of doses"
                        className={`note-input ${filledFields.has('numberOfDoses') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Toggle Options */}
                <div className="form-section toggle-buttons-section">
                  <h4 className="section-title">
                    <Activity size={16} />
                    Quick Toggle Options
                  </h4>
                  <div className="toggle-buttons-grid">
                    {/* Allergy Updates */}
                    <div className="input-group">
                      <label>Allergy updates</label>
                      {renderSwitchToggle('hasAllergyChanges', 'yes', 'no')}
                      {interventionForm.hasAllergyChanges === 'yes' && (
                        <input
                          ref={el => formRefs.current['allergyChangesDetails'] = el}
                          type="text"
                          value={interventionForm.allergyChangesDetails}
                          onChange={(e) => updateInterventionField('allergyChangesDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'allergyChangesDetails')}
                          placeholder="Enter allergy changes details"
                          className={`note-input ${filledFields.has('allergyChangesDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Medication Updates */}
                    <div className="input-group">
                      <label>Medication updates</label>
                      {renderSwitchToggle('hasMedicationChanges', 'yes', 'no')}
                      {interventionForm.hasMedicationChanges === 'yes' && (
                        <input
                          ref={el => formRefs.current['medicationChangesDetails'] = el}
                          type="text"
                          value={interventionForm.medicationChangesDetails}
                          onChange={(e) => updateInterventionField('medicationChangesDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'medicationChangesDetails')}
                          placeholder="Enter medication changes details"
                          className={`note-input ${filledFields.has('medicationChangesDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* IV Access Issues */}
                    <div className="input-group">
                      <label>IV access issues</label>
                      {renderSwitchToggle('ivAccessIssues', 'has-issues', 'no-issues')}
                      {interventionForm.ivAccessIssues === 'has-issues' && (
                        <input
                          ref={el => formRefs.current['ivAccessDetails'] = el}
                          type="text"
                          value={interventionForm.ivAccessDetails}
                          onChange={(e) => updateInterventionField('ivAccessDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'ivAccessDetails')}
                          placeholder="Enter IV access issue details"
                          className={`note-input ${filledFields.has('ivAccessDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Epipen Status */}
                    <div className="input-group">
                      <label>Epipen status</label>
                      {renderSwitchToggle('epipenStatus', 'has-epipen', 'no-epipen')}
                      {interventionForm.epipenStatus === 'has-epipen' && (
                        <input
                          ref={el => formRefs.current['epipenExpiryDate'] = el}
                          type="text"
                          value={interventionForm.epipenExpiryDate}
                          onChange={(e) => updateInterventionField('epipenExpiryDate', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'epipenExpiryDate')}
                          placeholder="Enter expiry date or details"
                          className={`note-input ${filledFields.has('epipenExpiryDate') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Travel Plans */}
                    <div className="input-group">
                      <label>Travel plans</label>
                      {renderSwitchToggle('travelPlans', 'has-travel', 'no-travel')}
                      {interventionForm.travelPlans === 'has-travel' && (
                        <input
                          ref={el => formRefs.current['travelDetails'] = el}
                          type="text"
                          value={interventionForm.travelDetails}
                          onChange={(e) => updateInterventionField('travelDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'travelDetails')}
                          placeholder="Enter travel details"
                          className={`note-input ${filledFields.has('travelDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Recent Hospitalizations */}
                    <div className="input-group">
                      <label>Recent hospitalizations</label>
                      {renderSwitchToggle('hasRecentHospitalization', 'yes', 'no')}
                      {interventionForm.hasRecentHospitalization === 'yes' && (
                        <input
                          ref={el => formRefs.current['hospitalizationDate'] = el}
                          type="text"
                          value={interventionForm.hospitalizationDate}
                          onChange={(e) => updateInterventionField('hospitalizationDate', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hospitalizationDate')}
                          placeholder="Enter hospitalization details"
                          className={`note-input ${filledFields.has('hospitalizationDate') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Recent ER Visits */}
                    <div className="input-group">
                      <label>Recent ER visits</label>
                      {renderSwitchToggle('hasRecentER', 'yes', 'no')}
                      {interventionForm.hasRecentER === 'yes' && (
                        <input
                          ref={el => formRefs.current['erDetails'] = el}
                          type="text"
                          value={interventionForm.erDetails}
                          onChange={(e) => updateInterventionField('erDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'erDetails')}
                          placeholder="Enter ER visit details"
                          className={`note-input ${filledFields.has('erDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Symptom Changes */}
                    <div className="input-group">
                      <label>Symptom changes</label>
                      {renderSwitchToggle('hasWorseningSymptoms', 'yes', 'no')}
                      {interventionForm.hasWorseningSymptoms === 'yes' && (
                        <input
                          ref={el => formRefs.current['symptomsDetails'] = el}
                          type="text"
                          value={interventionForm.symptomsDetails}
                          onChange={(e) => updateInterventionField('symptomsDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'symptomsDetails')}
                          placeholder="Enter symptom details"
                          className={`note-input ${filledFields.has('symptomsDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Missed Doses */}
                    <div className="input-group">
                      <label>Missed doses</label>
                      {renderSwitchToggle('hasMissedDoses', 'yes', 'no')}
                      {interventionForm.hasMissedDoses === 'yes' && (
                        <input
                          ref={el => formRefs.current['missedDosesDetails'] = el}
                          type="text"
                          value={interventionForm.missedDosesDetails}
                          onChange={(e) => updateInterventionField('missedDosesDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'missedDosesDetails')}
                          placeholder="Enter missed dose details"
                          className={`note-input ${filledFields.has('missedDosesDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* Compliance */}
                    <div className="input-group">
                      <label>Compliance</label>
                      {renderSwitchToggle('compliance', 'compliant', 'not-compliant')}
                    </div>

                    {/* Pharmacist Interaction */}
                    <div className="input-group">
                      <label>Pharmacist interaction</label>
                      {renderSwitchToggle('pharmacistQuestions', 'had-questions', 'no-questions')}
                      {interventionForm.pharmacistQuestions === 'had-questions' && (
                        <input
                          ref={el => formRefs.current['pharmacistQuestionsDetails'] = el}
                          type="text"
                          value={interventionForm.pharmacistQuestionsDetails}
                          onChange={(e) => updateInterventionField('pharmacistQuestionsDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'pharmacistQuestionsDetails')}
                          placeholder="Enter questions details"
                          className={`note-input ${filledFields.has('pharmacistQuestionsDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase', marginTop: '0.5rem' }}
                        />
                      )}
                    </div>

                    {/* ADE */}
                    <div className="input-group">
                      <label>ADE</label>
                      {renderSwitchToggle('ade', 'yes', 'no')}
                    </div>
                  </div>
                </div>

                {/* Dosing & Administration */}
                <div className="form-section">
                  <h4 className="section-title">
                    <Calendar size={16} />
                    Dosing & Administration
                  </h4>
                  <div className="input-grid compact-grid">
                    <div className="input-group">
                      <label>Next dose due on</label>
                      <input
                        ref={el => formRefs.current['nextDoseDate'] = el}
                        type="text"
                        value={interventionForm.nextDoseDate}
                        onChange={(e) => updateInterventionField('nextDoseDate', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'nextDoseDate')}
                        placeholder="Enter date"
                        className={`note-input ${filledFields.has('nextDoseDate') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Last dose was administered on</label>
                      <input
                        ref={el => formRefs.current['lastDoseDate2'] = el}
                        type="text"
                        value={interventionForm.lastDoseDate2}
                        onChange={(e) => updateInterventionField('lastDoseDate2', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'lastDoseDate2')}
                        placeholder="Enter date"
                        className={`note-input ${filledFields.has('lastDoseDate2') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    <div className="input-group">
                      <label>Infusion method</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['infusionMethod'] = el}
                          value={interventionForm.infusionMethod}
                          onChange={(e) => updateInterventionField('infusionMethod', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'infusionMethod')}
                          className={`note-dropdown ${filledFields.has('infusionMethod') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="hhn">Patient has HHN</option>
                          <option value="self-infuses">Patient self-infuses</option>
                          <option value="md-office">Infusing at MD office or clinic</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.infusionMethod === 'other' && (
                      <div className="input-group">
                        <label>Infusion method details</label>
                        <input
                          ref={el => formRefs.current['infusionMethodOther'] = el}
                          type="text"
                          value={interventionForm.infusionMethodOther}
                          onChange={(e) => updateInterventionField('infusionMethodOther', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'infusionMethodOther')}
                          placeholder="Enter infusion method"
                          className={`note-input ${filledFields.has('infusionMethodOther') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Shipping status</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['shippingStatus'] = el}
                          value={interventionForm.shippingStatus}
                          onChange={(e) => updateInterventionField('shippingStatus', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'shippingStatus')}
                          className={`note-dropdown ${filledFields.has('shippingStatus') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="okay-to-ship">Okay to ship supplies</option>
                          <option value="okay-to-ship-supplies-medication">Okay to ship supplies and medication</option>
                          <option value="medication-only">Send medication (medication only)</option>
                          <option value="will-not-ship">Order will not ship due to</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.shippingStatus === 'will-not-ship' && (
                      <div className="input-group">
                        <label>Reason for not shipping</label>
                        <input
                          ref={el => formRefs.current['shippingDetails'] = el}
                          type="text"
                          value={interventionForm.shippingDetails}
                          onChange={(e) => updateInterventionField('shippingDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'shippingDetails')}
                          placeholder="Enter reason"
                          className={`note-input ${filledFields.has('shippingDetails') ? 'filled' : ''}`}
                          style={{ textTransform: 'uppercase' }}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>STAO</label>
                      <input
                        ref={el => formRefs.current['stao'] = el}
                        type="text"
                        value={interventionForm.stao}
                        onChange={(e) => updateInterventionField('stao', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'stao')}
                        placeholder="Enter STAO"
                        className={`note-input ${filledFields.has('stao') ? 'filled' : ''}`}
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Intervention Note Output */}
          <div className="dashboard-card note-output-card">
            <div className="card-header">
              <h3>Generated Intervention Note</h3>
              <div className="header-actions">
                <button className="reset-btn" onClick={resetInterventionForm}>
                  <RefreshCw size={16} />
                  Reset Form
                </button>
              </div>
            </div>
            <div className="card-body">
              {isEditingNote ? (
                <div className="note-edit-container">
                  <textarea
                    ref={noteTextareaRef}
                    className="note-edit-textarea"
                    value={editedNote}
                    onChange={(e) => setEditedNote(e.target.value)}
                    placeholder="Edit your note here..."
                  />
                  <div className="edit-actions">
                    <button 
                      className="edit-action-btn cancel"
                      onClick={handleCancelEdit}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button 
                      className="edit-action-btn save"
                      onClick={handleSaveEdit}
                    >
                      <Save size={16} />
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className="generated-note-output"
                    onClick={() => copyToClipboard(getCurrentNoteText())}
                  >
                    <p>{getCurrentNoteText()}</p>
                    {copiedNote && (
                      <div className="copied-indicator">
                        <Check size={16} />
                        Copied to clipboard!
                      </div>
                    )}
                  </div>
                  <div className="note-actions">
                    <button 
                      className="edit-note-btn"
                      onClick={handleEditNote}
                    >
                      <Edit size={16} />
                      Edit Note
                    </button>
                    <button 
                      className="copy-note-btn primary"
                      onClick={() => copyToClipboard(getCurrentNoteText())}
                    >
                      <Copy size={16} />
                      Copy Note to Clipboard
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteGenerator;