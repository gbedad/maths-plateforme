// Lecture de la banque d'exercices Excel (format de l'enseignant) → exercices JSON.
// Utilisé dans le navigateur (import par l'enseignant) et en ligne de commande (scripts/seed.mjs).
import { GEN, lireGenerateur } from './moteur.js';

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const COLS = {
  numero: ['numero exercice'], enonce: ['enonce'], variable: ['variable question'], occ: ['obligatoire (occurrences question)', 'obligatoire'],
  corrige: ['corrige question'], juste: ['reponse juste'], theme: ['theme'], sousTheme: ['sous-theme'], niveau: ['niveau'],
  texte: ['corrige'], notion: ['notion'], generateur: ['generateur'],
};

export function deduireNotion(enonce, sousTheme) {
  const t = norm(enonce + ' ' + sousTheme);
  if (t.includes('scientifique')) return 'ecriture-scientifique';
  if (t.includes('entier naturel') || t.includes('classification')) return 'entiers-naturels';
  return '';
}
export function deduireGenerateur(variable) {
  const v = String(variable ?? '').trim();
  if (/^-?\d+([.,]\d+)?$/.test(v) || /^-?\d+\/\d+$/.test(v)) return `valeur(${v})`;
  const t = norm(v).replace(/(\d)\s+(?=\d)/g, '$1');
  let m = t.match(/entre\s+(-?\d+)\s+et\s+(-?\d+)/);
  if (m && t.includes('entier')) return `entier(${m[1]},${m[2]})`;
  if (t.includes('non entier naturel')) {
    if (t.includes('negatif')) return 'negatif()';
    if (t.includes('decimal')) return 'decimal()';
    if (t.includes('fraction')) return 'fraction()';
    return 'non_naturel()';
  }
  return '';
}

/** rows : tableau de lignes (tableaux de cellules), la 1re ligne contient les en-têtes */
export function lireBanque(rows) {
  const avertissements = [];
  const entetes = (rows[0] || []).map(norm);
  const idx = {};
  for (const [k, noms] of Object.entries(COLS)) idx[k] = entetes.findIndex((h) => noms.includes(h));
  const pIdx = [];
  for (let i = 1; i <= 8; i++) pIdx.push(entetes.indexOf(`pourquoi ${i}`));
  for (const k of ['enonce', 'variable', 'corrige']) if (idx[k] < 0) throw new Error(`Colonne manquante dans le fichier : « ${{ enonce: 'Enoncé', variable: 'Variable question', corrige: 'Corrigé question' }[k]} ».`);

  const exos = new Map();
  rows.slice(1).forEach((r, i) => {
    const ligne = i + 2;
    const cell = (k) => (idx[k] >= 0 ? r[idx[k]] : undefined);
    const enonce = String(cell('enonce') ?? '').trim();
    const corrige = norm(cell('corrige'));
    if (!enonce || !['oui', 'non'].includes(corrige)) return; // lignes de notes : ignorées
    const variable = cell('variable');
    const notion = String(cell('notion') ?? '').trim() || deduireNotion(enonce, cell('sousTheme'));
    if (!notion) { avertissements.push(`Ligne ${ligne} : notion inconnue, ligne ignorée. Remplis la colonne « Notion ».`); return; }
    const generateur = String(cell('generateur') ?? '').trim() || deduireGenerateur(variable);
    const g = lireGenerateur(generateur);
    if (!g || !GEN[g.nom]) { avertissements.push(`Ligne ${ligne} : je ne sais pas tirer « ${variable} ». Remplis la colonne « Générateur » (voir l'onglet Générateurs).`); return; }

    // Pourquoi : on garde l'ordre, on retire les cases vides et les doublons
    const bruts = pIdx.map((j, k) => ({ k: k + 1, t: j >= 0 ? String(r[j] ?? '').trim() : '' })).filter((x) => x.t);
    const pourquoi = [], origine = [];
    for (const x of bruts) {
      if (pourquoi.includes(x.t)) { avertissements.push(`Ligne ${ligne} : « Pourquoi ${x.k} » répète un choix déjà présent, il est ignoré.`); continue; }
      pourquoi.push(x.t); origine.push(x.k);
    }
    let juste = -1;
    const mj = String(cell('juste') ?? '').match(/(\d+)/);
    if (pourquoi.length) {
      if (mj) juste = origine.indexOf(+mj[1]);
      if (juste < 0) { avertissements.push(`Ligne ${ligne} : « Réponse juste » ne désigne aucun choix rempli. La question sera posée sans « Pourquoi ? ».`); pourquoi.length = 0; }
    }
    const numero = parseInt(cell('numero'), 10) || 1;
    const cle = `${notion}|${numero}`;
    if (!exos.has(cle)) exos.set(cle, { notion, numero, enonce, theme: String(cell('theme') ?? ''), sousTheme: String(cell('sousTheme') ?? ''), niveau: String(cell('niveau') ?? ''), variantes: [] });
    const ex = exos.get(cle);
    ex.variantes.push({
      id: `L${ligne}`, ligne,
      variable: String(variable ?? ''), occ: Math.max(1, parseInt(cell('occ'), 10) || 1), corrige,
      pourquoi, juste, texte: String(cell('texte') ?? '').trim(), generateur,
    });
  });
  const exercices = [...exos.values()];
  if (!exercices.length) throw new Error('Aucune question valide trouvée. Vérifie que la colonne « Corrigé question » contient oui ou non.');
  return { exercices, avertissements };
}

/** Feuille « Parcours » (facultative) : une ligne par notion, avec ses réglages. */
export function lireParcours(rows) {
  if (!rows || !rows.length) return {};
  const h = (rows[0] || []).map(norm);
  const iN = h.indexOf('notion'), iS = h.findIndex((x) => x.startsWith('seuil explorer'));
  const config = {};
  for (const r of rows.slice(1)) {
    const notion = String(r[iN] ?? '').trim();
    if (!notion) continue;
    const seuil = parseInt(r[iS], 10);
    config[notion] = { seuilExplorer: seuil > 0 ? seuil : 6 };
  }
  return config;
}

/** Feuille « Tables » (facultative) : questions de la séquence 1 d'Explorer pour les tables de multiplication.
 *  Une ligne = un choix de réponse au « Pourquoi ? ». Les lignes d'une même question partagent Notion + Facteur. */
const STRATEGIES = ['ajout', 'retrait', 'commute', 'double', 'moitie10', 'dixplus', 'coeur', 'pose', 'zero', 'un', 'dix'];
export function lireTables(rows) {
  const config = {}, avertissements = [];
  if (!rows || !rows.length) return { config, avertissements };
  const h = (rows[0] || []).map(norm);
  const col = (...noms) => h.findIndex((x) => noms.some((n) => x.startsWith(n)));
  const c = { notion: col('notion'), ordre: col('ordre'), k: col('facteur'), texte: col('texte'), juste: col('juste'), strat: col('strategie'), expl: col('explication') };
  if (c.notion < 0 || c.k < 0 || c.texte < 0 || c.juste < 0) throw new Error('Feuille « Tables » : il faut au moins les colonnes Notion, Facteur, Texte du choix et Juste.');
  const qs = new Map();
  rows.slice(1).forEach((r, i) => {
    const ligne = i + 2, notion = String(r[c.notion] ?? '').trim(), texte = String(r[c.texte] ?? '').trim();
    if (!notion || !texte) return;
    if (!/^table-[2-9]$/.test(notion)) { avertissements.push(`Tables, ligne ${ligne} : notion « ${notion} » inconnue (table-2 à table-9).`); return; }
    const k = parseInt(r[c.k], 10);
    if (!(k >= 0 && k <= 12)) { avertissements.push(`Tables, ligne ${ligne} : le facteur doit être un nombre de 0 à 12.`); return; }
    const j = norm(r[c.juste]);
    if (!['oui', 'non'].includes(j)) { avertissements.push(`Tables, ligne ${ligne} : la colonne « Juste » doit contenir oui ou non.`); return; }
    let cat = c.strat >= 0 ? norm(r[c.strat]) : '';
    if (cat && !STRATEGIES.includes(cat)) { avertissements.push(`Tables, ligne ${ligne} : stratégie « ${cat} » inconnue, elle ne comptera pas dans la fiche mémo.`); cat = ''; }
    const cle = `${notion}|${k}`;
    if (!qs.has(cle)) qs.set(cle, { notion, k, ordre: parseInt(r[c.ordre], 10) || 99, options: [] });
    const q = qs.get(cle);
    if (q.options.length >= 6) { avertissements.push(`Tables, ligne ${ligne} : 6 choix au maximum par question, ligne ignorée.`); return; }
    q.options.push({ texte, ok: j === 'oui', ...(cat ? { cat } : {}), ...(c.expl >= 0 && String(r[c.expl] ?? '').trim() ? { expl: String(r[c.expl]).trim() } : {}) });
  });
  for (const q of qs.values()) {
    if (!q.options.some((o) => o.ok)) { avertissements.push(`Tables, ${q.notion} × ${q.k} : aucun choix marqué juste, la question garde le modèle par défaut.`); continue; }
    if (q.options.length < 2) avertissements.push(`Tables, ${q.notion} × ${q.k} : un seul choix, l'élève n'aura pas à réfléchir.`);
    (config[q.notion] ||= { sequence1: [] }).sequence1.push({ k: q.k, ordre: q.ordre, options: q.options });
  }
  for (const [n, v] of Object.entries(config)) {
    v.sequence1.sort((a, b) => a.ordre - b.ordre);
    const manquants = [...Array(13).keys()].filter((k) => !v.sequence1.some((q) => q.k === k));
    if (manquants.length) avertissements.push(`Tables, ${n} : pas de question pour × ${manquants.join(', × ')} ; le modèle par défaut sera utilisé pour ${manquants.length > 1 ? 'ces facteurs' : 'ce facteur'}.`);
  }
  return { config, avertissements };
}
