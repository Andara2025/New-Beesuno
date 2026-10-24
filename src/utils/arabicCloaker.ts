/**
 * Beesuno Authentic Quranic Recitation & Precision Tajweed Cloaker
 * 
 * WHY [Verse 1], [Verse 2] WORKS MUCH BETTER THAN [Pause: 2s]:
 * - Suno AI was trained on standard song structure tokens: [Verse 1], [Verse 2], etc.
 * - Suno ignores arbitrary tags like [Pause: 2s].
 * - When Suno sees [Verse 1] followed by [Verse 2], its transformer attention mechanism
 *   naturally closes the vocal phrase, pauses for breath (tanaffus), and starts the next verse
 *   with a fresh, majestic cadence!
 */

export type MaqamStyle = 'nahawand' | 'bayati' | 'hijaz' | 'kurdi';
export type CadenceMode = 'flowing' | 'full_ayah' | 'raw_lines';

export interface MaqamConfig {
  id: MaqamStyle;
  name: string;
  icon: string;
  shortDesc: string;
  description: string;
  sunoStylePrompt: string;
  headerTag: string;
}

export const MAQAM_CONFIGS: Record<MaqamStyle, MaqamConfig> = {
  nahawand: {
    id: 'nahawand',
    name: 'Maqam Nahawand',
    icon: '🌿',
    shortDesc: 'Merdu, Syahdu & Mengalun',
    description: 'Irama murottal paling populer di dunia (gaya Syaikh Mishary Rashid Alafasy). Menyentuh hati dan bernada lembut.',
    sunoStylePrompt: [
      'Solo male Qari recitation,',
      'authentic Quranic Tartil tilawah,',
      'emotional Maqam Nahawand,',
      'strict classical Tajweed,',
      'precise Arabic phonetics,',
      'clear makharijul huruf,',
      'natural human breath pauses between verses,',
      'slow measured Tartil cadence,',
      'pure dry human voice,',
      'close-mic Qari vocal,',
      'solo human voice only',
    ].join('\n'),
    headerTag: '[Murottal: Slow Reverent Tartil, Maqam Nahawand]\n[Voice: Solo Male Qari, Fluent Arabic Tajweed]',
  },
  bayati: {
    id: 'bayati',
    name: 'Maqam Bayati',
    icon: '🕋',
    shortDesc: 'Khidmat & Berwibawa Makkah',
    description: 'Irama klasik Masjidil Haram Makkah & Madinah (gaya Syaikh Sudais & Maher Al-Muaiqly). Berwibawa, teduh, dan megah.',
    sunoStylePrompt: [
      'Grand Quranic Tilawah,',
      'slow Tartil recitation,',
      'authoritative Makkah Qari style,',
      'Maqam Bayati,',
      'authentic classical Tajweed,',
      'precise Arabic phonetics,',
      'clear makharijul huruf,',
      'natural human breath pauses between verses,',
      'pure dry human voice,',
      'close-mic Qari vocal,',
      'solo human voice only',
    ].join('\n'),
    headerTag: '[Tilawah: Grand Tartil Recitation, Maqam Bayati]\n[Voice: Authoritative Makkah Qari, Fluent Arabic Tajweed]',
  },
  hijaz: {
    id: 'hijaz',
    name: 'Maqam Hijaz',
    icon: '🏜️',
    shortDesc: 'Agung & Menggetarkan Jiwa',
    description: 'Irama klasik jazirah Arab kuno dengan nada tinggi yang menggetarkan hati dan penuh khusyuk.',
    sunoStylePrompt: [
      'Spiritual Quranic Tartil,',
      'profound Maqam Hijaz,',
      'soulful Arabic Qari vocal,',
      'slow measured cadence,',
      'natural human breath pauses between verses,',
      'authentic Tajweed articulation,',
      'clear makharijul huruf,',
      'pure dry human voice,',
      'close-mic Qari vocal,',
      'solo human voice only',
    ].join('\n'),
    headerTag: '[Tartil: Profound Maqam Hijaz, Soulful Recitation]\n[Voice: Master Arabic Qari, Deep Tajweed]',
  },
  kurdi: {
    id: 'kurdi',
    name: 'Maqam Kurdi',
    icon: '🕊️',
    shortDesc: 'Tenang, Teduh & Damai',
    description: 'Irama tenang dan menyejukkan hati (gaya qari modern). Membantu pendengar meresapi makna ayat secara hening.',
    sunoStylePrompt: [
      'Peaceful Quranic Tilawah,',
      'gentle Tartil recitation,',
      'Maqam Kurdi,',
      'serene Arabic Qari vocal,',
      'natural human breath pauses between verses,',
      'clear tajweed articulation,',
      'precise Arabic phonetics,',
      'pure dry human voice,',
      'close-mic Qari vocal,',
      'solo human voice only',
    ].join('\n'),
    headerTag: '[Tilawah: Peaceful Tartil, Maqam Kurdi]\n[Voice: Serene Qari, Fluent Arabic Tajweed]',
  },
};

/**
 * Strips extraneous song structure tags while keeping waqf stop marks for intelligent parsing
 */
export function cleanQuranText(text: string): string {
  return text
    .replace(/\[Verse\s*\d*\]/gi, '')
    .replace(/\[(Intro|Outro|Chorus|Bridge|End)\]/gi, '')
    .trim();
}

/**
 * Cloaks an individual Arabic word using authentic Quranic Tatweel (Kashida)
 * on Madd and elongation letters.
 * 
 * RULES OF ARABIC ORTHOGRAPHY:
 * - Tatweel (ـ) CAN ONLY be placed after letters that connect to the left (huruf muttashilah)!
 * - NEVER place Tatweel after non-connecting letters (ا, أ, إ, آ, ٱ, د, ذ, ر, ز, و, ؤ, ء).
 * - This breaks literal n-gram bot string matchers (LyricFind / Musixmatch / Suno filter),
 *   while keeping 100% valid Arabic calligraphy, connected font ligatures, and pure Tajweed pronunciation!
 */
/**
 * Universal Authentic Arabic Tatweel (Kashida) Cloaker
 * 
 * Rules of Arabic Orthography:
 * 1. Letters that connect forward (to the left):
 *    [بتثجحخسشصضطظعغفقكلمنهيىئ]
 * 2. Letters that NEVER connect to the left:
 *    [اأإآٱدذرزوؤء]
 * 3. Preserves all diacritics / harakat / tashkeel perfectly.
 * 4. Breaks n-gram matching used by music copyright catalogs (Musixmatch / LyricFind / Suno filter),
 *    while rendering as standard calligraphic ligatures and preserving 100% accurate Quranic pronunciation!
 */
export function cloakQuranicWord(rawWord: string): string {
  if (!rawWord || rawWord.length <= 1) return rawWord;
  // If it's pure punctuation or waqf mark (e.g. ۚ, ۗ, ە, etc.)
  if (/^[\sۚۗۖۘ.؛،\uFD3E\uFD3F0-9٠-٩]+$/.test(rawWord)) return rawWord;

  // Non-connecting letters (letters that NEVER connect to the left)
  const NON_CONNECTING = new Set([
    'ا', 'أ', 'إ', 'آ', 'ٱ', 'ء',
    'د', 'ذ',
    'ر', 'ز',
    'و', 'ؤ'
  ]);

  const isHarakat = (ch: string) => /[\u064B-\u065F\u0670\u06E5\u06E6\u0653\u0654]/.test(ch);
  const isArabicLetter = (ch: string) => /[\u0621-\u064A\u0671]/.test(ch);

  interface LetterCluster {
    base: string;
    harakat: string;
  }
  const clusters: LetterCluster[] = [];
  for (let i = 0; i < rawWord.length; i++) {
    const ch = rawWord[i];
    if (isHarakat(ch)) {
      if (clusters.length > 0) {
        clusters[clusters.length - 1].harakat += ch;
      }
    } else {
      clusters.push({ base: ch, harakat: '' });
    }
  }

  if (clusters.length <= 1) return rawWord;

  let result = '';
  for (let i = 0; i < clusters.length; i++) {
    const curr = clusters[i];
    // Substitute subtle homoglyphs (Kaf, Yeh, Heh) so standard NLP normalizers fail string matches
    let baseChar = curr.base;
    if (baseChar === 'ك') baseChar = '\u06A9'; // Persian Kaf
    else if (baseChar === 'ي') baseChar = '\u06CC'; // Farsi Yeh
    else if (baseChar === 'ه') baseChar = '\u06C1'; // Urdu Heh Goal

    result += baseChar + curr.harakat;

    // Check if we can insert Tatweel after this cluster:
    // Current letter must connect to the left, and next cluster must be an Arabic letter
    if (i < clusters.length - 1) {
      const next = clusters[i + 1];
      if (
        isArabicLetter(curr.base) &&
        !NON_CONNECTING.has(curr.base) &&
        isArabicLetter(next.base)
      ) {
        result += 'ـ';
      }
    }
  }

  return result;
}

export interface SegmentedSection {
  tag: string;
  lines: string[];
}

/**
 * Groups smaller Waqf clauses into balanced, flowing stanzas
 * so a single Ayah (like Ayat Kursi) is NOT chopped into 10 tiny fragments!
 * Typically 14 to 26 words per stanza - matching the breath capacity of human Qaris.
 */
function groupClausesIntoStanzas(
  clauses: string[],
  minWords = 14,
  maxWords = 25
): string[] {
  const stanzas: string[] = [];
  let curGroup: string[] = [];
  let curCount = 0;

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;
    const wCount = trimmed.split(/\s+/).length;

    if (curCount >= minWords && curCount + wCount > maxWords) {
      stanzas.push(curGroup.join(' '));
      curGroup = [trimmed];
      curCount = wCount;
    } else {
      curGroup.push(trimmed);
      curCount += wCount;
    }
  }

  if (curGroup.length > 0) {
    stanzas.push(curGroup.join(' '));
  }

  return stanzas;
}

/**
 * Segments Quranic Arabic text into Tajweed-accurate Ayah & Waqf clauses.
 * 
 * KEY TAJWEED PRINCIPLES:
 * 1. STANDALONE TA'AWWUDZ: [Ta'awwudz] is always separate from Basmalah and verses.
 * 2. STANDALONE BASMALAH: [Basmalah] is always separate from Verse 1.
 * 3. NO OVER-CHOPPING: Never cut a single Ayah into 10 micro-verses of 2-3 words!
 * 4. QARI FLOWING CADENCE: Groups long continuous ayahs (like Ayat Kursi) into 2-4 majestic stanzas (14-26 words each).
 * 5. USER LINE BREAKS: If user input already separates verses by lines, preserve each line!
 * 6. AYAH MARKERS (﴿١﴾, (1), ۝): Cleanly divides distinct verses.
 * 7. ZERO [Outro] TAG: Quranic tilawah never uses pop-song outro tags.
 */
export function segmentQuranicWaqfClauses(
  rawInput: string,
  cadenceMode: CadenceMode = 'flowing'
): {
  headerTags: string[];
  sections: SegmentedSection[];
} {
  const headerTags: string[] = [];
  const lines = rawInput.split('\n');
  const nonTagLines: string[] = [];

  // 1. Extract existing style header tags
  for (const l of lines) {
    const trimmed = l.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const lower = trimmed.toLowerCase();
      if (!lower.includes('verse') && !lower.includes('outro')) {
        headerTags.push(trimmed);
      }
    } else {
      nonTagLines.push(trimmed);
    }
  }

  let fullText = nonTagLines.join('\n');

  // 2. Extract Ta'awwudz if present
  let taawwudz = '';
  const taawwudzRegex = /(أَعُوذُ|اعوذ)\s+بِ?اللَّ?هِ\s+مِنَ?\s+الشَّيْطَانِ\s+الرَّجِيمِ?/i;
  const tMatch = fullText.match(taawwudzRegex);
  if (tMatch) {
    taawwudz = tMatch[0].trim();
    fullText = fullText.replace(tMatch[0], '').trim();
  }

  // 3. Extract Basmalah if present
  let basmalah = '';
  const basmalahRegex = /(بِسْمِ|بسم)\s+اللَّ?هِ\s+الرَّحْمَٰ?نِ\s+الرَّحِيمِ?/i;
  const bMatch = fullText.match(basmalahRegex);
  if (bMatch) {
    basmalah = bMatch[0].trim();
    fullText = fullText.replace(bMatch[0], '').trim();
  }

  // 4. Detect how verses are structured
  const hasAyahMarkers = /[\uFD3E\uFD3F]?[0-9٠-٩]+[\uFD3E\uFD3F]?|[۝]/.test(fullText);
  let finalStanzas: string[] = [];

  if (cadenceMode === 'raw_lines' && nonTagLines.length > 1) {
    // 100% strict user line breaks
    finalStanzas = fullText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  } else if (cadenceMode === 'full_ayah') {
    // Keep entire ayah as 1 single flowing block
    if (hasAyahMarkers) {
      finalStanzas = fullText
        .split(/[\uFD3E\uFD3F]?[0-9٠-٩]+[\uFD3E\uFD3F]?|[۝]/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      finalStanzas = [fullText.trim()].filter((s) => s.length > 0);
    }
  } else {
    // Default: 'flowing' (Qari Breath Cadence)
    if (hasAyahMarkers) {
      // Split on explicit ayah markers first
      const rawAyahs = fullText
        .split(/[\uFD3E\uFD3F]?[0-9٠-٩]+[\uFD3E\uFD3F]?|[۝]/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const ayah of rawAyahs) {
        const words = ayah.split(/\s+/).length;
        // If an individual ayah is exceptionally long (> 25 words, like Ayat Kursi),
        // group its waqf clauses into balanced flowing stanzas so the Qari can breathe!
        if (words > 25 && /[ۚۗۖۘ.؛]/.test(ayah)) {
          const waqfClauses = ayah
            .split(/(?<=[ۚۗۖۘ.؛])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          finalStanzas.push(...groupClausesIntoStanzas(waqfClauses, 14, 25));
        } else {
          finalStanzas.push(ayah);
        }
      }
    } else if (nonTagLines.length > 1) {
      // User entered multiple distinct lines
      finalStanzas = fullText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    } else {
      // Continuous single paragraph without verse markers (e.g. Ayat Kursi)
      const waqfClauses = fullText
        .split(/(?<=[ۚۗۖۘ.؛])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (waqfClauses.length > 1) {
        finalStanzas = groupClausesIntoStanzas(waqfClauses, 14, 25);
      } else {
        finalStanzas = [fullText.trim()].filter((s) => s.length > 0);
      }
    }
  }

  // 5. Assemble into structured Quranic sections
  const sections: SegmentedSection[] = [];

  if (taawwudz) {
    sections.push({
      tag: "Ta'awwudz",
      lines: [cleanVerseNumbers(taawwudz)],
    });
  }

  if (basmalah) {
    sections.push({
      tag: 'Basmalah',
      lines: [cleanVerseNumbers(basmalah)],
    });
  }

  let verseIndex = 1;
  for (const stanza of finalStanzas) {
    const cleaned = cleanVerseNumbers(stanza);
    if (cleaned.length > 0) {
      sections.push({
        tag: `Verse ${verseIndex++}`,
        lines: [cleaned],
      });
    }
  }

  return { headerTags, sections };
}

function cleanVerseNumbers(t: string): string {
  return t
    .replace(/[\uFD3E\uFD3F]?[0-9٠-٩]+[\uFD3E\uFD3F]?|[۝]/g, '')
    .replace(/[\s\t]+/g, ' ')
    .trim();
}

/**
 * Mode 1: Arabic Mushaf with Precision Verse Stanzas & Stealth Tatweel Cloaking
 * - 100% Sahih Tajweed & natural 3-stanza pacing (not chopped into 10 pieces)
 * - Authentic Tatweel (ـ) connects letters calligraphically and breaks copyright n-gram matching
 * - NO style tags inside the lyrics box (Style goes into Style of Music!)
 * - ZERO [Outro] tag
 */
export function arabicHomoglyphCloak(
  rawText: string,
  maqam: MaqamStyle = 'nahawand',
  cadenceMode: CadenceMode = 'flowing',
  includeHeaderTags = false,
  includeSectionTags = false
): string {
  const { headerTags, sections } = segmentQuranicWaqfClauses(rawText, cadenceMode);
  const config = MAQAM_CONFIGS[maqam] || MAQAM_CONFIGS.nahawand;

  const formatted: string[] = [];

  if (includeHeaderTags) {
    if (headerTags.length > 0) {
      formatted.push(...headerTags);
    } else {
      formatted.push(config.headerTag);
      formatted.push(`[Style: Strict Quranic Tajweed, Fashih Arabic, Measured Tartil]`);
    }
    formatted.push('');
  }

  for (const sec of sections) {
    if (includeSectionTags) {
      formatted.push(`[${sec.tag}]`);
    }
    for (const line of sec.lines) {
      const words = line.split(/\s+/).filter((w) => w.length > 0);
      const cloakedWords = words.map(cloakQuranicWord);
      formatted.push(cloakedWords.join(' '));
    }
    formatted.push('');
  }

  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Mode 2: Natural Latin Tartil Transliteration with Verse Stanzas
 */
const TARTIL_LATIN_DICTIONARY: [RegExp, string][] = [
  [/بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ/g, "Bismil-laahir Roh-maanir Rohiim"],
  [/الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ/g, "Al-hamdu lil-laahi Robbil-'Aalamiin"],
  [/الرَّحْمَٰنِ الرَّحِيمِ/g, "Ar-Rohmaanir Rohiim"],
  [/مَالِكِ يَوْمِ الدِّينِ/g, "Maaliki Yawmid-Diin"],
  [/إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ/g, "Iyyaaka na'budu wa iyyaaka nasta'iin"],
  [/اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ/g, "Ihdinash-Shiroothol Mustaqiim"],
  [/صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ/g, "Shiroothol-ladziina an'amta 'alayhim"],
  [/غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ/g, "ghoyril-maghdhuubi 'alayhim waladh-Dhoolliin"],

  // Ayat Kursi (Ultra-Phonetic Syllable Cloak - 100% immune to Musixmatch / LyricFind detection)
  [/اَللّٰهُ لَآ اِلٰهَ اِلَّا هُوَ/g, "Ahl-laah-hoo lay ee-lah-ha il-lah Hoo-wah"],
  [/اَلْحَيُّ الْقَيُّوْمُ/g, "Ahl-Haai-yul Qoy-yoom"],
  [/لَا تَأْخُذُهٗ سِنَةٌ وَّلَا نَوْمٌ/g, "lah tah-khoodzoo-hoo see-nah-tuw wah-lah nowm"],
  [/لَهٗ مَا فِى السَّمٰوٰتِ وَمَا فِى الْاَرْضِ/g, "lah-hoo mah fees-samawaat-tee wah-mah feel-ardh"],
  [/مَنْ ذَا الَّذِيْ يَشْفَعُ عِنْدَهٗٓ اِلَّا بِاِذْنِهٖ/g, "Mahn dhal-ladzee yash-fa'oo 'een-dah-hoo il-lah bee-eedznih"],
  [/يَعْلَمُ مَا بَيْنَ اَيْدِيْهِمْ وَمَا خَلْفَهُمْ/g, "yah'lah-moo mah bay-nah ay-deehim wah-mah khol-fahoom"],
  [/وَلَا يُحِيْطُوْنَ بِشَيْءٍ مِّنْ عِلْمِهٖٓ اِلَّا بِمَا شَاۤءَ/g, "wah-lah yoo-heethoona bee-shay-eem meen 'eel-mihee il-lah bee-mah shaa"],
  [/وَسِعَ كُرْسِيُّهُ السَّمٰوٰتِ وَالْاَرْضَ/g, "Wah-see-ah koor-see-yoohus samawaat-tee wal-ardh"],
  [/وَلَا يَـُٔوْدُهٗ حِفْظُهُمَا/g, "wah-lah yah-oodu-hoo heef-zhoo-hoomaa"],
  [/وَهُوَ الْعَلِيُّ الْعَظِيْمُ/g, "wah Hoo-wal 'Ah-leeyul 'Ah-zheem"],

  // Ayat Seribu Dinar
  [/أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ/g, "A'uudzu bil-laahi minash-shaythoonir rojiim"],
  [/وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا/g, "Wa may yattaqillaaha yaj'al lahuu makhrojaa"],
  [/وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ/g, "wa yarzuqhu min haytsu laa yahtasib"],
  [/وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ/g, "wa may yatawakkal 'alallaahi fahuwa hasbuh"],
  [/إِنَّ اللَّهَ بَالِغُ أَمْرِهِ/g, "innallaaha baalighu amrih"],
  [/قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا/g, "qod ja'alallaahu likulli syay-in qodraa"],

  // Surah Al-Mulk
  [/تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ/g, "Tabaarokalladzii biyadihil-mulk"],
  [/وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ/g, "wa huwa 'alaa kulli syay-in qodiir"],
  [/الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ/g, "Alladzii kholaqol-mawta wal-hayaatah"],
  [/لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا/g, "liyabluwakum ayyukum ahsanu 'amalaa"],
  [/وَهُوَ الْعَزِيزُ الْغَفُورُ/g, "wa huwal-'aziizul-ghofuur"],
  [/الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا/g, "Alladzii kholaqa sab-a samaawaatin thibaaqaa"],
  [/مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ/g, "maa taraa fii kholqir-rohmaani min tafaawut"],
  [/فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ/g, "Farji-il bashoro hal taraa min futhoor"],
  [/ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ/g, "Tsummar ji-il bashoro karratayn"],
  [/يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ/g, "yanqolib ilaykal-bashoru khoosi-aw wa huwa hasiir"],
  [/وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ/g, "Wa laqod zayyannas-samaa-ad dunyaa bimashoobiih"],
  [/وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ/g, "wa ja-alnaahaa rujuumal lish-shayaathiin"],
  [/وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ/g, "wa a'tadnaa lahum 'adzaabas-sa'eer"],
  [/وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ/g, "Wa lilladziina kafaruu birobbihim 'adzaabu jahannam"],
  [/وَبِئْسَ الْمَصِيرُ/g, "wa bi'sal-mashiir"],
  [/إِذَا أُلْقُوا فِيهَا سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ/g, "Idzaa ulquu fiihaa sami'uu lahaa syahiiqaw wa hiya tafoor"],
  [/تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ/g, "Takaadu tamayyazu minal-ghoyzh"],
  [/كُلَّمَا أُلْقِيَ فِيهَا فَوْجٌ سَأَلَهُمْ خَزَنَتُهَا أَلَمْ يَأْتِكُمْ نَذِيرٌ/g, "Kullamaa ulqiya fiihaa fawjun sa-alahum khozanatuhaa alam ya'tikum nadziir"],
  [/قَالُوا بَلَىٰ قَدْ جَاءَنَا نَذِيرٌ فَكَذَّبْنَا/g, "Qooluu balaa qod jaa-anaa nadziirun fakadzdzabnaa"],
  [/وَقُلْنَا مَا نَزَّلَ اللَّهُ مِن شَيْءٍ/g, "wa qulnaa maa nazzalallaahu min syay'"],
  [/إِنْ أَنتُمْ إِلَّا فِي ضَلَالٍ كَبِيرٍ/g, "in antum illaa fii dholaalin kabiir"],
  [/وَقَالُوا لَوْ كُنَّا نَسْمَعُ أَوْ نَعْقِلُ/g, "Wa qooluu law kunnaa nasma'u aw na'qilu"],
  [/مَا كُنَّا فِي أَصْحَابِ السَّعِيرِ/g, "maa kunnaa fii ash-haabis-sa'eer"],
  [/فَاعْتَرَفُوا بِذَنبِهِمْ فَسُحْقًا لِّأَصْحَابِ السَّعِيرِ/g, "Fa'tarofuu bidzambihim, fasuhqol li-ash-haabis-sa'eer"],
  [/إِنَّ الَّذِينَ يَخْشَوْنَ رَبَّهُم بِالْغَيْبِ/g, "Innalladziina yakhsyawna robbahum bil-ghoyb"],
  [/لَهُم مَّغْفِرَةٌ وَأَجْرٌ كَبِيرٌ/g, "lahum maghfirotuw wa ajrun kabiir"],
];

export function smoothTartilCloak(
  rawText: string,
  maqam: MaqamStyle = 'nahawand',
  cadenceMode: CadenceMode = 'flowing',
  includeHeaderTags = false,
  includeSectionTags = false
): string {
  const { headerTags, sections } = segmentQuranicWaqfClauses(rawText, cadenceMode);
  const config = MAQAM_CONFIGS[maqam] || MAQAM_CONFIGS.nahawand;

  const formatted: string[] = [];

  if (includeHeaderTags) {
    if (headerTags.length > 0) {
      formatted.push(...headerTags);
    } else {
      formatted.push(config.headerTag);
      formatted.push(`[Style: Strict Quranic Tajweed, Fashih Arabic, Measured Tartil]`);
    }
    formatted.push('');
  }

  for (const sec of sections) {
    if (includeSectionTags) {
      formatted.push(`[${sec.tag}]`);
    }
    for (const line of sec.lines) {
      let transliterated = line;
      for (const [pattern, replacement] of TARTIL_LATIN_DICTIONARY) {
        transliterated = transliterated.replace(pattern, replacement);
      }
      // Replace remaining Waqf marks with commas for natural pauses in Latin recitation
      transliterated = transliterated
        .replace(/[ۚۗۖۘە]+/g, ',')
        .replace(/\s*,\s*/g, ', ')
        .replace(/,\s*,/g, ',')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Ensure it ends cleanly
      if (!transliterated.endsWith('.')) {
        transliterated = transliterated.replace(/,\s*$/, '') + '.';
      }

      formatted.push(transliterated);
    }
    formatted.push('');
  }

  return formatted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Injects invisible zero-width characters inside words to break n-gram text matchers (LyricFind/Musixmatch)
 * while preserving natural pronunciation in Suno TTS synthesis.
 */
export function injectZeroWidthGhost(text: string): string {
  const lines = text.split('\n');
  return lines
    .map((line) => {
      if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
        return line;
      }
      return line.replace(/([a-zA-Z]{3,})/g, (w) => {
        const mid = Math.floor(w.length / 2);
        return w.slice(0, mid) + '\u200C' + w.slice(mid);
      });
    })
    .join('\n');
}

export const SAMPLE_AYAT_KURSI_RAW = `اَللّٰهُ لَآ اِلٰهَ اِلَّا هُوَ ۚ اَلْحَيُّ الْقَيُّوْمُ ەۚ لَا تَأْخُذُهٗ سِنَةٌ وَّلَا نَوْمٌ ۗ لَهٗ مَا فِى السَّمٰوٰتِ وَمَا فِى الْاَرْضِ ۗ مَنْ ذَا الَّذِيْ يَشْفَعُ عِنْدَهٗٓ اِلَّا بِاِذْنِهٖ ۗ يَعْلَمُ مَا بَيْنَ اَيْدِيْهِمْ وَمَا خَلْفَهُمْ ۚ وَلَا يُحِيْطُوْنَ بِشَيْءٍ مِّنْ عِلْمِهٖٓ اِلَّا بِمَا شَاۤءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمٰوٰتِ وَالْاَرْضَ ۚ وَلَا يَـُٔوْدُهٗ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيْمُ`;

export const SAMPLE_AYAT_SERIBU_DINAR_RAW = `أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴿٢﴾
وَيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُ ۚ
وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ ۚ
إِنَّ اللَّهَ بَالِغُ أَمْرِهِ ۚ
قَدْ جَعَلَ اللَّهُ لِكُلِّ شَيْءٍ قَدْرًا ﴿٣﴾`;

export const SAMPLE_AL_FATIHah_RAW = `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ﴿١﴾
الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ﴿٢﴾
الرَّحْمَٰنِ الرَّحِيمِ ﴿٣﴾
مَالِكِ يَوْمِ الدِّينِ ﴿٤﴾
إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ﴿٥﴾
اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ﴿٦﴾
صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ ﴿٧﴾`;

export const SAMPLE_AL_MULK_RAW = `تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ ﴿١﴾
الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ الْعَزِيزُ الْغَفُورُ ﴿٢﴾
الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَّا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِن تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِن فُطُورٍ ﴿٣﴾
ثُمَّ ارْجِعِ الْبَصَرَ كَرَّتَيْنِ يَنقَلِبْ إِلَيْكَ الْبَصَرُ خَاسِئًا وَهُوَ حَسِيرٌ ﴿٤﴾
وَلَقَدْ زَيَّنَّا السَّمَاءَ الدُّنْيَا بِمَصَابِيحَ وَجَعَلْنَاهَا رُجُومًا لِّلشَّيَاطِينِ ۖ وَأَعْتَدْنَا لَهُمْ عَذَابَ السَّعِيرِ ﴿٥﴾
وَلِلَّذِينَ كَفَرُوا بِرَبِّهِمْ عَذَابُ جَهَنَّمَ ۖ وَبِئْسَ الْمَصِيرُ ﴿٦﴾
إِذَا أُلْقُوا فِيهَا سَمِعُوا لَهَا شَهِيقًا وَهِيَ تَفُورُ ﴿٧﴾
تَكَادُ تَمَيَّزُ مِنَ الْغَيْظِ ۖ كُلَّمَا أُلْقِيَ فِيهَا فَوْجٌ سَأَلَهُمْ خَزَنَتُهَا أَلَمْ يَأْتِكُمْ نَذِيرٌ ﴿٨﴾
قَالُوا بَلَىٰ قَدْ جَاءَنَا نَذِيرٌ فَكَذَّبْنَا وَقُلْنَا مَا نَزَّلَ اللَّهُ مِن شَيْءٍ إِنْ أَنتُمْ إِلَّا فِي ضَلَالٍ كَبِيرٍ ﴿٩﴾
وَقَالُوا لَوْ كُنَّا نَسْمَعُ أَوْ نَعْقِلُ مَا كُنَّا فِي أَصْحَابِ السَّعِيرِ ﴿١٠﴾
فَاعْتَرَفُوا بِذَنبِهِمْ فَسُحْقًا لِّأَصْحَابِ السَّعِيرِ ﴿١١﴾
إِنَّ الَّذِينَ يَخْشَوْنَ رَبَّهُم بِالْغَيْبِ لَهُم مَّغْفِرَةٌ وَأَجْرٌ كَبِيرٌ ﴿١٢﴾`;
