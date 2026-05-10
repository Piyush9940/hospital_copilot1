```
██╗  ██╗ ██████╗ ███████╗██████╗ ██╗████████╗ █████╗ ██╗
██║  ██║██╔═══██╗██╔════╝██╔══██╗██║╚══██╔══╝██╔══██╗██║
███████║██║   ██║███████╗██████╔╝██║   ██║   ███████║██║
██╔══██║██║   ██║╚════██║██╔═══╝ ██║   ██║   ██╔══██║██║
██║  ██║╚██████╔╝███████║██║     ██║   ██║   ██║  ██║███████╗
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝     ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝

 ██████╗ ██████╗ ██████╗ ██╗██╗      ██████╗ ████████╗
██╔════╝██╔═══██╗██╔══██╗██║██║     ██╔═══██╗╚══██╔══╝
██║     ██║   ██║██████╔╝██║██║     ██║   ██║   ██║
██║     ██║   ██║██╔═══╝ ██║██║     ██║   ██║   ██║
╚██████╗╚██████╔╝██║     ██║███████╗╚██████╔╝   ██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝ ╚═════╝    ╚═╝
```

> **AI-powered hospital management that thinks alongside doctors, nurses, and patients.**
> Face auth · RAG Nurse · Skin AI · Emergency dispatch · Video consults — all in one platform.

🌐 **Live:** [hospital-copilot1.vercel.app](https://hospital-copilot1.vercel.app)

---

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SYSTEM ARCHITECTURE                          │
│                                                                     │
│   ┌─────────────┐     ┌──────────────────┐     ┌────────────────┐  │
│   │   FRONTEND  │────▶│  NODE.JS BACKEND │────▶│  SQLITE DB     │  │
│   │  HTML · JS  │◀────│  Express REST API│◀────│  Patients      │  │
│   │  CSS · DOM  │     │  JWT Auth        │     │  Appointments  │  │
│   └──────┬──────┘     └────────┬─────────┘     │  Vitals        │  │
│          │                     │               │  Records       │  │
│          │            ┌────────▼─────────┐     └────────────────┘  │
│          └───────────▶│ FASTAPI AI SERVICE│                        │
│                       │  InsightFace      │                        │
│                       │  LangChain RAG    │                        │
│                       │  Skin CNN Model   │                        │
│                       │  TTS / STT        │                        │
│                       └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

- [What is Hospital Copilot?](#what-is-hospital-copilot)
- [Core Features](#core-features)
- [AI Capabilities Deep Dive](#ai-capabilities-deep-dive)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Role-Based System](#role-based-system)
- [Database Schema Overview](#database-schema-overview)
- [API Reference](#api-reference)
- [Local Setup](#local-setup)
- [Deployment](#deployment)
- [Security Architecture](#security-architecture)
- [Roadmap](#roadmap)
- [License](#license)

---

## What is Hospital Copilot?

Hospital Copilot is a **production-grade, full-stack hospital intelligence platform** that fuses traditional hospital management with state-of-the-art AI — built to replace clunky, siloed hospital software with one unified experience.

Most hospital software treats AI as a feature added after the fact. Hospital Copilot was designed AI-first:

- The **AI Nurse** is not a pop-up widget — it is a memory-aware, RAG-powered clinical assistant capable of multilingual medical conversation
- **Face authentication** is not 2FA — it is the primary login mechanism, eliminating password sprawl in clinical settings
- **Skin disease prediction** is not a demo — it accepts real patient photo uploads and returns diagnostic class + recommended precautions
- **Emergency dispatch** does not just show a map — it uses the patient's live geolocation to find and alert the nearest hospital

Every feature was built to fit real clinical workflows, not to be showcased in a pitch deck.

---

## Core Features

```
╔══════════════════════════════════════════════════════════════════╗
║                     HOSPITAL MANAGEMENT CORE                    ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ROLE-BASED ACCESS CONTROL                                       ║
║      Three distinct roles: Patient · Doctor · Nurse              ║
║      Each role sees only its own dashboard, data, and actions    ║
║      JWT-protected routes; server-side role enforcement          ║
║                                                                  ║
║  PATIENT DASHBOARD                                               ║
║      ▸ Book, reschedule, cancel appointments                     ║
║      ▸ View complete medical history and past reports            ║
║      ▸ Track real-time vitals (BP, SpO2, heart rate, temp)      ║
║      ▸ Access prescriptions and discharge summaries              ║
║      ▸ Edit profile and emergency contacts                       ║
║                                                                  ║
║  DOCTOR DASHBOARD                                                ║
║      ▸ View and manage patient queue                             ║
║      ▸ Write and update medical reports                          ║
║      ▸ Prescribe medications with dosage details                 ║
║      ▸ Flag patients for urgent review                           ║
║      ▸ Access patient vitals history inline                      ║
║                                                                  ║
║  NURSE DASHBOARD                                                 ║
║      ▸ Monitor all active patients on the ward                   ║
║      ▸ Log vitals and medication administration                  ║
║      ▸ Receive and action doctor instructions                    ║
║      ▸ Trigger emergency escalation workflow                     ║
║                                                                  ║
║  APPOINTMENT ENGINE                                              ║
║      ▸ Full scheduling with conflict detection                   ║
║      ▸ Doctor availability management                            ║
║      ▸ Status lifecycle: Pending → Confirmed → Completed         ║
║      ▸ Linked to video call room generation                      ║
║                                                                  ║
║  VIDEO CONSULTATION                                              ║
║      ▸ Real-time video and audio between patient and doctor      ║
║      ▸ Appointment-scoped rooms (no link sharing required)       ║
║      ▸ In-call chat and screen share support                     ║
║                                                                  ║
║  EMERGENCY SYSTEM                                                ║
║      ▸ One-tap emergency trigger from patient dashboard          ║
║      ▸ Browser Geolocation API → nearest hospital lookup         ║
║      ▸ Automated emergency alert dispatched to on-duty staff     ║
║      ▸ Patient location and vitals packaged in the alert payload ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## AI Capabilities Deep Dive

### AI Nurse — RAG Chatbot

```
User Message
     │
     ▼
┌────────────────────────────┐
│     Query Embedding        │   (Hugging Face sentence-transformers)
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Vector Store Retrieval    │   (FAISS / Chroma — medical knowledge base)
│  Top-K relevant chunks     │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  LLM + Retrieved Context   │   (LangChain chain — context-aware generation)
│  + Conversation Memory     │
└────────────┬───────────────┘
             │
             ▼
        AI Response
   (Medical answer, suggestion,
    referral, or translation)
```

**Capabilities:**
- Answers medical questions grounded in the retrieved knowledge base — no hallucination from thin air
- Maintains conversation memory across the session — follow-up questions work naturally
- Multilingual support — queries and responses work across supported languages
- Handles: symptom triage, medication questions, post-visit follow-up, general health queries
- Falls back gracefully: clearly says "consult a doctor" when the question exceeds its scope

---

### Face Authentication — InsightFace

```
Login Request
     │
     ▼
┌───────────────────────────────┐
│  Webcam capture (frontend)    │
│  Base64 frame sent to API     │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  InsightFace buffalo_l model  │
│  Detects face in frame        │
│  Extracts 512-d embedding     │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│  Cosine similarity check      │
│  Compare vs stored vector     │
│  Threshold: configurable      │
└──────────────┬────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
    MATCH          NO MATCH
  Issue JWT      Reject + retry
```

**Key design decisions:**
- Face embeddings stored as 512-dimensional float arrays — never as images
- Registration flow captures multiple frames and averages embeddings for robustness
- Works under varying lighting and minor angle changes (buffalo_l handles in-the-wild conditions)
- No third-party face API — model runs entirely within the self-hosted FastAPI service

---

### Skin Disease Prediction

```
Patient uploads photo
          │
          ▼
  ┌───────────────┐
  │ Preprocessing │  ─── resize · normalize · augment
  └───────┬───────┘
          │
          ▼
  ┌────────────────┐
  │ CNN Classifier │  ─── trained on dermoscopy / clinical image dataset
  └───────┬────────┘
          │
          ▼
  ┌───────────────────────────────────────┐
  │  Output:                              │
  │    ▸ Predicted condition class        │
  │    ▸ Confidence score                 │
  │    ▸ Recommended precautions          │
  │    ▸ "See a doctor" flag if high risk │
  └───────────────────────────────────────┘
```

Conditions the model identifies span common dermatological categories. Results are always paired with a disclaimer and escalation prompt for high-confidence positive detections.

---

### Voice Interface — TTS / STT

- **Speech-to-Text**: Patient speaks their query → transcribed → sent to AI Nurse
- **Text-to-Speech**: AI Nurse response → synthesized audio → played back to patient
- Designed for accessibility: patients with low literacy or motor impairments can use the full AI Nurse without typing

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  HTML5            Semantic markup, accessibility-first      │
│  Vanilla JS       Fetch API, WebRTC, Geolocation API        │
│  CSS3             Custom animations, responsive grid        │
├─────────────────────────────────────────────────────────────┤
│                         BACKEND                             │
│  Node.js          v18+ runtime                              │
│  Express.js       REST API, middleware chain                │
│  SQLite           Embedded DB — zero infra overhead         │
│  bcrypt           Password hashing (cost factor 12)         │
│  jsonwebtoken     JWT issuance and verification (HS256)     │
├─────────────────────────────────────────────────────────────┤
│                       AI MICROSERVICE                       │
│  FastAPI          High-performance async Python API         │
│  InsightFace      Face detection + embedding (buffalo_l)    │
│  LangChain        RAG orchestration + memory management     │
│  Hugging Face     Model hosting + inference API             │
│  FAISS / Chroma   Vector store for RAG retrieval            │
│  Python CNN       Skin disease classification model         │
├─────────────────────────────────────────────────────────────┤
│                        DEPLOYMENT                           │
│  Vercel           Frontend (CDN-optimized, global edge)     │
│  Render           Node.js backend (auto-deploy from Git)    │
│  HF Spaces        FastAPI AI service (GPU-backed option)    │
│  Docker           Container support for AI service          │
└─────────────────────────────────────────────────────────────┘
```

**Language breakdown:**

```
JavaScript    ████████████████████░░░░░░░░░░░  45.7%
HTML          ████████████████░░░░░░░░░░░░░░░  41.0%
CSS           ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   6.0%
Python        ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   5.2%
Jupyter       █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   2.1%
```

---

## Project Structure

```
hospital_copilot1/
│
├── frontend/                         # Client Application
│   ├── pages/
│   │   ├── login.html                # Face auth + password login
│   │   ├── patient-dashboard.html    # Full patient portal
│   │   ├── doctor-dashboard.html     # Doctor workspace
│   │   ├── nurse-dashboard.html      # Nurse monitoring panel
│   │   ├── appointments.html         # Booking and scheduling
│   │   ├── video-call.html           # WebRTC consultation room
│   │   ├── emergency.html            # Emergency trigger UI
│   │   └── ai-nurse.html             # Chatbot + voice interface
│   ├── js/
│   │   ├── config.js                 # API base URLs
│   │   ├── auth.js                   # Login, JWT storage, face capture
│   │   ├── appointments.js           # Booking logic
│   │   ├── vitals.js                 # Vitals display and polling
│   │   ├── ai-nurse.js               # Chat, TTS/STT orchestration
│   │   ├── skin-upload.js            # Skin image upload + result render
│   │   ├── emergency.js              # Geolocation + alert dispatch
│   │   └── video.js                  # WebRTC peer connection setup
│   └── css/
│       ├── main.css                  # Global styles, CSS variables
│       ├── dashboard.css             # Dashboard layout
│       └── animations.css            # Transitions and motion
│
├── backend/                          # Node.js REST API
│   ├── controller/
│   │   ├── authController.js         # Login, register, JWT issue
│   │   ├── patientController.js      # Patient CRUD, vitals
│   │   ├── doctorController.js       # Queue, reports, prescriptions
│   │   ├── appointmentController.js  # Booking lifecycle
│   │   └── emergencyController.js    # Emergency alert logic
│   ├── model/
│   │   ├── userModel.js              # Users table operations
│   │   ├── appointmentModel.js       # Appointments table
│   │   ├── vitalsModel.js            # Vitals table
│   │   └── reportModel.js            # Medical reports table
│   ├── route/
│   │   ├── authRoutes.js
│   │   ├── patientRoutes.js
│   │   ├── doctorRoutes.js
│   │   └── appointmentRoutes.js
│   ├── services/
│   │   └── aiGateway.js              # Proxy to FastAPI AI service
│   ├── database/
│   │   ├── schema.sql                # Full SQLite schema
│   │   └── init.js                   # DB initialization script
│   └── server.js                     # Express app entry point
│
├── ai-nurse-service/                 # Python FastAPI AI Microservice
│   ├── routes/
│   │   ├── face.py                   # /verify-face endpoint
│   │   ├── chat.py                   # /chat endpoint (AI Nurse)
│   │   └── skin.py                   # /predict-skin endpoint
│   ├── rag/
│   │   ├── loader.py                 # Document ingestion pipeline
│   │   ├── embedder.py               # Embedding generation
│   │   ├── retriever.py              # Vector store search
│   │   └── chain.py                  # LangChain RAG chain setup
│   ├── models/
│   │   └── skin_model.pkl            # Trained skin classifier
│   ├── requirements.txt
│   ├── Dockerfile
│   └── app.py                        # FastAPI application entrypoint
│
├── fastapi_backend/                  # Supplementary FastAPI backend
├── logs/                             # Application logs
├── .gitignore
└── README.md
```

---

## Role-Based System

```
┌─────────────────────────────────────────────────────────────────┐
│                         WHO CAN DO WHAT                         │
├──────────────────────┬─────────────┬─────────────┬─────────────┤
│   ACTION             │   PATIENT   │   DOCTOR    │    NURSE    │
├──────────────────────┼─────────────┼─────────────┼─────────────┤
│ Book appointment     │     YES     │     NO      │     NO      │
│ View own records     │     YES     │     NO      │     NO      │
│ View all records     │     NO      │     YES     │     YES     │
│ Write reports        │     NO      │     YES     │     NO      │
│ Prescribe meds       │     NO      │     YES     │     NO      │
│ Log vitals           │     NO      │     NO      │     YES     │
│ Trigger emergency    │     YES     │     NO      │     YES     │
│ Video consult        │     YES     │     YES     │     NO      │
│ Use AI Nurse         │     YES     │     YES     │     YES     │
│ Skin prediction      │     YES     │     YES     │     NO      │
│ Manage users         │     NO      │     NO      │   Admin only│
└──────────────────────┴─────────────┴─────────────┴─────────────┘
```

---

## Database Schema Overview

```sql
-- Core identity table
users (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT CHECK(role IN ('patient','doctor','nurse')),
  face_embedding  TEXT,          -- JSON array: 512-d float vector
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME
)

-- Appointment lifecycle
appointments (
  id              INTEGER PRIMARY KEY,
  patient_id      INTEGER REFERENCES users(id),
  doctor_id       INTEGER REFERENCES users(id),
  scheduled_at    DATETIME NOT NULL,
  duration_min    INTEGER DEFAULT 30,
  status          TEXT CHECK(status IN ('pending','confirmed','completed','cancelled')),
  video_room_id   TEXT,
  notes           TEXT
)

-- Clinical vitals
vitals (
  id              INTEGER PRIMARY KEY,
  patient_id      INTEGER REFERENCES users(id),
  recorded_by     INTEGER REFERENCES users(id),
  blood_pressure  TEXT,          -- e.g. "120/80"
  heart_rate      INTEGER,       -- bpm
  spo2            REAL,          -- percentage
  temperature     REAL,          -- Celsius
  recorded_at     DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Medical records
reports (
  id              INTEGER PRIMARY KEY,
  patient_id      INTEGER REFERENCES users(id),
  doctor_id       INTEGER REFERENCES users(id),
  diagnosis       TEXT,
  treatment_plan  TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
)

-- Prescriptions
prescriptions (
  id              INTEGER PRIMARY KEY,
  report_id       INTEGER REFERENCES reports(id),
  medication_name TEXT NOT NULL,
  dosage          TEXT,
  frequency       TEXT,
  duration_days   INTEGER
)
```

---

## API Reference

### Auth Routes

```
POST   /api/auth/register          Register new user (patient / doctor / nurse)
POST   /api/auth/login             Password login → JWT
POST   /api/auth/face-login        Face frame → verify → JWT
GET    /api/auth/me                Get current user profile (JWT required)
```

### Patient Routes

```
GET    /api/patients/:id           Get patient profile
PUT    /api/patients/:id           Update patient profile
GET    /api/patients/:id/vitals    Get vitals history
GET    /api/patients/:id/records   Get full medical history
```

### Appointment Routes

```
GET    /api/appointments           List appointments (scoped by role)
POST   /api/appointments           Book new appointment
PUT    /api/appointments/:id       Update status or reschedule
DELETE /api/appointments/:id       Cancel appointment
```

### Doctor Routes

```
GET    /api/doctors/:id/queue      Get today's patient queue
POST   /api/reports                Create medical report
POST   /api/prescriptions          Issue prescription
```

### AI Service Routes (FastAPI — port 7860)

```
POST   /verify-face                Face embedding compare → match score + boolean
POST   /register-face              Store new face embedding for user
POST   /chat                       {message, session_id} → {reply, sources}
POST   /predict-skin               Multipart image → {condition, confidence, precautions}
GET    /docs                       Interactive Swagger UI
GET    /health                     Service health check
```

---

## Local Setup

### Prerequisites

```
Node.js     >= 18.x
Python      >= 3.10
pip         latest
Git         any recent version
```

---

### Step 1 — Clone

```bash
git clone https://github.com/Piyush9940/hospital_copilot1.git
cd hospital_copilot1
```

---

### Step 2 — Backend (Node.js + SQLite)

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
JWT_SECRET=your_super_secret_key_here
DB_FILE=./database/hospital.db
AI_SERVICE_URL=http://localhost:7860
```

Initialize the database and start:

```bash
node database/init.js      # Creates all tables from schema.sql
npm start                  # Server starts on PORT 5000
```

---

### Step 3 — AI Microservice (FastAPI + InsightFace)

```bash
cd ../ai-nurse-service
pip install -r requirements.txt
```

> **Note:** InsightFace will download the `buffalo_l` model pack on first run (~300 MB). Ensure you have a stable internet connection.

```bash
uvicorn app:app --host 0.0.0.0 --port 7860 --reload
```

Interactive API docs available at `http://localhost:7860/docs`

---

### Step 4 — Frontend

```bash
cd ../frontend
npx serve .
# Served at http://localhost:3000
```

Edit `frontend/js/config.js` to point to your local services:

```js
const API_BASE = "http://localhost:5000/api";
const AI_BASE  = "http://localhost:7860";
```

---

### All Services Running

```
http://localhost:3000        →  Frontend UI
http://localhost:5000/api    →  Node.js REST API
http://localhost:7860        →  FastAPI AI Microservice
http://localhost:7860/docs   →  Swagger UI (AI endpoints)
```

---

## Deployment

```
┌──────────────────────────────────────────────────────────┐
│                    PRODUCTION TOPOLOGY                   │
│                                                          │
│  [User Browser]                                          │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────────────────┐                                 │
│  │  Vercel (Frontend)  │  CDN edge, global distribution  │
│  │  hospital-copilot1  │  Auto-deploy on Git push        │
│  │  .vercel.app        │                                 │
│  └──────────┬──────────┘                                 │
│             │  REST calls (HTTPS)                        │
│             ▼                                            │
│  ┌─────────────────────┐                                 │
│  │  Render (Backend)   │  Always-on Node.js service      │
│  │  Express + SQLite   │  SQLite persisted to disk       │
│  └──────────┬──────────┘                                 │
│             │  AI requests (HTTPS)                       │
│             ▼                                            │
│  ┌─────────────────────┐                                 │
│  │  Hugging Face Space │  FastAPI AI microservice        │
│  │  Python + GPU       │  Face + RAG + Skin models       │
│  └─────────────────────┘                                 │
└──────────────────────────────────────────────────────────┘
```

| Layer | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys from `main` branch on every push |
| Node.js API | Render | Free tier; persistent SQLite disk storage |
| AI Microservice | Hugging Face Spaces | GPU-backed inference for InsightFace |

---

## Security Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                        │
│                                                           │
│  LAYER 1 — AUTHENTICATION                                 │
│  ├─ Face embeddings: 512-d float vectors, never images    │
│  ├─ Passwords: bcrypt hashed (cost factor 12)             │
│  └─ Sessions: stateless JWT (HS256, configurable expiry)  │
│                                                           │
│  LAYER 2 — AUTHORIZATION                                  │
│  ├─ Role enforcement on every protected route             │
│  ├─ Middleware checks token + extracts role claim         │
│  └─ Cross-role access returns 403 (no information oracle) │
│                                                           │
│  LAYER 3 — DATA PRIVACY                                   │
│  ├─ Face data: numerical array only, mathematically       │
│  │  unrecoverable back to a face image                    │
│  ├─ Medical records: scoped to patient + their doctors    │
│  └─ Logs: anonymized, no PII in log output                │
│                                                           │
│  LAYER 4 — TRANSPORT                                      │
│  ├─ HTTPS enforced on all production endpoints            │
│  ├─ CORS configured to frontend origin only               │
│  └─ Rate limiting on auth and AI endpoints                │
└───────────────────────────────────────────────────────────┘
```

---

## Roadmap

```
SHIPPED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[v1.0]  Core hospital management — patients, doctors, nurses
[v1.1]  AI Nurse (RAG chatbot with memory + multilingual)
[v1.2]  Face authentication (InsightFace buffalo_l)
[v1.3]  Skin disease prediction (CNN classifier)
[v1.4]  Emergency geolocation system
[v1.5]  Video consultation (WebRTC)
[v1.6]  TTS/STT voice interface for AI Nurse

PLANNED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[v2.0]  Admin portal — user management, audit logs, analytics
[v2.1]  EHR integration — HL7 FHIR-compatible record export
[v2.2]  AI Triage — symptom input → suggested specialist → auto-book
[v2.3]  Drug interaction checker — prescription safety guard
[v2.4]  Wearable sync — live vitals from IoT health devices
[v2.5]  Multi-hospital network — shared records across facilities
```

---

## Contributing

```bash
# 1. Fork the repo on GitHub

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make changes with clear commits
git commit -m "feat: add [your feature]"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

Branch naming conventions:
- `feature/*` — new features
- `fix/*` — bug fixes
- `docs/*` — documentation only
- `refactor/*` — code improvements without behavior change

---

## License

```
╔════════════════════════════════════════════╗
║         PROPRIETARY & CONFIDENTIAL         ║
║                                            ║
║   This software and all associated IP      ║
║   is the exclusive property of the         ║
║   Hospital Copilot project team.           ║
║                                            ║
║   Unauthorized use, reproduction, or       ║
║   distribution is strictly prohibited.     ║
╚════════════════════════════════════════════╝
```

---

```
Built to make hospitals smarter — one patient at a time.
```

[Live Demo](https://hospital-copilot1.vercel.app) · [Report a Bug](https://github.com/Piyush9940/hospital_copilot1/issues) · [Request a Feature](https://github.com/Piyush9940/hospital_copilot1/issues)
