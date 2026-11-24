/* CoolMap Global — with theme, weather icons, layers, satellite, popular chips */
import { loadEarthquakes, loadCyclones } from "./layers.js";

const $ = (id) => document.getElementById(id);
const S = {
  map: null, marker: null, dots: [], place: null, w: null, aq: null,
  unit: "C", items: null, A: null, B: null, cmp: null,
  layers: { quakes: null, cyclones: null },
  baseLayer: null, baseLayers: null, satellite: false,
};
const COL = ["#4cc9f0", "#ffb454"];

const CITIES = [
  ["Hyderabad", 17.385, 78.4867], ["Delhi", 28.6139, 77.209], ["Dubai", 25.2048, 55.2708],
  ["Singapore", 1.3521, 103.8198], ["Cairo", 30.0444, 31.2357], ["London", 51.5072, -0.1276],
  ["New York", 40.7128, -74.006], ["Phoenix", 33.4484, -112.074], ["São Paulo", -23.5505, -46.6333],
  ["Lagos", 6.5244, 3.3792], ["Tokyo", 35.6762, 139.6503], ["Sydney", -33.8688, 151.2093],
];
const LEVELS = [
  [41, "Extreme", "#ff2d55"], [35, "High", "#ff5a5f"], [30, "Elevated", "#ff9f43"],
  [27, "Moderate", "#ffd83d"], [0, "Comfortable", "#3ddc84"], [-99, "Cold", "#5ab4ff"],
];
const risk = (t) => LEVELS.find((l) => t >= l[0]);
const WX = { 0: ["☀️", "Clear sky"], 1: ["🌤️", "Mostly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️", "Overcast"], 45: ["🌫️", "Fog"], 51: ["🌦️", "Drizzle"], 61: ["🌧️", "Rain"], 71: ["🌨️", "Snow"], 80: ["🌦️", "Showers"], 95: ["⛈️", "Thunderstorm"] };
const wx = (c) => WX[c] || (c >= 95 ? WX[95] : c >= 80 ? WX[80] : c >= 71 ? WX[71] : c >= 61 ? WX[61] : c >= 51 ? WX[51] : c >= 45 ? WX[45] : ["☁️", "Cloudy"]);

function weatherEmoji(code, tempC) {
  if (tempC <= -20) return "🧊";
  if (tempC <= 0 && code >= 71) return "❄️";
  if (tempC >= 41) return "🌡️";
  if (code >= 95) return "⛈️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 51 && code <= 67) return "🌧️";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code === 3) return "☁️";
  if (code === 2) return "⛅";
  if (code === 0 || code === 1) return "☀️";
  return "☁️";
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const T = (c) => (S.unit === "C" ? `${c.toFixed(1)}°C` : `${(c * 9 / 5 + 32).toFixed(1)}°F`);
const dT = (c) => (S.unit === "C" ? c : c * 9 / 5);
const aqiLabel = (a) => (a <= 50 ? "Good" : a <= 100 ? "Moderate" : a <= 150 ? "Poor for some" : a <= 200 ? "Poor" : "Very poor");
const uvLabel = (u) => (u < 3 ? "Low" : u < 6 ? "Moderate" : u < 8 ? "High" : u < 11 ? "Very high" : "Extreme");
const city = (o) => ({ name: o.c[0], sub: "Featured city", lat: o.c[1], lon: o.c[2] });

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.add("hidden"), 2200);
}

/* ---------- theme ---------- */
function applyTheme(mode) {
  document.documentElement.setAttribute("data-theme", mode);
  const btn = $("theme");
  if (btn) btn.textContent = mode === "day" ? "☀️" : "🌙";
}
function pickThemeByTime() {
  const h = new Date().getHours();
  return (h >= 7 && h < 18) ? "day" : "night";
}
function initTheme() {
  const saved = localStorage.getItem("cm_theme");
  applyTheme(saved || pickThemeByTime());
}
$("theme").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "day" ? "night" : "day";
  applyTheme(next);
  localStorage.setItem("cm_theme", next);
});
initTheme();
setInterval(() => {
  if (!localStorage.getItem("cm_theme")) applyTheme(pickThemeByTime());
}, 15 * 60 * 1000);

/* ---------- share links ---------- */
const base = () => location.href.split(/[?#]/)[0];
const enc = (p) => encodeURIComponent([p.name, p.lat.toFixed(4), p.lon.toFixed(4), p.sub || ""].join("|"));
const dec = (s) => { const [name, la, lo, sub] = s.split("|"); return { name, lat: +la, lon: +lo, sub: sub || "" }; };
const linkFor = (k) => (k === "p" ? `${base()}?p=${enc(S.place)}` : `${base()}?c=${enc(S.cmp.A)}&d=${enc(S.cmp.B)}`);
const setUrl = (u) => { try { history.replaceState(null, "", u); } catch {} };
async function copyLink(url) {
  try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { prompt("Copy this link:", url); }
}

/* ---------- navigation ---------- */
const VIEWS = { home: "home", map: "mapView", compare: "cmpView" };
function go(v) {
  Object.entries(VIEWS).forEach(([k, id]) => $(id).classList.toggle("hidden", k !== v));
  document.querySelectorAll(".nav").forEach((b) => b.classList.toggle("active", b.dataset.go === v));
  if (v === "map") { initMap(); S.map.invalidateSize(); setTimeout(() => S.map.invalidateSize(), 80); }
  if (v === "home") setUrl(base());
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
const openPlace = (p) => { go("map"); load(p); };

/* popular city chips */
document.querySelectorAll("#popular button[data-city]").forEach((b) => {
  b.addEventListener("click", () => {
    openPlace({
      name: b.dataset.city,
      sub: "Popular city",
      lat: Number(b.dataset.lat),
      lon: Number(b.dataset.lon),
    });
  });
});

/* ---------- map ---------- */
function initMap() {
  if (S.map) return;
  S.map = L.map("map", { worldCopyJump: true, minZoom: 2 }).setView([20, 30], 2);

  S.baseLayers = {
    street: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    streetAttr: "&copy; OpenStreetMap contributors",
    satAttr: "&copy; Esri, Maxar, Earthstar Geographics",
  };
  S.satellite = false;
  S.baseLayer = L.tileLayer(S.baseLayers.street, { maxZoom: 19, attribution: S.baseLayers.streetAttr }).addTo(S.map);

  S.map.on("click", async (e) => {
    const { lat, lng } = e.latlng, lon = ((lng + 540) % 360) - 180;
    const p = { name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`, sub: "Dropped pin", lat, lon };
    load(p);
    const n = await reverseName(lat, lon);
    if (n && S.place === p) { p.name = n.name; p.sub = n.sub; renderHead(); }
  });

  $("legend").innerHTML = LEVELS.slice(0, 5).reverse().map((l) => `<span><i style="background:${l[2]}"></i>${l[1]}</span>`).join("");
  drawDots();
}
function toggleSatellite() {
  if (!S.map) return;
  S.satellite = !S.satellite;
  $("toggleSatellite").classList.toggle("on", S.satellite);

  if (S.baseLayer) S.map.removeLayer(S.baseLayer);
  const url = S.satellite ? S.baseLayers.satellite : S.baseLayers.street;
  const attr = S.satellite ? S.baseLayers.satAttr : S.baseLayers.streetAttr;
  S.baseLayer = L.tileLayer(url, { maxZoom: 19, attribution: attr }).addTo(S.map);
}
function drawDots() {
  if (!S.map || !S.items) return;
  S.dots.forEach((l) => S.map.removeLayer(l));
  S.dots = S.items.map((o) => {
    const rk = risk(o.t);
    const emoji = weatherEmoji(o.code, o.tempC ?? o.t);
    const icon = L.divIcon({
      html: `<div class="wx-marker" style="border-color:${rk[2]}">${emoji}</div>`,
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    return L.marker([o.c[1], o.c[2]], { icon, bubblingMouseEvents: false })
      .addTo(S.map)
      .bindTooltip(`${o.c[0]}: ${T(o.t)} · ${emoji}`, { direction: "top" })
      .on("click", () => load(city(o)));
  });
}
async function reverseName(lat, lon) {
  try {
    const j = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`)).json();
    const a = j.address; if (!a) return null;
    return { name: a.city || a.town || a.village || a.county || a.state || "Selected point", sub: [a.state, a.country].filter(Boolean).join(", ") };
  } catch { return null; }
}

/* ---------- search ---------- */
function bindSearch(inId, boxId, pick) {
  const inp = $(inId), box = $(boxId); let d;
  inp.addEventListener("input", () => {
    clearTimeout(d); const v = inp.value.trim();
    if (v.length < 2) return box.classList.add("hidden");
    d = setTimeout(() => suggest(v, inp, box, pick), 250);
  });
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = box.querySelector("button[data-i]"); if (b) b.click(); } });
  document.addEventListener("click", (e) => { if (e.target !== inp && !box.contains(e.target)) box.classList.add("hidden"); });
}
async function suggest(v, inp, box, pick) {
  try {
    const j = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(v)}&count=6&language=en&format=json`)).json();
    if (!j.results) { box.innerHTML = `<button disabled>No place found. Try another spelling.</button>`; return box.classList.remove("hidden"); }
    const sub = (p) => [p.admin1, p.country].filter(Boolean).join(", ");
    box.innerHTML = j.results.map((p, i) => `<button type="button" data-i="${i}">${esc(p.name)} <small>${esc(sub(p))}</small></button>`).join("");
    box.classList.remove("hidden");
    box.querySelectorAll("button[data-i]").forEach((b) => b.addEventListener("click", () => {
      const p = j.results[b.dataset.i]; inp.value = p.name; box.classList.add("hidden");
      pick({ name: p.name, sub: sub(p), lat: p.latitude, lon: p.longitude });
    }));
  } catch { box.classList.add("hidden"); }
}
bindSearch("q", "sugg", openPlace);
bindSearch("q2", "sugg2", (p) => load(p));
bindSearch("qa", "sa", (p) => (S.A = p));
bindSearch("qb", "sb", (p) => (S.B = p));

/* ---------- live data ---------- */
async function fetchPlace(p) {
  const w = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,uv_index,precipitation,weather_code&hourly=apparent_temperature&forecast_days=2&timezone=auto`;
  const a = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${p.lat}&longitude=${p.lon}&current=us_aqi,pm2_5&timezone=auto`;
  const [wd, aq] = await Promise.all([
    fetch(w).then((r) => { if (!r.ok) throw 0; return r.json(); }),
    fetch(a).then((r) => r.json()).catch(() => null),
  ]);
  return { w: wd, aq };
}
function setMarker(p) {
  if (S.marker) S.map.removeLayer(S.marker);
  S.marker = L.marker([p.lat, p.lon]).addTo(S.map);
  S.map.flyTo([p.lat, p.lon], Math.max(S.map.getZoom(), 8), { duration: 0.8 });
}
async function load(p) {
  S.place = p; S.w = null; setMarker(p);
  $("empty").classList.add("hidden"); $("report").classList.remove("hidden");
  $("feels").textContent = "…"; $("aiOut").textContent = "Pick a report or ask a question below.";
  renderHead();
  try { const d = await fetchPlace(p); if (S.place !== p) return; S.w = d.w; S.aq = d.aq; render(); }
  catch { $("feels").textContent = "n/a"; $("wxText").textContent = "Live data could not be loaded. Check your connection."; }
}
function renderHead() {
  const p = S.place;
  $("pName").textContent = p.name;
  $("pSub").textContent = `${p.sub ? p.sub + " · " : ""}${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}`;
  setUrl(linkFor("p"));
}
function render() {
  const c = S.w.current, rk = risk(c.apparent_temperature), [icon, text] = wx(c.weather_code), aqi = S.aq?.current?.us_aqi;

  const tempEmoji = c.apparent_temperature >= 41 ? "🔥"
    : c.apparent_temperature >= 35 ? "🌡️"
    : c.apparent_temperature >= 27 ? "☀️"
    : c.apparent_temperature >= 10 ? "🌤️"
    : c.apparent_temperature >= 0  ? "❄️"
    : "🧊";
  $("feels").textContent = `${tempEmoji} ${T(c.apparent_temperature)}`;

  const isCold = c.apparent_temperature < 10;
  $("badge").textContent = isCold ? `${rk[1]} conditions` : `${rk[1]} heat risk`;
  $("badge").style.background = rk[2];

  $("wxText").textContent = `${icon} ${text}`;
  $("actual").textContent = `Air temperature ${T(c.temperature_2m)}`;
  $("stamp").textContent = `Local time ${c.time.replace("T", " ")}`;
  $("metrics").innerHTML = [
    ["Humidity", `${Math.round(c.relative_humidity_2m)}%`], ["Wind", `${c.wind_speed_10m.toFixed(0)} km/h`],
    ["UV index", `${c.uv_index.toFixed(1)} · ${uvLabel(c.uv_index)}`],
    ["Air quality", aqi == null ? "n/a" : `${Math.round(aqi)} · ${aqiLabel(aqi)}`], ["Rain now", `${c.precipitation} mm`],
  ].map(([k, v]) => `<div class="m"><span>${k}</span><b>${v}</b></div>`).join("");

  const n = next24(S.w);
  drawLines($("chart"), [{ v: n.v, color: null }], n.t.map((x) => x.slice(11, 16)));
  simulate();
}
function next24(w) {
  const h = w.hourly, i = Math.max(0, h.time.findIndex((t) => t >= w.current.time));
  return { t: h.time.slice(i, i + 24), v: h.apparent_temperature.slice(i, i + 24) };
}

/* ---------- chart ---------- */
function drawLines(cv, series, labels) {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = +cv.getAttribute("height");
  if (!W) return;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr);
  const n = Math.min(...series.map((s) => s.v.length)), all = series.flatMap((s) => s.v.slice(0, n));
  if (n < 2) return;
  const min = Math.min(...all) - 1, max = Math.max(...all) + 1, px = 34, py = 12;
  const X = (i) => px + (i / (n - 1)) * (W - px - 8), Y = (x) => H - 22 - ((x - min) / (max - min)) * (H - 22 - py);
  g.font = "11px Inter, sans-serif";
  [min + 1, (min + max) / 2, max - 1].forEach((x) => {
    g.strokeStyle = "#263452"; g.lineWidth = 1; g.beginPath(); g.moveTo(px, Y(x)); g.lineTo(W - 8, Y(x)); g.stroke();
    g.fillStyle = "#8b9ab8"; g.fillText(Math.round(S.unit === "C" ? x : (x * 9) / 5 + 32), 4, Y(x) + 4);
  });
  for (let i = 0; i < n; i += 6) g.fillText(labels[i], X(i) - 12, H - 6);
  series.forEach((s) => {
    const v = s.v.slice(0, n); let st = s.color;
    if (!st) { st = g.createLinearGradient(px, 0, W, 0); v.forEach((x, i) => st.addColorStop(i / (n - 1), risk(x)[2])); }
    g.strokeStyle = st; g.lineWidth = 3; g.lineJoin = "round"; g.beginPath();
    v.forEach((x, i) => (i ? g.lineTo(X(i), Y(x)) : g.moveTo(X(i), Y(x)))); g.stroke();
    const pk = v.indexOf(Math.max(...v)); g.fillStyle = "#fff"; g.beginPath(); g.arc(X(pk), Y(v[pk]), 4, 0, 7); g.fill();
  });
}

/* ---------- tree simulator ---------- */
function simulate() {
  if (!S.w) return;
  const n = Number($("trees").value), m = n / 1000, base0 = S.w.current.apparent_temperature;
  const lo = Math.min(2, 0.5 * m), hi = Math.min(3, 1.5 * m);
  $("treeN").textContent = n.toLocaleString("en-IN");
  $("simOut").textContent = `Feels like ${T(base0 - hi)} to ${T(base0 - lo)} (cooling about ${dT(lo).toFixed(1)} to ${dT(hi).toFixed(1)}°${S.unit})`;
}
$("trees").addEventListener("input", simulate);

/* ---------- AI ---------- */
const TASK = {
  brief: "Write a 5-line heat briefing: current situation, who is most at risk, the next 24h trend, one air-quality note, one action for today.",
  plan: "Act as an urban planner. Give 3 quick wins (under 3 months) and 3 long-term cooling actions tied to the data. Mention the tree simulator result.",
  safety: "Give personal safety advice for today: hydration, best and worst hours outdoors (use the hourly data), clothing, and warning signs of heat illness.",
  compare: "Compare place a and place b: which is riskier now and later today, who should take care in each, and one action for each. Use the numbers.",
};

function ctxOf(p, w, aq, trees) {
  const c = w.current, n = next24(w);
  const o = { place: p.name, region: p.sub, localTime: c.time, feelsLikeC: c.apparent_temperature, airTempC: c.temperature_2m, humidityPct: c.relative_humidity_2m, windKmh: c.wind_speed_10m, uvIndex: c.uv_index, rainMm: c.precipitation, riskLevel: risk(c.apparent_temperature)[1], usAqi: aq?.current?.us_aqi ?? null, next24hFeelsLikeC: n.v.map((x, i) => `${n.t[i].slice(11, 16)}=${x}`) };
  if (trees) o.treeSimulator = { trees, coolingRangeC: [Math.min(2, (0.5 * trees) / 1000), Math.min(3, (1.5 * trees) / 1000)] };
  return o;
}

async function callAI(mode, question, ctx) {
  const r = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, question, context: ctx }),
  });
  if (!(r.headers.get("content-type") || "").includes("json")) {
    throw new Error("no AI server found — run npm start and open http://localhost:3000");
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || "AI request failed");
  return j.text;
}

async function runAI(out, mode, q, ctx, fb) {
  out.textContent = "Analysing live data…";
  let t;
  try { t = await callAI(mode, q, ctx); }
  catch (e) { t = `${fb()}\n\nAI is offline (${e.message}).`; }
  out.innerHTML = esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
}

const TIPS = { Extreme: "Avoid outdoor activity from late morning to evening. Check on elderly neighbours.", High: "Limit outdoor work to early morning and evening. Drink water every 20 minutes.", Elevated: "Take shade breaks and drink water regularly.", Moderate: "Normal activity is fine with water and sun protection.", Comfortable: "Comfortable conditions. No special heat precautions.", Cold: "Dress in layers." };
const fbPlace = (x) => `**Summary**\n${x.place} feels like ${x.feelsLikeC}°C (${x.riskLevel} risk).\n\n**Advice**\n${TIPS[x.riskLevel]}`;
const fbCmp = (a, b) => { const h = a.feelsLikeC >= b.feelsLikeC ? [a, b] : [b, a]; return `**Summary**\n${h[0].place} feels ${(h[0].feelsLikeC - h[1].feelsLikeC).toFixed(1)}°C hotter than ${h[1].place} (${h[0].riskLevel} vs ${h[1].riskLevel} risk).`; };

const ask = (mode, q = "") => { if (!S.w) return; const x = ctxOf(S.place, S.w, S.aq, Number($("trees").value)); runAI($("aiOut"), mode, q, x, () => fbPlace(x)); };
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => ask(b.dataset.mode)));
$("aiGo").addEventListener("click", () => { const q = $("aiQ").value.trim(); if (q) ask("question", q); });
$("aiQ").addEventListener("keydown", (e) => { if (e.key === "Enter") $("aiGo").click(); });

/* ---------- compare ---------- */
async function runCompare() {
  const A = S.A, B = S.B;
  if (!A || !B) return toast("Pick both places from the suggestions");
  $("cmpOut").classList.remove("hidden"); $("verdict").textContent = "Loading live data…"; $("cmpCards").innerHTML = "";
  try { const [a, b] = await Promise.all([fetchPlace(A), fetchPlace(B)]); S.cmp = { A, B, a, b }; renderCmp(); }
  catch { $("verdict").textContent = "Could not load live data. Check your connection and try again."; }
}
const card = (p, d, i) => {
  const c = d.w.current, rk = risk(c.apparent_temperature), aq = d.aq?.current?.us_aqi;
  return `<div class="cc" style="border-top:4px solid ${COL[i]}"><h3>${esc(p.name)}</h3><div class="muted small">${esc(p.sub || "")}</div>
  <div class="feels sm">${T(c.apparent_temperature)}</div><span class="badge" style="background:${rk[2]}">${rk[1]} heat risk</span>
  <div class="rows"><p><span>Air temperature</span><b>${T(c.temperature_2m)}</b></p><p><span>Humidity</span><b>${Math.round(c.relative_humidity_2m)}%</b></p>
  <p><span>Wind</span><b>${c.wind_speed_10m.toFixed(0)} km/h</b></p><p><span>UV index</span><b>${c.uv_index.toFixed(1)} · ${uvLabel(c.uv_index)}</b></p>
  <p><span>Air quality</span><b>${aq == null ? "n/a" : Math.round(aq) + " · " + aqiLabel(aq)}</b></p></div></div>`;
};
function drawCmpChart() {
  const { A, B, a, b } = S.cmp;
  const va = next24(a.w).v, vb = next24(b.w).v;
  drawLines($("cchart"), [{ v: va, color: COL[0] }, { v: vb, color: COL[1] }], va.map((_, i) => (i ? `+${i}h` : "now")));
  $("clegend").innerHTML = [A, B].map((p, i) => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COL[i]};margin-right:6px"></i>${esc(p.name)}</span>`).join("");
}
function renderCmp() {
  const { A, B, a, b } = S.cmp, fa = a.w.current.apparent_temperature, fb = b.w.current.apparent_temperature, d = Math.abs(fa - fb);
  const [hot, cold] = fa >= fb ? [A, B] : [B, A];
  $("verdict").innerHTML = d < 0.5 ? `${esc(A.name)} and ${esc(B.name)} feel about the same right now.` : `<b>${esc(hot.name)}</b> feels <b>${dT(d).toFixed(1)}°${S.unit} hotter</b> than ${esc(cold.name)} right now.`;
  $("cmpCards").innerHTML = card(A, a, 0) + card(B, b, 1);
  drawCmpChart();
  $("cAi").textContent = "Ask the AI which place is riskier and why.";
  setUrl(linkFor("c"));
}
$("cmpGo").addEventListener("click", runCompare);
$("cAiGo").addEventListener("click", () => {
  if (!S.cmp) return;
  const { A, B, a, b } = S.cmp, x = { a: ctxOf(A, a.w, a.aq), b: ctxOf(B, b.w, b.aq) };
  runAI($("cAi"), "compare", "", x, () => fbCmp(x.a, x.b));
});
$("cShare").addEventListener("click", () => S.cmp && copyLink(linkFor("c")));
$("share").addEventListener("click", () => S.place && copyLink(linkFor("p")));
$("toCmp").addEventListener("click", () => { S.A = S.place; $("qa").value = S.place.name; go("compare"); $("qb").focus(); });

/* ---------- home ticker ---------- */
async function loadTicker() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITIES.map((c) => c[1])}&longitude=${CITIES.map((c) => c[2])}&current=apparent_temperature,weather_code,temperature_2m,is_day&timezone=auto`;
    const res = await (await fetch(url)).json();
    S.items = (Array.isArray(res) ? res : [res]).map((r, i) => ({
      c: CITIES[i],
      t: r.current.apparent_temperature,
      code: r.current.weather_code,
      tempC: r.current.temperature_2m,
      isDay: r.current.is_day,
    })).sort((a, b) => b.t - a.t);
    renderTicker();
  } catch { $("ticker").textContent = "Live ticker unavailable right now."; }
}
function renderTicker() {
  if (!S.items) return;
  $("ticker").innerHTML = S.items.map((o, i) => `<button class="t" data-i="${i}"><span>${esc(o.c[0])}</span><b style="color:${risk(o.t)[2]}">${T(o.t)}</b></button>`).join("");
  $("bar").innerHTML = S.items.map((o, i) => `<button class="dot" data-i="${i}" style="left:${Math.min(98, Math.max(2, ((o.t + 10) / 60) * 100))}%;border-color:${risk(o.t)[2]}" title="${esc(o.c[0])} ${T(o.t)}"></button>`).join("");
  document.querySelectorAll("#ticker .t,#bar .dot").forEach((b) => b.addEventListener("click", () => openPlace(city(S.items[b.dataset.i]))));
  drawDots();
}

/* ---------- optional map layers ---------- */
async function toggleQuakes() {
  const btn = $("toggleQuakes");
  if (!S.map) return;
  if (S.layers.quakes) {
    S.map.removeLayer(S.layers.quakes); S.layers.quakes = null;
    btn.classList.remove("on"); $("layerInfo").textContent = "";
    return;
  }
  btn.classList.add("on"); $("layerInfo").textContent = "Loading earthquakes…";
  try {
    S.layers.quakes = await loadEarthquakes(S.map);
    $("layerInfo").textContent = "Showing M4.5+ earthquakes from the past 24h · USGS";
  } catch { btn.classList.remove("on"); $("layerInfo").textContent = "Earthquake data unavailable right now."; }
}
async function toggleCyclones() {
  const btn = $("toggleCyclones");
  if (!S.map) return;
  if (S.layers.cyclones) {
    S.map.removeLayer(S.layers.cyclones); S.layers.cyclones = null;
    btn.classList.remove("on"); $("layerInfo").textContent = "";
    return;
  }
  btn.classList.add("on"); $("layerInfo").textContent = "Loading cyclone tracks…";
  try {
    const { group, count } = await loadCyclones(S.map);
    S.layers.cyclones = group;
    $("layerInfo").textContent = count > 0
      ? `Active tropical cyclones: ${count} · NOAA NHC (Atlantic + Pacific only)`
      : "No active tropical cyclones reported in the Atlantic or Pacific right now.";
  } catch { btn.classList.remove("on"); $("layerInfo").textContent = "Cyclone feed unavailable right now."; }
}
$("toggleQuakes").addEventListener("click", toggleQuakes);
$("toggleCyclones").addEventListener("click", toggleCyclones);
$("toggleSatellite").addEventListener("click", toggleSatellite);

/* ---------- controls ---------- */
$("unit").addEventListener("click", () => {
  S.unit = S.unit === "C" ? "F" : "C"; $("unit").textContent = `°${S.unit}`;
  renderTicker(); if (S.w) render(); if (S.cmp) renderCmp();
});
$("loc").addEventListener("click", () => {
  if (!navigator.geolocation) return toast("Geolocation is not supported in this browser");
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const p = { name: "Your location", sub: "", lat: pos.coords.latitude, lon: pos.coords.longitude };
    openPlace(p);
    const n = await reverseName(p.lat, p.lon);
    if (n && S.place === p) { p.name = n.name; p.sub = n.sub; renderHead(); }
  }, () => toast("Location permission denied. Search for your city instead."));
});
window.addEventListener("resize", () => {
  if (S.w && !$("mapView").classList.contains("hidden")) render();
  if (S.cmp && !$("cmpView").classList.contains("hidden")) drawCmpChart();
});

/* ---------- start ---------- */
loadTicker();
setInterval(() => { if (!document.hidden) { loadTicker(); if (S.place && !$("mapView").classList.contains("hidden")) load(S.place); } }, 15 * 60 * 1000);
const P = new URLSearchParams(location.search);
if (P.get("c") && P.get("d")) {
  S.A = dec(P.get("c")); S.B = dec(P.get("d")); $("qa").value = S.A.name; $("qb").value = S.B.name;
  go("compare"); runCompare();
} else if (P.get("p")) openPlace(dec(P.get("p")));
else go("home");