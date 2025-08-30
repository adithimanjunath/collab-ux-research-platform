// src/pages/__tests__/ReportPage.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ReportPage from '../ReportPage';

// Mock auth header so handleUpload can proceed (ReportPage awaits it)
jest.mock('../../utils/authHeader', () => ({
  getAuthHeader: jest.fn(async () => ({ Authorization: 'Bearer test-token' })),
}));

// Render children so the Help button (which calls alert) is present
jest.mock('../../components/Header', () => {
  const React = require('react');
  return function HeaderMock(props) {
    return <header>{props.children}</header>;
  };
});

// IMPORTANT: No `new File(...)` here. Use a plain POJO.
jest.mock('../../components/InputPanel', () => {
  const React = require('react');
  return function InputPanelMock({
    setMode,
    setFile,
    setTextInput,
    handleUpload,
    handleReset,
    isLoading,
    randomQuote,
    showQuote,
  }) {
    const fakeFile = { name: 'sample.pdf', type: 'application/pdf', size: 3 };

    return (
      <div>
        <button onClick={() => setMode('paste')}>Paste Tab</button>
        <button onClick={() => setMode('upload')}>Upload Tab</button>
        <button onClick={() => setTextInput('A: first\nA: second')}>Type sample text</button>
        <button onClick={() => setFile(fakeFile)}>Choose file</button>
        <button
          onClick={() => {
            // async hand-off to mirror real UI (lets effects tick)
            setTimeout(() => handleUpload(), 0);
          }}
          disabled={isLoading}
        >
          Analyze
        </button>
        <button onClick={handleReset}>Reset</button>
        {showQuote ? <blockquote>{randomQuote || 'q'}</blockquote> : null}
      </div>
    );
  };
});

jest.mock('../../components/ResultsPreview', () => {
  const React = require('react');
  return function ResultsPreviewMock({ onOpen }) {
    return <button onClick={onOpen}>Open Results</button>;
  };
});

jest.mock('../../components/ResultsModal', () => {
  const React = require('react');
  return function ResultsModalMock({ open, onBackToInput, onStartOver }) {
    return (
      <div data-testid="results-modal" style={{ display: open ? 'block' : 'none' }}>
        <button onClick={onBackToInput}>Back to Input</button>
        <button onClick={onStartOver}>Start Over</button>
        Results
      </div>
    );
  };
});

function renderWithTheme(ui) {
  const theme = createTheme();
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = jest.fn();
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  window.alert.mockRestore();
});

test('paste mode: Analyze successful -> calls API and opens results modal', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      top_insight: 'Top',
      pie_data: [],
      insights: [],
      positive_highlights: [],
      delight_distribution: [],
    }),
  });

  renderWithTheme(<ReportPage />);
  fireEvent.click(screen.getByText(/paste tab/i));
  fireEvent.click(screen.getByText(/type sample text/i));
  fireEvent.click(screen.getByText(/analyze/i));

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  expect(screen.getByTestId('results-modal')).toBeVisible();
});

test('upload mode with file: Analyze calls API with FormData(file)', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      top_insight: 'Top',
      pie_data: [],
      insights: [],
      positive_highlights: [],
      delight_distribution: [],
    }),
  });

  renderWithTheme(<ReportPage />);
  fireEvent.click(screen.getByText(/upload tab/i));
  fireEvent.click(screen.getByText(/choose file/i));
  fireEvent.click(screen.getByText(/analyze/i));

  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  const [, options] = global.fetch.mock.calls[0];
  expect(options.method).toBe('POST');
  expect(options.body).toBeInstanceOf(FormData);
});

test('Back to Input from results closes modal and returns to input', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      top_insight: 'Top',
      pie_data: [],
      insights: [],
      positive_highlights: [],
      delight_distribution: [],
    }),
  });

  renderWithTheme(<ReportPage />);
  fireEvent.click(screen.getByText(/type sample text/i));
  fireEvent.click(screen.getByText(/analyze/i));
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());

  fireEvent.click(screen.getByText(/back to input/i));
  expect(screen.getByTestId('results-modal')).not.toBeVisible();
});

test('Help button triggers alert with guidance', async () => {
  renderWithTheme(<ReportPage />);
  fireEvent.click(screen.getByRole('button', { name: /help/i }));
  await waitFor(() => expect(window.alert).toHaveBeenCalled());
});