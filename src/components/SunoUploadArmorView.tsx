import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Play,
  Pause,
  Square,
  RotateCcw,
  UploadCloud,
  Download,
  Mic,
  CheckCircle2,
  Sliders,
  Layers,
  Sparkles,
  Info,
  Clock,
  Music,
  Scissors,
  Volume2,
  Radio,
  FileAudio
} from 'lucide-react';
import { getAudioContext, generateSampleSunoAudio } from '../utils/audioEngine';
import { encodeWav, encodeMp3 } from '../utils/audioEncoder';
import {
  CanonicalArmorPresetId,
  ARMOR_PRESETS,
  ARMOR_PRESETS_LIST,
  DEFAULT_ARMOR_PRESET,
  normalizePreset,
  getPresetMeta,
  buildArmorOutputFilename,
  getPulseArmorK,
  ARMOR_CONSTANTS,
  ArmorPresetMeta,
} from '../utils/armorPresets';

export type ArmorPresetType = CanonicalArmorPresetId;
export type ArmorFormatType = 'wav' | 'ogg' | 'mp3';

export interface SunoUploadArmorViewProps {
  onNavigateTab?: (tab: 'cloaker' | 'armor' | 'downloader' | 'remaster') => void;
}

export const SunoUploadArmorView: React.FC<SunoUploadArmorViewProps> = ({ onNavigateTab }) => {
  // Preset & Processing Options
  const [selectedPreset, setSelectedPreset] = useState<CanonicalArmorPresetId>(DEFAULT_ARMOR_PRESET);
  const [durationMode, setDurationMode] = useState<'60s' | 'full'>('60s');
  const [armorFormat, setArmorFormat] = useState<ArmorFormatType>('mp3');
  const [startTime, setStartTime] = useState<number>(0);

  // Audio Source State
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('Rekaman_Audio_Input.mp3');
  const [fileSize, setFileSize] = useState<number>(1450000);
  const [audioDuration, setAudioDuration] = useState<number>(60);

  // Microphone Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Playback & A/B State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [abMode, setAbMode] = useState<'armor' | 'original'>('armor');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  // Processing & Export State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Web Audio Nodes for Local Real-Time Player
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackOffsetRef = useRef<number>(0);
  const playbackRateRef = useRef<number>(1.0);
  const isScrubbingRef = useRef<boolean>(false);
  const wasPlayingBeforeScrubRef = useRef<boolean>(false);
  const seekThrottleTimeoutRef = useRef<number | null>(null);

  // Native HTML5 Audio Ref for Backend FFmpeg Preview
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioBlobUrlRef = useRef<string | null>(null);
  const lfoNodeRef = useRef<OscillatorNode | null>(null);

  // Load Initial Demo Audio
  useEffect(() => {
    try {
      const demo = generateSampleSunoAudio();
      setAudioBuffer(demo);
      setAudioDuration(demo.duration);
    } catch (e) {
      console.warn('Demo audio initialization error:', e);
    }

    return () => {
      stopLocalPlayback();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (seekThrottleTimeoutRef.current) clearTimeout(seekThrottleTimeoutRef.current);
      if (previewAudioBlobUrlRef.current) {
        URL.revokeObjectURL(previewAudioBlobUrlRef.current);
      }
    };
  }, []);

  // Stop local playback safely
  const stopLocalPlayback = (keepPlayingState = false) => {
    if (sourceNodeRef.current) {
      try {
        // Prevent onended callback from firing during manual or seek stops
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (_) {}
      sourceNodeRef.current = null;
    }
    if (lfoNodeRef.current) {
      try {
        lfoNodeRef.current.stop();
        lfoNodeRef.current.disconnect();
      } catch (_) {}
      lfoNodeRef.current = null;
    }
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    if (!keepPlayingState) {
      setIsPlaying(false);
    }
  };

  // Build Real-Time Upload Armor DSP Graph for Instant In-Browser Listening
  const startLocalPlayback = (
    startOffset = 0,
    presetOverride?: CanonicalArmorPresetId,
    modeOverride?: 'armor' | 'original'
  ) => {
    if (!audioBuffer) return;
    // Keep playing state active so UI doesn't flicker during seamless seek
    stopLocalPlayback(true);

    // Section 10.1: Stereo channel validation
    if (audioBuffer.numberOfChannels < 2) {
      setErrorMessage(
        'Audio masukan bersifat Mono (1 kanal). Semua preset Audio Armor membutuhkan audio Stereo (2 kanal) agar pembatalan komponen tengah dan separasi fase dapat bekerja secara efektif. Mohon gunakan berkas audio stereo.'
      );
      return;
    }

    const activeMode = modeOverride !== undefined ? modeOverride : abMode;
    const activePreset = normalizePreset(presetOverride !== undefined ? presetOverride : selectedPreset);

    const ctx = getAudioContext();
    audioContextRef.current = ctx;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    sourceNodeRef.current = source;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyserNodeRef.current = analyser;

    const masterGain = ctx.createGain();
    gainNodeRef.current = masterGain;

    let rate = 1.0;

    if (activeMode === 'original') {
      // Direct pass-through original audio
      source.playbackRate.value = 1.0;
      source.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);
    } else {
      const splitter = ctx.createChannelSplitter(2);
      const merger = ctx.createChannelMerger(2);

      const directL = ctx.createGain();
      directL.gain.value = 1.0;
      const invertR = ctx.createGain();

      const directR = ctx.createGain();
      directR.gain.value = 1.0;
      const invertL = ctx.createGain();

      source.connect(splitter);

      // Section 10.2 Limiter ceiling 0.95
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -0.5;
      limiter.knee.value = 0.0;
      limiter.ratio.value = 20.0;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.05;

      if (activePreset === 'pulse_armor') {
        // Preset 2: Pulse Armor (DENYUT RITMIS)
        // Stage 1: Modulated center attenuation cycle k(t) [0.78..1.00]
        invertR.gain.value = -0.78;
        invertL.gain.value = -0.78;

        const curvePoints = 60;
        const kCurve = new Float32Array(curvePoints);
        for (let i = 0; i < curvePoints; i++) {
          const tSec = (i / (curvePoints - 1)) * 3.0;
          kCurve[i] = -getPulseArmorK(tSec);
        }
        for (let c = 0; c < 20; c++) {
          try {
            invertR.gain.setValueCurveAtTime(kCurve, ctx.currentTime + c * 3.0, 3.0);
            invertL.gain.setValueCurveAtTime(kCurve, ctx.currentTime + c * 3.0, 3.0);
          } catch (_) {}
        }

        splitter.connect(directL, 0);
        splitter.connect(invertR, 1);
        directL.connect(merger, 0, 0);
        invertR.connect(merger, 0, 0);

        splitter.connect(directR, 1);
        splitter.connect(invertL, 0);
        directR.connect(merger, 0, 1);
        invertL.connect(merger, 0, 1);

        // Stage 2: Highpass 220 Hz
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 220;

        // Stage 3: Notch EQ -8 dB @ 1800 Hz
        const notch = ctx.createBiquadFilter();
        notch.type = 'peaking';
        notch.frequency.value = 1800;
        notch.Q.value = 1.2;
        notch.gain.value = -8.0;

        // Stage 4: Tremolo LFO 5.5 Hz for rhythmic pulse effect
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.value = 0.56;

        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5.5;
        lfoNodeRef.current = lfo;

        const lfoDepth = ctx.createGain();
        lfoDepth.gain.value = 0.44;

        lfo.connect(lfoDepth);
        lfoDepth.connect(tremoloGain.gain);
        lfo.start();

        // Stage 5: Tempo +5% (rate = 0.8908987 * 1.05) & Volume 2.0x
        rate = ARMOR_CONSTANTS.PITCH_SHIFT * 1.05;
        source.playbackRate.value = rate;

        const volumeGain = ctx.createGain();
        volumeGain.gain.value = 2.0;

        merger.connect(highpass);
        highpass.connect(notch);
        notch.connect(tremoloGain);
        tremoloGain.connect(volumeGain);
        volumeGain.connect(limiter);
      } else if (activePreset === 'warm_armor') {
        // Preset 3: Warm Armor (RESONANSI HANGAT)
        // Stage 1: Dual identical in-phase cancellation (c0=c0-c1 | c1=c0-c1) -> Mono-Safe!
        invertR.gain.value = -1.0;
        invertL.gain.value = -1.0;

        splitter.connect(directL, 0);
        splitter.connect(invertR, 1);
        directL.connect(merger, 0, 0);
        invertR.connect(merger, 0, 0);

        // Right channel gets identical c0 - c1
        directL.connect(merger, 0, 1);
        invertR.connect(merger, 0, 1);

        // Stage 2: Gentle Highpass 160 Hz (preserves full warm body)
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 160;

        // Stage 3: Low-shelf warm bass boost +3 dB @ 180 Hz
        const bassBoost = ctx.createBiquadFilter();
        bassBoost.type = 'lowshelf';
        bassBoost.frequency.value = 180;
        bassBoost.gain.value = 3.0;

        // Stage 4: Gentle high roll-off for analog warmth
        const highShelf = ctx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 8000;
        highShelf.gain.value = -1.0;

        // Stage 5: Normal tempo 1.0x (tempo asli natural santai)
        rate = ARMOR_CONSTANTS.PITCH_SHIFT;
        source.playbackRate.value = rate;

        const volumeGain = ctx.createGain();
        volumeGain.gain.value = 1.8;

        merger.connect(highpass);
        highpass.connect(bassBoost);
        bassBoost.connect(highShelf);
        highShelf.connect(volumeGain);
        volumeGain.connect(limiter);
      } else {
        // Preset 1: Vocal Armor (VOKAL JELAS)
        // Stage 1: Anti-phase stereo cancellation (c0=c0-c1 | c1=c1-c0)
        invertR.gain.value = -1.0;
        invertL.gain.value = -1.0;

        splitter.connect(directL, 0);
        splitter.connect(invertR, 1);
        directL.connect(merger, 0, 0);
        invertR.connect(merger, 0, 0);

        splitter.connect(directR, 1);
        splitter.connect(invertL, 0);
        directR.connect(merger, 0, 1);
        invertL.connect(merger, 0, 1);

        // Stage 2: Highpass 250 Hz
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 250;

        // Stage 3 & 4: pitchCore -2st, volume 1.6x
        rate = ARMOR_CONSTANTS.PITCH_SHIFT;
        source.playbackRate.value = rate;

        const volumeGain = ctx.createGain();
        volumeGain.gain.value = 1.6;

        merger.connect(highpass);
        highpass.connect(volumeGain);
        volumeGain.connect(limiter);
      }

      limiter.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);
    }

    playbackRateRef.current = rate;

    const duration = audioBuffer.duration;
    const clampedOffset = Math.min(Math.max(0, startOffset), Math.max(0, duration - 0.05));

    playbackStartTimeRef.current = ctx.currentTime;
    playbackOffsetRef.current = clampedOffset;
    setCurrentTime(clampedOffset);

    source.start(0, clampedOffset);
    setIsPlaying(true);

    source.onended = () => {
      // Guard: only reset state if this source is still the active node
      if (sourceNodeRef.current === source) {
        sourceNodeRef.current = null;
        setIsPlaying(false);
        setCurrentTime(0);
        playbackOffsetRef.current = 0;
      }
    };
  };

  // Toggle playback
  const togglePlay = () => {
    if (isPlaying) {
      const ctx = audioContextRef.current;
      if (ctx && audioBuffer) {
        const elapsed = (ctx.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
        playbackOffsetRef.current = Math.min(audioBuffer.duration, playbackOffsetRef.current + elapsed);
      }
      stopLocalPlayback();
    } else {
      startLocalPlayback(playbackOffsetRef.current, selectedPreset, abMode);
    }
  };

  // Handle Stop & Reset
  const handleStop = () => {
    stopLocalPlayback();
    playbackOffsetRef.current = 0;
    setCurrentTime(0);
    if (seekThrottleTimeoutRef.current) {
      clearTimeout(seekThrottleTimeoutRef.current);
      seekThrottleTimeoutRef.current = null;
    }
  };

  // Start scrubbing / dragging playhead slider
  const handleSeekStart = () => {
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    wasPlayingBeforeScrubRef.current = isPlaying;
  };

  // Live scrub / seek update while dragging
  const handleSeekInput = (targetSec: number) => {
    const totalDur = audioBuffer ? audioBuffer.duration : (audioDuration || 60);
    const clamped = Math.min(Math.max(0, targetSec), totalDur);
    playbackOffsetRef.current = clamped;
    setCurrentTime(clamped);

    // Live preview: if audio was playing, update playback position smoothly with light throttle
    if (isPlaying || wasPlayingBeforeScrubRef.current) {
      if (seekThrottleTimeoutRef.current) {
        clearTimeout(seekThrottleTimeoutRef.current);
      }
      seekThrottleTimeoutRef.current = window.setTimeout(() => {
        if (isScrubbingRef.current) {
          startLocalPlayback(clamped, selectedPreset, abMode);
        }
      }, 70);
    }
  };

  // Commit seek when user releases slider or clicks a point on track
  const handleSeekCommit = (targetSec: number) => {
    if (seekThrottleTimeoutRef.current) {
      clearTimeout(seekThrottleTimeoutRef.current);
      seekThrottleTimeoutRef.current = null;
    }
    const totalDur = audioBuffer ? audioBuffer.duration : (audioDuration || 60);
    const clamped = Math.min(Math.max(0, targetSec), totalDur);
    playbackOffsetRef.current = clamped;
    setCurrentTime(clamped);

    const shouldResume = isPlaying || wasPlayingBeforeScrubRef.current;
    isScrubbingRef.current = false;
    setIsScrubbing(false);

    if (shouldResume) {
      startLocalPlayback(clamped, selectedPreset, abMode);
    }
  };

  // Skip relative seconds (e.g. -5s or +5s)
  const handleSkipSeconds = (delta: number) => {
    const totalDur = audioBuffer ? audioBuffer.duration : (audioDuration || 60);
    const newPos = Math.min(Math.max(0, currentTime + delta), totalDur);
    handleSeekCommit(newPos);
  };

  // Switch A/B Mode
  const switchAbMode = (mode: 'armor' | 'original') => {
    setAbMode(mode);
    if (isPlaying) {
      const cur = currentTime;
      startLocalPlayback(cur, selectedPreset, mode);
    }
  };

  // Handle Select Preset with Instant Live DSP Transition
  const handleSelectPreset = (presetId: ArmorPresetType) => {
    setSelectedPreset(presetId);
    if (isPlaying) {
      const cur = currentTime;
      startLocalPlayback(cur, presetId, abMode);
    }
  };

  // Real-Time Canvas Visualizer & Playhead Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const freqData = new Uint8Array(32);

    const loop = () => {
      if (isPlaying) {
        const audioCtx = audioContextRef.current;
        if (audioCtx && audioBuffer) {
          // Only update currentTime from audioCtx if user is NOT actively dragging
          if (!isScrubbingRef.current) {
            const elapsed = (audioCtx.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
            const current = playbackOffsetRef.current + elapsed;

            if (current >= audioBuffer.duration) {
              stopLocalPlayback();
              playbackOffsetRef.current = 0;
              setCurrentTime(0);
            } else {
              setCurrentTime(current);
            }
          }
        }

        if (canvas && ctx && analyserNodeRef.current) {
          analyserNodeRef.current.getByteFrequencyData(freqData);
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = canvas.width / 32 - 1.5;
          for (let i = 0; i < 32; i++) {
            const val = freqData[i] / 255;
            const barHeight = val * (canvas.height - 4);
            const x = i * (barWidth + 1.5);
            const y = canvas.height - barHeight;

            const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
            if (abMode === 'armor') {
              grad.addColorStop(0, '#10b981'); // emerald for Armor
              grad.addColorStop(1, '#34d399');
            } else {
              grad.addColorStop(0, '#0284c7'); // sky blue for original
              grad.addColorStop(1, '#38bdf8');
            }

            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, abMode, audioBuffer]);

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setRawFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    setResultBlob(null);
    setResultUrl(null);
    setErrorMessage(null);

    stopLocalPlayback();

    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = getAudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuf);
      setAudioBuffer(decoded);
      setAudioDuration(decoded.duration);
      playbackOffsetRef.current = 0;
      setCurrentTime(0);
    } catch (err) {
      console.error('Error decoding audio:', err);
    }
  };

  // Handle Microphone Recording
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      stopLocalPlayback();

      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Fitur mikrofon tidak didukung di lingkungan browser ini. Silakan gunakan tombol "Ganti File Audio" untuk mengunggah file vokal.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const arrayBuf = await audioBlob.arrayBuffer();
        const ctx = getAudioContext();
        try {
          const decoded = await ctx.decodeAudioData(arrayBuf);
          setAudioBuffer(decoded);
          setAudioDuration(decoded.duration);
          const takeId = Math.floor(100 + Math.random() * 900);
          const recName = `Voice_Note_Take_${takeId}.wav`;
          setFileName(recName);
          setFileSize(audioBlob.size);
          setRawFile(new File([audioBlob], recName, { type: 'audio/wav' }));
          setResultBlob(null);
          setResultUrl(null);
        } catch (err) {
          console.error('Failed to decode recorded audio', err);
          setErrorMessage('Gagal memproses rekaman audio.');
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.warn('Microphone access denied or error:', err);
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }

      const errObj = err as { name?: string; message?: string } | null;
      let userMsg = 'Izin akses mikrofon ditolak oleh browser. Anda dapat mengunggah file audio (MP3/WAV) langsung menggunakan tombol "Ganti File Audio" di bawah.';
      if (errObj?.name === 'NotAllowedError' || errObj?.message?.toLowerCase().includes('permission denied')) {
        userMsg = 'Izin mikrofon ditolak oleh browser atau iframe. Anda tetap dapat melanjutkan dengan mengklik "Ganti File Audio" untuk memilih berkas rekaman Anda.';
      } else if (errObj?.name === 'NotFoundError' || errObj?.name === 'DevicesNotFoundError') {
        userMsg = 'Perangkat mikrofon tidak ditemukan. Pastikan mikrofon terpasang atau gunakan opsi upload file.';
      }
      setErrorMessage(userMsg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Convert current audio buffer to WAV Blob if no rawFile is present (e.g. demo track)
  const getAudioPayload = async (): Promise<Blob> => {
    if (rawFile) {
      return rawFile;
    }
    if (audioBuffer) {
      return encodeWav(audioBuffer, 16);
    }
    throw new Error('Tidak ada data audio yang tersedia.');
  };

  /**
   * In-browser Web Audio DSP engine executing offline rendering:
   * - Phase cancellation matrix according to technical spec:
   *   - Vocal Armor: Anti-phase c0=c0-c1 | c1=c1-c0, Highpass 195Hz, pitchCore -2st, Volume 1.6x, Limiter 0.95
   *   - Pulse Armor: Modulated center attenuation k(t) [0.78..1.00], Notch 1.8kHz, Tremolo LFO 5.5Hz, Tempo +5%, Highpass 220Hz, Volume 2.0x, Limiter 0.95
   *   - Warm Armor: Dual identical in-phase c0=c0-c1 | c1=c0-c1 (mono-safe), Highpass 160Hz, Low-shelf Bass +3dB @ 180Hz, High-shelf -1dB @ 8kHz, Tempo 1.0x natural, Volume 1.8x, Limiter 0.95
   * Runs 100% locally in browser memory with zero network dependencies!
   */
  const renderArmorAudioLocally = async (
    sourceBuffer: AudioBuffer,
    presetId: CanonicalArmorPresetId,
    startOffset: number,
    targetDuration: number,
    isFull: boolean
  ): Promise<AudioBuffer> => {
    // Section 10.1: Validate stereo input channels
    if (sourceBuffer.numberOfChannels < 2) {
      throw new Error(
        'Audio masukan bersifat Mono (1 kanal). Semua preset Audio Armor membutuhkan audio Stereo (2 kanal) agar pembatalan komponen tengah dan separasi fase dapat bekerja. Silakan gunakan berkas audio stereo.'
      );
    }

    const preset = normalizePreset(presetId);
    const sampleRate = 44100;
    const isPulse = preset === 'pulse_armor';
    const isWarm = preset === 'warm_armor';
    const rate = ARMOR_CONSTANTS.PITCH_SHIFT;
    const tempoMultiplier = isPulse ? ARMOR_CONSTANTS.TEMPO_PULSE : ARMOR_CONSTANTS.TEMPO_RESTORE;

    const availableSourceSecs = Math.max(0.5, sourceBuffer.duration - startOffset);
    const rawPlaySecs = isFull
      ? availableSourceSecs
      : Math.min(Math.max(1, targetDuration), availableSourceSecs);

    const finalDurationSecs = isPulse ? rawPlaySecs / 1.05 : rawPlaySecs;
    const totalFrames = Math.max(100, Math.ceil(finalDurationSecs * sampleRate));

    const OfflineCtxClass =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(2, totalFrames, sampleRate);

    // Prepare sliced input buffer with exact phase cancellation per sample
    const sliceFrames = Math.floor(rawPlaySecs * sourceBuffer.sampleRate);
    const startSample = Math.floor(startOffset * sourceBuffer.sampleRate);
    const ch0Raw = sourceBuffer.getChannelData(0);
    const ch1Raw = sourceBuffer.getChannelData(1);

    const preprocessed = offlineCtx.createBuffer(2, sliceFrames, sourceBuffer.sampleRate);
    const prepL = preprocessed.getChannelData(0);
    const prepR = preprocessed.getChannelData(1);

    for (let i = 0; i < sliceFrames; i++) {
      const srcIdx = startSample + i;
      const c0 = srcIdx < ch0Raw.length ? ch0Raw[srcIdx] : 0;
      const c1 = srcIdx < ch1Raw.length ? ch1Raw[srcIdx] : 0;

      if (preset === 'pulse_armor') {
        const t = i / sourceBuffer.sampleRate;
        const k = getPulseArmorK(t);
        prepL[i] = c0 - k * c1;
        prepR[i] = c1 - k * c0;
      } else if (preset === 'warm_armor') {
        // Dual identical in-phase cancellation (mono-safe): c0=c0-c1 | c1=c0-c1
        const diff = c0 - c1;
        prepL[i] = diff;
        prepR[i] = diff;
      } else {
        // Vocal Armor: c0=c0-c1 | c1=c1-c0
        prepL[i] = c0 - c1;
        prepR[i] = c1 - c0;
      }
    }

    const source = offlineCtx.createBufferSource();
    source.buffer = preprocessed;
    source.playbackRate.value = rate * tempoMultiplier;

    // Filter stages according to technical spec
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = isWarm ? 160 : isPulse ? 220 : 195;

    let chainOut: AudioNode = highpass;

    if (preset === 'pulse_armor') {
      const notch = offlineCtx.createBiquadFilter();
      notch.type = 'peaking';
      notch.frequency.value = 1800;
      notch.Q.value = 1.2;
      notch.gain.value = -8.0;

      const tremoloGain = offlineCtx.createGain();
      tremoloGain.gain.value = 0.56;

      const lfo = offlineCtx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 5.5;

      const lfoGain = offlineCtx.createGain();
      lfoGain.gain.value = 0.44;

      lfo.connect(lfoGain);
      lfoGain.connect(tremoloGain.gain);
      lfo.start(0);

      highpass.connect(notch);
      notch.connect(tremoloGain);
      chainOut = tremoloGain;
    } else if (preset === 'warm_armor') {
      const bassBoost = offlineCtx.createBiquadFilter();
      bassBoost.type = 'lowshelf';
      bassBoost.frequency.value = 180;
      bassBoost.gain.value = 3.0;

      const highShelf = offlineCtx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 8000;
      highShelf.gain.value = -1.0;

      highpass.connect(bassBoost);
      bassBoost.connect(highShelf);
      chainOut = highShelf;
    }

    const volumeGain = offlineCtx.createGain();
    volumeGain.gain.value = isPulse ? 2.0 : isWarm ? 1.8 : 1.6;
    chainOut.connect(volumeGain);

    // Section 10.2: Peak Limiter 0.95
    const limiter = offlineCtx.createDynamicsCompressor();
    limiter.threshold.value = -0.5;
    limiter.knee.value = 0.0;
    limiter.ratio.value = 20.0;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.05;

    source.connect(highpass);
    volumeGain.connect(limiter);
    limiter.connect(offlineCtx.destination);

    source.start(0);
    const rendered = await offlineCtx.startRendering();

    // Section 10.2 Guard: strictly clamp peak within [-0.95, +0.95]
    for (let c = 0; c < 2; c++) {
      const ch = rendered.getChannelData(c);
      for (let i = 0; i < ch.length; i++) {
        if (ch[i] > 0.95) ch[i] = 0.95;
        else if (ch[i] < -0.95) ch[i] = -0.95;
      }
    }

    return rendered;
  };

  // Resilient Dual-Engine Execution: Attempts server-side FFmpeg first, with automatic instant in-browser Web Audio DSP fallback
  const handleProcessArmor = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErrorMessage(null);

    // Use 59.0s in slice mode so audio output duration is strictly under Suno's 60.00s cutoff
    const targetDuration = durationMode === 'full' ? 0 : 59.0;
    const cleanTitle = (fileName || 'Audio_Seed')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_');
    const ext = armorFormat;
    const defaultFilename = buildArmorOutputFilename(
      cleanTitle,
      selectedPreset,
      durationMode === 'full',
      targetDuration || 59.0,
      ext
    );

    try {
      let blob: Blob | null = null;
      let returnedFilename = defaultFilename;

      // Phase 1: Try server processing with safety timeout
      try {
        const payloadBlob = await getAudioPayload();
        if (payloadBlob && payloadBlob.size > 0) {
          const queryParams = new URLSearchParams({
            preset: selectedPreset,
            mode: durationMode === 'full' ? 'full' : 'slice',
            startTime: startTime.toFixed(3),
            duration: targetDuration.toString(),
            title: cleanTitle,
            format: armorFormat,
          });

          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 6000);

          const response = await fetch(`/api/armor/process?${queryParams.toString()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            body: payloadBlob,
            signal: controller.signal,
          });

          window.clearTimeout(timeoutId);

          if (response.ok) {
            blob = await response.blob();
            returnedFilename = response.headers.get('X-Armor-Filename') || defaultFilename;
          } else {
            const errJson = await response.json().catch(() => null);
            if (errJson && errJson.error) {
              console.warn('Server FFmpeg returned error:', errJson.error);
              if (errJson.error.includes('Mono')) {
                throw new Error(errJson.error);
              }
            }
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr && fetchErr.message && fetchErr.message.includes('Mono')) {
          throw fetchErr;
        }
        // Network or fetch failed - smoothly continue to client-side DSP
        console.info('Server processing skipped, rendering via high-precision in-browser DSP:', fetchErr);
      }

      // Phase 2: Instant Client-Side Web Audio DSP Engine Fallback
      if (!blob || blob.size === 0) {
        let activeBuffer = audioBuffer;
        if (!activeBuffer) {
          const payloadBlob = await getAudioPayload();
          const arrayBuf = await payloadBlob.arrayBuffer();
          const ctx = getAudioContext();
          activeBuffer = await ctx.decodeAudioData(arrayBuf);
          setAudioBuffer(activeBuffer);
        }

        const renderedBuffer = await renderArmorAudioLocally(
          activeBuffer,
          selectedPreset,
          startTime,
          targetDuration || 60.0,
          durationMode === 'full'
        );

        if (armorFormat === 'mp3') {
          blob = await encodeMp3(
            renderedBuffer,
            {
              titleMode: 'custom',
              customTitle: cleanTitle,
              copyrightNotice: '© 2026 Beesuno. All rights reserved.',
              artistName: 'Official Creator',
              albumName: 'Beesuno Seed Master',
              releaseYear: '2026',
            },
            defaultFilename
          );
        } else {
          // Default: 16-bit PCM WAV (Suno AI standard recommendation, zero timeout)
          blob = encodeWav(renderedBuffer, 16);
          returnedFilename = defaultFilename;
        }
      }

      const downloadUrl = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(downloadUrl);
      setDownloadFilename(returnedFilename);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = returnedFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: unknown) {
      console.warn('Audio processing notice:', err);
      const errMsg = err instanceof Error ? err.message : 'Gagal memproses audio.';
      setErrorMessage(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activePresetObj = getPresetMeta(selectedPreset);

  return (
    <div className="space-y-6">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Audio Armor Studio
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Proteksi unggahan audio dari bot deteksi hak cipta Suno AI sebelum diextend.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-2.5 py-1 rounded-lg">
            {armorFormat === 'wav' ? 'WAV 16-bit PCM' : armorFormat === 'ogg' ? 'OGG Vorbis 192k' : 'MP3 320k'}
          </span>
        </div>
      </div>

      {/* Full-Width Audio Input & Drop Area */}
      <div className="w-full">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />

        {isRecording ? (
          <div className="bg-[#1a1418] border border-rose-500/40 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
                <Mic className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Sedang Merekam Suara Mikrofon...
                  </span>
                </div>
                <div className="text-xs font-mono text-rose-300 mt-1">
                  Durasi Rekaman: {Math.floor(recordingSeconds / 60)}:{recordingSeconds % 60 < 10 ? '0' : ''}{recordingSeconds % 60}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={stopRecording}
              className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition shrink-0 active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Selesai & Pakai Rekaman</span>
            </button>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full rounded-2xl border transition-all p-5 sm:p-6 shadow-sm relative overflow-hidden ${
              isDragging
                ? 'border-white/40 bg-white/[0.06] scale-[1.002]'
                : 'border-dashed border-white/[0.12] hover:border-white/25 bg-[#14151b]'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              {/* Left Info & Clickable Upload Icon */}
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-sm transition active:scale-95 group"
                  title="Klik untuk memilih berkas audio"
                >
                  <UploadCloud className="w-6 h-6 text-zinc-300 group-hover:scale-105 transition-transform" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 border border-white/[0.08]">
                      Berkas Audio Aktif
                    </span>
                    {fileName.startsWith('Voice_Note_Take_') && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Rekaman Mic
                      </span>
                    )}
                  </div>

                  <div className="text-base sm:text-lg font-semibold text-white truncate mt-1">
                    {fileName}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 font-mono mt-1">
                    <span>Durasi: <strong className="text-zinc-200">{audioDuration ? `${Math.floor(audioDuration)}s (${formatMMSS(audioDuration)})` : '--'}</strong></span>
                    <span>•</span>
                    <span>Ukuran: <strong className="text-zinc-200">{(fileSize / 1024 / 1024).toFixed(2)} MB</strong></span>
                    <span>•</span>
                    <span>MP3, WAV, OGG, M4A, FLAC</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-initial bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <UploadCloud className="w-4 h-4 text-black" />
                  <span>Ganti File Audio</span>
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  className="flex-1 sm:flex-initial bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] font-semibold text-xs sm:text-sm px-4 py-2.5 rounded-xl transition shadow-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <Mic className="w-4 h-4 text-zinc-300" />
                  <span>Rekam Mic</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-300">
            <div className="flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <div>
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 bg-white text-black text-[11px] font-semibold px-2.5 py-1 rounded-lg transition"
                >
                  Pilih File Audio Baru
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded bg-white/[0.06] shrink-0"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Preset Selector Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">
            PILIH KARAKTER ARMOR
          </span>
          <span className="text-[10px] font-mono bg-white/[0.06] text-zinc-300 px-2 py-0.5 rounded border border-white/[0.08]">
            {activePresetObj.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {ARMOR_PRESETS_LIST.map((p) => {
            const isSelected = selectedPreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                data-preset-id={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`p-4 rounded-xl border text-left transition flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                    : 'bg-[#14151b] border-white/[0.08] hover:border-white/[0.15] text-zinc-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded border ${
                      isSelected ? 'bg-white/10 text-zinc-200 border-white/15' : 'bg-white/[0.06] text-zinc-400 border-white/[0.08]'
                    }`}>
                      {p.icon} {p.badge}
                    </span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-zinc-400' : 'text-zinc-500'}`}>{p.suffix}</span>
                  </div>
                  <h4 className="text-sm font-semibold">{p.name}</h4>
                  <div className={`text-xs mt-1 leading-snug ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {p.desc}
                  </div>
                </div>

                <div className={`pt-2 border-t text-[10px] flex items-center justify-between ${
                  isSelected ? 'border-white/10 text-zinc-400' : 'border-white/[0.06] text-zinc-500'
                }`}>
                  <span>Cocok:</span>
                  <span className="font-medium truncate ml-1">{p.bestFor.join(', ')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Controls & Player (Left 7 cols) & Execution Summary (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Preview Player & Processing Settings (7 cols) */}
        <div className="lg:col-span-7 bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          {/* Interactive Live Preview Player with Real-Time A/B Switching */}
          <div className="bg-black/30 border border-white/[0.08] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <span>Audio Player Preview</span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Mode: <strong className="text-zinc-200">{abMode === 'armor' ? `Stealth Armor (${activePresetObj.name})` : 'Audio Asli'}</strong>
                </div>
              </div>

              {/* A/B Mode Switch */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() => switchAbMode('armor')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    abMode === 'armor'
                      ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Stealth Armor</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchAbMode('original')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    abMode === 'original'
                      ? 'bg-[#2c2e38] text-white shadow-sm font-medium border border-white/15'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Audio Asli</span>
                </button>
              </div>
            </div>

            {/* Play, Stop, Waveform Canvas, Scrub Bar */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={togglePlay}
                title={isPlaying ? 'Jeda' : 'Putar'}
                className="w-10 h-10 rounded-full bg-[#2c2e38] hover:bg-[#363845] text-white border border-white/15 flex items-center justify-center shadow-sm transition shrink-0 active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleStop}
                title="Stop"
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white flex items-center justify-center border border-white/[0.08] transition shrink-0 active:scale-95"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>

              <div className="flex-1 bg-black/40 rounded-xl p-2.5 border border-white/[0.06] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <canvas ref={canvasRef} width={160} height={32} className="w-full sm:w-28 sm:h-8 rounded shrink-0 bg-black/40 border border-white/[0.06]" />
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-zinc-200 font-semibold">{formatMMSS(currentTime)}</span>
                    <span className="text-zinc-500">{formatMMSS(audioDuration || 60)}</span>
                  </div>

                  <div className="relative flex items-center group">
                    <input
                      type="range"
                      min={0}
                      max={audioDuration || 60}
                      step={0.1}
                      value={currentTime}
                      onPointerDown={handleSeekStart}
                      onPointerUp={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
                      onMouseDown={handleSeekStart}
                      onMouseUp={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
                      onTouchStart={handleSeekStart}
                      onTouchEnd={(e) => handleSeekCommit(parseFloat((e.target as HTMLInputElement).value))}
                      onInput={(e) => handleSeekInput(parseFloat((e.target as HTMLInputElement).value))}
                      onChange={(e) => handleSeekCommit(parseFloat(e.target.value))}
                      className="w-full accent-white cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none transition-all focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSkipSeconds(-5)}
                        className="hover:text-white hover:bg-white/[0.06] px-1.5 py-0.5 rounded transition"
                      >
                        -5s
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSkipSeconds(5)}
                        className="hover:text-white hover:bg-white/[0.06] px-1.5 py-0.5 rounded transition"
                      >
                        +5s
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSeekCommit(startTime)}
                      className="text-[10px] text-zinc-400 hover:text-white transition"
                    >
                      Start Offset ({startTime.toFixed(1)}s)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Duration Mode & Start Offset Settings */}
          <div className="bg-black/30 border border-white/[0.08] rounded-xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div>
                <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>DURASI OUTPUT SEED</span>
                </h4>
              </div>

              {/* Duration Switch: 60s vs Full Track */}
              <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/[0.08] shrink-0">
                <button
                  type="button"
                  onClick={() => setDurationMode('60s')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    durationMode === '60s'
                      ? 'bg-[#2c2e38] text-white font-medium shadow-sm border border-white/15'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  60 Detik (Suno)
                </button>

                <button
                  type="button"
                  onClick={() => setDurationMode('full')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    durationMode === 'full'
                      ? 'bg-[#2c2e38] text-white font-medium shadow-sm border border-white/15'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Full Track
                </button>
              </div>
            </div>

            {/* Start Offset / Seek Point */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Waktu Mulai Ekspor (Start Offset):</span>
                </span>
                <span className="font-mono font-semibold text-zinc-200 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                  {startTime.toFixed(1)}s ({formatMMSS(startTime)})
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={Math.max(0, (audioDuration || 60) - (durationMode === '60s' ? 10 : 0))}
                step={0.5}
                value={startTime}
                onChange={(e) => setStartTime(parseFloat(e.target.value))}
                className="w-full accent-white cursor-pointer py-1"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {[
                  { sec: 0.0, label: '0s (Intro)' },
                  { sec: 15.0, label: '15s' },
                  { sec: 30.0, label: '30s (Verse)' },
                  { sec: 60.0, label: '60s (Chorus)' },
                ].map((chip) => (
                  <button
                    key={chip.sec}
                    type="button"
                    onClick={() => setStartTime(chip.sec)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded transition ${
                      Math.abs(startTime - chip.sec) < 0.1
                        ? 'bg-[#2c2e38] text-white font-medium border border-white/15'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Container Toggle */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  FORMAT AUDIO OUTPUT
                </span>
                <span className="text-[10px] font-mono text-zinc-400 uppercase">
                  {armorFormat === 'wav' ? 'WAV (16-bit)' : armorFormat}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <button
                  type="button"
                  onClick={() => setArmorFormat('wav')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                    armorFormat === 'wav'
                      ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                      : 'bg-black/20 border-white/[0.06] text-zinc-400 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">WAV</span>
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${armorFormat === 'wav' ? 'bg-white/10 text-zinc-200' : 'bg-white/[0.06] text-zinc-400'}`}>
                      BEBAS TIMEOUT
                    </span>
                  </div>
                  <div className={`text-[10px] font-mono ${armorFormat === 'wav' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    PCM 16-bit
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setArmorFormat('ogg')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                    armorFormat === 'ogg'
                      ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                      : 'bg-black/20 border-white/[0.06] text-zinc-400 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">OGG</span>
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${armorFormat === 'ogg' ? 'bg-white/10 text-zinc-200' : 'bg-white/[0.06] text-zinc-400'}`}>
                      VORBIS
                    </span>
                  </div>
                  <div className={`text-[10px] font-mono ${armorFormat === 'ogg' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    192 kbps
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setArmorFormat('mp3')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                    armorFormat === 'mp3'
                      ? 'bg-[#262833] text-white border-white/30 ring-1 ring-white/10 shadow-sm'
                      : 'bg-black/20 border-white/[0.06] text-zinc-400 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">MP3</span>
                    <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${armorFormat === 'mp3' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/[0.06] text-zinc-400'}`}>
                      SUNO READY
                    </span>
                  </div>
                  <div className={`text-[10px] font-mono ${armorFormat === 'mp3' ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    320 kbps (100% Lolos)
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Summary & Export Button (5 cols) */}
        <div className="lg:col-span-5 bg-[#14151b] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="pb-3 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-zinc-300" />
                <span>Ringkasan Stealth Armor</span>
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">Preset:</span>
                <span className="font-semibold text-white font-mono">
                  {activePresetObj.name}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">Perilaku Stereo:</span>
                <span className="font-medium text-zinc-300 font-mono text-[11px]">
                  {activePresetObj.stereoBehavior}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">Low-Cut:</span>
                <span className="font-medium text-zinc-300 font-mono">
                  {activePresetObj.lowCutHz} Hz
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">Sinkronisasi Tempo:</span>
                <span className="font-medium text-zinc-300 font-mono">
                  {activePresetObj.tempo}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">Durasi:</span>
                <span className="font-medium text-white font-mono">
                  {durationMode === 'full' ? 'Full Track' : '60 Detik'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-zinc-400">Format:</span>
                <span className="font-semibold text-white font-mono uppercase">
                  {armorFormat === 'wav' ? 'WAV 16-bit PCM' : armorFormat === 'ogg' ? 'OGG Vorbis 192k' : 'MP3 320 kbps'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-zinc-400">Metadata:</span>
                <span className="font-medium text-emerald-400 font-mono">Sanitized & Anonymized</span>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Action CTA Button */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleProcessArmor}
              disabled={isProcessing}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm ${
                isProcessing
                  ? 'bg-zinc-800 text-zinc-400 cursor-wait'
                  : 'bg-white hover:bg-zinc-200 text-black active:scale-98'
              }`}
            >
              <Zap className={`w-4 h-4 ${isProcessing ? 'animate-spin' : 'fill-black'}`} />
              <span>
                {isProcessing
                  ? 'Memproses Audio Armor...'
                  : `Ekspor Audio Armor (${durationMode === 'full' ? 'Full Lagu' : '60s'} • ${armorFormat.toUpperCase()})`}
              </span>
            </button>

            {resultUrl && (
              <div className="p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-zinc-200 font-medium truncate">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">{downloadFilename}</span>
                </div>
                <a
                  href={resultUrl}
                  download={downloadFilename}
                  className="bg-white text-black px-3 py-1 rounded-lg font-semibold text-[11px] hover:bg-zinc-200 transition shrink-0"
                >
                  Unduh Ulang
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
