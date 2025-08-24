import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BoardEntry from '../BoardEntry';
import { auth } from '../../firebase';

// ---- PARTIAL MOCK: keep real router, override only useNavigate ----
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate, // only this is mocked
  };
});

// ---- MOCK: firebase entry that exports { auth } ----
jest.mock('../../firebase', () => {
  const auth = { currentUser: null }; // mutable across tests
  return { __esModule: true, auth };
});



function renderWithProviders() {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/entry']}>
        <Routes>
          <Route path="/entry" element={<BoardEntry />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  auth.currentUser = null; // default: signed out
});

test('redirects to "/" on mount when not authenticated', () => {
  renderWithProviders();
  expect(mockNavigate).toHaveBeenCalledWith('/');
});

test('does nothing if Join clicked with empty input', async () => {
  auth.currentUser = { email: 'u@x.com', displayName: 'User' };
  renderWithProviders();

  await userEvent.click(screen.getByRole('button', { name: /join board/i }));
  // should not navigate because boardName is empty
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('sanitizes board name and navigates with username from displayName', async () => {
  auth.currentUser = { email: 'u@x.com', displayName: 'Adithi' };
  renderWithProviders();

  await userEvent.type(
    screen.getByLabelText(/company \/ board name/i),
    ' ACME  Inc! '
  );
  await userEvent.click(screen.getByRole('button', { name: /join board/i }));

  expect(mockNavigate).toHaveBeenCalledWith('/acme-inc', {
    state: { username: 'Adithi' },
  });
});

test('falls back to email as username when no displayName', async () => {
  auth.currentUser = { email: 'no-name@example.com' }; // no displayName
  renderWithProviders();

  await userEvent.type(
    screen.getByLabelText(/company \/ board name/i),
    'Team One'
  );
  await userEvent.click(screen.getByRole('button', { name: /join board/i }));

  expect(mockNavigate).toHaveBeenCalledWith('/team-one', {
    state: { username: 'no-name@example.com' },
  });
});

test('Back link points to "/"', () => {
  auth.currentUser = { email: 'u@x.com' };
  renderWithProviders();

  const back = screen.getByRole('link', { name: /back/i });
  expect(back).toHaveAttribute('href', '/');
});
