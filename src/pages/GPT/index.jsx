import React, { useState, useRef } from 'react';
import { Bot, Send, User, Search, AlertTriangle, CheckCircle, XCircle, AlertCircle, Pill, ArrowRightLeft, Sparkles } from 'lucide-react';
import './GPT.css';

const GPT = () => {
  // Toggle state
  const [activeSection, setActiveSection] = useState('medication-search'); // 'medication-search' or 'drug-interactions'
  
  // Medication Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  
  // Drug Interactions states
  const [drug1, setDrug1] = useState('');
  const [drug2, setDrug2] = useState('');
  const [interactionResult, setInteractionResult] = useState(null);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState(null);
  const [medicationSafety, setMedicationSafety] = useState(null);
  
  // API Configuration
  const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
  const ENDPOINT = "https://models.inference.ai.azure.com";
  const MODEL = "gpt-4o-mini"; // Using fastest model for quick responses

  // Function to call AI API
  const callAIAPI = async (prompt, systemPrompt) => {
    if (!GITHUB_TOKEN) {
      throw new Error('GitHub API token not configured. Please set VITE_GITHUB_TOKEN in your .env file.');
    }

    try {
      const response = await fetch(`${ENDPOINT}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3, // Slightly higher for faster processing
          max_tokens: 600, // Reduced for faster responses
          top_p: 0.9
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI API Error:', error);
      throw error;
    }
  };

  // Medication search handler
  const handleMedicationSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);

    const systemPrompt = `You are a medical AI. Return ONLY valid JSON, no markdown or explanations.`;

    const prompt = `Drug info for ${searchQuery}. Return JSON:
{
  "medicationOverview": "Brief overview",
  "brandNames": ["list"],
  "genericName": "name",
  "moa": "mechanism of action",
  "indications": [{"condition": "name", "icd10": "code", "dosing": "info"}],
  "dosingAdjustments": "renal/hepatic",
  "routes": ["list"],
  "pretests": ["list or empty"],
  "premedications": "text or None",
  "sideEffects": ["top 5 common"],
  "blackBoxWarning": "warning or None",
  "contraindications": ["list"],
  "storage": "requirements",
  "strengthsPackages": ["common strengths"],
  "remsProgram": "info or None",
  "vaccineInteractions": "info",
  "patientCounseling": {"missedDose": "instructions", "therapyGaps": "info"},
  "similarTreatments": ["2-3 alternatives"]
}`;

    try {
      const response = await callAIAPI(prompt, systemPrompt);
      
      // Parse the JSON response
      try {
        const parsedData = JSON.parse(response);
        setSearchResults(parsedData);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setSearchError('Invalid response format from AI. Please try again.');
      }
    } catch (error) {
      setSearchError(error.message || 'Failed to search medication information');
    } finally {
      setSearchLoading(false);
    }
  };

  // Drug interaction check handler
  const handleDrugInteraction = async () => {
    if (!drug1.trim() || !drug2.trim()) return;
    
    setInteractionLoading(true);
    setInteractionError(null);
    setInteractionResult(null);
    setMedicationSafety(null);

    const systemPrompt = `You are a pharmacist AI. Return ONLY valid JSON for drug interactions.`;

    const prompt = `Check interaction: ${drug1} with ${drug2}. Return JSON:
{
  "drug1": "${drug1}",
  "drug2": "${drug2}",
  "interactionSeverity": "none|mild|moderate|severe",
  "clinicalRationale": "brief mechanism and significance",
  "recommendation": "management advice",
  "monitoringRequired": ["key parameters"],
  "alternativeOptions": ["1-2 alternatives"]
}`;

    try {
      const response = await callAIAPI(prompt, systemPrompt);
      
      try {
        const parsedData = JSON.parse(response);
        setInteractionResult(parsedData);
        
        // Set medication safety based on interaction severity
        switch (parsedData.interactionSeverity) {
          case 'none':
          case 'mild':
            setMedicationSafety({
              status: 'safe',
              message: 'Generally safe to use together with standard monitoring'
            });
            break;
          case 'moderate':
            setMedicationSafety({
              status: 'caution',
              message: 'Use with caution - additional monitoring required'
            });
            break;
          case 'severe':
            setMedicationSafety({
              status: 'contraindicated',
              message: 'Avoid concurrent use - seek alternative therapy'
            });
            break;
          default:
            setMedicationSafety({
              status: 'caution',
              message: 'Interaction detected - consult healthcare provider'
            });
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        setInteractionError('Invalid response format from AI. Please try again.');
      }
    } catch (error) {
      setInteractionError(error.message || 'Failed to check drug interaction');
    } finally {
      setInteractionLoading(false);
    }
  };

  const getMedicationSafetyClass = () => {
    if (!medicationSafety) return '';
    switch (medicationSafety.status) {
      case 'safe': return 'safety-safe';
      case 'caution': return 'safety-caution';
      case 'contraindicated': return 'safety-contraindicated';
      default: return '';
    }
  };

  const getMedicationSafetyIcon = () => {
    if (!medicationSafety) return null;
    switch (medicationSafety.status) {
      case 'safe': return <CheckCircle size={24} />;
      case 'caution': return <AlertCircle size={24} />;
      case 'contraindicated': return <XCircle size={24} />;
      default: return null;
    }
  };

  return (
    <div className="gpt-page page-container">
      {/* Toggle Section */}
      <div className="section-toggle-banner">
        <button
          className={`toggle-btn ${activeSection === 'medication-search' ? 'active' : ''}`}
          onClick={() => setActiveSection('medication-search')}
          data-short-label="Meds"
        >
          <Search size={16} />
          <span>Medication Search</span>
        </button>
        <button
          className={`toggle-btn ${activeSection === 'drug-interactions' ? 'active' : ''}`}
          onClick={() => setActiveSection('drug-interactions')}
          data-short-label="Interactions"
        >
          <ArrowRightLeft size={16} />
          <span>Drug Interactions</span>
        </button>
      </div>

      <div className="gpt-content">
        {activeSection === 'medication-search' ? (
          <div className="medication-search-section">
            <div className="search-container">
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleMedicationSearch()}
                  placeholder="Search for a medication..."
                  className="medication-search-input"
                />
                <button 
                  onClick={handleMedicationSearch}
                  disabled={searchLoading}
                  className="search-button medication-search-btn"
                >
                  {searchLoading ? (
                    <div className="spinner"></div>
                  ) : (
                    <Sparkles size={20} />
                  )}
                </button>
              </div>
            </div>

            {searchError && (
              <div className="error-message">
                <AlertTriangle size={20} />
                <span>{searchError}</span>
              </div>
            )}

            {searchResults && (
              <div className="search-results-container">
                <div className="medication-table">
                  <table>
                    <tbody>
                      <tr>
                        <td className="field-label">Medication Overview</td>
                        <td className="field-value">{searchResults.medicationOverview}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Brand Names</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.brandNames) 
                            ? searchResults.brandNames.join(', ') 
                            : searchResults.brandNames}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">Generic Name</td>
                        <td className="field-value">{searchResults.genericName}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Mechanism of Action</td>
                        <td className="field-value">{searchResults.moa}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Indications & Dosing</td>
                        <td className="field-value">
                          {searchResults.indications?.map((ind, idx) => (
                            <div key={idx} className="indication-item">
                              <strong>{ind.condition}</strong> 
                              {ind.icd10 && ` (ICD-10: ${ind.icd10})`}<br/>
                              {ind.dosing && `Dosing: ${ind.dosing}`}
                            </div>
                          ))}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">Dosing Adjustments</td>
                        <td className="field-value">{searchResults.dosingAdjustments}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Routes of Administration</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.routes) 
                            ? searchResults.routes.join(', ') 
                            : searchResults.routes}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">Pretests Required</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.pretests) 
                            ? searchResults.pretests.join(', ') 
                            : searchResults.pretests}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">Premedications</td>
                        <td className="field-value">{searchResults.premedications}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Side Effects</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.sideEffects) 
                            ? searchResults.sideEffects.join(', ') 
                            : searchResults.sideEffects}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label warning">⚠️ Black Box Warning</td>
                        <td className="field-value warning">{searchResults.blackBoxWarning || 'None'}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Contraindications</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.contraindications) 
                            ? searchResults.contraindications.join(', ') 
                            : searchResults.contraindications}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">Storage</td>
                        <td className="field-value">{searchResults.storage}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Strength/Package Size</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.strengthsPackages) 
                            ? searchResults.strengthsPackages.join(', ') 
                            : searchResults.strengthsPackages}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">REMS Program</td>
                        <td className="field-value">{searchResults.remsProgram || 'None'}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Vaccine Interactions</td>
                        <td className="field-value">{searchResults.vaccineInteractions}</td>
                      </tr>
                      <tr>
                        <td className="field-label">Patient Counseling</td>
                        <td className="field-value">
                          {searchResults.patientCounseling && (
                            <>
                              <strong>Missed Dose:</strong> {searchResults.patientCounseling.missedDose}<br/>
                              <strong>Therapy Gaps:</strong> {searchResults.patientCounseling.therapyGaps}
                            </>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="field-label">Similar Treatments</td>
                        <td className="field-value">
                          {Array.isArray(searchResults.similarTreatments) 
                            ? searchResults.similarTreatments.join(', ') 
                            : searchResults.similarTreatments}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="disclaimer">
                  <p><strong>Disclaimer:</strong> This information is provided by AI for educational purposes only. Always consult with a healthcare professional for medical advice and verify information with official drug references.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="drug-interactions-section">
            <div className="interactions-input-container">
              <div className="drug-input-wrapper">
                <label>Medication 1</label>
                <input
                  type="text"
                  value={drug1}
                  onChange={(e) => setDrug1(e.target.value)}
                  placeholder="Enter first medication..."
                  className="drug-input"
                />
              </div>
              <div className="interaction-icon">
                <ArrowRightLeft size={24} />
              </div>
              <div className="drug-input-wrapper">
                <label>Medication 2</label>
                <input
                  type="text"
                  value={drug2}
                  onChange={(e) => setDrug2(e.target.value)}
                  placeholder="Enter second medication..."
                  className="drug-input"
                />
              </div>
            </div>

            <button
              onClick={handleDrugInteraction}
              disabled={!drug1.trim() || !drug2.trim() || interactionLoading}
              className="check-interaction-btn"
            >
              {interactionLoading ? (
                <>
                  <div className="spinner"></div>
                  <span>Checking Interaction...</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>Check Interaction</span>
                </>
              )}
            </button>

            {interactionError && (
              <div className="error-message">
                <AlertTriangle size={20} />
                <span>{interactionError}</span>
              </div>
            )}

            {interactionResult && (
              <div className="interaction-results">
                <div className="interaction-summary">
                  <h3>Drug Interaction Analysis</h3>
                  <div className="drugs-compared">
                    <span className="drug-name">{interactionResult.drug1}</span>
                    <ArrowRightLeft size={16} />
                    <span className="drug-name">{interactionResult.drug2}</span>
                  </div>
                </div>

                <div className="clinical-rationale">
                  <h4>Clinical Rationale</h4>
                  <p>{interactionResult.clinicalRationale}</p>
                  <div className="recommendation">
                    <strong>Recommendation:</strong> {interactionResult.recommendation}
                  </div>
                  
                  {interactionResult.monitoringRequired && interactionResult.monitoringRequired.length > 0 && (
                    <div className="monitoring-section">
                      <strong>Monitoring Required:</strong>
                      <ul>
                        {interactionResult.monitoringRequired.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {interactionResult.alternativeOptions && interactionResult.alternativeOptions.length > 0 && (
                    <div className="alternatives-section">
                      <strong>Alternative Options:</strong>
                      <ul>
                        {interactionResult.alternativeOptions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Medication Safety Section - Similar to Pump page Dose Safety */}
                <div className="medication-safety-section">
                  <h3>Medication Safety</h3>
                  <div className="safety-options">
                    <div className={`safety-option ${medicationSafety?.status === 'safe' ? 'active' : ''} safety-safe`}>
                      <CheckCircle size={24} />
                      <span>Okay to Use</span>
                    </div>
                    <div className={`safety-option ${medicationSafety?.status === 'caution' ? 'active' : ''} safety-caution`}>
                      <AlertCircle size={24} />
                      <span>Use with Caution</span>
                    </div>
                    <div className={`safety-option ${medicationSafety?.status === 'contraindicated' ? 'active' : ''} safety-contraindicated`}>
                      <XCircle size={24} />
                      <span>Contraindicated</span>
                    </div>
                  </div>
                  {medicationSafety && (
                    <div className={`safety-message ${getMedicationSafetyClass()}`}>
                      {getMedicationSafetyIcon()}
                      <span>{medicationSafety.message}</span>
                    </div>
                  )}
                </div>

                <div className="disclaimer">
                  <p><strong>Disclaimer:</strong> This drug interaction analysis is provided by AI. Always consult with a healthcare professional or clinical pharmacist for definitive guidance on drug interactions.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GPT;