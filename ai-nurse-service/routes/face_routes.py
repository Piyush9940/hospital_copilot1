import io
import json
import numpy as np
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import cv2
import insightface
from insightface.app import FaceAnalysis

router = APIRouter()

# Initialize InsightFace
# Note: In production, models are downloaded automatically to ~/.insightface/models/
# We use buffalo_l which is standard for high accuracy
try:
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=0, det_size=(640, 640))
except Exception as e:
    print(f"Warning: Failed to load InsightFace model: {e}")
    face_app = None

def get_face_embedding(image_bytes):
    if not face_app:
        raise Exception("Face model not initialized")
    
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Invalid image format")
        
    faces = face_app.get(img)
    
    if len(faces) == 0:
        raise ValueError("No face detected in the image")
    if len(faces) > 1:
        raise ValueError("Multiple faces detected. Please ensure only one face is visible.")
        
    # Return the embedding of the first (and only) face
    return faces[0].embedding

def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

@router.post("/register")
async def register_face(file: UploadFile = File(...)):
    """
    Accepts an image file and returns its face embedding as a JSON list.
    """
    try:
        contents = await file.read()
        embedding = get_face_embedding(contents)
        return {"success": True, "embedding": embedding.tolist()}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face registration failed: {str(e)}")

@router.post("/verify")
async def verify_face(file: UploadFile = File(...), target_embedding: str = Form(...)):
    """
    Accepts an image file and a target embedding (JSON string array).
    Returns success if cosine similarity > threshold.
    """
    try:
        if not target_embedding:
            raise HTTPException(status_code=400, detail="Target embedding is required")
            
        target_emb_list = json.loads(target_embedding)
        
        contents = await file.read()
        current_embedding = get_face_embedding(contents)
        
        similarity = cosine_similarity(current_embedding.tolist(), target_emb_list)
        
        # Threshold for buffalo_l is typically around 0.4 - 0.5
        threshold = 0.5
        match = similarity >= threshold
        
        return {
            "success": True,
            "match": bool(match),
            "similarity": float(similarity)
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face verification failed: {str(e)}")
