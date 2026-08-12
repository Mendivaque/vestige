/**
 * Sohbet anahtarı. Ayrı dosyada, çünkü content script'in de buna ihtiyacı var
 * ve repo.ts'i import etmesi Dexie'yi claude.ai sayfasına taşırdı.
 */
export function conversationKey(c: {
  platform: string;
  externalId: string;
}): string {
  return `${c.platform}:${c.externalId}`;
}
