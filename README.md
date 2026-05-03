# Hospital Copilot

Hospital Copilot is an advanced, full-stack hospital management and AI assistance system. It provides comprehensive tools for patients, doctors, and nurses, integrating standard hospital operations with state-of-the-art AI features like facial recognition login, an AI Nurse chatbot, and skin disease prediction.

## 🚀 Features

### Core Hospital Management
- **Role-Based Access Control**: Secure login and dashboards tailored for Patients, Doctors, and Nurses.
- **Patient Dashboard**: Book appointments, view medical history, check vitals, and update profiles.
- **Doctor Dashboard**: Manage patient queues, update medical reports, and prescribe medications.
- **Appointments & Video Calls**: Schedule online consultations with real-time video/audio call functionality.
- **Emergency System**: Geolocation-based nearest hospital lookup and emergency alert system.

### AI Capabilities
- **Face Authentication**: Secure, passwordless login using facial recognition powered by InsightFace (`buffalo_l`).
- **AI Nurse Chatbot**: RAG-based AI assistant capable of answering medical queries, maintaining context, and supporting translations.
- **Skin Disease Prediction**: Upload images of skin conditions to receive AI-powered diagnostic insights and precautions.
- **Text-to-Speech & Speech-to-Text**: Voice-enabled interactions with the AI Nurse for accessible patient care.

## 🛠️ Technology Stack

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Dynamic and responsive UI).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (with comprehensive schemas for users, appointments, vitals, etc.).
- **AI Microservice**: FastAPI, Python, Hugging Face Hub, InsightFace, LangChain.
- **Deployment**:
  - Backend deployed on [Render](https://render.com/).
  - AI Service deployed on [Hugging Face Spaces](https://huggingface.co/spaces).

## 📂 Project Structure

```
.
├── frontend/               # Vanilla JS/HTML/CSS Client Application
│   ├── pages/              # HTML templates for dashboards, login, etc.
│   ├── js/                 # Client-side logic, API integration, and AI features
│   └── css/                # Styling and animations
├── backend/                # Node.js REST API
│   ├── controller/         # Request handlers (auth, patients, appointments)
│   ├── model/              # SQLite database interactions
│   ├── route/              # Express API routes
│   ├── services/           # External service integrations (AI Gateway)
│   └── database/           # SQLite schema and initialization scripts
└── ai-nurse-service/       # Python FastAPI AI Microservice
    ├── routes/             # Endpoints for face verification, chat, and skin detection
    ├── rag/                # RAG pipeline for the AI Nurse
    └── app.py              # Main FastAPI application
```

## ⚙️ Local Development Setup

### 1. Backend Setup (Node.js)

```bash
cd backend
npm install
# Set up your .env file with JWT_SECRET, PORT, DB_FILE, and AI_SERVICE_URL
npm start
```

### 2. AI Service Setup (Python/FastAPI)

```bash
cd ai-nurse-service
pip install -r requirements.txt
# Run the FastAPI server locally
uvicorn app:app --host 0.0.0.0 --port 7860
```

### 3. Frontend Setup
Simply serve the `frontend/` directory using any local web server (e.g., Live Server in VS Code, or `npx serve frontend`). Ensure `frontend/js/config.js` points to your local or deployed API endpoints.

## 🔒 Security
- **JWT Authentication**: All sensitive routes are protected.
- **Password Hashing**: bcrypt integration for safe credential storage.
- **Face Embeddings**: Facial features are stored as numerical embeddings (JSON arrays), not as raw images, ensuring privacy.

## 📄 License
This project is proprietary and confidential. All rights reserved.