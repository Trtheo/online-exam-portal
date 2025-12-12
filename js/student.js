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
                <div class="exam-title">${exam.title}</div>
                <div class="exam-subject"><i class="fas fa-book"></i> ${exam.subject}</div>
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
                <span><strong>Start:</strong> ${startTime ? startTime.toLocaleString() : 'Not set'}</span>
            </div>
            <div class="meta-item">
                <i class="fas fa-calendar-check meta-icon"></i>
                <span><strong>End:</strong> ${endTime ? endTime.toLocaleString() : 'Not set'}</span>
            </div>
            ${hasSubmitted && submission ? `
            <div class="meta-item score-item">
                <i class="fas fa-chart-line meta-icon"></i>
                <span><strong>Your Score:</strong> ${submission.score}/${submission.total} (${submission.percentage}%)</span>
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
    const studentResultView = document.getElementById('studentResultView');
    if (studentResultView) studentResultView.style.display = 'none';
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
            leaderboardHTML += `
                <div style="margin-bottom: 32px;">
                    <h3 style="color: #1e293b; margin-bottom: 16px;">${exam.title} - ${exam.subject}</h3>
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
    
    try {
        const examSnapshot = await db.collection('exams')
            .where('published', '==', true)
            .get();
        
        if (examFilter) {
            examFilter.innerHTML = '<option value="">All Exams</option>';
            examSnapshot.forEach(doc => {
                const exam = doc.data();
                examFilter.innerHTML += `<option value="${doc.id}">${exam.title} - ${exam.subject}</option>`;
            });
        }
        
        const selectedExamId = examFilter?.value || '';
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
                
                const userDoc = await db.collection('users').doc(studentId).get();
                const userData = userDoc.data();
                
                const score = await calculateScore(examDoc.id, submission.answers);
                const percentage = score.total > 0 ? (score.scored / score.total) * 100 : 0;
                
                examStudents.push({
                    name: userData?.name || 'Unknown',
                    email: userData?.email || '',
                    score: percentage,
                    isCurrentUser: studentId === currentUser.uid
                });
            }
            
            examStudents.sort((a, b) => b.score - a.score);
            examResults.push({
                title: exam.title,
                subject: exam.subject,
                students: examStudents
            });
        }
        
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
                leaderboardHTML += `
                    <div style="margin-bottom: 32px;">
                        <h3 style="color: #1e293b; margin-bottom: 16px;">${exam.title} - ${exam.subject}</h3>
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