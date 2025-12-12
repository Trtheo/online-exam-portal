// Teacher dashboard functionality
let currentUser = null;
let allExams = [];

// Set default datetime values and add real-time end time calculation
document.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60000);
    
    const startInput = document.getElementById('examStartTime');
    const endInput = document.getElementById('examEndTime');
    const durationInput = document.getElementById('examDuration');
    
    if (startInput) {
        startInput.value = now.toISOString().slice(0, 16);
    }
    if (endInput) {
        endInput.value = oneHourLater.toISOString().slice(0, 16);
    }
    
    // Auto-calculate end time when duration or start time changes
    function updateEndTime() {
        const startTime = startInput?.value;
        const duration = parseInt(durationInput?.value) || 60;
        
        if (startTime && endInput) {
            const start = new Date(startTime);
            const end = new Date(start.getTime() + duration * 60 * 1000);
            endInput.value = end.toISOString().slice(0, 16);
        }
    }
    
    if (startInput) startInput.addEventListener('change', updateEndTime);
    if (durationInput) durationInput.addEventListener('input', updateEndTime);
    
    // Also add listeners for edit form
    const editStartInput = document.getElementById('editExamStartTime');
    const editEndInput = document.getElementById('editExamEndTime');
    const editDurationInput = document.getElementById('editExamDuration');
    
    function updateEditEndTime() {
        const startTime = editStartInput?.value;
        const duration = parseInt(editDurationInput?.value);
        
        if (startTime && duration && editEndInput) {
            const start = new Date(startTime);
            const end = new Date(start.getTime() + duration * 60 * 1000);
            editEndInput.value = end.toISOString().slice(0, 16);
        }
    }
    
    if (editStartInput) editStartInput.addEventListener('change', updateEditEndTime);
    if (editDurationInput) editDurationInput.addEventListener('input', updateEditEndTime);
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

let instructionsEditor = null;
let examQuestions = [];
let questionCounter = 0;

function showCreateExam() {
    hideAllSections();
    document.getElementById('createExamSection').classList.remove('hidden');
    updateActiveNav('Create Exam');
    
    // Initialize rich text editor for instructions
    setTimeout(() => {
        if (!instructionsEditor) {
            instructionsEditor = new Quill('#instructionsEditor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }]
                    ]
                },
                placeholder: 'Enter exam instructions for students...'
            });
        }
        
        // Attach form handler if not already attached
        const examForm = document.getElementById('examForm');
        if (examForm && !examForm.hasAttribute('data-handler-attached')) {
            examForm.addEventListener('submit', handleExamSubmission);
            examForm.setAttribute('data-handler-attached', 'true');
        }
        
        // Re-attach event listeners for dynamic end time calculation
        const startInput = document.getElementById('examStartTime');
        const durationInput = document.getElementById('examDuration');
        const endInput = document.getElementById('examEndTime');
        
        function updateEndTime() {
            const startTime = startInput?.value;
            const duration = parseInt(durationInput?.value) || 60;
            
            if (startTime && endInput) {
                const start = new Date(startTime);
                const end = new Date(start.getTime() + duration * 60 * 1000);
                endInput.value = end.toISOString().slice(0, 16);
            }
        }
        
        if (startInput && !startInput.hasAttribute('data-listener-attached')) {
            startInput.addEventListener('change', updateEndTime);
            startInput.setAttribute('data-listener-attached', 'true');
        }
        if (durationInput && !durationInput.hasAttribute('data-listener-attached')) {
            durationInput.addEventListener('input', updateEndTime);
            durationInput.setAttribute('data-listener-attached', 'true');
        }
    }, 100);
}

function hideCreateExam() {
    document.getElementById('createExamSection').classList.add('hidden');
    document.getElementById('examForm').reset();
    examQuestions = [];
    questionCounter = 0;
    updateQuestionsList();
    showDashboard();
}

function showExamList() {
    hideAllSections();
    document.getElementById('examsSection').style.display = 'block';
    updateActiveNav('My Exams');
    loadExams();
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
                <div class="filter-controls" style="margin-bottom: 24px;">
                    <div class="filter-group">
                        <label class="filter-label">Filter by Exam</label>
                        <select id="examFilter" class="filter-select" onchange="filterStudentsByExam()">
                            <option value="">All Exams</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Performance</label>
                        <select id="performanceFilter" class="filter-select" onchange="filterStudentsByPerformance()">
                            <option value="">All Students</option>
                            <option value="high">High Performers (≥70%)</option>
                            <option value="medium">Average Performers (50-69%)</option>
                            <option value="low">Needs Improvement (<50%)</option>
                        </select>
                    </div>
                    <div class="search-container">
                        <label class="filter-label">Search Students</label>
                        <input type="text" id="studentSearch" class="search-input" placeholder="Search by name or email..." onkeyup="searchStudents()">
                        <button class="clear-search" onclick="clearStudentSearch()" title="Clear search">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="filter-actions">
                        <button class="btn btn-outline btn-xs" onclick="refreshStudents()"><i class="fas fa-sync-alt"></i> Refresh</button>
                        <button class="btn btn-outline btn-xs" onclick="clearStudentFilters()"><i class="fas fa-times"></i> Clear</button>
                    </div>
                </div>
                <div class="results-count" id="studentResultsCount">Loading students...</div>
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
    const createExamSection = document.getElementById('createExamSection');
    if (createExamSection) createExamSection.classList.add('hidden');
    const resultsView = document.getElementById('allResultsView');
    if (resultsView) resultsView.style.display = 'none';
    const studentView = document.getElementById('studentManagementView');
    if (studentView) studentView.style.display = 'none';
    const studentDetailView = document.getElementById('studentDetailView');
    if (studentDetailView) studentDetailView.style.display = 'none';
    const profileView = document.getElementById('profileView');
    if (profileView) profileView.style.display = 'none';
    const examResultsView = document.getElementById('examResultsView');
    if (examResultsView) examResultsView.style.display = 'none';
    const leaderboardView = document.getElementById('leaderboardView');
    if (leaderboardView) leaderboardView.style.display = 'none';
    const examsSection = document.getElementById('examsSection');
    if (examsSection) examsSection.style.display = 'none';
}

let allStudents = [];

async function loadStudentManagement() {
    const container = document.getElementById('studentsContainer');
    const examFilter = document.getElementById('examFilter');
    
    try {
        container.innerHTML = '<div style="text-align: center; padding: 40px;">Loading students...</div>';
        
        // Load exams and submissions in parallel
        const [examSnapshot, allSubmissions] = await Promise.all([
            db.collection('exams').where('createdBy', '==', currentUser.uid).get(),
            Promise.all((await db.collection('exams').where('createdBy', '==', currentUser.uid).get()).docs.map(async examDoc => {
                const submissions = await db.collection('submissions').doc(examDoc.id).collection('students').get();
                return { examId: examDoc.id, exam: examDoc.data(), submissions: submissions.docs };
            }))
        ]);
        
        // Populate exam filter
        examFilter.innerHTML = '<option value="">All Exams</option>' + 
            examSnapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().title} - ${doc.data().subject}</option>`).join('');
        
        // Get all unique student IDs first
        const studentIds = new Set();
        allSubmissions.forEach(({ submissions }) => {
            submissions.forEach(doc => studentIds.add(doc.id));
        });
        
        // Batch load all user data
        const userDocs = await Promise.all(
            Array.from(studentIds).map(id => db.collection('users').doc(id).get())
        );
        const userData = new Map();
        userDocs.forEach(doc => {
            if (doc.exists) userData.set(doc.id, doc.data());
        });
        
        // Process students data
        const studentsMap = new Map();
        
        for (const { examId, exam, submissions } of allSubmissions) {
            for (const submissionDoc of submissions) {
                const studentId = submissionDoc.id;
                const submission = submissionDoc.data();
                const user = userData.get(studentId);
                
                if (!studentsMap.has(studentId)) {
                    studentsMap.set(studentId, {
                        id: studentId,
                        name: user?.name || 'Unknown',
                        email: user?.email || 'Unknown',
                        joinedAt: user?.createdAt,
                        exams: [],
                        totalScore: 0,
                        totalExams: 0,
                        averageScore: 0
                    });
                }
                
                const score = await calculateInlineScore(examId, submission.answers);
                const percentage = score.total > 0 ? ((score.scored / score.total) * 100) : 0;
                
                const student = studentsMap.get(studentId);
                student.exams.push({
                    examId,
                    examTitle: exam.title,
                    examSubject: exam.subject,
                    score: score.scored,
                    total: score.total,
                    percentage: percentage.toFixed(1),
                    submittedAt: submission.submittedAt,
                    timeSpent: submission.timeSpent || 0,
                    suspiciousActivity: submission.suspiciousActivity?.length || 0
                });
                
                student.totalScore += percentage;
                student.totalExams += 1;
                student.averageScore = (student.totalScore / student.totalExams).toFixed(1);
            }
        }
        
        allStudents = Array.from(studentsMap.values()).sort((a, b) => b.averageScore - a.averageScore);
        displayStudents(allStudents);
        
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
        <div class="student-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div class="stat-card">
                <div class="stat-icon students"><i class="fas fa-users"></i></div>
                <div class="stat-number">${students.length}</div>
                <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon average"><i class="fas fa-chart-line"></i></div>
                <div class="stat-number">${students.length > 0 ? (students.reduce((sum, s) => sum + parseFloat(s.averageScore), 0) / students.length).toFixed(1) : 0}%</div>
                <div class="stat-label">Class Average</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon exams"><i class="fas fa-trophy"></i></div>
                <div class="stat-number">${students.filter(s => parseFloat(s.averageScore) >= 70).length}</div>
                <div class="stat-label">High Performers</div>
            </div>
        </div>
        <div class="students-grid" style="display: grid; gap: 20px;">
            ${students.map((student, index) => `
                <div class="student-card" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; transition: all 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.transform=''; this.style.boxShadow=''">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 16px;">
                                    ${student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                                <div>
                                    <h4 style="margin: 0; color: #1e293b; font-size: 18px;">${student.name}</h4>
                                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 14px;">${student.email}</p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                                <span style="background: #f0f4ff; color: #667eea; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                                    Rank #${index + 1}
                                </span>
                                <span style="background: ${parseFloat(student.averageScore) >= 70 ? '#dcfce7' : parseFloat(student.averageScore) >= 50 ? '#fef3c7' : '#fee2e2'}; color: ${parseFloat(student.averageScore) >= 70 ? '#166534' : parseFloat(student.averageScore) >= 50 ? '#92400e' : '#991b1b'}; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                                    ${student.averageScore}% avg
                                </span>
                                <span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500;">
                                    ${student.exams.length} exam${student.exams.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="viewStudentDetails('${student.id}')" style="margin-left: 12px;">
                            <i class="fas fa-eye"></i> Details
                        </button>
                    </div>
                    
                    <div class="student-exams" style="max-height: 250px; overflow-y: auto; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                        ${student.exams.map(exam => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f8fafc;">
                                <div style="flex: 1;">
                                    <div style="font-size: 14px; color: #1e293b; font-weight: 500; margin-bottom: 2px;">${exam.examTitle}</div>
                                    <div style="font-size: 12px; color: #64748b;">${exam.examSubject} • ${exam.submittedAt ? exam.submittedAt.toDate().toLocaleDateString() : 'Unknown'}</div>
                                    ${exam.suspiciousActivity > 0 ? `<div style="font-size: 11px; color: #ef4444; margin-top: 2px;"><i class="fas fa-exclamation-triangle"></i> ${exam.suspiciousActivity} flag${exam.suspiciousActivity !== 1 ? 's' : ''}</div>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: ${exam.percentage >= 70 ? '#16a34a' : exam.percentage >= 50 ? '#d97706' : '#ef4444'}; font-size: 16px;">
                                        ${exam.percentage}%
                                    </div>
                                    <div style="font-size: 12px; color: #64748b;">${exam.score}/${exam.total}</div>
                                    <button class="btn btn-outline btn-sm" onclick="manageStudentExam('${exam.examId}', '${student.id}')" style="margin-top: 4px; font-size: 11px;">
                                        <i class="fas fa-cog"></i> Manage
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function filterStudentsByExam() {
    applyStudentFilters();
}

function filterStudentsByPerformance() {
    applyStudentFilters();
}

function searchStudents() {
    applyStudentFilters();
}

function applyStudentFilters() {
    const examFilter = document.getElementById('examFilter')?.value || '';
    const performanceFilter = document.getElementById('performanceFilter')?.value || '';
    const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
    
    let filteredStudents = [...allStudents];
    
    // Filter by exam
    if (examFilter) {
        filteredStudents = filteredStudents.filter(student => 
            student.exams.some(exam => exam.examId === examFilter)
        );
    }
    
    // Filter by performance
    if (performanceFilter) {
        filteredStudents = filteredStudents.filter(student => {
            const avg = parseFloat(student.averageScore);
            if (performanceFilter === 'high') return avg >= 70;
            if (performanceFilter === 'medium') return avg >= 50 && avg < 70;
            if (performanceFilter === 'low') return avg < 50;
            return true;
        });
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredStudents = filteredStudents.filter(student => 
            student.name.toLowerCase().includes(searchTerm) ||
            student.email.toLowerCase().includes(searchTerm)
        );
    }
    
    // Update results count
    const resultsCount = document.getElementById('studentResultsCount');
    if (resultsCount) {
        if (filteredStudents.length === allStudents.length) {
            resultsCount.textContent = `Showing all ${filteredStudents.length} students`;
        } else {
            resultsCount.textContent = `Showing ${filteredStudents.length} of ${allStudents.length} students`;
        }
    }
    
    displayStudents(filteredStudents);
}

function clearStudentSearch() {
    document.getElementById('studentSearch').value = '';
    applyStudentFilters();
}

function clearStudentFilters() {
    document.getElementById('examFilter').value = '';
    document.getElementById('performanceFilter').value = '';
    document.getElementById('studentSearch').value = '';
    applyStudentFilters();
}

function refreshStudents() {
    showNotification('Refreshing students...', 'info');
    loadStudentManagement();
}

function refreshAllResults() {
    showNotification('Refreshing results...', 'info');
    loadAllResultsInline();
}

function viewStudentDetails(studentId) {
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;
    
    hideAllSections();
    updateActiveNav('Student Details');
    
    let detailView = document.getElementById('studentDetailView');
    if (!detailView) {
        detailView = document.createElement('div');
        detailView.id = 'studentDetailView';
        detailView.className = 'dashboard-section';
        document.querySelector('.dashboard').appendChild(detailView);
    }
    
    detailView.innerHTML = `
        <div class="section-header">
            <h2 class="section-title"><i class="fas fa-user"></i> ${student.name} - Student Details</h2>
            <button class="btn btn-outline" onclick="showStudentManagement()"><i class="fas fa-arrow-left"></i> Back to Students</button>
        </div>
        <div class="section-content">
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px;">
                <div class="student-profile" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0; height: fit-content;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 32px; margin: 0 auto 16px;">
                            ${student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <h3 style="margin: 0 0 8px 0; color: #1e293b;">${student.name}</h3>
                        <p style="margin: 0 0 16px 0; color: #64748b;">${student.email}</p>
                        <span style="background: #f0f4ff; color: #667eea; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
                            Student
                        </span>
                    </div>
                    
                    <div class="student-stats" style="display: grid; gap: 16px;">
                        <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: 700; color: ${parseFloat(student.averageScore) >= 70 ? '#16a34a' : parseFloat(student.averageScore) >= 50 ? '#d97706' : '#ef4444'};">${student.averageScore}%</div>
                            <div style="color: #64748b; font-size: 14px;">Average Score</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: 700; color: #1e293b;">${student.exams.length}</div>
                            <div style="color: #64748b; font-size: 14px;">Exams Taken</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: 700; color: #1e293b;">${student.exams.filter(e => e.suspiciousActivity > 0).length}</div>
                            <div style="color: #64748b; font-size: 14px;">Flagged Exams</div>
                        </div>
                    </div>
                </div>
                
                <div class="exam-history" style="background: white; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h3 style="margin: 0 0 20px 0; color: #1e293b;"><i class="fas fa-history"></i> Exam History</h3>
                    <div style="max-height: 500px; overflow-y: auto;">
                        ${student.exams.map(exam => `
                            <div style="padding: 16px; border: 1px solid #f1f5f9; border-radius: 8px; margin-bottom: 12px;">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                    <div>
                                        <h4 style="margin: 0 0 4px 0; color: #1e293b; font-size: 16px;">${exam.examTitle}</h4>
                                        <p style="margin: 0 0 8px 0; color: #667eea; font-size: 14px; font-weight: 500;">${exam.examSubject}</p>
                                        <p style="margin: 0; color: #64748b; font-size: 13px;">
                                            <i class="fas fa-calendar-alt"></i> ${exam.submittedAt ? exam.submittedAt.toDate().toLocaleDateString() : 'Unknown'}
                                            ${exam.timeSpent ? ` • <i class="fas fa-clock"></i> ${Math.round(exam.timeSpent / 60)} min` : ''}
                                        </p>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 24px; font-weight: 700; color: ${exam.percentage >= 70 ? '#16a34a' : exam.percentage >= 50 ? '#d97706' : '#ef4444'};">
                                            ${exam.percentage}%
                                        </div>
                                        <div style="font-size: 14px; color: #64748b;">${exam.score}/${exam.total} points</div>
                                    </div>
                                </div>
                                ${exam.suspiciousActivity > 0 ? `
                                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 8px; margin-top: 8px;">
                                        <div style="color: #ef4444; font-size: 12px; font-weight: 500;">
                                            <i class="fas fa-exclamation-triangle"></i> ${exam.suspiciousActivity} suspicious activit${exam.suspiciousActivity !== 1 ? 'ies' : 'y'} detected
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    detailView.style.display = 'block';
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
        let shortAnswerTotal = 0;
        
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
                } else if (question.type === 'short') {
                    // Short answers need manual grading - for now, don't count towards auto-score
                    shortAnswerTotal += question.marks;
                }
            }
        });
        
        return { scored, total, shortAnswerTotal };
    } catch (error) {
        return { scored: 0, total: 0, shortAnswerTotal: 0 };
    }
}

async function calculateDetailedScore(examId, answers, manualGrades = {}) {
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
                } else if (question.type === 'short') {
                    // Use manual grade if available
                    const manualGrade = manualGrades?.[doc.id];
                    if (manualGrade !== undefined) {
                        scored += parseFloat(manualGrade) || 0;
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

// Bulk import file handler
document.addEventListener('DOMContentLoaded', () => {
    const bulkImportFile = document.getElementById('bulkImportFile');
    if (bulkImportFile) {
        bulkImportFile.addEventListener('change', handleBulkImport);
    }
});

let importedQuestions = [];

async function handleBulkImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    
    try {
        let questions = [];
        
        if (fileName.endsWith('.pdf') || fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            questions = await processDocumentWithAI(file);
        } else if (fileName.endsWith('.json')) {
            const text = await readFileAsText(file);
            questions = JSON.parse(text);
        } else if (fileName.endsWith('.csv')) {
            const text = await readFileAsText(file);
            questions = parseCSV(text);
        }
        
        if (questions.length > 0) {
            importedQuestions = questions;
            showQuestionEditor(questions);
        }
    } catch (error) {
        showNotification('Error processing file: ' + error.message, 'error');
        hideAIProcessing();
    }
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

async function processDocumentWithAI(file) {
    showAIProcessing();
    
    // Convert file to base64 for AI processing
    const base64 = await fileToBase64(file);
    
    // Simulate AI processing with intelligent text extraction
    const extractedText = await extractTextFromDocument(file);
    const questions = await analyzeTextForQuestions(extractedText);
    
    hideAIProcessing();
    return questions;
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function extractTextFromDocument(file) {
    // For PDF files, use PDF.js or similar library
    if (file.name.toLowerCase().endsWith('.pdf')) {
        return await extractPDFText(file);
    }
    
    // For Word files, extract text content
    if (file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx')) {
        return await extractWordText(file);
    }
    
    return '';
}

async function extractPDFText(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        return fullText;
    } catch (error) {
        console.error('PDF extraction error:', error);
        return 'Error extracting PDF text';
    }
}

async function extractWordText(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({arrayBuffer});
        return result.value;
    } catch (error) {
        console.error('Word extraction error:', error);
        return 'Error extracting Word text';
    }
}

async function analyzeTextForQuestions(text) {
    const questions = [];
    const blocks = text.split(/\n\s*\n/).filter(block => block.trim());
    
    for (const block of blocks) {
        const lines = block.split('\n').map(line => line.trim()).filter(line => line);
        
        // Find question line (starts with number)
        const questionLine = lines.find(line => /^\d+\./.test(line));
        if (!questionLine) continue;
        
        const questionText = questionLine.replace(/^\d+\.\s*/, '');
        
        // Check if it's True/False question
        if (block.toLowerCase().includes('true/false')) {
            const correctAnswer = block.toLowerCase().includes('correct answer: true') ? 0 : 1;
            questions.push({
                question: questionText,
                options: ["True", "False"],
                correctAnswer: correctAnswer,
                marks: 1,
                confidence: 95
            });
            continue;
        }
        
        // Extract multiple choice options
        const options = [];
        let correctAnswer = 0;
        
        for (const line of lines) {
            const optionMatch = line.match(/^([a-d])\)\s*(.+)$/i);
            if (optionMatch) {
                options.push(optionMatch[2]);
            }
        }
        
        // Find correct answer
        const correctAnswerLine = lines.find(line => line.toLowerCase().includes('correct answer:'));
        if (correctAnswerLine) {
            const answerMatch = correctAnswerLine.match(/correct answer:\s*([a-d])/i);
            if (answerMatch) {
                correctAnswer = answerMatch[1].toLowerCase().charCodeAt(0) - 97; // a=0, b=1, c=2, d=3
            }
        }
        
        // Only add if we have valid options
        if (options.length >= 2) {
            questions.push({
                question: questionText,
                options: options.length === 4 ? options : [...options, "Option C", "Option D"].slice(0, 4),
                correctAnswer: correctAnswer,
                marks: 1,
                confidence: options.length === 4 ? 95 : 80
            });
        }
    }
    
    return questions.length > 0 ? questions : [{
        question: "No questions found in document",
        options: ["Please check document format", "Option B", "Option C", "Option D"],
        correctAnswer: 0,
        marks: 1,
        confidence: 30
    }];
}

function calculateConfidence(question, options) {
    let confidence = 60; // Base confidence
    
    if (question.includes('?')) confidence += 20;
    if (options.length === 4) confidence += 15;
    if (options.every(opt => opt.length > 2)) confidence += 5;
    
    return Math.min(confidence, 100);
}

function showAIProcessing() {
    document.getElementById('aiProcessing').classList.remove('hidden');
    document.getElementById('importPreview').classList.add('hidden');
}

function hideAIProcessing() {
    document.getElementById('aiProcessing').classList.add('hidden');
}

function showQuestionEditor(questions) {
    const preview = document.getElementById('importPreview');
    preview.classList.remove('hidden');
    
    preview.innerHTML = `
        <h4><i class="fas fa-robot"></i> AI Extracted ${questions.length} Questions - Review & Approve</h4>
        <div class="questions-editor">
            ${questions.map((q, i) => `
                <div class="question-editor" data-index="${i}">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <strong>Question ${i + 1}</strong>
                        <span class="confidence-badge" style="background: ${q.confidence >= 90 ? '#dcfce7' : q.confidence >= 70 ? '#fef3c7' : '#fee2e2'}; color: ${q.confidence >= 90 ? '#166534' : q.confidence >= 70 ? '#92400e' : '#991b1b'}; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                            ${q.confidence}% confidence
                        </span>
                    </div>
                    <textarea rows="2" onchange="updateQuestion(${i}, 'question', this.value)">${q.question}</textarea>
                    <div class="options-grid">
                        ${q.options.map((opt, j) => `
                            <div class="option-input">
                                <input type="radio" name="correct_${i}" value="${j}" ${j === q.correctAnswer ? 'checked' : ''} onchange="updateQuestion(${i}, 'correctAnswer', ${j})">
                                <input type="text" value="${opt}" onchange="updateQuestionOption(${i}, ${j}, this.value)">
                            </div>
                        `).join('')}
                    </div>
                    <div class="question-actions">
                        <label>Marks: <input type="number" class="marks-input" value="${q.marks}" min="1" onchange="updateQuestion(${i}, 'marks', parseInt(this.value))"></label>
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestion(${i})"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="approve-section">
            <p><i class="fas fa-info-circle"></i> Review the extracted questions above. Edit any incorrect information before approving.</p>
            <div class="approve-actions">
                <button type="button" class="btn btn-success" onclick="approveQuestions()"><i class="fas fa-check"></i> Approve All Questions</button>
                <button type="button" class="btn btn-outline" onclick="clearImport()"><i class="fas fa-times"></i> Cancel Import</button>
            </div>
        </div>
    `;
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const questions = [];
    
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 6) {
            questions.push({
                question: cols[0] || '',
                options: [cols[1] || '', cols[2] || '', cols[3] || '', cols[4] || ''],
                correctAnswer: parseInt(cols[5]) || 0,
                marks: parseInt(cols[6]) || 1
            });
        }
    }
    return questions;
}

function updateQuestion(index, field, value) {
    if (importedQuestions[index]) {
        importedQuestions[index][field] = value;
    }
}

function updateQuestionOption(questionIndex, optionIndex, value) {
    if (importedQuestions[questionIndex] && importedQuestions[questionIndex].options) {
        importedQuestions[questionIndex].options[optionIndex] = value;
    }
}

function removeQuestion(index) {
    if (confirm('Remove this question?')) {
        importedQuestions.splice(index, 1);
        showQuestionEditor(importedQuestions);
    }
}

function approveQuestions() {
    if (importedQuestions.length === 0) {
        showNotification('No questions to approve', 'error');
        return;
    }
    
    // Validate questions
    const invalidQuestions = importedQuestions.filter((q, i) => {
        return !q.question.trim() || q.options.some(opt => !opt.trim()) || q.correctAnswer === undefined;
    });
    
    if (invalidQuestions.length > 0) {
        showNotification('Please fix incomplete questions before approving', 'error');
        return;
    }
    
    showNotification(`${importedQuestions.length} questions approved and ready for import!`, 'success');
    document.getElementById('importPreview').innerHTML = `
        <div style="text-align: center; padding: 20px; background: #dcfce7; border-radius: 8px;">
            <i class="fas fa-check-circle" style="color: #16a34a; font-size: 24px; margin-bottom: 8px;"></i>
            <p style="margin: 0; color: #166534; font-weight: 500;">${importedQuestions.length} questions approved and ready for import</p>
        </div>
    `;
}

function clearImport() {
    importedQuestions = [];
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('bulkImportFile').value = '';
}

// Add question functions
function addQuestion(type) {
    // Check if there are incomplete questions
    const incompleteQuestion = examQuestions.find(q => {
        if (!q.question.trim() || q.question === '<p><br></p>') return true;
        if (q.type === 'mcq' && q.options.some(opt => !opt.trim())) return true;
        if ((q.type === 'mcq' || q.type === 'tf') && (q.correctAnswer === null || q.correctAnswer === undefined)) return true;
        return false;
    });
    
    if (incompleteQuestion) {
        showValidationModal('Please complete the current question before adding a new one.');
        return;
    }
    
    questionCounter++;
    const question = {
        id: 'q' + questionCounter,
        type: type,
        question: '',
        options: type === 'mcq' ? ['', '', '', ''] : null,
        correctAnswer: type === 'mcq' ? 0 : (type === 'tf' ? null : null),
        sampleAnswer: type === 'short' ? '' : null,
        marks: 1
    };
    
    examQuestions.push(question);
    updateQuestionsList();
    
    // Scroll to the new question
    setTimeout(() => {
        const newQuestion = document.querySelector(`[data-id="${question.id}"]`);
        if (newQuestion) {
            newQuestion.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 100);
}

function removeQuestion(questionId) {
    examQuestions = examQuestions.filter(q => q.id !== questionId);
    updateQuestionsList();
}

function updateQuestionsList() {
    const container = document.getElementById('questionsList');
    
    if (examQuestions.length === 0) {
        container.innerHTML = `
            <div class="no-questions">
                <i class="fas fa-question-circle"></i>
                <p>No questions added yet. Click "Add MCQ" or "Add True/False" to start.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = examQuestions.map((q, index) => createQuestionEditor(q, index + 1)).join('');
    
    // Initialize Quill editors for each question
    setTimeout(() => {
        examQuestions.forEach(question => {
            const editorId = `questionEditor_${question.id}`;
            const editorElement = document.getElementById(editorId);
            if (editorElement && !editorElement.classList.contains('ql-container')) {
                const quill = new Quill(`#${editorId}`, {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            ['bold', 'italic', 'underline'],
                            ['link'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }]
                        ]
                    },
                    placeholder: 'Enter your question text...'
                });
                quill.root.innerHTML = question.question;
                quill.on('text-change', () => {
                    updateQuestionText(question.id, quill.root.innerHTML);
                });
            }
        });
    }, 100);
}

function createQuestionEditor(question, number) {
    if (question.type === 'mcq') {
        return `
            <div class="question-editor" data-id="${question.id}">
                <div class="question-header">
                    <h4>Question ${number} - Multiple Choice</h4>
                    <div class="question-controls">
                        <label>Marks: <input type="number" value="${question.marks}" min="1" onchange="updateQuestionMarks('${question.id}', this.value)"></label>
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestion('${question.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="question-content">
                    <label>Question Text</label>
                    <div id="questionEditor_${question.id}" style="height: 120px; border: 1px solid #d1d5db; border-radius: 6px;"></div>
                    <input type="hidden" id="questionText_${question.id}" value="${question.question}">
                    
                    <label>Answer Options</label>
                    <div class="mcq-options">
                        ${question.options.map((opt, i) => `
                            <div class="option-row">
                                <input type="radio" name="correct_${question.id}" value="${i}" ${i === question.correctAnswer ? 'checked' : ''} onchange="updateCorrectAnswer('${question.id}', ${i})">
                                <input type="text" placeholder="Option ${String.fromCharCode(65 + i)}" value="${opt}" onchange="updateQuestionOption('${question.id}', ${i}, this.value)">
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else if (question.type === 'tf') {
        return `
            <div class="question-editor" data-id="${question.id}">
                <div class="question-header">
                    <h4>Question ${number} - True/False</h4>
                    <div class="question-controls">
                        <label>Marks: <input type="number" value="${question.marks}" min="1" onchange="updateQuestionMarks('${question.id}', this.value)"></label>
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestion('${question.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="question-content">
                    <label>Question Text</label>
                    <div id="questionEditor_${question.id}" style="height: 120px; border: 1px solid #d1d5db; border-radius: 6px;"></div>
                    <input type="hidden" id="questionText_${question.id}" value="${question.question}">
                    
                    <label>Correct Answer</label>
                    <div class="tf-options">
                        <label><input type="radio" name="tf_${question.id}" value="true" ${question.correctAnswer === true ? 'checked' : ''} onchange="updateTFAnswer('${question.id}', true)"> True</label>
                        <label><input type="radio" name="tf_${question.id}" value="false" ${question.correctAnswer === false ? 'checked' : ''} onchange="updateTFAnswer('${question.id}', false)"> False</label>
                    </div>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="question-editor" data-id="${question.id}">
                <div class="question-header">
                    <h4>Question ${number} - Short Answer</h4>
                    <div class="question-controls">
                        <label>Marks: <input type="number" value="${question.marks}" min="1" onchange="updateQuestionMarks('${question.id}', this.value)"></label>
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeQuestion('${question.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div class="question-content">
                    <label>Question Text</label>
                    <div id="questionEditor_${question.id}" style="height: 120px; border: 1px solid #d1d5db; border-radius: 6px;"></div>
                    <input type="hidden" id="questionText_${question.id}" value="${question.question}">
                    
                    <label>Sample Answer (for reference)</label>
                    <textarea placeholder="Enter a sample answer or key points..." value="${question.sampleAnswer || ''}" onchange="updateSampleAnswer('${question.id}', this.value)" style="width: 100%; min-height: 80px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;"></textarea>
                </div>
            </div>
        `;
    }
}

function updateQuestionText(questionId, text) {
    const question = examQuestions.find(q => q.id === questionId);
    if (question) question.question = text;
}

function updateQuestionOption(questionId, optionIndex, text) {
    const question = examQuestions.find(q => q.id === questionId);
    if (question && question.options) question.options[optionIndex] = text;
}

function updateCorrectAnswer(questionId, answerIndex) {
    const question = examQuestions.find(q => q.id === questionId);
    if (question) question.correctAnswer = answerIndex;
}

function updateTFAnswer(questionId, answer) {
    const question = examQuestions.find(q => q.id === questionId);
    if (question) question.correctAnswer = answer;
}

function updateSampleAnswer(questionId, answer) {
    const question = examQuestions.find(q => q.id === questionId);
    if (question) question.sampleAnswer = answer;
}

function updateQuestionMarks(questionId, marks) {
    const question = examQuestions.find(q => q.id === questionId);
    if (question) question.marks = parseInt(marks) || 1;
}

// Floating menu functions
function toggleFloatingMenu() {
    const menu = document.getElementById('floatingMenu');
    if (menu.classList.contains('hidden')) {
        showFloatingMenu();
    } else {
        hideFloatingMenu();
    }
}

function showFloatingMenu() {
    document.getElementById('floatingMenu').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('floatingMenu').classList.add('show');
    }, 10);
}

function hideFloatingMenu() {
    document.getElementById('floatingMenu').classList.remove('show');
    setTimeout(() => {
        document.getElementById('floatingMenu').classList.add('hidden');
    }, 300);
}

function selectQuestionType(type) {
    hideFloatingMenu();
    addQuestion(type);
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.floating-question-buttons')) {
        hideFloatingMenu();
    }
});

// Modal functions
function showValidationModal(message) {
    document.getElementById('validationMessage').textContent = message;
    document.getElementById('validationModal').classList.remove('hidden');
}

function hideValidationModal() {
    document.getElementById('validationModal').classList.add('hidden');
}

function showSuccessModal(message) {
    document.getElementById('successMessage').textContent = message;
    document.getElementById('successModal').classList.remove('hidden');
}

function hideSuccessModal() {
    document.getElementById('successModal').classList.add('hidden');
}

// Create exam function
async function createExam() {
    
    if (examQuestions.length === 0) {
        showValidationModal('Please add at least one question');
        return;
    }
    
    // Calculate end time from start time + duration
    const duration = parseInt(document.getElementById('examDuration').value);
    const startTime = new Date(document.getElementById('examStartTime').value);
    const calculatedEndTime = new Date(startTime.getTime() + duration * 60 * 1000);
    
    // Update end time field with calculated value
    document.getElementById('examEndTime').value = calculatedEndTime.toISOString().slice(0, 16);
    
    // Validate questions
    for (let q of examQuestions) {
        if (!q.question.trim()) {
            showValidationModal('Please fill in all question texts');
            return;
        }
        if (q.type === 'mcq' && q.options.some(opt => !opt.trim())) {
            showValidationModal('Please fill in all answer options');
            return;
        }
        if ((q.type === 'mcq' || q.type === 'tf') && (q.correctAnswer === null || q.correctAnswer === undefined)) {
            showValidationModal('Please select correct answers for all MCQ and True/False questions');
            return;
        }
    }
    
    const examData = {
        title: document.getElementById('examTitle').value,
        subject: document.getElementById('examSubject').value,
        duration: duration,
        startTime: startTime,
        endTime: calculatedEndTime,
        instructions: instructionsEditor.root.innerHTML,
        createdBy: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        published: false
    };
    
    try {
        const docRef = await db.collection('exams').add(examData);
        
        // Add questions
        const batch = db.batch();
        examQuestions.forEach(question => {
            const questionRef = db.collection('exams').doc(docRef.id).collection('questions').doc();
            const questionData = {
                questionText: question.question,
                type: question.type,
                marks: question.marks,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (question.type === 'mcq') {
                questionData.options = question.options;
                questionData.correctAnswer = question.correctAnswer;
            } else if (question.type === 'tf') {
                questionData.correctAnswer = question.correctAnswer;
            } else if (question.type === 'short') {
                questionData.sampleAnswer = question.sampleAnswer || '';
            }
            
            batch.set(questionRef, questionData);
        });
        await batch.commit();
        
        showSuccessModal(`Exam created successfully with ${examQuestions.length} questions!`);
        setTimeout(() => {
            hideSuccessModal();
            hideCreateExam();
            loadDashboardData();
        }, 2000);
    } catch (error) {
        showValidationModal('Error creating exam: ' + error.message);
    }
}

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
            <button class="btn btn-outline" onclick="editExam('${examId}')">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn btn-danger" onclick="deleteExam('${examId}')">
                <i class="fas fa-trash"></i> Delete
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
    showExamResults(examId);
}

let currentPublishExamId = null;

function publishExam(examId) {
    currentPublishExamId = examId;
    document.getElementById('publishModal').classList.remove('hidden');
}

function hidePublishModal() {
    document.getElementById('publishModal').classList.add('hidden');
    currentPublishExamId = null;
}

async function confirmPublishExam() {
    if (!currentPublishExamId) return;
    
    try {
        await db.collection('exams').doc(currentPublishExamId).update({
            published: true
        });
        showNotification('Exam published successfully!');
        hidePublishModal();
        loadDashboardData();
    } catch (error) {
        showNotification('Error publishing exam: ' + error.message, 'error');
    }
}

let currentEditExamId = null;

// Edit Exam Functions
async function editExam(examId) {
    try {
        const examDoc = await db.collection('exams').doc(examId).get();
        if (!examDoc.exists) {
            alert('Exam not found');
            return;
        }
        
        const exam = examDoc.data();
        currentEditExamId = examId;
        
        // Populate form
        document.getElementById('editExamTitle').value = exam.title;
        document.getElementById('editExamSubject').value = exam.subject;
        document.getElementById('editExamDuration').value = exam.duration;
        document.getElementById('editExamInstructions').value = exam.instructions || '';
        
        if (exam.startTime) {
            document.getElementById('editExamStartTime').value = exam.startTime.toDate().toISOString().slice(0, 16);
        }
        if (exam.endTime) {
            document.getElementById('editExamEndTime').value = exam.endTime.toDate().toISOString().slice(0, 16);
        }
        
        document.getElementById('editExamModal').classList.remove('hidden');
        
        // Add event listeners for dynamic end time calculation in edit modal
        setTimeout(() => {
            const editStartInput = document.getElementById('editExamStartTime');
            const editDurationInput = document.getElementById('editExamDuration');
            const editEndInput = document.getElementById('editExamEndTime');
            
            function updateEditEndTime() {
                const startTime = editStartInput?.value;
                const duration = parseInt(editDurationInput?.value) || 60;
                
                if (startTime && editEndInput) {
                    const start = new Date(startTime);
                    const end = new Date(start.getTime() + duration * 60 * 1000);
                    editEndInput.value = end.toISOString().slice(0, 16);
                }
            }
            
            if (editStartInput && !editStartInput.hasAttribute('data-edit-listener')) {
                editStartInput.addEventListener('change', updateEditEndTime);
                editStartInput.setAttribute('data-edit-listener', 'true');
            }
            if (editDurationInput && !editDurationInput.hasAttribute('data-edit-listener')) {
                editDurationInput.addEventListener('input', updateEditEndTime);
                editDurationInput.setAttribute('data-edit-listener', 'true');
            }
        }, 100);
    } catch (error) {
        alert('Error loading exam: ' + error.message);
    }
}

function hideEditExam() {
    document.getElementById('editExamModal').classList.add('hidden');
    currentEditExamId = null;
}

// Edit exam form handler
document.addEventListener('submit', async (e) => {
    if (e.target.id === 'editExamForm') {
        e.preventDefault();
        
        if (!currentEditExamId) {
            console.error('No exam ID for editing');
            return;
        }
        
        // Calculate end time from start time + duration
        const duration = parseInt(document.getElementById('editExamDuration').value);
        const startTime = new Date(document.getElementById('editExamStartTime').value);
        const calculatedEndTime = new Date(startTime.getTime() + duration * 60 * 1000);
        
        // Update end time field with calculated value
        document.getElementById('editExamEndTime').value = calculatedEndTime.toISOString().slice(0, 16);
        
        const examData = {
            title: document.getElementById('editExamTitle').value,
            subject: document.getElementById('editExamSubject').value,
            duration: duration,
            startTime: firebase.firestore.Timestamp.fromDate(startTime),
            endTime: firebase.firestore.Timestamp.fromDate(calculatedEndTime),
            instructions: document.getElementById('editExamInstructions').value || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Updating exam with data:', examData);
        
        try {
            await db.collection('exams').doc(currentEditExamId).update(examData);
            console.log('Exam updated successfully in database');
            showNotification('Exam updated successfully!');
            hideEditExam();
            loadDashboardData();
        } catch (error) {
            console.error('Error updating exam:', error);
            showValidationModal('Error updating exam: ' + error.message);
        }
    }
});

// Delete Exam Functions
let currentDeleteExamId = null;

function deleteExam(examId) {
    currentDeleteExamId = examId;
    document.getElementById('deleteConfirmText').value = '';
    document.getElementById('confirmDeleteBtn').disabled = true;
    document.getElementById('deleteExamModal').classList.remove('hidden');
}

function hideDeleteExam() {
    document.getElementById('deleteExamModal').classList.add('hidden');
    currentDeleteExamId = null;
}

// Enable delete button when "DELETE" is typed
document.addEventListener('input', (e) => {
    if (e.target.id === 'deleteConfirmText') {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        confirmBtn.disabled = e.target.value !== 'DELETE';
    }
});

async function confirmDeleteExam() {
    if (!currentDeleteExamId || currentDeleteExamId.trim() === '') {
        alert('Invalid exam ID');
        return;
    }
    
    try {
        console.log('Deleting exam:', currentDeleteExamId);
        
        // Delete questions first
        const questionsSnapshot = await db.collection('exams').doc(currentDeleteExamId)
            .collection('questions').get();
        
        for (const doc of questionsSnapshot.docs) {
            await doc.ref.delete();
        }
        
        // Delete submissions if they exist
        try {
            const submissionsSnapshot = await db.collection('submissions')
                .doc(currentDeleteExamId).collection('students').get();
            
            for (const doc of submissionsSnapshot.docs) {
                await doc.ref.delete();
            }
            
            await db.collection('submissions').doc(currentDeleteExamId).delete();
        } catch (submissionError) {
            console.log('No submissions to delete:', submissionError.message);
        }
        
        // Finally delete the exam
        await db.collection('exams').doc(currentDeleteExamId).delete();
        
        showNotification('Exam deleted successfully!');
        hideDeleteExam();
        loadDashboardData();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting exam: ' + error.message);
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

async function exportResults() {
    try {
        showNotification('Generating styled Excel export...', 'info');
        
        const examSnapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .get();
        
        const teacherName = document.getElementById('teacherName')?.textContent || 'Unknown';
        const wb = XLSX.utils.book_new();
        const data = [];
        
        // Header section with styling
        data.push(['ONLINE EXAM PORTAL - RESULTS EXPORT']);
        data.push([`Generated on: ${new Date().toLocaleString()}`]);
        data.push([`Teacher: ${teacherName}`]);
        data.push([`Total Exams: ${examSnapshot.size}`]);
        data.push([]); // Empty row
        
        // Column headers
        data.push([
            'Exam Title', 'Subject', 'Duration (min)', 'Exam Date', 'Student Name', 
            'Student Email', 'Score', 'Total Points', 'Percentage', 'Grade', 
            'Status', 'Time Spent (min)', 'Submission Date', 'Submission Time', 'Flags'
        ]);
        
        // Data rows
        for (const examDoc of examSnapshot.docs) {
            const exam = examDoc.data();
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id).collection('students').get();
            
            for (const submissionDoc of submissionSnapshot.docs) {
                const submission = submissionDoc.data();
                const userDoc = await db.collection('users').doc(submissionDoc.id).get();
                const userData = userDoc.data();
                
                const score = await calculateInlineScore(examDoc.id, submission.answers);
                const percentage = score.total > 0 ? ((score.scored / score.total) * 100) : 0;
                
                let grade = 'F';
                if (percentage >= 90) grade = 'A+';
                else if (percentage >= 85) grade = 'A';
                else if (percentage >= 80) grade = 'A-';
                else if (percentage >= 75) grade = 'B+';
                else if (percentage >= 70) grade = 'B';
                else if (percentage >= 65) grade = 'B-';
                else if (percentage >= 60) grade = 'C+';
                else if (percentage >= 55) grade = 'C';
                else if (percentage >= 50) grade = 'C-';
                else if (percentage >= 45) grade = 'D';
                
                const status = percentage >= 50 ? 'PASS' : 'FAIL';
                const timeSpent = submission.timeSpent ? Math.round(submission.timeSpent / 60) : 'N/A';
                const submissionDate = submission.submittedAt ? submission.submittedAt.toDate() : null;
                const subDate = submissionDate ? submissionDate.toLocaleDateString() : 'Unknown';
                const subTime = submissionDate ? submissionDate.toLocaleTimeString() : 'Unknown';
                const flags = submission.suspiciousActivity?.length > 0 ? `${submission.suspiciousActivity.length} suspicious activities` : 'None';
                
                data.push([
                    exam.title, exam.subject, exam.duration,
                    exam.startTime ? exam.startTime.toDate().toLocaleDateString() : 'Not set',
                    userData?.name || 'Unknown', userData?.email || 'Unknown',
                    score.scored, score.total, parseFloat(percentage.toFixed(1)),
                    grade, status, timeSpent, subDate, subTime, flags
                ]);
            }
        }
        
        // Summary section
        data.push([]);
        data.push(['SUMMARY STATISTICS']);
        const totalSubmissions = (await Promise.all(
            examSnapshot.docs.map(async doc => {
                const snap = await db.collection('submissions').doc(doc.id).collection('students').get();
                return snap.size;
            })
        )).reduce((sum, count) => sum + count, 0);
        
        data.push([`Total Submissions: ${totalSubmissions}`]);
        data.push([`Export Date: ${new Date().toLocaleString()}`]);
        
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Styling
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Header styling (rows 1-4)
        for (let row = 0; row <= 3; row++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
            if (ws[cellRef]) {
                ws[cellRef].s = {
                    font: { bold: true, sz: row === 0 ? 16 : 12, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "667EEA" } },
                    alignment: { horizontal: "center" }
                };
            }
        }
        
        // Column headers styling (row 6)
        for (let col = 0; col <= 14; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 5, c: col });
            if (ws[cellRef]) {
                ws[cellRef].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4F46E5" } },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { horizontal: "center" }
                };
            }
        }
        
        // Data rows styling with alternating colors
        for (let row = 6; row <= range.e.r; row++) {
            for (let col = 0; col <= 14; col++) {
                const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                if (ws[cellRef]) {
                    const isEvenRow = (row - 6) % 2 === 0;
                    ws[cellRef].s = {
                        fill: { fgColor: { rgb: isEvenRow ? "F8FAFC" : "FFFFFF" } },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        }
                    };
                    
                    // Color-code status and grade columns
                    if (col === 10 && ws[cellRef].v) { // Status column
                        ws[cellRef].s.font = {
                            color: { rgb: ws[cellRef].v === 'PASS' ? "16A34A" : "EF4444" },
                            bold: true
                        };
                    }
                    if (col === 9 && ws[cellRef].v) { // Grade column
                        const grade = ws[cellRef].v;
                        let color = "EF4444"; // F
                        if (grade.startsWith('A')) color = "16A34A";
                        else if (grade.startsWith('B')) color = "2563EB";
                        else if (grade.startsWith('C')) color = "D97706";
                        else if (grade.startsWith('D')) color = "DC2626";
                        
                        ws[cellRef].s.font = { color: { rgb: color }, bold: true };
                    }
                }
            }
        }
        
        // Summary section styling
        const summaryStartRow = range.e.r - 3;
        for (let row = summaryStartRow; row <= range.e.r; row++) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
            if (ws[cellRef]) {
                ws[cellRef].s = {
                    font: { bold: true, sz: row === summaryStartRow ? 14 : 11 },
                    fill: { fgColor: { rgb: "F1F5F9" } }
                };
            }
        }
        
        // Column widths
        ws['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 },
            { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
            { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
        ];
        
        XLSX.utils.book_append_sheet(wb, ws, 'Exam Results');
        XLSX.writeFile(wb, `Exam_Results_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        showNotification('Styled Excel export downloaded successfully!');
    } catch (error) {
        showNotification('Error exporting results: ' + error.message, 'error');
    }
}

async function downloadExamReport(examId) {
    try {
        showNotification('Generating PDF report...', 'info');
        
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        
        const submissionSnapshot = await db.collection('submissions')
            .doc(examId).collection('students').get();
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(102, 126, 234);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('EXAM REPORT', 20, 25);
        
        // Exam Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(exam.title, 20, 55);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Subject: ${exam.subject}`, 20, 65);
        doc.text(`Duration: ${exam.duration} minutes`, 20, 72);
        doc.text(`Date: ${exam.startTime ? exam.startTime.toDate().toLocaleDateString() : 'Not set'}`, 20, 79);
        doc.text(`Total Submissions: ${submissionSnapshot.size}`, 20, 86);
        
        // Statistics
        let totalScore = 0, highPerformers = 0;
        const results = [];
        
        for (const submissionDoc of submissionSnapshot.docs) {
            const submission = submissionDoc.data();
            const userDoc = await db.collection('users').doc(submissionDoc.id).get();
            const userData = userDoc.data();
            
            const score = await calculateInlineScore(examId, submission.answers);
            const percentage = score.total > 0 ? ((score.scored / score.total) * 100) : 0;
            
            totalScore += percentage;
            if (percentage >= 70) highPerformers++;
            
            results.push({
                name: userData?.name || 'Unknown',
                email: userData?.email || 'Unknown',
                score: score.scored,
                total: score.total,
                percentage: percentage.toFixed(1),
                submitted: submission.submittedAt ? submission.submittedAt.toDate().toLocaleDateString() : 'Unknown'
            });
        }
        
        const avgScore = submissionSnapshot.size > 0 ? (totalScore / submissionSnapshot.size).toFixed(1) : 0;
        
        // Stats box
        doc.setFillColor(248, 250, 252);
        doc.rect(20, 95, 170, 25, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, 95, 170, 25);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Class Average: ${avgScore}%`, 25, 105);
        doc.text(`High Performers (>=70%): ${highPerformers}`, 25, 112);
        doc.text(`Pass Rate: ${submissionSnapshot.size > 0 ? ((results.filter(r => parseFloat(r.percentage) >= 50).length / submissionSnapshot.size) * 100).toFixed(1) : 0}%`, 120, 105);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 120, 112);
        
        // Table Header
        doc.setFillColor(102, 126, 234);
        doc.rect(20, 130, 170, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Student Name', 22, 137);
        doc.text('Email', 70, 137);
        doc.text('Score', 130, 137);
        doc.text('%', 150, 137);
        doc.text('Date', 165, 137);
        
        // Table Rows
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        let y = 147;
        
        results.forEach((result, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            
            // Alternate row colors
            if (index % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(20, y - 5, 170, 8, 'F');
            }
            
            doc.setFontSize(8);
            doc.text(result.name.substring(0, 20), 22, y);
            doc.text(result.email.substring(0, 25), 70, y);
            doc.text(`${result.score}/${result.total}`, 130, y);
            
            // Color-coded percentage
            const perc = parseFloat(result.percentage);
            if (perc >= 70) doc.setTextColor(22, 163, 74);
            else if (perc >= 50) doc.setTextColor(217, 119, 6);
            else doc.setTextColor(239, 68, 68);
            
            doc.text(`${result.percentage}%`, 150, y);
            doc.setTextColor(0, 0, 0);
            doc.text(result.submitted, 165, y);
            
            y += 8;
        });
        
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Page ${i} of ${pageCount}`, 180, 290);
            doc.text('Generated by Online Exam Portal', 20, 290);
        }
        
        doc.save(`${exam.title.replace(/[^a-z0-9]/gi, '_')}_report.pdf`);
        showNotification('PDF report downloaded successfully!');
        
    } catch (error) {
        showNotification('Error generating PDF: ' + error.message, 'error');
    }
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
                <div class="filter-controls" style="margin-bottom: 24px;">
                    <div class="filter-group">
                        <label class="filter-label">Filter by Exam</label>
                        <select id="teacherLeaderboardExamFilter" class="filter-select" onchange="loadLeaderboard()">
                            <option value="">All Exams</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Performance</label>
                        <select id="teacherLeaderboardPerformanceFilter" class="filter-select" onchange="displayLeaderboard()">
                            <option value="">All Students</option>
                            <option value="high">High Performers (>=70%)</option>
                            <option value="medium">Average Performers (50-69%)</option>
                            <option value="low">Needs Improvement (<50%)</option>
                        </select>
                    </div>
                    <div class="search-container">
                        <label class="filter-label">Search Students</label>
                        <input type="text" id="leaderboardSearch" class="search-input" placeholder="Search by name, email or score..." onkeyup="displayLeaderboard()">
                    </div>
                    <div class="filter-actions">
                        <button class="btn btn-outline btn-xs" onclick="refreshLeaderboard()"><i class="fas fa-sync-alt"></i> Refresh</button>
                        <button class="btn btn-outline btn-xs" onclick="clearLeaderboardFilters()"><i class="fas fa-times"></i> Clear</button>
                    </div>
                </div>
                <div id="leaderboardContainer">Loading...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(leaderboardView);
    }
    
    leaderboardView.style.display = 'block';
    loadLeaderboard();
}

let allLeaderboardData = [];

async function loadLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    const examFilter = document.getElementById('teacherLeaderboardExamFilter');
    const currentSelection = examFilter?.value || '';
    
    try {
        const examSnapshot = await db.collection('exams')
            .where('createdBy', '==', currentUser.uid)
            .where('published', '==', true)
            .get();
        
        if (examFilter) {
            examFilter.innerHTML = '<option value="">All Exams</option>' + 
                examSnapshot.docs.map(doc => `<option value="${doc.id}">${doc.data().title} - ${doc.data().subject}</option>`).join('');
            
            // Restore previous selection
            if (currentSelection) {
                examFilter.value = currentSelection;
            }
        }
        
        const examResults = [];
        
        for (const examDoc of examSnapshot.docs) {
            const exam = examDoc.data();
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id).collection('students').get();
            
            const examStudents = [];
            
            for (const submissionDoc of submissionSnapshot.docs) {
                const studentId = submissionDoc.id;
                const submission = submissionDoc.data();
                
                const userDoc = await db.collection('users').doc(studentId).get();
                const userData = userDoc.data();
                
                const score = await calculateInlineScore(examDoc.id, submission.answers);
                const percentage = score.total > 0 ? (score.scored / score.total) * 100 : 0;
                
                examStudents.push({
                    name: userData?.name || 'Unknown',
                    email: userData?.email || '',
                    score: percentage,
                    examCount: 1,
                    suspiciousActivity: submission.suspiciousActivity?.length || 0,
                    isCurrentUser: false
                });
            }
            
            examStudents.sort((a, b) => b.score - a.score);
            examResults.push({
                examId: examDoc.id,
                title: exam.title,
                subject: exam.subject,
                students: examStudents
            });
        }
        
        allLeaderboardData = examResults;
        displayLeaderboard();
        
    } catch (error) {
        console.error('Leaderboard error:', error);
        container.innerHTML = '<p style="color: #ef4444;">Error loading leaderboard. Please refresh.</p>';
    }
}

function displayLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    const examFilter = document.getElementById('teacherLeaderboardExamFilter');
    const performanceFilter = document.getElementById('teacherLeaderboardPerformanceFilter');
    const searchTerm = document.getElementById('leaderboardSearch')?.value.toLowerCase() || '';
    
    const selectedExamId = examFilter?.value || '';
    const selectedPerformance = performanceFilter?.value || '';
    
    let filteredData = allLeaderboardData;
    
    // Filter by specific exam if selected
    if (selectedExamId) {
        filteredData = filteredData.filter(exam => exam.examId === selectedExamId);
    }
    
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-trophy" style="font-size: 48px; margin-bottom: 16px;"></i>
                <h3>No data available</h3>
            </div>
        `;
        return;
    }
    
    let leaderboardHTML = '';
    let hasResults = false;
    
    filteredData.forEach(exam => {
        let students = exam.students;
        
        if (searchTerm) {
            students = students.filter(student => 
                student.name.toLowerCase().includes(searchTerm) ||
                (student.email && student.email.toLowerCase().includes(searchTerm)) ||
                student.score.toFixed(1).includes(searchTerm)
            );
        }
        
        if (selectedPerformance) {
            students = students.filter(student => {
                const avg = student.score;
                if (selectedPerformance === 'high') return avg >= 70;
                if (selectedPerformance === 'medium') return avg >= 50 && avg < 70;
                if (selectedPerformance === 'low') return avg < 50;
                return true;
            });
        }
        
        if (students.length > 0) {
            hasResults = true;
            const rankIcons = ['<i class="fas fa-trophy" style="color: #ffd700;"></i>', '<i class="fas fa-medal" style="color: #c0c0c0;"></i>', '<i class="fas fa-award" style="color: #cd7f32;"></i>'];
            
            leaderboardHTML += `
                <div style="margin-bottom: 32px;">
                    <h3 style="color: #1e293b; margin-bottom: 16px;">${exam.title} - ${exam.subject}</h3>
                    <div class="leaderboard-table">
                        <div class="leaderboard-header">
                            <div>Rank</div><div>Student</div><div>Score</div><div>Flags</div>
                        </div>
                        ${students.map((student, index) => {
                            const rank = index < 3 ? rankIcons[index] : `#${index + 1}`;
                            return `
                                <div class="leaderboard-row">
                                    <div>${rank}</div>
                                    <div>${student.name}</div>
                                    <div>${student.score.toFixed(1)}%</div>
                                    <div>${student.suspiciousActivity > 0 ? `<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> ${student.suspiciousActivity}` : '<i class="fas fa-check-circle" style="color: #10b981;"></i>'}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = hasResults ? leaderboardHTML : `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-search" style="font-size: 48px; margin-bottom: 16px;"></i>
            <h3>No results found</h3>
            <p>Try adjusting your search or filters</p>
        </div>
    `;
}

function filterLeaderboard() {
    displayLeaderboard();
}

function refreshLeaderboard() {
    showNotification('Refreshing leaderboard...', 'info');
    loadLeaderboard();
}

function filterLeaderboard() {
    displayLeaderboard();
}

function clearLeaderboardFilters() {
    document.getElementById('teacherLeaderboardExamFilter').value = '';
    document.getElementById('teacherLeaderboardPerformanceFilter').value = '';
    const searchInput = document.getElementById('leaderboardSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    displayLeaderboard();
}

async function gradeSubmission(examId, studentId) {
    try {
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        
        const submissionDoc = await db.collection('submissions')
            .doc(examId).collection('students').doc(studentId).get();
        const submission = submissionDoc.data();
        
        const userDoc = await db.collection('users').doc(studentId).get();
        const userData = userDoc.data();
        
        const questionsSnapshot = await db.collection('exams').doc(examId)
            .collection('questions').get();
        
        let gradingHTML = `
            <div class="grading-header">
                <h3>${exam.title} - ${userData?.name || 'Unknown'}</h3>
                <p>Student: ${userData?.email || 'Unknown'}</p>
            </div>
            <div class="questions-grading">
        `;
        
        questionsSnapshot.forEach(doc => {
            const question = doc.data();
            const studentAnswer = submission.answers[doc.id];
            const currentGrade = submission.manualGrades?.[doc.id] || '';
            
            if (question.type === 'short' && studentAnswer) {
                gradingHTML += `
                    <div class="grade-question">
                        <div class="question-text">${question.questionText}</div>
                        <div class="student-answer">
                            <strong>Student Answer:</strong>
                            <div class="answer-text">${studentAnswer}</div>
                        </div>
                        ${question.sampleAnswer ? `<div class="sample-answer"><strong>Sample Answer:</strong> ${question.sampleAnswer}</div>` : ''}
                        <div class="grade-input">
                            <label>Grade (out of ${question.marks}):</label>
                            <input type="number" id="grade_${doc.id}" value="${currentGrade}" min="0" max="${question.marks}" step="0.5" style="width: 80px;">
                            <span>/ ${question.marks}</span>
                        </div>
                    </div>
                `;
            }
        });
        
        gradingHTML += '</div>';
        
        document.getElementById('gradingContent').innerHTML = gradingHTML;
        document.getElementById('gradingModal').classList.remove('hidden');
        
        // Store current grading context
        window.currentGradingExam = examId;
        window.currentGradingStudent = studentId;
        
    } catch (error) {
        showNotification('Error loading submission: ' + error.message, 'error');
    }
}

function hideGradingModal() {
    document.getElementById('gradingModal').classList.add('hidden');
}

async function saveGrades() {
    try {
        const grades = {};
        const gradeInputs = document.querySelectorAll('[id^="grade_"]');
        
        gradeInputs.forEach(input => {
            const questionId = input.id.replace('grade_', '');
            const grade = parseFloat(input.value) || 0;
            grades[questionId] = grade;
        });
        
        await db.collection('submissions')
            .doc(window.currentGradingExam)
            .collection('students')
            .doc(window.currentGradingStudent)
            .update({ manualGrades: grades });
        
        showNotification('Grades saved successfully!', 'success');
        hideGradingModal();
        loadExamResults(window.currentGradingExam);
        
    } catch (error) {
        showNotification('Error saving grades: ' + error.message, 'error');
    }
}

function showExamResults(examId) {
    hideAllSections();
    updateActiveNav('Results');
    
    let resultsView = document.getElementById('examResultsView');
    if (!resultsView) {
        resultsView = document.createElement('div');
        resultsView.id = 'examResultsView';
        resultsView.className = 'dashboard-section';
        resultsView.innerHTML = `
            <div class="section-header">
                <h2 class="section-title"><i class="fas fa-chart-line"></i> Exam Results</h2>
                <button class="btn btn-outline" onclick="showDashboard()"><i class="fas fa-arrow-left"></i> Back to Dashboard</button>
            </div>
            <div class="section-content">
                <div id="examResultsContainer">Loading results...</div>
            </div>
        `;
        document.querySelector('.dashboard').appendChild(resultsView);
    }
    
    resultsView.style.display = 'block';
    loadExamResults(examId);
}

async function loadExamResults(examId) {
    const container = document.getElementById('examResultsContainer');
    
    try {
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        
        const submissionSnapshot = await db.collection('submissions')
            .doc(examId).collection('students').get();
        
        if (submissionSnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <h3>${exam.title}</h3>
                    <p>No submissions yet</p>
                </div>
            `;
            return;
        }
        
        let resultsHTML = `
            <div class="exam-info" style="margin-bottom: 24px; padding: 20px; background: white; border-radius: 8px;">
                <h3>${exam.title}</h3>
                <p><strong>Subject:</strong> ${exam.subject}</p>
                <p><strong>Total Submissions:</strong> ${submissionSnapshot.size}</p>
            </div>
            <div class="results-table" style="background: white; border-radius: 8px; overflow: hidden;">
                <div class="table-header" style="display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr; padding: 16px; background: #f8fafc; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
                    <div>Student Name</div>
                    <div>Email</div>
                    <div>Score</div>
                    <div>Percentage</div>
                    <div>Submitted</div>
                    <div>Actions</div>
                </div>
        `;
        
        for (const submissionDoc of submissionSnapshot.docs) {
            const submission = submissionDoc.data();
            const userDoc = await db.collection('users').doc(submissionDoc.id).get();
            const userData = userDoc.data();
            
            const score = await calculateDetailedScore(examId, submission.answers, submission.manualGrades);
            const percentage = score.total > 0 ? ((score.scored / score.total) * 100).toFixed(1) : 0;
            
            resultsHTML += `
                <div class="table-row" style="display: grid; grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr; padding: 16px; border-bottom: 1px solid #f1f5f9; align-items: center;">
                    <div>${userData?.name || 'Unknown'}</div>
                    <div>${userData?.email || 'Unknown'}</div>
                    <div><strong>${score.scored}/${score.total}</strong></div>
                    <div style="color: ${percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#ef4444'}; font-weight: 600;">${percentage}%</div>
                    <div>${submission.submittedAt ? submission.submittedAt.toDate().toLocaleDateString() : 'Unknown'}</div>
                    <div><button class="btn btn-outline btn-sm" onclick="gradeSubmission('${examId}', '${submissionDoc.id}')"><i class="fas fa-edit"></i> Grade</button></div>
                </div>
            `;
        }
        
        resultsHTML += '</div>';
        container.innerHTML = resultsHTML;
        
    } catch (error) {
        console.error('Error loading exam results:', error);
        container.innerHTML = `<p style="color: #ef4444;">Error loading results: ${error.message}</p>`;
    }
}

async function manageStudentExam(examId, studentId) {
    try {
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        
        const userDoc = await db.collection('users').doc(studentId).get();
        const userData = userDoc.data();
        
        const submissionDoc = await db.collection('submissions')
            .doc(examId).collection('students').doc(studentId).get();
        
        const studentExamDoc = await db.collection('studentExamStatus')
            .doc(`${examId}_${studentId}`).get();
        
        const status = studentExamDoc.exists ? studentExamDoc.data() : { active: true };
        
        document.getElementById('studentExamContent').innerHTML = `
            <div class="student-exam-info">
                <h4>${userData?.name || 'Unknown'}</h4>
                <p><strong>Email:</strong> ${userData?.email || 'Unknown'}</p>
                <p><strong>Exam:</strong> ${exam.title}</p>
                <p><strong>Status:</strong> <span class="status-badge ${status.active ? 'active' : 'inactive'}">${status.active ? 'Active' : 'Deactivated'}</span></p>
                ${submissionDoc.exists ? `<p><strong>Submitted:</strong> ${submissionDoc.data().submittedAt?.toDate().toLocaleString() || 'Unknown'}</p>` : '<p><strong>Status:</strong> Not submitted</p>'}
            </div>
            
            <div class="management-actions" style="margin-top: 20px;">
                ${status.active ? 
                    `<button class="btn btn-danger" onclick="deactivateStudentExam('${examId}', '${studentId}')">
                        <i class="fas fa-pause"></i> Deactivate Exam
                    </button>` :
                    `<button class="btn btn-success" onclick="activateStudentExam('${examId}', '${studentId}')">
                        <i class="fas fa-play"></i> Activate Exam
                    </button>`
                }
                ${submissionDoc.exists ? 
                    `<button class="btn btn-warning" onclick="resetStudentExam('${examId}', '${studentId}')" style="margin-left: 8px;">
                        <i class="fas fa-redo"></i> Reset Submission
                    </button>` : ''
                }
            </div>
            
            <div class="info-box" style="margin-top: 16px; padding: 12px; background: #f0f4ff; border-radius: 6px; font-size: 14px;">
                <p><strong>Note:</strong></p>
                <ul style="margin: 8px 0 0 20px;">
                    <li>Deactivating will prevent the student from taking/continuing the exam</li>
                    <li>If exam is in progress, current answers will be auto-saved</li>
                    <li>Reactivating allows the student to continue from where they left off</li>
                    <li>Reset will clear all answers and allow a fresh attempt</li>
                </ul>
            </div>
        `;
        
        document.getElementById('studentExamModal').classList.remove('hidden');
        
    } catch (error) {
        showNotification('Error loading student exam data: ' + error.message, 'error');
    }
}

function hideStudentExamModal() {
    document.getElementById('studentExamModal').classList.add('hidden');
}

async function deactivateStudentExam(examId, studentId) {
    try {
        // Save current progress if student is taking exam
        const submissionDoc = await db.collection('submissions')
            .doc(examId).collection('students').doc(studentId).get();
        
        if (!submissionDoc.exists) {
            // Create partial submission with current timestamp
            await db.collection('submissions').doc(examId)
                .collection('students').doc(studentId).set({
                    answers: {},
                    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'deactivated',
                    partialSubmission: true
                });
        } else {
            // Update existing submission
            await db.collection('submissions').doc(examId)
                .collection('students').doc(studentId).update({
                    status: 'deactivated',
                    deactivatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
        
        // Set student exam status to inactive
        await db.collection('studentExamStatus').doc(`${examId}_${studentId}`).set({
            active: false,
            deactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deactivatedBy: currentUser.uid
        });
        
        showNotification('Student exam deactivated successfully');
        hideStudentExamModal();
        loadStudentManagement();
        
    } catch (error) {
        showNotification('Error deactivating exam: ' + error.message, 'error');
    }
}

async function activateStudentExam(examId, studentId) {
    try {
        // Reactivate student exam
        await db.collection('studentExamStatus').doc(`${examId}_${studentId}`).set({
            active: true,
            reactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reactivatedBy: currentUser.uid
        });
        
        // Update submission status if exists
        const submissionDoc = await db.collection('submissions')
            .doc(examId).collection('students').doc(studentId).get();
        
        if (submissionDoc.exists) {
            await db.collection('submissions').doc(examId)
                .collection('students').doc(studentId).update({
                    status: 'active',
                    reactivatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
        }
        
        showNotification('Student exam activated successfully');
        hideStudentExamModal();
        loadStudentManagement();
        
    } catch (error) {
        showNotification('Error activating exam: ' + error.message, 'error');
    }
}

async function resetStudentExam(examId, studentId) {
    if (!confirm('Are you sure you want to reset this student\'s exam? All their answers will be deleted.')) {
        return;
    }
    
    try {
        // Delete submission
        await db.collection('submissions').doc(examId)
            .collection('students').doc(studentId).delete();
        
        // Reset student exam status
        await db.collection('studentExamStatus').doc(`${examId}_${studentId}`).set({
            active: true,
            resetAt: firebase.firestore.FieldValue.serverTimestamp(),
            resetBy: currentUser.uid
        });
        
        showNotification('Student exam reset successfully');
        hideStudentExamModal();
        loadStudentManagement();
        
    } catch (error) {
        showNotification('Error resetting exam: ' + error.message, 'error');
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const editModal = document.getElementById('editExamModal');
    const deleteExamModal = document.getElementById('deleteExamModal');
    const validationModal = document.getElementById('validationModal');
    const successModal = document.getElementById('successModal');
    const logoutModal = document.getElementById('logoutModal');
    const deleteModal = document.getElementById('deleteModal');
    const publishModal = document.getElementById('publishModal');
    const studentExamModal = document.getElementById('studentExamModal');
    
    if (e.target === editModal) {
        hideEditExam();
    } else if (e.target === deleteExamModal) {
        hideDeleteExam();
    } else if (e.target === validationModal) {
        hideValidationModal();
    } else if (e.target === successModal) {
        hideSuccessModal();
    } else if (e.target === logoutModal) {
        hideLogoutModal();
    } else if (e.target === deleteModal) {
        hideDeleteModal();
    } else if (e.target === publishModal) {
        hidePublishModal();
    } else if (e.target === studentExamModal) {
        hideStudentExamModal();
    }
});