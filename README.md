# Vestige

**Claude ve ChatGPT** sohbetlerini **cihazında** arşivleyen Chrome eklentisi.
Sohbetler kendiliğinden kaydedilir, silinenler kurtarılır, arşivin tamamında
tam metin arama yapılır, Markdown olarak dışa aktarılır. Hiçbir veri sunucuya
gitmez. Arayüz Türkçe ve İngilizce.

Öne çıkanlar:

- **Otomatik arşiv** — "kaydet" demen gerekmiyor, sayfa açıkken birikiyor.
- **Tüm geçmişi tara** — sohbetleri tek tek açmadan hepsini arşivler
  (şimdilik Claude'da; popup'taki düğme).
- **Silinen cevabı kurtarma** — bir mesajı düzenleyip yeniden ürettiğinde
  eski cevap silinir; Vestige onu saklar.
- **"Bunu sormuştun"** — yeni bir soru yazarken arşivinde benzeri varsa
  yazı alanının üstünde tek satırlık ipucu çıkar. Platformlar arası çalışır:
  Claude'a yazarken ChatGPT'de sorduğun soruyu da hatırlatır.
- **Geçmişi içe aktarma** — Claude'un resmî dışa aktarımını (`conversations.json`)
  sürükle-bırak ile alır.

## Geliştirme

```bash
npm install
npm run dev
```

Elle yüklemek için:

```bash
npm run build
```

sonra `chrome://extensions` → Geliştirici modu → **Paketlenmemiş öğe yükle** →
`.output/chrome-mv3` klasörünü seç. Store paketi: `npm run zip`.

## Uçtan uca test

0. **Tüm geçmişi tara:** claude.ai sekmesindeyken popup → "Tüm geçmişi tara".
   İlerleme çubuğu dolmalı, popup'ı kapatsan da tarama sürmeli, bitince
   "N yeni sohbet" özeti çıkmalı. İkinci çalıştırmada değişmemiş sohbetler
   atlandığı için çok daha hızlı bitmeli.
1. `claude.ai` veya `chatgpt.com`'da bir sohbet aç. 2-3 saniye sonra eklenti
   simgesindeki sayaçlar artmalı.
2. **Arşiv:** "Arşivi aç" → sohbet listede; başlık ve mesajlar doğru mu bak.
3. **Arama:** sohbette geçen bir kelimeyi ara — listede eşleşen pasaj alıntı
   olarak görünmeli. "Kod içerenler" filtresini ve rol/tarih seçicilerini dene.
4. **Kurtarma:** claude.ai'da eski bir mesajını düzenleyip yeniden ürettir.
   Birkaç saniye sonra arşivde o mesajın altında "1 önceki sürüm" çıkmalı;
   sohbetin sonundan silinenler "Claude'dan silinmiş mesajlar" bölümünde.
5. **İpucu:** arşivdeki bir sohbette sorduğun soruya benzer bir soruyu yeni
   bir sohbette yazmaya başla — composer'ın üstünde şerit çıkmalı. Çıkmazsa
   fazla farklı sormuşsundur (eşik bilerek yüksek).
6. **Export:** ".md indir" ve "Tümünü .md indir".
7. **İçe aktarma:** claude.ai → Settings → Privacy → Export data ile arşivini
   iste, gelen zip'teki `conversations.json`'ı sol alttaki "Geçmişi içe aktar"
   penceresine bırak. Sohbet ve mesaj sayıları raporlanmalı; canlı yakalamayla
   çakışan sohbetler "zaten arşivde" diye atlanmalı.

**Sohbet görünmüyorsa:** claude.ai sekmesinde konsolu aç, `[Vestige]` uyarısı
varsa DOM değişmiş demektir — `src/selectors.ts` içindeki aday listelerini
güncelle. İpucu hiç çıkmıyorsa büyük ihtimalle `composer` selector'ı kaymıştır.

## Yapı

Mimari, kurallar ve konumlanma kararları için [CLAUDE.md](CLAUDE.md).
