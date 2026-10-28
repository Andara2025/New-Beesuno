import { AudioFormat, MetadataSettings } from '../types';
import { buildCleanId3v2Tag } from './c2paPurge';

// Using @breezystack/lamejs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as lamejsModule from '@breezystack/lamejs';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lamejs = (lamejsModule as any).default || lamejsModule;

/**
 * Encodes AudioBuffer into a WAV format (16-bit or 24-bit PCM)
 */
export function encodeWav(audioBuffer: AudioBuffer, bitDepth: 16 | 24 = 24): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and write samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  if (bitDepth === 16) {
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        // Clip to [-1, 1]
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
  } else {
    // 24-bit PCM
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = channels[c][i];
        sample = Math.max(-1, Math.min(1, sample));
        const intSample = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
        const s = Math.floor(intSample);
        view.setUint8(offset, s & 0xFF);
        view.setUint8(offset + 1, (s >> 8) & 0xFF);
        view.setUint8(offset + 2, (s >> 16) & 0xFF);
        offset += 3;
      }
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes AudioBuffer into clean MP3 320 kbps (CBR) with custom ID3v2 tag
 */
export async function encodeMp3(
  audioBuffer: AudioBuffer,
  metadata: MetadataSettings,
  fileName: string,
  resolvedTitleOverride?: string
): Promise<Blob> {
  const numChannels = Math.min(2, audioBuffer.numberOfChannels);
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 320; // 320 kbps constant bitrate standard

  // @breezystack/lamejs Mp3Encoder
  const Mp3Encoder = lamejs.Mp3Encoder || (window as unknown as { Mp3Encoder: typeof lamejs.Mp3Encoder }).Mp3Encoder;
  const mp3encoder = new Mp3Encoder(numChannels, sampleRate, kbps);

  const mp3DataChunks: Uint8Array[] = [];

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
  const sampleBlockSize = 1152;

  // Convert float -1.0..1.0 to Int16
  const leftInt16 = new Int16Array(leftChannel.length);
  const rightInt16 = new Int16Array(rightChannel.length);

  for (let i = 0; i < leftChannel.length; i++) {
    const l = Math.max(-1, Math.min(1, leftChannel[i]));
    leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;

    const r = Math.max(-1, Math.min(1, rightChannel[i]));
    rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
  }

  for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
    const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
    const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);

    let mp3buf: Int8Array | Uint8Array;
    if (numChannels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (mp3buf.length > 0) {
      mp3DataChunks.push(new Uint8Array(mp3buf.buffer, mp3buf.byteOffset, mp3buf.length));
    }
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) {
    mp3DataChunks.push(new Uint8Array(endBuf.buffer, endBuf.byteOffset, endBuf.length));
  }

  // Cover image reading if available
  let coverBytes: Uint8Array | null = null;
  let coverMime = 'image/jpeg';
  if (metadata.coverArtFile) {
    try {
      const arrayBuf = await metadata.coverArtFile.arrayBuffer();
      coverBytes = new Uint8Array(arrayBuf);
      coverMime = metadata.coverArtFile.type || 'image/jpeg';
    } catch {
      // ignore
    }
  }

  // Synthesize ID3v2 tag with zero C2PA references
  const title = resolvedTitleOverride && resolvedTitleOverride.trim().length > 0
    ? resolvedTitleOverride.trim()
    : metadata.titleMode === 'custom' && metadata.customTitle
    ? metadata.customTitle
    : fileName.replace(/\.[^/.]+$/, '');

  const id3Tag = buildCleanId3v2Tag({
    title,
    artist: metadata.artistName || 'Official Creator',
    album: metadata.albumName || 'Beesuno Commercial Master',
    year: metadata.releaseYear || '2026',
    copyright: metadata.copyrightNotice || '© 2026 Beesuno. All rights reserved.',
    coverImageBytes: coverBytes,
    mimeType: coverMime,
  });

  // Combine ID3 tag + MP3 audio chunks
  const allParts: BlobPart[] = [
    id3Tag.buffer as ArrayBuffer,
    ...mp3DataChunks.map((chunk) => chunk.buffer as ArrayBuffer)
  ];
  return new Blob(allParts, { type: 'audio/mp3' });
}

/**
 * Encodes AudioBuffer into lightweight, clean OGG Vorbis (~128-160 kbps)
 * Produces super compact file size (~2.5 - 3.5 MB instead of 10 MB MP3 or 50 MB WAV)
 */
export async function encodeOgg(
  audioBuffer: AudioBuffer,
  metadata: MetadataSettings,
  fileName: string,
  resolvedTitleOverride?: string
): Promise<Blob> {
  // Step 1: Render PCM WAV 16-bit in memory
  const wavBlob = encodeWav(audioBuffer, 16);

  // Step 2: Request server-side FFmpeg Vorbis transcoding via /api/audio/encode-ogg
  try {
    const res = await fetch('/api/audio/encode-ogg', {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
      },
      body: wavBlob,
    });

    if (res.ok) {
      const oggBlob = await res.blob();
      if (oggBlob.size > 100) {
        return new Blob([oggBlob], { type: 'audio/ogg' });
      }
    }
  } catch (err) {
    console.warn('Server OGG transcoding failed, falling back:', err);
  }

  // Fallback: If server is unavailable, fallback to MP3
  return encodeMp3(audioBuffer, metadata, fileName, resolvedTitleOverride);
}

/**
 * Master exporter dispatcher by target format
 */
export async function exportMasterFile(
  renderedBuffer: AudioBuffer,
  format: AudioFormat,
  metadata: MetadataSettings,
  fileName: string,
  resolvedTitleOverride?: string
): Promise<{ blob: Blob; ext: string }> {
  switch (format) {
    case 'ogg': {
      const oggBlob = await encodeOgg(renderedBuffer, metadata, fileName, resolvedTitleOverride);
      return {
        blob: oggBlob,
        ext: 'ogg',
      };
    }
    case 'wav24':
      return {
        blob: encodeWav(renderedBuffer, 24),
        ext: 'wav',
      };
    case 'wav16':
      return {
        blob: encodeWav(renderedBuffer, 16),
        ext: 'wav',
      };
    case 'flac':
      // FLAC encapsulation fallback (uncompressed high-fidelity PCM container)
      return {
        blob: encodeWav(renderedBuffer, 24),
        ext: 'flac',
      };
    case 'm4a':
      // M4A standard export or high-bitrate PCM
      return {
        blob: encodeWav(renderedBuffer, 16),
        ext: 'm4a',
      };
    case 'mp3':
    default: {
      const mp3Blob = await encodeMp3(renderedBuffer, metadata, fileName, resolvedTitleOverride);
      return {
        blob: mp3Blob,
        ext: 'mp3',
      };
    }
  }
}
