import React, { useState, useEffect } from 'react';
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
  const [activeTemplate, setActiveTemplate] = useState('refill'); // 'refill' or 'intervention'
  const [copiedNote, setCopiedNote] = useState(null);
  
  // Refill Note Form State
  const [refillForm, setRefillForm] = useState({
    primaryMedication: '',
    medicationSig: '',
    allergies: '',
    newMedications: '',
    mentalPhysicalChanges: '',
    patientWeight: '',
    doseAppropriate: '',
    numberOfDoses: '',
    ivAccessIssues: '',
    epiPenOnHand: '',
    attackDetails: '',
    frequencyIncrease: '',
    upcomingInterventions: '',
    travelPlans: '',
    pregnancy: '',
    mdoPregnancyCounseling: '',
    lastFillHospitalized: '',
    lastFillErVisits: '',
    lastFillMissedDoses: '',
    compliance: '',
    nextDoseDate: '',
    lastDoseDate: '',
    rphConsult: '',
    listOrderItems: '',
    enterShipDate: ''
  });

  // Intervention Note Form State
  const [interventionForm, setInterventionForm] = useState({
    // Basic Information
    reviewedNotesFor: '',
    sig: '',
    dose: '',
    patientWeight: '',
    orderLastFilled: '',
    numberOfDoses: '',
    
    // IV Access
    ivAccessIssues: '',
    ivAccessDetails: '',
    
    // Epipen
    epipenStatus: '',
    epipenExpiryDate: '',
    
    // Travel
    travelPlans: '',
    travelDetails: '',
    
    // Hospitalizations
    hasRecentHospitalization: '',
    hospitalizationDate: '',
    
    // ER Visits
    hasRecentER: '',
    erDetails: '',
    
    // Symptoms
    hasWorseningSymptoms: '',
    symptomsDetails: '',
    
    // Missed Doses
    hasMissedDoses: '',
    missedDosesDetails: '',
    
    // Medication Changes
    hasMedicationChanges: '',
    medicationChangesDetails: '',
    
    // Allergy Updates
    hasAllergyChanges: '',
    allergyChangesDetails: '',
    
    // Dosing Schedule
    nextDoseDate: '',
    lastDoseDate: '',
    
    // Compliance
    compliance: '',
    
    // Infusion Method
    hasHHN: false,
    selfInfuses: false,
    
    // Pharmacist Interaction
    pharmacistQuestions: '',
    pharmacistQuestionsDetails: '',
    
    // Shipping
    shippingStatus: '',
    noShipReason: ''
  });

  // Update refill form field
  const updateRefillField = (field, value) => {
    setRefillForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update intervention form field
  const updateInterventionField = (field, value) => {
    setInterventionForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate refill note
  const generateRefillNote = () => {
    const fields = [];
    
    // Build the note based on filled fields
    if (refillForm.primaryMedication) {
      fields.push(`Reviewed notes and order for ${refillForm.primaryMedication}`);
    }
    
    if (refillForm.patientWeight) {
      fields.push(`Patient weight is ${refillForm.patientWeight} kg`);
    }
    
    if (refillForm.doseAppropriate) {
      fields.push(`Dose is ${refillForm.doseAppropriate}`);
    }
    
    if (refillForm.numberOfDoses) {
      fields.push(`Number of doses on hand: ${refillForm.numberOfDoses}`);
    }
    
    if (refillForm.attackDetails) {
      fields.push(`Attack details: ${refillForm.attackDetails}`);
    }
    
    if (refillForm.frequencyIncrease) {
      fields.push(`Frequency and severity of attacks: ${refillForm.frequencyIncrease}`);
    }
    
    if (refillForm.upcomingInterventions) {
      fields.push(`Upcoming health related interventions: ${refillForm.upcomingInterventions}`);
    }
    
    if (refillForm.pregnancy) {
      fields.push(`Pregnancy/Breastfeeding status: ${refillForm.pregnancy}`);
    }
    
    if (refillForm.mdoPregnancyCounseling) {
      fields.push(`MDO pregnancy counseling: ${refillForm.mdoPregnancyCounseling}`);
    }
    
    if (refillForm.compliance) {
      fields.push(`Compliance is ${refillForm.compliance}`);
    }
    
    if (refillForm.nextDoseDate) {
      fields.push(`Date of next dose: ${refillForm.nextDoseDate}`);
    }
    
    if (refillForm.lastDoseDate) {
      fields.push(`Date of last dose: ${refillForm.lastDoseDate}`);
    }
    
    if (refillForm.rphConsult) {
      fields.push(`RPH consult: ${refillForm.rphConsult}`);
    }
    
    fields.push('Ok to send on');
    
    return `***REFILL NOTE*** ${fields.join(' . ')} .`;
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
    
    // Medication Changes
    if (interventionForm.hasMedicationChanges === 'yes') {
      fields.push(`Patient had recent changes to medications${interventionForm.medicationChangesDetails ? `, ${interventionForm.medicationChangesDetails}` : ''}`);
    } else if (interventionForm.hasMedicationChanges === 'no') {
      fields.push('Patient has no recent changes to medications');
    }
    
    // Allergy Changes
    if (interventionForm.hasAllergyChanges === 'yes') {
      fields.push(`Patient had recent changes to allergies${interventionForm.allergyChangesDetails ? `, ${interventionForm.allergyChangesDetails}` : ''}`);
    } else if (interventionForm.hasAllergyChanges === 'no') {
      fields.push('Patient has no recent changes to allergies');
    }
    
    // Dosing Schedule
    if (interventionForm.nextDoseDate) {
      fields.push(`Next dose due on ${interventionForm.nextDoseDate}`);
    }
    
    if (interventionForm.lastDoseDate) {
      fields.push(`Last dose was administered on ${interventionForm.lastDoseDate}`);
    }
    
    // Compliance
    if (interventionForm.compliance === 'compliant') {
      fields.push('Patient compliant');
    } else if (interventionForm.compliance === 'not-compliant') {
      fields.push('Patient not compliant');
    }
    
    // Infusion Method
    const infusionMethods = [];
    if (interventionForm.hasHHN) infusionMethods.push('Patient has HHN');
    if (interventionForm.selfInfuses) infusionMethods.push('Patient self-infuses');
    if (infusionMethods.length > 0) {
      fields.push(infusionMethods.join(' and '));
    }
    
    // Pharmacist Interaction
    if (interventionForm.pharmacistQuestions === 'no-questions') {
      fields.push('Patient had no questions for RPh');
    } else if (interventionForm.pharmacistQuestions === 'had-questions') {
      fields.push(`Patient had questions for RPh${interventionForm.pharmacistQuestionsDetails ? `: ${interventionForm.pharmacistQuestionsDetails}` : ''}`);
    }
    
    // Shipping Status
    if (interventionForm.shippingStatus === 'okay-to-ship') {
      fields.push('Okay to ship supplies');
    } else if (interventionForm.shippingStatus === 'will-not-ship') {
      fields.push(`Order will not ship due to${interventionForm.noShipReason ? `, ${interventionForm.noShipReason}` : ''}`);
    }
    
    return fields.join(' . ') + ' .';
  };

  // Copy to clipboard
  const copyToClipboard = async (text, noteType) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedNote(noteType);
      setTimeout(() => setCopiedNote(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  // Reset forms
  const resetRefillForm = () => {
    setRefillForm({
      primaryMedication: '',
      medicationSig: '',
      allergies: '',
      newMedications: '',
      mentalPhysicalChanges: '',
      patientWeight: '',
      doseAppropriate: '',
      numberOfDoses: '',
      ivAccessIssues: '',
      epiPenOnHand: '',
      attackDetails: '',
      frequencyIncrease: '',
      upcomingInterventions: '',
      travelPlans: '',
      pregnancy: '',
      mdoPregnancyCounseling: '',
      lastFillHospitalized: '',
      lastFillErVisits: '',
      lastFillMissedDoses: '',
      compliance: '',
      nextDoseDate: '',
      lastDoseDate: '',
      rphConsult: '',
      listOrderItems: '',
      enterShipDate: ''
    });
  };

  const resetInterventionForm = () => {
    setInterventionForm({
      // Basic Information
      reviewedNotesFor: '',
      sig: '',
      dose: '',
      patientWeight: '',
      orderLastFilled: '',
      numberOfDoses: '',
      
      // IV Access
      ivAccessIssues: '',
      ivAccessDetails: '',
      
      // Epipen
      epipenStatus: '',
      epipenExpiryDate: '',
      
      // Travel
      travelPlans: '',
      travelDetails: '',
      
      // Hospitalizations
      hasRecentHospitalization: '',
      hospitalizationDate: '',
      
      // ER Visits
      hasRecentER: '',
      erDetails: '',
      
      // Symptoms
      hasWorseningSymptoms: '',
      symptomsDetails: '',
      
      // Missed Doses
      hasMissedDoses: '',
      missedDosesDetails: '',
      
      // Medication Changes
      hasMedicationChanges: '',
      medicationChangesDetails: '',
      
      // Allergy Updates
      hasAllergyChanges: '',
      allergyChangesDetails: '',
      
      // Dosing Schedule
      nextDoseDate: '',
      lastDoseDate: '',
      
      // Compliance
      compliance: '',
      
      // Infusion Method
      hasHHN: false,
      selfInfuses: false,
      
      // Pharmacist Interaction
      pharmacistQuestions: '',
      pharmacistQuestionsDetails: '',
      
      // Shipping
      shippingStatus: '',
      noShipReason: ''
    });
  };

  return (
    <div className="note-generator-page page-container">
      <div className="note-generator-content">
        <div className="note-generator-dashboard">
          {/* Template Selector Card */}
          <div className="dashboard-card template-selector-card">
            <div className="card-header">
              <h3>Note Template</h3>
              <FileText size={20} />
            </div>
            <div className="card-body">
              <div className="template-selector-grid">
                <button
                  className={`template-selector-btn ${activeTemplate === 'refill' ? 'active' : ''}`}
                  onClick={() => setActiveTemplate('refill')}
                >
                  <Package size={24} />
                  <span>Refill Note</span>
                  {activeTemplate === 'refill' && <Check size={16} className="check-icon" />}
                </button>
                <button
                  className={`template-selector-btn ${activeTemplate === 'intervention' ? 'active' : ''}`}
                  onClick={() => setActiveTemplate('intervention')}
                >
                  <Activity size={24} />
                  <span>Intervention Note</span>
                  {activeTemplate === 'intervention' && <Check size={16} className="check-icon" />}
                </button>
              </div>
            </div>
          </div>

          {/* Refill Note Form */}
          {activeTemplate === 'refill' && (
            <>
              <div className="dashboard-card note-form-card">
                <div className="card-header">
                  <h3>Refill Note Information</h3>
                  <Package size={20} />
                </div>
                <div className="card-body">
                  <div className="note-form-grid">
                    {/* Main Section 1: Clinical Information */}
                    <div className="main-section">
                      {/* Medication & Patient Core */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <Pill size={16} />
                          Medication & Patient Core
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Primary Medication Name</label>
                            <input
                              type="text"
                              value={refillForm.primaryMedication}
                              onChange={(e) => updateRefillField('primaryMedication', e.target.value)}
                              placeholder="Enter medication name"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Medication Sig</label>
                            <input
                              type="text"
                              value={refillForm.medicationSig}
                              onChange={(e) => updateRefillField('medicationSig', e.target.value)}
                              placeholder="Enter medication sig"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Patient weight (kg)</label>
                            <input
                              type="text"
                              value={refillForm.patientWeight}
                              onChange={(e) => updateRefillField('patientWeight', e.target.value)}
                              placeholder="Enter weight in kg"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Dose is appropriate/high/low</label>
                            <div className="custom-dropdown">
                              <select
                                value={refillForm.doseAppropriate}
                                onChange={(e) => updateRefillField('doseAppropriate', e.target.value)}
                                className="note-dropdown"
                              >
                                <option value="">Select...</option>
                                <option value="appropriate">Appropriate</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                              </select>
                              <ChevronDown className="dropdown-icon" size={16} />
                            </div>
                          </div>
                          <div className="input-group">
                            <label>New or updated allergies</label>
                            <input
                              type="text"
                              value={refillForm.allergies}
                              onChange={(e) => updateRefillField('allergies', e.target.value)}
                              placeholder="Enter any new allergies"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>New medications started</label>
                            <input
                              type="text"
                              value={refillForm.newMedications}
                              onChange={(e) => updateRefillField('newMedications', e.target.value)}
                              placeholder="List new medications"
                              className="note-input"
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
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Attack details (or N/A)</label>
                            <textarea
                              value={refillForm.attackDetails}
                              onChange={(e) => updateRefillField('attackDetails', e.target.value)}
                              placeholder="Enter attack details or N/A"
                              className="note-input note-textarea"
                              rows="2"
                            />
                          </div>
                          <div className="input-group">
                            <label>Has there been an increase in frequency or severity of attacks?</label>
                            <input
                              type="text"
                              value={refillForm.frequencyIncrease}
                              onChange={(e) => updateRefillField('frequencyIncrease', e.target.value)}
                              placeholder="Yes/No and details"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Mental or physical changes that could be considered side effects</label>
                            <textarea
                              value={refillForm.mentalPhysicalChanges}
                              onChange={(e) => updateRefillField('mentalPhysicalChanges', e.target.value)}
                              placeholder="Describe any changes"
                              className="note-input note-textarea"
                              rows="2"
                            />
                          </div>
                          <div className="input-group">
                            <label>Issues with IV access/ injection site</label>
                            <input
                              type="text"
                              value={refillForm.ivAccessIssues}
                              onChange={(e) => updateRefillField('ivAccessIssues', e.target.value)}
                              placeholder="Describe any issues"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Compliance</label>
                            <input
                              type="text"
                              value={refillForm.compliance}
                              onChange={(e) => updateRefillField('compliance', e.target.value)}
                              placeholder="Enter compliance status"
                              className="note-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Health Interventions */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <Heart size={16} />
                          Health Interventions
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Upcoming interventions (procedures, surgery, dental, etc)</label>
                            <textarea
                              value={refillForm.upcomingInterventions}
                              onChange={(e) => updateRefillField('upcomingInterventions', e.target.value)}
                              placeholder="List any upcoming interventions"
                              className="note-input note-textarea"
                              rows="2"
                            />
                          </div>
                          <div className="input-group">
                            <label>Pregnancy/ Breastfeeding/ Planning to become pregnant</label>
                            <input
                              type="text"
                              value={refillForm.pregnancy}
                              onChange={(e) => updateRefillField('pregnancy', e.target.value)}
                              placeholder="Enter status"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>MDO pregnancy counseling</label>
                            <input
                              type="text"
                              value={refillForm.mdoPregnancyCounseling}
                              onChange={(e) => updateRefillField('mdoPregnancyCounseling', e.target.value)}
                              placeholder="Yes/No"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Travel plans</label>
                            <input
                              type="text"
                              value={refillForm.travelPlans}
                              onChange={(e) => updateRefillField('travelPlans', e.target.value)}
                              placeholder="Enter travel plans if any"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Since your last fill, have you been hospitalized</label>
                            <input
                              type="text"
                              value={refillForm.lastFillHospitalized}
                              onChange={(e) => updateRefillField('lastFillHospitalized', e.target.value)}
                              placeholder="Yes/No and details"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Since your last fill, have you had any er visits</label>
                            <input
                              type="text"
                              value={refillForm.lastFillErVisits}
                              onChange={(e) => updateRefillField('lastFillErVisits', e.target.value)}
                              placeholder="Yes/No and details"
                              className="note-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Section 2: Dosing & Order Management */}
                    <div className="main-section">
                      {/* Dosing Schedule */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <Calendar size={16} />
                          Dosing Schedule
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>When is the next dose to be taken (list date and time if time is known)</label>
                            <input
                              type="text"
                              value={refillForm.nextDoseDate}
                              onChange={(e) => updateRefillField('nextDoseDate', e.target.value)}
                              placeholder="Enter date and time"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>When was the last dose taken?</label>
                            <input
                              type="text"
                              value={refillForm.lastDoseDate}
                              onChange={(e) => updateRefillField('lastDoseDate', e.target.value)}
                              placeholder="Enter date and time"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Since your last fill, have you missed any doses?</label>
                            <input
                              type="text"
                              value={refillForm.lastFillMissedDoses}
                              onChange={(e) => updateRefillField('lastFillMissedDoses', e.target.value)}
                              placeholder="Yes/No and details"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Number of doses on hand</label>
                            <input
                              type="text"
                              value={refillForm.numberOfDoses}
                              onChange={(e) => updateRefillField('numberOfDoses', e.target.value)}
                              placeholder="Enter number of doses"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>RPH consult completed/declined</label>
                            <input
                              type="text"
                              value={refillForm.rphConsult}
                              onChange={(e) => updateRefillField('rphConsult', e.target.value)}
                              placeholder="Completed/Declined"
                              className="note-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Order Management */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <Package size={16} />
                          Order Management
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>List order items (note: "supplies" can be used for ancillary items)</label>
                            <textarea
                              value={refillForm.listOrderItems}
                              onChange={(e) => updateRefillField('listOrderItems', e.target.value)}
                              placeholder="List items"
                              className="note-input note-textarea"
                              rows="2"
                            />
                          </div>
                          <div className="input-group">
                            <label>Enter ship date</label>
                            <input
                              type="date"
                              value={refillForm.enterShipDate}
                              onChange={(e) => updateRefillField('enterShipDate', e.target.value)}
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Epi-pen on hand</label>
                            <div className="custom-dropdown">
                              <select
                                value={refillForm.epiPenOnHand}
                                onChange={(e) => updateRefillField('epiPenOnHand', e.target.value)}
                                className="note-dropdown"
                              >
                                <option value="">Select...</option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                                <option value="N/A">N/A</option>
                              </select>
                              <ChevronDown className="dropdown-icon" size={16} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Refill Note Output */}
              <div className="dashboard-card note-output-card">
                <div className="card-header">
                  <h3>Generated Refill Note</h3>
                  <div className="header-actions">
                    <button className="reset-btn" onClick={resetRefillForm}>
                      <RefreshCw size={16} />
                      Reset Form
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div 
                    className="generated-note-output"
                    onClick={() => copyToClipboard(generateRefillNote(), 'refill')}
                  >
                    <p>{generateRefillNote()}</p>
                    {copiedNote === 'refill' && (
                      <div className="copied-indicator">
                        <Check size={16} />
                        Copied to clipboard!
                      </div>
                    )}
                  </div>
                  <div className="note-actions">
                    <button 
                      className="copy-note-btn primary"
                      onClick={() => copyToClipboard(generateRefillNote(), 'refill')}
                    >
                      <Copy size={16} />
                      Copy Note to Clipboard
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Intervention Note Form */}
          {activeTemplate === 'intervention' && (
            <>
              <div className="dashboard-card note-form-card">
                <div className="card-header">
                  <h3>Intervention Note Information</h3>
                  <Activity size={20} />
                </div>
                <div className="card-body">
                  <div className="intervention-form-container">
                    {/* Basic Information */}
                    <div className="form-section">
                      <h4 className="section-title">
                        <User size={16} />
                        Basic Information
                      </h4>
                      <div className="input-grid compact-grid">
                        <div className="input-group">
                          <label>Reviewed notes and order for</label>
                          <input
                            type="text"
                            value={interventionForm.reviewedNotesFor}
                            onChange={(e) => updateInterventionField('reviewedNotesFor', e.target.value)}
                            placeholder="Enter medication/order details"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Sig</label>
                          <input
                            type="text"
                            value={interventionForm.sig}
                            onChange={(e) => updateInterventionField('sig', e.target.value)}
                            placeholder="Enter sig"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Dose is appropriate at</label>
                          <input
                            type="text"
                            value={interventionForm.dose}
                            onChange={(e) => updateInterventionField('dose', e.target.value)}
                            placeholder="Enter dose"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Patient's weight</label>
                          <input
                            type="text"
                            value={interventionForm.patientWeight}
                            onChange={(e) => updateInterventionField('patientWeight', e.target.value)}
                            placeholder="Enter weight in kg"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Order last filled</label>
                          <input
                            type="text"
                            value={interventionForm.orderLastFilled}
                            onChange={(e) => updateInterventionField('orderLastFilled', e.target.value)}
                            placeholder="Enter date"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Number of doses on hand with patient</label>
                          <input
                            type="text"
                            value={interventionForm.numberOfDoses}
                            onChange={(e) => updateInterventionField('numberOfDoses', e.target.value)}
                            placeholder="Enter number of doses"
                            className="note-input"
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
                              value={interventionForm.ivAccessIssues}
                              onChange={(e) => updateInterventionField('ivAccessIssues', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.ivAccessDetails}
                              onChange={(e) => updateInterventionField('ivAccessDetails', e.target.value)}
                              placeholder="Enter IV access issue details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Epipen status</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.epipenStatus}
                              onChange={(e) => updateInterventionField('epipenStatus', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.epipenExpiryDate}
                              onChange={(e) => updateInterventionField('epipenExpiryDate', e.target.value)}
                              placeholder="Enter expiry date or details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Travel plans</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.travelPlans}
                              onChange={(e) => updateInterventionField('travelPlans', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.travelDetails}
                              onChange={(e) => updateInterventionField('travelDetails', e.target.value)}
                              placeholder="Enter travel details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Recent hospitalizations</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.hasRecentHospitalization}
                              onChange={(e) => updateInterventionField('hasRecentHospitalization', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.hospitalizationDate}
                              onChange={(e) => updateInterventionField('hospitalizationDate', e.target.value)}
                              placeholder="Enter hospitalization details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Recent ER visits</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.hasRecentER}
                              onChange={(e) => updateInterventionField('hasRecentER', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.erDetails}
                              onChange={(e) => updateInterventionField('erDetails', e.target.value)}
                              placeholder="Enter ER visit details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Symptom changes</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.hasWorseningSymptoms}
                              onChange={(e) => updateInterventionField('hasWorseningSymptoms', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.symptomsDetails}
                              onChange={(e) => updateInterventionField('symptomsDetails', e.target.value)}
                              placeholder="Enter symptom details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Missed doses</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.hasMissedDoses}
                              onChange={(e) => updateInterventionField('hasMissedDoses', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.missedDosesDetails}
                              onChange={(e) => updateInterventionField('missedDosesDetails', e.target.value)}
                              placeholder="Enter missed dose details"
                              className="note-input"
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
                          <label>Medication updates</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.hasMedicationChanges}
                              onChange={(e) => updateInterventionField('hasMedicationChanges', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.medicationChangesDetails}
                              onChange={(e) => updateInterventionField('medicationChangesDetails', e.target.value)}
                              placeholder="Enter details"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Allergy updates</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.hasAllergyChanges}
                              onChange={(e) => updateInterventionField('hasAllergyChanges', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.allergyChangesDetails}
                              onChange={(e) => updateInterventionField('allergyChangesDetails', e.target.value)}
                              placeholder="Enter details"
                              className="note-input"
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
                            type="text"
                            value={interventionForm.nextDoseDate}
                            onChange={(e) => updateInterventionField('nextDoseDate', e.target.value)}
                            placeholder="Enter date"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Last dose was administered on</label>
                          <input
                            type="text"
                            value={interventionForm.lastDoseDate}
                            onChange={(e) => updateInterventionField('lastDoseDate', e.target.value)}
                            placeholder="Enter date"
                            className="note-input"
                          />
                        </div>
                        <div className="input-group">
                          <label>Compliance</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.compliance}
                              onChange={(e) => updateInterventionField('compliance', e.target.value)}
                              className="note-dropdown"
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
                          <div className="checkbox-group">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={interventionForm.hasHHN}
                                onChange={(e) => updateInterventionField('hasHHN', e.target.checked)}
                              />
                              Patient has HHN
                            </label>
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={interventionForm.selfInfuses}
                                onChange={(e) => updateInterventionField('selfInfuses', e.target.checked)}
                              />
                              Patient self-infuses
                            </label>
                          </div>
                        </div>
                        <div className="input-group">
                          <label>Pharmacist interaction</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.pharmacistQuestions}
                              onChange={(e) => updateInterventionField('pharmacistQuestions', e.target.value)}
                              className="note-dropdown"
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
                              type="text"
                              value={interventionForm.pharmacistQuestionsDetails}
                              onChange={(e) => updateInterventionField('pharmacistQuestionsDetails', e.target.value)}
                              placeholder="Enter questions"
                              className="note-input"
                            />
                          </div>
                        )}
                        <div className="input-group">
                          <label>Shipping status</label>
                          <div className="custom-dropdown">
                            <select
                              value={interventionForm.shippingStatus}
                              onChange={(e) => updateInterventionField('shippingStatus', e.target.value)}
                              className="note-dropdown"
                            >
                              <option value="">Select...</option>
                              <option value="okay-to-ship">Okay to ship supplies</option>
                              <option value="will-not-ship">Order will not ship due to</option>
                            </select>
                            <ChevronDown className="dropdown-icon" size={16} />
                          </div>
                        </div>
                        {interventionForm.shippingStatus === 'will-not-ship' && (
                          <div className="input-group">
                            <label>Reason for not shipping</label>
                            <input
                              type="text"
                              value={interventionForm.noShipReason}
                              onChange={(e) => updateInterventionField('noShipReason', e.target.value)}
                              placeholder="Enter reason"
                              className="note-input"
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
                    onClick={() => copyToClipboard(generateInterventionNote(), 'intervention')}
                  >
                    <p>{generateInterventionNote()}</p>
                    {copiedNote === 'intervention' && (
                      <div className="copied-indicator">
                        <Check size={16} />
                        Copied to clipboard!
                      </div>
                    )}
                  </div>
                  <div className="note-actions">
                    <button 
                      className="copy-note-btn primary"
                      onClick={() => copyToClipboard(generateInterventionNote(), 'intervention')}
                    >
                      <Copy size={16} />
                      Copy Note to Clipboard
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoteGenerator;