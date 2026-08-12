/**
 * Sayfadaki sohbeti okuma — platformdan bağımsız.
 *
 * Mesaj *balonlarını* aramak yerine rol işaretçisi taşıyan elemanları toplayıp
 * belge sırasına diziyoruz. Sarmalayıcı yapısı değişse de ayakta kalır; iki
 * platformda da aynı mantık işliyor.
 */
import { queryAllFirstMatch, queryFirst, SELECTORS } from '../../selectors';
import { htmlToMarkdown } from '../html-to-markdown';
import type { CapturedConversation, Platform, Role } from '../types';

const PLATFORM_LABEL: Record<Platform, string> = {
  claude: 'Claude',
  chatgpt: 'ChatGPT',
};

const CONVERSATION_URL: Record<Platform, (id: string) => string> = {
  claude: (id) => `https://claude.ai/chat/${id}`,
  chatgpt: (id) => `https://chatgpt.com/c/${id}`,
};

export function isConversationPage(
  platform: Platform,
  url: string = location.href,
): boolean {
  return SELECTORS[platform].urlPattern.test(url);
}

export function getConversationId(
  platform: Platform,
  url: string = location.href,
): string | null {
  return SELECTORS[platform].conversationIdPattern.exec(url)?.[1] ?? null;
}

export function captureConversation(
  platform: Platform,
): CapturedConversation | null {
  if (!isConversationPage(platform)) return null;
  const externalId = getConversationId(platform);
  if (!externalId) return null;

  const s = SELECTORS[platform];
  const marked: Array<{ el: HTMLElement; role: Role }> = [
    ...queryAllFirstMatch(document, s.userMessage).map((el) => ({
      el,
      role: 'user' as const,
    })),
    ...queryAllFirstMatch(document, s.assistantMessage).map((el) => ({
      el,
      role: 'assistant' as const,
    })),
  ];

  // İç içe geçmişleri ele: başka bir seçili elemanı kapsayan dıştakini at.
  const nodes = marked.filter(
    ({ el }) => !marked.some((o) => o.el !== el && el.contains(o.el)),
  );

  nodes.sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING
      ? -1
      : 1,
  );

  const messages = nodes
    .map(({ el, role }) => ({ role, content: htmlToMarkdown(el) }))
    .filter((m) => m.content.length > 0);

  if (messages.length === 0) return null;

  return {
    platform,
    externalId,
    title: getTitle(platform, messages[0]?.content ?? ''),
    url: CONVERSATION_URL[platform](externalId),
    messages,
  };
}

function getTitle(platform: Platform, firstMessage: string): string {
  const label = PLATFORM_LABEL[platform];
  const isJustPlatform = (s: string) =>
    s.toLowerCase() === label.toLowerCase() || s.toLowerCase() === 'new chat';

  const fromDom = queryFirst(document, SELECTORS[platform].title)?.textContent?.trim();
  if (fromDom && fromDom.length > 1 && !isJustPlatform(fromDom)) return clean(fromDom);

  const fromDocTitle = document.title
    .replace(new RegExp(`\\s*[-–|]\\s*${label}.*$`, 'i'), '')
    .trim();
  if (fromDocTitle && !isJustPlatform(fromDocTitle)) return clean(fromDocTitle);

  // Son çare: ilk mesajın ilk satırı.
  return clean(firstMessage.split('\n')[0] || 'Untitled');
}

function clean(s: string): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > 120 ? t.slice(0, 117) + '…' : t;
}
