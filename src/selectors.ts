/**
 * TÜM DOM selector'ları burada. Claude/ChatGPT arayüzü sık değişir; kırıldığında
 * sadece bu dosya güncellenir. Yapı bilerek "düz veri" — ileride uzaktan
 * (remote config) indirilip `loadSelectorConfig()` ile üzerine yazılabilir.
 *
 * Her alan bir *aday listesi*: sırayla denenir, ilk eşleşen kullanılır.
 */
import type { Platform } from './lib/types';

export interface PlatformSelectors {
  /** Sohbetin geçtiği sayfa mı? (URL testi) */
  urlPattern: RegExp;
  /** URL'den sohbet id'sini çıkarır. */
  conversationIdPattern: RegExp;
  /** Mesaj balonlarını içeren kök konteyner adayları (MutationObserver hedefi). */
  root: string[];
  /** Tek tek mesaj bloğu adayları. */
  message: string[];
  /** Bir mesajın kullanıcıya ait olduğunu gösteren adaylar (message içinde veya kendisi). */
  userMessage: string[];
  /** Bir mesajın asistana ait olduğunu gösteren adaylar. */
  assistantMessage: string[];
  /** Başlık adayları (bulunamazsa document.title'a düşer). */
  title: string[];
  /** Kullanıcının soruyu yazdığı alan — "bunu sormuştun" ipucu için. */
  composer: string[];
}

export const SELECTORS: Record<Platform, PlatformSelectors> = {
  claude: {
    urlPattern: /^https:\/\/claude\.ai\/chat\/[0-9a-f-]+/i,
    conversationIdPattern: /\/chat\/([0-9a-f-]+)/i,
    root: ['div.flex-1.flex.flex-col.gap-3', 'main', 'body'],
    message: [
      '[data-test-render-count] > div',
      'div[data-testid="user-message"], div.font-claude-response',
      'div.font-user-message, div.font-claude-message',
    ],
    userMessage: ['[data-testid="user-message"]', '.font-user-message'],
    assistantMessage: [
      '.font-claude-response',
      '.font-claude-message',
      '[data-testid="assistant-message"]',
    ],
    title: [
      'button[data-testid="chat-menu-trigger"]',
      'header .truncate',
      'title',
    ],
    composer: [
      'div[contenteditable="true"].ProseMirror',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"]',
    ],
  },

  chatgpt: {
    // Özel GPT'lerde adres /g/g-xxx/c/<id> biçiminde oluyor.
    urlPattern: /^https:\/\/chatgpt\.com\/(?:g\/[^/]+\/)?c\/[0-9a-z-]+/i,
    conversationIdPattern: /\/c\/([0-9a-z-]+)/i,
    root: ['main', 'body'],
    message: ['article[data-testid^="conversation-turn"]', '[data-message-id]'],
    userMessage: ['[data-message-author-role="user"]'],
    assistantMessage: ['[data-message-author-role="assistant"]'],
    title: ['title'],
    composer: [
      '#prompt-textarea',
      'form div[contenteditable="true"]',
      'form textarea',
    ],
  },
};

/** Aday listesindeki ilk eşleşen elemanı döndürür. */
export function queryFirst(
  scope: ParentNode,
  candidates: string[],
): HTMLElement | null {
  for (const sel of candidates) {
    const el = scope.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

/** Aday listesinden en çok sonuç veren selector'ın sonuçlarını döndürür. */
export function queryAllFirstMatch(
  scope: ParentNode,
  candidates: string[],
): HTMLElement[] {
  for (const sel of candidates) {
    const els = Array.from(scope.querySelectorAll<HTMLElement>(sel));
    if (els.length > 0) return els;
  }
  return [];
}

/** Element aday listelerinden herhangi biriyle eşleşiyor mu (kendisi ya da içinde)? */
export function matchesAny(el: HTMLElement, candidates: string[]): boolean {
  return candidates.some((sel) => el.matches(sel) || !!el.querySelector(sel));
}
