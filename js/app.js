// Main application logic

let currentPage = "home";
let chatMessages = DB.getChat();
let courseChatMessages = {};

// ---------- Navigation ----------
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const page = document.getElementById("page-" + pageId);
  if (page) page.classList.add("active");

  const nav = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (nav) nav.classList.add("active");

  currentPage = pageId;

  // Refresh page content
  if (pageId === "home") renderHome();
  if (pageId === "tutor") renderTutor();
  if (pageId === "degree") renderDegree();
  if (pageId === "attendance") renderAttendance();
  if (pageId === "scholarships") renderScholarships();
  if (pageId === "freelance") renderFreelance();
  if (pageId === "settings") renderSettings();
}

// ---------- Toast ----------
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2500);
}

// ---------- Home ----------
function renderHome() {
  const key = DB.getApiKey();
  const banner = document.getElementById("api-banner");
  if (key) {
    banner.innerHTML = `✅ AI is ready! You can chat in the Tutor section.`;
    banner.style.background = "linear-gradient(90deg, #059669, #10b981)";
  } else {
    banner.innerHTML = `🔑 <strong>One-time setup:</strong> Go to <a href="#" onclick="showPage('settings')">Settings</a> and paste your free Groq API key (30 seconds).`;
  }

  // Quick stats
  const summary = DB.getAttendanceSummary();
  const subjects = Object.keys(summary).length;
  const scholarships = DB.getScholarships().length;
  const freelance = DB.getFreelance().length;
  const courses = DB.getCourses().length;

  document.getElementById("home-stats").innerHTML = `
    <div class="card">
      <div class="card-title">📊 Quick Overview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
        <div style="text-align:center;padding:10px;background:#0f172a;border-radius:12px;">
          <div style="font-size:1.5rem;font-weight:700;">${courses}</div>
          <div class="card-sub">Courses</div>
        </div>
        <div style="text-align:center;padding:10px;background:#0f172a;border-radius:12px;">
          <div style="font-size:1.5rem;font-weight:700;">${subjects}</div>
          <div class="card-sub">Subjects tracked</div>
        </div>
        <div style="text-align:center;padding:10px;background:#0f172a;border-radius:12px;">
          <div style="font-size:1.5rem;font-weight:700;">${scholarships}</div>
          <div class="card-sub">Scholarships</div>
        </div>
        <div style="text-align:center;padding:10px;background:#0f172a;border-radius:12px;">
          <div style="font-size:1.5rem;font-weight:700;">${freelance}</div>
          <div class="card-sub">Freelance items</div>
        </div>
      </div>
    </div>
  `;
}

// ---------- AI Tutor ----------
function renderTutor() {
  const container = document.getElementById("chat-messages");
  container.innerHTML = "";
  chatMessages.forEach(m => {
    const div = document.createElement("div");
    div.className = `msg ${m.role === "user" ? "user" : "ai"}`;
    div.textContent = m.content;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;

  chatMessages.push({ role: "user", content: text });
  input.value = "";
  renderTutor();

  // Show thinking
  const container = document.getElementById("chat-messages");
  const thinking = document.createElement("div");
  thinking.className = "msg ai";
  thinking.id = "thinking";
  thinking.textContent = "Thinking...";
  container.appendChild(thinking);
  container.scrollTop = container.scrollHeight;

  const reply = await askAI(chatMessages);
  chatMessages.push({ role: "assistant", content: reply });
  DB.saveChat(chatMessages);

  document.getElementById("thinking")?.remove();
  renderTutor();
}

function clearChat() {
  if (confirm("Clear all chat history?")) {
    chatMessages = [];
    DB.saveChat([]);
    renderTutor();
    toast("Chat cleared");
  }
}

function downloadLastAsPDF() {
  const lastAI = [...chatMessages].reverse().find(m => m.role === "assistant");
  if (!lastAI) {
    toast("No AI answer to download yet");
    return;
  }
  // Simple text download (jsPDF would be heavier; this works offline)
  const blob = new Blob([`AI Learning Partner Notes\n\n${lastAI.content}`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "AI_Notes_" + new Date().toISOString().slice(0, 10) + ".txt";
  a.click();
  URL.revokeObjectURL(url);
  toast("Notes downloaded");
}

// ---------- Degree ----------
function renderDegree() {
  const courses = DB.getCourses();
  const list = document.getElementById("course-list");
  if (courses.length === 0) {
    list.innerHTML = `<div class="empty"><div class="icon">📚</div>No courses yet.<br>Add your first course below.</div>`;
    return;
  }
  list.innerHTML = courses.map(c => `
    <div class="card" onclick="openCourse(${c.id})">
      <div class="card-title">📘 ${c.name}</div>
      <div class="card-sub">${c.files.length} file(s) • Tap to open</div>
    </div>
  `).join("");
}

function addCourse() {
  const name = document.getElementById("new-course-name").value.trim();
  if (!name) return toast("Enter course name");
  if (DB.addCourse(name)) {
    document.getElementById("new-course-name").value = "";
    toast("Course added");
    renderDegree();
  } else {
    toast("Course already exists");
  }
}

function openCourse(id) {
  const course = DB.getCourse(id);
  if (!course) return;

  document.getElementById("degree-main").style.display = "none";
  document.getElementById("degree-detail").style.display = "block";
  document.getElementById("detail-course-name").textContent = course.name;
  document.getElementById("detail-course-id").value = id;

  // Files
  const fileList = document.getElementById("course-files");
  if (course.files.length === 0) {
    fileList.innerHTML = `<div class="empty" style="padding:20px;">No files yet. Upload below.</div>`;
  } else {
    fileList.innerHTML = course.files.map(f => `
      <div class="file-item">
        <div class="file-icon">📄</div>
        <div style="flex:1;">
          <div style="font-weight:600;">${f.name}</div>
          <div class="card-sub">${f.tags || "No tags"}</div>
        </div>
      </div>
    `).join("");
  }

  // Course chat
  if (!courseChatMessages[id]) courseChatMessages[id] = [];
  renderCourseChat(id);
}

function backToCourses() {
  document.getElementById("degree-detail").style.display = "none";
  document.getElementById("degree-main").style.display = "block";
  renderDegree();
}

function addFileToCourse() {
  const id = Number(document.getElementById("detail-course-id").value);
  const name = document.getElementById("file-name").value.trim();
  const tags = document.getElementById("file-tags").value.trim();
  if (!name) return toast("Enter file name");

  DB.addFileToCourse(id, {
    name,
    tags,
    added: new Date().toISOString()
  });
  document.getElementById("file-name").value = "";
  document.getElementById("file-tags").value = "";
  toast("File added");
  openCourse(id);
}

function renderCourseChat(id) {
  const container = document.getElementById("course-chat-messages");
  container.innerHTML = "";
  (courseChatMessages[id] || []).forEach(m => {
    const div = document.createElement("div");
    div.className = `msg ${m.role === "user" ? "user" : "ai"}`;
    div.textContent = m.content;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

async function sendCourseChat() {
  const id = Number(document.getElementById("detail-course-id").value);
  const input = document.getElementById("course-chat-input");
  const text = input.value.trim();
  if (!text) return;

  if (!courseChatMessages[id]) courseChatMessages[id] = [];
  courseChatMessages[id].push({ role: "user", content: text });
  input.value = "";
  renderCourseChat(id);

  const course = DB.getCourse(id);
  const fileList = course.files.map(f => `- ${f.name} (tags: ${f.tags || "none"})`).join("\n");

  const thinking = document.createElement("div");
  thinking.className = "msg ai";
  thinking.id = "course-thinking";
  thinking.textContent = "Reading your notes...";
  document.getElementById("course-chat-messages").appendChild(thinking);

  const reply = await askCourseAI(courseChatMessages[id], course.name, fileList);
  courseChatMessages[id].push({ role: "assistant", content: reply });
  document.getElementById("course-thinking")?.remove();
  renderCourseChat(id);
}

// ---------- Attendance ----------
function renderAttendance() {
  const timetable = DB.getTimetable();
  const summary = DB.getAttendanceSummary();

  // Timetable list
  const tt = document.getElementById("timetable-list");
  if (timetable.length === 0) {
    tt.innerHTML = `<div class="empty" style="padding:16px;">No timetable yet. Add lectures below.</div>`;
  } else {
    tt.innerHTML = timetable.map((t, i) => `
      <div class="card" style="padding:12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong>${t.day}</strong> • ${t.subject}<br>
          <span class="card-sub">${t.start || ""} - ${t.end || ""}</span>
        </div>
        <button class="btn btn-sm btn-outline" onclick="removeTimetable(${i})">✕</button>
      </div>
    `).join("");
  }

  // Mark attendance
  const subjects = [...new Set(timetable.map(t => t.subject))];
  const markArea = document.getElementById("mark-attendance");
  if (subjects.length === 0) {
    markArea.innerHTML = `<div class="empty">Add timetable first</div>`;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    markArea.innerHTML = `
      <div class="card-sub" style="margin-bottom:10px;">Today: ${new Date().toLocaleDateString("en-PK", {weekday:"long", day:"numeric", month:"long"})}</div>
      <div class="att-grid">
        ${subjects.map(s => `
          <button class="att-btn present" onclick="markAtt('${s}','${today}','present')">✅ ${s}</button>
          <button class="att-btn absent" onclick="markAtt('${s}','${today}','absent')">❌ ${s}</button>
        `).join("")}
      </div>
    `;
  }

  // Summary
  const sumArea = document.getElementById("att-summary");
  if (Object.keys(summary).length === 0) {
    sumArea.innerHTML = `<div class="empty">No attendance marked yet</div>`;
  } else {
    sumArea.innerHTML = Object.entries(summary).map(([subj, data]) => {
      let cls = "att-safe";
      let status = "✅ Safe";
      if (data.percentage < 70) { cls = "att-danger"; status = "🔴 Must Attend"; }
      else if (data.percentage < 80) { cls = "att-warn"; status = "⚠️ Warning"; }

      return `
        <div class="card ${cls}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div class="card-title">${subj}</div>
              <div class="card-sub">${data.present}/${data.total} lectures</div>
            </div>
            <div style="text-align:right;">
              <div class="att-percent">${data.percentage}%</div>
              <div style="font-size:0.8rem;">${status}</div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
}

function addTimetable() {
  const day = document.getElementById("tt-day").value;
  const subject = document.getElementById("tt-subject").value.trim();
  const start = document.getElementById("tt-start").value.trim();
  const end = document.getElementById("tt-end").value.trim();
  if (!subject) return toast("Enter subject name");

  const list = DB.getTimetable();
  list.push({ day, subject, start, end });
  DB.setTimetable(list);
  document.getElementById("tt-subject").value = "";
  toast("Added to timetable");
  renderAttendance();
}

function removeTimetable(idx) {
  const list = DB.getTimetable();
  list.splice(idx, 1);
  DB.setTimetable(list);
  renderAttendance();
}

function markAtt(subject, dateStr, status) {
  DB.markAttendance(subject, dateStr, status);
  toast(status === "present" ? "Marked Present" : "Marked Absent");
  renderAttendance();
}

// ---------- Scholarships ----------
function renderScholarships() {
  const list = DB.getScholarships();
  const area = document.getElementById("scholarship-list");
  if (list.length === 0) {
    area.innerHTML = `<div class="empty"><div class="icon">🎓</div>No scholarships yet</div>`;
    return;
  }
  area.innerHTML = list.map(s => `
    <div class="card">
      <div class="card-title">${s.name}</div>
      ${s.link ? `<a href="${s.link}" target="_blank" style="color:#a5b4fc;font-size:0.9rem;">Open link ↗</a><br>` : ""}
      <div class="card-sub" style="margin:6px 0;">Status: <span class="badge badge-blue">${s.status || "Applied"}</span>
        ${s.deadline ? ` • Deadline: ${s.deadline}` : ""}</div>
      ${s.notes ? `<div style="font-size:0.9rem;margin-top:6px;">${s.notes}</div>` : ""}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-sm btn-outline" onclick="updateSchStatus(${s.id})">Update Status</button>
        <button class="btn btn-sm btn-danger" onclick="deleteSch(${s.id})">Delete</button>
      </div>
    </div>
  `).join("");
}

function addScholarship() {
  const name = document.getElementById("sch-name").value.trim();
  const link = document.getElementById("sch-link").value.trim();
  const deadline = document.getElementById("sch-deadline").value.trim();
  const notes = document.getElementById("sch-notes").value.trim();
  if (!name) return toast("Enter name");
  DB.addScholarship({ name, link, deadline, notes, status: "Applied" });
  document.getElementById("sch-name").value = "";
  document.getElementById("sch-link").value = "";
  document.getElementById("sch-deadline").value = "";
  document.getElementById("sch-notes").value = "";
  toast("Scholarship added");
  renderScholarships();
}

function updateSchStatus(id) {
  const status = prompt("New status (Applied / Under Review / Interview / Accepted / Rejected / Need to Check):", "Need to Check");
  if (status) {
    DB.updateScholarship(id, { status, lastChecked: new Date().toISOString().slice(0,10) });
    renderScholarships();
    toast("Status updated");
  }
}

function deleteSch(id) {
  if (confirm("Delete this scholarship?")) {
    DB.deleteScholarship(id);
    renderScholarships();
    toast("Deleted");
  }
}

// ---------- Freelance ----------
function renderFreelance() {
  const list = DB.getFreelance();
  const area = document.getElementById("freelance-list");
  if (list.length === 0) {
    area.innerHTML = `<div class="empty"><div class="icon">💼</div>No items yet</div>`;
    return;
  }
  area.innerHTML = list.map(f => `
    <div class="card">
      <div class="card-title">${f.platform} • ${f.title}</div>
      <div class="card-sub">Status: <span class="badge badge-blue">${f.status || "Active"}</span></div>
      ${f.notes ? `<div style="margin-top:6px;font-size:0.9rem;">${f.notes}</div>` : ""}
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-sm btn-outline" onclick="updateFreelancer(${f.id})">Update</button>
        <button class="btn btn-sm btn-danger" onclick="deleteFreelancer(${f.id})">Delete</button>
      </div>
    </div>
  `).join("");
}

function addFreelance() {
  const platform = document.getElementById("fr-platform").value;
  const title = document.getElementById("fr-title").value.trim();
  const notes = document.getElementById("fr-notes").value.trim();
  if (!title) return toast("Enter title");
  DB.addFreelance({ platform, title, notes, status: "Active" });
  document.getElementById("fr-title").value = "";
  document.getElementById("fr-notes").value = "";
  toast("Added");
  renderFreelance();
}

function updateFreelancer(id) {
  const status = prompt("New status (Active / Paused / Completed / Need Attention):", "Active");
  if (status) {
    DB.updateFreelance(id, { status, lastAction: new Date().toISOString().slice(0,10) });
    renderFreelance();
    toast("Updated");
  }
}

function deleteFreelancer(id) {
  if (confirm("Delete this item?")) {
    DB.deleteFreelance(id);
    renderFreelance();
    toast("Deleted");
  }
}

async function askFreelanceAI() {
  const q = document.getElementById("fr-ai-q").value.trim();
  if (!q) return toast("Type a question");
  const box = document.getElementById("fr-ai-answer");
  box.innerHTML = `<div class="msg ai">Thinking...</div>`;
  const reply = await askAI([{ role: "user", content: `I am a BS AI student starting freelancing. Give practical short advice: ${q}` }]);
  box.innerHTML = `<div class="msg ai">${reply}</div>`;
}

// ---------- Settings ----------
function renderSettings() {
  const key = DB.getApiKey();
  document.getElementById("api-key-input").value = key ? "••••••••••••••••" : "";
  document.getElementById("api-status").textContent = key ? "✅ API Key is saved" : "❌ No API Key yet";
}

function saveApiKey() {
  const key = document.getElementById("api-key-input").value.trim();
  if (!key || key.startsWith("••")) {
    toast("Paste a real key");
    return;
  }
  if (!key.startsWith("gsk_")) {
    toast("Groq key should start with gsk_");
    return;
  }
  DB.setApiKey(key);
  toast("API Key saved!");
  renderSettings();
  renderHome();
}

function clearApiKey() {
  if (confirm("Remove API key?")) {
    DB.setApiKey("");
    toast("Key removed");
    renderSettings();
    renderHome();
  }
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  // Register service worker for PWA
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  // Nav clicks
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });

  // Chat enter key
  document.getElementById("chat-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendChat();
  });
  document.getElementById("course-chat-input")?.addEventListener("keydown", e => {
    if (e.key === "Enter") sendCourseChat();
  });

  showPage("home");
});
