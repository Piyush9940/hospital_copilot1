// face-auth.js
let faceModelsLoaded = false;
let faceModelsFailed = false;
let faceModelsPromise = null;

const FACE_MODEL_PATH = "../models";

function showToast(message, type = "info") {
    if (window.Toast?.show) {
        window.Toast.show(message, type);
    } else {
        console[type === "error" ? "error" : "log"](message);
    }
}

function setLoading(isLoading) {
    if (!window.LoadingOverlay) return;
    if (isLoading) window.LoadingOverlay.show();
    else window.LoadingOverlay.hide();
}

async function loadFaceModels() {
    if (faceModelsLoaded) return true;
    if (faceModelsFailed) throw new Error("Face recognition models failed to load");
    if (faceModelsPromise) return faceModelsPromise;

    if (!window.faceapi) {
        faceModelsFailed = true;
        throw new Error("face-api.js is not loaded");
    }

    faceModelsPromise = (async () => {
        try {
            setLoading(true);
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_PATH),
                faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_PATH),
                faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_PATH),
            ]);
            faceModelsLoaded = true;
            console.log("Face models loaded successfully");
            return true;
        } catch (e) {
            console.error("Error loading face models:", e);
            faceModelsFailed = true;
            showToast("Failed to load face recognition models.", "error");
            throw e;
        } finally {
            setLoading(false);
            faceModelsPromise = null;
        }
    })();

    return faceModelsPromise;
}

async function getFaceDescriptor(videoElement) {
    try {
        await loadFaceModels();

        if (!videoElement || videoElement.readyState < 2) {
            return null;
        }

        const detection = await faceapi.detectSingleFace(
            videoElement,
            new faceapi.TinyFaceDetectorOptions({
                inputSize: 224,
                scoreThreshold: 0.5,
            })
        )
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection?.descriptor || detection.descriptor.length !== 128) {
            return null;
        }

        return Array.from(detection.descriptor).map(Number);
    } catch (e) {
        console.error("Face detection error:", e);
        return null;
    }
}

function stopStream(stream) {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
}

window.FaceAuth = {
    loadFaceModels,
    getFaceDescriptor,
    stopStream,
};
