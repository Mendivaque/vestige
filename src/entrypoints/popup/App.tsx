import { useEffect, useState } from 'react';
import { useT } from '../../lib/i18n';
import {
  getScanState,
  IDLE_SCAN,
  SCAN_STATE_KEY,
  type CaptureResult,
  type ScanState,
  type Stats,
} from '../../lib/messaging';
import {
  DEFAULT_SETTINGS,
  getSettings,
  setSetting,
  type Language,
  type Settings,
} from '../../lib/settings';

type Site = 'claude' | 'chatgpt' | null;

export default function App() {
  const { t } = useT();
  const [stats, setStats] = useState<Stats>({
    conversations: 0,
    messages: 0,
    versions: 0,
  });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [scan, setScan] = useState<ScanState>(IDLE_SCAN);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [site, setSite] = useState<Site>(null);

  async function refreshStats() {
    const s = (await browser.runtime.sendMessage({ type: 'GET_STATS' })) as Stats;
    if (s) setStats(s);
  }

  useEffect(() => {
    void refreshStats();
    void getSettings().then(setSettings);
    void getScanState().then(setScan);

    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      const url = tab?.url ?? '';
      if (url.startsWith('https://claude.ai/')) setSite('claude');
      else if (url.startsWith('https://chatgpt.com/')) setSite('chatgpt');
    });

    // Tarama popup kapalıyken de sürüyor; durumu depodan izliyoruz.
    const listener = (changes: Record<string, { newValue?: unknown }>) => {
      const next = changes[SCAN_STATE_KEY]?.newValue as ScanState | undefined;
      if (next) {
        setScan(next);
        if (!next.running) void refreshStats();
      }
    };
    browser.storage.onChanged.addListener(listener as never);
    return () => browser.storage.onChanged.removeListener(listener as never);
  }, []);

  async function toggle<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings({ ...settings, [key]: value });
    await setSetting(key, value);
  }

  async function archiveCurrent() {
    setBusy(true);
    setNote('');
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('no tab');
      const res = (await browser.tabs.sendMessage(tab.id, {
        type: 'CAPTURE_NOW',
      })) as CaptureResult;

      if (res?.ok) {
        setNote(t('popup.saved', { title: res.title ?? '', count: res.messageCount ?? 0 }));
        await refreshStats();
      } else if (res?.reason === 'not-a-conversation') {
        setNote(t('popup.notConversation'));
      } else {
        setNote(t('popup.noMessages'));
      }
    } catch {
      setNote(t('popup.unreachable'));
    } finally {
      setBusy(false);
    }
  }

  async function scanAll() {
    setNote('');
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await browser.tabs.sendMessage(tab.id, { type: 'SCAN_ALL' });
  }

  const scanNote = scan.running
    ? t('popup.scanning', { done: scan.done, total: scan.total || '…' })
    : scan.error
      ? t('popup.scanFailed', { error: scan.error })
      : scan.finishedAt
        ? t('popup.scanDone', { added: scan.added, messages: scan.messages })
        : '';

  return (
    <div className="popup">
      <header>
        <h1>{t('app.name')}</h1>
        <span className="muted tagline">{t('app.tagline')}</span>
      </header>

      <div className="stats">
        <div className="stat">
          <b>{stats.conversations}</b>
          <span>{t('popup.stat.conversations')}</span>
        </div>
        <div className="stat">
          <b>{stats.messages}</b>
          <span>{t('popup.stat.messages')}</span>
        </div>
        <div className="stat" title={t('popup.stat.recovered.title')}>
          <b>{stats.versions}</b>
          <span>{t('popup.stat.recovered')}</span>
        </div>
      </div>

      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={archiveCurrent}
          disabled={busy || !site}
        >
          {busy ? t('popup.archiving') : t('popup.archiveThis')}
        </button>

        {site === 'claude' && (
          <button
            className="btn"
            onClick={scanAll}
            disabled={scan.running}
            title={t('popup.scan.title')}
          >
            {scan.running
              ? t('popup.scanning', { done: scan.done, total: scan.total || '…' })
              : t('popup.scanAll')}
          </button>
        )}

        <button
          className="btn"
          onClick={() =>
            void browser.tabs.create({ url: browser.runtime.getURL('/archive.html') })
          }
        >
          {t('popup.openArchive')}
        </button>
      </div>

      {scan.running && scan.total > 0 && (
        <div className="progress">
          <div
            className="progress-bar"
            style={{ width: `${(scan.done / scan.total) * 100}%` }}
          />
        </div>
      )}

      <div className="panel">
        <label className="row">
          <input
            type="checkbox"
            checked={settings.autoCapture}
            onChange={() => toggle('autoCapture', !settings.autoCapture)}
          />
          {t('popup.autoCapture')}
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={settings.hintEnabled}
            onChange={() => toggle('hintEnabled', !settings.hintEnabled)}
          />
          {t('popup.hint')}
        </label>
        <label className="row">
          <span className="muted">{t('popup.language')}</span>
          <select
            value={settings.language}
            onChange={(e) => toggle('language', e.target.value as Language)}
          >
            <option value="auto">{t('lang.auto')}</option>
            <option value="tr">{t('lang.tr')}</option>
            <option value="en">{t('lang.en')}</option>
          </select>
        </label>
      </div>

      <p className="note">
        {note ||
          scanNote ||
          (site ? t('popup.note.onSite') : t('popup.note.offSite'))}
      </p>
    </div>
  );
}
