// Render semua reels dalam satu file naskah minggu ini jadi MP4 1080x1920 30fps.
// Pakai: node scripts/render.js minggu/2026-11-09/naskah.json out/2026-11-09
// Butuh: playwright (chromium) dan ffmpeg. Keduanya sudah ada di cloud environment Claude.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const [naskahArg, outArg] = process.argv.slice(2);
if (!naskahArg || !outArg) { console.error('Pakai: node scripts/render.js <naskah.json> <out_dir>'); process.exit(1); }

const naskahPath = path.resolve(naskahArg);
const outDir = path.resolve(outArg);
const data = JSON.parse(fs.readFileSync(naskahPath, 'utf8'));
const WORKERS = Math.max(1, Math.min(2, require('os').cpus().length));
const FPS = 30;

function slug(s) { return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }

function validate(r, i) {
  const errs = [];
  const d = r.dialog || [];
  if (d.length < 9 || d.length > 17) errs.push(`jumlah baris ${d.length} (harus 9-17)`);
  if (d[0] && d[0][0] !== 'a') errs.push('baris pertama harus Anak Muda');
  if (d.length && d[d.length - 1][0] !== 'a') errs.push('baris terakhir harus Anak Muda');
  d.forEach(([who, text], j) => {
    if (who !== 'a' && who !== 'g') errs.push(`baris ${j + 1}: pembicara harus "a" atau "g"`);
    if (j > 0 && d[j - 1][0] === who) errs.push(`baris ${j + 1}: pembicara sama dua kali berturut-turut`);
    if (!text || text.length > 170) errs.push(`baris ${j + 1}: panjang ${text ? text.length : 0} karakter (maks 170)`);
    if (/—/.test(text)) errs.push(`baris ${j + 1}: ada em dash`);
  });
  if (errs.length) throw new Error(`Reel ${i + 1} (${r.judul}): ` + errs.join('; '));
}

async function renderOne(browser, r, i) {
  const name = `${String(i + 1).padStart(2, '0')}-${slug(r.hari)}-${slug(r.judul)}`;
  const tmp = path.join(outDir, `${name}.tmp.mp4`);
  const final = path.join(outDir, `${name}.mp4`);
  const html = fs.readFileSync(path.join(ROOT, 'templates/reel.html'), 'utf8')
    .replace('__FONT__', 'file://' + path.join(ROOT, 'assets/fonts/lora-latin-400-normal.woff2'))
    .replace('__PLATE__', 'file://' + path.join(ROOT, 'assets/plate.jpg'))
    .replace('__LINES__', JSON.stringify(r.dialog));
  const htmlPath = path.join(outDir, `${name}.html`);
  fs.writeFileSync(htmlPath, html);

  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + htmlPath);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);

  // Cek bubble tidak terlalu tinggi (menabrak pohon di atas)
  const tall = await page.evaluate(() => TIMING.map((_, i) => {
    const el = document.querySelectorAll('.b')[i]; return Math.round(el.getBoundingClientRect().top);
  }));
  tall.forEach((top, j) => { if (top < 330) console.warn(`  [peringatan] ${name} baris ${j + 1}: bubble terlalu tinggi (top ${top}px), pendekkan kalimatnya`); });

  const total = await page.evaluate(() => TOTAL);
  const n = Math.ceil(total * FPS);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', tmp],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error(`ffmpeg exit ${c} untuk ${name}`))));
  for (let f = 0; f < n; f++) {
    await page.evaluate(t => setTime(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r2 => ff.stdin.once('drain', r2));
  }
  ff.stdin.end();
  await done;
  fs.renameSync(tmp, final);

  // Poster untuk halaman mingguan: frame saat bubble pertama sudah tampil
  await page.evaluate(() => setTime(3));
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  await page.close();
  fs.unlinkSync(htmlPath);
  const dur = `${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`;
  console.log(`selesai ${name}.mp4 (${dur})`);
  return { ...r, file: `${name}.mp4`, poster: `${name}.jpg`, durasi: dur };
}

(async () => {
  data.reels.forEach(validate);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const results = new Array(data.reels.length);
  let next = 0;
  async function worker() {
    while (next < data.reels.length) {
      const i = next++;
      results[i] = await renderOne(browser, data.reels[i], i);
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: WORKERS }, worker));
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'hasil.json'), JSON.stringify({ ...data, reels: results }, null, 2));
  console.log(`Semua selesai dalam ${Math.round((Date.now() - t0) / 1000)} detik. Ringkasan: ${path.join(outDir, 'hasil.json')}`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
