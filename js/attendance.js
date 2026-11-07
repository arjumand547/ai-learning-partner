// Pure attendance logic (no DOM) so it can be unit-tested. All dates are Asia/Karachi calendar dates.
(function (root) {
  const TZ = 'Asia/Karachi', REQUIRED = 80;
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ymd = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const hm = (d = new Date()) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  const parts = s => s.split('-').map(Number);
  const weekday = s => { const [y, m, d] = parts(s); return DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]; };
  const addDays = (s, n) => { const [y, m, d] = parts(s); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
  const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

  // Every scheduled lecture from semester start through today. phase: past | ongoing | upcoming
  function lectures(timetable, start, now = new Date()) {
    const today = ymd(now), t = hm(now), out = [];
    if (!start || start > today) return out;
    const from = daysBetween(start, today) > 400 ? addDays(today, -400) : start;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const w = weekday(d);
      timetable.filter(x => x.day === w).forEach(x => out.push({
        key: `${x.subject}|${d}|${x.start}`, subject: x.subject, date: d, start: x.start, end: x.end,
        phase: d < today || t >= x.end ? 'past' : t >= x.start ? 'ongoing' : 'upcoming',
      }));
    }
    return out;
  }
  const statusOf = (att, l) => att[l.key] || att[`${l.subject}|${l.date}`] || null; // 2nd form = legacy v2 key
  // Integer maths avoids floating-point off-by-one errors.
  function plan(p, t, req = REQUIRED) {
    if (t === 0) return { need: 0, canMiss: 0 };
    if (100 * p >= req * t) return { need: 0, canMiss: Math.floor((100 * p - req * t) / req) };
    return { need: Math.ceil((req * t - 100 * p) / (100 - req)), canMiss: 0 };
  }
  // Approved leave is excluded from the denominator. Unmarked past lectures are reported separately, never silently counted.
  function summarize(lecs, att, req = REQUIRED) {
    const s = {};
    lecs.forEach(l => {
      const r = s[l.subject] ||= { subject: l.subject, present: 0, absent: 0, leave: 0, unmarked: 0, upcoming: 0 };
      const st = statusOf(att, l);
      if (st) r[st === 'present' ? 'present' : st === 'absent' ? 'absent' : 'leave']++;
      else if (l.phase === 'past') r.unmarked++; else r.upcoming++;
    });
    return Object.values(s).map(r => {
      const total = r.present + r.absent;
      const pct = total ? Math.round(r.present / total * 1000) / 10 : null;
      const level = pct === null ? 'none' : pct < req ? 'danger' : pct < req + 5 ? 'warn' : 'safe';
      return { ...r, total, pct, level, ...plan(r.present, total, req) };
    });
  }
  const api = { TZ, REQUIRED, DAYS, ymd, hm, weekday, addDays, daysBetween, lectures, statusOf, plan, summarize };
  if (typeof module !== 'undefined') module.exports = api; else root.Att = api;
})(typeof window !== 'undefined' ? window : globalThis);
