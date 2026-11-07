const assert = require('assert');
delete process.env.GROQ_API_KEY;
const chat = require('../api/chat');
const health = require('../api/health');

function response() {
  return {
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(data) { this.data = data; },
    json() { return JSON.parse(this.data); },
  };
}

(async () => {
  let res = response();
  await health({ method: 'GET' }, res);
  assert.equal(res.status, 200);
  assert.deepEqual(res.json(), { ok: true, ai: false });

  res = response();
  await chat({ method: 'GET' }, res);
  assert.equal(res.status, 405);

  process.env.GROQ_API_KEY = 'test';
  res = response();
  await chat({ method: 'POST', socket: { remoteAddress: 'vercel-test' }, body: { messages: [] } }, res);
  assert.equal(res.status, 400);
  assert.equal(res.json().error, 'invalid_request');
  delete process.env.GROQ_API_KEY;
  console.log('Vercel function tests passed');
})().catch(e => { console.error('FAIL', e); process.exitCode = 1; });
