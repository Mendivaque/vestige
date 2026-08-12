import { getMessages } from './repo';
import type { Conversation } from './types';

export interface ExportLabels {
  user: string;
  /** Asistan başlığı — platform adı kullanılıyor (Claude / ChatGPT). */
  assistant: string;
  source: string;
  updated: string;
  messageCount: string;
  locale: string;
}

const FALLBACK: ExportLabels = {
  user: 'You',
  assistant: 'Assistant',
  source: 'Source',
  updated: 'Last updated',
  messageCount: 'Messages',
  locale: 'en-US',
};

export async function conversationToMarkdown(
  c: Conversation,
  labels: ExportLabels = FALLBACK,
): Promise<string> {
  const messages = await getMessages(c.id);
  const platform = c.platform === 'claude' ? 'Claude' : 'ChatGPT';
  const date = new Date(c.updatedAt).toLocaleString(labels.locale);

  const head = [
    `# ${c.title}`,
    '',
    `- Platform: ${platform}`,
    `- ${labels.source}: ${c.url}`,
    `- ${labels.updated}: ${date}`,
    `- ${labels.messageCount}: ${c.messageCount}`,
    '',
    '---',
    '',
  ].join('\n');

  const body = messages
    .map(
      (m) =>
        `## ${m.role === 'user' ? labels.user : platform}\n\n${m.content}`,
    )
    .join('\n\n---\n\n');

  return `${head}${body}\n`;
}

export async function conversationsToMarkdown(
  conversations: Conversation[],
  labels: ExportLabels = FALLBACK,
): Promise<string> {
  const parts = await Promise.all(
    conversations.map((c) => conversationToMarkdown(c, labels)),
  );
  return parts.join('\n\n<!-- ─────────────── -->\n\n');
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Blob URL'i hemen bırakmak Chrome'da indirmeyi kesebiliyor.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function safeFilename(name: string): string {
  const base = name
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return (base || 'sohbet') + (base.endsWith('.md') ? '' : '.md');
}
