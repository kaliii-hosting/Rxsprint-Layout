// Test file for workflow storage fixes
import { compressData, decompressData } from './workflowStorageFirestore';

// Test data samples
const testData = {
  lyso: {
    sections: [
      {
        id: 'test-section',
        title: 'Test Section',
        subsections: [
          {
            id: 'test-subsection',
            title: 'Test Subsection',
            items: [
              { id: 'item-1', text: 'Test item 1' },
              { id: 'item-2', text: 'Test item 2' }
            ]
          }
        ]
      }
    ]
  },
  hae: { sections: [] },
  scd: { sections: [] }
};

// Test compression and decompression
export const testCompressionDecompression = () => {
  console.group('Testing Compression/Decompression');
  
  try {
    // Test new format
    console.log('Original data:', testData);
    
    const compressed = compressData(testData);
    console.log('Compressed object:', compressed);
    console.log('Has checksum:', !!compressed.checksum);
    console.log('Has version:', compressed.version);
    
    const decompressed = decompressData(compressed);
    console.log('Decompressed data:', decompressed);
    
    // Verify data integrity
    const isEqual = JSON.stringify(testData) === JSON.stringify(decompressed);
    console.log('Data integrity check:', isEqual ? 'PASSED' : 'FAILED');
    
    // Test legacy string format
    console.log('\nTesting legacy format compatibility...');
    const legacyCompressed = btoa(unescape(encodeURIComponent(JSON.stringify(testData))));
    const legacyDecompressed = decompressData(legacyCompressed);
    const legacyIsEqual = JSON.stringify(testData) === JSON.stringify(legacyDecompressed);
    console.log('Legacy format compatibility:', legacyIsEqual ? 'PASSED' : 'FAILED');
    
    // Test corrupted data handling
    console.log('\nTesting corrupted data handling...');
    const corruptedData = 'invalid{json"data';
    const result = decompressData(corruptedData);
    console.log('Corrupted data result:', result === null ? 'PASSED (returned null)' : 'FAILED');
    
    // Test partial JSON
    console.log('\nTesting partial JSON handling...');
    const partialJSON = '{"lyso":{"sections":[{"id":"test"';
    const partialResult = decompressData(partialJSON);
    console.log('Partial JSON result:', partialResult === null ? 'PASSED (returned null)' : 'FAILED');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  console.groupEnd();
};

// Test large data handling
export const testLargeDataHandling = () => {
  console.group('Testing Large Data Handling');
  
  try {
    // Create large dataset
    const largeData = {
      lyso: { sections: [] },
      hae: { sections: [] },
      scd: { sections: [] }
    };
    
    // Add many sections
    for (let i = 0; i < 100; i++) {
      largeData.lyso.sections.push({
        id: `section-${i}`,
        title: `Section ${i}`,
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100),
        subsections: Array(10).fill(null).map((_, j) => ({
          id: `subsection-${i}-${j}`,
          title: `Subsection ${i}-${j}`,
          items: Array(20).fill(null).map((_, k) => ({
            id: `item-${i}-${j}-${k}`,
            text: `Item text ${i}-${j}-${k} with some content`,
            checked: false
          }))
        }))
      });
    }
    
    const compressed = compressData(largeData);
    const serialized = JSON.stringify(compressed);
    const sizeInKB = new Blob([serialized]).size / 1024;
    
    console.log(`Large data size: ${sizeInKB.toFixed(2)} KB`);
    console.log('Compression ratio:', (JSON.stringify(largeData).length / serialized.length).toFixed(2) + 'x');
    
    const decompressed = decompressData(compressed);
    const isEqual = JSON.stringify(largeData) === JSON.stringify(decompressed);
    console.log('Large data integrity:', isEqual ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('Large data test failed:', error);
  }
  
  console.groupEnd();
};

// Run all tests
export const runAllTests = () => {
  console.log('=== Running Workflow Storage Tests ===');
  testCompressionDecompression();
  testLargeDataHandling();
  console.log('=== Tests Complete ===');
};

// Export for console testing
if (typeof window !== 'undefined') {
  window.testWorkflowStorage = {
    testCompressionDecompression,
    testLargeDataHandling,
    runAllTests
  };
}