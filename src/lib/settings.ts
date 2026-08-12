/** Küçük ayar deposu (chrome.storage.local). */

export type Language = 'auto' | 'tr' | 'en';

export interface Settings {
  /** Arayüz dili. 'auto' → tarayıcı dili. */
  language: Language;
  /** Sohbet yazarken "bunu sormuştun" ipucu gösterilsin mi? */
  hintEnabled: boolean;
  /** Sayfa açıkken otomatik yakalama. */
  autoCapture: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'auto',
  hintEnabled: true,
  autoCapture: true,
};

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get({ ...DEFAULT_SETTINGS });
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

/** Ayar değişimlerini dinle (dil ve ipucu anında uygulansın). */
export function onSettingsChanged(cb: (s: Settings) => void): () => void {
  const keys = Object.keys(DEFAULT_SETTINGS);
  const listener = (changes: Record<string, unknown>, area: string) => {
    if (area !== 'local') return;
    if (keys.some((k) => k in changes)) void getSettings().then(cb);
  };
  browser.storage.onChanged.addListener(listener as never);
  return () => browser.storage.onChanged.removeListener(listener as never);
}
