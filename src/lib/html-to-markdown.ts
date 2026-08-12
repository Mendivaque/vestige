/**
 * Mesaj HTML'ini Markdown'a çeviren küçük dönüştürücü.
 * Amaç eksiksiz bir HTML→MD motoru değil; sohbetlerde gerçekten görülen
 * yapıları (başlık, liste, kod bloğu, inline kod, kalın/italik, link, tablo,
 * alıntı) kayıpsız taşımak.
 */

const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'UL',
  'OL',
  'LI',
  'PRE',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TABLE',
  'HR',
]);

interface Ctx {
  /** İç içe liste girintisi. */
  indent: string;
  /** Sıralı liste ise sıradaki numara. */
  listType?: 'ul' | 'ol';
  listIndex?: number;
}

export function htmlToMarkdown(root: HTMLElement): string {
  const out = renderChildren(root, { indent: '' });
  return normalize(out);
}

function renderChildren(el: Node, ctx: Ctx): string {
  let out = '';
  el.childNodes.forEach((child) => {
    out += renderNode(child, ctx);
  });
  return out;
}

function renderNode(node: Node, ctx: Ctx): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\s+/g, ' ');
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName;

  // Görünmeyen / işlevsel öğeler (kopyala butonu, dil etiketi vs.) atlanır.
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'BUTTON' || tag === 'SVG')
    return '';
  if (el.getAttribute('aria-hidden') === 'true') return '';

  switch (tag) {
    case 'BR':
      return '\n';
    case 'HR':
      return '\n\n---\n\n';

    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6': {
      const level = Number(tag[1]);
      return `\n\n${'#'.repeat(level)} ${inline(el, ctx)}\n\n`;
    }

    case 'STRONG':
    case 'B':
      return wrapInline(inline(el, ctx), '**');
    case 'EM':
    case 'I':
      return wrapInline(inline(el, ctx), '*');
    case 'DEL':
    case 'S':
      return wrapInline(inline(el, ctx), '~~');

    case 'CODE': {
      // <pre><code> zaten PRE tarafında ele alınıyor.
      if (el.parentElement?.tagName === 'PRE') return el.textContent ?? '';
      const text = (el.textContent ?? '').trim();
      if (!text) return '';
      const fence = text.includes('`') ? '``' : '`';
      return `${fence}${text}${fence}`;
    }

    case 'PRE': {
      const codeEl = el.querySelector('code');
      const lang = detectLanguage(codeEl ?? el);
      const code = (codeEl ?? el).textContent ?? '';
      return `\n\n\`\`\`${lang}\n${code.replace(/\n+$/, '')}\n\`\`\`\n\n`;
    }

    case 'A': {
      const href = el.getAttribute('href') ?? '';
      const text = inline(el, ctx).trim();
      if (!text) return '';
      return href ? `[${text}](${href})` : text;
    }

    case 'IMG': {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? 'görsel';
      return src ? `![${alt}](${src})` : '';
    }

    case 'BLOCKQUOTE': {
      const inner = normalize(renderChildren(el, ctx));
      const quoted = inner
        .split('\n')
        .map((l) => `> ${l}`.trimEnd())
        .join('\n');
      return `\n\n${quoted}\n\n`;
    }

    case 'UL':
    case 'OL': {
      const listType = tag === 'UL' ? 'ul' : 'ol';
      const items = Array.from(el.children).filter(
        (c) => c.tagName === 'LI',
      ) as HTMLElement[];
      const rendered = items
        .map((li, i) => {
          const marker = listType === 'ul' ? '- ' : `${i + 1}. `;
          const body = normalize(
            renderChildren(li, {
              indent: ctx.indent + ' '.repeat(marker.length),
              listType,
            }),
          );
          const [first, ...rest] = body.split('\n');
          const tail = rest
            .map((l) => (l ? ctx.indent + ' '.repeat(marker.length) + l : ''))
            .join('\n');
          return `${ctx.indent}${marker}${first}${tail ? '\n' + tail : ''}`;
        })
        .join('\n');
      return `\n\n${rendered}\n\n`;
    }

    case 'TABLE':
      return `\n\n${renderTable(el, ctx)}\n\n`;

    case 'P':
      return `\n\n${inline(el, ctx)}\n\n`;

    default: {
      const inner = renderChildren(el, ctx);
      return BLOCK_TAGS.has(tag) ? `\n\n${inner}\n\n` : inner;
    }
  }
}

function inline(el: HTMLElement, ctx: Ctx): string {
  return renderChildren(el, ctx).trim();
}

function wrapInline(text: string, marker: string): string {
  if (!text.trim()) return '';
  // Baştaki/sondaki boşluğu işaretin dışında bırak ki `** kalın **` olmasın.
  const lead = /^\s/.test(text) ? ' ' : '';
  const trail = /\s$/.test(text) ? ' ' : '';
  return `${lead}${marker}${text.trim()}${marker}${trail}`;
}

function detectLanguage(el: Element): string {
  const cls = el.className || '';
  const m = /language-([\w+#-]+)/.exec(String(cls));
  return m?.[1] ?? '';
}

function renderTable(table: HTMLElement, ctx: Ctx): string {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0) return '';
  const cells = rows.map((tr) =>
    Array.from(tr.querySelectorAll('th,td')).map((td) =>
      inline(td as HTMLElement, ctx).replace(/\|/g, '\\|').replace(/\n/g, ' '),
    ),
  );
  const width = Math.max(...cells.map((r) => r.length));
  const pad = (r: string[]) =>
    `| ${Array.from({ length: width }, (_, i) => r[i] ?? '').join(' | ')} |`;
  const [head = [], ...body] = cells;
  const divider = `| ${Array.from({ length: width }, () => '---').join(' | ')} |`;
  return [pad(head), divider, ...body.map(pad)].join('\n');
}

/** Fazla boşluk/satırları toparlar. */
function normalize(md: string): string {
  return md
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
