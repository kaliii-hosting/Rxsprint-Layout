import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Upload, X, ScanLine, Check, X as XIcon, AlertCircle, RotateCcw, FileText, ChevronDown } from 'lucide-react';
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

  const fileInputRef = useRef(null);
  const resetTimeoutRef = useRef(null);

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


  // File handling
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
    });
    
    // Clear file input immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  return (
    <div className="analyzer-page page-container">
      <div className="analyzer-content">
        <div className="analyzer-dashboard">
          {/* Upload Card */}
          <div className="dashboard-card">
            <div className="card-header">
              <h3>Upload Prescription</h3>
              <FileText size={20} />
            </div>
            <div className="card-body">
              {!selectedFile ? (
                <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
                  <ScanLine size={48} className="upload-icon" />
                  <p className="upload-text">Click to upload image</p>
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

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="reset-btn" onClick={handleReset} disabled={!selectedFile || isAnalyzing}>
              Reset All
            </button>
            <button 
              className="analyze-btn"
              onClick={() => analyzeDocument()}
              disabled={!selectedFile || isAnalyzing}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Document'}
            </button>
          </div>

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
                      
                      <div className="analysis-table">
                        <div className="table-header">
                          <div>Field</div>
                          <div>Prescribed</div>
                          <div>Data Entered</div>
                          <div>Status</div>
                        </div>
                        <div className="table-body">
                          {fieldSections.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="table-section">
                              <div className="section-header">{section.title}</div>
                              {section.fields.map((field, fieldIndex) => {
                                const rxValue = fileResult.results[field.rxKey] || '';
                                const deValue = fileResult.results[field.deKey] || '';
                                const matchStatus = getMatchStatus(field.label, rxValue, deValue, fileResult.results, fileResult.results);
                                
                                return (
                                  <div key={`${sectionIndex}-${fieldIndex}`} className={`table-row ${matchStatus}-row`}>
                                    <div className="field-label">{field.label}</div>
                                    <div className={`field-value ${!rxValue ? 'empty' : ''}`}>
                                      {rxValue || '-'}
                                    </div>
                                    <div className={`field-value ${!deValue ? 'empty' : ''}`}>
                                      {deValue || '-'}
                                    </div>
                                    <div className="status-cell">
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
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Single file results
                <div className="analysis-table">
                  <div className="table-header">
                    <div>Field</div>
                    <div>Prescribed</div>
                    <div>Data Entered</div>
                    <div>Status</div>
                  </div>
                  <div className="table-body">
                    {fieldSections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="table-section">
                        <div className="section-header">{section.title}</div>
                        {section.fields.map((field, fieldIndex) => {
                          const rxValue = analysisResults[field.rxKey] || '';
                          const deValue = analysisResults[field.deKey] || '';
                          const matchStatus = getMatchStatus(field.label, rxValue, deValue, analysisResults, analysisResults);
                          
                          return (
                            <div key={`${sectionIndex}-${fieldIndex}`} className={`table-row ${matchStatus}-row`}>
                              <div className="field-label">{field.label}</div>
                              <div className={`field-value ${!rxValue ? 'empty' : ''}`}>
                                {rxValue || '-'}
                              </div>
                              <div className={`field-value ${!deValue ? 'empty' : ''}`}>
                                {deValue || '-'}
                              </div>
                              <div className="status-cell">
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
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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