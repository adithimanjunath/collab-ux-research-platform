# Contributing Guide

Thanks for your interest in contributing! This guide explains how to set up your environment, code style expectations, how to run tests, and what we look for in pull requests.

## Project Layout
- `client/` — React app (Jest tests)
- `server/` — Flask API + Socket.IO (pytest tests)
- `.github/workflows/ci.yml` — CI for both packages (build + tests + coverage)

## Getting Started
1) Fork + clone the repo
2) Frontend
   - `cd client && npm ci` (or `npm install`)
   - `npm start` to run the dev server
   - Create `client/.env.local` with your Firebase web config
3) Backend
   - `cd server && python -m venv venv && source venv/bin/activate`
   - `pip install -r requirements.txt`
   - Create `server/.env` with:
     - `MONGO_URI` (Atlas/TLS)
     - `FIREBASE_CREDENTIAL_JSON` (service account JSON)
     - `SPACE_URL` (Hugging Face Space URL)
   - `python app.py` to run Flask + Socket.IO

## Branching & Commits
- Use feature branches from `main`: `feat/<short-name>`, `fix/<short-name>`
- Prefer Conventional Commits for clarity (e.g., `feat(board): add typing indicator`)
- Keep PRs focused and small; include rationale in the description

## Code Style
- Frontend: ESLint via `npm run lint` (CRA defaults)
- Backend: PEP8-ish; keep functions small and focused
- Avoid adding new dependencies unless necessary; keep prototypes simple

## Testing
Frontend (Jest)
- `cd client && CI=true npm test -- --watchAll=false`
- Mocks:
  - Firebase/Auth/Firestore mocked in `src/setupTests.js`
  - Socket mocked with `src/services/__mocks__/socketService.js`
- Add tests alongside code or under `src/**/__tests__`.

Backend (pytest)
- `cd server && pytest`
- Patterns in place:
  - Socket.IO event tests: `server/tests/test_board_events.py` using `SocketIO.test_client`
  - Model tests: `server/tests/test_hf_zero_shot*.py` with HF client stubs
  - Auth tests: `server/tests/test_auth.py` isolate Firebase init & verify
- Mongo and Firebase are mocked; tests should not require external services

### Writing New Tests
- Prefer unit tests near logic boundaries (routes, events, services, models)
- Use `monkeypatch` to stub network and external services
- For server model tests, you can override `HFZeroShotModel._get_pipes` with stubbed pipelines
- Keep tests fast and deterministic (fake timers in React tests when timeouts are involved)

## Pull Requests
- Include a clear summary of changes and motivation
- Checklist:
  - [ ] Unit tests added/updated and passing locally
  - [ ] `npm run lint` passes (client)
  - [ ] No unrelated file changes
  - [ ] Secrets are not committed (use `.env` or CI secrets)

## CI
- GitHub Actions runs on PRs and `main` pushes:
  - Frontend: install, lint, build, test with coverage (artifact uploaded)
  - Backend: install, pytest with coverage (XML artifact)
- Keep builds green; fix or skip only if strictly necessary with context

## Security & Secrets
- Never commit `FIREBASE_CREDENTIAL_JSON` or other secrets
- Use `.env` locally; use encrypted secrets in CI
- Review external requests (HF Space, DB) for timeouts and error handling

## Questions & Support
- Open a GitHub Discussion or an Issue with a clear title and details
- In PRs, tag reviewers and add screenshots/GIFs where helpful

Thanks again for contributing!

