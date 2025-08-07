# Netlify Environment Variables Setup

## Required Environment Variables for GPT Feature

### GitHub Token for AI Models
The GPT page uses GitHub Models API which requires a GitHub token.

**Variable Name:** `VITE_GITHUB_TOKEN`
**Value:** `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`

## How to Add in Netlify

1. Go to your Netlify dashboard
2. Select your site
3. Navigate to **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add the following:
   - **Key:** `VITE_GITHUB_TOKEN`
   - **Value:** `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`
6. Click **Save**
7. Trigger a new deployment for changes to take effect

## Other Required Variables
Make sure these are also set in Netlify:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_AZURE_DOCUMENT_KEY`
- `VITE_AZURE_DOCUMENT_ENDPOINT`
- `VITE_AZURE_SUPPLIES_KEY`
- `VITE_AZURE_SUPPLIES_ENDPOINT`

## Local Development
For local development, the `.env` file has been updated with the GitHub token.
Restart your development server after updating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## Troubleshooting

If you still get "Bad credentials" error:
1. Verify the token is correctly set in Netlify
2. Check the browser console for the actual error message
3. Make sure the deployment has completed after adding the variable
4. Clear browser cache and try again

## Security Note
The GitHub token provided is a personal access token. For production use, consider:
1. Creating a dedicated GitHub account for the application
2. Using a fine-grained personal access token with minimal permissions
3. Rotating the token periodically