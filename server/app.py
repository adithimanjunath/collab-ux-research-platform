
import os 
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), 'server', '.env'))

from auth import firebase_config
import eventlet
eventlet.monkey_patch()
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from routes.note_routes import note_bp
from events.board_events import register_socket_events
import logging

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    message_queue=REDIS_URL
)

app.register_blueprint(note_bp)
register_socket_events(socketio)
print("=== ACTIVE HANDLERS:", socketio.handlers, flush=True)

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(asctime)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5050, debug=False, use_reloader=False)
