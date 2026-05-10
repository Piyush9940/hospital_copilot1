// face-auth.js
let faceModelsLoaded = false;
let faceModelsFailed = false;

async function loadFaceModels() {
    if (faceModelsLoaded || faceModelsFailed) return;
    try {
        LoadingOverlay.show();
        await faceapi.nets.tinyFaceDetector.loadFromUri('../models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('../models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('../models');
        faceModelsLoaded = true;
        console.log("Face models loaded successfully");
    } catch (e) {
        console.error("Error loading face models:", e);
        faceModelsFailed = true;
        Toast.show("Failed to load face recognition models.", "error");
        throw e;
    } finally {
        LoadingOverlay.hide();
    }
}

async function getFaceDescriptor(videoElement) {
    if (!faceModelsLoaded && !faceModelsFailed) {
        try {
            await loadFaceModels();
        } catch (e) {
            return null; // Return null gracefully on failure
        }
    }
    
    if (faceModelsFailed) return null;

    try {
        const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        return detection ? Array.from(detection.descriptor) : null;
    } catch (e) {
        console.error("Face detection error:", e);
        return null;
    }
}

window.FaceAuth = {
    loadFaceModels,
    getFaceDescriptor
};
