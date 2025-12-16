let currentExamId = null;
let currentUser = null;
let questions = [];
let currentQuestionIndex = 0;
let answers = {};
let flaggedQuestions = new Set();
let examTimer = null;
let timeRemaining = 0;
let examData = null;
let suspiciousActivity = [];
let tabSwitchCount = 0;
let isFullScreen = false;

// Reusable Modal System
function createModal(id, title, content, buttons, options = {}) {
    const modal = document.createElement('div');
    modal.id = id;
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
    
    const width = options.width || '400px';
    const maxHeight = options.maxHeight || '80vh';
    const titleColor = options.danger ? '#ef4444' : '#1e293b';
    const titleIcon = options.icon || '';
    
    modal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 12px; width: ${width}; max-width: 90vw; max-height: ${maxHeight}; overflow-y: auto;">
            <h3 style="margin: 0 0 16px 0; color: ${titleColor};">${titleIcon ? `<i class="${titleIcon}"></i> ` : ''}${title}</h3>
            <div style="margin-bottom: 20px;">${content}</div>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                ${buttons}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

const urlParams = new URLSearchParams(window.location.search);
currentExamId = urlParams.get('examId');

if (!currentExamId) {
    window.location.href = 'student-dashboard.html';
}



async function loadExam() {
    try {
        const examDoc = await db.collection('exams').doc(currentExamId).get();
        if (examDoc.exists) {
            examData = examDoc.data();
            
            // Validate required exam data
            if (!examData || !examData.duration) {
                throw new Error('Invalid exam data: missing duration');
            }
            
            // Check if student is allowed to take this exam
            const studentExamStatusDoc = await db.collection('studentExamStatus')
                .doc(`${currentExamId}_${currentUser.uid}`).get();
            
            if (studentExamStatusDoc.exists && !studentExamStatusDoc.data().active) {
                createModal(
                    'errorModal',
                    'Exam Deactivated',
                    'This exam has been deactivated for you. Please contact your teacher.',
                    '<button class="btn btn-primary" onclick="window.location.href=\'student-dashboard.html\'">Return to Dashboard</button>',
                    { danger: true, icon: 'fas fa-ban' }
                );
                return;
            }
            
            // Check exam status
            const now = new Date();
            const startTime = examData.startTime ? examData.startTime.toDate() : null;
            const endTime = examData.endTime ? examData.endTime.toDate() : null;
            
            let status = 'DRAFT';
            if (examData.published) {
                if (startTime && endTime) {
                    if (now < startTime) {
                        status = 'UPCOMING';
                    } else if (now >= startTime && now <= endTime) {
                        status = 'LIVE';
                    } else if (now > endTime) {
                        status = 'EXPIRED';
                    }
                }
            }
            
            document.getElementById('examTitle').innerHTML = `<i class="fas fa-clipboard-check"></i> ${examData.title}`;
            document.getElementById('examSubject').textContent = `${examData.subject} • ${status}`;
            timeRemaining = examData.duration * 60;
            
            // Prevent access if exam is not live
            if (status !== 'LIVE') {
                createModal(
                    'statusModal',
                    'Exam Not Available',
                    `This exam is ${status}. You cannot take it at this time.`,
                    '<button class="btn btn-primary" onclick="window.location.href=\'student-dashboard.html\'">Return to Dashboard</button>',
                    { danger: true, icon: 'fas fa-clock' }
                );
                return;
            }
        } else {
            throw new Error('Exam not found');
        }
    } catch (error) {
        console.error('Error loading exam:', error);
        createModal(
            'errorModal',
            'Error Loading Exam',
            'Error loading exam: ' + error.message,
            '<button class="btn btn-primary" onclick="window.location.href=\'student-dashboard.html\'">Return to Dashboard</button>',
            { danger: true, icon: 'fas fa-exclamation-circle' }
        );
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
        
        // Randomize question order
        questions = shuffleArray(questions);
        
        document.getElementById('questionProgress').textContent = `Question 1 of ${questions.length}`;
        createQuestionNavigation();
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function createQuestionNavigation() {
    const nav = document.getElementById('questionNav');
    nav.innerHTML = '';
    
    questions.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'question-nav-btn';
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
    
    document.getElementById('questionProgress').textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    
    let optionsHtml = '';
    
    if (question.type === 'mcq') {
        optionsHtml = question.options.map((option, index) => `
            <div class="option-item ${answers[question.id] == index ? 'selected' : ''}" onclick="selectOption(${index})">
                <div class="option-radio"></div>
                <span><strong>${String.fromCharCode(65 + index)}.</strong> ${option}</span>
            </div>
        `).join('');
    } else if (question.type === 'tf') {
        optionsHtml = `
            <div class="option-item ${answers[question.id] === 'true' ? 'selected' : ''}" onclick="selectOption('true')">
                <div class="option-radio"></div>
                <span><strong>A.</strong> True</span>
            </div>
            <div class="option-item ${answers[question.id] === 'false' ? 'selected' : ''}" onclick="selectOption('false')">
                <div class="option-radio"></div>
                <span><strong>B.</strong> False</span>
            </div>
        `;
    } else if (question.type === 'short') {
        optionsHtml = `
            <textarea rows="4" style="width: 100%; padding: 16px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 16px;" 
                      placeholder="Enter your answer here..." 
                      onchange="saveAnswer(this.value)">${answers[question.id] || ''}</textarea>
        `;
    }
    
    container.innerHTML = `
        <div class="question-header">
            <div class="question-number">Question ${currentQuestionIndex + 1}</div>
            <div class="question-marks">${question.marks} mark${question.marks !== 1 ? 's' : ''}</div>
        </div>
        <div class="question-text">${question.questionText}</div>
        <div class="question-options">
            ${optionsHtml}
        </div>
    `;
    
    updateNavigationButtons();
    updateQuestionNavigation();
    updateFlagButton();
}

function selectOption(value) {
    saveAnswer(value);
    
    // Update visual selection
    document.querySelectorAll('.option-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    if (questions[currentQuestionIndex].type === 'mcq') {
        document.querySelectorAll('.option-item')[value].classList.add('selected');
    } else if (questions[currentQuestionIndex].type === 'tf') {
        const index = value === 'true' ? 0 : 1;
        document.querySelectorAll('.option-item')[index].classList.add('selected');
    }
}

function saveAnswer(answer) {
    const question = questions[currentQuestionIndex];
    answers[question.id] = answer;
    updateQuestionNavigation();
}

function updateQuestionNavigation() {
    questions.forEach((question, index) => {
        const btn = document.getElementById(`nav-btn-${index}`);
        btn.className = 'question-nav-btn';
        
        if (index === currentQuestionIndex) {
            btn.classList.add('current');
        } else if (answers[question.id] !== undefined) {
            btn.classList.add('answered');
        }
        
        if (flaggedQuestions.has(question.id)) {
            btn.classList.add('flagged');
        }
    });
}

function updateNavigationButtons() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === questions.length - 1) {
        document.getElementById('nextBtn').style.display = 'none';
        document.getElementById('submitBtn').style.display = 'inline-flex';
    } else {
        document.getElementById('nextBtn').style.display = 'inline-flex';
        document.getElementById('submitBtn').style.display = 'none';
    }
}

function updateFlagButton() {
    const flagBtn = document.getElementById('flagBtn');
    const question = questions[currentQuestionIndex];
    
    if (flaggedQuestions.has(question.id)) {
        flagBtn.innerHTML = '<i class="fas fa-flag"></i> Unflag';
        flagBtn.classList.add('btn-warning');
    } else {
        flagBtn.innerHTML = '<i class="fas fa-flag"></i> Flag for Review';
        flagBtn.classList.remove('btn-warning');
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

function flagQuestion() {
    const question = questions[currentQuestionIndex];
    
    if (flaggedQuestions.has(question.id)) {
        flaggedQuestions.delete(question.id);
    } else {
        flaggedQuestions.add(question.id);
    }
    
    updateQuestionNavigation();
    updateFlagButton();
}

function clearAnswer() {
    const question = questions[currentQuestionIndex];
    delete answers[question.id];
    displayQuestion();
}

function startTimer() {
    examTimer = setInterval(() => {
        timeRemaining--;
        
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Change timer color when time is running low
        const timerEl = document.querySelector('.timer-container');
        if (timeRemaining <= 300) { // 5 minutes
            timerEl.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        } else if (timeRemaining <= 600) { // 10 minutes
            timerEl.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
        }
        
        if (timeRemaining <= 0) {
            clearInterval(examTimer);
            showSuccessModal();
            setTimeout(() => {
                confirmSubmit();
            }, 1000);
        }
    }, 1000);
}

function submitExam() {
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = totalQuestions - answeredCount;
    
    const content = `
        <div style="text-align: center; margin-bottom: 16px;">
            <p><strong>Total Questions:</strong> ${totalQuestions}</p>
            <p><strong>Answered:</strong> ${answeredCount}</p>
            <p><strong>Unanswered:</strong> ${unansweredCount}</p>
        </div>
        <p style="color: #ef4444; font-weight: 500;">Once submitted, you cannot change your answers.</p>
    `;
    
    createModal(
        'submitModal',
        'Submit Exam',
        content,
        `<button class="btn btn-outline" onclick="hideModal('submitModal')">Review Answers</button>
         <button class="btn btn-primary" onclick="confirmSubmit()">Submit Exam</button>`,
        { icon: 'fas fa-paper-plane' }
    );
}

function showFullscreenModal() {
    createModal(
        'fullscreenModal',
        'Fullscreen Required',
        'You must stay in fullscreen mode during the exam. The exam will automatically return to fullscreen in 2 seconds.',
        '<button class="btn btn-primary" onclick="hideModal(\'fullscreenModal\'); forceFullscreen();">Return to Fullscreen</button>',
        { danger: true, icon: 'fas fa-expand' }
    );
}

function showSuccessModal() {
    createModal(
        'successModal',
        'Exam Submitted Successfully',
        'Your exam has been submitted successfully. You will be redirected to the dashboard shortly.',
        '<button class="btn btn-primary" onclick="window.location.href=\'student-dashboard.html\'">Go to Dashboard</button>',
        { icon: 'fas fa-check-circle' }
    );
}

function showLeaveModal() {
    createModal(
        'leaveModal',
        'Leave Exam',
        'Are you sure you want to leave the exam? Your progress will be lost and you cannot retake this exam.',
        `<button class="btn btn-outline" onclick="hideModal('leaveModal')">Stay in Exam</button>
         <button class="btn btn-danger" onclick="confirmLeave()">Leave Exam</button>`,
        { danger: true, icon: 'fas fa-sign-out-alt' }
    );
}

let shouldLeave = false;
function confirmLeave() {
    shouldLeave = true;
    window.location.href = 'student-dashboard.html';
}

async function confirmSubmit() {
    hideModal('submitModal');
    clearInterval(examTimer);
    shouldLeave = true;
    
    try {
        if (!examData || !examData.duration) {
            throw new Error('Exam data is not available');
        }
        
        const submissionData = {
            studentId: currentUser.uid,
            answers: answers,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            timeSpent: (examData.duration * 60) - timeRemaining,
            flaggedQuestions: Array.from(flaggedQuestions),
            suspiciousActivity: suspiciousActivity,
            tabSwitchCount: tabSwitchCount
        };
        
        await db.collection('submissions').doc(currentExamId)
            .collection('students').doc(currentUser.uid).set(submissionData);
        
        showSuccessModal();
        setTimeout(() => {
            window.location.href = 'student-dashboard.html';
        }, 2000);
    } catch (error) {
        console.error('Error submitting exam:', error);
        createModal(
            'errorModal',
            'Submission Error',
            'Error submitting exam: ' + error.message,
            '<button class="btn btn-primary" onclick="hideModal(\'errorModal\')">Try Again</button>',
            { danger: true, icon: 'fas fa-exclamation-circle' }
        );
    }
}

// Auto-save answers periodically
setInterval(() => {
    if (Object.keys(answers).length > 0) {
        localStorage.setItem(`exam_${currentExamId}_answers`, JSON.stringify(answers));
    }
}, 30000); // Save every 30 seconds

// Load saved answers on page load
window.addEventListener('load', () => {
    const savedAnswers = localStorage.getItem(`exam_${currentExamId}_answers`);
    if (savedAnswers) {
        answers = JSON.parse(savedAnswers);
    }
});

// Prevent page refresh/close during exam
window.addEventListener('beforeunload', (e) => {
    if (examTimer && !shouldLeave) {
        e.preventDefault();
        e.returnValue = '';
        setTimeout(() => {
            showLeaveModal();
        }, 100);
        return '';
    }
});

// Handle browser back button
window.addEventListener('popstate', (e) => {
    if (examTimer && !shouldLeave) {
        e.preventDefault();
        showLeaveModal();
        history.pushState(null, null, window.location.pathname);
    }
});

// Push initial state to handle back button
history.pushState(null, null, window.location.pathname);

// Anti-cheat features
function initAntiCheat() {
    // Disable right-click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        logSuspiciousActivity('Right-click attempted');
    });
    
    // Disable copy/paste/cut and screenshot keys
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
            e.preventDefault();
            logSuspiciousActivity(`Keyboard shortcut attempted: Ctrl+${e.key}`);
        }
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
            e.preventDefault();
            logSuspiciousActivity('Developer tools access attempted');
        }
        // Block screenshot keys
        if (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && e.key === 'S') || (e.altKey && e.key === 'PrintScreen')) {
            e.preventDefault();
            logSuspiciousActivity('Screenshot attempt detected');
        }
    });
    
    // Tab switch detection
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            tabSwitchCount++;
            logSuspiciousActivity(`Tab switched away (${tabSwitchCount} times)`);
            if (tabSwitchCount >= 3) {
                showRefreshModal();
            }
        }
    });
    
    // Request fullscreen
    requestFullScreen();
    
    // Monitor fullscreen changes
    const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    
    fullscreenEvents.forEach(event => {
        document.addEventListener(event, () => {
            const isInFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
            
            if (!isInFullscreen) {
                isFullScreen = false;
                logSuspiciousActivity('Exited fullscreen mode');
                
                setTimeout(() => {
                    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement) {
                        showFullscreenModal();
                        setTimeout(() => {
                            requestFullScreen();
                        }, 2000);
                    }
                }, 500);
            } else {
                isFullScreen = true;
            }
        });
    });
    
    // Periodic fullscreen check
    setInterval(() => {
        const isInFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (!isInFullscreen && examTimer) {
            logSuspiciousActivity('Not in fullscreen mode detected');
            requestFullScreen();
        }
    }, 5000);
    
    // Detect page refresh
    if (performance.navigation.type === 1) {
        logSuspiciousActivity('Page refresh detected');
        setTimeout(() => showRefreshModal(), 1000);
    }
}

function requestFullScreen() {
    forceFullscreen();
}

function logSuspiciousActivity(activity) {
    const timestamp = new Date().toISOString();
    suspiciousActivity.push({ activity, timestamp });
    console.warn('Suspicious activity detected:', activity);
}

function cancelExam() {
    showLeaveModal();
}

function showRefreshModal() {
    createModal(
        'refreshModal',
        'Suspicious Activity Detected',
        'Multiple tab switches or page refreshes detected. Please stay focused on the exam. Continued violations may result in automatic submission.',
        '<button class="btn btn-primary" onclick="hideModal(\'refreshModal\')">Continue Exam</button>',
        { danger: true, icon: 'fas fa-exclamation-triangle' }
    );
}

function enterSecureMode() {
    document.getElementById('fullscreenPrep').style.display = 'none';
    document.getElementById('examInterface').classList.remove('hidden');
    
    setTimeout(() => {
        forceFullscreen();
        initAntiCheat();
        startTimer();
        displayQuestion();
    }, 500);
}

// Initialize exam data when page loads
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadExam();
        await loadQuestions();
        // Show preparation screen - don't start exam automatically
    } else {
        window.location.href = 'index.html';
    }
});

function forceFullscreen() {
    const elem = document.documentElement;
    
    const fullscreenPromise = elem.requestFullscreen ? 
        elem.requestFullscreen({ navigationUI: "hide" }) :
        elem.webkitRequestFullscreen ? 
        elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT) :
        elem.mozRequestFullScreen ? 
        elem.mozRequestFullScreen() :
        elem.msRequestFullscreen ? 
        elem.msRequestFullscreen() : null;
    
    if (fullscreenPromise) {
        fullscreenPromise.catch(() => {
            setTimeout(() => forceFullscreen(), 1000);
        });
    }
}

// Clear saved answers after submission
window.addEventListener('unload', () => {
    if (!examTimer) { // Only clear if exam was submitted
        localStorage.removeItem(`exam_${currentExamId}_answers`);
    }
});

