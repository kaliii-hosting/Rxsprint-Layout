// Professional PDF Export - FULLY FIXED VERSION
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const exportWorkflowToPDFProfessional = async (
  workflowData,
  activeTab,
  selectedSectionsForExport,
  completedItems,
  completedCards,
  expandedSections = {}
) => {
  console.log('Starting PDF Export...');
  console.log('Selected sections:', selectedSectionsForExport);
  console.log('Active tab:', activeTab);
  console.log('Workflow data:', workflowData);
  
  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Constants
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const leftMargin = 15;
  const rightMargin = 15;
  const topMargin = 30;
  const bottomMargin = 25;
  const contentWidth = pageWidth - leftMargin - rightMargin;
  const maxY = pageHeight - bottomMargin;
  
  let currentY = topMargin;
  let pageNumber = 1;
  
  // Logo setup
  const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
  let logoImg = null;
  
  // Try to load logo
  try {
    logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logoUrl;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('Logo timeout');
        resolve();
      }, 2000);
      logoImg.onload = () => {
        console.log('Logo loaded');
        clearTimeout(timeout);
        resolve();
      };
      logoImg.onerror = () => {
        console.log('Logo error');
        clearTimeout(timeout);
        resolve();
      };
    });
  } catch (e) {
    console.log('Logo loading failed:', e);
  }

  // Helper function to draw page header and footer
  const drawPageHeaderFooter = () => {
    // White background
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header background
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    // Orange line
    pdf.setFillColor(255, 85, 0);
    pdf.rect(0, 25, pageWidth, 1, 'F');
    
    // Try to add logo
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
      try {
        pdf.addImage(logoImg, 'PNG', leftMargin, 7, 25, 12);
      } catch (e) {
        console.log('Could not add logo to PDF');
      }
    }
    
    // Title
    pdf.setFontSize(16);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Workflow Export', pageWidth / 2, 15, { align: 'center' });
    
    // Date
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString();
    pdf.text(currentDate, pageWidth - rightMargin, 15, { align: 'right' });
    
    // Footer
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.3);
    pdf.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
    
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('RxSprint Workflow', leftMargin, pageHeight - 10);
    pdf.text('Confidential', pageWidth - rightMargin, pageHeight - 10, { align: 'right' });
  };

  // Helper function to add new page
  const addNewPage = () => {
    pdf.addPage();
    pageNumber++;
    drawPageHeaderFooter();
    currentY = topMargin;
  };

  // Helper function to check if we need a new page
  const checkPageSpace = (requiredHeight) => {
    if (currentY + requiredHeight > maxY) {
      addNewPage();
      return true;
    }
    return false;
  };

  // Helper function to add text with wrapping
  const addText = (text, fontSize = 9, color = [31, 41, 55], bold = false, indent = 0) => {
    if (!text || text.toString().trim() === '') return;
    
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    
    const lines = pdf.splitTextToSize(text.toString(), contentWidth - indent);
    const lineHeight = fontSize * 0.4;
    
    lines.forEach(line => {
      if (currentY + lineHeight > maxY) {
        addNewPage();
      }
      pdf.text(line, leftMargin + indent, currentY);
      currentY += lineHeight;
    });
  };

  // Helper function to process HTML table
  const processHTMLTable = async (htmlString) => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlString;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);
      
      const table = tempDiv.querySelector('table');
      if (!table) {
        document.body.removeChild(tempDiv);
        return null;
      }
      
      const headers = [];
      const rows = [];
      
      // Get headers
      const headerCells = table.querySelectorAll('thead th, thead td');
      if (headerCells.length === 0) {
        // Try to get headers from first row
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          firstRow.querySelectorAll('th, td').forEach(cell => {
            headers.push(cell.textContent.trim());
          });
        }
      } else {
        headerCells.forEach(cell => {
          headers.push(cell.textContent.trim());
        });
      }
      
      // Get data rows
      const dataRows = table.querySelectorAll('tbody tr');
      if (dataRows.length === 0) {
        // Get all rows except first if we used first as header
        const allRows = table.querySelectorAll('tr');
        for (let i = (headers.length > 0 ? 1 : 0); i < allRows.length; i++) {
          const row = [];
          allRows[i].querySelectorAll('td, th').forEach(cell => {
            row.push(cell.textContent.trim());
          });
          if (row.length > 0) rows.push(row);
        }
      } else {
        dataRows.forEach(tr => {
          const row = [];
          tr.querySelectorAll('td, th').forEach(cell => {
            row.push(cell.textContent.trim());
          });
          if (row.length > 0) rows.push(row);
        });
      }
      
      document.body.removeChild(tempDiv);
      return { headers, rows };
    } catch (error) {
      console.error('Error processing HTML table:', error);
      return null;
    }
  };

  // Helper function to add table
  const addTable = async (tableData) => {
    if (!tableData) return;
    
    const hasHeaders = tableData.headers && tableData.headers.length > 0;
    const hasRows = tableData.rows && tableData.rows.length > 0;
    
    if (!hasHeaders && !hasRows) return;
    
    // Check if table fits on current page
    if (currentY > maxY - 20) {
      addNewPage();
    }
    
    try {
      autoTable(pdf, {
        startY: currentY,
        head: hasHeaders ? [tableData.headers] : [],
        body: hasRows ? tableData.rows : [],
        margin: { left: leftMargin, right: rightMargin },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didDrawPage: function() {
          // Redraw header/footer on new pages created by table
          drawPageHeaderFooter();
        }
      });
      
      currentY = pdf.lastAutoTable.finalY + 5;
    } catch (error) {
      console.error('Error adding table:', error);
      addText('[Table could not be rendered]', 8, [239, 68, 68]);
    }
  };

  // Helper function to add image
  const addImage = async (imageData, description = '') => {
    if (!imageData) return;
    
    try {
      let imgSrc = imageData;
      if (typeof imageData === 'object' && imageData.data) {
        imgSrc = imageData.data;
        description = imageData.description || description;
      }
      
      // Create image element
      const img = new Image();
      img.src = imgSrc;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject('Timeout'), 3000);
        img.onload = () => {
          clearTimeout(timeout);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          reject('Error');
        };
      });
      
      // Calculate dimensions
      const aspectRatio = img.width / img.height;
      let imgWidth = Math.min(contentWidth * 0.8, 150);
      let imgHeight = imgWidth / aspectRatio;
      
      if (imgHeight > 180) {
        imgHeight = 180;
        imgWidth = imgHeight * aspectRatio;
      }
      
      // Check if image fits
      const requiredHeight = imgHeight + (description ? 10 : 5);
      if (currentY + requiredHeight > maxY) {
        addNewPage();
      }
      
      // Center the image
      const xPos = (pageWidth - imgWidth) / 2;
      pdf.addImage(imgSrc, 'PNG', xPos, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 3;
      
      // Add description if provided
      if (description) {
        addText(description, 8, [107, 114, 128], false, 0);
        currentY += 2;
      }
    } catch (error) {
      console.error('Error adding image:', error);
      addText('[Image could not be loaded]', 8, [239, 68, 68]);
      currentY += 5;
    }
  };

  // Start PDF generation
  drawPageHeaderFooter();
  
  // Add title
  pdf.setFontSize(18);
  pdf.setTextColor(31, 41, 55);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Workflow Export Report', pageWidth / 2, currentY + 5, { align: 'center' });
  currentY += 15;
  
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;
  
  // Get sections to export
  let sectionsToExport = [];
  
  // Handle different data structures
  if (selectedSectionsForExport instanceof Set) {
    // If it's a Set of IDs, filter the sections
    if (workflowData && workflowData[activeTab] && workflowData[activeTab].sections) {
      sectionsToExport = workflowData[activeTab].sections.filter(
        section => selectedSectionsForExport.has(section.id)
      );
    }
  } else if (Array.isArray(selectedSectionsForExport)) {
    sectionsToExport = selectedSectionsForExport;
  } else if (workflowData && workflowData[activeTab] && workflowData[activeTab].sections) {
    sectionsToExport = workflowData[activeTab].sections;
  }
  
  console.log('Sections to export:', sectionsToExport);
  
  if (sectionsToExport.length === 0) {
    pdf.text('No sections selected for export', pageWidth / 2, currentY + 10, { align: 'center' });
    pdf.save(`workflow_export_${Date.now()}.pdf`);
    return;
  }
  
  pdf.text(`Sections: ${sectionsToExport.length}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 15;
  
  // Process each section
  for (let sectionIndex = 0; sectionIndex < sectionsToExport.length; sectionIndex++) {
    const section = sectionsToExport[sectionIndex];
    console.log(`Processing section ${sectionIndex + 1}:`, section);
    
    // Add spacing between sections
    if (sectionIndex > 0) {
      currentY += 5;
    }
    
    // Check space for section header
    if (currentY + 25 > maxY) {
      addNewPage();
    }
    
    // Draw section header
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(leftMargin, currentY, contentWidth, 20, 3, 3, 'FD');
    
    // Section title
    pdf.setFontSize(12);
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'bold');
    const sectionTitle = `Section ${sectionIndex + 1}: ${section.title || section.cardTitle || 'Untitled'}`;
    pdf.text(sectionTitle, leftMargin + 5, currentY + 8);
    
    // Completion status
    if (completedCards && completedCards.has(section.id)) {
      pdf.setTextColor(34, 197, 94);
      pdf.setFontSize(9);
      pdf.text('✓ Completed', pageWidth - rightMargin - 5, currentY + 8, { align: 'right' });
    }
    
    currentY += 22;
    
    // Section description
    if (section.cardDescription || section.description) {
      addText(section.cardDescription || section.description, 9, [107, 114, 128], false, 5);
      currentY += 3;
    }
    
    // Process subsections
    if (section.subsections && section.subsections.length > 0) {
      console.log(`Section has ${section.subsections.length} subsections`);
      
      for (let subIndex = 0; subIndex < section.subsections.length; subIndex++) {
        const subsection = section.subsections[subIndex];
        console.log(`Processing subsection ${subIndex + 1}:`, subsection);
        
        // Subsection header
        if (currentY + 12 > maxY) {
          addNewPage();
        }
        
        pdf.setFillColor(248, 250, 252);
        pdf.rect(leftMargin + 5, currentY, contentWidth - 10, 10, 'F');
        
        pdf.setTextColor(59, 130, 246);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${sectionIndex + 1}.${subIndex + 1} ${subsection.title || 'Untitled'}`, leftMargin + 8, currentY + 6);
        currentY += 12;
        
        // Process items
        if (subsection.items && subsection.items.length > 0) {
          console.log(`Subsection has ${subsection.items.length} items`);
          
          for (const item of subsection.items) {
            // Process text content
            if (item.text && item.text.trim()) {
              console.log('Adding text:', item.text.substring(0, 50) + '...');
              addText(item.text, 9, [31, 41, 55], false, 5);
              currentY += 2;
            }
            
            // Process content (alternative field)
            if (item.content && item.content.trim()) {
              console.log('Adding content:', item.content.substring(0, 50) + '...');
              addText(item.content, 9, [31, 41, 55], false, 5);
              currentY += 2;
            }
            
            // Process checklist
            if (item.checklist && item.checklist.length > 0) {
              console.log(`Adding ${item.checklist.length} checklist items`);
              item.checklist.forEach(checkItem => {
                if (checkItem && checkItem.trim()) {
                  addText(`• ${checkItem}`, 8, [75, 85, 99], false, 10);
                }
              });
              currentY += 2;
            }
            
            // Process tables
            if (item.tables && item.tables.length > 0) {
              console.log(`Processing ${item.tables.length} tables`);
              for (const table of item.tables) {
                if (table.html) {
                  const tableData = await processHTMLTable(table.html);
                  if (tableData) {
                    await addTable(tableData);
                  }
                } else if (table.data) {
                  await addTable(table.data);
                } else if (table) {
                  // Table might be the data directly
                  await addTable(table);
                }
              }
            }
            
            // Process screenshots
            if (item.screenshots && item.screenshots.length > 0) {
              console.log(`Processing ${item.screenshots.length} screenshots`);
              for (const screenshot of item.screenshots) {
                if (screenshot) {
                  await addImage(screenshot);
                }
              }
            }
            
            // Process images
            if (item.images && item.images.length > 0) {
              console.log(`Processing ${item.images.length} images`);
              for (const image of item.images) {
                if (image) {
                  await addImage(image);
                }
              }
            }
          }
        }
        
        // Process direct content fields on subsection
        if (subsection.content && subsection.content.trim()) {
          console.log('Adding subsection content');
          addText(subsection.content, 9, [31, 41, 55], false, 5);
          currentY += 3;
        }
      }
    }
  }
  
  // Update page numbers with total
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFillColor(248, 250, 252);
    pdf.rect(pageWidth / 2 - 20, pageHeight - 15, 40, 8, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }
  
  // Save the PDF
  const filename = `workflow_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`;
  console.log('Saving PDF as:', filename);
  pdf.save(filename);
  
  return {
    success: true,
    filename: filename,
    pages: totalPages
  };
};