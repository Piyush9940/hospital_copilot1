import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./route/auth.route.js";
import patientRoutes from "./route/patient.routes.js";
import patientDashboardRoutes from "./route/patientDashboard.routes.js";
import doctorRoutes from "./route/doctor.routes.js";
import doctorDashboardRoutes from "./route/doctorDashboard.routes.js";
import doctorAppointmentRoutes from "./route/doctorAppointment.routes.js";
import nurseRoutes from "./route/nurse.routes.js";
import nurseDashboardRoutes from "./route/nurseDashboard.routes.js";
import nurseNoteRoutes from "./route/nurseNote.routes.js";
import appointmentRoutes from "./route/appointment.routes.js";
import paymentRoutes from "./route/payment.routes.js";
import reportRoutes from "./route/report.routes.js";
import vitalRoutes from "./route/vital.routes.js";
import emergencyRoutes from "./route/emergency.routes.js";
import aiNurseRoutes from "./route/aiNurse.routes.js";
import faceVerificationRoutes from "./route/faceVerification.routes.js";
import chatPermissionRoutes from "./route/chatPermission.routes.js";
import videoCallRoutes from "./route/videoCall.routes.js";
import skinRoutes from "./route/skin.route.js";

import { createError } from "./utils/helper.js";
import errorMiddleware from "./middleware/error.middleware.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.disable("x-powered-by");

app.use(
    helmet({
        crossOriginResourcePolicy: false,
    })
);

app.use(
    cors({
        origin: function (origin, callback) {
            // Dynamically allow any origin
            callback(null, true);
        },
        credentials: true,
    })
);

app.use(
    morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Hospital Copilot backend is running",
    });
});

app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "Hospital Copilot backend is running",
    });
});

app.use("/api/auth", authRoutes);

app.use("/api/patient", patientRoutes);
app.use("/api/patient-dashboard", patientDashboardRoutes);

app.use("/api/doctor", doctorRoutes);
app.use("/api/doctor-dashboard", doctorDashboardRoutes);
app.use("/api/doctor-appointments", doctorAppointmentRoutes);

app.use("/api/nurse", nurseRoutes);
app.use("/api/nurse-dashboard", nurseDashboardRoutes);
app.use("/api/nurse-notes", nurseNoteRoutes);

app.use("/api/appointments", appointmentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vitals", vitalRoutes);
app.use("/api/emergency", emergencyRoutes);
app.use("/api/ai-nurse", aiNurseRoutes);
app.use("/api/face-verification", faceVerificationRoutes);
app.use("/api/chat-permission", chatPermissionRoutes);
app.use("/api/video-call", videoCallRoutes);
app.use("/api/skin", skinRoutes);

app.use((req, res, next) => {
    return next(
        createError(`Route not found: ${req.method} ${req.originalUrl}`, 404)
    );
});

app.use(errorMiddleware);

export default app;