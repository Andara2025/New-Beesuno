# Auto True-Stereo Vocal Pre-Conditioner untuk Suno Upload Armor

Fitur ini menambahkan sistem deteksi otomatis dan pengubah **Mono / Dual-Mono / Vokal Tengah Tipis** menjadi **True Stereo Berdimensi** sebelum diproses oleh seluruh preset **Suno Upload Armor** (*Vocal Armor*, *Pulse Armor*, *Warm Armor*, dan *Tempo Armor*), sehingga semua lagu memiliki kejernihan vokal setara rekaman *True Stereo* (seperti *Naik Delman Versi 2023*) sekaligus tetap lolos verifikasi Suno.

### User Review & Critical Decisions

> [!IMPORTANT]
> Rancangan ini mengikuti dua keputusan utama yang telah Anda konfirmasi agar Anda tidak perlu lagi memilah apakah sebuah mentahan audio berformat Mono, Dual-Mono, atau True Stereo.

- **Confirmed Decision 1 (Mode Deteksi & Pelebaran Otomatis)**: Sistem secara otomatis menganalisis korelasi kanal Kiri-Kanan (*Mid/Side Energy Ratio*) pada pita frekuensi vokal (`400 Hz – 2.800 Hz`). Jika audio terdeteksi **Mono (1 kanal)**, **Dual-Mono (2 kanal identik)**, atau **Vokal Tengah Kering (*Dry Center*, energi Side vokal rendah)**, sistem otomatis menyuntikkan tahap **Pre-Stereoizer (Haas Micro-Delay & Vocal Chorus Decorrelation)** sebelum masuk ke rumus Armor. Jika audio sudah **True Stereo Lebar** (seperti *Naik Delman 2023*), sinyal masuk murni tanpa modifikasi tambahan.
- **Confirmed Decision 2 (Cakupan Semua Preset Armor)**: Pre-Conditioner ini terintegrasi langsung di dalam keempat preset (**Vocal Armor**, **Pulse Armor**, **Warm Armor**, dan **Tempo Armor**) baik saat *Live Preview* di browser maupun saat *Render / Export Final* melalui mesin DSP server.

---

### 1. Overview & Core Concept

- **What It Does**: Menghilangkan masalah vokal hilang, mendem, atau ditolak saat pengguna mengunggah file audio Mono, rekaman mikrofon 1-kanal, atau lagu lama yang vokalnya diletakkan 100% mati di tengah (*dead-center mono*).
- **Target Audience / Persona**: Kreator musik dan produser cover Suno yang mengolah beragam sumber audio (rekaman HP/mikrofon, unduhan YouTube/TikTok mono, maupun master studio stereo).
- **Key Value**: Semua file mentahan—apa pun format awalnya—menghasilkan vokal yang jelas di depan seperti sampel *Naik Delman 2023*, tanpa mengorbankan perisai anti-deteksi (`Side Extraction c0-c1`, `Highpass Cut`, dan `Pitch Shift -2 Semitone`).

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Saat Unggah / Rekam Audio**: Begitu file dimasukkan atau direkam lewat mikrofon di tab **Suno Upload Armor**, pemindai spektrum langsung mengukur jumlah kanal dan rasio energi *Mid vs Side* pada pita vokal.
  2. **Indikator Diagnostik Stereo Otomatis**: Di panel informasi audio muncul status profil ruang suara secara *real-time*:
     - **True Stereo Alami**: Ditampilkan ketika energi *Side* vokal sudah memadai (selisih *Side-to-Mid* $\ge -11\text{ dB}$). Preset Armor berjalan murni tanpa pelebaran buatan.
     - **Auto True-Stereo Booster Aktif**: Ditampilkan ketika audio terdeteksi *Mono (1ch)*, *Dual-Mono*, atau *Vokal Tengah Tipis*. Sistem otomatis mengaktifkan sintesis ruang stereo vokal sebelum proses Armor.
  3. **Kontrol Override Cepat**: Tersedia pemilih mode ringan (`Otomatis (Rekomendasi)` · `Paksa Aktif` · `Nonaktif / Murni`) bagi pengguna yang ingin membandingkan karakter suara secara manual saat *Live Preview*.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Studio Mastering Console bergaya bersih dan presisi tinggi, menyatu dengan antarmuka gelap (*dark slate*) yang sudah ada.
  - *Color Palette & Mood*: Kanvas utama `#0F172A` (`slate-900`), permukaan panel `#1E293B` (`slate-800`) dengan garis batas tipis `1px`, serta aksen indikator `#10B981` (`emerald-500` untuk True Stereo Alami) dan `#38BDF8` (`sky-400` untuk Auto True-Stereo Booster Aktif).
  - *Typography & Hierarchy*: Angka metrik desibel (`dB`), persentase lebar stereo, dan durasi menggunakan angka tabular (`tabular-nums` / `font-mono`) agar sejajar rapi tanpa bergeser saat nilai berubah.
- **Interactive Feedback & Motion**: Pergantian mode atau preset langsung memperbarui *Live Preview* dalam $<200\text{ms}$ tanpa menghentikan pemutaran lagu.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Teknik Haas Micro-Delay + Dual-Band Vocal Decorrelation Sebelum `c0 - c1`**
  - *Chosen Approach*: Mengubah sinyal Mono/Sempit menjadi True Stereo menggunakan kombinasi penundaan mikro asimetris (`11 ms` pada kanal kanan dengan *all-pass phase shift* halus) dan modulasi *stereo chorus* ringan pada rentang vokal (`350 Hz – 3.200 Hz`) tepat **sebelum** tahap `pan=stereo|c0=c0-c1|c1=c1-c0`.
  - *Why*: Ketika kanal Kanan memiliki jeda mikro `11 ms` dan perbedaan fase halus terhadap kanal Kiri, rumus pengurangan `Kiri - Kanan` (`c0 - c1`) pada **Vocal Armor** tidak lagi menghasilkan angka `0` (hening), melainkan menghasilkan sinyal vokal *comb-stereo* yang jernih, tebal, dan tetap memiliki fase terbalik (`c0 = -c1`) yang membutakan detektor hak cipta Suno.
  - *Alternatives Considered*: Sekadar menggandakan kanal Mono ke Kiri dan Kanan (`c0=c0|c1=c0`). Cara tersebut gagal karena `c0 - c1` tetap bernilai `0` dan membuat suara hilang total.
- **Decision 2: Ambang Deteksi Otomatis (*Mid/Side Vocal Ratio Threshold*)**
  - *Chosen Approach*: Memeriksa apakah jumlah kanal $= 1$ atau rasio RMS *Side-to-Mid* pada frekuensi vokal lebih rendah dari `-12 dB`.
  - *Why*: Pada lagu *Naik Delman Versi 2023* yang vokalnya sudah sangat jelas, rasio *Side-to-Mid* vokalnya berada di **`-7.3 dB`**. Dengan menetapkan ambang otomatis di `-12 dB`, lagu yang sudah bagus seperti *Naik Delman* tidak akan disentuh sama sekali, sedangkan lagu yang vokalnya terlalu sempit/mono (`-15 dB` ke bawah atau `-inf dB`) otomatis diangkat ke level kejernihan yang setara.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         INPUT AUDIO / REKAMAN                             │
│            (Mono 1-Ch, Dual-Mono, Dry-Center, atau True Stereo)           │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 1. STEREO & VOCAL-SIDE ANALYZER ENGINE                    │
│  • Ukur jumlah kanal (1ch vs 2ch)                                         │
│  • Bandpass 400Hz–2800Hz -> Hitung RMS Mid (L+R) vs RMS Side (L-R)        │
│  • Hasil: Status = [TRUE_STEREO] jika Side/Mid >= -12 dB                  │
│           Status = [NEEDS_STEREO_BOOST] jika 1ch atau Side/Mid < -12 dB   │
└─────────────────┬───────────────────────────────────────┬─────────────────┘
                  │                                       │
     Jika [TRUE_STEREO]                      Jika [NEEDS_STEREO_BOOST]
    (Contoh: Naik Delman)                    (Mono / Vokal Tengah Tipis)
                  │                                       │
                  │                                       ▼
                  │              ┌──────────────────────────────────────────┐
                  │              │   2. TRUE-STEREO VOCAL PRE-CONDITIONER   │
                  │              │  • Konversi 1ch -> 2ch (jika Mono)       │
                  │              │  • Haas Micro-Delay (R +11ms) +          │
                  │              │    Stereo Vocal Chorus Decorrelation     │
                  │              │  • Menghasilkan selisih L≠R yang kaya    │
                  │              └────────────────────────┬─────────────────┘
                  │                                       │
                  └───────────────────┬───────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                 3. CORE SUNO UPLOAD ARMOR DSP PIPELINE                    │
│  • Vocal Armor : Side Extraction (c0-c1) + HPF 250Hz + Pitch -2st (1.0x)  │
│  • Pulse Armor : Side Pulse 5.5Hz + HPF 160Hz + Pitch -2st (+5% Tempo)    │
│  • Warm Armor  : Smooth 3.0s Envelope + HPF 250Hz + Pitch -2st (1.0x)     │
│  • Tempo Armor : Vocal-Forward Envelope + EQ + Pitch -2st + Flex Tempo    │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│             4. OUTPUT AUDIO LOLOS SUNO & VOKAL TETAP JELAS                │
│         (16-bit Triangular Dither + 0.95 True-Peak Limiter Export)        │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Menyimpan profil diagnostik stereo (`channels`, `midRmsDb`, `sideRmsDb`, `sideToMidDiffDb`, `isMonoOrNarrow`, `stereoBoostMode`: `'auto' | 'force_on' | 'force_off'`) di state komponen Suno Upload Armor.
  - Mengirimkan parameter status *Pre-Conditioner* ke mesin pemroses di server maupun ke *WebAudio Live Preview* di browser agar suara *preview* dan hasil *download* 100% identik.
- **Interactive Component & State Mapping**:
  - Menghapus blokir error `"Audio masukan bersifat Mono (1 kanal)"` saat memutar atau mengekspor audio 1-kanal, lalu menggantinya dengan konversi otomatis ke *True Stereo* sehingga rekaman mikrofon maupun file Mono langsung dapat diputar dan diunduh di semua preset.
  - Menyediakan *toggle* `Auto Stereo Booster` (`Otomatis` / `Selalu Aktif` / `Murni`) yang langsung mereset cache *preview* dan memperbarui indikator lebar vokal secara *real-time*.
