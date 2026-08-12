/** Arama ve benzerlik için küçük metin yardımcıları. Hepsi lokal çalışır. */

const STOPWORDS = new Set([
  // Türkçe
  'acaba','ama','ancak','bana','bazı','belki','ben','beni','benim','beri','bile',
  'bir','biri','birkaç','birşey','biz','bize','bizi','bizim','bu','buna','bunda',
  'bundan','bunu','bunun','çok','çünkü','da','daha','de','defa','diye','eğer',
  'en','gibi','hem','hep','hepsi','her','hiç','için','ile','ise','kez','ki','kim',
  'mı','mi','mu','mü','nasıl','ne','neden','nerde','nerede','nereye','niçin',
  'niye','o','olarak','oldu','olduğu','olur','ona','ondan','onlar','onu','onun',
  'sana','sen','senin','şey','şu','şuna','şunu','tüm','ve','veya','ya','yani',
  'yapmak','yaptı','var','yok','olan','etmek','sonra','önce','kadar','beni',
  // İngilizce
  'a','about','after','all','also','an','and','any','are','as','at','be',
  'because','been','but','by','can','could','did','do','does','for','from','get',
  'had','has','have','how','i','if','in','into','is','it','its','just','like',
  'make','me','my','no','not','of','on','one','or','out','so','some','such',
  'than','that','the','their','them','then','there','these','they','this','to',
  'up','use','using','was','we','what','when','where','which','who','why','will',
  'with','would','you','your',
]);

/** Anlamlı, tekilleştirilmiş kelimeler. */
export function tokenize(text: string): string[] {
  const words = text
    .toLocaleLowerCase('tr')
    .replace(/```[\s\S]*?```/g, ' ') // kod bloklarını benzerlik dışı bırak
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(words));
}

export function hasCodeBlock(content: string): boolean {
  return content.includes('```');
}

/** Eşleşmenin çevresinden kısa alıntı. */
export function snippetAround(
  content: string,
  query: string,
  radius = 70,
): string | null {
  const i = content.toLocaleLowerCase('tr').indexOf(query.toLocaleLowerCase('tr'));
  if (i < 0) return null;
  const start = Math.max(0, i - radius);
  const end = Math.min(content.length, i + query.length + radius);
  return (
    (start > 0 ? '…' : '') +
    content.slice(start, end).replace(/\s+/g, ' ').trim() +
    (end < content.length ? '…' : '')
  );
}

/**
 * İki soru ne kadar örtüşüyor? 0-1 arası.
 * Taslaktaki anlamlı kelimelerin kaçı eski soruda geçiyor — kısa ve odaklı
 * eski sorulara küçük bir avantaj veriyoruz.
 */
export function overlapScore(draftTokens: string[], candidate: string): number {
  if (draftTokens.length === 0) return 0;
  const candTokens = new Set(tokenize(candidate));
  if (candTokens.size === 0) return 0;

  let hits = 0;
  for (const t of draftTokens) if (candTokens.has(t)) hits++;
  if (hits === 0) return 0;

  const coverage = hits / draftTokens.length;
  // Eski soru çok uzunsa örtüşme tesadüfi olabilir; hafifçe cezalandır.
  const focus = Math.min(1, draftTokens.length / candTokens.size);
  return coverage * (0.7 + 0.3 * focus);
}

/** İlk satırı / ilk cümleyi kısaltarak döndürür. */
export function firstLine(text: string, max = 90): string {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? line.slice(0, max - 1) + '…' : line;
}
