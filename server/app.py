
import os 
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'server', '.env'))
from auth import firebase_config
# import eventlet
# eventlet.monkey_patch()
from flask import Flask, send_from_directory, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO

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

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5050, debug=False, use_reloader=False)
