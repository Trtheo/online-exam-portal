// Toast notification functions
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 4000);
}

// Authentication functions
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showRegister() {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('forgotForm').classList.add('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

function showForgotPassword() {
    document.getElementById('forgotForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Login form handler
document.getElementById('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (userData && userData.role) {
            localStorage.setItem('userRole', userData.role);
            redirectToDashboard(userData.role);
        } else {
            showToast('User data not found', 'error');
        }
    } catch (error) {
        showToast('Login failed: ' + error.message, 'error');
    }
});

// Register form handler
document.getElementById('register').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const role = 'student';
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        localStorage.setItem('userRole', role);
        redirectToDashboard(role);
    } catch (error) {
        showToast('Registration failed: ' + error.message, 'error');
    }
});

function redirectToDashboard(role) {
    if (role === 'teacher') {
        window.location.href = 'teacher-dashboard.html';
    } else {
        window.location.href = 'student-dashboard.html';
    }
}

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
    if (user && window.location.pathname === '/index.html') {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        if (userData) {
            redirectToDashboard(userData.role);
        }
    }
});

function logout() {
    document.getElementById('logoutModal').classList.remove('hidden');
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

// Forgot password form handler
document.getElementById('forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value;
    
    const actionCodeSettings = {
        url: window.location.origin + '/index.html',
        handleCodeInApp: false
    };
    
    try {
        await auth.sendPasswordResetEmail(email, actionCodeSettings);
        showToast('Password reset email sent! Check your inbox.');
        showLogin();
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
});