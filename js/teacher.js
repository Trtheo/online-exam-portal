// Teacher dashboard functionality
let currentUser = null;

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
}

function hideCreateExam() {
    document.getElementById('createExamModal').classList.add('hidden');
    document.getElementById('examForm').reset();
}

function showExamList() {
    loadExams();
}

function viewAllResults() {
    // Implementation for viewing all results
    alert('View all results functionality coming soon!');
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
        
        // Load submission count
        let totalSubmissions = 0;
        for (const examDoc of examSnapshot.docs) {
            const submissionSnapshot = await db.collection('submissions')
                .doc(examDoc.id)
                .collection('students')
                .get();
            totalSubmissions += submissionSnapshot.size;
        }
        
        document.getElementById('totalSubmissions').textContent = totalSubmissions;
        
        // For now, set students to submissions count (can be enhanced later)
        document.getElementById('totalStudents').textContent = totalSubmissions;
        
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
        alert('Exam created successfully!');
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
            .orderBy('createdAt', 'desc')
            .get();
        
        const examList = document.getElementById('examList');
        
        if (snapshot.empty) {
            examList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #64748b;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                    <h3 style="margin-bottom: 8px; color: #1e293b;">No exams yet</h3>
                    <p>Create your first exam to get started</p>
                    <button class="btn btn-primary" onclick="showCreateExam()" style="margin-top: 16px;">
                        ➕ Create New Exam
                    </button>
                </div>
            `;
        } else {
            examList.innerHTML = '';
            snapshot.forEach(doc => {
                const exam = doc.data();
                const examCard = createExamCard(doc.id, exam);
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
                <span class="meta-icon">⏱️</span>
                <span>${exam.duration} minutes</span>
            </div>
            <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>${startTime}</span>
            </div>
            <div class="meta-item">
                <span class="meta-icon">📅</span>
                <span>${endTime}</span>
            </div>
            <div class="meta-item">
                <span class="meta-icon">❓</span>
                <span id="questions-${examId}">Loading...</span>
            </div>
        </div>
        
        <div class="exam-actions">
            <button class="btn btn-primary btn-sm" onclick="addQuestions('${examId}')">
                ✏️ Questions
            </button>
            <button class="btn btn-success btn-sm" onclick="viewSubmissions('${examId}')">
                📊 Results
            </button>
            ${!exam.published ? 
                `<button class="btn btn-outline btn-sm" onclick="publishExam('${examId}')">
                    🚀 Publish
                </button>` : 
                `<button class="btn btn-danger btn-sm" onclick="unpublishExam('${examId}')">
                    ⏸️ Unpublish
                </button>`
            }
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
            alert('Exam published successfully!');
            loadDashboardData();
        } catch (error) {
            alert('Error publishing exam: ' + error.message);
        }
    }
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('createExamModal');
    if (e.target === modal) {
        hideCreateExam();
    }
});