// Manual Jest mock colocated with the module for reliable resolution

const listeners = new Map();
const get = (evt) => listeners.get(evt) || [];
const set = (evt, arr) => listeners.set(evt, arr);

const socket = {
  connected: false,
  auth: {},

  on(event, handler) {
    set(event, [...get(event), handler]);
  },

  off(event, handler) {
    if (!listeners.has(event)) return;
    if (!handler) {
      listeners.delete(event);
      return;
    }
    set(event, get(event).filter((h) => h !== handler));
  },

  __dispatch(event, payload) {
    get(event).forEach((fn) => fn(payload));
  },

  __mocks: {
    emit: jest.fn(),
    connect: jest.fn(() => {
      socket.connected = true;
      Promise.resolve().then(() => socket.__dispatch('connect'));
    }),
    disconnect: jest.fn(() => {
      socket.connected = false;
    }),
  },
};

socket.emit = (...args) => socket.__mocks.emit(...args);
socket.connect = () => socket.__mocks.connect();
socket.disconnect = () => socket.__mocks.disconnect();

export default socket;

