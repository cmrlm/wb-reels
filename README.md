# wb-reels

Mesin render reels Waktu Berteduh. Repo ini cuma berisi bahan teknis: latar, font, template bubble, dan script render. Naskah, panduan suara, dan log topik tidak disimpan di sini. Semuanya ada di Project Claude milik penulis naskah.

Repo ini dipakai oleh Claude saat menjalankan instruksi "WB Reels" di Project. Tidak perlu dibuka manual.

## Isi

- `assets/plate.jpg`: latar 1080x1920 (Gus dan Anak Muda).
- `assets/fonts/`: Lora regular dan italic (SIL Open Font License).
- `templates/reel.html`: tata letak bubble, watermark #CeritaTeduh, animasi (fade in/out, zoom pelan 3,5%), dan kartu CTA penutup.
- `templates/minggu.html`: halaman mingguan berisi 7 video.
- `scripts/render.js`: `node scripts/render.js <naskah.json> <out_dir>` merender semua reels jadi MP4 1080x1920 30fps tanpa audio.
- `scripts/cek-alat.sh`: cek node, playwright + chromium, dan ffmpeg sebelum render (memasang ffmpeg lewat pip kalau tidak ada).
- `scripts/build-page.js`: `node scripts/build-page.js <out_dir>` membangun `<out_dir>/halaman/` siap diterbitkan sebagai artifact.

## Format naskah.json

```json
{
  "minggu_mulai": "2026-11-09",
  "reels": [
    { "hari": "Senin", "tanggal": "2026-11-09", "nomor": 110, "judul": "Tempat Cerita",
      "luka": "Selalu jadi tempat curhat tapi tidak pernah ditanya balik", "wilayah": "Pertemanan",
      "dialog": [["a", "Gus, ..."], ["g", "..."], ["a", "Ah gitu ternyata, Gus. Terima kasih. :)"]] }
  ]
}
```

`nomor` = angka watermark #CeritaTeduh di atas video (wajib). `a` = Anak Muda (bubble kiri, putih), `g` = Gus (bubble kanan, abu hangat). Setiap video ditutup kartu CTA 5 detik (“Komen ‘Teduh’ atau cek link di bio.”). Aturan yang dicek `render.js`: 9-17 baris, dibuka dan ditutup Anak Muda, pembicara bergantian, maks 170 karakter per baris, tanpa em dash.

## Butuh

Node dengan `playwright` (Chromium) dan `ffmpeg`. Keduanya sudah tersedia di workspace cloud Claude. Render 7 reels sekitar 13-15 menit di 2 CPU.
