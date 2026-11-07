// UI helpers: toast, safe markdown, navigation, 3D tilt, AI orb, particle background, reduced motion.
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 3000); }
function md(t) { // escape first, then apply a tiny safe subset of markdown
  return String(t).split('```').map((p, i) => i % 2 ? `<pre><code>${esc(p.slice(p.indexOf('\n') + 1))}</code></pre>`
    : esc(p).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/^#{1,4} (.*)$/gm, '<b>$1</b>').replace(/\n/g, '<br>')).join('');
}
const Motion = {
  reduced: () => document.documentElement.classList.contains('reduce'),
  init() {
    const pref = DB.get('reduce_motion', null);
    const on = pref === null ? matchMedia('(prefers-reduced-motion: reduce)').matches : pref;
    document.documentElement.classList.toggle('reduce', on);
  },
  set(on) { DB.set('reduce_motion', on, true); this.init(); Bg.toggle(); },
};
const Bg = { raf: 0, pts: [], c: null,
  toggle() { if (Motion.reduced() || !this.ok()) { cancelAnimationFrame(this.raf); this.raf = 0; this.c?.getContext('2d').clearRect(0, 0, 9999, 9999); } else if (!this.raf) this.start(); },
  ok: () => !!document.createElement('canvas').getContext && !(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2),
  start() {
    this.c ||= $('#bg'); const c = this.c, x = c.getContext('2d');
    const size = () => { c.width = innerWidth; c.height = innerHeight; };
    size(); addEventListener('resize', size);
    this.pts = Array.from({ length: innerWidth < 700 ? 22 : 45 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.6 + .4, v: Math.random() * .25 + .05 }));
    const loop = () => {
      if (document.hidden) { this.raf = requestAnimationFrame(loop); return; }
      x.clearRect(0, 0, c.width, c.height);
      this.pts.forEach(p => { p.y -= p.v; if (p.y < -5) { p.y = c.height + 5; p.x = Math.random() * c.width; }
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 6.3); x.fillStyle = 'rgba(120,170,255,.45)'; x.fill(); });
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
};
function initUI() {
  Motion.init();
  (window.requestIdleCallback || setTimeout)(() => Bg.toggle());
  // 3D tilt on pointer movement (fine pointers only, not when reduced motion)
  document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('.tilt'); if (!el || Motion.reduced() || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg'); el.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px + .5) * 100 + '%'); el.style.setProperty('--my', (py + .5) * 100 + '%');
  });
  document.addEventListener('pointerout', e => { const el = e.target.closest?.('.tilt'); if (el && !el.contains(e.relatedTarget)) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); } });
  window.addEventListener('ai-state', e => { const o = $('#orb'); if (o) o.dataset.state = e.detail; });
  $('#side-toggle').addEventListener('click', () => { document.body.classList.toggle('collapsed'); DB.set('side_collapsed', document.body.classList.contains('collapsed'), true); });
  document.body.classList.toggle('collapsed', !!DB.get('side_collapsed', false));
}
