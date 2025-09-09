import React, { useState, useEffect } from 'react';
import { 
  ChevronRight,
  Package, 
  AlertCircle,
  Building,
  Calendar,
  Hash,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useMedications } from '../../contexts/MedicationContext';
import DailyMedProductView from './DailyMedProductView';
import './DailyMedClone.css';

const DailyMedSearchResults = ({ results, count, error, currentPage, onPageChange }) => {
  const { theme } = useTheme();
  const { importFromDailyMed } = useMedications();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productImages, setProductImages] = useState({});
  const [loadingImages, setLoadingImages] = useState({});

  // Load images for all products when results change
  useEffect(() => {
    if (results && results.length > 0) {
      results.forEach(medication => {
        if (medication.setId && !productImages[medication.setId]) {
          loadProductImages(medication.setId);
        }
      });
    }
  }, [results]);

  // Load product images
  const loadProductImages = async (setId) => {
    if (loadingImages[setId] || productImages[setId]) return;
    
    setLoadingImages(prev => ({ ...prev, [setId]: true }));
    
    try {
      const { default: dailyMedService } = await import('../../services/dailyMedService');
      const images = await dailyMedService.getMedicationImages(setId);
      
      // Get only the first image for the search results
      const firstImage = images && images.length > 0 ? images[0] : null;
      
      setProductImages(prev => ({
        ...prev,
        [setId]: firstImage
      }));
    } catch (error) {
      console.error('Error loading images for', setId, error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [setId]: false }));
    }
  };

  // Handle product click - show detailed view
  const handleProductClick = (medication) => {
    console.log('Product clicked:', medication);
    setSelectedProduct(medication);
  };

  // Handle back to results
  const handleBackToResults = () => {
    setSelectedProduct(null);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Handle different date formats
      if (dateString.includes(',')) {
        // Format like "Aug 04, 2025"
        return dateString;
      }
      // Format like "20250804"
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Extract NDC codes from medication
  const getNDCCodes = (medication) => {
    const ndcSet = new Set();
    
    if (medication.packages && Array.isArray(medication.packages)) {
      medication.packages.forEach(pkg => {
        if (pkg.ndcCode) ndcSet.add(pkg.ndcCode);
        if (pkg.ndc) ndcSet.add(pkg.ndc);
      });
    }
    
    if (medication.packageDescriptions && Array.isArray(medication.packageDescriptions)) {
      medication.packageDescriptions.forEach(pkg => {
        if (pkg.ndcCode) ndcSet.add(pkg.ndcCode);
        if (pkg.ndc) ndcSet.add(pkg.ndc);
      });
    }
    
    return Array.from(ndcSet);
  };

  // Show error state
  if (error) {
    return (
      <div className="dailymed-clone">
        <div className="dm-header">
          <h1>DailyMed</h1>
          <div className="subtitle">U.S. National Library of Medicine</div>
        </div>
        <div className="dm-error">
          <AlertCircle size={24} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!results || results.length === 0) {
    return (
      <div className="dailymed-clone">
        <div className="dm-header">
          <h1>DailyMed</h1>
          <div className="subtitle">U.S. National Library of Medicine</div>
        </div>
        <div className="dm-empty">
          <div className="dm-empty-icon">
            <Package size={48} />
          </div>
          <h3>No search results found</h3>
          <p>Please try searching with different keywords</p>
        </div>
      </div>
    );
  }

  // Show product detail view if selected
  if (selectedProduct) {
    return (
      <DailyMedProductView 
        medication={selectedProduct}
        onBack={handleBackToResults}
        onImport={importFromDailyMed}
      />
    );
  }

  // Show search results list (Exact DailyMed Clone)
  return (
    <div className="dailymed-clone">
      {/* DailyMed Header */}
      <div className="dm-header">
        <h1>DailyMed</h1>
        <div className="subtitle">U.S. National Library of Medicine</div>
      </div>

      {/* Search Results Header */}
      <div className="dm-results-header">
        <h2 className="dm-results-title">
          Search Results
        </h2>
        <p className="dm-results-count">
          {count} search result{count !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Search Controls */}
      <div className="dm-controls">
        <select className="dm-sort-dropdown">
          <option>Sort By Relevance</option>
          <option>Sort By Date</option>
          <option>Sort By Name A-Z</option>
        </select>
        
        <div className="dm-pagination-info">
          <span>page {currentPage} of {Math.ceil(count / 20)}</span>
          {currentPage > 1 && (
            <button onClick={() => onPageChange(currentPage - 1)} className="dm-page-nav">
              previous
            </button>
          )}
          {currentPage < Math.ceil(count / 20) && (
            <button onClick={() => onPageChange(currentPage + 1)} className="dm-page-nav">
              next
            </button>
          )}
        </div>
        
        <select className="dm-results-per-page">
          <option>20 results per page</option>
          <option>50 results per page</option>
          <option>100 results per page</option>
        </select>
      </div>

      {/* Drug Results */}
      {results.map((medication, index) => (
        <div key={medication.setId || index} className="dm-drug-result">
          <div className="dm-drug-header">
            <h3 
              className="dm-drug-title"
              onClick={() => handleProductClick(medication)}
            >
              {medication.title}
            </h3>
            
            <div className="dm-drug-meta">
              <div className="meta-item">
                <Building size={12} />
                <span>Labeler: {medication.labelerName}</span>
              </div>
              
              {medication.updated && (
                <div className="meta-item">
                  <Calendar size={12} />
                  <span>Updated: {formatDate(medication.updated)}</span>
                </div>
              )}
              
              <div className="meta-item">
                <Hash size={12} />
                <span>Set ID: {medication.setId}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Bottom Pagination */}
      {count > results.length && (
        <div className="dm-controls">
          <div></div>
          <div className="dm-pagination-info">
            {currentPage > 1 && (
              <button 
                onClick={() => onPageChange(currentPage - 1)}
                className="dm-page-nav"
              >
                previous
              </button>
            )}
            
            <span>page {currentPage} of {Math.ceil(count / 20)}</span>
            
            {currentPage < Math.ceil(count / 20) && (
              <button 
                onClick={() => onPageChange(currentPage + 1)}
                className="dm-page-nav"
              >
                next
              </button>
            )}
          </div>
          <div></div>
        </div>
      )}
      
      {/* Footer */}
      <div className="dm-footer">
        <p>This information is provided by the U.S. National Library of Medicine</p>
      </div>
    </div>
  );
};

export default DailyMedSearchResults;