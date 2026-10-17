"use strict";
const NUTS = [
  { k: "kcal",    label: "Energie",       unit: "kcal", dec: 0, color: "#f2b84b" },
  { k: "protein", label: "Eiweiß",        unit: "g",    dec: 1, color: "#d4604a" },
  { k: "carbs",   label: "Kohlenhydrate", unit: "g",    dec: 0, color: "#5b8def" },
  { k: "fat",     label: "Fett",          unit: "g",    dec: 0, color: "#c98a3a" },
  { k: "fiber",   label: "Ballaststoffe", unit: "g",    dec: 1, color: "#2f7d5b" },
  { k: "iron",    label: "Eisen",         unit: "mg",   dec: 1, color: "#8e5bd4" },
  { k: "calcium", label: "Calcium",       unit: "mg",   dec: 0, color: "#3fb0c4" },
];
// Grobe Richtwerte für ca. 3-jährige Kinder (D-A-CH-Referenzwerte, gerundet). In "Ziele" anpassbar.
const DEFAULT_TARGETS = { kcal: 1100, protein: 12, carbs: 140, fat: 40, fiber: 10, iron: 8, calcium: 600 };

const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $app = document.getElementById("app");
const S = { user: null, tab: "home", day: today(), foods: [], entries: [], targets: { ...DEFAULT_TARGETS }, err: "" };

function today() { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
function shiftDay(iso, n) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function dayLabel(iso) {
  if (iso === today()) return "Heute";
  if (iso === shiftDay(today(), -1)) return "Gestern";
  return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
}
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
async function loadDay() {
  const { data } = await sb.from("entries").select("*").eq("eaten_on", S.day).order("created_at");
  S.entries = data || [];
}
function totals() {
  const t = {}; NUTS.forEach((n) => (t[n.k] = 0));
  S.entries.forEach((e) => NUTS.forEach((n) => (t[n.k] += Number(e[n.k]) || 0)));
  return t;
}

/* ---------- Ringe ---------- */
function ring(n, val, big) {
  const target = S.targets[n.k] || 1, p = val / target, shown = Math.round(p * 100);
  const r = 40, c = 2 * Math.PI * r, len = Math.min(p, 1) * c;
  const col = p > 1.25 ? "var(--red)" : n.color;
  return `<div class="ring${big ? " big" : ""}">
    <svg viewBox="0 0 100 100" role="img" aria-label="${n.label} ${shown} Prozent">
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--track)" stroke-width="12"/>
      <circle cx="50" cy="50" r="${r}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"
        stroke-dasharray="${len} ${c}" transform="rotate(-90 50 50)"/>
      <text class="pct" x="50" y="56" text-anchor="middle">${shown}%</text>
    </svg>
    <div class="lbl">${n.label}</div>
    <div class="val">${fmt(val, n.dec)} / ${fmt(target, n.dec)} ${n.unit}</div>
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
  const t = totals();
  const [first, ...rest] = NUTS;
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
    <div class="card"><div class="grid">${ring(first, t[first.k], true)}${rest.map((n) => ring(n, t[n.k])).join("")}</div>
      <p class="note" style="margin:10px 0 0">Anteil am Tagesrichtwert. Richtwerte unter „Ziele“ anpassbar.</p></div>
    <h2>Gegessen</h2><div class="card">${list}</div>`;
}

function viewFoods() {
  const mine = S.foods.filter((f) => f.user_id), std = S.foods.filter((f) => !f.user_id);
  const row = (f) => `<button class="item" data-food="${f.id}"><span>${esc(f.name)}<small>${esc(f.portion)}</small></span>
    <span class="k">${fmt(f.kcal, 0)} kcal</span></button>`;
  return `<button class="btn" id="newfood" style="margin-top:0">+ Eigenes Lebensmittel</button>
    <h2>Eigene</h2><div class="list">${mine.map(row).join("") || '<div class="empty">Noch keine eigenen.</div>'}</div>
    <h2>Vorgegeben</h2><div class="list">${std.map(row).join("")}</div>
    <p class="note">Nährwerte pro Portion sind gerundete Richtwerte. Mitgelieferte Lebensmittel lassen sich nicht ändern; über „Eigenes Lebensmittel“ kannst du eigene Werte anlegen.</p>`;
}

function viewGoals() {
  return `<div class="card"><div class="form">
    ${NUTS.map((n) => `<div><label>${n.label} (${n.unit})</label><input type="number" inputmode="decimal" step="any" data-goal="${n.k}" value="${S.targets[n.k]}"></div>`).join("")}
  </div>
  <button class="btn" id="savegoals">Speichern</button>
  <button class="btn alt" id="resetgoals">Standardwerte (ca. 3 Jahre)</button>
  <p class="note">Standardwerte sind grobe Orientierung nach D-A-CH-Referenzwerten für Kleinkinder. Bei individuellen Fragen bitte Kinderärzt:in fragen.</p></div>
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
  if ($("#add")) $("#add").onclick = openPicker;
  $app.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
    await sb.from("entries").delete().eq("id", b.dataset.del);
    await loadDay(); render();
  }));
  if ($("#newfood")) $("#newfood").onclick = () => openFoodForm();
  $app.querySelectorAll("[data-food]").forEach((b) => (b.onclick = () => {
    const f = S.foods.find((x) => x.id === b.dataset.food);
    f.user_id ? openFoodForm(f) : openAmount(f);
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
    <div class="list" id="res"></div>`);
  const res = el.querySelector("#res");
  const draw = () => {
    const q = el.querySelector("#q").value.toLowerCase();
    const items = S.foods.filter((f) => f.name.toLowerCase().includes(q));
    res.innerHTML = items.map((f) => `<button class="item" data-id="${f.id}"><span>${esc(f.name)}<small>${esc(f.portion)}</small></span><span class="k">${fmt(f.kcal, 0)} kcal</span></button>`).join("")
      || '<div class="empty">Nichts gefunden. Unter „Lebensmittel“ kannst du eigene anlegen.</div>';
    res.querySelectorAll("[data-id]").forEach((b) => (b.onclick = () => openAmount(S.foods.find((f) => f.id === b.dataset.id))));
  };
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
    el.querySelector("#sum").textContent = `${fmt(f.kcal * q, 0)} kcal · ${fmt(f.protein * q, 1)} g Eiweiß · ${fmt(f.iron * q, 1)} mg Eisen`;
  };
  el.querySelector("#m").onclick = () => { q = Math.max(0.25, q - 0.25); upd(); };
  el.querySelector("#p").onclick = () => { q += 0.25; upd(); };
  el.querySelector("#ok").onclick = async () => {
    const row = { food_id: f.id, name: f.name, portion: f.portion, portions: q, eaten_on: S.day };
    NUTS.forEach((n) => (row[n.k] = +(f[n.k] * q).toFixed(2)));
    const { error } = await sb.from("entries").insert(row);
    if (error) return alert(error.message);
    closeSheet(); S.tab = "home"; await loadDay(); render();
  };
  upd();
}

function openFoodForm(f) {
  const v = (k) => (f ? f[k] : "");
  const el = sheet(`<h3>${f ? "Lebensmittel bearbeiten" : "Eigenes Lebensmittel"}</h3><div class="form">
    <div class="full"><label>Name</label><input type="text" id="fn" value="${esc(v("name"))}"></div>
    <div class="full"><label>Portion (z. B. „1 Scheibe“)</label><input type="text" id="fp" value="${esc(v("portion"))}"></div>
    ${NUTS.map((n) => `<div><label>${n.label} (${n.unit})</label><input type="number" inputmode="decimal" step="any" data-n="${n.k}" value="${v(n.k)}"></div>`).join("")}
  </div>
  <p class="note">Nährwerte jeweils pro angegebener Portion.</p>
  <button class="btn" id="save">Speichern</button>
  ${f ? '<button class="btn del" id="del">Löschen</button>' : ""}`);
  el.querySelector("#save").onclick = async () => {
    const row = { name: el.querySelector("#fn").value.trim(), portion: el.querySelector("#fp").value.trim() || "1 Portion" };
    if (!row.name) return alert("Bitte einen Namen eingeben.");
    el.querySelectorAll("[data-n]").forEach((i) => (row[i.dataset.n] = num(i.value)));
    const { error } = f ? await sb.from("foods").update(row).eq("id", f.id) : await sb.from("foods").insert({ ...row, user_id: S.user.id });
    if (error) return alert(error.message);
    closeSheet(); await loadAll(); render();
  };
  if (f) el.querySelector("#del").onclick = async () => {
    if (!confirm("Lebensmittel löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.")) return;
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
