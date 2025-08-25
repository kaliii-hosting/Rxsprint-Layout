# Firebase Storage CORS Setup Instructions

## Method 1: Using Google Cloud Shell (What you're trying)

1. **First, create the cors.json file in Cloud Shell:**
   ```bash
   cat > cors.json << 'EOF'
   [
     {
       "origin": ["*"],
       "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
       "maxAgeSeconds": 3600,
       "responseHeader": ["Content-Type", "Authorization", "Content-Length", "X-Requested-With"]
     }
   ]
   EOF
   ```

2. **Then apply it to your storage bucket:**
   ```bash
   gsutil cors set cors.json gs://cvse-32388.firebasestorage.app
   ```

3. **Verify the CORS configuration:**
   ```bash
   gsutil cors get gs://cvse-32388.firebasestorage.app
   ```

## Method 2: Use the Hybrid Storage Solution (Already Implemented)

Since setting up CORS can be complex, I've already created a hybrid solution that works WITHOUT needing CORS configuration. To use it:

1. Update your Workflow component to use the hybrid storage
2. It will automatically:
   - Try Firebase Storage using the SDK (no CORS issues)
   - Fallback to Firestore if Storage fails
   - Load from any existing data location

## Method 3: Alternative - Use Google Cloud Console UI

1. Go to: https://console.cloud.google.com/storage/browser
2. Select your project: cvse-32388
3. Click on your bucket: cvse-32388.firebasestorage.app
4. Click on "Configuration" tab
5. Click on "Edit CORS configuration"
6. Add the CORS rules

## Quick Fix - Just Use the Hybrid Solution

The code is already updated to use a hybrid approach that avoids CORS issues. No configuration needed!