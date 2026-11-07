'use strict';
// Zero-dependency Node (>=18) server: serves the PWA and proxies Groq so the API key never reaches the browser.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
try { for (const l of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
} } catch { /* no .env file: rely on real environment variables */ }
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const ORIGIN = process.env.ALLOWED_ORIGIN || '';

const BASE = `You are the personal AI Learning Partner of a BS Artificial Intelligence student from Pakistan who knows Python, wants deep understanding of concepts and workflow, and later prompts AI to write code.
Style: explain LOGIC and WORKFLOW first with simple, relatable analogies; small steps; short code only if needed with key lines explained; simple, friendly language; never assume advanced knowledge. For tutoring answers end with: "Now you can tell any AI: <ready-to-copy prompt>".`;
const SYSTEMS = {
  tutor: BASE,
  freelance: BASE + '\nFocus: practical, concise freelancing advice (Fiverr/Upwork gigs, proposals, pricing) for a beginner.',
  course: BASE + `\nYou are the dedicated assistant for ONE course. The student's uploaded material is given as numbered excerpts [1], [2]...
Rules: 1) Ground answers in the excerpts and cite them like [2]. 2) Structure replies with two headings: "From your notes" (only what the excerpts support) and "Beyond your notes (general AI knowledge)" (clearly flagged, only if useful). 3) If the excerpts do not contain the answer, say so explicitly under "From your notes". 4) Never invent content and attribute it to the notes.`,
};
const hits = new Map();
function limited(ip) { const now = Date.now(), a = (hits.get(ip) || []).filter(t => now - t < 60000); a.push(now); hits.set(ip, a); return a.length > 20; }
setInterval(() => hits.clear(), 600000).unref();

function send(res, code, obj, extra = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(JSON.stringify(obj));
}
function body(req) {
  if (req.body !== undefined) {
    const value = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return value.length > 250000 ? Promise.reject(new Error('big')) : Promise.resolve(value);
  }
  return new Promise((ok, no) => {
    let s = ''; req.on('data', c => { s += c; if (s.length > 250000) { no(new Error('big')); req.destroy(); } });
    req.on('end', () => ok(s)); req.on('error', no);
  });
}

async function chat(req, res, cors) {
  if (!process.env.GROQ_API_KEY) return send(res, 503, { error: 'server_key_missing' }, cors);
  if (limited(req.socket.remoteAddress)) return send(res, 429, { error: 'rate_limited' }, cors);
  let p; try { p = JSON.parse(await body(req)); } catch { return send(res, 400, { error: 'bad_json' }, cors); }
  const { mode = 'tutor', messages, context = '' } = p || {};
  if (!SYSTEMS[mode] || !Array.isArray(messages) || !messages.length || messages.length > 30 ||
      typeof context !== 'string' || context.length > 14000 ||
      !messages.every(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.length > 0 && m.content.length <= 8000))
    return send(res, 400, { error: 'invalid_request' }, cors);
  if (messages[messages.length - 1].role !== 'user') return send(res, 400, { error: 'invalid_request' }, cors);
  const system = SYSTEMS[mode] + (mode === 'course' ? `\n\nEXCERPTS:\n${context || 'NO RELEVANT EXCERPTS FOUND'}` : '');
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 45000);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: ac.signal,
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: mode === 'course' ? 0.3 : 0.7, max_tokens: 2048,
        messages: [{ role: 'system', content: system }, ...messages.map(m => ({ role: m.role, content: m.content }))] }),
    });
    if (!r.ok) return send(res, r.status === 429 ? 429 : 502, { error: r.status === 401 ? 'server_key_invalid' : r.status === 429 ? 'upstream_rate_limited' : 'upstream_error' }, cors);
    const d = await r.json(); const reply = d?.choices?.[0]?.message?.content?.trim();
    if (!reply) return send(res, 502, { error: 'empty_response' }, cors);
    send(res, 200, { reply }, cors);
  } catch (e) { send(res, 504, { error: e.name === 'AbortError' ? 'timeout' : 'network' }, cors); }
  finally { clearTimeout(t); }
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const STATIC = /^(index\.html|manifest\.json|service-worker\.js|(css|js|icons)\/[\w.\-]+)$/;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'); const origin = req.headers.origin;
  const cors = ORIGIN && origin === ORIGIN ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  if (req.method === 'OPTIONS') { res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'POST, GET', 'Access-Control-Allow-Headers': 'Content-Type' }); return res.end(); }
  if (url.pathname === '/api/health') return send(res, 200, { ok: true, ai: !!process.env.GROQ_API_KEY }, cors);
  if (url.pathname === '/api/chat' && req.method === 'POST') return chat(req, res, cors);
  if (req.method !== 'GET') return send(res, 405, { error: 'method' });
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
  if (!STATIC.test(rel)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(ROOT, rel), (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(rel)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': rel === 'service-worker.js' ? 'no-cache' : 'public, max-age=300' });
    res.end(buf);
  });
});
module.exports = {
  server,
  chat,
  send,
  health: (req, res) => send(res, 200, { ok: true, ai: !!process.env.GROQ_API_KEY }),
};
if (require.main === module) server.listen(process.env.PORT || 3000, () => console.log('AI Learning Partner on port ' + (process.env.PORT || 3000)));
