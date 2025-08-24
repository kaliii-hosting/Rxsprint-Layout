import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Upload, X, ScanLine, Check, X as XIcon, AlertCircle, RotateCcw, FileText, ChevronDown, Package, GitCompare, TrendingUp, TrendingDown, ImageIcon, Plus } from 'lucide-react';
import './Analyzer.css';
import './SuppliesTableFixes.css';
import './SuppliesTableOverrides.css';
import './ResponsiveSuppliesTables.css';
import './SuppliesTableEnhancements.css';
import EnterpriseHeader, { TabGroup, TabButton } from '../../components/EnterpriseHeader/EnterpriseHeader';

const Analyzer = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [allAnalysisResults, setAllAnalysisResults] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDEAAlert, setShowDEAAlert] = useState(false);
  const [showNeedlesAlert, setShowNeedlesAlert] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isFolderUpload, setIsFolderUpload] = useState(false);
  const [activeSection, setActiveSection] = useState('prescription'); // 'prescription' or 'supplies'
  const [selectedSupplyFile, setSelectedSupplyFile] = useState(null);
  const [supplyPreviewUrl, setSupplyPreviewUrl] = useState(null);
  
  // OPTIMIZATION 5: Cache for analyzed documents
  const analysisCache = useRef(new Map());
  
  // New states for supplies comparison - now supporting multiple files
  const [previousSupplyFiles, setPreviousSupplyFiles] = useState([]);
  const [currentSupplyFiles, setCurrentSupplyFiles] = useState([]);
  const [previousSupplyPreviews, setPreviousSupplyPreviews] = useState([]);
  const [currentSupplyPreviews, setCurrentSupplyPreviews] = useState([]);
  const [isAnalyzingSupplies, setIsAnalyzingSupplies] = useState(false);
  const [suppliesComparisonResults, setSuppliesComparisonResults] = useState(null);
  const [suppliesError, setSuppliesError] = useState(null);
  const [isPasteFocused, setIsPasteFocused] = useState({ previous: false, current: false });
  const [activeFilter, setActiveFilter] = useState(null); // null, 'all', 'matched', 'changed', 'new', or 'missing'
  const [analysisProgress, setAnalysisProgress] = useState(''); // Progress message for supplies analyzer
  const [selectedRows, setSelectedRows] = useState({ previous: new Set(), current: new Set() }); // Track multiple selected rows
  
  // Legacy single file states for backward compatibility
  const previousSupplyFile = previousSupplyFiles[0] || null;
  const currentSupplyFile = currentSupplyFiles[0] || null;

  const fileInputRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const previousSupplyDivRef = useRef(null);
  const currentSupplyDivRef = useRef(null);
  const supplyFileInputRef = useRef(null);
  const previousSupplyInputRef = useRef(null);
  const currentSupplyInputRef = useRef(null);

  // Field configuration matching the screenshot layout
  const fieldSections = [
    {
      title: 'Patient',
      fields: [
        { label: 'Name', rxKey: 'Rx PT Name', deKey: 'DE PT Name' },
        { label: 'DOB', rxKey: 'Rx PT DOB', deKey: 'DE PT DOB' },
        { label: 'Gender', rxKey: 'Rx PT Gender', deKey: 'DE PT Gender' },
        { label: 'Address', rxKey: 'Rx PT Address', deKey: 'DE PT Address' },
        { label: 'Phone', rxKey: 'Rx PT Phone', deKey: 'DE PT Phone' }
      ]
    },
    {
      title: 'Rx Info',
      fields: [
        { label: 'Written Date', rxKey: 'Rx Written date', deKey: 'DE Written Date' },
        { label: 'Exp Date', rxKey: 'Rx EXP Date', deKey: 'DE EXP Date' },
        { label: 'Drug', rxKey: 'Rx Drug', deKey: 'DE Drug' },
        { label: 'Strength | Form', rxKey: 'Rx Strength | Form', deKey: 'DE Strength | Form' },
        { label: 'NDC', rxKey: 'Rx NDC', deKey: 'DE NDC' },
        { label: 'DAW', rxKey: 'RX DAW', deKey: 'DE DAW' },
        { label: 'Sig', rxKey: 'RX Sig', deKey: 'DE Sig' },
        { label: 'Quantity | UOM', rxKey: 'RX Quantity | UOM', deKey: 'DE Quantity | UOM' },
        { label: 'Days Supply', rxKey: 'RX Days Supply', deKey: 'DE Days Supply' },
        { label: 'Refills', rxKey: 'RX Refills', deKey: 'DE Refills' }
      ]
    },
    {
      title: 'Prescriber',
      fields: [
        { label: 'Name', rxKey: 'RX Doctor Name', deKey: 'DE Doctor Name' },
        { label: 'Address', rxKey: 'RX Doctor Address', deKey: 'DE Doctor Address' },
        { label: 'Phone', rxKey: 'RX Doctor Phone', deKey: 'DE Doctor Phone' },
        { label: 'Fax', rxKey: 'RX Doctor Fax', deKey: 'DE Doctor Fax' },
        { label: 'NPI', rxKey: 'RX Doctor NPI', deKey: 'DE Doctor NPI' },
        { label: 'DEA', rxKey: 'RX Doctor DEA', deKey: 'DE Doctor DEA' }
      ]
    }
  ];

  // Enhanced Levenshtein Distance calculation
  const levenshteinDistance = (a = "", b = "") => {
    const matrix = [];
    const lenA = a.length, lenB = b.length;
    
    if (!lenA) return lenB;
    if (!lenB) return lenA;
    
    for (let i = 0; i <= lenA; i++) {
      matrix[i] = [i];
    }
    for (let j = 1; j <= lenB; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= lenA; i++) {
      for (let j = 1; j <= lenB; j++) {
        if (a.charAt(i - 1).toLowerCase() === b.charAt(j - 1).toLowerCase()) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }
    return matrix[lenA][lenB];
  };

  // Fuzzy match with threshold
  const fuzzyMatch = (str1 = "", str2 = "", threshold = 2) => {
    if (!str1 && !str2) return true;
    if (str1.trim().toLowerCase() === str2.trim().toLowerCase()) return true;
    const dist = levenshteinDistance(str1.trim(), str2.trim());
    return dist <= threshold;
  };

  // Check if value is blank or dash
  const isBlankOrDash = (val) => {
    if (!val) return true;
    const trimmed = val.trim();
    return trimmed === "-" || trimmed === "" || trimmed === "- | -" || trimmed === "-|-";
  };

  // Normalize phone numbers
  const normalizePhone = (str = "") => {
    return str.replace(/\D+/g, "");
  };

  // Extract numbers from string
  const extractNumbers = (str = "") => {
    const match = str.match(/\d+/g);
    return match ? match.join(" ") : "";
  };

  // Extract date
  const extractDate = (str = "") => {
    const match = str.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
    return match ? match[0] : str;
  };

  // Parse name into tokens
  const parseName = (name = "") => {
    return name.replace(/,/g, "").toLowerCase().split(/\s+/).filter(Boolean).sort();
  };

  // Compare names with fuzzy logic
  const compareNames = (name1 = "", name2 = "") => {
    const tokens1 = parseName(name1);
    const tokens2 = parseName(name2);
    
    if (fuzzyMatch(tokens1.join(" "), tokens2.join(" "), 3)) {
      return true;
    }
    
    const smaller = tokens1.length <= tokens2.length ? tokens1 : tokens2;
    const larger = tokens1.length <= tokens2.length ? tokens2 : tokens1;
    
    return smaller.every(sToken =>
      larger.some(lToken => fuzzyMatch(sToken, lToken, 2))
    );
  };

  // Parse address for detailed comparison
  const parseAddressDetailed = (addr = "") => {
    return addr
      .replace(/[.,]/g, "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
  };

  // Compare addresses with advanced logic
  const compareAddresses = (addr1 = "", addr2 = "") => {
    const rxAddrNum = extractNumbers(addr1);
    const deAddrNum = extractNumbers(addr2);
    
    if (rxAddrNum && deAddrNum) {
      if (fuzzyMatch(rxAddrNum, deAddrNum, 2)) return true;
    }
    
    const tokens1 = parseAddressDetailed(addr1);
    const tokens2 = parseAddressDetailed(addr2);
    
    if (fuzzyMatch(tokens1.join(" "), tokens2.join(" "), 5)) {
      return true;
    }
    
    let matchesCount = 0;
    tokens1.forEach(t1 => {
      if (tokens2.some(t2 => fuzzyMatch(t1, t2, 2))) {
        matchesCount++;
      }
    });
    
    const minLen = Math.min(tokens1.length, tokens2.length);
    if (matchesCount >= minLen - 1) {
      return true;
    }
    
    return false;
  };

  // Sig synonyms mapping
  const SIG_SYNONYMS = {
    "under the skin": "subcutaneous",
    "subcutaneously": "subcutaneous",
    "subcutaneous": "under the skin",
    "subq": "under the skin",
    "sq": "under the skin",
    "po": "by mouth",
    "by mouth": "po",
    "prn": "as needed",
    "as needed": "prn",
    "qd": "once daily",
    "once daily": "qd",
    "bid": "twice daily",
    "twice daily": "bid",
    "tid": "three times daily",
    "three times daily": "tid",
    "qid": "four times daily",
    "four times daily": "qid",
    "hs": "at bedtime",
    "at bedtime": "hs",
    "ac": "before meals",
    "before meals": "ac",
    "pc": "after meals",
    "after meals": "pc",
    "every 14 days": "q2weeks",
    "every 2 weeks": "q2weeks",
    "q14d": "q2weeks",
    "q2weeks": "every 14 days"
  };

  // Normalize sig directions
  const normalizeSig = (sig = "") => {
    let lower = sig.toLowerCase();
    for (const [pattern, replacement] of Object.entries(SIG_SYNONYMS)) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'g');
      lower = lower.replace(regex, replacement);
    }
    return lower.replace(/\s+/g, " ").trim();
  };

  // Determine match status: 'match', 'mismatch', or 'partial'
  const getMatchStatus = (label, rxVal, deVal, allRxFields = {}, allDeFields = {}) => {
    // Special logic for prescriber fields when NPI matches
    // Check if this is a prescriber field (but not NPI itself)
    const prescriberFieldLabels = ['Name', 'Address', 'Phone', 'Fax', 'DEA'];
    if (prescriberFieldLabels.includes(label)) {
      // Check if we have the prescriber NPI fields
      const rxNPI = (allRxFields['RX Doctor NPI'] || '').trim();
      const deNPI = (allDeFields['DE Doctor NPI'] || '').trim();
      
      // If NPIs match and are not empty, mark all prescriber fields as matching
      if (rxNPI && deNPI && rxNPI === deNPI) {
        return 'match';
      }
    }
    
    // Special logic for drug-related fields when NDC matches
    // Check if this is a drug-related field
    const drugRelatedFieldLabels = ['Drug', 'Strength | Form', 'NDC'];
    if (drugRelatedFieldLabels.includes(label)) {
      // Check if we have the NDC fields
      const rxNDC = (allRxFields['Rx NDC'] || '').trim();
      const deNDC = (allDeFields['DE NDC'] || '').trim();
      
      // If NDCs match and are not empty, mark all drug-related fields as matching
      if (rxNDC && deNDC && rxNDC === deNDC) {
        return 'match';
      }
    }
    
    // Check if either field is blank or dash
    if (isBlankOrDash(rxVal) || isBlankOrDash(deVal)) {
      return 'partial'; // Yellow for missing or dash values
    }
    
    // Check if either field contains only "-|-"
    const rxTrimmed = rxVal.trim();
    const deTrimmed = deVal.trim();
    if (rxTrimmed === "-|-" || deTrimmed === "-|-" || rxTrimmed === "- | -" || deTrimmed === "- | -") {
      return 'partial'; // Yellow for -|- values
    }
    
    // Check for exact match first
    if (rxTrimmed.toLowerCase() === deTrimmed.toLowerCase()) {
      return 'match';
    }

    switch (label) {
      case "Name": {
        const nameMatch = compareNames(rxVal, deVal);
        if (nameMatch) return 'match';
        // Check if names are partially similar
        const tokens1 = parseName(rxVal);
        const tokens2 = parseName(deVal);
        if (tokens1.length > 0 && tokens2.length > 0) {
          const matchCount = tokens1.filter(t1 => 
            tokens2.some(t2 => fuzzyMatch(t1, t2, 3))
          ).length;
          if (matchCount > 0 && matchCount < Math.min(tokens1.length, tokens2.length)) {
            return 'partial';
          }
        }
        return 'mismatch';
      }

      case "DOB": {
        const rxDate = extractDate(rxVal);
        const deDate = extractDate(deVal);
        if (fuzzyMatch(rxDate, deDate, 0)) return 'match';
        if (fuzzyMatch(rxDate, deDate, 2)) return 'partial';
        return 'mismatch';
      }

      case "Address": {
        if (compareAddresses(rxVal, deVal)) return 'match';
        // Check for partial match
        const tokens1 = parseAddressDetailed(rxVal);
        const tokens2 = parseAddressDetailed(deVal);
        if (tokens1.length > 0 && tokens2.length > 0) {
          const matchCount = tokens1.filter(t1 => 
            tokens2.some(t2 => fuzzyMatch(t1, t2, 2))
          ).length;
          const minLen = Math.min(tokens1.length, tokens2.length);
          if (matchCount >= minLen / 2) return 'partial';
        }
        return 'mismatch';
      }

      case "Phone":
      case "Fax": {
        const rxPhone = normalizePhone(rxVal);
        const dePhone = normalizePhone(deVal);
        if (rxPhone === dePhone) return 'match';
        // Check if numbers are similar (off by 1-2 digits)
        if (rxPhone.length === dePhone.length) {
          let diffCount = 0;
          for (let i = 0; i < rxPhone.length; i++) {
            if (rxPhone[i] !== dePhone[i]) diffCount++;
          }
          if (diffCount <= 2) return 'partial';
        }
        return 'mismatch';
      }

      case "Written Date":
      case "Exp Date": {
        // Special case for Exp Date: if prescribed column has "-", mark as match
        if (label === "Exp Date" && rxVal.trim() === "-") {
          return 'match';
        }
        if (fuzzyMatch(rxVal, deVal, 0)) return 'match';
        if (fuzzyMatch(rxVal, deVal, 3)) return 'partial';
        return 'mismatch';
      }

      case "Drug": {
        const rxWords = rxVal.split(/\s+/);
        const deWords = deVal.split(/\s+/);
        
        // Check if first two words match
        if (rxWords.length >= 2 && deWords.length >= 2) {
          const firstTwoRx = (rxWords[0] + " " + rxWords[1]).toLowerCase();
          const firstTwoDe = (deWords[0] + " " + deWords[1]).toLowerCase();
          if (fuzzyMatch(firstTwoRx, firstTwoDe, 2)) return 'match';
        }
        
        // Check if strength numbers from RX drug match DE strength
        const rxNums = extractNumbers(rxVal);
        const deStrengthNums = extractNumbers(allDeFields['DE Strength | Form'] || "");
        if (rxNums && deStrengthNums && rxNums === deStrengthNums) {
          return 'match';
        }
        
        // Check parentheses content
        const parenthesesMatch = rxVal.match(/\(([^)]+)\)/);
        if (parenthesesMatch) {
          const insideParen = parenthesesMatch[1].trim().toLowerCase();
          if (
            deVal.toLowerCase().includes(insideParen) ||
            (allDeFields['DE Strength | Form'] || "").toLowerCase().includes(insideParen)
          ) {
            return 'match';
          }
        }
        
        if (fuzzyMatch(rxVal, deVal, 3)) return 'match';
        if (fuzzyMatch(rxVal, deVal, 5)) return 'partial';
        return 'mismatch';
      }

      case "Strength | Form": {
        // Special case: if prescribed column has "-1-", mark as match
        if (rxVal.includes("-1-")) {
          return 'match';
        }
        // Check for special dash pattern
        const hasDashPattern = rxVal.includes("-|-");
        if (hasDashPattern) {
          const rxStrFormNums = extractNumbers(rxVal);
          const rxDrugNums = extractNumbers(allRxFields['Rx Drug'] || "");
          if (rxStrFormNums && rxDrugNums && rxStrFormNums === rxDrugNums) {
            return 'match';
          }
        }
        if (fuzzyMatch(rxVal, deVal, 2)) return 'match';
        if (fuzzyMatch(rxVal, deVal, 4)) return 'partial';
        return 'mismatch';
      }

      case "DAW": {
        const rxDawNum = rxVal.match(/\d+/);
        const deDawNum = deVal.match(/\d+/);
        if (rxDawNum && deDawNum) {
          if (rxDawNum[0] === deDawNum[0]) return 'match';
          return 'mismatch';
        }
        if (fuzzyMatch(rxVal, deVal, 0)) return 'match';
        if (fuzzyMatch(rxVal, deVal, 1)) return 'partial';
        return 'mismatch';
      }

      case "Sig": {
        const rxNorm = normalizeSig(rxVal);
        const deNorm = normalizeSig(deVal);
        if (fuzzyMatch(rxNorm, deNorm, 5)) return 'match';
        if (fuzzyMatch(rxNorm, deNorm, 10)) return 'partial';
        return 'mismatch';
      }

      case "Quantity | UOM": {
        const rxQty = extractNumbers(rxVal);
        const deQty = extractNumbers(deVal);
        if (rxQty && deQty && rxQty === deQty) {
          return 'match';
        }
        if (fuzzyMatch(rxVal, deVal, 0)) return 'match';
        if (fuzzyMatch(rxVal, deVal, 2)) return 'partial';
        return 'mismatch';
      }

      case "Refills": {
        const rxNums = extractNumbers(rxVal);
        const deNums = extractNumbers(deVal);
        if (rxNums && deNums) {
          if (rxNums === deNums) return 'match';
          return 'mismatch';
        }
        if (fuzzyMatch(rxVal, deVal, 0)) return 'match';
        return 'mismatch';
      }

      case "Days Supply": {
        // Special case: if prescribed column has "-1-", mark as match
        if (rxVal.includes("-1-")) {
          return 'match';
        }
        // Special case: if prescribed column has "-", mark as match
        if (rxVal.trim() === "-") {
          return 'match';
        }
        const rxNums = extractNumbers(rxVal);
        const deNums = extractNumbers(deVal);
        if (rxNums && deNums) {
          if (rxNums === deNums) return 'match';
          return 'mismatch';
        }
        if (fuzzyMatch(rxVal, deVal, 0)) return 'match';
        return 'mismatch';
      }

      default: {
        if (fuzzyMatch(rxVal, deVal, 2)) return 'match';
        if (fuzzyMatch(rxVal, deVal, 4)) return 'partial';
        return 'mismatch';
      }
    }
  };


  // File handling for prescriptions
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    // Only accept single image files
    if (file && file.type.startsWith('image/')) {
      setIsFolderUpload(false);
      setSelectedFiles([file]);
      setCurrentFileIndex(0);
      setAllAnalysisResults([]);
      setSelectedFile(file);
      
      // Create preview for the image
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
      
      // Auto-analyze after file selection
      setTimeout(() => {
        analyzeDocument(file);
      }, 500);
    } else if (file) {
      // Alert if non-image file selected
      alert('Please select a valid image file (JPG, PNG).');
      removeFile();
    } else {
      // Clear any existing state if no file
      removeFile();
    }
  };

  // File handling for supplies comparison
  const handleSupplyFileSelect = (event, type) => {
    const file = event.target.files[0];
    
    if (file && file.type.startsWith('image/')) {
      if (type === 'previous') {
        setPreviousSupplyFile(file);
        createPreview(file, setPreviousSupplyPreview);
      } else if (type === 'current') {
        setCurrentSupplyFile(file);
        createPreview(file, setCurrentSupplyPreview);
      }
      setSuppliesError(null);
    } else if (file) {
      setSuppliesError('Please select a valid image file (JPG, PNG) for supplies.');
    }
  };
  
  const createPreview = (file, setPreview) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle paste event for supplies upload - now supports multiple files
  const handleSupplyPaste = async (e, type) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(item => 
      item.type.startsWith('image/') || 
      item.kind === 'file' && item.type.match(/^image\//)
    );
    
    if (imageItem) {
      e.preventDefault();
      const blob = imageItem.getAsFile();
      if (blob) {
        // Convert blob to File object with a name
        const file = new File([blob], `pasted-screenshot-${Date.now()}.png`, { 
          type: blob.type || 'image/png' 
        });
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          if (type === 'previous') {
            setPreviousSupplyFiles([...previousSupplyFiles, file]);
            setPreviousSupplyPreviews([...previousSupplyPreviews, e.target.result]);
          } else if (type === 'current') {
            setCurrentSupplyFiles([...currentSupplyFiles, file]);
            setCurrentSupplyPreviews([...currentSupplyPreviews, e.target.result]);
          }
          setSuppliesError(null);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeFile = () => {
    // Batch state updates to prevent flickering
    setSelectedFile(null);
    setSelectedFiles([]);
    setPreviewUrl(null);
    setAnalysisResults(null);
    setAllAnalysisResults([]);
    setCurrentFileIndex(0);
    setShowDEAAlert(false);
    setShowNeedlesAlert(false);
    setIsFolderUpload(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeSupplyFile = (type, index = null) => {
    if (type === 'previous') {
      if (index !== null) {
        // Remove specific file
        setPreviousSupplyFiles(previousSupplyFiles.filter((_, i) => i !== index));
        setPreviousSupplyPreviews(previousSupplyPreviews.filter((_, i) => i !== index));
      } else {
        // Remove all previous files
        setPreviousSupplyFiles([]);
        setPreviousSupplyPreviews([]);
      }
    } else if (type === 'current') {
      if (index !== null) {
        // Remove specific file
        setCurrentSupplyFiles(currentSupplyFiles.filter((_, i) => i !== index));
        setCurrentSupplyPreviews(currentSupplyPreviews.filter((_, i) => i !== index));
      } else {
        // Remove all current files
        setCurrentSupplyFiles([]);
        setCurrentSupplyPreviews([]);
      }
    } else {
      // Remove all
      setPreviousSupplyFiles([]);
      setCurrentSupplyFiles([]);
      setPreviousSupplyPreviews([]);
      setCurrentSupplyPreviews([]);
      setSuppliesComparisonResults(null);
      setSuppliesError(null);
    }
  };
  
  const resetSuppliesAnalyzer = () => {
    // Clear all supplies-related state
    setPreviousSupplyFiles([]);
    setCurrentSupplyFiles([]);
    setPreviousSupplyPreviews([]);
    setCurrentSupplyPreviews([]);
    setSuppliesComparisonResults(null);
    setSuppliesError(null);
    setIsAnalyzingSupplies(false);
    setActiveFilter(null); // Reset filter
    
    // Reset paste focus states
    setIsPasteFocused({ previous: false, current: false });
  };
  
  // Alias for handleResetSupplies (used in the results section)
  const handleResetSupplies = resetSuppliesAnalyzer;
  
  const handleReset = () => {
    // Prevent multiple rapid resets
    if (isResetting) return;
    
    setIsResetting(true);
    
    // Clear any existing reset timeout
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    
    // Clean any animations
    gsap.killTweensOf('*');
    
    // Use React's batch update to prevent multiple renders
    // All state updates will happen in a single render cycle
    React.startTransition(() => {
      setIsAnalyzing(false);
      setAnalysisResults(null);
      setAllAnalysisResults([]);
      setCurrentFileIndex(0);
      setShowImageModal(false);
      setSelectedFile(null);
      setSelectedFiles([]);
      setPreviewUrl(null);
      setShowDEAAlert(false);
      setShowNeedlesAlert(false);
      setIsFolderUpload(false);
      setSelectedSupplyFile(null);
      setSupplyPreviewUrl(null);
      setPreviousSupplyFile(null);
      setCurrentSupplyFile(null);
      setPreviousSupplyPreview(null);
      setCurrentSupplyPreview(null);
      setSuppliesComparisonResults(null);
      setSuppliesError(null);
    });
    
    // Clear file inputs immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (supplyFileInputRef.current) {
      supplyFileInputRef.current.value = '';
    }
    if (previousSupplyInputRef.current) {
      previousSupplyInputRef.current.value = '';
    }
    if (currentSupplyInputRef.current) {
      currentSupplyInputRef.current.value = '';
    }
    
    // Reset the flag after a short delay to prevent rapid clicks
    resetTimeoutRef.current = setTimeout(() => {
      setIsResetting(false);
    }, 300);
  };

  // Simple animation for analyzing
  useEffect(() => {
    if (isAnalyzing) {
      // Auto complete after 3 seconds for demo
      const timeout = setTimeout(() => {
        setIsAnalyzing(false);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [isAnalyzing]);

  // Cleanup reset timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  // Azure API integration
  const analyzeDocument = async (file = selectedFile) => {
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResults(null);

    const subscriptionKey = 'lKofhFkerlrVZBc0FoAjuIZ4jX7Y2O6wqN8o57o7tNsExWqnY2HbJQQJ99BCAC1i4TkXJ3w3AAALACOGvEb9';
    const endpoint = 'https://kaliii.cognitiveservices.azure.com/';
    const analyzeUrl = `${endpoint}formrecognizer/documentModels/cute:analyze?api-version=2023-07-31`;

    try {
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'Ocp-Apim-Subscription-Key': subscriptionKey
        },
        body: file
      });

      const operationLocation = response.headers.get('operation-location');
      
      // Poll for results
      let result;
      do {
        await new Promise(r => setTimeout(r, 2000));
        const resultResponse = await fetch(operationLocation, {
          headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey }
        });
        result = await resultResponse.json();
      } while (result.status === 'running' || result.status === 'notStarted');

      if (result.status === 'succeeded') {
        processResults(result.analyzeResult.documents[0].fields);
      } else {
        console.error('Analysis failed:', result.error);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error analyzing document:', error);
      setIsAnalyzing(false);
    }
  };

  // Analyze multiple documents from folder
  const analyzeAllDocuments = async (files) => {
    setIsAnalyzing(true);
    setAllAnalysisResults([]);
    
    const subscriptionKey = 'lKofhFkerlrVZBc0FoAjuIZ4jX7Y2O6wqN8o57o7tNsExWqnY2HbJQQJ99BCAC1i4TkXJ3w3AAALACOGvEb9';
    const endpoint = 'https://kaliii.cognitiveservices.azure.com/';
    const analyzeUrl = `${endpoint}formrecognizer/documentModels/cute:analyze?api-version=2023-07-31`;
    
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setCurrentFileIndex(i);
      
      // Update preview for current file
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
      
      try {
        const response = await fetch(analyzeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': file.type,
            'Ocp-Apim-Subscription-Key': subscriptionKey
          },
          body: file
        });

        const operationLocation = response.headers.get('operation-location');
        
        // Poll for results
        let result;
        do {
          await new Promise(r => setTimeout(r, 2000));
          const resultResponse = await fetch(operationLocation, {
            headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey }
          });
          result = await resultResponse.json();
        } while (result.status === 'running' || result.status === 'notStarted');

        if (result.status === 'succeeded') {
          const fields = result.analyzeResult.documents[0].fields;
          const processedResult = processResultsForBatch(fields, file.name);
          results.push(processedResult);
          setAllAnalysisResults([...results]);
        }
      } catch (error) {
        console.error(`Error analyzing ${file.name}:`, error);
      }
    }
    
    setIsAnalyzing(false);
  };

  const processResults = (fields) => {
    const results = {};
    
    // Extract all fields with proper handling
    Object.entries(fields).forEach(([key, value]) => {
      // Handle both valueString and content properties
      results[key] = value?.valueString || value?.content || '';
    });

    setAnalysisResults(results);
    setIsAnalyzing(false);

    // Check for alerts
    const rxDea = (results['RX Doctor DEA'] || "").trim().toUpperCase();
    const deDea = (results['DE Doctor DEA'] || "").trim().toUpperCase();
    
    if ((rxDea.startsWith("M") && rxDea.length > 0) || (deDea.startsWith("M") && deDea.length > 0)) {
      setShowDEAAlert(true);
    }

    // Check for needles in drug name
    const rxDrug = results['Rx Drug'] || "";
    const deDrug = results['DE Drug'] || "";
    const needleRegex = /\bneedle(s)?\b/i;
    
    if (needleRegex.test(rxDrug) || needleRegex.test(deDrug)) {
      setShowNeedlesAlert(true);
    }
  };

  const processResultsForBatch = (fields, fileName) => {
    const results = {};
    
    // Extract all fields with proper handling
    Object.entries(fields).forEach(([key, value]) => {
      // Handle both valueString and content properties
      results[key] = value?.valueString || value?.content || '';
    });

    // Check for alerts
    const rxDea = (results['RX Doctor DEA'] || "").trim().toUpperCase();
    const deDea = (results['DE Doctor DEA'] || "").trim().toUpperCase();
    
    const hasDeaAlert = (rxDea.startsWith("M") && rxDea.length > 0) || (deDea.startsWith("M") && deDea.length > 0);

    // Check for needles in drug name
    const rxDrug = results['Rx Drug'] || "";
    const deDrug = results['DE Drug'] || "";
    const needleRegex = /\bneedle(s)?\b/i;
    
    const hasNeedlesAlert = needleRegex.test(rxDrug) || needleRegex.test(deDrug);

    return {
      fileName,
      results,
      hasDeaAlert,
      hasNeedlesAlert
    };
  };

  // Supplies Analysis Functions - now supports multiple files
  const analyzeSupplies = async () => {
    if (previousSupplyFiles.length === 0 || currentSupplyFiles.length === 0) {
      setSuppliesError('Please upload at least one screenshot for both previous and current orders');
      return;
    }
    
    console.log('Starting supplies analysis...');
    console.log('Previous files:', previousSupplyFiles.length);
    console.log('Current files:', currentSupplyFiles.length);
    
    setIsAnalyzingSupplies(true);
    setSuppliesError(null);
    setSuppliesComparisonResults(null);
    setAnalysisProgress('Connecting to Azure Document Intelligence...');
    
    const suppliesEndpoint = 'https://supplies-analyzer-custom2.cognitiveservices.azure.com/';
    const suppliesApiKey = '03f80f22ae65405b9aac9bbed2048244';
    // Using Lion-Heart custom trained model only
    const modelId = 'Lion-Heart';
    const apiVersion = '2023-07-31'; // Using stable API version
    
    try {
      // Test connection to Azure first
      console.log('Testing connection to Azure Document Intelligence...');
      const testUrl = `${suppliesEndpoint}formrecognizer/info?api-version=${apiVersion}`;
      
      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Ocp-Apim-Subscription-Key': suppliesApiKey
          }
        });
        
        if (!testResponse.ok) {
          console.error('Azure connection test failed:', testResponse.status);
          if (testResponse.status === 401) {
            throw new Error('API key authentication failed. Please check the API key.');
          } else if (testResponse.status === 403) {
            throw new Error('Access forbidden. The API key may not have the required permissions.');
          }
        } else {
          console.log('Azure connection test successful');
          setAnalysisProgress('Connection established. Starting document analysis...');
        }
      } catch (testErr) {
        console.error('Connection test error:', testErr);
        if (testErr.name === 'TypeError' && testErr.message.includes('Failed to fetch')) {
          throw new Error('Unable to connect to Azure. Please check your internet connection and try again.');
        }
        throw testErr;
      }
      // Analyze all previous order documents
      console.log('=== STARTING SUPPLIES ANALYSIS ===');
      console.log(`Step 1: Analyzing ${previousSupplyFiles.length} previous order document(s)...`);
      
      // OPTIMIZATION 1 & 7: Process ALL files in parallel (both previous and current)
      const totalFiles = previousSupplyFiles.length + currentSupplyFiles.length;
      setAnalysisProgress(`Analyzing ${totalFiles} documents in parallel...`);
      
      // Track progress
      let completedFiles = 0;
      const updateProgress = () => {
        completedFiles++;
        const percentage = Math.round((completedFiles / totalFiles) * 100);
        setAnalysisProgress(`Analyzing documents: ${completedFiles}/${totalFiles} complete (${percentage}%)...`);
      };
      
      // Create promises for all files
      const allPromises = [];
      
      // Process all previous files
      const previousPromises = previousSupplyFiles.map((file, index) => {
        console.log(`Starting analysis of previous file ${index + 1}/${previousSupplyFiles.length}: ${file.name}`);
        return analyzeSupplyDocument(file, suppliesEndpoint, suppliesApiKey, modelId, apiVersion)
          .then(data => {
            updateProgress();
            console.log(`Completed previous file ${index + 1}: ${file.name}, extracted ${data.length} items`);
            return { type: 'previous', data };
          })
          .catch(err => {
            console.error(`Failed to analyze previous file ${file.name}:`, err);
            throw err;
          });
      });
      
      // Process all current files
      const currentPromises = currentSupplyFiles.map((file, index) => {
        console.log(`Starting analysis of current file ${index + 1}/${currentSupplyFiles.length}: ${file.name}`);
        return analyzeSupplyDocument(file, suppliesEndpoint, suppliesApiKey, modelId, apiVersion)
          .then(data => {
            updateProgress();
            console.log(`Completed current file ${index + 1}: ${file.name}, extracted ${data.length} items`);
            return { type: 'current', data };
          })
          .catch(err => {
            console.error(`Failed to analyze current file ${file.name}:`, err);
            throw err;
          });
      });
      
      // Run all analyses in parallel
      allPromises.push(...previousPromises, ...currentPromises);
      const allResults = await Promise.all(allPromises);
      
      // Separate results by type
      const allPreviousData = allResults
        .filter(r => r.type === 'previous')
        .flatMap(r => r.data);
      
      const allCurrentData = allResults
        .filter(r => r.type === 'current')
        .flatMap(r => r.data);
      
      console.log('Analysis Complete:');
      console.log('- Previous order data extracted:', allPreviousData.length, 'items total');
      console.log('- Current order data extracted:', allCurrentData.length, 'items total');
      
      // Debug log the extracted data
      console.log('\n=== EXTRACTED PREVIOUS ORDERS ===');
      allPreviousData.forEach((order, idx) => {
        console.log(`${idx + 1}. RX: ${order.rxNumber}, Med: "${order.medication}", Prescriber: "${order.prescriber}", Qty: "${order.quantity}", Days: "${order.daySupply}"`);
      });
      
      console.log('\n=== EXTRACTED CURRENT ORDERS ===');
      allCurrentData.forEach((order, idx) => {
        console.log(`${idx + 1}. RX: ${order.rxNumber}, Med: "${order.medication}", Prescriber: "${order.prescriber}", Qty: "${order.quantity}", Days: "${order.daySupply}"`);
      });
      
      // Additional debug: Check for duplicate values in extracted data
      console.log('\n=== CHECKING FOR DUPLICATE VALUES IN EXTRACTED DATA ===');
      [...allPreviousData, ...allCurrentData].forEach((order, idx) => {
        const duplicateFields = [];
        if (order.quantity && order.quantity.match(/(\d+)\s+\1/)) duplicateFields.push(`quantity: "${order.quantity}"`);
        if (order.daySupply && order.daySupply.match(/(\d+)\s+\1/)) duplicateFields.push(`daySupply: "${order.daySupply}"`);
        if (duplicateFields.length > 0) {
          console.log(`Order ${idx}: ${order.medication} has duplicate values:`, duplicateFields.join(', '));
        }
      });
      
      // Extract tables and compare
      setAnalysisProgress('Comparing orders...');
      const comparison = compareSupplyTables(allPreviousData, allCurrentData);
      console.log('Comparison results:', {
        previousCount: comparison.previousOrders.length,
        currentCount: comparison.currentOrders.length,
        matching: comparison.summary.matching,
        changed: comparison.summary.changed,
        new: comparison.summary.new,
        missing: comparison.summary.missing
      });
      
      // Debug: Log sample data to verify qty and days fields
      if (comparison.previousOrders.length > 0) {
        console.log('Sample previous order data:', comparison.previousOrders[0]);
      }
      if (comparison.currentOrders.length > 0) {
        console.log('Sample current order data:', comparison.currentOrders[0]);
      }
      
      // Check if no data was extracted
      if (allPreviousData.length === 0 && allCurrentData.length === 0) {
        console.error('No orders were extracted from any document');
        console.log('Debug: Check if Lion-Heart model is returning data in a different format');
        setSuppliesError('Unable to extract order data from the uploaded screenshots. The Lion-Heart model may need to be retrained or the data format may be different.');
        setIsAnalyzingSupplies(false);
        setAnalysisProgress('');
        return;
      }
      
      setSuppliesComparisonResults(comparison);
      setAnalysisProgress('Analysis complete!');
      
    } catch (err) {
      console.error('Supplies analysis error:', err);
      console.error('Error type:', err.name);
      console.error('Error stack:', err.stack);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to analyze supply documents: ';
      
      if (err.name === 'AbortError') {
        errorMessage += 'Request timed out after 60 seconds. Please try with smaller images or check your internet connection.';
      } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        errorMessage += 'Network connection error. This could be due to:\n• No internet connection\n• CORS blocking the request\n• Azure service is unreachable\n• Firewall blocking the request';
      } else if (err.message.includes('401')) {
        errorMessage += 'Authentication failed. The API key may be invalid or expired.';
      } else if (err.message.includes('403')) {
        errorMessage += 'Access forbidden. The API key may not have permission to access this resource.';
      } else if (err.message.includes('404') || (err.message.includes('Model') && err.message.includes('not found'))) {
        errorMessage += 'The Lion-Heart model was not found. Please ensure the model exists in your Azure Document Intelligence resource.';
      } else if (err.message.includes('429')) {
        errorMessage += 'Too many requests. Please wait a moment and try again.';
      } else if (err.message.includes('timed out')) {
        errorMessage += err.message;
      } else {
        errorMessage += err.message || 'Unknown error occurred';
      }
      
      setSuppliesError(errorMessage);
    } finally {
      setIsAnalyzingSupplies(false);
      setAnalysisProgress('');
    }
  };
  
  const analyzeSupplyDocument = async (file, endpoint, apiKey, modelId, apiVersion) => {
    // OPTIMIZATION 6: Check cache first
    const cacheKey = `${file.name}-${file.size}-${file.lastModified}`;
    if (analysisCache.current.has(cacheKey)) {
      console.log(`Using cached results for ${file.name}`);
      return analysisCache.current.get(cacheKey);
    }
    
    // Check file size (max 4MB for better performance)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      throw new Error(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use images under 4MB for better performance.`);
    }
    
    // Ensure endpoint ends with /
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint : endpoint + '/';
    const analyzeUrl = `${cleanEndpoint}formrecognizer/documentModels/${modelId}:analyze?api-version=${apiVersion}`;
    
    console.log('=== Starting Document Analysis ===');
    console.log('Analyzing document with model:', modelId);
    console.log('Full Azure URL:', analyzeUrl);
    console.log('File name:', file.name);
    console.log('File size:', file.size, 'bytes');
    console.log('File type:', file.type);
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('Request timeout - aborting after 30 seconds');
      controller.abort();
    }, 30000); // OPTIMIZATION 3: Reduced to 30 second timeout for initial request
    
    try {
      console.log('Sending POST request to Azure...');
      const startTime = Date.now();
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': apiKey
        },
        body: file,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const requestTime = Date.now() - startTime;
      console.log(`Initial request completed in ${requestTime}ms, status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure API error response:', errorText);
        console.error('Response status:', response.status);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.status === 404) {
          // Try to parse error for more details
          try {
            const errorObj = JSON.parse(errorText);
            if (errorObj.error?.code === 'ModelNotFound') {
              throw new Error(`Model '${modelId}' not found. The Lion-Heart model may have been deleted or renamed. Please contact support.`);
            }
          } catch (e) {
            // If parsing fails, use generic message
          }
          throw new Error(`Model '${modelId}' not found. Please ensure the model exists in your Azure Document Intelligence resource.`);
        } else if (response.status === 401) {
          throw new Error('Authentication failed. The API key may be invalid or expired.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. The API key may not have permission to access this model.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        } else {
          throw new Error(`Azure API error: ${response.status} - ${errorText}`);
        }
      }
      
      const operationLocation = response.headers.get('operation-location');
    
    if (!operationLocation) {
      throw new Error('No operation location returned from Azure');
    }
    
    console.log('Operation location:', operationLocation);
    
    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts max
    
    console.log('Starting to poll for results...');
    
    // OPTIMIZATION 2: Use exponential backoff for polling
    const getPollingDelay = (attemptNum) => {
      // Start with 500ms, increase to max 2000ms
      return Math.min(500 + (attemptNum * 100), 2000);
    };
    
    try {
      do {
        const delay = getPollingDelay(attempts);
        await new Promise(r => setTimeout(r, delay));
        console.log(`Polling attempt ${attempts + 1}/${maxAttempts} (delay: ${delay}ms)...`);
        
        // Add timeout for each polling request
        const pollController = new AbortController();
        const pollTimeoutId = setTimeout(() => pollController.abort(), 5000); // Reduced to 5 second timeout per poll
        
        try {
          const resultResponse = await fetch(operationLocation, {
            headers: { 'Ocp-Apim-Subscription-Key': apiKey },
            signal: pollController.signal
          });
          
          clearTimeout(pollTimeoutId);
          
          if (!resultResponse.ok) {
            const errorText = await resultResponse.text();
            console.error('Polling error:', errorText);
            throw new Error(`Failed to get analysis results: ${resultResponse.status}`);
          }
          
          result = await resultResponse.json();
          console.log('Current status:', result.status);
        } catch (pollError) {
          clearTimeout(pollTimeoutId);
          if (pollError.name === 'AbortError') {
            console.error('Poll request timed out, retrying...');
            attempts++;
            continue;
          }
          throw pollError;
        }
        
        attempts++;
      } while ((result.status === 'running' || result.status === 'notStarted') && attempts < maxAttempts);
    } catch (pollError) {
      console.error('Error during polling:', pollError);
      throw new Error(`Polling failed: ${pollError.message}`);
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Document analysis timed out after 2 minutes. Please try again with smaller images or contact support.');
    }
    
    if (result.status !== 'succeeded') {
      console.error('Analysis failed with status:', result.status);
      if (result.analyzeResult?.errors) {
        console.error('Errors:', result.analyzeResult.errors);
      }
      throw new Error(`Document analysis failed with status: ${result.status}`);
    }
    
    console.log('Azure Document Intelligence Result:', {
      hasDocuments: !!(result.analyzeResult.documents && result.analyzeResult.documents.length > 0),
      documentCount: result.analyzeResult.documents?.length || 0,
      hasTables: !!(result.analyzeResult.tables && result.analyzeResult.tables.length > 0),
      tableCount: result.analyzeResult.tables?.length || 0,
      modelId: modelId,
      analyzeResultKeys: Object.keys(result.analyzeResult || {})
    });
    
    // Debug: Check for other possible data locations
    if (result.analyzeResult) {
      console.log('AnalyzeResult structure:', {
        hasPages: !!result.analyzeResult.pages,
        pageCount: result.analyzeResult.pages?.length || 0,
        hasKeyValuePairs: !!result.analyzeResult.keyValuePairs,
        hasEntities: !!result.analyzeResult.entities,
        hasStyles: !!result.analyzeResult.styles
      });
    }
    
    // Debug: Log the full structure for investigation
    if (result.analyzeResult.documents && result.analyzeResult.documents.length > 0) {
      console.log('Document fields structure:', JSON.stringify(result.analyzeResult.documents[0].fields, null, 2));
    }
    if (result.analyzeResult.tables && result.analyzeResult.tables.length > 0) {
      console.log('First table info:', {
        rowCount: result.analyzeResult.tables[0].rowCount,
        columnCount: result.analyzeResult.tables[0].columnCount,
        cellCount: result.analyzeResult.tables[0].cells?.length
      });
    }
    
    // Check if we have custom model results (documents with fields) or table results
    let extractedData = [];
    
    if (result.analyzeResult.documents && result.analyzeResult.documents.length > 0 && 
        result.analyzeResult.documents[0].fields && 
        Object.keys(result.analyzeResult.documents[0].fields).length > 0) {
      // Custom model with extracted fields
      console.log('Using custom model field extraction');
      extractedData = extractSupplyFieldData(result.analyzeResult.documents[0].fields);
    } else if (result.analyzeResult.tables && result.analyzeResult.tables.length > 0) {
      // Fallback to table extraction if no custom fields
      console.log('Using table extraction (no custom fields found or Lion-Heart returns tables)');
      extractedData = extractSupplyTableData(result.analyzeResult);
    } else if (result.analyzeResult.keyValuePairs && result.analyzeResult.keyValuePairs.length > 0) {
      // Check if Lion-Heart returns key-value pairs
      console.log('Found key-value pairs, count:', result.analyzeResult.keyValuePairs.length);
      console.log('Sample key-value pair:', result.analyzeResult.keyValuePairs[0]);
      // For now, return empty array but log the structure
      extractedData = [];
    } else {
      console.warn('No documents, tables, or key-value pairs found in analyze result');
      console.log('Full analyze result keys:', Object.keys(result.analyzeResult));
      // Log a sample of the structure without stringifying the whole thing
      if (result.analyzeResult.pages) {
        console.log('Pages found:', result.analyzeResult.pages.length);
      }
      extractedData = [];
    }
    
    // Store in cache before returning
    analysisCache.current.set(cacheKey, extractedData);
    console.log(`Cached results for ${file.name} (${extractedData.length} items)`);
    
    return extractedData;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Request timed out after 60 seconds');
        throw new Error('Request to Azure timed out after 60 seconds. This could be due to large file size or slow connection. Please try with smaller images.');
      }
      console.error('Error during document analysis:', error);
      throw error;
    }
  };
  
  // Extract supply data from custom model fields
  const extractSupplyFieldData = (fields) => {
    console.log('Raw fields structure:', JSON.stringify(fields, null, 2));
    console.log('Available fields:', Object.keys(fields));
    
    if (!fields || Object.keys(fields).length === 0) {
      console.warn('No fields found in document');
      return [];
    }
    
    const orders = [];
    
    // Helper function to get field value - handles Azure Document Intelligence field structure
    const getFieldValue = (field) => {
      if (!field) return '';
      // Azure DI fields have different structures based on type
      if (field.type === 'string') return field.valueString || '';
      if (field.type === 'number') return field.valueNumber?.toString() || '';
      if (field.type === 'date') return field.valueDate || '';
      if (field.type === 'time') return field.valueTime || '';
      if (field.type === 'array' && field.valueArray) {
        // Handle array fields - extract values from each element
        return field.valueArray.map(item => getFieldValue(item)).join(', ');
      }
      if (field.type === 'object' && field.valueObject) {
        // Handle nested object fields
        return JSON.stringify(field.valueObject);
      }
      // Fallback for other types
      return field.content || field.value || field.valueString || '';
    };
    
    // Your model likely returns a table/array field - check for common field names
    const possibleTableFields = ['table', 'orders', 'items', 'data', 'results'];
    
    // First check the common table field names
    for (const fieldName of possibleTableFields) {
      if (fields[fieldName] && fields[fieldName].type === 'array') {
        console.log(`Found table field: ${fieldName}`);
        
        fields[fieldName].valueArray.forEach((row, idx) => {
          if (row.type === 'object' && row.valueObject) {
            const rowData = row.valueObject;
            console.log(`Row ${idx} data keys:`, Object.keys(rowData));
            
            const order = {
              // Try different possible field names for each field
              rxNumber: getFieldValue(rowData['Rx Number']) || 
                       getFieldValue(rowData['RxNumber']) || 
                       getFieldValue(rowData['rx_number']) || 
                       getFieldValue(rowData['RX']) || '',
              org: getFieldValue(rowData['Org']) || 
                   getFieldValue(rowData['Organization']) || 
                   getFieldValue(rowData['org']) || '',
              medication: getFieldValue(rowData['Medication']) || 
                         getFieldValue(rowData['Drug']) || 
                         getFieldValue(rowData['medication']) || '',
              prescriber: getFieldValue(rowData['MD Last Name']) || 
                         getFieldValue(rowData['Prescriber']) || 
                         getFieldValue(rowData['Doctor']) || 
                         getFieldValue(rowData['MD']) || '',
              strength: getFieldValue(rowData['Strength']) || 
                       getFieldValue(rowData['strength']) || '',
              dosageForm: getFieldValue(rowData['Dosage Form']) || 
                         getFieldValue(rowData['DosageForm']) || 
                         getFieldValue(rowData['Form']) || '',
              quantity: getFieldValue(rowData['Quantity Dispensed']) || 
                       getFieldValue(rowData['Quantity']) || 
                       getFieldValue(rowData['Qty']) || 
                       getFieldValue(rowData['quantity']) || '',
              daySupply: getFieldValue(rowData['Day Supply']) || 
                        getFieldValue(rowData['Days']) || 
                        getFieldValue(rowData['DaySupply']) || 
                        getFieldValue(rowData['days']) || ''
            };
            
            console.log('Extracted order:', order);
            if (order.rxNumber || order.medication) {
              orders.push(order);
            }
          }
        });
        
        if (orders.length > 0) {
          break; // Found the table, stop looking
        }
      }
    }
    
    // If no common table field found, check all fields for arrays
    if (orders.length === 0) {
      console.log('No common table field found, checking all fields...');
      const fieldKeys = Object.keys(fields);
      
      for (const key of fieldKeys) {
        const field = fields[key];
        
        // If this field contains an array of table rows
        if (field.type === 'array' && field.valueArray && field.valueArray.length > 0) {
          console.log(`Found array field: ${key}`);
          
          field.valueArray.forEach((row, idx) => {
            if (row.type === 'object' && row.valueObject) {
              const rowData = row.valueObject;
              console.log(`Row ${idx} data keys:`, Object.keys(rowData));
              
              const order = {
                // Try different possible field names for each field
                rxNumber: getFieldValue(rowData['Rx Number']) || 
                         getFieldValue(rowData['RxNumber']) || 
                         getFieldValue(rowData['rx_number']) || 
                         getFieldValue(rowData['RX']) || '',
                org: getFieldValue(rowData['Org']) || 
                     getFieldValue(rowData['Organization']) || 
                     getFieldValue(rowData['org']) || '',
                medication: getFieldValue(rowData['Medication']) || 
                           getFieldValue(rowData['Drug']) || 
                           getFieldValue(rowData['medication']) || '',
                prescriber: getFieldValue(rowData['MD Last Name']) || 
                           getFieldValue(rowData['Prescriber']) || 
                           getFieldValue(rowData['Doctor']) || 
                           getFieldValue(rowData['MD']) || '',
                strength: getFieldValue(rowData['Strength']) || 
                         getFieldValue(rowData['strength']) || '',
                dosageForm: getFieldValue(rowData['Dosage Form']) || 
                           getFieldValue(rowData['DosageForm']) || 
                           getFieldValue(rowData['Form']) || '',
                quantity: getFieldValue(rowData['Quantity Dispensed']) || 
                         getFieldValue(rowData['Quantity']) || 
                         getFieldValue(rowData['Qty']) || 
                         getFieldValue(rowData['quantity']) || '',
                daySupply: getFieldValue(rowData['Day Supply']) || 
                          getFieldValue(rowData['Days']) || 
                          getFieldValue(rowData['DaySupply']) || 
                          getFieldValue(rowData['days']) || ''
              };
              
              console.log('Extracted order:', order);
              if (order.rxNumber || order.medication) {
                orders.push(order);
              }
            }
          });
          
          if (orders.length > 0) {
            break; // Found data, stop looking
          }
        }
      }
    }
    
    console.log(`Extracted ${orders.length} orders`);
    return orders;
  };
  
  const extractSupplyTableData = (analyzeResult) => {
    console.log('Starting table extraction from analyzeResult');
    console.log('Number of tables found:', analyzeResult.tables?.length || 0);
    
    // Debug: Log the structure to understand what Lion-Heart returns
    console.log('AnalyzeResult keys:', Object.keys(analyzeResult));
    if (analyzeResult.content) {
      console.log('Content preview:', analyzeResult.content.substring(0, 200));
    }
    
    const tables = analyzeResult.tables || [];
    const allOrders = [];
    
    if (tables.length === 0) {
      console.warn('No tables found in analyze result');
      // Log what else is available in analyzeResult
      console.log('Available properties in analyzeResult:', Object.keys(analyzeResult));
      return allOrders;
    }
    
    // Helper function for enhanced content cleaning
    const cleanContent = (content) => {
      if (!content) return '';
      
      return content
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
        .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    };
    
    // Helper function to extract numeric values
    const extractNumeric = (value) => {
      if (!value) return '';
      // First try to extract just numbers
      const match = value.toString().match(/\d+(?:\.\d+)?/);
      if (match) return match[0];
      // If no numbers found, return the original value (it might be text like "N/A")
      return value.toString().trim();
    };
    
    // Process each table
    tables.forEach((table, tableIndex) => {
      if (!table.cells || table.cells.length === 0) {
        console.warn(`Table ${tableIndex + 1} has no cells`);
        return;
      }
      
      console.log(`Processing table ${tableIndex + 1} with ${table.cells.length} cells`);
      
      // Debug: Show first few cells raw data
      console.log('First 10 cells raw data:');
      table.cells.slice(0, 10).forEach((cell, idx) => {
        console.log(`Cell ${idx}: row=${cell.rowIndex}, col=${cell.columnIndex}, content="${cell.content?.substring(0, 50)}..."`)
      });
      
      try {
        // Step 1: Build complete cell matrix
        const maxRow = Math.max(...table.cells.map(c => c.rowIndex || 0));
        const maxCol = Math.max(...table.cells.map(c => c.columnIndex || 0));
        
        console.log(`Table dimensions: ${maxRow + 1} rows x ${maxCol + 1} columns`);
        
        // Create matrix to store all cells
        const cellMatrix = Array(maxRow + 1).fill(null).map(() => Array(maxCol + 1).fill(''));
        
        // Fill matrix with cells
        table.cells.forEach(cell => {
          const row = cell.rowIndex || 0;
          const col = cell.columnIndex || 0;
          const content = cleanContent(cell.content || '');
          
          // Handle cells that span multiple rows/columns
          const rowSpan = cell.rowSpan || 1;
          const colSpan = cell.columnSpan || 1;
          
          for (let r = 0; r < rowSpan; r++) {
            for (let c = 0; c < colSpan; c++) {
              const targetRow = row + r;
              const targetCol = col + c;
              
              if (targetRow <= maxRow && targetCol <= maxCol) {
                // Only set the cell value if it's empty to avoid duplicates
                // This prevents the "28 28" duplication issue
                if (!cellMatrix[targetRow][targetCol]) {
                  cellMatrix[targetRow][targetCol] = content;
                }
              }
            }
          }
        });
        
        // Debug: Log first few rows of the matrix
        console.log('First 5 rows of cell matrix:');
        for (let i = 0; i <= Math.min(4, maxRow); i++) {
          console.log(`Row ${i}:`, cellMatrix[i].map((cell, idx) => `[${idx}]: "${cell || '[empty]'}"`).join(' | '));
        }
        
        // Enhanced debug: Check for duplicate values in cells
        console.log('\nChecking for duplicate values in cells:');
        for (let row = 0; row <= Math.min(10, maxRow); row++) {
          for (let col = 0; col <= maxCol; col++) {
            const cellValue = cellMatrix[row][col];
            if (cellValue && cellValue.match(/(\d+)\s+\1/)) {
              console.log(`WARNING: Duplicate value found at [${row}][${col}]: "${cellValue}"`);
            }
          }
        }
        
        // Debug: Log all non-empty cells
        console.log('\nAll non-empty cells in table:');
        for (let row = 0; row <= Math.min(10, maxRow); row++) {
          for (let col = 0; col <= maxCol; col++) {
            if (cellMatrix[row][col]) {
              console.log(`Cell[${row}][${col}]: "${cellMatrix[row][col]}"`);
            }
          }
        }
        
        // Step 2: Identify column headers
        const columnHeaders = {};
        const headerToFieldMap = {};
        const fieldMap = getFieldMap();
        
        // Helper to normalize headers for matching
        const normalizeHeaderForMatching = (header) => {
          return header
            .toLowerCase()
            .replace(/[\n\r]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s#]/g, '')
            .trim();
        };
        
        // Helper to detect if a header contains multiple columns
        const splitCombinedHeaders = (header) => {
          const normalized = normalizeHeaderForMatching(header);
          
          // Common patterns where multiple headers are combined
          if (normalized.includes('strength') && normalized.includes('dosage') && normalized.includes('form')) {
            return ['strength', 'dosage form', 'quantity', 'days'];
          }
          if (normalized.includes('md') && normalized.includes('last') && normalized.includes('name')) {
            return ['prescriber', 'strength', 'dosage form'];
          }
          if (normalized.includes('quantity') && normalized.includes('dispensed')) {
            return ['quantity'];
          }
          
          // Check for simple "qty" or "days" headers
          if (normalized === 'qty') return ['quantity'];
          if (normalized === 'days' || normalized === 'days supply') return ['daySupply'];
          
          // Default: return as single header
          return [normalized];
        };
        
        // Track which columns have been assigned
        const assignedColumns = new Set();
        
        for (let col = 0; col <= maxCol; col++) {
          if (cellMatrix[0][col]) {
            const headerText = cleanContent(cellMatrix[0][col]).toLowerCase();
            
            // Check if this is a combined header
            const splitHeaders = splitCombinedHeaders(headerText);
            
            if (splitHeaders.length > 1) {
              // This is a combined header, assign headers to subsequent columns
              console.log(`Splitting combined header at col ${col}: "${headerText}" into:`, splitHeaders);
              
              splitHeaders.forEach((subHeader, idx) => {
                const targetCol = col + idx;
                if (targetCol <= maxCol && !assignedColumns.has(targetCol)) {
                  columnHeaders[targetCol] = subHeader;
                  assignedColumns.add(targetCol);
                  
                  // Map to field
                  const standardField = fieldMap[subHeader];
                  if (standardField) {
                    headerToFieldMap[targetCol] = standardField;
                  }
                }
              });
            } else {
              // Single header
              const normalizedHeader = normalizeHeaderForMatching(headerText);
              columnHeaders[col] = normalizedHeader;
              assignedColumns.add(col);
              
              // Try to match normalized header
              const standardField = fieldMap[normalizedHeader];
              
              if (standardField) {
                headerToFieldMap[col] = standardField;
              } else {
                console.warn(`No mapping found for header: "${headerText}" (normalized: "${normalizedHeader}")`);
              }
            }
          }
        }
        
        console.log('Detected headers:', columnHeaders);
        console.log('Header to field mapping:', headerToFieldMap);
        
        // Debug: Check if quantity and daySupply are mapped
        let qtyColumn = -1;
        let daysColumn = -1;
        Object.entries(headerToFieldMap).forEach(([col, field]) => {
          if (field === 'quantity') qtyColumn = parseInt(col);
          if (field === 'daySupply') daysColumn = parseInt(col);
        });
        console.log(`Quantity column: ${qtyColumn}, Days Supply column: ${daysColumn}`);
        
        // Create position-based fallback mapping matching Azure format
        // Check if we have headers to determine the table structure
        const hasRxNumberColumn = cellMatrix[0][0] && (
          cellMatrix[0][0].toLowerCase().includes('rx') || 
          cellMatrix[0][0].toLowerCase().includes('number')
        );
        
        const positionFallbackMap = hasRxNumberColumn ? {
          // Format with RX Number and Org columns
          0: 'rxNumber',    // First column: Rx Number
          1: 'org',         // Second column: Org
          2: 'medication',  // Third column: Medication
          3: 'prescriber',  // Fourth column: MD Last Name
          4: 'strength',    // Fifth column: Strength
          5: 'dosageForm',  // Sixth column: Dosage Form
          6: 'quantity',    // Seventh column: Quantity Dispensed
          7: 'daySupply'    // Eighth column: Day Supply
        } : {
          // Format without RX Number and Org columns
          0: 'medication',  // First column: Medication
          1: 'prescriber',  // Second column: MD Last Name
          2: 'strength',    // Third column: Strength
          3: 'dosageForm',  // Fourth column: Dosage Form
          4: 'quantity',    // Fifth column: Quantity Dispensed
          5: 'daySupply'    // Sixth column: Day Supply
        };
        
        // Step 3: Process data rows
        const orders = [];
        let currentOrder = null;
        let consecutiveEmptyRows = 0;
        
        for (let row = 1; row <= maxRow; row++) {
          // Check if this row is completely empty
          const rowIsEmpty = cellMatrix[row].every(cell => !cell || cell.trim() === '');
          
          if (rowIsEmpty) {
            consecutiveEmptyRows++;
            // If we have too many empty rows, we might have reached the end of data
            if (consecutiveEmptyRows > 3) {
              console.log(`Stopping at row ${row} due to consecutive empty rows`);
              break;
            }
            continue;
          }
          
          consecutiveEmptyRows = 0;
          
          // Check if this row starts with an RX number
          const firstCell = cleanContent(cellMatrix[row][0]);
          
          // Debug first few rows - show all cells
          if (row <= 5) {
            console.log(`\nRow ${row} analysis:`);
            console.log(`  First cell: "${firstCell}"`);
            const rowData = [];
            for (let c = 0; c <= Math.min(7, maxCol); c++) {
              if (cellMatrix[row][c]) {
                rowData.push(`[${c}]: "${cellMatrix[row][c]}"`);
              }
            }
            console.log(`  All cells:`, rowData.join(' | '));
          }
          
          // Enhanced row detection - check if this is a data row
          // If we have RX numbers, use RX number detection
          // Otherwise, check if the first cell contains medication text
          let isDataRow = false;
          
          if (hasRxNumberColumn) {
            // Original RX number detection
            const rxNumberMatch = firstCell.match(/^([A-Z]?\d{4,})/);
            const looksLikeRxNumber = rxNumberMatch !== null || /^\d{4,}$/.test(firstCell.trim());
            isDataRow = looksLikeRxNumber;
          } else {
            // For tables without RX numbers, check if first cell has medication text
            // and is not empty or just punctuation
            isDataRow = firstCell.length > 2 && 
                       !firstCell.match(/^[\s\-_]+$/) &&
                       row > 0; // Skip header row
          }
          
          if (row <= 5) {
            console.log(`  Row Detection: isDataRow=${isDataRow}, hasRxNumberColumn=${hasRxNumberColumn}`);
          }
          
          if (isDataRow) {
            // Save previous order if it has at least a medication
            if (currentOrder && currentOrder.medication) {
              orders.push(currentOrder);
            }
            
            // Start new order
            currentOrder = {
              rxNumber: '',
              org: '',
              medication: '',
              prescriber: '',
              strength: '',
              dosageForm: '',
              quantity: '',
              daySupply: ''
            };
            
            // If we have RX number column, extract it
            if (hasRxNumberColumn) {
              const rxNumberMatch = firstCell.match(/^([A-Z]?\d{4,})/);
              currentOrder.rxNumber = rxNumberMatch ? rxNumberMatch[1] : firstCell.trim();
            }
            
            // Process all columns for this row
            const startCol = hasRxNumberColumn ? 1 : 0;
            for (let col = startCol; col <= maxCol; col++) {
              const header = columnHeaders[col];
              const value = cleanContent(cellMatrix[row][col]);
              
              if (value) { // Check if there's a value even if no header matched
                const fieldMap = getFieldMap();
                const standardField = fieldMap[header] || headerToFieldMap[col];
                
                // Debug logging
                if (tableIndex === 0 && orders.length < 3) { // Log first few orders of first table
                  console.log(`Row ${row}, Col ${col}: Header="${header}", Value="${value}", Maps to="${standardField || 'unmapped'}"`);
                }
                
                if (standardField && standardField !== 'rxNumber') {
                  // Apply specific processing for numeric fields
                  if (standardField === 'quantity' || standardField === 'daySupply') {
                    const numericValue = extractNumeric(value);
                    // Only set if field is empty to avoid duplicates
                    if (!currentOrder[standardField]) {
                      currentOrder[standardField] = numericValue;
                      if (tableIndex === 0 && orders.length < 3) {
                        console.log(`  Extracted ${standardField}: "${value}" -> "${numericValue}"`);
                      }
                    }
                  } else {
                    // Only set if field is empty to avoid duplicates
                    if (!currentOrder[standardField]) {
                      currentOrder[standardField] = value;
                    }
                  }
                } else if (!standardField) {
                  // If no header matched, use position-based fallback
                  const fallbackField = positionFallbackMap[col];
                  if (fallbackField && fallbackField !== 'rxNumber' && !currentOrder[fallbackField]) {
                    if (tableIndex === 0 && orders.length < 3) {
                      console.log(`  Using position fallback for col ${col}: "${value}" -> ${fallbackField}`);
                    }
                    if (fallbackField === 'quantity' || fallbackField === 'daySupply') {
                      currentOrder[fallbackField] = extractNumeric(value);
                    } else {
                      currentOrder[fallbackField] = value;
                    }
                  }
                }
              }
            }
          } else if (currentOrder) {
            // This is a continuation row - only append to medication if it's in the medication column
            for (let col = 1; col <= maxCol; col++) {
              const header = columnHeaders[col];
              const value = cleanContent(cellMatrix[row][col]);
              
              if (header && value) {
                const fieldMap = getFieldMap();
                const standardField = fieldMap[header];
                
                if (standardField === 'medication' && currentOrder.medication) {
                  // Only append if this is actually in the medication column
                  if (!currentOrder.medication.includes(value)) {
                    currentOrder.medication += ' ' + value;
                  }
                } else if (standardField && !currentOrder[standardField]) {
                  // Fill empty fields only
                  if (standardField === 'quantity' || standardField === 'daySupply') {
                    const newValue = extractNumeric(value);
                    // Only update if the field is truly empty and not "0"
                    if (!currentOrder[standardField] || currentOrder[standardField] === '') {
                      currentOrder[standardField] = newValue;
                    }
                  } else {
                    currentOrder[standardField] = value;
                  }
                }
              }
            }
          }
        }
        
        // Don't forget the last order (only if it has medication)
        // Save the last order if it exists and has data
        if (currentOrder && (currentOrder.rxNumber || currentOrder.medication)) {
          orders.push(currentOrder);
        }
        
        // Final cleanup pass on all string fields
        orders.forEach(order => {
          Object.keys(order).forEach(key => {
            if (order[key] === null || order[key] === undefined) {
              order[key] = '';
            } else {
              // Final cleanup to remove any remaining control characters
              order[key] = String(order[key])
                .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
                .replace(/\u00A0/g, ' ')
                .trim();
            }
          });
        });
        
        // Validate extracted data
        console.log(`\nValidating extracted orders from table ${tableIndex + 1}:`);
        orders.forEach((order, idx) => {
          if (idx < 3) { // Show first 3 for validation
            console.log(`Order ${idx + 1}:`, {
              rxNumber: order.rxNumber || 'MISSING',
              medication: order.medication || 'MISSING',
              strength: order.strength || 'MISSING',
              form: order.dosageForm || 'MISSING',
              qty: order.quantity || 'MISSING',
              days: order.daySupply || 'MISSING'
            });
            // Debug: Show all fields
            console.log(`  All fields for order ${idx + 1}:`, order);
          }
        });
        
        console.log(`Extracted ${orders.length} orders from table ${tableIndex + 1}`);
        if (orders.length > 0) {
          console.log('Sample order:', orders[0]);
        }
        
        // Fallback: If no orders extracted, try a simpler row-by-row approach
        if (orders.length === 0 && maxRow > 0) {
          console.log('\\nNo orders found with RX detection. Trying fallback extraction...');
          
          // Process each row after header
          for (let row = 1; row <= maxRow; row++) {
            const rowData = cellMatrix[row];
            
            // Skip empty rows
            if (!rowData || rowData.every(cell => !cell || cell.trim() === '')) {
              continue;
            }
            
            // Create order from row data - matching the table structure
            const order = hasRxNumberColumn ? {
              rxNumber: cleanContent(rowData[0] || ''),
              org: cleanContent(rowData[1] || ''),
              medication: cleanContent(rowData[2] || ''),
              prescriber: cleanContent(rowData[3] || ''),
              strength: cleanContent(rowData[4] || ''),
              dosageForm: cleanContent(rowData[5] || ''),
              quantity: extractNumeric(cleanContent(rowData[6] || '')),
              daySupply: extractNumeric(cleanContent(rowData[7] || ''))
            } : {
              rxNumber: '',
              org: '',
              medication: cleanContent(rowData[0] || ''),
              prescriber: cleanContent(rowData[1] || ''),
              strength: cleanContent(rowData[2] || ''),
              dosageForm: cleanContent(rowData[3] || ''),
              quantity: extractNumeric(cleanContent(rowData[4] || '')),
              daySupply: extractNumeric(cleanContent(rowData[5] || ''))
            };
            
            // Debug the row data
            if (tableIndex === 0 && orders.length < 3) {
              console.log(`Fallback row ${row} data:`, rowData.map((v, i) => `[${i}]="${v}"`).join(', '));
            }
            
            // Only add if there's meaningful data
            if (order.rxNumber || order.medication) {
              console.log(`Fallback extracted order from row ${row}:`, order);
              orders.push(order);
            }
          }
          
          console.log(`Fallback extraction found ${orders.length} orders`);
        }
        
        allOrders.push(...orders);
        
      } catch (error) {
        console.error(`Error processing table ${tableIndex + 1}:`, error);
      }
    });
    
    // Generate RX numbers for orders without them
    let rxCounter = 1000;
    let generatedCount = 0;
    allOrders.forEach((order, index) => {
      if (!order.rxNumber || order.rxNumber.trim() === '') {
        // Generate a unique RX number
        order.rxNumber = `RX${String(rxCounter + index).padStart(4, '0')}`;
        generatedCount++;
      }
    });
    
    console.log(`Generated ${generatedCount} RX numbers for orders without them`);
    
    // Remove duplicates based on medication + strength combination
    const uniqueOrders = [];
    const seenKeys = new Set();
    
    allOrders.forEach(order => {
      // Create a unique key based on medication and strength
      const orderKey = `${order.medication}|${order.strength}`.toLowerCase();
      
      if (!seenKeys.has(orderKey)) {
        seenKeys.add(orderKey);
        uniqueOrders.push(order);
      }
    });
    
    console.log(`Total unique orders extracted: ${uniqueOrders.length}`);
    
    // Log sample of extracted data for debugging
    if (uniqueOrders.length > 0) {
      console.log('Sample extracted orders:', uniqueOrders.slice(0, 3));
    }
    
    return uniqueOrders;
  };
  
  // Helper function to get field mapping
  const getFieldMap = () => {
    // Normalize header text for better matching
    const normalizeHeader = (header) => {
      return header
        .toLowerCase()
        .replace(/[\n\r]/g, ' ')  // Replace newlines with spaces
        .replace(/\s+/g, ' ')     // Multiple spaces to single
        .replace(/[^\w\s#]/g, '') // Remove special chars except # and spaces
        .trim();
    };
    
    const mappings = {
      'rx number': 'rxNumber',
      'rx#': 'rxNumber',
      'rx #': 'rxNumber',
      'rxnumber': 'rxNumber',
      'rx': 'rxNumber',
      'prescription': 'rxNumber',
      'org': 'org',
      'organization': 'org',
      'medication': 'medication',
      'drug': 'medication',
      'med': 'medication',
      'medicine': 'medication',
      'med last name': 'medication',  // Handle combined headers
      'product': 'medication',
      'item': 'medication',
      'prescriber': 'prescriber',
      'md last name': 'prescriber',   // Handle MD/prescriber variants
      'md': 'prescriber',
      'doctor': 'prescriber',
      'physician': 'prescriber',
      'strength': 'strength',
      'str': 'strength',
      'dosage form': 'dosageForm',
      'form': 'dosageForm',
      'dose form': 'dosageForm',
      'quantity dispensed': 'quantity',
      'quantity': 'quantity',
      'qty': 'quantity',
      'qty dispensed': 'quantity',
      'disp qty': 'quantity',
      'dispensed': 'quantity',
      'disp': 'quantity',
      'amount': 'quantity',
      'qty disp': 'quantity',
      'disp quantity': 'quantity',
      'day supply': 'daySupply',
      'days': 'daySupply',
      'days supply': 'daySupply',
      'supply': 'daySupply',
      'ds': 'daySupply',
      'day': 'daySupply',
      'days supp': 'daySupply',
      'daysupply': 'daySupply',
      'day sup': 'daySupply',
      'sup': 'daySupply'
    };
    
    // Create a normalized mapping
    const normalizedMappings = {};
    Object.entries(mappings).forEach(([key, value]) => {
      normalizedMappings[normalizeHeader(key)] = value;
    });
    
    // Add exact matches for common abbreviations
    normalizedMappings['qty'] = 'quantity';
    normalizedMappings['days'] = 'daySupply';
    
    return normalizedMappings;
  };
  
  const compareSupplyTables = (previousOrders, currentOrders) => {
    console.log('=== SUPPLIES ANALYZER UPDATED VERSION 4.2 - FIXED ===');
    console.log('Previous orders:', previousOrders.length, 'Current orders:', currentOrders.length);
    
    // Debug: Show first few orders from each table with ALL fields
    console.log('\nSample Previous Orders:');
    previousOrders.slice(0, 3).forEach((order, idx) => {
      console.log(`  ${idx}:`, {
        medication: order.medication,
        rxNumber: order.rxNumber,
        prescriber: order.prescriber,
        quantity: order.quantity,
        daySupply: order.daySupply,
        strength: order.strength
      });
      // Check for duplicate values
      if (order.daySupply && order.daySupply.includes(' ')) {
        console.warn(`  WARNING: Day Supply contains duplicate value: "${order.daySupply}"`);
      }
    });
    
    console.log('\nSample Current Orders:');
    currentOrders.slice(0, 3).forEach((order, idx) => {
      console.log(`  ${idx}:`, {
        medication: order.medication,
        rxNumber: order.rxNumber,
        prescriber: order.prescriber,
        quantity: order.quantity,
        daySupply: order.daySupply,
        strength: order.strength
      });
      // Check for duplicate values
      if (order.daySupply && order.daySupply.includes(' ')) {
        console.warn(`  WARNING: Day Supply contains duplicate value: "${order.daySupply}"`);
      }
    });
    
    // Helper function to normalize any value for comparison
    const normalizeValue = (value) => {
      if (value === null || value === undefined) return '';
      
      // Convert to string and aggressively clean
      let str = String(value)
        .trim()
        .toLowerCase()  // Add case-insensitive comparison
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/^\s+|\s+$/g, '') // Remove all leading/trailing whitespace
        .replace(/[\r\n\t]/g, ''); // Remove tabs, newlines
        
      // Handle common OCR artifacts
      if (str === '-' || str === '--' || str === 'n/a' || str === 'na' || str === 'none') return '';
      
      return str;
    };

    // Generic comparison function for any values
    const valuesMatch = (val1, val2) => {
      const norm1 = normalizeValue(val1);
      const norm2 = normalizeValue(val2);
      
      // Both empty = match
      if (norm1 === '' && norm2 === '') return true;
      
      // One empty and one not = no match
      if ((norm1 === '' && norm2 !== '') || (norm1 !== '' && norm2 === '')) return false;
      
      // Direct string comparison after normalization (case insensitive)
      if (norm1.toLowerCase() === norm2.toLowerCase()) return true;
      
      // Try numeric comparison
      const num1 = parseFloat(norm1);
      const num2 = parseFloat(norm2);
      
      if (!isNaN(num1) && !isNaN(num2)) {
        // Allow for small floating point differences
        return Math.abs(num1 - num2) < 0.01;
      }
      
      // Try removing common units and comparing
      const stripUnits = (str) => str.replace(/\s*(mg|ml|mcg|g|mg\/ml|units?|tabs?|caps?|ea|each)$/i, '').trim();
      const stripped1 = stripUnits(norm1);
      const stripped2 = stripUnits(norm2);
      
      if (stripped1 === stripped2) return true;
      
      // Try numeric comparison after stripping units
      const strippedNum1 = parseFloat(stripped1);
      const strippedNum2 = parseFloat(stripped2);
      
      if (!isNaN(strippedNum1) && !isNaN(strippedNum2)) {
        return Math.abs(strippedNum1 - strippedNum2) < 0.01;
      }
      
      return false;
    };

    // Sort orders alphabetically by medication name
    const sortedPreviousOrders = [...previousOrders].sort((a, b) => 
      (a.medication || '').toLowerCase().localeCompare((b.medication || '').toLowerCase())
    );
    const sortedCurrentOrders = [...currentOrders].sort((a, b) => 
      (a.medication || '').toLowerCase().localeCompare((b.medication || '').toLowerCase())
    );
    
    const results = {
      previousOrders: sortedPreviousOrders,
      currentOrders: sortedCurrentOrders,
      matching: [],
      changed: [],
      new: [],
      missing: [],
      summary: {
        totalPrevious: previousOrders.length,
        totalCurrent: currentOrders.length,
        matching: 0,
        changed: 0,
        new: 0,
        missing: 0
      }
    };
    
    // Simplified medication normalization for better matching
    const normalizeMedication = (med) => {
      if (!med) return '';
      
      // Basic normalization - keep it simple to avoid breaking matches
      let normalized = med
        .toLowerCase()
        .trim()
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove invisible characters and zero-width spaces
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Normalize common punctuation
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        // Keep the rest mostly intact
        .trim();
        
      return normalized;
    };
    
    // OPTIMIZATION 4: Simplified similarity calculation for better performance
    const calculateSimilarity = (str1, str2) => {
      if (!str1 || !str2) return 0;
      if (str1 === str2) return 1;
      
      // Quick check for very different lengths
      const lenDiff = Math.abs(str1.length - str2.length);
      if (lenDiff > Math.max(str1.length, str2.length) * 0.5) return 0;
      
      const longer = str1.length > str2.length ? str1 : str2;
      const shorter = str1.length > str2.length ? str2 : str1;
      
      if (longer.length === 0) return 1.0;
      
      const editDistance = levenshteinDistance(longer, shorter);
      return (longer.length - editDistance) / longer.length;
    };
    
    // Check if medications are similar enough to be considered a match
    const medicationsMatch = (med1, med2, threshold = 0.70) => {  // Lower threshold for better matching
      const norm1 = normalizeMedication(med1);
      const norm2 = normalizeMedication(med2);
      
      // Exact match after normalization
      if (norm1 === norm2) return true;
      
      // Check if one contains the other (for cases like "NEEDLE 18G X 1 HYPO" vs "NEEDLE 18G X 1HYPO")
      if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
      
      // Fuzzy match with similarity threshold
      const similarity = calculateSimilarity(norm1, norm2);
      
      console.log(`Comparing medications:
        Med1: "${med1}" -> "${norm1}"
        Med2: "${med2}" -> "${norm2}"
        Similarity: ${similarity.toFixed(3)}`);
      
      return similarity >= threshold;
    };
    
    // Create a unique key for each order based on medication and strength
    const createOrderKey = (order) => {
      const medKey = normalizeMedication(order.medication);
      const strengthKey = order.strength ? order.strength.toLowerCase().trim() : '';
      return strengthKey ? `${medKey}|${strengthKey}` : medKey;
    };
    
    // Helper function to normalize RX numbers for matching
    const normalizeRxNumber = (rxNum) => {
      if (!rxNum) return '';
      // Extract just the numeric part, removing suffixes like -6, -CVS, etc.
      const match = rxNum.match(/^(\d+)/);
      return match ? match[1] : rxNum;
    };
    
    // Create map of current orders by RX number for direct matching
    const currentByRxNumber = new Map();
    const currentByNormalizedRxNumber = new Map();
    sortedCurrentOrders.forEach(order => {
      if (order.rxNumber) {
        currentByRxNumber.set(order.rxNumber, order);
        // Also map by normalized RX number
        const normalizedRx = normalizeRxNumber(order.rxNumber);
        if (!currentByNormalizedRxNumber.has(normalizedRx)) {
          currentByNormalizedRxNumber.set(normalizedRx, []);
        }
        currentByNormalizedRxNumber.get(normalizedRx).push(order);
      }
    });
    
    // Create map of current orders by medication
    const currentByMedication = new Map();
    sortedCurrentOrders.forEach(order => {
      const key = createOrderKey(order);
      if (!currentByMedication.has(key)) {
        currentByMedication.set(key, []);
      }
      currentByMedication.get(key).push(order);
    });
    
    // Debug: Show medication map keys
    console.log('\nMedication Map Keys:');
    Array.from(currentByMedication.keys()).slice(0, 5).forEach(key => {
      console.log(`  "${key}" -> ${currentByMedication.get(key).length} orders`);
    });
    
    // Debug: Log all keys in the map
    console.log('\nCurrent orders medication map keys:');
    currentByMedication.forEach((orders, key) => {
      console.log(`  Key: "${key}" -> ${orders.length} order(s)`);
    });
    
    // Track which current orders have been matched
    const matchedCurrentRxNumbers = new Set();
    const matchedCurrentIndices = new Set(); // Track by index when RX numbers are not available
    
    // Process each previous order
    sortedPreviousOrders.forEach((prevOrder, prevIndex) => {
      let foundMatch = false;
      
      // First, try to match by medication name and strength
      const prevKey = createOrderKey(prevOrder);
      let matchingCurrentOrders = currentByMedication.get(prevKey) || [];
      
      console.log(`\nLooking for matches for previous order ${prevIndex}:`, {
        medication: prevOrder.medication,
        normalizedMed: normalizeMedication(prevOrder.medication),
        strength: prevOrder.strength,
        key: prevKey,
        foundInMap: matchingCurrentOrders.length
      });
      
      // If no exact match with strength, try fuzzy matching
      if (matchingCurrentOrders.length === 0) {
        console.log(`No exact match, trying fuzzy medication matching for: "${prevOrder.medication}"`);
        
        // Search through all current orders for medication match using fuzzy logic
        matchingCurrentOrders = [];
        for (const currentOrder of sortedCurrentOrders) {
          // Skip if already matched
          const currentIndex = sortedCurrentOrders.indexOf(currentOrder);
          if (currentOrder.rxNumber && matchedCurrentRxNumbers.has(currentOrder.rxNumber)) continue;
          if (!currentOrder.rxNumber && matchedCurrentIndices.has(currentIndex)) continue;
          
          // Check medication similarity
          if (medicationsMatch(prevOrder.medication, currentOrder.medication)) {
            // Bonus points if prescriber also matches
            const prescriberMatch = valuesMatch(prevOrder.prescriber, currentOrder.prescriber);
            if (prescriberMatch) {
              console.log(`  Found match with same prescriber: "${currentOrder.medication}"`);
            }
            matchingCurrentOrders.push(currentOrder);
          }
        }
        console.log(`Found ${matchingCurrentOrders.length} matches by fuzzy medication matching`);
      }
      
      // Look for matching current order
      for (const currentOrder of matchingCurrentOrders) {
        // Skip if already matched
        const currentIndex = sortedCurrentOrders.indexOf(currentOrder);
        if (currentOrder.rxNumber && matchedCurrentRxNumbers.has(currentOrder.rxNumber)) continue;
        if (!currentOrder.rxNumber && matchedCurrentIndices.has(currentIndex)) continue;
        
        // Compare prescriber, quantity and day supply for better matching
        const prescriberMatch = valuesMatch(currentOrder.prescriber, prevOrder.prescriber);
        const quantityMatch = valuesMatch(currentOrder.quantity, prevOrder.quantity);
        const daySupplyMatch = valuesMatch(currentOrder.daySupply, prevOrder.daySupply);
        
        console.log(`\nComparing orders:
  Previous: "${prevOrder.medication}" (normalized: "${normalizeMedication(prevOrder.medication)}")
            RX#${prevOrder.rxNumber} - Prescriber: "${prevOrder.prescriber}"
            Strength: "${prevOrder.strength}", Qty: "${prevOrder.quantity}", Days: "${prevOrder.daySupply}"
  Current:  "${currentOrder.medication}" (normalized: "${normalizeMedication(currentOrder.medication)}")
            RX#${currentOrder.rxNumber} - Prescriber: "${currentOrder.prescriber}"
            Strength: "${currentOrder.strength}", Qty: "${currentOrder.quantity}", Days: "${currentOrder.daySupply}"
  Matches - Prescriber: ${prescriberMatch}, Qty: ${quantityMatch}, Days: ${daySupplyMatch}
  MATCHED: YES`);
        
        // Check if quantities or days supply are different for matching medications
        const qtyDifferent = !quantityMatch;
        const daysDifferent = !daySupplyMatch;
        
        if (qtyDifferent || daysDifferent) {
          // Mark as changed if quantities or days supply are different
          const changes = {};
          if (qtyDifferent) changes.quantity = true;
          if (daysDifferent) changes.daySupply = true;
          
          results.changed.push({
            ...currentOrder,
            previousOrder: prevOrder,
            status: 'changed',
            changes: changes
          });
          results.summary.changed++;
        } else {
          // If medication and strength match exactly, mark as matched
          results.matching.push({
            ...currentOrder,
            previousOrder: prevOrder,
            status: 'matched'
          });
          results.summary.matching++;
        }
        
        if (currentOrder.rxNumber) {
          matchedCurrentRxNumbers.add(currentOrder.rxNumber);
        }
        matchedCurrentIndices.add(currentIndex);
        foundMatch = true;
        break;
      }
      
      // If no exact match, try normalized RX number matching
      if (!foundMatch && prevOrder.rxNumber) {
        const normalizedPrevRx = normalizeRxNumber(prevOrder.rxNumber);
        const possibleMatches = currentByNormalizedRxNumber.get(normalizedPrevRx) || [];
        
        for (const currentOrder of possibleMatches) {
          if (matchedCurrentRxNumbers.has(currentOrder.rxNumber)) continue;
          
          const medicationMatch = normalizeMedication(currentOrder.medication) === normalizeMedication(prevOrder.medication) &&
                                valuesMatch(currentOrder.strength, prevOrder.strength);
          
          if (medicationMatch) {
            console.log(`\nNormalized RX Match Found:
  Previous: RX#${prevOrder.rxNumber} (normalized: ${normalizedPrevRx}) - "${prevOrder.medication}"
  Current:  RX#${currentOrder.rxNumber} (normalized: ${normalizeRxNumber(currentOrder.rxNumber)}) - "${currentOrder.medication}"`);
            
            // Check if quantities or days supply are different for matching medications
            const quantityMatch = valuesMatch(currentOrder.quantity, prevOrder.quantity);
            const daySupplyMatch = valuesMatch(currentOrder.daySupply, prevOrder.daySupply);
            const qtyDifferent = !quantityMatch;
            const daysDifferent = !daySupplyMatch;
            
            if (qtyDifferent || daysDifferent) {
              // Mark as changed if quantities or days supply are different
              const changes = {};
              if (qtyDifferent) changes.quantity = true;
              if (daysDifferent) changes.daySupply = true;
              
              results.changed.push({
                ...currentOrder,
                previousOrder: prevOrder,
                status: 'changed',
                changes: changes
              });
              results.summary.changed++;
            } else {
              // Found match by normalized RX and medication
              results.matching.push({
                ...currentOrder,
                previousOrder: prevOrder,
                status: 'matched'
              });
              results.summary.matching++;
            }
            matchedCurrentRxNumbers.add(currentOrder.rxNumber);
            foundMatch = true;
            break;
          }
        }
      }
      
      
      // If no match found in current orders, it's missing
      if (!foundMatch) {
        results.missing.push({
          ...prevOrder,
          status: 'missing'
        });
        results.summary.missing++;
        console.log(`\nMissing order: "${prevOrder.medication}" - RX#${prevOrder.rxNumber}`);
      }
    });
    
    // Check for new orders (current orders not matched to any previous)
    sortedCurrentOrders.forEach((currentOrder, index) => {
      const isMatched = currentOrder.rxNumber ? 
        matchedCurrentRxNumbers.has(currentOrder.rxNumber) : 
        matchedCurrentIndices.has(index);
      
      if (!isMatched) {
        results.new.push({
          ...currentOrder,
          status: 'new'
        });
        results.summary.new++;
        console.log(`\nNew order: "${currentOrder.medication}" - RX#${currentOrder.rxNumber}`);
      }
    });
    
    console.log('\nComparison Summary:', {
      totalPrevious: results.summary.totalPrevious,
      totalCurrent: results.summary.totalCurrent,
      matching: results.summary.matching,
      changed: results.summary.changed,
      new: results.summary.new,
      missing: results.summary.missing
    });
    
    console.log('\nMatching orders:', results.matching.map(m => ({
      medication: m.medication,
      rxNumber: m.rxNumber,
      previousRx: m.previousOrder?.rxNumber
    })));
    
    console.log('\nMissing orders:', results.missing.map(m => ({
      medication: m.medication,
      rxNumber: m.rxNumber
    })));
    
    console.log('\nNew orders:', results.new.map(m => ({
      medication: m.medication,
      rxNumber: m.rxNumber
    })));
    
    return results;
  };

  return (
    <div className="analyzer-page page-container">
      <div className="analyzer-content">
        <div className="analyzer-dashboard">
          {/* Enterprise Header */}
          <EnterpriseHeader>
            <TabGroup>
              <TabButton
                active={activeSection === 'prescription'}
                onClick={() => setActiveSection('prescription')}
                icon={FileText}
              >
                Analyze Prescription
              </TabButton>
              <TabButton
                active={activeSection === 'supplies'}
                onClick={() => setActiveSection('supplies')}
                icon={Package}
              >
                Analyze Supplies
              </TabButton>
            </TabGroup>
          </EnterpriseHeader>

          {/* Prescription Section */}
          {activeSection === 'prescription' && (
            <>
              <div className="dashboard-card upload-card">
                <div className="card-header">
                  <h3>Analyze Prescription</h3>
                  <FileText size={20} />
                </div>
                <div className="card-body">
                  {!selectedFile ? (
                    <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                      <ScanLine size={48} className="upload-icon" />
                      <p className="upload-text">Click to upload prescription</p>
                      <p className="upload-hint">Supports JPG, PNG - One image per upload</p>
                    </div>
                  ) : (
                    <div>
                      <div className="file-preview">
                        {selectedFile.type.startsWith('image/') ? (
                          <img src={previewUrl} alt="Preview" />
                        ) : (
                          <div className="pdf-icon">PDF</div>
                        )}
                        <div className="file-info">
                          <p className="file-name">{selectedFile.name}</p>
                          <p className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                          {isFolderUpload && (
                            <p className="file-count">File {currentFileIndex + 1} of {selectedFiles.length}</p>
                          )}
                        </div>
                        <button className="remove-file" onClick={removeFile}>
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Analyze Button */}
              <div style={{ marginTop: '10px' }}>
                <button 
                  className={`toggle-btn full-width ${isAnalyzing ? 'active' : ''}`}
                  onClick={() => analyzeDocument()}
                  disabled={!selectedFile || isAnalyzing}
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                >
                  <ScanLine size={16} style={{ color: 'white', WebkitTextFillColor: 'white' }} />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Prescription'}
                </button>
              </div>
            </>
          )}

          {/* Supplies Section */}
          {activeSection === 'supplies' && (
            <>
              <div className="dashboard-card upload-card supplies-card">
                <div className="card-header">
                  <h3>Analyze Supplies</h3>
                  <GitCompare size={20} />
                </div>
                <div className="card-body supplies-body">
                  <div className="supplies-upload-grid">
                    {/* Previous Order Upload */}
                    <div className="supply-upload-section">
                      <h4 className="supply-upload-label">Previous Order</h4>
                      {previousSupplyFiles.length === 0 ? (
                        <div 
                          ref={previousSupplyDivRef}
                          className={`paste-area small ${isPasteFocused.previous ? 'paste-ready' : ''}`}
                          onPaste={(e) => handleSupplyPaste(e, 'previous')}
                          onFocus={() => setIsPasteFocused(prev => ({ ...prev, previous: true }))}
                          onBlur={() => setIsPasteFocused(prev => ({ ...prev, previous: false }))}
                          tabIndex={0}
                          title="Click here then paste screenshot (Ctrl+V)"
                        >
                          <input
                            type="file"
                            id="previous-upload-input"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  setPreviousSupplyFiles([...previousSupplyFiles, file]);
                                  setPreviousSupplyPreviews([...previousSupplyPreviews, event.target.result]);
                                };
                                reader.readAsDataURL(file);
                              });
                              e.target.value = '';
                            }}
                          />
                          <button
                            className="paste-area-upload-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById('previous-upload-input').click();
                            }}
                            title="Upload files"
                          >
                            <Upload size={16} />
                          </button>
                          <ImageIcon size={32} className="paste-icon" />
                          <p className="paste-text small">Click Here</p>
                          <p className="paste-hint small">Then paste screenshot (Ctrl+V)</p>
                        </div>
                      ) : (
                        <div className="supply-files-list">
                          {previousSupplyFiles.map((file, index) => (
                            <div key={index} className="supply-upload-confirmation">
                              <div className="confirmation-content">
                                <Check size={20} className="confirmation-check" />
                                <span className="confirmation-text">Screenshot {index + 1}</span>
                              </div>
                              <button className="remove-file-btn" onClick={() => removeSupplyFile('previous', index)}>
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button 
                            className="add-more-btn"
                            onClick={(e) => {
                              // Add visual feedback
                              e.target.classList.add('paste-ready');
                              
                              // Create a temporary paste area
                              const tempDiv = document.createElement('div');
                              tempDiv.contentEditable = true;
                              tempDiv.style.position = 'absolute';
                              tempDiv.style.left = '-9999px';
                              tempDiv.addEventListener('paste', (e) => {
                                handleSupplyPaste(e, 'previous');
                                // Remove visual feedback after paste
                                document.querySelector('.add-more-btn.paste-ready')?.classList.remove('paste-ready');
                              });
                              document.body.appendChild(tempDiv);
                              tempDiv.focus();
                              
                              // Clean up after timeout
                              setTimeout(() => {
                                document.body.removeChild(tempDiv);
                                e.target.classList.remove('paste-ready');
                              }, 3000);
                            }}
                          >
                            <Plus size={16} />
                            Add More Screenshots
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Current Order Upload */}
                    <div className="supply-upload-section">
                      <h4 className="supply-upload-label">Current Order</h4>
                      {currentSupplyFiles.length === 0 ? (
                        <div 
                          ref={currentSupplyDivRef}
                          className={`paste-area small ${isPasteFocused.current ? 'paste-ready' : ''}`}
                          onPaste={(e) => handleSupplyPaste(e, 'current')}
                          onFocus={() => setIsPasteFocused(prev => ({ ...prev, current: true }))}
                          onBlur={() => setIsPasteFocused(prev => ({ ...prev, current: false }))}
                          tabIndex={0}
                          title="Click here then paste screenshot (Ctrl+V)"
                        >
                          <input
                            type="file"
                            id="current-upload-input"
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  setCurrentSupplyFiles([...currentSupplyFiles, file]);
                                  setCurrentSupplyPreviews([...currentSupplyPreviews, event.target.result]);
                                };
                                reader.readAsDataURL(file);
                              });
                              e.target.value = '';
                            }}
                          />
                          <button
                            className="paste-area-upload-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById('current-upload-input').click();
                            }}
                            title="Upload files"
                          >
                            <Upload size={16} />
                          </button>
                          <ImageIcon size={32} className="paste-icon" />
                          <p className="paste-text small">Click Here</p>
                          <p className="paste-hint small">Then paste screenshot (Ctrl+V)</p>
                        </div>
                      ) : (
                        <div className="supply-files-list">
                          {currentSupplyFiles.map((file, index) => (
                            <div key={index} className="supply-upload-confirmation">
                              <div className="confirmation-content">
                                <Check size={20} className="confirmation-check" />
                                <span className="confirmation-text">Screenshot {index + 1}</span>
                              </div>
                              <button className="remove-file-btn" onClick={() => removeSupplyFile('current', index)}>
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button 
                            className="add-more-btn"
                            onClick={(e) => {
                              // Add visual feedback
                              e.target.classList.add('paste-ready');
                              
                              // Create a temporary paste area
                              const tempDiv = document.createElement('div');
                              tempDiv.contentEditable = true;
                              tempDiv.style.position = 'absolute';
                              tempDiv.style.left = '-9999px';
                              tempDiv.addEventListener('paste', (e) => {
                                handleSupplyPaste(e, 'current');
                                // Remove visual feedback after paste
                                document.querySelector('.add-more-btn.paste-ready')?.classList.remove('paste-ready');
                              });
                              document.body.appendChild(tempDiv);
                              tempDiv.focus();
                              
                              // Clean up after timeout
                              setTimeout(() => {
                                document.body.removeChild(tempDiv);
                                e.target.classList.remove('paste-ready');
                              }, 3000);
                            }}
                          >
                            <Plus size={16} />
                            Add More Screenshots
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {suppliesError && (
                    <div className="supplies-error">
                      <AlertCircle size={16} />
                      <span>{suppliesError}</span>
                    </div>
                  )}
                  
                  <div style={{ marginTop: '10px' }}>
                    <button 
                      className={`toggle-btn full-width ${isAnalyzingSupplies ? 'active' : ''}`}
                      onClick={analyzeSupplies}
                      disabled={!previousSupplyFile || !currentSupplyFile || isAnalyzingSupplies}
                      style={{ color: 'white', WebkitTextFillColor: 'white' }}
                    >
                      <GitCompare size={16} style={{ color: 'white', WebkitTextFillColor: 'white' }} />
                      {isAnalyzingSupplies ? 'Analyzing...' : 'Compare Orders'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}


          {/* Scanning Overlay */}
          {isAnalyzing && (
            <div className="scanning-overlay">
              <div className="scanning-content">
                <div className="scan-animation">
                  <div className="scan-line"></div>
                  {selectedFile?.type.startsWith('image/') ? (
                    <img src={previewUrl} alt="Scanning" style={{width: '100%', height: '100%', objectFit: 'contain'}} />
                  ) : (
                    <div className="pdf-icon" style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem'}}>PDF</div>
                  )}
                </div>
                <p className="scan-text">
                  {isFolderUpload 
                    ? `Analyzing file ${currentFileIndex + 1} of ${selectedFiles.length}...`
                    : 'Analyzing prescription...'}
                </p>
                <div className="scan-progress">
                  <div className="scan-progress-bar"></div>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {(analysisResults || allAnalysisResults.length > 0) && !isAnalyzing && (
            <div className="supplies-results-section">
              <div className="supplies-results-header">
                <h2>Prescription Analysis Results</h2>
                <button 
                  className="reset-analysis-btn" 
                  onClick={handleReset}
                  title="Reset prescription analysis"
                >
                  <RotateCcw size={18} />
                  <span>Reset Analysis</span>
                </button>
              </div>

              {/* Alerts */}
              {showDEAAlert && (
                <div className="alert-banner">
                  <AlertCircle className="alert-icon" size={20} />
                  <div className="alert-content">
                    <p className="alert-title">DEA Alert</p>
                    <p className="alert-message">DEA number starts with "M". Please verify a supervising prescriber.</p>
                  </div>
                </div>
              )}
              {showNeedlesAlert && (
                <div className="alert-banner">
                  <AlertCircle className="alert-icon" size={20} />
                  <div className="alert-content">
                    <p className="alert-title">Needles Prescription Check</p>
                    <p className="alert-message">Confirm days supply for needles does not exceed 10 days for state laws.</p>
                  </div>
                </div>
              )}

              {/* Analysis Table */}
              {allAnalysisResults.length > 0 ? (
                // Multiple files results
                <div className="multi-file-results">
                  {allAnalysisResults.map((fileResult, fileIndex) => (
                    <div key={fileIndex} className="file-result-section">
                      <h3 className="file-result-title">{fileResult.fileName}</h3>
                      
                      {/* File-specific alerts */}
                      {fileResult.hasDeaAlert && (
                        <div className="alert-banner file-alert">
                          <AlertCircle className="alert-icon" size={20} />
                          <div className="alert-content">
                            <p className="alert-title">DEA Alert</p>
                            <p className="alert-message">DEA number starts with "M". Please verify a supervising prescriber.</p>
                          </div>
                        </div>
                      )}
                      {fileResult.hasNeedlesAlert && (
                        <div className="alert-banner file-alert">
                          <AlertCircle className="alert-icon" size={20} />
                          <div className="alert-content">
                            <p className="alert-title">Needles Prescription Check</p>
                            <p className="alert-message">Confirm days supply for needles does not exceed 10 days for state laws.</p>
                          </div>
                        </div>
                      )}
                      
                      <h3 className="file-result-title">{fileResult.fileName}</h3>
                      <div className="supplies-tables-container">
                        {/* Prescribed Table */}
                        <div className="supply-table-section">
                          <h3 className="supply-table-title">
                            <FileText size={20} />
                            Prescribed
                          </h3>
                          <div className="table-wrapper" style={{ overflow: 'visible', maxHeight: 'none', height: 'auto' }}>
                            <table className="analysis-table">
                              <thead>
                                <tr>
                                  <th>Field</th>
                                  <th>Value</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fieldSections.map((section, sectionIndex) => (
                                  <React.Fragment key={sectionIndex}>
                                    <tr className="section-header-row">
                                      <td colSpan="3">{section.title}</td>
                                    </tr>
                                    {section.fields.map((field, fieldIndex) => {
                                      const rxValue = fileResult.results[field.rxKey] || '';
                                      const deValue = fileResult.results[field.deKey] || '';
                                      const matchStatus = getMatchStatus(field.label, rxValue, deValue, fileResult.results, fileResult.results);
                                      
                                      return (
                                        <tr key={`${sectionIndex}-${fieldIndex}`} className={`${matchStatus}-row`}>
                                          <td className="field-label">{field.label}</td>
                                          <td className={`field-value ${!rxValue ? 'empty' : ''}`}>
                                            {rxValue || '-'}
                                          </td>
                                          <td className="status-cell">
                                            <div className={`status-indicator ${matchStatus}`} data-status={matchStatus}>
                                              {matchStatus === 'match' ? (
                                                <>
                                                  <Check size={16} className="status-icon" />
                                                  <span className="status-fallback">✓</span>
                                                </>
                                              ) : matchStatus === 'mismatch' ? (
                                                <>
                                                  <XIcon size={16} className="status-icon" />
                                                  <span className="status-fallback">✗</span>
                                                </>
                                              ) : matchStatus === 'partial' ? (
                                                <>
                                                  <AlertCircle size={16} className="status-icon" />
                                                  <span className="status-fallback">!</span>
                                                </>
                                              ) : null}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        
                        {/* Data Entered Table */}
                        <div className="supply-table-section">
                          <h3 className="supply-table-title">
                            <FileText size={20} />
                            Data Entered
                          </h3>
                          <div className="table-wrapper" style={{ overflow: 'visible', maxHeight: 'none', height: 'auto' }}>
                            <table className="analysis-table">
                              <thead>
                                <tr>
                                  <th>Field</th>
                                  <th>Value</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fieldSections.map((section, sectionIndex) => (
                                  <React.Fragment key={sectionIndex}>
                                    <tr className="section-header-row">
                                      <td colSpan="3">{section.title}</td>
                                    </tr>
                                    {section.fields.map((field, fieldIndex) => {
                                      const rxValue = fileResult.results[field.rxKey] || '';
                                      const deValue = fileResult.results[field.deKey] || '';
                                      const matchStatus = getMatchStatus(field.label, rxValue, deValue, fileResult.results, fileResult.results);
                                      
                                      return (
                                        <tr key={`${sectionIndex}-${fieldIndex}`} className={`${matchStatus}-row`}>
                                          <td className="field-label">{field.label}</td>
                                          <td className={`field-value ${!deValue ? 'empty' : ''}`}>
                                            {deValue || '-'}
                                          </td>
                                          <td className="status-cell">
                                            <div className={`status-indicator ${matchStatus}`} data-status={matchStatus}>
                                              {matchStatus === 'match' ? (
                                                <>
                                                  <Check size={16} className="status-icon" />
                                                  <span className="status-fallback">✓</span>
                                                </>
                                              ) : matchStatus === 'mismatch' ? (
                                                <>
                                                  <XIcon size={16} className="status-icon" />
                                                  <span className="status-fallback">✗</span>
                                                </>
                                              ) : matchStatus === 'partial' ? (
                                                <>
                                                  <AlertCircle size={16} className="status-icon" />
                                                  <span className="status-fallback">!</span>
                                                </>
                                              ) : null}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Single file results - Side by Side Tables
                <div className="supplies-tables-container">
                  {/* Prescribed Table */}
                  <div className="supply-table-section">
                    <h3 className="supply-table-title">
                      <FileText size={20} />
                      Prescribed
                    </h3>
                    <div className="table-wrapper" style={{ overflow: 'visible', maxHeight: 'none', height: 'auto' }}>
                      <table className="analysis-table">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldSections.map((section, sectionIndex) => (
                            <React.Fragment key={sectionIndex}>
                              <tr className="section-header-row">
                                <td colSpan="3">{section.title}</td>
                              </tr>
                              {section.fields.map((field, fieldIndex) => {
                                const rxValue = analysisResults[field.rxKey] || '';
                                const deValue = analysisResults[field.deKey] || '';
                                const matchStatus = getMatchStatus(field.label, rxValue, deValue, analysisResults, analysisResults);
                                
                                return (
                                  <tr key={`${sectionIndex}-${fieldIndex}`} className={`${matchStatus}-row`}>
                                    <td className="field-label">{field.label}</td>
                                    <td className={`field-value ${!rxValue ? 'empty' : ''}`}>
                                      {rxValue || '-'}
                                    </td>
                                    <td className="status-cell">
                                      <div className={`status-indicator ${matchStatus}`} data-status={matchStatus}>
                                        {matchStatus === 'match' ? (
                                          <>
                                            <Check size={16} className="status-icon" />
                                            <span className="status-fallback">✓</span>
                                          </>
                                        ) : matchStatus === 'mismatch' ? (
                                          <>
                                            <XIcon size={16} className="status-icon" />
                                            <span className="status-fallback">✗</span>
                                          </>
                                        ) : matchStatus === 'partial' ? (
                                          <>
                                            <AlertCircle size={16} className="status-icon" />
                                            <span className="status-fallback">!</span>
                                          </>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Data Entered Table */}
                  <div className="supply-table-section">
                    <h3 className="supply-table-title">
                      <FileText size={20} />
                      Data Entered
                    </h3>
                    <div className="table-wrapper" style={{ overflow: 'visible', maxHeight: 'none', height: 'auto' }}>
                      <table className="analysis-table">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Value</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldSections.map((section, sectionIndex) => (
                            <React.Fragment key={sectionIndex}>
                              <tr className="section-header-row">
                                <td colSpan="3">{section.title}</td>
                              </tr>
                              {section.fields.map((field, fieldIndex) => {
                                const rxValue = analysisResults[field.rxKey] || '';
                                const deValue = analysisResults[field.deKey] || '';
                                const matchStatus = getMatchStatus(field.label, rxValue, deValue, analysisResults, analysisResults);
                                
                                return (
                                  <tr key={`${sectionIndex}-${fieldIndex}`} className={`${matchStatus}-row`}>
                                    <td className="field-label">{field.label}</td>
                                    <td className={`field-value ${!deValue ? 'empty' : ''}`}>
                                      {deValue || '-'}
                                    </td>
                                    <td className="status-cell">
                                      <div className={`status-indicator ${matchStatus}`} data-status={matchStatus}>
                                        {matchStatus === 'match' ? (
                                          <>
                                            <Check size={16} className="status-icon" />
                                            <span className="status-fallback">✓</span>
                                          </>
                                        ) : matchStatus === 'mismatch' ? (
                                          <>
                                            <XIcon size={16} className="status-icon" />
                                            <span className="status-fallback">✗</span>
                                          </>
                                        ) : matchStatus === 'partial' ? (
                                          <>
                                            <AlertCircle size={16} className="status-icon" />
                                            <span className="status-fallback">!</span>
                                          </>
                                        ) : null}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Supplies Comparison Results */}
          {suppliesComparisonResults && !isAnalyzingSupplies && (
            <div className="supplies-results-section">
              <div className="supplies-results-header">
                <h2>Supply Order Comparison</h2>
                <button 
                  className="reset-supplies-btn" 
                  onClick={handleResetSupplies}
                  title="Reset supplies comparison"
                >
                  <RotateCcw size={18} />
                  <span>Reset Comparison</span>
                </button>
              </div>
              
              {/* Summary Cards Above Tables */}
              <div className="supplies-summary-section">
                <h3 className="summary-title">Summary Report</h3>
                <div className="supplies-summary-cards">
                  <div 
                    className={`summary-card total ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'all' ? null : 'all')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="summary-icon">
                      <Package size={24} />
                    </div>
                    <div className="summary-content">
                      <p className="summary-number">{suppliesComparisonResults.summary.totalCurrent}</p>
                      <h4>All Orders</h4>
                    </div>
                  </div>
                  
                  <div 
                    className={`summary-card matching ${activeFilter === 'matched' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'matched' ? null : 'matched')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="summary-icon">
                      <Check size={24} />
                    </div>
                    <div className="summary-content">
                      <p className="summary-number">{suppliesComparisonResults.summary.matching}</p>
                      <h4>Matched</h4>
                    </div>
                  </div>
                  
                  <div 
                    className={`summary-card changed ${activeFilter === 'changed' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'changed' ? null : 'changed')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="summary-icon">
                      <AlertCircle size={24} />
                    </div>
                    <div className="summary-content">
                      <p className="summary-number">{suppliesComparisonResults.summary.changed || 0}</p>
                      <h4>Changed</h4>
                    </div>
                  </div>
                  
                  <div 
                    className={`summary-card new ${activeFilter === 'new' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'new' ? null : 'new')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="summary-icon">
                      <Plus size={24} />
                    </div>
                    <div className="summary-content">
                      <p className="summary-number">{suppliesComparisonResults.summary.new}</p>
                      <h4>New</h4>
                    </div>
                  </div>
                  
                  <div 
                    className={`summary-card missing ${activeFilter === 'missing' ? 'active' : ''}`}
                    onClick={() => setActiveFilter(activeFilter === 'missing' ? null : 'missing')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="summary-icon">
                      <X size={24} />
                    </div>
                    <div className="summary-content">
                      <p className="summary-number">{suppliesComparisonResults.summary.missing}</p>
                      <h4>Missing</h4>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Side by Side Tables */}
              <div className="supplies-tables-container">
                {/* Previous Orders Table */}
                <div className="supply-table-section">
                  <h3 className="supply-table-title">
                    <FileText size={20} />
                    Previous Orders
                  </h3>
                  <div className="table-wrapper" style={{ overflow: 'visible', maxHeight: 'none', height: 'auto' }}>
                    <table className="analysis-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Rx Number</th>
                          <th>Org</th>
                          <th>Medication</th>
                          <th>MD Last Name</th>
                          <th>Strength</th>
                          <th>Form</th>
                          <th>QTY</th>
                          <th>Supply</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliesComparisonResults.previousOrders && suppliesComparisonResults.previousOrders.length > 0 ? (
                          suppliesComparisonResults.previousOrders.filter((order) => {
                            if (!activeFilter || activeFilter === 'all') return true;
                            
                            // Find status by checking all arrays
                            const missingOrder = suppliesComparisonResults.missing.find(m => 
                              m.rxNumber === order.rxNumber || m === order
                            );
                            const matchingOrder = suppliesComparisonResults.matching.find(m => 
                              m.previousOrder?.rxNumber === order.rxNumber || 
                              m.previousOrder === order ||
                              (m.previousOrder?.medication === order.medication && m.previousOrder?.strength === order.strength)
                            );
                            const changedOrder = suppliesComparisonResults.changed.find(c => 
                              c.previousOrder?.rxNumber === order.rxNumber || 
                              c.previousOrder === order ||
                              (c.previousOrder?.medication === order.medication && c.previousOrder?.strength === order.strength)
                            );
                            
                            if (activeFilter === 'missing' && missingOrder) return true;
                            if (activeFilter === 'matched' && matchingOrder) return true;
                            if (activeFilter === 'changed' && changedOrder) return true;
                            return false;
                          }).map((order, idx) => {
                            // Find status by checking all arrays - match by RX number or by same object reference
                            const missingOrder = suppliesComparisonResults.missing.find(m => 
                              m.rxNumber === order.rxNumber || m === order
                            );
                            const matchingOrder = suppliesComparisonResults.matching.find(m => 
                              m.previousOrder?.rxNumber === order.rxNumber || 
                              m.previousOrder === order ||
                              (m.previousOrder?.medication === order.medication && m.previousOrder?.strength === order.strength)
                            );
                            const changedOrder = suppliesComparisonResults.changed.find(c => 
                              c.previousOrder?.rxNumber === order.rxNumber || 
                              c.previousOrder === order ||
                              (c.previousOrder?.medication === order.medication && c.previousOrder?.strength === order.strength)
                            );
                            
                            let rowClass = '';
                            let statusBadge = null;
                            
                            if (missingOrder) {
                              rowClass = 'missing-row';
                              statusBadge = <span className="status-badge missing"><X size={14} /> Missing</span>;
                            } else if (changedOrder) {
                              rowClass = 'changed-row';
                              statusBadge = <span className="status-badge changed"><RotateCcw size={14} /> Changed</span>;
                            } else if (matchingOrder) {
                              rowClass = 'matching-row';
                              statusBadge = <span className="status-badge matched"><Check size={14} /> Matched</span>;
                            }
                            
                            const isSelected = selectedRows.previous.has(idx);
                            
                            return (
                              <tr 
                                key={idx} 
                                className={`${rowClass} ${isSelected ? 'neon-selected' : ''}`}
                                onClick={() => {
                                  const newPrevious = new Set(selectedRows.previous);
                                  if (isSelected) {
                                    newPrevious.delete(idx);
                                  } else {
                                    newPrevious.add(idx);
                                  }
                                  setSelectedRows({ ...selectedRows, previous: newPrevious });
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>{statusBadge}</td>
                                <td>{order.rxNumber || '-'}</td>
                                <td>{order.org || '-'}</td>
                                <td>{order.medication || '-'}</td>
                                <td>{order.prescriber || '-'}</td>
                                <td>{order.strength || '-'}</td>
                                <td>{order.dosageForm || '-'}</td>
                                <td>{String(order.quantity || '-')}</td>
                                <td>{String(order.daySupply || '-')}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="9" className="no-data-message" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                              No orders found in previous order screenshot
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Current Orders Table */}
                <div className="supply-table-section">
                  <h3 className="supply-table-title">
                    <FileText size={20} />
                    Current Orders
                  </h3>
                  <div className="table-wrapper" style={{ overflow: 'visible', maxHeight: 'none', height: 'auto' }}>
                    <table className="analysis-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Rx Number</th>
                          <th>Org</th>
                          <th>Medication</th>
                          <th>MD Last Name</th>
                          <th>Strength</th>
                          <th>Form</th>
                          <th>QTY</th>
                          <th>Supply</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliesComparisonResults.currentOrders && suppliesComparisonResults.currentOrders.length > 0 ? (
                          suppliesComparisonResults.currentOrders.filter((order) => {
                            if (!activeFilter || activeFilter === 'all') return true;
                            
                            // Find status by checking all arrays
                            const newOrder = suppliesComparisonResults.new.find(n => 
                              n.rxNumber === order.rxNumber || n === order
                            );
                            const matchingOrder = suppliesComparisonResults.matching.find(m => 
                              m.rxNumber === order.rxNumber || 
                              m === order ||
                              (m.medication === order.medication && m.strength === order.strength)
                            );
                            const changedOrder = suppliesComparisonResults.changed.find(c => 
                              c.rxNumber === order.rxNumber || 
                              c === order ||
                              (c.medication === order.medication && c.strength === order.strength)
                            );
                            
                            if (activeFilter === 'new' && newOrder) return true;
                            if (activeFilter === 'matched' && matchingOrder) return true;
                            if (activeFilter === 'changed' && changedOrder) return true;
                            return false;
                          }).map((order, idx) => {
                            // Find status by checking all arrays - match by RX number or by same object reference
                            const newOrder = suppliesComparisonResults.new.find(n => 
                              n.rxNumber === order.rxNumber || n === order
                            );
                            const matchingOrder = suppliesComparisonResults.matching.find(m => 
                              m.rxNumber === order.rxNumber || 
                              m === order ||
                              (m.medication === order.medication && m.strength === order.strength)
                            );
                            const changedOrder = suppliesComparisonResults.changed.find(c => 
                              c.rxNumber === order.rxNumber || 
                              c === order ||
                              (c.medication === order.medication && c.strength === order.strength)
                            );
                            
                            let rowClass = '';
                            let statusBadge = null;
                            let quantityDisplay = order.quantity || '-';
                            let daySupplyDisplay = order.daySupply || '-';
                            
                            if (newOrder) {
                              rowClass = 'new-row';
                              statusBadge = <span className="status-badge new"><TrendingUp size={14} /> New</span>;
                            } else if (changedOrder) {
                              rowClass = 'changed-row';
                              statusBadge = <span className="status-badge changed"><RotateCcw size={14} /> Changed</span>;
                              
                              // Show only current values for changed quantities in current order table
                              if (changedOrder.changes?.quantity && changedOrder.previousOrder) {
                                quantityDisplay = (
                                  <span className="changed-value">
                                    {order.quantity}
                                  </span>
                                );
                              }
                              if (changedOrder.changes?.daySupply && changedOrder.previousOrder) {
                                daySupplyDisplay = (
                                  <span className="changed-value">
                                    {order.daySupply}
                                  </span>
                                );
                              }
                            } else if (matchingOrder) {
                              rowClass = 'matching-row';
                              statusBadge = <span className="status-badge matched"><Check size={14} /> Matched</span>;
                              
                              // Check if qty or days are different for matched medications
                              if (matchingOrder.previousOrder) {
                                // Simple string comparison after normalization
                                const normalizeForComparison = (val) => {
                                  return String(val || '').trim().toLowerCase();
                                };
                                
                                const qtyMatch = normalizeForComparison(order.quantity) === normalizeForComparison(matchingOrder.previousOrder.quantity);
                                const daysMatch = normalizeForComparison(order.daySupply) === normalizeForComparison(matchingOrder.previousOrder.daySupply);
                                
                                if (!qtyMatch && order.quantity) {
                                  quantityDisplay = (
                                    <span className="mismatched-value">
                                      {order.quantity}
                                    </span>
                                  );
                                }
                                
                                if (!daysMatch && order.daySupply) {
                                  daySupplyDisplay = (
                                    <span className="mismatched-value">
                                      {order.daySupply}
                                    </span>
                                  );
                                }
                              }
                            }
                            
                            const isSelected = selectedRows.current.has(idx);
                            
                            return (
                              <tr 
                                key={idx} 
                                className={`${rowClass} ${isSelected ? 'neon-selected' : ''}`}
                                onClick={() => {
                                  const newCurrent = new Set(selectedRows.current);
                                  if (isSelected) {
                                    newCurrent.delete(idx);
                                  } else {
                                    newCurrent.add(idx);
                                  }
                                  setSelectedRows({ ...selectedRows, current: newCurrent });
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <td>{statusBadge}</td>
                                <td>{order.rxNumber || '-'}</td>
                                <td>{order.org || '-'}</td>
                                <td>{order.medication || '-'}</td>
                                <td>{order.prescriber || '-'}</td>
                                <td>{order.strength || '-'}</td>
                                <td>{order.dosageForm || '-'}</td>
                                <td>{React.isValidElement(quantityDisplay) ? quantityDisplay : String(quantityDisplay || '-')}</td>
                                <td>{React.isValidElement(daySupplyDisplay) ? daySupplyDisplay : String(daySupplyDisplay || '-')}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="9" className="no-data-message" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                              No orders found in current order screenshot
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Analyzing Supplies Overlay */}
          {isAnalyzingSupplies && (
            <div className="scanning-overlay">
              <div className="scanning-content supplies-scanning">
                <div className="supplies-scan-animation">
                  <GitCompare size={64} className="supplies-scanning-icon" />
                </div>
                <p className="scan-text supplies-scan-text">Analyzing and comparing supply orders...</p>
                {analysisProgress && (
                  <p className="scan-progress-text" style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {analysisProgress}
                  </p>
                )}
                <div className="scan-progress">
                  <div className="scan-progress-bar"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default Analyzer;