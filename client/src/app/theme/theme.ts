import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563EB', dark: '#1D4ED8', contrastText: '#FFFFFF' },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#1F2937', secondary: '#64748B' },
    divider: '#E5E7EB',
    error: { main: '#DC2626' },
    success: { main: '#15803D' },
    warning: { main: '#B45309' },
  },
  shape: { borderRadius: 8 },
  spacing: 8,
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", sans-serif',
    h1: { fontSize: '2rem', fontWeight: 700 },
    h2: { fontSize: '1.5rem', fontWeight: 650 },
    h3: { fontSize: '1.125rem', fontWeight: 650 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 40, borderRadius: 6, paddingInline: 16 } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 6 },
        notchedOutline: { borderColor: '#E5E7EB' },
      },
    },
    MuiPaper: { styleOverrides: { rounded: { borderRadius: 8 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 8 } } },
  },
});