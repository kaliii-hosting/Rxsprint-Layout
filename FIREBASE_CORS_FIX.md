# Firebase Storage CORS Fix for rxsprint.com

## Problem
The production website `https://rxsprint.com` is getting CORS errors when trying to access Firebase Storage:
```
Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/v0/b/cvse-32388.appspot.com/o/workflow-content%2F...' from origin 'https://rxsprint.com' has been blocked by CORS policy
```

## Solution 1: Set CORS via Google Cloud Console (RECOMMENDED)

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `cvse-32388`
3. Go to Cloud Storage > Browser
4. Click on bucket: `cvse-32388.appspot.com`

### Step 2: Configure CORS
1. Click the "Configuration" tab
2. Click "Edit CORS configuration"
3. Add this JSON configuration:

```json
[
  {
    "origin": ["https://rxsprint.com", "https://www.rxsprint.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
  }
]
```

4. Click "Save"

## Solution 2: Use Google Cloud Shell

### Option A: Via Cloud Shell
1. Open [Google Cloud Shell](https://shell.cloud.google.com/)
2. Run these commands:

```bash
# Set your project
gcloud config set project cvse-32388

# Create CORS configuration
cat > cors.json << 'EOF'
[
  {
    "origin": ["https://rxsprint.com", "https://www.rxsprint.com"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
  }
]
EOF

# Apply CORS to your bucket
gsutil cors set cors.json gs://cvse-32388.appspot.com

# Verify CORS configuration
gsutil cors get gs://cvse-32388.appspot.com
```

## Solution 3: Alternative Code Fix (If CORS can't be set)

If you can't set CORS, update your workflow component to use the Firebase SDK directly instead of HTTP requests:

### Update the workflow data access code:

```javascript
// Instead of using fetch/XMLHttpRequest, use Firebase SDK:
import { getStorage, ref, getDownloadURL, uploadBytes } from 'firebase/storage';

const storage = getStorage();
const storageRef = ref(storage, `workflow-content/${userId}/workflow-data.json`);

// This approach bypasses CORS issues
try {
  const url = await getDownloadURL(storageRef);
  const response = await fetch(url);
  const data = await response.json();
} catch (error) {
  console.log('Using Firestore fallback...');
  // Fallback to Firestore
}
```

## Verification

After applying the CORS fix, test by:
1. Opening https://rxsprint.com
2. Going to the Workflow page  
3. The Firebase Storage requests should work without CORS errors

## Notes

- The CORS configuration allows requests from both `https://rxsprint.com` and `https://www.rxsprint.com`
- Changes may take a few minutes to propagate
- If issues persist, try clearing browser cache or using incognito mode

## Quick Test Command

To test if CORS is working:
```bash
curl -H "Origin: https://rxsprint.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     "https://firebasestorage.googleapis.com/v0/b/cvse-32388.appspot.com/o/workflow-content%2Ftest"
```

The response should include `Access-Control-Allow-Origin: https://rxsprint.com`.