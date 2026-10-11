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
// entier(a; b) · entier(a; b; pair|impair|multiple de m|pas multiple de m)
GEN.entier = (a, b, cond = '') => {
  const lo = +String(a).replace(',', '.'), hi = +String(b).replace(',', '.');
  const c = String(cond).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mm = c.match(/multiple\s+de\s+(\d+)/), m = mm ? +mm[1] : null, pas = /\bpas\b|\bnon\b/.test(c);
  const ok = (n) => (c.includes('impair') ? Math.abs(n % 2) === 1 : c.includes('pair') ? n % 2 === 0 : m ? (pas ? n % m !== 0 : n % m === 0) : true);
  let n, e = 0; do { n = rnd(lo, hi); e++; } while (!ok(n) && e < 500);
  const vars = { suivant: fmt(n + 1), precedent: fmt(n - 1), double: fmt(2 * n) };
  if (m) { const q = Math.floor(n / m); Object.assign(vars, { m: String(m), q: fmt(q), bas: fmt(m * q), haut: fmt(m * (q + 1)) }); }
  return { html: fmt(n), text: fmt(n), vars };
};
// liste(12; 18; 2,5; -3; 7/2) : un élément au hasard
GEN.liste = (...items) => GEN.valeur(items[rnd(0, items.length - 1)]);
GEN.negatif = () => { const n = -rnd(1, 99); return { html: fmt(n), text: fmt(n), vars: {} }; };
// decimal() · decimal(min; max; nb de chiffres après la virgule) : jamais entier
GEN.decimal = (min, max, nd) => {
  let v;
  if (min === undefined) { const e = rnd(0, 99), d = Math.random() < 0.5 ? rnd(1, 9) / 10 : rnd(1, 99) / 100; v = Math.round((e + d) * 100) / 100; }
  else {
    const k = Math.max(1, Math.min(4, parseInt(nd, 10) || 1)), p = 10 ** k, lo = Math.round(+String(min).replace(',', '.') * p), hi = Math.round(+String(max).replace(',', '.') * p);
    let n, e = 0; do { n = rnd(lo, hi); e++; } while ((n % 10 === 0) && e < 500);
    v = n / p;
  }
  return { html: fmt(v), text: fmt(v), vars: { bas: fmt(Math.floor(v)), haut: fmt(Math.floor(v) + 1), arrondi: fmt(Math.round(v)) } };
};
// fraction() · fraction(min; max) · fraction(min; max; entiere|non entiere) — dénominateur de 2 à 9
GEN.fraction = (min = 1, max = 60, cond = 'non entiere') => {
  const c = String(cond).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), veutEntier = !/non|pas/.test(c) && c.includes('entier');
  let a, b, e = 0; do { b = rnd(2, 9); a = rnd(+min, +max); e++; } while ((veutEntier ? a % b !== 0 : a % b === 0) && e < 500);
  return { html: fracHTML(a, b), text: `${a}/${b}`, vars: { approx: fmt(Math.round((a / b) * 100) / 100), num: String(a), den: String(b), valeur: fmt(a / b) } };
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
  const sep = m[2].includes(';') ? ';' : ',';
  const args = m[2].split(sep).map((x) => x.trim()).filter((x) => x !== '');
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

// Tables de multiplication (6e) — vars : t (table), k, k1, k2, a, b (encadrement), r (bon résultat)
const encadre = (t, n) => { const k1 = Math.floor(n / t), k2 = k1 + 1; return { k1: String(k1), k2: String(k2), a: fmt(t * k1), b: fmt(t * k2) }; };
const tmItem = (n, t, extra = {}) => ({ html: fmt(n), text: `${fmt(n)} (table de ${t})`, vars: { t: String(t), ...extra } });
GEN.tm_produit = () => { const t = rnd(2, 9), k = rnd(2, 9); return tmItem(t * k, t, { k: String(k) }); };
GEN.tm_zero = () => { const t = rnd(2, 9); return tmItem(0, t, { k: '0' }); };
GEN.tm_lui_meme = () => { const t = rnd(2, 9); return tmItem(t, t, { k: '1' }); };
GEN.tm_voisin = () => { const t = rnd(3, 9), k = rnd(2, 9), n = t * k + (Math.random() < 0.5 ? 1 : -1); return tmItem(n, t, encadre(t, n)); };
GEN.tm_terminaison = () => {
  let t, n, essais = 0;
  do { t = [3, 4, 6, 7, 8, 9][rnd(0, 5)]; n = rnd(1, Math.floor((t * 10 - t) / 10)) * 10 + t; essais++; } while ((n % t === 0 || n > t * 10) && essais < 50);
  if (n % t === 0) { t = 7; n = 27; }
  return tmItem(n, t, encadre(t, n));
};
const mulItem = (a, b, n) => ({ html: fmt(n), text: `${a} × ${b} = ${n}`, vars: { a: String(a), b: String(b), r: fmt(a * b) } });
GEN.mul_juste = () => { const a = rnd(2, 9), b = rnd(2, 9); return mulItem(a, b, a * b); };
GEN.mul_decale = () => { const a = rnd(3, 9), b = rnd(3, 9), b2 = b + (Math.random() < 0.5 ? 1 : -1); const q = mulItem(a, b, a * b2); q.vars.b2 = String(b2); return q; };
GEN.mul_addition = () => { const a = rnd(3, 9), b = rnd(3, 9); return mulItem(a, b, a + b); };
GEN.mul_inverse = () => {
  let a, b, r;
  do { a = rnd(3, 9); b = rnd(3, 9); r = a * b; } while (r < 12 || r % 10 === 0 || String(r)[0] === String(r)[1] || (+String(r).split('').reverse().join('')) === r);
  return mulItem(a, b, +String(r).split('').reverse().join(''));
};
