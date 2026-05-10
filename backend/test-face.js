// Test face login

async function test() {
    try {
        console.log("Creating dummy jpeg buffer");
        // Create a tiny 1x1 jpeg buffer
        const base64Data = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
        const buffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([buffer], { type: 'image/jpeg' });

        const formData = new FormData();
        formData.append('file', blob, 'face.jpg');

        console.log("Sending to python...");
        const res = await fetch('http://127.0.0.1:7860/face/register', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
