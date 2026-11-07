# 🧠 AI Learning Partner v3

Installable PWA for BS AI students: AI Tutor, courses with a document-aware AI Gem, attendance (Asia/Karachi), scholarships, freelancing, dashboard with in-app notifications.

## Architecture (read this first)
- **Frontend**: static HTML/CSS/vanilla JS (no build step).
- **Backend**: `server/server.js`, a zero-dependency Node ≥18 server that serves the frontend **and** proxies Groq. The Groq key lives only in the backend environment.
- **GitHub Pages alone cannot run AI features** (no backend, no secrets). Host the backend on Render/Railway/Fly/a VPS; you may host the frontend on the same server (simplest) or on GitHub Pages with `API_BASE` pointing at the backend.

## Local development
```bash
cp .env.example .env        # put your free key from console.groq.com in GROQ_API_KEY
npm start                   # http://localhost:3000
npm test                    # unit + server tests (no dependencies)
```

## Deployment
**Option A (recommended): everything on one host** (Render/Railway): create a Node web service from this repo, start command `npm start`, set env var `GROQ_API_KEY`. Done. Use the HTTPS URL.
**Option B: frontend on GitHub Pages**: deploy backend as above with `ALLOWED_ORIGIN=https://<you>.github.io`; edit `js/config.js` → `API_BASE: "https://<backend-url>"`; push the repo to Pages.
**Option C: Vercel**: this repo includes Vercel function routes for `/api/chat` and `/api/health`, plus a static build. Import the repo into Vercel, keep the root directory as `.`, set `GROQ_API_KEY` in the project environment variables, and deploy. Vercel uses `npm run build:vercel` to publish only the frontend files; the API key remains server-side.

## Firebase setup (optional: Google sign-in + cloud sync)
1. Firebase console → new project → Authentication → enable **Google**; add your site domain under Authorized domains.
2. Create a **Firestore** database; paste `firestore.rules` into Rules and publish (each user can only read/write `users/<their uid>`).
3. Project settings → Web app → copy config into `js/firebase-config.js` (`window.FIREBASE_CONFIG = {...}`).
Courses, timetable, attendance, scholarships, freelance and semester start sync. Documents, chats and secrets do not. Conflict rule: whichever side changed more recently wins.

## Features
- **Tutor**: server-side prompt, loading/typing indicator, duplicate-submit guard, persisted history, clear chat, code blocks, quick study-plan/quiz/flashcard starters.
- **Courses**: add/rename/delete, duplicate-name check, progress slider, study-session log.
- **Course AI Gem**: upload multiple PDF/TXT per course (PDF.js text extraction), paste notes, chunk + BM25-style keyword retrieval, top excerpts sent to the AI; answers split into "From your notes" vs "Beyond your notes". Summary/quiz/flashcards/study-plan buttons.
- **Attendance**: timetable with overlap check; lectures generated from real timetable days since semester start; mark only started lectures; present/absent/leave kept separate; leave excluded from the denominator; unmarked past lectures listed separately (never silently counted); needed/can-miss calculation at 80%.
- **Scholarships / Freelancing**: full add/edit/delete, status dropdown, categories, validated links/dates, deadline badges.
- **Notifications**: deadlines, attendance warnings, unmarked lectures (in-app only, no browser permissions).
- **UI**: dark glass theme, 3D pointer-tilt cards, animated CSS 3D orb reacting to AI state, particle background, collapsible sidebar / mobile bottom nav, Reduce-motion setting (also honours the OS preference).

## PWA
Open the deployed HTTPS URL → browser menu → *Install app / Add to Home Screen*. Shell works offline; AI needs the backend; PDF reading needs internet the first time (PDF.js is loaded from cdnjs).

## Troubleshooting
- "server has no GROQ_API_KEY" → set it in `.env` / host env vars and restart.
- AI works locally but not on Pages → set `API_BASE` and `ALLOWED_ORIGIN`.
- Scanned PDF "No readable text" → image-only PDFs need OCR (unsupported).
- Sign-in popup fails → add your domain to Firebase Authorized domains.
- Old versions stored a Groq key in the browser/Firestore; v3 deletes the local copy, but **rotate that key** in the Groq console.
