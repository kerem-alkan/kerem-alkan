/*
 * keremalkan.com profil afişi — iki dünya, tek iskelet.
 * Çıktı: banner-surface.svg (GitHub açık tema) ve banner-underground.svg (koyu tema).
 * Orb: sitedeki tuval çiziminin SVG + CSS animasyonu ile karşılığı
 *   (420 noktalı Fibonacci küresi, rotY .6 başlangıç, rotX -.35 eğim, ~26 sn tur,
 *    eğik yörünge 1.38R / .34R, TILT -.3, tarayan nokta 9.4 sn, 14 oyuncu noktası).
 *   Noktalar 10'arlı enlem bantlarında döner (orb-bands.js): nokta başına ayrı
 *   animasyon ziyaretçinin işlemcisini ~3 kat fazla yoruyordu.
 * Betik yok (GitHub <img> içinde betik çalışmaz); yalnızca CSS animasyonu.
 * Yazılar Inter / JetBrains Mono ile yola çevrilir: her cihazda aynı görünür.
 * Kullanım: fonts/ klasörüne Inter-Bold, Inter-SemiBold, Inter-Medium ve
 * JetBrainsMono-Medium (.ttf, Google Fonts, OFL) koy; `npm i opentype.js@1.3.4 && node gen-banner.js`.
 */
const opentype = require("opentype.js");
const orbBands = require("./orb-bands.js");
const fs = require("fs");
const path = require("path");

const FONTS = path.join(__dirname, "fonts");
const OUT = process.argv[2] || path.join(__dirname, "..", "..", "assets");
fs.mkdirSync(OUT, { recursive: true });

const load = (f) => opentype.loadSync(path.join(FONTS, f));
const FONT = {
  bold: load("Inter-Bold.ttf"),
  semi: load("Inter-SemiBold.ttf"),
  med: load("Inter-Medium.ttf"),
  mono: load("JetBrainsMono-Medium.ttf"),
};

const num = (n, d = 2) => {
  const s = String(Math.round(n * 10 ** d) / 10 ** d);
  return s.replace(/^(-?)0\./, "$1.");
};
const tw = (font, str, size, ls = 0) => font.getAdvanceWidth(str, size, { kerning: true, letterSpacing: ls }) - ls * size;
/* yazı → göreli yol verisi (onda bir hassasiyet; birikmiş hata yok) */
const tp = (font, str, x, y, size, ls = 0) => {
  const cmds = font.getPath(str, x, y, size, { kerning: true, letterSpacing: ls }).commands;
  const q = (v) => Math.round(v * 10);
  const f = (t) => String(t / 10).replace(/^(-?)0\./, "$1.");
  let cx = 0, cy = 0, sx = 0, sy = 0, out = "";
  const nums = (arr) => arr.map((t, i) => (i > 0 && t >= 0 ? " " : "") + f(t)).join("");
  for (const c of cmds) {
    if (c.type === "Z") { out += "z"; cx = sx; cy = sy; continue; }
    const X = q(c.x), Y = q(c.y);
    if (c.type === "M") { out += "m" + nums([X - cx, Y - cy]); sx = X; sy = Y; }
    else if (c.type === "L") {
      if (Y === cy) out += "h" + f(X - cx);
      else if (X === cx) out += "v" + f(Y - cy);
      else out += "l" + nums([X - cx, Y - cy]);
    } else if (c.type === "Q") out += "q" + nums([q(c.x1) - cx, q(c.y1) - cy, X - cx, Y - cy]);
    else if (c.type === "C") out += "c" + nums([q(c.x1) - cx, q(c.y1) - cy, q(c.x2) - cx, q(c.y2) - cy, X - cx, Y - cy]);
    cx = X; cy = Y;
  }
  return out;
};

/* ---------- ölçüler ---------- */
const W = 1200;
const H = 420;
const PX = 64; // sol kenar
const K = 1.15; // üst çubuk ögelerinin site px → afiş birimi oranı

/* Orb kutusu: sağda */
const CX = 952;
const CY = 248;
const R = 128;
const RX = R * 1.38;
const RY = R * 0.34;
const TILT = -0.3;
const ROT_X = -0.35;
const ROT_Y0 = 0.6;
const N = 420;
const P_ROT = 26.18; // 0.004 rad/kare × 60 kare/sn → 0.24 rad/sn
const P_SCAN = 2 * Math.PI * 1.5; // a = t / 1500
const P_PULSE = 2 * Math.PI * 0.5; // sin(t / 500)
const DOT = 1.3; // nokta yarıçapı (sitede 1.8 px kare; afiş ölçeğinde)
const PS = 1.4; // site px → afiş birimi (oyuncu, tarayıcı)

const c2 = Math.cos(ROT_X);
const s2 = Math.sin(ROT_X);

const THEMES = {
  surface: {
    bg: "#f5f5f7", stroke: null, rx: 26,
    head: "#1d1d1f", muted: "#636366", line: "#e2e2e8", acc: "#0071e3", accInk: "#0062c4", ok: "#1a7f37",
    panel: "#ffffff", codeBg: "#f5f5f7", thumb: "#ffffff", thumbShadow: true,
    eyebrow: { font: "med", text: "Independent product developer · since 2023", color: "#636366", caret: false },
    mk: "square",
  },
  underground: {
    bg: "#0d1117", stroke: "#30363d", rx: 9,
    head: "#f0f6fc", muted: "#8b949e", line: "#30363d", acc: "#58a6ff", accInk: "#58a6ff", ok: "#3fb950",
    panel: "#161b22", codeBg: "#0d1117", thumb: "#21262d", thumbShadow: false,
    eyebrow: { font: "mono", text: "~/kerem-alkan $ whoami", color: "#3fb950", caret: true },
    mk: "circle",
  },
};

/* oyuncu noktaları: Orb.tsx ile aynı seçim */
const players = [];
for (let j = 0; j < 14; j++) players.push((j * 97 + 31) % N);

/* doğrusal anahtar kareler: fn(açı) her adımda */
const kf = (name, fn, steps) => {
  const out = [];
  for (let k = 0; k <= steps; k++) out.push(`${num((k / steps) * 100, 2)}%{${fn((k / steps) * 2 * Math.PI)}}`);
  return `@keyframes ${name}{${out.join("")}}`;
};

function orb(T) {
  const out = [];
  const css = [];

  const defs =
    `<radialGradient id="glow" cx="${CX}" cy="${CY}" r="${num(R * 1.5)}" gradientUnits="userSpaceOnUse">` +
    `<stop offset=".067" stop-color="${T.acc}" stop-opacity=".2"/>` +
    `<stop offset=".627" stop-color="${T.acc}" stop-opacity=".06"/>` +
    `<stop offset="1" stop-color="${T.acc}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="scan"><stop offset="0" stop-color="${T.acc}" stop-opacity=".6"/><stop offset="1" stop-color="${T.acc}" stop-opacity="0"/></radialGradient>`;
  out.push(`<circle cx="${CX}" cy="${CY}" r="${num(R * 1.5)}" fill="url(#glow)"/>`);

  /* yörüngenin arka yarısı */
  const tiltDeg = num((TILT * 180) / Math.PI, 3);
  const orbitG = `transform="translate(${CX} ${CY}) rotate(${tiltDeg})"`;
  out.push(
    `<path ${orbitG} d="M${num(-RX)} 0A${num(RX)} ${num(RY)} 0 0 1 ${num(RX)} 0" fill="none" stroke="${T.acc}" stroke-opacity=".3" stroke-width="1.4"/>`
  );
  /* küre çemberi */
  out.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${T.line}" stroke-width="1.4"/>`);

  /* noktalar ve oyuncular: enlem bantları (bkz. orb-bands.js) */
  const ob = orbBands(T, { CX, CY, R, N, P_ROT, ROT_Y0, c2, s2, perBand: 10, DOT, players, num });
  out.push(ob.svg);
  css.push(ob.css);

  /* yörüngenin ön yarısı */
  out.push(
    `<path ${orbitG} d="M${num(RX)} 0A${num(RX)} ${num(RY)} 0 0 1 ${num(-RX)} 0" fill="none" stroke="${T.acc}" stroke-opacity=".75" stroke-width="1.4"/>`
  );

  /* tarayan nokta: yörünge çerçevesinde (rx cos a, ry sin a); arkadayken soluk */
  css.push(
    kf(
      "scan",
      (a) =>
        `transform:translate(${num(RX * Math.cos(a), 1)}px,${num(RY * Math.sin(a), 1)}px);opacity:${num(Math.min(1, Math.max(0.4, 0.7 + 0.6 * Math.sin(a))))}`,
      36
    )
  );
  css.push(`.scan{animation:scan ${num(P_SCAN, 3)}s linear infinite}`);
  out.push(
    `<g ${orbitG}><g class="scan"><circle r="${num(16 * PS)}" fill="url(#scan)"/><circle r="${num(3.5 * PS)}" fill="${T.acc}"/></g></g>`
  );

  return { svg: out.join("\n"), css: css.join("\n"), defs: defs + ob.defs };
}

/* ---------- üst çubuk: marka ve dünya düğmesi ---------- */
function topbar(T, world) {
  const out = [];
  const cy = 72;
  const mk = 26 * K;
  const mx = PX;
  const my = cy - mk / 2;
  if (T.mk === "square") {
    out.push(`<rect x="${num(mx)}" y="${num(my)}" width="${num(mk)}" height="${num(mk)}" rx="${num(7 * K)}" fill="${T.head}"/>`);
  } else {
    out.push(`<circle cx="${num(mx + mk / 2)}" cy="${num(cy)}" r="${num(mk / 2 - 0.5)}" fill="${T.panel}" stroke="${T.line}"/>`);
  }
  const kaSize = 11 * K;
  const kaW = tw(FONT.mono, "KA", kaSize);
  out.push(`<path d="${tp(FONT.mono, "KA", mx + mk / 2 - kaW / 2, cy + kaSize * 0.36, kaSize)}" fill="${T.mk === "square" ? T.bg : T.ok}"/>`);
  const nameSize = 16 * K;
  out.push(`<path d="${tp(FONT.semi, "Kerem Alkan", mx + mk + 10 * K, cy + nameSize * 0.36, nameSize, -0.02)}" fill="${T.head}"/>`);

  /* yüzen dünya düğmesi (site: .switch > kbd + .seg) */
  const f = 12.5 * K;
  const icon = 14 * K;
  const bpx = 12 * K;
  const bpy = 8 * K;
  const gap = 6 * K;
  const labW = Math.max(tw(FONT.med, "Surface", f), tw(FONT.med, "Underground", f));
  const btnW = bpx * 2 + icon + gap + labW;
  const segPad = 3 * K;
  const segW = segPad * 2 + btnW * 2;
  const segH = segPad * 2 + bpy * 2 + icon;
  const kbdF = 12 * K;
  const kbdW = tw(FONT.mono, "`", kbdF) + 10 * K + 2;
  const kbdH = kbdF + 4 * K + 2;
  const swPadL = 14 * K;
  const swPad = 6 * K;
  const swW = 1 + swPadL + kbdW + 10 * K + segW + swPad + 1;
  const swH = 1 + swPad * 2 + segH + 1;
  const sx = W - PX - swW;
  const sy = cy - swH / 2;
  out.push(
    `<rect x="${num(sx + 0.5)}" y="${num(sy + 0.5)}" width="${num(swW - 1)}" height="${num(swH - 1)}" rx="${num(swH / 2)}" fill="${T.panel}" stroke="${T.line}"/>`
  );
  const kx = sx + 1 + swPadL;
  out.push(
    `<rect x="${num(kx + 0.5)}" y="${num(cy - kbdH / 2 + 0.5)}" width="${num(kbdW - 1)}" height="${num(kbdH - 1)}" rx="${num(4 * K)}" fill="none" stroke="${T.line}"/>`
  );
  out.push(`<path d="${tp(FONT.mono, "`", kx + 1 + 5 * K, cy + kbdF * 0.62, kbdF)}" fill="${T.muted}"/>`);
  const gx = kx + kbdW + 10 * K;
  const gy = cy - segH / 2;
  out.push(`<rect x="${num(gx)}" y="${num(gy)}" width="${num(segW)}" height="${num(segH)}" rx="${num(segH / 2)}" fill="${T.codeBg}"/>`);
  const thumbX = world === "surface" ? gx + segPad : gx + segPad + btnW;
  out.push(
    `<rect x="${num(thumbX)}" y="${num(gy + segPad)}" width="${num(btnW)}" height="${num(segH - segPad * 2)}" rx="${num((segH - segPad * 2) / 2)}" fill="${T.thumb}"${
      T.thumbShadow ? ' filter="url(#sh)"' : ""
    }/>`
  );
  const buttons = [
    { w: "surface", label: "Surface" },
    { w: "underground", label: "Underground" },
  ];
  buttons.forEach((b, n) => {
    const bx = gx + segPad + n * btnW;
    const contentW = icon + gap + tw(FONT.med, b.label, f);
    const ix = bx + (btnW - contentW) / 2;
    const iy = cy - icon / 2;
    const col = b.w === world ? T.head : T.muted;
    const sc = icon / 16;
    const iconPaths =
      b.w === "surface"
        ? `<path d="M2 11.5h12"/><path d="M4.5 11.5a3.5 3.5 0 0 1 7 0"/><path d="M8 3.5V5M3.8 5.6l1 1M12.2 5.6l-1 1"/>`
        : `<path d="M3 4.5 6.5 8 3 11.5"/><path d="M8.5 11.5H13"/>`;
    out.push(
      `<g transform="translate(${num(ix)} ${num(iy)}) scale(${num(sc, 3)})" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</g>`
    );
    out.push(`<path d="${tp(FONT.med, b.label, ix + icon + gap, cy + f * 0.36, f)}" fill="${col}"/>`);
  });
  return out.join("\n");
}

/* ---------- giriş yazıları ---------- */
function hero(T) {
  const out = [];
  const ebSize = 20;
  const eb = T.eyebrow;
  const ebY = 172;
  out.push(`<path d="${tp(FONT[eb.font], eb.text, PX, ebY, ebSize)}" fill="${eb.color}"/>`);
  if (eb.caret) {
    const cw = tw(FONT.mono, eb.text + " ", ebSize);
    out.push(`<rect class="caret" x="${num(PX + cw)}" y="${num(ebY - ebSize * 0.78)}" width="${num(ebSize * 0.55)}" height="${num(ebSize * 0.98)}" fill="${eb.color}"/>`);
  }
  const h1 = 54;
  const ls = -0.035;
  out.push(`<path d="${tp(FONT.bold, "I worked in retail.", PX - 2, 246, h1, ls)}" fill="${T.head}"/>`);
  out.push(`<path d="${tp(FONT.bold, "Now I build software for it.", PX - 2, 246 + h1 * 1.08, h1, ls)}" fill="${T.muted}"/>`);
  const url = "keremalkan.com";
  out.push(`<path d="${tp(FONT.mono, url, PX, 362, 17)}" fill="${T.accInk}"/>`);
  const uw = tw(FONT.mono, url, 17);
  /* ince ok ↗ */
  const ax = PX + uw + 8;
  out.push(
    `<path d="M${num(ax)} 361l9-9M${num(ax + 2)} 352h7v7" fill="none" stroke="${T.accInk}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
  );
  return { svg: out.join("\n"), widest: tw(FONT.bold, "Now I build software for it.", h1, ls) };
}

for (const [world, T] of Object.entries(THEMES)) {
  const o = orb(T);
  const h = hero(T);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Kerem Alkan. I worked in retail. Now I build software for it.</title>
<defs>${o.defs}<filter id="sh" x="-20%" y="-40%" width="140%" height="180%"><feDropShadow dx="0" dy="1.2" stdDeviation="1.6" flood-color="#000" flood-opacity=".18"/></filter><clipPath id="panel"><rect width="${W}" height="${H}" rx="${T.rx}"/></clipPath></defs>
<style>
${o.css}
.caret{animation:blink 1.1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}.caret{opacity:1}}
</style>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${T.rx}" fill="${T.bg}"${T.stroke ? ` stroke="${T.stroke}"` : ""}/>
<g clip-path="url(#panel)">
${o.svg}
</g>
${topbar(T, world)}
${h.svg}
</svg>
`;
  const file = path.join(OUT, `banner-${world}.svg`);
  fs.writeFileSync(file, svg);
  console.log(world, (svg.length / 1024).toFixed(1) + " KB", "widest h1 line:", h.widest.toFixed(0));
}
