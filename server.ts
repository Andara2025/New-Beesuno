import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

dotenv.config({ quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = import.meta.dirname || path.dirname(__filename);

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
    'Content-Disposition, Content-Length, X-Armor-Filename, X-Armor-Preset, X-Armor-Format, X-Armor-Download-Id'
  );
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Lazy-initialize GoogleGenAI server-side with telemetry header
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || 'missing-api-key',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

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

    const ai = getAiClient();
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

// In-memory cache for audio streams (TTL 15 mins) to prevent duplicate decryption/transcoding
interface CachedAudio {
  raw: Buffer;
  rawFormat: 'mp3' | 'm4a' | 'wav';
  mp3?: Buffer;
  ogg?: Buffer;
  m4a?: Buffer;
  timestamp: number;
}
interface CachedDownloadFile {
  buffer: Buffer;
  contentType: string;
  filename: string;
  timestamp: number;
}
const audioStreamCache = new Map<string, CachedAudio>();
const metadataCache = new Map<string, any>();
const shareTokenCache = new Map<string, string>();
const inFlightAudioStreams = new Map<string, Promise<{ buffer: Buffer; format: 'mp3' | 'm4a' | 'wav' }>>();
const downloadFileCache = new Map<string, CachedDownloadFile>();

function cacheDownloadableAudio(buffer: Buffer, contentType: string, filename: string): string {
  const id = crypto.randomUUID();
  downloadFileCache.set(id, {
    buffer,
    contentType,
    filename,
    timestamp: Date.now(),
  });
  return id;
}

function cleanAudioCache() {
  const now = Date.now();
  for (const [key, val] of audioStreamCache.entries()) {
    if (now - val.timestamp > 15 * 60 * 1000) {
      audioStreamCache.delete(key);
    }
  }
  for (const [key, val] of downloadFileCache.entries()) {
    if (now - val.timestamp > 20 * 60 * 1000) {
      downloadFileCache.delete(key);
    }
  }
}
const cacheCleanerTimer = setInterval(cleanAudioCache, 5 * 60 * 1000);
cacheCleanerTimer.unref();

function isValidUnencryptedAudioBuffer(buf: Buffer): 'mp3' | 'm4a' | 'wav' | 'ogg' | null {
  if (!buf || buf.length < 5000) return null;

  // Check M4A / MP4 ('ftyp' at byte offset 4..8)
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    return 'm4a';
  }

  // Check MP3 ('ID3' header or MPEG frame sync 0xFF 0xE0+)
  if (
    buf.subarray(0, 3).toString('ascii') === 'ID3' ||
    (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)
  ) {
    return 'mp3';
  }

  // Check WAV ('RIFF'....'WAVE')
  if (
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WAVE'
  ) {
    return 'wav';
  }

  // Check OGG ('OggS')
  if (buf.subarray(0, 4).toString('ascii') === 'OggS') {
    return 'ogg';
  }

  return null;
}

function extractPreferredSunoUuid(text: string): string | null {
  if (!text) return null;
  const patterns = [
    /\/song\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /\/clip\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /image_(?:large_)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /\\?"id\\?"\s*:\s*\\?"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\\?"/i,
    UUID_RE,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const candidate = m[1] || m[0];
      if (candidate && candidate !== '00000000-0000-0000-0000-000000000000') {
        return candidate;
      }
    }
  }
  return null;
}

function extractShareTokenFromUrl(text: string): string | null {
  if (!text) return null;
  const shParam = text.match(/[?&]sh=([a-zA-Z0-9_-]{6,32})/i);
  if (shParam) return shParam[1];
  const shortPath = text.match(/\/s\/([a-zA-Z0-9_-]{6,32})/i);
  if (shortPath) return shortPath[1];
  return null;
}

async function resolveSunoSongId(rawUrl: string): Promise<string> {
  const trimmed = rawUrl.trim();
  const initialSh = extractShareTokenFromUrl(trimmed);

  // Direct UUID match in the string (e.g., https://suno.com/song/<uuid>?sh=...)
  const directUuid = extractPreferredSunoUuid(trimmed);
  if (directUuid) {
    if (initialSh) shareTokenCache.set(directUuid, initialSh);
    return directUuid;
  }

  // Extract clean URL even if pasted without https:// or embedded inside share message text
  let targetUrl = trimmed;
  const fullUrlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  const bareDomainMatch = trimmed.match(/(?:www\.|app\.)?suno\.(?:com|ai)\/[^\s"'<>]+/i);
  const bareShortPathMatch = trimmed.match(/^\/?s\/([a-zA-Z0-9_-]{6,32})$/i);
  const bareShortCodeMatch = trimmed.match(/^[a-zA-Z0-9_-]{8,24}$/);

  if (fullUrlMatch) {
    targetUrl = fullUrlMatch[0];
  } else if (bareDomainMatch) {
    targetUrl = `https://${bareDomainMatch[0]}`;
  } else if (bareShortPathMatch) {
    targetUrl = `https://suno.com/s/${bareShortPathMatch[1]}`;
  } else if (bareShortCodeMatch) {
    targetUrl = `https://suno.com/s/${bareShortCodeMatch[0]}`;
  } else if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  // Strip trailing punctuation often included when copying share messages
  targetUrl = targetUrl.replace(/[.,;!?)+'"\]>]+$/, '');
  const detectedSh = extractShareTokenFromUrl(targetUrl) || initialSh;

  // Step 1: Handle /s/ shortlinks by following redirects hop-by-hop (up to 5 hops)
  if (targetUrl.includes('/s/')) {
    try {
      let currentHopUrl = targetUrl;
      for (let hop = 0; hop < 5; hop++) {
        const res = await fetch(currentHopUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        const loc = res.headers.get('location');
        if (!loc) break;

        const nextUrl = loc.startsWith('http') ? loc : new URL(loc, currentHopUrl).toString();
        const hopSh = extractShareTokenFromUrl(nextUrl) || detectedSh;
        const hopUuid = extractPreferredSunoUuid(nextUrl);
        if (hopUuid) {
          if (hopSh) shareTokenCache.set(hopUuid, hopSh);
          return hopUuid;
        }
        currentHopUrl = nextUrl;
      }
    } catch (e) {
      console.warn('Shortlink redirect lookup warning:', e);
    }
  }

  // Step 2: Fallback: fetch page (following redirects) and check final URL or HTML for song UUID
  try {
    const res = await fetch(targetUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const finalSh = extractShareTokenFromUrl(res.url || '') || detectedSh;
    if (res.url) {
      const urlUuid = extractPreferredSunoUuid(res.url);
      if (urlUuid) {
        if (finalSh) shareTokenCache.set(urlUuid, finalSh);
        return urlUuid;
      }
    }
    const html = await res.text();
    const htmlUuid = extractPreferredSunoUuid(html);
    if (htmlUuid) {
      if (finalSh) shareTokenCache.set(htmlUuid, finalSh);
      return htmlUuid;
    }
  } catch (e) {
    console.warn('Page fetch lookup warning:', e);
  }

  throw new Error('Tidak dapat menemukan ID lagu Suno dari tautan yang diberikan. Pastikan tautan share Suno lengkap dan benar.');
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
  const mediaUrls: string[] = [];
  const shToken = shareTokenCache.get(songId) || '';

  const isUsableMediaUrl = (u: unknown): u is string =>
    typeof u === 'string' &&
    u.startsWith('http') &&
    !u.includes('/api/forbidden') &&
    !u.includes('forbidden');

  // Primary: Official Suno Studio Clip API
  const apiUrls = [
    `https://studio-api.prod.suno.com/api/clip/${songId}`,
    `https://studio-api-prod.suno.com/api/clip/${songId}`,
  ];

  for (const apiUrl of apiUrls) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Accept: 'application/json',
          Origin: 'https://suno.com',
          Referer: `https://suno.com/song/${songId}${shToken ? `?sh=${shToken}` : ''}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && (data.title || data.id)) {
          title = data.title || title;
          artist = data.display_name || data.handle || artist;
          imageUrl = data.image_large_url || data.image_url || imageUrl;
          model = data.major_model_version || model;
          if (isUsableMediaUrl(data.audio_url)) audioUrl = data.audio_url;
          if (isUsableMediaUrl(data.video_url)) videoUrl = data.video_url;
          if (Array.isArray(data.media_urls)) {
            for (const item of data.media_urls) {
              if (item && isUsableMediaUrl(item.url) && !mediaUrls.includes(item.url)) {
                mediaUrls.push(item.url);
              }
            }
          }
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
            mediaUrls,
            shortlink: `https://suno.com/song/${songId}${shToken ? `?sh=${shToken}` : ''}`,
          };
          metadataCache.set(songId, meta);
          return meta;
        }
      }
    } catch (err) {
      console.warn(`Suno clip API error on ${apiUrl}:`, err);
    }
  }

  // Fallback: Scrape Suno web page (including ?sh= share token for unlisted/link-only songs)
  try {
    const pageUrl = `https://suno.com/song/${songId}${shToken ? `?sh=${shToken}` : ''}`;
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

    // CloudFront media_urls in HTML flight data
    const cfMatch = html.match(/https:\/\/[a-z0-9]+\.cloudfront\.net\/[^\s"\\<>]+\.m4a/gi);
    if (cfMatch) {
      for (const u of cfMatch) {
        const cleanU = u.replace(/\\u0026/g, '&');
        if (isUsableMediaUrl(cleanU) && !mediaUrls.includes(cleanU)) {
          mediaUrls.push(cleanU);
        }
      }
    }

    // Audio/Video URLs in HTML flight data
    const audioUrlMatch = html.match(/\\?"audio_url\\?":\s*\\?"([^"\\]+)\\?"/i) || html.match(/"audio_url":"([^"]+)"/i);
    if (audioUrlMatch) {
      const candidateAudio = audioUrlMatch[1].replace(/\\u0026/g, '&');
      if (isUsableMediaUrl(candidateAudio)) audioUrl = candidateAudio;
    }
    const videoUrlMatch = html.match(/\\?"video_url\\?":\s*\\?"([^"\\]+)\\?"/i) || html.match(/"video_url":"([^"]+)"/i);
    if (videoUrlMatch) {
      const candidateVideo = videoUrlMatch[1].replace(/\\u0026/g, '&');
      if (isUsableMediaUrl(candidateVideo)) videoUrl = candidateVideo;
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
    mediaUrls,
    shortlink: `https://suno.com/song/${songId}${shToken ? `?sh=${shToken}` : ''}`,
  };
  metadataCache.set(songId, resultMeta);
  return resultMeta;
}

// Decryptor for DRM-encrypted clips (Mango license protocol + CloudFront AES-128-CTR stream)
async function decryptSunoAudioStream(songId: string): Promise<Buffer> {
  const shToken = shareTokenCache.get(songId) || '';
  const refererUrl = `https://suno.com/song/${songId}${shToken ? `?sh=${shToken}` : ''}`;
  const rightsEndpoints = [
    'https://studio-api.prod.suno.com/api/mango/rights',
    'https://studio-api-prod.suno.com/api/mango/rights',
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
          Referer: refererUrl,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

  // Ensure metadata is available so we have any custom CloudFront media_urls
  let meta = metadataCache.get(songId);
  if (!meta) {
    try {
      meta = await fetchSunoMetadata(songId);
    } catch (_) {}
  }

  const streamUrls: string[] = [];
  if (meta?.mediaUrls && Array.isArray(meta.mediaUrls)) {
    for (const u of meta.mediaUrls) {
      if (typeof u === 'string' && u.startsWith('http') && !streamUrls.includes(u)) {
        streamUrls.push(u);
      }
    }
  }
  const defaultCfUrl = `https://d2lwuy8qc234o3.cloudfront.net/1/clip/${songId}.m4a`;
  if (!streamUrls.includes(defaultCfUrl)) {
    streamUrls.push(defaultCfUrl);
  }

  let encArrayBuf: ArrayBuffer | null = null;
  let lastStreamStatus = 0;

  for (const audioUrl of streamUrls) {
    try {
      const audioRes = await fetch(audioUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://suno.com/',
        },
      });
      lastStreamStatus = audioRes.status;
      if (audioRes.ok) {
        encArrayBuf = await audioRes.arrayBuffer();
        break;
      }
    } catch (_) {}
  }

  if (!encArrayBuf) {
    throw new Error(`Gagal mengunduh audio terenkripsi CloudFront (HTTP ${lastStreamStatus})`);
  }

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

// Multi-Source Audio Downloader with In-Flight Promise Deduplication
async function fetchSunoAudioStream(songId: string): Promise<{ buffer: Buffer; format: 'mp3' | 'm4a' | 'wav' }> {
  // 1. Check in-memory cache (verify cached buffer is genuine unencrypted audio)
  const cached = audioStreamCache.get(songId);
  if (cached && cached.raw && isValidUnencryptedAudioBuffer(cached.raw)) {
    return { buffer: cached.raw, format: cached.rawFormat };
  }

  // 2. Deduplicate concurrent requests for the same songId
  const existingInFlight = inFlightAudioStreams.get(songId);
  if (existingInFlight) {
    return existingInFlight;
  }

  const streamPromise = (async (): Promise<{ buffer: Buffer; format: 'mp3' | 'm4a' | 'wav' }> => {
    // Try Mango DRM Decryption first (Standard for Suno v4/v5/v6 tracks)
    try {
      const decryptedM4a = await decryptSunoAudioStream(songId);
      if (decryptedM4a && isValidUnencryptedAudioBuffer(decryptedM4a)) {
        audioStreamCache.set(songId, {
          raw: decryptedM4a,
          rawFormat: 'm4a',
          timestamp: Date.now(),
        });
        return { buffer: decryptedM4a, format: 'm4a' };
      }
    } catch (err: any) {
      console.warn(`Mango DRM decryption notice for ${songId}:`, err?.message);
    }

    // Fallback: Try direct public CDN endpoints (for older v3/v3.5 tracks) with strict magic-byte verification
    let meta = metadataCache.get(songId);
    if (!meta) {
      try {
        meta = await fetchSunoMetadata(songId);
      } catch (_) {}
    }
    const candidates: string[] = [];
    if (meta?.audioUrl && !meta.audioUrl.includes('forbidden')) {
      candidates.push(meta.audioUrl);
    }
    candidates.push(
      `https://cdn1.suno.ai/${songId}.mp3`,
      `https://cdn2.suno.ai/${songId}.mp3`,
      `https://audiocdn.suno.ai/${songId}.mp3`,
      `https://cdn.suno.ai/${songId}.mp3`
    );
    if (meta?.videoUrl && !meta.videoUrl.includes('forbidden')) {
      candidates.push(meta.videoUrl);
    }

    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://suno.com/',
            Accept: '*/*',
          },
        });

        if (res.ok) {
          const ab = await res.arrayBuffer();
          const buf = Buffer.from(ab);
          const detectedFormat = isValidUnencryptedAudioBuffer(buf);
          if (detectedFormat) {
            const format: 'mp3' | 'm4a' | 'wav' =
              detectedFormat === 'm4a' ? 'm4a' : detectedFormat === 'wav' ? 'wav' : 'mp3';
            audioStreamCache.set(songId, {
              raw: buf,
              rawFormat: format,
              ...(format === 'mp3' ? { mp3: buf } : {}),
              timestamp: Date.now(),
            });
            return { buffer: buf, format };
          }
        }
      } catch {
        // Continue to next candidate
      }
    }

    throw new Error(
      `Tidak dapat mengunduh berkas audio dari CDN Suno untuk ID "${songId}". Pastikan lagu ini publik atau memiliki tautan share yang aktif.`
    );
  })();

  inFlightAudioStreams.set(songId, streamPromise);
  try {
    return await streamPromise;
  } finally {
    inFlightAudioStreams.delete(songId);
  }
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
        '-vn',
        '-map_metadata', '-1',
        '-ar', '44100',
        '-ac', '2',
        '-c:a', 'libvorbis',
        '-q:a', '4', // True VBR quality 4 (nominal 128kbps, writes bitrate_max=0, bitrate_min=0 matching audio_sukses)
        '-f', 'ogg',
        'pipe:1',
      ];
    } else if (targetFormat === 'm4a') {
      args = [
        '-i', 'pipe:0',
        '-vn',
        '-map_metadata', '-1',
        '-ar', '44100',
        '-ac', '2',
        '-c:a', 'aac',
        '-b:a', '256k',
        '-movflags', 'frag_keyframe+empty_moov',
        '-f', 'mp4',
        'pipe:1',
      ];
    } else {
      // High-definition 320kbps MP3 with discrete stereo (-joint_stereo 0 prevents M/S mono zeroing)
      args = [
        '-i', 'pipe:0',
        '-vn',
        '-map_metadata', '-1',
        '-ar', '44100',
        '-ac', '2',
        '-c:a', 'libmp3lame',
        '-b:a', '320k',
        '-joint_stereo', '0',
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
// AUDIO ARMOR ENGINE — CoSuProcessor Reference Implementation
// ==========================================
export type CanonicalArmorPreset = 'vocal_armor' | 'pulse_armor' | 'warm_armor' | 'tempo_armor';
export type CoSuPresetKey = 'original' | 'staccato' | 'slow_tempo' | 'tempo_flex';
export type ArmorFormatType = 'wav' | 'ogg' | 'mp3';

interface ArmorOptions {
  preset: CanonicalArmorPreset;
  mode: 'slice' | 'full';
  startTime: number;
  duration: number;
  title?: string;
  format?: ArmorFormatType;
  tempoShift?: number;
  stereoBoost?: boolean;
}

export interface AudioMetadataInfo {
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
  title: string;
  artist: string;
  format: string;
  sizeBytes: number;
}

function normalizeArmorPreset(rawPreset: string | undefined | null): CanonicalArmorPreset {
  if (!rawPreset) return 'vocal_armor';
  const p = String(rawPreset).toLowerCase().trim();
  if (
    p === 'tempo_armor' ||
    p === 'tempo_flex' ||
    p === 'slowest' ||
    p === 'slowest_tempo' ||
    p === 'custom_tempo'
  ) {
    return 'tempo_armor';
  }
  if (
    p === 'pulse_armor' ||
    p === 'pulse' ||
    p === 'rhythmic_chop'
  ) {
    return 'pulse_armor';
  }
  if (
    p === 'warm_armor' ||
    p === 'staccato' ||
    p === 'staccato_guide' ||
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

function toCoSuPresetKey(rawPreset: string | undefined | null): CoSuPresetKey {
  const canonical = normalizeArmorPreset(rawPreset);
  if (canonical === 'tempo_armor') return 'tempo_flex';
  if (canonical === 'warm_armor') return 'staccato';
  if (canonical === 'pulse_armor') return 'slow_tempo';
  return 'original';
}

class CoSuProcessor {
  public ffmpegPath: string;
  public ffprobePath: string;

  constructor() {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const ffmpegBin = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    const ffprobeBin = isWin ? 'ffprobe.exe' : 'ffprobe';

    this.ffmpegPath = this.resolveBinary(ffmpegBin, isMac ? 'mac' : '');
    this.ffprobePath = this.resolveBinary(ffprobeBin, isMac ? 'mac' : '');
  }

  ensureExecutable(filePath: string): string {
    if (process.platform !== 'win32' && filePath && fs.existsSync(filePath)) {
      try {
        fs.chmodSync(filePath, 0o755);
      } catch (_) {}
    }
    return filePath;
  }

  resolveBinary(binaryName: string, subFolder: string = ''): string {
    const isMac = process.platform === 'darwin';
    const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;

    if (isMac && binaryName === 'ffmpeg') {
      const isArm = process.arch === 'arm64';
      const archName = isArm ? 'ffmpeg-arm64' : 'ffmpeg-x64';

      if (resourcesPath) {
        const packagedArch = path.join(resourcesPath, 'bin', subFolder, archName);
        if (fs.existsSync(packagedArch)) return this.ensureExecutable(packagedArch);
      }
      const localArch = path.resolve(__dirname, '..', 'bin', subFolder, archName);
      if (fs.existsSync(localArch)) return this.ensureExecutable(localArch);
    }

    if (resourcesPath) {
      if (subFolder) {
        const packagedSubPath = path.join(resourcesPath, 'bin', subFolder, binaryName);
        if (fs.existsSync(packagedSubPath)) return this.ensureExecutable(packagedSubPath);
      }
      const packagedPath = path.join(resourcesPath, 'bin', binaryName);
      if (fs.existsSync(packagedPath)) return this.ensureExecutable(packagedPath);
    }

    if (subFolder) {
      const localSubBin = path.resolve(__dirname, '..', 'bin', subFolder, binaryName);
      if (fs.existsSync(localSubBin)) return this.ensureExecutable(localSubBin);
    }

    if (process.platform === 'darwin') {
      const macPaths = [
        `/opt/homebrew/bin/${binaryName}`,
        `/usr/local/bin/${binaryName}`,
        `/usr/bin/${binaryName}`,
      ];
      for (const p of macPaths) {
        if (fs.existsSync(p)) return p;
      }
    }

    const localBin = path.resolve(__dirname, '..', 'bin', binaryName);
    if (fs.existsSync(localBin)) return this.ensureExecutable(localBin);

    return binaryName;
  }

  /**
   * Mengambil durasi dan metadata audio menggunakan ffprobe
   */
  async getMetadata(filePath: string): Promise<AudioMetadataInfo> {
    if (process.platform === 'darwin' && process.arch === 'arm64') {
      const isSystemProbe =
        this.ffprobePath.startsWith('/opt/homebrew') || this.ffprobePath.startsWith('/usr/local');
      if (!isSystemProbe) {
        try {
          return await this.getMetadataViaFfmpeg(filePath);
        } catch (_) {}
      }
    }

    return new Promise((resolve, reject) => {
      const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath];

      const probe = spawn(this.ffprobePath, args);
      let stdout = '';
      let stderr = '';

      probe.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      probe.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      probe.on('close', async (code) => {
        if (code !== 0) {
          try {
            const fbData = await this.getMetadataViaFfmpeg(filePath);
            return resolve(fbData);
          } catch (fbErr: any) {
            return reject(new Error(`ffprobe gagal membaca file: ${stderr} (${fbErr.message})`));
          }
        }
        try {
          const data = JSON.parse(stdout);
          const duration = parseFloat(data.format?.duration || 0);
          const audioStream = (data.streams || []).find((s: any) => s.codec_type === 'audio');

          resolve({
            duration,
            sampleRate: audioStream ? parseInt(audioStream.sample_rate, 10) : 44100,
            channels: audioStream ? audioStream.channels : 2,
            bitrate: data.format?.bit_rate ? Math.round(parseInt(data.format.bit_rate, 10) / 1000) : 320,
            title: data.format?.tags?.title || path.basename(filePath, path.extname(filePath)),
            artist: data.format?.tags?.artist || 'Unknown Artist',
            format: path.extname(filePath).replace('.', '').toUpperCase(),
            sizeBytes: parseInt(data.format?.size || 0, 10),
          });
        } catch (err: any) {
          try {
            const fbData = await this.getMetadataViaFfmpeg(filePath);
            resolve(fbData);
          } catch (_) {
            reject(new Error(`Gagal mem-parsing metadata audio: ${err.message}`));
          }
        }
      });

      probe.on('error', async () => {
        try {
          const fbData = await this.getMetadataViaFfmpeg(filePath);
          resolve(fbData);
        } catch (fbErr) {
          reject(fbErr);
        }
      });
    });
  }

  /**
   * Fallback native parser metadata menggunakan ffmpeg -i langsung
   */
  async getMetadataViaFfmpeg(filePath: string): Promise<AudioMetadataInfo> {
    return new Promise((resolve, reject) => {
      const args = ['-i', filePath];
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';
      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });
      proc.on('close', () => {
        const durMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
        const brMatch = stderr.match(/bitrate:\s*(\d+)\s*kb\/s/i);
        const srMatch = stderr.match(/(\d+)\s*Hz/i);
        const isMono = /\bmono\b/i.test(stderr) && !/\bstereo\b/i.test(stderr);
        if (durMatch) {
          const hours = parseFloat(durMatch[1]);
          const mins = parseFloat(durMatch[2]);
          const secs = parseFloat(durMatch[3]);
          const duration = hours * 3600 + mins * 60 + secs;
          const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 0 };
          return resolve({
            duration,
            sampleRate: srMatch ? parseInt(srMatch[1], 10) : 44100,
            channels: isMono ? 1 : 2,
            bitrate: brMatch ? parseInt(brMatch[1], 10) : 320,
            title: path.basename(filePath, path.extname(filePath)),
            artist: 'Unknown Artist',
            format: path.extname(filePath).replace('.', '').toUpperCase(),
            sizeBytes: stats.size,
          });
        }
        reject(new Error('Gagal mendeteksi durasi audio via FFmpeg fallback'));
      });
      proc.on('error', (err) => reject(err));
    });
  }

  /**
   * Mengambil string filter DSP FFmpeg berdasarkan preset
   * Menggunakan formula native core FFmpeg (aresample pre-normalization + asetrate + aformat + atempo)
   * Jika stereoBoost = true (untuk input Mono, Dual-Mono, atau Vokal Tengah Tipis),
   * menyuntikkan Pre-Stereoizer Haas 11ms asimetris sebelum pencabutan fase tengah (c0-c1).
   */
  getDspFilter(
    preset: string = 'original',
    tempoShiftPercent: number = -12,
    stereoBoost: boolean = false,
    isMonoInput: boolean = false
  ): string {
    const p = (preset || 'original').toLowerCase().trim();
    const stereoPreConditioner = isMonoInput
      ? 'aformat=channel_layouts=stereo,pan=stereo|c0=0.62*c0|c1=0.38*c1,equalizer=f=1150:t=q:w=1.1:g=-12,equalizer=f=2450:t=q:w=1.1:g=-12,'
      : stereoBoost
      ? 'equalizer=f=1150:t=q:w=1.1:g=-11,equalizer=f=2450:t=q:w=1.1:g=-11,'
      : '';
    const pitchShiftCore =
      'aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.122462';
    // 16-bit triangular dither + 0.95 limiter matches manual converter output (audio_sukses) while keeping 100% symmetric phase cancellation
    const postConditioner =
      'alimiter=limit=0.95:level=disabled:attack=5:release=50,aresample=44100:dither_method=triangular,aformat=sample_fmts=s16';

    if (
      p === 'tempo_armor' ||
      p === 'tempo_flex' ||
      p === 'slowest' ||
      p === 'slowest_tempo' ||
      p === 'custom_tempo'
    ) {
      // ⏱️ Tempo Armor (Vocal-Forward 42%..22% Continuous Guide + 150Hz Warm Body + Vocal Presence EQ + Flexible Tempo Shift)
      const clampedShift = Math.max(
        -30,
        Math.min(30, Number.isFinite(tempoShiftPercent) ? tempoShiftPercent : -12)
      );
      const tempoMultiplier = 1 + clampedShift / 100;
      const atempoVal = Math.max(0.5, Math.min(2.0, 1.122462 * tempoMultiplier)).toFixed(6);
      const flexPitchTempoCore = `aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=${atempoVal}`;
      return `${stereoPreConditioner}aeval=exprs='val(0)-if(lt(mod(t\\,2.8)\\,1.75)\\,0.58\\,if(lt(mod(t\\,2.8)\\,1.80)\\,0.58+0.20*(mod(t\\,2.8)-1.75)/0.05\\,if(gt(mod(t\\,2.8)\\,2.75)\\,0.78-0.20*(mod(t\\,2.8)-2.75)/0.05\\,0.78)))*val(1)|val(1)-if(lt(mod(t\\,2.8)\\,1.75)\\,0.58\\,if(lt(mod(t\\,2.8)\\,1.80)\\,0.58+0.20*(mod(t\\,2.8)-1.75)/0.05\\,if(gt(mod(t\\,2.8)\\,2.75)\\,0.78-0.20*(mod(t\\,2.8)-2.75)/0.05\\,0.78)))*val(0)':c=stereo,highpass=f=150,equalizer=f=1350:t=q:w=1.1:g=2.8,equalizer=f=2600:t=q:w=1.0:g=4.2,${flexPitchTempoCore},volume=1.75,${postConditioner}`;
    }

    if (p === 'pulse_armor' || p === 'pulse' || p === 'rhythmic_chop' || p === 'slow_tempo') {
      // ⚡ Pulse Armor (5.5Hz Tremolo Pulse + Bass +3dB + Notch 1800Hz + Transpose -2st + Tempo +5%)
      return `${stereoPreConditioner}pan=stereo|c0=c0-c1|c1=c0-c1,highpass=f=160,bass=g=3.0:f=180,equalizer=f=1800:t=q:w=1.2:g=-11,tremolo=f=5.5:d=0.88,aformat=channel_layouts=stereo,aresample=44100,asetrate=44100*0.8908987,aresample=44100,atempo=1.178585,volume=2.2,${postConditioner}`;
    }

    if (p === 'warm_armor' || p === 'staccato' || p === 'staccato_guide' || p === 'slow_ballad' || p === 'ballad') {
      // 🌙 Warm Armor (Smooth 3.0s ~22% Vocal Guide with 50ms ramp + Highpass 250Hz + Transpose -2st)
      return `${stereoPreConditioner}aeval=exprs='val(0)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(1)|val(1)-if(lt(mod(t\\,3.0)\\,1.35)\\,0.78\\,if(lt(mod(t\\,3.0)\\,1.40)\\,0.78+0.22*(mod(t\\,3.0)-1.35)/0.05\\,if(gt(mod(t\\,3.0)\\,2.95)\\,1.0-0.22*(mod(t\\,3.0)-2.95)/0.05\\,1.0)))*val(0)':c=stereo,highpass=f=250,${pitchShiftCore},volume=1.6,${postConditioner}`;
    }

    // 🛡️ Vocal Armor / Original Pure SideHarmoni (Default)
    return `${stereoPreConditioner}pan=stereo|c0=c0-c1|c1=c1-c0,highpass=f=250,${pitchShiftCore},volume=1.6,${postConditioner}`;
  }

  generateDefaultOutputPath(
    inputPath: string,
    options: { preset?: string; isFull?: boolean; duration?: number; format?: ArmorFormatType; title?: string } = {}
  ): string {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const rawBase = options.title || path.basename(inputPath, ext);
    const base = (rawBase || 'Audio')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_+/g, '_');

    const canonical = normalizeArmorPreset(options.preset);
    const presetSuffix =
      canonical === 'tempo_armor'
        ? '_TempoArmor'
        : canonical === 'warm_armor'
        ? '_WarmArmor'
        : canonical === 'pulse_armor'
        ? '_PulseArmor'
        : '_VocalArmor';

    const outExt = options.format === 'wav' ? 'wav' : options.format === 'ogg' ? 'ogg' : 'mp3';
    if (options.isFull) {
      return path.join(dir, `${base}${presetSuffix}_Full.${outExt}`);
    }
    const durLabel = options.duration ? `${Math.round(options.duration)}s` : '60s';
    return path.join(dir, `${base}${presetSuffix}_${durLabel}.${outExt}`);
  }

  private runFfmpegStep(args: string[], onStderr?: (chunk: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.ffmpegPath, args);
      let stderr = '';
      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch (_) {}
        reject(new Error('FFmpeg execution timed out (240s).'));
      }, 240000);

      proc.stderr.on('data', (d) => {
        const s = d.toString();
        stderr += s;
        if (onStderr) onStderr(s);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg gagal (code ${code}): ${stderr.slice(-400)}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /**
   * Merender Side-Harmonic Stealth Cloak dengan 16-bit TPDF Dither & VBR Conditioning
   */
  async exportStealthSeed(
    inputPath: string,
    options: {
      mode?: 'slice' | 'full';
      startTime?: number;
      duration?: number;
      outputPath?: string;
      preset?: string;
      format?: ArmorFormatType;
      title?: string;
      tempoShift?: number;
      stereoBoost?: boolean;
      isMonoInput?: boolean;
    } = {},
    onProgress?: ((info: { stage: string; message: string }) => void) | null
  ) {
    const isFull = options.mode === 'full';
    const startTime = Math.max(0, parseFloat(String(options.startTime || 0)));
    const duration = parseFloat(String(options.duration || 60.0));
    const canonicalPreset = normalizeArmorPreset(options.preset || 'original');
    const tempoShift = options.tempoShift !== undefined ? Number(options.tempoShift) : -12;
    const stereoBoost = Boolean(options.stereoBoost);
    const isMonoInput = Boolean(options.isMonoInput);
    const format: ArmorFormatType =
      options.format === 'wav' ? 'wav' : options.format === 'ogg' ? 'ogg' : 'mp3';
    const outputPath =
      options.outputPath ||
      this.generateDefaultOutputPath(inputPath, {
        preset: canonicalPreset,
        isFull,
        duration,
        format,
        title: options.title,
      });

    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const dspFilter = this.getDspFilter(canonicalPreset, tempoShift, stereoBoost, isMonoInput);
    const modeLabel =
      canonicalPreset === 'tempo_armor'
        ? 'Tempo Armor'
        : canonicalPreset === 'warm_armor'
        ? 'Warm Armor'
        : canonicalPreset === 'pulse_armor'
        ? 'Pulse Armor'
        : 'Vocal Armor';

    try {
      const args = ['-y'];
      if (!isFull) {
        args.push('-ss', startTime.toFixed(3), '-t', duration.toFixed(3));
      }
      args.push(
        '-i',
        inputPath,
        '-vn',
        '-af',
        dspFilter,
        '-map_metadata',
        '-1',
        '-ar',
        '44100',
        '-ac',
        '2'
      );

      if (format === 'wav') {
        args.push('-fflags', '+bitexact', '-c:a', 'pcm_s16le', '-f', 'wav', outputPath);
      } else if (format === 'ogg') {
        // True VBR -q:a 4 writes bitrate_max=0, bitrate_min=0 in Vorbis ID header (identical to audio_sukses)
        args.push('-c:a', 'libvorbis', '-q:a', '4', '-f', 'ogg', outputPath);
      } else {
        // Discrete stereo (-joint_stereo 0) + Xing header (-write_xing 1)
        args.push(
          '-c:a',
          'libmp3lame',
          '-b:a',
          '320k',
          '-joint_stereo',
          '0',
          '-write_xing',
          '1',
          '-f',
          'mp3',
          outputPath
        );
      }

      await this.runFfmpegStep(args, () => {
        if (onProgress) {
          onProgress({
            stage: 'processing',
            message: isFull
              ? `Menerapkan ${modeLabel} ke Full Lagu...`
              : `Menerapkan ${modeLabel} ${duration}s...`,
          });
        }
      });

      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 1000) {
          return {
            success: true,
            outputPath,
            filename: path.basename(outputPath),
            duration: isFull ? ('FULL' as const) : duration,
            startTime: isFull ? 0 : startTime,
            isFull,
            preset: canonicalPreset,
            presetName: modeLabel,
            sizeBytes: stats.size,
          };
        }
      }

      throw new Error('Hasil pemrosesan audio korup atau 0-byte.');
    } catch (err) {
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (_) {}
      throw err;
    }
  }

  /**
   * Merender cuplikan audio untuk preview live filter DSP (Original, Staccato Guide, atau Slow Tempo Shield)
   * Bebas memory leak & sandboxing: Mengembalikan data URI Base64 dan membersihkan file temp dari disk.
   */
  async renderPreviewFilter(
    inputPath: string,
    startTime: number = 0,
    duration: number = 15.0,
    preset: string = 'original',
    tempoShift: number = -12,
    stereoBoost: boolean = false,
    isMonoInput: boolean = false
  ): Promise<{ dataUri: string; buffer: Buffer }> {
    const tempDir = path.join(os.tmpdir(), 'resu_cosu_previews');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // 🧹 Auto-Purge: Hapus file preview lama yang berumur > 3 menit agar disk tidak penuh
    try {
      const files = fs.readdirSync(tempDir);
      const now = Date.now();
      for (const f of files) {
        if (f.startsWith('preview_') && f.endsWith('.mp3')) {
          const fp = path.join(tempDir, f);
          const st = fs.statSync(fp);
          if (now - st.mtimeMs > 3 * 60 * 1000) {
            try {
              fs.unlinkSync(fp);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}

    const tempOutput = path.join(tempDir, `preview_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.mp3`);
    const cosuPreset = toCoSuPresetKey(preset);
    const dspFilter = this.getDspFilter(cosuPreset, tempoShift, stereoBoost, isMonoInput);

    const args = [
      '-y',
      '-ss',
      Math.max(0, startTime).toFixed(3),
      '-t',
      duration.toFixed(3),
      '-i',
      inputPath,
      '-vn',
      '-af',
      dspFilter,
      '-map_metadata',
      '-1',
      '-c:a',
      'libmp3lame',
      '-b:a',
      '256k',
      tempOutput,
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(this.ffmpegPath, args);
      let stderr = '';
      ffmpeg.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempOutput)) {
          try {
            const buf = fs.readFileSync(tempOutput);
            const base64Audio = `data:audio/mp3;base64,${buf.toString('base64')}`;
            try {
              fs.unlinkSync(tempOutput);
            } catch (_) {}
            resolve({ dataUri: base64Audio, buffer: buf });
          } catch (readErr) {
            try {
              if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
            } catch (_) {}
            reject(readErr);
          }
        } else {
          try {
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
          } catch (_) {}
          reject(new Error(`Gagal merender audio preview siluman (code ${code}): ${stderr.slice(-300)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        try {
          if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        } catch (_) {}
        reject(err);
      });
    });
  }
}

const cosuProcessor = new CoSuProcessor();

async function runArmorFFmpeg(
  inputBuffer: Buffer,
  options: ArmorOptions
): Promise<{ buffer: Buffer; filename: string; mimeType: string; presetName: string }> {
  const isFull = options.mode === 'full';
  const startTime = Math.max(0, options.startTime || 0);
  const duration = Math.max(1, options.duration || 60.0);
  const preset = normalizeArmorPreset(options.preset);
  const format: ArmorFormatType =
    options.format === 'wav' ? 'wav' : options.format === 'ogg' ? 'ogg' : 'mp3';
  const mimeType =
    format === 'wav' ? 'audio/wav' : format === 'ogg' ? 'audio/ogg' : 'audio/mpeg';

  const tmpId = crypto.randomBytes(8).toString('hex');
  const tempInput = path.join(os.tmpdir(), `armor_in_${tmpId}.bin`);
  const filename = path.basename(
    cosuProcessor.generateDefaultOutputPath(tempInput, {
      preset,
      isFull,
      duration,
      format,
      title: options.title || 'Track',
    })
  );
  const tempOutput = path.join(os.tmpdir(), `armor_out_${tmpId}_${filename}`);

  await fs.promises.writeFile(tempInput, inputBuffer);

  try {
    let effectiveStereoBoost = Boolean(options.stereoBoost);
    let isMonoInput = false;
    try {
      const meta = await cosuProcessor.getMetadata(tempInput);
      if (meta.channels < 2) {
        effectiveStereoBoost = true;
        isMonoInput = true;
      }
    } catch (_) {}

    const exportInfo = await cosuProcessor.exportStealthSeed(tempInput, {
      mode: isFull ? 'full' : 'slice',
      startTime,
      duration,
      outputPath: tempOutput,
      preset,
      format,
      title: options.title,
      tempoShift: options.tempoShift,
      stereoBoost: effectiveStereoBoost,
      isMonoInput,
    });

    const resultBuffer = await fs.promises.readFile(tempOutput);
    if (resultBuffer.length < 1000) {
      throw new Error('Hasil pemrosesan audio tidak valid atau terlalu kecil.');
    }
    return {
      buffer: resultBuffer,
      filename,
      mimeType,
      presetName: exportInfo.presetName,
    };
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

// Endpoint: Probe audio metadata via CoSuProcessor.getMetadata
app.post('/api/armor/metadata', express.raw({ type: () => true, limit: '200mb' }), async (req, res) => {
  const tmpId = crypto.randomBytes(8).toString('hex');
  const tempInput = path.join(os.tmpdir(), `probe_${tmpId}.bin`);
  try {
    const audioBuffer = await getRequestAudioBuffer(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio kosong.' });
      return;
    }
    await fs.promises.writeFile(tempInput, audioBuffer);
    const meta = await cosuProcessor.getMetadata(tempInput);
    res.json({ success: true, metadata: meta });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal membaca metadata audio.' });
  } finally {
    try {
      if (fs.existsSync(tempInput)) await fs.promises.unlink(tempInput);
    } catch (_) {}
  }
});

// Processing Endpoint - Returns High-Quality MP3 320k / OGG / WAV Stealth Seed
const handleArmorProcess = async (req: express.Request, res: express.Response) => {
  try {
    const audioBuffer = await getRequestAudioBuffer(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio tidak ditemukan atau kosong. Mohon sertakan data audio.' });
      return;
    }

    const rawPreset =
      (req.query.preset as string) ||
      (req.headers['x-armor-preset'] as string) ||
      (req.headers['x-cosu-preset'] as string) ||
      'original';
    const preset = normalizeArmorPreset(rawPreset);
    const mode = (((req.query.mode as string) ||
      (req.headers['x-armor-mode'] as string) ||
      (req.headers['x-cosu-mode'] as string) ||
      'slice') as 'slice' | 'full');
    const startTime = parseFloat(
      (req.query.startTime as string) ||
        (req.headers['x-armor-start-time'] as string) ||
        (req.headers['x-cosu-start-time'] as string) ||
        '0'
    );
    const duration = parseFloat(
      (req.query.duration as string) ||
        (req.headers['x-armor-duration'] as string) ||
        (req.headers['x-cosu-duration'] as string) ||
        '60.00'
    );
    const rawTitle =
      (req.query.title as string) ||
      (req.headers['x-armor-title'] as string) ||
      (req.headers['x-cosu-title'] as string) ||
      'Audio_Seed';
    let title = 'Audio_Seed';
    try {
      title = decodeURIComponent(rawTitle);
    } catch (_) {
      title = rawTitle;
    }
    const rawFormat = (
      (req.query.format as string) ||
      (req.headers['x-armor-format'] as string) ||
      'mp3'
    ).toLowerCase();
    const format: ArmorFormatType =
      rawFormat === 'wav' ? 'wav' : rawFormat === 'ogg' ? 'ogg' : 'mp3';

    const rawTempoShift = parseFloat(
      (req.query.tempoShift as string) ||
        (req.headers['x-armor-tempo-shift'] as string) ||
        '-12'
    );
    const tempoShift = Number.isFinite(rawTempoShift) ? rawTempoShift : -12;

    const rawStereoBoost = (
      (req.query.stereoBoost as string) ||
      (req.headers['x-armor-stereo-boost'] as string) ||
      'false'
    ).toLowerCase();
    const stereoBoost = rawStereoBoost === 'true' || rawStereoBoost === '1';

    const result = await runArmorFFmpeg(audioBuffer, {
      preset,
      mode,
      startTime,
      duration,
      title,
      format,
      tempoShift,
      stereoBoost,
    });

    const safeAsciiFilename = (result.filename || 'Armor_Audio.mp3').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const encodedFilename = encodeURIComponent(result.filename || safeAsciiFilename);
    const downloadId = cacheDownloadableAudio(result.buffer, result.mimeType, safeAsciiFilename);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader('X-Armor-Filename', safeAsciiFilename);
    res.setHeader('X-Armor-Preset', preset);
    res.setHeader('X-Armor-Format', format);
    res.setHeader('X-Armor-Download-Id', downloadId);
    res.send(result.buffer);
  } catch (error: any) {
    console.error('Armor Processor Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses audio dengan Armor Engine.' });
  }
};

app.post('/api/armor/process', express.raw({ type: () => true, limit: '200mb' }), handleArmorProcess);
app.post('/api/armor/process-cosu', express.raw({ type: () => true, limit: '200mb' }), handleArmorProcess);

// Cache any client-rendered audio buffer on the server so it can be downloaded via a native HTTP GET attachment link (bypassing iframe blob: restrictions)
app.post('/api/audio/cache-download', express.raw({ type: () => true, limit: '200mb' }), async (req, res) => {
  try {
    const audioBuffer = await getRequestAudioBuffer(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio kosong.' });
      return;
    }
    const rawFilename = (req.query.filename as string) || 'Beesuno_Audio.mp3';
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const contentType = (req.query.contentType as string) || 'audio/mpeg';
    const downloadId = cacheDownloadableAudio(audioBuffer, contentType, safeFilename);
    res.json({
      success: true,
      downloadId,
      downloadUrl: `/api/audio/download/${downloadId}?filename=${encodeURIComponent(safeFilename)}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Gagal menyimpan cache unduhan.' });
  }
});

// Direct HTTP GET attachment download endpoint (works reliably in Share Link iframes, Safari, and mobile WebViews)
app.get('/api/audio/download/:id', (req, res) => {
  const id = req.params.id;
  const cached = downloadFileCache.get(id);
  if (!cached) {
    res.status(404).send('Berkas unduhan sudah kedaluwarsa atau tidak ditemukan. Silakan proses ulang.');
    return;
  }
  const rawName = (req.query.filename as string) || cached.filename || 'Beesuno_Audio.mp3';
  const safeFilename = rawName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const encodedFilename = encodeURIComponent(rawName);

  res.setHeader('Content-Type', cached.contentType || 'application/octet-stream');
  res.setHeader('Content-Length', cached.buffer.length);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
  );
  res.setHeader('Cache-Control', 'no-cache');
  res.send(cached.buffer);
});

// Fast Preview Endpoint (15s 256kbps MP3 via CoSuProcessor.renderPreviewFilter)
const handleArmorPreview = async (req: express.Request, res: express.Response) => {
  const tmpId = crypto.randomBytes(8).toString('hex');
  const tempInput = path.join(os.tmpdir(), `preview_in_${tmpId}.bin`);
  try {
    const audioBuffer = await getRequestAudioBuffer(req);
    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({ error: 'Buffer audio kosong.' });
      return;
    }

    const rawPreset =
      (req.query.preset as string) || (req.headers['x-armor-preset'] as string) || 'original';
    const startTime = parseFloat((req.query.startTime as string) || '0');
    const duration = Math.min(30, parseFloat((req.query.duration as string) || '15.00'));
    const tempoShift = parseFloat((req.query.tempoShift as string) || '-12');
    const rawStereoBoost = ((req.query.stereoBoost as string) || 'false').toLowerCase();
    let stereoBoost = rawStereoBoost === 'true' || rawStereoBoost === '1';
    const responseType = (req.query.responseType as string) || '';

    await fs.promises.writeFile(tempInput, audioBuffer);

    try {
      const meta = await cosuProcessor.getMetadata(tempInput);
      if (meta.channels < 2) {
        stereoBoost = true;
      }
    } catch (_) {}

    const previewResult = await cosuProcessor.renderPreviewFilter(
      tempInput,
      startTime,
      duration,
      rawPreset,
      Number.isFinite(tempoShift) ? tempoShift : -12,
      stereoBoost
    );

    if (responseType === 'dataUri' || req.headers.accept?.includes('application/json')) {
      res.json({
        success: true,
        dataUri: previewResult.dataUri,
        preset: toCoSuPresetKey(rawPreset),
        startTime,
        duration,
      });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', previewResult.buffer.length);
    res.send(previewResult.buffer);
  } catch (error: any) {
    console.error('Armor Preview Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memutar preview Armor.' });
  } finally {
    try {
      if (fs.existsSync(tempInput)) await fs.promises.unlink(tempInput);
    } catch (_) {}
  }
};

app.post('/api/armor/preview', express.raw({ type: () => true, limit: '200mb' }), handleArmorPreview);
app.post('/api/armor/preview-cosu', express.raw({ type: () => true, limit: '200mb' }), handleArmorPreview);

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

    // Pre-decrypt and cache the audio stream in the background so preview & downloads are instant
    fetchSunoAudioStream(songId).catch((err) => {
      console.warn('Pre-warm audio stream warning:', err?.message);
    });

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
    const isInline = req.query.inline === '1' || req.query.inline === 'true';
    const rawTitle = (req.query.title as string) || 'Suno_Track';
    const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'Suno_Track';

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
      const cached = audioStreamCache.get(songId);
      if (cached?.m4a) {
        outputBuffer = cached.m4a;
      } else {
        // Always transcode to genuine AAC M4A because raw CloudFront stream is m4a-opus
        outputBuffer = await transcodeAudio(audioInfo.buffer, 'm4a');
        if (cached) cached.m4a = outputBuffer;
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
    const encodedFilename = encodeURIComponent(`${cleanTitle}.${fileExt}`);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Content-Disposition',
      `${isInline ? 'inline' : 'attachment'}; filename="${cleanTitle}.${fileExt}"; filename*=UTF-8''${encodedFilename}`
    );

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
