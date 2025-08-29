import '@testing-library/jest-dom';

jest.mock('jspdf');
jest.mock('html2canvas');

// Canvas getContext stub (extra safety for libs probing canvas)
if (window.HTMLCanvasElement && !HTMLCanvasElement.prototype.getContext) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({}),
  });
}

// --- Firestore mock ---
jest.mock('firebase/firestore', () => {
  const join = (...xs) => xs.filter(Boolean).join('/');
  const makeRef = (type, parts) => ({ __type: type, __path: join(...parts) });

  const mockSetDoc = jest.fn(async () => {});
  const mockDeleteDoc = jest.fn(async () => {});
  const mockOnSnapshot = jest.fn((queryOrRef, callback) => {
    // Immediately invoke the callback once with an empty snapshot so components don't hang.
    if (typeof callback === 'function') {
      callback({ docs: [] });
    }
    // Always return a real unsubscribe function
    return jest.fn();
  });

  const getFirestore = () => ({ __mockDb: true });

  return {
    __esModule: true,
    getFirestore,
    doc: (...parts) => makeRef('doc', parts),
    collection: (...parts) => makeRef('col', parts),
    setDoc: (...args) => mockSetDoc(...args),
    deleteDoc: (...args) => mockDeleteDoc(...args),
    serverTimestamp: () => new Date(),
    onSnapshot: (...args) => mockOnSnapshot(...args),
    __mocks: { setDoc: mockSetDoc, deleteDoc: mockDeleteDoc, onSnapshot: mockOnSnapshot },
  };
});

// --- Auth mock (unsubscribe always returned) ---
jest.mock('firebase/auth', () => {
  let handler = null;
  const authInstance = { __mockAuth: true };

  const onAuthStateChanged = (_auth, cb) => {
    handler = cb;
    return () => { handler = null; };
  };

  const getAuth = () => authInstance;
  const setPersistence = jest.fn(async () => {});
  const browserSessionPersistence = 'session';
  const browserLocalPersistence = 'local';
  class GoogleAuthProvider {}
  const signInWithPopup = jest.fn(async () => ({ user: { uid: 'mock' } }));
  const signOut = jest.fn(async () => {});

  return {
    onAuthStateChanged,
    getAuth,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    __triggerAuth: (user) => { if (handler) handler(user); },
    __mocks: { setPersistence, signInWithPopup, signOut },
  };
});

/** ---------- Optional but handy DOM stubs ---------- **/
if (!window.scrollTo) {
  window.scrollTo = () => {};
}
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class { 
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** ---------- Trim noisy logs ---------- **/
const realWarn = console.warn;
const realError = console.error;
const realLog = console.log;

beforeAll(() => {
  const verbose = !!process.env.VERBOSE_TEST_LOGS;
  // Drop only the React Router v7 “future flag” chatter
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('React Router Future Flag Warning')) return;
    realWarn(...args);
  });

  if (!verbose) {
    // Silence verbose debug logs during tests
    jest.spyOn(console, 'debug').mockImplementation(() => {});

    // Filter specific noisy logs while keeping others
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      const msg = String(args[0] ?? '');
      if (msg.includes('using session persistence for auth')) return;
      realLog(...args);
    });
  }

  // Keep real errors, but silence the known error-path logs from ReportPage tests
  jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = String(args[0] ?? '');
    if (
      msg.includes('Analyze request failed') ||
      msg.startsWith('Error: Bad request')
    ) return;
    realError(...args);
  });
});

afterAll(() => {
  console.warn.mockRestore();
  console.error.mockRestore();
  if (console.debug.mockRestore) console.debug.mockRestore();
  if (console.log.mockRestore) console.log.mockRestore();
});
