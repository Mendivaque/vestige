# Yayına çıkış paketi

Bu klasördeki her şey Chrome Web Store gönderimi içindir.

| Dosya | Ne için |
|---|---|
| `listing-en.md` | Ad, kısa/uzun açıklama (birincil dil) |
| `listing-tr.md` | Türkçe listeleme (yayından sonra eklenir) |
| `privacy-policy.md` | Gizlilik politikası — **yayınlanıp URL'i forma girilecek** |
| `review-form.md` | Tek amaç beyanı, izin gerekçeleri, onay kutuları |
| `icon-128.png` | Listeleme ikonu (üretildi) |
| `promo-440x280.png` | Küçük tanıtım kutusu (üretildi) |
| `screenshots/` | **Senin çekeceğin** ekran görüntüleri |

Görseller `assets/*.svg` dosyalarından üretiliyor:

```bash
node scripts/make-icons.mjs
```

## Ekran görüntüleri — çekim planı

**Zorunlu:** en az 1, en fazla 5 adet, **1280×800 px** PNG (ya da 640×400).
Kenarlıksız, tam kare. Sıra önemli: ilk görsel listelemede en büyük görünür.

Beşi de tek bir temiz hesapta, sahte sohbetlerle çekilmeli — gerçek
sohbetlerinde müşteri işi, anahtar, kişisel veri olabilir.

| # | Ne göster | Üstüne yazılacak başlık (EN) |
|---|---|---|
| 1 | Arşiv sayfası, sol listede sohbetler dolu, sağda bir sohbet açık | **Every chat you've had, in one searchable place** |
| 2 | Arama kutusunda bir kelime, listede eşleşen pasajlar vurgulu | **Real full-text search across every conversation** |
| 3 | claude.ai'da yazarken beliren "Bunu sormuştun" şeridi, şeride yakın plan | **It tells you when you've asked this before** |
| 4 | Bir mesajın altında açılmış "2 önceki sürüm" | **Recovers replies that were deleted upstream** |
| 5 | Popup açık, "Tüm geçmişi tara" ilerlerken | **Imports your entire history — no manual exporting** |

Başlıkları görselin üstüne koyacaksan: koyu şerit + `#f4ece3` metin, ekranın
üst %20'sinde, 40-48px. Ekran görüntüsünün kendisi küçülmesin.

## Gönderim adımları

1. **Geliştirici hesabı** — [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole),
   tek seferlik 5 USD kayıt ücreti. Hesap doğrulaması bir gün sürebilir.
2. **Gizlilik politikasını yayınla** — `privacy-policy.md` içeriğini bir URL'e
   koy (GitHub Pages, gist, kendi sitendeki bir sayfa). Form URL istiyor.
3. **Paketi üret:**
   ```bash
   npm run zip
   ```
   `.output/vestige-<sürüm>-chrome.zip` dosyası yüklenecek olan.
4. **Yeni öğe oluştur**, zip'i yükle.
5. **Store listing** sekmesi → `listing-en.md`'deki metinler, `icon-128.png`,
   `promo-440x280.png`, ekran görüntüleri. Kategori: Productivity.
6. **Privacy practices** sekmesi → `review-form.md`'deki metinler ve kutular.
7. **Distribution** → Public, tüm bölgeler.
8. Gönder. İnceleme genelde birkaç gün; ilk gönderimde daha uzun sürebiliyor.

## Gönderimden önce son kontrol

- [ ] `npm run build` temiz, `npx tsc --noEmit` hatasız
- [ ] Eklenti temiz bir Chrome profilinde paketlenmemiş olarak test edildi
- [ ] Claude'da yakalama, ChatGPT'de yakalama, tarama, arama, dışa aktarma
      elle denendi
- [ ] `manifest.json` içinde sadece `storage` + iki host izni var
- [ ] Sürüm numarası doğru (`package.json`)
- [ ] Gizlilik politikası URL'i açılıyor
