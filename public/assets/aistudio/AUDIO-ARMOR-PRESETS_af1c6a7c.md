# Audio Armor — Preset Specification

Dokumen spesifikasi teknis untuk tiga preset pemrosesan audio (`Vocal Armor`, `Pulse Armor`, `Warm Armor`): definisi parameter, rantai filter FFmpeg, penamaan output, serta catatan implementasi.

Dokumen ini product-agnostic — tidak terikat pada aplikasi, modul, atau namespace tertentu, sehingga bisa dipakai ulang di produk lain.

---

## 1. Ringkasan Preset

| Preset | ID | Badge | Warna | Output Suffix |
|---|---|---|---|---|
| 🛡️ Vocal Armor | `vocal_armor` | VOKAL JELAS | emerald | `_VocalArmor` |
| ⚡ Pulse Armor | `pulse_armor` | DENYUT RITMIS | amber | `_PulseArmor` |
| 🌙 Warm Armor | `warm_armor` | RESONANSI HANGAT | violet | `_WarmArmor` |

Default aktif: `vocal_armor`.

### Karakter sinyal

| Preset | Perilaku stereo | Mono downmix | Tempo | Low-cut | Warna |
|---|---|---|---|---|---|
| Vocal Armor | Anti-phase (L−R / R−L) | **Silence** | 1.0× | 250 Hz | Terang, tipis |
| Pulse Armor | Atenuasi tengah bergantian | Silence saat fase kill | 1.0× | 250 Hz | Berdenyut |
| Warm Armor | In-phase, mono-safe | Aman (mono) | 1.05× | 160 Hz | Tebal, hangat |

### Cocok untuk

| Preset | Genre |
|---|---|
| Vocal Armor | Vokal Solo, Pop, Akustik, Cover Melodik |
| Pulse Armor | Upbeat, Pop Modern, EDM, Dangdut, Rock |
| Warm Armor | Ballad, Jazz, Lo-Fi, Akustik Santai |

---

## 2. Konstanta Dasar

```
PITCH_SHIFT   = 0.8908987        // 2^(-2/12)  → transpose -2 semitone
TEMPO_RESTORE = 1.122462         // 1 / 0.8908987
TEMPO_WARM    = 1.178585         // 1.122462 × 1.05  → tempo +5%
SAMPLE_RATE   = 44100
```

Konversi pitch menggunakan tiga tahap agar hasilnya deterministik pada sumber 44.1k / 48k / 96k:

```
asetrate=44100*0.8908987   → pitch turun 2 semitone, durasi × 1.122462
aresample=44100            → normalisasi sample rate
atempo=1.122462            → durasi kembali normal, pitch tetap -2 semitone
```

Blok ini dipakai oleh ketiga preset dan selanjutnya disebut **`pitchCore`**:

```
aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.122462
```

---

## 3. Vocal Armor

**ID:** `vocal_armor` · **Suffix:** `_VocalArmor`

Pembatalan komponen tengah stereo (vokal, bass, kick) sehingga tersisa komponen side. Output bersifat anti-phase: kanal 1 adalah negasi kanal 0.

### Rantai filter

| Tahap | Filter | Parameter |
|---|---|---|
| 1 | `pan` | `stereo \| c0=c0-c1 \| c1=c1-c0` |
| 2 | `highpass` | 250 Hz |
| 3 | `pitchCore` | −2 semitone, tempo 1.0× |
| 4 | `volume` | 1.6× |

### Filter string

```
pan=stereo|c0=c0-c1|c1=c1-c0,highpass=f=250,aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.122462,volume=1.6
```

### Catatan

- Output **hilang total saat di-downmix ke mono** — kanal 0 dan 1 saling meniadakan.
- `pan` menghasilkan gain hingga +6 dB; dikombinasikan dengan `volume=1.6` (≈ +4.1 dB) peak teoretis mencapai ≈ +10 dBFS → perlu limiter.
- Pada sumber mono, filter `pan` gagal (kanal 1 tidak ada).

---

## 4. Pulse Armor

**ID:** `pulse_armor` · **Suffix:** `_PulseArmor`

Pembatalan komponen tengah yang dimodulasi secara periodik. Siklus 3.0 detik, dengan ramp halus 50 ms di tiap transisi.

### Siklus modulasi

| Rentang waktu | Faktor cancel `k` | Efek pada komponen tengah |
|---|---|---|
| `0.00 – 1.35 s` | `0.78` | Tersisa ±22% |
| `1.35 – 1.40 s` | `0.78 → 1.00` | Ramp turun |
| `1.40 – 2.95 s` | `1.00` | Nol (hilang penuh) |
| `2.95 – 3.00 s` | `1.00 → 0.78` | Ramp naik |

Rumus per kanal, dengan `L` = kanal 0 dan `R` = kanal 1 masukan:

```
out0 = L - k(t)·R
out1 = R - k(t)·L
```

Jika `L = c + s` dan `R = c - s` (`c` = komponen tengah, `s` = side), maka:

```
out0 = c·(1 - k) + s·(1 + k)
```

Sehingga `k = 0.78` menyisakan `0.22·c`, dan `k = 1.0` menghilangkan `c` sepenuhnya.

### Rantai filter

| Tahap | Filter | Parameter |
|---|---|---|
| 1 | `aeval` | ekspresi modulasi stereo (lihat di bawah) |
| 2 | `highpass` | 250 Hz |
| 3 | `pitchCore` | −2 semitone, tempo 1.0× |
| 4 | `volume` | 1.6× |

### Filter string

```js
`aeval=exprs='val(0)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(1)|val(1)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(0)':c=stereo,highpass=f=250,${pitchCore},volume=1.6`
```

Versi terbaca (satu kanal):

```
val(0) - K(t) * val(1)

K(t) = if( lt(mod(t,3.0), 1.35), 0.78,
       if( lt(mod(t,3.0), 1.40), 0.78 + 0.22*(mod(t,3.0)-1.35)/0.05,
       if( gt(mod(t,3.0), 2.95), 1.00 - 0.22*(mod(t,3.0)-2.95)/0.05,
       1.00 )))
```

### Catatan

- `,` di dalam ekspresi **wajib** di-escape menjadi `\,` karena filtergraph memakai koma sebagai pemisah filter.
- `|` memisahkan ekspresi kanal 0 dan kanal 1; seluruh `exprs` dibungkus tanda kutip tunggal.
- Variabel `t` adalah waktu relatif terhadap awal stream. Dengan `-ss` sebelum `-i`, FFmpeg mereset timestamp sehingga `t` mulai dari 0.
- Saat `k = 1.0`, jumlah kedua kanal = 0 → downmix mono menjadi silence selama ±1.55 s per siklus.

---

## 5. Warm Armor

**ID:** `warm_armor` · **Suffix:** `_WarmArmor`

Pembatalan tengah dengan dua kanal identik (in-phase), sehingga aman untuk pemutaran mono. Ditambah penguatan low-end, notch mid-high, tremolo lambat, dan tempo +5%.

### Rantai filter

| Tahap | Filter | Parameter | Keterangan |
|---|---|---|---|
| 1 | `pan` | `stereo \| c0=c0-c1 \| c1=c0-c1` | Dua kanal identik → mono |
| 2 | `highpass` | 160 Hz | Low-cut |
| 3 | `bass` | +3 dB @ 180 Hz | Low-shelf |
| 4 | `equalizer` | −11 dB @ 1800 Hz, Q 1.2 | Notch |
| 5 | `tremolo` | 5.5 Hz, depth 0.88 | Modulasi amplitudo |
| 6 | `pitchCore` | −2 semitone | — |
| 7 | `atempo` | 1.178585 | Override tempo → +5% |
| 8 | `volume` | 2.2× | Boost |

### Filter string

```
pan=stereo|c0=c0-c1|c1=c0-c1,highpass=f=160,bass=g=3.0:f=180,equalizer=f=1800:t=q:w=1.2:g=-11,tremolo=f=5.5:d=0.88,aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.178585,volume=2.2
```

> `atempo` di sini **menggantikan** nilai `pitchCore` (1.122462) dengan 1.178585. Jika `pitchCore` dibuat sebagai fungsi, gunakan `pitchCore(1.178585)` alih-alih `replace()`.

### Catatan

- Karena kedua kanal identik, hasil akhirnya mono. Ini satu-satunya preset yang tidak bermasalah saat diputar di speaker mono.
- `bass +3 dB` lalu `volume=2.2` memberi peak teoretis ≈ +10.8 dBFS → risiko clipping paling tinggi di antara ketiga preset.

---

## 6. Metadata Preset (JS)

```js
const PRESETS = {
  vocal_armor: {
    id: 'vocal_armor',
    order: 1,
    name: 'Vocal Armor',
    badge: 'VOKAL JELAS',
    accent: 'emerald',
    icon: '🛡️',
    desc: 'Pembatalan komponen tengah stereo, low-cut 250 Hz, transpose -2 semitone',
    bestFor: ['Vokal Solo', 'Pop', 'Akustik', 'Cover Melodik'],
    suffix: '_VocalArmor',
    aliases: ['original', 'default', 'sideharmoni', 'side_harmony']
  },
  pulse_armor: {
    id: 'pulse_armor',
    order: 2,
    name: 'Pulse Armor',
    badge: 'DENYUT RITMIS',
    accent: 'amber',
    icon: '⚡',
    desc: 'Atenuasi komponen tengah berdenyut, siklus 3 detik dengan ramp 50 ms',
    bestFor: ['Upbeat', 'Pop Modern', 'EDM', 'Dangdut', 'Rock'],
    suffix: '_PulseArmor',
    aliases: ['staccato', 'staccato_guide', 'pulse']
  },
  warm_armor: {
    id: 'warm_armor',
    order: 3,
    name: 'Warm Armor',
    badge: 'RESONANSI HANGAT',
    accent: 'violet',
    icon: '🌙',
    desc: 'Pembatalan tengah in-phase, low-shelf +3 dB, notch 1.8 kHz, tremolo 5.5 Hz, tempo +5%',
    bestFor: ['Ballad', 'Jazz', 'Lo-Fi', 'Akustik Santai'],
    suffix: '_WarmArmor',
    aliases: ['slow_tempo', 'slow_ballad', 'ballad', 'slow']
  }
};

const DEFAULT_PRESET = 'vocal_armor';

function normalizePreset(raw) {
  if (!raw) return DEFAULT_PRESET;
  const key = String(raw).trim().toLowerCase();
  if (PRESETS[key]) return key;
  for (const id of Object.keys(PRESETS)) {
    if (PRESETS[id].aliases.includes(key)) return id;
  }
  return DEFAULT_PRESET;
}

function getPresetMeta(raw) {
  return PRESETS[normalizePreset(raw)];
}
```

---

## 7. Normalisasi ID & Alias

Nama lama tetap diterima agar data tersimpan (localStorage, project file, API client) tidak rusak:

| ID kanonik | Alias yang diterima |
|---|---|
| `vocal_armor` | `original`, `default`, `sideharmoni`, `side_harmony` |
| `pulse_armor` | `staccato`, `staccato_guide`, `pulse` |
| `warm_armor` | `slow_tempo`, `slow_ballad`, `ballad`, `slow` |

Aturan: selalu simpan **ID kanonik**, selalu panggil `normalizePreset()` di batas masuk (API handler, form, IPC).

---

## 8. Penamaan File Output

```
{basename}{suffix}_{durasi}s.mp3      // mode potongan
{basename}{suffix}_Full.mp3           // mode full
```

Contoh:

| Input | Preset | Mode | Output |
|---|---|---|---|
| `LaguKu.mp3` | Vocal Armor | 60 s | `LaguKu_VocalArmor_60s.mp3` |
| `LaguKu.mp3` | Pulse Armor | full | `LaguKu_PulseArmor_Full.mp3` |
| `LaguKu.mp3` | Warm Armor | 90 s | `LaguKu_WarmArmor_90s.mp3` |

---

## 9. Template Command

### Mode potongan

```bash
ffmpeg -y \
  -ss 0.000 -t 60.000 \
  -i input.mp3 \
  -vn \
  -af "<FILTER_STRING>" \
  -map_metadata -1 \
  -c:a libmp3lame \
  -b:a 320k \
  output_VocalArmor_60s.mp3
```

### Mode full

Hapus `-ss` dan `-t`.

### Preview

```bash
ffmpeg -y -ss <start> -t 15.000 -i input.mp3 -vn \
  -af "<FILTER_STRING>" -map_metadata -1 \
  -c:a libmp3lame -b:a 256k preview.mp3
```

---

## 10. Catatan Implementasi

### 10.1 Input mono

Semua preset memakai `c1` / `val(1)`. Pada sumber mono, filter akan error (`Input channel #1 does not exist`) atau — jika `aformat=channel_layouts=stereo` diletakkan di depan — menghasilkan silence, karena `L = R` sehingga `L - R = 0`.

**Rekomendasi:** validasi `channels` sebelum render dan tolak dengan pesan eksplisit.

### 10.2 Clipping

`pan` (hingga +6 dB) + `volume` (1.6× / 2.2×) dapat melewati 0 dBFS. Tidak ada limiter di rantai filter saat ini.

**Rekomendasi:** tambahkan `alimiter=limit=0.95:level=false` di akhir rantai, atau ganti strategi gain dengan `loudnorm=I=-14:TP=-1.5:LRA=11`.

### 10.3 Paritas antar platform

Ada dua implementasi pitch shift yang berbeda:

| Platform | Metode |
|---|---|
| Desktop (native binary) | `asetrate` + `aresample` + `atempo` |
| Mobile (FFmpeg Kit) | `rubberband=pitch=...:tempo=...` (default) |

Hasil keduanya tidak identik, dan `rubberband` tidak selalu tersedia di semua build. **Rekomendasi:** satu sumber kebenaran untuk filter, plus flag `useRubberband` yang di-probe saat startup.

### 10.4 Unsur yang belum ada

- **Timeout proses** — FFmpeg tanpa batas waktu bisa menggantung pada file korup.
- **Guard input = output** — `-y` pada path yang sama merusak file sumber.
- **Validasi numerik** — `parseFloat` yang menghasilkan `NaN` bocor ke argumen `-ss` / `-t`.
- **Throttle progress** — callback per chunk stderr perlu dibatasi (≈500 ms) atau diganti parsing `-progress pipe:1`.
- **Verifikasi output** — cek `size > 1000` byte sebelum dinyatakan sukses, dan hapus file parsial hanya jika file tersebut baru dibuat oleh proses ini.

### 10.5 Metadata

`-map_metadata -1` membuang seluruh tag (termasuk cover art). Jika output perlu metadata, tag harus ditulis ulang pada tahap terpisah setelah encoding.

---

## 11. Checklist Migrasi

- [ ] Ganti ID preset: `original` → `vocal_armor`, `staccato` → `pulse_armor`, `slow_tempo` → `warm_armor`
- [ ] Ganti label UI, badge, dan deskripsi
- [ ] Update `data-*` attribute pada kartu pemilih preset
- [ ] Update nilai default aktif
- [ ] Update parameter `preset` pada semua pemanggilan API / IPC
- [ ] Update penamaan suffix file output
- [ ] Pastikan `normalizePreset()` dipasang di semua entry point
- [ ] Bersihkan nilai lama di localStorage / config tersimpan (opsional, alias sudah menangani)
- [ ] Update string i18n (ID & EN)
- [ ] Regresi: render 1 lagu per preset, cek durasi, ukuran file, dan peak level
