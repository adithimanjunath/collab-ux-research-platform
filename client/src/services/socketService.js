import { io } from "socket.io-client";

// Provide a lightweight runtime mock when running under Cypress E2E.
let exportedSocket;
if (typeof window !== 'undefined' && (window.Cypress || window.__USE_MOCK_SOCKET__)) {
  const listeners = new Map();
  const get = (evt) => listeners.get(evt) || [];
  const set = (evt, arr) => listeners.set(evt, arr);
  const mock = {
    connected: false,
    auth: {},
    on(event, handler) { set(event, [...get(event), handler]); },
    off(event, handler) {
      if (!listeners.has(event)) return;
      if (!handler) { listeners.delete(event); return; }
      set(event, get(event).filter((h) => h !== handler));
    },
    emit: (..._args) => { /* no-op, Cypress can spy via window.__SOCKET_EMITS__ if needed */ },
    connect() { this.connected = true; Promise.resolve().then(() => get('connect').forEach((fn)=>fn())); },
    disconnect() { this.connected = false; },
    __dispatch(event, payload) { get(event).forEach((fn)=>fn(payload)); },
  };
  // Expose for tests to drive events
  if (typeof window !== 'undefined' && !window.__mockSocket) window.__mockSocket = mock;
  exportedSocket = mock;
} else {
  exportedSocket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5050", {
    transports: ["websocket"],       // force websocket transport
    withCredentials: true,           // send cookies if needed
  });
}

export default exportedSocket;
