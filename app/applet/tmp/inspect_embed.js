import fs from 'fs';

const html = fs.readFileSync('/tmp/suno_embed.html', 'utf-8');
const urls = html.match(/https?:[^\s"'\\]+/gi);
const filtered = Array.from(new Set(urls || [])).filter(u =>
  !u.endsWith('.css') && !u.endsWith('.js') && !u.includes('w3.org')
);
console.log('Embed URLs:\n', filtered);

// Also look for audio or clip
const clipMatch = html.match(/"clip":\{[\s\S]*?\}(,\s*"|\}$)/);
if (clipMatch) {
  console.log('Clip match found:', clipMatch[0].substring(0, 500));
}

// Search for any media/audio/stream
const media = html.match(/media_urls|audio_url|stream|source/gi);
console.log('Media keywords in embed:', media);
