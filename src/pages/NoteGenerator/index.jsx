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
    patientWeight: '',
    dose: '',
    numberOfDoses: '',
    attackDetails: '',
    frequencySeverity: '',
    upcomingInterventions: '',
    pregnancyStatus: '',
    mdoPregnancyCounseling: '',
    compliance: '',
    nextDoseDate: '',
    lastDoseDate: '',
    rphConsult: ''
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
    
    fields.push('***REFILL NOTE*** Reviewed notes and order for');
    
    if (interventionForm.patientWeight) {
      fields.push(`Patient weight is ${interventionForm.patientWeight} kg`);
    }
    
    if (interventionForm.dose) {
      fields.push(`Dose is ${interventionForm.dose}`);
    }
    
    if (interventionForm.numberOfDoses) {
      fields.push(`Number of doses on hand: ${interventionForm.numberOfDoses}`);
    }
    
    if (interventionForm.attackDetails) {
      fields.push(`Attack details: ${interventionForm.attackDetails}`);
    }
    
    if (interventionForm.frequencySeverity) {
      fields.push(`Frequency and severity of attacks: ${interventionForm.frequencySeverity}`);
    }
    
    if (interventionForm.upcomingInterventions) {
      fields.push(`Upcoming health related interventions: ${interventionForm.upcomingInterventions}`);
    }
    
    if (interventionForm.pregnancyStatus) {
      fields.push(`Pregnancy/Breastfeeding status: ${interventionForm.pregnancyStatus}`);
    }
    
    if (interventionForm.mdoPregnancyCounseling) {
      fields.push(`MDO pregnancy counseling: ${interventionForm.mdoPregnancyCounseling}`);
    }
    
    if (interventionForm.compliance) {
      fields.push(`Compliance is ${interventionForm.compliance}`);
    }
    
    if (interventionForm.nextDoseDate) {
      fields.push(`Date of next dose: ${interventionForm.nextDoseDate}`);
    }
    
    if (interventionForm.lastDoseDate) {
      fields.push(`Date of last dose: ${interventionForm.lastDoseDate}`);
    }
    
    if (interventionForm.rphConsult) {
      fields.push(`RPH consult ${interventionForm.rphConsult}`);
    }
    
    fields.push('Ok to send on');
    
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
      patientWeight: '',
      dose: '',
      numberOfDoses: '',
      attackDetails: '',
      frequencySeverity: '',
      upcomingInterventions: '',
      pregnancyStatus: '',
      mdoPregnancyCounseling: '',
      compliance: '',
      nextDoseDate: '',
      lastDoseDate: '',
      rphConsult: ''
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
                  <div className="note-form-grid">
                    {/* Main Section 1: Patient & Clinical Information */}
                    <div className="main-section">
                      {/* Patient Core Information */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <User size={16} />
                          Patient Core Information
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Patient weight (kg)</label>
                            <input
                              type="text"
                              value={interventionForm.patientWeight}
                              onChange={(e) => updateInterventionField('patientWeight', e.target.value)}
                              placeholder="Enter weight in kg"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Dose</label>
                            <input
                              type="text"
                              value={interventionForm.dose}
                              onChange={(e) => updateInterventionField('dose', e.target.value)}
                              placeholder="Enter dose"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Number of doses on hand</label>
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
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Attack details</label>
                            <textarea
                              value={interventionForm.attackDetails}
                              onChange={(e) => updateInterventionField('attackDetails', e.target.value)}
                              placeholder="Enter attack details"
                              className="note-input note-textarea"
                              rows="2"
                            />
                          </div>
                          <div className="input-group">
                            <label>Frequency and severity of attacks</label>
                            <input
                              type="text"
                              value={interventionForm.frequencySeverity}
                              onChange={(e) => updateInterventionField('frequencySeverity', e.target.value)}
                              placeholder="Describe frequency and severity"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Compliance</label>
                            <input
                              type="text"
                              value={interventionForm.compliance}
                              onChange={(e) => updateInterventionField('compliance', e.target.value)}
                              placeholder="Enter compliance status"
                              className="note-input"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Section 2: Health Status & Dosing */}
                    <div className="main-section">
                      {/* Health Interventions */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <Heart size={16} />
                          Health Interventions
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Upcoming health related interventions</label>
                            <textarea
                              value={interventionForm.upcomingInterventions}
                              onChange={(e) => updateInterventionField('upcomingInterventions', e.target.value)}
                              placeholder="List interventions"
                              className="note-input note-textarea"
                              rows="2"
                            />
                          </div>
                          <div className="input-group">
                            <label>Pregnancy/Breastfeeding status</label>
                            <input
                              type="text"
                              value={interventionForm.pregnancyStatus}
                              onChange={(e) => updateInterventionField('pregnancyStatus', e.target.value)}
                              placeholder="Enter status"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>MDO pregnancy counseling</label>
                            <input
                              type="text"
                              value={interventionForm.mdoPregnancyCounseling}
                              onChange={(e) => updateInterventionField('mdoPregnancyCounseling', e.target.value)}
                              placeholder="Yes/No"
                              className="note-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dosing Information */}
                      <div className="form-section">
                        <h4 className="section-title">
                          <Calendar size={16} />
                          Dosing Information
                        </h4>
                        <div className="input-grid">
                          <div className="input-group">
                            <label>Date of next dose</label>
                            <input
                              type="text"
                              value={interventionForm.nextDoseDate}
                              onChange={(e) => updateInterventionField('nextDoseDate', e.target.value)}
                              placeholder="Enter date"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>Date of last dose</label>
                            <input
                              type="text"
                              value={interventionForm.lastDoseDate}
                              onChange={(e) => updateInterventionField('lastDoseDate', e.target.value)}
                              placeholder="Enter date"
                              className="note-input"
                            />
                          </div>
                          <div className="input-group">
                            <label>RPH consult</label>
                            <input
                              type="text"
                              value={interventionForm.rphConsult}
                              onChange={(e) => updateInterventionField('rphConsult', e.target.value)}
                              placeholder="Status"
                              className="note-input"
                            />
                          </div>
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