// Export Excel du contenu en ligne (ce que voient réellement les élèves), au format relu par l'import.
import { strategies, ORDRE_EXPLORER } from './notions/table.js';

const ENTETES_BANQUE = ['Numéro exercice', 'Enoncé', 'Variable question', 'Obligatoire (occurrences question)', 'Corrigé question',
  'Pourquoi 1', 'Pourquoi 2', 'Pourquoi 3', 'Pourquoi 4', 'Réponse juste', 'Pourquoi 5', 'Pourquoi 6', 'Pourquoi 7', 'Pourquoi 8',
  'Thème', 'Sous-thème', 'Niveau', 'Corrigé', 'Notion', 'Générateur'];
const ENTETES_TABLES = ['Notion', 'Ordre', 'Facteur', 'Calcul', 'Résultat', 'Choix n°', 'Texte du choix', 'Juste', 'Stratégie', 'Explication si choisi'];

function lignesBanque(exos) {
  const rows = [ENTETES_BANQUE];
  for (const e of [...exos].sort((a, b) => a.notion.localeCompare(b.notion) || a.numero - b.numero)) {
    for (const v of e.variantes || []) {
      const p = [...(v.pourquoi || []), '', '', '', '', '', '', '', ''].slice(0, 8);
      rows.push([e.numero, e.enonce, v.variable, v.occ || 1, v.corrige, p[0], p[1], p[2], p[3], v.juste >= 0 && v.pourquoi?.length ? `Pourquoi ${v.juste + 1}` : '',
        p[4], p[5], p[6], p[7], e.theme || '', e.sousTheme || '', e.niveau || '', v.texte || '', e.notion, v.generateur || '']);
    }
  }
  return rows;
}
// Questions de la séquence 1 d'une table : celles importées, sinon celles par défaut de la plateforme
export function sequence1De(notion, config) {
  if (Array.isArray(config?.sequence1) && config.sequence1.length) return { source: 'importé', questions: config.sequence1 };
  const t = +notion.split('-')[1];
  return { source: 'par défaut', questions: ORDRE_EXPLORER.map((k, i) => ({ k, ordre: i + 1, options: strategies(t, k, 'tk', true).map((o) => ({ texte: o.texte, ok: o.ok, ...(o.cat ? { cat: o.cat } : {}), ...(o.expl ? { expl: o.expl } : {}) })) })) };
}
function lignesTables(notions, config) {
  const rows = [ENTETES_TABLES];
  for (const n of notions.filter((x) => /^table-\d$/.test(x))) {
    const t = +n.split('-')[1];
    for (const q of sequence1De(n, config[n]).questions) q.options.forEach((o, j) => rows.push([n, q.ordre, q.k, `${t} × ${q.k}`, t * q.k, j + 1, o.texte, o.ok ? 'oui' : 'non', o.cat && o.cat !== 'autre' ? o.cat : '', o.expl || '']));
  }
  return rows;
}
export function exporterExcel(XLSX, { notions, exercices, config, titres }) {
  const wb = XLSX.utils.book_new();
  const ajout = (nom, rows, largeurs) => { const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = largeurs.map((w) => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, nom); };
  const exos = exercices.filter((e) => notions.includes(e.notion));
  ajout('Mode d\'emploi', [
    ['Contenu de la plateforme, exporté le ' + new Date().toLocaleString('fr-FR')],
    ['Notions : ' + notions.map((n) => titres[n] || n).join(', ')],
    [''],
    ['Modifie les lignes voulues, puis importe ce fichier : Espace enseignant → Banque d\'exercices → Importer.'],
    ['Seules les notions présentes dans le fichier sont concernées ; l\'aperçu indique pour chacune « inchangée », « modifiée » ou « nouvelle ».'],
    ['Banque : une ligne = une variante de question oui/non. Tables : une ligne = un choix de « Pourquoi ? » (séquence 1 d\'Explorer).'],
    ['Repères des tables : {calc}, {autre}, {×N}, {t}, {k}, {r}. Stratégies : ajout, retrait, commute, double, moitie10, dixplus, coeur, pose, zero, un, dix.'],
  ], [110]);
  if (exos.length) ajout('Banque', lignesBanque(exos), [8, 34, 30, 10, 10, 34, 34, 34, 34, 12, 30, 30, 30, 30, 18, 24, 8, 50, 22, 22]);
  const parcours = [['Notion', 'Seuil Explorer'], ...notions.filter((n) => config[n]?.seuilExplorer).map((n) => [n, config[n].seuilExplorer])];
  if (parcours.length > 1) ajout('Parcours', parcours, [24, 16]);
  if (notions.some((n) => /^table-\d$/.test(n))) ajout('Tables', lignesTables(notions, config), [10, 7, 8, 9, 9, 8, 60, 7, 11, 60]);
  const date = new Date().toISOString().slice(0, 10);
  const nom = notions.length === 1 ? notions[0] : notions.length === Object.keys(titres).length ? 'complet' : `${notions.length}-notions`;
  XLSX.writeFile(wb, `contenu_${nom}_${date}.xlsx`);
}
