# Firebase Storage Rules Update for Notes Images

## Current Issue
You're getting a "storage/unauthorized" error when trying to upload images to the notes folder because the Firebase Storage security rules don't allow access to the `/notes/` path.

## Solution
You need to update your Firebase Storage security rules in the Firebase Console.

### Steps to Fix:

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
   - Select your project: `cvse-32388`

2. **Navigate to Storage Rules**
   - Click on "Storage" in the left sidebar
   - Click on the "Rules" tab

3. **Update the Rules**
   - Replace the existing rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read/write access to notes folder for all users (development)
    match /notes/{allPaths=**} {
      allow read, write: if true;
    }
    
    // Allow read/write access to voice-notes folder
    match /voice-notes/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

4. **Publish the Rules**
   - Click the "Publish" button to save and apply the new rules
   - The changes should take effect immediately

## Security Considerations

The rules above allow anyone to read and write to the storage buckets, which is fine for development but not recommended for production.

### Production Rules (More Secure)
For production, consider using authentication-based rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Only authenticated users can upload to notes
    match /notes/{allPaths=**} {
      allow read: if true;  // Anyone can view images
      allow write: if request.auth != null;  // Only authenticated users can upload
    }
    
    // Same for voice notes
    match /voice-notes/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing
After updating the rules:
1. Go back to your Notes page
2. Try pasting a screenshot again
3. The image should now upload successfully

## File Organization
Images are stored in Firebase Storage with the following structure:
- `/notes/[timestamp]_[filename].[extension]`
- Example: `/notes/1751334262122_screenshot.png`

Each image includes metadata:
- Content type
- Upload timestamp
- Screenshot indicator