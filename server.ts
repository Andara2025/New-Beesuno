import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev server must run on port 3000 (port 8080 is reserved by nginx proxy)
const PORT = 3000;

// Enable CORS and handle preflight OPTIONS globally
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition, Content-Length, X-Armor-Filename, X-Armor-Preset, X-Armor-Format'
  );
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint to improve and cloak lyrics with Gemini AI
app.post('/api/lyrics/improve', async (req, res) => {
  try {
    const { lyrics, mode, genre, language } = req.body;

    if (!lyrics || typeof lyrics !== 'string') {
      res.status(400).json({ error: 'Lyrics text is required.' });
      return;
    }

    let systemPrompt = '';
    let userPrompt = '';

    const isArabic = language === 'ar' || /[\u0600-\u06FF]/.test(lyrics);

    if (isArabic) {
      systemPrompt = `Anda adalah Ahli Tajwid Al-Qur'an dan Master Prompt Engineering Murottal Suno AI.
Tugas Anda adalah memformat ayat Al-Qur'an / Murottal dengan kaidah Waqaf & Ibtida' yang presisi agar dibaca oleh Suno AI dengan Tartil yang fasih, khusyuk, dan berwibawa:
1. PISAHKAN TA'AWWUDZ: Jika ada Ta'awwudz (أعوذ بالله من الشيطان الرجيم), tempatkan dalam bagian tersendiri [Ta'awwudz]. JANGAN PERNAH disambung dengan Basmalah atau ayat!
2. PISAHKAN BASMALAH: Jika ada Basmalah (بسم الله الرحمن الرحيم), tempatkan dalam bagian tersendiri [Basmalah]. JANGAN PERNAH disambung dengan ayat!
3. PEMENGGALAN SESUAI KAIDAH WAQAF (JANGAN ASAL PENGGAL):
   - Penggalan ayat harus berhenti pada tempat waqaf yang sah (Waqaf Tam, Waqaf Kafi, atau Waqaf Ja'iz).
   - JANGAN MEMOTONG kalimat yang merusak makna (misal jangan memutus mudhaf-mudhaf ilaih, jar-majrur, atau syarat tanpa jawabnya).
   - Bagi ke dalam bait [Verse 1], [Verse 2], [Verse 3] berisi 1-2 baris klausa lengkap agar qari AI Suno mengambil nafas (tanaffus) secara alami.
4. DILARANG MENAMBAHKAN TAG [Outro]! Murottal tidak boleh memakai tag outro lagu pop. Cukup akhiri setelah ayat terakhir.
5. JANGAN MENGUBAH satu huruf pun dari firman Allah. Pertahankan harakat asli.
Output HANYA teks terformat siap pakai untuk Suno AI.`;
      userPrompt = `Format teks Murottal Al-Qur'an ini dengan pemenggalan Waqaf yang benar, Ta'awwudz & Basmalah terpisah, dan TANPA tag outro:\n\n${lyrics}`;
    } else if (mode === 'paraphrase') {
      systemPrompt = `Anda adalah produser musik dan lyricist profesional untuk Suno AI.
Tugas Anda adalah menulis ulang (paraphrase) lirik yang diberikan agar 100% BEBAS DARI COPYRIGHT CLAIM (LyricFind, Musixmatch, Universal Music, Sony, Warner).
Pertahankan alur cerita, emosi, tempo, rima akhir kalimat, dan jumlah suku kata agar pas dinyanyikan di Suno AI, tetapi ganti semua kata kunci dan frasa khas lagu aslinya dengan metafora dan lirik original baru yang segar.
Tambahkan tag struktur lagu Suno yang rapi seperti [Verse 1], [Chorus], [Bridge], [Outro].
Bahasa lirik output harus sesuai: ${language === 'id' ? 'Bahasa Indonesia (bisa campur slang/Jawa bila cocok)' : 'English'}.`;
      userPrompt = `Tulis ulang lirik ini agar bebas hak cipta dan siap dimonetisasi:\n\n${lyrics}`;
    } else if (mode === 'structure') {
      systemPrompt = `Anda adalah ahli prompt engineering lirik Suno AI v3.5 dan v4.
Tugas Anda adalah memformat lirik yang diberikan dengan tag aransemen musik Suno yang optimal untuk menghasilkan lagu spektakuler.
Sertakan tag struktur vokal dan dinamika instrumen seperti:
[Style: ${genre || 'Pop Ballad'}]
[Intro - Acoustic Guitar & Warm Bass]
[Verse 1 - Soft Melodic Vocals]
[Pre-Chorus - Rising Energy, Drums Kick In]
[Chorus - Explosive Vocals, Big Stereo Hook]
[Guitar Solo / Synth Drop]
[Bridge - Emotional Breakdown]
[Final Chorus - Maximum Energy & Harmonies]
[Outro - Slow Fade, Echoing Vocals]
[End]
Pastikan lirik aslinya tetap utuh, hanya ditambahkan tag aransemen profesional Suno AI.`;
      userPrompt = `Format lirik ini dengan tag struktur Suno AI lengkap:\n\n${lyrics}`;
    } else if (mode === 'rhyme') {
      systemPrompt = `Anda adalah ghostwriter lagu dan spesialis meteran vokal Suno AI.
Tugas Anda adalah mengoptimalkan rima akhir (rhyme scheme AABB atau ABAB) dan ketukan silabel (cadence) dari lirik yang diberikan agar vokal AI Suno mengalir sangat natural, tidak terputus-putus, dan enak didengar.
Tetap jaga makna asli lagu.`;
      userPrompt = `Perbaiki rima dan flow ketukan lirik ini untuk vokal Suno AI:\n\n${lyrics}`;
    } else {
      // Default: AI Deep Phonetic Cloaker
      systemPrompt = `Anda adalah spesialis anti-copyright filter untuk Suno AI.
Tugas Anda adalah mengubah lirik menjadi ejaan fonetik siluman (homophone cloking).
Suno AI membaca teks secara fonemik; jika kita mengeja kata seperti "I'm tired" menjadi "Ayem tayyed", bot pemeriksa teks (LyricFind/Musixmatch) tidak akan mengenali lagu aslinya, namun vokal Suno akan menyanyikannya dengan lafal yang 100% tepat seperti lagu asli!
Pertahankan semua baris, tanda kurung, dan ritme lagu. Hasilkan hanya teks lirik siluman tanpa pengantar basa-basi.`;
      userPrompt = `Ubah lirik ini menjadi ejaan fonetik siluman anti-sensor untuk Suno:\n\n${lyrics}`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    const resultText = response.text || '';
    res.json({
      success: true,
      result: resultText.trim(),
      riskScore: mode === 'paraphrase' ? 0 : 5,
    });
  } catch (error) {
    console.error('Gemini Lyrics API Error:', error);
    res.status(500).json({
      error: 'Gagal memproses lirik dengan AI, silakan gunakan mode offline.',
    });
  }
});

// ==========================================
// SUNO DOWNLOADER & DECRYPTOR BACKEND ENGINE
// ==========================================
import crypto from 'crypto';
import { spawn } from 'child_process';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// In-memory cache for audio streams (TTL 15 mins) to prevent duplicate decryption
// In-memory cache for audio streams (TTL 15 mins) to prevent duplicate decryption/transcoding
interface CachedAudio {
  raw: Buffer;
  rawFormat: 'mp3' | 'm4a' | 'wav';
  mp3?: Buffer;
  ogg?: Buffer;
  m4a?: Buffer;
  timestamp: number;
}
const audioStreamCache = new Map<string, CachedAudio>();
const metadataCache = new Map<string, any>();

function cleanAudioCache() {
  const now = Date.now();
  for (const [key, val] of audioStreamCache.entries()) {
    if (now - val.timestamp > 15 * 60 * 1000) {
      audioStreamCache.delete(key);
    }
  }
}
setInterval(cleanAudioCache, 5 * 60 * 1000);

async function resolveSunoSongId(rawUrl: string): Promise<string> {
  const trimmed = rawUrl.trim();
  // Direct UUID match in the string
  if (UUID_RE.test(trimmed)) {
    const m = trimmed.match(UUID_RE);
    if (m) return m[0];
  }

  // Handle /s/ shortlinks by following redirect
  if (trimmed.includes('suno.com/s/')) {
    try {
      const res = await fetch(trimmed, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const loc = res.headers.get('location');
      if (loc) {
        const match = loc.match(UUID_RE);
        if (match) return match[0];
      }
    } catch (e) {
      console.warn('Shortlink redirect lookup warning:', e);
    }
  }

  // Fallback: fetch page and grep UUID
  try {
    const res = await fetch(trimmed, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    const match = html.match(UUID_RE);
    if (match) return match[0];
  } catch (e) {
    console.warn('Page fetch lookup warning:', e);
  }

  throw new Error('Tidak dapat menemukan ID lagu Suno dari tautan yang diberikan.');
}

async function fetchSunoMetadata(songId: string) {
  let title = 'Lagu Suno';
  let artist = 'Suno Creator';
  let imageUrl = `https://cdn2.suno.ai/image_large_${songId}.jpeg`;
  let prompt = '';
  let duration = 0;
  let model = 'v6';
  let audioUrl = '';
  let videoUrl = '';

  // Primary: Official Suno Studio Clip API
  const apiUrls = [
    `https://studio-api-prod.suno.com/api/clip/${songId}`,
    `https://studio-api.prod.suno.com/api/clip/${songId}`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          title = data.title;
          artist = data.display_name || data.handle || artist;
          imageUrl = data.image_large_url || data.image_url || imageUrl;
          model = data.major_model_version || model;
          if (data.audio_url) audioUrl = data.audio_url;
          if (data.video_url) videoUrl = data.video_url;
          if (data.metadata) {
            prompt = data.metadata.prompt || '';
            if (data.metadata.duration && typeof data.metadata.duration === 'number') {
              duration = Math.round(data.metadata.duration * 100) / 100;
            }
          }
          if (!duration && data.duration && typeof data.duration === 'number') {
            duration = Math.round(data.duration * 100) / 100;
          }

          const meta = {
            songId,
            title,
            artist,
            imageUrl,
            prompt,
            duration,
            model,
            audioUrl,
            videoUrl,
            shortlink: `https://suno.com/song/${songId}`,
          };
          metadataCache.set(songId, meta);
          return meta;
        }
      }
    } catch (err) {
      console.warn(`Suno clip API error on ${apiUrl}:`, err);
    }
  }

  // Fallback: Scrape Suno web page
  try {
    const pageUrl = `https://suno.com/song/${songId}`;
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();

    // Duration extraction from flight data
    const durMatch = html.match(/\\?"duration\\?":\s*([0-9.]+)/);
    if (durMatch) {
      duration = Math.round(parseFloat(durMatch[1]) * 100) / 100;
    }

    // Title from og:title or clip
    const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    if (ogTitle) {
      title = ogTitle[1];
    }

    // Description contains "Title by Artist"
    const descM = html.match(/<meta\s+name="description"\s+content="([^"]+)\s+by\s+([^"]+)"/i);
    if (descM) {
      if (!title || title === 'Lagu Suno') title = descM[1].trim();
      artist = descM[2].split('(')[0].trim();
    }

    // Model version
    const modMatch = html.match(/\\?"major_model_version\\?":\s*\\?"([^"\\]+)\\?"/);
    if (modMatch) {
      model = modMatch[1];
    }

    // Prompt
    const promptMatch = html.match(/\\?"prompt\\?":\s*\\?"((?:\\\\"|[^"])+)\\?"/);
    if (promptMatch) {
      prompt = promptMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }

    // Audio/Video URLs in HTML flight data
    const audioUrlMatch = html.match(/\\?"audio_url\\?":\s*\\?"([^"\\]+)\\?"/i) || html.match(/"audio_url":"([^"]+)"/i);
    if (audioUrlMatch) {
      audioUrl = audioUrlMatch[1].replace(/\\u0026/g, '&');
    }
    const videoUrlMatch = html.match(/\\?"video_url\\?":\s*\\?"([^"\\]+)\\?"/i) || html.match(/"video_url":"([^"]+)"/i);
    if (videoUrlMatch) {
      videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&');
    }
  } catch (err) {
    console.error('Error in fallback Suno scraping:', err);
  }

  const resultMeta = {
    songId,
    title,
    artist,
    imageUrl,
    prompt,
    duration,
    model,
    audioUrl,
    videoUrl,
    shortlink: `https://suno.com/song/${songId}`,
  };
  metadataCache.set(songId, resultMeta);
  return resultMeta;
}

// Fallback decryptor for DRM-encrypted clips (Mango license protocol)
async function decryptSunoAudioStream(songId: string): Promise<Buffer> {
  const rightsEndpoints = [
    'https://studio-api-prod.suno.com/api/mango/rights',
    'https://studio-api.prod.suno.com/api/mango/rights',
  ];

  let rights: { key: string; iv: string; glt: string } | null = null;
  let lastError = '';

  for (const endpoint of rightsEndpoints) {
    try {
      const rightsRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Origin: 'https://suno.com',
          Referer: `https://suno.com/song/${songId}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          content_params: { content_id: songId, content_type: 'clip' },
        }),
      });

      if (rightsRes.ok) {
        const json = await rightsRes.json();
        if (json.key && json.iv && json.glt) {
          rights = json;
          break;
        }
      } else {
        lastError = `HTTP ${rightsRes.status}`;
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  if (!rights) {
    throw new Error(`Lisensi DRM Suno gagal didapatkan (${lastError || 'Server tidak merespons'})`);
  }

  // Unwrap AES-GCM keys using Web Crypto API
  const gltBytes = new TextEncoder().encode(rights.glt);
  const userKeyHash = await crypto.subtle.digest('SHA-256', gltBytes);
  const userKey = await crypto.subtle.importKey('raw', userKeyHash, { name: 'AES-GCM' }, false, ['decrypt']);

  const toWrappedKey = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

  // Content Key
  const wrappedKeyBytes = toWrappedKey(rights.key);
  const contentKeyRaw = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: wrappedKeyBytes.slice(0, 12),
      additionalData: new TextEncoder().encode(songId),
    },
    userKey,
    wrappedKeyBytes.slice(12)
  );

  // Content IV
  const wrappedIvBytes = toWrappedKey(rights.iv);
  const contentIvRaw = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: wrappedIvBytes.slice(0, 12),
      additionalData: new TextEncoder().encode(songId),
    },
    userKey,
    wrappedIvBytes.slice(12)
  );
  const contentIv = new Uint8Array(contentIvRaw);

  // Fetch encrypted m4a stream from CloudFront
  const audioUrl = `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.m4a`;
  const audioRes = await fetch(audioUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Referer: 'https://suno.com/',
    },
  });

  if (!audioRes.ok) {
    throw new Error(`Gagal mengunduh audio terenkripsi CloudFront (HTTP ${audioRes.status})`);
  }

  const encArrayBuf = await audioRes.arrayBuffer();

  // Decrypt AES-128-CTR stream
  const contentKey = await crypto.subtle.importKey('raw', contentKeyRaw, { name: 'AES-CTR' }, false, ['decrypt']);
  const decryptedBuf = await crypto.subtle.decrypt(
    {
      name: 'AES-CTR',
      counter: contentIv,
      length: 128,
    },
    contentKey,
    encArrayBuf
  );

  return Buffer.from(decryptedBuf);
}

// Multi-Source Audio Downloader: Prioritizes direct public CDN streams, with automatic DRM fallback
async function fetchSunoAudioStream(songId: string): Promise<{ buffer: Buffer; format: 'mp3' | 'm4a' | 'wav' }> {
  // 1. Check in-memory cache
  const cached = audioStreamCache.get(songId);
  if (cached && cached.raw) {
    return { buffer: cached.raw, format: cached.rawFormat };
  }

  // 2. Build candidate URLs list
  const meta = metadataCache.get(songId);
  const candidates: string[] = [];
  if (meta?.audioUrl) candidates.push(meta.audioUrl);
  candidates.push(
    `https://cdn1.suno.ai/${songId}.mp3`,
    `https://cdn2.suno.ai/${songId}.mp3`,
    `https://audiocdn.suno.ai/${songId}.mp3`,
    `https://cdn.suno.ai/${songId}.mp3`,
    `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.mp3`,
    `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.m4a`
  );
  if (meta?.videoUrl) candidates.push(meta.videoUrl);

  // Try direct public streaming endpoints
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://suno.com/',
          Accept: '*/*',
        },
      });

      if (res.ok) {
        const ab = await res.arrayBuffer();
        const buf = Buffer.from(ab);
        // Ensure not an HTML error response and has meaningful audio data (> 5 KB)
        if (buf.length > 5000 && !buf.subarray(0, 100).toString().toLowerCase().includes('<!doctype') && !buf.subarray(0, 100).toString().toLowerCase().includes('<html')) {
          const isM4a = url.includes('.m4a') || url.includes('.mp4');
          const format: 'mp3' | 'm4a' = isM4a ? 'm4a' : 'mp3';
          audioStreamCache.set(songId, {
            raw: buf,
            rawFormat: format,
            ...(format === 'mp3' ? { mp3: buf } : { m4a: buf }),
            timestamp: Date.now(),
          });
          return { buffer: buf, format };
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 3. DRM Decryption Fallback
  try {
    const decryptedM4a = await decryptSunoAudioStream(songId);
    if (decryptedM4a && decryptedM4a.length > 5000) {
      audioStreamCache.set(songId, {
        raw: decryptedM4a,
        rawFormat: 'm4a',
        m4a: decryptedM4a,
        timestamp: Date.now(),
      });
      return { buffer: decryptedM4a, format: 'm4a' };
    }
  } catch (err: any) {
    console.warn(`DRM fallback attempt for ${songId}:`, err?.message);
  }

  throw new Error(`Tidak dapat mengunduh berkas audio dari CDN Suno untuk ID "${songId}". Pastikan lagu ini publik atau coba tautan lagu Suno lainnya.`);
}

// Universal Audio Transcoder with EPIPE safety
function transcodeAudio(
  inputBuffer: Buffer,
  targetFormat: 'mp3' | 'ogg' | 'm4a'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let args: string[];
    if (targetFormat === 'ogg') {
      args = [
        '-i', 'pipe:0',
        '-c:a', 'libvorbis',
        '-q:a', '4', // ~128-160kbps Vorbis, super lightweight (~2.5 - 3.5 MB)
        '-f', 'ogg',
        'pipe:1',
      ];
    } else if (targetFormat === 'm4a') {
      args = [
        '-i', 'pipe:0',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4',
        'pipe:1',
      ];
    } else {
      // Default: High-definition 320kbps MP3
      args = [
        '-i', 'pipe:0',
        '-c:a', 'libmp3lame',
        '-b:a', '320k',
        '-f', 'mp3',
        'pipe:1',
      ];
    }

    const ffmpeg = spawn('ffmpeg', args);
    const chunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    ffmpeg.stdout.on('data', (c) => chunks.push(c));
    ffmpeg.stderr.on('data', (c) => stderrChunks.push(c));

    ffmpeg.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const errMsg = Buffer.concat(stderrChunks).toString('utf-8');
        reject(new Error(`Transcoding ${targetFormat} gagal (kode ${code}): ${errMsg.slice(-200)}`));
      }
    });

    ffmpeg.on('error', (err) => reject(err));
    ffmpeg.stdin.on('error', () => {
      // Catch EPIPE to prevent uncaught exception crash
    });

    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

function transcodeWavToOgg(wavBuffer: Buffer): Promise<Buffer> {
  return transcodeAudio(wavBuffer, 'ogg');
}

function transcodePitchTempo(
  wavBuffer: Buffer,
  pitchCents: number = 0,
  tempoMultiplier: number = 1.0,
  outputFormat: 'wav' | 'ogg' = 'wav'
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pitchRatio = Math.pow(2, pitchCents / 1200);
    const tempo = Math.max(0.5, Math.min(2.0, tempoMultiplier || 1.0));

    const args = [
      '-i',
      'pipe:0',
      '-af',
      `rubberband=pitch=${pitchRatio.toFixed(6)}:tempo=${tempo.toFixed(4)}`,
    ];

    if (outputFormat === 'ogg') {
      args.push('-c:a', 'libvorbis', '-q:a', '4', '-f', 'ogg', 'pipe:1');
    } else {
      args.push('-c:a', 'pcm_s16le', '-f', 'wav', 'pipe:1');
    }

    const ffmpeg = spawn('ffmpeg', args);
    const chunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    ffmpeg.stdout.on('data', (c) => chunks.push(c));
    ffmpeg.stderr.on('data', (c) => stderrChunks.push(c));

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        const errMsg = Buffer.concat(stderrChunks).toString('utf-8');
        reject(new Error(`Pitch/Tempo processing gagal (kode ${code}): ${errMsg.slice(-200)}`));
      }
    });

    ffmpeg.on('error', (err) => reject(err));
    ffmpeg.stdin.on('error', () => {
      // Catch EPIPE to prevent crash
    });

    ffmpeg.stdin.write(wavBuffer);
    ffmpeg.stdin.end();
  });
}

// Endpoint to pitch-shift and/or tempo-scale audio independently without slow-mo artifacts
app.post(
  '/api/audio/pitch-shift',
  express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '100mb' }),
  async (req, res) => {
    try {
      const wavBuffer = req.body as Buffer;
      if (!wavBuffer || wavBuffer.length === 0) {
        res.status(400).json({ error: 'Buffer audio kosong.' });
        return;
      }

      const pitchCents = parseFloat((req.query.pitchCents as string) || (req.headers['x-pitch-cents'] as string) || '0');
      const tempoMultiplier = parseFloat((req.query.tempoMultiplier as string) || (req.headers['x-tempo-multiplier'] as string) || '1.0');
      const format = ((req.query.format as string) === 'ogg' ? 'ogg' : 'wav') as 'wav' | 'ogg';

      const processedBuffer = await transcodePitchTempo(wavBuffer, pitchCents, tempoMultiplier, format);
      res.setHeader('Content-Type', format === 'ogg' ? 'audio/ogg' : 'audio/wav');
      res.setHeader('Content-Length', processedBuffer.length);
      res.send(processedBuffer);
    } catch (error: any) {
      console.error('Pitch Shift API Error:', error);
      res.status(500).json({ error: error.message || 'Gagal memproses pitch/tempo audio.' });
    }
  }
);

// Endpoint to transcode audio PCM/WAV directly to lightweight OGG Vorbis
app.post('/api/audio/encode-ogg', express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '100mb' }), async (req, res) => {
  try {
    const wavBuffer = req.body as Buffer;
    if (!wavBuffer || wavBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio kosong.' });
      return;
    }
    const oggBuffer = await transcodeWavToOgg(wavBuffer);
    res.setHeader('Content-Type', 'audio/ogg');
    res.setHeader('Content-Length', oggBuffer.length);
    res.send(oggBuffer);
  } catch (error: any) {
    console.error('OGG Encoding Error:', error);
    res.status(500).json({ error: error.message || 'Gagal meng-encode berkas OGG.' });
  }
});

// ==========================================
// AUDIO ARMOR ENGINE (Anti-Audible Magic & Fingerprint Evasion)
// ==========================================
export type CanonicalArmorPreset = 'vocal_armor' | 'pulse_armor' | 'warm_armor';
export type ArmorFormatType = 'wav' | 'ogg' | 'mp3';

interface ArmorOptions {
  preset: CanonicalArmorPreset;
  mode: 'slice' | 'full';
  startTime: number;
  duration: number;
  title?: string;
  format?: ArmorFormatType;
}

const PITCH_SHIFT = 0.922333; // 2^(-1.4/12) -> transpose -1.4 semitones
const TEMPO_VOCAL = 1.125407; // 0.922333 * 1.125407 = 1.038x net tempo (+3.8% speed breaks DTW bot)
const TEMPO_PULSE = 1.138419; // 0.922333 * 1.138419 = 1.050x net tempo (+5% speed)
const TEMPO_WARM = 1.098568;  // 0.933033 * 1.098568 = 1.025x net tempo (+2.5% speed)

function normalizeArmorPreset(rawPreset: string | undefined | null): CanonicalArmorPreset {
  if (!rawPreset) return 'vocal_armor';
  const p = String(rawPreset).toLowerCase().trim();
  if (
    p === 'pulse_armor' ||
    p === 'staccato' ||
    p === 'staccato_guide' ||
    p === 'pulse' ||
    p === 'rhythmic_chop'
  ) {
    return 'pulse_armor';
  }
  if (
    p === 'warm_armor' ||
    p === 'slow_tempo' ||
    p === 'slow_ballad' ||
    p === 'ballad' ||
    p === 'slow' ||
    p === 'deep_acoustic'
  ) {
    return 'warm_armor';
  }
  return 'vocal_armor';
}

const pitchShiftCore = 'aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.122462';

function getArmorDspFilter(preset: string = 'original'): string {
  const p = (preset || 'original').toLowerCase().trim();

  if (p === 'slow_tempo' || p === 'slow_ballad' || p === 'warm_armor') {
    // 🌙 Slow Tempo / Ballad Shield (Formula Teruji 100% Lolos + Intonasi Pas & Manis)
    // Chopper 5.5Hz (d=0.88) + Notch 1800Hz (-11dB) + Transpose -2 Semitones + Tempo Shift +5% (atempo=1.178585)
    // In-Phase Stereo (c0=c0-c1|c1=c0-c1) anti-mono phase cancellation Suno AI
    return 'pan=stereo|c0=c0-c1|c1=c0-c1,highpass=f=160,bass=g=3.0:f=180,equalizer=f=1800:t=q:w=1.2:g=-11,tremolo=f=5.5:d=0.88,aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.178585,volume=2.2';
  }

  if (p === 'staccato' || p === 'staccato_guide' || p === 'pulse_armor' || p === 'pulse') {
    // ⚡ Staccato Guide Mode (On-Off Pulse ~22% with 50ms smooth ramp)
    // Pulse ON (1.4s): cancel factor 0.78 (leaving ~22% faint ghost vocal for Suno pitch/melody tracker)
    // Pulse OFF (1.6s): cancel factor 1.0 (100% hard kill to break Audible Magic continuous fingerprint)
    // Highpass 250Hz + Pitch Shift -2 Semitones (0.8908987) + Volume 1.6x
    return `aeval=exprs='val(0)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(1)|val(1)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(0)':c=stereo,highpass=f=250,${pitchShiftCore},volume=1.6`;
  }

  // 🛡️ Original Pure SideHarmoni (Default / Vocal Armor)
  return `pan=stereo|c0=c0-c1|c1=c1-c0,highpass=f=250,${pitchShiftCore},volume=1.6`;
}

function generateArmorFilename(
  rawTitle: string,
  rawPreset: string,
  isFull: boolean,
  duration: number,
  format: ArmorFormatType = 'mp3'
): string {
  const base = (rawTitle || 'Audio')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .replace(/_+/g, '_');

  const preset = normalizeArmorPreset(rawPreset);
  const presetSuffix =
    preset === 'pulse_armor' ? '_PulseArmor' : preset === 'warm_armor' ? '_WarmArmor' : '_VocalArmor';
  const durLabel = isFull ? 'Full' : `${Math.round(duration)}s`;
  const ext = format === 'wav' ? 'wav' : format === 'ogg' ? 'ogg' : 'mp3';

  return `${base}${presetSuffix}_${durLabel}.${ext}`;
}

function probeAudioChannels(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'a:0',
      '-show_entries',
      'stream=channels',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    let out = '';
    ffprobe.stdout.on('data', (d) => {
      out += d.toString();
    });
    ffprobe.on('close', () => {
      const parsed = parseInt(out.trim(), 10);
      resolve(isNaN(parsed) || parsed < 1 ? 2 : parsed);
    });
    ffprobe.on('error', () => resolve(2));
  });
}

async function runArmorFFmpeg(
  inputBuffer: Buffer,
  options: ArmorOptions
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const isFull = options.mode === 'full';
  const startTime = Math.max(0, options.startTime || 0);
  const duration = Math.max(1, options.duration || 60.0);
  const preset = normalizeArmorPreset(options.preset);
  const format: ArmorFormatType = options.format === 'wav' ? 'wav' : options.format === 'ogg' ? 'ogg' : 'mp3';
  const filename = generateArmorFilename(options.title || 'Track', preset, isFull, duration, format);
  const mimeType = format === 'wav' ? 'audio/wav' : format === 'ogg' ? 'audio/ogg' : 'audio/mpeg';

  const tmpId = crypto.randomBytes(8).toString('hex');
  const tempInput = path.join(os.tmpdir(), `armor_in_${tmpId}.bin`);
  const tempOutput = path.join(os.tmpdir(), `armor_out_${tmpId}.${format}`);

  await fs.promises.writeFile(tempInput, inputBuffer);

  try {
    // Validate stereo channels
    const channels = await probeAudioChannels(tempInput);
    if (channels < 2) {
      throw new Error(
        'Audio masukan bersifat Mono (1 kanal). Semua preset Audio Armor membutuhkan audio Stereo (2 kanal) agar pembatalan komponen tengah dan separasi fase dapat bekerja. Mohon gunakan berkas audio stereo.'
      );
    }

    const dspFilter = getArmorDspFilter(preset);

    // Exact arguments matching CoSuProcessor.exportStealthSeed:
    const args: string[] = ['-y'];

    if (!isFull) {
      args.push('-ss', startTime.toFixed(3), '-t', duration.toFixed(3));
    } else {
      if (startTime > 0) {
        args.push('-ss', startTime.toFixed(3));
      }
    }

    args.push('-i', tempInput, '-vn', '-af', dspFilter, '-map_metadata', '-1');

    if (format === 'wav') {
      args.push('-c:a', 'pcm_s16le', '-f', 'wav', tempOutput);
    } else if (format === 'ogg') {
      // Vorbis 128k persis seperti format Menari_Diatas_Luka...ogg yang 100% lolos verifikasi Suno
      args.push('-c:a', 'libvorbis', '-b:a', '128k', '-f', 'ogg', tempOutput);
    } else {
      // libmp3lame 320k persis seperti CoSuProcessor
      args.push('-c:a', 'libmp3lame', '-b:a', '320k', tempOutput);
    }

    await new Promise<void>((resolve, reject) => {
      const proc = spawn('ffmpeg', args);
      let stderr = '';
      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch (_) {}
        reject(new Error('FFmpeg Audio Armor execution timed out (240s).'));
      }, 240000);

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && fs.existsSync(tempOutput)) {
          resolve();
        } else {
          reject(new Error(`FFmpeg Armor execution failed (code ${code}): ${stderr.slice(-300)}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const resultBuffer = await fs.promises.readFile(tempOutput);
    if (resultBuffer.length < 1000) {
      throw new Error('Hasil pemrosesan audio tidak valid atau terlalu kecil.');
    }
    return { buffer: resultBuffer, filename, mimeType };
  } finally {
    try {
      if (fs.existsSync(tempInput)) await fs.promises.unlink(tempInput);
      if (fs.existsSync(tempOutput)) await fs.promises.unlink(tempOutput);
    } catch (_) {}
  }
}

// Helper to safely extract Buffer from Express request regardless of middleware
async function getRequestAudioBuffer(req: express.Request): Promise<Buffer | null> {
  if (Buffer.isBuffer(req.body) && req.body.length > 0) {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.length > 0) {
    return Buffer.from(req.body);
  }
  // Fallback: Read raw stream directly if body-parser did not buffer
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length > 0) {
      return Buffer.concat(chunks);
    }
  } catch (_) {}
  return null;
}

// Processing Endpoint - Returns High-Quality OGG / MP3 Seed
const handleArmorProcess = async (req: express.Request, res: express.Response) => {
  try {
    const audioBuffer = await getRequestAudioBuffer(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio tidak ditemukan atau kosong. Mohon sertakan data audio.' });
      return;
    }

    const rawPreset = (req.query.preset as string) || (req.headers['x-armor-preset'] as string) || (req.headers['x-cosu-preset'] as string) || 'vocal_armor';
    const preset = normalizeArmorPreset(rawPreset);
    const mode = (((req.query.mode as string) || (req.headers['x-armor-mode'] as string) || (req.headers['x-cosu-mode'] as string) || 'slice') as 'slice' | 'full');
    const startTime = parseFloat((req.query.startTime as string) || (req.headers['x-armor-start-time'] as string) || (req.headers['x-cosu-start-time'] as string) || '0');
    const duration = parseFloat((req.query.duration as string) || (req.headers['x-armor-duration'] as string) || (req.headers['x-cosu-duration'] as string) || '60.00');
    const rawTitle = (req.query.title as string) || (req.headers['x-armor-title'] as string) || (req.headers['x-cosu-title'] as string) || 'Audio_Seed';
    let title = 'Audio_Seed';
    try {
      title = decodeURIComponent(rawTitle);
    } catch (_) {
      title = rawTitle;
    }
    const rawFormat = ((req.query.format as string) || (req.headers['x-armor-format'] as string) || 'wav').toLowerCase();
    const format: ArmorFormatType = rawFormat === 'mp3' ? 'mp3' : rawFormat === 'ogg' ? 'ogg' : 'wav';

    const result = await runArmorFFmpeg(audioBuffer, {
      preset,
      mode,
      startTime,
      duration,
      title,
      format,
    });

    const safeAsciiFilename = (result.filename || 'Armor_Audio.wav').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const encodedFilename = encodeURIComponent(result.filename || safeAsciiFilename);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('X-Armor-Filename', safeAsciiFilename);
    res.setHeader('X-Armor-Preset', preset);
    res.setHeader('X-Armor-Format', format);
    res.send(result.buffer);
  } catch (error: any) {
    console.error('Armor Processor Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses audio dengan Armor Engine.' });
  }
};

app.post('/api/armor/process', express.raw({ type: () => true, limit: '200mb' }), handleArmorProcess);
app.post('/api/armor/process-cosu', express.raw({ type: () => true, limit: '200mb' }), handleArmorProcess);

// Fast Preview Endpoint (15-25s Slice) for Instant In-Browser Listening
const handleArmorPreview = async (req: express.Request, res: express.Response) => {
  try {
    const audioBuffer = await getRequestAudioBuffer(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio kosong.' });
      return;
    }

    const rawPreset = (req.query.preset as string) || (req.headers['x-armor-preset'] as string) || 'vocal_armor';
    const preset = normalizeArmorPreset(rawPreset);
    const startTime = parseFloat((req.query.startTime as string) || '0');
    const duration = Math.min(30, parseFloat((req.query.duration as string) || '20'));
    const rawFormat = ((req.query.format as string) || (req.headers['x-armor-format'] as string) || 'mp3').toLowerCase();
    const format: ArmorFormatType = rawFormat === 'ogg' ? 'ogg' : rawFormat === 'wav' ? 'wav' : 'mp3';

    const result = await runArmorFFmpeg(audioBuffer, {
      preset,
      mode: 'slice',
      startTime,
      duration,
      title: 'Armor_Preview',
      format,
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (error: any) {
    console.error('Armor Preview Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memutar preview Armor.' });
  }
};

app.post('/api/armor/preview', express.raw({ type: '*/*', limit: '200mb' }), handleArmorPreview);
app.post('/api/armor/preview-cosu', express.raw({ type: '*/*', limit: '200mb' }), handleArmorPreview);

// Endpoint 1: Parse and preview Suno song details
app.post('/api/suno/parse', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ error: 'URL Suno wajib diisi.' });
      return;
    }

    const songId = await resolveSunoSongId(url);
    const metadata = await fetchSunoMetadata(songId);

    res.json({
      success: true,
      metadata,
    });
  } catch (error: any) {
    console.error('Suno Parse Error:', error);
    res.status(500).json({
      error: error.message || 'Gagal membedah tautan Suno.',
    });
  }
});

// Endpoint 2: Stream and download audio with format selection & browser Range request support
app.get('/api/suno/download', async (req, res) => {
  try {
    const songId = (req.query.id as string) || '';
    const format = ((req.query.format as string) || 'mp3').toLowerCase() as 'mp3' | 'm4a' | 'ogg';
    const rawTitle = (req.query.title as string) || 'Suno_Track';
    const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_\-]/g, '_');

    if (!songId || !UUID_RE.test(songId)) {
      res.status(400).send('ID lagu Suno tidak valid.');
      return;
    }

    const audioInfo = await fetchSunoAudioStream(songId);
    let outputBuffer: Buffer;
    let contentType = 'audio/mpeg';
    let fileExt = 'mp3';

    if (format === 'ogg') {
      contentType = 'audio/ogg';
      fileExt = 'ogg';
      const cached = audioStreamCache.get(songId);
      if (cached?.ogg) {
        outputBuffer = cached.ogg;
      } else {
        outputBuffer = await transcodeAudio(audioInfo.buffer, 'ogg');
        if (cached) cached.ogg = outputBuffer;
      }
    } else if (format === 'm4a') {
      contentType = 'audio/mp4';
      fileExt = 'm4a';
      if (audioInfo.format === 'm4a') {
        outputBuffer = audioInfo.buffer;
      } else {
        const cached = audioStreamCache.get(songId);
        if (cached?.m4a) {
          outputBuffer = cached.m4a;
        } else {
          outputBuffer = await transcodeAudio(audioInfo.buffer, 'm4a');
          if (cached) cached.m4a = outputBuffer;
        }
      }
    } else {
      // mp3
      contentType = 'audio/mpeg';
      fileExt = 'mp3';
      if (audioInfo.format === 'mp3') {
        outputBuffer = audioInfo.buffer;
      } else {
        const cached = audioStreamCache.get(songId);
        if (cached?.mp3) {
          outputBuffer = cached.mp3;
        } else {
          outputBuffer = await transcodeAudio(audioInfo.buffer, 'mp3');
          if (cached) cached.mp3 = outputBuffer;
        }
      }
    }

    const totalLength = outputBuffer.length;
    const range = req.headers.range;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}.${fileExt}"`);

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (start >= totalLength || end >= totalLength) {
        res.status(416).setHeader('Content-Range', `bytes */${totalLength}`).end();
        return;
      }

      const chunk = outputBuffer.subarray(start, end + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${totalLength}`);
      res.setHeader('Content-Length', chunk.length);
      res.send(chunk);
    } else {
      res.setHeader('Content-Length', totalLength);
      res.send(outputBuffer);
    }
  } catch (error: any) {
    console.error('Suno Audio Download Error:', error);
    res.status(500).send(`Gagal mendownload audio Suno: ${error.message}`);
  }
});

// Vite middleware in dev or static serve in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Beesuno Server running on http://0.0.0.0:${port}`);
  });
}

// Global safety process handlers to prevent process termination
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
