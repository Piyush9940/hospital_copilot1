def predict_mri_3d(_nifti_path):
    return {
        "scan_type": "mri_3d",
        "ai_model": "MRI 3D model pending implementation",
        "predicted_class": "model_not_available",
        "confidence": 0.0,
        "confidence_percent": 0.0,
        "probabilities": [
            {
                "class_name": "model_not_available",
                "probability_percent": 0.0,
                "meaning": "MRI 3D prediction is not available yet.",
            }
        ],
    }
