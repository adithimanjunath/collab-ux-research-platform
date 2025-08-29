# Collab UX Research Platform

Collaborative whiteboard + UX insights prototype. Teams can co-create notes in real time, see presence/typing, and generate structured UX insights using a lightweight zero‑shot/NLP backend.


## Overview
- Frontend: React (MUI), Socket.IO client, Firebase Auth (client SDK)
- Backend: Flask + Flask‑SocketIO, MongoDB (notes), Firebase Admin (auth), simple NLP model wrapper (zero‑shot, sentiment, summarization)
- Realtime: Socket.IO rooms per board, presence and note events
- Insights: Zero‑shot categorization into UX themes with sentiment gating and heuristics


## Monorepo Layout
- `client/` — React app (board UI, auth, reports)
- `server/` — Flask API + Socket.IO + model/services
  - `events/board_events.py` — socket events (join, leave, notes,…)
  - `routes/` — REST endpoints (`/api/notes`, `/api/ux/analyze`, …)
  - `models/` — UX analysis model (`hf_zero_shot`)
  - `services/` — Mongo and HF Space client integrations


## Features
- Real‑time collaborative board with notes create/edit/move/delete
- Presence and typing indicators; “demo” join overlay for non‑first users
- Board note snapshot on join to keep clients in sync
- REST API for notes and UX report analysis (text or file upload)
- Zero‑shot analysis to themed insights, pie, delight distribution


## Prerequisites
- Node.js 18+
- Python 3.10+
- MongoDB Atlas (recommended) or a TLS‑enabled MongoDB instance
- Firebase project (client config + Admin credentials)
- Hugging Face Space for NLP (serverless HTTP endpoints)


## Environment Variables

Frontend (`client/.env.local`)
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`
- `REACT_APP_FIREBASE_MEASUREMENT_ID` (optional)

Backend (`server/.env` or CI secrets)
- `MONGO_URI` — e.g. `mongodb+srv://user:pass@cluster/ux_research?retryWrites=true&w=majority`
  - Note: `server/db.py` enforces TLS; local non‑TLS Mongo will fail. Prefer Atlas or TLS‑enabled local.
- `FIREBASE_CREDENTIAL_JSON` — the full JSON of a Firebase Admin service account. Example:
  - `{"type":"service_account","project_id":"<id>", ... }`
  - Store safely; in CI use encrypted secrets.
- `SPACE_URL` — base URL of your HF Space (e.g. `https://username-spacename.hf.space`)
- `HF_API_KEY` — optional Bearer token if Space is private


## Quick Start (Dev)
1) Backend
- `cd server && python -m venv venv && source venv/bin/activate`
- `pip install -r requirements.txt`
- Create `server/.env` with `MONGO_URI`, `FIREBASE_CREDENTIAL_JSON`, `SPACE_URL` (see above)
- Run: `python app.py` (runs Flask + Socket.IO on `:5050`)

2) Frontend
- `cd client && npm install`
- Create `client/.env.local` with Firebase web config
- Run: `npm start` (CRA dev server on `:3000`)


## API (Server)
- `GET /` — health splash
- `GET /api/notes?boardId=<id>` — list notes (auth required)
- `POST /api/notes/cleanup` — delete notes without `boardId` (auth)
- `GET /api/logged_users` — aggregate list of users (auth)
- `POST /api/ux/analyze` — (auth required) body: `{ text }` or multipart `file` (.pdf/.docx/.txt). Returns UX report JSON

Docs with Swagger UI
- OpenAPI spec: `GET /openapi.yaml`
- Interactive docs: `GET /docs` (uses swagger.io Swagger UI CDN)


## Socket Events
Emitted by client
- `join_board { boardId, token }`
- `create_note { id, boardId, x, y, text, type, user, token }`
- `edit_note { ... , token }`, `move_note { id, x, y, boardId, token }`, `delete_note { id, boardId, token }`
- `get_online_users { boardId }`
- `leave_board { boardId }`

Emitted by server
- `join_granted { boardId }`
- `load_existing_notes { boardId, notes }`
- `user_joined { uid, name, email }`, `user_left { uid }`
- `online_users [ { uid, name, email }, ... ]`, `user_list { boardId, users }`
- `new_note`, `note_edited`, `note_moved`, `note_deleted`
- `demo_wait { ms }` — demo overlay hint for non‑first joiners


## Testing

Frontend
- Unit tests: `cd client && CI=true npm test -- --watchAll=false`
- Mocks:
  - Firebase and Firestore APIs are mocked in `src/setupTests.js`
  - Socket is manually mocked (`src/services/__mocks__/socketService.js`)

Backend
- Run all tests: `cd server && pytest`
- Highlights:
  - SocketIO events: `server/tests/test_board_events.py` (join/leave/notes)
  - Model logic: `server/tests/test_hf_zero_shot*.py` (heuristics, negation, delight)
  - Auth: `server/tests/test_auth.py` (decorator and verify behavior)


## CI
- GitHub Actions workflow: `.github/workflows/ci.yml`
  - Frontend job: install, lint, build, run Jest with coverage; uploads `client/coverage`
  - Backend job: install, run pytest with coverage; uploads `server/coverage.xml`
  - Ready to extend to matrix (Node/Python versions) and Codecov


## Development Tips
- Mongo: prefer Atlas connection strings with TLS; local non‑TLS will fail due to `tls=True`
- Firebase Admin: provide the full JSON in `FIREBASE_CREDENTIAL_JSON`; avoid escaping issues by using CI secrets or a `.env` (never commit)
- HF Space: `SPACE_URL` must be set or the HF client raises at import
- Board overlay is a UI demo; presence is primarily handled by Firestore in client and a lightweight in‑memory map on server for sockets


## Scripts
Frontend
- `npm start` — dev server
- `npm run build` — production build
- `npm test` — Jest tests
- `npm run lint` — ESLint

Backend
- `python app.py` — run server
- `pytest` — run tests


## Project Tree (selected)
- `client/src/pages/Board.jsx` — main board UI
- `client/src/services/socketService.js` — Socket.IO client
- `server/events/board_events.py` — realtime handlers
- `server/routes/note_routes.py` — notes REST
- `server/routes/ux_report_routes.py` — analysis REST
- `server/models/hf_zero_shot.py` — UX model
- `server/services/hf_client.py` — HF Space HTTP client


## Troubleshooting
- Mongo SSL/handshake errors: use an Atlas URI or TLS‑enabled local instance; verify IP allowlist
- Firebase auth errors: confirm service account JSON and project settings; tokens must be from the client app’s Firebase project
- HF Space 503 cold start: the client auto‑retries once using `estimated_time`; slow first call is expected


## Disclaimer
This is a prototype for research/education. Review security, scaling, and data handling before production use.
