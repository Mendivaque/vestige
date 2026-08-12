import Dexie, { type Table } from 'dexie';
import type { Conversation, Folder, Message, MessageVersion } from './types';

export class VestigeDB extends Dexie {
  conversations!: Table<Conversation, string>;
  messages!: Table<Message, number>;
  versions!: Table<MessageVersion, number>;
  folders!: Table<Folder, number>;

  constructor() {
    super('vestige');
    this.version(1).stores({
      conversations: 'id, platform, title, updatedAt, folderId, pinned',
      messages: '++id, conversationId, [conversationId+index]',
      versions: '++id, conversationId, [conversationId+index]',
      folders: '++id, name',
    });
  }
}

export const db = new VestigeDB();
