import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage } from '../config/firebase';
import simpleAuth from '../services/authServiceSimple';

const MAX_FIRESTORE_SIZE = 500000; // 500KB - conservative limit for Firestore
const WORKFLOW_COLLECTION = 'workflow';
const STORAGE_PATH = 'workflow-data';

// LZ-string compression library (lightweight compression)
const LZString = {
  compressToUTF16: function(input) {
    if (input == null) return "";
    return this._compress(input, 15, function(a){return String.fromCharCode(a+32);}) + " ";
  },
  
  decompressFromUTF16: function(compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return this._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
  },
  
  _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i, value,
        context_dictionary = {},
        context_dictionaryToCreate = {},
        context_c = "",
        context_wc = "",
        context_w = "",
        context_enlargeIn = 2,
        context_dictSize = 3,
        context_numBits = 2,
        context_data = [],
        context_data_val = 0,
        context_data_position = 0,
        ii;
    
    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }
      
      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i=0; i<context_numBits; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i=0; i<8; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i=0; i<context_numBits; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i=0; i<16; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i=0; i<context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }
    
    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (i=0; i<context_numBits; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i=0; i<8; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i=0; i<context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i=0; i<16; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i=0; i<context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }
    
    value = 2;
    for (i=0; i<context_numBits; i++) {
      context_data_val = (context_data_val << 1) | (value&1);
      if (context_data_position == bitsPerChar-1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }
    
    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position == bitsPerChar-1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      } else {
        context_data_position++;
      }
    }
    return context_data.join('');
  },
  
  _decompress: function(length, resetValue, getNextValue) {
    var dictionary = [],
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = {val:getNextValue(0), position:resetValue, index:1};
    
    bits = 0;
    maxpower = Math.pow(2,2);
    power = 1;
    while (power != maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position == 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb>0 ? 1 : 0) * power;
      power <<= 1;
    }
    
    switch (bits) {
      case 0:
        bits = 0;
        maxpower = Math.pow(2,8);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb>0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 1:
        bits = 0;
        maxpower = Math.pow(2,16);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb>0 ? 1 : 0) * power;
          power <<= 1;
        }
        c = String.fromCharCode(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }
      
      bits = 0;
      maxpower = Math.pow(2,numBits);
      power = 1;
      while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb>0 ? 1 : 0) * power;
        power <<= 1;
      }
      
      var c2;
      switch (c2 = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c2 = dictSize-1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = String.fromCharCode(bits);
          c2 = dictSize-1;
          enlargeIn--;
          break;
        case 2:
          return result.join('');
      }
      
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      
      if (dictionary[c2]) {
        entry = dictionary[c2];
      } else {
        if (c2 === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);
      
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      
      w = entry;
      
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
    }
  }
};

export const calculateSize = (obj) => {
  const jsonString = JSON.stringify(obj);
  return new Blob([jsonString]).size;
};

export const compressData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(jsonString);
    const originalSize = calculateSize(data);
    const compressedSize = new Blob([compressed]).size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`Compression: ${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (${compressionRatio}% reduction)`);
    
    return compressed;
  } catch (error) {
    console.error('Compression failed:', error);
    return JSON.stringify(data);
  }
};

export const decompressData = (compressed) => {
  try {
    const decompressed = LZString.decompressFromUTF16(compressed);
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Decompression failed:', error);
    // Try parsing as regular JSON if decompression fails
    try {
      return JSON.parse(compressed);
    } catch (jsonError) {
      console.error('JSON parsing also failed:', jsonError);
      return null;
    }
  }
};

export const saveWorkflowWithStorage = async (data) => {
  try {
    // Ensure user is authenticated before storage operations
    await simpleAuth.ensureAuth();
    
    const timestamp = new Date().toISOString();
    const dataString = JSON.stringify(data);
    const dataSize = calculateSize(data);
    
    // Try compression first
    const compressedData = compressData(data);
    const compressedSize = new Blob([compressedData]).size;
    
    // Decide storage strategy based on compressed size
    if (compressedSize < MAX_FIRESTORE_SIZE) {
      // Small enough for Firestore after compression
      console.log('Saving compressed data directly to Firestore');
      
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'data'), {
        type: 'compressed',
        data: compressedData,
        originalSize: dataSize,
        compressedSize: compressedSize,
        timestamp: timestamp,
        version: 2
      });
      
      // Clean up any old Storage references
      try {
        const storageRef = ref(storage, `${STORAGE_PATH}/workflow-data.json`);
        await deleteObject(storageRef);
      } catch (e) {
        // Ignore if doesn't exist
      }
      
      return { 
        success: true, 
        method: 'firestore-compressed',
        originalSize: dataSize,
        finalSize: compressedSize
      };
      
    } else {
      // Too large even after compression - use Firebase Storage
      console.log('Data too large for Firestore, using Firebase Storage');
      
      // Upload to Storage
      const storageRef = ref(storage, `${STORAGE_PATH}/workflow-data.json`);
      const uploadResult = await uploadString(storageRef, compressedData, 'raw');
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      // Save metadata to Firestore
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'data'), {
        type: 'storage',
        storageUrl: downloadUrl,
        storagePath: uploadResult.ref.fullPath,
        originalSize: dataSize,
        compressedSize: compressedSize,
        timestamp: timestamp,
        version: 2,
        sections: Object.keys(data)
      });
      
      return { 
        success: true, 
        method: 'firebase-storage',
        originalSize: dataSize,
        finalSize: compressedSize,
        storageUrl: downloadUrl
      };
    }
    
  } catch (error) {
    console.error('Error saving workflow data:', error);
    
    // Fallback: Try to save at least the structure
    try {
      const minimalData = {
        lyso: { sections: [] },
        hae: { sections: [] },
        scd: { sections: [] },
        error: 'Data too large - saved structure only',
        timestamp: new Date().toISOString()
      };
      
      await setDoc(doc(firestore, WORKFLOW_COLLECTION, 'data'), minimalData);
      
      throw new Error('Data too large to save completely. Please reduce content size.');
    } catch (fallbackError) {
      throw error;
    }
  }
};

export const loadWorkflowWithStorage = async () => {
  try {
    // Ensure user is authenticated before storage operations
    await simpleAuth.ensureAuth();
    
    const docRef = doc(firestore, WORKFLOW_COLLECTION, 'data');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const docData = docSnap.data();
    
    // Handle different storage types
    if (docData.type === 'compressed') {
      // Data is compressed in Firestore
      console.log('Loading compressed data from Firestore');
      return decompressData(docData.data);
      
    } else if (docData.type === 'storage') {
      // Data is in Firebase Storage
      console.log('Loading data from Firebase Storage');
      
      try {
        const response = await fetch(docData.storageUrl);
        const compressedData = await response.text();
        return decompressData(compressedData);
      } catch (fetchError) {
        console.error('Error fetching from Storage:', fetchError);
        
        // Try to recreate the storage reference
        const storageRef = ref(storage, docData.storagePath);
        const url = await getDownloadURL(storageRef);
        const response = await fetch(url);
        const compressedData = await response.text();
        return decompressData(compressedData);
      }
      
    } else if (docData.version === 2) {
      // New format but uncompressed (shouldn't happen)
      return docData.data;
      
    } else {
      // Old format - return as is
      return docData;
    }
    
  } catch (error) {
    console.error('Error loading workflow data:', error);
    throw error;
  }
};

export const getWorkflowStorageInfo = async () => {
  try {
    const docRef = doc(firestore, WORKFLOW_COLLECTION, 'data');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return { exists: false };
    }
    
    const docData = docSnap.data();
    
    return {
      exists: true,
      type: docData.type || 'legacy',
      originalSize: docData.originalSize || 0,
      compressedSize: docData.compressedSize || 0,
      timestamp: docData.timestamp,
      method: docData.type === 'storage' ? 'Firebase Storage' : 'Firestore',
      version: docData.version || 1
    };
    
  } catch (error) {
    console.error('Error getting storage info:', error);
    return { exists: false, error: error.message };
  }
};