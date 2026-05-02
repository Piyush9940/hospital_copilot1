import { spawn } from "child_process";
import path from "path";
import fs from "fs";

import { getAppointmentById } from "../model/appointment.model.js";
import { createError, validateId } from "../utils/helper.js";
import { setAppointmentFaceVerification } from "./appointment.service.js";

const PYTHON_EXECUTABLE = process.env.PYTHON_EXECUTABLE || "python";
const FACE_VIDEO_VERIFIER_SCRIPT =
    process.env.FACE_VIDEO_VERIFIER_SCRIPT || "python/video_face_verifier.py";

const FACE_VERIFICATION_TIMEOUT = Number(
    process.env.FACE_VERIFICATION_TIMEOUT || 30000
);

const FACE_VIDEO_THRESHOLD = Number(
    process.env.FACE_VIDEO_THRESHOLD || 55
);

const FACE_VIDEO_FPS_PROCESS = Number(
    process.env.FACE_VIDEO_FPS_PROCESS || 5
);

/**
 * Check file exists
 */
const ensureFileExists = (filePath, fieldName = "File") => {
    if (!filePath || typeof filePath !== "string" || !filePath.trim()) {
        throw createError(`${fieldName} path is required`, 400);
    }

    const resolvedPath = path.resolve(filePath.trim());

    if (!fs.existsSync(resolvedPath)) {
        throw createError(`${fieldName} not found at path: ${resolvedPath}`, 404);
    }

    return resolvedPath;
};

/**
 * Validate config
 */
const validateFaceVerificationConfig = () => {
    if (!PYTHON_EXECUTABLE || typeof PYTHON_EXECUTABLE !== "string" || !PYTHON_EXECUTABLE.trim()) {
        throw createError("PYTHON_EXECUTABLE is missing or invalid", 500);
    }

    if (
        !FACE_VIDEO_VERIFIER_SCRIPT ||
        typeof FACE_VIDEO_VERIFIER_SCRIPT !== "string" ||
        !FACE_VIDEO_VERIFIER_SCRIPT.trim()
    ) {
        throw createError("FACE_VIDEO_VERIFIER_SCRIPT is missing or invalid", 500);
    }

    if (!Number.isFinite(FACE_VERIFICATION_TIMEOUT) || FACE_VERIFICATION_TIMEOUT <= 0) {
        throw createError("FACE_VERIFICATION_TIMEOUT must be a valid positive number", 500);
    }

    const resolvedScriptPath = path.resolve(FACE_VIDEO_VERIFIER_SCRIPT);

    if (!fs.existsSync(resolvedScriptPath)) {
        throw createError(`Face video verifier script not found: ${resolvedScriptPath}`, 500);
    }

    return resolvedScriptPath;
};

/**
 * Parse JSON output from Python
 */
const parsePythonOutput = (output) => {
    try {
        const trimmed = String(output || "").trim();

        if (!trimmed) {
            throw createError("Python verifier returned empty output", 502);
        }

        return JSON.parse(trimmed);
    } catch (error) {
        if (error.statusCode) {
            throw error;
        }

        throw createError(
            `Failed to parse Python verifier output: ${error.message}`,
            502,
            { rawOutput: String(output || "") }
        );
    }
};

/**
 * Run your real Python video_face_verifier.py
 */
export const runVideoFaceVerification = async ({
    referenceImagePath,
    videoPath,
    threshold = FACE_VIDEO_THRESHOLD,
    fpsProcess = FACE_VIDEO_FPS_PROCESS,
}) => {
    try {
        const scriptPath = validateFaceVerificationConfig();
        const resolvedReferenceImage = ensureFileExists(
            referenceImagePath,
            "Reference image"
        );
        const resolvedVideo = ensureFileExists(videoPath, "Video");

        return await new Promise((resolve, reject) => {
            const child = spawn(
                PYTHON_EXECUTABLE,
                [
                    scriptPath,
                    resolvedReferenceImage,
                    resolvedVideo,
                    "--fps-process",
                    String(fpsProcess),
                    "--threshold",
                    String(threshold),
                ],
                {
                    stdio: ["ignore", "pipe", "pipe"],
                }
            );

            let stdout = "";
            let stderr = "";
            let isTimedOut = false;

            const timeout = setTimeout(() => {
                isTimedOut = true;
                child.kill("SIGKILL");
            }, FACE_VERIFICATION_TIMEOUT);

            child.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            child.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            child.on("error", (error) => {
                clearTimeout(timeout);
                reject(
                    createError(
                        `Failed to start Python video verifier: ${error.message}`,
                        500
                    )
                );
            });

            child.on("close", (code) => {
                clearTimeout(timeout);

                if (isTimedOut) {
                    return reject(
                        createError("Video face verification process timed out", 504, {
                            stderr: stderr.trim() || null,
                        })
                    );
                }

                // Your script prints JSON, so parse stdout even when exit code is non-zero
                if (stdout.trim()) {
                    try {
                        const parsed = parsePythonOutput(stdout);

                        return resolve({
                            success: true,
                            match: Boolean(parsed.match),
                            maxSimilarity:
                                parsed.max_similarity !== undefined && parsed.max_similarity !== null
                                    ? Number(parsed.max_similarity)
                                    : null,
                            avgSimilarity:
                                parsed.avg_similarity !== undefined && parsed.avg_similarity !== null
                                    ? Number(parsed.avg_similarity)
                                    : null,
                            framesUsed:
                                parsed.frames_used !== undefined && parsed.frames_used !== null
                                    ? Number(parsed.frames_used)
                                    : 0,
                            threshold: Number(threshold),
                            reason: parsed.reason || null,
                            raw: parsed,
                            exitCode: code,
                        });
                    } catch {
                        // fall through
                    }
                }

                return reject(
                    createError(
                        `Python video verifier failed with exit code ${code}`,
                        500,
                        {
                            stderr: stderr.trim() || null,
                            stdout: stdout.trim() || null,
                        }
                    )
                );
            });
        });
    } catch (error) {
        throw createError(
            error.message || "Video face verification failed",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Compare reference image vs video only
 */
export const compareFaceWithVideoOnly = async ({
    referenceImagePath,
    videoPath,
    threshold = FACE_VIDEO_THRESHOLD,
    fpsProcess = FACE_VIDEO_FPS_PROCESS,
}) => {
    try {
        const result = await runVideoFaceVerification({
            referenceImagePath,
            videoPath,
            threshold,
            fpsProcess,
        });

        return {
            success: true,
            message:
                result.match
                    ? "Video face matched successfully"
                    : result.reason || "Video face verification failed",
            data: {
                match: result.match,
                maxSimilarity: result.maxSimilarity,
                avgSimilarity: result.avgSimilarity,
                framesUsed: result.framesUsed,
                threshold: result.threshold,
                referenceImagePath,
                videoPath,
                raw: result.raw || null,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to compare face with video",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Verify appointment with video and persist result in DB
 */
export const verifyAppointmentFaceWithVideo = async ({
    appointmentId,
    referenceImagePath,
    videoPath,
    threshold = FACE_VIDEO_THRESHOLD,
    fpsProcess = FACE_VIDEO_FPS_PROCESS,
}) => {
    try {
        const validAppointmentId = validateId(appointmentId, "Appointment ID");

        const appointment = getAppointmentById(validAppointmentId);
        if (!appointment) {
            throw createError("Appointment not found", 404);
        }

        const verificationResult = await runVideoFaceVerification({
            referenceImagePath,
            videoPath,
            threshold,
            fpsProcess,
        });

        const finalStatus = verificationResult.match ? "verified" : "failed";

        const updateResult = await setAppointmentFaceVerification(
            validAppointmentId,
            finalStatus,
            videoPath
        );

        return {
            success: true,
            message:
                verificationResult.match
                    ? "Appointment video face verified successfully"
                    : verificationResult.reason || "Appointment video face verification failed",
            data: {
                appointmentId: validAppointmentId,
                verificationStatus: finalStatus,
                match: verificationResult.match,
                maxSimilarity: verificationResult.maxSimilarity,
                avgSimilarity: verificationResult.avgSimilarity,
                framesUsed: verificationResult.framesUsed,
                threshold: verificationResult.threshold,
                referenceImagePath,
                videoPath,
                appointment: updateResult.data || null,
                raw: verificationResult.raw || null,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Failed to verify appointment face with video",
            error.statusCode || 500,
            error.details || null
        );
    }
};

/**
 * Health check
 */
export const checkFaceVerificationHealth = async () => {
    try {
        const scriptPath = validateFaceVerificationConfig();

        return {
            success: true,
            message: "Face video verification service is configured correctly",
            data: {
                pythonExecutable: PYTHON_EXECUTABLE,
                scriptPath,
                timeout: FACE_VERIFICATION_TIMEOUT,
                threshold: FACE_VIDEO_THRESHOLD,
                fpsProcess: FACE_VIDEO_FPS_PROCESS,
            },
        };
    } catch (error) {
        throw createError(
            error.message || "Face verification health check failed",
            error.statusCode || 500,
            error.details || null
        );
    }
};

export default {
    runVideoFaceVerification,
    compareFaceWithVideoOnly,
    verifyAppointmentFaceWithVideo,
    checkFaceVerificationHealth,
};