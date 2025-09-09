import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, Loader } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import dailyMedService from '../../services/dailyMedService';
import { clearDailyMedCache } from '../../utils/clearDailyMedCache';
import './DailyMedClone.css';

const DailyMedSearch = ({ onSearchResults, onSearching }) => {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState({
    manufacturer: '',
    drugClass: '',
    limit: 20
  });
  
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Clear cache on mount to ensure fresh, accurate data
  useEffect(() => {
    console.log('Clearing DailyMed cache to ensure fresh data');
    clearDailyMedCache();
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (query, searchFilters) => {
    if (!query || query.trim().length < 2) {
      onSearchResults({ results: [], count: 0 });
      return;
    }

    setIsSearching(true);
    if (onSearching) onSearching(true);

    try {
      const results = await dailyMedService.searchMedications(query, searchFilters);
      onSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      onSearchResults({ 
        results: [], 
        count: 0, 
        error: 'Failed to search medications. Please try again.' 
      });
    } finally {
      setIsSearching(false);
      if (onSearching) onSearching(false);
    }
  }, [onSearchResults, onSearching]);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    if (value.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(value, filters);
      }, 500);

      // Fetch autocomplete suggestions
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      onSearchResults({ results: [], count: 0 });
    }
  };

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (query) => {
    try {
      const suggestionsList = await dailyMedService.getAutocompleteSuggestions(query);
      setSuggestions(suggestionsList.slice(0, 5));
      setShowSuggestions(suggestionsList.length > 0);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, filters);
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Re-run search if there's a query
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery, newFilters);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSearchResults({ results: [], count: 0 });
    searchInputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Enter') {
      setShowSuggestions(false);
      performSearch(searchQuery, filters);
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="dailymed-clone">
      {/* DailyMed Header */}
      <div className="dm-header">
        <h1>DailyMed</h1>
        <div className="subtitle">U.S. National Library of Medicine</div>
      </div>

      {/* Search Interface */}
      <div className="dm-search-section">
        <div className="dm-search-container">
          <div className="dm-search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Enter drug name, NDC, or labeler..."
              className="dm-search-input"
              autoComplete="off"
            />
            <button
              onClick={() => performSearch(searchQuery, filters)}
              className="dm-search-button"
              disabled={searchQuery.length < 2 || isSearching}
            >
              {isSearching ? (
                <Loader size={16} className="spinning" />
              ) : (
                <Search size={16} />
              )}
              Search
            </button>
            {searchQuery && !isSearching && (
              <button 
                onClick={clearSearch}
                className="dm-clear-button"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Advanced Search Toggle */}
          <div className="dm-advanced-search">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`dm-filter-toggle ${showFilters ? 'active' : ''}`}
            >
              <Filter size={14} />
              Advanced Search
            </button>
          </div>

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="dm-suggestions-dropdown">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="dm-suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Search size={12} />
                  <span>{suggestion}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="dm-filters-section">
            <h3>Advanced Search Options</h3>
            <div className="dm-filters-grid">
              <div className="dm-filter-group">
                <label htmlFor="manufacturer-filter">Labeler/Manufacturer</label>
                <input
                  id="manufacturer-filter"
                  type="text"
                  value={filters.manufacturer}
                  onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                  placeholder="Enter manufacturer name..."
                  className="dm-filter-input"
                />
              </div>
              <div className="dm-filter-group">
                <label htmlFor="drugclass-filter">Drug Class</label>
                <input
                  id="drugclass-filter"
                  type="text"
                  value={filters.drugClass}
                  onChange={(e) => handleFilterChange('drugClass', e.target.value)}
                  placeholder="Enter drug class..."
                  className="dm-filter-input"
                />
              </div>
              <div className="dm-filter-group">
                <label htmlFor="limit-filter">Results per page</label>
                <select
                  id="limit-filter"
                  value={filters.limit}
                  onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                  className="dm-filter-select"
                >
                  <option value="10">10 results</option>
                  <option value="20">20 results</option>
                  <option value="50">50 results</option>
                  <option value="100">100 results</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyMedSearch;