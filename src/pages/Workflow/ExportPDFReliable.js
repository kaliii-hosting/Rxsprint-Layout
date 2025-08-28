// Reliable PDF Export with Complete Content Handling
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const exportWorkflowToPDFReliable = async (
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
    compress: true,
    hotfixes: ['px_scaling']
  });

  // PDF Layout Configuration - Optimized for maximum content
  const PAGE_WIDTH = pdf.internal.pageSize.width;
  const PAGE_HEIGHT = pdf.internal.pageSize.height;
  const MARGINS = {
    left: 10,      // Reduced for more content space
    right: 10,     // Reduced for more content space
    top: 25,       // Reduced but safe for header
    bottom: 20     // Reduced but safe for footer
  };
  const FOOTER = {
    height: 10,
    marginBottom: 5
  };
  const CONTENT_WIDTH = PAGE_WIDTH - MARGINS.left - MARGINS.right;
  const SAFE_CONTENT_HEIGHT = PAGE_HEIGHT - MARGINS.top - MARGINS.bottom;
  
  // State management
  let yPosition = MARGINS.top;
  let pageNumber = 1;
  let totalPages = 1;
  let contentBuffer = [];
  
  // Logo configuration
  const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
  let logoImg = null;
  let logoLoaded = false;
  
  try {
    logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logoUrl;
    await new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(), 2000);
      logoImg.onload = () => {
        logoLoaded = true;
        clearTimeout(timeout);
        resolve();
      };
      logoImg.onerror = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  } catch (e) {
    console.log('Logo loading skipped');
  }

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

  // Simplified header and footer
  const drawHeaderFooter = (pageNum) => {
    // Header
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, PAGE_WIDTH, 20, 'F');
    
    // Header line
    pdf.setDrawColor(255, 85, 0);
    pdf.setLineWidth(0.5);
    pdf.line(0, 20, PAGE_WIDTH, 20);
    
    // Logo or text
    if (logoLoaded && logoImg) {
      try {
        pdf.addImage(logoImg, 'PNG', 10, 3, 30, 12);
      } catch (e) {
        pdf.setFontSize(14);
        pdf.setTextColor(255, 85, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text('RxSprint', 10, 12);
      }
    } else {
      pdf.setFontSize(14);
      pdf.setTextColor(255, 85, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RxSprint', 10, 12);
    }
    
    // Title
    pdf.setFontSize(12);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${activeTab.toUpperCase()} Workflow`, PAGE_WIDTH / 2, 12, { align: 'center' });
    
    // Date
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    const dateStr = new Date().toLocaleDateString();
    pdf.text(dateStr, PAGE_WIDTH - 10, 12, { align: 'right' });
    
    // Footer
    const footerY = PAGE_HEIGHT - 15;
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.2);
    pdf.line(10, footerY, PAGE_WIDTH - 10, footerY);
    
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageNum}${totalPages > 1 ? ` of ${totalPages}` : ''}`, PAGE_WIDTH / 2, footerY + 5, { align: 'center' });
  };

  // Calculate available space
  const getAvailableSpace = () => {
    return PAGE_HEIGHT - yPosition - MARGINS.bottom;
  };

  // Smart page break with content preservation
  const checkNewPage = (requiredSpace, forceNew = false) => {
    const availableSpace = getAvailableSpace();
    
    if (forceNew || requiredSpace > availableSpace) {
      // Only add page if we've used some of the current page
      if (yPosition > MARGINS.top + 10) {
        pdf.addPage();
        pageNumber++;
        drawHeaderFooter(pageNumber);
        yPosition = MARGINS.top;
        return true;
      }
    }
    return false;
  };

  // Process HTML tables from subsection content
  const processHTMLTable = async (htmlContent, maxWidth = CONTENT_WIDTH - 10) => {
    try {
      // Create temporary container
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = `${maxWidth * 3.78}px`; // Convert mm to px (approximate)
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      // Extract table data
      const tables = tempDiv.querySelectorAll('table');
      const tableData = [];

      for (const table of tables) {
        const headers = [];
        const rows = [];

        // Get headers
        const headerCells = table.querySelectorAll('thead th, thead td');
        headerCells.forEach(cell => {
          headers.push(cell.textContent.trim());
        });

        // If no thead, try first row
        if (headers.length === 0) {
          const firstRow = table.querySelector('tr');
          if (firstRow) {
            firstRow.querySelectorAll('th, td').forEach(cell => {
              headers.push(cell.textContent.trim());
            });
          }
        }

        // Get body rows
        const bodyRows = table.querySelectorAll('tbody tr');
        const startIndex = headers.length === 0 ? 1 : 0;
        
        bodyRows.forEach((row, index) => {
          if (headers.length === 0 && index === 0) return; // Skip if used as header
          const rowData = [];
          row.querySelectorAll('td, th').forEach(cell => {
            rowData.push(cell.textContent.trim());
          });
          if (rowData.length > 0) {
            rows.push(rowData);
          }
        });

        // If still no headers but have rows, create generic headers
        if (headers.length === 0 && rows.length > 0) {
          for (let i = 0; i < rows[0].length; i++) {
            headers.push(`Column ${i + 1}`);
          }
        }

        tableData.push({ headers, rows });
      }

      // Clean up
      document.body.removeChild(tempDiv);
      return tableData;
    } catch (error) {
      console.error('Error processing HTML table:', error);
      return [];
    }
  };

  // Enhanced table rendering with better page management
  const addTableToPDF = async (tableData, startY = null) => {
    if (!tableData || (!tableData.headers && !tableData.rows)) return;

    const tableStartY = startY || yPosition;
    
    // Ensure headers and rows are arrays
    const headers = Array.isArray(tableData.headers) ? tableData.headers : 
                   (tableData.headers ? [tableData.headers] : []);
    const rows = Array.isArray(tableData.rows) ? tableData.rows : 
                (tableData.rows ? [tableData.rows] : []);

    if (headers.length === 0 && rows.length === 0) return;

    // Use autoTable with better configuration
    autoTable(pdf, {
      head: headers.length > 0 ? [headers] : undefined,
      body: rows,
      startY: tableStartY,
      margin: { 
        left: MARGINS.left, 
        right: MARGINS.right,
        bottom: MARGINS.bottom
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
        overflow: 'linebreak',
        cellWidth: 'auto'
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
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
      didDrawPage: function(data) {
        // Handle page breaks within table
        if (data.pageNumber > pageNumber) {
          pageNumber = data.pageNumber;
          drawHeaderFooter(pageNumber);
        }
      },
      willDrawPage: function(data) {
        // Ensure proper margins on new pages
        if (data.pageNumber > pageNumber) {
          data.settings.margin.top = MARGINS.top;
        }
      }
    });

    yPosition = pdf.previousAutoTable.finalY + 5;
  };

  // Enhanced image processing with better sizing
  const addImageToPDF = async (imageData, maxWidth = CONTENT_WIDTH - 10, description = '') => {
    if (!imageData) return;

    try {
      const img = new Image();
      img.src = imageData;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 3000);
      });

      // Calculate dimensions
      const imgRatio = img.width / img.height;
      let imgWidth = Math.min(maxWidth, img.width * 0.264583); // px to mm
      let imgHeight = imgWidth / imgRatio;

      // Limit height to prevent page overflow
      const maxHeight = SAFE_CONTENT_HEIGHT - 20;
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = imgHeight * imgRatio;
      }

      // Check space and add new page if needed
      const requiredSpace = imgHeight + (description ? 10 : 5);
      checkNewPage(requiredSpace);

      // Add description
      if (description) {
        pdf.setFontSize(8);
        pdf.setTextColor(75, 85, 99);
        pdf.setFont('helvetica', 'italic');
        pdf.text(description, MARGINS.left, yPosition);
        yPosition += 5;
      }

      // Center image
      const imgX = MARGINS.left + (CONTENT_WIDTH - imgWidth) / 2;
      
      // Add border
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.rect(imgX - 1, yPosition - 1, imgWidth + 2, imgHeight + 2, 'D');
      
      // Add image
      pdf.addImage(imageData, 'JPEG', imgX, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 5;
      
    } catch (error) {
      console.error('Image processing error:', error);
      pdf.setFontSize(8);
      pdf.setTextColor(220, 38, 38);
      pdf.text('[Image could not be loaded]', MARGINS.left, yPosition);
      yPosition += 5;
    }
  };

  // Main content generation
  const generateContent = async () => {
    drawHeaderFooter(pageNumber);
    
    // Get sections to export
    const sectionsToExport = workflowData[activeTab].sections.filter(
      section => selectedSectionsForExport.has(section.id)
    );

    if (sectionsToExport.length === 0) {
      pdf.setFontSize(11);
      pdf.setTextColor(107, 114, 128);
      pdf.text('No sections selected for export', PAGE_WIDTH / 2, PAGE_HEIGHT / 2, { align: 'center' });
      return;
    }

    // Process each section
    for (let sectionIndex = 0; sectionIndex < sectionsToExport.length; sectionIndex++) {
      const section = sectionsToExport[sectionIndex];
      
      // Section spacing
      if (sectionIndex > 0) {
        yPosition += 8;
      }
      
      // Check space for section header
      checkNewPage(25);
      
      // Draw section header
      pdf.setFillColor(239, 246, 255);
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(1);
      pdf.roundedRect(MARGINS.left, yPosition, CONTENT_WIDTH, 20, 2, 2, 'FD');
      
      // Section title
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(section.cardTitle || section.title, MARGINS.left + 5, yPosition + 7);
      
      // Section description
      if (section.cardDescription) {
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(section.cardDescription, CONTENT_WIDTH - 10);
        if (descLines.length > 0) {
          pdf.text(descLines[0], MARGINS.left + 5, yPosition + 13);
        }
      }
      
      yPosition += 25;
      
      // Process subsections
      if (section.subsections && section.subsections.length > 0) {
        for (const subsection of section.subsections) {
          // Subsection header
          checkNewPage(15);
          
          pdf.setFillColor(248, 250, 252);
          pdf.rect(MARGINS.left + 5, yPosition, CONTENT_WIDTH - 10, 8, 'F');
          
          pdf.setTextColor(59, 130, 246);
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`▸ ${subsection.title}`, MARGINS.left + 7, yPosition + 5);
          yPosition += 10;
          
          // Process subsection items
          if (subsection.items && subsection.items.length > 0) {
            for (const item of subsection.items) {
              // Item text
              if (item.text && item.text.trim() !== '') {
                checkNewPage(10);
                
                pdf.setTextColor(31, 41, 55);
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                
                const textLines = pdf.splitTextToSize(item.text, CONTENT_WIDTH - 15);
                for (const line of textLines) {
                  checkNewPage(4);
                  pdf.text(line, MARGINS.left + 10, yPosition);
                  yPosition += 4;
                }
                yPosition += 2;
              }
              
              // Item checklist
              if (item.checklist && item.checklist.length > 0) {
                pdf.setFontSize(8);
                pdf.setTextColor(75, 85, 99);
                
                for (const checkItem of item.checklist) {
                  checkNewPage(4);
                  const checkLines = pdf.splitTextToSize(`• ${checkItem}`, CONTENT_WIDTH - 20);
                  for (const line of checkLines) {
                    pdf.text(line, MARGINS.left + 15, yPosition);
                    yPosition += 3.5;
                  }
                }
                yPosition += 2;
              }
              
              // Process tables
              if (item.tables && item.tables.length > 0) {
                for (const table of item.tables) {
                  if (table.html) {
                    // Process HTML table
                    const tableDataArray = await processHTMLTable(table.html);
                    for (const tableData of tableDataArray) {
                      await addTableToPDF(tableData);
                    }
                  } else if (table.data) {
                    // Process structured table data
                    await addTableToPDF(table.data);
                  }
                }
              }
              
              // Process screenshots
              if (item.screenshots && item.screenshots.length > 0) {
                for (const screenshot of item.screenshots) {
                  await addImageToPDF(
                    screenshot.data || screenshot.src,
                    CONTENT_WIDTH - 10,
                    screenshot.description || ''
                  );
                }
              }
              
              // Email template
              if (item.type === 'email' || item.type === 'email-template') {
                checkNewPage(20);
                
                pdf.setFillColor(254, 243, 199);
                pdf.setDrawColor(251, 191, 36);
                pdf.setLineWidth(0.5);
                pdf.roundedRect(MARGINS.left + 10, yPosition, CONTENT_WIDTH - 20, 8, 1, 1, 'FD');
                
                pdf.setTextColor(146, 64, 14);
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'bold');
                pdf.text('📧 Email Template', MARGINS.left + 12, yPosition + 5);
                yPosition += 10;
                
                if (item.to) {
                  pdf.setTextColor(55, 65, 81);
                  pdf.setFontSize(8);
                  pdf.text(`To: ${item.to}`, MARGINS.left + 12, yPosition);
                  yPosition += 4;
                }
                
                if (item.subject) {
                  pdf.text(`Subject: ${item.subject}`, MARGINS.left + 12, yPosition);
                  yPosition += 4;
                }
                
                if (item.body) {
                  const bodyLines = pdf.splitTextToSize(item.body, CONTENT_WIDTH - 25);
                  for (let i = 0; i < Math.min(bodyLines.length, 10); i++) {
                    checkNewPage(4);
                    pdf.text(bodyLines[i], MARGINS.left + 12, yPosition);
                    yPosition += 3.5;
                  }
                }
                yPosition += 3;
              }
            }
          }
        }
      }
      
      // Add spacing after section
      yPosition += 5;
    }
  };

  // Generate PDF
  try {
    await generateContent();
    
    // Update total pages
    totalPages = pdf.internal.getNumberOfPages();
    
    // Redraw footers with correct page numbers
    if (totalPages > 1) {
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Clear and redraw footer
        const footerY = PAGE_HEIGHT - 15;
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, footerY - 2, PAGE_WIDTH, 20, 'F');
        
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.2);
        pdf.line(10, footerY, PAGE_WIDTH - 10, footerY);
        
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH / 2, footerY + 5, { align: 'center' });
      }
    }
    
    // Save PDF
    const fileName = `${activeTab}_workflow_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    return { success: true, fileName };
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
};