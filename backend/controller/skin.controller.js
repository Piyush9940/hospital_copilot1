import { createError } from "../utils/helper.js";
import db from "../config/db.js";
import { getPatientByUserId } from "../model/patient.model.js";

const resolvePatientId = (req) => {
    if (req.user?.role === "patient") {
        const patient = getPatientByUserId(req.user.id);
        return patient?.patient_id || null;
    }

    return req.body?.patient_id || req.body?.patientId || null;
};

export const predictSkinDisease = async (req, res, next) => {
    try {
        const imageBase64 = req.body?.image;
        if (!imageBase64) {
            throw createError("Image is required", 400);
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('file', blob, 'skin.jpg');

        const aiResponse = await fetch(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:7860'}/skin/predict`, {
            method: 'POST',
            body: formData
        });

        if (!aiResponse.ok) {
            throw new Error("Skin prediction failed from AI service");
        }

        const predictionData = await aiResponse.json();
        const prediction = predictionData?.data || predictionData;

        if (!prediction?.predicted_class) {
            throw createError("Skin prediction response is missing predicted_class", 502);
        }

        const patientId = resolvePatientId(req);
        if (patientId) {
            const stmt = db.prepare(`
                INSERT INTO skin_predictions (
                    user_id, patient_id, image_path, predicted_class, confidence, 
                    top_3_predictions, description, precautions, disclaimer
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run(
                req.user.id,
                patientId,
                'base64_image', // In a real app, save to S3/disk and store path
                prediction.predicted_class,
                prediction.confidence,
                JSON.stringify(prediction.top_3_predictions || []),
                prediction.description,
                prediction.precautions,
                prediction.disclaimer
            );
        }

        return res.status(200).json({
            success: true,
            data: prediction
        });
    } catch (error) {
        console.error("Skin prediction error:", error);
        return next(
            createError(
                error.message || "Failed to predict skin disease",
                error.statusCode || 500
            )
        );
    }
};
