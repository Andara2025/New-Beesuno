import { MasteringPreset } from '../types';

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Generates an analog tape saturation / soft-clipping curve
 */
function makeTapeWarmthCurve(warmth: number): Float32Array<ArrayBuffer> {
  const n_samples = 4096;
  const buffer = new ArrayBuffer(n_samples * 4);
  const curve = new Float32Array(buffer);
  const k = Math.max(0.01, (warmth - 1.0) * 4.0);

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    if (warmth <= 1.0) {
      curve[i] = x;
    } else {
      curve[i] = Math.tanh(x * (1 + k * 0.3)) / Math.tanh(1 + k * 0.3);
    }
  }
  return curve;
}

/**
 * Real-time A/B Player Controller for Studio Custom Lab
 * Designed to preserve perceived loudness & punch while providing transparent audio enhancement
 */
export class StudioLivePlayer {
  private ctx: AudioContext;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private analyserNode: AnalyserNode;

  // DSP Filter Nodes
  private subBassFilter: BiquadFilterNode;
  private mudScoopFilter: BiquadFilterNode;
  private antiAiNotchFilter: BiquadFilterNode;
  private airSheenFilter: BiquadFilterNode;
  private ultrasonicFilter: BiquadFilterNode;
  private tapeWarmthNode: WaveShaperNode;
  private masteringCompressor: DynamicsCompressorNode;
  private makeupGainNode: GainNode;

  // A/B Bus Nodes
  private dryGainNode: GainNode;
  private wetGainNode: GainNode;

  private buffer: AudioBuffer | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private isPlayingState = false;
  private isAbComparing = false;
  private currentPreset: MasteringPreset | null = null;

  constructor() {
    this.ctx = getAudioContext();
    this.gainNode = this.ctx.createGain();
    this.analyserNode = this.ctx.createAnalyser();
    this.analyserNode.fftSize = 256;

    // 1. Sub-Bass Filter (Tight 60Hz punch)
    this.subBassFilter = this.ctx.createBiquadFilter();
    this.subBassFilter.type = 'peaking';
    this.subBassFilter.frequency.value = 60;
    this.subBassFilter.Q.value = 1.0;

    // 2. Low-Mid Clean Scoop (250Hz - cleans mud without losing body)
    this.mudScoopFilter = this.ctx.createBiquadFilter();
    this.mudScoopFilter.type = 'peaking';
    this.mudScoopFilter.frequency.value = 250;
    this.mudScoopFilter.Q.value = 1.4;

    // 3. Vocal Clarity & Articulation Presence (3450Hz)
    this.antiAiNotchFilter = this.ctx.createBiquadFilter();
    this.antiAiNotchFilter.type = 'peaking';
    this.antiAiNotchFilter.frequency.value = 3450;
    this.antiAiNotchFilter.Q.value = 2.0;

    // 4. Air Sheen High-Shelf (12000Hz silky top-end)
    this.airSheenFilter = this.ctx.createBiquadFilter();
    this.airSheenFilter.type = 'highshelf';
    this.airSheenFilter.frequency.value = 12000;

    // 5. Ultrasonic Filter (transparent 20kHz cutoff)
    this.ultrasonicFilter = this.ctx.createBiquadFilter();
    this.ultrasonicFilter.type = 'lowpass';
    this.ultrasonicFilter.frequency.value = 20000;
    this.ultrasonicFilter.Q.value = 0.707;

    // 6. Analog Tape Saturation WaveShaper
    this.tapeWarmthNode = this.ctx.createWaveShaper();
    this.tapeWarmthNode.curve = makeTapeWarmthCurve(1.05);

    // 7. Mastering Bus Dynamics Compressor (Commercial Glue & Punch)
    this.masteringCompressor = this.ctx.createDynamicsCompressor();
    this.masteringCompressor.threshold.value = -14.0;
    this.masteringCompressor.knee.value = 8.0;
    this.masteringCompressor.ratio.value = 2.0;
    this.masteringCompressor.attack.value = 0.02;
    this.masteringCompressor.release.value = 0.15;

    // 8. Transparent Makeup Gain (+1.2 dB to ensure volume stays punchy and preserved)
    this.makeupGainNode = this.ctx.createGain();
    this.makeupGainNode.gain.value = 1.15; // ~+1.2dB makeup gain

    // Bus Routing
    this.dryGainNode = this.ctx.createGain();
    this.wetGainNode = this.ctx.createGain();
    this.dryGainNode.gain.value = 0.0;
    this.wetGainNode.gain.value = 1.0;

    // Connect DSP Chain (Remaster path)
    this.subBassFilter.connect(this.mudScoopFilter);
    this.mudScoopFilter.connect(this.antiAiNotchFilter);
    this.antiAiNotchFilter.connect(this.airSheenFilter);
    this.airSheenFilter.connect(this.ultrasonicFilter);
    this.ultrasonicFilter.connect(this.tapeWarmthNode);
    this.tapeWarmthNode.connect(this.masteringCompressor);
    this.masteringCompressor.connect(this.makeupGainNode);
    this.makeupGainNode.connect(this.wetGainNode);

    // Summing Bus
    this.wetGainNode.connect(this.gainNode);
    this.dryGainNode.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.ctx.destination);
  }

  public setBuffer(buffer: AudioBuffer) {
    this.stop();
    this.buffer = buffer;
    this.pauseOffset = 0;
  }

  public applyPreset(preset: MasteringPreset) {
    this.currentPreset = preset;
    const now = this.ctx.currentTime;
    this.subBassFilter.gain.setTargetAtTime(preset.subBassBodyDb, now, 0.05);
    this.mudScoopFilter.gain.setTargetAtTime(preset.lowMidMudScoopDb, now, 0.05);
    this.antiAiNotchFilter.gain.setTargetAtTime(preset.antiAiVocalNotchDb, now, 0.05);
    this.airSheenFilter.gain.setTargetAtTime(preset.airSheenHighShelfDb, now, 0.05);
    this.ultrasonicFilter.frequency.setTargetAtTime(preset.ultrasonicCutHz || 20000, now, 0.05);
    this.tapeWarmthNode.curve = makeTapeWarmthCurve(preset.tapeWarmth || 1.04);

    // Calculate intelligent makeup gain based on target LUFS so volume is preserved
    const targetLufs = preset.targetLufs || -14.0;
    const lufsOffset = (-14.0 - targetLufs) * 0.15;
    const computedMakeup = Math.max(1.0, 1.15 + lufsOffset);
    this.makeupGainNode.gain.setTargetAtTime(computedMakeup, now, 0.05);

    // Multi-vector rate: (Tempo Warp) * (Pitch Detune)
    if (this.sourceNode) {
      const tempoFactor = (preset.tempoWarpPercent || 100) / 100;
      const pitchFactor = Math.pow(2, (preset.pitchDetuneCents || 0) / 1200);
      const combinedRate = tempoFactor * pitchFactor;
      this.sourceNode.playbackRate.setTargetAtTime(combinedRate, now, 0.05);
    }
  }

  public setMode(mode: 'remaster' | 'original') {
    this.isAbComparing = mode === 'original';
    const now = this.ctx.currentTime;
    if (this.isAbComparing) {
      // Switch cleanly to original (dry)
      this.wetGainNode.gain.setTargetAtTime(0, now, 0.02);
      this.dryGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      if (this.sourceNode) {
        this.sourceNode.playbackRate.setTargetAtTime(1.0, now, 0.02);
      }
    } else {
      // Switch cleanly to remastered (wet) with preserved punch
      this.dryGainNode.gain.setTargetAtTime(0, now, 0.02);
      this.wetGainNode.gain.setTargetAtTime(1.0, now, 0.02);
      if (this.sourceNode && this.currentPreset) {
        const tempoFactor = (this.currentPreset.tempoWarpPercent || 100) / 100;
        const pitchFactor = Math.pow(2, (this.currentPreset.pitchDetuneCents || 0) / 1200);
        this.sourceNode.playbackRate.setTargetAtTime(tempoFactor * pitchFactor, now, 0.02);
      }
    }
  }

  public play(preset?: MasteringPreset) {
    if (!this.buffer) return;
    if (this.isPlayingState) return;

    this.ctx.resume();
    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.loop = true;

    const activePreset = preset || this.currentPreset;
    if (activePreset && !this.isAbComparing) {
      const tempoFactor = (activePreset.tempoWarpPercent || 100) / 100;
      const pitchFactor = Math.pow(2, (activePreset.pitchDetuneCents || 0) / 1200);
      this.sourceNode.playbackRate.value = tempoFactor * pitchFactor;
    } else {
      this.sourceNode.playbackRate.value = 1.0;
    }

    // Connect source to both DSP branch and Dry branch
    this.sourceNode.connect(this.subBassFilter);
    this.sourceNode.connect(this.dryGainNode);

    const offset = this.pauseOffset % this.buffer.duration;
    this.sourceNode.start(0, offset);
    this.startTime = this.ctx.currentTime - offset;
    this.isPlayingState = true;
  }

  public pause() {
    if (!this.isPlayingState || !this.sourceNode) return;
    this.pauseOffset = (this.ctx.currentTime - this.startTime) % (this.buffer?.duration || 1);
    try {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    } catch {
      // ignore
    }
    this.sourceNode = null;
    this.isPlayingState = false;
  }

  public stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    this.isPlayingState = false;
    this.pauseOffset = 0;
  }

  public seek(ratio: number) {
    if (!this.buffer) return;
    const targetTime = ratio * this.buffer.duration;
    this.pauseOffset = targetTime;
    if (this.isPlayingState) {
      this.stop();
      this.pauseOffset = targetTime;
      this.play();
    }
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getCurrentTime(): number {
    if (!this.buffer) return 0;
    if (!this.isPlayingState) return this.pauseOffset;
    return (this.ctx.currentTime - this.startTime) % this.buffer.duration;
  }

  public getDuration(): number {
    return this.buffer ? this.buffer.duration : 0;
  }

  public getVisualizerData(dataArray: Uint8Array<ArrayBuffer>) {
    this.analyserNode.getByteFrequencyData(dataArray);
  }

  public setVolume(vol: number) {
    this.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime, 0.05);
  }
}

/**
 * Offline Audio Context Master Renderer
 * Renders pristine studio master with preserved loudness, glue compression, and clean stereo width
 */
export async function renderMasterOffline(
  audioBuffer: AudioBuffer,
  preset: MasteringPreset,
  onProgress?: (progress: number) => void
): Promise<AudioBuffer> {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);

  // Trim Intro Offset if specified
  let sourceBuffer = audioBuffer;
  const trimSeconds = preset.trimIntroSeconds || 0;
  if (trimSeconds > 0 && audioBuffer.duration > trimSeconds + 2) {
    const trimSamples = Math.floor(trimSeconds * sampleRate);
    const remainingSamples = audioBuffer.length - trimSamples;
    const trimmed = new AudioBuffer({
      numberOfChannels: audioBuffer.numberOfChannels,
      length: remainingSamples,
      sampleRate: sampleRate,
    });
    for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
      trimmed.copyToChannel(audioBuffer.getChannelData(c).subarray(trimSamples), c);
    }
    sourceBuffer = trimmed;
  }

  // Combined Tempo Warp + Pitch Transposition
  const tempoFactor = (preset.tempoWarpPercent || 100) / 100;
  const pitchFactor = Math.pow(2, (preset.pitchDetuneCents || 0) / 1200);
  const combinedRate = tempoFactor * pitchFactor;

  // Pre-roll shift
  const preRollSamples = Math.floor(((preset.preRollShiftMs || 0) / 1000) * sampleRate);
  const adjustedLength = Math.floor(sourceBuffer.length / combinedRate) + preRollSamples;

  const offlineCtx = new OfflineAudioContext(
    numChannels,
    adjustedLength,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = sourceBuffer;
  source.playbackRate.value = combinedRate;

  // 1. Sub-Bass Body (60 Hz)
  const subBass = offlineCtx.createBiquadFilter();
  subBass.type = 'peaking';
  subBass.frequency.value = 60;
  subBass.Q.value = 1.0;
  subBass.gain.value = preset.subBassBodyDb;

  // 2. Low-Mid Clean Scoop (250 Hz)
  const mudScoop = offlineCtx.createBiquadFilter();
  mudScoop.type = 'peaking';
  mudScoop.frequency.value = 250;
  mudScoop.Q.value = 1.4;
  mudScoop.gain.value = preset.lowMidMudScoopDb;

  // 3. Vocal Clarity Presence (3450 Hz)
  const vocalPresence = offlineCtx.createBiquadFilter();
  vocalPresence.type = 'peaking';
  vocalPresence.frequency.value = 3450;
  vocalPresence.Q.value = 2.0;
  vocalPresence.gain.value = preset.antiAiVocalNotchDb;

  // 4. Air Sheen High-Shelf (12000 Hz)
  const airSheen = offlineCtx.createBiquadFilter();
  airSheen.type = 'highshelf';
  airSheen.frequency.value = 12000;
  airSheen.gain.value = preset.airSheenHighShelfDb;

  // 5. Ultrasonic Lowpass (transparent)
  const ultrasonic = offlineCtx.createBiquadFilter();
  ultrasonic.type = 'lowpass';
  ultrasonic.frequency.value = preset.ultrasonicCutHz || 20000;
  ultrasonic.Q.value = 0.707;

  // 6. Tape Warmth Softclip
  const tapeWarmth = offlineCtx.createWaveShaper();
  tapeWarmth.curve = makeTapeWarmthCurve(preset.tapeWarmth || 1.04) as Float32Array<ArrayBuffer>;

  // 7. Dynamic Mastering Compressor (Glue & Controlled Punch)
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -14.0;
  compressor.knee.value = 8.0;
  compressor.ratio.value = 2.0;
  compressor.attack.value = 0.02;
  compressor.release.value = 0.15;

  // Connect chain
  source.connect(subBass);
  subBass.connect(mudScoop);
  mudScoop.connect(vocalPresence);
  vocalPresence.connect(airSheen);
  airSheen.connect(ultrasonic);
  ultrasonic.connect(tapeWarmth);
  tapeWarmth.connect(compressor);
  compressor.connect(offlineCtx.destination);

  const startTime = (preset.preRollShiftMs || 0) / 1000;
  source.start(startTime);

  if (onProgress) onProgress(30);

  const renderedBuffer = await offlineCtx.startRendering();

  if (onProgress) onProgress(65);

  // Mid/Side Stereo Widening, Intelligent Volume Parity, and True-Peak Limiter
  applyAdvancedCloakingAndLufs(renderedBuffer, preset);

  if (onProgress) onProgress(90);

  return renderedBuffer;
}

/**
 * Applies Mid/Side stereo widening, Center Channel Vocal Balance,
 * Intelligent Volume Preservation (never quieter than input), and soft-knee peak limiting
 */
function applyAdvancedCloakingAndLufs(buffer: AudioBuffer, preset: MasteringPreset) {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;

  const left = buffer.getChannelData(0);
  const right = numChannels > 1 ? buffer.getChannelData(1) : left;

  // 1. Calculate current RMS & Peak
  let sumSquare = 0;
  let maxPeak = 0.0001;
  const step = 4;
  for (let i = 0; i < length; i += step) {
    const valL = Math.abs(left[i]);
    const valR = Math.abs(right[i]);
    if (valL > maxPeak) maxPeak = valL;
    if (valR > maxPeak) maxPeak = valR;

    const mono = (left[i] + right[i]) * 0.5;
    sumSquare += mono * mono;
  }
  const currentRms = Math.sqrt(sumSquare / (length / step)) || 0.001;
  const currentDb = 20 * Math.log10(currentRms);

  // Target standard: -14.0 LUFS
  const targetDb = preset.targetLufs || -14.0;

  // Volume parity guarantee:
  // If input audio is already loud (-13 to -11 dB), we do NOT attenuate it down into silence.
  // Instead, we maintain unity gain or apply a gentle mastering lift so it stays full and powerful!
  const targetGain = Math.pow(10, (targetDb - currentDb) / 20);
  const gainMultiplier = Math.max(1.0, Math.min(1.8, targetGain));

  // Clean Stereo Width factor (100% = 1.0, 115% = 1.15)
  const widthFactor = (preset.stereoWidthPercent || 100) / 100;

  // Center channel attenuation factor (default 0dB = 1.0)
  const centerAttenMultiplier = Math.pow(10, (preset.centerChannelAttenuationDb || 0) / 20);

  // Inaudible TPDF Dither
  const ditherAmp = Math.pow(10, (preset.harmonicDitherDb || -72) / 20);

  for (let i = 0; i < length; i++) {
    const l = left[i];
    const r = right[i];

    // Clean Mid / Side processing (No comb-filtering delay distortion!)
    const rawMid = (l + r) * 0.5;
    const rawSide = (l - r) * 0.5;

    const mid = rawMid * centerAttenMultiplier;
    const side = rawSide * widthFactor;

    // Gentle inaudible sub-quantization dither to mask digital artifacts
    const rnd = (Math.random() - 0.5 + (Math.random() - 0.5)) * ditherAmp;

    let outL = (mid + side + rnd) * gainMultiplier;
    let outR = (mid - side - rnd) * gainMultiplier;

    // Analog soft-knee peak limiter (-0.2 dBFS ceiling) to prevent digital clipping
    const ceiling = 0.98;
    if (outL > ceiling) outL = ceiling + (1 - ceiling) * Math.tanh((outL - ceiling) / (1 - ceiling));
    if (outL < -ceiling) outL = -ceiling + (1 - ceiling) * Math.tanh((outL + ceiling) / (1 - ceiling));
    if (outR > ceiling) outR = ceiling + (1 - ceiling) * Math.tanh((outR - ceiling) / (1 - ceiling));
    if (outR < -ceiling) outR = -ceiling + (1 - ceiling) * Math.tanh((outR + ceiling) / (1 - ceiling));

    left[i] = outL;
    if (numChannels > 1) {
      right[i] = outR;
    }
  }
}

/**
 * Generates an authentic rich sample Suno AI audio track in memory
 */
export function generateSampleSunoAudio(): AudioBuffer {
  const sampleRate = 44100;
  const duration = 15; // 15 seconds demo
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Chord progression: Am - F - C - G
  const chordRoots = [220.0, 174.61, 261.63, 196.0]; // Am, F, C, G
  const chordLength = (duration * sampleRate) / 4;

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.min(3, Math.floor(i / chordLength));
    const root = chordRoots[chordIdx];

    // Rich harmonic synth pad
    const pad1 = Math.sin(2 * Math.PI * root * t) * 0.18;
    const pad2 = Math.sin(2 * Math.PI * (root * 1.5) * t) * 0.12; // Fifth
    const pad3 = Math.sin(2 * Math.PI * (root * 1.25) * t) * 0.08; // Third
    const bass = Math.sin(2 * Math.PI * (root * 0.5) * t) * 0.22; // Sub bass

    // Smooth acoustic guitar-style pluck
    const beatPos = (t * 2) % 1.0;
    const pluckEnv = Math.exp(-beatPos * 4.0);
    const pluck = Math.sin(2 * Math.PI * (root * 2) * t) * pluckEnv * 0.15;

    // Drum kick every beat
    const kickPos = (t * 2) % 1.0;
    const kickEnv = Math.exp(-kickPos * 18.0);
    const kickPitch = 55 + Math.exp(-kickPos * 30.0) * 110;
    const kick = Math.sin(2 * Math.PI * kickPitch * kickPos) * kickEnv * 0.35;

    // Subtle stereo spread
    const mono = pad1 + pad2 + pad3 + bass + pluck + kick;
    left[i] = mono * 0.95 + pad2 * 0.05;
    right[i] = mono * 0.95 - pad2 * 0.05;
  }

  return buffer;
}
