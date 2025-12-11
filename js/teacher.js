// Teacher dashboard functionality
let currentUser = null;
let allExams = [];

// Set default datetime values
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startInput = document.getElementById('examStartTime');
    const endInput = document.getElementById('examEndTime');
    
    if (startInput) {
        startInput.value = now.toISOString().slice(0, 16);
    }
    if (endInput) {
        endInput.value = tomorrow.toISOString().slice(0, 16);
    }
});

// Initialize dashboard
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData && userData.role === 'teacher') {
            document.getElementById('teacherName').textContent = userData.name;
            document.getElementById('userAvatar').textContent = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            loadDashboardData();
        } else {
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

function showCreateExam() {
    document.getElementById('createExamModal').classList.remove('hidden');
    updateActiveNav('Create Exam');
}

function hideCreateExam() {
    document.getElementById('createExamModal').classList.add('hidden');
    document.getElementById('examForm').reset();
}

function showExamList() {
    loadExams();
    updateActiveNav('My Exams');
}

function viewAllResults() {
    showAllResultsView();
}

function showStudentManagement() {
    hideAllSections();
    updateActiveNav('Manage Students');
    
    let studentView = document.getElementById('studentManagementView');
    if (!studentView) {
        studentView = document.createElement('div');
        studentView.id = 'studentManagementView';
        studentView.className = 'dashboard-section';
        studentView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-users-cog"></i> Student Management</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div class="student-filters" style="margin-bottom: 20px;">
                    <select id="examFilter" onchange="filterStudentsByExam()" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #d1d5db;">
                        <option value="">All Exams</option>
                    </select>
                    <input type="text" id="studentSearch" placeholder="Search students..." onkeyup="searchStudents()" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #d1d5db; margin-left: 10px;">
                </div>
                <div id="studentsContainer">Loading students...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(studentView);
    }
    
    studentView.style.display = 'block';
    loadStudentManagement();
}

function hideAllSections() {
    document.querySelector('.dashboard-stats').style.display = 'none';
    document.querySelector('.dashboard-section').style.display = 'none';
    const resultsView = document.getElementById('allResultsView');
    if (resultsView) resultsView.style.display = 'none';
    const studentView = document.getElementById('studentManagementView');
    if (studentView) studentView.style.display = 'none';
    const profileView = document.getElementById('profileView');
    if (profileView) profileView.style.display = 'none';
}

async function loadStudentManagement() {
    const container = document.getElementById('studentsContainer');
    const examFilter = document.getElementById('examFilter');
    
    try {
        // Load exams for filter
        const examSnapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .get();
        
        examFilter.innerHTML = '<option value="">All Exams</option>';
        examSnapshot.forEach(doc => {
            const exam = doc.data();
            examFilter.innerHTML += `<option value="${doc.id}">${exam.title}</option>`;
        });
        
        // Load all students who submitted to teacher's exams
        const studentsMap = new Map();
        
        for (const examDoc of examSnapshot.docs) {
            const exam = examDoc.data();
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id)
                .collection('students')
                .get();
            
            for (const submissionDoc of submissionSnapshot.docs) {
                const studentId = submissionDoc.id;
                const submission = submissionDoc.data();
                
                if (!studentsMap.has(studentId)) {
                    const userDoc = await db.collection('users').doc(studentId).get();
                    const userData = userDoc.data();
                    studentsMap.set(studentId, {
                        id: studentId,
                        name: userData?.name || 'Unknown',
                        email: userData?.email || 'Unknown',
                        exams: []
                    });
                }
                
                const score = await calculateInlineScore(examDoc.id, submission.answers);
                studentsMap.get(studentId).exams.push({
                    examId: examDoc.id,
                    examTitle: exam.title,
                    score: score.scored,
                    total: score.total,
                    percentage: score.total > 0 ? ((score.scored / score.total) * 100).toFixed(1) : 0,
                    submittedAt: submission.submittedAt
                });
            }
        }
        
        displayStudents(Array.from(studentsMap.values()));
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading students. Please refresh the page.</p>';
    }
}

function displayStudents(students) {
    const container = document.getElementById('studentsContainer');
    
    if (students.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px; color: #1e293b;">No students found</h3>
                <p>Students will appear here after they submit exams</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="students-grid" style="display: grid; gap: 16px;">
            ${students.map(student => `
                <div class="student-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 12px;">
                        <div>
                            <h4 style="margin: 0; color: #1e293b;"><i class="fas fa-user"></i> ${student.name}</h4>
                            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">${student.email}</p>
                        </div>
                        <div style="text-align: right;">
                            <span style="background: #dbeafe; color: #3b82f6; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">
                                ${student.exams.length} exam${student.exams.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                    <div class="student-exams" style="max-height: 200px; overflow-y: auto;">
                        ${student.exams.map(exam => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
                                <span style="font-size: 14px; color: #374151;">${exam.examTitle}</span>
                                <span style="font-weight: 600; color: ${exam.percentage >= 70 ? '#16a34a' : exam.percentage >= 50 ? '#d97706' : '#ef4444'};">
                                    ${exam.score}/${exam.total} (${exam.percentage}%)
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function filterStudentsByExam() {
    // Implementation for filtering students by exam
    loadStudentManagement();
}

function searchStudents() {
    // Implementation for searching students
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    // Add search logic here
}

function showAllResultsView() {
    hideAllSections();
    updateActiveNav('All Results');
    
    let resultsView = document.getElementById('allResultsView');
    if (!resultsView) {
        resultsView = document.createElement('div');
        resultsView.id = 'allResultsView';
        resultsView.className = 'dashboard-section';
        resultsView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-chart-bar"></i> All Exam Results</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div class="results-filters" style="margin-bottom: 20px; display: flex; gap: 12px; align-items: center;">
                    <select id="resultsExamFilter" onchange="filterResults()" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #d1d5db;">
                        <option value="">All Exams</option>
                    </select>
                    <button class="btn btn-outline btn-sm" onclick="exportResults()"><i class="fas fa-download"></i> Export</button>
                </div>
                <div id="resultsContainer">Loading results...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(resultsView);
    }
    
    resultsView.style.display = 'block';
    loadAllResultsInline();
}

function showDashboard() {
    document.querySelector('.dashboard-stats').style.display = 'grid';
    document.querySelector('.dashboard-section').style.display = 'block';
    const resultsView = document.getElementById('allResultsView');
    if (resultsView) resultsView.style.display = 'none';
    const studentView = document.getElementById('studentManagementView');
    if (studentView) studentView.style.display = 'none';
    const profileView = document.getElementById('profileView');
    if (profileView) profileView.style.display = 'none';
    updateActiveNav('Dashboard');
}

function updateActiveNav(activeItem) {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.includes(activeItem)) {
            link.classList.add('active');
        }
    });
}

async function loadAllResultsInline() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">Loading results...</div>';
    
    try {
        const examSnapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .get();
        
        if (examSnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-chart-bar" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px; color: #1e293b;">No results yet</h3>
                    <p>Create and publish exams to see results here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        for (const examDoc of examSnapshot.docs) {
            const exam = examDoc.data();
            const examCard = await createInlineResultCard(examDoc.id, exam);
            container.appendChild(examCard);
        }
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading results. Please refresh the page.</p>';
    }
}

async function createInlineResultCard(examId, exam) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    card.style.marginBottom = '20px';
    
    try {
        const submissionSnapshot = await db.collection('submissions')
            .doc(examId).collection('students').get();
        
        const submissionCount = submissionSnapshot.size;
        let totalScore = 0;
        let maxScore = 0;
        
        for (const submissionDoc of submissionSnapshot.docs) {
            const submission = submissionDoc.data();
            const score = await calculateInlineScore(examId, submission.answers);
            totalScore += score.scored;
            maxScore = score.total;
        }
        
        const averageScore = submissionCount > 0 ? (totalScore / submissionCount).toFixed(1) : 0;
        const averagePercentage = maxScore > 0 ? ((totalScore / (submissionCount * maxScore)) * 100).toFixed(1) : 0;
        
        card.innerHTML = `
            <div class="exam-header">
                <div>
                    <div class="exam-title">${exam.title}</div>
                    <div class="exam-subject">${exam.subject}</div>
                </div>
                <div class="exam-status ${exam.published ? 'status-published' : 'status-draft'}">
                    ${exam.published ? 'Published' : 'Draft'}
                </div>
            </div>
            
            <div class="exam-meta">
                <div class="meta-item">
                    <i class="fas fa-users meta-icon"></i>
                    <span>${submissionCount} submissions</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-chart-line meta-icon"></i>
                    <span>Avg: ${averageScore}/${maxScore} (${averagePercentage}%)</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-calendar-alt meta-icon"></i>
                    <span>${exam.startTime ? exam.startTime.toDate().toLocaleDateString() : 'Not set'}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-clock meta-icon"></i>
                    <span>${exam.duration} minutes</span>
                </div>
            </div>
            
            <div class="exam-actions">
                <button class="btn btn-primary btn-sm" onclick="viewSubmissions('${examId}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-outline btn-sm" onclick="downloadExamReport('${examId}')">
                    <i class="fas fa-download"></i> Report
                </button>
            </div>
        `;
        
    } catch (error) {
        card.innerHTML = `
            <div class="exam-header">
                <div>
                    <div class="exam-title">${exam.title}</div>
                    <div class="exam-subject">${exam.subject}</div>
                </div>
            </div>
            <p style="color: #ef4444;">Error loading results for this exam</p>
        `;
    }
    
    return card;
}

async function calculateInlineScore(examId, answers) {
    try {
        const questionsSnapshot = await db.collection('exams').doc(examId)
            .collection('questions').get();
        
        let scored = 0;
        let total = 0;
        
        questionsSnapshot.forEach(doc => {
            const question = doc.data();
            total += question.marks;
            
            const studentAnswer = answers[doc.id];
            if (studentAnswer !== undefined) {
                if (question.type === 'mcq') {
                    if (parseInt(studentAnswer) === question.correctAnswer) {
                        scored += question.marks;
                    }
                } else if (question.type === 'tf') {
                    if (studentAnswer === question.correctAnswer.toString()) {
                        scored += question.marks;
                    }
                }
            }
        });
        
        return { scored, total };
    } catch (error) {
        return { scored: 0, total: 0 };
    }
}

async function loadDashboardData() {
    await loadExams();
    await loadStats();
}

async function loadStats() {
    if (!currentUser) return;
    
    try {
        // Load exam count
        const examSnapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .get();
        
        document.getElementById('totalExams').textContent = examSnapshot.size;
        
        // Load submission count and calculate average
        let totalSubmissions = 0;
        let totalScore = 0;
        let totalMaxScore = 0;
        const uniqueStudents = new Set();
        
        for (const examDoc of examSnapshot.docs) {
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id)
                .collection('students')
                .get();
            
            totalSubmissions += submissionSnapshot.size;
            
            for (const submissionDoc of submissionSnapshot.docs) {
                uniqueStudents.add(submissionDoc.id);
                const submission = submissionDoc.data();
                const score = await calculateInlineScore(examDoc.id, submission.answers);
                totalScore += score.scored;
                totalMaxScore += score.total;
            }
        }
        
        document.getElementById('totalSubmissions').textContent = totalSubmissions;
        document.getElementById('totalStudents').textContent = uniqueStudents.size;
        
        // Calculate average percentage
        const averagePercentage = totalMaxScore > 0 ? ((totalScore / totalMaxScore) * 100).toFixed(1) : 0;
        document.getElementById('averageScore').textContent = averagePercentage + '%';
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Create exam form handler
document.getElementById('examForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const examData = {
        title: document.getElementById('examTitle').value,
        subject: document.getElementById('examSubject').value,
        duration: parseInt(document.getElementById('examDuration').value),
        startTime: new Date(document.getElementById('examStartTime').value),
        endTime: new Date(document.getElementById('examEndTime').value),
        instructions: document.getElementById('examInstructions').value || '',
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        published: false
    };
    
    try {
        const docRef = await db.collection('exams').add(examData);
        showNotification('Exam created successfully!');
        hideCreateExam();
        loadDashboardData();
    } catch (error) {
        alert('Error creating exam: ' + error.message);
    }
});

async function loadExams() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .get();
        
        // Sort manually since Firestore index might not be ready
        const docs = snapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt;
            const bTime = b.data().createdAt;
            if (!aTime || !bTime) return 0;
            return bTime.toMillis() - aTime.toMillis();
        });
        
        const examList = document.getElementById('examList');
        
        if (docs.length === 0) {
            examList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px; color: #1e293b;">No exams yet</h3>
                    <p>Create your first exam to get started</p>
                </div>
            `;
        } else {
            allExams = docs.map(doc => ({ id: doc.id, data: doc.data() }));
            examList.innerHTML = '';
            allExams.forEach(exam => {
                const examCard = createExamCard(exam.id, exam.data);
                examList.appendChild(examCard);
            });
        }
    } catch (error) {
        console.error('Error loading exams:', error);
        examList.innerHTML = '<p style="color: #ef4444;">Error loading exams. Please refresh the page.</p>';
    }
}

function createExamCard(examId, exam) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    
    const startTime = exam.startTime ? exam.startTime.toDate().toLocaleDateString() : 'Not set';
    const endTime = exam.endTime ? exam.endTime.toDate().toLocaleDateString() : 'Not set';
    const now = new Date();
    const examStart = exam.startTime ? exam.startTime.toDate() : null;
    const examEnd = exam.endTime ? exam.endTime.toDate() : null;
    
    let status = 'draft';
    let statusText = 'Draft';
    
    if (exam.published) {
        if (examEnd && now > examEnd) {
            status = 'ended';
            statusText = 'Ended';
        } else if (examStart && now >= examStart) {
            status = 'published';
            statusText = 'Active';
        } else {
            status = 'published';
            statusText = 'Scheduled';
        }
    }
    
    card.innerHTML = `
        <div class="exam-header">
            <div>
                <div class="exam-title">${exam.title}</div>
                <div class="exam-subject">${exam.subject}</div>
            </div>
            <div class="exam-status status-${status}">${statusText}</div>
        </div>
        
        <div class="exam-meta">
            <div class="meta-item">
                <i class="fas fa-clock meta-icon"></i>
                <span>${exam.duration} minutes</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-alt meta-icon"></i>
                <span>${startTime}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-check meta-icon"></i>
                <span>${endTime}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-question-circle meta-icon"></i>
                <span id="questions-${examId}">Loading...</span>
            </div>
        </div>
        
        <div class="exam-actions">
            <button class="btn btn-primary btn-sm" onclick="addQuestions('${examId}')">
                <i class="fas fa-edit"></i> Questions
            </button>
            <button class="btn btn-success btn-sm" onclick="viewSubmissions('${examId}')">
                <i class="fas fa-chart-line"></i> Results
            </button>
            ${!exam.published ? 
                `<button class="btn btn-outline btn-sm" onclick="publishExam('${examId}')">
                    <i class="fas fa-rocket"></i> Publish
                </button>` : 
                `<button class="btn btn-danger btn-sm" onclick="unpublishExam('${examId}')">
                    <i class="fas fa-pause"></i> Unpublish
                </button>`
            }
            <button class="btn btn-outline btn-sm" onclick="duplicateExam('${examId}')">
                <i class="fas fa-copy"></i> Duplicate
            </button>
        </div>
    `;
    
    // Load question count
    loadQuestionCount(examId);
    
    return card;
}

async function loadQuestionCount(examId) {
    try {
        const snapshot = await db.collection('exams').doc(examId)
            .collection('questions').get();
        const element = document.getElementById(`questions-${examId}`);
        if (element) {
            element.textContent = `${snapshot.size} questions`;
        }
    } catch (error) {
        console.error('Error loading question count:', error);
    }
}

async function unpublishExam(examId) {
    if (confirm('Are you sure you want to unpublish this exam?')) {
        try {
            await db.collection('exams').doc(examId).update({
                published: false
            });
            loadDashboardData();
        } catch (error) {
            alert('Error unpublishing exam: ' + error.message);
        }
    }
}

function addQuestions(examId) {
    window.location.href = `add-questions.html?examId=${examId}`;
}

function viewSubmissions(examId) {
    window.location.href = `view-results.html?examId=${examId}`;
}

async function publishExam(examId) {
    if (confirm('Are you sure you want to publish this exam? Students will be able to see and take it.')) {
        try {
            await db.collection('exams').doc(examId).update({
                published: true
            });
            showNotification('Exam published successfully!');
            loadDashboardData();
        } catch (error) {
            alert('Error publishing exam: ' + error.message);
        }
    }
}

async function duplicateExam(examId) {
    if (confirm('Are you sure you want to duplicate this exam?')) {
        try {
            const examDoc = await db.collection('exams').doc(examId).get();
            const examData = examDoc.data();
            
            // Create new exam with modified title
            const newExamData = {
                ...examData,
                title: examData.title + ' (Copy)',
                published: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const newExamRef = await db.collection('exams').add(newExamData);
            
            // Copy questions
            const questionsSnapshot = await db.collection('exams').doc(examId)
                .collection('questions').get();
            
            const batch = db.batch();
            questionsSnapshot.forEach(questionDoc => {
                const questionRef = db.collection('exams').doc(newExamRef.id)
                    .collection('questions').doc();
                batch.set(questionRef, questionDoc.data());
            });
            
            await batch.commit();
            showNotification('Exam duplicated successfully!');
            loadDashboardData();
        } catch (error) {
            alert('Error duplicating exam: ' + error.message);
        }
    }
}

function showProfile() {
    hideAllSections();
    updateActiveNav('Profile');
    
    let profileView = document.getElementById('profileView');
    if (!profileView) {
        profileView = document.createElement('div');
        profileView.id = 'profileView';
        profileView.className = 'dashboard-section';
        profileView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-user"></i> Profile Settings</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div class="profile-container">
                    <div class="profile-card">
                        <div class="profile-header">
                            <div class="profile-avatar" id="profileAvatar">T</div>
                            <div class="profile-info">
                                <h3 id="profileName">Loading...</h3>
                                <p id="profileEmail">Loading...</p>
                                <span class="profile-role"><i class="fas fa-chalkboard-teacher"></i> Teacher</span>
                            </div>
                        </div>
                        <form id="profileForm" class="profile-form">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="updateName" required>
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="updateEmail" disabled>
                            </div>
                            <div class="form-group">
                                <label>Current Password</label>
                                <input type="password" id="currentPassword" placeholder="Enter current password">
                            </div>
                            <div class="form-group">
                                <label>New Password</label>
                                <input type="password" id="newPassword" placeholder="Leave blank to keep current">
                            </div>
                            <div class="form-group">
                                <label>Confirm New Password</label>
                                <input type="password" id="confirmPassword" placeholder="Confirm new password">
                            </div>
                            <div class="profile-actions">
                                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Profile</button>
                                <button type="button" class="btn btn-danger" onclick="deleteAccount()"><i class="fas fa-trash"></i> Delete Account</button>
                            </div>
                        </form>
                    </div>
                    <div class="profile-stats">
                        <h3><i class="fas fa-chart-bar"></i> Account Statistics</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value" id="profileExams">0</div>
                                <div class="stat-label">Exams Created</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="profileStudents">0</div>
                                <div class="stat-label">Students Taught</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="profileJoined">-</div>
                                <div class="stat-label">Member Since</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(profileView);
    }
    
    profileView.style.display = 'block';
    loadProfileData();
}

async function loadProfileData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData) {
            document.getElementById('profileName').textContent = userData.name;
            document.getElementById('profileEmail').textContent = userData.email;
            document.getElementById('profileAvatar').textContent = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('updateName').value = userData.name;
            document.getElementById('updateEmail').value = userData.email;
            
            if (userData.createdAt) {
                document.getElementById('profileJoined').textContent = userData.createdAt.toDate().toLocaleDateString();
            }
        }
        
        // Load stats
        const examSnapshot = await db.collection('exams').where('createdBy', '==', currentUser.uid).get();
        document.getElementById('profileExams').textContent = examSnapshot.size;
        
        let uniqueStudents = new Set();
        for (const examDoc of examSnapshot.docs) {
            const submissionSnapshot = await db.collection('submissions').doc(examDoc.id).collection('students').get();
            submissionSnapshot.forEach(doc => uniqueStudents.add(doc.id));
        }
        document.getElementById('profileStudents').textContent = uniqueStudents.size;
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function exportResults() {
    // Simple CSV export
    alert('Export functionality will be implemented. This would generate a CSV file with all results.');
}

function downloadExamReport(examId) {
    // Generate and download exam report
    alert('Report download functionality will be implemented. This would generate a detailed PDF report.');
}

function filterResults() {
    // Filter results by selected exam
    loadAllResultsInline();
}

function showNotification(message, type = 'success') {
    const toast = document.getElementById('notificationToast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    messageEl.textContent = message;
    
    if (type === 'success') {
        icon.className = 'fas fa-check-circle toast-icon';
        icon.style.color = '#16a34a';
    } else if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle toast-icon';
        icon.style.color = '#ef4444';
    } else if (type === 'info') {
        icon.className = 'fas fa-info-circle toast-icon';
        icon.style.color = '#3b82f6';
    }
    
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

function filterExams() {
    const statusFilter = document.getElementById('examStatusFilter').value;
    const searchTerm = document.getElementById('examSearch').value.toLowerCase();
    
    let filteredExams = allExams;
    
    if (statusFilter) {
        filteredExams = filteredExams.filter(exam => {
            const now = new Date();
            const examStart = exam.data.startTime ? exam.data.startTime.toDate() : null;
            const examEnd = exam.data.endTime ? exam.data.endTime.toDate() : null;
            
            let status = 'draft';
            if (exam.data.published) {
                if (examEnd && now > examEnd) {
                    status = 'ended';
                } else {
                    status = 'published';
                }
            }
            
            return status === statusFilter;
        });
    }
    
    if (searchTerm) {
        filteredExams = filteredExams.filter(exam => 
            exam.data.title.toLowerCase().includes(searchTerm) ||
            exam.data.subject.toLowerCase().includes(searchTerm)
        );
    }
    
    displayFilteredExams(filteredExams);
}

function searchExams() {
    filterExams();
}

function refreshExams() {
    showNotification('Refreshing exams...', 'info');
    loadExams();
}

function displayFilteredExams(exams) {
    const examList = document.getElementById('examList');
    const resultsCount = document.getElementById('examResultsCount');
    
    // Update results count
    if (exams.length === allExams.length) {
        resultsCount.textContent = `Showing all ${exams.length} exams`;
    } else {
        resultsCount.textContent = `Showing ${exams.length} of ${allExams.length} exams`;
    }
    
    if (exams.length === 0) {
        examList.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px; color: #1e293b;">No exams found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
    } else {
        examList.innerHTML = '';
        exams.forEach(exam => {
            const examCard = createExamCard(exam.id, exam.data);
            examList.appendChild(examCard);
        });
    }
}

function clearFilters() {
    document.getElementById('examStatusFilter').value = '';
    document.getElementById('examSearch').value = '';
    displayFilteredExams(allExams);
}

function clearSearch() {
    document.getElementById('examSearch').value = '';
    filterExams();
}

// Profile form handler
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'profileForm') {
        e.preventDefault();
        
        const name = document.getElementById('updateName').value;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword && newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        
        try {
            // Update name in Firestore
            await db.collection('users').doc(currentUser.uid).update({ name });
            
            // Update password if provided
            if (newPassword && currentPassword) {
                const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPassword);
                await currentUser.reauthenticateWithCredential(credential);
                await currentUser.updatePassword(newPassword);
            }
            
            showNotification('Profile updated successfully!');
            document.getElementById('teacherName').textContent = name;
            document.getElementById('userAvatar').textContent = name.split(' ').map(n => n[0]).join('').toUpperCase();
            
        } catch (error) {
            showNotification('Error updating profile: ' + error.message, 'error');
        }
    }
});

function deleteAccount() {
    document.getElementById('deleteModal').classList.remove('hidden');
    document.getElementById('deletePassword').value = '';
}

function hideDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
    document.getElementById('deletePassword').value = '';
}

async function confirmDelete() {
    const password = document.getElementById('deletePassword').value;
    
    if (!password) {
        showNotification('Please enter your password', 'error');
        return;
    }
    
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, password);
        await currentUser.reauthenticateWithCredential(credential);
        
        hideDeleteModal();
        
        // Delete user data from Firestore
        await db.collection('users').doc(currentUser.uid).delete();
        
        // Delete user account
        await currentUser.delete();
        
        showNotification('Account deleted successfully. Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        showNotification('Error deleting account: ' + error.message, 'error');
    }
}

// Sidebar toggle functions
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
}

// Close sidebar when clicking nav links on mobile
document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });
});

function showLeaderboard() {
    hideAllSections();
    updateActiveNav('Leaderboard');
    
    let leaderboardView = document.getElementById('leaderboardView');
    if (!leaderboardView) {
        leaderboardView = document.createElement('div');
        leaderboardView.id = 'leaderboardView';
        leaderboardView.className = 'dashboard-section';
        leaderboardView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-trophy"></i> Leaderboard</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back</button>
            </div>
            <div class="section-content">
                <div id="leaderboardContainer">Loading...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(leaderboardView);
    }
    
    leaderboardView.style.display = 'block';
    loadLeaderboard();
}

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    
    try {
        const examSnapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .where('published', '==', true)
            .get();
        
        const studentsMap = new Map();
        
        for (const examDoc of examSnapshot.docs) {
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id).collection('students').get();
            
            for (const submissionDoc of submissionSnapshot.docs) {
                const studentId = submissionDoc.id;
                const submission = submissionDoc.data();
                
                if (!studentsMap.has(studentId)) {
                    const userDoc = await db.collection('users').doc(studentId).get();
                    const userData = userDoc.data();
                    studentsMap.set(studentId, {
                        name: userData?.name || 'Unknown',
                        totalScore: 0,
                        totalExams: 0,
                        suspiciousActivity: 0
                    });
                }
                
                const student = studentsMap.get(studentId);
                const score = await calculateInlineScore(examDoc.id, submission.answers);
                const percentage = score.total > 0 ? (score.scored / score.total) * 100 : 0;
                
                student.totalScore += percentage;
                student.totalExams += 1;
                student.suspiciousActivity += (submission.suspiciousActivity?.length || 0);
            }
        }
        
        const students = Array.from(studentsMap.values())
            .map(s => ({ ...s, averageScore: s.totalScore / s.totalExams }))
            .sort((a, b) => b.averageScore - a.averageScore);
        
        if (students.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3>No data available</h3>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="leaderboard-table">
                <div class="leaderboard-header">
                    <div>Rank</div><div>Student</div><div>Score</div><div>Exams</div><div>Flags</div>
                </div>
                ${students.map((student, index) => {
                    const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    return `
                        <div class="leaderboard-row">
                            <div>${rank}</div>
                            <div>${student.name}</div>
                            <div>${student.averageScore.toFixed(1)}%</div>
                            <div>${student.totalExams}</div>
                            <div>${student.suspiciousActivity > 0 ? `⚠️ ${student.suspiciousActivity}` : '✅'}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading leaderboard.</p>';
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const createModal = document.getElementById('createExamModal');
    const logoutModal = document.getElementById('logoutModal');
    const deleteModal = document.getElementById('deleteModal');
    
    if (e.target === createModal) {
        hideCreateExam();
    } else if (e.target === logoutModal) {
        hideLogoutModal();
    } else if (e.target === deleteModal) {
        hideDeleteModal();
    }
});