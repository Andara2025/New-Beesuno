/**
 * Beesuno Studio Lyrics Arranger, Syllabifier & Suno Monophone Engine v5.0
 * 
 * Mengoptimalkan naskah lirik untuk AI Suno agar pas saat dinyanyikan:
 * - Pemenggalan suku kata alami & presisi sesuai kaidah bahasa Indonesia & musik (KBBI / EYD).
 * - Diftong (ai, au, oi, ei) terjaga utuh agar tidak memicu staccato patah-patah (sam-pai, bukan sam-pa-i).
 * - Digraf (ng, ny, sy, kh) diakomodasi sebagai 1 konsonan tunggal (de-ngan, me-nya-nyi, khi-a-na-ti).
 * - Mode Monofon Suno: Konversi fonetik 'c' -> 'ch' dan 'sy' -> 'sh' sehingga vokal AI melafalkan
 *   "chinta", "terchipta", "chan-tik" secara fasih /tʃ/ tanpa pelo "kinta" atau "sinta".
 * - Penanganan kata ulang (reduplikasi) dengan jeda musikal: "ma-ti - ma-ti-an", bukan "ma-ti-ma-ti-an".
 * - Safe Ghost Shield: Zero-width tidak merusak struktur internal suku kata/token AI.
 */

export type LyricCloakLevel = 'natural' | 'soft' | 'light';

// Kamus kata khusus (akar kata, bahasa daerah Minang/Jawa/Sunda, & istilah lagu populer)
const DICTIONARY_OVERRIDES: Record<string, string> = {
  // 1 Suku Kata & Kata Glide Halus (Jangan dipisah agar tidak patah saat dinyanyikan)
  "air": "air",
  "kau": "kau",
  "hai": "hai",
  "hei": "hei",
  "wah": "wah",
  "hap": "hap",
  "yuk": "yuk",
  "laut": "laut",
  "jauh": "jauh",
  "daun": "daun",
  "haus": "haus",
  "baik": "baik",
  "kain": "kain",
  "main": "main",
  "naik": "naik",
  "lain": "lain",
  "raih": "raih",
  "saat": "saat",
  "taat": "taat",
  "maaf": "maaf",
  "bait": "bait",

  // Populer Indo (2+ Suku Kata)
  "dua": "du-a",
  "dia": "di-a",
  "doa": "do-a",
  "diam": "di-am",
  "ayam": "a-yam",
  "cumi": "cu-mi",
  "cicak": "ci-cak",
  "katak": "ka-tak",
  "sungai": "su-ngai",
  "seekor": "se-e-kor",
  "nyamuk": "nya-muk",
  "berenang": "be-re-nang",
  "berkokok": "ber-ko-kok",
  "kukuruyuk": "ku-ku-ru-yuk",
  "disemprot": "di-sem-prot",
  "cinta": "cin-ta",
  "mencintai": "men-cin-tai",
  "tercipta": "ter-cip-ta",
  "terpana": "ter-pa-na",
  "sempurna": "sem-pur-na",
  "membelamu": "mem-be-la-mu",
  "dibutakan": "di-bu-ta-kan",
  "khianati": "khi-a-na-ti",
  "berulang": "ber-u-lang",
  "berulangkali": "ber-u-lang-ka-li",
  "kebanggaanku": "ke-bang-ga-an-ku",
  "habis-habisan": "ha-bis ha-bi-san",
  "mati-matian": "ma-ti ma-ti-an",
  "ditinggalkan": "di-ting-gal-kan",
  "perjalanan": "per-ja-la-nan",
  "menyayangi": "me-nya-ya-ngi",
  "seandainya": "se-an-dai-nya",
  "bagaimana": "ba-gai-ma-na",
  "walaupun": "wa-lau-pun",
  "sekalipun": "se-ka-li-pun",
  "setidaknya": "se-ti-dak-nya",
  "selamanya": "se-la-ma-nya",
  "selalu": "se-la-lu",
  "percaya": "per-ca-ya",
  "terdalam": "ter-da-lam",
  "terindah": "ter-in-dah",
  "tersenyum": "ter-se-nyum",
  "menangis": "me-na-ngis",

  // Minang / Melayu
  "malu": "ma-lu",
  "tamalu": "ta-ma-lu",
  "denai": "de-nai",
  "mato": "ma-to",
  "lincah": "lin-cah",
  "mambuek": "mam-bu-ek",
  "salah": "sa-lah",
  "tingkah": "ting-kah",
  "uda": "u-da",
  "gagah": "ga-gah",
  "bana": "ba-na",
  "mandayo": "man-da-yo",
  "sungguah": "sung-gu-ah",
  "raso": "ra-so",
  "punyo": "pu-nyo",
  "kanai": "ka-nai",
  "hati": "ha-ti",
  "sabana": "sa-ba-na",
  "sabanalah": "sa-ba-na-lah",
  "siang": "si-ang",
  "malam": "ma-lam",
  "tabayang": "ta-ba-yang",
  "mimpi": "mim-pi",
  "bamimpi": "ba-mim-pi",
  "sandaran": "san-da-ran",
  "palaminan": "pa-la-mi-nan",
  "ciinan": "ci-i-nan",
  "katuju": "ka-tu-ju",
  "rindu": "rin-du",
  "taragak": "ta-ra-gak",
  "jikok": "ji-kok",
  "indak": "in-dak",
  "batamu": "ba-ta-mu",
  "pandang": "pan-dang",
  "suko": "su-ko",
  "nio": "ni-o",
  "datang": "da-tang",
  "datanglah": "da-tang-lah",
  "tamui": "ta-mu-i",
  "katokan": "ka-to-kan",
  "cinto": "cin-to",
  "sayang": "sa-yang",
  "ondeh": "on-deh",
  "ndeh": "ndeh",
};

// Kata 4 huruf vokal-ganda yang ketika diulang (reduplikasi) lebih enak dibuat asimetris ("Di-am, diam,")
// atau diberi sisipan Soft-H ("Dhiam, dhiam,") agar tidak kaku saat dinyanyikan namun tetap 100% lolos Suno
const ASYMMETRIC_HIATUS_WORDS = new Set([
  'diam', 'siap', 'tiap', 'liar', 'niat', 'kiat', 'buat', 'buah', 'luas', 'puas', 'liat', 'kuat', 'suap', 'muat'
]);

// Kamus Soft-H Phonetic Bypass (untuk Preset 2: menjaga kata pendek tetap utuh dengan sisipan 'h' halus)
const SOFT_H_OVERRIDES: Record<string, string> = {
  "diam": "dhiam",
  "siap": "shiap",
  "tiap": "thiap",
  "liar": "lhiar",
  "niat": "nhiat",
  "buat": "bhuat",
  "kuat": "khuat",
  "luas": "lhuas",
  "puas": "phuas",
  "lalu": "lah-lu",
};

// Daftar kata hiatus vokal (bukan diftong, dipenggal V-V kecuali yang masuk DICTIONARY_OVERRIDES utuh seperti 'laut')
const HIATUS_ROOTS = new Set([
  'tahu', 'buat', 'buah', 'suara', 'dua', 'siang', 'mian', 'tiap', 'liar',
  'diam', 'doa', 'soal', 'kuasa', 'juara', 'ruang', 'luas', 'puas', 'liat',
  'niat', 'kiat', 'seekor'
]);

/**
 * Normalisasi kontraksi bahasa Indonesia agar vokal AI Suno tidak mengeja per huruf
 */
export function normalizeIndonesianSlang(text: string): string {
  return text
    .replace(/\bt['’]?lah\b/gi, 'telah')
    .replace(/\bs['’]?lalu\b/gi, 'selalu')
    .replace(/\bs['’]?lamanya\b/gi, 'selamanya')
    .replace(/\bk['’]?rena\b|\bkarna\b|\bkrn\b/gi, 'karena')
    .replace(/\bsk['’]?rang\b|\bskarang\b|\bskrg\b/gi, 'sekarang')
    .replace(/\btakkan\b/gi, 'tak kan')
    .replace(/\bdgn\b/gi, 'dengan')
    .replace(/\byg\b/gi, 'yang')
    .replace(/\bkpd\b/gi, 'kepada')
    .replace(/\budah\b|\budh\b/gi, 'sudah')
    .replace(/\bblm\b|\bbelom\b/gi, 'belum')
    .replace(/\bkalo\b|\bkl\b/gi, 'kalau')
    .replace(/\bbgt\b/gi, 'banget');
}

/**
 * Safe Zero-Width Shield
 * Menginjeksi Invisible Zero-Width Non-Joiner (\u200C) hanya pada jeda antar kata
 * TIDAK merusak bagian tengah suku kata / token fonem vokal Suno!
 */
export function safeInjectZeroWidthGhost(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) return line;
      return line.replace(/(\s+)/g, '\u200C$1');
    })
    .join('\n');
}

/**
 * Pemenggalan suku kata bahasa Indonesia berstandar EYD/KBBI & Musikal Suno
 * - Kata 1 suku kata (di, ku, hap, yuk, kau, dan, yang, tak) & kata glide halus (laut, baik, jauh) tetap utuh.
 * - Kata 2+ suku kata (Ci-cak, Di-am, A-yam, La-lu, pa-gi, Cu-mi, se-e-kor, di-sem-prot)
 *   dipenggal per suku kata dengan tanda hubung rapat (-) tanpa spasi.
 */
export function algorithmicallySyllabifyIndonesian(word: string): string {
  if (word.length <= 2) return word;

  const lower = word.toLowerCase();

  // Digraf: ng, ny, sy, kh di-encode menjadi 1 karakter placeholder
  const digraphMap: [RegExp, string, string][] = [
    [/ng/gi, '\u0081', 'ng'],
    [/ny/gi, '\u0082', 'ny'],
    [/sy/gi, '\u0083', 'sy'],
    [/kh/gi, '\u0084', 'kh'],
  ];

  let encoded = word;
  for (const [re, sym] of digraphMap) {
    encoded = encoded.replace(re, (m) => (m === m.toUpperCase() ? sym.toUpperCase() : sym));
  }

  const isVowel = (ch: string) => /[aeiouAEIOUà-ÿ]/.test(ch);

  // Indeks huruf vokal
  const vowelIndices: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (isVowel(encoded[i])) {
      vowelIndices.push(i);
    }
  }

  // Jika hanya 1 vokal (1 suku kata, misal: di, hap, yuk, dan, yang, tak, pun, lah, kan), jangan dipisah
  if (vowelIndices.length <= 1) {
    return word;
  }

  const splitPoints: number[] = [];
  const diphthongs = ['ai', 'au', 'oi', 'ei'];

  for (let v = 0; v < vowelIndices.length - 1; v++) {
    const v1 = vowelIndices[v];
    const v2 = vowelIndices[v + 1];
    const consonantsBetween = v2 - v1 - 1;

    if (consonantsBetween === 0) {
      // Dua vokal berurutan (V1 V2)
      const pair = (encoded[v1] + encoded[v2]).toLowerCase();
      const isHiatusWord = Array.from(HIATUS_ROOTS).some((h) => lower.includes(h));

      if (diphthongs.includes(pair) && !isHiatusWord) {
        // Diftong (seperti kau, su-ngai, pan-tai, sam-pai, laut) tetap menyatu sebagai 1 suku kata
        continue;
      } else {
        // Hiatus vokal (seperti di-am, du-a, di-a, do-a, se-e-kor) dipenggal
        splitPoints.push(v1 + 1);
      }
    } else if (consonantsBetween === 1) {
      // Pola V-C-V: potong sebelum konsonan (A-yam, La-lu, pa-gi, Cu-mi, me-ra-yap, be-re-nang)
      splitPoints.push(v1 + 1);
    } else if (consonantsBetween === 2) {
      // Pola V-C1C2-V: potong di antara C1 dan C2 (din-ding, di-tang-kap, ber-ko-kok, man-di, lang-sung)
      splitPoints.push(v1 + 2);
    } else {
      // Pola V-C1C2C3-V: potong setelah konsonan pertama (di-sem-prot)
      splitPoints.push(v1 + 2);
    }
  }

  if (splitPoints.length === 0) {
    return word;
  }

  let result = '';
  let lastIdx = 0;
  for (const pt of splitPoints) {
    result += encoded.slice(lastIdx, pt) + '-';
    lastIdx = pt;
  }
  result += encoded.slice(lastIdx);

  for (const [, sym, orig] of digraphMap) {
    const reLower = new RegExp(sym, 'g');
    const reUpper = new RegExp(sym.toUpperCase(), 'g');
    result = result.replace(reLower, orig).replace(reUpper, orig.toUpperCase());
  }

  return result;
}

/**
 * Pemenggalan kata tunggal dengan penanganan reduplikasi (kata ulang) & opsi Soft-H / Asimetris:
 * - Preset 1 (useSoftH = false):
 *   * Kata ulang hiatus pendek seperti "Diam-diam" -> "Di-am, diam," (Asimetris: pertama dipenggal, kedua utuh!)
 *   * Kata ulang biasa di awal baris seperti "Cicak-cicak" -> "Ci-cak, ci-cak,"
 *   * Kata "Lalu" di awal baris -> "Lah-lu" (sedangkan di tengah baris -> "La-lu")
 *   * Kata glide seperti "laut" -> "laut" (utuh)
 * - Preset 2 (useSoftH = true):
 *   * Kata "Diam-diam" -> "Dhiam, dhiam," (Soft-H utuh tanpa dipenggal!)
 *   * Kata "Lalu" di awal baris -> "Lah-lu"
 *   * Kata glide seperti "laut" -> "laut" (utuh)
 */
export function hyphenateWord(word: string, isStartOfLine = false, useSoftH = false): string {
  const lower = word.toLowerCase();

  // Khusus kata "lalu" di awal baris (seperti "Lalu disemprot" -> "Lah-lu di-sem-prot.")
  if (lower === 'lalu' && isStartOfLine) {
    return word[0] === word[0].toUpperCase() ? 'Lah-lu' : 'lah-lu';
  }

  // Jika mode Soft-H aktif dan kata ada di SOFT_H_OVERRIDES (seperti "diam" -> "dhiam")
  if (useSoftH && SOFT_H_OVERRIDES[lower] && lower !== 'lalu') {
    const sh = SOFT_H_OVERRIDES[lower];
    if (word[0] === word[0].toUpperCase()) {
      return sh.charAt(0).toUpperCase() + sh.slice(1);
    }
    return sh;
  }

  // 1. Cek kamus override terlebih dahulu
  if (DICTIONARY_OVERRIDES[lower]) {
    const hyp = DICTIONARY_OVERRIDES[lower];
    if (word[0] === word[0].toUpperCase()) {
      return hyp.charAt(0).toUpperCase() + hyp.slice(1);
    }
    return hyp;
  }

  // 2. Penanganan kata ulang (reduplikasi) vs suku kata yang sudah ter-hyphen
  if (word.includes('-')) {
    const parts = word.split('-');
    // Cek apakah ini kata ulang murni (misal: cicak-cicak, diam-diam, katak-katak, cumi-cumi, pelan-pelan)
    const isExactRedup =
      parts.length === 2 &&
      parts[0].length >= 3 &&
      parts[0].toLowerCase() === parts[1].toLowerCase();

    const isPartialRedup =
      parts.length === 2 &&
      parts[0].length >= 3 &&
      (parts[1].toLowerCase().startsWith(parts[0].toLowerCase()) ||
        parts[0].toLowerCase().startsWith(parts[1].toLowerCase()));

    if (isExactRedup) {
      const baseLower = parts[0].toLowerCase();

      if (useSoftH && SOFT_H_OVERRIDES[baseLower]) {
        // Mode Soft-H: "Diam-diam" -> "Dhiam, dhiam,"
        const sh = SOFT_H_OVERRIDES[baseLower];
        const p1 = parts[0][0] === parts[0][0].toUpperCase() ? sh.charAt(0).toUpperCase() + sh.slice(1) : sh;
        const p2 = sh.toLowerCase();
        return isStartOfLine ? `${p1}, ${p2},` : `${p1} ${p2}`;
      }

      if (!useSoftH && ASYMMETRIC_HIATUS_WORDS.has(baseLower)) {
        // Mode Asimetris (Preset 1): "Diam-diam" -> "Di-am, diam," (pertama dipenggal, kedua utuh!)
        const p1 = hyphenateWord(parts[0], false, false);
        const p2 = baseLower;
        return isStartOfLine ? `${p1}, ${p2},` : `${p1} ${p2}`;
      }

      const p1 = hyphenateWord(parts[0], false, useSoftH);
      const p2 = hyphenateWord(parts[1].toLowerCase(), false, useSoftH);
      // Jika di awal baris (seperti "Cicak-cicak di dinding" -> "Ci-cak, ci-cak, di din-ding.")
      if (isStartOfLine) {
        return `${p1}, ${p2},`;
      }
      // Jika di tengah/akhir baris (seperti "Berjalan pelan-pelan" -> "Ber-ja-lan pe-lan pe-lan.")
      return `${p1} ${p2}`;
    } else if (isPartialRedup) {
      // Kata ulang berimbuhan (seperti "mati-matian" -> "ma-ti ma-ti-an")
      return parts.map((part) => hyphenateWord(part, false, useSoftH)).join(' ');
    } else {
      // Jika input sudah merupakan suku kata terpenggal (misal: de-nai, ta-ma-lu), jaga tanda hubung tunggal
      return parts.map((part) => hyphenateWord(part, false, useSoftH)).join('-');
    }
  }

  if (lower.length <= 2) {
    return word;
  }

  // 3. Algoritma pemenggalan suku kata bahasa Indonesia
  return algorithmicallySyllabifyIndonesian(word);
}

/**
 * Konversi Monofon Fonetik ('c' -> 'ch', 'sy' -> 'sh') jika dibutuhkan
 */
export function applySunoMonophone(syllableStr: string): string {
  let s = syllableStr;

  s = s
    .replace(/\bc([aeiouAEIOU])/g, (m, v) => (m[0] === 'C' ? 'Ch' : 'ch') + v)
    .replace(/([-\s])c([aeiouAEIOU])/g, (m, p, v) => p + (m[1] === 'C' ? 'Ch' : 'ch') + v)
    .replace(/([bdfghjklmnpqrstvwxyzBDFGHJKLMNPQRSTVWXYZ])c([aeiouAEIOU])/g, (m, c1, v) => c1 + (c1 === c1.toUpperCase() ? 'Ch' : 'ch') + v)
    .replace(/\bsy/gi, (m) => (m[0] === 'S' ? 'Sh' : 'sh'))
    .replace(/([-\s])sy/gi, (m, p) => p + (m[1] === 'S' ? 'Sh' : 'sh'));

  return s;
}

/**
 * Hitung perkiraan jumlah suku kata dalam satu baris (untuk metrum ketukan / bar cadence)
 */
export function countSyllablesInLine(line: string): number {
  const trimmed = line.trim();
  if (!trimmed || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    return 0;
  }

  const words = trimmed.split(/\s+/).filter((w) => w.length > 0 && w !== '-');
  let count = 0;

  for (const w of words) {
    const clean = w.replace(/[^a-zA-Z0-9À-ž\-]/g, '');
    if (!clean) continue;

    if (clean.includes('-')) {
      const parts = clean.split('-').filter((p) => p.length > 0);
      count += parts.length;
    } else {
      const vowels = clean.match(/[aeiouAEIOUà-ÿ]+/gi);
      count += vowels ? vowels.length : 1;
    }
  }

  return count;
}

/**
 * Helper untuk memproses satu baris lirik menjadi format suku kata berirama (gaya Bypass Lolos Suno)
 */
function processLyricLineToSyllables(trimmedLine: string, useSoftH = false): string {
  // Normalisasi tanda " - " yang tidak sengaja diketik di dalam baris menjadi spasi
  let normalizedLine = trimmedLine.replace(/\s+-\s+/g, ' ');

  // Jika 2 kata pertama di awal baris adalah kata ulang tanpa tanda hubung (misal: "Cicak cicak di dinding" atau "Diam diam merayap" atau "Diam, diam, merayap")
  // ubah menjadi bentuk kata ulang "Cicak-cicak" / "Diam-diam" terlebih dahulu agar ditangani secara konsisten oleh hyphenateWord
  normalizedLine = normalizedLine.replace(
    /^([a-zA-ZÀ-ž]+),?\s+([a-zA-ZÀ-ž]+),?(?=\s+)/,
    (full, w1, w2) => {
      if (w1.toLowerCase() === w2.toLowerCase() && w1.length >= 3) {
        return `${w1}-${w2}`;
      }
      return full;
    }
  );

  const tokens = normalizedLine.split(/(\s+)/);
  let wordTokenCount = 0;
  let capitalizeNext = true;

  const processedTokens = tokens.map((token) => {
    if (/^\s+$/.test(token)) return token;

    const match = token.match(/^([^a-zA-Z0-9À-ž]*)([a-zA-Z0-9À-ž\-_']+)([^a-zA-Z0-9À-ž]*)$/);
    if (!match) return token;

    const [, leadPunct, word, trailPunct] = match;
    const isFirstWord = wordTokenCount === 0;
    const shouldCapitalize = capitalizeNext;
    wordTokenCount++;

    let hyp = hyphenateWord(word, isFirstWord, useSoftH);

    // Jika hyphenateWord menambahkan koma di akhir (karena kata ulang di awal baris) dan sudah ada koma di trailPunct, hindari koma ganda
    if (hyp.endsWith(',') && trailPunct.startsWith(',')) {
      hyp = hyp.slice(0, -1);
    }

    // Pastikan huruf pertama di awal baris atau setelah titik/tanda seru/tanda tanya menggunakan huruf kapital
    if (shouldCapitalize && hyp.length > 0) {
      hyp = hyp.charAt(0).toUpperCase() + hyp.slice(1);
    }

    capitalizeNext = /[.!?]/.test(trailPunct);

    return leadPunct + hyp + trailPunct;
  });

  let lineOut = processedTokens.join('').trim();
  // Tambahkan titik (.) di akhir baris jika belum ada tanda baca penutup
  if (lineOut.length > 0 && !/[.!?~,:;)\]]$/.test(lineOut)) {
    lineOut += '.';
  }
  return lineOut;
}

/**
 * PRESET 1 (REKOMENDASI UTAMA SUNO - SUKU KATA & ASIMETRIS LOLOS 100%):
 * Contoh hasil:
 * Ci-cak, ci-cak, di din-ding.
 * Di-am, diam, me-ra-yap.
 * ...
 * Cu-mi, cu-mi, di laut.
 * Ber-ja-lan pe-lan pe-lan.
 *
 * Da-tang se-e-kor mu-suh.
 * Lah-lu di-sem-prot.
 */
export function sunoMonophoneCloak(
  rawText: string,
  injectGhost = false,
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  const normalized = normalizeIndonesianSlang(rawText);
  const rawLines = normalized.split('\n');
  const hasUserBlankLines = rawLines.some((l, idx) => l.trim() === '' && idx > 0 && idx < rawLines.length - 1);

  const structuredText = includeTags ? autoDetectSongStructure(normalized) : normalized;
  const lines = structuredText.split('\n');
  const resultLines: string[] = [];
  let consecutiveLyricLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      consecutiveLyricLines = 0;
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (includeTags) {
        if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
          resultLines.push('');
        }
        resultLines.push(trimmed);
      }
      consecutiveLyricLines = 0;
      continue;
    }

    // Kelompokkan per 2 baris (bait kuplet) jika belum ada baris kosong
    if (!hasUserBlankLines && !includeTags && consecutiveLyricLines === 2) {
      resultLines.push('');
      consecutiveLyricLines = 0;
    }

    resultLines.push(processLyricLineToSyllables(trimmed, false));
    consecutiveLyricLines++;
  }

  let output = resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (injectGhost) {
    output = safeInjectZeroWidthGhost(output);
  }

  return output;
}

/**
 * PRESET 2 (SOFT-H MONOFON BYPASS - LOLOS 100% & VOKAL LEBIH MENGALIR):
 * - Menggunakan sisipan huruf 'h' halus pada kata rawan seperti "Diam-diam" -> "Dhiam, dhiam,"
 *   dan "Lalu" -> "Lah-lu", serta menjaga kata glide seperti "laut" tetap utuh.
 * Contoh hasil:
 * Ci-cak, ci-cak, di din-ding.
 * Dhiam, dhiam, me-ra-yap.
 */
export function syllablePacingCloak(
  rawText: string,
  injectGhost = false,
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  const normalized = normalizeIndonesianSlang(rawText);
  const rawLines = normalized.split('\n');
  const hasUserBlankLines = rawLines.some((l, idx) => l.trim() === '' && idx > 0 && idx < rawLines.length - 1);

  const structuredText = includeTags ? autoDetectSongStructure(normalized) : normalized;
  const lines = structuredText.split('\n');
  const resultLines: string[] = [];
  let consecutiveLyricLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
        resultLines.push('');
      }
      consecutiveLyricLines = 0;
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (includeTags) {
        if (resultLines.length > 0 && resultLines[resultLines.length - 1] !== '') {
          resultLines.push('');
        }
        resultLines.push(trimmed);
      }
      consecutiveLyricLines = 0;
      continue;
    }

    if (!hasUserBlankLines && !includeTags && consecutiveLyricLines === 2) {
      resultLines.push('');
      consecutiveLyricLines = 0;
    }

    resultLines.push(processLyricLineToSyllables(trimmed, true));
    consecutiveLyricLines++;
  }

  let output = resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (injectGhost) {
    output = safeInjectZeroWidthGhost(output);
  }

  return output;
}

/**
 * PRESET 3:
 * Natural Legato (Bebas Tanda Hubung)
 * - Kata utuh tanpa tanda hubung (-) sama sekali
 * - Sangat cocok untuk tempo cepat, rap, atau vokal mengalir tanpa artikulasi staccato
 */
export function naturalLegatoCloak(
  rawText: string,
  injectGhost = false,
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  const normalized = normalizeIndonesianSlang(rawText);
  const structuredText = autoDetectSongStructure(normalized);
  const lines = structuredText.split('\n');
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      resultLines.push('');
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (includeTags) {
        resultLines.push(trimmed);
      }
      continue;
    }

    resultLines.push(trimmed);
  }

  let output = resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (injectGhost) {
    output = safeInjectZeroWidthGhost(output);
  }

  return output;
}

/**
 * PRESET 4:
 * Vowel-Shift & Melodic Phrasing Cloak (Aksen Vokal Bernyanyi ~)
 */
export function vowelMelodicMusicCloak(
  rawText: string,
  mode: 'en' | 'id',
  injectGhost = false,
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  const normalized = mode === 'id' ? normalizeIndonesianSlang(rawText) : rawText;
  const structuredText = autoDetectSongStructure(normalized);
  const lines = structuredText.split('\n');
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      if (includeTags) {
        resultLines.push(trimmed);
      }
      continue;
    }
    if (!trimmed) {
      resultLines.push('');
      continue;
    }

    const tokens = trimmed.split(/(\s+)/);
    const processedTokens = tokens.map((token) => {
      if (/^\s+$/.test(token)) return token;

      const match = token.match(/^([a-zA-Z'’\-]+)(.*)$/);
      if (!match) return token;

      const [, word, punct] = match;
      if (word.length <= 2) return token;

      const chars = word.split('');
      for (let i = chars.length - 1; i >= 0; i--) {
        const ch = chars[i];
        const lower = ch.toLowerCase();
        const isCap = ch === ch.toUpperCase();

        if (lower === 'a' || lower === 'e' || lower === 'i' || lower === 'o' || lower === 'u') {
          let accent = lower;
          if (lower === 'a') accent = 'á';
          else if (lower === 'e') accent = 'é';
          else if (lower === 'i') accent = 'í';
          else if (lower === 'o') accent = 'ó';
          else if (lower === 'u') accent = 'ú';

          chars[i] = isCap ? accent.toUpperCase() : accent;
          break;
        }
      }

      return chars.join('') + punct;
    });

    let transformedLine = processedTokens.join('');

    const last = transformedLine.trim().slice(-1);
    if (!['?', '!', '.', ')', ']', '~'].includes(last)) {
      transformedLine = transformedLine.trim() + '~';
    }

    resultLines.push(transformedLine);
  }

  let output = resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (injectGhost) {
    output = safeInjectZeroWidthGhost(output);
  }

  return output;
}

/**
 * Intelligent Song Structure Reconstructor
 */
export function autoDetectSongStructure(rawText: string): string {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return rawText;

  if (lines.some((l) => l.startsWith('[') && l.endsWith(']'))) {
    return rawText;
  }

  const isMatiMatian = lines.some(
    (l) => l.toLowerCase().includes('mati-matian') || l.toLowerCase().includes('matimatian')
  );

  if (isMatiMatian) {
    return structureMatiMatian(lines);
  }

  const result: string[] = [];
  let chunkIdx = 0;
  const chunkSize = 4;

  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    let tag = '';

    if (chunkIdx === 0) {
      tag = '[Verse 1: Melodic Soft Intro]';
    } else if (chunkIdx === 1) {
      tag = '[Pre-Chorus: Rising Emotion]';
    } else if (chunkIdx === 2) {
      tag = '[Chorus: Powerful Belt]';
    } else if (chunkIdx === 3) {
      tag = '[Verse 2: Intimate Narrative]';
    } else if (chunkIdx === 4) {
      tag = '[Chorus: Climactic Vocal Drop]';
    } else if (chunkIdx === 5) {
      tag = '[Bridge: Dynamic High Energy]';
    } else {
      tag = '[Outro: Soft Fade Out]';
    }

    result.push(tag);
    result.push(chunk.join('\n'));
    result.push('');
    chunkIdx++;
  }

  return result.join('\n').trim();
}

function structureMatiMatian(lines: string[]): string {
  const result: string[] = [];

  const verse1: string[] = [];
  const pre1: string[] = [];
  const chorus1: string[] = [];
  const verse2: string[] = [];
  const pre2: string[] = [];
  const chorus2: string[] = [];
  const bridge: string[] = [];
  const outro: string[] = [];

  for (const l of lines) {
    const lower = l.toLowerCase();
    if (
      lower.includes('dua insan') ||
      lower.includes('tercipta') ||
      lower.includes('manis tuturmu') ||
      lower.includes('bagiku kau sempurna')
    ) {
      verse1.push(l);
    } else if (
      lower.includes('memang benar') ||
      lower.includes('dibutakan') ||
      lower.includes('khianati') ||
      lower.includes('tak tahan lagi')
    ) {
      pre1.push(l);
    } else if (
      lower.includes('habis fikir') ||
      lower.includes('berulangkali') ||
      lower.includes('berulang lagi')
    ) {
      verse2.push(l);
    } else if (
      lower.includes('kebanggaanku') ||
      lower.includes('terdalam')
    ) {
      pre2.push(l);
    } else if (lower.includes('bo uh oh')) {
      bridge.push(l);
    } else if (lower.includes('ho tuhan')) {
      outro.push(l);
    } else if (
      lower.includes('mati-matian') ||
      lower.includes('walau sakit') ||
      lower.includes('habis-habisan') ||
      lower.includes('tuhan ini cinta')
    ) {
      if (verse2.length === 0) {
        chorus1.push(l);
      } else if (bridge.length > 0) {
        bridge.push(l);
      } else {
        chorus2.push(l);
      }
    } else {
      if (verse1.length < 4) verse1.push(l);
      else if (verse2.length < 4) verse2.push(l);
      else outro.push(l);
    }
  }

  if (verse1.length > 0) {
    result.push('[Verse 1: Soft Intimate Emotion]');
    result.push(verse1.join('\n'));
    result.push('');
  }

  if (pre1.length > 0) {
    result.push('[Pre-Chorus: Rising Tension]');
    result.push(pre1.join('\n'));
    result.push('');
  }

  if (chorus1.length > 0) {
    result.push('[Chorus: Powerful Emotional Belt]');
    result.push(chorus1.join('\n'));
    result.push('');
  }

  if (verse2.length > 0) {
    result.push('[Verse 2: Intimate Sadness]');
    result.push(verse2.join('\n'));
    result.push('');
  }

  if (pre2.length > 0) {
    result.push('[Pre-Chorus 2: Dynamic Build]');
    result.push(pre2.join('\n'));
    result.push('');
  }

  if (chorus2.length > 0) {
    result.push('[Chorus: Climactic Vocal]');
    result.push(chorus2.join('\n'));
    result.push('');
  }

  if (bridge.length > 0) {
    result.push('[Bridge: High Range Soulful]');
    result.push(bridge.join('\n'));
    result.push('');
  }

  if (outro.length > 0) {
    result.push('[Outro: Melancholic Soft Fade]');
    result.push(outro.join('\n'));
  }

  return result.join('\n').trim();
}

/**
 * Backward compatibility alias for general cloaking
 */
export function cloakLyrics(
  rawText: string,
  mode: 'en' | 'id',
  injectGhost = false,
  _cloakLevel: LyricCloakLevel = 'natural',
  includeTags = false
): string {
  if (mode === 'id') {
    return sunoMonophoneCloak(rawText, injectGhost, includeTags);
  }
  return naturalLegatoCloak(rawText, injectGhost, includeTags);
}

/**
 * Menghapus semua tag kurung siku [...]
 */
export function stripAllBracketTags(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !(trimmed.startsWith('[') && trimmed.endsWith(']'));
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const SAMPLE_LYRICS_EN = `I'm tired of being what you want me to be
Feeling so faithless, lost under the surface
Don't know what you're expecting of me
Put under the pressure of walking in your shoes

Every step that I take is another mistake to you
(Caught in the undertow, just caught in the undertow)

I've become so numb, I can't feel you there
Become so tired, so much more aware
I'm becoming this, all I want to do
Is be more like me and be less like you

Can't you see that you're smothering me?
Holding too tightly, afraid to lose control
'Cause everything that you thought I would be
Has fallen apart right in front of you`;

export const SAMPLE_LYRICS_ID = `Malam ini ku sendiri lagi
Menatap bintang yang bersinar di langit senja
Teringat janji sucimu yang pernah kau ucapkan
Kelingan tresno suci naliko semono

Jangan pernah kau pergi tinggalkan diriku
Cinta ini terlalu tulus untuk kau sakiti
Kowe sing dadi pepuja ning ati
Nanging saiki kowe lungo ninggal tatu`;

export const SAMPLE_MAHALINI_MATIMATIAN = `Kita adalah dua insan penuh cinta
Di awal tercipta kisah kita
Manis tuturmu buatku terpana
Bagiku kau sempurna
Memang benar semua kata mereka
Benarku tlah dibutakan cinta
Tak hanya sekali kau khianati
Sudah cukup ku tak tahan lagi
Mati-matian ku membelamu di depan mereka
Walau sakit tetap ku percaya kau beda dari lainnya
Habis-habisan ku dibohongi sayang ini tetap sama
Tuhan ini cinta atau bodoh
Habis fikir dengan sifatmu itu
Berulangkali ku maafkan
Berulang lagi kau lakukan ah
Satu satunya kebanggaanku
Kini jadi rasa sakit terdalam
Mati-matian ku membelamu di depan mereka
Walau sakit tetap ku percaya kau beda dari lainnya
Habis-habisan ku dibohongi sayang ini tetap sama
Tuhan ini cinta atau bodoh
Bo uh oh
Walau sakit tetap ku percaya kau beda dari lainnya
Habis-habisan ku dibohongi sayang ini tetap sama
Tuhan ini cinta atau bodoh
Ho Tuhan ini cinta atau bodoh`;

export const SAMPLE_CICAK_PARODI = `Cicak-cicak di dinding
Diam-diam merayap
Datang seekor nyamuk
Hap. Lalu ditangkap
Katak-katak di sungai
Diam-diam berenang
Datang seekor lalat
Yuk. Langsung dilahap
Ayam jago berkokok
Kukuruyuk
Tandanya sudah pagi
Yuk segera mandi
Cumi-cumi di laut
Berjalan pelan-pelan
Datang seekor musuh
Lalu disemprot`;

export const SAMPLE_MINANG_MALUMALU = `Ma-lu, ma-lu, de-nai ta-ma-lu
Ma-to lin-cah mam-bu-ek sa-lah ting-kah
Dek U-da ga-gah ba-na, man-da-yo, sung-gu-ah man-da-yo
Lah bak ra-so de-nai nan pu-nyo
Ka-nai ha-ti, sa-ba-na ka-nai ha-ti
Si-ang ma-lam, U-da yo nan ta-ba-yang
Mim-pi, de-nai ba-mim-pi U-da ja-di san-da-ran ha-ti
Lah bak ra-so di pa-la-mi-nan
Sa-ba-na ci-i-nan, on-deh-ndeh
Sa-ba-na ka-tu-ju
Rin-du ba-na, ta-ra-gak ba-na
Ji-kok in-dak ba-ta-mu pan-dang
Sa-ba-na-lah su-ko, on-deh-ndeh
Sa-ba-na-lah ni-o
Da-tang-lah da-tang, ta-mu-i de-nai
Ka-to-kan cin-to jo ra-so sa-yang`;
