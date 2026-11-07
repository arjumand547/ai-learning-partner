// Application pages and actions. All user text goes through esc()/md(); events use data-act delegation (no inline handlers).
const SCH_STATUS = ['Planned', 'Applied', 'Under Review', 'Interview', 'Accepted', 'Rejected'];
const SCH_CAT = ['Government / HEC', 'University', 'Private / NGO', 'International', 'Other'];
const FR_STATUS = ['Idea', 'Proposal Sent', 'Active', 'Paused', 'Completed', 'Cancelled'];
const FR_PLAT = ['Fiverr', 'Upwork', 'Freelancer', 'LinkedIn', 'Direct client', 'Other'];
const PAGES = ['home', 'tutor', 'courses', 'attendance', 'scholarships', 'freelance', 'settings'];
const sel = (opts, cur) => opts.map(o => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('');
const dleft = d => Att.daysBetween(Att.ymd(), d);
const val = id => $('#' + id).value.trim();
const empty = (i, t) => `<div class="empty"><div class="ico">${i}</div>${t}</div>`;
const dueBadge = d => { if (!d) return ''; const n = dleft(d); return `<span class="badge ${n < 0 ? 'red' : n <= 7 ? 'amber' : 'blue'}">${n < 0 ? Math.abs(n) + 'd overdue' : n === 0 ? 'Due today' : n + 'd left'} · ${esc(d)}</span>`; };

const App = {
  page: 'home', openCourse: null, chat: DB.get('chat_history', []), cchat: [],
  go(p) {
    if (!PAGES.includes(p)) p = 'home';
    this.page = p; if (p !== 'courses') this.openCourse = null;
    $$('.page').forEach(e => e.classList.toggle('active', e.id === 'page-' + p));
    $$('[data-act="go"]').forEach(b => b.classList.toggle('active', b.dataset.page === p));
    ({ home: renderHome, tutor: renderTutor, courses: renderCourses, attendance: renderAttendance, scholarships: renderSch, freelance: renderFr, settings: renderSettings })[p]();
    if (location.hash !== '#' + p) history.replaceState(null, '', '#' + p);
    $('main').scrollTo?.(0, 0); scrollTo(0, 0);
  },
};

// ---------- chat helpers ----------
function renderMsgs(box, msgs, typing = false, err = '') {
  box.innerHTML = (msgs.length || typing || err ? '' : '<div class="hint">No messages yet.</div>') +
    msgs.map(m => `<div class="msg ${m.role === 'user' ? 'user' : 'ai'}">${m.role === 'user' ? esc(m.content).replace(/\n/g, '<br>') : md(m.content)}</div>`).join('') +
    (typing ? '<div class="msg ai typing"><i></i><i></i><i></i></div>' : '') + (err ? `<div class="msg ai err">⚠️ ${esc(err)}</div>` : '');
  box.scrollTop = box.scrollHeight;
}
const setBusy = on => $$('.send-btn').forEach(b => b.disabled = on);
async function converse({ mode, msgs, box, save, text, input, context = '' }) {
  if (AI.busy) return; AI.busy = true; setBusy(true);
  msgs.push({ role: 'user', content: text }); if (input) input.value = ''; renderMsgs(box, msgs, true);
  try { const reply = await AI.chat(mode, msgs.slice(-12), context); msgs.push({ role: 'assistant', content: reply }); save(); renderMsgs(box, msgs); }
  catch (e) { msgs.pop(); if (input) input.value = text; renderMsgs(box, msgs, false, e.message); }
  finally { AI.busy = false; setBusy(false); }
}

// ---------- Home / dashboard ----------
function notifications() {
  const n = [];
  DB.get('scholarships', []).filter(s => s.deadline && !['Accepted', 'Rejected'].includes(s.status)).forEach(s => { const d = dleft(s.deadline);
    if (d <= 14) n.push({ l: d <= 3 ? 'red' : 'amber', t: `🎓 ${s.name}: ${d < 0 ? 'deadline passed ' + -d + 'd ago' : d === 0 ? 'due today' : 'due in ' + d + ' days'}` }); });
  DB.get('freelance', []).filter(f => f.deadline && !['Completed', 'Cancelled'].includes(f.status)).forEach(f => { const d = dleft(f.deadline);
    if (d <= 7) n.push({ l: d <= 2 ? 'red' : 'amber', t: `💼 ${f.title}: ${d < 0 ? 'overdue by ' + -d + 'd' : d === 0 ? 'due today' : 'due in ' + d + ' days'}` }); });
  attSummary().forEach(s => { if (s.level === 'danger') n.push({ l: 'red', t: `📅 ${s.subject}: ${s.pct}% is below ${Att.REQUIRED}%. Attend the next ${s.need} lecture(s).` });
    else if (s.level === 'warn') n.push({ l: 'amber', t: `📅 ${s.subject}: ${s.pct}% is close to the ${Att.REQUIRED}% limit (can miss ${s.canMiss}).` });
    if (s.unmarked) n.push({ l: 'blue', t: `📅 ${s.subject}: ${s.unmarked} past lecture(s) not marked yet.` }); });
  DB.get('courses', []).forEach(c => { if ((c.progress || 0) < 100 && !(c.minutes > 0)) n.push({ l: 'blue', t: `📚 ${c.name}: no study session logged yet.` }); });
  return n;
}
const lecs = () => Att.lectures(DB.get('timetable', []), DB.get('semester_start', ''));
const attSummary = () => Att.summarize(lecs(), DB.get('attendance', {}));
async function renderHome() {
  const courses = DB.get('courses', []), sch = DB.get('scholarships', []), fr = DB.get('freelance', []), as = attSummary();
  const P = as.reduce((a, s) => a + s.present, 0), T = as.reduce((a, s) => a + s.total, 0);
  const pct = T ? Math.round(P / T * 1000) / 10 : null;
  const avgProg = courses.length ? Math.round(courses.reduce((a, c) => a + (c.progress || 0), 0) / courses.length) : 0;
  const mins = courses.reduce((a, c) => a + (c.minutes || 0), 0);
  const today = lecs().filter(l => l.date === Att.ymd()), ns = notifications();
  const stat = (ico, v, label, page, bar) => `<div class="card tilt stat" data-act="go" data-page="${page}"><div class="ico">${ico}</div><div class="num">${v}</div><div class="sub">${label}</div>${bar != null ? `<div class="bar"><i style="width:${bar}%"></i></div>` : ''}</div>`;
  $('#home-body').innerHTML = `
    <div class="grid stats">
      ${stat('📚', courses.length, 'Courses · ' + avgProg + '% avg progress', 'courses', avgProg)}
      ${stat('📅', pct === null ? '–' : pct + '%', 'Attendance (marked lectures)', 'attendance', pct)}
      ${stat('🎓', sch.filter(s => !['Accepted', 'Rejected'].includes(s.status)).length, 'Open scholarships', 'scholarships')}
      ${stat('💼', fr.filter(f => ['Proposal Sent', 'Active'].includes(f.status)).length, 'Active freelance', 'freelance')}
      ${stat('⏱️', (mins / 60).toFixed(1) + 'h', 'Study time logged', 'courses')}
    </div>
    <div class="grid two">
      <div class="card"><div class="title">🔔 Notifications</div>${ns.length ? ns.map(x => `<div class="note ${x.l}">${esc(x.t)}</div>`).join('') : '<div class="sub">All clear. Nothing needs attention.</div>'}</div>
      <div class="card"><div class="title">🗓️ Today's lectures</div>${today.length ? today.map(l => `<div class="row"><span>${esc(l.subject)}</span><span class="sub">${esc(l.start)}–${esc(l.end)} · ${l.phase}</span></div>`).join('') : '<div class="sub">No lectures scheduled today.</div>'}</div>
    </div>`;
  const h = await AI.health();
  $('#api-banner').className = 'banner ' + (h?.ai ? 'ok' : 'bad');
  $('#api-banner').textContent = !h ? '⚠️ Backend not reachable: AI features are offline (your data still works).' : h.ai ? '✅ AI backend ready' : '🔑 Backend is running but GROQ_API_KEY is not set on the server.';
}

// ---------- AI Tutor ----------
function renderTutor() { renderMsgs($('#chat-box'), App.chat); }
const sendTutor = () => { const i = $('#chat-input'), t = i.value.trim(); if (!t) return; converse({ mode: 'tutor', msgs: App.chat, box: $('#chat-box'), save: () => DB.set('chat_history', App.chat.slice(-40), true), text: t, input: i }); };

// ---------- Courses ----------
function renderCourses() {
  if (App.openCourse) return renderCourseDetail();
  $('#course-main').hidden = false; $('#course-detail').hidden = true;
  const cs = DB.get('courses', []);
  $('#course-list').innerHTML = cs.length ? cs.map(c => `<div class="card tilt"><div class="row"><div data-act="open-course" data-id="${c.id}" class="grow click"><div class="title">📘 ${esc(c.name)}</div>
    <div class="sub">${Docs.list(c.id).length} document(s) · ${c.progress || 0}% complete · ${((c.minutes || 0) / 60).toFixed(1)}h studied</div></div>
    <button class="btn sm" data-act="course-edit" data-id="${c.id}">Edit</button><button class="btn sm danger" data-act="course-del" data-id="${c.id}">Delete</button></div>
    <div class="bar"><i style="width:${c.progress || 0}%"></i></div></div>`).join('') : empty('📚', 'No courses yet. Add your first one above.');
}
function saveCourse() {
  const name = val('course-name'), id = Number($('#course-edit-id').value) || 0, cs = DB.get('courses', []);
  if (!name) return toast('Enter a course name'); if (name.length > 80) return toast('Course name is too long (max 80)');
  if (cs.some(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id)) return toast('A course with that name already exists');
  if (id) cs.find(c => c.id === id).name = name; else cs.push({ id: DB.uid(), name, files: [], progress: 0, minutes: 0, created: new Date().toISOString() });
  if (!DB.set('courses', cs)) return; $('#course-name').value = ''; $('#course-edit-id').value = ''; $('#course-save').textContent = '➕ Create course'; toast(id ? 'Course updated' : 'Course added'); renderCourses();
}
function renderCourseDetail() {
  const c = DB.get('courses', []).find(x => x.id === App.openCourse); if (!c) { App.openCourse = null; return renderCourses(); }
  $('#course-main').hidden = true; const box = $('#course-detail'); box.hidden = false;
  App.cchat = DB.get('cchat_' + c.id, []); const docs = Docs.list(c.id);
  box.innerHTML = `<button class="btn sm" data-act="course-back">← Back</button><div class="h2">${esc(c.name)}</div>
  <div class="grid two"><div class="card"><div class="title">📈 Progress</div><input type="range" min="0" max="100" value="${c.progress || 0}" data-change="progress" data-id="${c.id}" aria-label="Course completion"><div class="sub">${c.progress || 0}% complete</div>
    <label>Log a study session (minutes)</label><div class="row"><input id="study-min" class="input" type="number" min="1" max="720" placeholder="45"><button class="btn sm primary" data-act="log-study" data-id="${c.id}">Log</button></div>
    <div class="sub">Total: ${((c.minutes || 0) / 60).toFixed(1)}h</div></div>
  <div class="card"><div class="title">📁 Documents (${docs.length})</div>${docs.map(d => `<div class="row"><div class="grow"><b>${esc(d.name)}</b><div class="sub">${esc(d.type)} · ${d.chunks.length} chunks · ${(d.chars / 1000).toFixed(1)}k chars</div></div><button class="btn sm danger" data-act="doc-del" data-id="${d.id}">✕</button></div>`).join('') || '<div class="sub">No readable documents yet.</div>'}
    ${(c.files || []).length ? `<div class="sub" style="margin-top:8px">Legacy entries (name only, the AI cannot read these): ${c.files.map(f => esc(f.name)).join(', ')} <button class="btn sm" data-act="legacy-clear" data-id="${c.id}">Remove</button></div>` : ''}
    <label>Upload PDF or TXT (multiple allowed)</label><input id="doc-file" class="input" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain" multiple>
    <button class="btn primary" data-act="doc-upload" data-id="${c.id}" id="doc-up-btn">Upload &amp; index</button>
    <details><summary>Or paste a note</summary><input id="note-name" class="input" placeholder="Note title" maxlength="80"><textarea id="note-text" class="input" rows="4" placeholder="Paste text…"></textarea><button class="btn" data-act="note-add" data-id="${c.id}">Save note</button></details></div></div>
  <div class="card"><div class="title">💎 Course AI Gem</div><div class="sub">Searches your uploaded material first, then answers. Replies separate "From your notes" from general knowledge.</div>
    <div class="chips"><button class="chip" data-act="gem-quick" data-id="${c.id}" data-q="Summarize my notes for this course in clear bullet points.">Summarize</button><button class="chip" data-act="gem-quick" data-id="${c.id}" data-q="Create 5 quiz questions with answers from my notes.">Quiz</button><button class="chip" data-act="gem-quick" data-id="${c.id}" data-q="Create 8 flashcards (Front / Back) from my notes.">Flashcards</button><button class="chip" data-act="gem-quick" data-id="${c.id}" data-q="Make a 7-day study plan based on my notes.">Study plan</button><button class="chip" data-act="gem-clear" data-id="${c.id}">Clear chat</button></div>
    <div id="gem-box" class="chat"></div><div class="row"><input id="gem-input" class="input" data-enter="gem-send" data-id="${c.id}" placeholder="Ask about this course…" maxlength="2000"><button class="btn primary send-btn" data-act="gem-send" data-id="${c.id}">Send</button></div></div>`;
  renderMsgs($('#gem-box'), App.cchat);
}
function gemAsk(id, text, broad) {
  const c = DB.get('courses', []).find(x => x.id === id); if (!c || !text) return;
  const hits = broad ? Docs.sample(id) : Docs.retrieve(id, text);
  const note = !Docs.list(id).length ? '\n(No documents are uploaded for this course.)' : !hits.length ? '\n(No excerpts matched this question.)' : '';
  const i = $('#gem-input');
  converse({ mode: 'course', msgs: App.cchat, box: $('#gem-box'), save: () => DB.set('cchat_' + id, App.cchat.slice(-40), true), text: text + note, input: broad ? null : i, context: Docs.toContext(hits) });
}

// ---------- Attendance ----------
function renderAttendance() {
  const tt = DB.get('timetable', []), start = DB.get('semester_start', ''), att = DB.get('attendance', {}), all = lecs(), today = Att.ymd();
  $('#att-start').value = start;
  $('#tt-list').innerHTML = tt.length ? tt.map((t, i) => `<div class="row"><div class="grow"><b>${esc(t.day)}</b> · ${esc(t.subject)} <span class="sub">${esc(t.start)}–${esc(t.end)}</span></div><button class="btn sm danger" data-act="tt-del" data-i="${i}">✕</button></div>`).join('') : '<div class="sub">No lectures yet.</div>';
  const btns = l => { const st = Att.statusOf(att, l), off = l.phase === 'upcoming' ? ' disabled' : '';
    return `<div class="row wrap"><div class="grow"><b>${esc(l.subject)}</b> <span class="sub">${esc(l.date)} ${esc(l.start)}–${esc(l.end)} · ${st ? '✔ ' + st : l.phase === 'upcoming' ? 'upcoming' : l.phase === 'ongoing' ? 'in progress' : 'unmarked'}</span></div>
    ${['present', 'absent', 'leave'].map(s => `<button class="btn sm ${st === s ? 'primary' : ''}"${off} data-act="mark" data-key="${esc(l.key)}" data-st="${s}">${s === 'leave' ? 'Leave' : s[0].toUpperCase() + s.slice(1)}</button>`).join('')}${st ? `<button class="btn sm"${off} data-act="mark" data-key="${esc(l.key)}" data-st="clear">Clear</button>` : ''}</div>`; };
  const td = all.filter(l => l.date === today);
  $('#att-today').innerHTML = !tt.length ? '<div class="sub">Add your timetable first.</div>' : td.length ? td.map(btns).join('') : `<div class="sub">No lectures scheduled today (${Att.weekday(today)}).</div>`;
  const un = all.filter(l => l.date < today && !Att.statusOf(att, l)).slice(-30).reverse();
  $('#att-unmarked').innerHTML = un.length ? un.map(btns).join('') : '<div class="sub">Nothing unmarked. 🎉</div>';
  const sm = attSummary(), label = { safe: '✅ Safe', warn: '⚠️ Close to limit', danger: '🔴 Below ' + Att.REQUIRED + '%', none: 'No marked lectures' };
  $('#att-sum').innerHTML = sm.length ? sm.map(s => `<div class="card att-${s.level}"><div class="row"><div class="grow"><div class="title">${esc(s.subject)}</div>
    <div class="sub">Present ${s.present} · Absent ${s.absent} · Leave ${s.leave} · Unmarked ${s.unmarked} · Upcoming today ${s.upcoming}</div></div><div class="pct">${s.pct === null ? '–' : s.pct + '%'}<div class="sub">${label[s.level]}</div></div></div>
    ${s.pct !== null ? `<div class="bar"><i style="width:${s.pct}%"></i></div><div class="sub">${s.need ? `Attend the next <b>${s.need}</b> lecture(s) in a row to reach ${Att.REQUIRED}%.` : `You can miss <b>${s.canMiss}</b> more lecture(s) and stay at ${Att.REQUIRED}%+.`}${s.unmarked ? ` Mark ${s.unmarked} unmarked lecture(s) for an accurate figure.` : ''}</div>` : ''}</div>`).join('') : empty('📊', 'Set a semester start date and timetable; past lectures appear above to mark.');
}
function addTT() {
  const day = $('#tt-day').value, subject = val('tt-subject'), start = $('#tt-start').value, end = $('#tt-end').value, tt = DB.get('timetable', []);
  if (!subject) return toast('Enter a subject'); if (!start || !end) return toast('Choose start and end times'); if (end <= start) return toast('End time must be after start time');
  if (tt.some(t => t.day === day && t.start < end && start < t.end)) return toast('That overlaps another lecture on ' + day);
  tt.push({ day, subject, start, end }); DB.set('timetable', tt);
  if (!DB.get('semester_start')) { DB.set('semester_start', Att.ymd()); toast('Semester start set to today. Change it below if classes began earlier.'); } else toast('Lecture added');
  $('#tt-subject').value = ''; renderAttendance();
}

// ---------- Scholarships ----------
function renderSch() {
  const l = DB.get('scholarships', []).slice().sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999'));
  $('#sch-list').innerHTML = l.length ? l.map(s => `<div class="card tilt"><div class="row"><div class="grow"><div class="title">${esc(s.name)}</div><div class="sub">${esc(s.category || 'Other')} ${dueBadge(s.deadline)}</div></div>
    <select class="select sm" data-change="sch-status" data-id="${s.id}">${sel(SCH_STATUS, s.status)}</select></div>
    ${s.link && isHttpUrl(s.link) ? `<a href="${esc(s.link)}" target="_blank" rel="noopener noreferrer">Open link ↗</a>` : ''}${s.notes ? `<div class="notes">${esc(s.notes)}</div>` : ''}
    <div class="row"><button class="btn sm" data-act="sch-edit" data-id="${s.id}">Edit</button><button class="btn sm danger" data-act="sch-del" data-id="${s.id}">Delete</button></div></div>`).join('') : empty('🎓', 'No scholarships yet');
  $('#sch-status').innerHTML = sel(SCH_STATUS, 'Planned'); $('#sch-cat').innerHTML = sel(SCH_CAT, '');
}
function saveSch() {
  const o = { name: val('sch-name'), link: val('sch-link'), deadline: $('#sch-deadline').value, notes: val('sch-notes'), category: $('#sch-cat').value, status: $('#sch-status').value }, id = Number($('#sch-id').value) || 0;
  if (!o.name) return toast('Enter a name'); if (o.link && !isHttpUrl(o.link)) return toast('Link must start with http:// or https://'); if (o.deadline && !isDate(o.deadline)) return toast('Invalid deadline date');
  const l = DB.get('scholarships', []); if (id) Object.assign(l.find(s => s.id === id), o); else l.unshift({ ...o, id: DB.uid(), created: new Date().toISOString() });
  DB.set('scholarships', l); ['sch-name', 'sch-link', 'sch-deadline', 'sch-notes', 'sch-id'].forEach(i => $('#' + i).value = ''); $('#sch-save').textContent = 'Save scholarship'; toast(id ? 'Updated' : 'Saved'); renderSch();
}

// ---------- Freelance ----------
function renderFr() {
  const l = DB.get('freelance', []);
  $('#fr-list').innerHTML = l.length ? l.map(f => `<div class="card tilt"><div class="row"><div class="grow"><div class="title">${esc(f.platform)} · ${esc(f.title)}</div><div class="sub">${dueBadge(f.deadline)}</div></div>
    <select class="select sm" data-change="fr-status" data-id="${f.id}">${sel(FR_STATUS, f.status)}</select></div>${f.notes ? `<div class="notes">${esc(f.notes)}</div>` : ''}
    <div class="row"><button class="btn sm" data-act="fr-edit" data-id="${f.id}">Edit</button><button class="btn sm danger" data-act="fr-del" data-id="${f.id}">Delete</button></div></div>`).join('') : empty('💼', 'No items yet');
  $('#fr-platform').innerHTML = sel(FR_PLAT, ''); $('#fr-status').innerHTML = sel(FR_STATUS, 'Idea');
}
function saveFr() {
  const o = { platform: $('#fr-platform').value, title: val('fr-title'), notes: val('fr-notes'), deadline: $('#fr-deadline').value, status: $('#fr-status').value }, id = Number($('#fr-id').value) || 0;
  if (!o.title) return toast('Enter a title'); if (o.deadline && !isDate(o.deadline)) return toast('Invalid deadline date');
  const l = DB.get('freelance', []); if (id) Object.assign(l.find(f => f.id === id), o); else l.unshift({ ...o, id: DB.uid(), created: new Date().toISOString() });
  DB.set('freelance', l); ['fr-title', 'fr-notes', 'fr-deadline', 'fr-id'].forEach(i => $('#' + i).value = ''); $('#fr-save').textContent = 'Save item'; toast(id ? 'Updated' : 'Saved'); renderFr();
}
async function askFr() {
  const q = val('fr-ai-q'); if (!q || AI.busy) return q ? 0 : toast('Type a question'); AI.busy = true; setBusy(true);
  const box = $('#fr-ai-answer'); box.innerHTML = '<div class="msg ai typing"><i></i><i></i><i></i></div>';
  const items = DB.get('freelance', []).slice(0, 8).map(f => `${f.platform}: ${f.title} (${f.status})`).join('; ');
  try { box.innerHTML = `<div class="msg ai">${md(await AI.chat('freelance', [{ role: 'user', content: `${q}${items ? '\n\nMy current items: ' + items : ''}` }]))}</div>`; }
  catch (e) { box.innerHTML = `<div class="msg ai err">⚠️ ${esc(e.message)}</div>`; } finally { AI.busy = false; setBusy(false); }
}

// ---------- Settings ----------
async function renderSettings() {
  $('#motion-toggle').checked = Motion.reduced(); Cloud.ui();
  const h = await AI.health(); $('#ai-status').textContent = !h ? '❌ Backend not reachable' : h.ai ? '✅ Backend OK, GROQ_API_KEY configured' : '⚠️ Backend OK, but GROQ_API_KEY is missing on the server';
}

// ---------- Actions ----------
const byId = (k, id) => DB.get(k, []).find(x => x.id === Number(id));
const del = (k, id, msg, after) => { if (confirm(msg)) { DB.set(k, DB.get(k, []).filter(x => x.id !== Number(id))); after(); toast('Deleted'); } };
const Acts = {
  go: d => App.go(d.page),
  'send-tutor': sendTutor,
  'clear-chat': () => { if (confirm('Clear all tutor chat history?')) { App.chat = []; DB.set('chat_history', [], true); renderTutor(); } },
  'notes-pdf': () => { const m = [...App.chat].reverse().find(x => x.role === 'assistant'); if (!m) return toast('No AI answer to export yet');
    if (!NotesExport.printPdf(m.content, Att.ymd())) toast('Allow pop-ups to open the print / PDF view.'); },
  'notes-word': () => { const m = [...App.chat].reverse().find(x => x.role === 'assistant'); if (!m) return toast('No AI answer to export yet');
    NotesExport.downloadWord(m.content, Att.ymd()); },
  quick: d => { const i = $('#chat-input'); i.value = d.q; i.focus(); },
  'course-save': saveCourse,
  'course-edit': d => { const c = byId('courses', d.id); $('#course-name').value = c.name; $('#course-edit-id').value = c.id; $('#course-save').textContent = '💾 Update course'; $('#course-name').focus(); },
  'course-del': d => { if (confirm('Delete this course and all its documents and chat?')) { DB.set('courses', DB.get('courses', []).filter(c => c.id !== Number(d.id))); localStorage.removeItem('ai_partner_docs_' + d.id); localStorage.removeItem('ai_partner_cchat_' + d.id); renderCourses(); toast('Course deleted'); } },
  'open-course': d => { App.openCourse = Number(d.id); renderCourses(); },
  'course-back': () => { App.openCourse = null; renderCourses(); },
  'log-study': d => { const m = Math.round(Number($('#study-min').value)); if (!(m >= 1 && m <= 720)) return toast('Enter 1–720 minutes');
    const cs = DB.get('courses', []); cs.find(c => c.id === Number(d.id)).minutes = (cs.find(c => c.id === Number(d.id)).minutes || 0) + m; DB.set('courses', cs); toast('Logged ' + m + ' min'); renderCourseDetail(); },
  'doc-upload': async d => {
    const files = [...$('#doc-file').files]; if (!files.length) return toast('Choose a PDF or TXT file first');
    const b = $('#doc-up-btn'); b.disabled = true; let ok = 0;
    for (const f of files) { b.textContent = 'Reading ' + f.name + '…'; try { const n = await Docs.add(Number(d.id), f); ok++; toast(`${f.name}: indexed ${n} chunks`); } catch (e) { toast(f.name + ': ' + e.message); await new Promise(r => setTimeout(r, 1200)); } }
    if (App.openCourse) renderCourseDetail();
  },
  'note-add': d => { const n = val('note-name'), t = $('#note-text').value.trim(); if (!n || !t) return toast('Enter a title and some text');
    try { Docs.addText(Number(d.id), n, t); renderCourseDetail(); toast('Note saved'); } catch (e) { toast(e.message); } },
  'doc-del': d => { if (confirm('Remove this document?')) { Docs.remove(App.openCourse, Number(d.id)); renderCourseDetail(); } },
  'legacy-clear': d => { const cs = DB.get('courses', []); cs.find(c => c.id === Number(d.id)).files = []; DB.set('courses', cs); renderCourseDetail(); },
  'gem-send': d => { const i = $('#gem-input'), t = i.value.trim(); if (t) gemAsk(Number(d.id), t, false); },
  'gem-quick': d => gemAsk(Number(d.id), d.q, true),
  'gem-clear': d => { if (confirm('Clear this course chat?')) { App.cchat = []; DB.set('cchat_' + d.id, [], true); renderMsgs($('#gem-box'), []); } },
  'tt-del': d => { const t = DB.get('timetable', []); t.splice(Number(d.i), 1); DB.set('timetable', t); renderAttendance(); },
  'set-start': () => { const v = $('#att-start').value; if (!isDate(v)) return toast('Choose a valid date'); if (v > Att.ymd()) return toast('Semester start cannot be in the future'); DB.set('semester_start', v); toast('Semester start saved'); renderAttendance(); },
  'tt-add': addTT,
  mark: d => { const l = lecs().find(x => x.key === d.key); if (!l) return toast('That lecture is not on your timetable'); if (l.phase === 'upcoming') return toast('This lecture has not started yet');
    const a = DB.get('attendance', {}); d.st === 'clear' ? delete a[l.key] : a[l.key] = d.st; delete a[`${l.subject}|${l.date}`]; DB.set('attendance', a); renderAttendance(); },
  'sch-save': saveSch,
  'sch-edit': d => { const s = byId('scholarships', d.id); $('#sch-name').value = s.name; $('#sch-link').value = s.link || ''; $('#sch-deadline').value = s.deadline || ''; $('#sch-notes').value = s.notes || ''; $('#sch-cat').value = s.category || 'Other'; $('#sch-status').value = s.status; $('#sch-id').value = s.id; $('#sch-save').textContent = '💾 Update scholarship'; $('#sch-name').focus(); },
  'sch-del': d => del('scholarships', d.id, 'Delete this scholarship?', renderSch),
  'fr-save': saveFr,
  'fr-edit': d => { const f = byId('freelance', d.id); $('#fr-platform').value = f.platform; $('#fr-title').value = f.title; $('#fr-notes').value = f.notes || ''; $('#fr-deadline').value = f.deadline || ''; $('#fr-status').value = f.status; $('#fr-id').value = f.id; $('#fr-save').textContent = '💾 Update item'; $('#fr-title').focus(); },
  'fr-del': d => del('freelance', d.id, 'Delete this item?', renderFr),
  'fr-ask': askFr,
  login: () => Cloud.signIn(), logout: () => Cloud.signOut(),
};
const Changes = {
  progress: (d, el) => { const cs = DB.get('courses', []); cs.find(c => c.id === Number(d.id)).progress = Number(el.value); DB.set('courses', cs); el.nextElementSibling.textContent = el.value + '% complete'; },
  'sch-status': (d, el) => { const l = DB.get('scholarships', []); l.find(s => s.id === Number(d.id)).status = el.value; DB.set('scholarships', l); toast('Status updated'); },
  'fr-status': (d, el) => { const l = DB.get('freelance', []); l.find(s => s.id === Number(d.id)).status = el.value; DB.set('freelance', l); toast('Status updated'); },
};
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) Acts[b.dataset.act]?.(b.dataset, b); });
document.addEventListener('input', e => { const el = e.target; if (el.dataset.change === 'progress') el.nextElementSibling.textContent = el.value + '% complete'; });
document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el) Changes[el.dataset.change]?.(el.dataset, el); });
document.addEventListener('keydown', e => { const el = e.target; if (e.key === 'Enter' && !e.shiftKey && el.dataset?.enter) { e.preventDefault(); Acts[el.dataset.enter]?.(el.dataset, el); } });
window.addEventListener('DOMContentLoaded', () => {
  initUI(); $('#motion-toggle').addEventListener('change', e => Motion.set(e.target.checked));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  App.go(location.hash.slice(1) || 'home'); Cloud.init();
});
window.addEventListener('hashchange', () => { const p = location.hash.slice(1); if (p !== App.page) App.go(p); });
window.addEventListener('unhandledrejection', e => { console.error('Unhandled:', e.reason?.message || 'error'); });
