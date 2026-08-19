# CareerMind.AI

![Career Mind AI](careermind.png)

> **Your AI-powered career companion.** From skills to salary — get personalized roadmaps, resume analysis, mock interviews, cover letters and real market insights in one place.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Not%20Used-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?logo=postgresql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=sqlalchemy&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Fallback-FF6F00?logo=groq&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=json-web-tokens&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-3.10-FF6B35?logo=recharts&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?logo=axios&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Deploy-Render-46E3B7?logo=render&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

CareerMind.AI is a full-stack web application that combines a React frontend with a FastAPI backend and PostgreSQL database. An AI engine (Google Gemini, with automatic Groq fallback) powers every feature: skill-gap analysis, personalized roadmaps, job matching, resume/LinkedIn auditing, mock interviews, cover letters and salary insights.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running Locally](#running-locally)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite 5** | Build tool & dev server |
| **React Router 6** | Client-side routing |
| **Axios** | HTTP client |
| **Recharts** | Dashboard analytics charts |
| **Firebase** | User authentication (Email/Password) |
| **CSS (global.css)** | Styling, responsive design, collapsible sidebar |

### Backend
| Technology | Purpose |
|---|---|
| **Python 3.12 / FastAPI** | REST API framework |
| **Uvicorn** | ASGI server |
| **SQLAlchemy 2.0** | ORM (typed models) |
| **PostgreSQL 18** | Database |
| **Pydantic v2** | Schema validation (request/response models) |
| **python-jose** | JWT access tokens |
| **Firebase Admin SDK** | Server-side user creation / verification |
| **Google Gemini SDK** | AI generation engine |
| **pdfplumber / PyPDF2 / python-docx** | PDF & Word text extraction |

### AI Engine
- Single-provider service (`ai_service.py`): uses **Gemini** whenever `GEMINI_API_KEY` is set.
- Covers: chat, skill-gap analysis, roadmaps, job recommendations, resume analysis, LinkedIn auditing, mock interviews, cover letters, salary insights, memory summarization and achievements.

---

## Features

### Core & Profile
- **User Registration & Login** — Firebase-backed auth, JWT sessions.
- **Profile Builder** — Headline, bio, location, GitHub/LinkedIn URLs, avatar upload, education & experience entries (multi-step wizard).
- **Skills Manager** — Add/edit/delete skills with category, proficiency rating and years of experience.

### AI Career Tools
- **AI Career Chat** — Multi-session chat with the AI assistant. Includes a **Memory System** that summarizes conversations and recalls your goals/skills across sessions.
- **Skill Gap Analysis** — Enter a target role; AI lists missing vs. matched skills, recommendations, and an overall readiness score.
- **Career Roadmap** — AI-generated week-by-week learning roadmap; check off / edit milestones.
- **Job Recommendations** — AI matches your skills, experience and goals to real roles with match scores.
- **Resume Upload & ATS Analysis** — Upload a PDF; text is extracted, parsed and stored. Get an **ATS score**, missing-keyword detection (keyword-embedding overlay), strengths and improvement suggestions.
- **LinkedIn Profile Auditor** — Paste your profile text or upload a PDF/Word/TXT file; AI scores completeness, flags missing sections, and suggests headline & keyword improvements.
- **Mock Interview** — Generate technical/behavioral/mixed questions for any role, answer in-app, and receive per-answer scores plus overall feedback (scored /100).
- **Cover Letter Generator** — Paste a job posting; AI writes personalized cover letters (1–3 versions in different tones) from your real profile, skills and experience. Edit, copy, download as **.txt** or **PDF**.
- **Salary Insights & Market Trends** — Search any role + location for junior/mid/senior salary ranges, market demand, top hiring companies and trend notes (localized currency).

### Productivity & Motivation
- **Job Application Pipeline (Kanban)** — 5-stage drag-and-drop board (Wishlist → Applied → Interview → Offer → Rejected) with priority badges, notes, date tracking, filters, search, sort and dashboard stats.
- **Career Goals** — Track goals with timeline, priority and progress.
- **Streaks & Achievements** — Daily login streaks (current + best) and **14 unlockable badges** with animated celebration (confetti).
- **Analytics Dashboard** — Skill progress charts (line), application breakdown (pie/bar), goal progress bars and recent activity timeline.

### Engineering Quality
- **Client-side form validation** on every page (email, URL, required fields, ranges, file types).
- **Server-side validation** — Pydantic v2 with strict enums (application status/priority), URL validators and length limits.
- **Graceful error handling** — global error boundary, toast notifications for API errors, and user-friendly messages parsed from FastAPI validation errors.
- **Fully responsive** — mobile-first CSS, no horizontal scroll, iOS-zoom prevention, 44px touch targets, collapsible sidebar (icon rail on tablet, hamburger overlay on mobile).

---

## Project Structure

```
CareerMind-AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, routers, static uploads
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── dependencies.py      # get_current_user (JWT bearer)
│   │   ├── models/
│   │   │   └── models.py        # SQLAlchemy typed models (users, skills, goals, …)
│   │   ├── schemas/             # Pydantic request/response models
│   │   ├── routes/              # auth, profile, skills, goals, stats, chat,
│   │   │                        # roadmap, jobs, resume, linkedin, interview,
│   │   │                        # applications, achievements, salary, coverletter
│   │   ├── services/
│   │   │   ├── groq_service.py  # Multi-provider AI engine (Gemini + Groq)
│   │   │   └── achievement_service.py  # 14-badge achievement logic
│   │   └── utils/
│   ├── uploads/                 # Uploaded resumes/avatars (served at /uploads)
│   ├── requirements.txt
│   ├── schema.sql / seed.sql
│   └── .env                     # Backend secrets (never commit)
├── frontend/
│   ├── src/
│   │   ├── main.jsx / App.jsx   # App shell, sidebar layout, routes
│   │   ├── components/          # Navbar (sidebar), forms, ErrorBoundary, Toast,
│   │   │                        # ProtectedRoute, AchievementCelebration
│   │   ├── pages/               # 17 feature pages
│   │   ├── hooks/               # useAuth
│   │   ├── utils/               # api.js, errors.js, validators.js
│   │   └── styles/global.css    # All styling + responsive rules
│   ├── index.html
│   ├── package.json
│   └── .env                     # Frontend Firebase + API URL
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ (tested on 3.12)
- **PostgreSQL** (14+) running locally
- A **Groq** API key (free at https://console.groq.com) — optionally a **Google Gemini** API key as primary provider
- A **Firebase** project (Email/Password auth enabled) + service account JSON

---

## Environment Variables

### Backend — `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql+psycopg2://user:password@localhost:5432/careermind` |
| `SECRET_KEY` | ✅ | Random string used to sign JWTs |
| `ALGORITHM` | ✅ | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Token lifetime; `0` = never expires |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase project id |
| `FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `FIREBASE_CLIENT_EMAIL` | ✅ | From service account JSON |
| `FIREBASE_PRIVATE_KEY` | ✅ | From service account JSON (keep `\n` escapes) |
| `GROQ_API_KEY` | ✅ | Groq API key (fallback provider) |
| `GROQ_MODEL` | | Default `llama-3.3-70b-versatile` |
| `GEMINI_API_KEY` | | Optional primary AI provider |
| `CORS_ORIGINS` | | Comma-separated frontend origins, e.g. `http://localhost:5175` |

> Place `serviceAccountKey.json` in `backend/`. On Windows/`.env`, wrap `FIREBASE_PRIVATE_KEY` in double quotes.

### Frontend — `frontend/.env`

```
VITE_API_URL=http://localhost:8001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

A template lives at `frontend/.env.example`. Only `VITE_API_URL` is strictly required to run the UI; the Firebase values are used by the auth flow.

---

## Installation

### 1. Database
```bash
createdb careermind
psql -U postgres -d careermind -f backend/schema.sql
# optional demo data:
psql -U postgres -d careermind -f backend/seed.sql
```

### 2. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # then fill in values (see table above)
```

### 3. Frontend
```bash
cd frontend
npm install
copy .env.example .env   # then fill in values
```

---

## Running Locally

### Start the backend
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
API health check → http://localhost:8001 returns `{"message":"CareerMind.AI API is running"}`.

### Start the frontend
```bash
cd frontend
npm run dev
```
Open the printed URL (default http://localhost:5175).

### Build for production
```bash
cd frontend && npm run build && npm run preview
```

### Verify the stack
1. Register a new account at `/register` (or use a seed user from `seed.sql`).
2. Add a few skills on `/skills`, then try `/skill-gap` with a target role — the AI should return an analysis.
3. Check the Dashboard charts and the `/salary` insights page.

---

## API Documentation

All endpoints (except `/auth/register` and `/auth/login`) require the header:

```
Authorization: Bearer <access_token>
```

When the backend is running, interactive docs are available at:

- **Swagger UI** → http://localhost:8001/docs
- **ReDoc** → http://localhost:8001/redoc

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account (name, email, password ≥ 8 chars) |
| POST | `/auth/login` | Login → returns JWT + user |
| GET | `/auth/me` | Current authenticated user |

### Profile & Skills
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/profile` | Get / update profile (headline, bio, URLs, education, experience) |
| POST | `/profile/avatar` | Upload avatar image |
| GET/POST | `/skills` | List / add skills |
| PUT/DELETE | `/skills/{skill_id}` | Update / delete a skill |
| POST | `/skills/analysis/requirements` | Skill-gap analysis for a target role |

### Goals & Roadmap
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/goals` | List / add career goals |
| PUT | `/goals/{goal_id}` | Update a goal |
| PATCH | `/goals/{goal_id}/complete` | Mark a goal completed |
| DELETE | `/goals/{goal_id}` | Delete a goal |
| GET | `/roadmap/latest` | Most recent roadmap |
| POST | `/roadmap/generate` | Generate AI roadmap (`target_role`, `duration`) |
| PUT | `/roadmap/items/{item_id}` | Edit / toggle milestone completion |

### AI Career Tools
| Method | Endpoint | Description |
|---|---|---|
| POST | `/jobs/recommendations` | AI job recommendations with match scores |
| POST | `/resume/upload` | Upload PDF resume (multipart `file`) |
| POST | `/resume/{analysis_id}/analyze` | ATS analysis for a target role |
| GET | `/resume/latest` · `/resume/analyses` | Resume history |
| POST | `/linkedin/analyze` | Analyze pasted LinkedIn text |
| POST | `/linkedin/analyze-file` | Analyze uploaded PDF/Word/TXT |
| POST | `/interview/generate` | Generate questions (`role`, `interview_type`, `question_count`) |
| POST | `/interview/{id}/submit` | Submit answers → scores + feedback |
| GET | `/interview/history` | Past interviews |
| POST | `/coverletter/generate` | Generate 1–3 cover-letter versions (`job_posting`, `count`) |
| POST | `/salary/insights` | Salary data + market trends (`role`, `location`) |

### Productivity
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/applications` | List / add job applications |
| PUT | `/applications/{app_id}` | Update an application |
| PATCH | `/applications/{app_id}/status` | Change kanban status |
| DELETE | `/applications/{app_id}` | Delete an application |
| GET | `/achievements` | List achievements with earned state |
| GET | `/stats` | Aggregate career stats |
| GET | `/stats/dashboard` | Dashboard chart data (skills timeline, app breakdown, goal progress, activities) |

### AI Chat
| Method | Endpoint | Description |
|---|---|---|
| GET | `/chat/sessions` | List conversation sessions |
| POST | `/chat/sessions` | Create a new session |
| GET | `/chat/sessions/{id}/messages` | Get messages |
| POST | `/chat/sessions/{id}/messages` | Send message → AI reply (with memory) |

---

## Deployment

### Option A — Vercel / Netlify (frontend) + Render / Railway (backend)

**Frontend (Vercel):**
1. Push the `frontend/` folder to a repo (or set Root Directory = `frontend`).
2. Build command: `npm run build` · Output directory: `dist`.
3. Add the `VITE_*` environment variables from `frontend/.env`.
4. Add a rewrite so SPA routes fall back to `index.html`.

**Backend (Render / Railway):**
1. Root directory: `backend`, start command: `uvicorn app.main:app --host 0.0.0.0 --port 8001`.
2. Add a **managed PostgreSQL** database and set `DATABASE_URL` accordingly.
3. Add all backend env vars (Firebase, Groq/Gemini keys, `SECRET_KEY`, `CORS_ORIGINS` pointing to your deployed frontend URL).
4. Run `schema.sql` against the managed database.

### Option B — Single VPS (Docker-style manual)
```bash
# backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# frontend (serve the built assets)
cd frontend && npm run build
npx serve dist -l 5173
```
Put nginx in front of both and enable HTTPS.

### Deployment checklist
- [ ] `CORS_ORIGINS` includes the deployed frontend origin.
- [ ] `FIREBASE_PRIVATE_KEY` newlines preserved.
- [ ] Backend uses `--host 0.0.0.0` and a proper `$PORT`.
- [ ] Never commit `.env` or `serviceAccountKey.json`.

---

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `429 RESOURCE_EXHAUSTED` from Gemini | Google free-tier project quota is locked at 0. Add a billing account to the GCP project or create a new project. The app **auto-falls back to Groq**, so nothing breaks. |
| `Unable to connect to the remote server` | Backend not running — start uvicorn on port 8000, or update `VITE_API_URL`. |
| Frontend can't reach backend (CORS) | Ensure your port is in `CORS_ORIGINS` (e.g. `http://localhost:5174`). |
| `Firebase account creation failed` | Check `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` and that Email/Password sign-in is enabled. |
| `GET /` returns error on fresh DB | Run `backend/schema.sql` first. |
| Login says "Invalid email or password" | Credentials are verified against **Firebase**, not the local DB. Reset the password in the Firebase console or register a new account. |
| Gemini key format `AQ.…` flagged invalid | These are valid v2 keys; the limitation is the free-tier quota, not the key. |
| Cover letter / salary AI slow | Generation can take 5–20s on the free tier — the button shows a loading state. |

---

## License

This project is provided for educational and personal use. Please do not commit any API keys, service-account files, or other secrets to version control.
