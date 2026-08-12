import type { SaveResult, Stats, ToBackground } from '../lib/messaging';
import {
  findSimilarQuestion,
  getStats,
  getSyncState,
  importConversations,
  saveCapture,
} from '../lib/repo';

export default defineBackground(() => {
  // Veritabanı eklenti origin'inde yaşasın diye tüm okuma/yazma işleri burada.
  browser.runtime.onMessage.addListener(
    (message: ToBackground, _sender, sendResponse) => {
      switch (message?.type) {
        case 'SAVE_CONVERSATION':
          saveCapture(message.payload)
            .then((r) =>
              sendResponse({
                ok: true,
                conversationId: r.conversationId,
                messageCount: r.messageCount,
                archivedVersions: r.archivedVersions,
              } satisfies SaveResult),
            )
            .catch((e: unknown) =>
              sendResponse({ ok: false, error: String(e) } satisfies SaveResult),
            );
          return true;

        case 'GET_STATS':
          getStats()
            .then((s: Stats) => sendResponse(s))
            .catch(() =>
              sendResponse({ conversations: 0, messages: 0, versions: 0 }),
            );
          return true;

        case 'GET_SYNC_STATE':
          getSyncState()
            .then((s) => sendResponse(s))
            .catch(() => sendResponse({}));
          return true;

        case 'IMPORT_BATCH':
          importConversations(message.items)
            .then((summary) => sendResponse(summary))
            .catch((e: unknown) => sendResponse({ error: String(e) }));
          return true;

        case 'FIND_SIMILAR':
          findSimilarQuestion(message.draft, message.excludeConversationId)
            .then((hit) => sendResponse(hit))
            .catch(() => sendResponse(null));
          return true;

        case 'OPEN_ARCHIVE': {
          const base = browser.runtime.getURL('/archive.html');
          const hash = message.conversationId
            ? `#${encodeURIComponent(message.conversationId)}`
            : '';
          browser.tabs.create({ url: `${base}${hash}` });
          return false;
        }
      }
    },
  );
});
