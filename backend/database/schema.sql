CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'nurse')),
    phone TEXT,
    profile_image TEXT DEFAULT 'default-profile.jpg',
    face_image_path TEXT,
    face_embedding_json TEXT,
    face_registered INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
    age INTEGER,
    date_of_birth DATE,
    history TEXT,
    allergies TEXT,
    medications TEXT,
    blood_group TEXT CHECK(blood_group IN ('A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-')),
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    specialization TEXT NOT NULL,
    experience INTEGER DEFAULT 0,
    qualification TEXT NOT NULL,
    appointment_fee INTEGER DEFAULT 500,
    hospital_name TEXT,
    hospital_address TEXT,
    rating REAL DEFAULT 0,
    total_patients INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS nurses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    department TEXT NOT NULL,
    shift TEXT CHECK(shift IN ('Morning', 'Evening', 'Night')),
    qualification TEXT,
    experience INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_code TEXT UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    nurse_id INTEGER,
    symptoms TEXT NOT NULL,
    uploaded_image TEXT,
    uploaded_documents TEXT,
    appointment_date TEXT NOT NULL,
    appointment_time TEXT NOT NULL,
    consultation_type TEXT CHECK(consultation_type IN ('video', 'audio', 'chat', 'in-person')) DEFAULT 'video',
    fee INTEGER DEFAULT 500,
    payment_status TEXT CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    payment_id TEXT,
    appointment_status TEXT CHECK(appointment_status IN ('requested', 'confirmed', 'cancelled', 'completed', 'no-show')) DEFAULT 'requested',
    video_call_status TEXT CHECK(video_call_status IN ('pending', 'joined', 'completed', 'missed')) DEFAULT 'pending',
    video_call_room_id TEXT,
    face_verification_status TEXT CHECK(face_verification_status IN ('pending', 'verified', 'failed', 'not-required')) DEFAULT 'pending',
    face_verification_image TEXT,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (nurse_id) REFERENCES nurses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    appointment_id INTEGER,
    title TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    summary TEXT NOT NULL,
    prescription TEXT,
    follow_up_date DATE,
    pdf_url TEXT,
    is_shared INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS skin_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patient_id INTEGER,
    image_path TEXT NOT NULL,
    predicted_class TEXT NOT NULL,
    confidence REAL NOT NULL,
    top_3_predictions TEXT,
    description TEXT,
    precautions TEXT,
    disclaimer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    temperature REAL,
    heart_rate INTEGER,
    blood_pressure TEXT,
    spo2 INTEGER,
    respiratory_rate INTEGER,
    status TEXT CHECK(status IN ('normal', 'warning', 'critical')) DEFAULT 'normal',
    recorded_by TEXT CHECK(recorded_by IN ('patient', 'nurse', 'doctor', 'system')) DEFAULT 'system',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS emergency_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER,
    appointment_id INTEGER,
    message TEXT NOT NULL,
    severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'high',
    status TEXT CHECK(status IN ('active', 'acknowledged', 'resolved', 'false-alarm')) DEFAULT 'active',
    acknowledged_by INTEGER,
    acknowledged_at DATETIME,
    resolved_at DATETIME,
    resolved_by INTEGER,
    resolution_notes TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS nurse_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    nurse_id INTEGER NOT NULL,
    appointment_id INTEGER,
    note TEXT NOT NULL,
    note_type TEXT CHECK(note_type IN ('observation', 'medication', 'care', 'handover', 'incident')) DEFAULT 'observation',
    is_urgent INTEGER DEFAULT 0,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (nurse_id) REFERENCES nurses(id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    patient_id INTEGER,
    title TEXT DEFAULT 'New Conversation',
    summary TEXT,
    session_type TEXT DEFAULT 'ai_nurse',
    is_active INTEGER DEFAULT 1,
    message_count INTEGER DEFAULT 0,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    medical_context TEXT,
    attachments TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL CHECK(sender_role IN ('patient', 'doctor')),
    sender_user_id INTEGER NOT NULL,
    signal_json TEXT,
    call_status TEXT NOT NULL DEFAULT 'waiting' CHECK(call_status IN ('waiting', 'active', 'ended')),
    ended_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (appointment_id, sender_role, sender_user_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_nurses_user_id ON nurses(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date_time ON appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_appointment_id ON video_calls(appointment_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_updated_at ON video_calls(updated_at);