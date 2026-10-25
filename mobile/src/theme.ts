// Small shared theme (CLAUDE.md §7: plain StyleSheet, no UI library). Light palette only in v0;
// colours are chosen for at least 4.5:1 contrast on their backgrounds.

export const colors = {
  background: '#f6f5f2',
  surface: '#ffffff',
  text: '#1d1b19',
  textMuted: '#5c5853',
  border: '#dedad4',
  primary: '#b03a2e',
  primaryText: '#ffffff',
  highlight: '#fde9dc',
  highlightBorder: '#e8a27f',
  danger: '#a3201a',
  error: '#a3201a',
} as const;

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
} as const;

export const radius = {
  sm: 8,
  md: 12,
  pill: 999,
} as const;
