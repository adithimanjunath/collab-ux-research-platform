// src/theme.js
import { createTheme } from "@mui/material/styles";

// Example MD3 palette tokens (replace with your design system values if you have them)
const md3Colors = {
  primary: "#6750A4",
  onPrimary: "#FFFFFF",
  primaryContainer: "#EADDFF",
  onPrimaryContainer: "#21005E",

  secondary: "#625B71",
  onSecondary: "#FFFFFF",
  secondaryContainer: "#E8DEF8",
  onSecondaryContainer: "#1D192B",

  error: "#B3261E",
  onError: "#FFFFFF",
  errorContainer: "#F9DEDC",
  onErrorContainer: "#410E0B",

  background: "#FFFBFE",
  onBackground: "#1C1B1F",

  surface: "#FFFBFE",
  onSurface: "#1C1B1F",
  outline: "#79747E",
};

const theme = createTheme({
  palette: {
    primary: {
      main: md3Colors.primary,
      contrastText: md3Colors.onPrimary,
    },
    secondary: {
      main: md3Colors.secondary,
      contrastText: md3Colors.onSecondary,
    },
    error: {
      main: md3Colors.error,
      contrastText: md3Colors.onError,
    },
    background: {
      default: md3Colors.background,
      paper: md3Colors.surface,
    },
    text: {
      primary: md3Colors.onBackground,
      secondary: md3Colors.outline,
    },
  },
  shape: {
    borderRadius: 12, // MD3 spec prefers larger radii
  },
  typography: {
    fontFamily: "'Roboto Flex', 'Roboto', sans-serif", // MD3 typography
    h1: { fontSize: "2.5rem", fontWeight: 700 },
    h2: { fontSize: "2rem", fontWeight: 700 },
    h5: { fontSize: "1.5rem", fontWeight: 600 },
    body1: { fontSize: "1rem", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600,  fontSize: "0.95rem", letterSpacing: "0.2px" },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true, // matches MD3 guidelines
      },
      styleOverrides: {
        root: {
          borderRadius: 12,padding: "6px 16px", minHeight: "36px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

export default theme;
