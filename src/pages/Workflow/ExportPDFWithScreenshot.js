// Screenshot-based PDF Export for exact visual matching
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportWorkflowToPDFWithScreenshots = async (
  activeTab,
  selectedSectionsForExport
) => {
  // Show loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.innerHTML = `
    <div style="
      position: fixed; 
      top: 50%; 
      left: 50%; 
      transform: translate(-50%, -50%); 
      background: rgba(0,0,0,0.9); 
      color: white; 
      padding: 30px 50px; 
      border-radius: 10px; 
      z-index: 999999;
      font-size: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    ">
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="
          border: 3px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        "></div>
        <div>Capturing workflow sections for PDF...</div>
      </div>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(loadingDiv);

  try {
    // Create PDF with A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // PDF dimensions (matching Notes page exactly)
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
    const leftMargin = 15;
    const rightMargin = 15;
    const topMargin = 35; // Start content right after header (30px header + 1px orange line + 4px spacing)
    const bottomMargin = 15; // Account for footer
    const contentWidth = pageWidth - leftMargin - rightMargin;
    const contentHeight = pageHeight - topMargin - bottomMargin;
    
    let currentPage = 1;
    let yPosition = topMargin;
    
    // Load logo
    const logoUrl = 'https://fchtwxunzmkzbnibqbwl.supabase.co/storage/v1/object/public/kaliii//rxsprint%20logo%20IIII.png';
    let logoImg = null;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = () => {
          logoImg = img;
          resolve();
        };
        img.onerror = reject;
        img.src = logoUrl;
      });
    } catch (e) {
      console.log('Logo could not be loaded');
    }

    // Helper function to add header and footer (IDENTICAL TO NOTES PAGE)
    const addHeaderFooter = (pageNum, hasLogo = true) => {
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
      if (hasLogo && logoImg) {
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
          
          const canvas = document.createElement('canvas');
          canvas.width = logoImg.width;
          canvas.height = logoImg.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(logoImg, 0, 0);
          const logoDataUrl = canvas.toDataURL('image/png');
          
          const logoX = 15;
          const logoY = 8;
          pdf.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
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

    // Add first page header
    addHeaderFooter(currentPage);

    // Find all workflow sections
    const workflowContainer = document.querySelector('.workflow-timeline-container');
    if (!workflowContainer) {
      throw new Error('Workflow container not found');
    }

    // Temporarily expand all selected sections for capture
    const sectionsToCapture = [];
    const expandedStates = new Map();
    
    // Find all section elements
    const allSections = workflowContainer.querySelectorAll('.workflow-section-compact');
    
    for (const sectionElement of allSections) {
      // Check if this section is selected for export
      const sectionCard = sectionElement.querySelector('.workflow-card-compact');
      if (!sectionCard) continue;
      
      // Get section ID from the card's class or data attribute
      let sectionId = null;
      const classList = Array.from(sectionCard.classList);
      for (const className of classList) {
        if (className.endsWith('-card') && className !== 'workflow-card-compact') {
          sectionId = className.replace('-card', '');
          break;
        }
      }
      
      // Check if section is selected
      if (!selectedSectionsForExport.has(sectionId)) continue;
      
      // Store the original expansion state
      const expansionDiv = sectionElement.querySelector('.workflow-expansion');
      const wasExpanded = expansionDiv && expansionDiv.style.display !== 'none';
      expandedStates.set(sectionElement, wasExpanded);
      
      // Temporarily expand the section if needed
      if (expansionDiv && !wasExpanded) {
        // Trigger click to expand
        sectionCard.click();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for animation
      }
      
      sectionsToCapture.push(sectionElement);
    }

    // Capture each section
    for (let i = 0; i < sectionsToCapture.length; i++) {
      const sectionElement = sectionsToCapture[i];
      
      // Update loading message
      loadingDiv.querySelector('div > div:last-child').textContent = 
        `Capturing section ${i + 1} of ${sectionsToCapture.length}...`;
      
      // Configure html2canvas options for better quality
      const canvas = await html2canvas(sectionElement, {
        scale: 2, // Higher quality
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: sectionElement.scrollWidth,
        windowHeight: sectionElement.scrollHeight,
        onclone: (clonedDoc) => {
          // Ensure styles are applied in the cloned document
          const clonedSection = clonedDoc.querySelector('.workflow-section-compact');
          if (clonedSection) {
            // Remove any animations
            clonedSection.style.animation = 'none';
            
            // Ensure expansion is visible
            const clonedExpansion = clonedSection.querySelector('.workflow-expansion');
            if (clonedExpansion) {
              clonedExpansion.style.display = 'block';
              clonedExpansion.style.opacity = '1';
              clonedExpansion.style.animation = 'none';
            }
          }
        }
      });
      
      // Calculate image dimensions
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      
      // Check if we need a new page
      if (yPosition + imgHeight > pageHeight - bottomMargin) {
        pdf.addPage();
        currentPage++;
        addHeaderFooter(currentPage);
        yPosition = topMargin;
      }
      
      // Add the image to PDF (centered)
      const xPosition = leftMargin + (contentWidth - imgWidth) / 2;
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        xPosition,
        yPosition,
        imgWidth,
        imgHeight
      );
      
      yPosition += imgHeight + 10; // Add spacing between sections
    }

    // Restore original expansion states
    for (const [sectionElement, wasExpanded] of expandedStates) {
      if (!wasExpanded) {
        const sectionCard = sectionElement.querySelector('.workflow-card-compact');
        if (sectionCard) {
          sectionCard.click(); // Collapse back
        }
      }
    }

    // Save the PDF
    const fileName = `${activeTab}_workflow_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    // Remove loading message
    document.body.removeChild(loadingDiv);

    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Remove loading message
    if (loadingDiv && loadingDiv.parentNode) {
      document.body.removeChild(loadingDiv);
    }
    throw error;
  }
};