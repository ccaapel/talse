// Gera a pasta docs/ (GitHub Pages) a partir de index.html, o mesmo arquivo do Artifact do claude.ai.
// Uso: node build-pages.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const out = path.join(root, 'docs');
fs.mkdirSync(out, { recursive: true });
/* Fontes guardadas no aparelho: com internet valem as do Google (todas as línguas); sem internet entram estas cópias (latim). */
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('--fd:"Fraunces",', '--fd:"Fraunces","Fraunces L",')
  .replace('--f:"Instrument Sans",', '--f:"Instrument Sans","Inst L",')
  .replace('--fs:"Instrument Serif",', '--fs:"Instrument Serif","InstS L",')
  .replace('--fm:"IBM Plex Mono",', '--fm:"IBM Plex Mono","Plex L",');
if (!src.includes('"Fraunces L"') || !src.includes('"Inst L"')) throw new Error('tokens --f/--fd mudaram em index.html: ajustar build-pages.js');
const FONTS = ['fraunces-latin.woff2', 'instrument-sans-latin.woff2', 'instrument-serif-latin.woff2', 'instrument-serif-italic-latin.woff2', 'plex-mono-500-latin.woff2'];
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
for (const f of [...FONTS, 'OFL-Fraunces.txt', 'OFL-InstrumentSans.txt', 'OFL-InstrumentSerif.txt', 'OFL-IBMPlexMono.txt']) fs.copyFileSync(path.join(root, 'fonts', f), path.join(out, 'fonts', f));
/* Three.js local: a sala 3D abre sem internet */
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
for (const f of ['three.module.min.js', 'LICENSE-three.txt']) fs.copyFileSync(path.join(root, 'vendor', f), path.join(out, 'vendor', f));
for (const f of ['anton-latin.woff2', 'plus-jakarta-sans-latin.woff2', 'OFL-Anton.txt', 'OFL-PlusJakartaSans.txt']) { try { fs.unlinkSync(path.join(out, 'fonts', f)); } catch (e) {} }
const BG = '#17120D';

/* Página completa: o arquivo do Artifact não tem <html>, <head> nem <body> */
const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="${BG}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Talse">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">
<style>@font-face{font-family:"Fraunces L";src:url(fonts/fraunces-latin.woff2) format("woff2");font-weight:100 900;font-display:swap}@font-face{font-family:"Inst L";src:url(fonts/instrument-sans-latin.woff2) format("woff2");font-weight:400 700;font-display:swap}@font-face{font-family:"InstS L";src:url(fonts/instrument-serif-latin.woff2) format("woff2");font-weight:400;font-display:swap}@font-face{font-family:"InstS L";src:url(fonts/instrument-serif-italic-latin.woff2) format("woff2");font-weight:400;font-style:italic;font-display:swap}@font-face{font-family:"Plex L";src:url(fonts/plex-mono-500-latin.woff2) format("woff2");font-weight:500;font-display:swap}:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${src}
<script>
if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});}
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(out, 'index.html'), page);

fs.writeFileSync(path.join(out, 'manifest.webmanifest'), JSON.stringify({
  name: 'Talse',
  short_name: 'Talse',
  description: 'Sua biblioteca de consumos: guarde, leia, ouça e lembre o que te prende.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: BG,
  theme_color: BG,
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ],
  share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } }
}, null, 2));

/* Service worker: abre o app mesmo sem internet (os dados já ficam no aparelho) */
fs.writeFileSync(path.join(out, 'sw.js'), `const V = 'talse-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'fonts/fraunces-latin.woff2', 'fonts/instrument-sans-latin.woff2', 'fonts/instrument-serif-latin.woff2', 'fonts/instrument-serif-italic-latin.woff2', 'fonts/plex-mono-500-latin.woff2', 'vendor/three.module.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res; })
      .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html')))
  );
});
`);

/* Ícone: o mesmo livro aberto da animação de abertura, desenhado em traço (sem dependências).
   Coordenadas na grade 120x120, iguais às do SVG em index.html. */
function bez(p0, p1, p2, p3, n = 24) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
              u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return pts;
}
const GREEN = [0xf4, 0xeb, 0xda], CLAY = [0xf0, 0x8a, 0x6e], WHEAT = [0xf2, 0xd4, 0x5c];
const strokes = [
  // página esquerda: M60 50 C48 40 30 38 14 44 v52 c16-6 34-4 46 6
  { c: GREEN, w: 5, p: [...bez([60, 50], [48, 40], [30, 38], [14, 44]), [14, 96], ...bez([14, 96], [30, 90], [48, 92], [60, 102])] },
  // página direita
  { c: GREEN, w: 5, p: [...bez([60, 50], [72, 40], [90, 38], [106, 44]), [106, 96], ...bez([106, 96], [90, 90], [72, 92], [60, 102])] },
  { c: GREEN, w: 5, p: [[60, 50], [60, 102]] },
  // as três coisas que saem do livro
  { c: CLAY, w: 4, p: Array.from({ length: 25 }, (_, i) => [44 + 5 * Math.cos(i / 24 * 6.2832), 22 + 5 * Math.sin(i / 24 * 6.2832)]) },
  { c: WHEAT, w: 4, p: [[56, 8], [66, 8], [66, 18], [56, 18], [56, 8]] },
  { c: CLAY, w: 4, p: [[74, 18], [83, 23], [74, 28], [74, 18]] }
];
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, scale) {
  const bg = [0x17, 0x12, 0x0d];
  const k = size * scale / 120, ox = (size - 120 * k) / 2, oy = (size - 120 * k) / 2 + 4 * k;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = (x + .5 - ox) / k, gy = (y + .5 - oy) / k;
      let col = bg, a = 0;
      for (const s of strokes) {
        let best = 1e9;
        for (let i = 0; i < s.p.length - 1; i++) {
          const [x1, y1] = s.p[i], [x2, y2] = s.p[i + 1];
          const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1e-9;
          let t = ((gx - x1) * dx + (gy - y1) * dy) / l2; t = Math.max(0, Math.min(1, t));
          const d = Math.hypot(gx - (x1 + t * dx), gy - (y1 + t * dy));
          if (d < best) best = d;
        }
        const cov = Math.max(0, Math.min(1, (s.w / 2 - best) * k + .5)); // borda suave
        if (cov > a) { a = cov; col = s.c; }
      }
      const i = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(bg[c] + (col[c] - bg[c]) * a);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ]);
}
fs.writeFileSync(path.join(out, 'icon-180.png'), png(180, 0.72));
fs.writeFileSync(path.join(out, 'icon-192.png'), png(192, 0.72));
fs.writeFileSync(path.join(out, 'icon-512.png'), png(512, 0.72));
fs.writeFileSync(path.join(out, 'icon-512-maskable.png'), png(512, 0.56));
console.log('docs/ gerado');
