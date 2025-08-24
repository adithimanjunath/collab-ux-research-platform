import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock your local firebase wrapper so nothing real initializes
jest.mock('./firebase', () => ({
  __esModule: true,
  auth: {},
  db: {},
  provider: {},
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

// Mock the modular auth api: return an unsubscribe fn
jest.mock('firebase/auth', () => ({
  __esModule: true,
  onAuthStateChanged: jest.fn((_auth, _cb) => {
    // You can call _cb(null) here if you want to simulate an event,
    // but it's not required for this smoke test.
    return jest.fn(); // <-- unsubscribe function
  }),
}));

test('renders app welcome hero', () => {
  render(<App />);
  expect(
    screen.getByText(/Welcome to Collaborative UX Research Platform/i)
  ).toBeInTheDocument();
});

/** ---- Auto-clear stray intervals between tests ---- **/
const __realSetInterval = window.setInterval;
const __realClearInterval = window.clearInterval;
const __activeIntervals = new Set();

beforeAll(() => {
  window.setInterval = (...args) => {
    const id = __realSetInterval(...args);
    __activeIntervals.add(id);
    return id;
  };
  window.clearInterval = (id) => {
    __activeIntervals.delete(id);
    return __realClearInterval(id);
  };
});

afterEach(() => {
  // Clear any leftover intervals so Jest can exit cleanly
  for (const id of __activeIntervals) {
    __realClearInterval(id);
  }
  __activeIntervals.clear();
});

afterAll(() => {
  window.setInterval = __realSetInterval;
  window.clearInterval = __realClearInterval;
});

// OPTIONAL extra safety — only if you still see auth noise
jest.mock('./pages/Homepage', () => ({
  __esModule: true,
  default: () => <div>Welcome to Collaborative UX Research Platform</div>,
}));
