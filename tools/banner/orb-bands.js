/*
 * Deney: Orb noktalarını enlem bantlarında döndürmek.
 * Her bant (art arda gelen k nokta, neredeyse aynı y) tek bir <g> içinde katı biçimde
 * döner: translate(cx, cy + R y c2) scale(R, −R s2) çerçevesinde rotate(ψ).
 * Noktalar sıfır uzunluklu yollar + yuvarlak uç + vector-effect=non-scaling-stroke:
 * çerçevenin basıklığı noktaları ezmez. Derinlik: bant iki kez çizilir; ön yarı
 * (v ≥ 0) parlak, arka yarı soluk, sabit kırpma ile.
 * Dışa: orbBands(T, opts) → { svg, css, defs }
 */
module.exports = function orbBands(T, o) {
  const { CX, CY, R, N, P_ROT, ROT_Y0, c2, s2, perBand, DOT, players, num } = o;
  const AYn = -R * s2;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = i * 2.39996 + ROT_Y0; // t = 0 anındaki açı
    pts.push({ y, r: rr, th, i });
  }
  const isPlayer = new Set(players);
  const out = [];
  const css = [];
  css.push(`@keyframes spin{to{transform:rotate(360deg)}}.sp{animation:spin ${P_ROT}s linear infinite}`);
  const defs =
    `<clipPath id="cf" clipPathUnits="userSpaceOnUse"><rect x="-${2 * R}" y="0" width="${4 * R}" height="${2 * R}"/></clipPath>` +
    `<clipPath id="cb" clipPathUnits="userSpaceOnUse"><rect x="-${2 * R}" y="-${2 * R}" width="${4 * R}" height="${2 * R}"/></clipPath>`;

  const ordinary = pts.filter((p) => !isPlayer.has(p.i));
  const bands = [];
  for (let k = 0; k < ordinary.length; k += perBand) bands.push(ordinary.slice(k, k + perBand));

  const dotPath = (list) =>
    list
      .map((p) => `M${num(R * p.r * Math.cos(p.th), 2)} ${num(R * p.r * Math.sin(p.th), 2)}h0`)
      .join("");

  const back = [];
  const front = [];
  for (const b of bands) {
    const y = b.reduce((a, p) => a + p.y, 0) / b.length;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const base = 0.45 + 0.3 * y * s2;
    const af = base + 0.3 * c2 * 0.64 * r;
    const ab = base - 0.3 * c2 * 0.64 * r;
    const frame = `transform="translate(${CX} ${num(CY + R * y * c2, 2)})scale(1 ${num(AYn / R, 4)})"`;
    const d = dotPath(b);
    back.push(`<g ${frame} clip-path="url(#cb)"><path class="sp" d="${d}" stroke-opacity="${num(ab, 3)}"/></g>`);
    front.push(`<g ${frame} clip-path="url(#cf)"><path class="sp" d="${d}" stroke-opacity="${num(af, 3)}"/></g>`);
  }
  const stroke = `class="ob dt" fill="none" stroke="${T.muted}" stroke-width="${num(DOT * 2)}" stroke-linecap="round"`;
  css.push(
    `.ob path{vector-effect:non-scaling-stroke}` +
      `.dt{stroke-width:2.6px}.pd{stroke-width:8.4px}` +
      `@media (max-width:1000px){.dt{stroke-width:1.9px}.pd{stroke-width:6px}}` +
      `@media (max-width:640px){.dt{stroke-width:1.3px}.pd{stroke-width:4.2px}}` +
      `@media (max-width:420px){.dt{stroke-width:1px}.pd{stroke-width:3.2px}}`
  );
  out.push(`<g ${stroke}>${back.join("")}${front.join("")}</g>`);

  /* oyuncular: kendi tam y'lerinde, yalnızca ön yarıda */
  const pl = [];
  let pdefs = "";
  players.forEach((idx, j) => {
    const p = pts[idx];
    const frame = `transform="translate(${CX} ${num(CY + R * p.y * c2, 2)})scale(1 ${num(AYn / R, 4)})"`;
    const d = `M${num(R * p.r * Math.cos(p.th), 2)} ${num(R * p.r * Math.sin(p.th), 2)}h0`;
    const v0 = (R * (-0.1 - p.y * s2)) / c2;
    pdefs += `<clipPath id="cp${j}" clipPathUnits="userSpaceOnUse"><rect x="-${2 * R}" y="${num(v0, 1)}" width="${4 * R}" height="${3 * R}"/></clipPath>`;
    pl.push(
      `<g ${frame} clip-path="url(#cp${j})"><g class="sp"><path class="hl" d="${d}"/><path class="pd" d="${d}" stroke-width="${num(3 * 1.4 * 2)}"/></g></g>`
    );
  });
  css.push(
    `@keyframes hl{from{stroke-width:calc(var(--k) * 11.2px);stroke-opacity:.25}to{stroke-width:calc(var(--k) * 33.6px);stroke-opacity:0}}.hl{animation:hl 1.571s cubic-bezier(.37,0,.63,1) infinite alternate}` +
      `svg{--k:1}@media (max-width:1000px){svg{--k:.72}}@media (max-width:640px){svg{--k:.5}}@media (max-width:420px){svg{--k:.38}}`
  );
  out.push(`<g class="ob" fill="none" stroke="${T.ok}" stroke-linecap="round">${pl.join("")}</g>`);
  return { svg: out.join("\n"), css: css.join("\n"), defs: defs + pdefs };
};
