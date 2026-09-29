# reels-kit

Remotion ile ham videoyu (konuşan yüz) altyazılı, kamera hareketli 9:16 reels'e çeviren şablon.
Türkçe karakterler (İ Ş Ğ ı) güvenli; kelime kelime altyazı, otomatik hafif kamera, kanca başlık, isim kartı.

## Değişmez kurallar (kullanıcı kararı)

- **Lip-sync asla kullanılmaz.** Yapay dudak senkronu / konuşan yüz üretimi (Wan, Seedance, Grok vb. `audio_references`
  ile) yapılmaz. Kişinin yüzü ve sesi yalnızca orijinal çekimden gelir.
- **Kamera hareketlerinde whoosh/efekt sesi yok** (`--no-sfx 1`).
- **Kamera fazla yaklaşmaz:** `--camera-intensity 0.3` (zoom en çok ≈ %10).
- **Kişisel içerik için varsayılan şablon: `--layout clean`** (tam ekran video). Açılışta büyük cam efektli konu kartı
  satır satır girer, ~3.6 sn sonra küçülüp üstte rozet olarak kalır; altta küçük cam efektli `@emirhanca.dev` etiketi.
  Konu satırları `|` ile ayrılır. (`--layout framed`: eski çerçeveli düzen, kullanıcı "amatör" bulduğu için önerilmez.)

  ```bash
  node scripts/prepare.mjs --video public/input.mp4 --words kelimeler.json \
    --layout clean --topic "AI kodu yazar.|Peki ya sonrası?" --kicker "KONU" --handle "@emirhanca.dev" \
    --theme minimal --caption-style outline --no-sfx 1 --camera-intensity 0.3
  ```
  Not: Instagram Reels arayüzü alt ~350 px'i (kullanıcı adı/açıklama) kaplayabilir; handle şeridi bu yüzden gözden
  kaçabilir. Şerit y=1522–1606'da (`Frame.tsx`).
- **Arka plan müziği:** `--music public/music/ambient.mp3 --music-vol 0.32 --duck 0.35` (konuşmada otomatik kısılır).
  Parça `scripts/make-music.py` ile sıfırdan sentezlenir (telifsiz); Higgsfield müzik üretmez.
- Kişisel hesap için tema `minimal` (siyah-beyaz, vurgusuz). crewupa temalı içerik için `--theme` verilmez.

## Kullanım

```bash
npm install
# videoyu public/input.mp4 olarak koy, kelime zamanlı transkripti hazırla (Whisper JSON veya SRT)
node scripts/prepare.mjs --video public/input.mp4 --words words.json \
  --theme minimal --caption-style outline --wordmark "" --focus-y 0.4 \
  --hook "Satır 1|Satır 2" --name "kullanıcı adı" --camera-intensity 0.3 --no-sfx 1
npm run studio      # önizleme
npm run render      # out/reel.mp4
```

`prepare.mjs` seçenekleri: `--emph "kelime,kelime"` (vurgulu kelimeler), `--music dosya --duck 0.35`,
`--buve "5.2,2.6;11,2.6"` (crewupa maskotu), `--cutaways "angles/x.mp4,8.0,6.5"` (ek görüntü; **lip-sync'siz** B-roll için).

## Notlar

- Sandbox/bulutta Remotion'un kendi Chrome'u indirilemezse `REMOTION_BROWSER` ile bir headless-shell yolu ver.
- iPhone .MOV (HEVC, değişken kare hızı) girdisini önce `ffmpeg ... -vf fps=30 -c:v libx264` ile normalleştir.
