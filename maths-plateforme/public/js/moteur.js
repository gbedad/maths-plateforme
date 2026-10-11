// Moteur d'exercices : générateurs de nombres, remplissage des textes, tirage d'une série.
import { rnd, shuffle, esc, fmt, fracHTML, decStr, sciParts, puiss, puissTxt, expo } from './outils.js';

/* ---------- Générateurs (nom utilisé dans la colonne « Générateur » de l'Excel) ---------- */
export const GEN = {};

// Communs
GEN.valeur = (x) => {
  const s = String(x).trim();
  const m = s.match(/^(-?\d+)\/(\d+)$/);
  if (m) return { html: fracHTML(+m[1], +m[2]), text: s, vars: {} };
  const t = s.replace(/-/g, '−').replace('.', ',');
  return { html: esc(t), text: t, vars: {} };
};

// Entiers naturels
GEN.entier = (a, b) => { const n = rnd(+a, +b); return { html: fmt(n), text: fmt(n), vars: {} }; };
GEN.negatif = () => { const n = -rnd(1, 99); return { html: fmt(n), text: fmt(n), vars: {} }; };
GEN.decimal = () => {
  const e = rnd(0, 99), d = Math.random() < 0.5 ? rnd(1, 9) / 10 : rnd(1, 99) / 100, v = Math.round((e + d) * 100) / 100;
  return { html: fmt(v), text: fmt(v), vars: { bas: fmt(Math.floor(v)), haut: fmt(Math.floor(v) + 1) } };
};
GEN.fraction = () => {
  let a, b; do { b = rnd(2, 9); a = rnd(1, 60); } while (a % b === 0);
  return { html: fracHTML(a, b), text: `${a}/${b}`, vars: { approx: fmt(Math.round((a / b) * 100) / 100) } };
};
GEN.non_naturel = () => [GEN.negatif, GEN.decimal, GEN.fraction][rnd(0, 2)]();

// Écriture scientifique
const chiffres = (len) => { let s = String(rnd(1, 9)); for (let i = 1; i < len; i++) s += String(i === len - 1 ? rnd(1, 9) : rnd(0, 9)); return s; };
export function sciItem(Dm, k, base, n) {
  const a = decStr(Dm, -k);
  const vars = { a, n: expo(n), b: String(base) };
  if (base === 10) { const s = sciParts(Dm, n - k); vars.sci = puiss(s.a, 10, s.n); vars.dec = decStr(Dm, n - k); }
  return { html: puiss(a, base, n), text: puissTxt(a, base, n), vars };
}
GEN.sci_valide = (nmin = 2, nmax = 9) => { const D = chiffres(rnd(2, 3)); return sciItem(D, D.length - 1, 10, rnd(+nmin, +nmax)); };
GEN.sci_unite = () => sciItem(String(rnd(1, 9)), 0, 10, rnd(3, 8));
GEN.sci_grand = () => { const len = rnd(2, 3), D = chiffres(len), k = rnd(0, len - 2); return sciItem(D, k, 10, rnd(2, 6)); };
GEN.sci_petit = () => { const D = chiffres(rnd(1, 2)); return sciItem(D, D.length + rnd(0, 1), 10, rnd(3, 8)); };
GEN.sci_dix = () => sciItem('10', 0, 10, rnd(2, 7));
GEN.ecriture_decimale = () => {
  const D = chiffres(rnd(2, 3));
  const e = Math.random() < 0.5 ? rnd(2, 5) : -(D.length + rnd(1, 3));
  const s = sciParts(D, e), t = decStr(D, e);
  return { html: esc(t), text: t, vars: { sci: puiss(s.a, 10, s.n), dec: t } };
};
GEN.autre_base = () => { const D = chiffres(2); return sciItem(D, 1, [2, 3, 5][rnd(0, 2)], rnd(2, 6)); };

/* ---------- Textes : {} = le nombre tiré, {clé} = valeur calculée par le générateur ---------- */
export function remplir(tpl, q) {
  return esc(tpl || '').replace(/\{(\w*)\}/g, (_, k) => (k === '' ? q.html : q.vars?.[k] ?? ''));
}
export function lireGenerateur(s) {
  const m = String(s || '').trim().match(/^([a-z_]+)\s*\(([^)]*)\)$/i);
  if (!m) return null;
  const args = m[2].split(',').map((x) => x.trim()).filter((x) => x !== '');
  return { nom: m[1], args };
}

/* ---------- Tirage d'une question et d'une série ---------- */
export function tirerQuestion(v) {
  const g = lireGenerateur(v.generateur);
  if (!g || !GEN[g.nom]) throw new Error(`Générateur inconnu : ${v.generateur}`);
  const q = GEN[g.nom](...g.args);
  return {
    ...q,
    variante: v.id, libelle: v.variable,
    correct: v.corrige,
    pourquoi: (v.pourquoi || []).map((t) => remplir(t, q)),
    juste: v.juste,
    texte: remplir(v.texte, q),
  };
}

export function tirerSerie(exercice) {
  const pool = [];
  exercice.variantes.forEach((v) => { for (let i = 0; i < (v.occ || 1); i++) pool.push(v); });
  let seq, essais = 0;
  do { seq = shuffle(pool); essais++; } while (essais < 500 && seq.some((v, i) => i > 0 && v.id === seq[i - 1].id));
  const vus = new Set();
  return seq.map((v) => {
    let q, n = 0;
    do { q = tirerQuestion(v); n++; } while (vus.has(q.text) && n < 12);
    vus.add(q.text);
    return q;
  });
}
