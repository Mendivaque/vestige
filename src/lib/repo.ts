import { db } from './db';
import type { ImportedConversation } from './import-claude';
import { conversationKey } from './keys';
import { firstLine, hasCodeBlock, overlapScore, snippetAround, tokenize } from './text';
import type {
  CapturedConversation,
  Conversation,
  ConversationHit,
  Folder,
  Message,
  MessageVersion,
  SearchFilters,
  SimilarHit,
} from './types';

export { conversationKey } from './keys';

/**
 * Yakalanan sohbeti kaydeder. Aynı sohbet tekrar yakalanırsa mesajlar
 * baştan yazılır (sohbet uzamış olabilir), ama klasör/pin/createdAt korunur.
 *
 * Üzerine yazılan eski mesajlar silinmez: `versions` tablosuna taşınır.
 * Böylece Claude'da düzenlenip yeniden üretilen cevaplar kaybolmaz.
 */
export async function saveCapture(cap: CapturedConversation): Promise<{
  conversationId: string;
  messageCount: number;
  isNew: boolean;
  archivedVersions: number;
}> {
  const id = conversationKey(cap);
  const now = Date.now();

  return db.transaction(
    'rw',
    db.conversations,
    db.messages,
    db.versions,
    async () => {
      const existing = await db.conversations.get(id);
      const previous = await getMessages(id);
      const superseded = collectSuperseded(previous, cap.messages, now);

      const firstUser = cap.messages.find((m) => m.role === 'user');
      const conversation: Conversation = {
        id,
        platform: cap.platform,
        externalId: cap.externalId,
        title: cap.title,
        url: cap.url,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        folderId: existing?.folderId ?? null,
        pinned: existing?.pinned ?? 0,
        messageCount: cap.messages.length,
        preview: firstLine(
          firstUser?.content ?? cap.messages[0]?.content ?? '',
          180,
        ),
      };

      await db.conversations.put(conversation);
      if (superseded.length > 0) await db.versions.bulkAdd(superseded);
      await db.messages.where('conversationId').equals(id).delete();
      await db.messages.bulkAdd(
        cap.messages.map((m, index) => ({
          conversationId: id,
          index,
          role: m.role,
          content: m.content,
        })),
      );

      return {
        conversationId: id,
        messageCount: cap.messages.length,
        isNew: !existing,
        archivedVersions: superseded.length,
      };
    },
  );
}

/**
 * Hangi eski mesajlar gerçekten kayboluyor?
 * Streaming sırasında cevap büyüyerek geldiği için, eski içerik yeninin
 * başlangıcıysa bu bir "değişiklik" değildir — sürüm olarak kaydetmeyiz.
 */
function collectSuperseded(
  previous: Message[],
  next: Array<Pick<Message, 'role' | 'content'>>,
  now: number,
): MessageVersion[] {
  const out: MessageVersion[] = [];
  for (const old of previous) {
    if (!old.content.trim()) continue;
    const replacement = next[old.index];

    // Mesaj tamamen kaybolmuş (düzenle + yeniden üret sohbetin kuyruğunu siler).
    if (!replacement) {
      out.push(toVersion(old, now));
      continue;
    }
    // İçerik değişmiş ve bu bir streaming devamı değil.
    if (
      replacement.role !== old.role ||
      (replacement.content !== old.content &&
        !replacement.content.startsWith(old.content))
    ) {
      out.push(toVersion(old, now));
    }
  }
  return out;
}

function toVersion(m: Message, now: number): MessageVersion {
  return {
    conversationId: m.conversationId,
    index: m.index,
    role: m.role,
    content: m.content,
    supersededAt: now,
  };
}

export interface ImportProgress {
  done: number;
  total: number;
}

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
  messages: number;
}

/**
 * Claude'un resmî dışa aktarımından toplu içe alma.
 *
 * Canlı yakalamadan farklı iki kuralı var:
 * - Sürüm kurtarma çalışmaz. İçe aktarım geçmişi *doldurur*; bir mesajın
 *   "değişmiş" görünmesi kullanıcının bir şey silmesi anlamına gelmez.
 * - Arşivdeki kayıt daha doluysa dokunmaz. Canlı yakalama dışa aktarımdan
 *   daha güncel olabilir; onu geri sarmıyoruz.
 */
export async function importConversations(
  items: ImportedConversation[],
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, updated: 0, skipped: 0, messages: 0 };
  const CHUNK = 25;

  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);

    await db.transaction('rw', db.conversations, db.messages, async () => {
      for (const item of chunk) {
        const id = conversationKey(item);
        const existing = await db.conversations.get(id);

        if (existing && existing.messageCount >= item.messages.length) {
          summary.skipped++;
          continue;
        }

        const firstUser = item.messages.find((m) => m.role === 'user');
        await db.conversations.put({
          id,
          platform: item.platform,
          externalId: item.externalId,
          title: item.title,
          url: item.url,
          createdAt: existing?.createdAt ?? item.createdAt,
          updatedAt: Math.max(existing?.updatedAt ?? 0, item.updatedAt),
          folderId: existing?.folderId ?? null,
          pinned: existing?.pinned ?? 0,
          messageCount: item.messages.length,
          preview: firstLine(
            firstUser?.content ?? item.messages[0]?.content ?? '',
            180,
          ),
          sourceUpdatedAt: item.updatedAt,
        });

        await db.messages.where('conversationId').equals(id).delete();
        await db.messages.bulkAdd(
          item.messages.map((m, index) => ({
            conversationId: id,
            index,
            role: m.role,
            content: m.content,
          })),
        );

        summary.messages += item.messages.length;
        if (existing) summary.updated++;
        else summary.added++;
      }
    });

    onProgress?.({ done: Math.min(i + CHUNK, items.length), total: items.length });
  }

  return summary;
}

/**
 * Tüm geçmişi tararken hangi sohbetin hangi sürümünü gördüğümüz.
 * Değişmemiş sohbetler tekrar indirilmesin diye.
 */
export async function getSyncState(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await db.conversations.each((c) => {
    if (c.sourceUpdatedAt !== undefined) out[c.id] = c.sourceUpdatedAt;
  });
  return out;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const rows = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .toArray();
  return rows.sort((a, b) => a.index - b.index);
}

/** Bir sohbette kurtarılmış eski sürümler (en yeni önce). */
export async function getVersions(
  conversationId: string,
): Promise<MessageVersion[]> {
  const rows = await db.versions
    .where('conversationId')
    .equals(conversationId)
    .toArray();
  return rows.sort((a, b) => b.supersededAt - a.supersededAt);
}

export async function deleteVersion(id: number): Promise<void> {
  await db.versions.delete(id);
}

/**
 * Tam metin arama + filtreler. MVP'de doğrudan tarama yeterli
 * (yerel veri, birkaç bin kayıt). Yavaşlarsa minisearch/flexsearch eklenir.
 */
export async function listConversations(
  filters: SearchFilters = {},
): Promise<ConversationHit[]> {
  const {
    query = '',
    folderId = 'all',
    platform = 'all',
    role = 'all',
    hasCode = false,
    from,
    to,
  } = filters;

  let items = await db.conversations.toArray();

  if (folderId !== 'all') {
    items = items.filter((c) => (c.folderId ?? null) === folderId);
  }
  if (platform !== 'all') items = items.filter((c) => c.platform === platform);
  if (from !== undefined) items = items.filter((c) => c.updatedAt >= from);
  if (to !== undefined) items = items.filter((c) => c.updatedAt <= to);

  const q = query.trim();
  const needsScan = q.length > 0 || hasCode || role !== 'all';

  if (needsScan) {
    const allowed = new Set(items.map((c) => c.id));
    const matched = new Set<string>();
    const codeOk = new Set<string>();
    const snippets = new Map<string, string>();

    await db.messages.each((m) => {
      if (!allowed.has(m.conversationId)) return;
      if (hasCode && hasCodeBlock(m.content)) codeOk.add(m.conversationId);
      if (!q) return;
      if (role !== 'all' && m.role !== role) return;
      const snip = snippetAround(m.content, q);
      if (snip) {
        matched.add(m.conversationId);
        if (!snippets.has(m.conversationId)) {
          snippets.set(m.conversationId, snip);
        }
      }
    });

    if (q) {
      items = items.filter(
        (c) =>
          matched.has(c.id) ||
          // Rol filtresi mesaj içeriği için; başlık eşleşmesi her zaman geçerli.
          c.title.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')),
      );
    }
    if (hasCode) items = items.filter((c) => codeOk.has(c.id));

    return sortHits(
      items.map((c) => ({ ...c, snippet: snippets.get(c.id) })),
    );
  }

  return sortHits(items);
}

function sortHits(items: ConversationHit[]): ConversationHit[] {
  return items.sort((a, b) => b.pinned - a.pinned || b.updatedAt - a.updatedAt);
}

/**
 * "Bunu daha önce sormuştun" — kullanıcı claude.ai'da yeni bir soru yazarken
 * arşivdeki eski sorularla karşılaştırır. Tamamen lokal; hiçbir istek gitmez.
 */
export async function findSimilarQuestion(
  draft: string,
  excludeConversationId?: string,
): Promise<SimilarHit | null> {
  const tokens = tokenize(draft);
  // Az kelimeyle emin olamayız — sessiz kal.
  if (tokens.length < 3) return null;

  let best: { m: Message; score: number } | null = null;

  await db.messages.each((m) => {
    if (m.role !== 'user') return;
    if (m.conversationId === excludeConversationId) return;
    if (m.content.length < 15) return;
    const score = overlapScore(tokens, m.content);
    if (score > (best?.score ?? 0)) best = { m, score };
  });

  // Eşik yüksek: rahatsız etmektense hiç çıkmasın.
  const hit = best as { m: Message; score: number } | null;
  if (!hit || hit.score < 0.62) return null;

  const conversation = await db.conversations.get(hit.m.conversationId);
  if (!conversation) return null;

  return {
    conversationId: conversation.id,
    title: conversation.title,
    question: firstLine(hit.m.content, 90),
    url: conversation.url,
    askedAt: conversation.updatedAt,
    score: hit.score,
  };
}

export async function togglePin(id: string): Promise<void> {
  const c = await db.conversations.get(id);
  if (!c) return;
  await db.conversations.update(id, { pinned: c.pinned ? 0 : 1 });
}

export async function setFolder(
  id: string,
  folderId: number | null,
): Promise<void> {
  await db.conversations.update(id, { folderId });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.transaction(
    'rw',
    db.conversations,
    db.messages,
    db.versions,
    async () => {
      await db.messages.where('conversationId').equals(id).delete();
      await db.versions.where('conversationId').equals(id).delete();
      await db.conversations.delete(id);
    },
  );
}

export async function listFolders(): Promise<Folder[]> {
  const folders = await db.folders.toArray();
  return folders.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

export async function createFolder(name: string): Promise<number> {
  return db.folders.add({ name: name.trim(), createdAt: Date.now() });
}

export async function renameFolder(id: number, name: string): Promise<void> {
  await db.folders.update(id, { name: name.trim() });
}

/** Klasörü siler; içindeki sohbetler "klasörsüz"e düşer. */
export async function deleteFolder(id: number): Promise<void> {
  await db.transaction('rw', db.folders, db.conversations, async () => {
    await db.conversations
      .where('folderId')
      .equals(id)
      .modify({ folderId: null });
    await db.folders.delete(id);
  });
}

export async function getStats(): Promise<{
  conversations: number;
  messages: number;
  versions: number;
}> {
  const [conversations, messages, versions] = await Promise.all([
    db.conversations.count(),
    db.messages.count(),
    db.versions.count(),
  ]);
  return { conversations, messages, versions };
}
