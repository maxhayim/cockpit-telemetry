// GitHub stats -> animated glass-cockpit SVG in the Flight Path Radar phosphor palette.

const W = 960, H = 628;
const SWEEP = 4;              // nav display radar sweep period, seconds
const FONT = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

const T = {
  bg: "#020d07", panel: "#03140b", border: "#14522d", grid: "#0f3d22",
  sky: "#06301a", ground: "#031a0d",
  text: "#5dff95", dim: "#2fc062", faint: "#1c8443", off: "#0b3a1f",
  amber: "#ffb347", plane: "#0a0d0b",
};

const f = (n) => +n.toFixed(2);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const num = (n) => n.toLocaleString("en-US");
const rad = (deg) => (deg * Math.PI) / 180;
const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy + r * Math.sin(rad(deg))];
const niceMax = (v) => { const m = Math.max(v * 1.25, 10), p = 10 ** Math.floor(Math.log10(m)); return Math.ceil(m / p) * p; };
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const text = (x, y, s, { size = 11, fill = T.text, anchor = "start", weight = "", opacity = "", extra = "", children = "" } = {}) =>
  `<text x="${f(x)}" y="${f(y)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"` +
  `${weight ? ` font-weight="${weight}"` : ""}${opacity ? ` opacity="${opacity}"` : ""}${extra}>${esc(s)}${children}</text>`;

// Bezel with corner brackets and a title tab.
function panel(x, y, w, h, title) {
  const b = 10, c = (px, py, dx, dy) => `M${px + dx * b},${py}L${px},${py}L${px},${py + dy * b}`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${T.panel}" stroke="${T.border}"/>` +
    `<path d="${c(x, y, 1, 1)}${c(x + w, y, -1, 1)}${c(x, y + h, 1, -1)}${c(x + w, y + h, -1, -1)}" fill="none" stroke="${T.dim}" stroke-width="1.5"/>` +
    text(x + 12, y + 16, title, { size: 10, fill: T.dim, weight: 700, extra: ` letter-spacing="1.5"` });
}

// Primary flight display: attitude ball, speed and altitude tapes, mode annunciators.
function pfd(s, x, y) {
  const w = 320, h = 264, cx = x + w / 2, cy = y + 140;
  const ax = x + 62, aw = 196, ay = y + 50, ah = 172;
  const week = s.days.slice(-7).reduce((a, b) => a + b, 0);
  const last30 = s.days.slice(-30).reduce((a, b) => a + b, 0), prev30 = s.days.slice(-60, -30).reduce((a, b) => a + b, 0);
  const vs = prev30 ? Math.round(((last30 - prev30) / prev30) * 100) : 0;
  const pitch = Math.max(-15, Math.min(15, vs / 8));          // climb rate tilts the horizon
  const out = [panel(x, y, w, h, "PFD")];

  // Attitude: sky/ground with pitch ladder, gently banking.
  const ladder = [];
  for (let p = -30; p <= 30; p += 5) {
    if (!p) continue;
    const ly = cy - p * 4, lw = p % 10 ? 18 : 36;
    ladder.push(`<line x1="${f(cx - lw)}" y1="${f(ly)}" x2="${f(cx + lw)}" y2="${f(ly)}" stroke="${T.text}" stroke-width="1" opacity="0.7"/>`);
    if (!(p % 10)) ladder.push(text(cx - lw - 4, ly + 3, Math.abs(p), { size: 8, anchor: "end", fill: T.dim }),
      text(cx + lw + 4, ly + 3, Math.abs(p), { size: 8, fill: T.dim }));
  }
  out.push(`<clipPath id="ai"><rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="4"/></clipPath>
<g clip-path="url(#ai)"><g transform="translate(0 ${f(pitch * 4)})"><g>
  <rect x="${ax - 200}" y="${cy - 400}" width="${aw + 400}" height="400" fill="${T.sky}"/>
  <rect x="${ax - 200}" y="${cy}" width="${aw + 400}" height="400" fill="${T.ground}"/>
  <line x1="${ax - 200}" y1="${cy}" x2="${ax + aw + 200}" y2="${cy}" stroke="${T.text}" stroke-width="1.5"/>
  ${ladder.join("")}
  <animateTransform attributeName="transform" type="rotate" values="-4 ${cx} ${cy};4 ${cx} ${cy};-4 ${cx} ${cy}" dur="9s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
</g>
<animateTransform attributeName="transform" type="translate" values="0 ${f(pitch * 4 - 3)};0 ${f(pitch * 4 + 3)};0 ${f(pitch * 4 - 3)}" dur="6s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>
</g></g>
<rect x="${ax}" y="${ay}" width="${aw}" height="${ah}" rx="4" fill="none" stroke="${T.border}"/>
<path d="M${cx - 52},${cy}h28l10,10l10,-10h28" fill="none" stroke="${T.amber}" stroke-width="3" stroke-linejoin="round"/>
<rect x="${cx - 2}" y="${cy - 2}" width="4" height="4" fill="${T.amber}"/>`);

  // Bank scale.
  for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
    const [x1, y1] = polar(cx, cy, 76, a - 90), [x2, y2] = polar(cx, cy, a % 30 ? 81 : 85, a - 90);
    out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${T.text}" stroke-width="1"/>`);
  }

  // Vertical tapes; each slides up to its reading when the image loads.
  const tape = (tx, label, value, step, right) => {
    const tw = 40, mid = cy, px = 1.1, lines = [];
    const lo = Math.floor((value - 80 / px) / step) * step;
    for (let v = Math.max(0, lo); v <= value + 80 / px; v += step / 2) {
      const ty = mid - (v - value) * (40 / step);
      const major = !(v % step);
      lines.push(`<line x1="${right ? tx : tx + tw - (major ? 8 : 4)}" y1="${f(ty)}" x2="${right ? tx + (major ? 8 : 4) : tx + tw}" y2="${f(ty)}" stroke="${T.dim}"/>`);
      if (major) lines.push(text(right ? tx + 11 : tx + tw - 11, ty + 3, v, { size: 8, anchor: right ? "start" : "end", fill: T.dim }));
    }
    return `<clipPath id="tp${label}"><rect x="${tx}" y="${ay}" width="${tw}" height="${ah}"/></clipPath>
<rect x="${tx}" y="${ay}" width="${tw}" height="${ah}" fill="${T.bg}" stroke="${T.border}"/>
<g clip-path="url(#tp${label})"><g>${lines.join("")}
<animateTransform attributeName="transform" type="translate" from="0 -60" to="0 0" dur="2.5s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.3 1"/></g></g>
<path d="M${tx - (right ? 4 : 0)},${mid - 9}h${tw + 4}v18h${-tw - 4}z" fill="${T.bg}" stroke="${T.text}"/>
${text(tx + tw / 2, mid + 4, num(value), { size: 11, anchor: "middle", weight: 700 })}
${text(tx + tw / 2, ay - 6, label, { size: 9, anchor: "middle", fill: T.dim })}`;
  };
  out.push(tape(x + 14, "SPD", week, 10, false), tape(x + w - 54, "ALT", s.contributions, 100, true));

  // Flight mode annunciators along the top, destination along the bottom.
  const fma = [vs >= 0 ? "CLB" : "DES", "NAV", `VS ${vs >= 0 ? "+" : ""}${vs}%`];
  fma.forEach((m, i) => out.push(text(cx - 66 + i * 66, y + 36, m, { size: 10, anchor: "middle", fill: i === 2 ? T.amber : T.text })));
  out.push(text(cx, y + h - 16, `DEST ▸ ${trunc(s.repos.find((r) => r.name !== s.login)?.name || "—", 24).toUpperCase()}`, { size: 10, anchor: "middle", fill: T.amber }));
  out.push(text(x + 34, y + h - 16, "C/WK", { size: 8, anchor: "middle", fill: T.faint }),
    text(x + w - 34, y + h - 16, "C/YR", { size: 8, anchor: "middle", fill: T.faint }));
  return out.join("\n");
}

// Navigation display: radar scope with recently pushed repos as waypoints.
function nd(s, x, y) {
  const w = 320, h = 264, cx = x + w / 2, cy = y + 146, R = 104;
  const out = [panel(x, y, w, h, "ND · REPOS")];
  out.push(`<clipPath id="nd"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${T.bg}" stroke="${T.border}"/>`);
  for (const rr of [R / 3, (2 * R) / 3]) out.push(`<circle cx="${cx}" cy="${cy}" r="${f(rr)}" fill="none" stroke="${T.grid}" stroke-dasharray="2 3"/>`);

  // Compass rose.
  for (let a = 0; a < 360; a += 5) {
    const [x1, y1] = polar(cx, cy, R, a - 90), [x2, y2] = polar(cx, cy, R - (a % 30 ? 4 : 8), a - 90);
    out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${a % 30 ? T.faint : T.dim}"/>`);
    if (!(a % 30)) {
      const [lx, ly] = polar(cx, cy, R + 9, a - 90);
      out.push(text(lx, ly + 3, { 0: "N", 90: "E", 180: "S", 270: "W" }[a] ?? a / 10, { size: 8, anchor: "middle", fill: a % 90 ? T.faint : T.text }));
    }
  }

  // Sweep wedges, as on the radar scope.
  const wedges = [];
  for (let i = 0; i < 18; i++) {
    const [x0, y0] = polar(cx, cy, R, -i * 2.5), [x1, y1] = polar(cx, cy, R, -(i + 1) * 2.5);
    wedges.push(`<path d="M${cx},${cy}L${f(x0)},${f(y0)}A${R},${R} 0 0 0 ${f(x1)},${f(y1)}Z" fill="${T.text}" opacity="${f(0.16 * (1 - i / 18))}"/>`);
  }
  out.push(`<g clip-path="url(#nd)"><g>${wedges.join("")}<line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${T.text}" opacity="0.8"/>
<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="${SWEEP}s" repeatCount="indefinite"/></g></g>`);

  // Waypoints spiral outwards from the most recently pushed repo; bearing is nudged by the repo name.
  const now = Date.parse(s.generatedAt);
  const span = Math.max(1, ...s.repos.map((r) => (now - Date.parse(r.pushedAt)) / 864e5));
  const n = Math.max(s.repos.length - 1, 1);
  const pts = s.repos.map((r, i) => {
    const a = i * 137.5 + (hash(r.name) % 16) - 8 - 60;
    const [px, py] = polar(cx, cy, 30 + (R - 44) * (i / n), a);
    return { r, a: (a + 360) % 360, px, py };
  });
  out.push(`<polyline points="${[[cx, cy], ...pts.slice(0, 4).map((p) => [p.px, p.py])].map((p) => p.map(f).join(",")).join(" ")}" fill="none" stroke="${T.amber}" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"/>`);
  for (const [i, p] of pts.entries()) {
    const k = f(p.a / 360), k2 = f(Math.min(p.a / 360 + 0.12, 1));
    const col = i < 4 ? T.amber : T.text;
    out.push(`<path d="M${f(p.px)},${f(p.py - 4)}l4,4l-4,4l-4,-4z" fill="${T.bg}" stroke="${col}" stroke-width="1.2">` +
      `<animate attributeName="fill" values="${T.bg};${T.bg};${col};${T.bg};${T.bg}" keyTimes="0;${k};${f(Math.min(p.a / 360 + 0.01, 1))};${k2};1" dur="${SWEEP}s" repeatCount="indefinite"/></path>`);
    const left = p.px < cx;
    const label = trunc(p.r.name, 16) + (p.r.stars ? ` ★${p.r.stars}` : "");
    out.push(text(p.px + (left ? -7 : 7), p.py + 3, label, { size: 8, anchor: left ? "end" : "start", fill: col, opacity: i < 4 ? "" : "0.75" }));
  }

  // Ownship: the B-2 from Flight Path Radar, nose up.
  out.push(`<g transform="translate(${cx} ${cy}) rotate(-90) scale(1.1)"><path d="M9,0 L-3,13 L-6,10.5 L-3,7 L-6,3.5 L-4,0 L-6,-3.5 L-3,-7 L-6,-10.5 L-3,-13 Z" fill="${T.plane}" stroke="${T.text}" stroke-width="0.8" stroke-linejoin="round"/></g>`);
  out.push(text(x + 12, y + 32, `TRK ${String(Math.round(pts[0]?.a + 90 || 0) % 360).padStart(3, "0")}°`, { size: 10 }),
    text(x + w - 12, y + 32, `RNG ${Math.round(span)}D`, { size: 10, anchor: "end" }),
    text(x + w - 12, y + 16, `WPT ${s.repos.length}`, { size: 10, anchor: "end", fill: T.dim }));
  return out.join("\n");
}

// Engine indication: languages as N1 bars.
function eicas(s, x, y) {
  const w = 256, h = 264, out = [panel(x, y, w, h, "EICAS · LANGUAGES")];
  const langs = s.languages.slice(0, 8), top = langs[0]?.pct || 1;
  langs.forEach((l, i) => {
    const ly = y + 40 + i * 25, bw = 108, fill = Math.max(2, (l.pct / top) * bw);
    out.push(`<circle cx="${x + 18}" cy="${ly - 3}" r="3.5" fill="${l.color || T.dim}"/>`,
      text(x + 28, ly, trunc(l.name, 11).toUpperCase(), { size: 10, fill: i ? T.text : T.amber }),
      `<rect x="${x + 104}" y="${ly - 9}" width="${bw}" height="10" fill="${T.bg}" stroke="${T.grid}"/>`,
      `<rect x="${x + 104}" y="${ly - 9}" width="${f(fill)}" height="10" fill="${i ? T.dim : T.amber}" opacity="0.85"><animate attributeName="width" from="0" to="${f(fill)}" dur="${f(1.2 + i * 0.15)}s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.3 1"/></rect>`,
      text(x + w - 12, ly, `${(l.pct * 100).toFixed(1)}`, { size: 10, anchor: "end", weight: 700 }));
  });
  const bytes = s.languages.reduce((a, l) => a + l.size, 0);
  out.push(`<line x1="${x + 12}" y1="${y + h - 30}" x2="${x + w - 12}" y2="${y + h - 30}" stroke="${T.grid}"/>`,
    text(x + 12, y + h - 13, `FUEL ${(bytes / 1e6).toFixed(1)} MB`, { size: 10, fill: T.dim }),
    text(x + w - 12, y + h - 13, `${s.languages.length} ENG`, { size: 10, anchor: "end", fill: T.dim }));
  return out.join("\n");
}

// Round steam gauge with a needle that swings to its reading.
function gauge(cx, cy, label, value, i) {
  const r = 44, max = niceMax(value), a0 = 150, sweep = 240, out = [];
  out.push(`<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${T.bg}" stroke="${T.border}"/>`);
  for (let t = 0; t <= 10; t++) {
    const a = a0 + (sweep * t) / 10, [x1, y1] = polar(cx, cy, r, a), [x2, y2] = polar(cx, cy, r - (t % 5 ? 4 : 8), a);
    out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${t > 8 ? T.amber : T.dim}" stroke-width="${t % 5 ? 1 : 1.5}"/>`);
  }
  const [s1x, s1y] = polar(cx, cy, r - 1, a0 + sweep * 0.8), [s2x, s2y] = polar(cx, cy, r - 1, a0 + sweep);
  out.push(`<path d="M${f(s1x)},${f(s1y)}A${r - 1},${r - 1} 0 0 1 ${f(s2x)},${f(s2y)}" fill="none" stroke="${T.amber}" stroke-width="2" opacity="0.6"/>`);
  const ang = a0 + sweep * Math.min(value / max, 1);
  out.push(`<g><path d="M${cx - 2},${cy}L${cx + r - 10},${cy}" stroke="${T.text}" stroke-width="2" stroke-linecap="round"/>` +
    `<animateTransform attributeName="transform" type="rotate" values="${a0} ${cx} ${cy};${f(ang + 6)} ${cx} ${cy};${f(ang)} ${cx} ${cy}" keyTimes="0;0.7;1" dur="${f(1.8 + i * 0.2)}s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.4 1;0.4 0 0.6 1"/></g>`,
    `<circle cx="${cx}" cy="${cy}" r="4" fill="${T.panel}" stroke="${T.text}"/>`,
    text(cx, cy + 24, num(value), { size: 13, anchor: "middle", weight: 700 }),
    text(cx, cy + r + 18, label, { size: 9, anchor: "middle", fill: T.dim, extra: ` letter-spacing="1"` }));
  return out.join("");
}

function instruments(s, x, y) {
  const w = 456, h = 252, out = [panel(x, y, w, h, "INSTRUMENTS")];
  [["STARS", s.stars], ["CREW", s.followers], ["REPOS", s.repoCount], ["COMMITS/YR", s.commits]]
    .forEach(([l, v], i) => out.push(gauge(x + 60 + i * 112, y + 76, l, v, i)));

  // Vertical situation display: weekly contributions over the year as a climb profile.
  const weeks = [];
  for (let i = 0; i < s.days.length; i += 7) weeks.push(s.days.slice(i, i + 7).reduce((a, b) => a + b, 0));
  const vx = x + 14, vy = y + 168, vw = w - 28, vh = 64, top = Math.max(...weeks, 1);
  const pts = weeks.map((v, i) => [vx + (i / (weeks.length - 1)) * vw, vy + vh - (v / top) * (vh - 8)]);
  const line = pts.map((p) => p.map(f).join(",")).join(" ");
  out.push(text(vx, vy - 4, "VSD · WEEKLY CLIMB", { size: 8, fill: T.faint }),
    text(vx + vw, vy - 4, `PEAK ${top}/WK`, { size: 8, anchor: "end", fill: T.faint }),
    `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${T.bg}" stroke="${T.grid}"/>`,
    `<clipPath id="vsd"><rect x="${vx}" y="${vy}" width="0" height="${vh}"><animate attributeName="width" from="0" to="${vw}" dur="3s" fill="freeze"/></rect></clipPath>`,
    `<g clip-path="url(#vsd)"><polygon points="${f(vx)},${vy + vh} ${line} ${f(vx + vw)},${vy + vh}" fill="${T.text}" opacity="0.12"/>` +
    `<polyline points="${line}" fill="none" stroke="${T.text}" stroke-width="1.2" stroke-linejoin="round"/></g>`);
  const [lx, ly] = pts[pts.length - 1];
  out.push(`<circle cx="${f(lx)}" cy="${f(ly)}" r="3" fill="${T.amber}"><animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"/></circle>`);
  return out.join("\n");
}

// Duty cycle: activity by hour of day on a 24h clock face.
function duty(s, x, y) {
  const w = 200, h = 252, cx = x + w / 2, cy = y + 128, r0 = 26, r1 = 82, out = [panel(x, y, w, h, "DUTY CYCLE")];
  const top = Math.max(...s.hours, 1);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${r1}" fill="${T.bg}" stroke="${T.grid}"/>`, `<circle cx="${cx}" cy="${cy}" r="${r0}" fill="none" stroke="${T.grid}"/>`);
  s.hours.forEach((v, hr) => {
    const a = hr * 15 - 90, len = r0 + 2 + (v / top) * (r1 - r0 - 6);
    const [x1, y1] = polar(cx, cy, r0 + 2, a), [x2, y2] = polar(cx, cy, len, a);
    if (v) out.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${v === top ? T.amber : T.text}" stroke-width="5" stroke-linecap="round" opacity="${f(0.45 + 0.55 * (v / top))}"/>`);
    if (!(hr % 6)) { const [lx, ly] = polar(cx, cy, r1 + 9, a); out.push(text(lx, ly + 3, String(hr).padStart(2, "0"), { size: 8, anchor: "middle", fill: T.dim })); }
  });
  const peak = s.hours.indexOf(top);
  out.push(text(cx, cy - 2, String(peak).padStart(2, "0") + "00", { size: 11, anchor: "middle", weight: 700, fill: T.amber }),
    text(cx, cy + 10, "PEAK", { size: 7, anchor: "middle", fill: T.dim }),
    text(cx, y + h - 12, s.timeZone === "UTC" ? "UTC" : s.timeZone.split("/").pop().replace(/_/g, " ").toUpperCase(), { size: 8, anchor: "middle", fill: T.faint }));
  return out.join("\n");
}

// ATC-style log of the latest public events.
function atc(s, x, y) {
  const w = 240, h = 252, out = [panel(x, y, w, h, "ATC LOG")];
  const short = { Push: "PUSH", Release: "REL", Create: "NEW", PullRequest: "PR", Issues: "ISSUE", Watch: "STAR", Fork: "FORK", IssueComment: "COMM", Delete: "DEL" };
  s.log.forEach((e, i) => {
    const ly = y + 38 + i * 30, t = new Date(e.at).toISOString().slice(11, 16).replace(":", "") + "Z";
    out.push(`<g opacity="0">${text(x + 12, ly, t, { size: 10, fill: T.dim })}` +
      text(x + 58, ly, short[e.type] || e.type.toUpperCase().slice(0, 5), { size: 10, fill: T.amber, weight: 700 }) +
      text(x + w - 12, ly, trunc(e.detail.replace(/ commit\(s\)/, (m) => (e.detail.startsWith("1 ") ? " COMMIT" : " COMMITS")), 10).toUpperCase(), { size: 9, anchor: "end", fill: T.faint }) +
      text(x + 12, ly + 12, trunc(e.repo.split("/").pop(), 34), { size: 9 }) +
      `<animate attributeName="opacity" from="0" to="1" begin="${f(0.3 + i * 0.25)}s" dur="0.2s" fill="freeze"/></g>`);
  });
  out.push(`<rect x="${x + 12}" y="${y + h - 18}" width="7" height="10" fill="${T.text}"><animate attributeName="opacity" values="1;0;1" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect>`);
  return out.join("\n");
}

function annunciators(s, y) {
  const since = new Date(s.createdAt).getUTCFullYear();
  const sync = s.generatedAt.slice(0, 16).replace("T", " ") + "Z";
  const lamps = [["SYS NOMINAL", true], ["AUTOPILOT", true], [`PR ${num(s.pullRequests)}`, false], [`ISSUES ${num(s.issues)}`, false],
    [`FORKS ${num(s.forks)}`, false], [`IN SERVICE ${since}`, false], [`SYNC ${sync}`, false]];
  let x = 16;
  return lamps.map(([l, lit]) => {
    const w = l.length * 6.6 + 18, g = `<rect x="${f(x)}" y="${y}" width="${f(w)}" height="20" rx="3" fill="${lit ? "#0b3a1f" : T.panel}" stroke="${lit ? T.text : T.border}"/>` +
      text(x + w / 2, y + 14, l, { size: 10, anchor: "middle", fill: lit ? T.text : T.dim, weight: lit ? 700 : "",
        children: l === "SYS NOMINAL" ? `<animate attributeName="opacity" values="1;0.55;1" dur="2.4s" repeatCount="indefinite"/>` : "" });
    x += w + 8;
    return g;
  }).join("\n");
}

export function buildSvg(s) {
  const header = [
    text(16, 34, "COCKPIT TELEMETRY", { size: 18, weight: 700, extra: ` letter-spacing="3"` }),
    text(286, 34, `CALLSIGN ${s.login.toUpperCase()}`, { size: 11, fill: T.amber, extra: ` letter-spacing="1.5"` }),
    `<text x="${W - 16}" y="34" font-size="14" fill="${T.text}" text-anchor="end">${esc(s.name)}</text>`,
    `<line x1="16" y1="46" x2="${W - 16}" y2="46" stroke="${T.border}"/>`,
  ].join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}">
<title>Cockpit Telemetry: ${esc(s.login)}</title>
<rect width="${W}" height="${H}" rx="10" fill="${T.bg}"/>
${header}
${pfd(s, 16, 56)}
${nd(s, 352, 56)}
${eicas(s, 688, 56)}
${instruments(s, 16, 332)}
${duty(s, 488, 332)}
${atc(s, 704, 332)}
${annunciators(s, 596)}
</svg>`;
}
