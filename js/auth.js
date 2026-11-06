// Google Sign-In + Firebase Auth

let currentUser = null;
let firebaseReady = false;

// ---------- Firebase Config ----------
// User will paste their own config here later
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

function initFirebase() {
  try {
    if (typeof firebase === "undefined") {
      console.warn("Firebase SDK not loaded");
      return false;
    }
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firebaseReady = true;

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged((user) => {
      currentUser = user;
      updateAuthUI();
      if (user) {
        // Load cloud data when logged in
        loadCloudData();
      }
    });
    return true;
  } catch (e) {
    console.error("Firebase init error:", e);
    return false;
  }
}

function updateAuthUI() {
  const loginBtn = document.getElementById("btn-google-login");
  const logoutBtn = document.getElementById("btn-logout");
  const userInfo = document.getElementById("user-info");

  if (!loginBtn) return;

  if (currentUser) {
    loginBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "block";
    if (userInfo) {
      userInfo.style.display = "block";
      userInfo.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <img src="${currentUser.photoURL || ''}" style="width:36px;height:36px;border-radius:50%;" onerror="this.style.display='none'">
          <div>
            <div style="font-weight:600;font-size:0.95rem;">${currentUser.displayName || 'User'}</div>
            <div style="font-size:0.75rem;opacity:0.8;">${currentUser.email}</div>
          </div>
        </div>
      `;
    }
  } else {
    loginBtn.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userInfo) userInfo.style.display = "none";
  }
}

async function signInWithGoogle() {
  if (!firebaseReady) {
    toast("Firebase is not configured yet. See Settings → Firebase Setup");
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    toast("Signed in successfully!");
  } catch (e) {
    console.error(e);
    toast("Sign-in failed: " + e.message);
  }
}

async function signOutUser() {
  try {
    await firebase.auth().signOut();
    toast("Signed out");
  } catch (e) {
    toast("Error signing out");
  }
}

// ---------- Cloud Data Sync ----------
async function saveToCloud(key, data) {
  if (!currentUser || !firebaseReady) return;
  try {
    const db = firebase.firestore();
    await db.collection("users").doc(currentUser.uid).set({
      [key]: data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.error("Cloud save error:", e);
  }
}

async function loadFromCloud(key) {
  if (!currentUser || !firebaseReady) return null;
  try {
    const db = firebase.firestore();
    const doc = await db.collection("users").doc(currentUser.uid).get();
    if (doc.exists) {
      return doc.data()[key] || null;
    }
  } catch (e) {
    console.error("Cloud load error:", e);
  }
  return null;
}

async function loadCloudData() {
  if (!currentUser) return;

  // Load important data from cloud and merge into local
  const keys = ["courses", "timetable", "attendance", "scholarships", "freelance", "chat_history", "groq_api_key"];
  
  for (const key of keys) {
    const cloudData = await loadFromCloud(key);
    if (cloudData !== null) {
      // Prefer cloud data when logged in
      localStorage.setItem("ai_partner_" + key, JSON.stringify(cloudData));
    }
  }

  // Refresh current page
  if (typeof showPage === "function") {
    showPage(currentPage || "home");
  }
  toast("Data synced from cloud");
}

// Auto-save important changes to cloud
function cloudSync(key, value) {
  // Always save locally
  localStorage.setItem("ai_partner_" + key, JSON.stringify(value));
  // Also save to cloud if logged in
  if (currentUser) {
    saveToCloud(key, value);
  }
}
