// Language Management System
class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('examPortalLanguage') || 'en';
        this.translations = {
            en: {
                // Common
                'login': 'Login',
                'register': 'Register',
                'logout': 'Logout',
                'dashboard': 'Dashboard',
                'profile': 'Profile',
                'settings': 'Settings',
                'save': 'Save',
                'cancel': 'Cancel',
                'delete': 'Delete',
                'edit': 'Edit',
                'add': 'Add',
                'submit': 'Submit',
                'back': 'Back',
                'next': 'Next',
                'previous': 'Previous',
                'loading': 'Loading...',
                'success': 'Success',
                'error': 'Error',
                'warning': 'Warning',
                'confirm': 'Confirm',
                'yes': 'Yes',
                'no': 'No',
                
                // Auth Page
                'examPortal': 'ExamPortal',
                'secureOnlineExamSystem': 'Secure Online Examination System',
                'welcomeBack': 'Welcome Back',
                'signInToAccount': 'Sign in to your account',
                'createAccount': 'Create Account',
                'joinExamPlatform': 'Join our examination platform',
                'resetPassword': 'Reset Password',
                'enterEmailReset': 'Enter your email to receive reset instructions',
                'emailAddress': 'Email Address',
                'password': 'Password',
                'fullName': 'Full Name',
                'signIn': 'Sign In',
                'forgotPassword': 'Forgot Password?',
                'sendResetLink': 'Send Reset Link',
                'backToLogin': 'Back to Login',
                'poweredBy': 'Powered by',
                'developedBy': 'Developed by',
                
                // Student Dashboard
                'studentDashboard': 'Student Dashboard',
                'availableExams': 'Available Exams',
                'completedExams': 'Completed Exams',
                'myResults': 'My Results',
                'leaderboard': 'Leaderboard',
                'takeExam': 'Take Exam',
                'viewResult': 'View Result',
                'examTitle': 'Exam Title',
                'duration': 'Duration',
                'questions': 'Questions',
                'status': 'Status',
                'score': 'Score',
                'startTime': 'Start Time',
                'endTime': 'End Time',
                'noExamsAvailable': 'No exams available at the moment',
                'noResultsYet': 'No results available yet',
                
                // Teacher Dashboard
                'teacherDashboard': 'Teacher Dashboard',
                'examManagement': 'Exam Management',
                'createNewExam': 'Create New Exam',
                'manageQuestions': 'Manage Questions',
                'studentResults': 'Student Results',
                'reports': 'Reports',
                'examName': 'Exam Name',
                'description': 'Description',
                'timeLimit': 'Time Limit',
                'totalMarks': 'Total Marks',
                'passingMarks': 'Passing Marks',
                'createExam': 'Create Exam',
                'editExam': 'Edit Exam',
                'deleteExam': 'Delete Exam',
                'viewStudents': 'View Students',
                
                // Take Exam
                'examInstructions': 'Exam Instructions',
                'readInstructionsCarefully': 'Please read the instructions carefully before starting',
                'startExam': 'Start Exam',
                'submitExam': 'Submit Exam',
                'timeRemaining': 'Time Remaining',
                'questionNavigation': 'Question Navigation',
                'answered': 'Answered',
                'notAnswered': 'Not Answered',
                'marked': 'Marked for Review',
                'currentQuestion': 'Current Question',
                'markForReview': 'Mark for Review',
                'clearResponse': 'Clear Response',
                'saveAndNext': 'Save & Next',
                'saveAndPrevious': 'Save & Previous',
                'secureExamMode': 'Secure Exam Mode',
                'beforeStartingExam': 'Before starting the exam, we need to enable secure mode to prevent cheating:',
                'fullscreenMode': 'Fullscreen mode (hides browser address bar)',
                'important': 'Important',
                'onceStartCannotExit': 'Once you start, you cannot exit fullscreen mode until the exam is complete.',
                'startSecureExam': 'Start Secure Exam',
                'questionProgress': 'Question 1 of 10',
                'student': 'Student',
                'teacher': 'Teacher',
                'refresh': 'Refresh',
                'examInterface': 'Exam Interface',
                
                // Additional UI Elements
                'myTranscript': 'My Transcript',
                'myClasses': 'My Classes',
                'signingIn': 'Signing in...',
                'loginSuccessful': 'Login successful!',
                'registrationSuccessful': 'Registration successful!',
                'examSubmitted': 'Exam submitted successfully!',
                'passwordResetSent': 'Password reset link sent!',
                'close': 'Close',
                'ok': 'OK',
                'pleaseWait': 'Please wait...',
                'processing': 'Processing...',
                'allExams': 'All Exams',
                'searchByTitle': 'Search by title or subject...',
                'showingAllExams': 'Showing all exams',
                'clear': 'Clear',
                'expired': 'Expired',
                'pending': 'Pending',
                'completed': 'Completed',
                'averageScore': 'Average Score',
                'bestScore': 'Best Score',
                'pendingExams': 'Pending Exams',
                'confirmLogout': 'Are you sure you want to logout?',
                'minutes': 'minutes',
                'start': 'Start',
                'view': 'View',
                'retake': 'Retake',
                
                // Question Types
                'multipleChoice': 'Multiple Choice',
                'trueFalse': 'True/False',
                'shortAnswer': 'Short Answer',
                'selectCorrectAnswer': 'Select the correct answer',
                'selectTrueFalse': 'Select True or False',
                'typeYourAnswer': 'Type your answer here',
                
                // Results
                'examResults': 'Exam Results',
                'congratulations': 'Congratulations!',
                'examCompleted': 'You have completed the exam',
                'totalQuestions': 'Total Questions',
                'correctAnswers': 'Correct Answers',
                'wrongAnswers': 'Wrong Answers',
                'percentage': 'Percentage',
                'grade': 'Grade',
                'passed': 'Passed',
                'failed': 'Failed',
                'viewDetailedResults': 'View Detailed Results',
                'backToDashboard': 'Back to Dashboard',
                
                // Language Selector
                'selectLanguage': 'Select Language',
                'english': 'English',
                'kinyarwanda': 'Kinyarwanda',
                'french': 'French',
                'kiswahili': 'Kiswahili'
            },
            
            fr: {
                // Common
                'login': 'Connexion',
                'register': 'S\'inscrire',
                'logout': 'Déconnexion',
                'dashboard': 'Tableau de bord',
                'profile': 'Profil',
                'settings': 'Paramètres',
                'save': 'Enregistrer',
                'cancel': 'Annuler',
                'delete': 'Supprimer',
                'edit': 'Modifier',
                'add': 'Ajouter',
                'submit': 'Soumettre',
                'back': 'Retour',
                'next': 'Suivant',
                'previous': 'Précédent',
                'loading': 'Chargement...',
                'success': 'Succès',
                'error': 'Erreur',
                'warning': 'Avertissement',
                'confirm': 'Confirmer',
                'yes': 'Oui',
                'no': 'Non',
                
                // Auth Page
                'examPortal': 'Portail d\'Examen',
                'secureOnlineExamSystem': 'Système d\'Examen en Ligne Sécurisé',
                'welcomeBack': 'Bon Retour',
                'signInToAccount': 'Connectez-vous à votre compte',
                'createAccount': 'Créer un Compte',
                'joinExamPlatform': 'Rejoignez notre plateforme d\'examen',
                'resetPassword': 'Réinitialiser le Mot de Passe',
                'enterEmailReset': 'Entrez votre email pour recevoir les instructions',
                'emailAddress': 'Adresse Email',
                'password': 'Mot de Passe',
                'fullName': 'Nom Complet',
                'signIn': 'Se Connecter',
                'forgotPassword': 'Mot de Passe Oublié?',
                'sendResetLink': 'Envoyer le Lien',
                'backToLogin': 'Retour à la Connexion',
                'poweredBy': 'Propulsé par',
                'developedBy': 'Développé par',
                
                // Student Dashboard
                'studentDashboard': 'Tableau de Bord Étudiant',
                'availableExams': 'Examens Disponibles',
                'completedExams': 'Examens Terminés',
                'myResults': 'Mes Résultats',
                'leaderboard': 'Classement',
                'takeExam': 'Passer l\'Examen',
                'viewResult': 'Voir le Résultat',
                'examTitle': 'Titre de l\'Examen',
                'duration': 'Durée',
                'questions': 'Questions',
                'status': 'Statut',
                'score': 'Score',
                'startTime': 'Heure de Début',
                'endTime': 'Heure de Fin',
                'noExamsAvailable': 'Aucun examen disponible pour le moment',
                'noResultsYet': 'Aucun résultat disponible encore',
                
                // Teacher Dashboard
                'teacherDashboard': 'Tableau de Bord Enseignant',
                'examManagement': 'Gestion des Examens',
                'createNewExam': 'Créer un Nouvel Examen',
                'manageQuestions': 'Gérer les Questions',
                'studentResults': 'Résultats des Étudiants',
                'reports': 'Rapports',
                'examName': 'Nom de l\'Examen',
                'description': 'Description',
                'timeLimit': 'Limite de Temps',
                'totalMarks': 'Points Totaux',
                'passingMarks': 'Points de Passage',
                'createExam': 'Créer l\'Examen',
                'editExam': 'Modifier l\'Examen',
                'deleteExam': 'Supprimer l\'Examen',
                'viewStudents': 'Voir les Étudiants',
                
                // Take Exam
                'examInstructions': 'Instructions d\'Examen',
                'readInstructionsCarefully': 'Veuillez lire attentivement les instructions avant de commencer',
                'startExam': 'Commencer l\'Examen',
                'submitExam': 'Soumettre l\'Examen',
                'timeRemaining': 'Temps Restant',
                'questionNavigation': 'Navigation des Questions',
                'answered': 'Répondu',
                'notAnswered': 'Non Répondu',
                'marked': 'Marqué pour Révision',
                'currentQuestion': 'Question Actuelle',
                'markForReview': 'Marquer pour Révision',
                'clearResponse': 'Effacer la Réponse',
                'saveAndNext': 'Enregistrer et Suivant',
                'saveAndPrevious': 'Enregistrer et Précédent',
                'secureExamMode': 'Mode d\'Examen Sécurisé',
                'beforeStartingExam': 'Avant de commencer l\'examen, nous devons activer le mode sécurisé:',
                'fullscreenMode': 'Mode plein écran (cache la barre d\'adresse)',
                'important': 'Important',
                'onceStartCannotExit': 'Une fois commencé, vous ne pouvez pas quitter le mode plein écran.',
                'startSecureExam': 'Commencer l\'Examen Sécurisé',
                'questionProgress': 'Question 1 sur 10',
                'student': 'Étudiant',
                'teacher': 'Enseignant',
                'refresh': 'Actualiser',
                'examInterface': 'Interface d\'Examen',
                
                // Additional UI Elements
                'myTranscript': 'Mon Relevé',
                'myClasses': 'Mes Classes',
                'signingIn': 'Connexion...',
                'loginSuccessful': 'Connexion réussie!',
                'registrationSuccessful': 'Inscription réussie!',
                'examSubmitted': 'Examen soumis avec succès!',
                'passwordResetSent': 'Lien de réinitialisation envoyé!',
                'close': 'Fermer',
                'ok': 'OK',
                'pleaseWait': 'Veuillez patienter...',
                'processing': 'Traitement...',
                'allExams': 'Tous les Examens',
                'searchByTitle': 'Rechercher par titre ou sujet...',
                'showingAllExams': 'Affichage de tous les examens',
                'clear': 'Effacer',
                'expired': 'Expiré',
                'pending': 'En attente',
                'completed': 'Terminé',
                'averageScore': 'Score Moyen',
                'bestScore': 'Meilleur Score',
                'pendingExams': 'Examens en Attente',
                'confirmLogout': 'Êtes-vous sûr de vouloir vous déconnecter?',
                'minutes': 'minutes',
                'start': 'Commencer',
                'view': 'Voir',
                'retake': 'Reprendre',
                
                // Question Types
                'multipleChoice': 'Choix Multiple',
                'trueFalse': 'Vrai/Faux',
                'shortAnswer': 'Réponse Courte',
                'selectCorrectAnswer': 'Sélectionnez la bonne réponse',
                'selectTrueFalse': 'Sélectionnez Vrai ou Faux',
                'typeYourAnswer': 'Tapez votre réponse ici',
                
                // Results
                'examResults': 'Résultats d\'Examen',
                'congratulations': 'Félicitations!',
                'examCompleted': 'Vous avez terminé l\'examen',
                'totalQuestions': 'Questions Totales',
                'correctAnswers': 'Bonnes Réponses',
                'wrongAnswers': 'Mauvaises Réponses',
                'percentage': 'Pourcentage',
                'grade': 'Note',
                'passed': 'Réussi',
                'failed': 'Échoué',
                'viewDetailedResults': 'Voir les Résultats Détaillés',
                'backToDashboard': 'Retour au Tableau de Bord',
                
                // Language Selector
                'selectLanguage': 'Sélectionner la Langue',
                'english': 'Anglais',
                'kinyarwanda': 'Kinyarwanda',
                'french': 'Français',
                'kiswahili': 'Kiswahili'
            },
            
            sw: {
                // Common
                'login': 'Ingia',
                'register': 'Jisajili',
                'logout': 'Toka',
                'dashboard': 'Dashibodi',
                'profile': 'Wasifu',
                'settings': 'Mipangilio',
                'save': 'Hifadhi',
                'cancel': 'Ghairi',
                'delete': 'Futa',
                'edit': 'Hariri',
                'add': 'Ongeza',
                'submit': 'Wasilisha',
                'back': 'Rudi',
                'next': 'Ifuatayo',
                'previous': 'Iliyotangulia',
                'loading': 'Inapakia...',
                'success': 'Mafanikio',
                'error': 'Kosa',
                'warning': 'Onyo',
                'confirm': 'Thibitisha',
                'yes': 'Ndiyo',
                'no': 'Hapana',
                
                // Auth Page
                'examPortal': 'Mlango wa Mitihani',
                'secureOnlineExamSystem': 'Mfumo wa Mitihani ya Mtandaoni Salama',
                'welcomeBack': 'Karibu Tena',
                'signInToAccount': 'Ingia kwenye akaunti yako',
                'createAccount': 'Tengeneza Akaunti',
                'joinExamPlatform': 'Jiunge na jukwaa letu la mitihani',
                'resetPassword': 'Weka Upya Nywila',
                'enterEmailReset': 'Ingiza barua pepe yako kupokea maelekezo',
                'emailAddress': 'Anwani ya Barua Pepe',
                'password': 'Nywila',
                'fullName': 'Jina Kamili',
                'signIn': 'Ingia',
                'forgotPassword': 'Umesahau Nywila?',
                'sendResetLink': 'Tuma Kiungo',
                'backToLogin': 'Rudi Kuingia',
                'poweredBy': 'Inaendeshwa na',
                'developedBy': 'Imetengenezwa na',
                
                // Student Dashboard
                'studentDashboard': 'Dashibodi ya Mwanafunzi',
                'availableExams': 'Mitihani Inayopatikana',
                'completedExams': 'Mitihani Iliyokamilika',
                'myResults': 'Matokeo Yangu',
                'leaderboard': 'Jedwali la Ushindi',
                'takeExam': 'Fanya Mtihani',
                'viewResult': 'Ona Matokeo',
                'examTitle': 'Kichwa cha Mtihani',
                'duration': 'Muda',
                'questions': 'Maswali',
                'status': 'Hali',
                'score': 'Alama',
                'startTime': 'Muda wa Kuanza',
                'endTime': 'Muda wa Kumaliza',
                'noExamsAvailable': 'Hakuna mitihani inayopatikana kwa sasa',
                'noResultsYet': 'Hakuna matokeo bado',
                
                // Teacher Dashboard
                'teacherDashboard': 'Dashibodi ya Mwalimu',
                'examManagement': 'Usimamizi wa Mitihani',
                'createNewExam': 'Tengeneza Mtihani Mpya',
                'manageQuestions': 'Simamia Maswali',
                'studentResults': 'Matokeo ya Wanafunzi',
                'reports': 'Ripoti',
                'examName': 'Jina la Mtihani',
                'description': 'Maelezo',
                'timeLimit': 'Kikomo cha Muda',
                'totalMarks': 'Alama Zote',
                'passingMarks': 'Alama za Kupita',
                'createExam': 'Tengeneza Mtihani',
                'editExam': 'Hariri Mtihani',
                'deleteExam': 'Futa Mtihani',
                'viewStudents': 'Ona Wanafunzi',
                
                // Take Exam
                'examInstructions': 'Maelekezo ya Mtihani',
                'readInstructionsCarefully': 'Tafadhali soma maelekezo kwa makini kabla ya kuanza',
                'startExam': 'Anza Mtihani',
                'submitExam': 'Wasilisha Mtihani',
                'timeRemaining': 'Muda Uliobaki',
                'questionNavigation': 'Uongozi wa Maswali',
                'answered': 'Imejibiwa',
                'notAnswered': 'Haijajibwa',
                'marked': 'Imewekwa Alama ya Ukaguzi',
                'currentQuestion': 'Swali la Sasa',
                'markForReview': 'Weka Alama ya Ukaguzi',
                'clearResponse': 'Futa Jibu',
                'saveAndNext': 'Hifadhi na Ifuatayo',
                'saveAndPrevious': 'Hifadhi na Iliyotangulia',
                'secureExamMode': 'Hali ya Mtihani Salama',
                'beforeStartingExam': 'Kabla ya kuanza mtihani, tunahitaji kuwasha hali salama:',
                'fullscreenMode': 'Hali ya skrini nzima (inaficha upau wa anwani)',
                'important': 'Muhimu',
                'onceStartCannotExit': 'Mara tu unapoanza, huwezi kutoka kwenye hali ya skrini nzima.',
                'startSecureExam': 'Anza Mtihani Salama',
                'questionProgress': 'Swali 1 kati ya 10',
                'student': 'Mwanafunzi',
                'teacher': 'Mwalimu',
                'refresh': 'Onyesha Upya',
                'examInterface': 'Kiolesura cha Mtihani',
                
                // Additional UI Elements
                'myTranscript': 'Hati Yangu',
                'myClasses': 'Madarasa Yangu',
                'signingIn': 'Kuingia...',
                'loginSuccessful': 'Kuingia kumefanikiwa!',
                'registrationSuccessful': 'Usajili umefanikiwa!',
                'examSubmitted': 'Mtihani umewasilishwa kwa mafanikio!',
                'passwordResetSent': 'Kiungo cha kuweka upya nywila kimetumwa!',
                'close': 'Funga',
                'ok': 'Sawa',
                'pleaseWait': 'Tafadhali subiri...',
                'processing': 'Inachakata...',
                'allExams': 'Mitihani Yote',
                'searchByTitle': 'Tafuta kwa kichwa au mada...',
                'showingAllExams': 'Inaonyesha mitihani yote',
                'clear': 'Futa',
                'expired': 'Imeisha',
                'pending': 'Inasubiri',
                'completed': 'Imekamilika',
                'averageScore': 'Alama za Wastani',
                'bestScore': 'Alama Bora',
                'pendingExams': 'Mitihani Inayosubiri',
                'confirmLogout': 'Je, una uhakika unataka kutoka?',
                'minutes': 'dakika',
                'start': 'Anza',
                'view': 'Ona',
                'retake': 'Rudia',
                
                // Question Types
                'multipleChoice': 'Chaguo Nyingi',
                'trueFalse': 'Kweli/Uongo',
                'shortAnswer': 'Jibu Fupi',
                'selectCorrectAnswer': 'Chagua jibu sahihi',
                'selectTrueFalse': 'Chagua Kweli au Uongo',
                'typeYourAnswer': 'Andika jibu lako hapa',
                
                // Results
                'examResults': 'Matokeo ya Mtihani',
                'congratulations': 'Hongera!',
                'examCompleted': 'Umekamilisha mtihani',
                'totalQuestions': 'Maswali Yote',
                'correctAnswers': 'Majibu Sahihi',
                'wrongAnswers': 'Majibu Makosa',
                'percentage': 'Asilimia',
                'grade': 'Daraja',
                'passed': 'Umepita',
                'failed': 'Umeshindwa',
                'viewDetailedResults': 'Ona Matokeo ya Kina',
                'backToDashboard': 'Rudi Dashibodi',
                
                // Language Selector
                'selectLanguage': 'Chagua Lugha',
                'english': 'Kiingereza',
                'kinyarwanda': 'Kinyarwanda',
                'french': 'Kifaransa',
                'kiswahili': 'Kiswahili'
            },
            
            rw: {
                // Common
                'login': 'Kwinjira',
                'register': 'Kwiyandikisha',
                'logout': 'Gusohoka',
                'dashboard': 'Imbonerahamwe',
                'profile': 'Umwirondoro',
                'settings': 'Igenamiterere',
                'save': 'Kubika',
                'cancel': 'Kureka',
                'delete': 'Gusiba',
                'edit': 'Guhindura',
                'add': 'Kongeramo',
                'submit': 'Kohereza',
                'back': 'Gusubira',
                'next': 'Ikurikira',
                'previous': 'Ibanjirije',
                'loading': 'Biratangira...',
                'success': 'Byagenze neza',
                'error': 'Ikosa',
                'warning': 'Iburira',
                'confirm': 'Kwemeza',
                'yes': 'Yego',
                'no': 'Oya',
                
                // Auth Page
                'examPortal': 'Urubuga rw\'Ibizamini',
                'secureOnlineExamSystem': 'Sisitemu y\'Ibizamini ku Rubuga Ifite Umutekano',
                'welcomeBack': 'Murakaza Neza',
                'signInToAccount': 'Injira muri konti yawe',
                'createAccount': 'Kurema Konti',
                'joinExamPlatform': 'Jya mu rubuga rwacu rw\'ibizamini',
                'resetPassword': 'Guhindura Ijambo ry\'Ibanga',
                'enterEmailReset': 'Shyiramo imeyili yawe kugira ngo ubone amabwiriza yo guhindura',
                'emailAddress': 'Aderesi ya Imeyili',
                'password': 'Ijambo ry\'Ibanga',
                'fullName': 'Amazina Yose',
                'signIn': 'Kwinjira',
                'forgotPassword': 'Wibagiwe Ijambo ry\'Ibanga?',
                'sendResetLink': 'Kohereza Ihuza ryo Guhindura',
                'backToLogin': 'Gusubira ku Kwinjira',
                'poweredBy': 'Bikorwa na',
                'developedBy': 'Byakozwe na',
                
                // Student Dashboard
                'studentDashboard': 'Ikibaho cy\'Umunyeshuri',
                'availableExams': 'Ibizamini Biboneka',
                'completedExams': 'Ibizamini Byarangiye',
                'myResults': 'Ibisubizo Byanjye',
                'leaderboard': 'Urutonde rw\'Abatsinze',
                'takeExam': 'Gukora Ikizamini',
                'viewResult': 'Kureba Igisubizo',
                'examTitle': 'Umutwe w\'Ikizamini',
                'duration': 'Igihe',
                'questions': 'Ibibazo',
                'status': 'Uko Bimeze',
                'score': 'Amanota',
                'startTime': 'Igihe cyo Gutangira',
                'endTime': 'Igihe cyo Kurangiza',
                'noExamsAvailable': 'Nta bizamini biboneka ubu',
                'noResultsYet': 'Nta bisubizo biboneka ubu',
                
                // Teacher Dashboard
                'teacherDashboard': 'Ikibaho cy\'Umwarimu',
                'examManagement': 'Gucunga Ibizamini',
                'createNewExam': 'Kurema Ikizamini Gishya',
                'manageQuestions': 'Gucunga Ibibazo',
                'studentResults': 'Ibisubizo by\'Abanyeshuri',
                'reports': 'Raporo',
                'examName': 'Izina ry\'Ikizamini',
                'description': 'Ibisobanuro',
                'timeLimit': 'Igihe Ntarengwa',
                'totalMarks': 'Amanota Yose',
                'passingMarks': 'Amanota yo Gutsinda',
                'createExam': 'Kurema Ikizamini',
                'editExam': 'Guhindura Ikizamini',
                'deleteExam': 'Gusiba Ikizamini',
                'viewStudents': 'Kureba Abanyeshuri',
                
                // Take Exam
                'examInstructions': 'Amabwiriza y\'Ikizamini',
                'readInstructionsCarefully': 'Nyamuneka soma amabwiriza neza mbere yo gutangira',
                'startExam': 'Gutangira Ikizamini',
                'submitExam': 'Kohereza Ikizamini',
                'timeRemaining': 'Igihe Gisigaye',
                'questionNavigation': 'Kugenda mu Bibazo',
                'answered': 'Byasubijwe',
                'notAnswered': 'Bitarasubizwa',
                'marked': 'Byashyizweho Ikimenyetso cyo Gusubiramo',
                'currentQuestion': 'Ikibazo Kiriho',
                'markForReview': 'Gushyiraho Ikimenyetso cyo Gusubiramo',
                'clearResponse': 'Gusiba Igisubizo',
                'saveAndNext': 'Kubika no Kurikira',
                'saveAndPrevious': 'Kubika no Gusubira',
                'secureExamMode': 'Uburyo bw\'Ikizamini Bufite Umutekano',
                'beforeStartingExam': 'Mbere yo gutangira ikizamini, dukeneye gushyira uburyo bufite umutekano kugira ngo tubuze uburiganya:',
                'fullscreenMode': 'Uburyo bwa fullscreen (buhisha address bar ya browser)',
                'important': 'Ngombwa',
                'onceStartCannotExit': 'Iyo watangiye, ntushobora gusohoka muri fullscreen mode kugeza ikizamini kirangiye.',
                'startSecureExam': 'Gutangira Ikizamini Gifite Umutekano',
                'questionProgress': 'Ikibazo 1 muri 10',
                'student': 'Umunyeshuri',
                'teacher': 'Umwarimu',
                'refresh': 'Kuvugurura',
                'examInterface': 'Inyuma y\'Ikizamini',
                
                // Additional UI Elements
                'myTranscript': 'Impamyabumenyi Yanjye',
                'myClasses': 'Amasomo Yanjye',
                'signingIn': 'Kwinjira...',
                'loginSuccessful': 'Kwinjira byagenze neza!',
                'registrationSuccessful': 'Kwiyandikisha byagenze neza!',
                'examSubmitted': 'Ikizamini cyoherejwe neza!',
                'passwordResetSent': 'Ihuza ryo guhindura ijambo ryibanga ryoherejwe!',
                'close': 'Gufunga',
                'ok': 'Sawa',
                'pleaseWait': 'Nyamuneka tegereza...',
                'processing': 'Biratangura...',
                'allExams': 'Ibizamini Byose',
                'searchByTitle': 'Shakisha ukurikije umutwe cyangwa ingingo...',
                'showingAllExams': 'Byerekana ibizamini byose',
                'clear': 'Gusiba',
                'expired': 'Byarangiye',
                'pending': 'Bitegereje',
                'completed': 'Byarangiye',
                'averageScore': 'Amanota Rusange',
                'bestScore': 'Amanota Meza',
                'pendingExams': 'Ibizamini Bitegereje',
                'confirmLogout': 'Uzi neza ko ushaka gusohoka?',
                'minutes': 'iminota',
                'start': 'Tangira',
                'view': 'Reba',
                'retake': 'Ongera ukore',
                
                // Question Types
                'multipleChoice': 'Guhitamo mu Byinshi',
                'trueFalse': 'Ukuri/Ibinyoma',
                'shortAnswer': 'Igisubizo Gito',
                'selectCorrectAnswer': 'Hitamo igisubizo nyacyo',
                'selectTrueFalse': 'Hitamo Ukuri cyangwa Ibinyoma',
                'typeYourAnswer': 'Andika igisubizo cyawe hano',
                
                // Results
                'examResults': 'Ibisubizo by\'Ikizamini',
                'congratulations': 'Turakunezereza!',
                'examCompleted': 'Warangije ikizamini',
                'totalQuestions': 'Ibibazo Byose',
                'correctAnswers': 'Ibisubizo Nyayo',
                'wrongAnswers': 'Ibisubizo Bitari Byo',
                'percentage': 'Ijanisha',
                'grade': 'Amanota',
                'passed': 'Watsindiye',
                'failed': 'Wananiwe',
                'viewDetailedResults': 'Kureba Ibisubizo Birambuye',
                'backToDashboard': 'Gusubira ku Kibaho',
                
                // Language Selector
                'selectLanguage': 'Hitamo Ururimi',
                'english': 'Icyongereza',
                'kinyarwanda': 'Ikinyarwanda',
                'french': 'Igifaransa',
                'kiswahili': 'Igiswahili'
            }
        };
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('examPortalLanguage', lang);
        this.updatePageContent();
        document.documentElement.lang = lang === 'rw' ? 'rw' : 'en';
    }

    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    updatePageContent() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            
            if (element.tagName === 'INPUT' && (element.type === 'submit' || element.type === 'button')) {
                element.value = translation;
            } else if (element.hasAttribute('placeholder')) {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update active flag button
        document.querySelectorAll('.flag-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.flag-btn[onclick*="'${this.currentLanguage}'"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    createLanguageSelector() {
        const selector = document.createElement('div');
        selector.className = 'language-selector';
        selector.innerHTML = `
            <div class="language-flags">
                <button class="flag-btn ${this.currentLanguage === 'en' ? 'active' : ''}" onclick="languageManager.setLanguage('en')" title="English">
                    🇬🇧 ENG
                </button>
                <button class="flag-btn ${this.currentLanguage === 'rw' ? 'active' : ''}" onclick="languageManager.setLanguage('rw')" title="Kinyarwanda">
                    🇷🇼 RW
                </button>
                <button class="flag-btn ${this.currentLanguage === 'fr' ? 'active' : ''}" onclick="languageManager.setLanguage('fr')" title="Français">
                    🇫🇷 FR
                </button>
                <button class="flag-btn ${this.currentLanguage === 'sw' ? 'active' : ''}" onclick="languageManager.setLanguage('sw')" title="Kiswahili">
                    🇰🇪 KISW
                </button>
            </div>
        `;
        return selector;
    }

    init() {
        // Force display language selector
        const body = document.body;
        const selector = this.createLanguageSelector();
        selector.style.position = 'fixed';
        selector.style.top = '20px';
        selector.style.right = '20px';
        selector.style.zIndex = '9999';
        body.appendChild(selector);
        
        // Set initial language
        document.documentElement.lang = this.currentLanguage === 'rw' ? 'rw' : this.currentLanguage === 'fr' ? 'fr' : this.currentLanguage === 'sw' ? 'sw' : 'en';
        this.updatePageContent();
    }
}

// Initialize language manager
const languageManager = new LanguageManager();

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    languageManager.init();
});