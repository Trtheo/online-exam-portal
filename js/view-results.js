let currentExamId = null;
let currentUser = null;
let questions = [];

const urlParams = new URLSearchParams(window.location.search);
currentExamId = urlParams.get('examId');

if (!currentExamId) {
    window.location.href = 'teacher-dashboard.html';
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadExamDetails();
        await loadQuestions();
        await loadResults();
    } else {
        window.location.href = 'index.html';
    }
});

async function loadExamDetails() {
    try {
        const examDoc = await db.collection('exams').doc(currentExamId).get();
        if (examDoc.exists) {
            const exam = examDoc.data();
            document.getElementById('examTitle').textContent = exam.title;
        }
    } catch (error) {
        console.error('Error loading exam:', error);
    }
}

async function loadQuestions() {
    try {
        const snapshot = await db.collection('exams').doc(currentExamId)
            .collection('questions').get();
        
        questions = [];
        snapshot.forEach(doc => {
            questions.push({ id: doc.id, ...doc.data() });
        });
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

async function loadResults() {
    try {
        const snapshot = await db.collection('submissions').doc(currentExamId)
            .collection('students').get();
        
        const resultsTable = document.getElementById('resultsTable');
        resultsTable.innerHTML = '';
        
        document.getElementById('submissionCount').textContent = snapshot.size;
        
        for (const doc of snapshot.docs) {
            const submission = doc.data();
            
            // Get student details
            const studentDoc = await db.collection('users').doc(submission.studentId).get();
            const student = studentDoc.data();
            
            // Calculate score
            const score = calculateScore(submission.answers);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="padding: 12px; border: 1px solid #ddd;">${student ? student.name : 'Unknown'}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${student ? student.email : 'Unknown'}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${score.scored}/${score.total}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${submission.submittedAt ? submission.submittedAt.toDate().toLocaleString() : 'Unknown'}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">
                    <button class="btn btn-primary" onclick="viewDetails('${submission.studentId}')">View Details</button>
                </td>
            `;
            resultsTable.appendChild(row);
        }
        
        if (snapshot.empty) {
            resultsTable.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No submissions yet</td></tr>';
        }
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

function calculateScore(answers) {
    let scored = 0;
    let total = 0;
    
    questions.forEach(question => {
        total += question.marks;
        
        const studentAnswer = answers[question.id];
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
            // Short answers need manual grading
        }
    });
    
    return { scored, total };
}

function viewDetails(studentId) {
    window.open(`student-details.html?examId=${currentExamId}&studentId=${studentId}`, '_blank');
}

function goBack() {
    window.location.href = 'teacher-dashboard.html';
}