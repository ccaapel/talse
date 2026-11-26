// Gera a pasta docs/ (GitHub Pages) a partir de index.html, o mesmo arquivo do Artifact do claude.ai.
// Uso: node build-pages.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const out = path.join(root, 'docs');
fs.mkdirSync(out, { recursive: true });
/* v4: texto na fonte do sistema (a mesma pilha do X); só a Geist Mono é baixada.
   Com internet vale a do Google; sem internet entra a cópia local (latim). */
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/"Geist Mono",/g, '"Geist Mono","GMono L",');
if (!src.includes('"GMono L"')) throw new Error('token de fonte mudou em index.html: ajustar build-pages.js');
const FONTS = ['geist-mono-latin.woff2'];
fs.rmSync(path.join(out, 'fonts'), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
for (const f of [...FONTS, 'OFL-GeistMono.txt']) fs.copyFileSync(path.join(root, 'fonts', f), path.join(out, 'fonts', f));
/* Three.js local + carregador de modelos: a sala 3D abre sem internet */
fs.rmSync(path.join(out, 'vendor'), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor', 'addons'), { recursive: true });
for (const f of ['three.module.min.js', 'LICENSE-three.txt', 'addons/GLTFLoader.js', 'addons/BufferGeometryUtils.js']) fs.copyFileSync(path.join(root, 'vendor', f), path.join(out, 'vendor', f));
/* Modelos 3D da Poly Haven (CC0) */
fs.rmSync(path.join(out, 'models'), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'models'), { recursive: true });
const MODELS = fs.readdirSync(path.join(root, 'models')).filter(f => /\.(glb|md)$/.test(f));
/* v9: imagens próprias (o desenho do Pedro) */
fs.rmSync(path.join(out, 'img'), { recursive: true, force: true });fs.mkdirSync(path.join(out, 'img'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'img')).filter(f => /\.(webp|png|jpg)$/.test(f))) fs.copyFileSync(path.join(root, 'img', f), path.join(out, 'img', f));
for (const f of MODELS) fs.copyFileSync(path.join(root, 'models', f), path.join(out, 'models', f));
/* Supabase (conta por e-mail): cópia local fixa, nunca de CDN solta */
const SUPA = fs.existsSync(path.join(root, 'vendor', 'supabase.js'));
if (SUPA) for (const f of fs.readdirSync(path.join(root, 'vendor')).filter(f => /supabase/i.test(f))) fs.copyFileSync(path.join(root, 'vendor', f), path.join(out, 'vendor', f));
const BG = '#000000';

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
<link rel="icon" type="image/svg+xml" href="icon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">
<style>@font-face{font-family:"GMono L";src:url(fonts/geist-mono-latin.woff2) format("woff2");font-weight:400 600;font-display:swap}:root{color-scheme:dark}html,body{background:#000}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${SUPA ? '<script src="vendor/supabase.js"></script>\n' : ''}${src}
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
fs.writeFileSync(path.join(out, 'sw.js'), `const V = 'talse-v9';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'fonts/geist-mono-latin.woff2', 'vendor/three.module.min.js', 'vendor/addons/GLTFLoader.js', 'vendor/addons/BufferGeometryUtils.js'${SUPA ? ", 'vendor/supabase.js'" : ''}];
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

/* Ícone (v4): o mesmo fantasma da abertura (lençol creme, óculos pretos, livro azul oceano) sobre preto. Grade 120x130.
   O favicon da aba é o SVG do fantasma, igual ao da abertura (pedido do Pedro, 22/11). */
fs.writeFileSync(path.join(out, 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -2 132 132"><path fill="#F2EDE4" stroke="#0E0D0C" stroke-width="5" d="M60 8C33 8 20 30 20 56v52c5 7 10 7 15 0 5-7 10-7 15 0 5 7 10 7 15 0 5-7 10-7 15 0 5 7 10 7 15 0 5-7 10-7 5-10V56C100 30 87 8 60 8z"/><g fill="rgba(34,199,240,.18)" stroke="#0E0D0C" stroke-width="5" stroke-linecap="round"><circle cx="46" cy="48" r="11"/><circle cx="74" cy="48" r="11"/></g><path d="M57 47q3-4 6 0" fill="none" stroke="#0E0D0C" stroke-width="4" stroke-linecap="round"/><ellipse cx="48" cy="49" rx="3" ry="3.6" fill="#0E0D0C"/><ellipse cx="76" cy="49" rx="3" ry="3.6" fill="#0E0D0C"/><path fill="#22C7F0" stroke="#0E0D0C" stroke-width="4" stroke-linejoin="round" d="M30 78l30 7 30-7v26l-30 7-30-7z"/><path d="M60 85v26" stroke="#0E0D0C" stroke-width="3"/></svg>`);
function bez(p0, p1, p2, p3, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t;
    pts.push([u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0], u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]); }
  return pts;
}
const circ = (cx, cy, r, n = 40) => Array.from({ length: n + 1 }, (_, i) => [cx + r * Math.cos(i / n * 6.2832), cy + r * Math.sin(i / n * 6.2832)]);
const CREME = [0xf2, 0xed, 0xe4], TINTA = [0x0e, 0x0d, 0x0c], LARANJA = [0x22, 0xc7, 0xf0]; /* nome antigo: agora é o azul oceano do livro */
const lencol = [...bez([60, 8], [33, 8], [20, 30], [20, 56]), [20, 108]];
for (let k = 0; k < 5; k++) { const x = 20 + k * 16; lencol.push(...bez([x, 108], [x + 4, 115], [x + 12, 115], [x + 16, 108], 8)); }
lencol.push([100, 56], ...bez([100, 56], [100, 30], [87, 8], [60, 8]));
const shapes = [
  { fill: true, c: CREME, p: lencol },
  { c: TINTA, w: 3.2, p: lencol },
  { c: TINTA, w: 4.5, p: circ(46, 48, 11) },
  { c: TINTA, w: 4.5, p: circ(74, 48, 11) },
  { c: TINTA, w: 3.5, p: [[57, 47], [60, 44], [63, 47]] },
  { fill: true, c: TINTA, p: circ(48, 49, 2.8, 16) },
  { fill: true, c: TINTA, p: circ(76, 49, 2.8, 16) },
  { fill: true, c: LARANJA, p: [[30, 78], [60, 85], [90, 78], [90, 104], [60, 111], [30, 104], [30, 78]] },
  { c: TINTA, w: 3, p: [[30, 78], [60, 85], [90, 78], [90, 104], [60, 111], [30, 104], [30, 78]] },
  { c: TINTA, w: 2.4, p: [[60, 85], [60, 111]] }
];
const dentro = (x, y, p) => { let d = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
const distSeg = (gx, gy, p) => { let best = 1e9; for (let i = 0; i < p.length - 1; i++) { const [x1, y1] = p[i], [x2, y2] = p[i + 1]; const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1e-9; let t = ((gx - x1) * dx + (gy - y1) * dy) / l2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(gx - (x1 + t * dx), gy - (y1 + t * dy)); if (d < best) best = d; } return best; };
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
  const bg = [0x00, 0x00, 0x00];
  const k = size * scale / 130, ox = (size - 120 * k) / 2, oy = (size - 130 * k) / 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const gx = (x + .5 - ox) / k, gy = (y + .5 - oy) / k;
      let col = bg.slice();
      for (const s of shapes) {
        const d = distSeg(gx, gy, s.p);
        let cov;
        if (s.fill) { const ins = dentro(gx, gy, s.p); cov = ins ? Math.min(1, .5 + d * k) : Math.max(0, .5 - d * k); }
        else cov = Math.max(0, Math.min(1, (s.w / 2 - d) * k + .5));
        if (cov > 0) for (let c = 0; c < 3; c++) col[c] = col[c] + (s.c[c] - col[c]) * cov;
      }
      const i = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[i + c] = Math.round(col[c]);
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
fs.copyFileSync(path.join(root, 'privacidade.html'), path.join(out, 'privacidade.html'));
console.log('docs/ gerado');
