import React, { useState } from 'react';
import { FileText, Copy, Check, Trash2, Zap, Music2, Tag, Eraser, CheckCircle2 } from 'lucide-react';
import {
  cloakLyrics,
  vowelMelodicMusicCloak,
  syllablePacingCloak,
  stripAllBracketTags,
  SAMPLE_LYRICS_EN,
  SAMPLE_MAHALINI_MATIMATIAN,
  SAMPLE_MINANG_MALUMALU,
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

export const LyricsCloakerView: React.FC = () => {
  const [langMode, setLangMode] = useState<'ar' | 'en' | 'id'>('id');
  const [arSubMode, setArSubMode] = useState<'homoglyph' | 'tartil'>('homoglyph');
  const [cadenceMode, setCadenceMode] = useState<CadenceMode>('flowing');
  const [musicPreset, setMusicPreset] = useState<'syllable-pacing' | 'natural' | 'vowel-melodic'>('syllable-pacing');
  const [includeTags, setIncludeTags] = useState<boolean>(false);
  const [selectedMaqam, setSelectedMaqam] = useState<MaqamStyle>('nahawand');
  const [ghostShield, setGhostShield] = useState<boolean>(true);
  const [rawLyrics, setRawLyrics] = useState<string>(SAMPLE_MINANG_MALUMALU);
  const [cloakedLyrics, setCloakedLyrics] = useState<string>(() =>
    syllablePacingCloak(SAMPLE_MINANG_MALUMALU, true, false)
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [styleCopied, setStyleCopied] = useState<boolean>(false);
  const [styleSingleCopied, setStyleSingleCopied] = useState<boolean>(false);

  const generateOutput = (
    text: string = rawLyrics,
    lang: 'ar' | 'en' | 'id' = langMode,
    mPreset: 'syllable-pacing' | 'natural' | 'vowel-melodic' = musicPreset,
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
      if (mPreset === 'syllable-pacing') {
        result = syllablePacingCloak(text, ghost, withTags);
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

  const handleMusicPresetChange = (preset: 'syllable-pacing' | 'natural' | 'vowel-melodic') => {
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
      setRawLyrics(SAMPLE_MINANG_MALUMALU);
      setCloakedLyrics(generateOutput(SAMPLE_MINANG_MALUMALU, 'id', musicPreset, arSubMode, cadenceMode, includeTags, ghostShield));
    }
  };

  const activeMaqamConfig = MAQAM_CONFIGS[selectedMaqam] || MAQAM_CONFIGS.nahawand;
  const currentStylePrompt = langMode === 'ar'
    ? activeMaqamConfig.sunoStylePrompt
    : [
        'Emotional Indonesian pop ballad,',
        'powerful female lead vocal,',
        'intimate piano intro,',
        'dramatic orchestral strings build-up,',
        'intense soaring chorus belt,',
        'melancholic acoustic resonance,',
        'crisp studio vocal production',
      ].join('\n');

  return (
    <div className="space-y-6">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Penataan Naskah & Lirik
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Formatting naskah Arab, murottal maqamat, dan lirik lagu anti-copyright untuk Suno AI.
          </p>
        </div>

        {/* Language Segmented Control (macOS Style) */}
        <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] self-start sm:self-auto shrink-0">
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
                PILIH PRESET CADENCE
              </span>
              <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
                {musicPreset === 'syllable-pacing'
                  ? 'Suku Kata Berirama'
                  : musicPreset === 'vowel-melodic'
                  ? 'Vowel-Shift Melodic'
                  : 'Natural Invisible'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleMusicPresetChange('syllable-pacing')}
                className={`p-3 rounded-xl border text-left transition ${
                  musicPreset === 'syllable-pacing'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Suku Kata Berirama (-)</span>
                  {musicPreset === 'syllable-pacing' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                </div>
                <div className={`text-[11px] mt-1 font-mono ${musicPreset === 'syllable-pacing' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  ma-lu, de-nai ta-ma-lu
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMusicPresetChange('natural')}
                className={`p-3 rounded-xl border text-left transition ${
                  musicPreset === 'natural'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Natural Zero-Width</span>
                  {musicPreset === 'natural' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                </div>
                <div className={`text-[11px] mt-1 ${musicPreset === 'natural' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  Ejaan asli tanpa tanda hubung
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleMusicPresetChange('vowel-melodic')}
                className={`p-3 rounded-xl border text-left transition ${
                  musicPreset === 'vowel-melodic'
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-black/20 border-white/[0.06] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">Vowel-Shift (~)</span>
                  {musicPreset === 'vowel-melodic' && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-200 shrink-0" />}
                </div>
                <div className={`text-[11px] mt-1 ${musicPreset === 'vowel-melodic' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  Vokal beraksen & simbol bernyanyi
                </div>
              </button>
            </div>

            {/* Tag Controls & Zero-Width Shield */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">TAG:</span>
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
              </div>

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
        )}
      </div>

      {/* Preset Quick Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 font-mono text-[10px] uppercase">Contoh Cepat:</span>

        <button
          onClick={() => {
            setLangMode('id');
            setMusicPreset('syllable-pacing');
            setRawLyrics(SAMPLE_MINANG_MALUMALU);
            setCloakedLyrics(generateOutput(SAMPLE_MINANG_MALUMALU, 'id', 'syllable-pacing', arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Minang: Malu-Malu Denai
        </button>

        <button
          onClick={() => {
            setLangMode('id');
            setMusicPreset('syllable-pacing');
            setRawLyrics(SAMPLE_MAHALINI_MATIMATIAN);
            setCloakedLyrics(generateOutput(SAMPLE_MAHALINI_MATIMATIAN, 'id', 'syllable-pacing', arSubMode, cadenceMode, includeTags, ghostShield));
          }}
          className="bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg transition"
        >
          Mahalini: Mati-Matian
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: Original Lyrics */}
        <div className="lg:col-span-5 bg-[#14151b] border border-white/[0.08] rounded-2xl p-4 flex flex-col h-[480px]">
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
            <span>{rawLyrics.split('\n').length} Baris</span>
            <span>{rawLyrics.length} Karakter</span>
          </div>
        </div>

        {/* Center: Action Button */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center py-2">
          <button
            onClick={() => handleCloak()}
            className="w-full sm:w-auto bg-[#2c2e38] hover:bg-[#363845] text-white px-5 py-4 rounded-2xl shadow-sm border border-white/15 flex flex-col items-center justify-center gap-1.5 transition active:scale-95 font-medium text-xs sm:text-sm"
          >
            <Zap className="w-5 h-5 text-zinc-300" />
            <span>Format Naskah</span>
          </button>
        </div>

        {/* Right: Cloaked Output */}
        <div className="lg:col-span-5 bg-[#14151b] border border-white/[0.12] rounded-2xl p-4 flex flex-col h-[480px] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] mb-2 gap-2">
            <span className="text-xs font-semibold text-zinc-200">
              Hasil Terformat (Siap Suno)
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

      {/* Style of Music Prompt Box */}
      <div className="bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-white">
              Prompt Kolom &quot;Style of Music&quot; di Suno AI
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Salin prompt berikut ke kolom Style of Music di Suno AI untuk panduan karakter aransemen vokal.
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
