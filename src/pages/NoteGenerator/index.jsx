import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './NoteGenerator.css';

const NoteGenerator = () => {
  const { theme } = useTheme();
  const [copiedNote, setCopiedNote] = useState(null);
  const formRefs = useRef({});
  const [filledFields, setFilledFields] = useState(new Set());
  
  // Intervention Note Form State - Rearranged fields in requested order
  const [interventionForm, setInterventionForm] = useState({
    // Basic Information
    reviewedNotesFor: '',
    sig: '',
    dose: '',
    patientWeight: '',
    orderLastFilled: '',
    numberOfDoses: '',
    lastDoseDate: '',
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
    shippingStatus: '',
    shippingDetails: ''
  });

  // Field order for navigation
  const fieldOrder = [
    'reviewedNotesFor',
    'sig',
    'dose',
    'patientWeight',
    'orderLastFilled',
    'numberOfDoses',
    'lastDoseDate',
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
    'shippingStatus',
    'shippingDetails'
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
    
    if (interventionForm.orderLastFilled) {
      fields.push(`Order last filled: ${interventionForm.orderLastFilled}`);
    }
    
    if (interventionForm.numberOfDoses) {
      fields.push(`Number of doses on hand with patient: ${interventionForm.numberOfDoses}`);
    }
    
    if (interventionForm.lastDoseDate) {
      fields.push(`Last dose was administered on ${interventionForm.lastDoseDate}`);
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
    } else if (interventionForm.infusionMethod === 'both') {
      fields.push('Patient has HHN and self-infuses');
    } else if (interventionForm.infusionMethod === 'other' && interventionForm.infusionMethodOther) {
      fields.push(interventionForm.infusionMethodOther);
    }
    
    // Pharmacist Interaction
    if (interventionForm.pharmacistQuestions === 'no-questions') {
      fields.push('Patient had no questions for RPh');
    } else if (interventionForm.pharmacistQuestions === 'had-questions') {
      fields.push(`Patient had questions for RPh${interventionForm.pharmacistQuestionsDetails ? `: ${interventionForm.pharmacistQuestionsDetails}` : ''}`);
    }
    
    // Shipping Status
    if (interventionForm.shippingStatus === 'okay-to-ship' && interventionForm.shippingDetails) {
      fields.push(`Okay to ship supplies ${interventionForm.shippingDetails}`);
    } else if (interventionForm.shippingStatus === 'okay-to-ship') {
      fields.push('Okay to ship supplies');
    } else if (interventionForm.shippingStatus === 'will-not-ship' && interventionForm.shippingDetails) {
      fields.push(`Order will not ship due to ${interventionForm.shippingDetails}`);
    }
    
    return fields.join(' . ') + ' .';
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Reset form
  const resetInterventionForm = () => {
    setInterventionForm({
      reviewedNotesFor: '',
      sig: '',
      dose: '',
      patientWeight: '',
      orderLastFilled: '',
      numberOfDoses: '',
      lastDoseDate: '',
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
      shippingStatus: '',
      shippingDetails: ''
    });
    setFilledFields(new Set());
  };

  return (
    <div className="note-generator-page page-container">
      <div className="note-generator-content">
        <div className="note-generator-dashboard">
          {/* Header Card */}
          <div className="dashboard-card template-selector-card">
            <div className="card-header">
              <h3>Intervention Note Generator</h3>
              <Activity size={20} />
            </div>
            <div className="card-body">
              <p className="template-description">
                Fill in the fields below and press Enter to move to the next field. 
                Filled fields will be highlighted in green.
              </p>
            </div>
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
                      />
                    </div>
                    <div className="input-group">
                      <label>Patient's weight</label>
                      <input
                        ref={el => formRefs.current['patientWeight'] = el}
                        type="text"
                        value={interventionForm.patientWeight}
                        onChange={(e) => updateInterventionField('patientWeight', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'patientWeight')}
                        placeholder="Enter weight in kg"
                        className={`note-input ${filledFields.has('patientWeight') ? 'filled' : ''}`}
                      />
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
                      />
                    </div>
                    <div className="input-group">
                      <label>Last dose was administered on</label>
                      <input
                        ref={el => formRefs.current['lastDoseDate'] = el}
                        type="text"
                        value={interventionForm.lastDoseDate}
                        onChange={(e) => updateInterventionField('lastDoseDate', e.target.value)}
                        onKeyPress={(e) => handleKeyPress(e, 'lastDoseDate')}
                        placeholder="Enter date"
                        className={`note-input ${filledFields.has('lastDoseDate') ? 'filled' : ''}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Clinical Status */}
                <div className="form-section">
                  <h4 className="section-title">
                    <Activity size={16} />
                    Clinical Status
                  </h4>
                  <div className="input-grid compact-grid">
                    <div className="input-group">
                      <label>IV access issues</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['ivAccessIssues'] = el}
                          value={interventionForm.ivAccessIssues}
                          onChange={(e) => updateInterventionField('ivAccessIssues', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'ivAccessIssues')}
                          className={`note-dropdown ${filledFields.has('ivAccessIssues') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="no-issues">No reports of any IV access issues</option>
                          <option value="has-issues">Patient reported IV access issue</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.ivAccessIssues === 'has-issues' && (
                      <div className="input-group">
                        <label>IV access issue details</label>
                        <input
                          ref={el => formRefs.current['ivAccessDetails'] = el}
                          type="text"
                          value={interventionForm.ivAccessDetails}
                          onChange={(e) => updateInterventionField('ivAccessDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'ivAccessDetails')}
                          placeholder="Enter IV access issue details"
                          className={`note-input ${filledFields.has('ivAccessDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Epipen status</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['epipenStatus'] = el}
                          value={interventionForm.epipenStatus}
                          onChange={(e) => updateInterventionField('epipenStatus', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'epipenStatus')}
                          className={`note-dropdown ${filledFields.has('epipenStatus') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="has-epipen">Yes, patient has Epipen on hand</option>
                          <option value="no-epipen">Patient does not have Epipen on hand</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.epipenStatus === 'has-epipen' && (
                      <div className="input-group">
                        <label>Epipen expiry date</label>
                        <input
                          ref={el => formRefs.current['epipenExpiryDate'] = el}
                          type="text"
                          value={interventionForm.epipenExpiryDate}
                          onChange={(e) => updateInterventionField('epipenExpiryDate', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'epipenExpiryDate')}
                          placeholder="Enter expiry date or details"
                          className={`note-input ${filledFields.has('epipenExpiryDate') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Travel plans</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['travelPlans'] = el}
                          value={interventionForm.travelPlans}
                          onChange={(e) => updateInterventionField('travelPlans', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'travelPlans')}
                          className={`note-dropdown ${filledFields.has('travelPlans') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="has-travel">Patient has upcoming travel plans</option>
                          <option value="no-travel">Patient has no upcoming travel plans</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.travelPlans === 'has-travel' && (
                      <div className="input-group">
                        <label>Travel details</label>
                        <input
                          ref={el => formRefs.current['travelDetails'] = el}
                          type="text"
                          value={interventionForm.travelDetails}
                          onChange={(e) => updateInterventionField('travelDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'travelDetails')}
                          placeholder="Enter travel details"
                          className={`note-input ${filledFields.has('travelDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Recent hospitalizations</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['hasRecentHospitalization'] = el}
                          value={interventionForm.hasRecentHospitalization}
                          onChange={(e) => updateInterventionField('hasRecentHospitalization', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hasRecentHospitalization')}
                          className={`note-dropdown ${filledFields.has('hasRecentHospitalization') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Patient had recent hospitalization</option>
                          <option value="no">Patient has no recent hospitalization</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.hasRecentHospitalization === 'yes' && (
                      <div className="input-group">
                        <label>Hospitalization details</label>
                        <input
                          ref={el => formRefs.current['hospitalizationDate'] = el}
                          type="text"
                          value={interventionForm.hospitalizationDate}
                          onChange={(e) => updateInterventionField('hospitalizationDate', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hospitalizationDate')}
                          placeholder="Enter hospitalization details"
                          className={`note-input ${filledFields.has('hospitalizationDate') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Recent ER visits</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['hasRecentER'] = el}
                          value={interventionForm.hasRecentER}
                          onChange={(e) => updateInterventionField('hasRecentER', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hasRecentER')}
                          className={`note-dropdown ${filledFields.has('hasRecentER') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Patient has recent ER visit</option>
                          <option value="no">Patient has no recent ER visit</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.hasRecentER === 'yes' && (
                      <div className="input-group">
                        <label>ER visit details</label>
                        <input
                          ref={el => formRefs.current['erDetails'] = el}
                          type="text"
                          value={interventionForm.erDetails}
                          onChange={(e) => updateInterventionField('erDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'erDetails')}
                          placeholder="Enter ER visit details"
                          className={`note-input ${filledFields.has('erDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Symptom changes</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['hasWorseningSymptoms'] = el}
                          value={interventionForm.hasWorseningSymptoms}
                          onChange={(e) => updateInterventionField('hasWorseningSymptoms', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hasWorseningSymptoms')}
                          className={`note-dropdown ${filledFields.has('hasWorseningSymptoms') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Patient had recent worsening of symptoms</option>
                          <option value="no">Patient has no worsening of symptoms</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.hasWorseningSymptoms === 'yes' && (
                      <div className="input-group">
                        <label>Symptom details</label>
                        <input
                          ref={el => formRefs.current['symptomsDetails'] = el}
                          type="text"
                          value={interventionForm.symptomsDetails}
                          onChange={(e) => updateInterventionField('symptomsDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'symptomsDetails')}
                          placeholder="Enter symptom details"
                          className={`note-input ${filledFields.has('symptomsDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Missed doses</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['hasMissedDoses'] = el}
                          value={interventionForm.hasMissedDoses}
                          onChange={(e) => updateInterventionField('hasMissedDoses', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hasMissedDoses')}
                          className={`note-dropdown ${filledFields.has('hasMissedDoses') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Patient had missed doses</option>
                          <option value="no">Patient has no missed doses</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.hasMissedDoses === 'yes' && (
                      <div className="input-group">
                        <label>Missed dose details</label>
                        <input
                          ref={el => formRefs.current['missedDosesDetails'] = el}
                          type="text"
                          value={interventionForm.missedDosesDetails}
                          onChange={(e) => updateInterventionField('missedDosesDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'missedDosesDetails')}
                          placeholder="Enter missed dose details"
                          className={`note-input ${filledFields.has('missedDosesDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Medical Updates */}
                <div className="form-section">
                  <h4 className="section-title">
                    <Heart size={16} />
                    Medical Updates
                  </h4>
                  <div className="input-grid compact-grid">
                    <div className="input-group">
                      <label>Allergy updates</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['hasAllergyChanges'] = el}
                          value={interventionForm.hasAllergyChanges}
                          onChange={(e) => updateInterventionField('hasAllergyChanges', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hasAllergyChanges')}
                          className={`note-dropdown ${filledFields.has('hasAllergyChanges') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Patient had recent changes to allergies</option>
                          <option value="no">Patient has no recent changes to allergies</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.hasAllergyChanges === 'yes' && (
                      <div className="input-group">
                        <label>Allergy changes details</label>
                        <input
                          ref={el => formRefs.current['allergyChangesDetails'] = el}
                          type="text"
                          value={interventionForm.allergyChangesDetails}
                          onChange={(e) => updateInterventionField('allergyChangesDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'allergyChangesDetails')}
                          placeholder="Enter details"
                          className={`note-input ${filledFields.has('allergyChangesDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Medication updates</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['hasMedicationChanges'] = el}
                          value={interventionForm.hasMedicationChanges}
                          onChange={(e) => updateInterventionField('hasMedicationChanges', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'hasMedicationChanges')}
                          className={`note-dropdown ${filledFields.has('hasMedicationChanges') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Patient had recent changes to medications</option>
                          <option value="no">Patient has no recent changes to medications</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.hasMedicationChanges === 'yes' && (
                      <div className="input-group">
                        <label>Medication changes details</label>
                        <input
                          ref={el => formRefs.current['medicationChangesDetails'] = el}
                          type="text"
                          value={interventionForm.medicationChangesDetails}
                          onChange={(e) => updateInterventionField('medicationChangesDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'medicationChangesDetails')}
                          placeholder="Enter details"
                          className={`note-input ${filledFields.has('medicationChangesDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
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
                      />
                    </div>
                    <div className="input-group">
                      <label>Compliance</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['compliance'] = el}
                          value={interventionForm.compliance}
                          onChange={(e) => updateInterventionField('compliance', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'compliance')}
                          className={`note-dropdown ${filledFields.has('compliance') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="compliant">Patient compliant</option>
                          <option value="not-compliant">Patient not compliant</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
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
                          <option value="both">Patient has HHN and self-infuses</option>
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
                        />
                      </div>
                    )}
                    <div className="input-group">
                      <label>Pharmacist interaction</label>
                      <div className="custom-dropdown">
                        <select
                          ref={el => formRefs.current['pharmacistQuestions'] = el}
                          value={interventionForm.pharmacistQuestions}
                          onChange={(e) => updateInterventionField('pharmacistQuestions', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'pharmacistQuestions')}
                          className={`note-dropdown ${filledFields.has('pharmacistQuestions') ? 'filled' : ''}`}
                        >
                          <option value="">Select...</option>
                          <option value="no-questions">Patient had no questions for RPh</option>
                          <option value="had-questions">Patient had questions for RPh</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {interventionForm.pharmacistQuestions === 'had-questions' && (
                      <div className="input-group">
                        <label>Questions details</label>
                        <input
                          ref={el => formRefs.current['pharmacistQuestionsDetails'] = el}
                          type="text"
                          value={interventionForm.pharmacistQuestionsDetails}
                          onChange={(e) => updateInterventionField('pharmacistQuestionsDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'pharmacistQuestionsDetails')}
                          placeholder="Enter questions"
                          className={`note-input ${filledFields.has('pharmacistQuestionsDetails') ? 'filled' : ''}`}
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
                          <option value="will-not-ship">Order will not ship due to</option>
                        </select>
                        <ChevronDown className="dropdown-icon" size={16} />
                      </div>
                    </div>
                    {(interventionForm.shippingStatus === 'okay-to-ship' || interventionForm.shippingStatus === 'will-not-ship') && (
                      <div className="input-group">
                        <label>{interventionForm.shippingStatus === 'okay-to-ship' ? 'Shipping details' : 'Reason for not shipping'}</label>
                        <input
                          ref={el => formRefs.current['shippingDetails'] = el}
                          type="text"
                          value={interventionForm.shippingDetails}
                          onChange={(e) => updateInterventionField('shippingDetails', e.target.value)}
                          onKeyPress={(e) => handleKeyPress(e, 'shippingDetails')}
                          placeholder={interventionForm.shippingStatus === 'okay-to-ship' ? 'Enter shipping details' : 'Enter reason'}
                          className={`note-input ${filledFields.has('shippingDetails') ? 'filled' : ''}`}
                        />
                      </div>
                    )}
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
              <div 
                className="generated-note-output"
                onClick={() => copyToClipboard(generateInterventionNote())}
              >
                <p>{generateInterventionNote()}</p>
                {copiedNote && (
                  <div className="copied-indicator">
                    <Check size={16} />
                    Copied to clipboard!
                  </div>
                )}
              </div>
              <div className="note-actions">
                <button 
                  className="copy-note-btn primary"
                  onClick={() => copyToClipboard(generateInterventionNote())}
                >
                  <Copy size={16} />
                  Copy Note to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteGenerator;