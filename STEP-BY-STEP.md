# Step-by-Step Collection Setup

## Step 1: Open Firebase Rules
1. Go to Firebase Console → Firestore Database → Rules
2. Replace ALL existing rules with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. Click "Publish"

## Step 2: Run Auto-Init
1. Open `auto-init.html` in browser
2. Wait for "Setup complete!"

## Step 3: Secure Rules
1. Go back to Firebase Console → Rules
2. Replace with secure rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /exams/{examId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.createdBy == request.auth.uid);
      allow read: if request.auth != null && resource.data.published == true;
      match /questions/{questionId} {
        allow read, write: if request.auth != null && 
          get(/databases/$(database)/documents/exams/$(examId)).data.createdBy == request.auth.uid;
        allow read: if request.auth != null && 
          get(/databases/$(database)/documents/exams/$(examId)).data.published == true;
      }
    }
    match /submissions/{examId}/students/{studentId} {
      allow create, read: if request.auth != null && request.auth.uid == studentId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/exams/$(examId)).data.createdBy == request.auth.uid;
    }
  }
}
```

3. Click "Publish"

## Done!
Collections are now created and secured. Use `index.html` to start the app.