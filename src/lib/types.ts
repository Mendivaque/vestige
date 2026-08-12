/** Desteklenen platformlar. MVP'de sadece 'claude'; 'chatgpt' ileride açılacak. */
export type Platform = 'claude' | 'chatgpt';

export type Role = 'user' | 'assistant';

export interface Conversation {
  /** `${platform}:${externalId}` — platformlar arası çakışmasın diye. */
  id: string;
  platform: Platform;
  /** Platformun kendi sohbet id'si (URL'den). */
  externalId: string;
  title: string;
  url: string;
  /** Arşive ilk eklendiği an. */
  createdAt: number;
  /** Son yakalamada güncellendiği an. */
  updatedAt: number;
  folderId: number | null;
  pinned: 0 | 1;
  messageCount: number;
  /** Listede gösterilecek kısa önizleme (ilk kullanıcı mesajı). */
  preview: string;
  /**
   * Kaynaktaki (platformdaki) son güncellenme zamanı. Tüm geçmişi tararken
   * değişmemiş sohbetleri tekrar indirmemek için kullanılır.
   */
  sourceUpdatedAt?: number;
}

export interface Message {
  id?: number;
  conversationId: string;
  /** Sohbet içindeki sıra (0'dan başlar). */
  index: number;
  role: Role;
  /** Markdown'a çevrilmiş mesaj içeriği. */
  content: string;
}

/**
 * Üzerine yazılmış eski mesaj sürümü.
 * Claude'da bir mesajı düzenleyip yeniden ürettiğinde eski cevap kaybolur;
 * biz onu buraya alıp kurtarılabilir tutuyoruz.
 */
export interface MessageVersion {
  id?: number;
  conversationId: string;
  index: number;
  role: Role;
  content: string;
  /** Bu sürümün yerini yenisine bıraktığı an. */
  supersededAt: number;
}

export interface Folder {
  id?: number;
  name: string;
  createdAt: number;
}

/** Content script'in sayfadan çıkardığı ham sohbet. */
export interface CapturedConversation {
  platform: Platform;
  externalId: string;
  title: string;
  url: string;
  messages: Array<Pick<Message, 'role' | 'content'>>;
}

/** Arşiv sayfasındaki arama + filtreler. */
export interface SearchFilters {
  query?: string;
  folderId?: number | null | 'all';
  platform?: Platform | 'all';
  /** Aramanın hangi rolde geçmesini istiyoruz. */
  role?: 'all' | 'user' | 'assistant';
  /** Sadece kod bloğu içeren sohbetler. */
  hasCode?: boolean;
  /** Zaman aralığı (updatedAt). */
  from?: number;
  to?: number;
}

/** Liste sonucundaki sohbet + arama eşleşmesinden kısa alıntı. */
export interface ConversationHit extends Conversation {
  snippet?: string;
}

/** "Bunu daha önce sormuştun" ipucu için bulunan eşleşme. */
export interface SimilarHit {
  conversationId: string;
  title: string;
  question: string;
  url: string;
  askedAt: number;
  score: number;
}
