/**
 * İki content script'in (claude, chatgpt) ortak beyni:
 * pasif yakalama + "bunu sormuştun" ipucu + tam tarama tetikleyicisi.
 */
import {
  captureConversation,
  getConversationId,
  isConversationPage,
} from './capture/dom';
import { HintBar } from './hint-ui';
import { makeTranslate, resolveLanguage, type Translate } from './i18n';
import { conversationKey } from './keys';
import {
  getScanState,
  setScanState,
  type CaptureResult,
  type SimilarResult,
  type ToBackground,
  type ToContent,
} from './messaging';
import { DEFAULT_SETTINGS, getSettings, onSettingsChanged, setSetting } from './settings';
import type { ImportedConversation } from './import-claude';
import type { Platform } from './types';
import { queryFirst, SELECTORS } from '../selectors';

export interface RunnerOptions {
  platform: Platform;
  /** Platform tüm geçmişi tarayabiliyorsa tarama fonksiyonu. */
  scanAll?: (ctx: ScanContext) => Promise<void>;
}

export interface ScanContext {
  known: Record<string, number>;
  report: (p: { phase: 'listing' | 'fetching'; done: number; total: number }) => void;
  save: (items: ImportedConversation[]) => Promise<void>;
}

export function runContentScript({ platform, scanAll }: RunnerOptions): void {
  let settings = DEFAULT_SETTINGS;
  let t: Translate = makeTranslate(resolveLanguage('auto'));

  void getSettings().then((s) => {
    settings = s;
    t = makeTranslate(resolveLanguage(s.language));
  });
  onSettingsChanged((s) => {
    settings = s;
    t = makeTranslate(resolveLanguage(s.language));
    if (!s.hintEnabled) hint.hide();
  });

  // ---------------------------------------------------------------- yakalama

  let lastSignature = '';
  let captureTimer: ReturnType<typeof setTimeout> | undefined;

  async function capture(force = false): Promise<CaptureResult> {
    if (!isConversationPage(platform)) return { ok: false, reason: 'not-a-conversation' };

    const cap = captureConversation(platform);
    if (!cap) {
      // Selector'lar kırıldığında teşhisi kolaylaştır (bkz. src/selectors.ts).
      console.warn(`[Vestige] ${platform}: sohbet okunamadı — selector güncellemesi gerekebilir.`);
      return { ok: false, reason: 'no-messages' };
    }

    const signature = `${cap.externalId}|${cap.messages.length}|${
      cap.messages[cap.messages.length - 1]?.content.length ?? 0
    }`;
    if (!force && signature === lastSignature) {
      return { ok: true, title: cap.title, messageCount: cap.messages.length };
    }
    lastSignature = signature;

    const msg: ToBackground = { type: 'SAVE_CONVERSATION', payload: cap };
    await browser.runtime.sendMessage(msg);
    return { ok: true, title: cap.title, messageCount: cap.messages.length };
  }

  function scheduleCapture() {
    clearTimeout(captureTimer);
    // Yazma/streaming bitene kadar bekle; her token'da kayıt yapmayalım.
    captureTimer = setTimeout(() => {
      if (settings.autoCapture) void capture();
    }, 2500);
  }

  // ------------------------------------------------------------------- ipucu

  const hint = new HintBar({
    translate: (key, params) => t(key, params),
    onOpen: (h) => {
      const msg: ToBackground = {
        type: 'OPEN_ARCHIVE',
        conversationId: h.conversationId,
      };
      void browser.runtime.sendMessage(msg);
    },
    onDisable: () => void setSetting('hintEnabled', false),
  });

  let hintTimer: ReturnType<typeof setTimeout> | undefined;
  let lastDraft = '';

  function composer(): HTMLElement | null {
    return queryFirst(document, SELECTORS[platform].composer);
  }

  async function checkDraft() {
    if (!settings.hintEnabled) return;
    const el = composer();
    if (!el) return;

    const draft = (el.innerText ?? el.textContent ?? '').trim();
    if (draft === lastDraft) return;
    lastDraft = draft;

    // Çok kısa taslakta emin olamayız; gönderim sonrası temizlenince gizle.
    if (draft.length < 15) {
      hint.hide();
      return;
    }

    const id = getConversationId(platform);
    const msg: ToBackground = {
      type: 'FIND_SIMILAR',
      draft,
      excludeConversationId: id
        ? conversationKey({ platform, externalId: id })
        : undefined,
    };
    const found = (await browser.runtime.sendMessage(msg)) as SimilarResult;
    if (found) hint.show(found, el);
    else hint.hide();
  }

  document.addEventListener('input', (e) => {
    const el = composer();
    if (el && e.target instanceof Node && el.contains(e.target)) {
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => void checkDraft(), 800);
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Escape') hint.hide();
  });

  // ------------------------------------------------------------- tam tarama

  let scanning = false;

  async function runScan() {
    if (!scanAll || scanning) return;
    scanning = true;
    await setScanState({
      running: true,
      phase: 'listing',
      done: 0,
      total: 0,
      added: 0,
      messages: 0,
    });

    let added = 0;
    let messages = 0;

    try {
      const known = (await browser.runtime.sendMessage({
        type: 'GET_SYNC_STATE',
      } satisfies ToBackground)) as Record<string, number>;

      await scanAll({
        known: known ?? {},
        report: (p) => {
          void setScanState({
            running: true,
            phase: p.phase,
            done: p.done,
            total: p.total,
            added,
            messages,
          });
        },
        save: async (items) => {
          const summary = (await browser.runtime.sendMessage({
            type: 'IMPORT_BATCH',
            items,
          } satisfies ToBackground)) as { added?: number; messages?: number };
          added += summary?.added ?? 0;
          messages += summary?.messages ?? 0;
        },
      });

      const last = await getScanState();
      await setScanState({
        ...last,
        running: false,
        phase: 'done',
        added,
        messages,
        finishedAt: Date.now(),
      });
    } catch (e) {
      await setScanState({
        running: false,
        phase: 'done',
        done: 0,
        total: 0,
        added,
        messages,
        error: e instanceof Error ? e.message : String(e),
        finishedAt: Date.now(),
      });
    } finally {
      scanning = false;
    }
  }

  // --------------------------------------------------------------- gözlemci

  new MutationObserver(scheduleCapture).observe(document.body, {
    childList: true,
    subtree: true,
  });

  // SPA gezinmesi: sohbet değişince imzayı sıfırla.
  let lastId = getConversationId(platform);
  setInterval(() => {
    const id = getConversationId(platform);
    if (id !== lastId) {
      lastId = id;
      lastSignature = '';
      lastDraft = '';
      hint.hide();
      scheduleCapture();
    }
  }, 1000);

  browser.runtime.onMessage.addListener(
    (message: ToContent, _sender, sendResponse) => {
      if (message?.type === 'CAPTURE_NOW') {
        capture(true).then(sendResponse);
        return true; // async yanıt
      }
      if (message?.type === 'SCAN_ALL') {
        void runScan();
        sendResponse({ started: !!scanAll });
        return false;
      }
    },
  );

  scheduleCapture();
}
