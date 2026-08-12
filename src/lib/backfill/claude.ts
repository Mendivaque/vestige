/**
 * Tüm geçmişi tarama (claude.ai).
 *
 * Sohbetleri tek tek açmak zorunda kalmamak için, claude.ai'ın web arayüzünün
 * kendi kullandığı uçları çağırıyoruz. Content script claude.ai origin'inde
 * çalıştığı için istek kullanıcının kendi oturumuyla gider — ek izin yok,
 * dışarıya hiçbir şey gitmiyor.
 *
 * Bu uçlar Anthropic'in iç API'si; belgelenmiş değil, değişebilir. O yüzden
 * her adım tek tek doğrulanıyor ve kırıldığında sebebini söyleyen bir hata
 * fırlatılıyor — sessizce yarım tarama yapmaktansa.
 */
import { parseConversation, type ImportedConversation } from '../import-claude';

export class BackfillError extends Error {}

export interface ScanProgress {
  phase: 'listing' | 'fetching' | 'done';
  done: number;
  total: number;
}

interface ConversationStub {
  uuid: string;
  updatedAt: number;
}

/** İki istek arası bekleme — claude.ai'ı yormayalım. */
const THROTTLE_MS = 250;

export interface ScanOptions {
  /** Arşivdeki sohbetlerin bilinen güncellenme zamanı: id → sourceUpdatedAt. */
  known: Record<string, number>;
  onProgress: (p: ScanProgress) => void;
  /** Toplanan sohbetleri parça parça teslim eder (bellekte biriktirmeyelim). */
  onBatch: (items: ImportedConversation[]) => Promise<void>;
  shouldStop?: () => boolean;
}

export async function scanAllConversations(opts: ScanOptions): Promise<number> {
  const orgId = await fetchOrganizationId();
  opts.onProgress({ phase: 'listing', done: 0, total: 0 });

  const stubs = await fetchConversationList(orgId);
  const pending = stubs.filter((s) => {
    const known = opts.known[`claude:${s.uuid}`];
    // Arşivdeki kayıt bu sürümü zaten görmüşse tekrar indirme.
    return known === undefined || known < s.updatedAt;
  });

  opts.onProgress({ phase: 'fetching', done: 0, total: pending.length });

  let batch: ImportedConversation[] = [];
  let fetched = 0;

  for (const stub of pending) {
    if (opts.shouldStop?.()) break;

    const conversation = await fetchConversation(orgId, stub.uuid);
    if (conversation) batch.push(conversation);

    fetched++;
    opts.onProgress({ phase: 'fetching', done: fetched, total: pending.length });

    if (batch.length >= 20) {
      await opts.onBatch(batch);
      batch = [];
    }
    await sleep(THROTTLE_MS);
  }

  if (batch.length > 0) await opts.onBatch(batch);
  opts.onProgress({ phase: 'done', done: fetched, total: pending.length });
  return fetched;
}

async function fetchOrganizationId(): Promise<string> {
  const data = await getJson('/api/organizations');
  const list = Array.isArray(data) ? data : [];
  const org = list.find(
    (o): o is { uuid: string } =>
      typeof o === 'object' && o !== null && typeof (o as { uuid?: unknown }).uuid === 'string',
  );
  if (!org) {
    throw new BackfillError(
      'Claude hesabı okunamadı. claude.ai’da oturumun açık mı?',
    );
  }
  return org.uuid;
}

async function fetchConversationList(orgId: string): Promise<ConversationStub[]> {
  const data = await getJson(
    `/api/organizations/${orgId}/chat_conversations`,
  );
  if (!Array.isArray(data)) {
    throw new BackfillError('Sohbet listesi beklenen biçimde gelmedi.');
  }

  const stubs: ConversationStub[] = [];
  for (const item of data) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.uuid !== 'string') continue;
    const updated =
      typeof rec.updated_at === 'string' ? Date.parse(rec.updated_at) : NaN;
    stubs.push({
      uuid: rec.uuid,
      updatedAt: Number.isNaN(updated) ? 0 : updated,
    });
  }

  if (stubs.length === 0) {
    throw new BackfillError('Hesapta okunabilir sohbet bulunamadı.');
  }
  return stubs;
}

async function fetchConversation(
  orgId: string,
  uuid: string,
): Promise<ImportedConversation | null> {
  try {
    const data = await getJson(
      `/api/organizations/${orgId}/chat_conversations/${uuid}?tree=True&rendering_mode=messages`,
    );
    return parseConversation(data);
  } catch {
    // Tek bir sohbet indirilemezse taramayı bitirmiyoruz.
    return null;
  }
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`https://claude.ai${path}`, {
    credentials: 'include',
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new BackfillError(
      res.status === 401 || res.status === 403
        ? 'claude.ai oturumu doğrulanamadı. Sekmede oturum açıp tekrar dene.'
        : `claude.ai isteği başarısız (HTTP ${res.status}).`,
    );
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
