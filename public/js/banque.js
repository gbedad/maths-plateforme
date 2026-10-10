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
