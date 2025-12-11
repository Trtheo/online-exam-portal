// Student dashboard functionality
let currentUser = null;

// Check authentication
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData && userData.role === 'student') {
            document.getElementById('studentName').textContent = userData.name;
            loadAvailableExams();
        } else {
            window.location.href = 'index.html';
        }
    } else {
        window.location.href = 'index.html';
    }
});

async function loadAvailableExams() {
    if (!currentUser) return;
    
    try {
        const now = new Date();
        const snapshot = await db.collection('exams')
            .where('published', '==', true)
            .where('startTime', '<=', now)
            .where('endTime', '>=', now)
            .get();
        
        const examList = document.getElementById('examList');
        examList.innerHTML = '';
        
        for (const doc of snapshot.docs) {
            const exam = doc.data();
            
            // Check if student has already submitted
            const submissionDoc = await db.collection('submissions')
                .doc(doc.id)
                .collection('students')
                .doc(currentUser.uid)
                .get();
            
            const examCard = createExamCard(doc.id, exam, submissionDoc.exists);
            examList.appendChild(examCard);
        }
        
        if (snapshot.empty) {
            examList.innerHTML = '<p>No exams available at the moment.</p>';
        }
    } catch (error) {
        console.error('Error loading exams:', error);
    }
}

function createExamCard(examId, exam, hasSubmitted) {
    const card = document.createElement('div');
    card.className = 'exam-card';
    
    const startTime = exam.startTime ? exam.startTime.toDate().toLocaleString() : 'Not set';
    const endTime = exam.endTime ? exam.endTime.toDate().toLocaleString() : 'Not set';
    
    card.innerHTML = `
        <h3>${exam.title}</h3>
        <p><strong>Subject:</strong> ${exam.subject}</p>
        <p><strong>Duration:</strong> ${exam.duration} minutes</p>
        <p><strong>Start:</strong> ${startTime}</p>
        <p><strong>End:</strong> ${endTime}</p>
        <div>
            ${hasSubmitted ? 
                '<button class="btn btn-success" disabled>Completed</button>' :
                `<button class="btn btn-primary" onclick="startExam('${examId}')">Start Exam</button>`
            }
        </div>
    `;
    
    return card;
}

function startExam(examId) {
    window.location.href = `take-exam.html?examId=${examId}`;
}