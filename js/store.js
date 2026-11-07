// Storage + shared helpers. Keeps the legacy "ai_partner_" key prefix so existing data still loads.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SYNC_KEYS = ['courses', 'timetable', 'attendance', 'scholarships', 'freelance', 'semester_start'];
const DB = {
  get(k, f = null) { try { const r = localStorage.getItem('ai_partner_' + k); return r === null ? f : JSON.parse(r); } catch { return f; } },
  set(k, v, silent = false) {
    try { localStorage.setItem('ai_partner_' + k, JSON.stringify(v)); }
    catch { toast('Storage is full or blocked: this change was NOT saved'); return false; }
    if (!silent && SYNC_KEYS.includes(k)) { localStorage.setItem('ai_partner_meta_updated', String(Date.now())); window.Cloud?.push(); }
    return true;
  },
  uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); },
};
// Security: older versions stored the Groq key in the browser (and synced it to the cloud). Remove it.
localStorage.removeItem('ai_partner_groq_api_key');

const isHttpUrl = s => { try { return ['http:', 'https:'].includes(new URL(s).protocol); } catch { return false; } };
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
