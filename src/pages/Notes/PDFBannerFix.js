// Fixed PDF Banner Export Logic - Matches Note Viewer Exactly

// Add banners to PDF - EXACTLY match the note viewer layout
if (formData.banners && formData.banners.length > 0) {
  const bannerPadding = 6;
  const bannerGap = 8;
  const bannerFontSize = 10;
  const minBannerHeight = 12;
  
  // Group banners by line breaks - EXACTLY as in viewer
  const bannerGroups = [];
  let currentGroup = [];
  
  formData.banners.forEach((banner, index) => {
    if (banner.newLine && index > 0 && currentGroup.length > 0) {
      bannerGroups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push(banner);
  });
  if (currentGroup.length > 0) {
    bannerGroups.push(currentGroup);
  }
  
  // Process each banner group to match viewer layout exactly
  bannerGroups.forEach((group, groupIndex) => {
    // Add spacing between groups
    if (groupIndex > 0) {
      yPosition += 10;
    }
    
    // Process each banner in the group
    let currentX = leftMargin;
    let lineHeight = 0;
    
    group.forEach((banner, bannerIndex) => {
      // Handle title banners - full width
      if (banner.isTitle || banner.color === 'title') {
        // If we have pending regular banners, finish their line first
        if (currentX > leftMargin) {
          yPosition += lineHeight + 8;
          currentX = leftMargin;
          lineHeight = 0;
        }
        
        checkPageBreak(18);
        // Title banner with exact viewer styling
        pdf.setFillColor(255, 229, 180); // Peach background
        pdf.roundedRect(leftMargin, yPosition, contentWidth, 16, 4, 4, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(139, 69, 19); // Brown text
        pdf.text(banner.text, leftMargin + 8, yPosition + 10);
        yPosition += 20;
        return;
      }
    
      // Handle callout banners - full width
      if (banner.isCallout || banner.color === 'callout') {
        // If we have pending regular banners, finish their line first
        if (currentX > leftMargin) {
          yPosition += lineHeight + 8;
          currentX = leftMargin;
          lineHeight = 0;
        }
        
        const calloutLines = pdf.splitTextToSize(banner.text, contentWidth - 16);
        const calloutHeight = Math.max(18, calloutLines.length * 6 + 12);
        checkPageBreak(calloutHeight + 8);
        
        // Callout with exact viewer styling
        pdf.setFillColor(250, 250, 250); // Light background
        pdf.setDrawColor(230, 230, 230);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(leftMargin, yPosition, contentWidth, calloutHeight, 4, 4, 'FD');
        
        // Orange left border
        pdf.setFillColor(255, 105, 0);
        pdf.rect(leftMargin, yPosition, 4, calloutHeight, 'F');
        
        // Text
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(66, 66, 66);
        let calloutY = yPosition + 8;
        calloutLines.forEach(line => {
          pdf.text(line, leftMargin + 12, calloutY);
          calloutY += 6;
        });
        yPosition += calloutHeight + 8;
        return;
      }
      
      // Handle regular banners - inline
      const fullText = banner.text;
      pdf.setFontSize(bannerFontSize);
      const textWidth = pdf.getTextWidth(fullText);
      const bannerWidth = Math.max(textWidth + (bannerPadding * 2), 60);
      const bannerHeight = minBannerHeight;
      
      // Check if banner fits on current line
      if (currentX > leftMargin && currentX + bannerWidth > leftMargin + contentWidth) {
        // Move to next line
        yPosition += lineHeight + 8;
        currentX = leftMargin;
        lineHeight = 0;
      }
      
      checkPageBreak(bannerHeight + 8);
      
      // Set banner colors to match viewer exactly
      if (banner.isDone || banner.color === 'green') {
        pdf.setFillColor(232, 245, 233); // Pale green
        pdf.setTextColor(46, 125, 50);
      } else if (banner.color === 'orange' || banner.isOrange) {
        pdf.setFillColor(255, 228, 209); // Pale orange
        pdf.setTextColor(230, 81, 0);
      } else if (banner.color === 'grey') {
        pdf.setFillColor(245, 245, 245); // Grey
        pdf.setTextColor(66, 66, 66);
      } else {
        pdf.setFillColor(227, 242, 253); // Pale blue
        pdf.setTextColor(21, 101, 192);
      }
      
      // Draw banner with rounded corners like viewer
      pdf.roundedRect(currentX, yPosition, bannerWidth, bannerHeight, 4, 4, 'F');
      
      // Add text
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(bannerFontSize);
      
      let displayText = fullText;
      if (pdf.getTextWidth(displayText) > bannerWidth - (bannerPadding * 2)) {
        while (pdf.getTextWidth(displayText + '...') > bannerWidth - (bannerPadding * 2) && displayText.length > 1) {
          displayText = displayText.substring(0, displayText.length - 1);
        }
        displayText += '...';
      }
      
      const textX = currentX + bannerPadding;
      const textY = yPosition + (bannerHeight / 2) + 3;
      pdf.text(displayText, textX, textY);
      
      // Update position for next banner
      currentX += bannerWidth + bannerGap;
      lineHeight = Math.max(lineHeight, bannerHeight);
    });
    
    // Finish the line if there are pending regular banners
    if (currentX > leftMargin) {
      yPosition += lineHeight + 8;
    }
  });
  
  // Add spacing after all banner groups
  yPosition += 8;