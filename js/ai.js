// Browser -> our backend -> Groq. No API key ever exists in the browser.
const AI = {
  busy: false,
  base: () => (window.APP_CONFIG?.API_BASE || '').replace(/\/$/, ''),
  errors: {
    server_key_missing: 'The server has no GROQ_API_KEY configured. Add it to the backend environment (see README).',
    server_key_invalid: 'The server\'s Groq API key was rejected. Check GROQ_API_KEY on the backend.',
    rate_limited: 'Too many requests. Please wait a minute and try again.',
    upstream_rate_limited: 'Groq rate limit reached. Please wait a bit and try again.',
    timeout: 'The AI took too long to respond. Try again.',
    empty_response: 'The AI returned an empty answer. Try rephrasing.',
    invalid_request: 'That request was rejected as invalid (too long?). Shorten it and retry.',
  },
  async health() { try { const r = await fetch(this.base() + '/api/health'); return r.ok ? await r.json() : null; } catch { return null; } },
  async chat(mode, messages, context = '') {
    window.dispatchEvent(new CustomEvent('ai-state', { detail: 'thinking' }));
    try {
      let r;
      try {
        r = await fetch(this.base() + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, messages: messages.map(m => ({ role: m.role, content: m.content })), context }) });
      } catch { throw new Error('Cannot reach the backend. Check your internet connection and that the server is running.'); }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(this.errors[d.error] || `AI request failed (HTTP ${r.status}).`);
      if (!d.reply) throw new Error(this.errors.empty_response);
      window.dispatchEvent(new CustomEvent('ai-state', { detail: 'responding' }));
      return d.reply;
    } finally { setTimeout(() => window.dispatchEvent(new CustomEvent('ai-state', { detail: 'idle' })), 1200); }
  },
};
