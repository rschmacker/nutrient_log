"use strict";
const NUTS = [
  { k: "kcal",    label: "Energie",       short: "Energie",  unit: "kcal", dec: 0, color: "#f2b84b" },
  { k: "protein", label: "Eiweiß",        short: "Eiweiß",   unit: "g",    dec: 1, color: "#d4604a" },
  { k: "carbs",   label: "Kohlenhydrate", short: "Kohlenh.", unit: "g",    dec: 0, color: "#5b8def" },
  { k: "fat",     label: "Fett",          short: "Fett",     unit: "g",    dec: 0, color: "#c98a3a" },
  { k: "fiber",   label: "Ballaststoffe", short: "Ballast.", unit: "g",    dec: 1, color: "#2f7d5b" },
  { k: "iron",    label: "Eisen",         short: "Eisen",    unit: "mg",   dec: 1, color: "#8e5bd4" },
  { k: "calcium", label: "Calcium",       short: "Calcium",  unit: "mg",   dec: 0, color: "#3fb0c4" },
  { k: "omega3",  label: "Omega-3",       short: "Omega-3",  unit: "g",    dec: 2, color: "#1f8fa8" },
];
// Richtwerte für 1 bis unter 4 Jahre (DGE-Referenzwerte, auf einen Tagesbedarf umgerechnet). In "Ziele" anpassbar.
//  Energie 1.200 kcal (Jungen PAL 1,4 / Mädchen PAL 1,6), Eiweiß 14 g, Fett 30-40 % der Energie (Mitte ca. 47 g),
//  Kohlenhydrate > 50 % der Energie (150 g), Ballaststoffe 14,6 g/1.000 kcal (Dichte-Richtwert), Eisen 7 mg,
//  Calcium 600 mg, alpha-Linolensäure 0,5 % der Energie (ca. 0,7 g).
const DEFAULT_TARGETS = { kcal: 1200, protein: 14, carbs: 150, fat: 47, fiber: 17.5, iron: 7, calcium: 600, omega3: 0.7 };

const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $app = document.getElementById("app");
const S = {
  user: null, tab: "home", day: today(), foods: [], entries: [], range: [], err: "",
  targets: { ...DEFAULT_TARGETS }, avg: false, pick: "all",
};
try { S.avg = localStorage.getItem("avg3") === "1"; } catch (e) {}

function today() { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function shiftDay(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function dayLabel(iso) {
  if (iso === today()) return "Heute";
  if (iso === shiftDay(today(), -1)) return "Gestern";
  return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
}
const shortDate = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "numeric" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (v, dec) => Number(v).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: dec });
const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };

/* ---------- Daten ---------- */
async function loadAll() {
  const [f, t] = await Promise.all([
    sb.from("foods").select("*").order("name"),
    sb.from("targets").select("*").maybeSingle(),
  ]);
  S.foods = f.data || [];
  if (t.data) S.targets = { ...DEFAULT_TARGETS, ...t.data };
  await loadDay();
}
// Lädt den gewählten Tag plus die 3 Tage davor (für den 3-Tage-Durchschnitt).
async function loadDay() {
  const { data } = await sb.from("entries").select("*")
    .gte("eaten_on", shiftDay(S.day, -3)).lte("eaten_on", S.day).order("created_at");
  S.range = data || [];
  S.entries = S.range.filter((e) => e.eaten_on === S.day);
}
function sum(list) {
  const t = {}; NUTS.forEach((n) => (t[n.k] = 0));
  list.forEach((e) => NUTS.forEach((n) => (t[n.k] += Number(e[n.k]) || 0)));
  return t;
}
// Durchschnitt über 3 Tage. Für "heute" zählen die 3 letzten abgeschlossenen Tage (heute ist noch unvollständig).
// Tage ohne Einträge werden nicht mitgezählt.
function avg3() {
  const end = S.day === today() ? shiftDay(S.day, -1) : S.day;
  const days = [end, shiftDay(end, -1), shiftDay(end, -2)];
  const used = days.filter((d) => S.range.some((e) => e.eaten_on === d));
  const t = sum(S.range.filter((e) => days.includes(e.eaten_on)));
  const n = Math.max(used.length, 1);
  NUTS.forEach((x) => (t[x.k] /= n));
  return { t, n: used.length, from: days[2], to: end };
}

/* ---------- Ringe ---------- */
function ring(n, val) {
  const target = S.targets[n.k] || 1, p = val / target, shown = Math.round(p * 100);
  const r = 40, c = 2 * Math.PI * r, len = Math.min(p, 1) * c;
  const col = p > 1.25 ? "var(--red)" : n.color;
  return `<div class="ring">
    <svg viewBox="0 0 100 100" role="img" aria-label="${n.label} ${shown} Prozent">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--track)" stroke-width="12"/>
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${len} ${c}" transform="rotate(-90 50 50)"/>
      <text class="pct" x="50" y="57" text-anchor="middle">${shown}%</text>
    </svg>
    <div class="lbl">${n.short}</div>
    <div class="val">${fmt(val, n.dec)} ${n.unit}</div>
    <div class="val">von ${fmt(target, n.dec)}</div>
  </div>`;
}

/* ---------- Views ---------- */
function render() {
  if (!S.user) return renderAuth();
  const body = { home: viewHome, foods: viewFoods, goals: viewGoals }[S.tab]();
  $app.innerHTML = `
    <header class="top"><h1>Kleinkind-Essen</h1></header>
    ${body}
    ${S.tab === "home" ? '<button class="fab" id="add" aria-label="Essen hinzufügen">+</button>' : ""}
    <nav class="tabs">
      ${[["home", "Heute"], ["foods", "Lebensmittel"], ["goals", "Ziele"]]
        .map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}">${l}</button>`).join("")}
    </nav>`;
  $app.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; render(); }));
  bind();
}

function viewHome() {
  let t, caption;
  if (S.avg) {
    const a = avg3(); t = a.t;
    caption = a.n
      ? `Ø pro Tag über ${a.n} ${a.n === 1 ? "Tag" : "Tage"} mit Einträgen (${shortDate(a.from)}–${shortDate(a.to)}). Anteil am Tagesrichtwert.`
      : "In den letzten 3 Tagen gibt es noch keine Einträge.";
  } else {
    t = sum(S.entries);
    caption = "Anteil am Tagesrichtwert. Richtwerte unter „Ziele“ anpassbar.";
  }
  const list = S.entries.length
    ? S.entries.map((e) => `<div class="entry"><div class="n"><b>${esc(e.name)}</b>
        <span>${fmt(e.portions, 2)} × ${esc(e.portion)} · ${fmt(e.kcal, 0)} kcal</span></div>
        <button class="x" data-del="${e.id}" aria-label="Löschen">×</button></div>`).join("")
    : '<div class="empty">Noch nichts eingetragen.</div>';
  return `
    <div class="datebar">
      <button id="prev" aria-label="Vorheriger Tag">‹</button>
      <div class="d">${dayLabel(S.day)}</div>
      <button id="next" aria-label="Nächster Tag" ${S.day >= today() ? "disabled" : ""}>›</button>
    </div>
    <div class="seg two">
      <button data-avg="0" class="${S.avg ? "" : "on"}">Tageswerte</button>
      <button data-avg="1" class="${S.avg ? "on" : ""}">Ø 3 Tage</button>
    </div>
    <div class="card">
      <div class="grid">${NUTS.slice(0, 4).map((n) => ring(n, t[n.k])).join("")}</div>
      <div class="grid" style="margin-top:12px">${NUTS.slice(4).map((n) => ring(n, t[n.k])).join("")}</div>
      <p class="note" style="margin:10px 0 0">${caption}</p></div>
    <h2>Gegessen</h2><div class="card">${list}</div>`;
}

function foodRow(f) {
  const tag = f.kind === "dish" ? '<span class="tag">Gericht</span>' : "";
  return `<button class="item" data-food="${f.id}"><span>${esc(f.name)} ${tag}<small>${esc(f.portion)}</small></span>
    <span class="k">${fmt(f.kcal, 0)} kcal</span></button>`;
}

function viewFoods() {
  const mine = S.foods.filter((f) => f.user_id && f.kind !== "dish");
  const dishes = S.foods.filter((f) => f.user_id && f.kind === "dish");
  const std = S.foods.filter((f) => !f.user_id);
  return `<div class="two-btn"><button class="btn" id="newfood" style="margin-top:0">+ Lebensmittel</button>
    <button class="btn" id="newdish" style="margin-top:0">+ Gericht</button></div>
    <h2>Meine Gerichte</h2><div class="list">${dishes.map(foodRow).join("") || '<div class="empty">Noch keine Gerichte. Gekochtes oder Gebackenes mit Nährwerten pro Portion aus einer anderen App kannst du hier speichern.</div>'}</div>
    <h2>Eigene Lebensmittel</h2><div class="list">${mine.map(foodRow).join("") || '<div class="empty">Noch keine eigenen.</div>'}</div>
    <h2>Vorgegeben</h2><div class="list">${std.map(foodRow).join("")}</div>
    <p class="note">Nährwerte pro Portion sind gerundete Richtwerte. Mitgelieferte Lebensmittel lassen sich nicht ändern; lege bei Bedarf ein eigenes Lebensmittel oder Gericht mit anderen Werten an.</p>`;
}

function viewGoals() {
  return `<div class="card"><div class="form">
    ${NUTS.map((n) => `<div><label>${n.label} (${n.unit})</label><input type="number" inputmode="decimal" step="any" data-goal="${n.k}" value="${S.targets[n.k]}"></div>`).join("")}
  </div>
  <button class="btn" id="savegoals">Speichern</button>
  <button class="btn alt" id="resetgoals">Standardwerte (1 bis unter 4 Jahre)</button>
  <p class="note">Standardwerte nach den DGE-Referenzwerten für 1 bis unter 4 Jahre: Eiweiß 14 g, Eisen 7 mg, Calcium 600 mg, Energie 1.200 kcal (Jungen bei PAL 1,4 bzw. Mädchen bei PAL 1,6), Fett 30–40 % und Kohlenhydrate über 50 % der Energie, Ballaststoffe 14,6 g pro 1.000 kcal, α-Linolensäure 0,5 % der Energie. Für EPA/DHA gibt es für diese Altersgruppe keinen DGE-Wert. Das sind Orientierungswerte für den Durchschnitt über mehrere Tage, keine Tagesziele für den Einzelfall.</p></div>
  <button class="btn del" id="logout">Abmelden</button>`;
}

function renderAuth() {
  $app.innerHTML = `<div class="center card"><h1>Kleinkind-Essen</h1>
    <p class="note">Mit E-Mail anmelden oder registrieren.</p>
    <input type="email" id="em" placeholder="E-Mail" autocomplete="username" style="margin-bottom:8px">
    <input type="password" id="pw" placeholder="Passwort" autocomplete="current-password">
    <button class="btn" id="login">Anmelden</button>
    <button class="btn alt" id="signup">Registrieren</button>
    <div class="err">${esc(S.err)}</div></div>`;
  const creds = () => ({ email: $app.querySelector("#em").value.trim(), password: $app.querySelector("#pw").value });
  $app.querySelector("#login").onclick = async () => {
    const { error } = await sb.auth.signInWithPassword(creds());
    if (error) { S.err = error.message; renderAuth(); }
  };
  $app.querySelector("#signup").onclick = async () => {
    const { data, error } = await sb.auth.signUp(creds());
    S.err = error ? error.message : data.session ? "" : "Bestätigungs-Mail verschickt, bitte Link öffnen und dann anmelden.";
    if (error || !data.session) renderAuth();
  };
}

/* ---------- Events ---------- */
function bind() {
  const $ = (s) => $app.querySelector(s);
  if ($("#prev")) $("#prev").onclick = async () => { S.day = shiftDay(S.day, -1); await loadDay(); render(); };
  if ($("#next")) $("#next").onclick = async () => { if (S.day < today()) { S.day = shiftDay(S.day, 1); await loadDay(); render(); } };
  $app.querySelectorAll("[data-avg]").forEach((b) => (b.onclick = () => {
    S.avg = b.dataset.avg === "1";
    try { localStorage.setItem("avg3", S.avg ? "1" : "0"); } catch (e) {}
    render();
  }));
  if ($("#add")) $("#add").onclick = openPicker;
  $app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    await sb.from("entries").delete().eq("id", b.dataset.del);
    await loadDay(); render();
  }));
  if ($("#newfood")) $("#newfood").onclick = () => openFoodForm(null, "food");
  if ($("#newdish")) $("#newdish").onclick = () => openFoodForm(null, "dish");
  $app.querySelectorAll("[data-food]").forEach((b) => (b.onclick = () => {
    const f = S.foods.find((x) => x.id === b.dataset.food);
    f.user_id ? openFoodForm(f, f.kind) : openAmount(f);
  }));
  if ($("#savegoals")) $("#savegoals").onclick = async () => {
    const t = {}; $app.querySelectorAll("[data-goal]").forEach((i) => (t[i.dataset.goal] = num(i.value) || DEFAULT_TARGETS[i.dataset.goal]));
    const { error } = await sb.from("targets").upsert({ user_id: S.user.id, ...t });
    if (!error) { S.targets = t; S.tab = "home"; render(); } else alert(error.message);
  };
  if ($("#resetgoals")) $("#resetgoals").onclick = () => { S.targets = { ...DEFAULT_TARGETS }; render(); };
  if ($("#logout")) $("#logout").onclick = () => sb.auth.signOut();
}

function sheet(html) {
  closeSheet();
  const bg = document.createElement("div");
  bg.className = "sheet-bg"; bg.id = "sheetbg";
  bg.innerHTML = `<div class="sheet">${html}</div>`;
  bg.onclick = (e) => { if (e.target === bg) closeSheet(); };
  document.body.appendChild(bg);
  return bg.firstElementChild;
}
function closeSheet() { document.getElementById("sheetbg")?.remove(); }

function openPicker() {
  const el = sheet(`<h3>Was hat er gegessen?</h3><input type="search" id="q" placeholder="Suchen …">
    <div class="seg" id="seg">
      ${[["all", "Alle"], ["food", "Lebensmittel"], ["dish", "Gerichte"], ["mine", "Eigene"]]
        .map(([k, l]) => `<button data-k="${k}" class="${S.pick === k ? "on" : ""}">${l}</button>`).join("")}
    </div>
    <div class="list" id="res"></div>`);
  const res = el.querySelector("#res");
  const draw = () => {
    const q = el.querySelector("#q").value.toLowerCase();
    const items = S.foods.filter((f) => f.name.toLowerCase().includes(q) && (
      S.pick === "all" || (S.pick === "mine" ? !!f.user_id : S.pick === "dish" ? f.kind === "dish" : f.kind !== "dish")));
    res.innerHTML = items.map(foodRow).join("")
      || '<div class="empty">Nichts gefunden. Unter „Lebensmittel“ kannst du eigene Lebensmittel und Gerichte anlegen.</div>';
    res.querySelectorAll("[data-food]").forEach((b) => (b.onclick = () => openAmount(S.foods.find((f) => f.id === b.dataset.food))));
  };
  el.querySelectorAll("#seg button").forEach((b) => (b.onclick = () => {
    S.pick = b.dataset.k;
    el.querySelectorAll("#seg button").forEach((x) => x.classList.toggle("on", x === b));
    draw();
  }));
  el.querySelector("#q").oninput = draw; draw();
}

function openAmount(f) {
  let q = 1;
  const el = sheet(`<h3>${esc(f.name)}</h3><div class="note">${esc(f.portion)}</div>
    <div class="stepper"><button id="m">−</button><div class="q" id="qv">1</div><button id="p">+</button></div>
    <div class="note" id="sum" style="text-align:center"></div>
    <button class="btn" id="ok">Eintragen (${dayLabel(S.day)})</button>`);
  const upd = () => {
    el.querySelector("#qv").textContent = fmt(q, 2);
    el.querySelector("#sum").textContent = `${fmt(f.kcal * q, 0)} kcal · ${fmt(f.protein * q, 1)} g Eiweiß · ${fmt(f.iron * q, 1)} mg Eisen · ${fmt(f.omega3 * q, 2)} g Omega-3`;
  };
  el.querySelector("#m").onclick = () => { q = Math.max(0.25, q - 0.25); upd(); };
  el.querySelector("#p").onclick = () => { q += 0.25; upd(); };
  el.querySelector("#ok").onclick = async () => {
    const row = { food_id: f.id, name: f.name, portion: f.portion, portions: q, eaten_on: S.day };
    NUTS.forEach((n) => (row[n.k] = +((Number(f[n.k]) || 0) * q).toFixed(3)));
    const { error } = await sb.from("entries").insert(row);
    if (error) return alert(error.message);
    closeSheet(); S.tab = "home"; await loadDay(); render();
  };
  upd();
}

function openFoodForm(f, kind) {
  const dish = (f ? f.kind : kind) === "dish";
  const v = (k) => (f ? f[k] : "");
  const el = sheet(`<h3>${f ? "Bearbeiten" : dish ? "Neues Gericht" : "Eigenes Lebensmittel"}</h3><div class="form">
    <div class="full"><label>Name</label><input type="text" id="fn" value="${esc(v("name"))}" placeholder="${dish ? "z. B. Gemüselasagne" : "z. B. Hirsebrei"}"></div>
    <div class="full"><label>Portion (${dish ? "z. B. „1 Kinderportion (150 g)“" : "z. B. „1 Scheibe“"})</label><input type="text" id="fp" value="${esc(v("portion"))}"></div>
    ${NUTS.map((n) => `<div><label>${n.label} (${n.unit})</label><input type="number" inputmode="decimal" step="any" data-n="${n.k}" value="${v(n.k)}"></div>`).join("")}
  </div>
  <p class="note">Nährwerte jeweils pro angegebener Portion${dish ? " – einfach aus der anderen App übernehmen. Was dort nicht steht, bleibt leer (zählt als 0)." : "."}</p>
  <button class="btn" id="save">Speichern</button>
  ${f ? '<button class="btn del" id="del">Löschen</button>' : ""}`);
  el.querySelector("#save").onclick = async () => {
    const row = { name: el.querySelector("#fn").value.trim(), portion: el.querySelector("#fp").value.trim() || "1 Portion", kind: dish ? "dish" : "food" };
    if (!row.name) return alert("Bitte einen Namen eingeben.");
    el.querySelectorAll("[data-n]").forEach((i) => (row[i.dataset.n] = num(i.value)));
    const { error } = f ? await sb.from("foods").update(row).eq("id", f.id) : await sb.from("foods").insert({ ...row, user_id: S.user.id });
    if (error) return alert(error.message);
    closeSheet(); await loadAll(); render();
  };
  if (f) el.querySelector("#del").onclick = async () => {
    if (!confirm("Wirklich löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.")) return;
    await sb.from("foods").delete().eq("id", f.id);
    closeSheet(); await loadAll(); render();
  };
}

/* ---------- Start ---------- */
sb.auth.onAuthStateChange(async (_e, session) => {
  S.user = session?.user || null; S.err = "";
  if (S.user) { await loadAll(); }
  render();
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
