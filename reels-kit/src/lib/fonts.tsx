import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

const FILES: [string, string, string, string][] = [
  ['Unbounded', 'Unbounded-latin-ext.woff2', '200 900', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['Unbounded', 'Unbounded-latin.woff2', '200 900', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['Geist', 'Geist-latin-ext.woff2', '100 900', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['Geist', 'Geist-latin.woff2', '100 900', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
  ['Geist Mono', 'GeistMono-latin-ext.woff2', '100 900', 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'],
  ['Geist Mono', 'GeistMono-latin.woff2', '100 900', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'],
];

/** crewupa fontlarını (Türkçe karakterler dahil) yükler; hazır olana kadar render'ı bekletir. */
export const useBrandFonts = () => {
  const [handle] = useState(() => delayRender('brand fonts'));
  useEffect(() => {
    const faces = FILES.map(([family, file, weight, range]) =>
      new FontFace(family, `url(${staticFile('fonts/' + file)}) format('woff2')`, { weight, unicodeRange: range }),
    );
    Promise.all(faces.map((f) => f.load()))
      .then((loaded) => {
        loaded.forEach((f) => (document.fonts as unknown as { add(f: FontFace): void }).add(f));
        return Promise.all(['900 40px Unbounded', '800 40px Unbounded', '600 30px Geist', '500 20px "Geist Mono"'].map((s) => document.fonts.load(s, 'İıŞşĞğÇçÖöÜü')));
      })
      .then(() => continueRender(handle))
      .catch((e) => { console.error('font load failed', e); continueRender(handle); });
  }, [handle]);
};
