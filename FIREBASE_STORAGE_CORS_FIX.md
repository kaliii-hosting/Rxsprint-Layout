# Firebase Storage CORS Configuration Fix

## Problem
Firebase Storage is blocking requests from localhost due to CORS policy issues.

## Solution Implemented
Voice notes are now saved directly to Firestore as base64 encoded data instead of Firebase Storage. This avoids CORS issues entirely and provides faster access to audio data.

## If You Still Want to Use Firebase Storage

To fix CORS issues for Firebase Storage, you need to apply the CORS configuration using gsutil:

### Step 1: Install Google Cloud SDK
Download and install from: https://cloud.google.com/sdk/docs/install

### Step 2: Authenticate
```bash
gcloud auth login
```

### Step 3: Apply CORS Configuration
```bash
gsutil cors set cors.json gs://cvse-32388.appspot.com
```

### Step 4: Verify Configuration
```bash
gsutil cors get gs://cvse-32388.appspot.com
```

## Current Implementation (Firestore-based)

Voice notes are now saved with the following structure in Firestore:

```javascript
{
  title: "Voice Note - [timestamp]",
  content: "Transcribed text",
  category: "voice",
  duration: [seconds],
  audioData: "data:audio/webm;base64,[base64 encoded audio]",
  audioType: "audio/webm",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## Benefits of Firestore Storage
1. No CORS issues
2. Faster retrieval (no separate download)
3. Simpler authentication
4. Works immediately on localhost
5. Audio and transcription in same document

## Limitations
- Firestore documents have a 1MB size limit
- Longer recordings may exceed this limit
- For production with long recordings, consider:
  - Chunking audio into multiple documents
  - Compressing audio before encoding
  - Using Firebase Storage with proper CORS setup