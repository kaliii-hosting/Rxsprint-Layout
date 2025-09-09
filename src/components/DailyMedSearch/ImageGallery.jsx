import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import './ImageGallery.css';

const ImageGallery = ({ images = [], medicationName = 'Product' }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const [errorImages, setErrorImages] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleImages, setVisibleImages] = useState(new Set());
  const observerRef = useRef(null);
  const imageRefs = useRef({});

  // Setup Intersection Observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.index, 10);
            setVisibleImages(prev => new Set([...prev, index]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Observe images
  useEffect(() => {
    Object.keys(imageRefs.current).forEach(key => {
      const element = imageRefs.current[key];
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [images]);

  // Handle image load
  const handleImageLoad = (index) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }));
  };

  // Handle image error
  const handleImageError = (index) => {
    console.error(`Failed to load image ${index}`);
    setErrorImages(prev => ({ ...prev, [index]: true }));
  };

  // Navigate images
  const goToPrevious = () => {
    setSelectedIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setSelectedIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Group images by category
  const groupedImages = images.reduce((acc, img, index) => {
    const category = img.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...img, index });
    return acc;
  }, {});

  if (!images || images.length === 0) {
    return (
      <div className="image-gallery-empty">
        <ImageIcon size={48} />
        <p>No images available for this medication</p>
      </div>
    );
  }

  const currentImage = images[selectedIndex];

  return (
    <div className="image-gallery">
      {/* Main Image Viewer */}
      <div className="gallery-main">
        <div className="main-image-container">
          {!loadedImages[selectedIndex] && !errorImages[selectedIndex] && (
            <div className="image-loading">
              <Loader className="spinner" size={32} />
              <p>Loading image...</p>
            </div>
          )}
          
          {errorImages[selectedIndex] === true ? (
            <div className="image-error">
              <ImageIcon size={48} />
              <p>Unable to load image</p>
              <small>{currentImage?.title || 'Product Image'}</small>
            </div>
          ) : (
            <img
              src={currentImage.url}
              alt={currentImage?.title || `${medicationName} - Image ${selectedIndex + 1}`}
              onLoad={() => handleImageLoad(selectedIndex)}
              onError={() => handleImageError(selectedIndex)}
              style={{ display: loadedImages[selectedIndex] ? 'block' : 'none' }}
            />
          )}
        </div>

        <div className="gallery-controls">
          <button 
            className="control-button" 
            onClick={goToPrevious}
            disabled={images.length <= 1}
          >
            <ChevronLeft size={20} />
          </button>
          
          <span className="image-counter">
            {selectedIndex + 1} / {images.length}
          </span>
          
          <button 
            className="control-button" 
            onClick={goToNext}
            disabled={images.length <= 1}
          >
            <ChevronRight size={20} />
          </button>
          
          <button 
            className="control-button fullscreen-button" 
            onClick={toggleFullscreen}
          >
            <ImageIcon size={20} />
          </button>
        </div>

        <div className="image-caption">
          <strong>{currentImage?.category?.toUpperCase() || 'IMAGE'}</strong>
          <span>{currentImage?.title || 'Product Image'}</span>
        </div>
      </div>

      {/* Thumbnail Grid by Category */}
      <div className="gallery-thumbnails">
        {Object.entries(groupedImages).map(([category, categoryImages]) => (
          <div key={category} className="category-group">
            <h4 className="category-title">{category.toUpperCase()}</h4>
            <div className="thumbnail-grid">
              {categoryImages.map((image) => (
                <div
                  key={image.index}
                  ref={el => imageRefs.current[image.index] = el}
                  data-index={image.index}
                  className={`thumbnail ${selectedIndex === image.index ? 'selected' : ''}`}
                  onClick={() => setSelectedIndex(image.index)}
                >
                  {visibleImages.has(image.index) ? (
                    <>
                      {!loadedImages[`thumb-${image.index}`] && !errorImages[`thumb-${image.index}`] && (
                        <div className="thumb-loading">
                          <Loader className="spinner-small" size={16} />
                        </div>
                      )}
                      
                      {errorImages[`thumb-${image.index}`] === true ? (
                        <div className="thumb-error">
                          <ImageIcon size={20} />
                        </div>
                      ) : (
                        <img
                          src={image.url}
                          alt={image.title}
                          onLoad={() => handleImageLoad(`thumb-${image.index}`)}
                          onError={() => handleImageError(`thumb-${image.index}`)}
                          style={{ display: loadedImages[`thumb-${image.index}`] ? 'block' : 'none' }}
                          loading="lazy"
                        />
                      )}
                    </>
                  ) : (
                    <div className="thumb-placeholder">
                      <ImageIcon size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fullscreen-modal" onClick={toggleFullscreen}>
          <button className="close-button" onClick={toggleFullscreen}>
            <X size={24} />
          </button>
          
          <div className="fullscreen-content" onClick={e => e.stopPropagation()}>
            {errorImages[selectedIndex] === true ? (
              <div className="fullscreen-error">
                <ImageIcon size={64} />
                <p>Unable to load image</p>
              </div>
            ) : (
              <img
                src={currentImage.url}
                alt={currentImage?.title}
                onError={() => handleImageError(selectedIndex)}
              />
            )}
            
            <div className="fullscreen-controls">
              <button onClick={goToPrevious} disabled={images.length <= 1}>
                <ChevronLeft size={32} />
              </button>
              <span>{selectedIndex + 1} / {images.length}</span>
              <button onClick={goToNext} disabled={images.length <= 1}>
                <ChevronRight size={32} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;