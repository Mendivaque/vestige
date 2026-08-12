/**
 * "Bunu daha önce sormuştun" ipucu.
 *
 * Sayfaya karışmamak için Shadow DOM içinde, composer'ın hemen üstünde
 * konumlanan sabit (fixed) bir şerit. Claude'un kendi DOM'una hiçbir şey
 * enjekte etmiyoruz — layout'unu bozma riski yok.
 */
import type { Translate } from './i18n';
import type { SimilarHit } from './types';

const HOST_ID = 'vestige-hint-host';

export interface HintHandlers {
  translate: Translate;
  onOpen: (hit: SimilarHit) => void;
  onDisable: () => void;
}

export class HintBar {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private bar: HTMLElement;
  private current: SimilarHit | null = null;
  private anchor: HTMLElement | null = null;
  private dismissed = new Set<string>();

  constructor(private handlers: HintHandlers) {
    this.host = document.getElementById(HOST_ID) ?? document.createElement('div');
    this.host.id = HOST_ID;
    this.host.style.cssText =
      'position:fixed;z-index:2147483000;display:none;pointer-events:none;';
    if (!this.host.isConnected) document.body.appendChild(this.host);

    this.shadow = this.host.shadowRoot ?? this.host.attachShadow({ mode: 'open' });
    this.shadow.innerHTML = `
      <style>
        .bar {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 100%;
          padding: 7px 10px 7px 12px;
          border-radius: 10px;
          border: 1px solid rgba(217, 119, 87, 0.45);
          background: #251e18;
          color: #f2e9df;
          font: 13px/1.4 ui-sans-serif, system-ui, 'Segoe UI', sans-serif;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
        }
        @media (prefers-color-scheme: light) {
          .bar { background: #fff; color: #241d17; border-color: rgba(194,95,60,.4); }
        }
        .icon { flex: none; opacity: .9; }
        .text { flex: 1; min-width: 0; }
        .lead { color: #a4948a; font-size: 12px; }
        .q {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        button {
          flex: none;
          font: inherit;
          border: none;
          background: none;
          color: inherit;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 7px;
        }
        .open { background: #d97757; color: #fff; }
        .open:hover { filter: brightness(1.08); }
        .close { color: #a4948a; padding: 4px 6px; }
        .close:hover { color: inherit; }
      </style>
      <div class="bar">
        <span class="icon">🕮</span>
        <span class="text">
          <span class="lead"></span>
          <b class="q"></b>
        </span>
        <button class="open" type="button"></button>
        <button class="close" type="button">✕</button>
      </div>
    `;

    this.bar = this.shadow.querySelector('.bar')!;

    this.shadow.querySelector('.open')!.addEventListener('click', () => {
      if (this.current) this.handlers.onOpen(this.current);
      this.hide();
    });

    this.shadow.querySelector('.close')!.addEventListener('click', (e) => {
      // Shift+tıklama: ipucunu tamamen kapat.
      if ((e as MouseEvent).shiftKey) this.handlers.onDisable();
      if (this.current) this.dismissed.add(this.current.conversationId);
      this.hide();
    });

    window.addEventListener('resize', () => this.reposition(), { passive: true });
    window.addEventListener('scroll', () => this.reposition(), { passive: true });
  }

  show(hit: SimilarHit, anchor: HTMLElement): void {
    if (this.dismissed.has(hit.conversationId)) return;
    this.current = hit;
    this.anchor = anchor;

    const t = this.handlers.translate;
    const days = Math.floor((Date.now() - hit.askedAt) / 86_400_000);
    const when =
      days < 1
        ? t('hint.today')
        : days < 30
          ? t('hint.days', { n: days })
          : t('hint.months', { n: Math.floor(days / 30) });

    this.shadow.querySelector('.open')!.textContent = t('hint.open');
    this.shadow.querySelector('.close')!.setAttribute('title', t('hint.dismiss'));
    this.shadow.querySelector('.lead')!.textContent = t('hint.asked', { when });
    this.shadow.querySelector('.q')!.textContent = hit.question;
    this.host.style.display = 'block';
    this.reposition();
  }

  hide(): void {
    this.current = null;
    this.host.style.display = 'none';
  }

  get visibleFor(): string | null {
    return this.current?.conversationId ?? null;
  }

  private reposition(): void {
    if (!this.anchor || this.host.style.display === 'none') return;
    const r = this.anchor.getBoundingClientRect();
    if (r.width === 0) {
      this.hide();
      return;
    }
    this.host.style.left = `${r.left}px`;
    this.host.style.width = `${r.width}px`;
    this.host.style.top = `${Math.max(8, r.top - this.bar.offsetHeight - 8)}px`;
  }
}
