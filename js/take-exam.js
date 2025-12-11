let currentExamId = null;
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let answers = {};
let examTimer = null;
let timeRemaining = 0;

const urlParams = new URLSearchParams(window.location.search);
currentExamId = urlParams.get('examId');

if (!currentExamId) {
    window.location.href = 'student-dashboard.html';
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadExam();
        await loadQuestions();
        startTimer();
        displayQuestion();
    } else {
        window.location.href = 'index.html';
    }
});

async function loadExam() {
    try {
        const examDoc = await db.collection('exams').doc(currentExamId).get();
        if (examDoc.exists) {
            const exam = examDoc.data();
            document.getElementById('examTitle').textContent = exam.title;
            timeRemaining = exam.duration * 60; // Convert to seconds
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
        
        createQuestionNavigation();
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function createQuestionNavigation() {
    const nav = document.getElementById('questionNav');
    nav.innerHTML = '';
    
    questions.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.textContent = index + 1;
        btn.onclick = () => goToQuestion(index);
        btn.id = `nav-btn-${index}`;
        nav.appendChild(btn);
    });
    
    updateNavigationButtons();
}

function displayQuestion() {
    if (questions.length === 0) return;
    
    const question = questions[currentQuestionIndex];
    const container = document.getElementById('questionContainer');
    
    let optionsHtml = '';
    
    if (question.type === 'mcq') {
        optionsHtml = question.options.map((option, index) => `
            <div class="options">
                <label>
                    <input type="radio" name="answer" value="${index}" 
                           ${answers[question.id] == index ? 'checked' : ''}
                           onchange="saveAnswer(${index})">
                    ${String.fromCharCode(65 + index)}. ${option}
                </label>
            </div>
        `).join('');
    } else if (question.type === 'tf') {
        optionsHtml = `
            <div class="options">
                <label>
                    <input type="radio" name="answer" value="true" 
                           ${answers[question.id] === 'true' ? 'checked' : ''}
                           onchange="saveAnswer('true')">
                    True
                </label>
            </div>
            <div class="options">
                <label>
                    <input type="radio" name="answer" value="false" 
                           ${answers[question.id] === 'false' ? 'checked' : ''}
                           onchange="saveAnswer('false')">
                    False
                </label>
            </div>
        `;
    } else if (question.type === 'short') {
        optionsHtml = `
            <textarea rows="4" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px;" 
                      placeholder="Enter your answer here..." 
                      onchange="saveAnswer(this.value)">${answers[question.id] || ''}</textarea>
        `;
    }
    
    container.innerHTML = `
        <h3>Question ${currentQuestionIndex + 1} of ${questions.length} (${question.marks} marks)</h3>
        <p style="font-size: 18px; margin: 20px 0;">${question.questionText}</p>
        ${optionsHtml}
    `;
    
    updateNavigationButtons();
    updateQuestionNavigation();
}

function saveAnswer(answer) {
    const question = questions[currentQuestionIndex];
    answers[question.id] = answer;
    updateQuestionNavigation();
}

function updateQuestionNavigation() {
    questions.forEach((question, index) => {
        const btn = document.getElementById(`nav-btn-${index}`);
        btn.classList.remove('answered', 'current');
        
        if (index === currentQuestionIndex) {
            btn.classList.add('current');
        } else if (answers[question.id] !== undefined) {
            btn.classList.add('answered');
        }
    });
}

function updateNavigationButtons() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === questions.length - 1) {
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('submitBtn').style.display = 'inline-block';
    } else {
        document.getElementById('nextBtn').style.display = 'inline-block';
        document.getElementById('submitBtn').style.display = 'none';
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function goToQuestion(index) {
    currentQuestionIndex = index;
    displayQuestion();
}

function startTimer() {
    examTimer = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(examTimer);
            alert('Time is up! Submitting exam automatically.');
            submitExam();
        }
    }, 1000);
}

async function submitExam() {
    if (!confirm('Are you sure you want to submit the exam? You cannot change your answers after submission.')) {
        return;
    }
    
    clearInterval(examTimer);
    
    try {
        const submissionData = {
            studentId: currentUser.uid,
            answers: answers,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            timeSpent: (questions.length > 0 ? questions[0].marks * questions.length * 60 - timeRemaining : 0)
        };
        
        await db.collection('submissions').doc(currentExamId)
            .collection('students').doc(currentUser.uid).set(submissionData);
        
        alert('Exam submitted successfully!');
        window.location.href = 'student-dashboard.html';
    } catch (error) {
        alert('Error submitting exam: ' + error.message);
    }
}

// Prevent page refresh/close during exam
window.addEventListener('beforeunload', (e) => {
    e.preventDefault();
    e.returnValue = 'Are you sure you want to leave? Your progress will be lost.';
});