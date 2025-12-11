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
                    percentage: score.total > 0 ? ((score.scored / score.total) * 100).toFixed(1) : 0
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
        const snapshot = await db.collection('exams')
            .where('published', '==', true)
            .get();
        
        allExams = [];
        
        for (const doc of snapshot.docs) {
            const exam = doc.data();
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
    
    let status = 'available';
    let statusText = 'Available';
    let statusClass = 'status-published';
    
    if (hasSubmitted) {
        status = 'completed';
        statusText = 'Completed';
        statusClass = 'status-ended';
    } else if (startTime && now < startTime) {
        status = 'upcoming';
        statusText = 'Upcoming';
        statusClass = 'status-draft';
    } else if (endTime && now > endTime) {
        status = 'expired';
        statusText = 'Expired';
        statusClass = 'status-ended';
    }
    
    const canTakeExam = status === 'available' && !hasSubmitted;
    
    card.innerHTML = `
        <div class="exam-header">
            <div>
                <div class="exam-title">${exam.title}</div>
                <div class="exam-subject"><i class="fas fa-book"></i> ${exam.subject}</div>
            </div>
            <div class="exam-status ${statusClass}">${statusText}</div>
        </div>
        <div class="exam-meta">
            <div class="meta-item">
                <i class="fas fa-clock meta-icon"></i>
                <span>${exam.duration} minutes</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-alt meta-icon"></i>
                <span>${startTime ? startTime.toLocaleDateString() : 'Not set'}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-check meta-icon"></i>
                <span>${endTime ? endTime.toLocaleDateString() : 'Not set'}</span>
            </div>
            ${hasSubmitted && submission ? `
            <div class="meta-item">
                <i class="fas fa-chart-line meta-icon"></i>
                <span>Score: ${submission.score}/${submission.total} (${submission.percentage}%)</span>
            </div>
            ` : `
            <div class="meta-item">
                <i class="fas fa-info-circle meta-icon"></i>
                <span>${exam.instructions ? 'Has instructions' : 'No instructions'}</span>
            </div>
            `}
        </div>
        <div class="exam-actions">
            ${hasSubmitted ? 
                `<button class="btn btn-success" disabled><i class="fas fa-check"></i> Completed</button>
                 <button class="btn btn-outline btn-sm" onclick="viewResult('${examId}')"><i class="fas fa-eye"></i> View Result</button>` :
                canTakeExam ?
                    `<button class="btn btn-primary" onclick="startExam('${examId}')"><i class="fas fa-play"></i> Start Exam</button>` :
                    `<button class="btn btn-outline" disabled><i class="fas fa-clock"></i> ${statusText}</button>`
            }
        </div>
    `;
    
    return card;
}

function startExam(examId) {
    if (confirm('Are you sure you want to start this exam? You cannot pause or restart once you begin.')) {
        window.location.href = `take-exam.html?examId=${examId}`;
    }
}

function viewResult(examId) {
    window.location.href = `view-results.html?examId=${examId}&student=true`;
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
                            <h4 style="margin: 0; color: #1e293b;">${exam.title}</h4>
                            <p style="margin: 4px 0 0 0; color: #64748b;">${exam.subject}</p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 24px; font-weight: 700; color: ${gradeColor};">${submission.percentage}%</div>
                            <div style="font-size: 14px; color: #64748b;">${submission.score}/${submission.total}</div>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #64748b; font-size: 14px;">
                            <i class="fas fa-calendar-alt"></i> ${submission.submittedAt ? submission.submittedAt.toDate().toLocaleDateString() : 'Unknown'}
                        </span>
                        <button class="btn btn-outline btn-sm" onclick="viewResult('${examId}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
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
    
    try {
        const examSnapshot = await db.collection('exams')
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
                        isCurrentUser: studentId === currentUser.uid
                    });
                }
                
                const student = studentsMap.get(studentId);
                const questionsSnapshot = await db.collection('exams').doc(examDoc.id)
                    .collection('questions').get();
                
                let scored = 0, total = 0;
                questionsSnapshot.forEach(qDoc => {
                    const question = qDoc.data();
                    total += question.marks;
                    const answer = submission.answers[qDoc.id];
                    if (answer !== undefined) {
                        if (question.type === 'mcq' && parseInt(answer) === question.correctAnswer) {
                            scored += question.marks;
                        } else if (question.type === 'tf' && answer === question.correctAnswer.toString()) {
                            scored += question.marks;
                        }
                    }
                });
                
                const percentage = total > 0 ? (scored / total) * 100 : 0;
                student.totalScore += percentage;
                student.totalExams += 1;
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
                    <div>Rank</div><div>Student</div><div>Score</div><div>Exams</div>
                </div>
                ${students.map((student, index) => {
                    const rank = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    const highlight = student.isCurrentUser ? 'style="background: #f0f4ff; border: 2px solid #667eea;"' : '';
                    return `
                        <div class="leaderboard-row" ${highlight}>
                            <div>${rank}</div>
                            <div>${student.name}${student.isCurrentUser ? ' (You)' : ''}</div>
                            <div>${student.averageScore.toFixed(1)}%</div>
                            <div>${student.totalExams}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (error) {
        container.innerHTML = '<p style="color: #ef4444;">Error loading leaderboard.</p>';
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