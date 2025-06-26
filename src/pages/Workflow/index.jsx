import React, { useState } from 'react';
import { 
  FileText, 
  Activity,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Pill,
  Home,
  Package,
  Mail,
  Users,
  Clock,
  ArrowDown,
  CheckCircle2,
  Info,
  RefreshCcw,
  CircleDot,
  FileCheck,
  Send,
  FolderOpen,
  UserCheck,
  Calculator,
  FileSignature,
  ClipboardCheck,
  Inbox,
  Archive
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './Workflow.css';

const Workflow = () => {
  const { theme } = useTheme();
  const [completedItems, setCompletedItems] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState({
    scenarioOverview: true,
    newRxNoChanges: false,
    sigDoseChanges: false,
    infusionChanges: false,
    maintenance: false
  });
  
  const [expandedFlowcharts, setExpandedFlowcharts] = useState({
    newRxNoChanges: false,
    sigDoseChanges: false,
    infusionChanges: false,
    maintenance: false
  });

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Toggle flowchart expansion
  const toggleFlowchart = (section) => {
    setExpandedFlowcharts(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Toggle item completion
  const toggleCompletion = (itemId) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Check if item is completed
  const isCompleted = (itemId) => completedItems.has(itemId);

  // Render clickable item
  const ClickableItem = ({ id, children, className = "" }) => (
    <div 
      className={`clickable-item ${isCompleted(id) ? 'completed' : ''} ${className}`}
      onClick={() => toggleCompletion(id)}
    >
      <div className="completion-indicator">
        {isCompleted(id) ? <Check size={16} strokeWidth={3} /> : <div className="empty-circle" />}
      </div>
      <div className="item-content">{children}</div>
    </div>
  );

  // Render clickable email template
  const ClickableEmailTemplate = ({ id, children }) => (
    <div 
      className={`email-template clickable ${isCompleted(id) ? 'completed' : ''}`}
      onClick={() => toggleCompletion(id)}
    >
      <div className="completion-indicator">
        {isCompleted(id) ? <Check size={16} strokeWidth={3} /> : <div className="empty-circle" />}
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );

  // Reset all completions
  const resetCompletions = () => {
    setCompletedItems(new Set());
  };

  // Expand all sections
  const expandAll = () => {
    setExpandedSections({
      scenarioOverview: true,
      newRxNoChanges: true,
      sigDoseChanges: true,
      infusionChanges: true,
      maintenance: true
    });
  };

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections({
      scenarioOverview: false,
      newRxNoChanges: false,
      sigDoseChanges: false,
      infusionChanges: false,
      maintenance: false
    });
  };

  return (
    <div className="workflow-page page-container">
      <div className="workflow-timeline-content">
        {/* Header */}
        <div className="workflow-header">
          <div className="workflow-header-content">
            <div className="workflow-header-title">
              <FileText size={32} />
              <div>
                <h1>Standard Operating Procedure</h1>
                <p>Shipping Pump & Nursing Homecare Workflow</p>
              </div>
            </div>
            <div className="workflow-header-actions">
              <button className="workflow-action-btn secondary" onClick={collapseAll}>
                <ChevronUp size={18} />
                <span>Collapse All</span>
              </button>
              <button className="workflow-action-btn secondary" onClick={expandAll}>
                <ChevronDown size={18} />
                <span>Expand All</span>
              </button>
              <button className="workflow-action-btn primary" onClick={resetCompletions}>
                <RefreshCcw size={18} />
                <span>Reset Progress</span>
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Container */}
        <div className="workflow-timeline-container">
          <div className="timeline-line"></div>
          
          {/* Scenario Overview */}
          <div className="timeline-section">
            <div className="timeline-node large active">
              <Activity size={28} />
            </div>
            <div className="timeline-content">
              <div className="timeline-card orange-section">
                <div 
                  className="timeline-card-header clickable orange-section"
                  onClick={() => toggleSection('scenarioOverview')}
                >
                  <h2>Scenario Overview</h2>
                  {expandedSections.scenarioOverview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.scenarioOverview && (
                  <div className="timeline-card-body">
                    <div className="decision-table-container">
                      <table className="decision-table">
                        <thead>
                          <tr>
                            <th>SCENARIO</th>
                            <th>Shipping pump</th>
                            <th>Send New Rx to Nursing Homecare</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>New Rx with no changes</strong></td>
                            <td className="no">No</td>
                            <td className="yes">Yes (cc: RPh team)</td>
                          </tr>
                          <tr>
                            <td><strong>Sig or Dose Changes only</strong></td>
                            <td className="no">No</td>
                            <td className="yes">Yes (cc: RPh team)</td>
                          </tr>
                          <tr>
                            <td><strong>Changes to infusion rates, total volume, or total time</strong></td>
                            <td className="yes">Yes</td>
                            <td className="yes">Yes (cc: RPh team)</td>
                          </tr>
                          <tr>
                            <td><strong>Maintenance or Malfunction</strong></td>
                            <td className="yes">Yes</td>
                            <td className="no">No</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* New Rx with No Changes Section */}
          <div className="timeline-section">
            <div className="timeline-node">
              <FileText size={28} />
            </div>
            <div className="timeline-content">
              <div className="timeline-card red-section">
                <div 
                  className="timeline-card-header clickable red-section"
                  onClick={() => toggleSection('newRxNoChanges')}
                >
                  <h2>New Rx with No Changes</h2>
                  {expandedSections.newRxNoChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.newRxNoChanges && (
                  <div className="timeline-card-body">
                    {/* Collapsible Flowchart */}
                    <div className="flowchart-section">
                      <div className="flowchart-toggle" onClick={() => toggleFlowchart('newRxNoChanges')}>
                        <div className="flowchart-toggle-title">
                          <Activity className="flowchart-toggle-icon" size={20} />
                          <span>Process Flowchart</span>
                        </div>
                        {expandedFlowcharts.newRxNoChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                      <div className={`flowchart-container ${!expandedFlowcharts.newRxNoChanges ? 'collapsed' : ''}`}>
                        <div className="flowchart-header">PUMP PROCESS</div>
                        <div className="flowchart">
                          <div className="flowchart-box gray">
                            <p style={{ fontStyle: 'italic' }}>"RPh initiated"</p>
                            <p style={{ fontWeight: 'bold' }}>New Rx identified</p>
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box orange">New Rx with no changes</div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box orange">
                            RPh A:<br />
                            Verify Rx &<br />
                            email to Nursing Homecare<br />
                            (cc: RPh Team)
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box orange">No Pump Needed</div>
                        </div>
                      </div>
                    </div>

                    <div className="flowchart-section">
                      <div className="flowchart-toggle" style={{ cursor: 'default', backgroundColor: 'transparent' }}>
                        <div className="flowchart-toggle-title">
                          <FileCheck className="flowchart-toggle-icon" size={20} />
                          <span>Pump sheet for "New Rx with no changes"</span>
                        </div>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      {/* Subsection: Check HHN Status */}
                      <div className="flowchart-section">
                        <div className="flowchart-toggle" style={{ cursor: 'default', backgroundColor: 'transparent' }}>
                          <div className="flowchart-toggle-title">
                            <CircleDot className="flowchart-toggle-icon" size={20} />
                            <span>Step 1: Check HHN Status</span>
                          </div>
                        </div>
                      </div>
                      <ClickableItem id="new-rx-check-hhn">
                        <div className="checklist-item">
                          <strong>Check for HHN status in priority comments:</strong>
                          <ul>
                            <li>If not stated, investigate then update priority comments to either "No HHN" or "HHN"</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Verify and Send */}
                      <div className="flowchart-section">
                        <div className="flowchart-toggle" style={{ cursor: 'default', backgroundColor: 'transparent' }}>
                          <div className="flowchart-toggle-title">
                            <FileCheck className="flowchart-toggle-icon" size={20} />
                            <span>Step 2: Verify and Send</span>
                          </div>
                        </div>
                      </div>
                      <ClickableItem id="new-rx-1">
                        <div className="checklist-item">
                          <strong>If new Rx has no changes:</strong>
                          <ul>
                            <li>Verify Rx, clean profile, and email new Rx to Nursing Homecare (cc: RPh Team)</li>
                            <li>Not shipping pump <em>(Holly Tucker is not involved since not shipping a new pump.)</em></li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Add Intervention Note */}
                      <div className="subsection-header">
                        <FileSignature size={20} />
                        <h3>Step 3: Add Intervention Note</h3>
                      </div>
                      <ClickableItem id="new-rx-2">
                        <div className="checklist-item">
                          <strong>Add prescription management intervention note</strong>
                          <ul>
                            <li>Verified Rx (with HHN; no changes); sent new Rx to Nursing Homecare (cc: RPh Team)</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sig or Dose Changes Section */}
          <div className="timeline-section">
            <div className="timeline-node">
              <Pill size={28} />
            </div>
            <div className="timeline-content">
              <div className="timeline-card blue-section">
                <div 
                  className="timeline-card-header clickable blue-section"
                  onClick={() => toggleSection('sigDoseChanges')}
                >
                  <h2>Sig or Dose Changes Only</h2>
                  {expandedSections.sigDoseChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.sigDoseChanges && (
                  <div className="timeline-card-body">
                    {/* Collapsible Flowchart */}
                    <div className="flowchart-section">
                      <div className="flowchart-toggle" onClick={() => toggleFlowchart('sigDoseChanges')}>
                        <div className="flowchart-toggle-title">
                          <Activity className="flowchart-toggle-icon" size={20} />
                          <span>Process Flowchart</span>
                        </div>
                        {expandedFlowcharts.sigDoseChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                      <div className={`flowchart-container ${!expandedFlowcharts.sigDoseChanges ? 'collapsed' : ''}`}>
                        <div className="flowchart-header">PUMP PROCESS</div>
                        <div className="flowchart">
                          <div className="flowchart-box gray">
                            <p style={{ fontStyle: 'italic' }}>"RPh initiated"</p>
                            <p style={{ fontWeight: 'bold' }}>New Rx identified</p>
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box blue">Sig or dose changes only</div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box blue">
                            RPh A:<br />
                            Verify Rx, create pump sheet &<br />
                            email to SPRx<br />
                            (cc: Pump Sheets)
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box blue">
                            RPh B:<br />
                            Type/verify pump sheet &<br />
                            email to Nursing Homecare & RPh Team
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box blue red-text">No Pump Needed</div>
                        </div>
                      </div>
                    </div>

                    <div className="flowchart-section">
                      <div className="flowchart-toggle" style={{ cursor: 'default', backgroundColor: 'transparent' }}>
                        <div className="flowchart-toggle-title">
                          <FileCheck className="flowchart-toggle-icon" size={20} />
                          <span>Pump sheet for "Sig or Dose Changes only"</span>
                        </div>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      {/* Subsection: Check HHN Status */}
                      <div className="subsection-header">
                        <CircleDot size={20} />
                        <h3>Step 1: Check HHN Status</h3>
                      </div>
                      <ClickableItem id="sig-dose-check-hhn">
                        <div className="checklist-item">
                          <strong>Check for HHN status in priority comments:</strong>
                          <ul>
                            <li>If not stated, investigate then update priority comments to either "No HHN" or "HHN"</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Create Pump Sheet */}
                      <div className="subsection-header">
                        <FileText size={20} />
                        <h3>Step 2: Create Pump Sheet</h3>
                      </div>
                      <ClickableItem id="sig-dose-1">
                        <div className="checklist-item">
                          <strong>If new Rx has <u>changes to sig or dose only</u>, create new pump sheet</strong>
                          <ul>
                            <li>Verify Rx, clean profile, then create new pump sheet</li>
                            <li>Not shipping pump <em>(Holly Tucker is not involved since not shipping a new pump.)</em></li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Email to SPRx */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Step 3: Email to SPRx</h3>
                      </div>
                      <ClickableItem id="sig-dose-2">
                        <div className="checklist-item">
                          <strong>Make sure of the following and email new Rx and pump sheet</strong>
                          <ul>
                            <li>Email to SPRx and cc: Pump Sheets</li>
                            <li>Update subject line (specify changes)</li>
                            <li>Attach word document of pump sheet</li>
                            <li>Add your signature</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      <ClickableEmailTemplate id="sig-dose-email-1">
                        <div className="email-header">
                          <div className="email-header-title">
                            <Mail size={20} />
                            <span>Email Template Example</span>
                          </div>
                          <div className="email-fields">
                            <div className="email-field">
                              <span className="email-field-label">To:</span>
                              <span className="email-field-value email-address">8553658111@fax.cvhealth.com</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Cc:</span>
                              <span className="email-field-value email-address">Pump Sheets (HAE/LSD)</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Subject:</span>
                              <span className="email-field-value">C08 – SPRX ACCOUNT# – PT'S LAST NAME, PT'S FIRST NAME – POMBILITI 2370 MG – DOSE INCREASE</span>
                            </div>
                          </div>
                        </div>
                        <div className="email-attachments">
                          <div className="email-attachment">
                            C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - POMBILITI 2740 MG - DOSE INCREASE - PUMP SHEET.doc
                            <span className="attachment-size">(40 KB)</span>
                          </div>
                        </div>
                        <div className="email-content">
                          <div className="attention-box">
                            <strong>ATTENTION INTAKE TEAM</strong>
                            <p>Please index this as a document type PUMP PROGRAM SHEET (IRC 54915) and Rx.</p>
                          </div>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Add Intervention Note */}
                      <div className="subsection-header">
                        <FileSignature size={20} />
                        <h3>Step 4: Add Intervention Note</h3>
                      </div>
                      <ClickableItem id="sig-dose-3">
                        <div className="checklist-item">
                          <strong>Add dosing intervention note</strong>
                          <ul>
                            <li>[Pump Sheet] created and sent to SPRx for pump sheet (specify changes); pending Rx entry and verification.</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Move to Drafts */}
                      <div className="subsection-header">
                        <FolderOpen size={20} />
                        <h3>Step 5: Move to Drafts</h3>
                      </div>
                      <ClickableItem id="sig-dose-4">
                        <div className="checklist-item">
                          <strong>Move email to "Drafts" folder</strong>
                          <ul>
                            <li>Move email (with pump sheet attachment) to pump folder "Drafts" (for word document reference)</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Add to Pump Tracker */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 6: Add to Pump Tracker</h3>
                      </div>
                      <ClickableItem id="sig-dose-5">
                        <div className="checklist-item">
                          <strong>Add patient to pump tracker (Tab#2 - Sig or Dose Changes only)</strong>
                          <ul>
                            <li>Update accordingly</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh B</h3>
                      </div>
                      
                      {/* Subsection: Identify Patient in Tracker */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 7: Identify Patient in Tracker</h3>
                      </div>
                      <ClickableItem id="sig-dose-6">
                        <div className="checklist-item">
                          <strong>Identify patient in pump tracker (Tab#2 - Sig or Dose Changes only)</strong>
                          <ul>
                            <li>Add RPh initials (to indicate you are currently working on the pump sheet) and update accordingly</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Type Pump Sheet */}
                      <div className="subsection-header">
                        <FileText size={20} />
                        <h3>Step 8: Type Pump Sheet</h3>
                      </div>
                      <ClickableItem id="sig-dose-7">
                        <div className="checklist-item">
                          <strong>Type pump sheet (if Tech has not done so)</strong>
                        </div>
                      </ClickableItem>

                      {/* Pump Sheet Entry Table */}
                      <div className="pump-table-container">
                        <table className="pump-table">
                          <tr>
                            <th>Drug</th>
                            <td>PUMP CURLIN 6000CMB SHEET (IRC 54915)</td>
                          </tr>
                          <tr>
                            <th>Written date</th>
                            <td>Written date for main drug prescription</td>
                          </tr>
                          <tr>
                            <th>Sig</th>
                            <td>USE FOR INFUSION WITH &lt;DRUG&gt; INFUSION; DOSE/RANGE AS PER ATTACHED DETAILED PUMP SHEET</td>
                          </tr>
                          <tr>
                            <th>Qty</th>
                            <td>1</td>
                          </tr>
                          <tr>
                            <th>Prescriber</th>
                            <td>Prescriber who wrote main drug prescription</td>
                          </tr>
                          <tr>
                            <th>Day supply</th>
                            <td>1</td>
                          </tr>
                          <tr>
                            <th>Refill</th>
                            <td>0</td>
                          </tr>
                          <tr>
                            <th>DAW</th>
                            <td>0</td>
                          </tr>
                        </table>
                      </div>

                      {/* Subsection: Verify Pump Sheet */}
                      <div className="subsection-header">
                        <FileCheck size={20} />
                        <h3>Step 9: Verify Pump Sheet</h3>
                      </div>
                      <ClickableItem id="sig-dose-8">
                        <div className="checklist-item">
                          <strong>Verify pump sheet Rx and add annotation</strong>
                          <ul>
                            <li>[Pump Sheet] Double checked by –, RPh</li>
                          </ul>
                        </div>
                      </ClickableItem>


                      {/* Subsection: Add Final Note */}
                      <div className="subsection-header">
                        <FileSignature size={20} />
                        <h3>Step 10: Add Final Note</h3>
                      </div>
                      <ClickableItem id="sig-dose-9">
                        <div className="checklist-item">
                          <strong>Add dosing intervention note</strong>
                          <ul>
                            <li>[Pump sheet] Double checked pump sheet (SPECIFY CHANGES), Rx verified, forwarded pump sheet and new Rx to Nursing Homecare and RPh Team.</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Email to Nursing */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Step 11: Email to Nursing</h3>
                      </div>
                      <ClickableItem id="sig-dose-10">
                        <div className="checklist-item">
                          <strong>Make sure of the following and email new Rx and pump sheet</strong>
                          <ul>
                            <li>Email to Nursing homecare & RPh Team</li>
                            <li>Update subject line (specify changes)</li>
                            <li>Attach PDF of pump sheet and new Rx</li>
                            <li>Add your signature</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Send Email */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Email to Nursing</h3>
                      </div>
                      <ClickableEmailTemplate id="sig-dose-email-2">
                        <div className="email-header">
                          <div className="email-header-title">
                            <Mail size={20} />
                            <span>Email Template Example</span>
                          </div>
                          <div className="email-fields">
                            <div className="email-field">
                              <span className="email-field-label">To:</span>
                              <span className="email-field-value email-address">Nursing Homecare @ HAELysePharmacistTeam</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Cc:</span>
                              <span className="email-field-value">RPh Team</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Subject:</span>
                              <span className="email-field-value">C08 – SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME – POMBILITI 2370 MG – DOSE INCREASE</span>
                            </div>
                          </div>
                        </div>
                        <div className="email-content">
                          <p>Hi Team, updated pump sheet (SPECIFY CHANGES) and new Rx attached.</p>
                        </div>
                        <div className="email-attachments">
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - POMBILITI 2740 MG - DOSE INCREASE - PUMP SHEET.doc <span className="attachment-size">(40 KB)</span></div>
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - POMBILITI 2740 MG - DOSE INCREASE - PUMP SHEET.doc <span className="attachment-size">(40 KB)</span></div>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Clear Tracker */}
                      <div className="subsection-header">
                        <Archive size={20} />
                        <h3>Step 12: Clear Tracker</h3>
                      </div>
                      <ClickableItem id="sig-dose-11">
                        <div className="checklist-item">
                          <strong>Clear patient line from pump tracker (Tab#2 - Sig or Dose Changes only)</strong>
                          <ul>
                            <li>Since done with creating, verifying, and sending pump sheet & nursing orders to Nursing Homecare, can clear patient line from pump tracker.</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Infusion Changes Section */}
          <div className="timeline-section">
            <div className="timeline-node">
              <RefreshCcw size={28} />
            </div>
            <div className="timeline-content">
              <div className="timeline-card green-section">
                <div 
                  className="timeline-card-header clickable green-section"
                  onClick={() => toggleSection('infusionChanges')}
                >
                  <h2>Changes to Infusion Rates, Total Volume or Time</h2>
                  {expandedSections.infusionChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.infusionChanges && (
                  <div className="timeline-card-body">
                    {/* Collapsible Flowchart */}
                    <div className="flowchart-section">
                      <div className="flowchart-toggle" onClick={() => toggleFlowchart('infusionChanges')}>
                        <div className="flowchart-toggle-title">
                          <Activity className="flowchart-toggle-icon" size={20} />
                          <span>Process Flowchart</span>
                        </div>
                        {expandedFlowcharts.infusionChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                      <div className={`flowchart-container ${!expandedFlowcharts.infusionChanges ? 'collapsed' : ''}`}>
                        <div className="flowchart-header">PUMP PROCESS</div>
                        <div className="flowchart">
                          <div className="flowchart-box gray">
                            <p style={{ fontStyle: 'italic' }}>"RPh initiated"</p>
                            <p style={{ fontWeight: 'bold' }}>New Rx identified</p>
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box green">
                            Changes to:<br />
                            infusion rates, total volume or time
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box green">
                            RPh A:<br />
                            Verify Rx, create pump sheet &<br />
                            email SPRx, Tech Team & Holly<br />
                            (cc: Pump Sheets)
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box green">
                            RPh B:<br />
                            Type/verify pump sheet &<br />
                            email to Nursing Homecare<br />
                            (cc: RPh & CSR Teams)
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box green red-text">Pump Needed</div>
                        </div>
                      </div>
                    </div>

                    <div className="flowchart-section">
                      <div className="flowchart-toggle" style={{ cursor: 'default', backgroundColor: 'transparent' }}>
                        <div className="flowchart-toggle-title">
                          <FileCheck className="flowchart-toggle-icon" size={20} />
                          <span>Pump sheet for "changes to infusion rates, total volume or time"</span>
                        </div>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      {/* Subsection: Check HHN Status */}
                      <div className="subsection-header">
                        <CircleDot size={20} />
                        <h3>Step 1: Check HHN Status</h3>
                      </div>
                      <ClickableItem id="infusion-check-hhn">
                        <div className="checklist-item">
                          <strong>Check for HHN status in priority comments:</strong>
                          <ul>
                            <li>If not stated, investigate then update priority comments to either "No HHN" or "HHN"</li>
                            <li>Verify Rx, clean up the profile, then create new pump sheet</li>
                            <li>Need to ship new pump <em>(include Holly Tucker because shipping a new pump due to pump changes)</em></li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Create Pump Sheet */}
                      <div className="subsection-header">
                        <FolderOpen size={20} />
                        <h3>Step 2: Create Pump Sheet</h3>
                      </div>
                      <ClickableEmailTemplate id="infusion-email-1">
                        <div className="email-header">
                          <Info size={20} />
                          <span>Example Pump Sheet</span>
                        </div>
                        <div className="email-content">
                          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>SPECIALTY PHARMACY</p>
                          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>PUMP CURLIN 6000CMB SHEET</p>
                          <p>Pump settings: Variable</p>
                          <table style={{ width: '100%', margin: '10px 0' }}>
                            <tr>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}><strong>Patient Information</strong></td>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}>Value</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}>DOB</td>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}></td>
                            </tr>
                          </table>
                          <p>Drug Name: fep</p>
                          <p>Remove: jjjj from Normal Saline IV bag (drug & bag overwt volume)</p>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Email Pump Sheet */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Step 3: Email Pump Sheet</h3>
                      </div>
                      <ClickableItem id="infusion-2">
                        <div className="checklist-item">
                          <strong>2) Make sure of the following and email new Rx and pump sheet</strong>
                          <ul>
                            <li>Email to SPRx, Tech Team & Holly Tucker and cc: Pump Sheets</li>
                            <li>Update subject line (SPECIFY CHANGES)</li>
                            <li>Attach word document of pump sheet</li>
                            <li>Add your signature</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      <ClickableEmailTemplate id="infusion-email-2">
                        <div className="email-header">
                          <div className="email-header-title">
                            <Mail size={20} />
                            <span>Email Template Example</span>
                          </div>
                          <div className="email-fields">
                            <div className="email-field">
                              <span className="email-field-label">To:</span>
                              <span className="email-field-value email-address">8553658111@fax.cvhealth.com @ HAE Lyse Pharmacy Technician Team @ Tucker, Holly A</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Cc:</span>
                              <span className="email-field-value email-address">Pump Sheets (HAE/LSD)</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Subject:</span>
                              <span className="email-field-value">SPOC - A/C/W - NAME - DRUG - PUMP SHEET - SPECIFY CHANGES</span>
                            </div>
                          </div>
                        </div>
                        <div className="email-content">
                          <div className="attention-box">
                            <strong>ATTENTION INTAKE TEAM</strong><br />
                            Please index this as a document type PUMP PROGRAM SHEET (IRC 54915) and Rx.
                            <br /><br />
                            <strong>HI TECH TEAM</strong><br />
                            Please complete Rx ENTRY for attached pump sheet STAO.
                            <br /><br />
                            <strong>HI HOLLY</strong><br />
                            Please schedule pump order.
                            <br /><br />
                            ** NO NEED TO RESPOND TO THIS EMAIL **
                          </div>
                        </div>
                        <div className="email-attachments">
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - POMBILITI 2740 MG - DOSE INCREASE - PUMP SHEET.doc <span className="attachment-size">(40 KB)</span></div>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Add Intervention Note */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 4: Add Intervention Note</h3>
                      </div>
                      <ClickableItem id="infusion-3">
                        <div className="checklist-item">
                          <strong>3) Add adherence intervention note</strong>
                          <ul>
                            <li>[Pump Sheet] Rx verified, created and sent to SPRx for pump sheet (SPECIFY CHANGES); pending Rx entry and verification; shipping new pump.</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Archive Email */}
                      <div className="subsection-header">
                        <Archive size={20} />
                        <h3>Step 5: Archive Email</h3>
                      </div>
                      <ClickableItem id="infusion-4">
                        <div className="checklist-item">
                          <strong>4) Move email to "Drafts" folder</strong>
                          <ul>
                            <li>Move email (with pump sheet attachment) to pump folder "Drafts" (for word document reference)</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Add to Pump Tracker */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 5: Add to Pump Tracker</h3>
                      </div>
                      <ClickableItem id="infusion-5">
                        <div className="checklist-item">
                          <strong>5) Add patient to pump tracker (Tab#3 - Infusion Changes)</strong>
                          <ul>
                            <li>Update accordingly</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh B</h3>
                      </div>
                      
                      {/* Subsection: Identify Patient in Tracker */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 6: Identify Patient in Tracker</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-1">
                        <div className="checklist-item">
                          <strong>Identify patient in pump tracker (Tab#3 - Infusion Changes)</strong>
                          <ul>
                            <li>Add RPh initials (to indicate you are currently working on the pump sheet) and update accordingly</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Type Pump Sheet */}
                      <div className="subsection-header">
                        <FileText size={20} />
                        <h3>Step 7: Type Pump Sheet</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-2">
                        <div className="checklist-item">
                          <strong>Type pump sheet (if Tech has not done so)</strong>
                        </div>
                      </ClickableItem>

                      {/* Pump Sheet Entry Table */}
                      <div className="pump-table-container">
                        <table className="pump-table">
                          <tr>
                            <th>Drug</th>
                            <td>PUMP CURLIN 6000CMB SHEET (IRC 54915)</td>
                          </tr>
                          <tr>
                            <th>Written date</th>
                            <td>Written date for main drug prescription</td>
                          </tr>
                          <tr>
                            <th>Sig</th>
                            <td>USE FOR INFUSION WITH &lt;DRUG&gt; INFUSION; DOSE/RANGE AS PER ATTACHED DETAILED PUMP SHEET</td>
                          </tr>
                          <tr>
                            <th>Qty</th>
                            <td>1</td>
                          </tr>
                          <tr>
                            <th>Prescriber</th>
                            <td>Prescriber who wrote main drug prescription</td>
                          </tr>
                          <tr>
                            <th>Day supply</th>
                            <td>1</td>
                          </tr>
                          <tr>
                            <th>Refill</th>
                            <td>0</td>
                          </tr>
                          <tr>
                            <th>DAW</th>
                            <td>0</td>
                          </tr>
                        </table>
                      </div>

                      {/* Subsection: Verify Pump Sheet */}
                      <div className="subsection-header">
                        <FileCheck size={20} />
                        <h3>Step 8: Verify Pump Sheet</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-3">
                        <div className="checklist-item">
                          <strong>Verify pump sheet Rx and add annotation</strong>
                          <ul>
                            <li>[Pump Sheet] Double checked by –, RPh</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Calculate Pump Rate */}
                      <div className="subsection-header">
                        <Calculator size={20} />
                        <h3>Step 9: Calculate Pump Rate</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-4">
                        <div className="checklist-item">
                          <strong>Pump rate calculator</strong>
                          <ul>
                            <li>Using pump calculator, insert total volume and infusion duration to obtain infusion rate</li>
                            <li>Compare with infusion rate in pump sheet (rates should match)</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Add Final Note */}
                      <div className="subsection-header">
                        <FileSignature size={20} />
                        <h3>Step 10: Add Final Note</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-5">
                        <div className="checklist-item">
                          <strong>Add adherence intervention note</strong>
                          <ul>
                            <li>[Pump sheet] Double checked pump sheet (SPECIFY CHANGES), Rx verified, forwarded pump sheet and new Rx to Nursing Homecare and CSR Team.</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Email to Nursing */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Step 11: Email to Nursing</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-6">
                        <div className="checklist-item">
                          <strong>Make sure of the following and email new Rx and pump sheet</strong>
                          <ul>
                            <li>Email to Nursing homecare and cc: RPh & CSR Teams</li>
                            <li>Update subject line (specify changes)</li>
                            <li>Attach PDF of pump sheet and new Rx</li>
                            <li>Add your signature</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      <ClickableEmailTemplate id="infusion-rph-b-email">
                        <div className="email-header">
                          <div className="email-header-title">
                            <Mail size={20} />
                            <span>Email Template Example</span>
                          </div>
                          <div className="email-fields">
                            <div className="email-field">
                              <span className="email-field-label">To:</span>
                              <span className="email-field-value email-address">Nursing Homecare @ HAELysePharmacistTeam</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Cc:</span>
                              <span className="email-field-value">RPh Team @ CSR Team</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Subject:</span>
                              <span className="email-field-value">C08 – SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME – DRUG – SPECIFY CHANGES</span>
                            </div>
                          </div>
                        </div>
                        <div className="email-content">
                          <p>Hi Team, updated pump sheet (SPECIFY CHANGES) and new Rx attached.</p>
                        </div>
                        <div className="email-attachments">
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - DRUG - PUMP SHEET.pdf <span className="attachment-size">(40 KB)</span></div>
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - DRUG - NEW RX.pdf <span className="attachment-size">(25 KB)</span></div>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Clear Tracker */}
                      <div className="subsection-header">
                        <Archive size={20} />
                        <h3>Step 12: Clear Tracker</h3>
                      </div>
                      <ClickableItem id="infusion-rph-b-7">
                        <div className="checklist-item">
                          <strong>Clear patient line from pump tracker (Tab#3 - Infusion Changes)</strong>
                          <ul>
                            <li>Since done with creating, verifying, and sending pump sheet & nursing orders to Nursing Homecare, can clear patient line from pump tracker.</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Maintenance or Malfunction Section */}
          <div className="timeline-section">
            <div className="timeline-node">
              <Settings size={28} />
            </div>
            <div className="timeline-content">
              <div className="timeline-card gray-section">
                <div 
                  className="timeline-card-header clickable gray-section"
                  onClick={() => toggleSection('maintenance')}
                >
                  <h2>Maintenance or Malfunction</h2>
                  {expandedSections.maintenance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
                {expandedSections.maintenance && (
                  <div className="timeline-card-body">
                    {/* Collapsible Flowchart */}
                    <div className="flowchart-section">
                      <div className="flowchart-toggle" onClick={() => toggleFlowchart('maintenance')}>
                        <div className="flowchart-toggle-title">
                          <Activity className="flowchart-toggle-icon" size={20} />
                          <span>Process Flowchart</span>
                        </div>
                        {expandedFlowcharts.maintenance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                      <div className={`flowchart-container ${!expandedFlowcharts.maintenance ? 'collapsed' : ''}`}>
                        <div className="flowchart-header">PUMP PROCESS</div>
                        <div className="flowchart">
                          <div className="flowchart-box gray">
                            <p style={{ fontStyle: 'italic' }}>"Holly initiated"</p>
                            <p style={{ fontWeight: 'bold' }}>Maintenance due or Malfunction</p>
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box dark-gray">
                            RPh A:<br />
                            Create pump sheet & email to SPRx<br />
                            (cc: Pump Sheets)
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box dark-gray">
                            RPh B:<br />
                            Type/verify pump sheet & send to Holly
                          </div>
                          <ArrowDown className="flowchart-arrow" size={32} />
                          <div className="flowchart-box dark-gray red-text">Pump Needed</div>
                        </div>
                      </div>
                    </div>

                    <div className="flowchart-section">
                      <div className="flowchart-toggle" style={{ cursor: 'default', backgroundColor: 'transparent' }}>
                        <div className="flowchart-toggle-title">
                          <FileCheck className="flowchart-toggle-icon" size={20} />
                          <span>Pump sheet for "Maintenance or Malfunction" (no changes)</span>
                        </div>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      {/* Subsection: Check HHN Status */}
                      <div className="subsection-header">
                        <CircleDot size={20} />
                        <h3>Step 1: Check HHN Status</h3>
                      </div>
                      <ClickableItem id="maintenance-check-hhn">
                        <div className="checklist-item">
                          <strong>Check for HHN status in priority comments:</strong>
                          <ul>
                            <li>If not stated, investigate then update priority comments to either "No HHN" or "HHN"</li>
                            <li>Add RPh initials (to indicate you are currently working on the pump sheet)</li>
                            <li>Change "Order Status (RPh's)" to "5. RPh A – Pending Rx Entry Pump Sheet & Create Pump Sheet"</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Update Tracker */}
                      <div className="subsection-header">
                        <RefreshCcw size={20} />
                        <h3>Step 2: Update Tracker</h3>
                      </div>
                      <ClickableItem id="maintenance-1">
                        <div className="checklist-item">
                          <strong>1) Update pump tracker (Tab#1 - Main Page)</strong>
                          <ul>
                            <li>Copy and paste sig onto pump sheet from drug Rx in SPRx</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Create Pump Sheet */}
                      <div className="subsection-header">
                        <FolderOpen size={20} />
                        <h3>Step 3: Create Pump Sheet</h3>
                      </div>
                      <ClickableItem id="maintenance-2">
                        <div className="checklist-item">
                          <strong>2) Create pump sheet</strong>
                        </div>
                      </ClickableItem>

                      <ClickableEmailTemplate id="maintenance-email-1">
                        <div className="email-header">
                          <Info size={20} />
                          <span>Example Pump Sheet</span>
                        </div>
                        <div className="email-content">
                          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>SPECIALTY PHARMACY</p>
                          <p style={{ textAlign: 'center', fontWeight: 'bold' }}>PUMP CURLIN 6000CMB SHEET</p>
                          <p>Pump settings: Variable</p>
                          <table style={{ width: '100%', margin: '10px 0' }}>
                            <tr>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}><strong>Patient Information</strong></td>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}>Value</td>
                            </tr>
                            <tr>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}>DOB</td>
                              <td style={{ padding: '5px', border: '1px solid #ccc' }}></td>
                            </tr>
                          </table>
                          <p>Drug Name: fep</p>
                          <p>Remove: jjjj from Normal Saline IV bag (drug & bag overwt volume)</p>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Email Pump Sheet */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Step 4: Email Pump Sheet</h3>
                      </div>
                      <ClickableItem id="maintenance-3">
                        <div className="checklist-item">
                          <strong>3) Make sure of the following and email pump sheet</strong>
                          <ul>
                            <li>Email to SPRx & Tech Team (cc Pump Sheets)</li>
                            <li>Update subject line & STAO date</li>
                            <li>Attach word document of pump sheet</li>
                            <li>Add your signature</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      <ClickableEmailTemplate id="maintenance-email-2">
                        <div className="email-header">
                          <div className="email-header-title">
                            <Mail size={20} />
                            <span>Email Template Example</span>
                          </div>
                          <div className="email-fields">
                            <div className="email-field">
                              <span className="email-field-label">To:</span>
                              <span className="email-field-value email-address">8553658111@fax.cvhealth.com @ HAE Lyse Pharmacy Technician Team</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Cc:</span>
                              <span className="email-field-value email-address">Pump Sheets (HAE/LSD)</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Subject:</span>
                              <span className="email-field-value">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - HIZENACAINE 1500 MG - PUMP MAINTENANCE SHEET - NO CHANGES</span>
                            </div>
                          </div>
                        </div>
                        <div className="email-content">
                          <div className="attention-box">
                            <strong>ATTENTION INTAKE TEAM</strong><br />
                            Please index this as a document type PUMP PROGRAM SHEET (IRC 54915) and Rx.
                            <br /><br />
                            <strong>HI TECH</strong><br />
                            Please complete RX ENTRY for attached pump sheet STAO 5/30
                            <br /><br />
                            <span className="highlight">** NO NEED TO RESPOND TO THIS EMAIL **</span>
                          </div>
                        </div>
                        <div className="email-attachments">
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - HIZENACAINE 1500 MG - PUMP MAINTENANCE SHEET - NO CHANGES.docx <span className="attachment-size">(26 KB)</span></div>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Add Intervention Note */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 5: Add Intervention Note</h3>
                      </div>
                      <ClickableItem id="maintenance-4">
                        <div className="checklist-item">
                          <strong>4) Add adherence intervention note</strong>
                          <ul>
                            <li>[Pump Sheet] created and sent to SPRx for pump maintenance sheet (no changes); pending Rx entry and verification.</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Archive Email */}
                      <div className="subsection-header">
                        <Archive size={20} />
                        <h3>Step 6: Archive Email</h3>
                      </div>
                      <ClickableItem id="maintenance-5">
                        <div className="checklist-item">
                          <strong>5) Move email to "Drafts" folder</strong>
                          <ul>
                            <li>Move email (with pump sheet attachment) to pump folder "Drafts" (for word document reference).</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Update Pump Tracker */}
                      <div className="subsection-header">
                        <ClipboardCheck size={20} />
                        <h3>Step 7: Update Pump Tracker</h3>
                      </div>
                      <ClickableItem id="maintenance-6">
                        <div className="checklist-item">
                          <strong>6) Update pump tracker (Tab#1 - Main Page)</strong>
                          <ul>
                            <li>Change "Order Status (RPh's)" to "6. RPh A – Send Email to Holly"</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh B</h3>
                      </div>
                      
                      {/* Subsection: Type Pump Sheet */}
                      <div className="subsection-header">
                        <FileText size={20} />
                        <h3>Step 8: Type Pump Sheet</h3>
                      </div>
                      <ClickableItem id="maintenance-7">
                        <div className="checklist-item">
                          <strong>Type pump sheet (if Tech has not done so)</strong>
                        </div>
                      </ClickableItem>

                      {/* Pump Sheet Entry Table */}
                      <div className="pump-table-container">
                        <table className="pump-table">
                          <tr>
                            <th>Drug</th>
                            <td>PUMP CURLIN 6000CMB SHEET (IRC 54915)</td>
                          </tr>
                          <tr>
                            <th>Written date</th>
                            <td>Written date for main drug prescription</td>
                          </tr>
                          <tr>
                            <th>Sig</th>
                            <td>USE FOR INFUSION WITH &lt;DRUG&gt; INFUSION; DOSE/RANGE AS PER ATTACHED DETAILED PUMP SHEET</td>
                          </tr>
                          <tr>
                            <th>Qty</th>
                            <td>1</td>
                          </tr>
                          <tr>
                            <th>Prescriber</th>
                            <td>Prescriber who wrote main drug prescription</td>
                          </tr>
                          <tr>
                            <th>Day supply</th>
                            <td>1</td>
                          </tr>
                          <tr>
                            <th>Refill</th>
                            <td>0</td>
                          </tr>
                          <tr>
                            <th>DAW</th>
                            <td>0</td>
                          </tr>
                        </table>
                      </div>

                      {/* Subsection: Verify Pump Sheet */}
                      <div className="subsection-header">
                        <FileCheck size={20} />
                        <h3>Step 9: Verify Pump Sheet</h3>
                      </div>
                      <ClickableItem id="maintenance-8">
                        <div className="checklist-item">
                          <strong>Verify pump sheet Rx and add annotation</strong>
                          <ul>
                            <li>[Pump Sheet] Double checked by –, RPh</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Send to Holly */}
                      <div className="subsection-header">
                        <Send size={20} />
                        <h3>Step 10: Send to Holly</h3>
                      </div>
                      <ClickableItem id="maintenance-9">
                        <div className="checklist-item">
                          <strong>Email verified pump sheet to Holly Tucker</strong>
                          <ul>
                            <li>Attach PDF of pump sheet</li>
                            <li>Update subject line</li>
                            <li>Add your signature</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      <ClickableEmailTemplate id="maintenance-email-3">
                        <div className="email-header">
                          <div className="email-header-title">
                            <Mail size={20} />
                            <span>Email Template Example</span>
                          </div>
                          <div className="email-fields">
                            <div className="email-field">
                              <span className="email-field-label">To:</span>
                              <span className="email-field-value email-address">Tucker, Holly A</span>
                            </div>
                            <div className="email-field">
                              <span className="email-field-label">Subject:</span>
                              <span className="email-field-value">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - DRUG - PUMP MAINTENANCE</span>
                            </div>
                          </div>
                        </div>
                        <div className="email-content">
                          <p>Hi Holly,</p>
                          <p>Please schedule pump order for maintenance.</p>
                          <p>Pump sheet attached.</p>
                        </div>
                        <div className="email-attachments">
                          <div className="email-attachment">C08 - SPRX ACCOUNT# - PT'S LAST NAME, PT'S FIRST NAME - DRUG - PUMP MAINTENANCE SHEET.pdf <span className="attachment-size">(26 KB)</span></div>
                        </div>
                      </ClickableEmailTemplate>

                      {/* Subsection: Add Final Note */}
                      <div className="subsection-header">
                        <FileSignature size={20} />
                        <h3>Step 11: Add Final Note</h3>
                      </div>
                      <ClickableItem id="maintenance-10">
                        <div className="checklist-item">
                          <strong>Add adherence intervention note</strong>
                          <ul>
                            <li>[Pump sheet] Double checked pump sheet for maintenance (no changes), Rx verified, sent to Holly for pump scheduling.</li>
                          </ul>
                        </div>
                      </ClickableItem>

                      {/* Subsection: Clear Tracker */}
                      <div className="subsection-header">
                        <Archive size={20} />
                        <h3>Step 12: Clear Tracker</h3>
                      </div>
                      <ClickableItem id="maintenance-11">
                        <div className="checklist-item">
                          <strong>Clear patient line from pump tracker (Tab#1 - Main Page)</strong>
                          <ul>
                            <li>Since done with creating, verifying, and sending pump sheet to Holly, can clear patient line from pump tracker.</li>
                          </ul>
                        </div>
                      </ClickableItem>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Workflow;