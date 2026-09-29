#!/usr/bin/env python3
"""Arka plan müziğini sıfırdan sentezler (örnek/sample yok, telif sorunu yok).
Sakin, kısık bir ambient/lo-fi parça: Am9 – Fmaj7 – Cmaj7 – G6, 76 bpm, ~76 sn.
Kullanım: python3 scripts/make-music.py public/music/ambient.wav  (sonra mp3'e çevir)"""
import sys, wave
import numpy as np

SR = 44100
BPM = 76
BEAT = 60 / BPM
BAR = 4 * BEAT
CHORD_BARS = 2
LOOPS = 3
rng = np.random.default_rng(7)
mtof = lambda m: 440.0 * 2 ** ((m - 69) / 12)

# akor: (bas notası, akor notaları, arp notaları)
CHORDS = [
    (45, [57, 60, 64, 67, 71], [69, 72, 76, 79, 76, 72]),   # Am9
    (41, [53, 57, 60, 64, 69], [65, 69, 72, 76, 72, 69]),   # Fmaj7
    (48, [55, 60, 64, 67, 71], [67, 71, 72, 76, 72, 71]),   # Cmaj7
    (43, [55, 59, 62, 64, 69], [67, 71, 74, 76, 74, 71]),   # G6
]
total = CHORD_BARS * BAR * len(CHORDS) * LOOPS
N = int((total + 4) * SR)
L = np.zeros(N); R = np.zeros(N)

def add(buf, start, sig):
    i = int(start * SR); j = min(N, i + len(sig))
    if i < N: buf[i:j] += sig[: j - i]

def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR); y = np.empty_like(x); s = 0.0
    for k in range(len(x)):
        s = (1 - a) * x[k] + a * s; y[k] = s
    return y

def pad_note(m, dur):
    t = np.arange(int((dur + 2.2) * SR)) / SR
    sig = np.zeros_like(t)
    for det in (-0.09, 0.0, 0.11):
        f = mtof(m) * 2 ** (det / 12)
        sig += np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    att = np.clip(t / 1.6, 0, 1) ** 2
    rel = np.clip((dur + 2.2 - t) / 2.2, 0, 1) ** 2
    return sig * att * rel * (1 + 0.08 * np.sin(2 * np.pi * 0.23 * t))

def pluck(m, dur=1.4):
    t = np.arange(int(dur * SR)) / SR
    f = mtof(m)
    sig = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + 0.15 * np.sin(6 * np.pi * f * t) * np.exp(-t * 9)
    return sig * np.exp(-t * 3.2) * np.clip(t / 0.004, 0, 1)

def kick():
    t = np.arange(int(0.45 * SR)) / SR
    f = 46 + 70 * np.exp(-t * 22)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)

def hat():
    n = rng.standard_normal(int(0.07 * SR)); n = n - lowpass(n, 5000)
    return n * np.exp(-np.arange(len(n)) / SR * 70)

# --- sıralama ---
pad = np.zeros(N); sub = np.zeros(N); arp = np.zeros(N); drums = np.zeros(N)
for loop in range(LOOPS):
    for ci, (root, notes, arpn) in enumerate(CHORDS):
        start = (loop * len(CHORDS) + ci) * CHORD_BARS * BAR
        dur = CHORD_BARS * BAR
        for m in notes:
            add(pad, start, pad_note(m, dur) * 0.09)
        t = np.arange(int((dur + 1.0) * SR)) / SR
        env = np.clip(t / 0.5, 0, 1) * np.clip((dur + 1.0 - t) / 1.0, 0, 1)
        add(sub, start, np.sin(2 * np.pi * mtof(root - 12 + 12) * t) * env * 0.16)
        # arp: 8'likler, bazı vuruşlar boş (nefes alsın)
        pattern = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0]
        for k, on in enumerate(pattern):
            if on:
                m = arpn[(k * 5 + ci) % len(arpn)]
                add(arp, start + k * BEAT / 2, pluck(m) * (0.10 if k % 4 == 0 else 0.07))
        for b in range(CHORD_BARS * 4):
            if b % 2 == 0: add(drums, start + b * BEAT, kick() * 0.30)
            add(drums, start + b * BEAT + BEAT / 2, hat() * 0.035)

def delay(x, time, fb, mix):
    d = int(time * SR); y = x.copy()
    for k in range(1, 5):
        sh = np.zeros_like(x); sh[k * d:] = x[: N - k * d] * (fb ** k); y += sh * mix
    return y

arp_l = delay(arp, BEAT * 0.75, 0.5, 0.9)
arp_r = delay(arp, BEAT * 1.0, 0.5, 0.9)
dry_l = pad + sub + drums + arp_l * 1.0
dry_r = pad + sub + drums + arp_r * 1.0

def reverb(x, seed, secs=2.6):
    r = np.random.default_rng(seed)
    n = int(secs * SR); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 2.4); ir[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    ir = ir - lowpass(ir, 6000) * 0.0
    ir = lowpass(ir, 3500)
    size = 1 << (len(x) + n).bit_length()
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:N] * 0.06

wet_l = reverb(pad + arp_l * 0.6, 11); wet_r = reverb(pad + arp_r * 0.6, 23)
L = dry_l + wet_l * 1.0; R = dry_r + wet_r * 1.0

# yumuşak giriş/çıkış + normalizasyon (tepe ≈ -3 dBFS)
t = np.arange(N) / SR
fade = np.clip(t / 3.0, 0, 1) * np.clip((total + 2.5 - t) / 4.0, 0, 1)
L *= fade; R *= fade
end = int((total + 2.5) * SR); L = L[:end]; R = R[:end]
peak = max(np.abs(L).max(), np.abs(R).max()); g = 0.7 / peak
out = np.stack([L * g, R * g], 1)
pcm = (np.clip(out, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(out ** 2)))
print(f'{len(out) / SR:.1f} sn, tepe {20 * np.log10(np.abs(out).max()):.1f} dBFS, RMS {rms:.1f} dBFS')
