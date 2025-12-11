// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAX0JzyObdppyO-6L9IkZkFFHHZ5I1kxNU",
    authDomain: "online-exam-portal-2cea0.firebaseapp.com",
    projectId: "online-exam-portal-2cea0",
    storageBucket: "online-exam-portal-2cea0.firebasestorage.app",
    messagingSenderId: "761294596146",
    appId: "1:761294596146:web:815ae398e00d217990b42b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();