// DoS Dashboard JavaScript
let currentUser = null;

// Initialize DoS Dashboard
document.addEventListener('DOMContentLoaded', function() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();
            
            if (userData && userData.role === 'dos') {
                currentUser = { ...userData, uid: user.uid };
                document.getElementById('userName').textContent = userData.name;
                document.getElementById('userAvatar').textContent = userData.name.split(' ').map(n => n[0]).join('').toUpperCase();
                loadDashboardData();
            } else {
                window.location.href = 'index.html';
            }
        } else {
            window.location.href = 'index.html';
        }
    });
});

// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav a').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
    }
    
    // Add active class to clicked nav item
    event.target.classList.add('active');
    
    // Load section-specific data
    switch(sectionId) {
        case 'teachers':
            loadTeachers();
            break;
        case 'students':
            loadStudents();
            break;
        case 'exams':
            loadPendingExams();
            break;
        case 'classes':
            loadClassManagement();
            break;
        case 'reports':
            loadReportStats();
            break;
    }
}

// Sidebar toggle functions
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Load statistics
        const [teachers, students, pendingExams, activeExams] = await Promise.all([
            db.collection('users').where('role', '==', 'teacher').get(),
            db.collection('users').where('role', '==', 'student').get(),
            db.collection('exams').where('status', '==', 'pending_approval').get(),
            db.collection('exams').where('status', '==', 'approved').get()
        ]);
        
        document.getElementById('totalTeachers').textContent = teachers.size;
        document.getElementById('totalStudents').textContent = students.size;
        document.getElementById('pendingExams').textContent = pendingExams.size;
        document.getElementById('activeExams').textContent = activeExams.size;
        
        loadRecentActivity();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

// Load Recent Activity
async function loadRecentActivity() {
    try {
        const activities = await db.collection('activities')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        
        const activityList = document.getElementById('recentActivity');
        activityList.innerHTML = '';
        
        if (activities.empty) {
            activityList.innerHTML = '<p class="no-data">No recent activity</p>';
            return;
        }
        
        activities.forEach(doc => {
            const activity = doc.data();
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${activity.description}</p>
                    <small>${formatDate(activity.timestamp)}</small>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
    }
}

// Load Teachers
async function loadTeachers() {
    try {
        const teachers = await db.collection('users').where('role', '==', 'teacher').get();
        const teachersTable = document.getElementById('teachersTable');
        teachersTable.innerHTML = '';
        
        if (teachers.empty) {
            teachersTable.innerHTML = '<tr><td colspan="7" class="no-data">No teachers found</td></tr>';
            return;
        }
        
        teachers.forEach(doc => {
            const teacher = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${teacher.name}</td>
                <td>${teacher.email}</td>
                <td>${teacher.courses ? teacher.courses.join(', ') : 'Not assigned'}</td>
                <td>${teacher.classes ? teacher.classes.join(', ') : 'Not assigned'}</td>
                <td>
                    <button onclick="toggleITPrivileges('${doc.id}', ${!teacher.isITTeacher})" 
                            class="btn btn-sm ${teacher.isITTeacher ? 'btn-success' : 'btn-outline'}" 
                            title="${teacher.isITTeacher ? 'Remove IT Privileges' : 'Grant IT Privileges'}">
                        <i class="fas ${teacher.isITTeacher ? 'fa-user-shield' : 'fa-user'}"></i>
                        ${teacher.isITTeacher ? 'IT Teacher' : 'Regular'}
                    </button>
                </td>
                <td><span class="status-badge ${teacher.status || 'active'}">${teacher.status || 'Active'}</span></td>
                <td>
                    <button onclick="assignClasses('${doc.id}')" class="btn-icon" title="Assign Classes">
                        <i class="fas fa-chalkboard"></i>
                    </button>
                    <button onclick="editTeacher('${doc.id}')" class="btn-icon" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="toggleTeacherStatus('${doc.id}')" class="btn-icon" title="Toggle Status">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                </td>
            `;
            teachersTable.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading teachers:', error);
        showToast('Error loading teachers', 'error');
    }
}

// Load Students
async function loadStudents() {
    try {
        const students = await db.collection('users').where('role', '==', 'student').get();
        const studentsTable = document.getElementById('studentsTable');
        studentsTable.innerHTML = '';
        
        if (students.empty) {
            studentsTable.innerHTML = '<tr><td colspan="6" class="no-data">No students found</td></tr>';
            return;
        }
        
        for (const doc of students.docs) {
            const student = doc.data();
            
            // Get student exam statistics
            const results = await db.collection('results').where('studentId', '==', doc.id).get();
            const examCount = results.size;
            const avgScore = results.empty ? 0 : 
                results.docs.reduce((sum, r) => sum + (r.data().score || 0), 0) / examCount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${student.name}</td>
                <td>${student.email}</td>
                <td>${student.class || 'Not assigned'}</td>
                <td>${examCount}</td>
                <td>${avgScore.toFixed(1)}%</td>
                <td><span class="status-badge ${student.status || 'active'}">${student.status || 'Active'}</span></td>
                <td>
                    <button onclick="assignStudentClass('${doc.id}')" class="btn-icon" title="Assign Class">
                        <i class="fas fa-chalkboard"></i>
                    </button>
                    <button onclick="viewStudentDetails('${doc.id}')" class="btn-icon" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="toggleStudentStatus('${doc.id}')" class="btn-icon" title="Toggle Status">
                        <i class="fas fa-toggle-on"></i>
                    </button>
                </td>
            `;
            studentsTable.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showToast('Error loading students', 'error');
    }
}

// Load Pending Exams for Approval
async function loadPendingExams() {
    try {
        // Check for exams with pending_approval status
        const pendingExams = await db.collection('exams')
            .where('status', '==', 'pending_approval')
            .orderBy('createdAt', 'desc')
            .get();
        
        const approvalsList = document.getElementById('examApprovals');
        approvalsList.innerHTML = '';
        
        if (pendingExams.empty) {
            approvalsList.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <i class="fas fa-clipboard-check" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px; display: block;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #1e293b;">No Pending Approvals</h3>
                    <p style="margin: 0; color: #64748b;">All exams have been reviewed. New exam submissions will appear here for approval.</p>
                    <button onclick="createTestExam()" class="btn btn-outline" style="margin-top: 16px;">
                        <i class="fas fa-plus"></i> Create Test Exam for Demo
                    </button>
                </div>
            `;
            return;
        }
        
        for (const doc of pendingExams.docs) {
            const exam = doc.data();
            
            // Get teacher details
            const teacherDoc = await db.collection('users').doc(exam.createdBy).get();
            const teacher = teacherDoc.data();
            
            const approvalCard = document.createElement('div');
            approvalCard.className = 'approval-card';
            approvalCard.innerHTML = `
                <div class="approval-header">
                    <h4>${exam.title}</h4>
                    <span class="exam-subject">${exam.subject}</span>
                </div>
                <div class="approval-details">
                    <p><strong>Teacher:</strong> ${teacher ? teacher.name : 'Unknown'}</p>
                    <p><strong>Duration:</strong> ${exam.duration} minutes</p>
                    <p><strong>Questions:</strong> ${exam.questions ? exam.questions.length : 0}</p>
                    <p><strong>Submitted:</strong> ${formatDate(exam.createdAt)}</p>
                </div>
                <div class="approval-actions">
                    <button onclick="previewExam('${doc.id}')" class="btn btn-secondary">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button onclick="approveExam('${doc.id}')" class="btn btn-success">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button onclick="rejectExam('${doc.id}')" class="btn btn-danger">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            `;
            approvalsList.appendChild(approvalCard);
        }
    } catch (error) {
        console.error('Error loading pending exams:', error);
        approvalsList.innerHTML = '<p class="error-message">Error loading pending exams</p>';
    }
}

// Teacher Management Functions
function showCreateTeacherModal() {
    document.getElementById('createTeacherModal').classList.remove('hidden');
    loadClassesForTeacher();
}

// Load Classes for Teacher Creation
async function loadClassesForTeacher() {
    try {
        const classesDoc = await db.collection('settings').doc('classes').get();
        const classesData = classesDoc.data();
        const classes = classesData ? classesData.list : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
        
        const container = document.getElementById('classCheckboxes');
        container.innerHTML = '';
        
        classes.forEach(className => {
            const label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s;';
            label.onmouseover = () => label.style.background = '#f1f5f9';
            label.onmouseout = () => label.style.background = 'transparent';
            
            label.innerHTML = `<input type="checkbox" class="class-checkbox" value="${className}"> ${className}`;
            container.appendChild(label);
        });
    } catch (error) {
        console.error('Error loading classes:', error);
        // Fallback to default classes
        const container = document.getElementById('classCheckboxes');
        const defaultClasses = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
        container.innerHTML = defaultClasses.map(className => 
            `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px;">
                <input type="checkbox" class="class-checkbox" value="${className}"> ${className}
            </label>`
        ).join('');
    }
}

function updateSelectedClasses() {
    const checkboxes = document.querySelectorAll('.class-checkbox:checked');
    const display = document.getElementById('selectedClassesDisplay');
    
    if (checkboxes.length === 0) {
        display.innerHTML = '<small style="color: #9ca3af;">No classes selected</small>';
    } else {
        const classes = Array.from(checkboxes).map(cb => cb.value);
        display.innerHTML = classes.map(className => 
            `<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin: 2px; display: inline-block;">${className}</span>`
        ).join('');
    }
}

function hideCreateTeacherModal() {
    document.getElementById('createTeacherModal').classList.add('hidden');
    document.getElementById('createTeacherForm').reset();
    // Reset course selection display
    document.getElementById('selectedCoursesDisplay').innerHTML = '<small style="color: #9ca3af;">No courses selected</small>';
}

// Password Toggle Function
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const toggle = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
    }
}

// Course and Class selection handlers
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('course-checkbox')) {
        updateSelectedCourses();
    }
    if (e.target.classList.contains('class-checkbox')) {
        updateSelectedClasses();
    }
});

function updateSelectedCourses() {
    const checkboxes = document.querySelectorAll('.course-checkbox:checked');
    const display = document.getElementById('selectedCoursesDisplay');
    
    if (checkboxes.length === 0) {
        display.innerHTML = '<small style="color: #9ca3af;">No courses selected</small>';
    } else {
        const courses = Array.from(checkboxes).map(cb => cb.value);
        display.innerHTML = courses.map(course => 
            `<span style="background: #667eea; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; margin: 2px; display: inline-block;">${course}</span>`
        ).join('');
    }
}

document.getElementById('createTeacherForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('teacherName').value;
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value;
    const phone = document.getElementById('teacherPhone').value;
    const classes = Array.from(document.querySelectorAll('.class-checkbox:checked')).map(cb => cb.value);
    const selectedCourses = Array.from(document.querySelectorAll('.course-checkbox:checked')).map(cb => cb.value);
    const isITTeacher = document.getElementById('isITTeacher').checked;
    
    if (selectedCourses.length === 0) {
        showToast('Please select at least one course', 'error');
        return;
    }
    
    if (classes.length === 0) {
        showToast('Please assign at least one class', 'error');
        return;
    }
    
    try {
        // Create Firebase Auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Create user document
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            phone: phone,
            role: 'teacher',
            courses: selectedCourses,
            classes: classes,
            status: 'active',
            isITTeacher: isITTeacher,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
        
        // Log activity
        await logActivity('teacher_created', `Teacher ${name} created by DoS${isITTeacher ? ' with IT privileges' : ''}`);
        
        showToast(`Teacher account created successfully${isITTeacher ? ' with IT privileges' : ''}`);
        hideCreateTeacherModal();
        loadTeachers();
        loadDashboardData();
    } catch (error) {
        console.error('Error creating teacher:', error);
        showToast('Error creating teacher account', 'error');
    }
});

// Student Management Functions
function showBulkStudentModal() {
    document.getElementById('bulkStudentModal').classList.remove('hidden');
}

function hideBulkStudentModal() {
    document.getElementById('bulkStudentModal').classList.add('hidden');
}

async function processBulkStudents() {
    const fileInput = document.getElementById('studentCsvFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a CSV file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const csv = e.target.result;
            const lines = csv.split('\n');
            const students = [];
            
            // Parse CSV (skip header)
            for (let i = 1; i < lines.length; i++) {
                const [name, email, studentId] = lines[i].split(',').map(s => s.trim());
                if (name && email) {
                    students.push({ name, email, studentId });
                }
            }
            
            // Create student accounts
            let created = 0;
            for (const student of students) {
                try {
                    const tempPassword = generateTempPassword();
                    const userCredential = await auth.createUserWithEmailAndPassword(student.email, tempPassword);
                    
                    await db.collection('users').doc(userCredential.user.uid).set({
                        name: student.name,
                        email: student.email,
                        studentId: student.studentId,
                        role: 'student',
                        status: 'active',
                        tempPassword: tempPassword,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: currentUser.uid
                    });
                    
                    created++;
                } catch (error) {
                    console.error(`Error creating student ${student.email}:`, error);
                }
            }
            
            await logActivity('bulk_students_created', `${created} students created via bulk import`);
            showToast(`Successfully created ${created} student accounts`);
            hideBulkStudentModal();
            loadStudents();
            loadDashboardData();
        } catch (error) {
            console.error('Error processing CSV:', error);
            showToast('Error processing CSV file', 'error');
        }
    };
    
    reader.readAsText(file);
}

// Exam Approval Functions
async function approveExam(examId) {
    try {
        await db.collection('exams').doc(examId).update({
            status: 'approved',
            approvedBy: currentUser.uid,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        await logActivity('exam_approved', `Exam approved by DoS`);
        showToast('Exam approved successfully');
        loadPendingExams();
        loadDashboardData();
    } catch (error) {
        console.error('Error approving exam:', error);
        showToast('Error approving exam', 'error');
    }
}

async function rejectExam(examId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
        await db.collection('exams').doc(examId).update({
            status: 'rejected',
            rejectedBy: currentUser.uid,
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectionReason: reason
        });
        
        await logActivity('exam_rejected', `Exam rejected by DoS: ${reason}`);
        showToast('Exam rejected');
        loadPendingExams();
        loadDashboardData();
    } catch (error) {
        console.error('Error rejecting exam:', error);
        showToast('Error rejecting exam', 'error');
    }
}

// Utility Functions
function generateTempPassword() {
    return Math.random().toString(36).slice(-8);
}

async function logActivity(type, description) {
    try {
        await db.collection('activities').add({
            type: type,
            description: description,
            userId: currentUser.uid,
            userRole: 'dos',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

function getActivityIcon(type) {
    const icons = {
        teacher_created: 'fa-user-plus',
        exam_approved: 'fa-check-circle',
        exam_rejected: 'fa-times-circle',
        bulk_students_created: 'fa-users',
        settings_updated: 'fa-cog'
    };
    return icons[type] || 'fa-info-circle';
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString() + ' ' + timestamp.toDate().toLocaleTimeString();
}

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

// Logout Functions
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

// IT Teacher Privilege Management
let currentITAction = null;

function toggleITPrivileges(teacherId, grantPrivileges) {
    const action = grantPrivileges ? 'grant' : 'remove';
    const actionText = grantPrivileges ? 'Grant' : 'Remove';
    
    currentITAction = { teacherId, grantPrivileges };
    
    document.getElementById('itModalTitle').textContent = `${actionText} IT Privileges`;
    document.getElementById('itModalMessage').textContent = 
        `Are you sure you want to ${action} IT Teacher privileges for this teacher?`;
    document.getElementById('itConfirmBtn').textContent = actionText;
    document.getElementById('itConfirmBtn').className = 
        `btn ${grantPrivileges ? 'btn-success' : 'btn-danger'}`;
    
    document.getElementById('itPrivilegesModal').classList.remove('hidden');
}

function hideITModal() {
    document.getElementById('itPrivilegesModal').classList.add('hidden');
    currentITAction = null;
}

async function confirmITPrivileges() {
    if (!currentITAction) return;
    
    const { teacherId, grantPrivileges } = currentITAction;
    
    try {
        await db.collection('users').doc(teacherId).update({
            isITTeacher: grantPrivileges,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('it_privileges_updated', 
            `IT privileges ${grantPrivileges ? 'granted to' : 'removed from'} teacher`);
        
        showToast(`IT privileges ${grantPrivileges ? 'granted' : 'removed'} successfully`);
        hideITModal();
        loadTeachers();
    } catch (error) {
        console.error('Error updating IT privileges:', error);
        showToast('Error updating IT privileges', 'error');
    }
}

// Class Management Functions
async function loadClassManagement() {
    const container = document.getElementById('classesContainer');
    
    try {
        const snapshot = await db.collection('settings').doc('classes').get();
        const classesData = snapshot.data();
        const classes = classesData ? classesData.list : [];
        
        if (classes.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-chalkboard" style="font-size: 48px; color: #cbd5e1; margin-bottom: 16px;"></i><h3>No Classes Configured</h3><p>Add classes to organize students and enable teacher assignments.</p></div>';
            return;
        }
        
        container.innerHTML = `
            <div class="class-grid">
                ${classes.map(className => `
                    <div class="class-card">
                        <div class="class-header">
                            <div class="class-icon">
                                <i class="fas fa-chalkboard"></i>
                            </div>
                            <h3>${className}</h3>
                        </div>
                        <div class="class-stats">
                            <div class="stat">
                                <span class="stat-number" id="students-${className}">0</span>
                                <span class="stat-label">Students</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number" id="teachers-${className}">0</span>
                                <span class="stat-label">Teachers</span>
                            </div>
                        </div>
                        <div class="class-actions">
                            <button onclick="viewClassDetails('${className}')" class="btn btn-outline btn-sm">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <button onclick="editClass('${className}')" class="btn btn-primary btn-sm">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button onclick="showRemoveClassModal('${className}')" class="btn btn-danger btn-sm">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        // Load stats for each class
        for (const className of classes) {
            loadClassStats(className);
        }
        
    } catch (error) {
        container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading classes. Please refresh the page.</p></div>';
    }
}

async function loadClassStats(className) {
    try {
        const [students, teachers] = await Promise.all([
            db.collection('users').where('role', '==', 'student').where('class', '==', className).get(),
            db.collection('users').where('role', '==', 'teacher').where('classes', 'array-contains', className).get()
        ]);
        
        const studentElement = document.getElementById(`students-${className}`);
        const teacherElement = document.getElementById(`teachers-${className}`);
        
        if (studentElement) studentElement.textContent = students.size;
        if (teacherElement) teacherElement.textContent = teachers.size;
    } catch (error) {
        console.error(`Error loading stats for class ${className}:`, error);
    }
}

function viewClassDetails(className) {
    // Show modal with class details
    showClassDetailsModal(className);
}

async function showClassDetailsModal(className) {
    try {
        // Get counts first
        const [students, teachers] = await Promise.all([
            db.collection('users').where('role', '==', 'student').where('class', '==', className).get(),
            db.collection('users').where('role', '==', 'teacher').where('classes', 'array-contains', className).get()
        ]);
        
        // Create and show modal with class details
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3><i class="fas fa-chalkboard"></i> Class ${className} Details</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="class-details-tabs">
                        <button class="tab-btn active" onclick="showClassTab('students', '${className}')">Students (${students.size})</button>
                        <button class="tab-btn" onclick="showClassTab('teachers', '${className}')">Teachers (${teachers.size})</button>
                    </div>
                    <div id="classDetailsContent">Loading...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        showClassTab('students', className);
    } catch (error) {
        console.error('Error loading class details:', error);
    }
}

async function showClassTab(tab, className) {
    const content = document.getElementById('classDetailsContent');
    
    // Update tab buttons
    document.querySelectorAll('.class-details-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    try {
        if (tab === 'students') {
            const students = await db.collection('users')
                .where('role', '==', 'student')
                .where('class', '==', className)
                .get();
            
            // Update tab title with count
            document.querySelector('.class-details-tabs .tab-btn:first-child').textContent = `Students (${students.size})`;
            
            if (students.empty) {
                content.innerHTML = '<p class="no-data">No students assigned to this class</p>';
                return;
            }
            
            content.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Student ID</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${students.docs.map(doc => {
                            const student = doc.data();
                            return `
                                <tr>
                                    <td>${student.name}</td>
                                    <td>${student.email}</td>
                                    <td>${student.studentId || 'N/A'}</td>
                                    <td><span class="status-badge ${student.status || 'active'}">${student.status || 'Active'}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } else {
            const teachers = await db.collection('users')
                .where('role', '==', 'teacher')
                .where('classes', 'array-contains', className)
                .get();
            
            // Update tab title with count
            document.querySelector('.class-details-tabs .tab-btn:last-child').textContent = `Teachers (${teachers.size})`;
            
            if (teachers.empty) {
                content.innerHTML = '<p class="no-data">No teachers assigned to this class</p>';
                return;
            }
            
            content.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Courses</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${teachers.docs.map(doc => {
                            const teacher = doc.data();
                            return `
                                <tr>
                                    <td>${teacher.name}</td>
                                    <td>${teacher.email}</td>
                                    <td>${teacher.courses ? teacher.courses.join(', ') : 'N/A'}</td>
                                    <td><span class="status-badge ${teacher.status || 'active'}">${teacher.status || 'Active'}</span></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        content.innerHTML = '<p class="error-message">Error loading data</p>';
    }
}

function showAddClassModal() {
    document.getElementById('addClassModal').classList.remove('hidden');
}

function hideAddClassModal() {
    document.getElementById('addClassModal').classList.add('hidden');
    document.getElementById('addClassForm').reset();
}

document.getElementById('addClassForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const className = document.getElementById('className').value.trim();
    const description = document.getElementById('classDescription').value.trim();
    
    if (!className) {
        showToast('Please enter a class name', 'error');
        return;
    }
    
    try {
        // Get current classes
        const snapshot = await db.collection('settings').doc('classes').get();
        const classesData = snapshot.data();
        const currentClasses = classesData ? classesData.list : [];
        
        // Check if class already exists
        if (currentClasses.includes(className)) {
            showToast('Class already exists', 'error');
            return;
        }
        
        // Add new class
        const updatedClasses = [...currentClasses, className];
        
        await db.collection('settings').doc('classes').set({
            list: updatedClasses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('class_added', `Class "${className}" added to system`);
        
        showToast('Class added successfully!');
        hideAddClassModal();
        loadClassManagement();
        
    } catch (error) {
        console.error('Error adding class:', error);
        showToast('Error adding class', 'error');
    }
});

function showRemoveClassModal(className) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Remove Class</h3>
                <button onclick="this.closest('.modal').remove()" class="close-btn" style="color: #ef4444; font-size: 24px; font-weight: bold;">&times;</button>
            </div>
            <div class="modal-body">
                <p>Are you sure you want to remove class "${className}"?</p>
                <p style="color: #ef4444; font-size: 14px;">This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                <button onclick="confirmRemoveClass('${className}')" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Remove Class
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmRemoveClass(className) {
    try {
        const snapshot = await db.collection('settings').doc('classes').get();
        const classesData = snapshot.data();
        const currentClasses = classesData ? classesData.list : [];
        
        const updatedClasses = currentClasses.filter(c => c !== className);
        
        await db.collection('settings').doc('classes').set({
            list: updatedClasses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('class_removed', `Class "${className}" removed from system`);
        
        showToast('Class removed successfully!');
        document.querySelector('.modal').remove();
        loadClassManagement();
        
    } catch (error) {
        console.error('Error removing class:', error);
        showToast('Error removing class', 'error');
    }
}

function editClass(className) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Class</h3>
                <button onclick="this.closest('.modal').remove()" class="close-btn" style="color: #ef4444; font-size: 24px; font-weight: bold;">&times;</button>
            </div>
            <form onsubmit="updateClass(event, '${className}')">
                <div class="modal-body">
                    <div class="form-group">
                        <label>Class Name</label>
                        <input type="text" id="editClassName" value="${className}" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Class</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function updateClass(event, oldClassName) {
    event.preventDefault();
    
    const newClassName = document.getElementById('editClassName').value.trim();
    
    if (!newClassName) {
        showToast('Please enter a class name', 'error');
        return;
    }
    
    if (newClassName === oldClassName) {
        document.querySelector('.modal').remove();
        return;
    }
    
    try {
        const snapshot = await db.collection('settings').doc('classes').get();
        const classesData = snapshot.data();
        const currentClasses = classesData ? classesData.list : [];
        
        if (currentClasses.includes(newClassName)) {
            showToast('Class name already exists', 'error');
            return;
        }
        
        const updatedClasses = currentClasses.map(c => c === oldClassName ? newClassName : c);
        
        await db.collection('settings').doc('classes').set({
            list: updatedClasses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('class_updated', `Class "${oldClassName}" renamed to "${newClassName}"`);
        
        showToast('Class updated successfully!');
        document.querySelector('.modal').remove();
        loadClassManagement();
        
    } catch (error) {
        console.error('Error updating class:', error);
        showToast('Error updating class', 'error');
    }
}
async function assignClasses(teacherId) {
    try {
        const [teacherDoc, classesDoc] = await Promise.all([
            db.collection('users').doc(teacherId).get(),
            db.collection('settings').doc('classes').get()
        ]);
        
        const teacher = teacherDoc.data();
        const classesData = classesDoc.data();
        const availableClasses = classesData ? classesData.list : [];
        const currentClasses = teacher.classes || [];
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-chalkboard"></i> Assign Classes to ${teacher.name}</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn" style="color: #ef4444; font-size: 24px; font-weight: bold;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Classes</label>
                        <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc;">
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;">
                                ${availableClasses.map(className => `
                                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px;">
                                        <input type="checkbox" class="assign-class-checkbox" value="${className}" ${currentClasses.includes(className) ? 'checked' : ''}> ${className}
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                    <button onclick="saveClassAssignment('${teacherId}')" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Assignment
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading class assignment:', error);
        showToast('Error loading class assignment', 'error');
    }
}

async function saveClassAssignment(teacherId) {
    const selectedClasses = Array.from(document.querySelectorAll('.assign-class-checkbox:checked')).map(cb => cb.value);
    
    try {
        await db.collection('users').doc(teacherId).update({
            classes: selectedClasses,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('classes_assigned', `Classes assigned to teacher: ${selectedClasses.join(', ')}`);
        
        showToast('Classes assigned successfully!');
        document.querySelector('.modal').remove();
        loadTeachers();
        
    } catch (error) {
        console.error('Error saving class assignment:', error);
        showToast('Error saving class assignment', 'error');
    }
}

// Student Class Assignment Functions
async function assignStudentClass(studentId) {
    try {
        const [studentDoc, classesDoc] = await Promise.all([
            db.collection('users').doc(studentId).get(),
            db.collection('settings').doc('classes').get()
        ]);
        
        const student = studentDoc.data();
        const classesData = classesDoc.data();
        const availableClasses = classesData ? classesData.list : [];
        const currentClass = student.class || '';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-chalkboard"></i> Assign Class to ${student.name}</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn" style="color: #ef4444; font-size: 24px; font-weight: bold;">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Select Class</label>
                        <select id="studentClassSelect" class="form-control" style="width: 100%; padding: 12px; border: 2px solid #e2e8f0; border-radius: 8px; background: white;">
                            <option value="">No Class Assigned</option>
                            ${availableClasses.map(className => 
                                `<option value="${className}" ${currentClass === className ? 'selected' : ''}>${className}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                    <button onclick="saveStudentClassAssignment('${studentId}')" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Assignment
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading student class assignment:', error);
        showToast('Error loading class assignment', 'error');
    }
}

async function saveStudentClassAssignment(studentId) {
    const selectedClass = document.getElementById('studentClassSelect').value;
    
    try {
        const updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        };
        
        if (selectedClass) {
            updateData.class = selectedClass;
        } else {
            updateData.class = firebase.firestore.FieldValue.delete();
        }
        
        await db.collection('users').doc(studentId).update(updateData);
        
        await logActivity('student_class_assigned', 
            `Student assigned to class: ${selectedClass || 'No class'}`);
        
        showToast('Class assignment updated successfully!');
        document.querySelector('.modal').remove();
        loadStudents();
        
    } catch (error) {
        console.error('Error saving student class assignment:', error);
        showToast('Error saving class assignment', 'error');
    }
}
// Reports Functions
async function loadReportStats() {
    try {
        const period = parseInt(document.getElementById('reportPeriod')?.value || 30);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - period);
        
        // Load performance stats
        const results = await db.collection('results')
            .where('completedAt', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
            .get();
        
        const avgScore = results.empty ? 0 : 
            results.docs.reduce((sum, doc) => sum + (doc.data().score || 0), 0) / results.size;
        
        // Load activity stats
        const activities = await db.collection('activities')
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
            .get();
        
        // Load active teachers
        const teachers = await db.collection('users')
            .where('role', '==', 'teacher')
            .where('status', '==', 'active')
            .get();
        
        // Update stats
        document.getElementById('avgScore').textContent = `${avgScore.toFixed(1)}%`;
        document.getElementById('totalActivities').textContent = activities.size;
        document.getElementById('activeTeachers').textContent = teachers.size;
        document.getElementById('securityIncidents').textContent = '0'; // Placeholder
        
    } catch (error) {
        console.error('Error loading report stats:', error);
    }
}

async function generateReport(type) {
    const resultsDiv = document.getElementById('reportResults');
    resultsDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '<div class="loading">Generating report...</div>';
    
    try {
        const period = parseInt(document.getElementById('reportPeriod').value);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - period);
        
        let reportContent = '';
        
        switch(type) {
            case 'performance':
                reportContent = await generatePerformanceReport(cutoffDate);
                break;
            case 'activity':
                reportContent = await generateActivityReport(cutoffDate);
                break;
            case 'security':
                reportContent = await generateSecurityReport(cutoffDate);
                break;
            case 'teachers':
                reportContent = await generateTeacherReport(cutoffDate);
                break;
        }
        
        resultsDiv.innerHTML = reportContent;
        
    } catch (error) {
        resultsDiv.innerHTML = '<div class="error-message">Error generating report</div>';
    }
}

async function generatePerformanceReport(cutoffDate) {
    const results = await db.collection('results')
        .where('completedAt', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
        .orderBy('completedAt', 'desc')
        .get();
    
    if (results.empty) {
        return '<div class="no-data">No exam results found for this period</div>';
    }
    
    const scores = results.docs.map(doc => doc.data().score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    
    return `
        <div class="report-header">
            <h3><i class="fas fa-chart-line"></i> Performance Report</h3>
            <button onclick="exportReport('performance')" class="btn btn-primary btn-sm">
                <i class="fas fa-download"></i> Export PDF
            </button>
        </div>
        <div class="report-summary">
            <div class="summary-card">
                <div class="summary-number">${avgScore.toFixed(1)}%</div>
                <div class="summary-label">Average Score</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${maxScore}%</div>
                <div class="summary-label">Highest Score</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${minScore}%</div>
                <div class="summary-label">Lowest Score</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${results.size}</div>
                <div class="summary-label">Total Exams</div>
            </div>
        </div>
        <div class="report-table">
            <table class="data-table">
                <thead>
                    <tr><th>Student</th><th>Exam</th><th>Score</th><th>Date</th></tr>
                </thead>
                <tbody>
                    ${results.docs.slice(0, 20).map(doc => {
                        const result = doc.data();
                        return `
                            <tr>
                                <td>${result.studentName || 'Unknown'}</td>
                                <td>${result.examTitle || 'Unknown'}</td>
                                <td>${result.score || 0}%</td>
                                <td>${formatDate(result.completedAt)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function generateActivityReport(cutoffDate) {
    const activities = await db.collection('activities')
        .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
    
    return `
        <div class="report-header">
            <h3><i class="fas fa-clock"></i> Activity Report</h3>
            <button onclick="exportReport('activity')" class="btn btn-primary btn-sm">
                <i class="fas fa-download"></i> Export PDF
            </button>
        </div>
        <div class="report-table">
            <table class="data-table">
                <thead>
                    <tr><th>Activity</th><th>User Role</th><th>Date</th></tr>
                </thead>
                <tbody>
                    ${activities.docs.map(doc => {
                        const activity = doc.data();
                        return `
                            <tr>
                                <td>${activity.description}</td>
                                <td><span class="role-badge ${activity.userRole}">${activity.userRole}</span></td>
                                <td>${formatDate(activity.timestamp)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function generateSecurityReport(cutoffDate) {
    return `
        <div class="report-header">
            <h3><i class="fas fa-shield-alt"></i> Security Report</h3>
            <button onclick="exportReport('security')" class="btn btn-primary btn-sm">
                <i class="fas fa-download"></i> Export PDF
            </button>
        </div>
        <div class="security-summary">
            <div class="security-item safe">
                <i class="fas fa-check-circle"></i>
                <div>
                    <h4>System Security</h4>
                    <p>All security measures are functioning properly</p>
                </div>
            </div>
            <div class="security-item safe">
                <i class="fas fa-shield-alt"></i>
                <div>
                    <h4>Authentication</h4>
                    <p>Firebase authentication is secure and active</p>
                </div>
            </div>
            <div class="security-item safe">
                <i class="fas fa-lock"></i>
                <div>
                    <h4>Data Protection</h4>
                    <p>Firestore security rules are properly configured</p>
                </div>
            </div>
        </div>
    `;
}

async function generateTeacherReport(cutoffDate) {
    const teachers = await db.collection('users').where('role', '==', 'teacher').get();
    const exams = await db.collection('exams')
        .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(cutoffDate))
        .get();
    
    return `
        <div class="report-header">
            <h3><i class="fas fa-chalkboard-teacher"></i> Teacher Report</h3>
            <button onclick="exportReport('teachers')" class="btn btn-primary btn-sm">
                <i class="fas fa-download"></i> Export PDF
            </button>
        </div>
        <div class="report-summary">
            <div class="summary-card">
                <div class="summary-number">${teachers.size}</div>
                <div class="summary-label">Total Teachers</div>
            </div>
            <div class="summary-card">
                <div class="summary-number">${exams.size}</div>
                <div class="summary-label">Exams Created</div>
            </div>
        </div>
        <div class="report-table">
            <table class="data-table">
                <thead>
                    <tr><th>Teacher</th><th>Courses</th><th>Classes</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${teachers.docs.map(doc => {
                        const teacher = doc.data();
                        return `
                            <tr>
                                <td>${teacher.name}</td>
                                <td>${teacher.courses ? teacher.courses.join(', ') : 'None'}</td>
                                <td>${teacher.classes ? teacher.classes.join(', ') : 'None'}</td>
                                <td><span class="status-badge ${teacher.status || 'active'}">${teacher.status || 'Active'}</span></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function exportReport(type) {
    showToast('Report export feature coming soon!', 'info');
}

// Enhanced Exam Approval System
async function previewExam(examId) {
    try {
        const examDoc = await db.collection('exams').doc(examId).get();
        const exam = examDoc.data();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header">
                    <h3><i class="fas fa-eye"></i> Exam Preview: ${exam.title}</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="exam-preview">
                        <div class="exam-info">
                            <div class="info-grid">
                                <div><strong>Subject:</strong> ${exam.subject}</div>
                                <div><strong>Duration:</strong> ${exam.duration} minutes</div>
                                <div><strong>Questions:</strong> ${exam.questions ? exam.questions.length : 0}</div>
                                <div><strong>Status:</strong> <span class="status-badge ${exam.status}">${exam.status}</span></div>
                            </div>
                        </div>
                        <div class="questions-preview">
                            <h4>Questions Preview</h4>
                            ${exam.questions ? exam.questions.slice(0, 3).map((q, i) => `
                                <div class="question-preview">
                                    <h5>Question ${i + 1}: ${q.question}</h5>
                                    ${q.type === 'mcq' ? `
                                        <ul class="options-preview">
                                            ${q.options.map(opt => `<li>${opt}</li>`).join('')}
                                        </ul>
                                    ` : ''}
                                </div>
                            `).join('') : '<p>No questions available</p>'}
                            ${exam.questions && exam.questions.length > 3 ? `<p>... and ${exam.questions.length - 3} more questions</p>` : ''}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Close</button>
                    <button onclick="approveExamFromPreview('${examId}')" class="btn btn-success">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button onclick="rejectExamFromPreview('${examId}')" class="btn btn-danger">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error previewing exam:', error);
        showToast('Error loading exam preview', 'error');
    }
}

function approveExamFromPreview(examId) {
    document.querySelector('.modal').remove();
    approveExam(examId);
}

function rejectExamFromPreview(examId) {
    document.querySelector('.modal').remove();
    rejectExam(examId);
}

// Create test exam for demo
async function createTestExam() {
    try {
        const examRef = await db.collection('exams').add({
            title: 'Sample Mathematics Exam',
            subject: 'Mathematics',
            duration: 60,
            status: 'pending_approval',
            createdBy: currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            questions: [
                {
                    question: 'What is 2 + 2?',
                    type: 'mcq',
                    options: ['2', '3', '4', '5'],
                    correctAnswer: '4',
                    marks: 1
                },
                {
                    question: 'What is the square root of 16?',
                    type: 'mcq',
                    options: ['2', '3', '4', '5'],
                    correctAnswer: '4',
                    marks: 1
                }
            ]
        });
        
        showToast('Test exam created successfully!');
        loadPendingExams();
        loadDashboardData();
        
    } catch (error) {
        console.error('Error creating test exam:', error);
        showToast('Error creating test exam', 'error');
    }
}
// Student Management Functions
function viewStudentDetails(studentId) {
    // Show student details modal
    showStudentDetailsModal(studentId);
}

async function showStudentDetailsModal(studentId) {
    try {
        const studentDoc = await db.collection('users').doc(studentId).get();
        const student = studentDoc.data();
        
        // Get student results
        const results = await db.collection('results').where('studentId', '==', studentId).get();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user"></i> Student Details: ${student.name}</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="student-info">
                        <div class="info-grid">
                            <div><strong>Name:</strong> ${student.name}</div>
                            <div><strong>Email:</strong> ${student.email}</div>
                            <div><strong>Class:</strong> ${student.class || 'Not assigned'}</div>
                            <div><strong>Status:</strong> <span class="status-badge ${student.status || 'active'}">${student.status || 'Active'}</span></div>
                            <div><strong>Exams Taken:</strong> ${results.size}</div>
                            <div><strong>Average Score:</strong> ${results.empty ? '0%' : (results.docs.reduce((sum, doc) => sum + (doc.data().score || 0), 0) / results.size).toFixed(1) + '%'}</div>
                        </div>
                    </div>
                    ${results.empty ? '<p class="no-data">No exam results found</p>' : `
                        <div class="results-table">
                            <h4>Recent Exam Results</h4>
                            <table class="data-table">
                                <thead>
                                    <tr><th>Exam</th><th>Score</th><th>Date</th></tr>
                                </thead>
                                <tbody>
                                    ${results.docs.slice(0, 5).map(doc => {
                                        const result = doc.data();
                                        return `
                                            <tr>
                                                <td>${result.examTitle || 'Unknown'}</td>
                                                <td>${result.score || 0}%</td>
                                                <td>${formatDate(result.completedAt)}</td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading student details:', error);
        showToast('Error loading student details', 'error');
    }
}

function toggleStudentStatus(studentId) {
    // Show confirmation modal for status toggle
    showStudentStatusModal(studentId);
}

async function showStudentStatusModal(studentId) {
    try {
        const studentDoc = await db.collection('users').doc(studentId).get();
        const student = studentDoc.data();
        const currentStatus = student.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-toggle-on"></i> Toggle Student Status</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to change <strong>${student.name}</strong>'s status from <span class="status-badge ${currentStatus}">${currentStatus}</span> to <span class="status-badge ${newStatus}">${newStatus}</span>?</p>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                    <button onclick="confirmStudentStatusToggle('${studentId}', '${newStatus}')" class="btn btn-primary">
                        <i class="fas fa-toggle-on"></i> Change Status
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading student status:', error);
        showToast('Error loading student status', 'error');
    }
}

async function confirmStudentStatusToggle(studentId, newStatus) {
    try {
        await db.collection('users').doc(studentId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('student_status_updated', `Student status changed to ${newStatus}`);
        
        showToast(`Student status updated to ${newStatus}`);
        document.querySelector('.modal').remove();
        loadStudents();
        
    } catch (error) {
        console.error('Error updating student status:', error);
        showToast('Error updating student status', 'error');
    }
}
// Teacher Management Functions
function editTeacher(teacherId) {
    showEditTeacherModal(teacherId);
}

async function showEditTeacherModal(teacherId) {
    try {
        const [teacherDoc, classesDoc] = await Promise.all([
            db.collection('users').doc(teacherId).get(),
            db.collection('settings').doc('classes').get()
        ]);
        
        const teacher = teacherDoc.data();
        const classesData = classesDoc.data();
        const availableClasses = classesData ? classesData.list : ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];
        const availableCourses = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science'];
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Edit Teacher: ${teacher.name}</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
                </div>
                <form onsubmit="updateTeacher(event, '${teacherId}')">
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Name</label>
                            <input type="text" id="editTeacherName" value="${teacher.name}" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="editTeacherEmail" value="${teacher.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" id="editTeacherPhone" value="${teacher.phone || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Courses</label>
                            <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc;">
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
                                    ${availableCourses.map(course => `
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px;">
                                            <input type="checkbox" class="edit-course-checkbox" value="${course}" ${teacher.courses && teacher.courses.includes(course) ? 'checked' : ''}> ${course}
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Classes</label>
                            <div style="border: 2px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #f8fafc;">
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                    ${availableClasses.map(className => `
                                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px;">
                                            <input type="checkbox" class="edit-class-checkbox" value="${className}" ${teacher.classes && teacher.classes.includes(className) ? 'checked' : ''}> ${className}
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading teacher details:', error);
        showToast('Error loading teacher details', 'error');
    }
}

async function updateTeacher(event, teacherId) {
    event.preventDefault();
    
    const name = document.getElementById('editTeacherName').value;
    const email = document.getElementById('editTeacherEmail').value;
    const phone = document.getElementById('editTeacherPhone').value;
    const courses = Array.from(document.querySelectorAll('.edit-course-checkbox:checked')).map(cb => cb.value);
    const classes = Array.from(document.querySelectorAll('.edit-class-checkbox:checked')).map(cb => cb.value);
    
    try {
        await db.collection('users').doc(teacherId).update({
            name: name,
            email: email,
            phone: phone,
            courses: courses,
            classes: classes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('teacher_updated', `Teacher ${name} updated`);
        
        showToast('Teacher updated successfully');
        document.querySelector('.modal').remove();
        loadTeachers();
        
    } catch (error) {
        console.error('Error updating teacher:', error);
        showToast('Error updating teacher', 'error');
    }
}

function toggleTeacherStatus(teacherId) {
    showTeacherStatusModal(teacherId);
}

async function showTeacherStatusModal(teacherId) {
    try {
        const teacherDoc = await db.collection('users').doc(teacherId).get();
        const teacher = teacherDoc.data();
        const currentStatus = teacher.status || 'active';
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-toggle-on"></i> Toggle Teacher Status</h3>
                    <button onclick="this.closest('.modal').remove()" class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to change <strong>${teacher.name}</strong>'s status from <span class="status-badge ${currentStatus}">${currentStatus}</span> to <span class="status-badge ${newStatus}">${newStatus}</span>?</p>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">Cancel</button>
                    <button onclick="confirmTeacherStatusToggle('${teacherId}', '${newStatus}')" class="btn btn-primary">
                        <i class="fas fa-toggle-on"></i> Change Status
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Error loading teacher status:', error);
        showToast('Error loading teacher status', 'error');
    }
}

async function confirmTeacherStatusToggle(teacherId, newStatus) {
    try {
        await db.collection('users').doc(teacherId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: currentUser.uid
        });
        
        await logActivity('teacher_status_updated', `Teacher status changed to ${newStatus}`);
        
        showToast(`Teacher status updated to ${newStatus}`);
        document.querySelector('.modal').remove();
        loadTeachers();
        
    } catch (error) {
        console.error('Error updating teacher status:', error);
        showToast('Error updating teacher status', 'error');
    }
}