// Small shared theme (CLAUDE.md §7: plain StyleSheet, no UI library). Light palette only in v0;
// text colours are chosen for at least 4.5:1 contrast on their backgrounds.
// Look: warm stationery. Cream paper, a deep raspberry accent, gold for birthdays, serif titles.
import { Platform } from 'react-native';

export const colors = {
  background: '#fbf7f1',
  surface: '#ffffff',
  /** Tinted panels inside a surface (grouped details, the demo notice). */
  surfaceAlt: '#f6efe6',
  text: '#2a211c',
  textMuted: '#6b5f57',
  border: '#ebe1d6',
  primary: '#b4363a',
  /** Soft wash of the primary colour, for selected and celebratory backgrounds. */
  primarySoft: '#fbe6e3',
  primaryText: '#ffffff',
  highlight: '#fff3df',
  highlightBorder: '#e5ad45',
  gold: '#e5ad45',
  /** Gold-family text that passes contrast on `highlight`. */
  goldText: '#7a5313',
  danger: '#a3201a',
  error: '#a3201a',
} as const;

/** Soft pastel backgrounds for initial avatars; text on them is `colors.text`. */
export const avatarColors = [
  '#f6cdc4',
  '#f8e0a8',
  '#d2e6cb',
  '#cadcf0',
  '#e3d4f1',
  '#f6d2e3',
] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const fontSize = {
  small: 14,
  body: 17,
  title: 20,
  heading: 28,
  display: 34,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

/** Serif for titles and big numbers: built into both platforms, so nothing to download. */
export const fonts = {
  display: Platform.select({ ios: 'Georgia', default: 'serif' }),
} as const;

export const shadow = {
  /** Resting cards and rows. */
  card: {
    shadowColor: '#5a3a20',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  /** Raised elements such as the primary button and card artwork. */
  raised: {
    shadowColor: '#5a3a20',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
} as const;
