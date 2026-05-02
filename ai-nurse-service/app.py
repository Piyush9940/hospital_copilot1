from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.nurse_routes import router as nurse_router
from routes.voice_routes import router as voice_router
from routes.translation_routes import router as translation_router
from routes.face_routes import router as face_router
from routes.skin_routes import router as skin_router

app = FastAPI(
    title="AI Nurse Service",
    version="1.0.0",
    description="AI Nurse backend service with chat, voice, and translation support"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nurse_router)
app.include_router(voice_router)
app.include_router(translation_router)
app.include_router(face_router, prefix="/face", tags=["Face Authentication"])
app.include_router(skin_router, prefix="/skin", tags=["Skin Disease Detection"])


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "AI Nurse Service is running"
    }


@app.get("/health")
async def health_check():
    return {
        "success": True,
        "status": "healthy"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )