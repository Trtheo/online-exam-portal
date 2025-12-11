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

let importedQuestions = [];

function showBulkImport() {
    document.getElementById('bulkImportModal').classList.remove('hidden');
}

function hideBulkImport() {
    document.getElementById('bulkImportModal').classList.add('hidden');
    document.getElementById('csvFile').value = '';
    document.getElementById('jsonData').value = '';
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('importBtn').disabled = true;
    importedQuestions = [];
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        parseCSVData(csv);
    };
    reader.readAsText(file);
}

function parseCSVData(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const questions = [];
    
    for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        if (cols.length < 6) continue;
        
        const question = {
            questionText: cols[0],
            type: cols[1],
            marks: parseInt(cols[cols.length - 1]) || 1
        };
        
        if (question.type === 'mcq') {
            question.options = [cols[2], cols[3], cols[4], cols[5]];
            question.correctAnswer = parseInt(cols[6]) || 0;
        } else if (question.type === 'tf') {
            question.correctAnswer = cols[2].toLowerCase() === 'true';
        } else if (question.type === 'short') {
            question.sampleAnswer = cols[2] || '';
        }
        
        questions.push(question);
    }
    
    importedQuestions = questions;
    showPreview();
}

function parseJsonData() {
    try {
        const jsonText = document.getElementById('jsonData').value;
        const questions = JSON.parse(jsonText);
        
        if (!Array.isArray(questions)) {
            alert('JSON must be an array of questions');
            return;
        }
        
        importedQuestions = questions;
        showPreview();
    } catch (error) {
        alert('Invalid JSON format: ' + error.message);
    }
}

function showPreview() {
    const preview = document.getElementById('importPreview');
    const previewList = document.getElementById('previewList');
    const previewCount = document.getElementById('previewCount');
    
    if (importedQuestions.length === 0) {
        preview.classList.add('hidden');
        return;
    }
    
    previewCount.textContent = importedQuestions.length;
    
    previewList.innerHTML = importedQuestions.map((q, index) => `
        <div class="preview-question">
            <strong>Q${index + 1}:</strong> ${q.questionText}<br>
            <small>Type: ${q.type.toUpperCase()} | Marks: ${q.marks}</small>
            ${q.options ? `<br><small>Options: ${q.options.join(', ')}</small>` : ''}
        </div>
    `).join('');
    
    preview.classList.remove('hidden');
    document.getElementById('importBtn').disabled = false;
}

async function importQuestions() {
    if (importedQuestions.length === 0) return;
    
    try {
        const batch = db.batch();
        
        importedQuestions.forEach(question => {
            const questionRef = db.collection('exams').doc(currentExamId)
                .collection('questions').doc();
            batch.set(questionRef, question);
        });
        
        await batch.commit();
        alert(`Successfully imported ${importedQuestions.length} questions!`);
        hideBulkImport();
        loadQuestions();
    } catch (error) {
        alert('Error importing questions: ' + error.message);
    }
}