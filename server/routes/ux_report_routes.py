# server/routes/ux_report_routes.py

from flask import Blueprint, request, jsonify
from werkzeug.datastructures import FileStorage
from services.ux_report_service import analyze_text_blob, analyze_uploaded_file

ux_bp = Blueprint("ux_report", __name__)


@ux_bp.get("/health")
def health(): return "ok", 200

@ux_bp.get("/ready")
def ready():
    # Optionally check that the active model is loaded
    return "ready", 200

@ux_bp.route("/api/ux/analyze", methods=["POST"])
def analyze():
    """
    Accepts:
      - multipart form with 'file' (.pdf/.docx/.txt), ORş
      - form-data with 'text'
    Returns JSON:
      { top_insight, pie_data, insights, positive_highlights }
    """
    # Uploaded file path
    if "file" in request.files:
        uploaded: FileStorage = request.files["file"]
        raw = uploaded.read()  # bytes
        result = analyze_uploaded_file(raw, uploaded.filename or "upload")
        return jsonify(result), 200

    # Pasted text path
    text = request.form.get("text") or (request.json and request.json.get("text"))
    if text:
        result = analyze_text_blob(text)
        return jsonify(result), 200

    return jsonify({"error": "Provide either 'text' or a file (.pdf/.docx/.txt)."}), 400




