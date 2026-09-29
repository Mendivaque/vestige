/** Konuşmadaki tek bir kelime (saniye cinsinden zaman damgalı). */
export type Word = { text: string; start: number; end: number; emphasis?: boolean };

/** Kamera anahtar karesi: t anında bu duruma varılır. x/y çerçevenin yüzdesi (0.02 = %2). */
export type CamKey = { t: number; scale: number; x?: number; y?: number; rot?: number; ease?: 'inOut' | 'out' | 'linear' };

/** Ana videonun üstüne giren ek görüntü (ör. Higgsfield'da üretilen farklı açı). */
export type Cutaway = { src: string; from: number; to: number; layout: 'full' | 'pip'; startFrom?: number; mute?: boolean };

/** Buve'nin köşeden çıkıp tepki verdiği an. */
export type BuvePop = { t: number; dur: number; side: 'left' | 'right' };

export type ReelProps = {
  /** public/ altındaki dosya adı */
  video: string;
  durationSec: number;
  fps: number;
  videoWidth: number;
  videoHeight: number;
  /** Yüzün/konunun konumu (0..1). Kırpma ve zoom bu noktaya odaklanır. */
  focus: { x: number; y: number };
  words: Word[];
  /** Elle kamera anahtarları. Boşsa ve autoCamera açıksa otomatik üretilir. */
  camera: CamKey[];
  autoCamera: boolean;
  /** Kesim anlarında whoosh sesi */
  sfx: boolean;
  hook?: { text: string; sub?: string; duration: number };
  speaker?: { name: string; role?: string; from: number; duration: number };
  cutaways: Cutaway[];
  buve: BuvePop[];
  music?: { src: string; volume: number; duck: number };
  captionStyle: 'pill' | 'outline';
  /** Altyazının dikey konumu (0..1). 0.66 ≈ alttaki arayüzün üstü */
  captionY: number;
  brand: { wordmark: string; url?: string };
};
