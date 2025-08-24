import '@testing-library/jest-dom';
// If you ever need fetch without mocking, uncomment:
// import 'whatwg-fetch';

// Use our manual mocks (ensure files exist in src/__mocks__/)
jest.mock('jspdf');
jest.mock('html2canvas');

// Canvas getContext stub (extra safety for libs probing canvas)
if (window.HTMLCanvasElement && !HTMLCanvasElement.prototype.getContext) {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: () => ({}),
  });
}

/** ---------- Optional but handy DOM stubs ---------- **/
if (!window.scrollTo) {
  window.scrollTo = () => {};
}
if (!window.IntersectionObserver) {
  window.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** ---------- Trim noisy logs ---------- **/
const realWarn = console.warn;
const realError = console.error;

beforeAll(() => {
  // Drop only the React Router v7 “future flag” chatter
  jest.spyOn(console, 'warn').mockImplementation((...args) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('React Router Future Flag Warning')) return;
    realWarn(...args);
  });

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
});
