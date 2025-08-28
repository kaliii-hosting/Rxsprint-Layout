import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, 
  Activity,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Pill,
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
  ArrowRight,
  Plus,
  PlusCircle,
  ArrowLeft,
  FileDown,
  Square,
  CheckSquare
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { WorkflowStorageManager } from '../../utils/workflowFirebaseStorage';
import authService from '../../services/authService';
import './Workflow.css';
import EnterpriseHeader, { TabGroup, TabButton, ActionGroup, ActionButton } from '../../components/EnterpriseHeader/EnterpriseHeader';
import { exportWorkflowToPDF } from './ExportPDFEnhanced';
import { exportWorkflowToPDFWithScreenshots } from './ExportPDFWithScreenshot';
import { exportWorkflowToPDFReliable } from './ExportPDFReliable';
import { exportWorkflowToPDFProfessional } from './ExportPDFProfessional';

const Workflow = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('lyso'); // lyso, hae, scd
  const [completedItems, setCompletedItems] = useState(new Set());
  const [completedCards, setCompletedCards] = useState(new Set());
  const [expandedSections, setExpandedSections] = useState({});
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: 'email', emailType: 'default', targetId: null, targetType: null });
  const [workflowData, setWorkflowData] = useState({
    lyso: {
      sections: []
    },
    hae: {
      sections: []
    },
    scd: {
      sections: []
    }
  });
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showAddSubsectionModal, setShowAddSubsectionModal] = useState(false);
  const [showEditSectionModal, setShowEditSectionModal] = useState(false);
  const [showEditSubsectionModal, setShowEditSubsectionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState('');
  const [deleteConfirmResolve, setDeleteConfirmResolve] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubsection, setSelectedSubsection] = useState(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [newSubsectionTitle, setNewSubsectionTitle] = useState('');
  const [newSubsectionContent, setNewSubsectionContent] = useState('');
  const [newSubsectionScreenshots, setNewSubsectionScreenshots] = useState([]);
  const [newSubsectionTables, setNewSubsectionTables] = useState([]);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  const [editSectionDescription, setEditSectionDescription] = useState('');
  const [editSubsectionTitle, setEditSubsectionTitle] = useState('');
  const [editSubsectionContent, setEditSubsectionContent] = useState('');
  const [editSubsectionScreenshots, setEditSubsectionScreenshots] = useState([]);
  const [editSubsectionTables, setEditSubsectionTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExportSelection, setShowExportSelection] = useState(false);
  const [selectedSectionsForExport, setSelectedSectionsForExport] = useState(new Set());
  const [exportingPDF, setExportingPDF] = useState(false);
  const [resizingImage, setResizingImage] = useState(null);
  const [imageResizeStart, setImageResizeStart] = useState({ width: 0, x: 0 });
  const [subsectionWidths, setSubsectionWidths] = useState({});
  const [isResizing, setIsResizing] = useState(false); // Flag to prevent tab switching during resize
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const saveTimeoutRef = useRef(null);
  const workflowDataRef = useRef(workflowData);
  const hasUnsavedChanges = useRef(false);
  const [storageManager, setStorageManager] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize authentication and storage manager for admin user
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing admin authentication for workflow...');
        const user = await authService.initialize();
        if (user && user.uid === 'tdGILcyLbSOAUIjsoA93QGaj7Zm2') {
          console.log('Admin authenticated successfully');
          setStorageManager(new WorkflowStorageManager(user.uid));
          setAuthInitialized(true);
        } else if (user) {
          console.log('User authenticated with ID:', user.uid);
          setStorageManager(new WorkflowStorageManager(user.uid));
          setAuthInitialized(true);
        } else {
          // Use admin UID directly since there's only one user
          console.log('Using admin storage configuration');
          setStorageManager(new WorkflowStorageManager('tdGILcyLbSOAUIjsoA93QGaj7Zm2'));
          setAuthInitialized(true);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        // Always use admin UID on error since it's the only user
        setStorageManager(new WorkflowStorageManager('tdGILcyLbSOAUIjsoA93QGaj7Zm2'));
        setAuthInitialized(true);
      }
    };
    
    initAuth();
  }, []);

  // Update ref when workflowData changes
  useEffect(() => {
    workflowDataRef.current = workflowData;
  }, [workflowData]);

  // Auto-save functionality with debouncing - Firebase Storage only
  const autoSave = useCallback(async () => {
    if (!hasUnsavedChanges.current || !storageManager) return;
    
    setSaveStatus('saving');
    try {
      const dataToSave = {
        lyso: workflowDataRef.current.lyso || { sections: [] },
        hae: workflowDataRef.current.hae || { sections: [] },
        scd: workflowDataRef.current.scd || { sections: [] }
      };
      
      // Save to Firebase Storage only
      const result = await storageManager.syncWorkflowData(dataToSave);
      console.log(`Auto-save successful to Firebase Storage: ${(result.size / 1024).toFixed(1)}KB`);
      
      setSaveStatus('saved');
      setLastSaveTime(new Date());
      hasUnsavedChanges.current = false;
      
    } catch (error) {
      console.error('Auto-save to Firebase Storage failed:', error);
      setSaveStatus('error');
      alert('Failed to save to Firebase Storage. Please check your internet connection.');
    }
  }, [storageManager]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    hasUnsavedChanges.current = true;
    setSaveStatus('pending');
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout for 2 seconds
    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  }, [autoSave]);

  // Watch for changes in workflowData and trigger auto-save
  useEffect(() => {
    // Skip initial mount
    if (loading) return;
    
    // Trigger auto-save when data changes
    triggerAutoSave();
  }, [workflowData, triggerAutoSave, loading]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges.current) {
        // Force save attempt
        autoSave();
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Clean up timeout on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [autoSave]);

  // Periodic auto-save every 30 seconds if there are changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges.current) {
        autoSave();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoSave]);

  // Load workflow data from Firebase after authentication
  useEffect(() => {
    if (authInitialized && storageManager) {
      loadWorkflowData();
    }
  }, [authInitialized, storageManager]);

  // Load workflow data from Firebase Storage only
  const loadWorkflowData = async () => {
    if (!storageManager) {
      console.log('Storage manager not initialized yet');
      return;
    }
    
    try {
      setLoading(true);
      
      // Load from Firebase Storage
      const data = await storageManager.loadWorkflowData();
      
      if (data) {
        // Load subsection widths
        const widths = {};
        Object.values(data).forEach(tabData => {
          if (tabData.sections) {
            tabData.sections.forEach(section => {
              if (section.subsections) {
                section.subsections.forEach(sub => {
                  if (sub.customWidth) {
                    widths[sub.id] = sub.customWidth;
                  }
                });
              }
            });
          }
        });
        setSubsectionWidths(widths);
        
        // Use saved data directly for all tabs
        const mergedData = {
          lyso: data.lyso || { sections: getDefaultLysoSections() },
          hae: data.hae || { sections: [] },
          scd: data.scd || { sections: [] }
        };
        
        setWorkflowData(mergedData);
      } else {
        // First time user - save defaults to Firebase Storage
        const defaultData = {
          lyso: { sections: getDefaultLysoSections() },
          hae: { sections: [] },
          scd: { sections: [] }
        };
        
        await storageManager.syncWorkflowData(defaultData);
        setWorkflowData(defaultData);
      }
    } catch (error) {
      console.error('Error loading workflow data from Firebase Storage:', error);
      alert('Failed to load data from Firebase Storage. Please check your internet connection.');
      
      // Load default data structure for new users
      const defaultData = {
        lyso: { sections: getDefaultLysoSections() },
        hae: { sections: [] },
        scd: { sections: [] }
      };
      setWorkflowData(defaultData);
    } finally {
      setLoading(false);
    }
  };

  // Get default Lyso sections (existing workflow content)
  const getDefaultLysoSections = () => {
    return [
      {
        id: 'scenarioOverview',
        title: 'Scenario Overview',
        cardTitle: 'Scenario Overview',
        cardDescription: 'Click to view decision matrix',
        icon: 'Activity',
        iconBg: null,
        iconColor: null,
        type: 'compact',
        content: {
          type: 'decision-table',
          data: {
            headers: ['SCENARIO', 'Shipping pump', 'Send New Rx to Nursing Homecare'],
            rows: [
              ['New Rx with no changes', 'No', 'Yes (cc: RPh team)'],
              ['Sig or Dose Changes only', 'No', 'Yes (cc: RPh team)'],
              ['Changes to infusion rates, total volume, or total time', 'Yes', 'Yes (cc: RPh team)'],
              ['Maintenance or Malfunction', 'Yes', 'No']
            ]
          }
        }
      },
      {
        id: 'newRxNoChanges',
        title: 'New Rx with No Changes',
        cardTitle: 'New Rx with No Changes',
        cardDescription: 'No pump needed • Email to Nursing Homecare',
        icon: 'FileText',
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        type: 'compact',
        subsections: [
              {
                id: 'new-rx-step-1',
                title: 'Step 1: Check HHN Status',
                icon: 'CircleDot',
                itemIds: ['new-rx-check-hhn'],
                items: [
                  {
                    id: 'new-rx-check-hhn',
                    text: 'Check for HHN status in priority comments:',
                    checklist: ['If not stated, investigate then update priority comments to either "No HHN" or "HHN"']
                  }
                ]
              },
              {
                id: 'new-rx-step-2',
                title: 'Step 2: Verify and Send',
                icon: 'FileCheck',
                itemIds: ['new-rx-1'],
                items: [
                  {
                    id: 'new-rx-1',
                    text: 'If new Rx has no changes:',
                    checklist: [
                      'Verify Rx, clean profile, and email new Rx to Nursing Homecare (cc: RPh Team)',
                      'Not shipping pump (Holly Tucker is not involved since not shipping a new pump.)'
                    ]
                  }
                ]
              },
              {
                id: 'new-rx-step-3',
                title: 'Step 3: Add Intervention Note',
                icon: 'FileSignature',
                itemIds: ['new-rx-2'],
                items: [
                  {
                    id: 'new-rx-2',
                    text: 'Add prescription management intervention note',
                    checklist: ['Verified Rx (with HHN; no changes); sent new Rx to Nursing Homecare (cc: RPh Team)']
                  }
                ]
              }
            ]
      },
      {
        id: 'sigDoseChanges',
        title: 'Sig or Dose Changes Only',
        cardTitle: 'Sig or Dose Changes Only',
        cardDescription: 'No pump needed • Create pump sheet',
        icon: 'Pill',
        iconBg: '#dbeafe',
        iconColor: '#2563eb',
        type: 'compact',
        subsections: [
              {
                id: 'sig-dose-step-1',
                title: 'Step 1: Check HHN Status',
                icon: 'CircleDot',
                itemIds: ['sig-dose-check-hhn'],
                items: [
                  {
                    id: 'sig-dose-check-hhn',
                    text: 'Check for HHN status in priority comments:',
                    checklist: ['If not stated, investigate then update priority comments to either "No HHN" or "HHN"']
                  }
                ]
              },
              {
                id: 'sig-dose-step-2',
                title: 'Step 2: Create Pump Sheet',
                icon: 'FileText',
                itemIds: ['sig-dose-1'],
                items: [
                  {
                    id: 'sig-dose-1',
                    text: 'If new Rx has changes to sig or dose only, create new pump sheet',
                    checklist: [
                      'Verify Rx, clean profile, then create new pump sheet',
                      'Not shipping pump (Holly Tucker is not involved since not shipping a new pump.)'
                    ]
                  }
                ]
              },
              {
                id: 'sig-dose-step-3',
                title: 'Step 3: Email to SPRx',
                icon: 'Send',
                itemIds: ['sig-dose-2', 'sig-dose-email-1'],
                items: [
                  {
                    id: 'sig-dose-2',
                    text: 'Make sure of the following and email new Rx and pump sheet',
                    checklist: ['Email to SPRx and cc: Pump Sheets'],
                    enableContextMenu: true,
                    emailType: 'nursing'
                  }
                ]
              }
            ]
      },
      {
        id: 'infusionChanges',
        title: 'Infusion Changes',
        cardTitle: 'Changes to Infusion',
        cardDescription: 'Rate, volume, or time changes • Ship pump',
        icon: 'Settings',
        iconBg: '#f0fdf4',
        iconColor: '#16a34a',
        type: 'compact',
        subsections: [
              {
                id: 'infusion-step-1',
                title: 'Step 1: Create Pump Sheet',
                icon: 'FileText',
                itemIds: ['infusion-1'],
                items: [
                  {
                    id: 'infusion-1',
                    text: 'Create new pump sheet with updated infusion parameters',
                    checklist: ['Update rates, volumes, and times as prescribed']
                  }
                ]
              },
              {
                id: 'infusion-step-2',
                title: 'Step 2: Email to Multiple Teams',
                icon: 'Send',
                itemIds: ['infusion-2'],
                items: [
                  {
                    id: 'infusion-2',
                    text: 'Email pump sheet to all required teams',
                    checklist: [
                      'SPRx & Tech Team',
                      'Holly Tucker for pump scheduling',
                      'Nursing Homecare (cc: RPh team)'
                    ],
                    enableContextMenu: true,
                    emailType: 'infusion'
                  }
                ]
              }
            ]
      },
      {
        id: 'maintenance',
        title: 'Maintenance/Malfunction',
        cardTitle: 'Maintenance or Malfunction',
        cardDescription: 'Regular maintenance • Ship pump',
        icon: 'Settings',
        iconBg: '#fef3c7',
        iconColor: '#d97706',
        type: 'compact',
        subsections: [
              {
                id: 'maintenance-step-1',
                title: 'Step 1: Check SPRx',
                icon: 'ClipboardCheck',
                itemIds: ['maintenance-0'],
                items: [
                  {
                    id: 'maintenance-0',
                    text: 'Check if pump settings and maintenance orders match'
                  }
                ]
              },
              {
                id: 'maintenance-step-2',
                title: 'Step 2: Update Tracker',
                icon: 'RefreshCcw',
                itemIds: ['maintenance-1'],
                items: [
                  {
                    id: 'maintenance-1',
                    text: 'Update pump tracker (Tab#1 - Main Page)',
                    checklist: ['Copy and paste sig onto pump sheet from drug Rx in SPRx']
                  }
                ]
              },
              {
                id: 'maintenance-step-3',
                title: 'Step 3: Create Pump Sheet',
                icon: 'FolderOpen',
                itemIds: ['maintenance-2', 'maintenance-email-1'],
                items: [
                  {
                    id: 'maintenance-2',
                    text: 'Create pump sheet'
                  },
                  {
                    id: 'maintenance-email-1',
                    type: 'email-template',
                    header: {
                      icon: 'Info',
                      title: 'Example Pump Sheet'
                    },
                    content: `SPECIALTY PHARMACY
PUMP CURLIN 6000CMB SHEET
Pump settings: Variable

Patient Information | Value
DOB | 
Drug Name: fep
Remove: jjjj from Normal Saline IV bag (drug & bag overwt volume)`
                  }
                ]
              },
              {
                id: 'maintenance-step-4',
                title: 'Step 4: Email Pump Sheet',
                icon: 'Send',
                itemIds: ['maintenance-3', 'maintenance-email-2'],
                items: [
                  {
                    id: 'maintenance-3',
                    text: 'Make sure of the following and email pump sheet',
                    checklist: [
                      'Email to SPRx & Tech Team (cc Pump Sheets)',
                      'Update subject line & STAO date',
                      'Attach word document of pump sheet',
                      'Add your signature'
                    ],
                    enableContextMenu: true,
                    emailType: 'maintenance'
                  },
                  {
                    id: 'maintenance-email-2',
                    type: 'email',
                    to: '8553658111@fax.cvhealth.com @ HAE Lyse Pharmacy Technician Team',
                    cc: 'Pump Sheets (HAE/LSD)',
                    subject: 'C08 - SPRX ACCOUNT# - PT\'S LAST NAME, PT\'S FIRST NAME - HIZENACAINE 1500 MG - PUMP MAINTENANCE SHEET - NO CHANGES',
                    body: `ATTENTION INTAKE TEAM

This Specialty Patient Requires Pump Maintenance

See attached pump sheet for details.`
                  }
                ]
              }
            ]
      }
    ];
  };

  // Save workflow data to Firebase Storage only
  const saveWorkflowData = async (data) => {
    if (!storageManager) {
      console.error('Storage manager not initialized');
      return;
    }
    
    try {
      let fullData;
      
      // Check if data is just sections array or full workflow data
      if (Array.isArray(data)) {
        // If it's just sections, construct the full data object
        fullData = {
          ...workflowData,
          [activeTab]: {
            sections: data
          }
        };
      } else if (data && typeof data === 'object' && ('lyso' in data || 'hae' in data || 'scd' in data)) {
        // If it's already the full workflow data
        fullData = data;
      } else {
        // Handle unexpected format
        console.error('Invalid data format for saveWorkflowData:', data);
        setSaveStatus('error');
        return;
      }
      
      // Update local state immediately for responsive UI
      setWorkflowData(fullData);
      
      // Always save immediately to Firebase Storage
      setSaveStatus('saving');
      const dataToSave = {
        lyso: fullData.lyso || { sections: [] },
        hae: fullData.hae || { sections: [] },
        scd: fullData.scd || { sections: [] }
      };
      
      // Save to Firebase Storage
      const result = await storageManager.syncWorkflowData(dataToSave);
      console.log(`Save successful to Firebase Storage: ${(result.size / 1024).toFixed(1)}KB`);
      
      setSaveStatus('saved');
      setLastSaveTime(new Date());
      hasUnsavedChanges.current = false;
    } catch (error) {
      console.error('Error saving workflow data:', error);
      setSaveStatus('error');
      
      // Show user-friendly error message
      alert('Failed to save to Firebase Storage. Please check your internet connection and try again.');
    }
  };

  // Add new section
  const addSection = async () => {
    if (!newSectionTitle.trim()) return;
    
    const newSection = {
      id: `section-${Date.now()}`,
      title: newSectionTitle,
      cardTitle: newSectionTitle,
      cardDescription: newSectionDescription || 'Click to expand',
      icon: 'FileText',
      iconBg: '#f3f4f6',
      iconColor: '#6b7280',
      type: 'compact',
      subsections: []
    };

    const updatedData = {
      ...workflowData,
      [activeTab]: {
        ...workflowData[activeTab],
        sections: [...workflowData[activeTab].sections, newSection]
      }
    };

    await saveWorkflowData(updatedData);
    setNewSectionTitle('');
    setNewSectionDescription('');
    setShowAddSectionModal(false);
  };

  // Add new subsection
  const addSubsection = async () => {
    if (!selectedSection) {
      alert('Please select a section first');
      return;
    }
    
    if (!newSubsectionTitle || !newSubsectionTitle.trim()) {
      alert('Please enter a subsection title');
      return;
    }

    const timestamp = Date.now();
    const itemId = `item-${timestamp}`;
    
    const newSubsection = {
      id: `subsection-${timestamp}`,
      title: newSubsectionTitle.trim(),
      icon: 'FileText',
      itemIds: [itemId],
      items: [
        {
          id: itemId,
          text: newSubsectionContent?.trim() || newSubsectionTitle.trim(),
          checklist: [],
          screenshots: newSubsectionScreenshots,
          tables: newSubsectionTables
        }
      ]
    };

    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === selectedSection) {
        // Initialize subsections if it doesn't exist
        const currentSubsections = section.subsections || [];
        
        return {
          ...section,
          subsections: [...currentSubsections, newSubsection]
        };
      }
      return section;
    });

    const updatedData = {
      ...workflowData,
      [activeTab]: {
        ...workflowData[activeTab],
        sections: updatedSections
      }
    };
    
    try {
      await saveWorkflowData(updatedData);
      
      // Clear form and close modal
      setNewSubsectionTitle('');
      setNewSubsectionContent('');
      setNewSubsectionScreenshots([]);
      setNewSubsectionTables([]);
      setSelectedSection(null);
      setShowAddSubsectionModal(false);
    } catch (error) {
      console.error('Error saving subsection:', error);
      alert('Failed to save subsection. Please try again.');
    }
  };

  // Delete section
  const deleteSection = async (sectionId) => {
    // Don't allow deleting default sections
    const defaultSectionIds = ['scenarioOverview', 'newRxNoChanges', 'sigDoseChanges', 'infusionChanges', 'maintenance'];
    if (defaultSectionIds.includes(sectionId)) {
      alert('Cannot delete default sections');
      return;
    }

    // Show styled confirmation modal
    const confirmed = await showDeleteConfirmation('section');
    if (confirmed) {
      const updatedSections = workflowData[activeTab].sections.filter(s => s.id !== sectionId);
      const updatedData = {
        ...workflowData,
        [activeTab]: {
          ...workflowData[activeTab],
          sections: updatedSections
        }
      };
      await saveWorkflowData(updatedData);
    }
  };

  // Delete subsection
  const deleteSubsection = async (sectionId, subsectionId) => {
    // Show styled confirmation modal
    const confirmed = await showDeleteConfirmation('subsection');
    if (confirmed) {
      const updatedSections = workflowData[activeTab].sections.map(section => {
        if (section.id === sectionId && section.subsections) {
          return {
            ...section,
            subsections: section.subsections.filter(sub => sub.id !== subsectionId)
          };
        }
        return section;
      });

      const updatedData = {
        ...workflowData,
        [activeTab]: {
          ...workflowData[activeTab],
          sections: updatedSections
        }
      };
      await saveWorkflowData(updatedData);
    }
  };

  // Edit section
  const editSection = async () => {
    if (!selectedSection || !editSectionTitle.trim()) return;

    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === selectedSection) {
        return {
          ...section,
          title: editSectionTitle,
          cardTitle: editSectionTitle,
          description: editSectionDescription,
          cardDescription: editSectionDescription || section.cardDescription
        };
      }
      return section;
    });

    const updatedData = {
      ...workflowData,
      [activeTab]: {
        ...workflowData[activeTab],
        sections: updatedSections
      }
    };

    await saveWorkflowData(updatedData);
    setEditSectionTitle('');
    setEditSectionDescription('');
    setSelectedSection(null);
    setShowEditSectionModal(false);
  };

  // Edit subsection
  const editSubsection = async () => {
    if (!selectedSection || !selectedSubsection || !editSubsectionTitle.trim()) return;

    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === selectedSection && section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(sub => {
            if (sub.id === selectedSubsection) {
              return {
                ...sub,
                title: editSubsectionTitle,
                items: sub.items.map((item, idx) => {
                  if (idx === 0) {
                    return {
                      ...item,
                      text: editSubsectionContent || editSubsectionTitle,
                      screenshots: editSubsectionScreenshots,
                      tables: editSubsectionTables
                    };
                  }
                  return item;
                })
              };
            }
            return sub;
          })
        };
      }
      return section;
    });

    const updatedData = {
      ...workflowData,
      [activeTab]: {
        ...workflowData[activeTab],
        sections: updatedSections
      }
    };

    await saveWorkflowData(updatedData);
    setEditSubsectionTitle('');
    setEditSubsectionContent('');
    setEditSubsectionScreenshots([]);
    setEditSubsectionTables([]);
    setSelectedSection(null);
    setSelectedSubsection(null);
    setShowEditSubsectionModal(false);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    // Don't toggle if we're in the middle of resizing
    if (isResizing) return;
    
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
    if (e) {
      e.stopPropagation();
    }
    
    setCompletedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });

    // Also toggle all items within the card
    if (itemIds && itemIds.length > 0) {
      setCompletedItems(prev => {
        const newSet = new Set(prev);
        const isCardCompleted = completedCards.has(cardId);
        
        itemIds.forEach(id => {
          if (isCardCompleted) {
            newSet.delete(id);
          } else {
            newSet.add(id);
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

  // Handle right-click context menu for emails
  const handleEmailContextMenu = (e, emailType = 'default') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      type: 'email',
      emailType: emailType,
      targetId: null,
      targetType: null
    });
  };

  // Handle right-click context menu for sections
  const handleSectionContextMenu = (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const section = workflowData[activeTab].sections.find(s => s.id === sectionId);
    if (section) {
      // Check if it's a default section
      const defaultSectionIds = ['scenarioOverview', 'newRxNoChanges', 'sigDoseChanges', 'infusionChanges', 'maintenance'];
      const isDefaultSection = activeTab === 'lyso' && defaultSectionIds.includes(sectionId);
      
      setContextMenu({
        visible: true,
        x: e.pageX,
        y: e.pageY,
        type: 'section',
        targetId: sectionId,
        targetType: 'section',
        isDefaultSection: isDefaultSection,
        emailType: 'default'
      });
    }
  };

  // Handle right-click context menu for subsections
  const handleSubsectionContextMenu = (e, sectionId, subsectionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Find if subsection is marked as 2-column
    const section = workflowData[activeTab].sections.find(s => s.id === sectionId);
    const subsection = section?.subsections?.find(s => s.id === subsectionId);
    
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      type: 'subsection',
      targetId: subsectionId,
      targetType: 'subsection',
      sectionId: sectionId,
      emailType: 'default',
      is2Column: subsection?.is2Column || false
    });
  };

  // Hide context menu
  const hideContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, type: 'email', emailType: 'default', targetId: null, targetType: null });
  };

  // Handle context menu action
  const handleContextMenuAction = async (action) => {
    const { targetId, sectionId, targetType } = contextMenu;
    
    if (action === 'edit') {
      if (targetType === 'section') {
        const section = workflowData[activeTab].sections.find(s => s.id === targetId);
        if (section) {
          setSelectedSection(targetId);
          setEditSectionTitle(section.title);
          setEditSectionDescription(section.description || section.cardDescription || '');
          setShowEditSectionModal(true);
        }
      } else if (targetType === 'subsection') {
        const section = workflowData[activeTab].sections.find(s => s.id === sectionId);
        if (section && section.subsections) {
          const subsection = section.subsections.find(s => s.id === targetId);
          if (subsection) {
            setSelectedSection(sectionId);
            setSelectedSubsection(targetId);
            setEditSubsectionTitle(subsection.title);
            setEditSubsectionContent(subsection.items[0]?.text || '');
            setEditSubsectionScreenshots(subsection.items[0]?.screenshots || []);
            setEditSubsectionTables(subsection.items[0]?.tables || []);
            setShowEditSubsectionModal(true);
          }
        }
      }
    } else if (action === 'delete') {
      if (targetType === 'section') {
        deleteSection(targetId);
      } else if (targetType === 'subsection') {
        deleteSubsection(sectionId, targetId);
      }
    } else if (action === 'add-subsection') {
      if (targetType === 'section') {
        setSelectedSection(targetId);
        setNewSubsectionTitle('');
        setNewSubsectionContent('');
        setShowAddSubsectionModal(true);
      }
    } else if (action === 'toggle-2column') {
      if (targetType === 'subsection') {
        // Toggle 2-column layout for subsection
        const updatedSections = workflowData[activeTab].sections.map(section => {
          if (section.id === sectionId && section.subsections) {
            return {
              ...section,
              subsections: section.subsections.map(sub => {
                if (sub.id === targetId) {
                  return {
                    ...sub,
                    is2Column: !sub.is2Column
                  };
                }
                return sub;
              })
            };
          }
          return section;
        });
        
        await saveWorkflowData(updatedSections);
      }
    } else if (action === 'copy-text') {
      if (targetType === 'subsection') {
        // Copy all text content from subsection
        const section = workflowData[activeTab].sections.find(s => s.id === sectionId);
        const subsection = section?.subsections?.find(s => s.id === targetId);
        
        if (subsection) {
          // Start with title
          let textContent = `${subsection.title}\n\n`;
          
          // Track what we've already added to prevent duplicates
          const processedItems = new Set();
          
          // Process items if they exist
          if (subsection.items && Array.isArray(subsection.items)) {
            subsection.items.forEach((item, index) => {
              // Skip if item is undefined or null
              if (!item) return;
              
              // Create a unique key for this item to prevent duplicates
              const itemKey = JSON.stringify({
                text: item.text || '',
                content: item.content || '',
                type: item.type || '',
                index: index
              });
              
              // Skip if we've already processed this item
              if (processedItems.has(itemKey)) return;
              processedItems.add(itemKey);
              
              // Handle different item structures - only process once
              if (item.text && !item.type) {
                // Standard text item with optional checklist
                textContent += item.text;
                if (item.checklist && Array.isArray(item.checklist)) {
                  item.checklist.forEach(checkItem => {
                    textContent += `\n  • ${checkItem}`;
                  });
                }
                textContent += '\n\n';
              } else if (item.type === 'email' || item.type === 'email-template') {
                // Email template item
                if (item.header && item.header.title) {
                  textContent += `${item.header.title}\n`;
                }
                if (item.to) textContent += `To: ${item.to}\n`;
                if (item.cc) textContent += `Cc: ${item.cc}\n`;
                if (item.subject) textContent += `Subject: ${item.subject}\n`;
                if (item.body) textContent += `Body: ${item.body}\n`;
                if (item.content && !item.body) textContent += `${item.content}\n`;
                textContent += '\n';
              } else if (item.content && !item.text && item.type !== 'email' && item.type !== 'email-template') {
                // Generic content item (only if not already handled)
                textContent += `${item.content}\n\n`;
              }
              
              // Handle screenshots description if exists (only once per item)
              if (item.screenshots && Array.isArray(item.screenshots) && item.screenshots.length > 0) {
                item.screenshots.forEach(screenshot => {
                  if (screenshot.description) {
                    textContent += `[Image: ${screenshot.description}]\n`;
                  }
                });
              }
              
              // Handle tables if exists (only once per item)
              if (item.tables && Array.isArray(item.tables) && item.tables.length > 0) {
                item.tables.forEach(table => {
                  if (table.data) {
                    textContent += '[Table data]\n';
                  }
                });
              }
            });
          }
          
          // Copy to clipboard
          try {
            await navigator.clipboard.writeText(textContent);
            console.log('Text copied to clipboard');
            // Optionally show a success message
          } catch (err) {
            console.error('Failed to copy text:', err);
            // Fallback method for copying
            const textArea = document.createElement('textarea');
            textArea.value = textContent;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              console.log('Text copied using fallback method');
            } catch (err2) {
              console.error('Fallback copy also failed:', err2);
            }
            document.body.removeChild(textArea);
          }
        }
      }
    }
    
    hideContextMenu();
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
      to = '8553658111@fax.cvshealth.com,_haelysopharmacytechnicianteam@cvshealth.com,holly.tucker@cvshealth.com';
      cc = 'pumpsheetshae-lsd@cvshealth.com';
      subject = 'SPOC - ACCT# - NAME - DRUG - PUMP SHEET - (SPECIFY CHANGES)';
      body = 'ATTENTION INTAKE TEAM\nPlease index this as a document type PUMP PROGRAM SHEET [IRC 54915] and Rx.\n\nHI TECH TEAM\nPlease complete RX ENTRY for attached pump sheet STAO .\n\nHI HOLLY\nPlease schedule pump order.\n\nNO NEED TO RESPOND TO THIS EMAIL';
    } else if (emailType === 'maintenance') {
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

  // Collapse all sections
  const collapseAll = () => {
    setExpandedSections({});
  };

  // Expand all sections
  const expandAll = () => {
    const allSections = {};
    workflowData[activeTab].sections.forEach(section => {
      allSections[section.id] = true;
    });
    setExpandedSections(allSections);
  };

  // Reset all completions
  const resetCompletions = () => {
    setCompletedItems(new Set());
    setCompletedCards(new Set());
  };
  
  // Show delete confirmation modal
  const showDeleteConfirmation = (type) => {
    return new Promise((resolve) => {
      setDeleteModalType(type);
      setShowDeleteModal(true);
      setDeleteConfirmResolve(() => resolve);
    });
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deleteConfirmResolve) {
      deleteConfirmResolve(true);
    }
    setShowDeleteModal(false);
    setDeleteModalType('');
    setDeleteConfirmResolve(null);
  };
  
  // Handle delete cancel
  const handleDeleteCancel = () => {
    if (deleteConfirmResolve) {
      deleteConfirmResolve(false);
    }
    setShowDeleteModal(false);
    setDeleteModalType('');
    setDeleteConfirmResolve(null);
  };

  // Parse OneNote HTML content to extract mixed content (text, images, tables)
  const parseOneNoteContent = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const mixedContent = [];
    let textBuffer = '';
    
    // Process all elements in order
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          textBuffer += text + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // Handle line breaks and paragraphs
        if (tagName === 'br' || tagName === 'p' || tagName === 'div') {
          if (textBuffer.trim()) {
            textBuffer += '\n';
          }
        }
        
        // Handle images
        if (tagName === 'img') {
          // Save any accumulated text first
          if (textBuffer.trim()) {
            mixedContent.push({ type: 'text', content: textBuffer.trim() });
            textBuffer = '';
          }
          
          const src = node.src;
          if (src) {
            mixedContent.push({
              type: 'image',
              src: src,
              width: node.width || 400,
              alt: node.alt || ''
            });
          }
        }
        
        // Handle tables
        else if (tagName === 'table') {
          // Save any accumulated text first
          if (textBuffer.trim()) {
            mixedContent.push({ type: 'text', content: textBuffer.trim() });
            textBuffer = '';
          }
          
          // Keep the entire table HTML
          mixedContent.push({
            type: 'table',
            html: node.outerHTML
          });
        }
        
        // Process children for other elements
        else if (tagName !== 'script' && tagName !== 'style') {
          for (const child of node.childNodes) {
            processNode(child);
          }
        }
      }
    };
    
    // Process the body content
    const body = doc.body;
    if (body) {
      for (const child of body.childNodes) {
        processNode(child);
      }
    }
    
    // Add any remaining text
    if (textBuffer.trim()) {
      mixedContent.push({ type: 'text', content: textBuffer.trim() });
    }
    
    return mixedContent;
  };

  // Handle paste event for modal textareas (Add/Edit Subsection)
  const handleModalPaste = async (e, isEdit = false) => {
    try {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;
      
      // First, try to get HTML data (OneNote content)
      const htmlData = clipboardData.getData('text/html');
      if (htmlData) {
        e.preventDefault();
        console.log('Processing OneNote/HTML content...');
        
        // Parse the HTML content
        const mixedContent = parseOneNoteContent(htmlData);
        
        // Process each content piece
        let combinedText = '';
        const screenshots = [];
        const tables = [];
        
        for (const item of mixedContent) {
          if (item.type === 'text') {
            combinedText += item.content + '\n\n';
          } else if (item.type === 'image') {
            // Handle embedded images from OneNote
            const timestamp = Date.now() + Math.random();
            
            // Check if it's a base64 image or external URL
            if (item.src.startsWith('data:image')) {
              screenshots.push({
                id: `screenshot-${timestamp}`,
                data: item.src,
                width: item.width || 400,
                timestamp: timestamp
              });
            } else {
              // For external images, try to fetch and convert to base64
              try {
                const response = await fetch(item.src);
                const blob = await response.blob();
                const reader = new FileReader();
                
                reader.onload = () => {
                  screenshots.push({
                    id: `screenshot-${timestamp}`,
                    data: reader.result,
                    width: item.width || 400,
                    timestamp: timestamp
                  });
                  
                  // Update screenshots state
                  setTimeout(() => {
                    if (isEdit) {
                      setEditSubsectionScreenshots(prev => [...prev, ...screenshots]);
                    } else {
                      setNewSubsectionScreenshots(prev => [...prev, ...screenshots]);
                    }
                  }, 0);
                };
                
                reader.readAsDataURL(blob);
              } catch (fetchError) {
                console.warn('Could not fetch external image:', item.src);
                // Add as reference text if image can't be fetched
                combinedText += `[Image: ${item.alt || item.src}]\n\n`;
              }
            }
          } else if (item.type === 'table') {
            const timestamp = Date.now() + Math.random();
            tables.push({
              id: `table-${timestamp}`,
              html: item.html,
              timestamp: timestamp
            });
          }
        }
        
        // Update all states
        setTimeout(() => {
          // Add text content
          if (combinedText.trim()) {
            if (isEdit) {
              setEditSubsectionContent(prev => prev + (prev ? '\n\n' : '') + combinedText.trim());
            } else {
              setNewSubsectionContent(prev => prev + (prev ? '\n\n' : '') + combinedText.trim());
            }
          }
          
          // Add screenshots that are already base64
          const base64Screenshots = screenshots.filter(s => s.data.startsWith('data:'));
          if (base64Screenshots.length > 0) {
            if (isEdit) {
              setEditSubsectionScreenshots(prev => [...prev, ...base64Screenshots]);
            } else {
              setNewSubsectionScreenshots(prev => [...prev, ...base64Screenshots]);
            }
          }
          
          // Add tables
          if (tables.length > 0) {
            if (isEdit) {
              setEditSubsectionTables(prev => [...prev, ...tables]);
            } else {
              setNewSubsectionTables(prev => [...prev, ...tables]);
            }
          }
        }, 100);
        
        return;
      }
      
      // Fallback: Check for images in clipboard items
      const items = clipboardData.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (!blob) continue;
            
            const reader = new FileReader();
            
            reader.onload = (event) => {
              const imageData = event.target.result;
              const timestamp = Date.now();
              const screenshot = {
                id: `screenshot-${timestamp}`,
                data: imageData,
                width: 400,
                timestamp: timestamp
              };
              
              setTimeout(() => {
                if (isEdit) {
                  setEditSubsectionScreenshots(prev => [...prev, screenshot]);
                } else {
                  setNewSubsectionScreenshots(prev => [...prev, screenshot]);
                }
              }, 0);
            };
            
            reader.onerror = (error) => {
              console.error('Error reading image:', error);
            };
            
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
      
      // If no HTML or images, let regular text paste happen
    } catch (error) {
      console.error('Error handling paste:', error);
      // Let default paste behavior happen if there's an error
    }
  };

  // Handle paste event for subsections
  const handleSubsectionPaste = async (e, sectionId, subsectionId) => {
    e.preventDefault();
    
    const clipboardData = e.clipboardData || window.clipboardData;
    
    // Check for images
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          const imageData = event.target.result;
          await addScreenshotToSubsection(sectionId, subsectionId, imageData);
        };
        
        reader.readAsDataURL(blob);
        return;
      }
    }
    
    // Check for HTML content (tables)
    const htmlData = clipboardData.getData('text/html');
    if (htmlData && htmlData.includes('<table')) {
      await addTableToSubsection(sectionId, subsectionId, htmlData);
      return;
    }
    
    // Regular text paste - let it happen normally
    return true;
  };

  // Add screenshot to subsection
  const addScreenshotToSubsection = async (sectionId, subsectionId, imageData) => {
    const timestamp = Date.now();
    const screenshotId = `screenshot-${timestamp}`;
    
    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === sectionId && section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(sub => {
            if (sub.id === subsectionId) {
              const updatedItems = sub.items.map((item, idx) => {
                if (idx === 0) {
                  const screenshots = item.screenshots || [];
                  return {
                    ...item,
                    screenshots: [...screenshots, {
                      id: screenshotId,
                      data: imageData,
                      width: 400, // Default width
                      timestamp: timestamp
                    }]
                  };
                }
                return item;
              });
              return {
                ...sub,
                items: updatedItems
              };
            }
            return sub;
          })
        };
      }
      return section;
    });

    setWorkflowData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        sections: updatedSections
      }
    }));

    // Save to Firebase
    await saveWorkflowData(updatedSections);
  };

  // Add table to subsection
  const addTableToSubsection = async (sectionId, subsectionId, htmlData) => {
    const timestamp = Date.now();
    const tableId = `table-${timestamp}`;
    
    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === sectionId && section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(sub => {
            if (sub.id === subsectionId) {
              const updatedItems = sub.items.map((item, idx) => {
                if (idx === 0) {
                  const tables = item.tables || [];
                  return {
                    ...item,
                    tables: [...tables, {
                      id: tableId,
                      html: htmlData,
                      timestamp: timestamp
                    }]
                  };
                }
                return item;
              });
              return {
                ...sub,
                items: updatedItems
              };
            }
            return sub;
          })
        };
      }
      return section;
    });

    setWorkflowData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        sections: updatedSections
      }
    }));

    // Save to Firebase
    await saveWorkflowData(updatedSections);
  };

  // Delete screenshot from subsection
  const deleteScreenshot = async (sectionId, subsectionId, screenshotId) => {
    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === sectionId && section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(sub => {
            if (sub.id === subsectionId) {
              const updatedItems = sub.items.map((item, idx) => {
                if (idx === 0 && item.screenshots) {
                  return {
                    ...item,
                    screenshots: item.screenshots.filter(s => s.id !== screenshotId)
                  };
                }
                return item;
              });
              return {
                ...sub,
                items: updatedItems
              };
            }
            return sub;
          })
        };
      }
      return section;
    });

    setWorkflowData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        sections: updatedSections
      }
    }));

    await saveWorkflowData(updatedSections);
  };

  // Delete table from subsection
  const deleteTable = async (sectionId, subsectionId, tableId) => {
    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === sectionId && section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(sub => {
            if (sub.id === subsectionId) {
              const updatedItems = sub.items.map((item, idx) => {
                if (idx === 0 && item.tables) {
                  return {
                    ...item,
                    tables: item.tables.filter(t => t.id !== tableId)
                  };
                }
                return item;
              });
              return {
                ...sub,
                items: updatedItems
              };
            }
            return sub;
          })
        };
      }
      return section;
    });

    setWorkflowData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        sections: updatedSections
      }
    }));

    await saveWorkflowData(updatedSections);
  };

  // Handle image resize
  const handleImageResize = async (sectionId, subsectionId, screenshotId, newWidth) => {
    const updatedSections = workflowData[activeTab].sections.map(section => {
      if (section.id === sectionId && section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map(sub => {
            if (sub.id === subsectionId) {
              const updatedItems = sub.items.map((item, idx) => {
                if (idx === 0 && item.screenshots) {
                  return {
                    ...item,
                    screenshots: item.screenshots.map(s => 
                      s.id === screenshotId ? { ...s, width: newWidth } : s
                    )
                  };
                }
                return item;
              });
              return {
                ...sub,
                items: updatedItems
              };
            }
            return sub;
          })
        };
      }
      return section;
    });

    setWorkflowData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        sections: updatedSections
      }
    }));

    await saveWorkflowData(updatedSections);
  };

  // Toggle section selection for PDF export
  const toggleSectionForExport = (sectionId) => {
    setSelectedSectionsForExport(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Export selected sections to PDF
  const exportSelectedSectionsToPDF = async () => {
    if (selectedSectionsForExport.size === 0) {
      alert('Please select at least one section to export');
      return;
    }

    setExportingPDF(true);
    
    // First, we need to expand the selected sections in the UI
    const sectionsToExpand = Array.from(selectedSectionsForExport);
    const originalExpandedState = { ...expandedSections };
    
    // Expand all selected sections
    const newExpandedState = { ...expandedSections };
    sectionsToExpand.forEach(sectionId => {
      newExpandedState[sectionId] = true;
    });
    setExpandedSections(newExpandedState);
    
    // Wait for UI to update
    setTimeout(async () => {
      try {
        // Use the professional PDF export with footer protection
        await exportWorkflowToPDFProfessional(
          workflowData,
          activeTab,
          selectedSectionsForExport,
          completedItems,
          completedCards,
          expandedSections
        );
        
        // Restore original expansion state
        setExpandedSections(originalExpandedState);
        setExportingPDF(false);
        setShowExportSelection(false);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
        setExpandedSections(originalExpandedState);
        setExportingPDF(false);
      }
    }, 500); // Give time for sections to expand
  };

  // OLD EXPORT FUNCTION - COMMENTED OUT
  /* const oldExportFunction = () => {
      // Create PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // PDF dimensions
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const leftMargin = 15;
      const rightMargin = 15;
      const topMargin = 35;
      const bottomMargin = 30;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      
      let yPosition = topMargin;
      let pageNumber = 1;

      // Load logo image
      const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = logoUrl;

      // Helper function to draw header and footer (matching Notes page exactly)
      const drawHeaderFooter = (pageNum, hasLogo = false) => {
        // Professional light theme header
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Header section with subtle gradient effect
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        
        // Header border line
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.line(0, 25, pageWidth, 25);
        
        // Add logo if available
        if (hasLogo) {
          try {
            const logoWidth = 35;
            const logoHeight = 12;
            pdf.addImage(logoImg, 'PNG', leftMargin, 6, logoWidth, logoHeight);
          } catch (e) {
            console.log('Logo could not be added');
          }
        }
        
        // Header title - centered
        pdf.setFontSize(16);
        pdf.setTextColor(31, 41, 55);
        pdf.setFont('helvetica', 'bold');
        const title = `${activeTab.toUpperCase()} Workflow`;
        pdf.text(title, pageWidth / 2, 15, { align: 'center' });
        
        // Date - right aligned
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        const date = new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        pdf.text(date, pageWidth - leftMargin, 15, { align: 'right' });
        
        // Footer section
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Footer border line
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
        
        // Footer content - page number centered
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        // Footer text - company/copyright info
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        const footerText = 'RxSprint Workflow Management System';
        pdf.text(footerText, leftMargin, pageHeight - 10);
        
        // Export timestamp
        const timestamp = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        pdf.text(`Generated: ${timestamp}`, pageWidth - leftMargin, pageHeight - 10, { align: 'right' });
      };

      // Helper function to check if we need a new page
      const checkNewPage = (requiredSpace) => {
        if (yPosition + requiredSpace > pageHeight - bottomMargin) {
          pdf.addPage();
          pageNumber++;
          drawHeaderFooter(pageNumber, logoLoaded);
          yPosition = topMargin;
          return true;
        }
        return false;
      };

      // Helper function to add wrapped text
      const addWrappedText = (text, x, y, maxWidth, lineHeight = 5) => {
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line, index) => {
          checkNewPage(lineHeight);
          pdf.text(line, x, y + (index * lineHeight));
          yPosition = y + ((index + 1) * lineHeight);
        });
        return yPosition;
      };

      let logoLoaded = false;
      
      // Helper function to convert hex color to RGB
      const hexToRGB = (hex) => {
        if (!hex) return [200, 200, 200];
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16)
        ] : [200, 200, 200];
      };

      // Helper function to draw rounded rectangle with optional fill and stroke
      const drawRoundedRect = (x, y, width, height, radius, fillColor = null, strokeColor = null, lineWidth = 0.5) => {
        if (fillColor) {
          pdf.setFillColor(...fillColor);
        }
        if (strokeColor) {
          pdf.setDrawColor(...strokeColor);
          pdf.setLineWidth(lineWidth);
        }
        pdf.roundedRect(x, y, width, height, radius, radius, fillColor && strokeColor ? 'FD' : (fillColor ? 'F' : 'D'));
      };
      
      // Helper function to add shadow effect (simulated with multiple rectangles)
      const drawShadow = (x, y, width, height, radius) => {
        // Draw shadow layers
        pdf.setDrawColor(0, 0, 0);
        pdf.setGState(new pdf.GState({ opacity: 0.05 }));
        drawRoundedRect(x + 1, y + 1, width, height, radius, null, [0, 0, 0], 0.1);
        drawRoundedRect(x + 2, y + 2, width, height, radius, null, [0, 0, 0], 0.1);
        pdf.setGState(new pdf.GState({ opacity: 1 }));
      };

      // Generate PDF content
      const generatePDFContent = () => {
        // Draw first page header
        drawHeaderFooter(pageNumber, logoLoaded);
        
        // Get selected sections
        const sectionsToExport = workflowData[activeTab].sections.filter(
          section => selectedSectionsForExport.has(section.id)
        );

        // Main background color (light gray like the workflow page)
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 25, pageWidth, pageHeight - 45, 'F');
        
        // Timeline vertical line position
        const timelineX = leftMargin + 3;
        
        // Process each selected section
        sectionsToExport.forEach((section, sectionIndex) => {
          // Add section spacing
          if (sectionIndex > 0) {
            yPosition += 10;
          }
          
          checkNewPage(30);
          
          // Draw continuous timeline line between sections
          if (sectionIndex < sectionsToExport.length - 1) {
            pdf.setDrawColor(219, 234, 254);
            pdf.setLineWidth(3);
            const nextY = yPosition + 30;
            pdf.line(timelineX, yPosition + 15, timelineX, nextY);
          }
          
          // SECTION CARD - Exact replica of workflow-card-compact
          const cardHeight = 24;
          const cardX = leftMargin + 10;
          const cardWidth = contentWidth - 15;
          
          // Card shadow effect
          pdf.setDrawColor(0, 0, 0);
          pdf.setGState(new pdf.GState({ opacity: 0.08 }));
          drawRoundedRect(cardX + 1, yPosition + 1, cardWidth, cardHeight, 3, null, [0, 0, 0], 0);
          pdf.setGState(new pdf.GState({ opacity: 1 }));
          
          // Special background for overview card
          if (section.id === 'scenarioOverview') {
            // Gradient effect for overview card (light green to mint)
            pdf.setFillColor(230, 255, 239);
            drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 3, [230, 255, 239], [243, 156, 18], 2);
          } else {
            // Normal white card background
            pdf.setFillColor(255, 255, 255);
            drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 3, [255, 255, 255], [226, 232, 240], 2);
          }
          
          // Icon container (white rounded square with shadow)
          const iconContainerSize = 12;
          const iconX = cardX + 6;
          const iconY = yPosition + 6;
          
          // Icon shadow
          pdf.setGState(new pdf.GState({ opacity: 0.1 }));
          drawRoundedRect(iconX + 0.5, iconY + 0.5, iconContainerSize, iconContainerSize, 2, [0, 0, 0]);
          pdf.setGState(new pdf.GState({ opacity: 1 }));
          
          // Icon background (white)
          drawRoundedRect(iconX, iconY, iconContainerSize, iconContainerSize, 2, [255, 255, 255], [226, 232, 240], 0.5);
          
          // Colored icon inside
          const iconBgColor = section.iconBg ? hexToRGB(section.iconBg) : null;
          const iconColor = section.iconColor ? hexToRGB(section.iconColor) : [59, 130, 246];
          
          if (iconBgColor) {
            // Draw colored background circle for icon
            pdf.setFillColor(...iconBgColor);
            pdf.circle(iconX + iconContainerSize/2, iconY + iconContainerSize/2, 4, 'F');
          }
          
          // Draw icon symbol
          pdf.setTextColor(...iconColor);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          
          // Use text symbols for icons
          let iconSymbol = '📄';
          if (section.icon === 'Activity') iconSymbol = '⚡';
          else if (section.icon === 'FileText') iconSymbol = '📄';
          else if (section.icon === 'Pill') iconSymbol = '💊';
          else if (section.icon === 'Settings') iconSymbol = '⚙️';
          else if (section.icon === 'AlertCircle') iconSymbol = '⚠️';
          
          pdf.text(iconSymbol, iconX + iconContainerSize/2, iconY + iconContainerSize/2 + 1, { align: 'center' });
          
          // Section title and description
          const textX = iconX + iconContainerSize + 6;
          
          // Title
          pdf.setTextColor(section.id === 'scenarioOverview' ? 51 : 31, section.id === 'scenarioOverview' ? 51 : 41, section.id === 'scenarioOverview' ? 51 : 55);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(section.cardTitle || section.title, textX, yPosition + 10);
          
          // Description
          if (section.cardDescription) {
            pdf.setTextColor(section.id === 'scenarioOverview' ? 51 : 107, section.id === 'scenarioOverview' ? 51 : 114, section.id === 'scenarioOverview' ? 51 : 128);
            pdf.setFontSize(8.5);
            pdf.setFont('helvetica', 'normal');
            const descLines = pdf.splitTextToSize(section.cardDescription, cardWidth - (textX - cardX) - 15);
            if (descLines[0]) {
              pdf.text(descLines[0], textX, yPosition + 16);
            }
          }
          
          // Chevron indicator (expanded state)
          pdf.setTextColor(156, 163, 175);
          pdf.setFontSize(12);
          pdf.text('⌄', cardX + cardWidth - 8, yPosition + 14);
          
          yPosition += cardHeight + 8;
          
          // EXPANSION AREA - Content below the card
          if (section.content?.type === 'decision-table' && section.content.data) {
            checkNewPage(50);
            
            // Expansion area background (subtle white container)
            const expansionX = cardX + 5;
            const expansionWidth = cardWidth - 10;
            
            // Draw expansion container
            drawRoundedRect(expansionX, yPosition, expansionWidth, 2, 2, [255, 255, 255], [226, 232, 240], 0.5);
            yPosition += 8;
            
            const tableData = section.content.data.rows.map(row => row);
            
            autoTable(pdf, {
              head: [section.content.data.headers],
              body: tableData,
              startY: yPosition,
              margin: { left: expansionX + 5, right: rightMargin + 5 },
              styles: {
                fontSize: 8,
                cellPadding: 4,
                lineColor: [226, 232, 240],
                lineWidth: 0.5,
                font: 'helvetica'
              },
              headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
              },
              bodyStyles: {
                textColor: [55, 65, 81]
              },
              alternateRowStyles: {
                fillColor: [248, 250, 252]
              },
              columnStyles: {
                0: { fontStyle: 'bold', fillColor: [241, 245, 249] },
                1: { halign: 'center' },
                2: { halign: 'left' }
              },
              didDrawPage: function(data) {
                yPosition = data.cursor.y + 10;
              }
            });
          }
          
          // SUBSECTIONS - Process subsections with proper expansion area
          if (section.subsections && section.subsections.length > 0) {
            // Expansion container
            const expansionX = cardX;
            const expansionWidth = cardWidth;
            const expansionPadding = 8;
            
            // Draw subtle expansion background
            drawRoundedRect(expansionX, yPosition - 3, expansionWidth, 5, 3, [255, 255, 255], [226, 232, 240], 0.3);
            yPosition += 5;
            
            section.subsections.forEach((subsection, subIndex) => {
              checkNewPage(30);
              
              // SUBSECTION HEADER - matching .subsection-header.rph-title style
              const subHeaderX = expansionX + expansionPadding;
              const subHeaderWidth = expansionWidth - (expansionPadding * 2);
              
              // Subsection title (uppercase, bold, with icon)
              pdf.setTextColor(59, 130, 246);
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'bold');
              
              // Icon for subsection
              const subIcon = subsection.icon === 'CircleDot' ? '◉' :
                             subsection.icon === 'FileCheck' ? '✓' :
                             subsection.icon === 'Send' ? '➤' :
                             subsection.icon === 'FileText' ? '📄' :
                             subsection.icon === 'RefreshCcw' ? '↻' :
                             subsection.icon === 'ClipboardCheck' ? '📋' :
                             subsection.icon === 'FolderOpen' ? '📁' :
                             subsection.icon === 'FileSignature' ? '✎' : '▸';
              
              pdf.text(subIcon + ' ' + subsection.title.toUpperCase(), subHeaderX, yPosition);
              yPosition += 8;
              
              // SUBSECTION CARD - matching .subsection-card style
              const cardStartY = yPosition;
              const cardX = subHeaderX;
              const cardWidth = subHeaderWidth;
              
              // Calculate card height dynamically based on content
              let cardContentHeight = 10; // Base padding
              if (subsection.items) {
                subsection.items.forEach(item => {
                  if (item.type === 'email-template' || item.type === 'email') {
                    cardContentHeight += 45;
                  } else {
                    cardContentHeight += 12;
                    if (item.checklist && item.checklist.length > 0) {
                      cardContentHeight += item.checklist.length * 5;
                    }
                  }
                });
              }
              
              // Check if card is completed
              const isCardCompleted = completedCards.has(subsection.id);
              
              // Draw card with proper styling
              if (isCardCompleted) {
                // COMPLETED CARD - Bright green (#00ff88) with glow effect
                // Glow shadow
                pdf.setGState(new pdf.GState({ opacity: 0.3 }));
                pdf.setDrawColor(0, 255, 136);
                pdf.setLineWidth(4);
                drawRoundedRect(cardX - 1, cardStartY - 1, cardWidth + 2, cardContentHeight + 2, 3, null, [0, 255, 136], 4);
                pdf.setGState(new pdf.GState({ opacity: 1 }));
                
                // Main card
                drawRoundedRect(cardX, cardStartY, cardWidth, cardContentHeight, 3, [0, 255, 136], [0, 255, 136], 3);
                
                // Completion checkmark in top-right
                pdf.setFillColor(0, 0, 0);
                pdf.circle(cardX + cardWidth - 10, cardStartY + 10, 5, 'F');
                pdf.setTextColor(0, 255, 136);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text('✓', cardX + cardWidth - 10, cardStartY + 12, { align: 'center' });
              } else {
                // NORMAL CARD - White with subtle border
                // Card shadow
                pdf.setGState(new pdf.GState({ opacity: 0.05 }));
                drawRoundedRect(cardX + 1, cardStartY + 1, cardWidth, cardContentHeight, 3, [0, 0, 0]);
                pdf.setGState(new pdf.GState({ opacity: 1 }));
                
                // Main card
                drawRoundedRect(cardX, cardStartY, cardWidth, cardContentHeight, 3, [255, 255, 255], [226, 232, 240], 1);
              }
              
              yPosition = cardStartY + 8;
              
              // SUBSECTION ITEMS
              if (subsection.items) {
                subsection.items.forEach(item => {
                  checkNewPage(20);
                  
                  if (item.type === 'email-template' || item.type === 'email') {
                    // EMAIL TEMPLATE - Yellow/amber box design
                    const emailBoxX = cardX + 6;
                    const emailBoxWidth = cardWidth - 12;
                    const emailStartY = yPosition;
                    
                    // Email template header background
                    drawRoundedRect(emailBoxX, yPosition, emailBoxWidth, 10, 2, [254, 243, 199], [251, 191, 36], 0.5);
                    
                    // Email icon and title
                    pdf.setTextColor(isCardCompleted ? 0 : 146, isCardCompleted ? 0 : 64, isCardCompleted ? 0 : 14);
                    pdf.setFontSize(8);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('📧 Email Template', emailBoxX + 4, yPosition + 6);
                    yPosition += 12;
                    
                    if (item.type === 'email') {
                      // Email field styling
                      pdf.setTextColor(isCardCompleted ? 0 : 55, isCardCompleted ? 0 : 65, isCardCompleted ? 0 : 81);
                      pdf.setFontSize(7);
                      
                      if (item.to) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('To:', emailBoxX + 4, yPosition);
                        pdf.setFont('helvetica', 'normal');
                        const toLines = pdf.splitTextToSize(item.to, emailBoxWidth - 20);
                        pdf.text(toLines[0], emailBoxX + 14, yPosition);
                        yPosition += 5;
                      }
                      
                      if (item.cc) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Cc:', emailBoxX + 4, yPosition);
                        pdf.setFont('helvetica', 'normal');
                        const ccLines = pdf.splitTextToSize(item.cc, emailBoxWidth - 20);
                        pdf.text(ccLines[0], emailBoxX + 14, yPosition);
                        yPosition += 5;
                      }
                      
                      if (item.subject) {
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Subject:', emailBoxX + 4, yPosition);
                        pdf.setFont('helvetica', 'normal');
                        const subjectLines = pdf.splitTextToSize(item.subject, emailBoxWidth - 30);
                        pdf.text(subjectLines[0], emailBoxX + 24, yPosition);
                        yPosition += 5;
                      }
                      
                      if (item.body) {
                        yPosition += 2;
                        // Email body box
                        const bodyLines = pdf.splitTextToSize(item.body, emailBoxWidth - 10);
                        const bodyHeight = bodyLines.length * 3.5 + 4;
                        drawRoundedRect(emailBoxX + 2, yPosition, emailBoxWidth - 4, bodyHeight, 1, 
                                      isCardCompleted ? [0, 0, 0, 10] : [255, 251, 235], 
                                      isCardCompleted ? [0, 0, 0] : [251, 191, 36], 0.3);
                        
                        pdf.setTextColor(isCardCompleted ? 0 : 92, isCardCompleted ? 0 : 45, 0);
                        pdf.setFontSize(7);
                        bodyLines.forEach((line, idx) => {
                          pdf.text(line, emailBoxX + 4, yPosition + 3 + (idx * 3.5));
                        });
                        yPosition += bodyHeight + 2;
                      }
                    } else if (item.content) {
                      pdf.setTextColor(isCardCompleted ? 0 : 55, isCardCompleted ? 0 : 65, isCardCompleted ? 0 : 81);
                      pdf.setFontSize(7);
                      pdf.setFont('helvetica', 'normal');
                      const contentLines = pdf.splitTextToSize(item.content, emailBoxWidth - 8);
                      contentLines.forEach((line, idx) => {
                        pdf.text(line, emailBoxX + 4, yPosition + (idx * 3.5));
                      });
                      yPosition += contentLines.length * 3.5;
                    }
                    yPosition += 4;
                    
                  } else {
                    // REGULAR ITEM with checkbox (matching .clickable-item style)
                    const itemX = cardX + 8;
                    const itemPadding = 6;
                    
                    // Checkbox indicator (matching .completion-indicator)
                    const checkboxSize = 5;
                    const isCompleted = completedItems.has(item.id);
                    
                    // Draw circular checkbox
                    if (isCardCompleted && !isCompleted) {
                      // Card completed but item not checked - show black circle
                      pdf.setFillColor(0, 0, 0);
                      pdf.circle(itemX + checkboxSize/2, yPosition - 1, checkboxSize/2, 'F');
                    } else if (isCompleted) {
                      // Item completed - green filled circle with checkmark
                      pdf.setFillColor(16, 185, 129);
                      pdf.circle(itemX + checkboxSize/2, yPosition - 1, checkboxSize/2, 'F');
                      pdf.setTextColor(255, 255, 255);
                      pdf.setFontSize(7);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('✓', itemX + checkboxSize/2, yPosition + 1, { align: 'center' });
                    } else {
                      // Empty circle
                      pdf.setDrawColor(156, 163, 175);
                      pdf.setLineWidth(0.5);
                      pdf.circle(itemX + checkboxSize/2, yPosition - 1, checkboxSize/2, 'D');
                    }
                    
                    // Item text (matching .item-content style)
                    const textX = itemX + checkboxSize + 4;
                    const textWidth = cardWidth - (textX - cardX) - itemPadding;
                    
                    pdf.setTextColor(isCardCompleted ? 0 : 31, isCardCompleted ? 0 : 41, isCardCompleted ? 0 : 55);
                    pdf.setFontSize(8.5);
                    pdf.setFont('helvetica', isCompleted ? 'normal' : 'bold');
                    
                    const textLines = pdf.splitTextToSize(item.text, textWidth);
                    textLines.forEach((line, idx) => {
                      pdf.text(line, textX, yPosition + (idx * 4));
                    });
                    yPosition += textLines.length * 4;
                    
                    // Checklist items (bullet points)
                    if (item.checklist && item.checklist.length > 0) {
                      pdf.setFontSize(7.5);
                      pdf.setFont('helvetica', 'normal');
                      pdf.setTextColor(isCardCompleted ? 0 : 75, isCardCompleted ? 0 : 85, isCardCompleted ? 0 : 99);
                      
                      item.checklist.forEach(checkItem => {
                        checkNewPage(4);
                        const bulletX = textX + 6;
                        pdf.text('•', bulletX, yPosition);
                        const checkItemLines = pdf.splitTextToSize(checkItem, textWidth - 12);
                        checkItemLines.forEach((line, idx) => {
                          pdf.text(line, bulletX + 4, yPosition + (idx * 3.5));
                        });
                        yPosition += checkItemLines.length * 3.5;
                      });
                    }
                    
                    // Context menu hint (if applicable)
                    if (item.enableContextMenu) {
                      pdf.setTextColor(156, 163, 175);
                      pdf.setFontSize(6);
                      pdf.setFont('helvetica', 'italic');
                      pdf.text('💡 Right-click to create email', textX, yPosition);
                      yPosition += 3;
                    }
                    
                    yPosition += 3;
                  }
                });
              }
              
              // Ensure we're at the bottom of the card
              yPosition = cardStartY + cardContentHeight + 8;
            });
            
            // Add spacing after subsections group
            yPosition += 8;
          }
        });
        
        // Save the PDF
        const fileName = `${activeTab}_workflow_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        setExportingPDF(false);
        setShowExportSelection(false);
      };

      // Try to load logo, then generate PDF
      logoImg.onload = function() {
        logoLoaded = true;
        generatePDFContent();
      };
      
      logoImg.onerror = function() {
        logoLoaded = false;
        generatePDFContent();
      };
      
      // Timeout fallback if logo doesn't load
      setTimeout(() => {
        if (!exportingPDF) return;
        generatePDFContent();
      }, 3000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
      setExportingPDF(false);
    }
  }; */

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

  // Render clickable item
  const ClickableItem = ({ id, children, className = "", onClick, enableContextMenu = false, emailType = 'default' }) => (
    <div 
      className={`clickable-item ${isCompleted(id) ? 'completed' : ''} ${className}`}
      onClick={(e) => {
        if (onClick) onClick(e);
        else toggleCompletion(id);
      }}
      onContextMenu={enableContextMenu ? (e) => handleEmailContextMenu(e, emailType) : undefined}
    >
      <div className="completion-indicator">
        {isCompleted(id) ? <Check size={16} strokeWidth={3} /> : <div className="empty-circle" />}
      </div>
      <div className="item-content">{children}</div>
    </div>
  );

  // Render subsection card
  const SubsectionCard = ({ id, itemIds, children, className = "", sectionId, subsectionId }) => (
    <div 
      className={`subsection-card ${isCardCompleted(id) ? 'completed' : ''} ${className}`}
      onClick={(e) => toggleCardCompletion(id, itemIds, e)}
      onContextMenu={(e) => handleSubsectionContextMenu(e, sectionId, subsectionId)}
    >
      {children}
    </div>
  );

  // Render clickable email template
  const ClickableEmailTemplate = ({ id, children, onClick }) => (
    <div 
      className={`email-template clickable ${isCompleted(id) ? 'completed' : ''}`}
      onClick={(e) => {
        if (onClick) onClick(e);
        else toggleCompletion(id);
      }}
    >
      <div className="email-checkbox">
        {isCompleted(id) && <Check size={16} />}
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );

  // Get icon component
  const getIcon = (iconName) => {
    const icons = {
      Activity, FileText, AlertCircle, Settings, Pill, CircleDot, FileCheck,
      FileSignature, Send, RefreshCcw, ClipboardCheck, FolderOpen, Info
    };
    const IconComponent = icons[iconName] || FileText;
    return IconComponent;
  };

  // Render section content based on active tab
  const renderSectionContent = () => {
    const currentSections = workflowData[activeTab]?.sections || [];
    
    if (loading) {
      return <div className="loading-message">Loading workflow data...</div>;
    }

    if (currentSections.length === 0) {
      return (
        <div className="empty-state">
          <FolderOpen size={48} />
          <h3>No SOPs Yet</h3>
          <p>Click "Add Section" to create your first SOP for {activeTab.toUpperCase()}</p>
        </div>
      );
    }

    return (
      <div className="workflow-timeline-content">
        <div className="workflow-timeline-container">
          <div className="timeline-line"></div>
          
          {currentSections.map(section => {
            const IconComponent = getIcon(section.icon);
            
            return (
              <div key={section.id} className="workflow-section-compact">
                <div 
                  className={`workflow-card-compact ${section.id}-card`}
                  onClick={() => toggleSection(section.id)}
                  onContextMenu={(e) => handleSectionContextMenu(e, section.id)}
                >
                  <div className="workflow-card-icon" style={section.iconBg ? { background: section.iconBg, color: section.iconColor } : {}}>
                    <IconComponent size={24} />
                  </div>
                  <div className="workflow-card-content">
                    <h3>{section.cardTitle}</h3>
                    <p>{section.cardDescription}</p>
                  </div>
                  <div className="workflow-card-toggle">
                    {expandedSections[section.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>
                
                {expandedSections[section.id] && (
                  <div className="workflow-expansion">
                    {/* Decision Table for Scenario Overview */}
                    {section.content?.type === 'decision-table' && (
                      <div className="decision-table-container">
                        <table className="decision-table">
                          <thead>
                            <tr>
                              {section.content.data.headers.map((header, idx) => (
                                <th key={idx}>{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.content.data.rows.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className={
                                    cell === 'No' ? 'no' : 
                                    cell.includes('Yes') ? 'yes' : ''
                                  }>
                                    {cellIdx === 0 ? <strong>{cell}</strong> : cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Subsections */}
                    {section.subsections && section.subsections.length > 0 && (
                      <>
                        <div className="subsections-container">
                          {section.subsections.map(subsection => {
                            const SubIcon = getIcon(subsection.icon);
                            
                            return (
                              <div 
                                key={subsection.id} 
                                data-subsection-id={subsection.id}
                                className={`subsection-wrapper ${subsection.is2Column ? 'is-2column' : ''}`}
                                style={{
                                  width: subsection.is2Column ? 'calc(50% - 0.375rem)' : (subsectionWidths[subsection.id] || subsection.customWidth ? `${subsectionWidths[subsection.id] || subsection.customWidth}%` : '100%'),
                                  maxWidth: subsection.is2Column ? 'calc(50% - 0.375rem)' : '100%',
                                  position: 'relative'
                                }}
                              >
                              {/* Width resize handle removed - using 2-column option instead */}
                              {false && (
                              <div 
                                className="subsection-width-handle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setIsResizing(true); // Set flag to prevent tab switching
                                  const startX = e.clientX;
                                  const subsectionElement = e.target.parentElement;
                                  const parentWidth = subsectionElement.parentElement.offsetWidth;
                                  const startWidth = subsectionElement.offsetWidth;
                                  
                                  const handleMouseMove = (moveEvent) => {
                                    moveEvent.preventDefault();
                                    moveEvent.stopPropagation();
                                    setIsResizing(true); // Keep flag set during resize
                                    const delta = moveEvent.clientX - startX;
                                    const newWidth = Math.max(300, startWidth + delta);
                                    const widthPercent = Math.min(100, (newWidth / parentWidth) * 100);
                                    
                                    setSubsectionWidths(prev => ({
                                      ...prev,
                                      [subsection.id]: widthPercent
                                    }));
                                  };
                                  
                                  const handleMouseUp = async (e) => {
                                    document.removeEventListener('mousemove', handleMouseMove);
                                    document.removeEventListener('mouseup', handleMouseUp);
                                    setIsResizing(false); // Clear flag after subsection resize
                                    
                                    // Get the final width from the element
                                    const subsectionElement = document.querySelector(`[data-subsection-id="${subsection.id}"]`) || e.target.parentElement;
                                    const parentWidth = subsectionElement.parentElement.offsetWidth;
                                    const finalWidth = subsectionElement.offsetWidth;
                                    const finalWidthPercent = Math.min(100, (finalWidth / parentWidth) * 100);
                                    
                                    // Save subsection width to Firebase
                                    const updatedSections = (workflowData[activeTab]?.sections || []).map(s => {
                                      if (s.id === section.id && s.subsections) {
                                        return {
                                          ...s,
                                          subsections: s.subsections.map(sub => {
                                            if (sub.id === subsection.id) {
                                              return {
                                                ...sub,
                                                customWidth: finalWidthPercent
                                              };
                                            }
                                            return sub;
                                          })
                                        };
                                      }
                                      return s;
                                    });
                                    
                                    // Pass the updated sections as an array
                                    await saveWorkflowData(updatedSections);
                                  };
                                  
                                  document.addEventListener('mousemove', handleMouseMove);
                                  document.addEventListener('mouseup', handleMouseUp);
                                }}
                                title="Drag to resize subsection width"
                              >
                                ⟷
                              </div>
                              )}
                              
                              <div className="subsection-header rph-title" onContextMenu={(e) => handleSubsectionContextMenu(e, section.id, subsection.id)}>
                                <h3>{subsection.title}</h3>
                                {subsection.is2Column && (
                                  <span className="column-indicator" title="2 Column Layout">2col</span>
                                )}
                              </div>
                              
                              <SubsectionCard id={subsection.id} itemIds={subsection.itemIds} sectionId={section.id} subsectionId={subsection.id}>
                                
                                {subsection.items.map(item => {
                                  if (item.type === 'email-template') {
                                    const HeaderIcon = getIcon(item.header.icon);
                                    return (
                                      <ClickableEmailTemplate key={item.id} id={item.id}>
                                        <div className="email-header">
                                          <HeaderIcon size={20} />
                                          <span>{item.header.title}</span>
                                        </div>
                                        <div className="email-content">
                                          <pre style={{ whiteSpace: 'pre-wrap' }}>{item.content}</pre>
                                        </div>
                                      </ClickableEmailTemplate>
                                    );
                                  } else if (item.type === 'email') {
                                    return (
                                      <ClickableEmailTemplate key={item.id} id={item.id}>
                                        <div className="email-header">
                                          <div className="email-header-title">
                                            <Mail size={20} />
                                            <span>Email Template Example</span>
                                          </div>
                                          <div className="email-fields">
                                            <div className="email-field">
                                              <span className="email-field-label">To:</span>
                                              <span className="email-field-value email-address">{item.to}</span>
                                            </div>
                                            <div className="email-field">
                                              <span className="email-field-label">Cc:</span>
                                              <span className="email-field-value email-address">{item.cc}</span>
                                            </div>
                                            <div className="email-field">
                                              <span className="email-field-label">Subject:</span>
                                              <span className="email-field-value">{item.subject}</span>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="email-content">
                                          <div className="attention-box">
                                            {item.body}
                                          </div>
                                        </div>
                                      </ClickableEmailTemplate>
                                    );
                                  } else {
                                    return (
                                      <ClickableItem 
                                        key={item.id} 
                                        id={item.id}
                                        enableContextMenu={item.enableContextMenu}
                                        emailType={item.emailType}
                                      >
                                        <div className="checklist-item">
                                          <strong style={{ whiteSpace: 'pre-wrap', display: 'block' }}>{item.text}</strong>
                                          {item.checklist && item.checklist.length > 0 && (
                                            <ul>
                                              {item.checklist.map((checkItem, idx) => (
                                                <li key={idx}>{checkItem}</li>
                                              ))}
                                            </ul>
                                          )}
                                          
                                          {/* Display saved screenshots */}
                                          {item.screenshots && item.screenshots.length > 0 && (
                                            <div className="subsection-screenshots">
                                              {item.screenshots.map(screenshot => (
                                                <div 
                                                  key={screenshot.id} 
                                                  className="screenshot-container full-width"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                  }}>
                                                  <img 
                                                    src={screenshot.data} 
                                                    alt="Screenshot"
                                                    className="resizable-screenshot"
                                                  />
                                                  {/* Image resize handle removed - images now scale with subsection
                                                  <div 
                                                    className="image-resize-handle"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                    }}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setIsResizing(true); // Set flag to prevent tab switching
                                                      const startX = e.clientX;
                                                      const container = e.target.parentElement;
                                                      const img = container.querySelector('img');
                                                      const startWidth = img.offsetWidth;
                                                      const containerWidth = container.offsetWidth;
                                                      
                                                      const handleMouseMove = (moveEvent) => {
                                                        moveEvent.preventDefault();
                                                        moveEvent.stopPropagation();
                                                        const delta = moveEvent.clientX - startX;
                                                        const newWidth = Math.max(200, startWidth + delta);
                                                        const widthPercent = Math.min(100, (newWidth / containerWidth) * 100);
                                                        
                                                        // Update screenshot width
                                                        const updatedSections = workflowData[activeTab].sections.map(s => {
                                                          if (s.id === section.id && s.subsections) {
                                                            return {
                                                              ...s,
                                                              subsections: s.subsections.map(sub => {
                                                                if (sub.id === subsection.id) {
                                                                  return {
                                                                    ...sub,
                                                                    items: sub.items.map(i => {
                                                                      if (i.screenshots) {
                                                                        return {
                                                                          ...i,
                                                                          screenshots: i.screenshots.map(sc => 
                                                                            sc.id === screenshot.id 
                                                                              ? { ...sc, customWidth: widthPercent }
                                                                              : sc
                                                                          )
                                                                        };
                                                                      }
                                                                      return i;
                                                                    })
                                                                  };
                                                                }
                                                                return sub;
                                                              })
                                                            };
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        setWorkflowData(prev => ({
                                                          ...prev,
                                                          [activeTab]: {
                                                            ...prev[activeTab],
                                                            sections: updatedSections
                                                          }
                                                        }));
                                                      };
                                                      
                                                      const handleMouseUp = async () => {
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                        document.removeEventListener('mouseup', handleMouseUp);
                                                        setIsResizing(false); // Clear flag after image resize
                                                        // Save to Firebase - use the full workflow data to avoid errors
                                                        const currentData = {
                                                          ...workflowData,
                                                          [activeTab]: {
                                                            sections: workflowData[activeTab]?.sections || []
                                                          }
                                                        };
                                                        await saveWorkflowData(currentData);
                                                      };
                                                      
                                                      document.addEventListener('mousemove', handleMouseMove);
                                                      document.addEventListener('mouseup', handleMouseUp);
                                                    }}
                                                    title="Drag to resize image"
                                                  >
                                                    ⟷
                                                  </div>
                                                  */}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {/* Display saved tables */}
                                          {item.tables && item.tables.length > 0 && (
                                            <div className="subsection-tables">
                                              {item.tables.map(table => (
                                                <div 
                                                  key={table.id} 
                                                  className="table-container full-width"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                  }}>
                                                  <div 
                                                    className="table-scroll-wrapper expanded"
                                                    style={{
                                                      maxHeight: table.customHeight ? `${table.customHeight}px` : '400px'
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: table.html }}
                                                  />
                                                  {/* Table resize handle removed - tables now scale with subsection
                                                  <div 
                                                    className="table-resize-handle"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      e.preventDefault();
                                                    }}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      e.stopPropagation();
                                                      setIsResizing(true); // Set flag to prevent tab switching
                                                      const startY = e.clientY;
                                                      const container = e.target.parentElement.querySelector('.table-scroll-wrapper');
                                                      const startHeight = container.offsetHeight;
                                                      
                                                      const handleMouseMove = (moveEvent) => {
                                                        moveEvent.preventDefault();
                                                        moveEvent.stopPropagation();
                                                        const delta = moveEvent.clientY - startY;
                                                        const newHeight = Math.max(200, Math.min(800, startHeight + delta));
                                                        
                                                        // Update table height
                                                        const updatedSections = workflowData[activeTab].sections.map(s => {
                                                          if (s.id === section.id && s.subsections) {
                                                            return {
                                                              ...s,
                                                              subsections: s.subsections.map(sub => {
                                                                if (sub.id === subsection.id) {
                                                                  return {
                                                                    ...sub,
                                                                    items: sub.items.map(i => {
                                                                      if (i.tables) {
                                                                        return {
                                                                          ...i,
                                                                          tables: i.tables.map(t => 
                                                                            t.id === table.id 
                                                                              ? { ...t, customHeight: newHeight }
                                                                              : t
                                                                          )
                                                                        };
                                                                      }
                                                                      return i;
                                                                    })
                                                                  };
                                                                }
                                                                return sub;
                                                              })
                                                            };
                                                          }
                                                          return s;
                                                        });
                                                        
                                                        setWorkflowData(prev => ({
                                                          ...prev,
                                                          [activeTab]: {
                                                            ...prev[activeTab],
                                                            sections: updatedSections
                                                          }
                                                        }));
                                                      };
                                                      
                                                      const handleMouseUp = async () => {
                                                        document.removeEventListener('mousemove', handleMouseMove);
                                                        document.removeEventListener('mouseup', handleMouseUp);
                                                        setIsResizing(false); // Clear flag after table resize
                                                        // Save to Firebase - use the full workflow data to avoid errors
                                                        const currentData = {
                                                          ...workflowData,
                                                          [activeTab]: {
                                                            sections: workflowData[activeTab]?.sections || []
                                                          }
                                                        };
                                                        await saveWorkflowData(currentData);
                                                      };
                                                      
                                                      document.addEventListener('mousemove', handleMouseMove);
                                                      document.addEventListener('mouseup', handleMouseUp);
                                                    }}
                                                    title="Drag to resize table height"
                                                  >
                                                    ⟶
                                                  </div>
                                                  */}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                          
                                          {item.enableContextMenu && (
                                            <div className="context-menu-hint">Right-click to create email</div>
                                          )}
                                        </div>
                                      </ClickableItem>
                                    );
                                  }
                                })}
                              </SubsectionCard>
                            </div>
                          );
                          })}
                        </div>
                        
                        {/* Add Subsection Button - Outside container to prevent overlap */}
                        <button
                          className="add-subsection-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSection(section.id);
                            setShowAddSubsectionModal(true);
                          }}
                        >
                          <Plus size={16} />
                          Add Subsection
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Show loading state while authenticating
  if (!authInitialized) {
    return (
      <div className="workflow-page page-container">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '20px'
        }}>
          <RefreshCcw size={48} className="spin-animation" style={{ color: '#3b82f6' }} />
          <div style={{ fontSize: '18px', color: '#6b7280' }}>
            Authenticating with Firebase...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`workflow-page page-container ${isResizing ? 'is-resizing' : ''}`}>
      {/* Enterprise Header */}
      <EnterpriseHeader>
        <TabGroup>
          <TabButton
            active={activeTab === 'lyso'}
            onClick={() => !isResizing && setActiveTab('lyso')}
          >
            LYSO
          </TabButton>
          <TabButton
            active={activeTab === 'hae'}
            onClick={() => !isResizing && setActiveTab('hae')}
          >
            HAE
          </TabButton>
          <TabButton
            active={activeTab === 'scd'}
            onClick={() => !isResizing && setActiveTab('scd')}
          >
            SCD
          </TabButton>
        </TabGroup>
        
        {/* Save Status Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: '20px',
          marginRight: '20px',
          padding: '6px 12px',
          borderRadius: '6px',
          backgroundColor: saveStatus === 'saved' ? '#10b98133' : 
                          saveStatus === 'saving' ? '#3b82f633' : 
                          saveStatus === 'error' ? '#ef444433' : '#6b728033',
          color: saveStatus === 'saved' ? '#10b981' : 
                 saveStatus === 'saving' ? '#3b82f6' : 
                 saveStatus === 'error' ? '#ef4444' : '#6b7280',
          fontSize: '13px',
          fontWeight: '500'
        }}>
          {saveStatus === 'saved' && <CheckCircle2 size={16} />}
          {saveStatus === 'saving' && <RefreshCcw size={16} className="spin-animation" />}
          {saveStatus === 'error' && <AlertCircle size={16} />}
          {saveStatus === 'pending' && <Clock size={16} />}
          <span>
            {saveStatus === 'saved' && 'Saved to Firebase'}
            {saveStatus === 'saving' && 'Saving to Firebase...'}
            {saveStatus === 'error' && 'Firebase save failed'}
            {saveStatus === 'pending' && 'Pending save'}
          </span>
          {lastSaveTime && saveStatus === 'saved' && (
            <span style={{ opacity: 0.7, fontSize: '11px' }}>
              ({new Date(lastSaveTime).toLocaleTimeString()})
            </span>
          )}
        </div>
        
        <ActionGroup>
          <ActionButton
            onClick={() => setShowAddSectionModal(true)}
            icon={PlusCircle}
            primary
          >
            Add Section
          </ActionButton>
          <ActionButton
            onClick={() => {
              // Check if any sections are expanded
              const hasExpanded = Object.values(expandedSections).some(isExpanded => isExpanded);
              if (hasExpanded) {
                collapseAll();
              } else {
                expandAll();
              }
            }}
            icon={Object.values(expandedSections).some(isExpanded => isExpanded) ? ChevronUp : ChevronDown}
            secondary
          >
            {Object.values(expandedSections).some(isExpanded => isExpanded) ? 'Collapse All' : 'Expand All'}
          </ActionButton>
          <ActionButton
            onClick={() => {
              setShowExportSelection(true);
              // Initialize with all sections selected
              const allSectionIds = workflowData[activeTab].sections.map(s => s.id);
              setSelectedSectionsForExport(new Set(allSectionIds));
            }}
            icon={FileDown}
            primary
          >
            Export PDF
          </ActionButton>
        </ActionGroup>
      </EnterpriseHeader>

      {/* Main Content */}
      {renderSectionContent()}

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="modal-overlay" onClick={() => setShowAddSectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAddSectionModal(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAddSectionModal(false);
              }}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
            <h2>Add New Section</h2>
            <input
              type="text"
              placeholder="Section Title"
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              className="modal-input"
            />
            <textarea
              placeholder="Section Description (optional)"
              value={newSectionDescription}
              onChange={(e) => setNewSectionDescription(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-actions">
              <button onClick={() => setShowAddSectionModal(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={addSection} className="btn-primary" style={{ color: 'white' }}>
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subsection Modal - Fullscreen */}
      {showAddSubsectionModal && (
        <div className="modal-overlay modal-fullscreen" onClick={() => setShowAddSubsectionModal(false)}>
          <div className="modal-content modal-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-with-actions">
              <h2>Add New Subsection</h2>
              <div className="modal-header-buttons">
                <button 
                  onClick={() => {
                    setShowAddSubsectionModal(false);
                    setNewSubsectionTitle('');
                    setNewSubsectionContent('');
                    setNewSubsectionScreenshots([]);
                    setNewSubsectionTables([]);
                  }} 
                  className="btn-header-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={addSubsection} 
                  className="btn-header-primary"
                  disabled={!newSubsectionTitle.trim()}
                >
                  Add Subsection
                </button>
                <button 
                  className="modal-close-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAddSubsectionModal(false);
                    setNewSubsectionTitle('');
                    setNewSubsectionContent('');
                    setNewSubsectionScreenshots([]);
                    setNewSubsectionTables([]);
                  }}
                  aria-label="Close"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="modal-body-scrollable">
              <div className="modal-field">
                <label className="modal-label">Subsection Title</label>
                <input
                  type="text"
                  placeholder="Enter a descriptive title"
                  value={newSubsectionTitle}
                  onChange={(e) => setNewSubsectionTitle(e.target.value)}
                  className="modal-input modal-input-large"
                  autoFocus
                />
              </div>
              
              <div className="modal-field modal-field-expanded">
                <label className="modal-label">Content</label>
                <div className="modal-paste-info">
                  <Info size={16} />
                  <span>Tip: You can paste content directly from OneNote including text, images, and tables all at once!</span>
                </div>
                <textarea
                  placeholder="Enter detailed content here or paste from OneNote (Ctrl+V). Supports mixed content: text, images, and tables."
                  value={newSubsectionContent}
                  onChange={(e) => setNewSubsectionContent(e.target.value)}
                  onPaste={(e) => handleModalPaste(e, false)}
                  className="modal-textarea modal-textarea-large"
                  spellCheck="true"
                />
              
              {/* Display pasted screenshots */}
              {newSubsectionScreenshots.length > 0 && (
                <div className="modal-screenshots">
                  <h4>Screenshots:</h4>
                  {newSubsectionScreenshots.map((screenshot, index) => (
                    <div key={screenshot.id} className="modal-screenshot-container">
                      <img 
                        src={screenshot.data} 
                        alt={`Screenshot ${index + 1}`}
                        style={{ width: `${screenshot.width}px`, maxWidth: '100%' }}
                        className="modal-screenshot"
                      />
                      <div 
                        className="modal-resize-handle"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = screenshot.width;
                          
                          const handleMouseMove = (moveEvent) => {
                            const delta = moveEvent.clientX - startX;
                            const newWidth = Math.max(100, Math.min(600, startWidth + delta));
                            setNewSubsectionScreenshots(prev => 
                              prev.map(s => s.id === screenshot.id ? { ...s, width: newWidth } : s)
                            );
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                      <button 
                        className="modal-delete-btn"
                        onClick={() => setNewSubsectionScreenshots(prev => 
                          prev.filter(s => s.id !== screenshot.id)
                        )}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Display pasted tables */}
              {newSubsectionTables.length > 0 && (
                <div className="modal-tables">
                  <h4>Tables:</h4>
                  {newSubsectionTables.map((table, index) => (
                    <div key={table.id} className="modal-table-container">
                      <div 
                        className="modal-table-wrapper"
                        dangerouslySetInnerHTML={{ __html: table.html }}
                      />
                      <button 
                        className="modal-delete-table-btn"
                        onClick={() => setNewSubsectionTables(prev => 
                          prev.filter(t => t.id !== table.id)
                        )}
                      >
                        Remove Table
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {showEditSectionModal && (
        <div className="modal-overlay" onClick={() => setShowEditSectionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEditSectionModal(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEditSectionModal(false);
              }}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
            <h2>Edit Section</h2>
            <input
              type="text"
              placeholder="Section Title"
              value={editSectionTitle}
              onChange={(e) => setEditSectionTitle(e.target.value)}
              className="modal-input"
            />
            <textarea
              placeholder="Section Description"
              value={editSectionDescription}
              onChange={(e) => setEditSectionDescription(e.target.value)}
              className="modal-textarea"
            />
            <div className="modal-actions">
              <button onClick={() => setShowEditSectionModal(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={editSection} className="btn-primary" style={{ color: 'white !important', color: '#ffffff !important' }}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subsection Modal - Fullscreen */}
      {showEditSubsectionModal && (
        <div className="modal-overlay modal-fullscreen" onClick={() => setShowEditSubsectionModal(false)}>
          <div className="modal-content modal-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-with-actions">
              <h2>Edit Subsection</h2>
              <div className="modal-header-buttons">
                <button 
                  onClick={() => {
                    setShowEditSubsectionModal(false);
                    setEditSubsectionTitle('');
                    setEditSubsectionContent('');
                    setEditSubsectionScreenshots([]);
                    setEditSubsectionTables([]);
                  }} 
                  className="btn-header-cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={editSubsection} 
                  className="btn-header-primary"
                  disabled={!editSubsectionTitle.trim()}
                >
                  Save Changes
                </button>
                <button 
                  className="modal-close-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowEditSubsectionModal(false);
                    setEditSubsectionTitle('');
                    setEditSubsectionContent('');
                    setEditSubsectionScreenshots([]);
                    setEditSubsectionTables([]);
                  }}
                  aria-label="Close"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="modal-body-scrollable">
              <input
                type="text"
                placeholder="Subsection Title"
                value={editSubsectionTitle}
                onChange={(e) => setEditSubsectionTitle(e.target.value)}
                className="modal-input"
              />
              
              <div className="modal-content-area">
              <textarea
                placeholder="Subsection Content (paste screenshots or tables here)"
                value={editSubsectionContent}
                onChange={(e) => setEditSubsectionContent(e.target.value)}
                onPaste={(e) => handleModalPaste(e, true)}
                className="modal-textarea"
              />
              
              {/* Display pasted screenshots */}
              {editSubsectionScreenshots.length > 0 && (
                <div className="modal-screenshots">
                  <h4>Screenshots:</h4>
                  {editSubsectionScreenshots.map((screenshot, index) => (
                    <div key={screenshot.id} className="modal-screenshot-container">
                      <img 
                        src={screenshot.data} 
                        alt={`Screenshot ${index + 1}`}
                        style={{ width: `${screenshot.width}px`, maxWidth: '100%' }}
                        className="modal-screenshot"
                      />
                      <div 
                        className="modal-resize-handle"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startWidth = screenshot.width;
                          
                          const handleMouseMove = (moveEvent) => {
                            const delta = moveEvent.clientX - startX;
                            const newWidth = Math.max(100, Math.min(600, startWidth + delta));
                            setEditSubsectionScreenshots(prev => 
                              prev.map(s => s.id === screenshot.id ? { ...s, width: newWidth } : s)
                            );
                          };
                          
                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                      <button 
                        className="modal-delete-btn"
                        onClick={() => setEditSubsectionScreenshots(prev => 
                          prev.filter(s => s.id !== screenshot.id)
                        )}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Display pasted tables */}
              {editSubsectionTables.length > 0 && (
                <div className="modal-tables">
                  <h4>Tables:</h4>
                  {editSubsectionTables.map((table, index) => (
                    <div key={table.id} className="modal-table-container">
                      <div 
                        className="modal-table-wrapper"
                        dangerouslySetInnerHTML={{ __html: table.html }}
                      />
                      <button 
                        className="modal-delete-table-btn"
                        onClick={() => setEditSubsectionTables(prev => 
                          prev.filter(t => t.id !== table.id)
                        )}
                      >
                        Remove Table
                      </button>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Section Selection Modal */}
      {showExportSelection && (
        <div className="modal-overlay" onClick={() => setShowExportSelection(false)}>
          <div className="modal-content export-selection-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExportSelection(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExportSelection(false);
              }}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
            <h2>Select Sections to Export</h2>
            <p className="modal-description">Choose which sections to include in the PDF export</p>
            
            <div className="section-selection-list">
              {workflowData[activeTab].sections.map(section => (
                <div key={section.id} className="section-selection-item">
                  <label className="selection-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedSectionsForExport.has(section.id)}
                      onChange={() => toggleSectionForExport(section.id)}
                      className="selection-checkbox"
                    />
                    <div className="selection-checkbox-custom">
                      {selectedSectionsForExport.has(section.id) && <CheckSquare size={18} />}
                      {!selectedSectionsForExport.has(section.id) && <Square size={18} />}
                    </div>
                    <div className="section-selection-info">
                      <div className="section-selection-title">{section.title}</div>
                      <div className="section-selection-description">{section.cardDescription}</div>
                      {section.subsections && section.subsections.length > 0 && (
                        <div className="section-selection-subsections">
                          {section.subsections.length} subsection{section.subsections.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ))}
            </div>
            
            <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0 0' }}>
              <ActionGroup>
                <ActionButton 
                  onClick={() => {
                    const allSectionIds = workflowData[activeTab].sections.map(s => s.id);
                    setSelectedSectionsForExport(new Set(allSectionIds));
                  }} 
                  secondary
                >
                  Select All
                </ActionButton>
                <ActionButton 
                  onClick={() => setSelectedSectionsForExport(new Set())} 
                  secondary
                >
                  Deselect All
                </ActionButton>
              </ActionGroup>
              <ActionGroup>
                <ActionButton onClick={() => setShowExportSelection(false)} secondary>
                  Cancel
                </ActionButton>
                <ActionButton 
                  onClick={exportSelectedSectionsToPDF} 
                  primary
                  icon={FileDown}
                  disabled={selectedSectionsForExport.size === 0 || exportingPDF}
                >
                  {exportingPDF ? 'Exporting...' : 'Export PDF'}
                </ActionButton>
              </ActionGroup>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={handleDeleteCancel}>
          <div className="delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <AlertCircle size={48} className="warning-icon" />
            </div>
            <h2 className="delete-modal-title">Confirm Deletion</h2>
            <p className="delete-modal-message">
              Are you sure you want to delete this {deleteModalType}?
            </p>
            <p className="delete-modal-warning">
              This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <ActionButton onClick={handleDeleteCancel} secondary>
                Cancel
              </ActionButton>
              <ActionButton 
                onClick={handleDeleteConfirm} 
                primary
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
              >
                Delete {deleteModalType}
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.type === 'email' ? (
            <button onClick={() => createEmail(contextMenu.emailType)}>
              <Mail size={16} />
              Create Email
            </button>
          ) : (
            <>
              {contextMenu.targetType === 'section' && (
                <>
                  <button onClick={() => handleContextMenuAction('add-subsection')}>
                    <Plus size={16} />
                    Add Subsection
                  </button>
                  {!contextMenu.isDefaultSection && (
                    <>
                      <button onClick={() => handleContextMenuAction('edit')}>
                        <FileText size={16} />
                        Edit Section
                      </button>
                      <button onClick={() => handleContextMenuAction('delete')} className="context-menu-delete">
                        <AlertCircle size={16} />
                        Delete Section
                      </button>
                    </>
                  )}
                </>
              )}
              {contextMenu.targetType === 'subsection' && (
                <>
                  <button onClick={() => handleContextMenuAction('copy-text')}>
                    <FileText size={16} />
                    Copy Text
                  </button>
                  <button onClick={() => handleContextMenuAction('toggle-2column')}>
                    <FileText size={16} />
                    {contextMenu.is2Column ? 'Remove 2 Column' : 'Mark as 2 Column'}
                  </button>
                  <button onClick={() => handleContextMenuAction('edit')}>
                    <FileText size={16} />
                    Edit Subsection
                  </button>
                  <button onClick={() => handleContextMenuAction('delete')} className="context-menu-delete">
                    <AlertCircle size={16} />
                    Delete Subsection
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Workflow;