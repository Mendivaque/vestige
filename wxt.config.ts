import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vestige — AI Chat Archive',
    // Web Store sınırı 132 karakter — uzunsa gönderim reddediliyor.
    description:
      'Archive your Claude and ChatGPT chats, recover deleted replies, search everything, export to Markdown. All of it stays local.',
    // İzinler minimum: lokal depolama + iki host.
    permissions: ['storage'],
    host_permissions: ['https://claude.ai/*', 'https://chatgpt.com/*'],
  },
});
