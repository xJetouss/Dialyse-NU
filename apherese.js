/* Laborauswertung Lipidapherese – keine Speicherung, alles nur im Arbeitsspeicher */

// [Gruppe, id, Anzeigename, Suchbegriff im Labortext, Einheit]
const I = [
  [
    "Absenkrate",
    "lpv",
    "Lipoprotein(a) vor Apherese",
    "Lipoprotein(a) (TURB)",
    "nmol/l",
  ],
  [
    "Absenkrate",
    "lpn",
    "Lipoprotein(a) nach Apherese",
    "Lipoprotein(a) nach Apherese",
    "nmol/l",
  ],
  [
    "Absenkrate",
    "ldv",
    "LDL-C vor Apherese",
    "LDL-Cholesterin (PHOT)",
    "mg/dl",
  ],
  [
    "Absenkrate",
    "ldn",
    "LDL-C nach Apherese",
    "LDL-Cholesterin n. Apherese",
    "mg/dl",
  ],
  ["Safety", "crp", "CRP", "CRP", "mg/l"],
  ["Safety", "fib", "Fibrinogen", "Fibrinogen", "g/l"],
  ["Safety", "igg", "IgG", "Immunglobulin G", "mg/dl"],
  ["Safety", "igm", "IgM", "Immunglobulin M", "mg/dl"],
  ["Safety", "alb", "Albumin", "Albumin i.S.", "g/l"],
  ["Safety", "ca", "Calcium", "Calcium", "mmol/l"],
  ["Safety", "hb", "Hämoglobin", "Hämoglobin (PHOT)", "g/dl"],
  ["Safety", "hkt", "Hämatokrit", "Hämatokrit", "%"],
  ["Safety", "fer", "Ferritin", "Ferritin", "µg/l"],
  ["Safety", "tsat", "Transferrinsättigung", "Transferrinsättigung", "%"],
  ["Safety", "plt", "Thrombozyten", "Thrombozyten", "/nl"],
];

// Handlungshinweise bei Safety-Werten (n = Zahlenwert)
const R = {
  crp: (n) => (n > 30 ? "Keine Behandlung bei Werten > 30 mg/l." : ""),
  fib: (n) =>
    n < 1.5
      ? "Behandlungspause, bis Fibrinogen wieder > 1,5 g/l ist."
      : n <= 2.0
        ? "Behandlung alle 2 Wochen oder DALI."
        : "",
  igg: (n) =>
    n < 400
      ? "Bei Infektneigung Behandlungsintervalle strecken oder DALI."
      : "",
  igm: (n) =>
    n < 10 ? "Bei Infektneigung Behandlungsintervalle strecken oder DALI." : "",
  alb: (n) => (n < 30 ? "Keine Behandlung bei Werten < 30 g/l." : ""),
  ca: (n) =>
    n < 2 ? "Bei Citratgabe auf hypocalcämische Symptome achten." : "",
  hb: (n) => (n < 12 ? "Eisensubstitution erwägen." : ""),
  hkt: (n) => (n > 55 ? "Keine MONET-Behandlung bei Werten > 55 %." : ""),
  fer: (n) => (n < 50 ? "Eisensubstitution erwägen." : ""),
  tsat: (n) => (n < 20 ? "Eisensubstitution erwägen." : ""),
  plt: (n) =>
    n < 100
      ? "HIT-Diagnostik, Antikoagulation überprüfen, DALI-System zu groß?"
      : "",
};

const MASSNAHMEN =
  "\nMaßnahmen bei zu geringer Absenkung\n" +
  "MONET: Steigerung des Behandlungsvolumens (und damit der Behandlungsdauer).\n" +
  "DALI: Steigerung des Behandlungsvolumens auf maximal 180 % des Blutvolumens; " +
  "Steigerung der Absorbergröße (750, dann 1000, dann 500+750=1250); " +
  "Senkung der Flussgeschwindigkeit zur Verlängerung der Kontaktzeit.\n";

const MN = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

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

let S = { date: iso(new Date()), v: {}, lab: {} };
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
function rate(lab, val) {
  const r = range(lab),
    n = num(val);
  if (!r || isNaN(n)) return "";
  return n < r[0]
    ? "unter dem Laborrichtwert"
    : n > r[1]
      ? "über dem Laborrichtwert"
      : "im Laborrichtwert";
}

/* ---------- Ausgabe ---------- */
const absenkung = (vor, nach) => ((vor - nach) / vor) * 100;
const pct = (p) => String(Math.round(p));

function buildOne(date, rep) {
  let o = `Quartalsuntersuchung Lipidapherese in der Übersicht, Labor vom ${fmt(date)}\n`;
  let zuWenig = false;
  const val = (id) => rep.v[id];
  const fehlt = (l) => `${l}: nicht im Labor enthalten\n`;

  /* --- Absenkrate --- */
  o += "\nAbsenkrate\n";
  const lpv = num(val("lpv")),
    lpn = num(val("lpn")),
    ldv = num(val("ldv")),
    ldn = num(val("ldn"));

  o += val("lpv")
    ? `Lipoprotein(a) vor Apherese: ${val("lpv")} nmol/l\n`
    : fehlt("Lipoprotein(a) vor Apherese");
  o += val("lpn")
    ? `Lipoprotein(a) nach Apherese: ${val("lpn")} nmol/l\n`
    : fehlt("Lipoprotein(a) nach Apherese");
  if (!isNaN(lpv) && !isNaN(lpn) && lpv > 0) {
    const p = absenkung(lpv, lpn);
    o += `Lipoprotein(a) Absenkung: ${pct(p)} %`;
    if (lpv > 30) {
      if (p < 60) {
        zuWenig = true;
        o += " (Ziel > 60 %: nicht erreicht)";
      } else o += " (Ziel > 60 %: erreicht)";
    } else o += " (Ziel nur bei Lipoprotein(a) vor Apherese > 30 nmol/l)";
    o += "\n";
  }

  o += val("ldv")
    ? `LDL-C vor Apherese: ${val("ldv")} mg/dl (Zielwert optimal < 55 mg/dl${
        !isNaN(ldv) ? (ldv < 55 ? ": erreicht" : ": nicht erreicht") : ""
      })\n`
    : fehlt("LDL-C vor Apherese");
  o += val("ldn")
    ? `LDL-C nach Apherese: ${val("ldn")} mg/dl\n`
    : fehlt("LDL-C nach Apherese");
  if (!isNaN(ldv) && !isNaN(ldn) && ldv > 0) {
    const p = absenkung(ldv, ldn);
    o += `LDL-C Absenkung: ${pct(p)} %`;
    if (ldv > 55) {
      if (p < 60) {
        zuWenig = true;
        o += " (Ziel > 60 %: nicht erreicht)";
      } else o += " (Ziel > 60 %: erreicht)";
    } else o += " (Ziel nur bei LDL-C vor Apherese > 55 mg/dl)";
    o += "\n";
  }
  if (zuWenig) o += MASSNAHMEN;

  /* --- Safety --- */
  o += "\nSafety\n";
  I.forEach(([g, id, l, k, u]) => {
    if (g !== "Safety") return;
    const v = rep.v[id];
    if (!v) {
      o += fehlt(l);
      return;
    }
    const r = rate(rep.lab[id], v);
    o +=
      `${l}: ${v} ${u}${r ? ` (${r})` : ""}.` +
      (rep.lab[id]
        ? ` Laborrichtwert: ${rep.lab[id].replace(/^([<>])/, "$1 ")}`
        : "") +
      "\n";
    const n = num(v);
    const h = !isNaN(n) && R[id] ? R[id](n) : "";
    if (h) o += `  → Hinweis: ${h}\n`;
  });
  return o;
}
const build = () => buildOne(S.date, S);
const show = () => {
  $("out").textContent = hasData() ? build() : "Noch keine Werte.";
};

// Neue Werte ergänzen die Basis oder aktualisieren vorhandene
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
  // leeres Feld (Datum gelöscht) -> heutiges Datum als Fallback
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
    b.classList.add("shake");
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
