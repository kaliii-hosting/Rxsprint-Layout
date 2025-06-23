import React from 'react';
import './PageHeader.css';

const PageHeader = ({ title, subtitle, children }) => {
  return (
    <div className="page-header-container">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
      </div>
      {(subtitle || children) && (
        <div className="page-subheader">
          {subtitle && <h2 className="page-subtitle">{subtitle}</h2>}
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;