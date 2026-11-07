const assert = require('assert'); delete process.env.GROQ_API_KEY;
const { server } = require('../server/server.js');
server.listen(0, async () => {
  const b = 'http://127.0.0.1:' + server.address().port; let n = 0;
  const ok = (m) => { n++; console.log('ok -', m); };
  const post = (o) => fetch(b + '/api/chat', { method: 'POST', body: typeof o === 'string' ? o : JSON.stringify(o) });
  try {
    assert.deepEqual(await (await fetch(b + '/api/health')).json(), { ok: true, ai: false }); ok('health reports no key');
    let r = await post({ messages: [{ role: 'user', content: 'hi' }] }); assert.equal(r.status, 503); assert.equal((await r.json()).error, 'server_key_missing'); ok('chat without key -> 503');
    process.env.GROQ_API_KEY = 'test';
    r = await post('not json'); assert.equal(r.status, 400); ok('bad JSON -> 400');
    r = await post({ mode: 'hack', messages: [{ role: 'user', content: 'x' }] }); assert.equal(r.status, 400); ok('unknown mode rejected');
    r = await post({ messages: [{ role: 'system', content: 'x' }] }); assert.equal(r.status, 400); ok('client system role rejected');
    r = await post({ messages: [{ role: 'user', content: 'x'.repeat(8001) }] }); assert.equal(r.status, 400); ok('oversized message rejected');
    r = await post({ messages: [{ role: 'assistant', content: 'x' }] }); assert.equal(r.status, 400); ok('must end with user message');
    r = await fetch(b + '/'); assert.equal(r.status, 200); assert((await r.text()).includes('AI Learning Partner')); ok('index served');
    for (const p of ['/.env', '/server/server.js', '/package.json', '/js/../.env', '/%2e%2e/.env', '/firestore.rules']) { r = await fetch(b + p); assert.equal(r.status, 404, p); } ok('private files / traversal blocked');
    console.log(n + ' server tests passed');
  } catch (e) { console.error('FAIL', e); process.exitCode = 1; } finally { server.close(); }
});
