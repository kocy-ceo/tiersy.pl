/* Polska Tierlista – strona statyczna (GitHub Pages). Dane: data/players.json (zapisuje bot). */
const CONFIG = {
  siteName: ["POLSKA", "TIERLISTA"],
  subtitle: "MINECRAFT PVP · 1.20+",
  dataUrl: "data/players.json",
  logoUrl: "",                       // np. "logo.png" (wrzuć plik do docs/)
};
const TIER_ORDER = ["HT1", "LT1", "HT2", "LT2", "HT3", "LT3", "HT4", "LT4", "HT5", "LT5"];
const DEFAULT_POINTS = { HT1: 60, LT1: 45, HT2: 30, LT2: 20, HT3: 10, LT3: 6, HT4: 4, LT4: 3, HT5: 2, LT5: 1 };
const VIEWS = [
  { key: "tiers", label: "Tiers" },
  { key: "subtiers", label: "Subtiers" },
  { key: "global", label: "Global Overall" },
];

let DATA = { modes: [], players: [], recent: [], points: DEFAULT_POINTS, updated: 0 };

/* ---------- helpers ---------- */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const POINTS = () => DATA.points || DEFAULT_POINTS;
const modeByKey = (k) => DATA.modes.find((m) => m.key === k);
const skinBody = (n) => `https://mc-heads.net/body/${encodeURIComponent(n)}/right`;
const skinHead = (n) => `https://mc-heads.net/avatar/${encodeURIComponent(n)}/64`;
const tierNum = (t) => t.slice(2);
const label = (e) => (e.retired ? "R" + e.tier : e.tier);

function modesOf(view) {
  return view === "global" ? DATA.modes : DATA.modes.filter((m) => m.group === view);
}
function points(p, modes) {
  return modes.reduce((s, m) => s + (p.modes[m.key] ? POINTS()[p.modes[m.key].tier] || 0 : 0), 0);
}
function bestRank(p, modes) {
  const r = modes.map((m) => p.modes[m.key]).filter(Boolean).map((e) => TIER_ORDER.indexOf(e.tier));
  return r.length ? Math.min(...r) : 99;
}
function ago(ts) {
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 90) return "przed chwilą";
  if (s < 3600) return `${Math.round(s / 60)} min temu`;
  if (s < 86400) return `${Math.round(s / 3600)} godz. temu`;
  return `${Math.round(s / 86400)} dn. temu`;
}

/* ---------- komponenty ---------- */
function badge(mode, entry, big) {
  if (!entry) {
    return h("div", { class: "badge empty" }, h("div", { class: "hex" }, "–"), h("span", { class: "lbl" }, "–"));
  }
  return h(
    "div",
    { class: `badge t${tierNum(entry.tier)}${entry.retired ? " retired" : ""}${big ? " bigbadge" : ""}`,
      title: `${mode.name}: ${entry.retired ? "Retired " : ""}${entry.tier}` },
    h("div", { class: "hex" }, mode.emoji),
    h("span", { class: "lbl" }, label(entry))
  );
}

function skinImg(nick) {
  const img = h("img", { src: skinBody(nick), alt: "", loading: "lazy" });
  img.addEventListener("error", () => img.remove());
  return img;
}

function playerRow(p, place, modes, mode) {
  const cls = place <= 3 ? `p${place}` : "p0";
  const total = points(p, mode ? [mode] : modes);
  const slots = mode
    ? [badge(mode, p.modes[mode.key], true)]
    : modes.map((m) => badge(m, p.modes[m.key]));
  return h(
    "div",
    { class: `row ${cls}`, role: "button", tabindex: "0", onclick: () => openPlayer(p) ,
      onkeydown: (e) => { if (e.key === "Enter") openPlayer(p); } },
    h("div", { class: "skin" },
      h("div", { class: "skin-img" }, skinImg(p.nick)),
      h("div", { class: "rank" }, place <= 3
        ? h("div", { class: "medal" }, place)
        : h("div", { class: "diamond" }, h("b", {}, place)))),
    h("div", { class: "body" },
      h("div", { class: "who" },
        h("div", { class: "nick" }, p.nick),
        h("div", { class: "pts" }, `${total} pkt`, p.region ? h("span", { class: "region" }, p.region) : null)),
      h("div", { class: "badges" }, slots))
  );
}

function skinHeadImg(nick) {
  const img = h("img", { src: skinHead(nick), alt: "", loading: "lazy" });
  img.addEventListener("error", () => { img.style.visibility = "hidden"; });
  return img;
}

function miniRow(r) {
  const m = modeByKey(r.mode);
  const p = DATA.players.find((x) => x.nick === r.nick);
  return h("div", { class: "mini", onclick: () => p && openPlayer(p) },
    skinHeadImg(r.nick),
    h("div", {}, h("div", { class: "n" }, r.nick),
      h("div", { class: "m" }, `${m ? m.emoji + " " + m.name : r.mode} · ${ago(r.ts)}`)),
    h("span", { class: `tg t${tierNum(r.tier)}${r.retired ? " retired" : ""}` }, r.retired ? "R" + r.tier : r.tier));
}

function sidebar() {
  const rec = document.getElementById("recent");
  const hi = document.getElementById("high");
  rec.replaceChildren(); hi.replaceChildren();
  const all = (DATA.recent || []).slice(0, 8);
  if (all.length) all.forEach((r) => rec.append(miniRow(r)));
  else rec.append(h("div", { class: "ph" }, h("b", {}, "Brak wyników testów"), "Pojawią się po imporcie wyników."));
  const high = (DATA.recent || []).filter((r) => !r.retired && TIER_ORDER.indexOf(r.tier) <= TIER_ORDER.indexOf("HT3")).slice(0, 6);
  if (high.length) high.forEach((r) => hi.append(miniRow(r)));
  else hi.append(h("div", { class: "ph" }, h("b", {}, "Brak wyników High Tier"), "Oczekujemy na dane z testów."));
}

/* ---------- strony ---------- */
function route() {
  const parts = (location.hash.replace(/^#\/?/, "") || "ranking/tiers/overall").split("/");
  return { page: parts[0] || "ranking", view: parts[1] || "tiers", tab: parts[2] || "overall" };
}

function renderRanking(view, tab) {
  if (!VIEWS.some((v) => v.key === view)) view = "tiers";
  const modes = modesOf(view);
  const mode = modes.find((m) => m.key === tab);
  if (!mode) tab = "overall";
  const go = (v, t) => (location.hash = `#/ranking/${v}/${t}`);

  const seg = h("div", { class: "seg" }, VIEWS.map((v) =>
    h("button", { class: v.key === view ? "on" : "", onclick: () => go(v.key, "overall") }, v.label)));

  const tabs = view === "global" ? null : h("div", { class: "tabs" },
    h("button", { class: `tab${tab === "overall" ? " on" : ""}`, onclick: () => go(view, "overall") },
      h("span", { class: "ti" }, "🏆"), "Overall"),
    modes.map((m) => h("button", { class: `tab${tab === m.key ? " on" : ""}`, onclick: () => go(view, m.key) },
      h("span", { class: "ti" }, m.emoji), m.name)));

  let list;
  if (mode) {
    list = DATA.players.filter((p) => p.modes[mode.key]).sort((a, b) =>
      TIER_ORDER.indexOf(a.modes[mode.key].tier) - TIER_ORDER.indexOf(b.modes[mode.key].tier) ||
      Number(!!a.modes[mode.key].retired) - Number(!!b.modes[mode.key].retired) ||
      a.nick.localeCompare(b.nick));
  } else {
    list = DATA.players.filter((p) => modes.some((m) => p.modes[m.key])).sort((a, b) =>
      points(b, modes) - points(a, modes) || bestRank(a, modes) - bestRank(b, modes) || a.nick.localeCompare(b.nick));
  }
  const title = mode ? `${mode.emoji} ${mode.name}` : `🏆 ${view === "global" ? "Global Overall" : "Overall"}`;

  const page = document.getElementById("page");
  page.replaceChildren(
    h("div", { class: "head-row" },
      h("div", {}, h("div", { class: "eyebrow" }, "MINECRAFT · PVP"), h("h1", {}, "Ranking graczy")),
      seg),
    tabs,
    h("div", { class: "list-h" }, h("h2", {}, title),
      h("small", {}, `${list.length} ${list.length === 1 ? "gracz" : "graczy"} · skiny wg nicków`)),
    h("div", { class: "cols" }, h("span", {}, "POZYCJA"), h("span", {}, "GRACZ"), h("span", {}, "TIERY")),
    list.length
      ? h("div", {}, list.map((p, i) => playerRow(p, i + 1, modes, mode)))
      : h("div", { class: "empty-state" }, h("b", {}, "Brak graczy"), "Nikt nie ma jeszcze tieru w tej kategorii.")
  );
}

function renderInfo() {
  const pts = POINTS();
  const group = (g) => DATA.modes.filter((m) => m.group === g).map((m) => h("span", { class: "chip" }, `${m.emoji} ${m.name}`));
  document.getElementById("page").replaceChildren(
    h("div", { class: "eyebrow" }, "MINECRAFT · PVP"), h("h1", {}, "Informacje i punktacja"),
    h("div", { class: "panel" }, h("h2", {}, "Jak działa ranking?"),
      h("p", {}, "Tiery nadają testerzy na naszym Discordzie po teście 1 na 1. Strona odświeża się sama – każdy nowy wynik trafia tu automatycznie."),
      h("p", {}, "HT oznacza High Tier, LT – Low Tier. Im niższy numer, tym lepszy tier (HT1 to najwyższa ranga).")),
    h("div", { class: "panel" }, h("h2", {}, "Podział trybów"),
      h("p", {}, h("b", {}, "Tiers"), " – główne tryby:"), h("div", { class: "chips" }, group("tiers")),
      h("p", { style: "margin-top:14px" }, h("b", {}, "Subtiers"), " – pozostałe tryby:"), h("div", { class: "chips" }, group("subtiers")),
      h("p", { style: "margin-top:14px" }, h("b", {}, "Global Overall"), " – punkty ze wszystkich trybów razem.")),
    h("div", { class: "panel" }, h("h2", {}, "Punktacja"),
      h("table", { class: "pt" }, h("thead", {}, h("tr", {}, h("th", {}, "TIER"), h("th", {}, "PUNKTY"))),
        h("tbody", {}, TIER_ORDER.map((t) => h("tr", {}, h("td", {}, t), h("td", {}, pts[t])))))),
    h("div", { class: "panel" }, h("h2", {}, "Retired"),
      h("p", {}, "Gracz, który kończy z tierowaniem w danym trybie, może przejść na ", h("b", {}, "retired"),
        ". Jego najwyższy tier zostaje na liście z literą R (np. RLT1), oznaczony jasnoniebieskim kolorem, a punkty liczą się normalnie."))
  );
}

function render() {
  const r = route();
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("on", a.dataset.nav === r.page));
  if (r.page === "info") renderInfo(); else renderRanking(r.view, r.tab);
  sidebar();
  window.scrollTo({ top: 0 });
}

/* ---------- profil gracza ---------- */
function openPlayer(p) {
  const all = DATA.modes;
  const total = points(p, all);
  const body = document.getElementById("modalBody");
  body.replaceChildren(
    h("div", { class: "pm" },
      h("button", { class: "pm-x", onclick: () => document.getElementById("modal").close(), "aria-label": "Zamknij" }, "✕"),
      h("div", { class: "pm-top" },
        h("img", { src: skinBody(p.nick), alt: "" }),
        h("div", {}, h("h2", {}, p.nick),
          h("div", { class: "sub" }, `${total} pkt łącznie${p.region ? " · " + p.region : ""}`))),
      h("div", { class: "pm-list" }, all.map((m) => {
        const e = p.modes[m.key];
        return h("div", { class: "pm-row" }, h("span", {}, m.emoji), h("span", { class: "tn" }, m.name),
          e ? h("span", { class: "sub" }, `${POINTS()[e.tier] || 0} pkt`) : null, badge(m, e));
      }))));
  const d = document.getElementById("modal");
  if (!d.open) d.showModal();
}
document.getElementById("modal").addEventListener("click", (e) => { if (e.target.id === "modal") e.target.close(); });

/* ---------- wyszukiwarka ---------- */
const sIn = document.getElementById("search");
const sRes = document.getElementById("searchRes");
sIn.addEventListener("input", () => {
  const q = sIn.value.trim().toLowerCase();
  sRes.replaceChildren();
  if (!q) { sRes.hidden = true; return; }
  const found = DATA.players.filter((p) => p.nick.toLowerCase().includes(q)).slice(0, 8);
  if (!found.length) sRes.append(h("div", { class: "none" }, "Nie znaleziono gracza."));
  found.forEach((p) => sRes.append(h("button", { onclick: () => { sRes.hidden = true; sIn.value = ""; openPlayer(p); } },
    h("img", { src: skinHead(p.nick), alt: "" }), p.nick)));
  sRes.hidden = false;
});
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) sRes.hidden = true; });
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== sIn && !e.target.closest("input,textarea")) { e.preventDefault(); sIn.focus(); }
  if (e.key === "Escape") { sRes.hidden = true; sIn.blur(); }
});

/* ---------- start ---------- */
function brand() {
  document.getElementById("siteName").replaceChildren(CONFIG.siteName[0] + " ", h("i", {}, CONFIG.siteName[1]));
  document.getElementById("siteSub").textContent = CONFIG.subtitle;
  if (CONFIG.logoUrl) document.getElementById("logo").replaceChildren(h("img", { src: CONFIG.logoUrl, alt: "" }));
}

async function load() {
  try {
    const r = await fetch(`${CONFIG.dataUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) throw new Error(r.status);
    DATA = await r.json();
  } catch (err) {
    document.getElementById("page").replaceChildren(
      h("div", { class: "empty-state" }, h("b", {}, "Nie udało się wczytać danych"),
        "Sprawdź, czy istnieje plik docs/data/players.json. (Lokalnie strona wymaga serwera, np. `python -m http.server`.)"));
    return;
  }
  document.getElementById("updated").textContent = DATA.updated
    ? `Ostatnia aktualizacja: ${new Date(DATA.updated * 1000).toLocaleString("pl-PL")}` : "";
  render();
}
brand();
window.addEventListener("hashchange", () => DATA.modes.length && render());
load();
setInterval(async () => {           // odświeżanie danych co 2 min bez przeładowania strony
  try {
    const r = await fetch(`${CONFIG.dataUrl}?t=${Date.now()}`, { cache: "no-store" });
    if (r.ok) { const d = await r.json(); if (d.updated !== DATA.updated) { DATA = d; render(); } }
  } catch (e) { /* ignoruj */ }
}, 120000);
