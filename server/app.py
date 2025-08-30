
import os 
from dotenv import load_dotenv
# Load env from server/.env (the file is alongside this app.py)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
from auth import firebase_config
# import eventlet
# eventlet.monkey_patch()
from flask import Flask, send_from_directory, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO
import threading
import time

from routes.note_routes import note_bp
from routes.ux_report_routes import ux_bp
from events.board_events import register_socket_events



app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

socketio = SocketIO(
    app,
    async_mode="threading",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
)

app.register_blueprint(note_bp)
app.register_blueprint(ux_bp)
register_socket_events(socketio)

# -----------------------------
# Optional: Warm up Hugging Face Space to avoid cold-start timeouts
# Controlled via env:
#   WARMUP_ON_START=1 (default) to kick one-time warmup in a background thread
#   HF_KEEPALIVE_MINUTES=n to periodically ping the Space every n minutes
# -----------------------------
def _warmup_once():
    try:
        from services import hf_client as hf
    except Exception as e:
        app.logger.warning("[warmup] hf_client import skipped: %s", e)
        return
    try:
        # quick health ping (non-fatal)
        try:
            hf.health()
        except Exception:
            pass
        # light ZSC call to load model weights
        hf.zsc_single(
            text="warmup",
            labels=["Usability"],
            multi_label=True,
            hypothesis_template="This text is about {}.",
        )
        app.logger.info("[warmup] HF Space warmed up successfully")
    except Exception as e:
        app.logger.warning("[warmup] HF warmup failed: %s", e)


def _keepalive_loop(interval_minutes: int):
    try:
        from services import hf_client as hf
    except Exception as e:
        app.logger.warning("[keepalive] hf_client import skipped: %s", e)
        return
    secs = max(60, int(interval_minutes) * 60)
    while True:
        try:
            hf.health()
        except Exception as e:
            app.logger.debug("[keepalive] health failed: %s", e)
        time.sleep(secs)


if os.getenv("WARMUP_ON_START", "1") == "1":
    threading.Thread(target=_warmup_once, daemon=True).start()

if os.getenv("HF_KEEPALIVE_MINUTES"):
    try:
        minutes = int(os.getenv("HF_KEEPALIVE_MINUTES"))
        if minutes > 0:
            threading.Thread(target=_keepalive_loop, args=(minutes,), daemon=True).start()
    except Exception:
        pass

@app.get('/openapi.yaml')
def openapi_spec():
    import os
    here = os.path.dirname(__file__)
    return send_from_directory(here, 'openapi.yaml', mimetype='application/yaml')

@app.get('/docs')
def docs():
    # Simple Swagger UI using CDN and local /openapi.yaml
    html = """
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>API Docs</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <style> body { margin: 0; } #swagger-ui { height: 100vh; } </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: '/openapi.yaml',
              dom_id: '#swagger-ui',
              presets: [SwaggerUIBundle.presets.apis],
              layout: 'BaseLayout',
              deepLinking: true,
              persistAuthorization: true
            });
          };
        </script>
      </body>
    </html>
    """
    return render_template_string(html)

@app.get('/api/ux/warmup')
def warmup_endpoint():
    threading.Thread(target=_warmup_once, daemon=True).start()
    return {"ok": True, "message": "Warmup started"}, 202

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5050, debug=False, use_reloader=False)
