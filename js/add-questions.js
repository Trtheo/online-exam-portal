let currentExamId = null;
let currentUser = null;

// Get exam ID from URL
const urlParams = new URLSearchParams(window.location.search);
currentExamId = urlParams.get('examId');

if (!currentExamId) {
    window.location.href = 'teacher-dashboard.html';
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        loadExamDetails();
        loadQuestions();
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

function toggleOptions() {
    const type = document.getElementById('questionType').value;
    
    document.getElementById('mcqOptions').classList.add('hidden');
    document.getElementById('tfOptions').classList.add('hidden');
    document.getElementById('shortOptions').classList.add('hidden');
    
    if (type === 'mcq') {
        document.getElementById('mcqOptions').classList.remove('hidden');
    } else if (type === 'tf') {
        document.getElementById('tfOptions').classList.remove('hidden');
    } else if (type === 'short') {
        document.getElementById('shortOptions').classList.remove('hidden');
    }
}

document.getElementById('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const questionText = document.getElementById('questionText').value;
    const questionType = document.getElementById('questionType').value;
    const marks = parseInt(document.getElementById('questionMarks').value);
    
    let questionData = {
        questionText,
        type: questionType,
        marks,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (questionType === 'mcq') {
        const options = [
            document.getElementById('option1').value,
            document.getElementById('option2').value,
            document.getElementById('option3').value,
            document.getElementById('option4').value
        ];
        const correctAnswer = parseInt(document.getElementById('correctOption').value);
        
        questionData.options = options;
        questionData.correctAnswer = correctAnswer;
    } else if (questionType === 'tf') {
        questionData.correctAnswer = document.getElementById('tfAnswer').value === 'true';
    } else if (questionType === 'short') {
        questionData.sampleAnswer = document.getElementById('sampleAnswer').value;
    }
    
    try {
        await db.collection('exams').doc(currentExamId)
            .collection('questions').add(questionData);
        
        document.getElementById('questionForm').reset();
        toggleOptions();
        loadQuestions();
        alert('Question added successfully!');
    } catch (error) {
        alert('Error adding question: ' + error.message);
    }
});

async function loadQuestions() {
    try {
        const snapshot = await db.collection('exams').doc(currentExamId)
            .collection('questions').orderBy('createdAt').get();
        
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '';
        
        document.getElementById('questionCount').textContent = snapshot.size;
        
        snapshot.forEach((doc, index) => {
            const question = doc.data();
            const questionDiv = createQuestionDisplay(doc.id, question, index + 1);
            questionsList.appendChild(questionDiv);
        });
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function createQuestionDisplay(questionId, question, index) {
    const div = document.createElement('div');
    div.className = 'question-display';
    div.style.cssText = 'border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;';
    
    let optionsHtml = '';
    if (question.type === 'mcq') {
        optionsHtml = question.options.map((opt, i) => 
            `<p style="margin: 5px 0; ${i === question.correctAnswer ? 'color: green; font-weight: bold;' : ''}">
                ${String.fromCharCode(65 + i)}. ${opt} ${i === question.correctAnswer ? '✓' : ''}
            </p>`
        ).join('');
    } else if (question.type === 'tf') {
        optionsHtml = `<p style="color: green; font-weight: bold;">Answer: ${question.correctAnswer ? 'True' : 'False'}</p>`;
    } else if (question.type === 'short') {
        optionsHtml = `<p><strong>Sample Answer:</strong> ${question.sampleAnswer || 'Not provided'}</p>`;
    }
    
    div.innerHTML = `
        <h4>Question ${index} (${question.marks} marks)</h4>
        <p><strong>${question.questionText}</strong></p>
        <p><em>Type: ${question.type.toUpperCase()}</em></p>
        ${optionsHtml}
        <button class="btn btn-danger" onclick="deleteQuestion('${questionId}')" style="margin-top: 10px;">Delete</button>
    `;
    
    return div;
}

async function deleteQuestion(questionId) {
    if (confirm('Are you sure you want to delete this question?')) {
        try {
            await db.collection('exams').doc(currentExamId)
                .collection('questions').doc(questionId).delete();
            loadQuestions();
        } catch (error) {
            alert('Error deleting question: ' + error.message);
        }
    }
}

function goBack() {
    window.location.href = 'teacher-dashboard.html';
}