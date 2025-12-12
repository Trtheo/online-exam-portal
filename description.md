Interactive Online Exam Portal

A medium-level project built with HTML, CSS, JavaScript, and Firebase (Auth + Firestore + Storage).

 Project Overview

The Interactive Online Exam Portal is a web-based system that allows teachers to create and upload exams, and students to log in and take those exams online. The system is fully cloud-based using Firebase, enabling real-time data storage, authentication, and smooth exam delivery.

This project is ideal for schools, training centers, or online learning platforms.

User Roles

There are two user roles:

1. Teacher

Teachers can:

Login/Register

Create exams

Add questions (MCQ, short answer, True/False)

Set exam duration, title, start & end time

Upload images for questions (using Firebase Storage)

Publish exams

View student results & submissions

2. Student

Students can:

Login/Register

View available exams

Start and take an exam

Countdown timer

Submit answers

View results after teacher publishes them

 System Features (Full)
 1. Authentication (Firebase Auth)

Email & password login

Role-based access (Teacher / Student)

Password reset

 2. Teacher Features
2.1 Create Exam

Teacher enters:

Exam title (e.g., “Math Test 1”)

Subject

Duration (in minutes)

Start & end date/time

2.2 Add Questions

Teacher can:

Add multiple-choice questions

Add short-answer questions

Add True/False

Upload image or diagram

Add marks per question

2.3 Publish Exam

Once published:

Students can see it under their dashboard

Exam becomes locked after end time

2.4 View Student Results

Teacher can see:

Student name

Score

Answers submitted

Time taken

 3. Student Features
3.1 Student Dashboard

Student can:

View all available exams

See exam instructions

See exam duration

3.2 Take Exam

During the exam:

Timer countdown

Auto-save answers in Firestore

Prevents multiple attempts

Navigate between questions

Submit the exam

3.3 View Results

After grading:

Score

Correct/Incorrect answers

Teacher comments

📊 4. Admin Panel (Optional)

If you want, you can add an admin role:

Manage users

Manage exams

View system analytics


 Core UI Pages
Public Pages

Login

Register

Teacher Pages

Dashboard

Create Exam

Add Questions

Exam List

View Submissions

Student Pages

Dashboard

Exam Instructions

Take Exam Page

Exam Results

 Security

Role check before accessing pages

Firestore security rules for teacher & student access

Prevent students from editing exam questions

Prevent students from re-taking exam (maximum attempts) set by teacher



Leaderboard

Random question order


Anti-cheat features 

Teacher comments on answers

