import type { ImportedConversation } from './import-claude';
import type { CapturedConversation, SimilarHit } from './types';

/** Content script / popup → background */
export type ToBackground =
  | { type: 'SAVE_CONVERSATION'; payload: CapturedConversation }
  | { type: 'GET_STATS' }
  | { type: 'GET_SYNC_STATE' }
  | { type: 'IMPORT_BATCH'; items: ImportedConversation[] }
  | {
      type: 'FIND_SIMILAR';
      draft: string;
      /** Açık olan sohbet — kendisiyle eşleşmesin. */
      excludeConversationId?: string;
    }
  | { type: 'OPEN_ARCHIVE'; conversationId?: string };

/** Popup → content script */
export type ToContent = { type: 'CAPTURE_NOW' } | { type: 'SCAN_ALL' };

export interface SaveResult {
  ok: boolean;
  conversationId?: string;
  messageCount?: number;
  /** Bu yakalamada kurtarılan eski mesaj sürümü sayısı. */
  archivedVersions?: number;
  error?: string;
}

export interface CaptureResult {
  ok: boolean;
  /** Sohbet sayfasında değilsek / mesaj bulunamadıysa sebebi. */
  reason?: string;
  title?: string;
  messageCount?: number;
}

export interface Stats {
  conversations: number;
  messages: number;
  versions: number;
}

export type SimilarResult = SimilarHit | null;

/**
 * Tarama ilerlemesi storage.local'da tutuluyor: popup kapansa da tarama
 * devam etsin, tekrar açıldığında durumu görsün.
 */
export const SCAN_STATE_KEY = 'scanState';

export interface ScanState {
  running: boolean;
  phase: 'listing' | 'fetching' | 'done';
  done: number;
  total: number;
  added: number;
  messages: number;
  error?: string;
  finishedAt?: number;
}

export const IDLE_SCAN: ScanState = {
  running: false,
  phase: 'done',
  done: 0,
  total: 0,
  added: 0,
  messages: 0,
};

export async function getScanState(): Promise<ScanState> {
  const stored = await browser.storage.local.get({ [SCAN_STATE_KEY]: IDLE_SCAN });
  return (stored as Record<string, ScanState>)[SCAN_STATE_KEY] ?? IDLE_SCAN;
}

export async function setScanState(state: ScanState): Promise<void> {
  await browser.storage.local.set({ [SCAN_STATE_KEY]: state });
}
