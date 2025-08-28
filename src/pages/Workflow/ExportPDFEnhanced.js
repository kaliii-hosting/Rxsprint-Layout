// Enhanced PDF Export with Professional Layout Management
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportWorkflowToPDF = async (
  workflowData,
  activeTab,
  selectedSectionsForExport,
  completedItems,
  completedCards,
  expandedSections = {}
) => {
  // Create PDF with A4 dimensions
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // PDF Layout Configuration
  const PAGE_WIDTH = pdf.internal.pageSize.width;
  const PAGE_HEIGHT = pdf.internal.pageSize.height;
  const MARGINS = {
    left: 15,
    right: 15,
    top: 35,
    bottom: 35  // Increased for better footer protection
  };
  const FOOTER = {
    height: 15,
    marginBottom: 10
  };
  const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;
  const SAFE_CONTENT_HEIGHT = PAGE_HEIGHT - MARGINS.top - MARGINS.bottom - FOOTER.height;
  
  // State management
  let yPosition = MARGINS.top;
  let pageNumber = 1;
  let totalPages = 1; // Will be updated later
  let currentSectionStartPage = 1;
  
  // Logo configuration
  const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
  const logoImg = new Image();
  logoImg.crossOrigin = 'anonymous';
  logoImg.src = logoUrl;
  let logoLoaded = false;

  // Helper functions
  const hexToRGB = (hex) => {
    if (!hex) return [200, 200, 200];
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [200, 200, 200];
  };

  const drawRoundedRect = (x, y, width, height, radius, fillColor = null, strokeColor = null, lineWidth = 0.5) => {
    if (fillColor) {
      pdf.setFillColor(...fillColor);
    }
    if (strokeColor) {
      pdf.setDrawColor(...strokeColor);
      pdf.setLineWidth(lineWidth);
    }
    pdf.roundedRect(x, y, width, height, radius, radius, fillColor && strokeColor ? 'FD' : (fillColor ? 'F' : 'D'));
  };

  // Enhanced header and footer drawing
  const drawHeaderFooter = (pageNum, isFirstPage = false) => {
    // Clear background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    
    // Header background
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, PAGE_WIDTH, 30, 'F');
    
    // Orange accent line
    pdf.setFillColor(255, 85, 0);
    pdf.rect(0, 30, PAGE_WIDTH, 1, 'F');
    
    // Logo or text
    if (logoLoaded && logoImg && logoImg.complete) {
      try {
        const logoWidth = 35;
        const logoHeight = 15;
        pdf.addImage(logoImg, 'PNG', 15, 8, logoWidth, logoHeight);
      } catch (e) {
        pdf.setFontSize(16);
        pdf.setTextColor(255, 85, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RxSprint', 15, 18);
      }
    } else {
      pdf.setFontSize(16);
      pdf.setTextColor(255, 85, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RxSprint', 15, 18);
    }
    
    // Title
    pdf.setFontSize(16);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    const title = `${activeTab.toUpperCase()} Workflow`;
    pdf.text(title, PAGE_WIDTH / 2, 18, { align: 'center' });
    
    // Date and time
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    pdf.text(`${dateStr} | ${timeStr}`, PAGE_WIDTH - 15, 12, { align: 'right' });
    pdf.text('Admin Export', PAGE_WIDTH - 15, 18, { align: 'right' });
    
    // Footer - positioned safely above bottom margin
    const footerY = PAGE_HEIGHT - MARGINS.bottom + FOOTER.marginBottom;
    
    // Footer background
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, footerY, PAGE_WIDTH, FOOTER.height, 'F');
    
    // Footer top line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(0, footerY, PAGE_WIDTH, footerY);
    
    // Footer content
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    
    // Page number centered
    const pageText = totalPages > 1 ? `Page ${pageNum} of ${totalPages}` : `Page ${pageNum}`;
    pdf.text(pageText, PAGE_WIDTH / 2, footerY + 10, { align: 'center' });
    
    // Additional footer info
    pdf.setFontSize(8);
    pdf.text('RxSprint Workflow System', 15, footerY + 10);
    pdf.text('Confidential', PAGE_WIDTH - 15, footerY + 10, { align: 'right' });
  };

  // Calculate available space on current page
  const getAvailableSpace = () => {
    return PAGE_HEIGHT - yPosition - MARGINS.bottom - FOOTER.height - FOOTER.marginBottom;
  };

  // Smart page break management
  const checkNewPage = (requiredSpace, forceNew = false) => {
    const availableSpace = getAvailableSpace();
    
    // Always force new page if requested or if required space exceeds available
    if (forceNew || requiredSpace > availableSpace) {
      // Don't create unnecessary white space - only force if we've used significant page space
      if (forceNew || yPosition > MARGINS.top + 30) {
        pdf.addPage();
        pageNumber++;
        drawHeaderFooter(pageNumber, false);
        yPosition = MARGINS.top;
        return true;
      }
    }
    return false;
  };

  // Calculate content height before rendering
  const estimateContentHeight = (content, fontSize = 9, width = CONTENT_WIDTH) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(content || '', width);
    return lines.length * (fontSize * 0.35) + 5;
  };

  // Process images with intelligent page management
  const addImageToPDF = async (imageData, maxWidth = CONTENT_WIDTH - 20, description = '', forceNewPage = false) => {
    return new Promise(async (resolve) => {
      try {
        if (!imageData) {
          resolve(0);
          return;
        }

        // Load image to get dimensions
        const tempImg = new Image();
        tempImg.src = imageData;
        
        await new Promise((imgResolve, imgReject) => {
          tempImg.onload = imgResolve;
          tempImg.onerror = imgReject;
          setTimeout(imgReject, 5000);
        });

        const imgRatio = tempImg.width / tempImg.height;
        let imgWidth = Math.min(maxWidth, tempImg.width * 0.264583); // Convert px to mm
        let imgHeight = imgWidth / imgRatio;

        // Limit image height to fit on a single page
        const maxImageHeight = SAFE_CONTENT_HEIGHT - 30;
        if (imgHeight > maxImageHeight) {
          imgHeight = maxImageHeight;
          imgWidth = imgHeight * imgRatio;
        }

        // Calculate total space needed
        let totalSpace = imgHeight + 15; // Image + padding
        if (description) {
          totalSpace += 8; // Space for description
        }

        // Check if we need a new page
        const availableSpace = getAvailableSpace();
        
        // Smart page breaking for images
        if (forceNewPage || totalSpace > availableSpace) {
          // If we're more than 30% through the page, start a new page
          if (yPosition > MARGINS.top + (SAFE_CONTENT_HEIGHT * 0.3)) {
            checkNewPage(totalSpace, true);
          }
        }

        // Add description if provided and there's space
        if (description && getAvailableSpace() > 20) {
          pdf.setFontSize(8);
          pdf.setTextColor(75, 85, 99);
          pdf.setFont('helvetica', 'italic');
          pdf.text(`Image: ${description}`, MARGINS.left + 10, yPosition);
          yPosition += 6;
        }

        // Center image horizontally
        const imgX = MARGINS.left + (CONTENT_WIDTH - imgWidth) / 2;
        
        // Draw image border
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.5);
        pdf.rect(imgX - 2, yPosition - 2, imgWidth + 4, imgHeight + 4, 'D');
        
        // Add the image
        pdf.addImage(imageData, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 12;
        
        resolve(imgHeight + 15);
        
      } catch (error) {
        console.error('Error adding image:', error);
        // Add error placeholder
        pdf.setFontSize(8);
        pdf.setTextColor(220, 38, 38);
        pdf.text('[Image failed to load]', MARGINS.left + 10, yPosition);
        yPosition += 8;
        resolve(8);
      }
    });
  };

  // Handle tables with proper page breaks
  const addTableToPDF = (tableData, startY) => {
    return new Promise((resolve) => {
      // Estimate table height
      const estimatedHeight = (tableData.rows.length + 1) * 10;
      
      // Check if we should start on a new page
      if (estimatedHeight > getAvailableSpace() && yPosition > MARGINS.top + 40) {
        checkNewPage(estimatedHeight, true);
        startY = yPosition;
      }

      autoTable(pdf, {
        head: [tableData.headers],
        body: tableData.rows,
        startY: startY,
        margin: { left: MARGINS.left + 10, right: MARGINS.right },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: [226, 232, 240],
          lineWidth: 0.5,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          textColor: [55, 65, 81]
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 'auto' }
        },
        // Ensure content doesn't overlap footer
        showFoot: 'everyPage',
        didDrawPage: function(data) {
          // Redraw header/footer if table spans multiple pages
          if (data.pageNumber > pageNumber) {
            pageNumber = data.pageNumber;
          }
        },
        margin: { bottom: MARGINS.bottom + FOOTER.height + FOOTER.marginBottom }
      });

      yPosition = pdf.previousAutoTable.finalY + 10;
      resolve(yPosition);
    });
  };

  // Main content generation
  const generateContent = async () => {
    // Initialize first page
    drawHeaderFooter(pageNumber, true);
    
    // Get sections to export
    const sectionsToExport = workflowData[activeTab].sections.filter(
      section => selectedSectionsForExport.has(section.id)
    );

    if (sectionsToExport.length === 0) {
      pdf.setFontSize(12);
      pdf.setTextColor(107, 114, 128);
      pdf.text('No sections selected for export', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: 'center' });
      return;
    }

    // Process each section
    for (let sectionIndex = 0; sectionIndex < sectionsToExport.length; sectionIndex++) {
      const section = sectionsToExport[sectionIndex];
      
      // Add spacing between sections (not before first)
      if (sectionIndex > 0) {
        yPosition += 15;
      }
      
      // Check if section header fits
      checkNewPage(40);
      
      // Section card rendering
      const cardHeight = 24;
      const cardX = MARGINS.left;
      const cardWidth = CONTENT_WIDTH;
      
      // Section styling
      let cardBgColor = [255, 255, 255];
      let borderColor = [226, 232, 240];
      let borderWidth = 2;
      
      if (section.id === 'scenarioOverview') {
        cardBgColor = [230, 255, 239];
        borderColor = [243, 156, 18];
      }
      
      // Draw section card
      drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 3, cardBgColor, borderColor, borderWidth);
      
      // Section icon
      const iconSize = 14;
      const iconX = cardX + 6;
      const iconY = yPosition + 5;
      
      drawRoundedRect(iconX, iconY, iconSize, iconSize, 3, [255, 255, 255], [226, 232, 240], 0.5);
      
      if (section.iconBg) {
        const iconBgColor = hexToRGB(section.iconBg);
        pdf.setFillColor(...iconBgColor);
        pdf.roundedRect(iconX + 1, iconY + 1, iconSize - 2, iconSize - 2, 2, 2, 'F');
      }
      
      // Icon symbol
      pdf.setTextColor(...(section.iconColor ? hexToRGB(section.iconColor) : [59, 130, 246]));
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      const iconSymbols = {
        'Activity': '⚡',
        'FileText': '📄',
        'Pill': '💊',
        'Settings': '⚙️'
      };
      const iconSymbol = iconSymbols[section.icon] || '📄';
      pdf.text(iconSymbol, iconX + iconSize/2, iconY + iconSize/2 + 2, { align: 'center' });
      
      // Section title and description
      const contentX = iconX + iconSize + 6;
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.cardTitle || section.title, contentX, yPosition + 9);
      
      if (section.cardDescription) {
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(section.cardDescription, cardWidth - (contentX - cardX) - 10);
        pdf.text(descLines[0], contentX, yPosition + 16);
      }
      
      yPosition += cardHeight + 10;
      
      // Process decision tables
      if (section.content?.type === 'decision-table' && section.content.data) {
        checkNewPage(60);
        await addTableToPDF(section.content.data, yPosition);
      }
      
      // Process subsections
      if (section.subsections && section.subsections.length > 0) {
        for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
          const subsection = section.subsections[subIndex];
          
          // Detect image-only subsections
          const isImageOnly = subsection.items && 
            subsection.items.length > 0 && 
            subsection.items.every(item => 
              (!item.text || item.text.trim() === '') && 
              (!item.type || item.type === 'item') &&
              item.screenshots && 
              item.screenshots.length > 0
            );
          
          // Handle image-only subsections specially
          if (isImageOnly) {
            // Minimal header for image-only subsections
            if (getAvailableSpace() > 50) {
              pdf.setTextColor(59, 130, 246);
              pdf.setFontSize(10);
              pdf.setFont('helvetica', 'bold');
              pdf.text(subsection.title, MARGINS.left + 10, yPosition);
              yPosition += 8;
            } else {
              checkNewPage(50, true);
            }
            
            // Process images
            for (const item of subsection.items) {
              if (item.screenshots && Array.isArray(item.screenshots)) {
                for (let imgIndex = 0; imgIndex < item.screenshots.length; imgIndex++) {
                  const screenshot = item.screenshots[imgIndex];
                  // Force new page for first image if needed to avoid blank pages
                  const forceNew = imgIndex === 0 && getAvailableSpace() < 100;
                  await addImageToPDF(
                    screenshot.data || screenshot.src,
                    CONTENT_WIDTH - 30,
                    '',
                    forceNew
                  );
                }
              }
            }
            continue;
          }
          
          // Regular subsection processing
          if (subIndex > 0) {
            yPosition += 10;
          }
          
          checkNewPage(50);
          
          // Subsection header
          const subHeaderX = MARGINS.left + 10;
          const subHeaderWidth = CONTENT_WIDTH - 20;
          const headerHeight = 12;
          
          drawRoundedRect(subHeaderX, yPosition, subHeaderWidth, headerHeight, 3, 
            [239, 246, 255], [59, 130, 246], 2
          );
          
          // Subsection title
          pdf.setTextColor(59, 130, 246);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          
          const subIcons = {
            'CircleDot': '◉',
            'FileCheck': '✓',
            'Send': '➤',
            'FileSignature': '✎'
          };
          const subIcon = subIcons[subsection.icon] || '▸';
          
          pdf.text(`${subIcon} ${subsection.title}`, subHeaderX + 5, yPosition + 7);
          yPosition += headerHeight + 8;
          
          // Process subsection items
          if (subsection.items) {
            for (const item of subsection.items) {
              // Check space for item
              checkNewPage(25);
              
              if (item.type === 'email-template' || item.type === 'email') {
                // Email template
                const emailX = subHeaderX + 5;
                const emailWidth = subHeaderWidth - 10;
                
                drawRoundedRect(emailX, yPosition, emailWidth, 12, 2, 
                  [254, 243, 199], [251, 191, 36], 0.5);
                
                pdf.setTextColor(146, 64, 14);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text('📧 Email Template', emailX + 4, yPosition + 7);
                yPosition += 14;
                
                // Email details
                if (item.type === 'email') {
                  pdf.setFontSize(8);
                  pdf.setTextColor(55, 65, 81);
                  
                  if (item.to) {
                    checkNewPage(6);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('To:', emailX + 2, yPosition);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(item.to, emailX + 12, yPosition);
                    yPosition += 5;
                  }
                  
                  if (item.subject) {
                    checkNewPage(6);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Subject:', emailX + 2, yPosition);
                    pdf.setFont('helvetica', 'normal');
                    const subjectLines = pdf.splitTextToSize(item.subject, emailWidth - 25);
                    pdf.text(subjectLines[0], emailX + 22, yPosition);
                    yPosition += 5;
                  }
                  
                  if (item.body) {
                    const bodyLines = pdf.splitTextToSize(item.body, emailWidth - 10);
                    const linesToShow = Math.min(bodyLines.length, 8);
                    for (let i = 0; i < linesToShow; i++) {
                      checkNewPage(5);
                      pdf.text(bodyLines[i], emailX + 4, yPosition);
                      yPosition += 4;
                    }
                    yPosition += 3;
                  }
                }
              } else {
                // Regular item
                const itemX = subHeaderX + 5;
                
                // Completion indicator
                const isCompleted = completedItems.has(item.id);
                const indicatorSize = 5;
                
                if (isCompleted) {
                  pdf.setFillColor(16, 185, 129);
                  pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'F');
                } else {
                  pdf.setDrawColor(156, 163, 175);
                  pdf.setLineWidth(0.5);
                  pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'D');
                }
                
                // Item text
                if (item.text) {
                  const textX = itemX + indicatorSize + 4;
                  pdf.setTextColor(31, 41, 55);
                  pdf.setFontSize(9);
                  pdf.setFont('helvetica', 'bold');
                  
                  const textLines = pdf.splitTextToSize(item.text, subHeaderWidth - (textX - subHeaderX) - 10);
                  for (let i = 0; i < textLines.length; i++) {
                    checkNewPage(5);
                    pdf.text(textLines[i], textX, yPosition + (i * 4));
                  }
                  yPosition += textLines.length * 4 + 2;
                }
                
                // Checklist
                if (item.checklist && item.checklist.length > 0) {
                  pdf.setFontSize(8);
                  pdf.setFont('helvetica', 'normal');
                  pdf.setTextColor(75, 85, 99);
                  
                  for (const checkItem of item.checklist) {
                    checkNewPage(5);
                    const bulletX = itemX + 10;
                    pdf.text('•', bulletX, yPosition);
                    const checkLines = pdf.splitTextToSize(checkItem, subHeaderWidth - (bulletX - subHeaderX) - 15);
                    for (let i = 0; i < checkLines.length; i++) {
                      pdf.text(checkLines[i], bulletX + 5, yPosition + (i * 3.5));
                    }
                    yPosition += checkLines.length * 3.5 + 2;
                  }
                }
                
                // Screenshots
                if (item.screenshots && Array.isArray(item.screenshots) && item.screenshots.length > 0) {
                  yPosition += 5;
                  for (const screenshot of item.screenshots) {
                    await addImageToPDF(
                      screenshot.data || screenshot.src,
                      subHeaderWidth - 20,
                      screenshot.description || ''
                    );
                  }
                }
                
                yPosition += 6;
              }
            }
          }
        }
      }
      
      yPosition += 10;
    }
  };

  // Generate PDF with proper page counting
  const generatePDF = async () => {
    try {
      // First pass - generate content
      await generateContent();
      
      // Update total pages
      totalPages = pdf.internal.getNumberOfPages();
      
      // Second pass - update page numbers if multiple pages
      if (totalPages > 1) {
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // Clear footer area
          pdf.setFillColor(255, 255, 255);
          const footerY = PAGE_HEIGHT - MARGINS.bottom + FOOTER.marginBottom;
          pdf.rect(0, footerY, PAGE_WIDTH, FOOTER.height, 'F');
          
          // Redraw footer with correct page numbers
          pdf.setFillColor(248, 250, 252);
          pdf.rect(0, footerY, PAGE_WIDTH, FOOTER.height, 'F');
          
          pdf.setDrawColor(226, 232, 240);
          pdf.setLineWidth(0.3);
          pdf.line(0, footerY, PAGE_WIDTH, footerY);
          
          pdf.setFontSize(9);
          pdf.setTextColor(107, 114, 128);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, footerY + 10, { align: 'center' });
          
          pdf.setFontSize(8);
          pdf.text('RxSprint Workflow System', 15, footerY + 10);
          pdf.text('Confidential', PAGE_WIDTH - 15, footerY + 10, { align: 'right' });
        }
      }
      
      // Save the PDF
      const fileName = `${activeTab}_workflow_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    }
  };

  // Load logo and generate PDF
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      logoLoaded = false;
      generatePDF().then(resolve).catch(reject);
    }, 3000);

    logoImg.onload = () => {
      clearTimeout(timeout);
      logoLoaded = true;
      generatePDF().then(resolve).catch(reject);
    };
    
    logoImg.onerror = () => {
      clearTimeout(timeout);
      logoLoaded = false;
      generatePDF().then(resolve).catch(reject);
    };
  });
};