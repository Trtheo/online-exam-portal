# ExamPortal - Online Examination System

A comprehensive web-based examination platform built with Firebase, featuring real-time exam management, anti-cheat measures, and automated grading.

## Features

### Authentication & Security
- Firebase Authentication with email/password
- Role-based access (Student/Teacher)
- Password reset with custom email templates
- Secure user data management

### Teacher Dashboard
- **Exam Management**: Create, edit, delete exams with scheduling
- **Question Bank**: Support for MCQ, True/False, and Short Answer questions
- **Rich Text Editor**: Quill.js integration for formatted content
- **Student Management**: View student profiles and performance analytics
- **Manual Grading**: Grade short answer questions with partial marks
- **Reports**: Generate PDF and Excel reports with professional styling
- **Real-time Monitoring**: Track exam status and student submissions

### Student Dashboard
- **Exam Taking**: Fullscreen mode with anti-cheat features
- **Question Navigation**: Matrix-style navigation grid
- **Real-time Timer**: Countdown with automatic submission
- **Results Viewing**: Detailed score breakdown and performance metrics
- **Leaderboard**: Compare performance with filtering options
- **Profile Management**: Update personal information

### Question Types
1. **Multiple Choice (MCQ)**: Auto-graded with 4 options
2. **True/False**: Auto-graded boolean questions
3. **Short Answer**: Manual grading with sample answers

### Anti-Cheat Features
- Mandatory fullscreen mode during exams
- Tab switch detection and warnings
- Suspicious activity logging
- Time-based exam access control

### Responsive Design
- Mobile-first approach
- Optimized layouts for all screen sizes
- Touch-friendly navigation
- Professional UI with modern styling

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **UI Framework**: Custom CSS with FontAwesome icons
- **Rich Text**: Quill.js editor
- **Charts**: Chart.js for analytics
- **PDF Generation**: jsPDF for reports
- **Excel Export**: SheetJS for spreadsheet generation


### 2. Firestore Security Rules
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

### 3. Email Templates
- Upload custom password reset template from `email-templates/firebase-template.html`
- Configure in Firebase Console → Authentication → Templates

### 4. Local Development
```bash
# Serve files using any local server
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

## File Structure

```
online-exam/
├── index.html                 # Login/Register page
├── student-dashboard.html     # Student interface
├── teacher-dashboard.html     # Teacher interface
├── add-questions.html         # Question management
├── take-exam.html            # Exam taking interface
├── css/
│   └── style.css             # Main stylesheet
├── js/
│   ├── firebase-config.js    # Firebase configuration
│   ├── auth.js              # Authentication logic
│   ├── student.js           # Student dashboard
│   ├── teacher.js           # Teacher dashboard
│   ├── add-questions.js     # Question management
│   └── take-exam.js         # Exam interface
├── email-templates/
│   ├── forgot-password.html  # Full email template
│   └── firebase-template.html # Firebase-compatible template
└── images/
    └── image.png            # Background image
```

## User Roles

### Student (Default)
- Take exams in fullscreen mode
- View results and performance
- Access leaderboard
- Manage profile

### Teacher (Manual Setup Required)
- Create and manage exams
- Add/edit questions
- Grade short answer questions
- Generate reports
- Manage students

**Note**: Teacher accounts must be manually created by updating the user's role in Firestore from 'student' to 'teacher'.

## Key Features Explained

### Exam Security
- **Fullscreen Enforcement**: Automatic fullscreen on exam start
- **Tab Monitoring**: Detects and warns about tab switches
- **Time Controls**: Strict start/end time enforcement
- **Session Management**: Prevents multiple exam sessions

### Grading System
- **Auto-grading**: MCQ and True/False questions
- **Manual grading**: Short answer with partial marks (e.g., 1.5/2)
- **Instant feedback**: Immediate results for auto-graded questions
- **Performance analytics**: Detailed score breakdowns

### Question Management
- **Rich text support**: Formatted questions and answers
- **Bulk import**: CSV/JSON question import
- **Question validation**: Prevents incomplete questions
- **Edit functionality**: Modify existing questions

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## License

This project is licensed under the MIT License.

## Credits

**Powered by BEST SCHOLARS**  
**Developed by [Theophile Niyigaba](https://visittheo.vercel.app/)**

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

*ExamPortal - Secure Online Examination System*