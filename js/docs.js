// Course documents: PDF/TXT extraction (PDF.js), chunking, and keyword retrieval (BM25-style) for the Course AI Gem.
const Docs = {
  PDFJS: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  WORKER: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  MAX_BYTES: 10 * 1024 * 1024,
  list: id => DB.get('docs_' + id, []),
  save(id, l) { return DB.set('docs_' + id, l, true); },
  remove(id, docId) { this.save(id, this.list(id).filter(d => d.id !== docId)); },
  loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((ok, no) => {
      const s = document.createElement('script'); s.src = this.PDFJS;
      s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = this.WORKER; ok(); };
      s.onerror = () => no(new Error('Could not load the PDF reader (needs internet the first time).'));
      document.head.appendChild(s);
    });
  },
  async extract(file) {
    if (file.size > this.MAX_BYTES) throw new Error('File is larger than 10 MB.');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf && !(file.type === 'text/plain' || /\.(txt|md)$/i.test(file.name))) throw new Error('Only PDF and TXT files are supported.');
    if (!isPdf) return (await file.text()).trim();
    await this.loadPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const c = await (await pdf.getPage(i)).getTextContent();
      text += `\n[Page ${i}]\n` + c.items.map(x => x.str).join(' ');
    }
    return text.replace(/[ \t]+/g, ' ').trim();
  },
  chunk(text, size = 900, overlap = 150) {
    const out = []; const paras = text.split(/\n{1,}/).map(p => p.trim()).filter(Boolean); let cur = '';
    const flush = () => { if (cur.trim()) out.push(cur.trim()); cur = cur.slice(-overlap); };
    for (const p of paras) {
      if (p.length > size) { for (let i = 0; i < p.length; i += size - overlap) { cur += ' ' + p.slice(i, i + size); flush(); } continue; }
      if ((cur + ' ' + p).length > size) flush();
      cur += ' ' + p;
    }
    if (cur.trim() && !out.includes(cur.trim())) out.push(cur.trim());
    return out;
  },
  async add(courseId, file) {
    const text = await this.extract(file);
    return this.addText(courseId, file.name, text, /\.pdf$/i.test(file.name) ? 'pdf' : 'txt');
  },
  addText(courseId, name, text, type = 'note') {
    if (text.replace(/\[Page \d+\]/g, '').trim().length < 30)
      throw new Error('No readable text found. Scanned/image-only PDFs need OCR, which is not supported.');
    const docs = this.list(courseId); const chunks = this.chunk(text);
    docs.push({ id: DB.uid(), name, type, added: new Date().toISOString(), chars: text.length, chunks });
    if (!this.save(courseId, docs)) throw new Error('Not enough browser storage for this document.');
    return chunks.length;
  },
  tok: s => (s.toLowerCase().match(/[a-z0-9\u0600-\u06ff]{2,}/g) || []),
  STOP: new Set('the an of to in and or is are for on with as by be this that it from at what how why does did can you me my about explain tell give'.split(' ')),
  retrieve(courseId, query, k = 5) {
    const q = [...new Set(this.tok(query).filter(w => !this.STOP.has(w)))];
    const all = this.list(courseId).flatMap(d => d.chunks.map((t, i) => ({ doc: d.name, i, t, tk: this.tok(t) })));
    if (!all.length || !q.length) return [];
    const avg = all.reduce((a, c) => a + c.tk.length, 0) / all.length || 1;
    const df = {}; q.forEach(w => df[w] = all.filter(c => c.tk.includes(w)).length);
    return all.map(c => {
      let s = 0; q.forEach(w => { const tf = c.tk.filter(x => x === w).length; if (tf && df[w])
        s += Math.log(1 + (all.length - df[w] + .5) / (df[w] + .5)) * (tf * 2.2) / (tf + 1.2 * (.25 + .75 * c.tk.length / avg)); });
      return { ...c, s };
    }).filter(c => c.s > 0).sort((a, b) => b.s - a.s).slice(0, k);
  },
  sample(courseId, n = 8) { // evenly spread chunks, for summaries / quizzes / flashcards
    const all = this.list(courseId).flatMap(d => d.chunks.map((t, i) => ({ doc: d.name, i, t })));
    if (all.length <= n) return all;
    return Array.from({ length: n }, (_, j) => all[Math.floor(j * all.length / n)]);
  },
  toContext: chunks => chunks.map((c, j) => `[${j + 1}] (${c.doc}) ${c.t}`).join('\n\n').slice(0, 13500),
};
