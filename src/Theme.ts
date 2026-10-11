import type { Theme } from './types';

export const defaultTheme: Readonly<Theme> = Object.freeze({
  background: '#f8fafc',
  grid: '#d5dce5',
  nodeBackground: '#ffffff',
  nodeBorder: '#b8c5d6',
  text: '#25344b',
  edge: '#60758f',
  accent: '#2563eb',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: 12,
  lineHeight: 20,
  padding: 16,
});
