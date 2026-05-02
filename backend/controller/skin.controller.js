import { createError } from "../utils/helper.js";
import db from "../config/db.js";

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

        const aiResponse = await fetch(`${process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000'}/skin/predict`, {
            method: 'POST',
            body: formData
        });

        if (!aiResponse.ok) {
            throw new Error("Skin prediction failed from AI service");
        }

        const predictionData = await aiResponse.json();

        // Save result in DB if patient_id is provided
        const patientId = req.body?.patient_id;
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
                predictionData.predicted_class,
                predictionData.confidence,
                JSON.stringify(predictionData.top_3_predictions),
                predictionData.description,
                predictionData.precautions,
                predictionData.disclaimer
            );
        }

        return res.status(200).json({
            success: true,
            data: predictionData
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
