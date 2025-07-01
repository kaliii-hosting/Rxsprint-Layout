import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Upload, X, ScanLine, Check, X as XIcon, AlertCircle, RotateCcw, FileText, ChevronDown, Package, GitCompare, TrendingUp, TrendingDown, ImageIcon } from 'lucide-react';
import './Analyzer.css';

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
  
  // New states for supplies comparison
  const [previousSupplyFile, setPreviousSupplyFile] = useState(null);
  const [currentSupplyFile, setCurrentSupplyFile] = useState(null);
  const [previousSupplyPreview, setPreviousSupplyPreview] = useState(null);
  const [currentSupplyPreview, setCurrentSupplyPreview] = useState(null);
  const [isAnalyzingSupplies, setIsAnalyzingSupplies] = useState(false);
  const [suppliesComparisonResults, setSuppliesComparisonResults] = useState(null);
  const [suppliesError, setSuppliesError] = useState(null);
  const [isPasteFocused, setIsPasteFocused] = useState({ previous: false, current: false });

  const fileInputRef = useRef(null);
  const resetTimeoutRef = useRef(null);
  const previousSupplyDivRef = useRef(null);
  const currentSupplyDivRef = useRef(null);

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

  // Handle paste event for supplies upload
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
        
        if (type === 'previous') {
          setPreviousSupplyFile(file);
          createPreview(file, setPreviousSupplyPreview);
        } else if (type === 'current') {
          setCurrentSupplyFile(file);
          createPreview(file, setCurrentSupplyPreview);
        }
        setSuppliesError(null);
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
  
  const removeSupplyFile = (type) => {
    if (type === 'previous') {
      setPreviousSupplyFile(null);
      setPreviousSupplyPreview(null);
    } else if (type === 'current') {
      setCurrentSupplyFile(null);
      setCurrentSupplyPreview(null);
    } else {
      // Remove all
      setPreviousSupplyFile(null);
      setCurrentSupplyFile(null);
      setPreviousSupplyPreview(null);
      setCurrentSupplyPreview(null);
      setSuppliesComparisonResults(null);
      setSuppliesError(null);
    }
  };
  
  const resetSuppliesAnalyzer = () => {
    // Clear all supplies-related state
    setPreviousSupplyFile(null);
    setCurrentSupplyFile(null);
    setPreviousSupplyPreview(null);
    setCurrentSupplyPreview(null);
    setSuppliesComparisonResults(null);
    setSuppliesError(null);
    setIsAnalyzingSupplies(false);
    
    // Reset paste focus states
    setIsPasteFocused({ previous: false, current: false });
  };
  
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

  // Supplies Analysis Functions
  const analyzeSupplies = async () => {
    if (!previousSupplyFile || !currentSupplyFile) {
      setSuppliesError('Please upload both previous and current order screenshots');
      return;
    }
    
    console.log('Starting supplies analysis...');
    console.log('Previous file:', previousSupplyFile.name, previousSupplyFile.size);
    console.log('Current file:', currentSupplyFile.name, currentSupplyFile.size);
    
    setIsAnalyzingSupplies(true);
    setSuppliesError(null);
    setSuppliesComparisonResults(null);
    
    const suppliesEndpoint = 'https://supplies-analyzer-custom.cognitiveservices.azure.com/';
    const suppliesApiKey = '8ddcbe0ec4c84b97ae4582dca553b69e';
    // Try custom model first, fallback to prebuilt if needed
    let modelId = 'Table-Format-Paid'; // Using custom trained model
    const fallbackModelId = 'prebuilt-layout';
    const apiVersion = '2023-07-31';
    
    try {
      // Analyze both documents
      console.log('Analyzing previous order document...');
      let previousData;
      try {
        previousData = await analyzeSupplyDocument(previousSupplyFile, suppliesEndpoint, suppliesApiKey, modelId, apiVersion);
      } catch (error) {
        if (error.message.includes('404') && modelId !== fallbackModelId) {
          console.warn('Custom model not found, trying prebuilt-layout model...');
          modelId = fallbackModelId;
          previousData = await analyzeSupplyDocument(previousSupplyFile, suppliesEndpoint, suppliesApiKey, modelId, apiVersion);
        } else {
          throw error;
        }
      }
      console.log('Previous order data extracted:', previousData.length, 'items');
      
      // Debug log the extracted data
      console.log('\n=== EXTRACTED PREVIOUS ORDERS ===');
      previousData.forEach((order, idx) => {
        console.log(`${idx + 1}. RX: ${order.rxNumber}, Med: "${order.medication}", Prescriber: "${order.prescriber}", Qty: "${order.quantity}", Days: "${order.daySupply}"`);
      });
      
      console.log('Analyzing current order document...');
      const currentData = await analyzeSupplyDocument(currentSupplyFile, suppliesEndpoint, suppliesApiKey, modelId, apiVersion);
      console.log('Current order data extracted:', currentData.length, 'items');
      
      // Debug log the extracted data
      console.log('\n=== EXTRACTED CURRENT ORDERS ===');
      currentData.forEach((order, idx) => {
        console.log(`${idx + 1}. RX: ${order.rxNumber}, Med: "${order.medication}", Prescriber: "${order.prescriber}", Qty: "${order.quantity}", Days: "${order.daySupply}"`);
      });
      
      // Extract tables and compare
      const comparison = compareSupplyTables(previousData, currentData);
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
      
      setSuppliesComparisonResults(comparison);
      
    } catch (err) {
      console.error('Supplies analysis error:', err);
      setSuppliesError(`Failed to analyze supply documents: ${err.message}`);
    } finally {
      setIsAnalyzingSupplies(false);
    }
  };
  
  const analyzeSupplyDocument = async (file, endpoint, apiKey, modelId, apiVersion) => {
    // Ensure endpoint ends with /
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint : endpoint + '/';
    const analyzeUrl = `${cleanEndpoint}formrecognizer/documentModels/${modelId}:analyze?api-version=${apiVersion}`;
    
    console.log('Analyzing document with URL:', analyzeUrl);
    console.log('Endpoint:', cleanEndpoint);
    console.log('Model ID:', modelId);
    console.log('API Version:', apiVersion);
    console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
    console.log('File type:', file.type);
    console.log('File size:', file.size);
    
    const response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': apiKey
      },
      body: file
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure API error response:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers);
      throw new Error(`Azure API error: ${response.status} - ${errorText}`);
    }
    
    const operationLocation = response.headers.get('operation-location');
    
    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 30;
    
    do {
      await new Promise(r => setTimeout(r, 2000));
      const resultResponse = await fetch(operationLocation, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      });
      result = await resultResponse.json();
      attempts++;
    } while ((result.status === 'running' || result.status === 'notStarted') && attempts < maxAttempts);
    
    if (result.status !== 'succeeded') {
      throw new Error('Document analysis failed');
    }
    
    // Check if we have custom model results (documents with fields) or table results
    if (result.analyzeResult.documents && result.analyzeResult.documents.length > 0) {
      // Custom model with extracted fields
      return extractSupplyFieldData(result.analyzeResult.documents[0].fields);
    } else if (result.analyzeResult.tables) {
      // Fallback to table extraction if no custom fields
      return extractSupplyTableData(result.analyzeResult);
    } else {
      console.warn('No documents or tables found in analyze result');
      return [];
    }
  };
  
  // Extract supply data from custom model fields
  const extractSupplyFieldData = (fields) => {
    console.log('Extracting supply data from custom model fields:', fields);
    console.log('Field names available:', Object.keys(fields || {}));
    
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
    
    // Check if fields contain array of orders or individual order fields
    // Option 1: Fields might be structured as order_1_rxNumber, order_2_rxNumber, etc.
    let orderIndex = 1;
    while (fields[`order_${orderIndex}_rxNumber`] || fields[`rxNumber_${orderIndex}`] || fields[`rx_${orderIndex}`]) {
      const order = {
        rxNumber: '',
        org: '',
        medication: '',
        prescriber: '',
        strength: '',
        dosageForm: '',
        quantity: '',
        daySupply: ''
      };
      
      // Try different field naming patterns your custom model might use
      const patterns = [
        {
          rxNumber: [`order_${orderIndex}_rxNumber`, `rxNumber_${orderIndex}`, `rx_${orderIndex}`, `rxNumber${orderIndex}`],
          org: [`order_${orderIndex}_org`, `org_${orderIndex}`, `organization_${orderIndex}`, `org${orderIndex}`],
          medication: [`order_${orderIndex}_medication`, `medication_${orderIndex}`, `drug_${orderIndex}`, `medication${orderIndex}`],
          prescriber: [`order_${orderIndex}_prescriber`, `prescriber_${orderIndex}`, `doctor_${orderIndex}`, `prescriber${orderIndex}`],
          strength: [`order_${orderIndex}_strength`, `strength_${orderIndex}`, `strength${orderIndex}`],
          dosageForm: [`order_${orderIndex}_dosageForm`, `dosageForm_${orderIndex}`, `form_${orderIndex}`, `dosageForm${orderIndex}`],
          quantity: [`order_${orderIndex}_quantity`, `quantity_${orderIndex}`, `qty_${orderIndex}`, `quantity${orderIndex}`],
          daySupply: [`order_${orderIndex}_daySupply`, `daySupply_${orderIndex}`, `days_${orderIndex}`, `daySupply${orderIndex}`]
        }
      ];
      
      // Extract values trying different patterns
      for (const [fieldName, fieldPatterns] of Object.entries(patterns[0])) {
        for (const pattern of fieldPatterns) {
          if (fields[pattern]) {
            order[fieldName] = getFieldValue(fields[pattern]).trim();
            break;
          }
        }
      }
      
      // Only add order if it has at least an RX number or medication
      if (order.rxNumber || order.medication) {
        orders.push(order);
      } else {
        break; // No more orders found
      }
      
      orderIndex++;
    }
    
    // Option 2: Fields might be structured as arrays or single fields
    if (orders.length === 0) {
      // Check for array fields like rxNumbers, medications, etc.
      const rxNumbers = fields.rxNumbers ? getFieldValue(fields.rxNumbers).split(/[,\n]/) : [];
      const medications = fields.medications ? getFieldValue(fields.medications).split(/[,\n]/) : [];
      const prescribers = fields.prescribers ? getFieldValue(fields.prescribers).split(/[,\n]/) : [];
      const quantities = fields.quantities ? getFieldValue(fields.quantities).split(/[,\n]/) : [];
      const daySupplies = fields.daySupplies ? getFieldValue(fields.daySupplies).split(/[,\n]/) : [];
      
      // Create orders from arrays
      const maxLength = Math.max(rxNumbers.length, medications.length);
      for (let i = 0; i < maxLength; i++) {
        const order = {
          rxNumber: (rxNumbers[i] || '').trim(),
          org: getFieldValue(fields.org || fields.organization || ''),
          medication: (medications[i] || '').trim(),
          prescriber: (prescribers[i] || '').trim(),
          strength: getFieldValue(fields.strength || ''),
          dosageForm: getFieldValue(fields.dosageForm || fields.form || ''),
          quantity: (quantities[i] || '').trim(),
          daySupply: (daySupplies[i] || '').trim()
        };
        
        if (order.rxNumber || order.medication) {
          orders.push(order);
        }
      }
    }
    
    // Option 3: Check if there's a table field containing all orders
    if (orders.length === 0 && fields.ordersTable) {
      console.log('Found ordersTable field, extracting rows...');
      const tableField = fields.ordersTable;
      
      if (tableField.type === 'array' && tableField.valueArray) {
        // Each row in the table
        tableField.valueArray.forEach((row, index) => {
          if (row.type === 'object' && row.valueObject) {
            const order = {
              rxNumber: getFieldValue(row.valueObject.rxNumber || row.valueObject.rx || ''),
              org: getFieldValue(row.valueObject.org || row.valueObject.organization || ''),
              medication: getFieldValue(row.valueObject.medication || row.valueObject.drug || ''),
              prescriber: getFieldValue(row.valueObject.prescriber || row.valueObject.doctor || ''),
              strength: getFieldValue(row.valueObject.strength || ''),
              dosageForm: getFieldValue(row.valueObject.dosageForm || row.valueObject.form || ''),
              quantity: getFieldValue(row.valueObject.quantity || row.valueObject.qty || ''),
              daySupply: getFieldValue(row.valueObject.daySupply || row.valueObject.days || '')
            };
            
            if (order.rxNumber || order.medication) {
              orders.push(order);
            }
          }
        });
      }
    }
    
    // Option 4: Check for generic order fields
    if (orders.length === 0) {
      // Log all available fields to help debug
      console.log('Available fields in custom model:', Object.keys(fields));
      console.log('Sample field structure:', fields[Object.keys(fields)[0]]);
      
      // Try to extract at least one order from generic fields
      const order = {
        rxNumber: getFieldValue(fields.rxNumber || fields.rx || fields.prescriptionNumber || ''),
        org: getFieldValue(fields.org || fields.organization || ''),
        medication: getFieldValue(fields.medication || fields.drug || fields.medicationName || ''),
        prescriber: getFieldValue(fields.prescriber || fields.doctor || fields.prescriberName || ''),
        strength: getFieldValue(fields.strength || fields.medicationStrength || ''),
        dosageForm: getFieldValue(fields.dosageForm || fields.form || ''),
        quantity: getFieldValue(fields.quantity || fields.qty || fields.quantityDispensed || ''),
        daySupply: getFieldValue(fields.daySupply || fields.days || fields.daysSupply || '')
      };
      
      if (order.rxNumber || order.medication) {
        orders.push(order);
      }
    }
    
    console.log(`Extracted ${orders.length} orders from custom model fields`);
    if (orders.length > 0) {
      console.log('Sample order:', orders[0]);
    }
    
    return orders;
  };
  
  const extractSupplyTableData = (analyzeResult) => {
    console.log('Starting table extraction from analyzeResult:', analyzeResult);
    
    const tables = analyzeResult.tables || [];
    const allOrders = [];
    
    if (tables.length === 0) {
      console.warn('No tables found in analyze result');
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
      const match = value.match(/\d+(?:\.\d+)?/);
      return match ? match[0] : '';
    };
    
    // Process each table
    tables.forEach((table, tableIndex) => {
      if (!table.cells || table.cells.length === 0) {
        console.warn(`Table ${tableIndex + 1} has no cells`);
        return;
      }
      
      console.log(`Processing table ${tableIndex + 1} with ${table.cells.length} cells`);
      
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
                if (cellMatrix[targetRow][targetCol]) {
                  // Append content if cell already has data
                  cellMatrix[targetRow][targetCol] += ' ' + content;
                } else {
                  cellMatrix[targetRow][targetCol] = content;
                }
              }
            }
          }
        });
        
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
        
        for (let col = 0; col <= maxCol; col++) {
          if (cellMatrix[0][col]) {
            const headerText = cleanContent(cellMatrix[0][col]).toLowerCase();
            columnHeaders[col] = headerText;
            
            // Try to match normalized header
            const normalizedHeader = normalizeHeaderForMatching(headerText);
            const standardField = fieldMap[normalizedHeader];
            
            if (standardField) {
              headerToFieldMap[col] = standardField;
            } else {
              console.warn(`No mapping found for header: "${headerText}" (normalized: "${normalizedHeader}")`);
            }
          }
        }
        
        console.log('Detected headers:', columnHeaders);
        console.log('Header to field mapping:', headerToFieldMap);
        
        // Create position-based fallback mapping
        const positionFallbackMap = {
          0: 'rxNumber',    // First column is usually RX number
          1: 'medication',  // Second column is usually medication
          2: 'prescriber',  // Third might be prescriber
          3: 'strength',    // Fourth might be strength
          4: 'dosageForm',  // Fifth might be dosage form
          5: 'quantity',    // Sixth might be quantity
          6: 'daySupply'    // Seventh might be day supply
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
          
          // Enhanced RX number extraction using regex
          const rxNumberMatch = firstCell.match(/^[A-Z]?(\d{6,})/);
          const looksLikeRxNumber = rxNumberMatch !== null;
          
          if (looksLikeRxNumber) {
            // Save previous order if it has at least a medication
            if (currentOrder && currentOrder.medication) {
              orders.push(currentOrder);
            }
            
            // Start new order with extracted RX number
            currentOrder = {
              rxNumber: rxNumberMatch[1], // Extract just the numeric part
              org: '',
              medication: '',
              prescriber: '',
              strength: '',
              dosageForm: '',
              quantity: '',
              daySupply: ''
            };
            
            // Process all columns for this row
            for (let col = 1; col <= maxCol; col++) {
              const header = columnHeaders[col];
              const value = cleanContent(cellMatrix[row][col]);
              
              if (value) { // Check if there's a value even if no header matched
                const fieldMap = getFieldMap();
                const standardField = fieldMap[header];
                
                // Debug logging
                if (tableIndex === 0 && orders.length < 3) { // Log first few orders of first table
                  console.log(`Row ${row}, Col ${col}: Header="${header}", Value="${value}", Maps to="${standardField || 'unmapped'}"`);
                }
                
                if (standardField && standardField !== 'rxNumber') {
                  // Apply specific processing for numeric fields
                  if (standardField === 'quantity' || standardField === 'daySupply') {
                    const numericValue = extractNumeric(value);
                    currentOrder[standardField] = numericValue;
                    if (tableIndex === 0 && orders.length < 3) {
                      console.log(`  Extracted numeric: "${numericValue}" for ${standardField}`);
                    }
                  } else {
                    currentOrder[standardField] = value;
                  }
                } else if (!header && col <= 8) {
                  // If no header matched, try to infer field by column position
                  console.warn(`No header match for col ${col}, value="${value}" - attempting position-based mapping`);
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
                    currentOrder[standardField] = extractNumeric(value);
                  } else {
                    currentOrder[standardField] = value;
                  }
                }
              }
            }
          }
        }
        
        // Don't forget the last order (only if it has medication)
        if (currentOrder && currentOrder.medication) {
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
          }
        });
        
        console.log(`Extracted ${orders.length} orders from table ${tableIndex + 1}`);
        if (orders.length > 0) {
          console.log('Sample order:', orders[0]);
        }
        allOrders.push(...orders);
        
      } catch (error) {
        console.error(`Error processing table ${tableIndex + 1}:`, error);
      }
    });
    
    // Remove duplicates based on RX number
    const uniqueOrders = [];
    const seenRxNumbers = new Set();
    
    allOrders.forEach(order => {
      if (order.rxNumber && !seenRxNumbers.has(order.rxNumber)) {
        seenRxNumbers.add(order.rxNumber);
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
      'product': 'medication',
      'item': 'medication',
      'prescriber': 'prescriber',
      'md last name': 'prescriber',
      'doctor': 'prescriber',
      'md': 'prescriber',
      'physician': 'prescriber',
      'strength': 'strength',
      'str': 'strength',
      'dosage form': 'dosageForm',
      'form': 'dosageForm',
      'dosage form': 'dosageForm',
      'dose form': 'dosageForm',
      'quantity dispensed': 'quantity',
      'quantity': 'quantity',
      'qty': 'quantity',
      'qty dispensed': 'quantity',
      'disp qty': 'quantity',
      'dispensed': 'quantity',
      'disp': 'quantity',
      'amount': 'quantity',
      'day supply': 'daySupply',
      'days': 'daySupply',
      'days supply': 'daySupply',
      'supply': 'daySupply',
      'ds': 'daySupply',
      'day': 'daySupply',
      'days supp': 'daySupply',
      'daysupply': 'daySupply'
    };
    
    // Create a normalized mapping
    const normalizedMappings = {};
    Object.entries(mappings).forEach(([key, value]) => {
      normalizedMappings[normalizeHeader(key)] = value;
    });
    
    return normalizedMappings;
  };
  
  const compareSupplyTables = (previousOrders, currentOrders) => {
    // Helper function to normalize any value for comparison
    const normalizeValue = (value) => {
      if (value === null || value === undefined) return '';
      
      // Convert to string and aggressively clean
      let str = String(value)
        .trim()
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .replace(/^\s+|\s+$/g, '') // Remove all leading/trailing whitespace
        .replace(/[\r\n\t]/g, ''); // Remove tabs, newlines
        
      // Handle common OCR artifacts
      if (str === '-' || str === '--' || str === 'N/A' || str === 'n/a') return '';
      
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
      
      // Direct string comparison after normalization
      if (norm1 === norm2) return true;
      
      // Try case-insensitive comparison
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
    
    // Enhanced medication normalization for better matching
    const normalizeMedication = (med) => {
      if (!med) return '';
      
      let normalized = med
        .toLowerCase()
        .trim()
        // Remove extra spaces
        .replace(/\s+/g, ' ')
        // Normalize common abbreviations
        .replace(/\bndl\b/gi, 'needle')
        .replace(/\bl\/l\b/gi, 'l/l')
        .replace(/\bml\b/gi, 'ml')
        // Normalize special characters
        .replace(/°/g, '*')
        .replace(/'/g, "'")
        .replace(/"/g, '"')
        .replace(/[""]/g, '"')
        // Remove parentheses content for matching
        .replace(/\([^)]*\)/g, '')
        // Normalize punctuation and spacing around punctuation
        .replace(/\s*([\/\-\*])\s*/g, '$1')
        .replace(/\s*x\s*/gi, 'x')
        // Final cleanup
        .trim();
        
      return normalized;
    };
    
    // Create a unique key for each order based on medication only
    const createOrderKey = (order) => {
      return normalizeMedication(order.medication);
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
    
    // Track which current orders have been matched
    const matchedCurrentRxNumbers = new Set();
    
    // Process each previous order
    sortedPreviousOrders.forEach(prevOrder => {
      let foundMatch = false;
      
      // First, try to match by exact RX number
      if (prevOrder.rxNumber && currentByRxNumber.has(prevOrder.rxNumber)) {
        const currentOrder = currentByRxNumber.get(prevOrder.rxNumber);
        
        if (!matchedCurrentRxNumbers.has(currentOrder.rxNumber)) {
          // Found exact RX number match - this is definitely the same prescription
          const medicationMatch = normalizeMedication(currentOrder.medication) === normalizeMedication(prevOrder.medication);
          
          if (medicationMatch) {
            // Medication matches - consider it the same order
            results.matching.push({
              ...currentOrder,
              previousOrder: prevOrder,
              status: 'matched'
            });
            results.summary.matching++;
          } else {
            // RX number matches but medication changed
            results.changed.push({
              ...currentOrder,
              previousOrder: prevOrder,
              status: 'changed',
              changes: {
                medication: !medicationMatch,
                quantity: !valuesMatch(currentOrder.quantity, prevOrder.quantity),
                daySupply: !valuesMatch(currentOrder.daySupply, prevOrder.daySupply)
              }
            });
            results.summary.changed++;
          }
          
          matchedCurrentRxNumbers.add(currentOrder.rxNumber);
          foundMatch = true;
        }
      }
      
      // If no exact match, try normalized RX number matching
      if (!foundMatch && prevOrder.rxNumber) {
        const normalizedPrevRx = normalizeRxNumber(prevOrder.rxNumber);
        const possibleMatches = currentByNormalizedRxNumber.get(normalizedPrevRx) || [];
        
        for (const currentOrder of possibleMatches) {
          if (matchedCurrentRxNumbers.has(currentOrder.rxNumber)) continue;
          
          const medicationMatch = normalizeMedication(currentOrder.medication) === normalizeMedication(prevOrder.medication);
          
          if (medicationMatch) {
            console.log(`\nNormalized RX Match Found:
  Previous: RX#${prevOrder.rxNumber} (normalized: ${normalizedPrevRx}) - "${prevOrder.medication}"
  Current:  RX#${currentOrder.rxNumber} (normalized: ${normalizeRxNumber(currentOrder.rxNumber)}) - "${currentOrder.medication}"`);
            
            // Found match by normalized RX and medication
            results.matching.push({
              ...currentOrder,
              previousOrder: prevOrder,
              status: 'matched'
            });
            results.summary.matching++;
            matchedCurrentRxNumbers.add(currentOrder.rxNumber);
            foundMatch = true;
            break;
          }
        }
      }
      
      // If no RX number match found, try matching by medication name
      if (!foundMatch) {
        const prevKey = createOrderKey(prevOrder);
        const matchingCurrentOrders = currentByMedication.get(prevKey) || [];
        
        // Look for matching current order
        for (const currentOrder of matchingCurrentOrders) {
          if (matchedCurrentRxNumbers.has(currentOrder.rxNumber)) continue;
          
          // Compare quantity and day supply
          const quantityMatch = valuesMatch(currentOrder.quantity, prevOrder.quantity);
          const daySupplyMatch = valuesMatch(currentOrder.daySupply, prevOrder.daySupply);
        
        console.log(`\nComparing orders:
  Previous: "${prevOrder.medication}" (normalized: "${normalizeMedication(prevOrder.medication)}")
            RX#${prevOrder.rxNumber} - Prescriber: "${prevOrder.prescriber}"
            Qty: "${prevOrder.quantity}" (normalized: "${normalizeValue(prevOrder.quantity)}")
            Days: "${prevOrder.daySupply}" (normalized: "${normalizeValue(prevOrder.daySupply)}")
  Current:  "${currentOrder.medication}" (normalized: "${normalizeMedication(currentOrder.medication)}")
            RX#${currentOrder.rxNumber} - Prescriber: "${currentOrder.prescriber}"
            Qty: "${currentOrder.quantity}" (normalized: "${normalizeValue(currentOrder.quantity)}")
            Days: "${currentOrder.daySupply}" (normalized: "${normalizeValue(currentOrder.daySupply)}")
  Qty Match: ${quantityMatch}, Days Match: ${daySupplyMatch}`);
        
        // Medication name matches - mark as matching regardless of qty/days
        results.matching.push({
          ...currentOrder,
          previousOrder: prevOrder,
          status: 'matched'
        });
        results.summary.matching++;
        matchedCurrentRxNumbers.add(currentOrder.rxNumber);
        foundMatch = true;
        break;
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
    sortedCurrentOrders.forEach(currentOrder => {
      if (!matchedCurrentRxNumbers.has(currentOrder.rxNumber)) {
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
    
    return results;
  };

  return (
    <div className="analyzer-page page-container">
      <div className="analyzer-content">
        <div className="analyzer-dashboard">
          {/* Toggle Banner */}
          <div className="section-toggle-banner">
            <button 
              className={`toggle-btn ${activeSection === 'prescription' ? 'active' : ''}`}
              onClick={() => setActiveSection('prescription')}
            >
              <FileText size={16} />
              Upload Prescription
            </button>
            <button 
              className={`toggle-btn ${activeSection === 'supplies' ? 'active' : ''}`}
              onClick={() => setActiveSection('supplies')}
            >
              <Package size={16} />
              Upload Supplies Order
            </button>
          </div>

          {/* Prescription Section */}
          {activeSection === 'prescription' && (
            <>
              <div className="dashboard-card upload-card">
                <div className="card-header">
                  <h3>Upload Prescription</h3>
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

              {/* Action Buttons for Prescription */}
              <div className="action-buttons">
                <button className="analyzer-action-btn reset" onClick={handleReset} disabled={!selectedFile || isAnalyzing}>
                  <RotateCcw size={16} />
                  Reset All
                </button>
                <button 
                  className="analyzer-action-btn primary"
                  onClick={() => analyzeDocument()}
                  disabled={!selectedFile || isAnalyzing}
                >
                  <ScanLine size={16} />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Document'}
                </button>
              </div>
            </>
          )}

          {/* Supplies Section */}
          {activeSection === 'supplies' && (
            <>
              <div className="dashboard-card upload-card supplies-card">
                <div className="card-header">
                  <h3>Upload Supplies Order</h3>
                  <GitCompare size={20} />
                </div>
                <div className="card-body supplies-body">
                  <div className="supplies-upload-grid">
                    {/* Previous Order Upload */}
                    <div className="supply-upload-section">
                      <h4 className="supply-upload-label">Previous Order</h4>
                      {!previousSupplyFile ? (
                        <div 
                          ref={previousSupplyDivRef}
                          className={`paste-area small ${isPasteFocused.previous ? 'paste-ready' : ''}`}
                          onPaste={(e) => handleSupplyPaste(e, 'previous')}
                          onFocus={() => setIsPasteFocused(prev => ({ ...prev, previous: true }))}
                          onBlur={() => setIsPasteFocused(prev => ({ ...prev, previous: false }))}
                          tabIndex={0}
                          title="Click here then paste screenshot (Ctrl+V)"
                        >
                          <ImageIcon size={32} className="paste-icon" />
                          <p className="paste-text small">Click Here</p>
                          <p className="paste-hint small">Then paste screenshot (Ctrl+V)</p>
                          <div className="paste-badge">
                            <span>📋 Paste Only</span>
                          </div>
                        </div>
                      ) : (
                        <div className="file-preview small">
                          <img src={previousSupplyPreview} alt="Previous Supply" />
                          <button className="remove-file small" onClick={() => removeSupplyFile('previous')}>
                            <X size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Current Order Upload */}
                    <div className="supply-upload-section">
                      <h4 className="supply-upload-label">Current Order</h4>
                      {!currentSupplyFile ? (
                        <div 
                          ref={currentSupplyDivRef}
                          className={`paste-area small ${isPasteFocused.current ? 'paste-ready' : ''}`}
                          onPaste={(e) => handleSupplyPaste(e, 'current')}
                          onFocus={() => setIsPasteFocused(prev => ({ ...prev, current: true }))}
                          onBlur={() => setIsPasteFocused(prev => ({ ...prev, current: false }))}
                          tabIndex={0}
                          title="Click here then paste screenshot (Ctrl+V)"
                        >
                          <ImageIcon size={32} className="paste-icon" />
                          <p className="paste-text small">Click Here</p>
                          <p className="paste-hint small">Then paste screenshot (Ctrl+V)</p>
                          <div className="paste-badge">
                            <span>📋 Paste Only</span>
                          </div>
                        </div>
                      ) : (
                        <div className="file-preview small">
                          <img src={currentSupplyPreview} alt="Current Supply" />
                          <button className="remove-file small" onClick={() => removeSupplyFile('current')}>
                            <X size={16} />
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
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                      className="analyzer-action-btn reset"
                      onClick={resetSuppliesAnalyzer}
                      disabled={!previousSupplyFile && !currentSupplyFile && !suppliesComparisonResults}
                      style={{ flex: 1 }}
                    >
                      <RotateCcw size={16} />
                      Reset
                    </button>
                    <button 
                      className={`analyzer-action-btn primary ${isAnalyzingSupplies ? 'analyzing' : ''}`}
                      onClick={analyzeSupplies}
                      disabled={!previousSupplyFile || !currentSupplyFile || isAnalyzingSupplies}
                      style={{ flex: 2 }}
                    >
                      <GitCompare size={16} />
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
            <div className="results-dashboard">
              <div className="results-header">
                <h2>Analysis Results</h2>
                {allAnalysisResults.length > 0 && (
                  <span className="results-count">
                    {allAnalysisResults.length} files analyzed
                  </span>
                )}
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
                      
                      <div className="table-wrapper">
                        <table className="analysis-table">
                          <thead>
                            <tr>
                              <th>Field</th>
                              <th>Prescribed</th>
                              <th>Data Entered</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fieldSections.map((section, sectionIndex) => (
                              <React.Fragment key={sectionIndex}>
                                <tr className="section-header-row">
                                  <td colSpan="4">{section.title}</td>
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
                  ))}
                </div>
              ) : (
                // Single file results
                <div className="table-wrapper">
                  <table className="analysis-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Prescribed</th>
                        <th>Data Entered</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldSections.map((section, sectionIndex) => (
                        <React.Fragment key={sectionIndex}>
                          <tr className="section-header-row">
                            <td colSpan="4">{section.title}</td>
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
              )}
            </div>
          )}

          {/* Supplies Comparison Results */}
          {suppliesComparisonResults && !isAnalyzingSupplies && (
            <div className="supplies-results-section">
              <div className="supplies-results-header">
                <h2>Supply Order Comparison</h2>
              </div>
              
              {/* Side by Side Tables */}
              <div className="supplies-tables-container">
                {/* Previous Orders Table */}
                <div className="supply-table-section">
                  <h3 className="supply-table-title">
                    <FileText size={20} />
                    Previous Orders
                  </h3>
                  <div className="table-wrapper">
                    <table className="analysis-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Rx #</th>
                          <th>Medication</th>
                          <th>Strength</th>
                          <th>Form</th>
                          <th>Qty</th>
                          <th>Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliesComparisonResults.previousOrders && suppliesComparisonResults.previousOrders.length > 0 ? (
                          suppliesComparisonResults.previousOrders.map((order, idx) => {
                            const missingOrder = suppliesComparisonResults.missing.find(m => m.rxNumber === order.rxNumber);
                            const matchingOrder = suppliesComparisonResults.matching.find(m => m.previousOrder?.rxNumber === order.rxNumber);
                            const changedOrder = suppliesComparisonResults.changed.find(c => c.previousOrder?.rxNumber === order.rxNumber);
                            
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
                            
                            return (
                              <tr key={idx} className={rowClass}>
                                <td>{statusBadge}</td>
                                <td>{order.rxNumber || '-'}</td>
                                <td>{order.medication || '-'}</td>
                                <td>{order.strength || '-'}</td>
                                <td>{order.dosageForm || '-'}</td>
                                <td>{order.quantity || '-'}</td>
                                <td>{order.daySupply || '-'}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
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
                  <div className="table-wrapper">
                    <table className="analysis-table">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Rx #</th>
                          <th>Medication</th>
                          <th>Strength</th>
                          <th>Form</th>
                          <th>Qty</th>
                          <th>Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {suppliesComparisonResults.currentOrders && suppliesComparisonResults.currentOrders.length > 0 ? (
                          suppliesComparisonResults.currentOrders.map((order, idx) => {
                            const newOrder = suppliesComparisonResults.new.find(n => n.rxNumber === order.rxNumber);
                            const matchingOrder = suppliesComparisonResults.matching.find(m => m.rxNumber === order.rxNumber);
                            const changedOrder = suppliesComparisonResults.changed.find(c => c.rxNumber === order.rxNumber);
                            
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
                              
                              // Show changed values with arrow
                              if (changedOrder.changes?.quantity && changedOrder.previousOrder) {
                                quantityDisplay = (
                                  <span className="changed-value">
                                    {changedOrder.previousOrder.quantity} → {order.quantity}
                                  </span>
                                );
                              }
                              if (changedOrder.changes?.daySupply && changedOrder.previousOrder) {
                                daySupplyDisplay = (
                                  <span className="changed-value">
                                    {changedOrder.previousOrder.daySupply} → {order.daySupply}
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
                            
                            return (
                              <tr key={idx} className={rowClass}>
                                <td>{statusBadge}</td>
                                <td>{order.rxNumber || '-'}</td>
                                <td>{order.medication || '-'}</td>
                                <td>{order.strength || '-'}</td>
                                <td>{order.dosageForm || '-'}</td>
                                <td>{quantityDisplay}</td>
                                <td>{daySupplyDisplay}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                              No orders found in current order screenshot
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Summary Cards Below Tables */}
              <div className="supplies-summary-section">
                <h3 className="summary-title">Summary Report</h3>
                <div className="supplies-summary-cards">
                  <div className="summary-card total">
                    <div className="summary-icon">
                      <Package size={20} />
                    </div>
                    <div className="summary-content">
                      <h4>Total Current Orders</h4>
                      <p className="summary-number">{suppliesComparisonResults.summary.totalCurrent}</p>
                    </div>
                  </div>
                  
                  <div className="summary-card matching">
                    <div className="summary-icon">
                      <Check size={20} />
                    </div>
                    <div className="summary-content">
                      <h4>✔️ Matched</h4>
                      <p className="summary-number">{suppliesComparisonResults.summary.matching}</p>
                    </div>
                  </div>
                  
                  <div className="summary-card changed">
                    <div className="summary-icon">
                      <RotateCcw size={20} />
                    </div>
                    <div className="summary-content">
                      <h4>🔄 Changed</h4>
                      <p className="summary-number">{suppliesComparisonResults.summary.changed || 0}</p>
                    </div>
                  </div>
                  
                  <div className="summary-card new">
                    <div className="summary-icon">
                      <TrendingUp size={20} />
                    </div>
                    <div className="summary-content">
                      <h4>🆕 New</h4>
                      <p className="summary-number">{suppliesComparisonResults.summary.new}</p>
                    </div>
                  </div>
                  
                  <div className="summary-card missing">
                    <div className="summary-icon">
                      <X size={20} />
                    </div>
                    <div className="summary-content">
                      <h4>❌ Missing</h4>
                      <p className="summary-number">{suppliesComparisonResults.summary.missing}</p>
                    </div>
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