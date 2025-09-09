import React, { useState } from 'react';

const ImageDebug = ({ setId, imageName }) => {
  const [imageError, setImageError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Different URL patterns to try
  const imageUrls = [
    `/api/dailymed/image.cfm?name=${encodeURIComponent(imageName)}&setid=${setId}`,
    `/api/dailymed/image.cfm?setid=${setId}&name=${encodeURIComponent(imageName)}`,
    `https://dailymed.nlm.nih.gov/dailymed/image.cfm?name=${encodeURIComponent(imageName)}&setid=${setId}`,
    `/api/dailymed-image?name=${encodeURIComponent(imageName)}&setid=${setId}`,
    `/dailymed-images/image.cfm?name=${encodeURIComponent(imageName)}&setid=${setId}`
  ];
  
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const currentUrl = imageUrls[currentUrlIndex];
  
  const handleImageError = (e) => {
    console.error(`Image failed to load: ${currentUrl}`, e);
    setImageError(`Failed: ${currentUrl}`);
    
    // Try next URL
    if (currentUrlIndex < imageUrls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1);
    }
  };
  
  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${currentUrl}`);
    setImageLoaded(true);
  };
  
  return (
    <div style={{ 
      border: '2px solid #ccc', 
      padding: '10px', 
      margin: '10px 0',
      backgroundColor: '#f9f9f9'
    }}>
      <h4>Image Debug Info:</h4>
      <p><strong>Set ID:</strong> {setId}</p>
      <p><strong>Image Name:</strong> {imageName}</p>
      <p><strong>Current URL (#{currentUrlIndex + 1}):</strong> <code>{currentUrl}</code></p>
      <p><strong>Status:</strong> {imageLoaded ? '✅ Loaded' : imageError ? `❌ ${imageError}` : '⏳ Loading...'}</p>
      
      <div style={{ marginTop: '10px' }}>
        <img 
          src={currentUrl}
          alt={imageName}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{
            maxWidth: '100%',
            border: '1px solid #000',
            display: imageLoaded ? 'block' : 'none'
          }}
        />
        {!imageLoaded && !imageError && <p>Loading image...</p>}
        {imageError && currentUrlIndex >= imageUrls.length - 1 && (
          <div style={{ color: 'red' }}>
            <p>All URL patterns failed. Possible issues:</p>
            <ul>
              <li>Image name might be incorrect</li>
              <li>Proxy configuration might need adjustment</li>
              <li>DailyMed might require different parameters</li>
            </ul>
          </div>
        )}
      </div>
      
      <div style={{ marginTop: '10px' }}>
        <button onClick={() => {
          setCurrentUrlIndex(0);
          setImageError(null);
          setImageLoaded(false);
        }}>Retry</button>
        
        <button onClick={() => {
          // Try direct fetch to debug
          fetch(currentUrl)
            .then(res => {
              console.log('Fetch response:', res);
              return res.text();
            })
            .then(text => {
              console.log('Response text (first 500 chars):', text.substring(0, 500));
            })
            .catch(err => {
              console.error('Fetch error:', err);
            });
        }} style={{ marginLeft: '10px' }}>
          Test Fetch
        </button>
      </div>
    </div>
  );
};

export default ImageDebug;