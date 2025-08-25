import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const MAX_DOCUMENT_SIZE = 900000; // 900KB to be safe (Firestore limit is 1MB)
const CHUNK_COLLECTION = 'workflow_chunks';

export const calculateSize = (obj) => {
  const jsonString = JSON.stringify(obj);
  return new Blob([jsonString]).size;
};

export const shouldChunk = (data) => {
  const size = calculateSize(data);
  return size > MAX_DOCUMENT_SIZE;
};

export const chunkData = (data) => {
  const chunks = [];
  const sections = {
    lyso: data.lyso || { sections: [] },
    hae: data.hae || { sections: [] },
    scd: data.scd || { sections: [] }
  };

  // Try to keep each section together if possible
  const sectionKeys = Object.keys(sections);
  
  for (const key of sectionKeys) {
    const sectionData = sections[key];
    const sectionSize = calculateSize(sectionData);
    
    if (sectionSize > MAX_DOCUMENT_SIZE) {
      // If a single section is too large, we need to split it further
      const subsections = sectionData.sections || [];
      let currentChunk = { [key]: { sections: [] } };
      let currentSize = calculateSize(currentChunk);
      
      for (const subsection of subsections) {
        const subsectionSize = calculateSize(subsection);
        
        if (currentSize + subsectionSize > MAX_DOCUMENT_SIZE) {
          // Save current chunk and start a new one
          if (currentChunk[key].sections.length > 0) {
            chunks.push({
              type: 'partial',
              sectionKey: key,
              data: currentChunk
            });
          }
          currentChunk = { [key]: { sections: [subsection] } };
          currentSize = calculateSize(currentChunk);
        } else {
          currentChunk[key].sections.push(subsection);
          currentSize += subsectionSize;
        }
      }
      
      // Save the last chunk
      if (currentChunk[key].sections.length > 0) {
        chunks.push({
          type: 'partial',
          sectionKey: key,
          data: currentChunk
        });
      }
    } else {
      // Section fits in a single chunk
      chunks.push({
        type: 'complete',
        sectionKey: key,
        data: { [key]: sectionData }
      });
    }
  }
  
  return chunks;
};

export const saveChunkedWorkflowData = async (data) => {
  try {
    // Check if we need to chunk the data
    if (!shouldChunk(data)) {
      // Data is small enough to save directly
      await setDoc(doc(firestore, 'workflow', 'data'), data);
      
      // Clean up any existing chunks
      await deleteExistingChunks();
      
      return { success: true, chunked: false };
    }
    
    // Data needs to be chunked
    const chunks = chunkData(data);
    
    // Create a batch write for all chunks
    const batch = writeBatch(firestore);
    
    // Save metadata document
    const metadata = {
      isChunked: true,
      chunkCount: chunks.length,
      timestamp: new Date().toISOString(),
      sections: Object.keys(data)
    };
    batch.set(doc(firestore, 'workflow', 'data'), metadata);
    
    // Save each chunk
    chunks.forEach((chunk, index) => {
      const chunkDoc = doc(firestore, CHUNK_COLLECTION, `chunk_${index}`);
      batch.set(chunkDoc, {
        ...chunk,
        index,
        totalChunks: chunks.length,
        timestamp: new Date().toISOString()
      });
    });
    
    // Commit all writes
    await batch.commit();
    
    return { success: true, chunked: true, chunkCount: chunks.length };
  } catch (error) {
    console.error('Error saving chunked workflow data:', error);
    throw error;
  }
};

export const loadChunkedWorkflowData = async () => {
  try {
    // First, check the main document
    const mainDocRef = doc(firestore, 'workflow', 'data');
    const mainDocSnap = await getDoc(mainDocRef);
    
    if (!mainDocSnap.exists()) {
      return null;
    }
    
    const mainData = mainDocSnap.data();
    
    // Check if data is chunked
    if (!mainData.isChunked) {
      // Data is not chunked, return as is
      return mainData;
    }
    
    // Data is chunked, load all chunks
    const chunksSnapshot = await getDocs(collection(firestore, CHUNK_COLLECTION));
    const chunks = [];
    
    chunksSnapshot.forEach((doc) => {
      chunks.push(doc.data());
    });
    
    // Sort chunks by index
    chunks.sort((a, b) => a.index - b.index);
    
    // Reassemble the data
    const reassembledData = {
      lyso: { sections: [] },
      hae: { sections: [] },
      scd: { sections: [] }
    };
    
    for (const chunk of chunks) {
      if (chunk.type === 'complete') {
        // Complete section, replace entirely
        Object.assign(reassembledData, chunk.data);
      } else if (chunk.type === 'partial') {
        // Partial section, append subsections
        const sectionKey = chunk.sectionKey;
        if (chunk.data[sectionKey] && chunk.data[sectionKey].sections) {
          reassembledData[sectionKey].sections.push(...chunk.data[sectionKey].sections);
        }
      }
    }
    
    return reassembledData;
  } catch (error) {
    console.error('Error loading chunked workflow data:', error);
    throw error;
  }
};

export const deleteExistingChunks = async () => {
  try {
    const chunksSnapshot = await getDocs(collection(firestore, CHUNK_COLLECTION));
    const batch = writeBatch(firestore);
    
    chunksSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    if (!chunksSnapshot.empty) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error deleting existing chunks:', error);
  }
};

export const getWorkflowDataSize = (data) => {
  const size = calculateSize(data);
  const sizeInMB = (size / (1024 * 1024)).toFixed(2);
  return {
    bytes: size,
    mb: parseFloat(sizeInMB),
    exceedsLimit: size > MAX_DOCUMENT_SIZE,
    percentOfLimit: Math.round((size / MAX_DOCUMENT_SIZE) * 100)
  };
};