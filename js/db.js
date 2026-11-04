// Simple localStorage database for the app

const DB = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem("ai_partner_" + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem("ai_partner_" + key, JSON.stringify(value));
  },

  // ---------- Settings ----------
  getApiKey() {
    return this.get("groq_api_key", "");
  },
  setApiKey(key) {
    this.set("groq_api_key", key);
  },

  // ---------- Courses ----------
  getCourses() {
    return this.get("courses", []);
  },
  addCourse(name) {
    const courses = this.getCourses();
    if (courses.find(c => c.name.toLowerCase() === name.toLowerCase())) return false;
    courses.push({
      id: Date.now(),
      name: name.trim(),
      files: [],
      created: new Date().toISOString()
    });
    this.set("courses", courses);
    return true;
  },
  getCourse(id) {
    return this.getCourses().find(c => c.id === id);
  },
  addFileToCourse(courseId, fileObj) {
    const courses = this.getCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    course.files.push(fileObj);
    this.set("courses", courses);
  },

  // ---------- Attendance ----------
  getTimetable() {
    return this.get("timetable", []);
  },
  setTimetable(list) {
    this.set("timetable", list);
  },
  getAttendance() {
    return this.get("attendance", {}); // { "Subject|YYYY-MM-DD": "present/absent/leave" }
  },
  markAttendance(subject, dateStr, status) {
    const att = this.getAttendance();
    att[`${subject}|${dateStr}`] = status;
    this.set("attendance", att);
  },
  getAttendanceSummary() {
    const att = this.getAttendance();
    const summary = {};
    Object.keys(att).forEach(key => {
      const [subject] = key.split("|");
      if (!summary[subject]) summary[subject] = { present: 0, total: 0 };
      summary[subject].total++;
      if (att[key] === "present") summary[subject].present++;
    });
    Object.keys(summary).forEach(s => {
      summary[s].percentage = summary[s].total
        ? Math.round((summary[s].present / summary[s].total) * 1000) / 10
        : 0;
    });
    return summary;
  },

  // ---------- Scholarships ----------
  getScholarships() {
    return this.get("scholarships", []);
  },
  addScholarship(item) {
    const list = this.getScholarships();
    list.unshift({ ...item, id: Date.now(), created: new Date().toISOString() });
    this.set("scholarships", list);
  },
  updateScholarship(id, updates) {
    const list = this.getScholarships();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      this.set("scholarships", list);
    }
  },
  deleteScholarship(id) {
    this.set("scholarships", this.getScholarships().filter(s => s.id !== id));
  },

  // ---------- Freelance ----------
  getFreelance() {
    return this.get("freelance", []);
  },
  addFreelance(item) {
    const list = this.getFreelance();
    list.unshift({ ...item, id: Date.now(), created: new Date().toISOString() });
    this.set("freelance", list);
  },
  updateFreelance(id, updates) {
    const list = this.getFreelance();
    const idx = list.findIndex(f => f.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      this.set("freelance", list);
    }
  },
  deleteFreelance(id) {
    this.set("freelance", this.getFreelance().filter(f => f.id !== id));
  },

  // ---------- Chat history ----------
  getChat() {
    return this.get("chat_history", []);
  },
  saveChat(messages) {
    this.set("chat_history", messages.slice(-40)); // keep last 40
  }
};
