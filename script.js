/* Laborauswertung – keine Speicherung, alles nur im Arbeitsspeicher */

// [Gruppe, id, Anzeigename, Suchbegriff im Labortext, Einheit, Standard-Zielbereich]
const I = [
  ["Blutbildung", "hb", "Hämoglobin", "Hämoglobin (PHOT)", "g/dl", "10-12"],
  ["Blutbildung", "fer", "Ferritin", "Ferritin", "µg/l", ""],
  [
    "Blutbildung",
    "tsat",
    "Transferrinsättigung",
    "Transferrinsättigung",
    "%",
    "30-50",
  ],
  ["Ca-P-Haushalt", "phos", "Phosphat", "Phosphat (PHOT)", "mmol/l", "<2"],
  ["Ca-P-Haushalt", "vd", "25-OH-Vitamin D", "25-OH-Vitamin D3", "nmol/l", ""],
  ["Ca-P-Haushalt", "pth", "Parathormon", "Parathormon", "ng/l", ""],
  ["Sonstige Parameter", "alb", "Albumin", "Albumin i.S.", "g/l", ">35"],
  ["Sonstige Parameter", "crp", "CRP", "CRP", "mg/l", ""],
  ["Vitamine", "b12", "Vitamin B12", "Vitamin B12", "pmol/l", ""],
  [
    "Vitamine",
    "htc",
    "Holotranscobalamin",
    "Holo-Transcobalamin",
    "pmol/l",
    "",
  ],
  ["Vitamine", "mma", "Methylmalonsäure", "Methylmalonsäure", "nmol/l", ""],
  ["Vitamine", "fol", "Folsäure", "Folsäure", "nmol/l", ""],
  ["Vitamine", "b1", "Vitamin B1", "Vitamin B1 (Thiamin", "µg/l", ""],
  ["Vitamine", "b6", "Vitamin B6", "Vitamin B6", "µg/l", ""],
  ["NU", "gfr", "GFR Kreatinin (CKD-EPI)", "GFR Kreatinin", "ml/min", ""],
  // Suchbegriff "Harnstoff n. Dialyse" ist der Originaltext im Labor
  ["NU", "hv", "Harnstoff vor NU", "Harnstoff (PHOT)", "mg/dl", ""],
  ["NU", "hn", "Harnstoff nach NU", "Harnstoff n. Dialyse", "mg/dl", ""],
];
const DEF = Object.fromEntries(I.map((x) => [x[1], x[5]]));
// Bewertung gegen eigenen Zielbereich
const WORD = {
  unter: "unter dem Zielbereich",
  über: "über dem Zielbereich",
  im: "im Zielbereich",
};
// Bewertung gegen den Laborrichtwert (wenn kein eigener Zielbereich gesetzt ist)
const WORDL = {
  unter: "unter dem Laborrichtwert",
  über: "über dem Laborrichtwert",
  im: "im Laborrichtwert",
};

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const num = (s) => {
  const m = String(s || "")
    .replace(",", ".")
    .match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

let S = { date: iso(new Date()), v: {}, lab: {} }; // eine gemeinsame Wertebasis
const fmt = (d) => d.split("-").reverse().join(".");
const hasData = () => Object.keys(S.v).length > 0;

/* ---------- Einlesen ---------- */
function parse(txt) {
  const T = txt
    .split(/[\t\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const isVal = (s) => /^[<>]?\s*-?\d/.test(s || "");
  const rep = { v: {}, lab: {}, n: 0 };
  I.forEach(([g, id, l, k]) => {
    // nur echte Label-Zellen (keine Zeilen mit ":") mit numerischem Wert danach
    const i = T.findIndex(
      (x, j) => x.startsWith(k) && !x.includes(":") && isVal(T[j + 1]),
    );
    if (i < 0) return;
    rep.v[id] = T[i + 1].replace(/\./g, ",");
    rep.n++;
    const r = T[i + 3];
    rep.lab[id] =
      r && /^[\d.,<> -]+$/.test(r) && /\d/.test(r)
        ? r
            .replace(/\s/g, "")
            .replace(/\./g, ",")
            .replace(/(\d)-(\d)/, "$1 bis $2")
            .replace(/(\d[\d,]*) bis 99999$/, ">$1")
        : "";
  });
  return rep;
}

/* ---------- Bewertung ---------- */
function range(t) {
  t = (t || "").trim().replace(/\s/g, "").replace(/,/g, ".");
  let m;
  if ((m = t.match(/^(\d+\.?\d*)(?:-|bis)(\d+\.?\d*)$/))) return [+m[1], +m[2]];
  if ((m = t.match(/^<(\d+\.?\d*)$/))) return [-Infinity, +m[1]];
  if ((m = t.match(/^>(\d+\.?\d*)$/))) return [+m[1], Infinity];
  return null;
}
function rate(rep, id, val) {
  const r = range(DEF[id] || (rep.lab[id] || "").replace(/ bis /, "-")),
    n = num(val);
  if (!r || isNaN(n)) return "";
  return n < r[0] ? "unter" : n > r[1] ? "über" : "im";
}

/* ---------- Ausgabe ---------- */
function buildOne(date, rep) {
  let o = `Quartalsuntersuchung in der Übersicht, Labor vom ${fmt(date)}\n`,
    grp = "";
  I.forEach(([g, id, l, k, u]) => {
    if (g === "NU" && id === "hv") return;
    if (g !== grp) {
      o += `\n${g}\n`;
      grp = g;
    }
    if (g === "NU") {
      if (id === "gfr") {
        o += `GFR Kreatinin (CKD-EPI): ${rep.v.gfr || "–"} ml/min\n`;
        const a = num(rep.v.hv),
          b = num(rep.v.hn);
        o += `Harnstoff: ${rep.v.hv || "–"} mg/dl vor / ${rep.v.hn || "–"} mg/dl nach NU`;
        if (a > 0 && b >= 0)
          o += ` (URR ca. ${Math.round((1 - b / a) * 100)} %)`;
        o += "\n";
      }
      return;
    }
    const v = rep.v[id];
    if (!v) {
      o += `${l}: nicht im Labor enthalten\n`;
      return;
    }
    const r = rate(rep, id, v),
      tg = DEF[id];
    o +=
      `${l}: ${v} ${u}${r ? ` (${(tg ? WORD : WORDL)[r]})` : ""}. ` +
      (tg
        ? "Zielbereich: " + tg.replace(/-/g, " bis ")
        : "Laborrichtwert: " + (rep.lab[id] || "??")) +
      "\n";
  });
  return o;
}
const build = () => buildOne(S.date, S);
const show = () => {
  $("out").textContent = hasData() ? build() : "Noch keine Werte.";
};

// Neue Werte ergänzen die Basis oder aktualisieren vorhandene; nicht enthaltene bleiben bestehen
function load(t) {
  const rep = parse(t);
  if (!rep.n) {
    $("msg").className = "";
    $("msg").textContent = "Keine Laborwerte erkannt.";
    return;
  }
  let neu = 0,
    upd = 0;
  Object.keys(rep.v).forEach((id) => {
    if (id in S.v) {
      if (S.v[id] !== rep.v[id]) upd++;
    } else neu++;
    S.v[id] = rep.v[id];
    S.lab[id] = rep.lab[id];
  });
  show();
  const total = I.length,
    have = I.filter((x) => x[1] in S.v).length,
    fehlt = I.filter((x) => !(x[1] in S.v)).map((x) => x[2]);
  const info = `${neu} neu, ${upd} aktualisiert`;
  $("msg").className = fehlt.length ? "" : "ok";
  $("msg").textContent = fehlt.length
    ? `${have} von ${total} Werten gelesen (${info}). Fehlt: ${fehlt.join(", ")}.`
    : `✓ Alle ${total} Werte gelesen (${info}).`;
}

/* ---------- Drag & Drop, Zwischenablage ---------- */
const drop = $("drop");
["dragenter", "dragover"].forEach((e) =>
  drop.addEventListener(e, (ev) => {
    ev.preventDefault();
    drop.classList.add("over");
  }),
);
["dragleave", "drop"].forEach((e) =>
  drop.addEventListener(e, (ev) => {
    ev.preventDefault();
    drop.classList.remove("over");
  }),
);
drop.addEventListener("drop", async (ev) => {
  let t = ev.dataTransfer.getData("text/plain");
  if (!t && ev.dataTransfer.files[0]) t = await ev.dataTransfer.files[0].text();
  load(t || "");
});
drop.onclick = () => drop.focus();
$("clip").onclick = async (ev) => {
  ev.stopPropagation();
  try {
    load(await navigator.clipboard.readText());
  } catch (e) {
    $("msg").className = "";
    $("msg").textContent =
      "Zugriff auf die Zwischenablage nicht erlaubt. Bitte ⌘V / Strg+V drücken.";
  }
};
document.addEventListener("paste", (ev) => {
  const t = (ev.clipboardData || window.clipboardData).getData("text");
  if (t.split(/[\t\n\r]+/).length < 3) return;
  ev.preventDefault();
  load(t);
});

/* ---------- Datum (Browser-Datepicker) ---------- */
function dlab() {
  $("datum").value = S.date;
}
$("datum").addEventListener("change", (e) => {
  // Datum gelöscht -> heutiges Datum als Fallback
  S.date = e.target.value || iso(new Date());
  dlab();
  if (hasData()) show();
});

/* ---------- Copy & Reset ---------- */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback für unsichere Kontexte / ältere Browser
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("copy failed");
}
$("CopyBtn").onclick = async () => {
  const b = $("CopyBtn");
  if (!hasData()) {
    // nichts zu kopieren: Button wackelt kurz + Hinweis
    b.classList.remove("shake");
    void b.offsetWidth;
    b.classList.add("shake", "tip");
    clearTimeout(b._tt);
    b._tt = setTimeout(() => b.classList.remove("tip"), 2200);
    $("msg").className = "";
    $("msg").textContent = "Noch keine Werte zum Kopieren.";
    return;
  }
  try {
    await copyText(build());
    b.classList.add("done");
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove("done"), 2000);
  } catch (e) {
    $("msg").className = "";
    $("msg").textContent = "Kopieren nicht erlaubt, bitte Text markieren.";
  }
};
$("CopyBtn").addEventListener("animationend", () =>
  $("CopyBtn").classList.remove("shake"),
);
$("resetBtn").onclick = () => {
  S = { date: iso(new Date()), v: {}, lab: {} };
  dlab();
  $("msg").className = "";
  $("msg").textContent = "";
  show();
};

dlab();