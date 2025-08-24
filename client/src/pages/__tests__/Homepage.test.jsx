import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomePage from '../Homepage';
import { onAuthStateChanged as mockOnAuthStateChanged } from 'firebase/auth';
import { signInWithPopup, signOut } from '../../firebase';


// 1) Mock react-router-dom's navigate (outer name starts with "mock*" so Jest allows it)
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// 2) Mock firebase/auth with a fn CREATED INSIDE the factory
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

// 3) Mock your local firebase module (path is from THIS test file to src/firebase.js)
jest.mock('../../firebase', () => ({
  auth: {},
  provider: {},
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
}));

// 4) Import the mocked fns so we can configure them per test

// helper to emit auth state
const emitAuth = (userOrNull) => {
  mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
    cb(userOrNull);
    return () => {};
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('HomePage', () => {
  test('shows sign-in when signed out', () => {
    emitAuth(null);
    render(<HomePage />);
    expect(
      screen.getByText(/Welcome to Collaborative UX Research Platform/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in with google/i })
    ).toBeInTheDocument();
  });

    test('restores user from localStorage (before Firebase answers)', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ name: 'Stored User', email: 'stored@example.com', uid: 'u1' })
    );
    // IMPORTANT: do NOT emit; simulate "no auth event yet"
    mockOnAuthStateChanged.mockImplementation((_auth, _cb) => () => {});
   render(<HomePage />);
   expect(await screen.findByText('Stored User')).toBeInTheDocument();
   expect(screen.getByText('stored@example.com')).toBeInTheDocument(); });

  test('login via popup updates UI & storage', async () => {
    emitAuth(null);
    signInWithPopup.mockResolvedValue({
      user: {
        displayName: 'Popup User',
        email: 'popup@example.com',
        photoURL: 'http://example.com/a.png',
        uid: 'popup-uid',
      },
    });

    render(<HomePage />);
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    // popup called
    expect(signInWithPopup).toHaveBeenCalled();

    // prefer-find-by
    expect(await screen.findByText('Popup User')).toBeInTheDocument();
    expect(screen.getByText('popup@example.com')).toBeInTheDocument();

    const saved = JSON.parse(localStorage.getItem('user'));
    expect(saved).toMatchObject({ name: 'Popup User', email: 'popup@example.com', uid: 'popup-uid' });
  });

  test('logout clears storage and returns to sign-in', async () => {
    emitAuth({ displayName: 'Live User', email: 'live@example.com', uid: 'live' });
    render(<HomePage />);

    await screen.findByText('Live User'); // wait until authed UI

    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(signOut).toHaveBeenCalled();

    // prefer-find-by instead of waitFor+getBy*
    await screen.findByRole('button', { name: /sign in with google/i });
    expect(localStorage.getItem('user')).toBeNull();
  });

  test('navigate carries user state for both actions', async () => {
    emitAuth({ displayName: 'Nav User', email: 'nav@example.com', uid: 'nav-uid' });
    render(<HomePage />);

    await screen.findByText('Nav User');

    await userEvent.click(screen.getByRole('button', { name: /create board/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/collab', {
      state: { user: { name: 'Nav User', email: 'nav@example.com', uid: 'nav-uid' } },
    });

    mockNavigate.mockClear();

    await userEvent.click(screen.getByRole('button', { name: /report generator/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/report', {
      state: { user: { name: 'Nav User', email: 'nav@example.com', uid: 'nav-uid' } },
    });
  });
});
