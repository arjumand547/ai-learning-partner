# Bug-fix & upgrade report

## Bugs found (original code) → status
| # | Bug | Status |
|---|-----|--------|
| 1 | Groq key stored in localStorage, sent from browser, **and synced to Firestore** | Fixed: server proxy, key removed from browser |
| 2 | Course AI Gem sent only filenames/tags; no upload, no reading | Fixed: real PDF/TXT extraction + retrieval |
| 3 | Attendance % counted only marked entries; dates in UTC (wrong day near midnight PKT); any day markable; no leave; no plan | Fixed: timetable-generated lectures, Karachi time, 3 statuses, need/can-miss |
| 4 | XSS: every user string interpolated into innerHTML (names, notes, links incl. `javascript:`) | Fixed: escaping everywhere, http(s)-only links, no inline handlers |
| 5 | Cloud sync always overwrote local data; failures only logged | Fixed: newest-wins timestamps, failure toast |
| 6 | Firebase placeholder keys loaded as if real; SDK loaded unconditionally | Fixed: null config → local-only; SDK lazy-loaded |
| 7 | Course chat not persisted; no delete/edit for courses; scholarships/freelance edited with `prompt()` | Fixed |
| 8 | Service worker omitted auth.js, cached API calls, `cache-first` served stale code | Fixed: network-first, no API/3rd-party caching |
| 9 | AI errors returned as fake "assistant" chat messages and were saved to history | Fixed: transient error bubbles, input restored |
| 10 | Freelance AI reply inserted unescaped; no duplicate-submit guard; `maximum-scale=1` blocked zoom | Fixed |

## Added
Dashboard with stats/progress bars, notifications, study-progress and session log, quiz/flashcard/study-plan prompts, 3D tilt cards, reactive CSS orb, particles, reduced-motion toggle, collapsible sidebar + mobile nav, Firestore rules, `.env.example`.

## Security
Server-side key; request validation (roles, sizes, modes; client cannot inject system prompts); per-IP rate limit (20/min); CORS allow-list; static allow-list (no `.env`/server source served, traversal tested); 45 s upstream timeout; no request bodies logged; Firestore rules restrict each user to own document.

## Tests actually run
- `npm test`: 11 attendance, 9 server (validation, key-missing, traversal), chunk/retrieval tests: **all pass**.
- Headless Chromium end-to-end (`tests/e2e_playwright.py`): navigation across all pages, course create + duplicate rejection, note indexing, Gem call (reached backend; returned the expected "no key" error), timetable → mark present → summary, XSS payload rendered inert, `javascript:` link rejected, persistence after reload, no horizontal overflow at 375 px. No uncaught JS errors.

## NOT tested / known limitations
- **No real Groq call was made** (no key/network here): the success path is untested against the live API.
- **PDF extraction untested** (PDF.js loads from a CDN; sandbox is offline). TXT/notes path is tested.
- **Firebase sign-in and cloud sync untested** (no credentials).
- PWA install and offline mode were not exercised; mobile checked only via a 375 px viewport, not real devices.
- Retrieval is keyword/BM25-style, **not embeddings**. Documents live in localStorage (~5 MB total).
- **Three.js was not used**: the orb is CSS 3D, which works with no WebGL and costs nothing. A Three.js orb is a possible later add.
- Not done: Firebase-synced documents/chats, OCR, quiz/flashcard UIs (they are AI-generated text), JSON export/import.
- If attendance was synced from v2, set the semester start date once.
