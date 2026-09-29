import React from 'react';

// crewupa.com'dan alınan marka renkleri ve fontları
export const C = {
  bg: '#0b0816', bg2: '#141026', bg3: '#1e1b3a', mid: '#5b21b6', v1: '#6d28d9', v2: '#8b5cf6', v3: '#a78bfa', v4: '#c4b5fd',
  lav: '#f1ebff', cream: '#fbf7f2', teal: '#2cc9a8', mint: '#6ee7b7', org: '#f97316', amb: '#f59e0b', pink: '#ec4899', sky: '#38bdf8',
};
export const F = { disp: 'Unbounded, sans-serif', sans: 'Geist, sans-serif', mono: '"Geist Mono", monospace' };
/** 9:16 videolarda platform arayüzünün kapatmadığı alan */
export const SAFE = { left: 90, right: 990, top: 280, bottom: 1500 };
export type Theme = { accent: string; accent2: string; ink: string; text: string; muted: string; pillText: string; card: string; bar: string };
/** crewupa markası: mor hap, amber vurgu */
export const crewupaTheme: Theme = { accent: C.v1, accent2: C.amb, ink: C.bg, text: C.lav, muted: C.v4, pillText: '#fff', card: `linear-gradient(90deg, ${C.v1}, ${C.mid})`, bar: `linear-gradient(90deg, ${C.v2}, ${C.teal})` };
/** kişisel hesap için sade siyah-beyaz: vurgu yok, kalın beyaz altyazı + siyah çerçeve */
export const minimalTheme: Theme = { accent: '#ffffff', accent2: '#ffffff', ink: '#000000', text: '#ffffff', muted: 'rgba(255,255,255,0.72)', pillText: '#000000', card: 'rgba(0,0,0,0.62)', bar: '#ffffff' };
export const themes: Record<string, Theme> = { crewupa: crewupaTheme, minimal: minimalTheme };
export const ThemeCtx = React.createContext<Theme>(crewupaTheme);
export const useTheme = () => React.useContext(ThemeCtx);
/** Türkçe büyük harf (i → İ, ı → I) */
export const up = (s: string) => s.toLocaleUpperCase('tr-TR');
