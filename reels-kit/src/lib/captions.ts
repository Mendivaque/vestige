import type { Word } from '../types';

export type Page = { words: Word[]; start: number; end: number };

/**
 * Kelimeleri TikTok/Reels tarzı sayfalara böler: ekranda aynı anda en fazla `maxWords` kelime,
 * cümle sonunda (. ? !) veya uzun sessizlikte yeni sayfa açılır.
 */
export function buildPages(words: Word[], maxWords = 3, maxChars = 22, gap = 0.45): Page[] {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = cur[cur.length - 1];
    const chars = cur.reduce((n, x) => n + x.text.length + 1, 0) + w.text.length;
    if (prev && (cur.length >= maxWords || chars > maxChars || w.start - prev.end > gap)) flush();
    cur.push(w);
    if (/[.?!…]$/.test(w.text) || (words[i + 1] && words[i + 1].start - w.end > gap)) flush();
  });
  flush();
  // Bir sayfa, bir sonrakinin başlamasına kadar (en fazla 0.35 sn) ekranda kalsın
  return pages.map((p, i) => ({ ...p, end: Math.min(pages[i + 1] ? pages[i + 1].start : p.end + 0.35, p.end + 0.35) }));
}

/** Sonuna noktalama/işaret yapışmış kelimeyi düz metne çevirir */
export const clean = (s: string) => s.replace(/[.,!?…:;]+$/g, '');
