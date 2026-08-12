# Vestige — Privacy Policy

_Last updated: 12 August 2026_

Vestige is a browser extension that archives your Claude and ChatGPT
conversations **on your own device**. This policy explains exactly what happens
to your data. It is short because very little happens to it.

## What we collect

**Nothing.** Vestige has no servers, no backend, no accounts, no analytics, no
telemetry, no crash reporting and no advertising or tracking code of any kind.
The developer cannot see your conversations, your settings, or even whether you
have installed the extension.

## What is stored, and where

Vestige stores the following in your browser's local storage (IndexedDB and
`chrome.storage.local`) on your own computer:

- Conversation titles, URLs, timestamps and message contents from chats you
  open on claude.ai and chatgpt.com
- Earlier versions of messages that were changed or removed upstream
- Folders you create and conversations you pin
- Your preferences (interface language, automatic archiving on/off, hint on/off)

This data never leaves your device. It is not synced, uploaded, backed up or
shared. Uninstalling the extension deletes it, and you can delete individual
conversations at any time from the archive page.

## Network requests

Vestige makes network requests to exactly one place: **claude.ai**, and only
when you press "Scan full history". Those requests go to Claude's own website,
using your existing browser session, to read your own conversation list — the
same data the Claude web app itself loads. No third party is contacted, and no
data is sent anywhere as part of this.

Importing a `conversations.json` export file is handled entirely in the page.
The file is read in your browser and written to local storage; it is not
uploaded.

## Permissions and why they are needed

- **`storage`** — to save your archive and preferences on your device.
- **Access to `claude.ai` and `chatgpt.com`** — to read the conversation
  currently open in your tab so it can be archived, and to show the "you asked
  this before" hint. The extension has no access to any other website.

## Remote code

Vestige does not download or execute any remote code. All logic ships inside
the extension package.

## Data sold or transferred

None. There is nothing to sell or transfer, because no data is collected.

## Children

Vestige is a general-purpose productivity tool and is not directed at children
under 13.

## Changes

If this policy changes, the updated version will be published at the same URL
with a new "last updated" date.

## Contact

Questions or reports: open an issue on the project's GitHub repository, or
email the address listed on the Chrome Web Store listing.
