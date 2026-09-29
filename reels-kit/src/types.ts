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
  /** Kamera hareketinin şiddeti. 1 = tam punch-in (%34'e kadar), 0.3 = hafif (≈%10). */
  cameraIntensity?: number;
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
  /** 'framed': çerçeveli düzen (üstte konu paneli, ortada çerçeveli video, altta hesap şeridi). 'full': tam ekran video. */
  layout?: 'full' | 'framed';
  frame?: { topic: string; kicker?: string; handle: string; platform?: string };
  /** Boşsa crewupa teması. 'minimal' için prepare.mjs --theme minimal */
  theme?: import('./lib/theme').Theme;
  /** Boş bırakılırsa sağ üstte marka yazısı çıkmaz */
  brand: { wordmark: string; url?: string };
};
