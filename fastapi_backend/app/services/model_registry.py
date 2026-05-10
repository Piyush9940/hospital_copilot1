from app.config import MODEL_CONFIGS
from app.services.predictors import build_model


class ModelRegistry:
    def __init__(self):
        self.models = {}

    def load_all(self):
        for key, config in MODEL_CONFIGS.items():
            self.models[key] = build_model(config)

    def get(self, key: str):
        if key not in self.models:
            raise KeyError(f"Model is not loaded: {key}")
        return self.models[key]


model_registry = ModelRegistry()
