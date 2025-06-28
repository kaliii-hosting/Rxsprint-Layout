import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Import combined supplies data
import suppliesData from './combined_supplies.json';
import './Shop.css';

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [quantities, setQuantities] = useState({});
  const [addedItems, setAddedItems] = useState(new Set());
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [cartButtonAnimating, setCartButtonAnimating] = useState(false);
  const location = useLocation();
  const productRefs = useRef({});

  // Load cart from localStorage on component mount
  useEffect(() => {
    const savedCart = localStorage.getItem('rxsprintCart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('rxsprintCart', JSON.stringify(cart));
  }, [cart]);

  // Define common supplies that can be used across multiple infusion types
  const commonSuppliesPatterns = [
    // Syringes without needles
    { pattern: /SYRINGE.*L\/L NO N/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Needles for medication preparation
    { pattern: /NEEDLE.*G.*HYPO/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Saline flushes
    { pattern: /SOD CHLOR|SALINE FLUSH|NORMAL SALINE/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Heparin flushes
    { pattern: /HEPARIN.*FLUSH/i, categories: ['PIC', 'PORT'] },
    // IV extension sets
    { pattern: /IV EXT.*SET|CLAVE EXT SET/i, categories: ['PIC', 'PIV', 'PORT'] },
    // IV tubing
    { pattern: /TUBING.*CURLIN|IV ADMIN SET/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Biopatch
    { pattern: /BIOPATCH/i, categories: ['PIC', 'PIV', 'PORT'] },
    // IV filters
    { pattern: /IV EXT.*MICR.*FILT/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Ultra site valves
    { pattern: /ULTRA SITE.*VAL/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Alcohol swabs
    { pattern: /ALCOHOL SWAB/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Tegaderm dressings
    { pattern: /TEGADERM/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Gloves
    { pattern: /GLOVES/i, categories: ['PIC', 'PIV', 'PORT'] },
    // Sterile drapes
    { pattern: /STERILE.*DRAPE/i, categories: ['PIC', 'PIV', 'PORT'] }
  ];

  // Process products from JSON data
  useEffect(() => {
    const processProducts = () => {
      const allProducts = [];
      const { infusion_supplies, additional_supplies } = suppliesData.medical_supplies_database;
      
      // Create a map to track unique products across all categories
      const productMap = new Map();
      
      // First pass: collect all products with their original categories
      Object.entries(infusion_supplies).forEach(([category, items]) => {
        items.forEach(item => {
          const key = item.irc_code || item.name;
          if (!productMap.has(key)) {
            productMap.set(key, {
              ...item,
              categories: new Set([category]),
              originalCategory: category
            });
          } else {
            // If product already exists, just add this category
            productMap.get(key).categories.add(category);
          }
        });
      });
      
      // Second pass: apply common supply patterns
      productMap.forEach((product, key) => {
        commonSuppliesPatterns.forEach(({ pattern, categories }) => {
          if (pattern.test(product.name)) {
            categories.forEach(cat => product.categories.add(cat));
          }
        });
      });
      
      // Third pass: create product entries for each applicable category
      productMap.forEach((product, key) => {
        product.categories.forEach(category => {
          allProducts.push({
            id: `${category}-${product.irc_code || key}`,
            category,
            name: product.name,
            irc_code: product.irc_code,
            description: product.description,
            purpose: product.purpose,
            image_url: product.image_url,
            isCommon: product.categories.size > 1,
            originalCategory: product.originalCategory
          });
        });
      });

      // Process additional supplies
      if (additional_supplies) {
        additional_supplies.forEach((item, index) => {
          const key = item.irc_code || `GEN${index + 1}`;
          
          // These supplies should appear in GENERAL and all infusion categories
          const applicableCategories = ['GENERAL', 'PIC', 'PIV', 'PORT'];
          
          applicableCategories.forEach(category => {
            allProducts.push({
              id: `${category}-${key}`,
              category,
              name: item.name,
              irc_code: item.irc_code || key,
              description: item.description,
              purpose: item.purpose,
              image_url: item.image_url,
              isCommon: true,
              originalCategory: 'GENERAL'
            });
          });
        });
      }

      setProducts(allProducts);
      setLoading(false);
    };

    processProducts();
  }, []);

  // Handle navigation from search
  useEffect(() => {
    if (location.state?.selectedProductId && location.state?.scrollToProduct) {
      const productId = location.state.selectedProductId;
      
      // Find the product's category to set the filter
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedCategory(product.category);
        
        // Scroll to the product after a short delay
        setTimeout(() => {
          const element = productRefs.current[productId];
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Highlight the product temporarily
            setAddedItems(new Set([productId]));
            setTimeout(() => {
              setAddedItems(new Set());
            }, 2000);
          }
        }, 300);
      }
      
      // Clear the navigation state
      window.history.replaceState({}, document.title);
    }
  }, [location.state, products]);

  // Add to cart function
  const addToCart = (product, quantity = 1) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + quantity);
    } else {
      setCart([...cart, { ...product, quantity }]);
    }
    
    // Animate cart button
    setCartButtonAnimating(true);
    setTimeout(() => {
      setCartButtonAnimating(false);
    }, 600);
    
    // Highlight item animation
    setAddedItems(prev => new Set([...prev, product.id]));
    setTimeout(() => {
      setAddedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 1000);
    
    // Reset quantity for this product
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
  };
  
  // Update product quantity selector
  const updateProductQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > 99) return;
    setQuantities(prev => ({ ...prev, [productId]: newQuantity }));
  };

  // Update quantity function
  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item => 
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  // Remove from cart function
  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  // Toggle item highlight
  const toggleHighlight = (productId) => {
    setCart(cart.map(item => 
      item.id === productId ? { ...item, highlighted: !item.highlighted } : item
    ));
  };

  // Open product modal
  const openProductModal = (product) => {
    setSelectedProduct(product);
    setModalQuantity(1);
    setShowProductModal(true);
  };

  // Close product modal
  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setModalQuantity(1);
  };

  // Add to cart from modal
  const addToCartFromModal = () => {
    if (selectedProduct) {
      addToCart(selectedProduct, modalQuantity);
      closeProductModal();
    }
  };

  // Filter products
  const filteredProducts = (() => {
    if (selectedCategory === 'ALL') {
      // For ALL category, show each unique product only once
      // Prefer showing from original category
      const seen = new Set();
      return products.filter(product => {
        const key = product.irc_code || product.name;
        
        // If we haven't seen this product yet
        if (!seen.has(key)) {
          // Check if this is the original category version
          const isOriginal = product.category === product.originalCategory;
          
          if (isOriginal) {
            seen.add(key);
            return true;
          } else {
            // Check if original category version exists in products
            const hasOriginal = products.some(p => 
              (p.irc_code || p.name) === key && 
              p.category === p.originalCategory
            );
            
            if (!hasOriginal) {
              // No original exists, show first occurrence
              seen.add(key);
              return true;
            }
            return false;
          }
        }
        return false;
      });
    } else {
      // For specific categories, show all products in that category
      return products.filter(product => product.category === selectedCategory);
    }
  })();

  // Get unique categories
  const categories = ['ALL', ...new Set(products.map(p => p.category))];

  // Cart item count
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  
  // Export cart to PDF with professional light theme
  const exportCartToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Add logo
    const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
    const img = new Image();
    img.src = logoUrl;
    
    img.onload = function() {
      // Professional light theme header
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Light header section
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Orange accent line
      doc.setFillColor(255, 85, 0);
      doc.rect(0, 45, pageWidth, 2, 'F');
      
      // Logo - maintain aspect ratio
      const logoMaxWidth = 50;
      const logoMaxHeight = 25;
      const imgRatio = img.width / img.height;
      let logoWidth = logoMaxWidth;
      let logoHeight = logoMaxWidth / imgRatio;
      
      if (logoHeight > logoMaxHeight) {
        logoHeight = logoMaxHeight;
        logoWidth = logoMaxHeight * imgRatio;
      }
      
      doc.addImage(img, 'PNG', 20, 10, logoWidth, logoHeight);
      
      // Date and order info
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = currentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Generated: ${formattedDate} at ${formattedTime}`, pageWidth - 20, 20, { align: 'right' });
      doc.text(`Order ID: ORD-${Date.now().toString().slice(-6)}`, pageWidth - 20, 30, { align: 'right' });
      doc.text(`Total Items: ${cart.length} | Total Qty: ${cartItemCount}`, pageWidth - 20, 40, { align: 'right' });
      
      // Main title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(51, 65, 85);
      doc.text('Supply Order Summary', 20, 65);
      
      // Create table data with product description
      const tableData = cart.map((item, index) => [
        (index + 1).toString(),
        item.name,
        item.irc_code || 'N/A',
        item.description || 'No description available',
        item.quantity.toString()
      ]);
      
      // Professional table with light theme - centered and wider
      const tableWidth = 170; // Wider table
      const startX = (pageWidth - tableWidth) / 2; // Center the table
      
      autoTable(doc, {
        head: [['#', 'Product Name', 'IRC Code', 'Description', 'Qty']],
        body: tableData,
        startY: 75,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 85, 0],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold',
          cellPadding: 8,
          halign: 'center',
          valign: 'middle',
          overflow: 'visible',
          font: 'helvetica' // Closest to Satoshi in jsPDF
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 8,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
          valign: 'middle',
          font: 'helvetica', // Closest to Satoshi in jsPDF
          fontStyle: 'normal'
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', font: 'helvetica' },
          1: { cellWidth: 60, halign: 'left', font: 'helvetica', overflow: 'linebreak' },
          2: { cellWidth: 30, halign: 'center', overflow: 'visible', font: 'helvetica' },
          3: { cellWidth: 55, halign: 'left', overflow: 'linebreak', font: 'helvetica' },
          4: { cellWidth: 10, halign: 'center', fontStyle: 'bold', font: 'helvetica' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
          overflow: 'visible'
        },
        margin: { left: startX, right: startX }
      });
      
      
      // Professional footer
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(0, pageHeight - 25, pageWidth, pageHeight - 25);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('RX Sprint Medical Supplies', 20, pageHeight - 12);
      doc.text('Page 1', pageWidth - 20, pageHeight - 12, { align: 'right' });
      
      // Save the PDF
      doc.save(`RX-Sprint-Supply-Order-${new Date().toISOString().split('T')[0]}.pdf`);
    };
    
    // Fallback if image fails to load
    img.onerror = function() {
      // Generate PDF without logo
      generatePDFContent();
    };
    
    // Helper function to generate PDF content
    const generatePDFContent = () => {
      // Professional light theme header
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      
      // Light header section
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Orange accent line
      doc.setFillColor(255, 85, 0);
      doc.rect(0, 45, pageWidth, 2, 'F');
      
      // Fallback text when no logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 85, 0);
      doc.text('RX SPRINT', 20, 25);
      
      
      // Date and order info
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = currentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Generated: ${formattedDate} at ${formattedTime}`, pageWidth - 20, 20, { align: 'right' });
      doc.text(`Order ID: ORD-${Date.now().toString().slice(-6)}`, pageWidth - 20, 30, { align: 'right' });
      doc.text(`Total Items: ${cart.length} | Total Qty: ${cartItemCount}`, pageWidth - 20, 40, { align: 'right' });
      
      // Main title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(51, 65, 85);
      doc.text('Supply Order Summary', 20, 65);
      
      // Create table data with product description
      const tableData = cart.map((item, index) => [
        (index + 1).toString(),
        item.name,
        item.irc_code || 'N/A',
        item.description || 'No description available',
        item.quantity.toString()
      ]);
      
      // Professional table with light theme - centered and wider
      const tableWidth = 170; // Wider table
      const startX = (pageWidth - tableWidth) / 2; // Center the table
      
      autoTable(doc, {
        head: [['#', 'Product Name', 'IRC Code', 'Description', 'Qty']],
        body: tableData,
        startY: 75,
        theme: 'grid',
        headStyles: {
          fillColor: [255, 85, 0],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: 'bold',
          cellPadding: 8,
          halign: 'center',
          valign: 'middle',
          overflow: 'visible',
          font: 'helvetica' // Closest to Satoshi in jsPDF
        },
        bodyStyles: {
          fontSize: 10,
          cellPadding: 8,
          textColor: [51, 65, 85],
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
          valign: 'middle',
          font: 'helvetica', // Closest to Satoshi in jsPDF
          fontStyle: 'normal'
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold', font: 'helvetica' },
          1: { cellWidth: 60, halign: 'left', font: 'helvetica', overflow: 'linebreak' },
          2: { cellWidth: 30, halign: 'center', overflow: 'visible', font: 'helvetica' },
          3: { cellWidth: 55, halign: 'left', overflow: 'linebreak', font: 'helvetica' },
          4: { cellWidth: 10, halign: 'center', fontStyle: 'bold', font: 'helvetica' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        styles: {
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
          overflow: 'visible'
        },
        margin: { left: startX, right: startX }
      });
      
      
      // Professional footer
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(0, pageHeight - 25, pageWidth, pageHeight - 25);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('RX Sprint Medical Supplies', 20, pageHeight - 12);
      doc.text('Page 1', pageWidth - 20, pageHeight - 12, { align: 'right' });
      
      // Save the PDF
      doc.save(`RX-Sprint-Supply-Order-${new Date().toISOString().split('T')[0]}.pdf`);
    };
  };

  return (
    <div className="shop-page page-container">
      <div className="shop-header">
        <h1 className="shop-title">Medical Supplies Shop</h1>
        <div className="header-right">
          <div className="category-filters">
            {categories.map(category => (
              <button
                key={category}
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'PIC' ? 'PICC' : category}
              </button>
            ))}
          </div>
          <button 
            className={`cart-button ${cartButtonAnimating ? 'animate' : ''}`}
            onClick={() => setShowCart(!showCart)}
          >
            <ShoppingCart size={24} />
            {cartItemCount > 0 && (
              <span className="cart-badge">{cartItemCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="shop-content">
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                ref={el => productRefs.current[product.id] = el}
                className={`product-card ${addedItems.has(product.id) ? 'added' : ''}`}
                onClick={(e) => {
                  // Only open modal if clicked outside of add to cart button
                  if (!e.target.closest('.add-to-cart-btn') && !e.target.closest('.quantity-selector')) {
                    openProductModal(product);
                  }
                }}
              >
                <div className="product-image">
                  <img 
                    src={product.image_url || `https://via.placeholder.com/200?text=${encodeURIComponent(product.name.substring(0, 20))}`} 
                    alt={product.name}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200?text=' + encodeURIComponent(product.name.substring(0, 20));
                    }}
                  />
                  {!product.isCommon && (
                    <span className="category-badge">{product.category === 'PIC' ? 'PICC' : product.category}</span>
                  )}
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-code">IRC: {product.irc_code}</p>
                  <p className="product-description">{product.description}</p>
                  <p className="product-purpose">{product.purpose}</p>
                  <div className="product-footer">
                    <div className="product-actions">
                      <div className="quantity-selector">
                        <button 
                          className="quantity-btn"
                          onClick={() => updateProductQuantity(product.id, (quantities[product.id] || 1) - 1)}
                        >
                          <ChevronDown size={16} />
                        </button>
                        <input 
                          type="number" 
                          className="quantity-input"
                          value={quantities[product.id] || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            updateProductQuantity(product.id, val);
                          }}
                          min="1"
                          max="99"
                        />
                        <button 
                          className="quantity-btn"
                          onClick={() => updateProductQuantity(product.id, (quantities[product.id] || 1) + 1)}
                        >
                          <ChevronUp size={16} />
                        </button>
                      </div>
                      <button 
                        className="add-to-cart-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product, quantities[product.id] || 1);
                        }}
                      >
                        <ShoppingCart size={16} />
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${showCart ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button 
            className="close-cart"
            onClick={() => setShowCart(false)}
          >
            ×
          </button>
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            cart.map(item => (
              <div 
                key={item.id} 
                className={`cart-item ${item.highlighted ? 'highlighted' : ''}`}
                onClick={() => toggleHighlight(item.id)}
              >
                <div className="cart-item-image">
                  <img 
                    src={item.image_url || `https://via.placeholder.com/60?text=${encodeURIComponent(item.name.substring(0, 10))}`} 
                    alt={item.name}
                    onError={(e) => { 
                      e.target.src = 'https://via.placeholder.com/60?text=' + encodeURIComponent(item.name.substring(0, 10)); 
                    }}
                  />
                </div>
                <div className="cart-item-info">
                  <h4>{item.name}</h4>
                  <p className="cart-item-code">IRC: {item.irc_code}</p>
                </div>
                <div className="quantity-controls">
                  <button 
                    className="quantity-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, item.quantity - 1);
                    }}
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, parseInt(e.target.value) || 0);
                    }}
                    className="quantity-input"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button 
                    className="quantity-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQuantity(item.id, item.quantity + 1);
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-footer-content">
              <button 
                className="checkout-btn"
                onClick={() => exportCartToPDF()}
              >
                <FileText size={20} />
                Export Report
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Product Modal */}
      {showProductModal && selectedProduct && (
        <div className="product-modal-overlay" onClick={closeProductModal}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={closeProductModal}>
              ×
            </button>
            
            <div className="product-modal-content">
              <div className="product-modal-image-section">
                <img 
                  src={selectedProduct.image_url || `https://via.placeholder.com/250?text=${encodeURIComponent(selectedProduct.name)}`} 
                  alt={selectedProduct.name}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/250?text=' + encodeURIComponent(selectedProduct.name);
                  }}
                />
                {!selectedProduct.isCommon && (
                  <span className="category-badge" style={{position: 'absolute', top: '20px', right: '20px'}}>
                    {selectedProduct.category === 'PIC' ? 'PICC' : selectedProduct.category}
                  </span>
                )}
              </div>
              
              <div className="product-modal-details">
                <div className="product-modal-info-row">
                  <h3 className="product-modal-name">{selectedProduct.name}</h3>
                  <p className="product-modal-code">IRC: {selectedProduct.irc_code || 'N/A'}</p>
                </div>
                
                <div className="product-modal-description">
                  <div className="product-modal-info-label">Description</div>
                  <p className="product-modal-info-value">{selectedProduct.description}</p>
                </div>
                
                <div className="product-modal-purpose">
                  <div className="product-modal-info-label">Clinical Purpose</div>
                  <p className="product-modal-info-value">{selectedProduct.purpose}</p>
                </div>
              </div>
            </div>
            
            <div className="product-modal-footer">
              <div className="modal-quantity-controls">
                <button 
                  className="quantity-btn"
                  onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={modalQuantity}
                  onChange={(e) => setModalQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="quantity-input"
                  min="1"
                  max="99"
                />
                <button 
                  className="quantity-btn"
                  onClick={() => setModalQuantity(Math.min(99, modalQuantity + 1))}
                >
                  <Plus size={16} />
                </button>
              </div>
              <button className="modal-add-to-cart-btn" onClick={addToCartFromModal}>
                <ShoppingCart size={20} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shop;