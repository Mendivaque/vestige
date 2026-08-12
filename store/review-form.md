# İnceleme formu cevapları

Developer Dashboard → **Privacy practices** sekmesine birebir yapıştırılacak
metinler. Bu alanlar incelemenin en çok takıldığı yer: gerekçe belirsizse
eklenti reddediliyor. Her gerekçe "bu izin olmasa hangi özellik çalışmaz"
sorusunu doğrudan cevaplıyor.

## Single purpose (tek amaç)

```
Vestige archives the user's own Claude and ChatGPT conversations to local storage on their device, so they can search, organise and export them. Everything the extension does serves that single purpose.
```

## Permission justifications

### `storage`

```
Used to store the user's archived conversations and their preferences (interface language, whether automatic archiving and the reminder hint are enabled) in local browser storage. Without it the extension cannot keep an archive, which is its entire purpose. No data is transmitted off the device.
```

### Host permission — `https://claude.ai/*`

```
The extension reads the conversation the user currently has open on claude.ai in order to archive it locally, and reads the text the user is typing in order to show a reminder when they have asked a similar question before. When the user explicitly clicks "Scan full history", it also requests the user's own conversation list from claude.ai using their existing session, so past conversations can be archived without opening each one manually. This permission is required for the extension to work on Claude at all.
```

### Host permission — `https://chatgpt.com/*`

```
The extension reads the conversation the user currently has open on chatgpt.com in order to archive it locally, and reads the text the user is typing in order to show a reminder when they have asked a similar question before. This permission is required for the extension to work on ChatGPT at all.
```

## Data usage disclosures (onay kutuları)

Beyan edilecek veri türü: **hiçbiri.** Hiçbir kutuyu işaretleme.

Ardından üç sertifikasyon kutusunun üçünü de işaretle:

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes

Bunlar dürüstçe işaretlenebilir: eklenti hiçbir veri toplamıyor, hiçbir yere
göndermiyor.

## Beklenebilecek inceleme sorusu

Geniş host izni (`https://claude.ai/*`) tüm site için istendiğinden, incelemeci
"neden sadece sohbet sayfası değil?" diye sorabilir. Hazır cevap:

```
Claude and ChatGPT are single-page applications: the user navigates between the conversation list and individual conversations without a page load. A path-restricted content script would not run after in-app navigation, so the extension would silently stop archiving. The permission is limited to these two hosts and the extension reads nothing else.
```
