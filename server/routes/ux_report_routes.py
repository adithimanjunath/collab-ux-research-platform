# server/routes/ux_report_routes.py
from __future__ import annotations
from flask import Blueprint, request, jsonify,current_app
from werkzeug.datastructures import FileStorage
from werkzeug.exceptions import RequestEntityTooLarge 
from services.ux_report_service import analyze_text_blob, analyze_uploaded_file
from auth.auth_decorator import authenticate_request
import requests

ux_bp = Blueprint("ux_report", __name__)


@ux_bp.get("/health")
def health(): return "ok", 200

@ux_bp.get("/ready")
def ready():
    # Optionally check that the active model is loaded
    return "ready", 200

@ux_bp.route("/api/ux/analyze", methods=["OPTIONS"], strict_slashes=False)
def analyze_options():
    return "", 200

@ux_bp.route("/api/ux/analyze", methods=["POST"], strict_slashes=False)
@authenticate_request
def analyze():
    """
    Accepts:
      - multipart/form-data with 'file' (.pdf)
      - form-data with 'text'
      - application/json with {"text": "..."} or {"text_inputs": ["...", "..."]}
    Returns JSON:
      { top_insight, pie_data, insights, positive_highlights, delight_distribution }
    """
    try:
        # 1) Safely parse JSON (if Content-Type is application/json)
        json_body = request.get_json(silent=True) if request.is_json else None  # CHANGED

        # 2) File path (takes precedence if present)
        if "file" in request.files:  # CHANGED (indentation + guard)
            uploaded: FileStorage = request.files["file"]
            if not uploaded or not uploaded.filename:  # ADD
                return jsonify({"error": "invalid_file", "message": "No file provided."}), 400

            fname = uploaded.filename.lower()  # ADD
            if not (fname.endswith(".pdf") or fname.endswith(".docx") or fname.endswith(".txt")):  # ADD
                return jsonify({"error": "unsupported_type",
                                "message": "Only .pdf, .docx, or .txt are supported."}), 400

            raw = uploaded.read()  # bytes
            if not raw:  # ADD
                return jsonify({"error": "empty_file", "message": "Uploaded file is empty."}), 400

            result = analyze_uploaded_file(raw, uploaded.filename or "upload")
            return jsonify(result), 200

        # 3) Text path (form or JSON)
        # 3a) single text in form field
        text = request.form.get("text")  # CHANGED: start with form text
        # 3b) if JSON, check 'text' or 'text_inputs' (array of strings)
        if json_body is not None:  # ADD
            text = text or json_body.get("text")
            text_inputs = json_body.get("text_inputs") or json_body.get("texts")
            if not text and isinstance(text_inputs, list) and any(isinstance(x, str) for x in text_inputs):
                # join multiple inputs into one blob for your analyzer
                text = "\n".join([s for s in text_inputs if isinstance(s, str) and s.strip()])

        if text and isinstance(text, str) and text.strip():  # CHANGED (validation)
            result = analyze_text_blob(text.strip())
            return jsonify(result), 200

        # 4) Nothing provided
        return jsonify({"error": "invalid_request",
                        "message": "Provide either 'text' (form/json) or a file (.pdf/.docx/.txt)."}), 400

    except RequestEntityTooLarge:  # ADD (nice 413 for big uploads)
        return jsonify({"error": "file_too_large", "message": "Uploaded file exceeds size limit."}), 413

    except requests.HTTPError as e:  # ADD (surface Space/HTTP errors as 502)
        status = getattr(e.response, "status_code", 502)
        try:
            details = e.response.json()
        except Exception:
            details = {"status": status, "text": (e.response.text[:500] if getattr(e, "response", None) else str(e))}
        current_app.logger.exception("Space call failed")  # logs traceback
        return jsonify({"error": "space_call_failed", "upstream_status": status, "details": details}), 502

    except requests.RequestException as e:  # network/timeout -> 502
        current_app.logger.exception("Space network error")
        return jsonify({"error": "space_call_failed", "details": str(e)}), 502

    except Exception as e:  # ADD (convert any crash to JSON 500)
        import traceback, sys
        traceback.print_exc(file=sys.stderr)
        current_app.logger.exception("Analyze failed")
        return jsonify({"error": "internal_error", "message": str(e)}), 500



