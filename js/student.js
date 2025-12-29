// Student dashboard functionality
let currentUser = null;
let allExams = [];
let userSubmissions = new Map();

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData && userData.role === 'student') {
            document.getElementById('studentName').textContent = userData.name;
            document.getElementById('userAvatar').textContent = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            await loadDashboardData();
        } else {
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

async function loadDashboardData() {
    await loadUserSubmissions();
    await loadAvailableExams();
    await loadStats();
}

async function loadUserSubmissions() {
    try {
        const examsSnapshot = await db.collection('exams').where('published', '==', true).get();
        
        for (const examDoc of examsSnapshot.docs) {
            const submissionDoc = await db.collection('submissions')
                .doc(examDoc.id)
                .collection('students')
                .doc(currentUser.uid)
                .get();
            
            if (submissionDoc.exists) {
                const submission = submissionDoc.data();
                const score = await calculateScore(examDoc.id, submission.answers);
                userSubmissions.set(examDoc.id, {
                    ...submission,
                    score: score.scored,
                    total: score.total,
                    percentage: score.total > 0 ? ((score.scored / score.total) * 100).toFixed(1) : 0,
                    timeSpent: submission.timeSpent || 0
                });
            }
        }
    } catch (error) {
        console.error('Error loading submissions:', error);
    }
}

async function calculateScore(examId, answers) {
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

async function loadStats() {
    try {
        const completedCount = userSubmissions.size;
        const allExamsSnapshot = await db.collection('exams').where('published', '==', true).get();
        const pendingCount = allExamsSnapshot.size - completedCount;
        
        let totalScore = 0;
        let bestScore = 0;
        
        userSubmissions.forEach(submission => {
            const percentage = parseFloat(submission.percentage);
            totalScore += percentage;
            if (percentage > bestScore) {
                bestScore = percentage;
            }
        });
        
        const averageScore = completedCount > 0 ? (totalScore / completedCount).toFixed(1) : 0;
        
        document.getElementById('completedExams').textContent = completedCount;
        document.getElementById('pendingExams').textContent = pendingCount;
        document.getElementById('averageScore').textContent = averageScore + '%';
        document.getElementById('bestScore').textContent = bestScore.toFixed(1) + '%';
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadAvailableExams() {
    if (!currentUser) return;
    
    try {
        // Get student's classes first
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const studentClasses = userData.classes || [];
        
        const snapshot = await db.collection('exams')
            .where('published', '==', true)
            .get();
        
        allExams = [];
        
        for (const doc of snapshot.docs) {
            const exam = doc.data();
            
            // Check if student can access this exam
            if (exam.isClassSpecific && exam.assignedClasses) {
                const hasAccess = exam.assignedClasses.some(classId => studentClasses.includes(classId));
                if (!hasAccess) continue; // Skip this exam
            }
            
            const hasSubmitted = userSubmissions.has(doc.id);
            const submission = userSubmissions.get(doc.id);
            
            allExams.push({
                id: doc.id,
                data: exam,
                hasSubmitted,
                submission
            });
        }
        
        displayExams(allExams);
        
    } catch (error) {
        console.error('Error loading exams:', error);
    }
}

function displayExams(exams) {
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
                <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px; color: #1e293b;">No exams found</h3>
                <p>Check back later for new exams</p>
            </div>
        `;
        return;
    }
    
    examList.innerHTML = '';
    exams.forEach(exam => {
        const examCard = createExamCard(exam.id, exam.data, exam.hasSubmitted, exam.submission);
        examList.appendChild(examCard);
    });
}

function clearStudentFilters() {
    document.getElementById('examStatusFilter').value = '';
    document.getElementById('examSearch').value = '';
    displayExams(allExams);
}

function clearSearch() {
    document.getElementById('examSearch').value = '';
    filterExams();
}

function createExamCard(examId, exam, hasSubmitted, submission = null) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    
    const now = new Date();
    const startTime = exam.startTime ? exam.startTime.toDate() : null;
    const endTime = exam.endTime ? exam.endTime.toDate() : null;
    
    let status = 'draft';
    let statusText = 'Draft';
    let statusClass = 'status-draft';
    
    if (hasSubmitted) {
        status = 'completed';
        statusText = 'Completed';
        statusClass = 'status-ended';
    } else if (startTime && endTime) {
        if (now < startTime) {
            status = 'upcoming';
            statusText = 'Upcoming';
            statusClass = 'status-draft';
        } else if (now >= startTime && now <= endTime) {
            status = 'live';
            statusText = 'LIVE';
            statusClass = 'status-live';
        } else if (now > endTime) {
            status = 'expired';
            statusText = 'Expired';
            statusClass = 'status-ended';
        }
    }
    
    const canTakeExam = status === 'live' && !hasSubmitted;
    
    card.innerHTML = `
        <div class="exam-header">
            <div>
                <div class="exam-title">Exam Title: ${exam.title}</div>
                <div class="exam-subject">Subject: ${exam.subject}</div>
                ${exam.isClassSpecific ? '<div style="color: #667eea; font-size: 12px; font-weight: 500; margin-top: 4px;"><i class="fas fa-users"></i> Class Assignment</div>' : '<div style="color: #64748b; font-size: 12px; margin-top: 4px;"><i class="fas fa-globe"></i> All Students</div>'}
            </div>
            <div class="exam-status ${statusClass}">${statusText}</div>
        </div>
        
        <div class="exam-description">
            <p><i class="fas fa-info-circle"></i> ${exam.instructions || 'No specific instructions provided for this exam.'}</p>
        </div>
        
        <div class="exam-meta">
            <div class="meta-item">
                <i class="fas fa-clock meta-icon"></i>
                <span><strong>Duration:</strong> ${exam.duration} minutes</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-alt meta-icon"></i>
                <span><strong>Start:</strong><br>${startTime ? startTime.toLocaleDateString() + '<br>' + startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Not set'}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-check meta-icon"></i>
                <span><strong>End:</strong><br>${endTime ? endTime.toLocaleDateString() + '<br>' + endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Not set'}</span>
            </div>
            ${hasSubmitted && submission ? `
            <div class="meta-item score-item">
                <i class="fas fa-chart-line meta-icon"></i>
                <span><strong>Your Score:</strong> ${submission.score}/${submission.total} (${submission.percentage}%)</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-stopwatch meta-icon"></i>
                <span><strong>Time Spent:</strong> ${submission.timeSpent ? Math.round(submission.timeSpent / 60) : 0} minutes</span>
            </div>
            ` : ''}
        </div>
        
        <div class="exam-actions">
            ${hasSubmitted ? 
                `<button class="btn btn-success" disabled><i class="fas fa-check"></i> Completed</button>
                 <button class="btn btn-outline btn-sm" onclick="viewResult('${examId}')"><i class="fas fa-eye"></i> View Result</button>` :
                canTakeExam ?
                    `<button class="btn btn-primary btn-lg" onclick="startExam('${examId}')"><i class="fas fa-play"></i> Start Exam</button>` :
                    status === 'upcoming' ?
                        `<button class="btn btn-outline" disabled><i class="fas fa-clock"></i> Starts ${startTime.toLocaleString()}</button>` :
                        `<button class="btn btn-outline" disabled><i class="fas fa-times"></i> ${statusText}</button>`
            }
        </div>
    `;
    
    return card;
}

let currentExamToStart = null;

function startExam(examId) {
    currentExamToStart = examId;
    document.getElementById('startExamModal').classList.remove('hidden');
}

function hideStartExamModal() {
    document.getElementById('startExamModal').classList.add('hidden');
    currentExamToStart = null;
}

function confirmStartExam() {
    if (currentExamToStart) {
        window.location.href = `take-exam.html?examId=${currentExamToStart}`;
    }
}

function viewResult(examId) {
    showStudentResult(examId);
}

// Navigation functions
function showDashboard() {
    document.querySelector('.dashboard-stats').style.display = 'grid';
    document.querySelector('.dashboard-section').style.display = 'block';
    hideOtherSections();
    updateActiveNav('Dashboard');
}

function showAvailableExams() {
    document.querySelector('.dashboard-stats').style.display = 'none';
    document.querySelector('.dashboard-section').style.display = 'block';
    hideOtherSections();
    updateActiveNav('Available Exams');
}

function showMyResults() {
    hideAllSections();
    updateActiveNav('My Results');
    
    let resultsView = document.getElementById('myResultsView');
    if (!resultsView) {
        resultsView = document.createElement('div');
        resultsView.id = 'myResultsView';
        resultsView.className = 'dashboard-section';
        resultsView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-chart-line"></i> My Results</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div id="myResultsContainer">Loading results...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(resultsView);
    }
    
    resultsView.style.display = 'block';
    loadMyResults();
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
                            <div class="profile-avatar" id="profileAvatar">S</div>
                            <div class="profile-info">
                                <h3 id="profileName">Loading...</h3>
                                <p id="profileEmail">Loading...</p>
                                <p style="margin: 4px 0; font-size: 14px; color: #667eea; font-weight: 500;">Student ID: <span id="studentId">Loading...</span></p>
                                <span class="profile-role"><i class="fas fa-user-graduate"></i> Student</span>
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
                        <h3><i class="fas fa-chart-bar"></i> My Performance</h3>
                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value" id="profileCompleted">0</div>
                                <div class="stat-label">Exams Completed</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value" id="profileAverage">0%</div>
                                <div class="stat-label">Average Score</div>
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
    
    // Add language selector to profile
    if (typeof languageManager !== 'undefined') {
        setTimeout(() => {
            languageManager.addLanguageSelectorToProfile();
        }, 100);
    }
}

async function loadProfileData() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        if (userData) {
            document.getElementById('profileName').textContent = userData.name;
            document.getElementById('profileEmail').textContent = userData.email;
            document.getElementById('studentId').textContent = currentUser.uid.substring(0, 8).toUpperCase();
            document.getElementById('profileAvatar').textContent = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
            document.getElementById('updateName').value = userData.name;
            document.getElementById('updateEmail').value = userData.email;
            
            if (userData.createdAt) {
                document.getElementById('profileJoined').textContent = userData.createdAt.toDate().toLocaleDateString();
            }
        }
        
        // Load student stats
        document.getElementById('profileCompleted').textContent = userSubmissions.size;
        
        let totalScore = 0;
        userSubmissions.forEach(submission => {
            totalScore += parseFloat(submission.percentage);
        });
        const averageScore = userSubmissions.size > 0 ? (totalScore / userSubmissions.size).toFixed(1) : 0;
        document.getElementById('profileAverage').textContent = averageScore + '%';
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function hideAllSections() {
    document.querySelector('.dashboard-stats').style.display = 'none';
    document.querySelector('.dashboard-section').style.display = 'none';
    hideOtherSections();
}

function hideOtherSections() {
    const resultsView = document.getElementById('myResultsView');
    if (resultsView) resultsView.style.display = 'none';
    const profileView = document.getElementById('profileView');
    if (profileView) profileView.style.display = 'none';
    const leaderboardView = document.getElementById('leaderboardView');
    if (leaderboardView) leaderboardView.style.display = 'none';
    const studentResultView = document.getElementById('studentResultView');
    if (studentResultView) studentResultView.style.display = 'none';
    const myTranscriptView = document.getElementById('myTranscriptView');
    if (myTranscriptView) myTranscriptView.style.display = 'none';
    const myClassesView = document.getElementById('myClassesView');
    if (myClassesView) myClassesView.style.display = 'none';
    const joinClassView = document.getElementById('joinClassView');
    if (joinClassView) joinClassView.style.display = 'none';
}

function updateActiveNav(activeItem) {
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.textContent.includes(activeItem)) {
            link.classList.add('active');
        }
    });
}

async function loadMyResults() {
    const container = document.getElementById('myResultsContainer');
    
    if (userSubmissions.size === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #64748b;">
                <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3 style="margin-bottom: 8px; color: #1e293b;">No results yet</h3>
                <p>Complete some exams to see your results here</p>
            </div>
        `;
        return;
    }
    
    try {
        let resultsHTML = '<div class="results-grid" style="display: grid; gap: 16px;">';
        
        for (const [examId, submission] of userSubmissions) {
            const examDoc = await db.collection('exams').doc(examId).get();
            const exam = examDoc.data();
            
            const percentage = parseFloat(submission.percentage);
            const gradeColor = percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#ef4444';
            
            resultsHTML += `
                <div class="result-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div>
                            <h4 style="margin: 0; color: #1e293b; font-size: 18px;">${exam.title}</h4>
                            <p style="margin: 4px 0 8px 0; color: #667eea; font-weight: 600;"><i class="fas fa-book"></i> ${exam.subject}</p>
                            <p style="margin: 0; color: #64748b; font-size: 14px;"><i class="fas fa-calendar-alt"></i> ${submission.submittedAt ? submission.submittedAt.toDate().toLocaleDateString() : 'Unknown'}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 28px; font-weight: 700; color: ${gradeColor};">${submission.percentage}%</div>
                            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px;">${submission.score}/${submission.total} points</div>
                            <button class="btn btn-outline btn-sm" onclick="viewResult('${examId}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        resultsHTML += '</div>';
        container.innerHTML = resultsHTML;
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading results. Please refresh the page.</p>';
    }
}

// Filter and search functions
function filterExams() {
    const statusFilter = document.getElementById('examStatusFilter').value;
    const searchTerm = document.getElementById('examSearch').value.toLowerCase();
    
    let filteredExams = allExams;
    
    if (statusFilter) {
        filteredExams = filteredExams.filter(exam => {
            const now = new Date();
            const startTime = exam.data.startTime ? exam.data.startTime.toDate() : null;
            const endTime = exam.data.endTime ? exam.data.endTime.toDate() : null;
            
            if (statusFilter === 'completed') {
                return exam.hasSubmitted;
            } else if (statusFilter === 'available') {
                return !exam.hasSubmitted && (!startTime || now >= startTime) && (!endTime || now <= endTime);
            } else if (statusFilter === 'upcoming') {
                return startTime && now < startTime;
            }
            return true;
        });
    }
    
    if (searchTerm) {
        filteredExams = filteredExams.filter(exam => 
            exam.data.title.toLowerCase().includes(searchTerm) ||
            exam.data.subject.toLowerCase().includes(searchTerm)
        );
    }
    
    displayExams(filteredExams);
}

function searchExams() {
    filterExams();
}

function refreshExams() {
    showNotification('Refreshing exams...', 'info');
    loadDashboardData();
}

function refreshStudentLeaderboard() {
    showNotification('Refreshing leaderboard...', 'info');
    loadStudentLeaderboard();
}

let allStudentLeaderboardData = [];

function filterStudentLeaderboard() {
    const searchTerm = document.getElementById('studentLeaderboardSearch')?.value.toLowerCase() || '';
    const container = document.getElementById('leaderboardContainer');
    
    if (!searchTerm) {
        displayStudentLeaderboardData(allStudentLeaderboardData);
        return;
    }
    
    const filteredData = allStudentLeaderboardData.map(exam => ({
        ...exam,
        students: exam.students.filter(student => 
            student.name.toLowerCase().includes(searchTerm) ||
            (student.email && student.email.toLowerCase().includes(searchTerm)) ||
            student.score.toFixed(1).includes(searchTerm)
        )
    })).filter(exam => exam.students.length > 0);
    
    displayStudentLeaderboardData(filteredData);
}

function clearStudentLeaderboardFilters() {
    document.getElementById('leaderboardExamFilter').value = '';
    document.getElementById('leaderboardClassFilter').value = '';
    document.getElementById('leaderboardTypeFilter').value = 'all';
    const searchInput = document.getElementById('studentLeaderboardSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    loadStudentLeaderboard();
}

function displayStudentLeaderboardData(examResults) {
    const container = document.getElementById('leaderboardContainer');
    
    if (examResults.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3>No data available</h3>
            </div>
        `;
        return;
    }
    
    const rankIcons = ['<i class="fas fa-trophy" style="color: #ffd700;"></i>', '<i class="fas fa-medal" style="color: #c0c0c0;"></i>', '<i class="fas fa-award" style="color: #cd7f32;"></i>'];
    
    let leaderboardHTML = '';
    examResults.forEach(exam => {
        if (exam.students.length > 0) {
            const classIndicator = exam.classSpecific ? '<i class="fas fa-users" style="color: #667eea; margin-left: 8px;" title="Class-specific ranking"></i>' : '';
            leaderboardHTML += `
                <div style="margin-bottom: 32px;">
                    <h3 style="color: #1e293b; margin-bottom: 8px; display: flex; align-items: center;">
                        ${exam.title} - ${exam.subject}${classIndicator}
                    </h3>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">
                        ${exam.classSpecific ? `Showing ${exam.students.length} classmates` : `Showing ${exam.students.length} students`}
                    </p>
                    <div class="leaderboard-table">
                        <div class="leaderboard-header">
                            <div>Rank</div><div>Student</div><div>Score</div>
                        </div>
                        ${exam.students.map((student, index) => {
                            const rank = index < 3 ? rankIcons[index] : `#${index + 1}`;
                            const highlight = student.isCurrentUser ? 'style="background: #f0f4ff; border: 2px solid #667eea;"' : '';
                            return `
                                <div class="leaderboard-row" ${highlight}>
                                    <div>${rank}</div>
                                    <div>${student.name}${student.isCurrentUser ? ' (You)' : ''}</div>
                                    <div>${student.score.toFixed(1)}%</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = leaderboardHTML;
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
            document.getElementById('studentName').textContent = name;
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

function hideLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

function confirmLogout() {
    hideLogoutModal();
    auth.signOut().then(() => {
        localStorage.removeItem('userRole');
        window.location.href = 'index.html';
    });
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
                <div class="filter-controls" style="margin-bottom: 24px;">
                    <div class="filter-group">
                        <label class="filter-label">View Type</label>
                        <select id="leaderboardTypeFilter" class="filter-select" onchange="loadStudentLeaderboard()">
                            <option value="all">All Students</option>
                            <option value="class">My Classes Only</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Filter by Class</label>
                        <select id="leaderboardClassFilter" class="filter-select" onchange="loadStudentLeaderboard()">
                            <option value="">All Classes</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Filter by Exam</label>
                        <select id="leaderboardExamFilter" class="filter-select" onchange="loadStudentLeaderboard()">
                            <option value="">All Exams</option>
                        </select>
                    </div>
                    <div class="search-container">
                        <label class="filter-label">Search Students</label>
                        <input type="text" id="studentLeaderboardSearch" class="search-input" placeholder="Search by name, email or score..." onkeyup="filterStudentLeaderboard()">
                    </div>
                    <div class="filter-actions">
                        <button class="btn btn-outline btn-xs" onclick="refreshStudentLeaderboard()"><i class="fas fa-sync-alt"></i> Refresh</button>
                        <button class="btn btn-outline btn-xs" onclick="clearStudentLeaderboardFilters()"><i class="fas fa-times"></i> Clear</button>
                    </div>
                </div>
                <div id="leaderboardContainer">Loading...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(leaderboardView);
    }
    
    leaderboardView.style.display = 'block';
    loadStudentLeaderboard();
}

async function loadStudentLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    const examFilter = document.getElementById('leaderboardExamFilter');
    const classFilter = document.getElementById('leaderboardClassFilter');
    const typeFilter = document.getElementById('leaderboardTypeFilter');
    
    try {
        // Get student's classes
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const studentClasses = userData.classes || [];
        
        // Load class filter options
        if (classFilter && studentClasses.length > 0) {
            const currentClassValue = classFilter.value;
            classFilter.innerHTML = '<option value="">All Classes</option>';
            
            for (const classId of studentClasses) {
                const classDoc = await db.collection('classes').doc(classId).get();
                if (classDoc.exists) {
                    const classData = classDoc.data();
                    classFilter.innerHTML += `<option value="${classId}">${classData.name} - ${classData.subject}</option>`;
                }
            }
            classFilter.value = currentClassValue;
        }
        
        const examSnapshot = await db.collection('exams')
            .where('published', '==', true)
            .get();
        
        if (examFilter) {
            const currentValue = examFilter.value;
            examFilter.innerHTML = '<option value="">All Exams</option>';
            examSnapshot.forEach(doc => {
                const exam = doc.data();
                examFilter.innerHTML += `<option value="${doc.id}">${exam.title} - ${exam.subject}</option>`;
            });
            examFilter.value = currentValue;
        }
        
        const selectedExamId = examFilter?.value || '';
        const selectedClassId = classFilter?.value || '';
        const viewType = typeFilter?.value || 'all';
        const examResults = [];
        
        for (const examDoc of examSnapshot.docs) {
            if (selectedExamId && examDoc.id !== selectedExamId) continue;
            
            const exam = examDoc.data();
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id).collection('students').get();
            
            const examStudents = [];
            
            for (const submissionDoc of submissionSnapshot.docs) {
                const studentId = submissionDoc.id;
                const submission = submissionDoc.data();
                
                const studentUserDoc = await db.collection('users').doc(studentId).get();
                const studentUserData = studentUserDoc.data();
                const studentUserClasses = studentUserData?.classes || [];
                
                // Filter by view type and class
                if (viewType === 'class') {
                    // Only show students from my classes
                    const hasCommonClass = studentClasses.some(classId => studentUserClasses.includes(classId));
                    if (!hasCommonClass && studentId !== currentUser.uid) continue;
                }
                
                if (selectedClassId) {
                    // Filter by specific class
                    if (!studentUserClasses.includes(selectedClassId)) continue;
                }
                
                const score = await calculateScore(examDoc.id, submission.answers);
                const percentage = score.total > 0 ? (score.scored / score.total) * 100 : 0;
                
                examStudents.push({
                    name: studentUserData?.name || 'Unknown',
                    email: studentUserData?.email || '',
                    score: percentage,
                    isCurrentUser: studentId === currentUser.uid,
                    classes: studentUserClasses
                });
            }
            
            examStudents.sort((a, b) => b.score - a.score);
            examResults.push({
                title: exam.title,
                subject: exam.subject,
                students: examStudents,
                classSpecific: selectedClassId || viewType === 'class'
            });
        }
        
        if (examResults.length === 0 || examResults.every(exam => exam.students.length === 0)) {
            const message = viewType === 'class' ? 'No classmates found in leaderboard' : 'No data available';
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3>${message}</h3>
                    ${viewType === 'class' ? '<p>Complete exams with your classmates to see rankings</p>' : ''}
                </div>
            `;
            return;
        }
        
        allStudentLeaderboardData = examResults;
        displayStudentLeaderboardData(examResults);
        
    } catch (error) {
        console.error('Student leaderboard error:', error);
        container.innerHTML = '<p style="color: #ef4444;">Error loading leaderboard. Please refresh.</p>';
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

function showStudentResult(examId) {
    hideAllSections();
    updateActiveNav('Result');
    
    let resultView = document.getElementById('studentResultView');
    if (!resultView) {
        resultView = document.createElement('div');
        resultView.id = 'studentResultView';
        resultView.className = 'dashboard-section';
        resultView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-chart-line"></i> My Result</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div id="studentResultContainer">Loading result...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(resultView);
    }
    
    resultView.style.display = 'block';
    loadStudentResult(examId);
}

async function loadStudentResult(examId) {
    const container = document.getElementById('studentResultContainer');
    
    try {
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        
        const submissionDoc = await db.collection('submissions')
            .doc(examId).collection('students').doc(currentUser.uid).get();
        
        if (!submissionDoc.exists) {
            container.innerHTML = '<p>No submission found.</p>';
            return;
        }
        
        const submission = submissionDoc.data();
        const score = await calculateScore(examId, submission.answers);
        const percentage = score.total > 0 ? ((score.scored / score.total) * 100).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="result-summary" style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 24px;">${exam.title}</h3>
                    <p style="margin: 0 0 16px 0; color: #667eea; font-weight: 600; font-size: 16px;"><i class="fas fa-book"></i> ${exam.subject}</p>
                    <p style="margin: 0; color: #64748b;"><i class="fas fa-calendar-alt"></i> Submitted: ${submission.submittedAt ? submission.submittedAt.toDate().toLocaleString() : 'Unknown'}</p>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 32px; font-weight: 700; color: ${percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#ef4444'};">${percentage}%</div>
                        <div style="color: #64748b;">Final Score</div>
                    </div>
                    <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b;">${score.scored}/${score.total}</div>
                        <div style="color: #64748b;">Points Earned</div>
                    </div>
                    <div class="stat-item" style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 32px; font-weight: 700; color: #1e293b;">${exam.duration}</div>
                        <div style="color: #64748b;">Duration (Minutes)</div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading student result:', error);
        container.innerHTML = `<p style="color: #ef4444;">Error loading result: ${error.message}</p>`;
    }
}

function showMyClasses() {
    hideAllSections();
    updateActiveNav('My Classes');
    
    let classesView = document.getElementById('myClassesView');
    if (!classesView) {
        classesView = document.createElement('div');
        classesView.id = 'myClassesView';
        classesView.className = 'dashboard-section';
        classesView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-chalkboard"></i> My Classes</h2>
                <button class="btn btn-primary" onclick="showJoinClass()">
                    <i class="fas fa-plus"></i> Join Class
                </button>
            </div>
            <div class="section-content">
                <div id="studentClassesContainer">Loading classes...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(classesView);
    }
    
    classesView.style.display = 'block';
    loadStudentClasses();
}

function showJoinClass() {
    hideAllSections();
    updateActiveNav('Join Class');
    
    let joinView = document.getElementById('joinClassView');
    if (!joinView) {
        joinView = document.createElement('div');
        joinView.id = 'joinClassView';
        joinView.className = 'dashboard-section';
        joinView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-plus-circle"></i> Join Class</h2>
                <button class="btn btn-outline" onclick="showMyClasses()"><i class="fas fa-arrow-left"></i> Back to Classes</button>
            </div>
            <div class="section-content">
                <div style="max-width: 500px; margin: 0 auto; text-align: center;">
                    <div style="background: white; padding: 40px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <i class="fas fa-key" style="font-size: 48px; color: #667eea; margin-bottom: 24px;"></i>
                        <h3 style="margin: 0 0 16px 0; color: #1e293b;">Enter Class Code</h3>
                        <p style="color: #64748b; margin-bottom: 24px;">Ask your teacher for the 6-character class code</p>
                        
                        <form id="joinClassForm">
                            <div class="form-group" style="margin-bottom: 24px;">
                                <input type="text" id="classCode" placeholder="Enter class code" 
                                       style="width: 100%; padding: 16px; font-size: 18px; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;" 
                                       maxlength="6" required>
                            </div>
                            <button type="submit" class="btn btn-primary btn-lg" style="width: 100%;">
                                <i class="fas fa-sign-in-alt"></i> Join Class
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(joinView);
    }
    
    joinView.style.display = 'block';
}

async function loadStudentClasses() {
    const container = document.getElementById('studentClassesContainer');
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        const studentClasses = userData.classes || [];
        
        if (studentClasses.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="fas fa-chalkboard" style="font-size: 48px; margin-bottom: 16px;"></i>
                    <h3 style="margin-bottom: 8px; color: #1e293b;">No classes joined yet</h3>
                    <p>Join your first class using a class code from your teacher</p>
                </div>
            `;
            return;
        }
        
        const classPromises = studentClasses.map(classId => 
            db.collection('classes').doc(classId).get()
        );
        const classDocs = await Promise.all(classPromises);
        
        container.innerHTML = `
            <div class="classes-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
                ${classDocs.map(doc => {
                    if (!doc.exists) return '';
                    const classData = doc.data();
                    return `
                        <div class="class-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                            <div style="margin-bottom: 16px;">
                                <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">${classData.name}</h3>
                                <p style="margin: 0 0 8px 0; color: #667eea; font-weight: 600;">${classData.subject}</p>
                                <p style="margin: 0; color: #64748b; font-size: 14px;">${classData.description || 'No description'}</p>
                            </div>
                            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="color: #64748b; font-size: 14px;"><i class="fas fa-users"></i> ${classData.studentCount || 0} students</span>
                                    <span style="color: #64748b; font-size: 14px;"><i class="fas fa-calendar"></i> Joined</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-primary btn-sm" onclick="viewClassExams('${doc.id}')">
                                    <i class="fas fa-clipboard-list"></i> View Exams
                                </button>
                                <button class="btn btn-danger btn-sm" onclick="leaveClass('${doc.id}')">
                                    <i class="fas fa-sign-out-alt"></i> Leave
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading classes. Please refresh.</p>';
    }
}

// Join class form handler
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'joinClassForm') {
        e.preventDefault();
        
        const classCode = document.getElementById('classCode').value.toUpperCase();
        
        try {
            const classSnapshot = await db.collection('classes')
                .where('classCode', '==', classCode)
                .where('isActive', '==', true)
                .get();
            
            if (classSnapshot.empty) {
                showNotification('Invalid class code. Please check and try again.', 'error');
                return;
            }
            
            const classDoc = classSnapshot.docs[0];
            const classId = classDoc.id;
            
            // Check if already joined
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data();
            const currentClasses = userData.classes || [];
            
            if (currentClasses.includes(classId)) {
                showNotification('You are already in this class!', 'error');
                return;
            }
            
            // Add student to class
            await db.collection('users').doc(currentUser.uid).update({
                classes: firebase.firestore.FieldValue.arrayUnion(classId)
            });
            
            // Update class student count
            await db.collection('classes').doc(classId).update({
                studentCount: firebase.firestore.FieldValue.increment(1)
            });
            
            showNotification('Successfully joined class!');
            showMyClasses();
            
        } catch (error) {
            showNotification('Error joining class: ' + error.message, 'error');
        }
    }
});

function viewClassExams(classId) {
    showNotification('Class-specific exams feature coming soon!', 'info');
}

function leaveClass(classId) {
    if (confirm('Are you sure you want to leave this class?')) {
        db.collection('users').doc(currentUser.uid).update({
            classes: firebase.firestore.FieldValue.arrayRemove(classId)
        })
        .then(() => {
            db.collection('classes').doc(classId).update({
                studentCount: firebase.firestore.FieldValue.increment(-1)
            });
            showNotification('Left class successfully!');
            loadStudentClasses();
        })
        .catch(error => {
            showNotification('Error leaving class: ' + error.message, 'error');
        });
    }
}

function showMyTranscript() {
    hideAllSections();
    updateActiveNav('My Transcript');
    
    let transcriptView = document.getElementById('myTranscriptView');
    if (!transcriptView) {
        transcriptView = document.createElement('div');
        transcriptView.id = 'myTranscriptView';
        transcriptView.className = 'dashboard-section';
        transcriptView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-graduation-cap"></i> My Official Transcript</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div class="transcript-options" style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 16px 0;">Generate Your Official Transcript</h3>
                    <p style="color: #64748b; margin-bottom: 20px;">Select which exams to include in your official academic transcript</p>
                    
                    <div id="studentExamSelection" style="margin-bottom: 20px;">
                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                            <button class="btn btn-outline btn-sm" onclick="selectAllStudentExams()">Select All</button>
                            <button class="btn btn-outline btn-sm" onclick="deselectAllStudentExams()">Deselect All</button>
                        </div>
                        <div id="studentExamCheckboxes" style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;"></div>
                    </div>
                    
                    <button class="btn btn-primary btn-lg" onclick="generateMyTranscript()" id="generateMyTranscriptBtn">
                        <i class="fas fa-file-alt"></i> Generate My Official Transcript
                    </button>
                </div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(transcriptView);
    }
    
    transcriptView.style.display = 'block';
    loadMyExamsForTranscript();
}

async function loadMyExamsForTranscript() {
    const container = document.getElementById('studentExamCheckboxes');
    
    try {
        const myExams = [];
        
        for (const [examId, submission] of userSubmissions) {
            const examDoc = await db.collection('exams').doc(examId).get();
            if (examDoc.exists) {
                const exam = examDoc.data();
                myExams.push({
                    id: examId,
                    title: exam.title,
                    subject: exam.subject,
                    date: submission.submittedAt ? submission.submittedAt.toDate() : null,
                    percentage: parseFloat(submission.percentage)
                });
            }
        }
        
        if (myExams.length === 0) {
            container.innerHTML = '<p style="color: #64748b; text-align: center; padding: 20px;">No completed exams found. Complete some exams first.</p>';
            document.getElementById('generateMyTranscriptBtn').disabled = true;
            return;
        }
        
        myExams.sort((a, b) => (b.date || new Date(0)) - (a.date || new Date(0)));
        
        container.innerHTML = myExams.map(exam => `
            <div style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                <input type="checkbox" id="myExam_${exam.id}" value="${exam.id}" checked style="margin-right: 12px;">
                <div style="flex: 1;">
                    <div style="font-weight: 500; color: #1e293b;">${exam.title}</div>
                    <div style="font-size: 14px; color: #64748b;">${exam.subject} • ${exam.date ? exam.date.toLocaleDateString() : 'No date'}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: ${exam.percentage >= 70 ? '#16a34a' : exam.percentage >= 50 ? '#d97706' : '#ef4444'};">${exam.percentage.toFixed(1)}%</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading exams. Please refresh.</p>';
    }
}

function selectAllStudentExams() {
    document.querySelectorAll('#studentExamCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function deselectAllStudentExams() {
    document.querySelectorAll('#studentExamCheckboxes input[type="checkbox"]').forEach(cb => cb.checked = false);
}

async function generateMyTranscript() {
    const selectedExams = Array.from(document.querySelectorAll('#studentExamCheckboxes input[type="checkbox"]:checked')).map(cb => cb.value);
    
    if (selectedExams.length === 0) {
        showNotification('Please select at least one exam', 'error');
        return;
    }
    
    try {
        showNotification('Generating your official transcript...', 'info');
        
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userData = userDoc.data();
        
        const studentResults = [];
        const subjectSummary = {};
        
        for (const examId of selectedExams) {
            const submission = userSubmissions.get(examId);
            const examDoc = await db.collection('exams').doc(examId).get();
            
            if (examDoc.exists && submission) {
                const exam = examDoc.data();
                const percentage = parseFloat(submission.percentage);
                
                studentResults.push({
                    title: exam.title,
                    subject: exam.subject,
                    date: submission.submittedAt ? submission.submittedAt.toDate() : null,
                    score: submission.score,
                    total: submission.total,
                    percentage: percentage,
                    timeSpent: submission.timeSpent ? Math.round(submission.timeSpent / 60) : 0
                });
                
                if (!subjectSummary[exam.subject]) {
                    subjectSummary[exam.subject] = { totalScore: 0, totalMax: 0, count: 0, exams: [] };
                }
                subjectSummary[exam.subject].totalScore += submission.score;
                subjectSummary[exam.subject].totalMax += submission.total;
                subjectSummary[exam.subject].count += 1;
                subjectSummary[exam.subject].exams.push({ title: exam.title, percentage });
            }
        }
        
        await generateStudentOfficialTranscript(userData, studentResults, subjectSummary, currentUser.uid);
        
    } catch (error) {
        showNotification('Error generating transcript: ' + error.message, 'error');
    }
}

function generateVerificationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function storeVerificationCode(code, student, exams) {
    try {
        await db.collection('verificationCodes').doc(code).set({
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            exams: exams.map(exam => ({
                title: exam.title,
                subject: exam.subject,
                score: exam.score,
                total: exam.total,
                percentage: exam.percentage,
                date: exam.date
            })),
            generatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            generatedBy: currentUser.uid
        });
    } catch (error) {
        console.error('Error storing verification code:', error);
    }
}

async function generateStudentOfficialTranscript(userData, studentResults, subjectSummary, studentId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    const overallScore = studentResults.reduce((sum, r) => sum + r.score, 0);
    const overallMax = studentResults.reduce((sum, r) => sum + r.total, 0);
    const overallPercentage = overallMax > 0 ? ((overallScore / overallMax) * 100) : 0;
    
    // Generate and store verification code first
    const verificationCode = generateVerificationCode();
    await storeVerificationCode(verificationCode, { id: studentId, name: userData?.name, email: userData?.email }, studentResults);
    
    // Header
    doc.setFillColor(25, 46, 94);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('ONLINE EXAM PORTAL', 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL ACADEMIC TRANSCRIPT', 105, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Academic Year 2024-2025', 105, 38, { align: 'center' });
    
    // Student Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('STUDENT INFORMATION', 20, 60);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 62, 190, 62);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${userData?.name || 'Unknown'}`, 20, 72);
    doc.text(`Email: ${userData?.email || 'Unknown'}`, 20, 80);
    doc.text(`Student ID: ${studentId.substring(0, 8).toUpperCase()}`, 20, 88);
    doc.text(`Issue Date: ${new Date().toLocaleDateString()}`, 120, 72);
    doc.text(`Total Exams: ${studentResults.length}`, 120, 80);
    doc.text(`Overall Average: ${overallPercentage.toFixed(1)}%`, 120, 88);
    
    // Academic Record
    let yPos = 110;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ACADEMIC RECORD', 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 15;
    
    // Table headers
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Exam Title', 20, yPos);
    doc.text('Subject', 80, yPos);
    doc.text('Date', 120, yPos);
    doc.text('Score', 150, yPos);
    doc.text('Grade', 175, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    // Exam details
    doc.setFont('helvetica', 'normal');
    studentResults.forEach(result => {
        if (yPos > 250) {
            doc.addPage();
            yPos = 30;
        }
        
        const grade = result.percentage >= 90 ? 'A+' : result.percentage >= 80 ? 'A' : result.percentage >= 70 ? 'B' : result.percentage >= 60 ? 'C' : result.percentage >= 50 ? 'D' : 'F';
        
        doc.text(result.title.substring(0, 25), 20, yPos);
        doc.text(result.subject.substring(0, 15), 80, yPos);
        doc.text(result.date ? result.date.toLocaleDateString() : 'N/A', 120, yPos);
        doc.text(`${result.score}/${result.total}`, 150, yPos);
        doc.text(grade, 175, yPos);
        yPos += 8;
    });
    
    // Subject Summary
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SUBJECT SUMMARY', 20, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Subject', 20, yPos);
    doc.text('Exams', 80, yPos);
    doc.text('Average', 120, yPos);
    doc.text('Grade', 160, yPos);
    doc.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    doc.setFont('helvetica', 'normal');
    Object.entries(subjectSummary).forEach(([subject, data]) => {
        const avg = (data.totalScore / data.totalMax) * 100;
        const grade = avg >= 90 ? 'A+' : avg >= 80 ? 'A' : avg >= 70 ? 'B' : avg >= 60 ? 'C' : avg >= 50 ? 'D' : 'F';
        
        doc.text(subject, 20, yPos);
        doc.text(data.count.toString(), 80, yPos);
        doc.text(`${avg.toFixed(1)}%`, 120, yPos);
        doc.text(grade, 160, yPos);
        yPos += 8;
    });
    
    // Footer with verification
    doc.setFontSize(10);
    doc.text(`Verification Code: ${verificationCode}`, 20, 285);
    doc.text('This is an official document generated by Online Exam Portal', 20, 290);
    
    doc.save(`${userData?.name || 'Student'}_Official_Transcript.pdf`);
    showNotification(`Your official transcript has been generated! Verification code: ${verificationCode}`);
}

// Close sidebar when clicking nav links on mobile
document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });
});

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const startExamModal = document.getElementById('startExamModal');
    const deleteModal = document.getElementById('deleteModal');
    const logoutModal = document.getElementById('logoutModal');
    
    if (e.target === startExamModal) {
        hideStartExamModal();
    } else if (e.target === deleteModal) {
        hideDeleteModal();
    } else if (e.target === logoutModal) {
        hideLogoutModal();
    }
});