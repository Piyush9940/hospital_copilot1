from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

import cv2
import numpy as np

try:
    from insightface.app import FaceAnalysis
except ImportError as exc:
    FaceAnalysis = None
    _IMPORT_ERROR = exc
else:
    _IMPORT_ERROR = None


@dataclass
class FaceVerifierConfig:
    model_name: str = "buffalo_l"
    det_size: tuple[int, int] = (640, 640)
    fps_process: int = 5
    threshold: float = 55.0
    ctx_id: int = 0
    providers: Optional[List[str]] = None

    def resolved_providers(self) -> List[str]:
        if self.providers:
            return self.providers
        return ["CUDAExecutionProvider", "CPUExecutionProvider"]


class FaceVideoVerifier:
    def __init__(self, config: Optional[FaceVerifierConfig] = None) -> None:
        self.config = config or FaceVerifierConfig()
        self.app = self._create_app()

    def _create_app(self):
        if FaceAnalysis is None:
            raise ImportError(
                "insightface is not installed in this Python environment. "
                "Install it with a supported Python version, for example: "
                "py -3.12 -m pip install insightface onnxruntime-gpu"
            ) from _IMPORT_ERROR

        app = FaceAnalysis(
            name=self.config.model_name,
            providers=self.config.resolved_providers(),
        )
        app.prepare(ctx_id=self.config.ctx_id, det_size=self.config.det_size)
        return app

    def get_embedding_from_image(self, image: np.ndarray) -> Optional[np.ndarray]:
        try:
            faces = self.app.get(image)
            if not faces:
                return None

            faces = sorted(
                faces,
                key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]),
                reverse=True,
            )

            embedding = faces[0].embedding
            norm = np.linalg.norm(embedding)
            if norm == 0:
                return None
            return embedding / norm
        except Exception:
            return None

    def create_reference_embedding(self, reference_image_path: str | Path) -> np.ndarray:
        reference_path = Path(reference_image_path)
        if not reference_path.exists():
            raise FileNotFoundError(f"Reference image not found: {reference_path}")

        image = cv2.imread(str(reference_path))
        if image is None:
            raise ValueError(f"Unable to read reference image: {reference_path}")

        embedding = self.get_embedding_from_image(image)
        if embedding is None:
            raise ValueError("No face detected in reference image")
        return embedding

    def verify_video(self, video_path: str | Path, ref_embedding: np.ndarray) -> Dict[str, float | bool | int | str]:
        video_file = Path(video_path)
        if not video_file.exists():
            raise FileNotFoundError(f"Video not found: {video_file}")

        cap = cv2.VideoCapture(str(video_file))
        if not cap.isOpened():
            raise ValueError(f"Error opening video: {video_file}")

        video_fps = cap.get(cv2.CAP_PROP_FPS)
        if not video_fps:
            video_fps = 25

        frame_interval = max(1, int(video_fps / self.config.fps_process))
        similarities: List[float] = []
        frame_count = 0
        processed_frames = 0

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    embedding = self.get_embedding_from_image(frame)
                    if embedding is not None:
                        similarity = float(np.dot(ref_embedding, embedding))
                        similarities.append(similarity)
                        processed_frames += 1

                frame_count += 1
        finally:
            cap.release()

        if not similarities:
            return {
                "match": False,
                "reason": "No face detected in video",
            }

        max_similarity = float(np.max(similarities) * 100)
        avg_similarity = float(np.mean(similarities) * 100)
        match = max_similarity >= self.config.threshold

        return {
            "match": match,
            "max_similarity": max_similarity,
            "avg_similarity": avg_similarity,
            "frames_used": processed_frames,
        }

    def verify(self, reference_image_path: str | Path, video_path: str | Path) -> Dict[str, float | bool | int | str]:
        ref_embedding = self.create_reference_embedding(reference_image_path)
        return self.verify_video(video_path, ref_embedding)


_default_verifier: Optional[FaceVideoVerifier] = None


def get_verifier(config: Optional[FaceVerifierConfig] = None) -> FaceVideoVerifier:
    global _default_verifier
    if config is not None:
        return FaceVideoVerifier(config)
    if _default_verifier is None:
        _default_verifier = FaceVideoVerifier()
    return _default_verifier


def verify_face_match(
    reference_image_path: str | Path,
    video_path: str | Path,
    config: Optional[FaceVerifierConfig] = None,
) -> Dict[str, float | bool | int | str]:
    verifier = get_verifier(config)
    return verifier.verify(reference_image_path, video_path)


if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Verify whether a face in a video matches a reference image.")
    parser.add_argument("reference_image", help="Path to the reference image")
    parser.add_argument("video", help="Path to the input video")
    parser.add_argument("--fps-process", type=int, default=5, help="Frames per second to sample from the video")
    parser.add_argument("--threshold", type=float, default=55.0, help="Match threshold as a percentage")
    args = parser.parse_args()

    config = FaceVerifierConfig(fps_process=args.fps_process, threshold=args.threshold)
    result = verify_face_match(args.reference_image, args.video, config=config)
    print(json.dumps(result, indent=2))
