# Firebase Storage Security Rules Configuration

## Important: Update Your Firebase Storage Rules

To allow your admin user to access Firebase Storage, you need to update your security rules in the Firebase Console.

### Steps to Configure:

1. **Go to Firebase Console**: https://console.firebase.google.com/u/0/project/cvse-32388/storage/cvse-32388.firebasestorage.app/rules

2. **Replace the current rules with:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow full access for the admin user only
    match /workflow-content/tdGILcyLbSOAUIjsoA93QGaj7Zm2/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == 'tdGILcyLbSOAUIjsoA93QGaj7Zm2';
    }
    
    // Alternative: Allow any authenticated user (since you're the only user)
    match /workflow-content/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. **For Single Admin User (Recommended for your setup):**

Since you're the only user, you can use simpler rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Only allow access for your specific admin UID
      allow read, write: if request.auth != null && request.auth.uid == 'tdGILcyLbSOAUIjsoA93QGaj7Zm2';
    }
  }
}
```

4. **Click "Publish" to apply the rules**

### Current Implementation:

The workflow page now:
1. Automatically authenticates using your admin credentials
2. Uses Firebase SDK methods (getBytes/uploadBytes) to avoid CORS issues
3. Stores data at: `workflow-content/tdGILcyLbSOAUIjsoA93QGaj7Zm2/workflow-data.json`

### Authentication Details:

- **Email**: `kaliiihosting@gmail.com`
- **Password**: `RxSprint2024Admin!`
- **User ID**: `tdGILcyLbSOAUIjsoA93QGaj7Zm2`

### Storage Structure:

Your workflow data is stored at:
- Path: `workflow-content/tdGILcyLbSOAUIjsoA93QGaj7Zm2/workflow-data.json`

### Troubleshooting:

If you still get permission errors:

1. **Verify Storage Rules are Published**:
   - Go to Firebase Console > Storage > Rules
   - Make sure the rules above are applied and published

2. **Check Authentication Status**:
   - Open browser console (F12)
   - Look for: "Admin authenticated successfully: tdGILcyLbSOAUIjsoA93QGaj7Zm2"
   - This confirms authentication is working

3. **Clear Browser Cache**:
   - Sometimes old authentication tokens can cause issues
   - Clear browser data and refresh the page

4. **Firebase Storage Configuration**:
   - Ensure your storage bucket is: `cvse-32388.firebasestorage.app`
   - Check that CORS is not configured to block localhost

The CORS issue has been fixed by using Firebase SDK methods directly instead of fetching URLs.