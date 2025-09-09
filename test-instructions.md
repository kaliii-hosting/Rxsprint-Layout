# Testing Instructions for Use Section

## Test Instructions:

1. Navigate to http://localhost:5173/ in your browser
2. Click on the "Counsel" or "Medication Search" tab
3. Search for an injectable medication with detailed instructions, such as:
   - **Humira** (adalimumab) - pen injector with step-by-step figures
   - **Ozempic** (semaglutide) - pen with visual instructions  
   - **Enbrel** (etanercept) - prefilled syringe with figures
   - **Lantus** (insulin glargine) - vial and syringe instructions
   - **Trulicity** (dulaglutide) - single-dose pen with figures

4. Click on one of the search results to view the medication details
5. Scroll down to the "INSTRUCTIONS FOR USE" section
6. Click to expand the section if needed

## Expected Results:

✅ The Instructions for Use section should display:
- Complete HTML formatting with numbered steps
- Embedded figure images showing injection steps
- Figure captions below each image
- Proper figure references (e.g., "See Figure 1" linked to the actual figure)
- Warning boxes highlighted with yellow background
- Step numbers formatted prominently
- All images loading from DailyMed with proper URLs
- Multiple dosage forms (if available) with tabs to switch between them

## Verification Checklist:

- [ ] Figures/images are visible in the Instructions section
- [ ] Figure captions display below images
- [ ] Step-by-step instructions are properly formatted
- [ ] Warning boxes stand out visually
- [ ] Figure references link to actual figures
- [ ] Images load without errors
- [ ] HTML structure is preserved (tables, lists, etc.)
- [ ] Multiple dosage form instructions can be toggled (if applicable)

## Common Injectable Medications with Visual Instructions:

1. **Biologics/Autoimmune:**
   - Humira, Enbrel, Remicade, Cosentyx, Stelara

2. **Diabetes:**
   - Ozempic, Trulicity, Victoza, Lantus, Humalog

3. **Other:**
   - EpiPen (epinephrine), Lovenox (enoxaparin)

## Troubleshooting:

If images are not loading:
1. Check browser console for errors
2. Verify proxy is working (check Network tab)
3. Try clearing cache and refreshing
4. Check if DailyMed website is accessible

## Notes:

The fix implements:
- Enhanced XML parsing to extract `<renderMultiMedia>` and `<observationMedia>` elements
- Proper image URL construction: `/api/dailymed/image.cfm?name={imageName}&setid={setId}`
- Special CSS classes for instruction figures
- Figure reference linking
- Step numbering and warning box formatting
- Support for multiple dosage forms within Instructions