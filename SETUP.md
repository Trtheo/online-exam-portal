# Online Exam Portal Setup Guide

## Phase 1: Firebase Setup (COMPLETE THIS FIRST)

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: "online-exam-portal"
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password"

### 3. Create Firestore Database
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode"
4. Select location closest to you

### 4. Enable Storage
1. Go to "Storage"
2. Click "Get started"
3. Choose "Start in test mode"

### 5. Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Web" icon (</>)
4. Register app name: "online-exam-portal"
5. Copy the configuration object

### 6. Update Firebase Config
Replace the placeholder values in `js/firebase-config.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

## Phase 2: Test the Application

1. Open `index.html` in a web browser
2. Register as a teacher and student
3. Login with both accounts to test functionality

## Phase 2: Questions & Exam System ✅ COMPLETED

### New Features Added:
- **Add Questions Page**: Teachers can create MCQ, True/False, and Short Answer questions
- **Take Exam Page**: Students can take exams with timer and navigation
- **Results Viewing**: Teachers can view student submissions and scores
- **Auto-grading**: Automatic scoring for MCQ and True/False questions

## Phase 3: Next Steps

Remaining features to implement:
- Student detailed answer review
- Firebase security rules
- Manual grading for short answers
- Enhanced UI improvements

## Current Project Structure
```
online-exam/
├── index.html              # Login/Register page
├── teacher-dashboard.html  # Teacher dashboard
├── student-dashboard.html  # Student dashboard
├── add-questions.html      # Add questions interface
├── take-exam.html         # Student exam interface
├── view-results.html      # Teacher results view
├── css/
│   └── style.css          # All styles
├── js/
│   ├── firebase-config.js # Firebase configuration
│   ├── auth.js           # Authentication logic
│   ├── teacher.js        # Teacher functionality
│   ├── student.js        # Student functionality
│   ├── add-questions.js  # Question management
│   ├── take-exam.js      # Exam taking logic
│   └── view-results.js   # Results viewing
└── SETUP.md              # This setup guide
```

## Phase 1 Features Completed ✅
- User authentication (login/register)
- Role-based access (teacher/student)
- Teacher dashboard with exam creation
- Student dashboard with available exams
- Basic exam management
- Responsive design

Complete the Firebase setup above, then we'll continue with Phase 2!