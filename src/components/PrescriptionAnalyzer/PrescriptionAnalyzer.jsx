import React from 'react';
import './PrescriptionAnalyzer.css';

const PrescriptionAnalyzer = ({
  analysisResults,
  allAnalysisResults,
  fieldSections,
  getMatchStatus
}) => {

  // Format DOB with age calculation
  const formatDOBWithAge = (dobString) => {
    if (!dobString || dobString === '-') return dobString;
    const dobParts = dobString.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (dobParts) {
      const month = parseInt(dobParts[1]);
      const day = parseInt(dobParts[2]);
      const year = parseInt(dobParts[3]) < 100 ? 1900 + parseInt(dobParts[3]) : parseInt(dobParts[3]);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${dobString} (Age: ${age})`;
    }
    return dobString;
  };

  // Format address
  const formatAddress = (addressData) => {
    if (!addressData) return '-';
    if (typeof addressData === 'string') return addressData;

    let addressString = '';
    if (addressData.street1) addressString += addressData.street1;
    if (addressData.street2) addressString += `, ${addressData.street2}`;
    if (addressData.city || addressData.state || addressData.zip) {
      addressString += addressString ? ', ' : '';
      if (addressData.city) addressString += addressData.city;
      if (addressData.state) addressString += addressString.includes(addressData.city) ? `, ${addressData.state}` : addressData.state;
      if (addressData.zip) addressString += ` ${addressData.zip}`;
    }
    return addressString;
  };

  // Get status badge based on match status
  const getStatusBadge = (matchStatus, hasValue) => {
    if (!hasValue) {
      return <span className="status-badge missing">✗ Missing</span>;
    }

    switch(matchStatus) {
      case 'match':
        return <span className="status-badge matched">✓ Matched</span>;
      case 'mismatch':
        return <span className="status-badge changed">✗ Mismatch</span>;
      case 'partial':
        return <span className="status-badge partial">? Partial</span>;
      default:
        return <span className="status-badge empty">-</span>;
    }
  };

  // Render single table with field, electronic prescription, data entered, status columns
  const renderComparisonTable = (results, fileName = null) => {
    return (
      <div className="prescription-comparison-container">
        {fileName && (
          <h3 className="file-result-title">{fileName}</h3>
        )}

        <div className="comparison-table-wrapper">
          <table className="prescription-comparison-table">
            <colgroup>
              <col style={{width: '140px'}} />
              <col style={{width: 'calc((100% - 280px) / 2)'}} />
              <col style={{width: 'calc((100% - 280px) / 2)'}} />
              <col style={{width: '140px'}} />
            </colgroup>
            <thead>
              <tr>
                <th className="field-header">FIELD</th>
                <th className="rx-header">ELECTRONIC PRESCRIPTION</th>
                <th className="de-header">DATA ENTERED</th>
                <th className="status-header">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {fieldSections.map((section, sectionIndex) => (
                section.fields.map((field, fieldIndex) => {
                  const rxValue = results[field.rxKey] || '';
                  const deValue = results[field.deKey] || '';
                  const matchStatus = getMatchStatus(field.label, rxValue, deValue, results, results);

                  let displayRxValue = rxValue;
                  let displayDeValue = deValue;

                  if (field.label === 'DOB') {
                    displayDeValue = formatDOBWithAge(deValue);
                  } else if (field.label === 'Address') {
                    displayRxValue = formatAddress(rxValue);
                    displayDeValue = formatAddress(deValue);
                  }

                  const rowClass = !deValue ? 'missing-row' :
                                 matchStatus === 'match' ? 'matching-row' :
                                 matchStatus === 'mismatch' ? 'changed-row' :
                                 matchStatus === 'partial' ? 'partial-row' : '';

                  return (
                    <tr key={`${sectionIndex}-${fieldIndex}`} className={rowClass}>
                      <td className="field-cell">
                        <div className={`field-banner ${!deValue ? 'missing' : matchStatus}`}>
                          <span className="section-label">{section.title}</span>
                          <span className="field-label">
                            {field.label}{field.required && <span className="required">*</span>}
                          </span>
                        </div>
                      </td>
                      <td className="rx-value-cell">
                        {displayRxValue || '-'}
                      </td>
                      <td className="de-value-cell">
                        {displayDeValue || '-'}
                      </td>
                      <td className="status-cell">
                        {getStatusBadge(matchStatus, deValue)}
                      </td>
                    </tr>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Multiple files results
  if (allAnalysisResults && allAnalysisResults.length > 0) {
    return (
      <div className="prescription-analyzer-container">
        <div className="prescription-analyzer-results">
          {allAnalysisResults.map((fileResult, fileIndex) => (
            <div key={fileIndex}>
              {renderComparisonTable(fileResult.results, fileResult.fileName)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Single file results
  if (analysisResults) {
    return (
      <div className="prescription-analyzer-container">
        {renderComparisonTable(analysisResults)}
      </div>
    );
  }

  return null;
};

export default PrescriptionAnalyzer;