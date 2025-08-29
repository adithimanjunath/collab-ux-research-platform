import React from 'react';
import * as authMod from 'firebase/auth';
import Board from '../Board';
import socket from '../../services/socketService';
import { fetchNotesByBoard } from '../../services/noteService';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// IMPORTANT: use colocated manual mock at src/services/__mocks__
jest.mock('../../services/socketService');


// Mock services/noteService
jest.mock('../../services/noteService', () => ({
  fetchNotesByBoard: jest.fn(),
}));


// Minimal Header & NoteCanvas to keep DOM tiny/stable
jest.mock('../../components/Header', () => {
  return function Header() {
    return <header data-testid="hdr">HDR</header>;
  };
});
jest.mock('../../components/NoteCanvas', () => {
  return function NoteCanvas({ filteredNotes = [] }) {
    return <div data-testid="canvas">notes:{filteredNotes.length}</div>;
  };
});

// Pull in the mocked socket so we can assert on spies and trigger events


// Small render helper that mounts Board at /:boardId
function renderBoardAt(boardId) {
  const theme = createTheme();
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/${boardId}`]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/:boardId" element={<Board />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

const makeUser = (over = {}) => ({
  uid: 'u1',
  email: 'u@example.com',
  displayName: 'User One',
  getIdToken: jest.fn().mockResolvedValue('tok-123'),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
});

test('redirects to /login when auth returns null user', async () => {
  renderBoardAt('b1');
  // trigger auth change AFTER component mounts (so the listener exists)
  authMod.__triggerAuth(null);

  expect(await screen.findByText(/login page/i)).toBeInTheDocument();
});

test('connects socket and sets auth token after login', async () => {
  fetchNotesByBoard.mockResolvedValueOnce([]);
  renderBoardAt('b1');
  authMod.__triggerAuth(makeUser());

  // Board effect should call socket.connect()
  await waitFor(() => expect(socket.__mocks.connect).toHaveBeenCalled());
  // And set the auth token used for socket auth
  expect(socket.auth).toEqual({ token: 'tok-123' });
});

test('shows granted overlay on join_granted when othersCount > 0, then auto-hides', async () => {
  jest.useFakeTimers();
  try {
    fetchNotesByBoard.mockResolvedValueOnce([]);
    renderBoardAt('b1');
    authMod.__triggerAuth(makeUser());

    // let effects register listeners; connect auto-fires
    await waitFor(() => expect(socket.__mocks.connect).toHaveBeenCalled());

    // simulate server approval with others present
    socket.__dispatch('join_granted', { othersCount: 2 });

    // overlay appears with "Access granted" (aria-label)
    const dialog = await screen.findByRole('dialog', { name: /access granted/i });
    expect(dialog).toBeInTheDocument();

    // advance timers to allow auto-hide (~3s)
    await act(async () => {
      jest.advanceTimersByTime(3100);
    });

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /access granted/i })).toBeNull()
    );
  } finally {
    jest.useRealTimers();
  }
});


test('loads notes for board and shows empty state when none', async () => {
  fetchNotesByBoard.mockResolvedValueOnce([]);
  renderBoardAt('b1');
  authMod.__triggerAuth(makeUser());

  await waitFor(() => expect(fetchNotesByBoard).toHaveBeenCalledWith('b1'));
  expect(await screen.findByText(/no notes yet/i)).toBeInTheDocument();
});

test('does not show overlay for first user (othersCount === 0)', async () => {
  fetchNotesByBoard.mockResolvedValueOnce([]);
  renderBoardAt('b1');
  authMod.__triggerAuth(makeUser());

  // wait until socket connects so listeners are registered
  await waitFor(() => expect(socket.__mocks.connect).toHaveBeenCalled());

  // server grants join but indicates no other users online
  socket.__dispatch('join_granted', { othersCount: 0 });

  // overlay should not be present for the first user
  expect(screen.queryByTestId('board-gate-overlay')).toBeNull();
  expect(screen.queryByRole('dialog', { name: /access granted/i })).toBeNull();
});
test('loads notes and passes them to NoteCanvas', async () => {
  fetchNotesByBoard.mockResolvedValueOnce([
    { id: 'n1', boardId: 'b1', x: 0, y: 0, text: 'A', type: 'note' },
    { id: 'n2', boardId: 'b1', x: 1, y: 1, text: 'B', type: 'idea' },
  ]);

  renderBoardAt('b1');
  authMod.__triggerAuth(makeUser());

  await waitFor(() => expect(fetchNotesByBoard).toHaveBeenCalledWith('b1'));

  // Our NoteCanvas mock prints "notes:<length>"
  expect(await screen.findByTestId('canvas')).toHaveTextContent('notes:2');
});
