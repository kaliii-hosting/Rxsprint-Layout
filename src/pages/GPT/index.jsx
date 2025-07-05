import React, { useState, useRef, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Pill, Shield, Info, X, Send, Bot, Trash2, Loader2 } from 'lucide-react';
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

  // Auto-focus appropriate input on section change
  useEffect(() => {
    if (activeSection === 'drug-search' && queryInputRef.current) {
      queryInputRef.current.focus();
    } else if (activeSection === 'drug-interactions' && drug1Ref.current) {
      drug1Ref.current.focus();
    }
  }, [activeSection]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeSection === 'drug-search') {
          handleDrugSearch();
        } else {
          handleDrugInteraction();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, query, drug1, drug2]);

  // Drug Search functionality
  const handleDrugSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse('');

    try {
      const isQuick = query.trim().toLowerCase().startsWith("q ");

      const systemContent = isQuick
        ? "Provide a concise, medically precise paragraph summary of the medication with no formatting."
        : `Provide a structured response in a single markdown table with two columns: **Section** and **Details**.
**Be as thorough as possible**—include every FDA-approved indication (with ICD-10 codes where relevant) and every common or serious side effect. If a section does not apply, explicitly write "N/A." Ensure the table has all of the following headings (and fill in each one completely):

- Medication Overview 💊  
- Brand & Generic Names  
- Side Effects (List all common and serious adverse effects with bullet points)  
- Patient Counseling Points  
- Mechanism of Action (MOA)  
- Indications & ICD-10 Codes (List every approved use and attach ICD-10 where possible)  
- Dosing Regimens  
- Dosing & Adjustments  
- Route(s) of Administration  
- Pretests Required  
- Premedications Needed  
- ⚠️ Black Box Warning  
- Contraindications  
- Storage Conditions  
- Strength, Concentration & Package Size  
- REMS Program Requirements  
- Vaccine Interactions 💉  
- Missed Dose Handling & Therapy Gaps  
- Similar Treatments  

**Rules**:  
1. Use bullet points with <br> tags for clarity inside cells.  
2. Use emojis for icons where specified (💊 ⚠️ 💉).  
3. No code blocks—output exactly one table.  
4. All information must be medically accurate, up-to-date, and as exhaustive as possible.`;

      const requestBody = {
        messages: [
          { role: "system", content: systemContent.trim() },
          { role: "user", content: query.trim() }
        ],
        temperature: 0.2,
        top_p: 1,
        max_tokens: 4000,
        model: MODEL
      };

      console.log('Sending request to:', ENDPOINT + '/chat/completions');
      console.log('Using model:', MODEL);

      const response = await fetch(ENDPOINT + '/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', response.status, response.statusText);
        console.error('Error Details:', errorText);
        
        let errorMessage = 'API request failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      let output = data.choices?.[0]?.message?.content || "No response.";
      
      // Convert markdown table to HTML
      output = convertMarkdownTableToHTML(output);
      
      setResponse(output);
    } catch (err) {
      console.error('Drug Search Error:', err);
      setResponse(`<div class="error-response">Request failed: ${err.message}. Please try again.</div>`);
    } finally {
      setLoading(false);
      setTimeout(() => queryInputRef.current?.focus(), 100);
    }
  };

  // Convert markdown table to HTML
  const convertMarkdownTableToHTML = (markdown) => {
    // Remove code blocks if any
    markdown = markdown.replace(/^```(?:markdown)?|```$/g, "").trim();
    
    // Convert markdown table to HTML table
    const lines = markdown.split('\n');
    let html = '<div class="table-container"><table class="medication-table">';
    let inTable = false;
    
    for (let line of lines) {
      if (line.includes('|')) {
        if (!inTable) {
          html += '<thead>';
          inTable = true;
        }
        
        // Skip separator lines
        if (line.match(/^\|[\s-:|]+\|$/)) {
          if (html.includes('<thead>') && !html.includes('</thead>')) {
            html += '</thead><tbody>';
          }
          continue;
        }
        
        const cells = line.split('|').filter(cell => cell.trim());
        html += '<tr>';
        
        for (let cell of cells) {
          const tag = html.includes('</thead>') ? 'td' : 'th';
          // Process markdown in cells
          let processedCell = cell.trim()
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/- /g, '• ')
            .replace(/<br>/g, '<br>');
          
          html += `<${tag}>${processedCell}</${tag}>`;
        }
        
        html += '</tr>';
      }
    }
    
    if (inTable) {
      html += '</tbody></table></div>';
    }
    
    // If no table found, return formatted text
    if (!inTable) {
      return markdown
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }
    
    return html;
  };

  // Drug Interaction functionality
  const handleDrugInteraction = async () => {
    if (!drug1.trim() || !drug2.trim()) {
      setInteractionError('Please enter both medication names');
      if (!drug1.trim()) {
        drug1Ref.current?.focus();
      } else if (!drug2.trim()) {
        drug2Ref.current?.focus();
      }
      return;
    }

    setInteractionLoading(true);
    setInteractionError('');
    setInteractionResult(null);

    try {
      const systemPrompt = `You are a clinical pharmacist AI assistant specializing in drug-drug interactions. Analyze the interaction between two medications and respond with a JSON object containing:

{
  "severity": "safe" | "caution" | "contraindicated",
  "explanation": "Brief clinical explanation of the interaction mechanism and effects",
  "monitoring": "What parameters to monitor if applicable",
  "alternatives": "Alternative medications if contraindicated"
}

Classification criteria:
- "safe": No clinically significant interaction, safe to use together
- "caution": Moderate interaction requiring monitoring or dose adjustment
- "contraindicated": Severe interaction, should not be used together

Be clinically accurate and concise. Focus on mechanism, clinical significance, and practical guidance.`;

      const requestBody = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze drug-drug interaction between: ${drug1.trim()} and ${drug2.trim()}` }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        model: MODEL
      };

      const response = await fetch(ENDPOINT + '/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', response.status, response.statusText);
        console.error('Error Details:', errorText);
        
        let errorMessage = 'API request failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error?.message || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response received');
      }

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsedResult = JSON.parse(jsonMatch[0]);
      setInteractionResult(parsedResult);
    } catch (err) {
      console.error('DDI Check Error:', err);
      setInteractionError(`Failed to analyze interaction: ${err.message}`);
    } finally {
      setInteractionLoading(false);
      setTimeout(() => drug1Ref.current?.focus(), 100);
    }
  };

  // Input handlers
  const handleInputKeyDown = (e, field) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (field === 'query') {
        handleDrugSearch();
      } else if (field === 'drug1' && drug1.trim()) {
        drug2Ref.current?.focus();
      } else if (field === 'drug2' && drug2.trim()) {
        handleDrugInteraction();
      }
    }
  };

  // Utility functions
  const getSeverityConfig = (severity) => {
    switch (severity) {
      case 'safe':
        return {
          color: 'safe',
          icon: CheckCircle,
          label: 'Safe to Use Together'
        };
      case 'caution':
        return {
          color: 'caution',
          icon: AlertTriangle,
          label: 'Use with Caution'
        };
      case 'contraindicated':
        return {
          color: 'contraindicated',
          icon: XCircle,
          label: 'Not Recommended'
        };
      default:
        return {
          color: 'unknown',
          icon: Info,
          label: 'Unknown'
        };
    }
  };

  const clearSearchResults = () => {
    setQuery('');
    setResponse('');
    queryInputRef.current?.focus();
  };

  const clearInteractionResults = () => {
    setDrug1('');
    setDrug2('');
    setInteractionResult(null);
    setInteractionError('');
    drug1Ref.current?.focus();
  };

  return (
    <div className="page-container gpt-page">
      {/* Toggle Banner */}
      <div className="section-toggle-banner">
        <button
          className={`toggle-btn ${activeSection === 'drug-search' ? 'active' : ''}`}
          onClick={() => setActiveSection('drug-search')}
        >
          <Search size={16} />
          <span>Drug Search</span>
        </button>
        <button
          className={`toggle-btn ${activeSection === 'drug-interactions' ? 'active' : ''}`}
          onClick={() => setActiveSection('drug-interactions')}
        >
          <Pill size={16} />
          <span>Drug Interactions</span>
        </button>
      </div>

      <div className="gpt-content">
        {activeSection === 'drug-search' ? (
          // Drug Search Section
          <div className="section-content">
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Medication Search</h3>
                <Bot size={20} />
              </div>
              
              <div className="card-body">
                <div className="search-container">
                  <div className="search-input-group">
                    <Search className="input-icon" size={20} />
                    <input
                      ref={queryInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, 'query')}
                      className="form-input with-icon"
                      placeholder="Search for a medication... (Press Enter to search)"
                      autoComplete="off"
                    />
                    {query && (
                      <button
                        onClick={clearSearchResults}
                        className="clear-input-btn"
                        type="button"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={handleDrugSearch}
                    disabled={!query.trim() || loading}
                    className="primary-btn"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        Search
                      </>
                    )}
                  </button>
                </div>

                {response && (
                  <div className="search-results">
                    <div className="results-header">
                      <h4>Search Results</h4>
                      <button onClick={clearSearchResults} className="text-btn">
                        Clear Results
                      </button>
                    </div>
                    <div 
                      className="results-content"
                      dangerouslySetInnerHTML={{ __html: response }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Drug Interactions Section
          <div className="section-content">
            <div className="dashboard-card">
              <div className="card-header">
                <h3>Drug-Drug Interactions</h3>
                <Pill size={20} />
              </div>
              
              <div className="card-body">
                <div className="interaction-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="drug1" className="form-label">
                        First Medication
                      </label>
                      <div className="input-group">
                        <Pill className="input-icon" size={18} />
                        <input
                          ref={drug1Ref}
                          id="drug1"
                          type="text"
                          value={drug1}
                          onChange={(e) => setDrug1(e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, 'drug1')}
                          className="form-input with-icon"
                          placeholder="Enter first medication name..."
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="drug2" className="form-label">
                        Second Medication
                      </label>
                      <div className="input-group">
                        <Pill className="input-icon" size={18} />
                        <input
                          ref={drug2Ref}
                          id="drug2"
                          type="text"
                          value={drug2}
                          onChange={(e) => setDrug2(e.target.value)}
                          onKeyDown={(e) => handleInputKeyDown(e, 'drug2')}
                          className="form-input with-icon"
                          placeholder="Enter second medication name..."
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      onClick={handleDrugInteraction}
                      disabled={interactionLoading || !drug1.trim() || !drug2.trim()}
                      className="primary-btn"
                    >
                      {interactionLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search size={16} />
                          Check Interaction
                        </>
                      )}
                    </button>

                    {(interactionResult || interactionError) && (
                      <button
                        onClick={clearInteractionResults}
                        className="secondary-btn"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {interactionError && (
                  <div className="alert alert-error">
                    <XCircle size={20} />
                    <span>{interactionError}</span>
                  </div>
                )}

                {interactionResult && (
                  <div className="interaction-result">
                    <div className={`severity-card ${getSeverityConfig(interactionResult.severity).color}`}>
                      <div className="severity-header">
                        {React.createElement(getSeverityConfig(interactionResult.severity).icon, {
                          size: 24,
                          className: "severity-icon"
                        })}
                        <div className="severity-info">
                          <h4>{getSeverityConfig(interactionResult.severity).label}</h4>
                          <p className="drug-pair">{drug1} + {drug2}</p>
                        </div>
                      </div>

                      <div className="interaction-details">
                        <div className="detail-section">
                          <div className="detail-header">
                            <Info size={18} />
                            <h5>Clinical Information</h5>
                          </div>
                          <p>{interactionResult.explanation}</p>
                        </div>

                        {interactionResult.monitoring && (
                          <div className="detail-section">
                            <div className="detail-header">
                              <Shield size={18} />
                              <h5>Monitoring Requirements</h5>
                            </div>
                            <p>{interactionResult.monitoring}</p>
                          </div>
                        )}

                        {interactionResult.alternatives && (
                          <div className="detail-section">
                            <div className="detail-header">
                              <Pill size={18} />
                              <h5>Alternative Options</h5>
                            </div>
                            <p>{interactionResult.alternatives}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="dashboard-card disclaimer-card">
          <div className="card-body">
            <div className="disclaimer-content">
              <AlertTriangle size={20} className="disclaimer-icon" />
              <div>
                <p className="disclaimer-title">Medical Disclaimer</p>
                <p className="disclaimer-text">
                  This tool provides AI-generated information for educational purposes only. 
                  Always consult with a healthcare professional, pharmacist, or physician before 
                  making any medication decisions. This is not a substitute for professional medical advice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPT;
