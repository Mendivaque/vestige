# Vestige — Claude Sohbet Arşivi (Chrome Eklentisi)

> Proje bağlamı ve alınan kararlar. Bu projede çalışırken buraya sadık kal.

## Ne yapıyoruz

**Claude (claude.ai)** sohbetlerini kullanıcının cihazında arşivleyen bir
**Chrome eklentisi** (Manifest V3). Veri tamamen yerelde (IndexedDB); hiçbir
sunucuya istek gitmiyor.

**Ad:** Vestige ("geriye kalan iz"). Chrome Web Store'da boş olduğu
doğrulandı (2026-08-12). Elenen adlar — hepsi mağazada dolu: ChatVault,
Mneme, Chatlas, thredly, Anamne, Hindsight, Marginalia, Rekall, Priorly.

## Konumlanma — bu kısım kritik

Mağazadaki rakiplerin neredeyse tamamı **exporter**: kullanıcı bir sohbeti
açar, PDF/MD olarak indirir, iş biter. Hiçbiri veri *saklamaz*. O kategori
doymuş; oraya girmiyoruz.

En yakın gerçek rakip **Anamne** (yerel arşiv + Obsidian senkron). Yani
"local-first arşiv" artık farklılaştırıcı değil, masaya giriş bileti.

Bizim üç ayağımız:

1. **Otomatik yakalama.** Kullanıcı "kaydet" demek zorunda değil. Sayfa
   açıkken sessizce birikir. Rakiplerin hiçbiri bunu yapmıyor.
2. **Silinen cevap kurtarma.** Her yakalama bir anlık görüntü. Claude'da bir
   mesajı düzenleyip yeniden ürettiğinde kaybolan eski cevap `versions`
   tablosunda kalır ve arşivde "kurtarılan sürüm" olarak görünür.
3. **"Bunu sormuştun" ipucu.** Kullanıcı claude.ai'da yeni soru yazarken,
   arşivde benzer bir soru varsa composer'ın üstünde tek satırlık sessiz bir
   şerit çıkar. Arşivi ölü depo olmaktan çıkaran, kimsede olmayan parça.
   Pazarlama cümlesi: **"AI'ına aynı şeyi iki kez sorma."**

Export bizde bir *özellik*, ürün değil — ama ASO için o anahtar kelimeleri
(export claude chat, claude chat history) yine de toplarız.

## Kapsam kararları

- **Claude + ChatGPT.** ChatGPT bir ara kapsam dışına alınmıştı, geri geldi.
  Yakalama katmanı platformdan bağımsız (`lib/capture/dom.ts` +
  `lib/content-runner.ts`); yeni platform eklemek `selectors.ts`'e bir girdi
  ve bir content script demek.
- **Tam geçmiş taraması şimdilik sadece Claude'da.** claude.ai'ın kendi
  uçlarını kullanıcının oturumuyla çağırıyoruz. ChatGPT'nin iç API'si ayrı
  bir oturum anahtarı istiyor — yapılmadı.
- **Sadece tarayıcı.** Chrome eklentisi olduğu için masaüstü (Electron) ve
  mobil uygulamalarda çalışmaz.
- **İki dil.** TR/EN, `lib/i18n.ts` içinde tek sözlük. `chrome.i18n` yerine
  kendi katmanımız: dil değişimi sayfa yenilemeden uygulanıyor ve content
  script'teki şerit de aynı sözlüğü kullanıyor. EN sözlüğü
  `Record<MessageKey, string>` olduğu için eksik çeviri derlemede yakalanır.

**Soğuk başlangıç:** Yeni kullanıcının arşivi boş olduğu için Anthropic'in
resmî dışa aktarımını (`conversations.json`) içe alma lansman kapsamına
alındı — `lib/import-claude.ts` + `archive/Import.tsx`. Kural: içe aktarım
sürüm kurtarma çalıştırmaz ve arşivdeki daha dolu kaydın üzerine yazmaz.

### MVP DIŞI — sorulmadan başlama

- ChatGPT / Gemini / DeepSeek desteği
- Supabase senkron, hesap sistemi, ExtensionPay / ödeme
- Prompt kütüphanesi, PDF export
- Firefox / Edge portu

### İş modeli (v2, kodda YOK)

Freemium. Ücretsiz: son 100 konuşma. Pro (~3,99$/ay veya 29$/yıl,
ExtensionPay): sınırsız arşiv + senkron + export.

## Mimari

```
src/
  selectors.ts            → TÜM DOM selector'ları (tek kırılma noktası)
  lib/
    types.ts              → Conversation / Message / MessageVersion / Folder
    db.ts                 → Dexie şeması (IndexedDB, 'vestige')
    keys.ts               → conversationKey (content script Dexie import etmesin)
    i18n.ts               → TR/EN sözlük + useT()
    text.ts               → tokenize / stopword / benzerlik / alıntı
    repo.ts               → kaydet, sürüm kurtar, ara+filtrele, benzer soru bul,
                            toplu içe aktar, senkron durumu
    html-to-markdown.ts   → mesaj HTML'i → Markdown
    export-markdown.ts    → tek + toplu .md
    import-claude.ts      → conversations.json + API yanıtı ayrıştırıcısı
    backfill/claude.ts    → claude.ai uçlarından tüm geçmişi tarama
    capture/dom.ts        → sayfadan sohbeti okuma (platformdan bağımsız)
    content-runner.ts     → content script'lerin ortak beyni
    hint-ui.ts            → "bunu sormuştun" şeridi (Shadow DOM)
    settings.ts           → language / hintEnabled / autoCapture
  entrypoints/
    claude.content.ts     → runner + tam tarama
    chatgpt.content.ts    → runner (tarama yok)
    background.ts         → tek DB noktası (kaydet / ara / içe aktar)
    popup/                → sayaçlar, arşivle, tüm geçmişi tara, ayarlar
    archive/              → liste, arama+filtre, klasör, detay, sürümler, içe aktarma
```

### Değişmez kurallar

- **DB'ye erişim sadece background'da.** Content script `claude.ai`
  origin'inde çalışır; oradan yazılan IndexedDB'yi arşiv sayfası göremez.
  Bu yüzden `keys.ts` ayrı: content script `repo.ts`'i import ederse Dexie
  claude.ai sayfasına sızar.
- **İzinler minimum:** `storage` + `https://claude.ai/*`. Buraya izin
  eklemeden önce iki kez düşün — Web Store incelemesi ve kullanıcı güveni.
- **Streaming yanlış "sürüm" üretmemeli.** `collectSuperseded()` eski içerik
  yeninin ön eki ise sürüm kaydetmez; yoksa her token akışı sahte bir
  "kurtarılan sürüm" yaratırdı.
- **İpucu rahatsız etmemeli.** Eşik 0.62, en az 3 anlamlı kelime, 800ms
  gecikme, kapatılabilir. Şüphedeyse hiç çıkmaz.
- **Tarama sessizce yarım kalmamalı.** `backfill/claude.ts` her adımı ayrı
  doğrular ve kırıldığında sebebini söyleyen `BackfillError` fırlatır. İstekler
  arası 250ms bekleme var; değişmemiş sohbetler `sourceUpdatedAt` sayesinde
  tekrar indirilmez. İlerleme `storage.local`'da tutulur ki popup kapansa da
  tarama sürsün.

## Kalan işler

- [ ] Gerçek `conversations.json` ile içe aktarımı doğrula (sentetik testler
      geçiyor: `19/19`, ama Anthropic şemayı değiştirmiş olabilir)
- [ ] Büyük arşivde arama performansı — şu an her tuşta tüm mesajlar taranıyor
- [ ] Selector kırıldığında kullanıcıya *görünür* uyarı (şimdilik sadece konsol)
- [ ] Selector'ları canlı claude.ai'da doğrula (özellikle `composer`)
- [ ] Klasör adını `chatvault` → `vestige` yap (dizin kilitli olduğu için
      yapılamadı; editörü/Explorer'ı kapatıp `mv` yeter)
- [x] Store paketi: ikon, tanıtım kutusu, listeleme metinleri, gizlilik
      politikası, inceleme formu cevapları → `store/`
- [x] GitHub deposu: https://github.com/Mendivaque/vestige (public, MIT)
- [x] Gizlilik politikası yayında: https://mendivaque.github.io/vestige/
      (kaynak `docs/index.html`, Pages `/docs` klasöründen)
- [ ] Ekran görüntüleri (1280×800, 5 adet — plan `store/README.md`'de)
- [ ] Web Store geliştirici hesabı (5 USD) ve gönderim

## reels-kit — Emirhan'ın kişisel Instagram reels şablonu (KALICI KURALLAR)

`reels-kit/` (Remotion) Emirhan'ın kendi videolarını (@emirhanca.dev) reels'e çevirir. Kullanıcı onayladı: **her
seferinde bu şablon kullanılır**, sormadan başka düzene geçme.

- **Düzen: `--layout clean`** — tam ekran video; açılışta büyük cam efektli konu kartı (satır satır girer), ~3.6 sn sonra
  küçülüp üstte rozet olur; altta küçük cam efektli `instagram @emirhanca.dev` etiketi; kelime kelime altyazı (outline).
  Çerçeveli/kutulu düzen (`framed`) "amatör" bulundu, kullanılmaz.
- **Tema: siyah-beyaz `minimal`.** Crewupa ile ilgili HİÇBİR ŞEY kullanılmaz (Buve, mor palet, wordmark, crewupa
  videoları, test için bile). Önizleme/test arka planı nötr olmalı.
- **Lip-sync asla yok.** Yüz ve ses yalnızca orijinal çekimden.
- **Kamera hareketinde whoosh/efekt sesi yok** (`--no-sfx 1`); kamera yumuşak (`--camera-intensity 0.3`).
- **Arkada kısık sesli müzik var** (`--music public/music/ambient.mp3`, konuşmada otomatik kısılır). Müzik kendi
  ürettiğimiz telifsiz parça; Higgsfield müzik üretemiyor.
- **Önce önizleme göster, onay al, sonra render et.** Higgsfield/sandbox'ta gerçek video render'ı ancak onaydan sonra.
- Render Higgsfield sandbox'ında yapılır (yerelden cloudfront'a erişim yok); adımlar `reels-kit/README.md`'de.

## Bağlam

- Geliştirici: Emirhan — React Native / Next.js / TypeScript / Supabase
  deneyimli, 8+ yayınlanmış uygulama, ASO biliyor
- Hedef: 1-2 hafta içinde çalışan MVP
- Dağıtım: Web Store long-tail ASO, Reddit lansmanı, kısa problem-çözüm
  videoları, Product Hunt
