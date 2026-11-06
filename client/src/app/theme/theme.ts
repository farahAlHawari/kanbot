import { createTheme } from '@mui/material/styles';

const brand = {
  50: '#ECFAFC',
  100: '#D0F1F6',
  200: '#A5E2EC',
  300: '#6DCBDC',
  400: '#33AEC6',
  500: '#1590AB',
  600: '#0E7490',
  700: '#0C5E75',
  800: '#0D4C5F',
  900: '#0E3F50',
};

const tint = (bg: string, text: string, border: string) => ({ bg, text, border });

const lightPalette = {
  primary: { main: '#0E7490', dark: '#0C5E75', light: '#33AEC6', contrastText: '#FFFFFF' },
  secondary: { main: '#44545D', contrastText: '#FFFFFF' },
  success: { main: '#15803D', contrastText: '#FFFFFF' },
  info: { main: '#1D4ED8', contrastText: '#FFFFFF' },
  warning: { main: '#B45309', contrastText: '#FFFFFF' },
  error: { main: '#B91C1C', contrastText: '#FFFFFF' },
  background: { default: '#F6F8F9', paper: '#FFFFFF', subtle: '#EFF2F4', muted: '#E4E9EC' },
  text: { primary: '#0F1B22', secondary: '#44545D', muted: '#586870' },
  divider: '#DFE5E8',
  brand,
  accent: { main: '#F5A524', ink: '#0F1B22' },
  neutral: { borderStrong: '#C7D0D5', borderInput: '#7D8D95' },
  tint: {
    success: tint('#ECFDF3', '#15803D', '#BBF7D0'),
    info: tint('#EFF6FF', '#1D4ED8', '#BFDBFE'),
    warning: tint('#FFF7E6', '#92400E', '#FDE3A7'),
    danger: tint('#FEF0F0', '#B91C1C', '#FECACA'),
    violet: tint('#F3F0FF', '#6D28D9', '#DDD6FE'),
    slate: tint('#ECF0F2', '#3A4A53', '#D3DBDF'),
  },
  action: { hover: '#EFF2F4', selected: '#ECFAFC', focus: '#1590AB' },
};

const darkPalette = {
  primary: { main: '#0F7D99', dark: '#0C6B84', light: '#6DCBDC', contrastText: '#FFFFFF' },
  secondary: { main: '#A3B5BD', contrastText: '#0B1317' },
  success: { main: '#86EFAC', contrastText: '#0B1317' },
  info: { main: '#93C5FD', contrastText: '#0B1317' },
  warning: { main: '#FCD34D', contrastText: '#0B1317' },
  error: { main: '#F87171', contrastText: '#0B1317' },
  background: { default: '#0B1317', paper: '#121C21', subtle: '#172329', muted: '#1F2E36' },
  text: { primary: '#E4EEF1', secondary: '#A3B5BD', muted: '#8499A2' },
  divider: '#22323A',
  brand,
  accent: { main: '#F5A524', ink: '#0F1B22' },
  neutral: { borderStrong: '#31454F', borderInput: '#637983' },
  tint: {
    success: tint('#12281D', '#86EFAC', '#1E4D33'),
    info: tint('#14233D', '#93C5FD', '#1E3A66'),
    warning: tint('#2B2210', '#FCD34D', '#5A4515'),
    danger: tint('#2D1517', '#FCA5A5', '#5E2327'),
    violet: tint('#231A40', '#C4B5FD', '#3F2F73'),
    slate: tint('#1F2E36', '#CBD9DF', '#31454F'),
  },
  action: { hover: '#172329', selected: '#0F3441', focus: '#33AEC6' },
};

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'data' },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  breakpoints: { values: { xs: 0, sm: 480, md: 768, lg: 1024, xl: 1280 } },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    h1: { fontSize: '1.75rem', lineHeight: '36px', fontWeight: 650, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.375rem', lineHeight: '30px', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.125rem', lineHeight: '28px', fontWeight: 600 },
    subtitle1: { fontSize: '1rem', lineHeight: '24px', fontWeight: 500 },
    body1: { fontSize: '0.875rem', lineHeight: '22px' },
    body2: { fontSize: '0.8125rem', lineHeight: '20px' },
    caption: { fontSize: '0.75rem', lineHeight: '16px', fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 500, fontSize: '0.8125rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.04em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: 'var(--mui-palette-background-default)', color: 'var(--mui-palette-text-primary)' },
        '*:focus-visible': {
          outline: '2px solid var(--mui-palette-primary-main)',
          outlineOffset: 2,
          boxShadow: '0 0 0 2px var(--mui-palette-background-paper), 0 0 0 4px var(--mui-palette-primary-light)',
        },
        '::selection': { backgroundColor: 'var(--mui-palette-brand-200)' },
        'code, .tabular-nums': { fontVariantNumeric: 'tabular-nums' },
        'code, kbd, pre': { fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace' },
        '::-webkit-scrollbar': { width: 10, height: 10 },
        '::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--mui-palette-background-muted)',
          border: '2px solid var(--mui-palette-background-default)',
          borderRadius: 999,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            scrollBehavior: 'auto !important',
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
        '@media (pointer: coarse)': {
          '.MuiButton-root': { minHeight: 44 },
          '.MuiIconButton-root': { minWidth: 44, minHeight: 44 },
          '.MuiListItemButton-root': { minHeight: 44 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 36,
          borderRadius: 8,
          paddingInline: 12,
          transition: 'background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease',
          '&:active': { transform: 'scale(.98)' },
        },
        sizeSmall: { minHeight: 32, paddingInline: 10 },
        sizeLarge: { minHeight: 44, paddingInline: 16 },
        contained: { boxShadow: 'inset 0 1px 0 rgb(255 255 255 / .12)' },
        outlined: {
          borderColor: 'var(--mui-palette-neutral-borderStrong)',
          backgroundColor: 'var(--mui-palette-background-paper)',
          '&:hover': { borderColor: 'var(--mui-palette-neutral-borderStrong)', backgroundColor: 'var(--mui-palette-background-subtle)' },
        },
      },
      variants: [
        {
          props: { variant: 'ai' },
          style: {
            backgroundColor: 'var(--mui-palette-brand-50)',
            color: 'var(--mui-palette-brand-700)',
            border: '1px solid var(--mui-palette-brand-200)',
            '&:hover': { backgroundColor: 'var(--mui-palette-brand-100)', borderColor: 'var(--mui-palette-brand-300)' },
            '[data-dark] &': {
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary-soft-text)',
              borderColor: 'var(--mui-palette-divider)',
              '&:hover': { backgroundColor: 'var(--mui-palette-background-muted)' },
            },
          },
        },
      ],
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 8, transition: 'background-color 120ms ease' } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 40,
          borderRadius: 8,
          backgroundColor: 'var(--mui-palette-background-paper)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--mui-palette-neutral-borderInput)' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--mui-palette-text-secondary)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--mui-palette-primary-main)', borderWidth: 1 },
          '@media (max-width: 767.95px)': {
            minHeight: 44,
            '& input, & textarea': { fontSize: 16 },
          },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' }, rounded: { borderRadius: 12 } } },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          borderColor: 'var(--mui-palette-divider)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 6, height: 22, fontWeight: 500 },
        label: { paddingInline: 8, fontSize: '0.75rem' },
        colorSuccess: {
          backgroundColor: 'var(--mui-palette-tint-success-bg)',
          color: 'var(--mui-palette-tint-success-text)',
          border: '1px solid var(--mui-palette-tint-success-border)',
        },
        colorInfo: {
          backgroundColor: 'var(--mui-palette-tint-info-bg)',
          color: 'var(--mui-palette-tint-info-text)',
          border: '1px solid var(--mui-palette-tint-info-border)',
        },
        colorWarning: {
          backgroundColor: 'var(--mui-palette-tint-warning-bg)',
          color: 'var(--mui-palette-tint-warning-text)',
          border: '1px solid var(--mui-palette-tint-warning-border)',
        },
        colorError: {
          backgroundColor: 'var(--mui-palette-tint-danger-bg)',
          color: 'var(--mui-palette-tint-danger-text)',
          border: '1px solid var(--mui-palette-tint-danger-border)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        container: {
          '@media (max-width: 767.95px)': { alignItems: 'flex-end' },
        },
        paper: {
          borderRadius: 16,
          backgroundImage: 'none',
          '@media (max-width: 767.95px)': {
            width: '100%',
            maxWidth: '100%',
            maxHeight: '92dvh',
            margin: 0,
            borderRadius: '16px 16px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: 'none', borderColor: 'var(--mui-palette-divider)' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 36,
          borderRadius: 8,
          '&:hover': { backgroundColor: 'var(--mui-palette-action-hover)' },
        },
      },
    },
    MuiMenu: { styleOverrides: { paper: { border: '1px solid var(--mui-palette-divider)', borderRadius: 12 } } },
    MuiMenuItem: { styleOverrides: { root: { minHeight: 36, borderRadius: 6 } } },
    MuiTooltip: {
      defaultProps: { enterDelay: 400, arrow: false },
      styleOverrides: {
        tooltip: { backgroundColor: 'var(--mui-palette-text-primary)', color: 'var(--mui-palette-background-paper)', fontSize: '0.75rem' },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 8, borderRadius: 999, backgroundColor: 'var(--mui-palette-background-muted)' },
        bar: { borderRadius: 999, transition: 'transform 360ms ease-in-out' },
      },
    },
  },
});
