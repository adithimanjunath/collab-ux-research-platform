import eventlet
eventlet.monkey_patch()

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from routes.note_routes import note_bp
from events.board_events import register_socket_events

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)


socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25
)

app.register_blueprint(note_bp)
register_socket_events(socketio)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
