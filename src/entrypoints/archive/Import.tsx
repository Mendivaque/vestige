import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n';
import { ImportFormatError, parseClaudeExport } from '../../lib/import-claude';
import { importConversations, type ImportSummary } from '../../lib/repo';

type State =
  | { kind: 'idle' }
  | { kind: 'reading'; name: string }
  | { kind: 'importing'; done: number; total: number }
  | { kind: 'done'; summary: ImportSummary; warnings: string[] }
  | { kind: 'error'; message: string };

/**
 * Claude'un resmî dışa aktarımını içeri alır.
 * Ayrıştırma ve yazma bu sayfada (eklenti origin'i) olur — dosya hiçbir yere
 * gönderilmez, background'a bile.
 */
export default function Import({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.kind !== 'importing') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.kind, onClose]);

  async function handleFile(file: File) {
    setState({ kind: 'reading', name: file.name });
    try {
      const { conversations, warnings } = parseClaudeExport(await file.text());

      setState({ kind: 'importing', done: 0, total: conversations.length });
      const summary = await importConversations(conversations, (p) =>
        setState({ kind: 'importing', done: p.done, total: p.total }),
      );
      setState({ kind: 'done', summary, warnings });
    } catch (e) {
      setState({
        kind: 'error',
        message:
          e instanceof ImportFormatError ? e.message : `${String(e)}`,
      });
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => state.kind !== 'importing' && onClose()}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('import.title')}</h2>

        {state.kind === 'idle' && (
          <>
            <ol className="steps muted">
              <li>{t('import.step1')}</li>
              <li>{t('import.step2')}</li>
              <li>{t('import.step3')}</li>
            </ol>

            <div
              className={`dropzone${dragging ? ' over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <b>{t('import.drop')}</b>
              <span className="muted">{t('import.or')}</span>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />

            <p className="muted fineprint">{t('import.privacy')}</p>
          </>
        )}

        {state.kind === 'reading' && (
          <p className="muted">{t('import.reading', { name: state.name })}</p>
        )}

        {state.kind === 'importing' && (
          <>
            <p className="muted">
              {t('import.progress', { done: state.done, total: state.total })}
            </p>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${(state.done / Math.max(1, state.total)) * 100}%` }}
              />
            </div>
          </>
        )}

        {state.kind === 'done' && (
          <>
            <p>
              {t('import.doneAdded', {
                added: state.summary.added,
                messages: state.summary.messages,
              })}
              {state.summary.updated > 0 &&
                ` ${t('import.doneUpdated', { count: state.summary.updated })}`}
              {state.summary.skipped > 0 &&
                ` ${t('import.doneSkipped', { count: state.summary.skipped })}`}
            </p>
            {state.warnings.map((w) => (
              <p key={w} className="muted">
                {w}
              </p>
            ))}
            <button className="btn btn-primary" onClick={onClose}>
              {t('import.back')}
            </button>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <p className="error">{state.message}</p>
            <button className="btn" onClick={() => setState({ kind: 'idle' })}>
              {t('import.retry')}
            </button>
          </>
        )}

        {state.kind !== 'importing' && state.kind !== 'done' && (
          <button className="modal-close" onClick={onClose} title={t('import.close')}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
