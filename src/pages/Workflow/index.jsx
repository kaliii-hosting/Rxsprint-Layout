import React, { useState, useEffect } from 'react';
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
  Archive,
  Database,
  Zap,
  Eye,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './Workflow.css';
import EnterpriseHeader, { TabGroup, TabButton, ActionGroup, ActionButton } from '../../components/EnterpriseHeader/EnterpriseHeader';

const Workflow = () => {
  const { theme } = useTheme();
  const [completedItems, setCompletedItems] = useState(new Set());
  const [completedCards, setCompletedCards] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState({
    scenarioOverview: false,
    newRxNoChanges: false,
    sigDoseChanges: false,
    infusionChanges: false,
    maintenance: false
  });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, emailType: 'default' });
  

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
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

  // Toggle card completion
  const toggleCardCompletion = (cardId, itemIds, e) => {
    // Prevent event from bubbling to parent elements
    if (e) {
      e.stopPropagation();
    }
    
    console.log('Card clicked:', cardId); // Debug log
    
    setCompletedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      console.log('Completed cards:', Array.from(newSet)); // Debug log
      return newSet;
    });

    // Also toggle all items within the card
    if (itemIds && itemIds.length > 0) {
      setCompletedItems(prev => {
        const newSet = new Set(prev);
        const isCardCompleted = completedCards.has(cardId);
        
        itemIds.forEach(itemId => {
          if (!isCardCompleted) {
            // Card is being marked as complete, so mark all items
            newSet.add(itemId);
          } else {
            // Card is being unmarked, so unmark all items
            newSet.delete(itemId);
          }
        });
        
        return newSet;
      });
    }
  };

  // Check if item is completed
  const isCompleted = (itemId) => completedItems.has(itemId);

  // Check if card is completed
  const isCardCompleted = (cardId) => completedCards.has(cardId);

  // Handle right-click context menu
  const handleContextMenu = (e, emailType = 'default') => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      emailType: emailType
    });
  };

  // Hide context menu
  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, emailType: 'default' });
  };

  // Create email with template
  const createEmail = (emailType = 'default') => {
    let to, cc, subject, body;
    
    if (emailType === 'nursing') {
      to = 'nursing.homecare@cvshealth.com';
      cc = 'haelysopharmacistteam@cvshealth.com';
      subject = 'SPOC - ACCT# - NAME - DRUG - PUMP SHEET - (SPECIFY CHANGES)';
      body = 'Hi Team, updated pump sheet (SPECIFY CHANGES) and new Rx attached.';
    } else if (emailType === 'infusion') {
      // Multiple recipients for infusion changes
      to = '8553658111@fax.cvshealth.com,_haelysopharmacytechnicianteam@cvshealth.com,holly.tucker@cvshealth.com';
      cc = 'pumpsheetshae-lsd@cvshealth.com';
      subject = 'SPOC - ACCT# - NAME - DRUG - PUMP SHEET - (SPECIFY CHANGES)';
      body = 'ATTENTION INTAKE TEAM\nPlease index this as a document type PUMP PROGRAM SHEET [IRC 54915] and Rx.\n\nHI TECH TEAM\nPlease complete RX ENTRY for attached pump sheet STAO .\n\nHI HOLLY\nPlease schedule pump order.\n\nNO NEED TO RESPOND TO THIS EMAIL';
    } else if (emailType === 'infusion-nursing') {
      // Email for infusion changes to nursing
      to = 'nursing.homecare@cvshealth.com';
      cc = 'haelysopharmacistteam@cvshealth.com,hae_lyso_csr_team@cvshealth.com';
      subject = 'SPOC - ACCT # - NAME - DRUG - PUMP SHEET (SPECIFY CHANGES)';
      body = 'Hi Team, updated pump sheet (SPECIFY CHANGES) and new Rx attached. STAO';
    } else if (emailType === 'maintenance') {
      // Email for maintenance/malfunction
      to = '8553658111@fax.cvshealth.com,_haelysopharmacytechnicianteam@cvshealth.com';
      cc = 'pumpsheetshae-lsd@cvshealth.com';
      subject = 'SPOC - ACCT # - NAME - DRUG - PUMP MAINTENANCE SHEET (NO CHANGES)';
      body = 'ATTENTION INTAKE TEAM\nPlease index this as a document type PUMP PROGRAM SHEET [IRC 54915] and Rx.\n\nHI TECH\nPlease complete RX ENTRY for attached pump sheet STAO -- .\n\nNO NEED TO RESPOND TO THIS EMAIL';
    } else {
      to = '8553658111@fax.cvshealth.com';
      cc = 'pumpsheetshae-lsd@cvshealth.com';
      subject = 'SPOC - ACCT# - NAME - DRUG - PUMP SHEET - (SPECIFY CHANGES)';
      body = 'ATTENTION INTAKE TEAM\n\nPlease index this as a document type PUMP PROGRAM SHEET [IRC 54915] and Rx.';
    }
    
    const mailtoLink = `mailto:${to}?cc=${cc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    hideContextMenu();
  };

  // Render clickable item
  const ClickableItem = ({ id, children, className = "", onClick, enableContextMenu = false, emailType = 'default' }) => (
    <div 
      className={`clickable-item ${isCompleted(id) ? 'completed' : ''} ${className}`}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
      onContextMenu={enableContextMenu ? (e) => handleContextMenu(e, emailType) : undefined}
    >
      <div className="completion-indicator">
        {isCompleted(id) ? <Check size={16} strokeWidth={3} /> : <div className="empty-circle" />}
      </div>
      <div className="item-content">{children}</div>
    </div>
  );

  // Render subsection card
  const SubsectionCard = ({ id, itemIds, children, className = "" }) => (
    <div 
      className={`subsection-card ${isCardCompleted(id) ? 'completed' : ''} ${className}`}
      onClick={(e) => toggleCardCompletion(id, itemIds, e)}
    >
      {children}
    </div>
  );

  // Render clickable email template
  const ClickableEmailTemplate = ({ id, children, onClick }) => (
    <div 
      className={`email-template clickable`}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
    >
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );

  // Reset all completions
  const resetCompletions = () => {
    setCompletedItems(new Set());
    setCompletedCards(new Set());
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

  // Effect to handle clicks outside context menu
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.visible) {
        hideContextMenu();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

  return (
    <div className="workflow-page page-container">
      {/* Enterprise Header */}
      <EnterpriseHeader>
        <ActionGroup>
          <ActionButton
            onClick={collapseAll}
            icon={ChevronUp}
            secondary
          >
            Collapse All
          </ActionButton>
          <ActionButton
            onClick={expandAll}
            icon={ChevronDown}
            secondary
          >
            Expand All
          </ActionButton>
          <ActionButton
            onClick={resetCompletions}
            icon={RefreshCcw}
          >
            Reset
          </ActionButton>
        </ActionGroup>
      </EnterpriseHeader>
      
      <div className="workflow-timeline-content">

        {/* Timeline Container */}
        <div className="workflow-timeline-container">
          <div className="timeline-line"></div>
          
          {/* Scenario Overview - Compact Card */}
          <div className="workflow-section-compact">
            <div 
              className="workflow-card-compact overview-card"
              onClick={() => toggleSection('scenarioOverview')}
            >
              <div className="workflow-card-icon">
                <Activity size={24} />
              </div>
              <div className="workflow-card-content">
                <h3>Scenario Overview</h3>
                <p>Click to view decision matrix</p>
              </div>
              <div className="workflow-card-toggle">
                {expandedSections.scenarioOverview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {expandedSections.scenarioOverview && (
              <div className="workflow-expansion">
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

          {/* New Rx with No Changes Section */}
          <div className="workflow-section-compact">
            <div 
              className="workflow-card-compact new-rx-card"
              onClick={() => toggleSection('newRxNoChanges')}
            >
              <div className="workflow-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                <FileText size={24} />
              </div>
              <div className="workflow-card-content">
                <h3>New Rx with No Changes</h3>
                <p>No pump needed • Email to Nursing Homecare</p>
              </div>
              <div className="workflow-card-toggle">
                {expandedSections.newRxNoChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {expandedSections.newRxNoChanges && (
              <div className="workflow-expansion">{/* Pump sheet for "New Rx with no changes" */}

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Check HHN Status */}
                        <SubsectionCard id="new-rx-step-1" itemIds={["new-rx-check-hhn"]}>
                          <div className="subsection-header">
                            <CircleDot size={20} />
                            <h3>Step 1: Check HHN Status</h3>
                          </div>
                          <ClickableItem id="new-rx-check-hhn">
                            <div className="checklist-item">
                              <strong>Check for HHN status in priority comments:</strong>
                              <ul>
                                <li>If not stated, investigate then update priority comments to either "No HHN" or "HHN"</li>
                              </ul>
                            </div>
                          </ClickableItem>
                        </SubsectionCard>

                        {/* Subsection Card 2: Verify and Send */}
                        <SubsectionCard id="new-rx-step-2" itemIds={["new-rx-1"]}>
                          <div className="subsection-header">
                            <FileCheck size={20} />
                            <h3>Step 2: Verify and Send</h3>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Add Intervention Note */}
                        <SubsectionCard id="new-rx-step-3" itemIds={["new-rx-2"]}>
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
                        </SubsectionCard>
                      </div>
                    </div>
              </div>
            )}
          </div>

          {/* Sig or Dose Changes Section */}
          <div className="workflow-section-compact">
            <div 
              className="workflow-card-compact sig-dose-card"
              onClick={() => toggleSection('sigDoseChanges')}
            >
              <div className="workflow-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                <Pill size={24} />
              </div>
              <div className="workflow-card-content">
                <h3>Sig or Dose Changes Only</h3>
                <p>No pump needed • Create pump sheet</p>
              </div>
              <div className="workflow-card-toggle">
                {expandedSections.sigDoseChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {expandedSections.sigDoseChanges && (
              <div className="workflow-expansion">{/* Pump sheet for "Sig or Dose Changes only" */}

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Check HHN Status */}
                        <SubsectionCard id="sig-dose-step-1" itemIds={["sig-dose-check-hhn"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 2: Create Pump Sheet */}
                        <SubsectionCard id="sig-dose-step-2" itemIds={["sig-dose-1"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Email to SPRx */}
                        <SubsectionCard id="sig-dose-step-3" itemIds={["sig-dose-2", "sig-dose-email-1"]}>
                          <div className="subsection-header">
                            <Send size={20} />
                            <h3>Step 3: Email to SPRx</h3>
                          </div>
                          <ClickableItem id="sig-dose-2" enableContextMenu={true}>
                            <div className="checklist-item">
                              <strong>Make sure of the following and email new Rx and pump sheet</strong>
                              <ul>
                                <li>Email to SPRx and cc: Pump Sheets</li>
                                <li>Update subject line (specify changes)</li>
                                <li>Attach word document of pump sheet</li>
                                <li>Add your signature</li>
                              </ul>
                              <div className="context-menu-hint">Right-click to create email</div>
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
                        </SubsectionCard>

                        {/* Subsection Card 4: Add Intervention Note */}
                        <SubsectionCard id="sig-dose-step-4" itemIds={["sig-dose-3"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 5: Move to Drafts */}
                        <SubsectionCard id="sig-dose-step-5" itemIds={["sig-dose-4"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 6: Add to Pump Tracker */}
                        <SubsectionCard id="sig-dose-step-6" itemIds={["sig-dose-5"]}>
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
                        </SubsectionCard>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh B</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Identify Patient in Tracker */}
                        <SubsectionCard id="sig-dose-rph-b-step-7" itemIds={["sig-dose-6"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 2: Type Pump Sheet */}
                        <SubsectionCard id="sig-dose-rph-b-step-8" itemIds={["sig-dose-7"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Verify Pump Sheet */}
                        <SubsectionCard id="sig-dose-rph-b-step-9" itemIds={["sig-dose-8"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 4: Add Final Note */}
                        <SubsectionCard id="sig-dose-rph-b-step-10" itemIds={["sig-dose-9"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 5: Email to Nursing */}
                        <SubsectionCard id="sig-dose-rph-b-step-11" itemIds={["sig-dose-10", "sig-dose-email-2"]}>
                          <div className="subsection-header">
                            <Send size={20} />
                            <h3>Step 11: Email to Nursing</h3>
                          </div>
                          <ClickableItem id="sig-dose-10" enableContextMenu={true} emailType="nursing">
                            <div className="checklist-item">
                              <strong>Make sure of the following and email new Rx and pump sheet</strong>
                              <ul>
                                <li>Email to Nursing homecare & RPh Team</li>
                                <li>Update subject line (specify changes)</li>
                                <li>Attach PDF of pump sheet and new Rx</li>
                                <li>Add your signature</li>
                              </ul>
                              <div className="context-menu-hint">Right-click to create email</div>
                            </div>
                          </ClickableItem>
                          
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
                        </SubsectionCard>

                        {/* Subsection Card 6: Clear Tracker */}
                        <SubsectionCard id="sig-dose-rph-b-step-12" itemIds={["sig-dose-11"]}>
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
                        </SubsectionCard>
                      </div>
                    </div>
              </div>
            )}
          </div>

          {/* Infusion Changes Section */}
          <div className="workflow-section-compact">
            <div 
              className="workflow-card-compact infusion-card"
              onClick={() => toggleSection('infusionChanges')}
            >
              <div className="workflow-card-icon" style={{ background: '#d1fae5', color: '#10b981' }}>
                <RefreshCcw size={24} />
              </div>
              <div className="workflow-card-content">
                <h3>Infusion Rate/Volume/Time Changes</h3>
                <p>Pump needed • Create pump sheet • Schedule with Holly</p>
              </div>
              <div className="workflow-card-toggle">
                {expandedSections.infusionChanges ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {expandedSections.infusionChanges && (
              <div className="workflow-expansion">
{/* Pump sheet for "changes to infusion rates, total volume or time" */}

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Check HHN Status */}
                        <SubsectionCard id="infusion-step-1" itemIds={["infusion-check-hhn"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 2: Create Pump Sheet */}
                        <SubsectionCard id="infusion-step-2" itemIds={["infusion-email-1"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Email Pump Sheet */}
                        <SubsectionCard id="infusion-step-3" itemIds={["infusion-2", "infusion-email-2"]}>
                          <div className="subsection-header">
                            <Send size={20} />
                            <h3>Step 3: Email Pump Sheet</h3>
                          </div>
                          <ClickableItem id="infusion-2" enableContextMenu={true} emailType="infusion">
                            <div className="checklist-item">
                              <strong>2) Make sure of the following and email new Rx and pump sheet</strong>
                              <ul>
                                <li>Email to SPRx, Tech Team & Holly Tucker and cc: Pump Sheets</li>
                                <li>Update subject line (SPECIFY CHANGES)</li>
                                <li>Attach word document of pump sheet</li>
                                <li>Add your signature</li>
                              </ul>
                              <div className="context-menu-hint">Right-click to create email</div>
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
                        </SubsectionCard>

                        {/* Subsection Card 4: Add Intervention Note */}
                        <SubsectionCard id="infusion-step-4" itemIds={["infusion-3"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 5: Archive Email */}
                        <SubsectionCard id="infusion-step-5" itemIds={["infusion-4"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 6: Add to Pump Tracker */}
                        <SubsectionCard id="infusion-step-6" itemIds={["infusion-5"]}>
                          <div className="subsection-header">
                            <ClipboardCheck size={20} />
                            <h3>Step 6: Add to Pump Tracker</h3>
                          </div>
                          <ClickableItem id="infusion-5">
                            <div className="checklist-item">
                              <strong>5) Add patient to pump tracker (Tab#3 - Infusion Changes)</strong>
                              <ul>
                                <li>Update accordingly</li>
                              </ul>
                            </div>
                          </ClickableItem>
                        </SubsectionCard>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh B</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Identify Patient in Tracker */}
                        <SubsectionCard id="infusion-rph-b-step-7" itemIds={["infusion-rph-b-1"]}>
                          <div className="subsection-header">
                            <ClipboardCheck size={20} />
                            <h3>Step 7: Identify Patient in Tracker</h3>
                          </div>
                          <ClickableItem id="infusion-rph-b-1">
                            <div className="checklist-item">
                              <strong>Identify patient in pump tracker (Tab#3 - Infusion Changes)</strong>
                              <ul>
                                <li>Add RPh initials (to indicate you are currently working on the pump sheet) and update accordingly</li>
                              </ul>
                            </div>
                          </ClickableItem>
                        </SubsectionCard>

                        {/* Subsection Card 2: Type Pump Sheet */}
                        <SubsectionCard id="infusion-rph-b-step-8" itemIds={["infusion-rph-b-2"]}>
                          <div className="subsection-header">
                            <FileText size={20} />
                            <h3>Step 8: Type Pump Sheet</h3>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Verify Pump Sheet */}
                        <SubsectionCard id="infusion-rph-b-step-9" itemIds={["infusion-rph-b-3"]}>
                          <div className="subsection-header">
                            <FileCheck size={20} />
                            <h3>Step 9: Verify Pump Sheet</h3>
                          </div>
                          <ClickableItem id="infusion-rph-b-3">
                            <div className="checklist-item">
                              <strong>Verify pump sheet Rx and add annotation</strong>
                              <ul>
                                <li>[Pump Sheet] Double checked by –, RPh</li>
                              </ul>
                            </div>
                          </ClickableItem>
                        </SubsectionCard>

                        {/* Subsection Card 4: Calculate Pump Rate */}
                        <SubsectionCard id="infusion-rph-b-step-10" itemIds={["infusion-rph-b-4"]}>
                          <div className="subsection-header">
                            <Calculator size={20} />
                            <h3>Step 10: Calculate Pump Rate</h3>
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
                        </SubsectionCard>

                        {/* Subsection Card 5: Add Final Note */}
                        <SubsectionCard id="infusion-rph-b-step-11" itemIds={["infusion-rph-b-5"]}>
                          <div className="subsection-header">
                            <FileSignature size={20} />
                            <h3>Step 11: Add Final Note</h3>
                          </div>
                          <ClickableItem id="infusion-rph-b-5">
                            <div className="checklist-item">
                              <strong>Add adherence intervention note</strong>
                              <ul>
                                <li>[Pump sheet] Double checked pump sheet (SPECIFY CHANGES), Rx verified, forwarded pump sheet and new Rx to Nursing Homecare and CSR Team.</li>
                              </ul>
                            </div>
                          </ClickableItem>
                        </SubsectionCard>

                        {/* Subsection Card 6: Email to Nursing */}
                        <SubsectionCard id="infusion-rph-b-step-12" itemIds={["infusion-rph-b-6", "infusion-rph-b-email"]}>
                          <div className="subsection-header">
                            <Send size={20} />
                            <h3>Step 12: Email to Nursing</h3>
                          </div>
                          <ClickableItem id="infusion-rph-b-6" enableContextMenu={true} emailType="infusion-nursing">
                            <div className="checklist-item">
                              <strong>Make sure of the following and email new Rx and pump sheet</strong>
                              <ul>
                                <li>Email to Nursing homecare and cc: RPh & CSR Teams</li>
                                <li>Update subject line (specify changes)</li>
                                <li>Attach PDF of pump sheet and new Rx</li>
                                <li>Add your signature</li>
                              </ul>
                              <div className="context-menu-hint">Right-click to create email</div>
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
                        </SubsectionCard>

                        {/* Subsection Card 7: Clear Tracker */}
                        <SubsectionCard id="infusion-rph-b-step-13" itemIds={["infusion-rph-b-7"]}>
                          <div className="subsection-header">
                            <Archive size={20} />
                            <h3>Step 13: Clear Tracker</h3>
                          </div>
                          <ClickableItem id="infusion-rph-b-7">
                            <div className="checklist-item">
                              <strong>Clear patient line from pump tracker (Tab#3 - Infusion Changes)</strong>
                              <ul>
                                <li>Since done with creating, verifying, and sending pump sheet & nursing orders to Nursing Homecare, can clear patient line from pump tracker.</li>
                              </ul>
                            </div>
                          </ClickableItem>
                        </SubsectionCard>
                      </div>
                    </div>
              </div>
            )}
          </div>

          {/* Maintenance or Malfunction Section */}
          <div className="workflow-section-compact">
            <div 
              className="workflow-card-compact maintenance-card"
              onClick={() => toggleSection('maintenance')}
            >
              <div className="workflow-card-icon" style={{ background: '#e5e7eb', color: '#6b7280' }}>
                <Settings size={24} />
              </div>
              <div className="workflow-card-content">
                <h3>Maintenance or Malfunction</h3>
                <p>Pump needed • Holly initiated • No Rx changes</p>
              </div>
              <div className="workflow-card-toggle">
                {expandedSections.maintenance ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {expandedSections.maintenance && (
              <div className="workflow-expansion">
                    <div className="quick-info">
                      <div className="info-badge">
                        <FileCheck size={16} />
                        <span>Pump sheet for "Maintenance or Malfunction" (no changes)</span>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh A</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Check HHN Status */}
                        <SubsectionCard id="maintenance-step-1" itemIds={["maintenance-check-hhn"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 2: Update Tracker */}
                        <SubsectionCard id="maintenance-step-2" itemIds={["maintenance-1"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Create Pump Sheet */}
                        <SubsectionCard id="maintenance-step-3" itemIds={["maintenance-2", "maintenance-email-1"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 4: Email Pump Sheet */}
                        <SubsectionCard id="maintenance-step-4" itemIds={["maintenance-3", "maintenance-email-2"]}>
                          <div className="subsection-header">
                            <Send size={20} />
                            <h3>Step 4: Email Pump Sheet</h3>
                          </div>
                          <ClickableItem id="maintenance-3" enableContextMenu={true} emailType="maintenance">
                            <div className="checklist-item">
                              <strong>3) Make sure of the following and email pump sheet</strong>
                              <ul>
                                <li>Email to SPRx & Tech Team (cc Pump Sheets)</li>
                                <li>Update subject line & STAO date</li>
                                <li>Attach word document of pump sheet</li>
                                <li>Add your signature</li>
                              </ul>
                              <div className="context-menu-hint">Right-click to create email</div>
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
                        </SubsectionCard>

                        {/* Subsection Card 5: Add Intervention Note */}
                        <SubsectionCard id="maintenance-step-5" itemIds={["maintenance-4"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 6: Archive Email */}
                        <SubsectionCard id="maintenance-step-6" itemIds={["maintenance-5"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 7: Update Pump Tracker */}
                        <SubsectionCard id="maintenance-step-7" itemIds={["maintenance-6"]}>
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
                        </SubsectionCard>
                      </div>
                    </div>

                    <div className="rph-section">
                      <div className="subsection-header rph-title">
                        <UserCheck size={20} />
                        <h3>RPh B</h3>
                      </div>
                      
                      <div className="subsections-grid">
                        {/* Subsection Card 1: Type Pump Sheet */}
                        <SubsectionCard id="maintenance-rph-b-step-8" itemIds={["maintenance-7"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 2: Verify Pump Sheet */}
                        <SubsectionCard id="maintenance-rph-b-step-9" itemIds={["maintenance-8"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 3: Send to Holly */}
                        <SubsectionCard id="maintenance-rph-b-step-10" itemIds={["maintenance-9", "maintenance-email-3"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 4: Add Final Note */}
                        <SubsectionCard id="maintenance-rph-b-step-11" itemIds={["maintenance-10"]}>
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
                        </SubsectionCard>

                        {/* Subsection Card 5: Clear Tracker */}
                        <SubsectionCard id="maintenance-rph-b-step-12" itemIds={["maintenance-11"]}>
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
                        </SubsectionCard>
                      </div>
                    </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="workflow-context-menu"
          style={{ 
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
        >
          <button onClick={() => createEmail(contextMenu.emailType)} className="context-menu-item">
            <Mail size={16} />
            <span>Create Email</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default Workflow;