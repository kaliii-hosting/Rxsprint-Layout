// Fixed PDF Export with Image Support and Footer Protection
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
    format: 'a4'
  });

  // PDF dimensions
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 35;
  const bottomMargin = 30; // Increased bottom margin for footer protection
  const footerHeight = 15; // Footer height to avoid overlap
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const maxContentHeight = pageHeight - topMargin - bottomMargin - footerHeight;
  
  let yPosition = topMargin;
  let pageNumber = 1;

  // Load logo image
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

  // Draw header and footer
  const drawHeaderFooter = (pageNum, hasLogo = false) => {
    // Professional light theme header
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Compact header section
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    
    // Orange accent line
    pdf.setFillColor(255, 85, 0);
    pdf.rect(0, 30, pageWidth, 1, 'F');
    
    // Logo or text fallback
    if (hasLogo && logoImg && logoImg.complete) {
      try {
        const logoMaxWidth = 35;
        const logoMaxHeight = 15;
        const imgRatio = logoImg.width / logoImg.height;
        let logoWidth = logoMaxWidth;
        let logoHeight = logoMaxWidth / imgRatio;
        
        if (logoHeight > logoMaxHeight) {
          logoHeight = logoMaxHeight;
          logoWidth = logoMaxHeight * imgRatio;
        }
        
        const logoX = 15;
        const logoY = 8;
        pdf.addImage(logoImg, 'PNG', logoX, logoY, logoWidth, logoHeight);
      } catch (e) {
        console.log('Logo rendering failed, using text fallback');
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
    
    // Document title - centered in header
    pdf.setFontSize(16);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    const title = `${activeTab.toUpperCase()} Workflow`;
    pdf.text(title, pageWidth / 2, 18, { align: 'center' });
    
    // Date and time in header - right aligned
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
    pdf.text(`${dateStr} | ${timeStr}`, pageWidth - 15, 12, { align: 'right' });
    
    const userInfo = 'Export by User';
    pdf.text(userInfo, pageWidth - 15, 18, { align: 'right' });
    
    // Footer section
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - footerHeight, pageWidth, footerHeight, 'F');
    
    // Footer border line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(0, pageHeight - footerHeight, pageWidth, pageHeight - footerHeight);
    
    // Footer content - centered page number
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  };

  // Enhanced check if new page needed with footer protection
  const checkNewPage = (requiredSpace) => {
    // Check if content would overlap with footer
    const availableSpace = pageHeight - yPosition - bottomMargin - footerHeight;
    if (requiredSpace > availableSpace) {
      pdf.addPage();
      pageNumber++;
      drawHeaderFooter(pageNumber, logoLoaded);
      yPosition = topMargin;
      return true;
    }
    return false;
  };

  // Function to add image to PDF with proper sizing and page breaks
  const addImageToPDF = async (imageData, maxWidth = contentWidth - 20, description = '') => {
    try {
      // Check if image needs to be added
      if (!imageData) return;

      // Add description if exists
      if (description) {
        checkNewPage(10);
        pdf.setFontSize(8);
        pdf.setTextColor(75, 85, 99);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`[Image: ${description}]`, leftMargin + 10, yPosition);
        yPosition += 5;
      }

      // Create temporary image to get dimensions
      const tempImg = new Image();
      tempImg.src = imageData;
      
      await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
        setTimeout(reject, 5000); // 5 second timeout
      });

      const imgRatio = tempImg.width / tempImg.height;
      let imgWidth = Math.min(maxWidth, tempImg.width * 0.264583); // Convert px to mm (assuming 96 DPI)
      let imgHeight = imgWidth / imgRatio;

      // Check if image fits on current page
      const imageSpace = imgHeight + 10; // Include some padding
      
      // If image is too tall for any page, scale it down
      if (imgHeight > maxContentHeight) {
        imgHeight = maxContentHeight - 20;
        imgWidth = imgHeight * imgRatio;
      }

      // Check for page break
      checkNewPage(imageSpace);

      // Center the image
      const imgX = leftMargin + (contentWidth - imgWidth) / 2;
      
      // Add image with border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.rect(imgX - 2, yPosition - 2, imgWidth + 4, imgHeight + 4, 'D');
      
      // Add the image
      pdf.addImage(imageData, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
      
      yPosition += imgHeight + 10;
      
    } catch (error) {
      console.error('Error adding image to PDF:', error);
      // Add placeholder for failed image
      checkNewPage(20);
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38);
      pdf.text('[Image could not be loaded]', leftMargin + 10, yPosition);
      yPosition += 10;
    }
  };

  // Generate PDF content
  const generatePDFContent = async () => {
    drawHeaderFooter(pageNumber, logoLoaded);
    
    // Get selected sections
    const sectionsToExport = workflowData[activeTab].sections.filter(
      section => selectedSectionsForExport.has(section.id)
    );

    for (const section of sectionsToExport) {
      if (yPosition > topMargin) {
        yPosition += 12; // margin between sections
      }
      
      checkNewPage(35);
      
      // WORKFLOW-CARD-COMPACT
      const cardHeight = 22;
      const cardX = leftMargin;
      const cardWidth = contentWidth;
      
      // Card styling
      let cardBgColor = [255, 255, 255];
      let borderColor = [226, 232, 240];
      let borderWidth = 2;
      
      if (section.id === 'scenarioOverview') {
        cardBgColor = [230, 255, 239];
        borderColor = [243, 156, 18];
      }
      
      // Draw card
      drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 3, cardBgColor, borderColor, borderWidth);
      
      // Icon
      const iconSize = 12;
      const iconX = cardX + 5;
      const iconY = yPosition + 5;
      
      drawRoundedRect(iconX, iconY, iconSize, iconSize, 3, [255, 255, 255], [226, 232, 240], 0.5);
      
      if (section.iconBg) {
        const iconBgColor = hexToRGB(section.iconBg);
        pdf.setFillColor(...iconBgColor);
        pdf.roundedRect(iconX + 1, iconY + 1, iconSize - 2, iconSize - 2, 2, 2, 'F');
      }
      
      // Icon symbol
      const iconColor = section.iconColor ? hexToRGB(section.iconColor) : [59, 130, 246];
      pdf.setTextColor(...iconColor);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      
      let iconSymbol = '📄';
      if (section.icon === 'Activity') iconSymbol = '⚡';
      else if (section.icon === 'FileText') iconSymbol = '📄';
      else if (section.icon === 'Pill') iconSymbol = '💊';
      else if (section.icon === 'Settings') iconSymbol = '⚙️';
      
      pdf.text(iconSymbol, iconX + iconSize/2, iconY + iconSize/2 + 1, { align: 'center' });
      
      // Title and description
      const contentX = iconX + iconSize + 4;
      
      pdf.setTextColor(section.id === 'scenarioOverview' ? 51 : 31, 51, 51);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.cardTitle || section.title, contentX, yPosition + 8);
      
      if (section.cardDescription) {
        pdf.setTextColor(section.id === 'scenarioOverview' ? 51 : 107, 51, 114);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(section.cardDescription, contentX, yPosition + 14);
      }
      
      // Toggle chevron
      pdf.setTextColor(156, 163, 175);
      pdf.setFontSize(10);
      const chevron = '⌄';
      pdf.text(chevron, cardX + cardWidth - 8, yPosition + 12);
      
      yPosition += cardHeight;
      
      // WORKFLOW-EXPANSION - Always show expanded content in PDF
      yPosition += 8;
      
      const expansionX = cardX;
      const expansionWidth = cardWidth;
      const expansionPadding = 12;
      
      // Expansion container background
      const expansionStartY = yPosition;
      drawRoundedRect(expansionX, expansionStartY, expansionWidth, 10, 3, [255, 255, 255], [226, 232, 240], 1);
      yPosition += expansionPadding;
      
      // Decision table
      if (section.content?.type === 'decision-table' && section.content.data) {
        checkNewPage(50);
        
        autoTable(pdf, {
          head: [section.content.data.headers],
          body: section.content.data.rows,
          startY: yPosition,
          margin: { left: expansionX + expansionPadding, right: rightMargin },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            lineColor: [226, 232, 240],
            lineWidth: 0.5
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
            0: { fontStyle: 'bold' }
          },
          didDrawPage: function(data) {
            yPosition = data.cursor.y + 5;
          }
        });
      }
      
      // Subsections
      if (section.subsections && section.subsections.length > 0) {
        for (const subsection of section.subsections) {
          yPosition += 12; // margin between subsections
          
          checkNewPage(40);
          
          // SUBSECTION-HEADER
          const subHeaderX = expansionX + expansionPadding;
          const subHeaderWidth = expansionWidth - (expansionPadding * 2);
          
          const headerHeight = 10;
          drawRoundedRect(subHeaderX, yPosition, subHeaderWidth, headerHeight, 3, 
            [239, 246, 255], [59, 130, 246], 2
          );
          
          // Subsection icon and title
          pdf.setTextColor(59, 130, 246);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          
          let subIcon = '▸';
          if (subsection.icon === 'CircleDot') subIcon = '◉';
          else if (subsection.icon === 'FileCheck') subIcon = '✓';
          else if (subsection.icon === 'Send') subIcon = '➤';
          else if (subsection.icon === 'FileSignature') subIcon = '✎';
          
          pdf.text(`${subIcon} ${subsection.title}`, subHeaderX + 5, yPosition + 6);
          yPosition += headerHeight + 8;
          
          // SUBSECTION-CARD
          const cardStartY = yPosition;
          const subCardX = subHeaderX;
          const subCardWidth = subHeaderWidth;
          
          // Calculate card content height (with better estimation for images)
          let cardContentHeight = 12; // base padding
          let hasImages = false;
          
          if (subsection.items) {
            for (const item of subsection.items) {
              if (item.type === 'email-template' || item.type === 'email') {
                cardContentHeight += 50;
              } else {
                cardContentHeight += 15;
                if (item.checklist) {
                  cardContentHeight += item.checklist.length * 5;
                }
                // Check for screenshots/images
                if (item.screenshots && item.screenshots.length > 0) {
                  hasImages = true;
                  // Don't add to card height here, we'll handle dynamically
                }
              }
            }
          }
          
          // Check if card is completed
          const isCardCompleted = completedCards.has(subsection.id);
          
          // Draw subsection card (initial height, will extend as needed)
          if (isCardCompleted) {
            drawRoundedRect(subCardX, cardStartY, subCardWidth, cardContentHeight, 3, 
              [0, 255, 136], [0, 255, 136], 3);
            
            // Checkmark in top-right
            pdf.setFillColor(0, 0, 0);
            pdf.circle(subCardX + subCardWidth - 12, cardStartY + 12, 6, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.text('✓', subCardX + subCardWidth - 12, cardStartY + 14, { align: 'center' });
          } else {
            drawRoundedRect(subCardX, cardStartY, subCardWidth, cardContentHeight, 3, 
              [255, 255, 255], [226, 232, 240], 1);
          }
          
          yPosition = cardStartY + 10; // padding inside card
          
          // Render items
          if (subsection.items) {
            for (const item of subsection.items) {
              checkNewPage(20);
              
              if (item.type === 'email-template' || item.type === 'email') {
                // EMAIL TEMPLATE
                const emailX = subCardX + 8;
                const emailWidth = subCardWidth - 16;
                
                drawRoundedRect(emailX, yPosition, emailWidth, 12, 2, 
                  [254, 243, 199], [251, 191, 36], 0.5);
                
                pdf.setTextColor(isCardCompleted ? 0 : 146, 64, 14);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text('📧 Email Template', emailX + 4, yPosition + 7);
                yPosition += 14;
                
                // Email content
                if (item.type === 'email') {
                  pdf.setFontSize(8);
                  pdf.setTextColor(isCardCompleted ? 0 : 55, 65, 81);
                  
                  if (item.to) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('To:', emailX + 2, yPosition);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(item.to.substring(0, 60), emailX + 12, yPosition);
                    yPosition += 5;
                  }
                  if (item.cc) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Cc:', emailX + 2, yPosition);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(item.cc.substring(0, 60), emailX + 12, yPosition);
                    yPosition += 5;
                  }
                  if (item.subject) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Subject:', emailX + 2, yPosition);
                    pdf.setFont('helvetica', 'normal');
                    const subjectLines = pdf.splitTextToSize(item.subject, emailWidth - 25);
                    pdf.text(subjectLines[0], emailX + 20, yPosition);
                    yPosition += 5;
                  }
                  if (item.body) {
                    yPosition += 2;
                    const bodyLines = pdf.splitTextToSize(item.body, emailWidth - 8);
                    const bodyHeight = Math.min(bodyLines.length * 4 + 4, 50); // Limit height
                    drawRoundedRect(emailX + 2, yPosition, emailWidth - 4, bodyHeight, 1,
                      [255, 251, 235], [251, 191, 36], 0.3);
                    pdf.setTextColor(isCardCompleted ? 0 : 92, 45, 0);
                    pdf.setFontSize(7);
                    const linesToShow = Math.min(bodyLines.length, 12); // Limit lines
                    for (let idx = 0; idx < linesToShow; idx++) {
                      pdf.text(bodyLines[idx], emailX + 4, yPosition + 3 + (idx * 4));
                    }
                    if (bodyLines.length > linesToShow) {
                      pdf.text('...', emailX + 4, yPosition + 3 + (linesToShow * 4));
                    }
                    yPosition += bodyHeight + 3;
                  }
                } else if (item.content) {
                  pdf.setFontSize(8);
                  pdf.setTextColor(isCardCompleted ? 0 : 55, 65, 81);
                  const contentLines = pdf.splitTextToSize(item.content, emailWidth - 8);
                  const linesToShow = Math.min(contentLines.length, 10);
                  for (let idx = 0; idx < linesToShow; idx++) {
                    pdf.text(contentLines[idx], emailX + 4, yPosition + (idx * 4));
                  }
                  yPosition += linesToShow * 4 + 3;
                }
              } else {
                // CLICKABLE ITEM with checklist
                const itemX = subCardX + 8;
                
                // Completion indicator
                const isItemCompleted = completedItems.has(item.id);
                const indicatorSize = 5;
                
                if (isItemCompleted) {
                  pdf.setFillColor(16, 185, 129);
                  pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'F');
                  pdf.setTextColor(255, 255, 255);
                  pdf.setFontSize(8);
                  pdf.text('✓', itemX + indicatorSize/2, yPosition + 1.5, { align: 'center' });
                } else if (isCardCompleted) {
                  pdf.setFillColor(0, 0, 0);
                  pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'F');
                } else {
                  pdf.setDrawColor(156, 163, 175);
                  pdf.setLineWidth(0.5);
                  pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'D');
                }
                
                // Item text
                const textX = itemX + indicatorSize + 3;
                pdf.setTextColor(isCardCompleted ? 0 : 31, 41, 55);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                
                const textLines = pdf.splitTextToSize(item.text || '', subCardWidth - (textX - subCardX) - 8);
                textLines.forEach((line, idx) => {
                  pdf.text(line, textX, yPosition + (idx * 4));
                });
                yPosition += textLines.length * 4;
                
                // Checklist items
                if (item.checklist && item.checklist.length > 0) {
                  pdf.setFontSize(8);
                  pdf.setFont('helvetica', 'normal');
                  pdf.setTextColor(isCardCompleted ? 0 : 75, 85, 99);
                  
                  item.checklist.forEach(checkItem => {
                    yPosition += 1;
                    const bulletX = textX + 4;
                    pdf.text('•', bulletX, yPosition);
                    const checkLines = pdf.splitTextToSize(checkItem, subCardWidth - (bulletX - subCardX) - 12);
                    checkLines.forEach((line, idx) => {
                      pdf.text(line, bulletX + 4, yPosition + (idx * 3.5));
                    });
                    yPosition += checkLines.length * 3.5;
                  });
                }
                
                // Add screenshots/images if they exist
                if (item.screenshots && Array.isArray(item.screenshots) && item.screenshots.length > 0) {
                  yPosition += 5; // Add spacing before images
                  
                  for (const screenshot of item.screenshots) {
                    // Ensure we don't overlap with footer
                    checkNewPage(50); // Check for minimum space needed for an image
                    
                    await addImageToPDF(
                      screenshot.data || screenshot.src,
                      subCardWidth - 20,
                      screenshot.description || ''
                    );
                  }
                }
                
                // Context menu hint
                if (item.enableContextMenu) {
                  pdf.setTextColor(156, 163, 175);
                  pdf.setFontSize(6);
                  pdf.setFont('helvetica', 'italic');
                  pdf.text('Right-click to create email', textX, yPosition + 2);
                  yPosition += 3;
                }
                
                yPosition += 4;
              }
            }
          }
          
          // Update card height if images extended it
          const actualCardHeight = yPosition - cardStartY + 8;
          if (actualCardHeight > cardContentHeight) {
            // Redraw card border with correct height
            if (isCardCompleted) {
              pdf.setDrawColor(0, 255, 136);
              pdf.setLineWidth(3);
            } else {
              pdf.setDrawColor(226, 232, 240);
              pdf.setLineWidth(1);
            }
            // Draw only the missing borders (sides and bottom)
            pdf.line(subCardX, cardStartY + cardContentHeight, subCardX, cardStartY + actualCardHeight);
            pdf.line(subCardX + subCardWidth, cardStartY + cardContentHeight, subCardX + subCardWidth, cardStartY + actualCardHeight);
            pdf.line(subCardX, cardStartY + actualCardHeight, subCardX + subCardWidth, cardStartY + actualCardHeight);
          }
          
          yPosition = cardStartY + Math.max(cardContentHeight, actualCardHeight) + 8;
        }
      }
      
      yPosition += 8; // padding bottom of expansion
    }
    
    // Save PDF
    const fileName = `${activeTab}_workflow_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  // Load logo and generate PDF
  return new Promise((resolve) => {
    logoImg.onload = async function() {
      logoLoaded = true;
      await generatePDFContent();
      resolve();
    };
    
    logoImg.onerror = async function() {
      logoLoaded = false;
      await generatePDFContent();
      resolve();
    };
    
    // Timeout fallback
    setTimeout(async () => {
      await generatePDFContent();
      resolve();
    }, 3000);
  });
};