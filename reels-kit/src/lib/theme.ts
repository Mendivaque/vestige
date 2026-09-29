// crewupa.com'dan alınan marka renkleri ve fontları
export const C = {
  bg: '#0b0816', bg2: '#141026', bg3: '#1e1b3a', mid: '#5b21b6', v1: '#6d28d9', v2: '#8b5cf6', v3: '#a78bfa', v4: '#c4b5fd',
  lav: '#f1ebff', cream: '#fbf7f2', teal: '#2cc9a8', mint: '#6ee7b7', org: '#f97316', amb: '#f59e0b', pink: '#ec4899', sky: '#38bdf8',
};
export const F = { disp: 'Unbounded, sans-serif', sans: 'Geist, sans-serif', mono: '"Geist Mono", monospace' };
/** 9:16 videolarda platform arayüzünün kapatmadığı alan */
export const SAFE = { left: 90, right: 990, top: 280, bottom: 1500 };
/** Türkçe büyük harf (i → İ, ı → I) */
export const up = (s: string) => s.toLocaleUpperCase('tr-TR');
