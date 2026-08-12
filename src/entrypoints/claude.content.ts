import { scanAllConversations } from '../lib/backfill/claude';
import { runContentScript } from '../lib/content-runner';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  runAt: 'document_idle',
  main() {
    runContentScript({
      platform: 'claude',
      scanAll: async (ctx) => {
        await scanAllConversations({
          known: ctx.known,
          onProgress: ({ phase, done, total }) => {
            if (phase !== 'done') ctx.report({ phase, done, total });
          },
          onBatch: ctx.save,
        });
      },
    });
  },
});
