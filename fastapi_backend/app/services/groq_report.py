import base64
import json
import mimetypes
import os
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq

from app.config import GROQ_MODEL_NAME, REPORT_SCHEMA_TEXT


VISION_MODEL = GROQ_MODEL_NAME
REFINE_MODEL = "qwen/qwen3-32b"


VISION_SYSTEM_PROMPT = """
You are a clinical AI report writing assistant.
Return valid JSON only.
Use the uploaded image and the classifier output.
Do not make a final diagnosis.
Do not invent patient history, symptoms, age, sex, dates, IDs, or report metadata.
Clearly separate image observations from classifier output.
Use cautious medical language and recommend clinician or radiologist review.
Follow the requested JSON structure exactly.
"""


REFINE_SYSTEM_PROMPT = """
You are a senior medical report editor and clinical communication specialist.
You will receive a raw AI-generated radiology JSON report.
Your job is to rewrite it so that:
- Every string field is clear, complete, and professionally worded.
- Bullet-point lists are concise but informative.
- Medical terms are accurate and explained where possible.
- The patient_friendly_explanation is warm, simple, and non-alarming.
- Risk level and combined_assessment are logically consistent with confidence scores.
- No hallucinated data is added; only improve wording of what exists.
- Return valid JSON only with the same exact structure and no extra keys.
"""


def get_groq_client():
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not found. Add it to the project .env file.")
    return Groq(api_key=api_key)


def image_to_data_url(image_path: Path):
    mime_type, _ = mimetypes.guess_type(image_path)
    if mime_type is None:
        mime_type = "image/jpeg"

    encoded = base64.b64encode(image_path.read_bytes()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def build_prompt(scan_type: str, prediction: dict):
    return f"""
Generate a detailed JSON report for this uploaded medical image and model prediction.

Scan type:
{scan_type}

Classifier output:
{json.dumps(prediction, indent=2)}

Return JSON only. Do not include markdown.
Do not add patient_id, report_id, doctor_id, case_id, created_at, or database fields.
Use exactly this JSON shape:
{REPORT_SCHEMA_TEXT}
"""


def build_refine_prompt(raw_report: dict):
    return f"""
Here is the raw AI-generated radiology report JSON:

{json.dumps(raw_report, indent=2)}

Rewrite every string value for clarity, professionalism, and readability.
Keep the exact same JSON structure and keys.
Return only the improved JSON. Do not include markdown.
Use exactly this JSON shape:
{REPORT_SCHEMA_TEXT}
"""


def build_text_only_prompt(scan_type: str, prediction: dict):
    return f"""
Generate a detailed JSON report for this medical imaging model prediction.

The uploaded file is not directly viewable by the report model, so base the report only on
the classifier output and any slice-level metadata. Do not claim visual findings beyond
what the classifier output supports.

Scan type:
{scan_type}

Classifier output:
{json.dumps(prediction, indent=2)}

Return JSON only. Do not include markdown.
Do not add patient_id, report_id, doctor_id, case_id, created_at, or database fields.
Use exactly this JSON shape:
{REPORT_SCHEMA_TEXT}
"""


def extract_json_text(text: str):
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]

    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        return text

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]

    return text


def parse_report_response(content: str, stage_name: str):
    cleaned = extract_json_text(content)
    if not cleaned:
        raise ValueError(f"{stage_name} returned an empty response.")

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        preview = cleaned[:500].replace("\n", " ")
        raise ValueError(f"{stage_name} returned invalid JSON: {preview}") from exc


def refine_report_json(client: Groq, raw_report: dict):
    completion = client.chat.completions.create(
        model=REFINE_MODEL,
        messages=[
            {"role": "system", "content": REFINE_SYSTEM_PROMPT},
            {"role": "user", "content": build_refine_prompt(raw_report)},
        ],
        temperature=0.3,
        max_tokens=4096,
        response_format={"type": "json_object"},
    )

    return parse_report_response(completion.choices[0].message.content, "Stage 2 refinement")


def generate_raw_image_report_json(client: Groq, scan_type: str, prediction: dict, image_path: Path):
    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": build_prompt(scan_type, prediction)},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_to_data_url(image_path)},
                    },
                ],
            },
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    return parse_report_response(completion.choices[0].message.content, "Stage 1 vision report")


def generate_report_json(scan_type: str, prediction: dict, image_path: Path):
    client = get_groq_client()
    raw_report = generate_raw_image_report_json(client, scan_type, prediction, image_path)
    try:
        return refine_report_json(client, raw_report)
    except ValueError:
        return raw_report


def generate_text_report_json(scan_type: str, prediction: dict):
    client = get_groq_client()
    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {"role": "user", "content": build_text_only_prompt(scan_type, prediction)},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    raw_report = parse_report_response(completion.choices[0].message.content, "Stage 1 text report")
    try:
        return refine_report_json(client, raw_report)
    except ValueError:
        return raw_report


def generate_raw_placeholder_3d_report(client: Groq, scan_type: str, prediction: dict):
    prompt = f"""
Generate a JSON report for a 3D medical imaging upload.

Important:
- The uploaded file is a NIfTI volume.
- The 3D model is not available yet, so no real prediction was made.
- Clearly say the 3D model is pending implementation.
- Return JSON only and follow this shape exactly:
{REPORT_SCHEMA_TEXT}

Classifier output:
{json.dumps(prediction, indent=2)}
"""

    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {"role": "system", "content": VISION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    return parse_report_response(completion.choices[0].message.content, "Stage 1 3D placeholder report")


def generate_placeholder_3d_report(scan_type: str, prediction: dict):
    client = get_groq_client()
    raw_report = generate_raw_placeholder_3d_report(client, scan_type, prediction)
    try:
        return refine_report_json(client, raw_report)
    except ValueError:
        return raw_report
