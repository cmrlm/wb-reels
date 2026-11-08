// Bangun halaman mingguan (index.html + folder reels/) dari hasil render.
// Pakai: node scripts/build-page.js out/2026-11-09
// Hasil: out/2026-11-09/halaman/index.html dan out/2026-11-09/halaman/reels/*
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const outArg = process.argv[2];
if (!outArg) { console.error('Pakai: node scripts/build-page.js <out_dir>'); process.exit(1); }
const outDir = path.resolve(outArg);
const hasil = JSON.parse(fs.readFileSync(path.join(outDir, 'hasil.json'), 'utf8'));

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const BLN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const d = s => { const [y, m, dd] = s.split('-').map(Number); return { y, m: m - 1, d: dd }; };

const a = d(hasil.reels[0].tanggal), b = d(hasil.reels[hasil.reels.length - 1].tanggal);
const range = a.m === b.m
  ? `${hasil.reels[0].hari} ${a.d} – ${hasil.reels[hasil.reels.length - 1].hari} ${b.d} ${BULAN[b.m]} ${b.y}`
  : `${hasil.reels[0].hari} ${a.d} ${BULAN[a.m]} – ${hasil.reels[hasil.reels.length - 1].hari} ${b.d} ${BULAN[b.m]} ${b.y}`;
const title = a.m === b.m ? `WB Reels ${a.d}–${b.d} ${BLN[b.m]} ${b.y}` : `WB Reels ${a.d} ${BLN[a.m]}–${b.d} ${BLN[b.m]} ${b.y}`;

const pageDir = path.join(outDir, 'halaman');
fs.mkdirSync(path.join(pageDir, 'reels'), { recursive: true });
const week = hasil.reels.map(r => {
  if (r.file) {
    fs.copyFileSync(path.join(outDir, r.file), path.join(pageDir, 'reels', r.file));
    fs.copyFileSync(path.join(outDir, r.poster), path.join(pageDir, 'reels', r.poster));
  }
  const t = d(r.tanggal);
  return {
    day: r.hari, date: `${t.d} ${BLN[t.m]}`, title: r.judul,
    file: r.file ? `reels/${r.file}` : null, poster: r.poster ? `reels/${r.poster}` : null, dur: r.durasi,
    luka: r.luka, tag: r.nomor ? `#CeritaTeduh${r.nomor}` : null,
    script: r.dialog.map(([w, x]) => [w === 'a' ? 'Anak Muda' : 'Gus', x])
  };
});
const html = fs.readFileSync(path.join(ROOT, 'templates/minggu.html'), 'utf8')
  .replace('__TITLE__', title)
  .replace('__RANGE__', range)
  .replace('__COUNT__', String(week.filter(w => w.file).length))
  .replace('__WEEK__', JSON.stringify(week, null, 1).replace(/</g, '\\u003c'));
fs.writeFileSync(path.join(pageDir, 'index.html'), html);
const files = {};
week.forEach(w => { if (w.file) { files[w.file] = w.file; files[w.poster] = w.poster; } });
fs.writeFileSync(path.join(pageDir, 'files.json'), JSON.stringify(files, null, 2));
console.log(JSON.stringify({ title, root: path.resolve(pageDir), file_path: path.resolve(pageDir, 'index.html'), files }, null, 2));
