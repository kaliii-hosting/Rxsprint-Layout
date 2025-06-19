# Firebase Storage Setup Guide

To enable voice note audio file uploads, you need to update your Firebase Storage security rules.

## Steps to Fix Storage Permissions:

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com/
   - Select your project (cvse-32388)

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click on the "Rules" tab

3. **Update Security Rules**
   Replace the existing rules with:

   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       // Allow read/write access to voice-notes folder
       match /voice-notes/{allPaths=**} {
         allow read, write: if true;
       }
       
       // Or for authenticated users only:
       // match /voice-notes/{allPaths=**} {
       //   allow read, write: if request.auth != null;
       // }
     }
   }
   ```

4. **Publish Rules**
   - Click "Publish" to save the changes

## Alternative: Development Mode (Temporary)
For testing purposes only, you can allow all read/write access:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ Warning**: This allows anyone to read/write to your storage. Only use this for development!

## Current Implementation
The voice transcription feature has been updated to handle storage permission errors gracefully:
- If audio upload fails, the transcription is still saved to Firestore
- Voice notes will work even without audio file storage
- Once permissions are fixed, audio files will be automatically uploaded

## Testing
After updating the rules:
1. Click the microphone button in the app header
2. Speak your message
3. Click the green button to stop and save
4. Check if the audio file uploads successfully