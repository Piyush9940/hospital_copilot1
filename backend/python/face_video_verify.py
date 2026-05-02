import sys
import json
import cv2
import numpy as np

try:
    from insightface.app import FaceAnalysis
except Exception as e:
    print(json.dumps({
        "success": False,
        "match": False,
        "message": f"Failed to import insightface: {str(e)}"
    }))
    sys.exit(1)


def safe_json_print(data: dict, exit_code: int = 0):
    print(json.dumps(data))
    sys.exit(exit_code)


def cosine_similarity_percent(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) * 100.0)


def get_face_app():
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def read_image(image_path: str):
    img = cv2.imread(image_path)
    return img


def get_single_face_embedding(app, image):
    if image is None:
        return None, "Reference image could not be read"

    faces = app.get(image)
    if not faces:
        return None, "No face found in reference image"

    face = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
    emb = face.normed_embedding
    return emb, None


def verify_video(reference_image_path: str, video_path: str, threshold: float = 55.0, frame_skip: int = 5):
    app = get_face_app()

    ref_img = read_image(reference_image_path)
    ref_emb, ref_err = get_single_face_embedding(app, ref_img)
    if ref_err:
        return {
            "success": False,
            "match": False,
            "message": ref_err
        }

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {
            "success": False,
            "match": False,
            "message": "Video file could not be opened"
        }

    similarities = []
    processed_frames = 0
    usable_frames = 0
    matched_frames = 0
    frame_index = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_index % frame_skip != 0:
            frame_index += 1
            continue

        processed_frames += 1
        faces = app.get(frame)

        if faces:
            face = max(faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
            emb = face.normed_embedding
            sim = cosine_similarity_percent(ref_emb, emb)
            similarities.append(sim)
            usable_frames += 1

            if sim >= threshold:
                matched_frames += 1

        frame_index += 1

    cap.release()

    if not similarities:
        return {
            "success": False,
            "match": False,
            "message": "No face detected in video",
            "processed_frames": processed_frames,
            "usable_frames": usable_frames,
            "matched_frames": matched_frames,
            "threshold": threshold
        }

    max_similarity = round(max(similarities), 2)
    avg_similarity = round(sum(similarities) / len(similarities), 2)

    # Final decision rule:
    # - match if max similarity crosses threshold
    # OR enough matched frames exist
    match = bool(max_similarity >= threshold or matched_frames >= max(1, usable_frames // 3))

    return {
        "success": True,
        "match": match,
        "max_similarity": max_similarity,
        "avg_similarity": avg_similarity,
        "threshold": threshold,
        "processed_frames": processed_frames,
        "usable_frames": usable_frames,
        "matched_frames": matched_frames,
        "message": "Video face verified successfully" if match else "Video face verification failed"
    }


def main():
    if len(sys.argv) < 3:
        safe_json_print({
            "success": False,
            "match": False,
            "message": "Usage: python face_video_verify.py <reference_image_path> <video_path> [threshold] [frame_skip]"
        }, 1)

    reference_image_path = sys.argv[1]
    video_path = sys.argv[2]

    threshold = 55.0
    frame_skip = 5

    if len(sys.argv) >= 4:
        try:
            threshold = float(sys.argv[3])
        except Exception:
            pass

    if len(sys.argv) >= 5:
        try:
            frame_skip = int(sys.argv[4])
        except Exception:
            pass

    try:
        result = verify_video(
            reference_image_path=reference_image_path,
            video_path=video_path,
            threshold=threshold,
            frame_skip=frame_skip,
        )
        safe_json_print(result, 0 if result.get("success") else 1)
    except Exception as e:
        safe_json_print({
            "success": False,
            "match": False,
            "message": f"Unexpected error: {str(e)}"
        }, 1)


if __name__ == "__main__":
    main()