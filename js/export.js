const NotesExport = {
  toRtf(markdown) {
    const escape = text => {
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i), ch = text[i];
        if (ch === '\\' || ch === '{' || ch === '}') out += '\\' + ch;
        else if (code < 128) out += ch;
        else out += `\\u${code > 32767 ? code - 65536 : code}?`;
      }
      return out;
    };
    const inline = text => escape(text).replace(/\*\*([^*]+)\*\*/g, '\\b $1\\b0')
      .replace(/\*([^*]+)\*/g, '\\i $1\\i0').replace(/`([^`]+)`/g, '\\f1 $1\\f0');
    let code = false;
    const body = String(markdown).split(/\r?\n/).map(line => {
      if (line.startsWith('```')) { code = !code; return code ? '\\f1\\par' : '\\f0\\par'; }
      if (code) return escape(line) + '\\par';
      if (!line.trim()) return '\\par';
      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) return `\\b\\fs${heading[1].length < 3 ? 28 : 24} ${inline(heading[2])}\\b0\\fs22\\par`;
      const bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) return `\\bullet\\tab ${inline(bullet[1])}\\par`;
      const ordered = line.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (ordered) return `${escape(ordered[1] + '.')}\\tab ${inline(ordered[2])}\\par`;
      return inline(line) + '\\par';
    }).join('');
    return `{\\rtf1\\ansi\\deff0\\uc1{\\fonttbl{\\f0 Calibri;}{\\f1 Consolas;}}\\viewkind4\\fs22\\b\\fs32 AI Learning Partner Notes\\b0\\fs22\\par\\par${body}}`;
  },
  downloadWord(markdown, date) {
    const blob = new Blob([this.toRtf(markdown)], { type: 'application/rtf' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `AI_Notes_${date}.rtf`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  printPdf(markdown, date) {
    const page = window.open('', '_blank');
    if (!page) return false;
    page.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>AI Notes ${date}</title>
      <style>
        body{font:12pt/1.55 Arial,sans-serif;color:#172033;max-width:800px;margin:40px auto;padding:0 24px}
        h1{font-size:22pt}h2,h3,h4{margin:1.2em 0 .4em;page-break-after:avoid}
        p,li{orphans:3;widows:3}pre{white-space:pre-wrap;background:#f2f4f8;padding:12px;border-radius:6px}
        code{font-family:Consolas,monospace}button{padding:10px 16px;margin-bottom:20px}
        @media print{body{margin:0 auto}button{display:none}pre{break-inside:avoid}}
      </style></head><body><button onclick="window.print()">Print / Save as PDF</button>
      <h1>AI Learning Partner Notes</h1><p>Saved ${date}</p>${md(markdown)}</body></html>`);
    page.document.close();
    setTimeout(() => page.print(), 300);
    return true;
  },
};
if (typeof module !== 'undefined' && module.exports) module.exports = NotesExport;
else window.NotesExport = NotesExport;
