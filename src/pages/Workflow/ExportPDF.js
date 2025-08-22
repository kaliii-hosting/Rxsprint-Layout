// Exact PDF Export matching Workflow UI
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
  const bottomMargin = 30;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  
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

  // Draw header and footer (IDENTICAL TO NOTES PAGE)
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
        // Logo - smaller for compact header
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
        // Text fallback if logo fails
        pdf.setFontSize(16);
        pdf.setTextColor(255, 85, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RxSprint', 15, 18);
      }
    } else {
      // No logo available - text fallback
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
    
    // User info if available
    const userInfo = 'Export by User';
    pdf.text(userInfo, pageWidth - 15, 18, { align: 'right' });
    
    // Footer section
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    
    // Footer border line
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(0, pageHeight - 12, pageWidth, pageHeight - 12);
    
    // Footer content - centered page number
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    // Only show page number in footer to avoid duplication
    pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  };

  // Check if new page needed
  const checkNewPage = (requiredSpace) => {
    if (yPosition + requiredSpace > pageHeight - bottomMargin) {
      pdf.addPage();
      pageNumber++;
      drawHeaderFooter(pageNumber, logoLoaded);
      yPosition = topMargin;
      return true;
    }
    return false;
  };

  // Generate PDF content
  const generatePDFContent = () => {
    drawHeaderFooter(pageNumber, logoLoaded);
    
    // Get selected sections
    const sectionsToExport = workflowData[activeTab].sections.filter(
      section => selectedSectionsForExport.has(section.id)
    );

    // Timeline container area
    const timelineContainerX = leftMargin - 5;
    
    sectionsToExport.forEach((section, sectionIndex) => {
      if (sectionIndex > 0) {
        yPosition += 12; // margin-bottom: 1.5rem = 24px / 2
      }
      
      checkNewPage(35);
      
      // WORKFLOW-CARD-COMPACT
      const cardHeight = 22; // Actual card height from CSS
      const cardX = leftMargin;
      const cardWidth = contentWidth;
      
      // Card border and background
      let cardBgColor = [255, 255, 255];
      let borderColor = [226, 232, 240]; // var(--border-color)
      let borderWidth = 2;
      
      // Special styling for overview card
      if (section.id === 'scenarioOverview') {
        // linear-gradient(135deg, #e6ffef, #b3ffd9)
        cardBgColor = [230, 255, 239];
        borderColor = [243, 156, 18]; // #f39c12
      }
      
      // Draw card
      drawRoundedRect(cardX, yPosition, cardWidth, cardHeight, 3, cardBgColor, borderColor, borderWidth);
      
      // WORKFLOW-CARD-ICON - 48x48px white rounded square with shadow
      const iconSize = 12; // 48px / 4
      const iconX = cardX + 5;
      const iconY = yPosition + 5;
      
      // Icon container background (white)
      drawRoundedRect(iconX, iconY, iconSize, iconSize, 3, [255, 255, 255], [226, 232, 240], 0.5);
      
      // Icon background color if specified
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
      
      // WORKFLOW-CARD-CONTENT
      const contentX = iconX + iconSize + 4; // gap: 1rem
      
      // Title - font-size: 1.125rem (18px), font-weight: 600
      pdf.setTextColor(section.id === 'scenarioOverview' ? 51 : 31, 51, 51);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.cardTitle || section.title, contentX, yPosition + 8);
      
      // Description - font-size: 0.875rem (14px)
      if (section.cardDescription) {
        pdf.setTextColor(section.id === 'scenarioOverview' ? 51 : 107, 51, 114);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(section.cardDescription, contentX, yPosition + 14);
      }
      
      // Toggle chevron
      pdf.setTextColor(156, 163, 175);
      pdf.setFontSize(10);
      const chevron = expandedSections[section.id] ? '⌃' : '⌄';
      pdf.text(chevron, cardX + cardWidth - 8, yPosition + 12);
      
      yPosition += cardHeight;
      
      // WORKFLOW-EXPANSION - if section is expanded
      if (true) { // Always show expanded content in PDF
        yPosition += 8; // margin-top: 1rem
        
        const expansionX = cardX;
        const expansionWidth = cardWidth;
        const expansionPadding = 12; // padding: 1.5rem
        
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
          section.subsections.forEach((subsection, subIdx) => {
            if (subIdx > 0) {
              yPosition += 12; // margin between subsections
            }
            
            checkNewPage(40);
            
            // SUBSECTION-HEADER RPH-TITLE
            const subHeaderX = expansionX + expansionPadding;
            const subHeaderWidth = expansionWidth - (expansionPadding * 2);
            
            // rph-title styling: gradient background, border, padding
            const headerHeight = 10;
            drawRoundedRect(subHeaderX, yPosition, subHeaderWidth, headerHeight, 3, 
              [239, 246, 255], // light blue gradient
              [59, 130, 246], // primary color border
              2
            );
            
            // Subsection icon and title
            pdf.setTextColor(59, 130, 246);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            
            // Icon mapping
            let subIcon = '▸';
            if (subsection.icon === 'CircleDot') subIcon = '◉';
            else if (subsection.icon === 'FileCheck') subIcon = '✓';
            else if (subsection.icon === 'Send') subIcon = '➤';
            else if (subsection.icon === 'FileSignature') subIcon = '✎';
            
            pdf.text(`${subIcon} ${subsection.title}`, subHeaderX + 5, yPosition + 6);
            yPosition += headerHeight + 8; // margin after header
            
            // SUBSECTION-CARD
            const cardStartY = yPosition;
            const subCardX = subHeaderX;
            const subCardWidth = subHeaderWidth;
            
            // Calculate card content height
            let cardContentHeight = 12; // base padding
            if (subsection.items) {
              subsection.items.forEach(item => {
                if (item.type === 'email-template' || item.type === 'email') {
                  cardContentHeight += 50;
                } else {
                  cardContentHeight += 15;
                  if (item.checklist) {
                    cardContentHeight += item.checklist.length * 5;
                  }
                }
              });
            }
            
            // Check if card is completed
            const isCardCompleted = completedCards.has(subsection.id);
            
            // Draw subsection card
            if (isCardCompleted) {
              // COMPLETED: #00ff88 with 3px border and glow
              drawRoundedRect(subCardX, cardStartY, subCardWidth, cardContentHeight, 3, 
                [0, 255, 136], [0, 255, 136], 3);
              
              // Checkmark in top-right
              pdf.setFillColor(0, 0, 0);
              pdf.circle(subCardX + subCardWidth - 12, cardStartY + 12, 6, 'F');
              pdf.setTextColor(255, 255, 255);
              pdf.setFontSize(10);
              pdf.text('✓', subCardX + subCardWidth - 12, cardStartY + 14, { align: 'center' });
            } else {
              // Normal card: white with 1px border
              drawRoundedRect(subCardX, cardStartY, subCardWidth, cardContentHeight, 3, 
                [255, 255, 255], [226, 232, 240], 1);
            }
            
            yPosition = cardStartY + 10; // padding inside card
            
            // Render items
            if (subsection.items) {
              subsection.items.forEach(item => {
                checkNewPage(20);
                
                if (item.type === 'email-template' || item.type === 'email') {
                  // EMAIL TEMPLATE
                  const emailX = subCardX + 8;
                  const emailWidth = subCardWidth - 16;
                  
                  // Email header background
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
                    
                    // Email fields
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
                      const bodyHeight = bodyLines.length * 4 + 4;
                      drawRoundedRect(emailX + 2, yPosition, emailWidth - 4, bodyHeight, 1,
                        [255, 251, 235], [251, 191, 36], 0.3);
                      pdf.setTextColor(isCardCompleted ? 0 : 92, 45, 0);
                      pdf.setFontSize(7);
                      bodyLines.forEach((line, idx) => {
                        pdf.text(line, emailX + 4, yPosition + 3 + (idx * 4));
                      });
                      yPosition += bodyHeight + 3;
                    }
                  } else if (item.content) {
                    // Email template content
                    pdf.setFontSize(8);
                    pdf.setTextColor(isCardCompleted ? 0 : 55, 65, 81);
                    const contentLines = pdf.splitTextToSize(item.content, emailWidth - 8);
                    contentLines.forEach((line, idx) => {
                      pdf.text(line, emailX + 4, yPosition + (idx * 4));
                    });
                    yPosition += contentLines.length * 4 + 3;
                  }
                } else {
                  // CLICKABLE ITEM with checklist
                  const itemX = subCardX + 8;
                  
                  // Completion indicator (circular, 24x24px)
                  const isItemCompleted = completedItems.has(item.id);
                  const indicatorSize = 5;
                  
                  if (isItemCompleted) {
                    pdf.setFillColor(16, 185, 129);
                    pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'F');
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFontSize(8);
                    pdf.text('✓', itemX + indicatorSize/2, yPosition + 1.5, { align: 'center' });
                  } else if (isCardCompleted) {
                    // Black circle when card is completed but item isn't
                    pdf.setFillColor(0, 0, 0);
                    pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'F');
                  } else {
                    // Empty circle
                    pdf.setDrawColor(156, 163, 175);
                    pdf.setLineWidth(0.5);
                    pdf.circle(itemX + indicatorSize/2, yPosition, indicatorSize/2, 'D');
                  }
                  
                  // Item text (strong/bold)
                  const textX = itemX + indicatorSize + 3;
                  pdf.setTextColor(isCardCompleted ? 0 : 31, 41, 55);
                  pdf.setFontSize(9);
                  pdf.setFont('helvetica', 'bold');
                  
                  const textLines = pdf.splitTextToSize(item.text, subCardWidth - (textX - subCardX) - 8);
                  textLines.forEach((line, idx) => {
                    pdf.text(line, textX, yPosition + (idx * 4));
                  });
                  yPosition += textLines.length * 4;
                  
                  // Checklist items (ul > li)
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
              });
            }
            
            yPosition = cardStartY + cardContentHeight + 8;
          });
        }
        
        yPosition += 8; // padding bottom of expansion
      }
    });
    
    // Save PDF
    const fileName = `${activeTab}_workflow_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  // Load logo and generate PDF
  return new Promise((resolve) => {
    logoImg.onload = function() {
      logoLoaded = true;
      generatePDFContent();
      resolve();
    };
    
    logoImg.onerror = function() {
      logoLoaded = false;
      generatePDFContent();
      resolve();
    };
    
    // Timeout fallback
    setTimeout(() => {
      generatePDFContent();
      resolve();
    }, 3000);
  });
};