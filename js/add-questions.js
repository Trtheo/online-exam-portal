let currentExamId = null;
let currentUser = null;
let questionEditor = null;
let allQuestions = [];
let importedQuestions = [];

// Get exam ID from URL
const urlParams = new URLSearchParams(window.location.search);
currentExamId = urlParams.get('examId');

if (!currentExamId) {
    window.location.href = 'teacher-dashboard.html';
}

// Initialize Quill editor
document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.getElementById('questionEditor');
    if (editorElement) {
        questionEditor = new Quill('#questionEditor', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link', 'image'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            },
            placeholder: 'Enter your question here...'
        });
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        loadExamDetails();
        loadQuestions();
        
        // Initialize Quill editor
        if (!questionEditor) {
            questionEditor = new Quill('#questionEditor', {
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
        }
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
            document.getElementById('examDuration').textContent = exam.duration || 0;
        }
    } catch (error) {
        console.error('Error loading exam:', error);
    }
}

// Show question form
function showQuestionForm(type) {
    const formCard = document.getElementById('questionFormCard');
    const formTitle = document.getElementById('formTitle');
    const mcqSection = document.getElementById('mcqSection');
    const tfSection = document.getElementById('tfSection');
    const shortSection = document.getElementById('shortSection');
    
    // Reset form
    document.getElementById('questionForm').reset();
    if (questionEditor) {
        questionEditor.setContents([]);
    }
    
    // Hide all sections
    mcqSection.classList.add('hidden');
    tfSection.classList.add('hidden');
    if (shortSection) shortSection.classList.add('hidden');
    
    // Show appropriate section
    if (type === 'mcq') {
        mcqSection.classList.remove('hidden');
        formTitle.innerHTML = '<i class="fas fa-list-ul"></i> Add Multiple Choice Question';
    } else if (type === 'tf') {
        tfSection.classList.remove('hidden');
        formTitle.innerHTML = '<i class="fas fa-check-circle"></i> Add True/False Question';
    } else if (type === 'short') {
        if (shortSection) shortSection.classList.remove('hidden');
        formTitle.innerHTML = '<i class="fas fa-edit"></i> Add Short Answer Question';
    }
    
    formCard.classList.remove('hidden');
    if (questionEditor) {
        questionEditor.focus();
    }
}

function hideQuestionForm() {
    document.getElementById('questionFormCard').classList.add('hidden');
}

async function saveQuestion() {
    
    const questionText = questionEditor.root.innerHTML;
    const marks = parseInt(document.getElementById('questionMarks').value);
    
    if (!questionText.trim() || questionText === '<p><br></p>') {
        showNotificationModal('Error', 'Please enter a question');
        return;
    }
    
    let questionData = {
        questionText,
        marks,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Determine question type based on visible section
    if (!document.getElementById('mcqSection').classList.contains('hidden')) {
        const options = [
            document.getElementById('option0').value,
            document.getElementById('option1').value,
            document.getElementById('option2').value,
            document.getElementById('option3').value
        ];
        
        const correctAnswer = document.querySelector('input[name="correctAnswer"]:checked');
        
        if (options.some(opt => !opt.trim())) {
            showNotificationModal('Error', 'Please fill all options');
            return;
        }
        
        if (!correctAnswer) {
            showNotificationModal('Error', 'Please select the correct answer');
            return;
        }
        
        questionData.type = 'mcq';
        questionData.options = options;
        questionData.correctAnswer = parseInt(correctAnswer.value);
    } else if (!document.getElementById('tfSection').classList.contains('hidden')) {
        const tfAnswer = document.querySelector('input[name="tfAnswer"]:checked');
        
        if (!tfAnswer) {
            showNotificationModal('Error', 'Please select True or False');
            return;
        }
        
        questionData.type = 'tf';
        questionData.correctAnswer = tfAnswer.value === 'true';
    } else if (!document.getElementById('shortSection').classList.contains('hidden')) {
        const sampleAnswer = document.getElementById('sampleAnswer')?.value || '';
        
        questionData.type = 'short';
        questionData.sampleAnswer = sampleAnswer;
    }
    
    try {
        await db.collection('exams').doc(currentExamId)
            .collection('questions').add(questionData);
        
        hideQuestionForm();
        loadQuestions();
        showNotificationModal('Success', 'Question added successfully!');
    } catch (error) {
        showNotificationModal('Error', 'Error adding question: ' + error.message);
    }
}

async function loadQuestions() {
    try {
        const snapshot = await db.collection('exams').doc(currentExamId)
            .collection('questions').orderBy('createdAt').get();
        
        allQuestions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        updateStats();
        displayQuestions(allQuestions);
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function updateStats() {
    const mcqCount = allQuestions.filter(q => q.type === 'mcq').length;
    const tfCount = allQuestions.filter(q => q.type === 'tf').length;
    const shortCount = allQuestions.filter(q => q.type === 'short').length;
    const totalMarks = allQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    
    const questionCountEl = document.getElementById('questionCount');
    const mcqCountEl = document.getElementById('mcqCount');
    const tfCountEl = document.getElementById('tfCount');
    const shortCountEl = document.getElementById('shortCount');
    const totalMarksEl = document.getElementById('totalMarks');
    
    if (questionCountEl) questionCountEl.textContent = allQuestions.length;
    if (mcqCountEl) mcqCountEl.textContent = mcqCount;
    if (tfCountEl) tfCountEl.textContent = tfCount;
    if (shortCountEl) shortCountEl.textContent = shortCount;
    if (totalMarksEl) totalMarksEl.textContent = totalMarks;
    
    const totalQuestionCountEl = document.getElementById('totalQuestionCount');
    if (totalQuestionCountEl) totalQuestionCountEl.textContent = allQuestions.length;
}

function displayQuestions(questions) {
    const questionsList = document.getElementById('questionsList');
    
    if (questions.length === 0) {
        questionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-question-circle"></i>
                <h4>No questions yet</h4>
                <p>Start by adding your first question</p>
            </div>
        `;
        return;
    }
    
    questionsList.innerHTML = questions.map((question, index) => 
        createQuestionItem(question, index + 1)
    ).join('');
}

function createQuestionItem(question, index) {
    let optionsHtml = '';
    
    if (question.type === 'mcq') {
        optionsHtml = `
            <div class="question-options">
                ${question.options.map((opt, i) => `
                    <div class="option-display ${i === question.correctAnswer ? 'correct' : ''}">
                        ${String.fromCharCode(65 + i)}. ${opt}
                    </div>
                `).join('')}
            </div>
        `;
    } else if (question.type === 'tf') {
        optionsHtml = `
            <div class="tf-answer">
                <span class="tf-label ${question.correctAnswer ? 'true' : 'false'}">
                    ${question.correctAnswer ? 'True' : 'False'}
                </span>
            </div>
        `;
    } else if (question.type === 'short') {
        optionsHtml = `
            <div class="short-answer-info">
                <div class="answer-type">Short Answer Question</div>
                ${question.sampleAnswer ? `<div class="sample-answer"><strong>Sample Answer:</strong> ${question.sampleAnswer}</div>` : ''}
            </div>
        `;
    }
    
    return `
        <div class="question-item">
            <div class="question-header">
                <div class="question-meta">
                    <span class="question-type type-${question.type}">${question.type === 'short' ? 'SHORT' : question.type.toUpperCase()}</span>
                    <span class="question-marks">${question.marks} mark${question.marks !== 1 ? 's' : ''}</span>
                </div>
                <div class="question-actions">
                    <button class="btn btn-outline btn-sm" onclick="editQuestion('${question.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteQuestion('${question.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="question-text">${question.questionText}</div>
            ${optionsHtml}
        </div>
    `;
}

async function deleteQuestion(questionId) {
    if (confirm('Are you sure you want to delete this question?')) {
        try {
            await db.collection('exams').doc(currentExamId)
                .collection('questions').doc(questionId).delete();
            loadQuestions();
            showNotificationModal('Success', 'Question deleted successfully!');
        } catch (error) {
            showNotificationModal('Error', 'Error deleting question: ' + error.message);
        }
    }
}

function goBack() {
    window.location.href = 'teacher-dashboard.html';
}



function filterQuestions() {
    const searchTerm = document.getElementById('questionSearch').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    
    let filtered = allQuestions;
    
    if (searchTerm) {
        filtered = filtered.filter(q => 
            q.questionText.toLowerCase().includes(searchTerm)
        );
    }
    
    if (typeFilter) {
        filtered = filtered.filter(q => q.type === typeFilter);
    }
    
    displayQuestions(filtered);
}

let editQuestionEditor = null;
let currentEditQuestionId = null;

async function editQuestion(questionId) {
    try {
        const questionDoc = await db.collection('exams').doc(currentExamId)
            .collection('questions').doc(questionId).get();
        
        if (!questionDoc.exists) {
            showNotificationModal('Error', 'Question not found');
            return;
        }
        
        const question = questionDoc.data();
        currentEditQuestionId = questionId;
        
        // Initialize edit editor if not exists
        if (!editQuestionEditor) {
            editQuestionEditor = new Quill('#editQuestionEditor', {
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
        }
        
        // Populate form
        editQuestionEditor.root.innerHTML = question.questionText;
        document.getElementById('editQuestionMarks').value = question.marks;
        
        // Show appropriate section
        const editMcqSection = document.getElementById('editMcqSection');
        const editTfSection = document.getElementById('editTfSection');
        const editShortSection = document.getElementById('editShortSection');
        
        editMcqSection.classList.add('hidden');
        editTfSection.classList.add('hidden');
        if (editShortSection) editShortSection.classList.add('hidden');
        
        if (question.type === 'mcq') {
            editMcqSection.classList.remove('hidden');
            question.options.forEach((option, index) => {
                document.getElementById(`editOption${index}`).value = option;
            });
            document.getElementById(`editCorrect${question.correctAnswer}`).checked = true;
        } else if (question.type === 'tf') {
            editTfSection.classList.remove('hidden');
            document.querySelector(`input[name="editTfAnswer"][value="${question.correctAnswer}"`)?.click();
        } else if (question.type === 'short') {
            if (editShortSection) {
                editShortSection.classList.remove('hidden');
                document.getElementById('editSampleAnswer').value = question.sampleAnswer || '';
            }
        }
        
        document.getElementById('editQuestionModal').classList.remove('hidden');
        
    } catch (error) {
        showNotificationModal('Error', 'Error loading question: ' + error.message);
    }
}

function hideEditModal() {
    document.getElementById('editQuestionModal').classList.add('hidden');
    currentEditQuestionId = null;
}

async function updateQuestion() {
    
    if (!currentEditQuestionId) return;
    
    const questionText = editQuestionEditor.root.innerHTML;
    const marks = parseInt(document.getElementById('editQuestionMarks').value);
    
    if (!questionText.trim() || questionText === '<p><br></p>') {
        showNotificationModal('Error', 'Please enter a question');
        return;
    }
    
    let questionData = {
        questionText,
        marks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Determine question type
    if (!document.getElementById('editMcqSection').classList.contains('hidden')) {
        const options = [
            document.getElementById('editOption0').value,
            document.getElementById('editOption1').value,
            document.getElementById('editOption2').value,
            document.getElementById('editOption3').value
        ];
        
        const correctAnswer = document.querySelector('input[name="editCorrectAnswer"]:checked');
        
        if (options.some(opt => !opt.trim())) {
            showNotificationModal('Error', 'Please fill all options');
            return;
        }
        
        if (!correctAnswer) {
            showNotificationModal('Error', 'Please select the correct answer');
            return;
        }
        
        questionData.type = 'mcq';
        questionData.options = options;
        questionData.correctAnswer = parseInt(correctAnswer.value);
    } else if (!document.getElementById('editTfSection').classList.contains('hidden')) {
        const tfAnswer = document.querySelector('input[name="editTfAnswer"]:checked');
        
        if (!tfAnswer) {
            showNotificationModal('Error', 'Please select True or False');
            return;
        }
        
        questionData.type = 'tf';
        questionData.correctAnswer = tfAnswer.value === 'true';
    } else if (!document.getElementById('editShortSection').classList.contains('hidden')) {
        const sampleAnswer = document.getElementById('editSampleAnswer')?.value || '';
        
        questionData.type = 'short';
        questionData.sampleAnswer = sampleAnswer;
    }
    
    try {
        await db.collection('exams').doc(currentExamId)
            .collection('questions').doc(currentEditQuestionId).update(questionData);
        
        hideEditModal();
        loadQuestions();
        showNotificationModal('Success', 'Question updated successfully!');
    } catch (error) {
        showNotificationModal('Error', 'Error updating question: ' + error.message);
    }
}

function showNotificationModal(title, message) {
    document.getElementById('notificationTitle').textContent = title;
    document.getElementById('notificationMessage').textContent = message;
    
    const modal = document.getElementById('notificationModal');
    const header = modal.querySelector('.modal-header');
    const icon = header.querySelector('i');
    
    if (title === 'Success') {
        icon.className = 'fas fa-check-circle';
        header.style.background = 'linear-gradient(135deg, #16a34a, #059669)';
    } else if (title === 'Error') {
        icon.className = 'fas fa-exclamation-circle';
        header.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else {
        icon.className = 'fas fa-info-circle';
        header.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    }
    
    modal.classList.remove('hidden');
}

function hideNotificationModal() {
    document.getElementById('notificationModal').classList.add('hidden');
}