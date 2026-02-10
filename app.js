// DEINE FIREBASE KONFIGURATION (VON DER FIREBASE WEBSITE)
const firebaseConfig = {
    apiKey: "DEIN_API_KEY",
    authDomain: "DEIN_PROJEKT.firebaseapp.com",
    projectId: "DEIN_PROJEKT",
    storageBucket: "DEIN_PROJEKT.appspot.com",
    messagingSenderId: "DEINE_ID",
    appId: "DEINE_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentRole = 'student';

function setRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + (role === 'student' ? 'schueler' : 'lehrer')).classList.add('active');
}

// Login & Registrierung kombiniert
async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        redirectUser(userCredential.user.uid);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            const newUser = await auth.createUserWithEmailAndPassword(email, password);
            await db.collection('users').doc(newUser.user.uid).set({
                email: email,
                role: currentRole
            });
            redirectUser(newUser.user.uid);
        } else {
            alert("Fehler: " + error.message);
        }
    }
}

async function redirectUser(uid) {
    const doc = await db.collection('users').doc(uid).get();
    const data = doc.data();
    if (data.role === 'teacher') {
        window.location.href = 'teacher.html';
    } else {
        window.location.href = 'student.html';
    }
}

// --- LEHRER LOGIK ---
async function loadStudents() {
    const list = document.getElementById('student-list');
    list.innerHTML = "";
    // Hier laden wir alle Nutzer, die Schüler sind
    const snapshot = await db.collection('users').where('role', '==', 'student').get();
    snapshot.forEach(doc => {
        const student = doc.data();
        list.innerHTML += `
            <tr>
                <td>${student.email}</td>
                <td><input type="text" id="subject-${doc.id}" placeholder="Fach"></td>
                <td><input type="text" id="note-${doc.id}" placeholder="Grund"></td>
                <td><button onclick="sendEntry('${doc.id}')">Eintragen</button></td>
            </tr>`;
    });
}

async function sendEntry(studentId) {
    const subject = document.getElementById('subject-' + studentId).value;
    const note = document.getElementById('note-' + studentId).value;
    
    await db.collection('logs').add({
        to: studentId,
        subject: subject,
        note: note,
        date: new Date().toLocaleDateString(),
        from: auth.currentUser.email
    });
    alert("Eintrag an Schüler gesendet!");
}

// --- SCHÜLER LOGIK ---
if (window.location.pathname.includes('student.html')) {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('logs').where('to', '==', user.uid).onSnapshot(snapshot => {
                const logContainer = document.getElementById('teacher-logs');
                logContainer.innerHTML = "";
                snapshot.forEach(doc => {
                    const data = doc.data();
                    logContainer.innerHTML += `<div class="log-entry"><b>${data.date} - ${data.subject}:</b> ${data.note}</div>`;
                });
            });
        }
    });
}

function logout() {
    auth.signOut().then(() => window.location.href = 'index.html');
}
