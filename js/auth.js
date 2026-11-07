// Optional Firebase Google sign-in + Firestore sync. Disabled (local-only) until js/firebase-config.js is filled in.
// Conflict rule: the side with the newer "last local change" timestamp wins; cloud never silently overwrites newer local data.
const Cloud = {
  user: null, ready: false, timer: 0, failed: false,
  configured: () => !!(window.FIREBASE_CONFIG?.apiKey && window.FIREBASE_CONFIG?.projectId),
  script: src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('load ' + src)); document.head.appendChild(s); }),
  async init() {
    this.ui(); if (!this.configured()) return;
    try {
      const v = 'https://www.gstatic.com/firebasejs/10.7.1/firebase-';
      for (const p of ['app', 'auth', 'firestore']) await this.script(`${v}${p}-compat.js`);
      firebase.initializeApp(window.FIREBASE_CONFIG); this.ready = true;
      firebase.auth().onAuthStateChanged(u => { this.user = u; this.ui(); if (u) this.pull(); });
    } catch { toast('Firebase could not load (offline?). Running local-only.'); }
    this.ui();
  },
  async signIn() {
    if (!this.ready) return toast(this.configured() ? 'Firebase is still loading, try again.' : 'Firebase is not configured. See README → Firebase setup.');
    try { await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider()); toast('Signed in'); }
    catch (e) { toast(e.code === 'auth/popup-closed-by-user' ? 'Sign-in cancelled' : 'Sign-in failed: ' + (e.code || 'unknown error')); }
  },
  async signOut() { try { await firebase.auth().signOut(); toast('Signed out. Local data kept on this device.'); } catch { toast('Sign-out failed'); } },
  ref() { return firebase.firestore().collection('users').doc(this.user.uid); },
  async pull() {
    try {
      const snap = await this.ref().get(), local = Number(localStorage.getItem('ai_partner_meta_updated')) || 0;
      if (snap.exists && snap.data().updatedAt > local) {
        const data = JSON.parse(snap.data().data);
        SYNC_KEYS.forEach(k => { if (k in data) DB.set(k, data[k], true); });
        localStorage.setItem('ai_partner_meta_updated', String(snap.data().updatedAt));
        App.go(App.page); toast('Synced newer data from cloud');
      } else await this.pushNow();
      this.failed = false;
    } catch { this.syncFail(); }
  },
  push() { if (!this.user) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.pushNow(), 1500); },
  async pushNow() {
    if (!this.user) return;
    try {
      const data = {}; SYNC_KEYS.forEach(k => data[k] = DB.get(k));
      await this.ref().set({ data: JSON.stringify(data), updatedAt: Number(localStorage.getItem('ai_partner_meta_updated')) || Date.now() });
      this.failed = false;
    } catch { this.syncFail(); }
  },
  syncFail() { if (!this.failed) toast('Cloud sync failed. Your data is safe locally and will retry on the next change.'); this.failed = true; },
  ui() {
    const u = this.user, box = $('#user-info'); if (!box) return;
    $('#btn-google-login').hidden = !!u; $('#btn-logout').hidden = !u; box.hidden = !u;
    $('#fb-status').textContent = !this.configured() ? 'Not configured (local-only mode)' : u ? 'Connected: cloud sync on' : this.ready ? 'Ready: sign in to sync' : 'Loading…';
    box.textContent = u ? `${u.displayName || 'User'} · ${u.email}` : '';
  },
};
