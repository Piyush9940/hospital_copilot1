from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routes import health, predictions
from app.services.model_registry import model_registry
from app.services.mri_tumor import load_mri_tumor_model


@asynccontextmanager
async def lifespan(app: FastAPI):
    model_registry.load_all()
    load_mri_tumor_model()
    yield


app = FastAPI(
    title="Medical Scan AI Backend",
    description="Predict medical scan classes and generate clean JSON reports with Groq.",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(predictions.router)
