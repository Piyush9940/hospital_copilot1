// face-auth.js
let faceModelsLoaded = false;

async function loadFaceModels() {
    if (faceModelsLoaded) return;
    try {
        LoadingOverlay.show();
        await faceapi.nets.tinyFaceDetector.loadFromUri('../models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('../models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('../models');
        faceModelsLoaded = true;
        console.log("Face models loaded successfully");
    } catch (e) {
        console.error("Error loading face models:", e);
        Toast.show("Failed to load face recognition models.", "error");
    } finally {
        LoadingOverlay.hide();
    }
}

async function getFaceDescriptor(videoElement) {
    if (!faceModelsLoaded) await loadFaceModels();

    const detection = await faceapi.detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection ? Array.from(detection.descriptor) : null;
}

window.FaceAuth = {
    loadFaceModels,
    getFaceDescriptor
};
