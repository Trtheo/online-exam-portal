# Firestore Security Rules Setup

## Quick Fix for "Missing or insufficient permissions" Error

### Option 1: Use Development Rules (Recommended for Testing)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `online-exam-portal-2cea0`
3. Navigate to **Firestore Database** → **Rules**
4. Replace the existing rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Click **Publish**

### Option 2: Use Production Rules (Recommended for Live App)

Use the rules from `firestore.rules` file in this project for better security.

### Immediate Steps to Fix the Error:

1. **Check Authentication**: Ensure users are properly logged in
2. **Update Rules**: Apply the development rules above
3. **Test Registration**: Try creating a new account
4. **Verify Database**: Check if user documents are being created in Firestore

### Common Causes:

- Firestore rules are too restrictive
- User not authenticated when making requests
- User document doesn't exist in Firestore
- Network connectivity issues

### Testing:

After applying the rules, test:
1. User registration
2. User login
3. Dashboard access
4. Exam creation (for teachers)