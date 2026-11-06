import '@mui/material/styles';
import '@mui/material/Button';

type ThemeTint = { bg: string; text: string; border: string };
type BrandScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;
type SemanticTint = Record<'success' | 'info' | 'warning' | 'danger' | 'violet' | 'slate', ThemeTint>;

declare module '@mui/material/styles' {
  interface Palette {
    brand: BrandScale;
    accent: { main: string; ink: string };
    neutral: { borderStrong: string; borderInput: string };
    tint: SemanticTint;
  }

  interface PaletteOptions {
    brand?: BrandScale;
    accent?: { main: string; ink: string };
    neutral?: { borderStrong: string; borderInput: string };
    tint?: SemanticTint;
  }

  interface TypeBackground {
    subtle: string;
    muted: string;
  }

  interface TypeText {
    muted: string;
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    ai: true;
  }
}
