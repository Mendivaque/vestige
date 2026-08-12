/**
 * Küçük çeviri katmanı. chrome.i18n yerine kendi sözlüğümüz:
 * dil değişimi anında (yeniden yükleme olmadan) uygulanabilsin ve
 * content script'teki şerit de aynı sözlüğü kullanabilsin diye.
 */
import { useEffect, useState } from 'react';
import { getSettings, onSettingsChanged, type Language } from './settings';

const TR = {
  'app.name': 'Vestige',
  'app.tagline': 'AI sohbet arşivi',

  'platform.claude': 'Claude',
  'platform.chatgpt': 'ChatGPT',

  'popup.stat.conversations': 'sohbet',
  'popup.stat.messages': 'mesaj',
  'popup.stat.recovered': 'kurtarılan',
  'popup.stat.recovered.title': 'Silinen ama arşivde kalan mesajlar',
  'popup.archiveThis': 'Bu sohbeti arşivle',
  'popup.archiving': 'Arşivleniyor…',
  'popup.openArchive': 'Arşivi aç',
  'popup.scanAll': 'Tüm geçmişi tara',
  'popup.scanning': 'Taranıyor: {done}/{total}',
  'popup.scan.title':
    'Sohbetlerini tek tek açmadan hepsini arşivler (claude.ai sekmesi gerekir)',
  'popup.autoCapture': 'Otomatik arşivle',
  'popup.hint': '“Bunu sormuştun” ipucu',
  'popup.note.onSite': 'Sohbet, sayfa açıkken otomatik kaydediliyor.',
  'popup.note.offSite': 'Arşivlemek için bir Claude ya da ChatGPT sohbeti aç.',
  'popup.saved': 'Arşivlendi: “{title}” ({count} mesaj)',
  'popup.notConversation': 'Bu sayfa bir sohbet değil.',
  'popup.noMessages': 'Sayfada mesaj bulunamadı.',
  'popup.unreachable': 'Sayfaya ulaşılamadı — sekmeyi yenileyip tekrar dene.',
  'popup.scanDone': '{added} yeni sohbet, {messages} mesaj arşivlendi.',
  'popup.scanFailed': 'Tarama başarısız: {error}',
  'popup.language': 'Dil',
  'lang.auto': 'Otomatik',
  'lang.tr': 'Türkçe',
  'lang.en': 'English',

  'archive.allChats': 'Tüm sohbetler',
  'archive.noFolder': 'Klasörsüz',
  'archive.newFolder': '+ Yeni klasör',
  'archive.folderName': 'Klasör adı',
  'archive.renameFolder': 'Yeni klasör adı',
  'archive.rename': 'Yeniden adlandır',
  'archive.delete': 'Sil',
  'archive.deleteFolderConfirm':
    '“{name}” klasörü silinsin mi? Sohbetler silinmez.',
  'archive.import': 'Geçmişi içe aktar',
  'archive.exportAll': 'Tümünü .md indir',
  'archive.search': 'Sohbetlerde ara…',
  'archive.filter.everywhere': 'Her yerde',
  'archive.filter.mine': 'Benim mesajlarımda',
  'archive.filter.theirs': 'Cevaplarda',
  'archive.filter.allTime': 'Tüm zamanlar',
  'archive.filter.7d': 'Son 7 gün',
  'archive.filter.30d': 'Son 30 gün',
  'archive.filter.1y': 'Son 1 yıl',
  'archive.filter.code': 'Kod içerenler',
  'archive.filter.allPlatforms': 'Tüm platformlar',
  'archive.count': '{count} sohbet',
  'archive.filtered': 'filtreli',
  'archive.messages': '{count} mesaj',
  'archive.noMatch': 'Eşleşen sohbet yok.',
  'archive.emptyLead':
    'Arşiv boş. Açtığın sohbetler buraya kendiliğinden düşer — ama eski geçmişini tek seferde de alabilirsin.',
  'archive.emptyCta': 'Geçmişini içe aktar',
  'archive.pickOne': 'Soldan bir sohbet seç.',
  'archive.openOriginal': 'Kaynağında aç',
  'archive.recovered': '{count} kurtarılan sürüm',
  'archive.pin': 'Sabitle',
  'archive.unpin': 'Sabiti kaldır',
  'archive.download': '.md indir',
  'archive.deleteConfirm': 'Bu sohbet arşivden silinsin mi?',
  'archive.role.user': 'Sen',
  'archive.role.assistant': 'Cevap',
  'archive.versions': '{count} önceki sürüm',
  'archive.versionChanged': '{date} tarihinde değişti',
  'archive.versionDelete': 'Bu sürümü sil',
  'archive.orphans': 'Silinmiş mesajlar',
  'archive.orphansLead':
    'Bu mesajlar sohbette artık yok — düzenleyip yeniden ürettiğinde silinmişler. Vestige onları saklıyor.',
  'archive.deletedOn': '{date} tarihinde silindi',

  'import.title': 'Claude geçmişini içe aktar',
  'import.step1':
    'claude.ai → Settings → Privacy → “Export data”. Anthropic arşivi e-postayla gönderiyor.',
  'import.step2': 'Gelen zip’i aç, içindeki conversations.json dosyasını al.',
  'import.step3': 'Dosyayı aşağıya bırak.',
  'import.drop': 'conversations.json dosyasını buraya bırak',
  'import.or': 'veya tıklayıp seç',
  'import.privacy':
    'Dosya cihazından çıkmaz — ayrıştırma da kayıt da bu sayfada yapılır.',
  'import.reading': '“{name}” okunuyor…',
  'import.progress': '{done} / {total} sohbet aktarıldı',
  'import.doneAdded': '{added} yeni sohbet, {messages} mesaj arşive eklendi.',
  'import.doneUpdated': '{count} sohbet güncellendi.',
  'import.doneSkipped': '{count} sohbet zaten arşivde olduğu için atlandı.',
  'import.back': 'Arşive dön',
  'import.retry': 'Tekrar dene',
  'import.close': 'Kapat',

  'hint.asked': 'Bunu {when} sormuştun · ',
  'hint.today': 'bugün',
  'hint.days': '{n} gün önce',
  'hint.months': '{n} ay önce',
  'hint.open': 'Aç',
  'hint.dismiss': 'Bu ipucunu gizle',
} as const;

export type MessageKey = keyof typeof TR;

const EN: Record<MessageKey, string> = {
  'app.name': 'Vestige',
  'app.tagline': 'AI chat archive',

  'platform.claude': 'Claude',
  'platform.chatgpt': 'ChatGPT',

  'popup.stat.conversations': 'chats',
  'popup.stat.messages': 'messages',
  'popup.stat.recovered': 'recovered',
  'popup.stat.recovered.title': 'Messages deleted upstream but kept here',
  'popup.archiveThis': 'Archive this chat',
  'popup.archiving': 'Archiving…',
  'popup.openArchive': 'Open archive',
  'popup.scanAll': 'Scan full history',
  'popup.scanning': 'Scanning: {done}/{total}',
  'popup.scan.title':
    'Archives every chat without opening them one by one (needs a claude.ai tab)',
  'popup.autoCapture': 'Auto-archive',
  'popup.hint': '“You asked this before” hint',
  'popup.note.onSite': 'This chat is being saved automatically.',
  'popup.note.offSite': 'Open a Claude or ChatGPT conversation to archive it.',
  'popup.saved': 'Archived: “{title}” ({count} messages)',
  'popup.notConversation': 'This page is not a conversation.',
  'popup.noMessages': 'No messages found on the page.',
  'popup.unreachable': 'Could not reach the page — reload the tab and retry.',
  'popup.scanDone': '{added} new chats, {messages} messages archived.',
  'popup.scanFailed': 'Scan failed: {error}',
  'popup.language': 'Language',
  'lang.auto': 'Automatic',
  'lang.tr': 'Türkçe',
  'lang.en': 'English',

  'archive.allChats': 'All chats',
  'archive.noFolder': 'No folder',
  'archive.newFolder': '+ New folder',
  'archive.folderName': 'Folder name',
  'archive.renameFolder': 'New folder name',
  'archive.rename': 'Rename',
  'archive.delete': 'Delete',
  'archive.deleteFolderConfirm':
    'Delete the folder “{name}”? Chats will be kept.',
  'archive.import': 'Import history',
  'archive.exportAll': 'Download all as .md',
  'archive.search': 'Search your chats…',
  'archive.filter.everywhere': 'Everywhere',
  'archive.filter.mine': 'In my messages',
  'archive.filter.theirs': 'In replies',
  'archive.filter.allTime': 'All time',
  'archive.filter.7d': 'Last 7 days',
  'archive.filter.30d': 'Last 30 days',
  'archive.filter.1y': 'Last year',
  'archive.filter.code': 'With code',
  'archive.filter.allPlatforms': 'All platforms',
  'archive.count': '{count} chats',
  'archive.filtered': 'filtered',
  'archive.messages': '{count} messages',
  'archive.noMatch': 'No matching chats.',
  'archive.emptyLead':
    'Your archive is empty. Chats you open land here automatically — or bring your whole history in at once.',
  'archive.emptyCta': 'Import your history',
  'archive.pickOne': 'Pick a chat on the left.',
  'archive.openOriginal': 'Open original',
  'archive.recovered': '{count} recovered versions',
  'archive.pin': 'Pin',
  'archive.unpin': 'Unpin',
  'archive.download': 'Download .md',
  'archive.deleteConfirm': 'Remove this chat from the archive?',
  'archive.role.user': 'You',
  'archive.role.assistant': 'Reply',
  'archive.versions': '{count} earlier versions',
  'archive.versionChanged': 'changed on {date}',
  'archive.versionDelete': 'Delete this version',
  'archive.orphans': 'Deleted messages',
  'archive.orphansLead':
    'These messages are gone from the conversation — they were dropped when you edited and regenerated. Vestige kept them.',
  'archive.deletedOn': 'deleted on {date}',

  'import.title': 'Import your Claude history',
  'import.step1':
    'claude.ai → Settings → Privacy → “Export data”. Anthropic emails you the archive.',
  'import.step2': 'Open the zip and grab conversations.json.',
  'import.step3': 'Drop the file below.',
  'import.drop': 'Drop conversations.json here',
  'import.or': 'or click to choose',
  'import.privacy':
    'The file never leaves your device — parsing and saving happen on this page.',
  'import.reading': 'Reading “{name}”…',
  'import.progress': '{done} / {total} chats imported',
  'import.doneAdded': '{added} new chats and {messages} messages added.',
  'import.doneUpdated': '{count} chats updated.',
  'import.doneSkipped': '{count} chats skipped — already archived.',
  'import.back': 'Back to archive',
  'import.retry': 'Try again',
  'import.close': 'Close',

  'hint.asked': 'You asked this {when} · ',
  'hint.today': 'today',
  'hint.days': '{n} days ago',
  'hint.months': '{n} months ago',
  'hint.open': 'Open',
  'hint.dismiss': 'Hide this hint',
};

const DICTS = { tr: TR as Record<MessageKey, string>, en: EN };

export function resolveLanguage(setting: Language): 'tr' | 'en' {
  if (setting === 'tr' || setting === 'en') return setting;
  const ui = navigator.language || 'en';
  return ui.toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export type Translate = (
  key: MessageKey,
  params?: Record<string, string | number>,
) => string;

export function makeTranslate(lang: 'tr' | 'en'): Translate {
  const dict = DICTS[lang];
  return (key, params) => {
    let out: string = dict[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        out = out.replaceAll(`{${k}}`, String(v));
      }
    }
    return out;
  };
}

/** React tarafı: ayar değişince kendiliğinden yeniden çevirir. */
export function useT(): { t: Translate; lang: 'tr' | 'en' } {
  const [lang, setLang] = useState<'tr' | 'en'>(() => resolveLanguage('auto'));

  useEffect(() => {
    void getSettings().then((s) => setLang(resolveLanguage(s.language)));
    return onSettingsChanged((s) => setLang(resolveLanguage(s.language)));
  }, []);

  return { t: makeTranslate(lang), lang };
}

/** Tarih/sayı biçimleri de dile uysun. */
export function locale(lang: 'tr' | 'en'): string {
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}
