import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

export function renderWithProviders(ui, { route = '/board/b1' } = {}) {
  const theme = createTheme();
  const Wrapper = ({ children }) => (
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          {/* match Board’s route pattern */}
          <Route path="/board/:boardId" element={children} />
          <Route path="/login" element={<div>LoginPage</div>} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
