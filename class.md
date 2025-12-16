# Class Management System

## Overview
Add class-based organization to the online exam system, allowing teachers to create classes and students to join them for better exam management and organization.

## Features

### For Teachers
- **Create Classes**: Create new classes with name, subject, and description
- **Class Dashboard**: View all created classes with student counts and exam statistics
- **Student Management**: View students in each class, add/remove students
- **Class-Specific Exams**: Assign exams to specific classes only
- **Class Analytics**: Performance analytics per class
- **Class Codes**: Generate unique join codes for students

### For Students
- **Join Classes**: Join classes using class codes provided by teachers
- **My Classes**: View all joined classes
- **Class Exams**: See exams assigned to specific classes
- **Class Leaderboard**: Compare performance within class members only

## Database Structure

### Classes Collection
```javascript
{
  id: "class_id",
  name: "Mathematics Grade 10",
  subject: "Mathematics", 
  description: "Advanced mathematics for grade 10 students",
  classCode: "MATH10A", // 6-character unique code
  teacherId: "teacher_uid",
  createdAt: timestamp,
  studentCount: 25,
  isActive: true
}
```

### User Updates
```javascript
// Add to existing user document
{
  classes: ["class_id1", "class_id2"], // Array of joined class IDs
  teacherClasses: ["class_id3", "class_id4"] // For teachers - created classes
}
```

### Exam Updates
```javascript
// Add to existing exam document
{
  assignedClasses: ["class_id1", "class_id2"], // Empty array = all students
  isClassSpecific: true // If true, only assigned classes can see
}
```

## Navigation Updates

### Teacher Navigation
- Dashboard
- My Exams
- **My Classes** (NEW)
- Manage Students
- Reports Center
- Verification Center
- Teacher Management (IT only)
- Profile

### Student Navigation  
- Dashboard
- Available Exams
- **My Classes** (NEW)
- My Results
- My Transcript
- Leaderboard
- Profile

## Implementation Plan

### Phase 1: Basic Class Management
1. Create class creation interface for teachers
2. Add class joining interface for students
3. Update user profiles to show classes
4. Basic class dashboard

### Phase 2: Class-Specific Exams
1. Add class assignment to exam creation
2. Filter exams by student's classes
3. Class-specific exam visibility

### Phase 3: Enhanced Features
1. Class analytics and reports
2. Class-specific leaderboards
3. Bulk student management
4. Class performance comparisons

## User Experience

### Teacher Workflow
1. Create class with name, subject, description
2. Share class code with students
3. Create exams and assign to specific classes
4. Monitor class performance and analytics

### Student Workflow
1. Receive class code from teacher
2. Join class using the code
3. View class-specific exams in "Available Exams"
4. Compare performance with classmates in leaderboard

## Benefits
- **Organization**: Better exam and student organization
- **Privacy**: Students only see relevant exams
- **Analytics**: Class-specific performance tracking
- **Scalability**: Teachers can manage multiple classes easily
- **Engagement**: Class-based competition and collaboration