/**
 * Claude'un resmî veri dışa aktarımını (`conversations.json`) okur.
 *
 * Anthropic bu dosyanın şemasını zaman zaman değiştiriyor, o yüzden ayrıştırıcı
 * bilerek toleranslı: tanıdığı alanları alır, tanımadıklarını atlar, ne kadarını
 * okuyabildiğini rapor eder. Hiçbir şey okuyamazsa sessizce başarısız olmak
 * yerine sebebini söyler.
 */
import { firstLine } from './text';
import type { CapturedConversation, Role } from './types';

export interface ImportedConversation extends CapturedConversation {
  createdAt: number;
  updatedAt: number;
}

export interface ParseResult {
  conversations: ImportedConversation[];
  /** Atlanan kayıtlar (boş sohbet, okunamayan giriş vs.). */
  skipped: number;
  /** Kullanıcıya gösterilecek uyarılar. */
  warnings: string[];
}

export class ImportFormatError extends Error {}

export function parseClaudeExport(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ImportFormatError(
      'Dosya geçerli bir JSON değil. Claude → Settings → Privacy → Export data ile indirdiğin arşivdeki conversations.json dosyasını seç.',
    );
  }

  const list = asConversationList(data);
  if (!list) {
    throw new ImportFormatError(
      'Bu dosya bir Claude sohbet dışa aktarımına benzemiyor. Arşivin içindeki conversations.json dosyasını seçtiğinden emin ol.',
    );
  }

  const conversations: ImportedConversation[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  for (const entry of list) {
    const parsed = parseConversation(entry);
    if (parsed) conversations.push(parsed);
    else skipped++;
  }

  if (conversations.length === 0) {
    throw new ImportFormatError(
      `Dosyada okunabilir sohbet bulunamadı (${list.length} kayıt tarandı). Şema değişmiş olabilir.`,
    );
  }
  if (skipped > 0) {
    warnings.push(`${skipped} kayıt atlandı (boş sohbet veya okunamayan biçim).`);
  }

  return { conversations, skipped, warnings };
}

function asConversationList(data: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (isObject(data) && Array.isArray(data.conversations)) {
    return data.conversations as Record<string, unknown>[];
  }
  return null;
}

/**
 * Tek bir sohbet kaydını okur. Hem dışa aktarım dosyası hem claude.ai'ın
 * kendi API'si aynı şekli döndürdüğü için tarama da bunu kullanıyor.
 */
export function parseConversation(
  entry: unknown,
): ImportedConversation | null {
  if (!isObject(entry)) return null;

  const externalId = str(entry.uuid) ?? str(entry.conversation_id) ?? str(entry.id);
  if (!externalId) return null;

  const rawMessages =
    (Array.isArray(entry.chat_messages) && entry.chat_messages) ||
    (Array.isArray(entry.messages) && entry.messages) ||
    null;
  if (!rawMessages) return null;

  const messages = rawMessages
    .map(parseMessage)
    .filter((m): m is { role: Role; content: string } => m !== null);
  if (messages.length === 0) return null;

  const createdAt = time(entry.created_at) ?? Date.now();
  const updatedAt = time(entry.updated_at) ?? createdAt;
  const name = str(entry.name) ?? str(entry.title);

  return {
    platform: 'claude',
    externalId,
    title: name?.trim()
      ? firstLine(name, 120)
      : firstLine(messages[0]?.content ?? 'Başlıksız sohbet', 120),
    url: `https://claude.ai/chat/${externalId}`,
    createdAt,
    updatedAt,
    messages,
  };
}

function parseMessage(raw: unknown): { role: Role; content: string } | null {
  if (!isObject(raw)) return null;

  const sender = str(raw.sender) ?? str(raw.role);
  const role: Role =
    sender === 'assistant' || sender === 'ai' ? 'assistant' : 'user';

  const content = extractText(raw);
  return content ? { role, content } : null;
}

/**
 * Metin iki yerde olabilir: eski dışa aktarımlarda düz `text`, yenilerinde
 * `content` blokları. Bloklardan sadece metin olanları alıyoruz — düşünme
 * (thinking) ve araç çağrıları arşive girmesin.
 */
function extractText(raw: Record<string, unknown>): string {
  const blocks = raw.content;
  if (Array.isArray(blocks)) {
    const parts = blocks
      .map((b) => (isObject(b) && b.type === 'text' ? str(b.text) : null))
      .filter((t): t is string => !!t?.trim());
    if (parts.length > 0) return parts.join('\n\n').trim();
  }
  return (str(raw.text) ?? '').trim();
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function time(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined;
  const t = Date.parse(v);
  return Number.isNaN(t) ? undefined : t;
}
