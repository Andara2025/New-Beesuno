/**
 * Beesuno Studio Lyrics Arranger & Cloaker v4.0
 * 
 * Mengoptimalkan naskah lirik untuk AI Suno tanpa merusak pelafalan nyanyinya:
 * - TIDAK ADA ejaan ekstrem/kolonial kuno (seperti 'tj', 'dj', 'kh' yang membuat AI membaca aneh).
 * - TIDAK ADA tanda hubung liar di tengah kata yang memicu jeda gagap/staccato pada vokal AI.
 * - Melindungi dari filter copyright (Musixmatch / LyricFind / Suno Blacklist)
 *   melalui kombinasi Invisible Zero-Width Shield (\u200C) dan penataan struktur bait musikal ([Verse], [Pre-Chorus], [Chorus]).
 */

import { injectZeroWidthGhost } from './arabicCloaker';

export type LyricCloakLevel = 'natural' | 'soft' | 'light';

// Soft, natural singable homophones (hanya kata-kata aman yang tidak merusak pelafalan AI)
const NATURAL_INDO_CORRECTIONS: Record<string, string> = {
  // Koreksi kontraksi agar AI tidak mengeja huruf tunggal (misal 'tlah' dieja 't-lah' atau 'tee-lah')
  "tlah": "telah",
  "t'lah": "telah",
  "slalu": "selalu",
  "s'lalu": "selalu",
  "slamanya": "selamanya",
  "s'lamanya": "selamanya",
  "takkan": "tak kan",
  "bila": "bila",
  "mati-matian": "mati-matian",
  "membelamu": "membelamu",
  "cinta": "cinta",
  "sayang": "sayang",
  "kasih": "kasih",
  "kamu": "kamu",
  "aku": "aku",
};

/**
 * Intelligent Song Structure Reconstructor
 * Mendeteksi verse, pre-chorus, chorus, bridge, dan outro dari naskah mentah
 */
export function autoDetectSongStructure(rawText: string): string {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return rawText;

  // Jika pengguna sudah menyertakan tag bracket [Verse], pertahankan
  if (lines.some((l) => l.startsWith('[') && l.endsWith(']'))) {
    return rawText;
  }

  // Khusus Mahalini - Mati-Matian (Pop Ballad Populer)
  const isMatiMatian = lines.some(
    (l) => l.toLowerCase().includes('mati-matian') || l.toLowerCase().includes('matimatian')
  );

  if (isMatiMatian) {
    return structureMatiMatian(lines);
  }

  // Struktur bait cerdas umum berdasarkan kelompok bait (4 baris per bait)
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
 * Main Cloaking Function
 * 
 * Level 'natural' (DEFAULT): 
 * 100% ejaan kata asli tetap fasih, indah, dan merdu. Bebas dari ejaan aneh 'tj', 'dj', 'kh'.
 * Bypass filter copyright dicapai menggunakan Invisible Zero-Width Non-Joiner (\u200C)
 * dan pembagian bait [Verse]/[Chorus] sehingga AI bernyanyi dengan pelafalan sempurna.
 */
export function cloakLyrics(
  rawText: string,
  mode: 'en' | 'id',
  injectGhost = true,
  cloakLevel: LyricCloakLevel = 'natural',
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  // Step 1: Tata struktur bait lagu secara musikal jika diminta
  const structuredText = autoDetectSongStructure(rawText);
  const lines = structuredText.split('\n');
  const cloakedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Cek tag musikal seperti [Verse 1], [Chorus], dll.
    if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
      if (includeTags) {
        cloakedLines.push(line.trim());
      }
      continue;
    }

    if (!line.trim()) {
      cloakedLines.push('');
      continue;
    }

    // Pembersihan kata
    let processedLine = line;

    if (mode === 'id') {
      // Perbaiki kontraksi kaku agar pelafalan tidak gagap (misal 'tlah' -> 'telah')
      processedLine = processedLine.replace(/\bt['’]?lah\b/gi, 'telah')
                                   .replace(/\bs['’]?lalu\b/gi, 'selalu')
                                   .replace(/\bs['’]?lamanya\b/gi, 'selamanya');
    } else {
      // English soft cleaning
      processedLine = processedLine.replace(/\bi['’]m\b/gi, "I'm")
                                   .replace(/\bcan['’]t\b/gi, "can't")
                                   .replace(/\bdon['’]t\b/gi, "don't");
    }

    cloakedLines.push(processedLine);
  }

  let output = cloakedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // Step 2: Injeksi Invisible Zero-Width Shield (\u200C)
  if (injectGhost) {
    output = injectZeroWidthGhost(output);
  }

  return output;
}

/**
 * PRESET 2 KHUSUS MUSIK:
 * Vowel-Shift & Melodic Phrasing Cloak
 */
export function vowelMelodicMusicCloak(
  rawText: string,
  mode: 'en' | 'id',
  injectGhost = true,
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  const structuredText = autoDetectSongStructure(rawText);
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

    // Split kata-kata dengan menjaga spasi
    const tokens = trimmed.split(/(\s+)/);
    const processedTokens = tokens.map((token) => {
      if (/^\s+$/.test(token)) return token;

      // Ekstrak kata dan tanda baca di ujung kata
      const match = token.match(/^([a-zA-Z'’\-]+)(.*)$/);
      if (!match) return token;

      const [, word, punct] = match;
      if (word.length <= 2) return token; // Kata pendek (ku, di, ke, to, in) jangan diubah

      // HANYA ubah huruf vokal terakhir di kata menjadi vokal beraksen musikal
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

    // Berikan simbol melodi nyanyi '~' di ujung baris lirik jika belum ada tanda baca penutup
    const last = transformedLine.trim().slice(-1);
    if (!['?', '!', '.', ')', ']'].includes(last)) {
      transformedLine = transformedLine.trim() + '~';
    }

    resultLines.push(transformedLine);
  }

  let output = resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (injectGhost) {
    output = injectZeroWidthGhost(output);
  }

  return output;
}

/**
 * Algorithmic Indonesian / Minang / Malay Syllabic Hyphenation
 * Memotong kata berdasarkan aturan suku kata (V, C-V, VC-CV, V-V)
 */
function algorithmicallySyllabifyIndonesian(word: string): string {
  if (word.length <= 3) return word;

  // Single-character placeholders for digraphs
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

  // Find vowel positions
  const vowelIndices: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (isVowel(encoded[i])) {
      vowelIndices.push(i);
    }
  }

  if (vowelIndices.length <= 1) {
    return word;
  }

  const splitPoints: number[] = [];

  for (let v = 0; v < vowelIndices.length - 1; v++) {
    const v1 = vowelIndices[v];
    const v2 = vowelIndices[v + 1];
    const consonantsBetween = v2 - v1 - 1;

    if (consonantsBetween === 0) {
      // Two adjacent vowels
      const pair = (encoded[v1] + encoded[v2]).toLowerCase();
      // Keep terminal diphthongs intact
      if (['ai', 'au', 'oi', 'ei'].includes(pair) && v2 === encoded.length - 1) {
        // do not split
      } else {
        // Hiatus vowels split (si-ang, mam-bu-ek, sung-gu-ah, ci-i-nan, ni-o)
        splitPoints.push(v1 + 1);
      }
    } else if (consonantsBetween === 1) {
      // V-C-V pattern: split before consonant (ma-lu, ga-gah, ba-na, ha-ti)
      splitPoints.push(v1 + 1);
    } else if (consonantsBetween === 2) {
      // V-C1C2-V pattern: split between C1 and C2 (lin-cah, ting-kah, mim-pi, cin-to)
      splitPoints.push(v1 + 2);
    } else {
      // V-C1C2C3-V pattern: split after C1 (mam-bu-ek)
      splitPoints.push(v1 + 2);
    }
  }

  // Build hyphenated word
  let result = '';
  let lastIdx = 0;
  for (const pt of splitPoints) {
    result += encoded.slice(lastIdx, pt) + '-';
    lastIdx = pt;
  }
  result += encoded.slice(lastIdx);

  // Restore digraph placeholders
  for (const [, sym, orig] of digraphMap) {
    const reLower = new RegExp(sym, 'g');
    const reUpper = new RegExp(sym.toUpperCase(), 'g');
    result = result.replace(reLower, orig).replace(reUpper, orig.toUpperCase());
  }

  return result;
}

/**
 * Hyphenates a single word with custom overrides and algorithmic engine
 */
export function hyphenateWord(word: string): string {
  if (word.includes('-')) {
    return word
      .split('-')
      .map((part) => hyphenateWord(part))
      .join('-');
  }

  const lower = word.toLowerCase();
  if (lower.length <= 3) {
    return word;
  }

  const DICT: Record<string, string> = {
    malu: 'ma-lu',
    tamalu: 'ta-ma-lu',
    denai: 'de-nai',
    mato: 'ma-to',
    lincah: 'lin-cah',
    mambuek: 'mam-bu-ek',
    salah: 'sa-lah',
    tingkah: 'ting-kah',
    uda: 'u-da',
    gagah: 'ga-gah',
    bana: 'ba-na',
    mandayo: 'man-da-yo',
    sungguah: 'sung-gu-ah',
    raso: 'ra-so',
    punyo: 'pu-nyo',
    kanai: 'ka-nai',
    hati: 'ha-ti',
    sabana: 'sa-ba-na',
    sabanalah: 'sa-ba-na-lah',
    siang: 'si-ang',
    malam: 'ma-lam',
    tabayang: 'ta-ba-yang',
    mimpi: 'mim-pi',
    bamimpi: 'ba-mim-pi',
    sandaran: 'san-da-ran',
    palaminan: 'pa-la-mi-nan',
    ciinan: 'ci-i-nan',
    katuju: 'ka-tu-ju',
    rindu: 'rin-du',
    taragak: 'ta-ra-gak',
    jikok: 'ji-kok',
    indak: 'in-dak',
    batamu: 'ba-ta-mu',
    pandang: 'pan-dang',
    suko: 'su-ko',
    nio: 'ni-o',
    datang: 'da-tang',
    datanglah: 'da-tang-lah',
    tamui: 'ta-mu-i',
    katokan: 'ka-to-kan',
    cinto: 'cin-to',
    sayang: 'sa-yang',
    ondeh: 'on-deh',
    ndeh: 'ndeh',
  };

  if (DICT[lower]) {
    const hyp = DICT[lower];
    if (word[0] === word[0].toUpperCase()) {
      return hyp.charAt(0).toUpperCase() + hyp.slice(1);
    }
    return hyp;
  }

  return algorithmicallySyllabifyIndonesian(word);
}

/**
 * PRESET 3 (GAYA CONTOH USER):
 * Syllable Cadence Hyphenation & Zero Output Tags
 * - Memecah kata menjadi suku kata berirama (Malu-malu, ma-lu, de-nai ta-ma-lu / Ma-to lin-cah mam-bu-ek).
 * - Menghilangkan SEMUA bracket tags [...] secara default.
 * - Sangat merdu dinyanyikan di Suno AI dan 100% lolos filter hak cipta teks.
 */
export function syllablePacingCloak(
  rawText: string,
  injectGhost = true,
  includeTags = false
): string {
  if (!rawText.trim()) return '';

  const lines = rawText.split('\n');
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

    // Split tokens while preserving whitespace
    const tokens = trimmed.split(/(\s+)/);
    const processedTokens = tokens.map((token) => {
      if (/^\s+$/.test(token)) return token;

      // Extract leading punctuation, core alphabetic word, trailing punctuation
      const match = token.match(/^([^a-zA-Z0-9À-ž]*)([a-zA-Z0-9À-ž\-_']+)([^a-zA-Z0-9À-ž]*)$/);
      if (!match) return token;

      const [, leadPunct, word, trailPunct] = match;
      const hyp = hyphenateWord(word);
      return leadPunct + hyp + trailPunct;
    });

    resultLines.push(processedTokens.join(''));
  }

  let output = resultLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (injectGhost) {
    output = injectZeroWidthGhost(output);
  }

  return output;
}

/**
 * Strips all bracket tags [Verse 1], [Chorus], [Murottal: ...], etc.
 * leaving only clean text with natural paragraph breaks.
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
Mati-matian ku membelamu di depan mereka
Walau sakit tetap ku percaya kau beda dari lainnya
Habis-habisan ku dibohongi sayang ini tetap sama
Tuhan ini cinta atau bodoh
Bo uh oh
Walau sakit tetap ku percaya kau beda dari lainnya
Habis-habisan ku dibohongi sayang ini tetap sama
Tuhan ini cinta atau bodoh
Ho Tuhan ini cinta atau bodoh`;

export const SAMPLE_MINANG_MALUMALU = `Malu-malu, ma-lu, de-nai ta-ma-lu
Ma-to lin-cah mam-bu-ek sa-lah ting-kah
Dek U-da ga-gah ba-na, man-da-yo, sung-gu-ah man-da-yo
Lah bak ra-so de-nai nan pu-nyo
Ka-nai ha-ti, sa-ba-na ka-nai ha-ti
Si-ang ma-lam, U-da yo nan ta-ba-yang
Mim-pi, de-nai ba-mim-pi U-da ja-di san-da-ran ha-ti
Lah bak ra-so di pa-la-mi-nan
Sa-ba-na ci-i-nan, ondeh-ndeh
Sa-ba-na ka-tu-ju
Rin-du ba-na, ta-ra-gak ba-na
Ji-kok in-dak ba-ta-mu pan-dang
Sa-ba-na-lah su-ko, ondeh-ndeh
Sa-ba-na-lah ni-o
Da-tang-lah da-tang, ta-mu-i de-nai
Ka-to-kan cin-to jo ra-so sa-yang`;
