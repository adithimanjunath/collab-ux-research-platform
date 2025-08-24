// src/pages/__tests__/ReportPage.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEventLib from '@testing-library/user-event';
// ---- Theme wrapper (MUI) ----
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ReportPage from '../ReportPage';

// ---- Mock child components (lightweight, prop-driven) ----
jest.mock('../../components/Header', () => {
  const React = require('react');
  return { __esModule: true, default: ({ children }) => <div data-testid="header">{children}</div> };
});

jest.mock('../../components/InputPanel', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function InputPanelMock(props) {
      const { setMode, setFile, setTextInput, handleUpload, handleReset, isLoading, randomQuote } = props;
      return (
        <div data-testid="input-panel">
          <div>quote:{randomQuote ? 'yes' : 'no'}</div>
          <input aria-label="Text" disabled={isLoading} onChange={(e) => setTextInput(e.target.value)} />
          <button onClick={() => setMode('upload')}>Switch to upload</button>
          <button
            onClick={() =>
              setFile(new File(['pdf'], 'sample.pdf', { type: 'application/pdf' }))
            }
          >
            Choose file
          </button>
          <button onClick={handleUpload} disabled={isLoading}>Analyze</button>
          <button onClick={handleReset}>Reset</button>
        </div>
      );
    },
  };
});

jest.mock('../../components/InsightCards', () => {
  const React = require('react');
  return { __esModule: true, default: () => <div data-testid="insight-cards" /> };
});

jest.mock('../../components/ResultsPreview', () => {
  const React = require('react');
  return { __esModule: true, default: ({ onOpen }) => <button onClick={onOpen}>Open Results</button> };
});

jest.mock('../../components/ResultsModal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ open, onClose, onBackToInput, onStartOver }) =>
      open ? (
        <div data-testid="results-modal">
          <button onClick={onBackToInput}>Back to Input</button>
          <button onClick={onStartOver}>Start Over</button>
          <button onClick={onClose}>Close</button>
        </div>
      ) : null,
  };
});



function renderWithTheme(ui) {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const realFetch = global.fetch;
const realAlert = global.alert;

beforeEach(() => {
  // IMPORTANT: real timers – no jest.useFakeTimers()
  global.fetch = jest.fn();
  global.alert = jest.fn();
  process.env.REACT_APP_API_URL = 'http://api.test';
});

afterEach(() => {
  global.fetch = realFetch;
  global.alert = realAlert;
  jest.clearAllMocks();
});

test('initially shows input panel (no modal)', () => {
  renderWithTheme(<ReportPage />);
  expect(screen.getByTestId('input-panel')).toBeInTheDocument();
  expect(screen.queryByTestId('results-modal')).not.toBeInTheDocument();
});

test('paste mode: Analyze successful -> calls API and opens results modal', async () => {
  const user = userEventLib.setup();

  const payload = {
    top_insight: 'Top',
    pie_data: [{ label: 'A', value: 1 }],
    insights: ['i1'],
    positive_highlights: ['p1'],
    delight_distribution: [1, 2, 3],
  };
  global.fetch.mockResolvedValue({ ok: true, json: async () => payload });

  renderWithTheme(<ReportPage />);

  await user.type(screen.getByLabelText('Text'), 'hello world');
  await user.click(screen.getByRole('button', { name: /analyze/i }));

  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [, opts] = global.fetch.mock.calls[0];
  expect(opts.method).toBe('POST');
  expect(opts.body).toBeInstanceOf(FormData);

  // modal appears
  expect(await screen.findByTestId('results-modal')).toBeInTheDocument();
});

test('upload mode without file: Analyze should not call API', async () => {
  const user = userEventLib.setup();
  renderWithTheme(<ReportPage />);

  await user.click(screen.getByRole('button', { name: /switch to upload/i }));
  await user.click(screen.getByRole('button', { name: /analyze/i }));

  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getByTestId('input-panel')).toBeInTheDocument();
});

test('upload mode with file: Analyze calls API with FormData(file)', async () => {
  const user = userEventLib.setup();
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      top_insight: 'ok',
      pie_data: [],
      insights: [],
      positive_highlights: [],
      delight_distribution: [],
    }),
  });

  renderWithTheme(<ReportPage />);

  await user.click(screen.getByRole('button', { name: /switch to upload/i }));
  await user.click(screen.getByRole('button', { name: /choose file/i }));
  await user.click(screen.getByRole('button', { name: /analyze/i }));

  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [, opts] = global.fetch.mock.calls[0];
  expect(opts.body).toBeInstanceOf(FormData);

  expect(await screen.findByTestId('results-modal')).toBeInTheDocument();
});

test('error response shows alert and stays on input view', async () => {
  const user = userEventLib.setup();
  global.fetch.mockResolvedValue({ ok: false, text: async () => 'Bad request' });

  renderWithTheme(<ReportPage />);
  await user.type(screen.getByLabelText('Text'), 'boom');
  await user.click(screen.getByRole('button', { name: /analyze/i }));

  expect(global.alert).toHaveBeenCalled();
  expect(await screen.findByTestId('input-panel')).toBeInTheDocument();
  expect(screen.queryByTestId('results-modal')).not.toBeInTheDocument();
});

test('Back to Input from results closes modal and returns to input', async () => {
  const user = userEventLib.setup();
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      top_insight: 'ok',
      pie_data: [],
      insights: [],
      positive_highlights: [],
      delight_distribution: [],
    }),
  });

  renderWithTheme(<ReportPage />);
  await user.type(screen.getByLabelText('Text'), 'hello');
  await user.click(screen.getByRole('button', { name: /analyze/i }));
  expect(await screen.findByTestId('results-modal')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /back to input/i }));
  expect(screen.queryByTestId('results-modal')).not.toBeInTheDocument();
  expect(screen.getByTestId('input-panel')).toBeInTheDocument();
});

test('Help button triggers alert with guidance', async () => {
  const user = userEventLib.setup();
  renderWithTheme(<ReportPage />);

  // Header renders the actual Help button from the page
  const help = screen.getByRole('button', { name: /help/i });
  await user.click(help);
  expect(global.alert).toHaveBeenCalled();
});
