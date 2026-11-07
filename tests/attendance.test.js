const assert = require('assert'); const A = require('../js/attendance.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok -', name); };
t('weekday is timezone-safe', () => { assert.equal(A.weekday('2026-11-08'), 'Sunday'); assert.equal(A.weekday('2026-11-09'), 'Monday'); });
t('Karachi date differs from UTC late evening', () => { assert.equal(A.ymd(new Date('2026-11-08T20:30:00Z')), '2026-11-09'); assert.equal(A.hm(new Date('2026-11-08T20:30:00Z')), '01:30'); });
t('plan: need to attend (3/5 -> 5 more)', () => assert.deepEqual(A.plan(3, 5), { need: 5, canMiss: 0 }));
t('plan: exactly 80% can miss 0', () => assert.deepEqual(A.plan(8, 10), { need: 0, canMiss: 0 }));
t('plan: 9/10 can miss 1', () => assert.deepEqual(A.plan(9, 10), { need: 0, canMiss: 1 }));
t('plan: result really reaches 80%', () => { for (let tt = 1; tt < 60; tt++) for (let p = 0; p <= tt; p++) { const r = A.plan(p, tt);
  if (r.need) { assert(100 * (p + r.need) >= 80 * (tt + r.need)); assert(100 * (p + r.need - 1) < 80 * (tt + r.need - 1)); }
  else { assert(100 * p >= 80 * (tt + r.canMiss)); assert(100 * p < 80 * (tt + r.canMiss + 1)); } } });
const tt = [{ subject: 'AI', day: 'Monday', start: '09:00', end: '10:00' }, { subject: 'AI', day: 'Wednesday', start: '09:00', end: '10:00' }];
const now = new Date('2026-11-11T07:00:00Z'); // Wed 12:00 Karachi
t('lectures only on scheduled days, today past', () => { const l = A.lectures(tt, '2026-11-02', now);
  assert.deepEqual(l.map(x => x.date), ['2026-11-02', '2026-11-04', '2026-11-09', '2026-11-11']); assert(l.every(x => x.phase === 'past')); });
t('today before start is upcoming', () => { const l = A.lectures(tt, '2026-11-11', new Date('2026-11-11T02:00:00Z')); assert.equal(l.length, 1); assert.equal(l[0].phase, 'upcoming'); });
t('unmarked past lectures are separate, not counted', () => {
  const l = A.lectures(tt, '2026-11-02', now); const att = { [l[0].key]: 'present', [l[1].key]: 'absent', [l[2].key]: 'leave' };
  const s = A.summarize(l, att)[0]; assert.deepEqual([s.present, s.absent, s.leave, s.unmarked, s.total, s.pct], [1, 1, 1, 1, 2, 50]); assert.equal(s.level, 'danger'); });
t('legacy v2 key still honoured', () => { const l = A.lectures(tt, '2026-11-11', now); assert.equal(A.summarize(l, { 'AI|2026-11-11': 'present' })[0].present, 1); });
t('no start date -> no lectures', () => assert.equal(A.lectures(tt, '', now).length, 0));
console.log(n + ' attendance tests passed');
