import { runContentScript } from '../lib/content-runner';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  main() {
    // Tam geçmiş taraması şimdilik sadece Claude'da — ChatGPT'nin iç API'si
    // ayrı bir oturum anahtarı istiyor, o ayrı bir iş.
    runContentScript({ platform: 'chatgpt' });
  },
});
