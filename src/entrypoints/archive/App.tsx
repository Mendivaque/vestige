import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import {
  conversationToMarkdown,
  conversationsToMarkdown,
  downloadMarkdown,
  type ExportLabels,
} from '../../lib/export-markdown';
import { locale, useT, type Translate } from '../../lib/i18n';
import {
  createFolder,
  deleteConversation,
  deleteFolder,
  deleteVersion,
  getMessages,
  getVersions,
  listConversations,
  listFolders,
  renameFolder,
  setFolder,
  togglePin,
} from '../../lib/repo';
import type {
  Conversation,
  Message,
  MessageVersion,
  Platform,
  SearchFilters,
} from '../../lib/types';
import Import from './Import';

type FolderFilter = number | null | 'all';
type RoleFilter = 'all' | 'user' | 'assistant';
type DateFilter = 'all' | '7d' | '30d' | '1y';

export default function App() {
  const { t, lang } = useT();
  const [query, setQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [platform, setPlatform] = useState<Platform | 'all'>('all');
  const [role, setRole] = useState<RoleFilter>('all');
  const [hasCode, setHasCode] = useState(false);
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const filters: SearchFilters = useMemo(
    () => ({
      query,
      folderId: folderFilter,
      platform,
      role,
      hasCode,
      from: rangeStart(dateRange),
    }),
    [query, folderFilter, platform, role, hasCode, dateRange],
  );

  const folders = useLiveQuery(() => listFolders(), [], []);
  const conversations = useLiveQuery(() => listConversations(filters), [filters], []);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  const labels = useMemo(() => exportLabels(t, lang), [t, lang]);

  // Adres çubuğundaki #id ile aç (sohbet içindeki ipucundan gelen bağlantı).
  useEffect(() => {
    const fromHash = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (fromHash) setSelectedId(fromHash);
  }, []);

  useEffect(() => {
    if (!selectedId && conversations[0]) setSelectedId(conversations[0].id);
  }, [conversations, selectedId]);

  const filtersActive =
    role !== 'all' ||
    hasCode ||
    dateRange !== 'all' ||
    folderFilter !== 'all' ||
    platform !== 'all';

  async function exportAll() {
    if (conversations.length === 0) return;
    downloadMarkdown(
      `vestige-${today()}.md`,
      await conversationsToMarkdown(conversations, labels),
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            {t('app.name')}
            <span className="muted brand-sub">{t('app.tagline')}</span>
          </span>
        </div>

        <nav className="folders">
          <FolderButton
            active={folderFilter === 'all'}
            onClick={() => setFolderFilter('all')}
            label={t('archive.allChats')}
          />
          <FolderButton
            active={folderFilter === null}
            onClick={() => setFolderFilter(null)}
            label={t('archive.noFolder')}
          />
          {folders.map((f) => (
            <FolderButton
              key={f.id}
              active={folderFilter === f.id}
              onClick={() => setFolderFilter(f.id!)}
              label={f.name}
              renameTitle={t('archive.rename')}
              deleteTitle={t('archive.delete')}
              onRename={async () => {
                const name = prompt(t('archive.renameFolder'), f.name);
                if (name?.trim()) await renameFolder(f.id!, name);
              }}
              onDelete={async () => {
                if (confirm(t('archive.deleteFolderConfirm', { name: f.name }))) {
                  if (folderFilter === f.id) setFolderFilter('all');
                  await deleteFolder(f.id!);
                }
              }}
            />
          ))}
        </nav>

        <button
          className="btn ghost"
          onClick={async () => {
            const name = prompt(t('archive.folderName'));
            if (name?.trim()) await createFolder(name);
          }}
        >
          {t('archive.newFolder')}
        </button>

        <div className="sidebar-foot">
          <button className="btn" onClick={() => setImporting(true)}>
            {t('archive.import')}
          </button>
          <button className="btn" onClick={exportAll} disabled={conversations.length === 0}>
            {t('archive.exportAll')}
          </button>
        </div>
      </aside>

      <section className="list">
        <input
          className="search"
          placeholder={t('archive.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="filters">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform | 'all')}
          >
            <option value="all">{t('archive.filter.allPlatforms')}</option>
            <option value="claude">{t('platform.claude')}</option>
            <option value="chatgpt">{t('platform.chatgpt')}</option>
          </select>

          <select value={role} onChange={(e) => setRole(e.target.value as RoleFilter)}>
            <option value="all">{t('archive.filter.everywhere')}</option>
            <option value="user">{t('archive.filter.mine')}</option>
            <option value="assistant">{t('archive.filter.theirs')}</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateFilter)}
          >
            <option value="all">{t('archive.filter.allTime')}</option>
            <option value="7d">{t('archive.filter.7d')}</option>
            <option value="30d">{t('archive.filter.30d')}</option>
            <option value="1y">{t('archive.filter.1y')}</option>
          </select>

          <label className={`chip${hasCode ? ' on' : ''}`}>
            <input
              type="checkbox"
              checked={hasCode}
              onChange={(e) => setHasCode(e.target.checked)}
            />
            {t('archive.filter.code')}
          </label>
        </div>

        <div className="list-meta muted">
          {t('archive.count', { count: conversations.length })}
          {query ? ` · “${query}”` : ''}
          {filtersActive && !query ? ` · ${t('archive.filtered')}` : ''}
        </div>

        <div className="list-items">
          {conversations.map((c) => (
            <button
              key={c.id}
              className={`item${c.id === selectedId ? ' active' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="item-title">
                {c.pinned ? <span className="pin">📌</span> : null}
                {c.title}
              </div>
              <div className="item-preview muted">{c.snippet ?? c.preview}</div>
              <div className="item-foot">
                <span className={`badge ${c.platform}`}>{t(`platform.${c.platform}`)}</span>
                <span className="muted">
                  {new Date(c.updatedAt).toLocaleDateString(locale(lang))} ·{' '}
                  {t('archive.messages', { count: c.messageCount })}
                </span>
              </div>
            </button>
          ))}

          {conversations.length === 0 &&
            (query || filtersActive ? (
              <p className="empty muted">{t('archive.noMatch')}</p>
            ) : (
              <div className="empty">
                <p className="muted">{t('archive.emptyLead')}</p>
                <button className="btn btn-primary" onClick={() => setImporting(true)}>
                  {t('archive.emptyCta')}
                </button>
              </div>
            ))}
        </div>
      </section>

      <main className="detail">
        {selected ? (
          <Detail
            key={selected.id}
            conversation={selected}
            folders={folders}
            labels={labels}
            onDeleted={() => setSelectedId(null)}
          />
        ) : (
          <p className="empty muted">{t('archive.pickOne')}</p>
        )}
      </main>

      {importing && <Import onClose={() => setImporting(false)} />}
    </div>
  );
}

function FolderButton({
  active,
  label,
  onClick,
  onRename,
  onDelete,
  renameTitle,
  deleteTitle,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  renameTitle?: string;
  deleteTitle?: string;
}) {
  return (
    <div className={`folder${active ? ' active' : ''}`}>
      <button className="folder-main" onClick={onClick}>
        {label}
      </button>
      {onRename && (
        <span className="folder-actions">
          <button title={renameTitle} onClick={onRename}>
            ✎
          </button>
          <button title={deleteTitle} onClick={onDelete}>
            ✕
          </button>
        </span>
      )}
    </div>
  );
}

function Detail({
  conversation,
  folders,
  labels,
  onDeleted,
}: {
  conversation: Conversation;
  folders: Array<{ id?: number; name: string }>;
  labels: ExportLabels;
  onDeleted: () => void;
}) {
  const { t, lang } = useT();
  const messages = useLiveQuery(
    () => getMessages(conversation.id),
    [conversation.id],
    [] as Message[],
  );
  const versions = useLiveQuery(
    () => getVersions(conversation.id),
    [conversation.id],
    [] as MessageVersion[],
  );

  const versionsByIndex = useMemo(() => {
    const map = new Map<number, MessageVersion[]>();
    for (const v of versions) {
      const list = map.get(v.index) ?? [];
      list.push(v);
      map.set(v.index, list);
    }
    return map;
  }, [versions]);

  // Sohbetin sonundan silinmiş mesajlar artık hiçbir mesaja denk gelmiyor.
  const orphanVersions = versions.filter((v) => v.index >= messages.length);
  const assistantLabel = conversation.platform === 'claude' ? 'Claude' : 'ChatGPT';

  return (
    <>
      <header className="detail-head">
        <div className="detail-heading">
          <h1>{conversation.title}</h1>
          <div className="muted detail-sub">
            <span className={`badge ${conversation.platform}`}>{assistantLabel}</span>
            {new Date(conversation.updatedAt).toLocaleString(locale(lang))} ·{' '}
            {t('archive.messages', { count: conversation.messageCount })} ·{' '}
            <a href={conversation.url} target="_blank" rel="noreferrer">
              {t('archive.openOriginal')}
            </a>
            {versions.length > 0 && (
              <>
                {' · '}
                <b className="recovered">
                  {t('archive.recovered', { count: versions.length })}
                </b>
              </>
            )}
          </div>
        </div>

        <div className="detail-actions">
          <select
            value={conversation.folderId ?? ''}
            onChange={(e) =>
              setFolder(
                conversation.id,
                e.target.value === '' ? null : Number(e.target.value),
              )
            }
          >
            <option value="">{t('archive.noFolder')}</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <button className="btn" onClick={() => togglePin(conversation.id)}>
            {conversation.pinned ? t('archive.unpin') : t('archive.pin')}
          </button>

          <button
            className="btn btn-primary"
            onClick={async () =>
              downloadMarkdown(
                `${conversation.title}.md`,
                await conversationToMarkdown(conversation, labels),
              )
            }
          >
            {t('archive.download')}
          </button>

          <button
            className="btn"
            onClick={async () => {
              if (confirm(t('archive.deleteConfirm'))) {
                await deleteConversation(conversation.id);
                onDeleted();
              }
            }}
          >
            {t('archive.delete')}
          </button>
        </div>
      </header>

      <div className="messages">
        {messages.map((m) => (
          <article key={m.id} className={`msg ${m.role}`}>
            <div className="msg-role muted">
              {m.role === 'user' ? t('archive.role.user') : assistantLabel}
            </div>
            <div className="msg-body">{m.content}</div>
            <Versions items={versionsByIndex.get(m.index) ?? []} />
          </article>
        ))}

        {orphanVersions.length > 0 && (
          <section className="orphans">
            <h2>{t('archive.orphans')}</h2>
            <p className="muted">{t('archive.orphansLead')}</p>
            {orphanVersions.map((v) => (
              <article key={v.id} className={`msg ${v.role}`}>
                <div className="msg-role muted">
                  {v.role === 'user' ? t('archive.role.user') : assistantLabel} ·{' '}
                  {t('archive.deletedOn', {
                    date: new Date(v.supersededAt).toLocaleDateString(locale(lang)),
                  })}
                </div>
                <div className="msg-body">{v.content}</div>
              </article>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

function Versions({ items }: { items: MessageVersion[] }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="versions">
      <button className="versions-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▾' : '▸'} {t('archive.versions', { count: items.length })}
      </button>
      {open &&
        items.map((v) => (
          <div key={v.id} className="version">
            <div className="muted version-head">
              {t('archive.versionChanged', {
                date: new Date(v.supersededAt).toLocaleString(locale(lang)),
              })}
              <button
                onClick={() => deleteVersion(v.id!)}
                title={t('archive.versionDelete')}
              >
                ✕
              </button>
            </div>
            <div className="msg-body">{v.content}</div>
          </div>
        ))}
    </div>
  );
}

function exportLabels(t: Translate, lang: 'tr' | 'en'): ExportLabels {
  return {
    user: t('archive.role.user'),
    assistant: t('archive.role.assistant'),
    source: lang === 'tr' ? 'Kaynak' : 'Source',
    updated: lang === 'tr' ? 'Son güncelleme' : 'Last updated',
    messageCount: lang === 'tr' ? 'Mesaj sayısı' : 'Messages',
    locale: locale(lang),
  };
}

function rangeStart(range: DateFilter): number | undefined {
  const day = 86_400_000;
  switch (range) {
    case '7d':
      return Date.now() - 7 * day;
    case '30d':
      return Date.now() - 30 * day;
    case '1y':
      return Date.now() - 365 * day;
    default:
      return undefined;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
