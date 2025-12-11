// Authentication functions
function showLogin() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function showRegister() {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
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
            alert('User data not found');
        }
    } catch (error) {
        alert('Login failed: ' + error.message);
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
        alert('Registration failed: ' + error.message);
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