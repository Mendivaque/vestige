import { Config } from '@remotion/cli/config';
import fs from 'node:fs';

// Video codec / kalite
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setConcurrency(3);

// Bulut/sandbox ortamında Remotion'un kendi Chrome'unu indirmek yerine hazır Chromium'u kullan.
// Kendi bilgisayarında bu satır otomatik atlanır (dosya yoksa) ve Remotion kendi tarayıcısını kullanır.
const candidates = [
  process.env.REMOTION_BROWSER,
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
].filter(Boolean) as string[];
const chrome = candidates.find((p) => fs.existsSync(p));
if (chrome) Config.setBrowserExecutable(chrome);
