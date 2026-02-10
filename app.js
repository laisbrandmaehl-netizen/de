// 1. DEINE FIREBASE KONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyD7vr-NMiuHJ4DU-vwQkv5Fot9NPKhlGsU",
  authDomain: "logbuch-aac70.firebaseapp.com",
  projectId: "logbuch-aac70",
  storageBucket: "logbuch-aac70.firebasestorage.app",
  messagingSenderId: "839675745417",
  appId: "1:839675745417:web:94f67ee588bbc4f647e258",
  measurementId: "G-51V7SR2889"
};

// 2. INITIALISIERUNG
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentRole = 'student';

// Rolle umschalten (Schüler/Lehrer)
window.setRole = function(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
    const activeBtnId = role === 'student' ? 'btn-schueler' : 'btn-lehrer';
    const activeBtn = document.getElementById(activeBtnId);
    if (activeBtn) activeBtn.classList.add('active');
};

// 3. LOGIN & REGISTRIERUNG
window.handleAuth = async function() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const msgElement = document.getElementById('msg');

    if (!email || !password) {
        alert("Bitte E-Mail und Passwort eingeben!");
        return;
    }

    try {
        // Versuchen einzuloggen
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login erfolgreich");
        redirectUser(userCredential.user.uid);
    } catch (error) {
        // Wenn User nicht existiert -> Neu registrieren
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            try {
                const newUser = await auth.createUserWithEmailAndPassword(email, password);
                // User-Rolle in der Datenbank speichern
                await db.collection('users').doc(newUser.user.uid).set({
                    email: email,
                    role: currentRole,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("Registrierung erfolgreich als " + currentRole);
                redirectUser(newUser.user.uid);
            } catch (regError) {
                alert("Fehler bei Registrierung: " + regError.message);
            }
        } else {
            alert("Fehler: " + error.message);
        }
    }
};

// Weiterleitung je nach Rolle
async function redirectUser(uid) {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
        const data = doc.data();
        if (data.role === 'teacher') {
            window.location.href = 'teacher.html';
        } else {
            window.location.href = 'student.html';
        }
    }
}

// 4. LEHRER LOGIK (In teacher.html)
window.loadStudents = async function() {
    const list = document.getElementById('student-list');
    if (!list) return;
    list.innerHTML = "<tr><td colspan='4'>Lade Schüler...</td></tr>";

    try {
        const snapshot = await db.collection('users').where('role', '==', 'student').get();
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = "<tr><td colspan='4'>Noch keine Schüler registriert.</td></tr>";
            return;
        }
        snapshot.forEach(doc => {
            const student = doc.data();
            list.innerHTML += `
                <tr>
                    <td>${student.email}</td>
                    <td><input type="text" id="subject-${doc.id}" placeholder="z.B. Bio"></td>
                    <td><input type="text" id="note-${doc.id}" placeholder="HA vergessen"></td>
                    <td><button class="main-btn" onclick="sendEntry('${doc.id}', '${student.email}')">Senden</button></td>
                </tr>`;
        });
    } catch (error) {
        console.error("Fehler beim Laden:", error);
    }
};

window.sendEntry = async function(studentId, studentEmail) {
    const subject = document.getElementById('subject-' + studentId).value;
    const note = document.getElementById('note-' + studentId).value;

    if (!subject || !note) {
        alert("Bitte Fach und Eintrag ausfüllen!");
        return;
    }

    try {
        await db.collection('logs').add({
            to: studentId,
            studentEmail: studentEmail,
            subject: subject,
            note: note,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            from: auth.currentUser.email
        });
        alert("Eintrag für " + studentEmail + " gespeichert!");
        document.getElementById('subject-' + studentId).value = "";
        document.getElementById('note-' + studentId).value = "";
    } catch (error) {
        alert("Fehler beim Senden: " + error.message);
    }
};

// 5. SCHÜLER LOGIK (In student.html)
if (window.location.pathname.includes('student.html')) {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Live-Überwachung der Lehrer-Einträge für diesen Schüler
            db.collection('logs')
              .where('to', '==', user.uid)
              .orderBy('timestamp', 'desc')
              .onSnapshot(snapshot => {
                const logContainer = document.getElementById('teacher-logs');
                if (!logContainer) return;
                
                if (snapshot.empty) {
                    logContainer.innerHTML = "<p>Keine Einträge von Lehrkräften.</p>";
                    return;
                }

                logContainer.innerHTML = "";
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : "...";
                    logContainer.innerHTML += `
                        <div class="log-entry" style="background:#fff; padding:10px; margin-bottom:10px; border-left:5px solid #d4a373; border-radius:5px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
                            <small>${date} - von ${data.from}</small><br>
                            <b>${data.subject}:</b> ${data.note}
                        </div>`;
                });
            });
        } else {
            window.location.href = 'index.html';
        }
    });
 
