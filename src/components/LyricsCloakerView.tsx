import React, { useState } from 'react';
import {
  FileText,
  Copy,
  Check,
  Trash2,
  Zap,
  Music2,
  Tag,
  Eraser,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import {
  cloakLyrics,
  sunoMonophoneCloak,
  syllablePacingCloak,
  naturalLegatoCloak,
  vowelMelodicMusicCloak,
  countSyllablesInLine,
  stripAllBracketTags,
  SAMPLE_LYRICS_EN,
  SAMPLE_MAHALINI_MATIMATIAN,
  SAMPLE_MINANG_MALUMALU,
  SAMPLE_CICAK_PARODI,
} from '../utils/lyricsCloaker';
import {
  arabicHomoglyphCloak,
  smoothTartilCloak,
  SAMPLE_AYAT_KURSI_RAW,
  SAMPLE_AYAT_SERIBU_DINAR_RAW,
  MaqamStyle,
  CadenceMode,
  MAQAM_CONFIGS,
} from '../utils/arabicCloaker';

const SAMPLE_KANGEN_PUJAANHATI = `Hei pujaan hati apa kabarmu
Ku harap kau baik-baik saja
Pujaan hati andai kau tahu
Ku sangat mencintai dirimu

Jangan pernah kau ragukan
Kesetiaan hatiku padamu
Ku berjanji kan selalu menjaga
Cinta suci kita berdua`;

export type MusicPresetType = 'suno-monophone' | 'syllable-pacing' | 'natural-legato' | 'vowel-melodic';

export const LyricsCloakerView: React.FC = () => {
  const [langMode, setLangMode] = useState<'ar' | 'en' | 'id'>('id');
  const [arSubMode, setArSubMode] = useState<'homoglyph' | 'tartil'>('homoglyph');
  const [cadenceMode, setCadenceMode] = useState<CadenceMode>('flowing');
  const [musicPreset, setMusicPreset] = useState<MusicPresetType>('suno-monophone');
  const [includeTags, setIncludeTags] = useState<boolean>(false);
  const [selectedMaqam, setSelectedMaqam] = useState<MaqamStyle>('nahawand');
  const [ghostShield, setGhostShield] = useState<boolean>(false);
  const [showMeterInspector, setShowMeterInspector] = useState<boolean>(false);
  const [rawLyrics, setRawLyrics] = useState<string>(SAMPLE_MAHALINI_MATIMATIAN);
  const [cloakedLyrics, setCloakedLyrics] = useState<string>(() =>
    sunoMonophoneCloak(SAMPLE_MAHALINI_MATIMATIAN, false, false)
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [styleCopied, setStyleCopied] = useState<boolean>(false);
  const [styleSingleCopied, setStyleSingleCopied] = useState<boolean>(false);

  const generateOutput = (
    text: string = rawLyrics,
    lang: 'ar' | 'en' | 'id' = langMode,
    mPreset: MusicPresetType = musicPreset,
    arMode: 'homoglyph' | 'tartil' = arSubMode,
    cMode: CadenceMode = cadenceMode,
    withTags: boolean = includeTags,
    ghost: boolean = ghostShield
  ): string => {
    if (!text.trim()) return '';
    let result = '';
    if (lang === 'ar') {
      if (arMode === 'homoglyph') {
        result = arabicHomoglyphCloak(text, selectedMaqam, cMode, false, withTags);
      } else {
        result = smoothTartilCloak(text, selectedMaqam, cMode, false, withTags);
      }
    } else {
      if (mPreset === 'suno-monophone') {
        result = sunoMonophoneCloak(text, ghost, withTags);
      } else if (mPreset === 'syllable-pacing') {
        result = syllablePacingCloak(text, ghost, withTags);
      } else if (mPreset === 'natural-legato') {
        result = naturalLegatoCloak(text, ghost, withTags);
      } else if (mPreset === 'vowel-melodic') {
        result = vowelMelodicMusicCloak(text, lang, ghost, withTags);
      } else {
        result = cloakLyrics(text, lang, ghost, 'natural', withTags);
      }
    }

    if (!withTags) {
      result = stripAllBracketTags(result);
    }
    return result;
  };

  const handleCloak = (overrideCadence?: CadenceMode) => {
    const cMode = overrideCadence || cadenceMode;
    setCloakedLyrics(generateOutput(rawLyrics, langMode, musicPreset, arSubMode, cMode, includeTags, ghostShield));
  };

  const handleMusicPresetChange = (preset: MusicPresetType) => {
    setMusicPreset(preset);
    setCloakedLyrics(generateOutput(rawLyrics, langMode, preset, arSubMode, cadenceMode, includeTags, ghostShield));
  };

  const handleToggleTags = (tagsEnabled: boolean) => {
    setIncludeTags(tagsEnabled);
    setCloakedLyrics(generateOutput(rawLyrics, langMode, musicPreset, arSubMode, cadenceMode, tagsEnabled, ghostShield));
  };

  const handleStripAllTagsNow = () => {
    setCloakedLyrics((prev) => stripAllBracketTags(prev));
    setIncludeTags(false);
  };

  const handleMaqamChange = (maqam: MaqamStyle) => {
    setSelectedMaqam(maqam);
    if (langMode === 'ar') {
      setCloakedLyrics(generateOutput(rawLyrics, 'ar', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
    }
  };

  const handleCopy = () => {
    if (!cloakedLyrics) return;
    navigator.clipboard.writeText(cloakedLyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyStyle = (prompt: string, singleLine = false) => {
    const textToCopy = singleLine ? prompt.replace(/\n+/g, ' ') : prompt;
    navigator.clipboard.writeText(textToCopy);
    if (singleLine) {
      setStyleSingleCopied(true);
      setTimeout(() => setStyleSingleCopied(false), 2000);
    } else {
      setStyleCopied(true);
      setTimeout(() => setStyleCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setRawLyrics('');
    setCloakedLyrics('');
  };

  const switchLanguage = (lang: 'ar' | 'en' | 'id') => {
    setLangMode(lang);
    if (lang === 'ar') {
      setRawLyrics(SAMPLE_AYAT_KURSI_RAW);
      setCloakedLyrics(generateOutput(SAMPLE_AYAT_KURSI_RAW, 'ar', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
    } else if (lang === 'en') {
      setRawLyrics(SAMPLE_LYRICS_EN);
      setCloakedLyrics(generateOutput(SAMPLE_LYRICS_EN, 'en', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
    } else {
      setRawLyrics(SAMPLE_MAHALINI_MATIMATIAN);
      setCloakedLyrics(generateOutput(SAMPLE_MAHALINI_MATIMATIAN, 'id', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
    }
  };

  const activeMaqamConfig = MAQAM_CONFIGS[selectedMaqam] || MAQAM_CONFIGS.nahawand;
  const currentStylePrompt = langMode === 'ar'
    ? activeMaqamConfig.sunoStylePrompt
    : [
        'Emotional Indonesian pop ballad,',
        'articulate Indonesian vocal diction,',
        'fluent native pronunciation,',
        'clear melodic vocal phrasing,',
        'no staccato robotic glitch,',
        'powerful female lead vocal,',
        'intimate piano intro,',
        'dramatic orchestral strings build-up,',
        'intense soaring chorus belt,',
        'crisp studio vocal production',
      ].join('\n');

  // Breakdown baris output untuk meter visualizer
  const outputLines = cloakedLyrics.split('\n');

  return (
    <div className="space-y-6">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <span>Penataan Naskah & Lirik Suno</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 border border-white/[0.1]">
              v5.0 Monofon
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Solusi pemenggalan suku kata alami, monofon fonetik akurat, dan metrum birama agar lirik dinyanyikan pas di Suno AI.
          </p>
        </div>

        {/* Language Segmented Control (macOS Style) */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto shrink-0">
          <button
            onClick={() => switchLanguage('id')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              langMode === 'id'
                ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            Pop Indo & Daerah
          </button>
          <button
            onClick={() => switchLanguage('ar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              langMode === 'ar'
                ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            Arab & Tartil
          </button>
          <button
            onClick={() => switchLanguage('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              langMode === 'en'
                ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Main Settings Card */}
      <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        {/* Arabic Mode: Maqamat Selection */}
        {langMode === 'ar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                PILIH MAQAMAT / IRAMA TARTIL
              </span>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                {activeMaqamConfig.name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(MAQAM_CONFIGS) as MaqamStyle[]).map((mKey) => {
                const item = MAQAM_CONFIGS[mKey];
                const isSel = selectedMaqam === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => handleMaqamChange(mKey)}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSel
                        ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                        : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                      {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                    </div>
                    <div className={`text-[11px] mt-1 truncate ${isSel ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {item.shortDesc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Arabic Sub-modes & Cadence */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">FORMAT:</span>
                <button
                  type="button"
                  onClick={() => {
                    setArSubMode('homoglyph');
                    setCloakedLyrics(arabicHomoglyphCloak(rawLyrics, selectedMaqam, cadenceMode, false, includeTags));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    arSubMode === 'homoglyph'
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  Arab (Tatweel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArSubMode('tartil');
                    setCloakedLyrics(smoothTartilCloak(rawLyrics, selectedMaqam, cadenceMode, false, includeTags));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    arSubMode === 'tartil'
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  Latin Tartil
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">NAFAS:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCadenceMode('flowing');
                    handleCloak('flowing');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                    cadenceMode === 'flowing'
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  Mengalun (Nafas Panjang)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCadenceMode('full_ayah');
                    handleCloak('full_ayah');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                    cadenceMode === 'full_ayah'
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  1 Ayat Penuh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCadenceMode('raw_lines');
                    handleCloak('raw_lines');
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition ${
                    cadenceMode === 'raw_lines'
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  Sesuai Baris
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Music Modes (ID / EN) */}
        {langMode !== 'ar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300">
                PILIH PRESET PEMENGGALAN & MONOFON
              </span>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                {musicPreset === 'suno-monophone'
                  ? '⭐ Suku Kata Asimetris (Di-am, diam,)'
                  : musicPreset === 'syllable-pacing'
                  ? '⭐ Soft-H Monofon (Dhiam, dhiam,)'
                  : musicPreset === 'natural-legato'
                  ? 'Natural Legato'
                  : 'Vowel-Shift Melodic'}
              </span>
            </div>

            {/* 4 Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Preset 1: Suku Kata & Asimetris (Di-am, diam, + laut + Lah-lu) */}
              <button
                type="button"
                onClick={() => handleMusicPresetChange('suno-monophone')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  musicPreset === 'suno-monophone'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <span>Suku Kata Asimetris</span>
                      <span className="text-[10px] text-emerald-300 font-normal">⭐ Lolos</span>
                    </span>
                    {musicPreset === 'suno-monophone' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-1 font-mono ${musicPreset === 'suno-monophone' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    Di-am, diam, | di laut.
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">
                  Kata ulang pendek asimetris (<code className="text-zinc-300">Di-am, diam,</code>), <code className="text-zinc-300">laut</code> utuh &amp; <code className="text-zinc-300">Lah-lu</code>.
                </div>
              </button>

              {/* Preset 2: Soft-H Monofon (Dhiam, dhiam, + laut + Lah-lu) */}
              <button
                type="button"
                onClick={() => handleMusicPresetChange('syllable-pacing')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  musicPreset === 'syllable-pacing'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <span>Soft-H Monofon</span>
                      <span className="text-[10px] text-emerald-300 font-normal">⭐ Halus</span>
                    </span>
                    {musicPreset === 'syllable-pacing' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-1 font-mono ${musicPreset === 'syllable-pacing' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    Dhiam, dhiam, | Lah-lu
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">
                  Sisipan <code className="text-zinc-300">h</code> halus (<code className="text-zinc-300">Dhiam</code> utuh tanpa dipenggal) agar vokal lebih mengalir.
                </div>
              </button>

              {/* Preset 3: Natural Legato */}
              <button
                type="button"
                onClick={() => handleMusicPresetChange('natural-legato')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  musicPreset === 'natural-legato'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Natural Legato</span>
                    {musicPreset === 'natural-legato' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-1 ${musicPreset === 'natural-legato' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    cinta, tercipta
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">
                  Kata utuh tanpa tanda hubung untuk vokal mengalir/cepat.
                </div>
              </button>

              {/* Preset 4: Vowel-Shift Melodic */}
              <button
                type="button"
                onClick={() => handleMusicPresetChange('vowel-melodic')}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  musicPreset === 'vowel-melodic'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Vowel-Shift (~)</span>
                    {musicPreset === 'vowel-melodic' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                  </div>
                  <div className={`text-[11px] mt-1 ${musicPreset === 'vowel-melodic' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    cintá~, terciptá~
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 mt-2">
                  Vokal beraksen & simbol sustain lagu melow.
                </div>
              </button>
            </div>

            {/* Tag Controls, Meter Toggle & Zero-Width Shield */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">PILIHAN:</span>
                <button
                  type="button"
                  onClick={() => handleToggleTags(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    !includeTags
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  Tanpa Tag [...]
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTags(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    includeTags
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>Sertakan [Verse/Chorus]</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMeterInspector(!showMeterInspector)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                    showMeterInspector
                      ? 'bg-[#2c2e38] text-white font-medium border border-white/15 shadow-sm'
                      : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>{showMeterInspector ? 'Sembunyikan Metrum' : 'Cek Metrum Suku Kata'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 bg-black/30 px-3 py-1.5 rounded-lg border border-white/[0.06]">
                  <input
                    type="checkbox"
                    checked={ghostShield}
                    onChange={(e) => {
                      setGhostShield(e.target.checked);
                      setCloakedLyrics(generateOutput(rawLyrics, langMode, musicPreset, arSubMode, cadenceMode, includeTags, e.target.checked));
                    }}
                    className="w-3.5 h-3.5 rounded accent-white"
                  />
                  <span className="font-medium text-zinc-300">Invisible Zero-Width Shield</span>
                </label>
              </div>
            </div>

            {/* Helper note */}
            <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 bg-black/20 p-2 rounded-lg border border-white/[0.04]">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                <strong>Kaidah Lolos Suno 100%:</strong> Mode <em>Suku Kata &amp; Bait</em> memenggal semua kata bersuku kata ≥2 dengan tanda hubung rapat (seperti <code className="text-zinc-200">Di-am</code>, <code className="text-zinc-200">A-yam</code>, <code className="text-zinc-200">se-e-kor</code>), menjaga kata 1 suku kata tetap utuh (<code className="text-zinc-200">di</code>, <code className="text-zinc-200">Hap.</code>, <code className="text-zinc-200">Yuk.</code>), merapikan kata ulang dengan koma/spasi tanpa <code className="text-zinc-200"> - </code>, serta mengelompokkan bait per 2 baris.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preset Quick Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 font-mono text-[10px] uppercase">Contoh Cepat:</span>

        <button
          onClick={() => {
            setLangMode('id');
            setMusicPreset('suno-monophone');
            setRawLyrics(SAMPLE_CICAK_PARODI);
            setCloakedLyrics(generateOutput(SAMPLE_CICAK_PARODI, 'id', 'suno-monophone', arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 px-2.5 py-1 rounded-lg transition font-medium"
        >
          ⭐ Cicak-Cicak (Format Lolos 100%)
        </button>

        <button
          onClick={() => {
            setLangMode('id');
            setMusicPreset('suno-monophone');
            setRawLyrics(SAMPLE_MAHALINI_MATIMATIAN);
            setCloakedLyrics(generateOutput(SAMPLE_MAHALINI_MATIMATIAN, 'id', 'suno-monophone', arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Mahalini: Mati-Matian
        </button>

        <button
          onClick={() => {
            setLangMode('id');
            setMusicPreset('suno-monophone');
            setRawLyrics(SAMPLE_KANGEN_PUJAANHATI);
            setCloakedLyrics(generateOutput(SAMPLE_KANGEN_PUJAANHATI, 'id', 'suno-monophone', arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Kangen Band: Pujaan Hati
        </button>

        <button
          onClick={() => {
            setLangMode('id');
            setMusicPreset('suno-monophone');
            setRawLyrics(SAMPLE_MINANG_MALUMALU);
            setCloakedLyrics(generateOutput(SAMPLE_MINANG_MALUMALU, 'id', 'suno-monophone', arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Minang: Malu-Malu Denai
        </button>

        <button
          onClick={() => {
            setLangMode('en');
            setRawLyrics(SAMPLE_LYRICS_EN);
            setCloakedLyrics(generateOutput(SAMPLE_LYRICS_EN, 'en', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Linkin Park: Numb
        </button>

        <button
          onClick={() => {
            setLangMode('ar');
            setRawLyrics(SAMPLE_AYAT_KURSI_RAW);
            setCloakedLyrics(generateOutput(SAMPLE_AYAT_KURSI_RAW, 'ar', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Ayat Kursi
        </button>

        <button
          onClick={() => {
            setLangMode('ar');
            setRawLyrics(SAMPLE_AYAT_SERIBU_DINAR_RAW);
            setCloakedLyrics(generateOutput(SAMPLE_AYAT_SERIBU_DINAR_RAW, 'ar', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Ayat Seribu Dinar
        </button>
      </div>

      {/* Dual Textboxes Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Original Lyrics */}
        <div className="lg:col-span-5 bg-[#14151b] border border-white/[0.08] rounded-2xl p-4 flex flex-col h-[520px]">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-2">
            <span className="text-xs font-semibold text-zinc-300">
              Naskah Input Asli
            </span>
            <button
              onClick={handleClear}
              className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 bg-white/[0.04] hover:bg-rose-500/10 px-2 py-1 rounded-lg transition border border-white/[0.06]"
            >
              <Trash2 className="w-3 h-3" />
              <span>Bersihkan</span>
            </button>
          </div>

          <textarea
            value={rawLyrics}
            onChange={(e) => setRawLyrics(e.target.value)}
            placeholder="Tempel naskah atau lirik di sini..."
            className={`flex-1 w-full bg-transparent resize-none text-xs sm:text-sm text-zinc-200 leading-relaxed focus:outline-none p-1 placeholder:text-zinc-600 ${
              langMode === 'ar' ? 'text-right font-serif text-base' : 'font-mono'
            }`}
            dir={langMode === 'ar' ? 'rtl' : 'ltr'}
          />

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>{rawLyrics.split('\n').filter((l) => l.trim().length > 0).length} Baris Naskah</span>
            <span>{rawLyrics.length} Karakter</span>
          </div>
        </div>

        {/* Center: Action Button */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center py-4 lg:py-40 gap-2">
          <button
            onClick={() => handleCloak()}
            className="w-full sm:w-auto bg-[#2c2e38] hover:bg-[#363845] text-white px-5 py-4 rounded-2xl shadow-sm border border-white/15 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 font-medium text-xs sm:text-sm"
          >
            <Zap className="w-5 h-5 text-zinc-300" />
            <span>Format Naskah</span>
          </button>
          <span className="text-[10px] text-zinc-500 text-center font-mono">
            {langMode === 'id' ? 'Pemenggalan & Monofon' : 'Struktur & Format'}
          </span>
        </div>

        {/* Right: Cloaked Output */}
        <div className="lg:col-span-5 bg-[#14151b] border border-white/[0.12] rounded-2xl p-4 flex flex-col h-[520px] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] mb-2 gap-2">
            <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <span>Hasil Terformat (Siap Suno)</span>
              {musicPreset === 'suno-monophone' && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Monofon Pas
                </span>
              )}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleStripAllTagsNow}
                title="Hapus semua tag bracket [...]"
                className="text-[11px] text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg transition border border-white/[0.06] flex items-center gap-1"
              >
                <Eraser className="w-3 h-3 text-zinc-400" />
                <span>Hapus Tag</span>
              </button>

              <button
                onClick={handleCopy}
                className="text-[11px] font-medium text-white bg-[#2c2e38] hover:bg-[#363845] border border-white/15 px-3.5 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
                <span>{copied ? 'Tersalin' : 'Salin Naskah'}</span>
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={cloakedLyrics}
            placeholder="Hasil naskah terformat studio akan muncul di sini..."
            className={`flex-1 w-full bg-transparent resize-none text-xs sm:text-sm text-zinc-100 leading-relaxed focus:outline-none p-1 placeholder:text-zinc-600 ${
              langMode === 'ar' && arSubMode === 'homoglyph' ? 'text-right font-serif text-base' : 'font-mono'
            }`}
            dir={langMode === 'ar' && arSubMode === 'homoglyph' ? 'rtl' : 'ltr'}
          />

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Status: Siap Tempel ke Kolom Lyrics Suno</span>
            <span>{cloakedLyrics.length} Karakter</span>
          </div>
        </div>
      </div>

      {/* Syllable Meter Inspector (Metrum Birama Suku Kata per Baris) */}
      {showMeterInspector && langMode !== 'ar' && (
        <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-300" />
              <h4 className="text-xs font-semibold text-white">
                Inspektur Metrum & Ketukan Suku Kata per Baris
              </h4>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">
              Ideal untuk lagu pop/ballad 4/4: 6 - 10 suku kata per baris
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2">
            {outputLines.map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return null;
              const isTag = trimmed.startsWith('[') && trimmed.endsWith(']');
              const count = isTag ? 0 : countSyllablesInLine(trimmed);

              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg border ${
                    isTag
                      ? 'bg-black/30 border-white/[0.04] text-zinc-500 font-mono'
                      : 'bg-black/20 border-white/[0.06] text-zinc-300 font-mono'
                  }`}
                >
                  <span className="truncate pr-4">{trimmed}</span>
                  {!isTag && (
                    <span
                      className={`shrink-0 font-mono text-[10px] px-2 py-0.5 rounded ${
                        count >= 6 && count <= 10
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : count > 12
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]'
                      }`}
                    >
                      {count} ketukan
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Style of Music Prompt Box */}
      <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Prompt Kolom &quot;Style of Music&quot; di Suno AI</span>
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Salin prompt berikut ke kolom Style of Music di Suno AI untuk mengunci kejelasan diksi vokal bahasa Indonesia.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyStyle(currentStylePrompt, false)}
              className="bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              {styleCopied ? <Check className="w-3.5 h-3.5 text-zinc-200" /> : <Copy className="w-3.5 h-3.5 text-zinc-300" />}
              <span>{styleCopied ? 'Tersalin' : 'Salin Semua Baris'}</span>
            </button>

            <button
              onClick={() => handleCopyStyle(currentStylePrompt, true)}
              className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border border-white/[0.08] active:scale-95"
            >
              {styleSingleCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <FileText className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{styleSingleCopied ? 'Tersalin 1 Baris' : '1 Baris'}</span>
            </button>
          </div>
        </div>

        <pre className="text-xs text-zinc-300 font-mono leading-relaxed select-all whitespace-pre-wrap p-3 bg-black/30 rounded-xl border border-white/[0.06] overflow-x-auto">
          {currentStylePrompt}
        </pre>
      </div>
    </div>
  );
};
