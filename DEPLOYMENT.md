# Deployment Guide for RxSprint on Netlify

## Prerequisites
- A Netlify account (sign up at https://www.netlify.com)
- A GitHub/GitLab/Bitbucket account for repository hosting
- Your Firebase configuration values

## Deployment Steps

### 1. Prepare Your Repository
1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Make sure all changes are committed

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify UI
1. Log in to your Netlify account
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider and select your repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: 18 (automatically set via netlify.toml)
5. Click "Deploy site"

#### Option B: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 3. Configure Environment Variables
Since your Firebase configuration is currently hardcoded, the app will work as-is. However, for better security in production, you should:

1. Go to your Netlify site settings → Environment variables
2. Add the following variables (optional but recommended):
   ```
   VITE_FIREBASE_API_KEY=AIzaSyDm1cNS_46XGFYg_Wt6vp3h059zzB1nTfA
   VITE_FIREBASE_AUTH_DOMAIN=cvse-32388.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://cvse-32388-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=cvse-32388
   VITE_FIREBASE_STORAGE_BUCKET=cvse-32388.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=899974287244
   VITE_FIREBASE_APP_ID=1:899974287244:web:24d847c7bc039a6c5490a9
   ```
3. Update `src/config/firebase.js` to use environment variables:
   ```javascript
   const firebaseConfig = {
     apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDm1cNS_46XGFYg_Wt6vp3h059zzB1nTfA",
     authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cvse-32388.firebaseapp.com",
     // ... etc
   };
   ```

### 4. Custom Domain (Optional)
1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow Netlify's instructions for DNS configuration

## Features Configured

✅ **Client-side routing**: Configured via `_redirects` and `netlify.toml`
✅ **Security headers**: Basic security headers are set
✅ **Build optimization**: Vite handles build optimization automatically
✅ **Node version**: Set to Node 18 for compatibility

## Post-Deployment Checklist

- [ ] Test all routes work correctly
- [ ] Verify Firebase connection (Notes, Voice features)
- [ ] Check mobile responsiveness
- [ ] Test file uploads and downloads
- [ ] Verify all images load correctly

## Troubleshooting

### Build Fails
- Check the build logs in Netlify
- Ensure all dependencies are listed in package.json
- Verify Node version compatibility

### Routes Return 404
- The `_redirects` file should handle this, but verify it exists in the public folder
- Check that the build output includes the file

### Firebase Connection Issues
- Verify Firebase project settings allow your Netlify domain
- Check Firebase security rules
- Ensure all Firebase services are enabled

## Continuous Deployment
Once connected to your Git repository, Netlify will automatically deploy new changes when you push to your main branch.