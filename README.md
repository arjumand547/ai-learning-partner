# AI Learning Partner

An installable learning companion for BS Artificial Intelligence students. Organize courses, get AI-powered study support, track attendance, and keep scholarship and freelance opportunities in one place.

**Live demo:** [your-artificial-mate.vercel.app](https://your-artificial-mate.vercel.app)

## Features

- **AI Tutor** — Ask questions, explore concepts with simple explanations, and generate study plans, quizzes, and flashcards.
- **Course workspace** — Create and manage courses, track progress, and log study sessions.
- **Course AI Gem** — Add PDF or text notes to a course and ask questions grounded in relevant excerpts. Generate summaries, quizzes, flashcards, and study plans from your materials.
- **Attendance tracker** — Build a weekly timetable, mark lecture attendance, review unmarked lectures, and monitor progress toward an 80% target. Dates and lecture calculations use Asia/Karachi time.
- **Scholarship tracker** — Organize opportunities by category and status, with links, deadlines, notes, and deadline reminders.
- **Freelancing tracker and advice** — Track gigs and jobs, manage deadlines, and ask the AI for practical freelancing guidance.
- **Dashboard and notifications** — Review learning activity, deadlines, attendance warnings, and unmarked lectures.
- **Export and install** — Print or save AI answers as PDF, download Word-compatible documents, and install the app as a Progressive Web App (PWA).
- **Responsive interface** — Dark visual theme, mobile navigation, and a reduced-motion setting.

## Live demo and account status

Google sign-in and cloud sync are **not enabled in the current demo**. They are planned for a future release. For now, app data is stored in the browser on the device you use.

## Run locally

### Requirements

- Node.js 18 or later
- A Groq API key for AI features ([get one from Groq](https://console.groq.com/))

### Setup

In PowerShell, from the project directory:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your key to `.env`:

```text
GROQ_API_KEY=your_groq_api_key
```

Save the file, then start the app:

```powershell
npm start
```

Open [http://localhost:3000](http://localhost:3000). Keep the API key in `.env`; do not put it in frontend files or commit it to GitHub. Without a configured key, the app can be explored but AI requests will not work.

### Run tests

```powershell
npm test
```

## Deployment

This repository is configured for Vercel. Import the repository into Vercel, add `GROQ_API_KEY` as a project environment variable, and deploy. The `build:vercel` script prepares the static frontend, while the `/api` routes handle AI requests server-side.

The Node server can also serve the frontend and API together on another Node.js host. Configure `GROQ_API_KEY` in that host's environment and use `npm start` as the start command.

## Technology

- Vanilla JavaScript, HTML, and CSS
- Node.js 18+ API server and Vercel serverless API routes
- Groq API for AI responses
- Browser storage for local app data
- PDF.js for extracting text from PDFs

## Notes and limitations

- AI features require internet access and a configured backend API key.
- The app shell can be installed and used offline, but AI features require an active connection.
- PDF files must contain selectable text. Scanned/image-only PDFs require OCR, which is not currently supported.
- Google sign-in and cloud sync are not configured in the current release.

## Push changes to GitHub

From the project directory, stage and commit the README change, then push it to the existing `main` branch:

```powershell
git add README.md
git commit -m "docs: update project README"
git push origin main
```

To review what will be committed first:

```powershell
git status
git diff -- README.md
```
