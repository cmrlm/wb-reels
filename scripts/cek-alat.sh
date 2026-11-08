#!/usr/bin/env bash
# Cek alat render sebelum menulis naskah. Pakai: bash scripts/cek-alat.sh
# Keluar 0 kalau semua siap, 1 kalau ada yang tidak bisa dipakai.
ok=1

if command -v node >/dev/null 2>&1; then
  echo "node: ada ($(node -v))"
else
  echo "node: TIDAK ADA"; ok=0
fi

if node -e "require('playwright')" >/dev/null 2>&1; then
  if node -e "const {chromium}=require('playwright');chromium.launch().then(b=>b.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    echo "playwright + chromium: ada"
  else
    echo "playwright: ada, tapi chromium TIDAK BISA DIJALANKAN"; ok=0
  fi
else
  echo "playwright: TIDAK ADA"; ok=0
fi

if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg: ada"
else
  echo "ffmpeg: tidak ada, mencoba memasang lewat pip (imageio-ffmpeg)..."
  if pip install -q --break-system-packages imageio-ffmpeg >/dev/null 2>&1 || pip install -q imageio-ffmpeg >/dev/null 2>&1; then
    bin=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())" 2>/dev/null)
    if [ -n "$bin" ]; then
      mkdir -p "$HOME/.local/bin" && ln -sf "$bin" "$HOME/.local/bin/ffmpeg"
      echo "ffmpeg: terpasang di $HOME/.local/bin/ffmpeg (jalankan: export PATH=\"$HOME/.local/bin:\$PATH\")"
    else
      echo "ffmpeg: GAGAL dipasang"; ok=0
    fi
  else
    echo "ffmpeg: GAGAL dipasang"; ok=0
  fi
fi

if [ $ok = 1 ]; then echo "SIAP RENDER"; exit 0; else echo "BELUM SIAP RENDER"; exit 1; fi
