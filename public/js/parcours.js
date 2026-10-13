// Parcours en 7 étapes, niveaux de maîtrise et fiche mémo (partagé élève / enseignant)
import { esc } from './outils.js';

export const ETAPES = [
  { id: 'explorer', nom: 'Explorer', desc: "Observe des exemples rangés en deux familles, puis trouve toi-même la règle.", etoiles: false },
  { id: 'comprendre', nom: 'Comprendre', desc: 'La définition, ta règle à côté, le testeur et les pièges.', etoiles: false },
  { id: 'ensavoirplus', nom: 'En savoir plus', desc: "D'où vient la notion et à quoi elle sert.", etoiles: false },
  { id: 'jouer', nom: 'Jouer', desc: "Attrape-les et Trouve l'intrus.", etoiles: false },
  { id: 'entrainer', nom: "S'entraîner", desc: 'Questions oui/non, puis le pourquoi.', etoiles: true },
  { id: 'retenir', nom: 'Retenir', desc: 'Ta fiche mémo et des révisions qui reviennent les jours suivants.', etoiles: true },
  { id: 'plusloin', nom: 'Aller plus loin', desc: 'Des défis et la porte vers la suite.', etoiles: true },
];
export const REGLES_ETOILES = {
  entrainer: ['Faire une série', 'Au moins 3 oui/non justes sur 4', 'Et au moins 3 justifications justes sur 4'],
  retenir: ['Faire une révision', 'Ancrer une compétence', 'Ancrer la moitié des compétences'],
  plusloin: ['Ouvrir l’étape', 'Réussir le premier défi', 'Réussir les deux défis'],
};
export const NIVEAUX = ['Pas encore vue', 'Découverte', 'En cours', 'Maîtrisée', 'Ancrée'];
export const COUL_NIV = ['#e4e9e7', '#9fb3c8', '#c9721a', '#0b6e66', '#123f3b'];
export const REGLE_NIV = ['', 'Tu as rencontré la question.', 'Tu as répondu juste au moins une fois.', 'Juste et bien justifié 3 fois de suite.', 'Encore réussie dans Retenir, au moins un jour après.'];

/** État des étapes : prog = { etape: {fait, etoiles} }, visibles = { etape: bool }, reveles = { etape: bool } */
export function etatEtapes(prog, visibles = {}, reveles = {}) {
  let ouvert = true;
  const res = [];
  for (const e of ETAPES) {
    const p = prog[e.id] || { fait: 0, etoiles: 0 };
    const visible = e.id === 'entrainer' || visibles[e.id] !== false || !!reveles[e.id];
    if (!visible) { res.push({ ...e, visible: false, fait: false, etoiles: 0, ouvert: false }); continue; }
    if (reveles[e.id] && visibles[e.id] === false) { res.push({ ...e, visible: true, fait: !!p.fait, etoiles: p.etoiles || 0, ouvert: true }); continue; }
    res.push({ ...e, visible: true, fait: !!p.fait, etoiles: p.etoiles || 0, ouvert });
    if (!p.fait) ouvert = false;
  }
  const courant = res.find((e) => e.visible && e.ouvert && !e.fait);
  res.forEach((e) => (e.courant = e === courant));
  return { etapes: res, termine: !courant && res.filter((e) => e.visible).every((e) => e.fait) };
}

export const etoilesHTML = (n, label = true, max = 3) => { n = Math.min(n, max); return `<span class="stars" ${label ? `aria-label="${n} étoile${n > 1 ? 's' : ''} sur ${max}"` : 'aria-hidden="true"'}>${'★'.repeat(n)}<span class="off">${'★'.repeat(max - n)}</span></span>`; };
// Étoiles possibles d'une étape pour une notion (3 pour S'entraîner, Retenir, Aller plus loin ; certaines notions en ajoutent, ex. 1 pour Explorer des tables)
export const etoilesMax = (notion, id) => (ETAPES.find((e) => e.id === id)?.etoiles ? 3 : notion?.etoilesMax?.[id] || 0);
export const etoilesTotal = (notion) => ETAPES.reduce((a, e) => a + etoilesMax(notion, e.id), 0);

export const dansJours = (iso) => {
  if (!iso) return '';
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
  return d <= 0 ? "aujourd'hui" : d === 1 ? 'demain' : `dans ${d} jours`;
};

/** Fiche mémo (données de /fiche) → HTML. definition : HTML de la règle officielle (contenu de confiance). */
export function ficheHTML(f, definition, { pourProf = false } = {}) {
  const tu = (a, b) => (pourProf ? b : a);
  const regle = f.regle ? `« ${esc(f.regle)} »` : `<span style="color:var(--ink-soft)">${tu("Tu n'as pas encore formulé ta règle : elle s'écrit à la fin d'Explorer.", 'Pas encore formulée.')}</span>`;
  return `
  <section class="fiche-top">
    <div class="fiche-off"><div class="eyebrow">La règle officielle</div>${definition}</div>
    <div class="fiche-moi"><div class="eyebrow">${tu('Ma règle, en mes mots', "Sa règle, en ses mots")} · Explorer</div><div class="fiche-regle">${regle}</div>
      ${f.regleCorrigee && f.regleCorrigee !== f.regle ? `<div class="fiche-corr">Corrigée dans Comprendre : « ${esc(f.regleCorrigee)} »</div>` : ''}</div>
  </section>
  <div class="grid2">
    <section class="card"><h3>${tu('Mes exemples', 'Ses exemples')}</h3><p class="mini">${tu('Les nombres que tu as testés toi-même dans Comprendre', 'Testés dans Comprendre')}</p>
      ${f.exemples.length ? f.exemples.map((x) => `<div class="fiche-li"><b class="m">${esc(x.saisie)}</b><span>${esc(x.resultat)}</span></div>`).join('') : `<p class="mini">${tu('Teste des nombres dans Comprendre : ils apparaîtront ici.', 'Aucun pour l’instant.')}</p>`}</section>
    <section class="card"><h3>${tu('Mes bonnes justifications', 'Ses bonnes justifications')}</h3><p class="mini">${tu('Les « pourquoi » que tu as bien choisis', 'Pourquoi bien choisis')}</p>
      ${f.justifications.length ? f.justifications.map((j) => `<div class="fiche-li"><b class="m">${esc(j.question)}</b><span>« ${esc(j.juste)} »</span></div>`).join('') : `<p class="mini">${tu('Elles apparaîtront après tes premières séries.', 'Aucune pour l’instant.')}</p>`}</section>
  </div>
  <section class="card"><h3>${tu('Mes pièges', 'Ses pièges')}</h3><p class="mini">${tu("Là où tu t'es trompé, et l'idée à retenir", 'Erreurs et idée à retenir')}</p>
    ${f.pieges.length ? f.pieges.map((p) => `<div class="fiche-piege"><b class="m">${esc(p.question)}</b><div><span class="mini">${tu('Tu avais répondu', 'Réponse donnée')} : ${esc(p.choix)}</span><span>${esc(p.corrige || p.juste)}</span></div>
      <span class="pill ${p.niveau >= 4 ? 'ok' : p.corrigeDepuis ? 'mid' : 'ko'}">${p.niveau >= 4 ? 'Ancré' : p.corrigeDepuis ? 'Réussi depuis · à ancrer' : 'À revoir ' + dansJours(p.revision)}</span></div>`).join('') : `<p class="mini">${tu('Aucun piège pour l’instant. Bravo, ou alors tu ne t’es pas encore entraîné !', 'Aucune erreur enregistrée.')}</p>`}</section>
  <section class="card"><h3>${tu('Ce qui me reste à ancrer', 'Reste à ancrer')}</h3>
    ${f.ancrer.length ? `<div class="ancrer">${f.ancrer.map((a) => `<div><b>${esc(a.libelle)}</b><span class="mini">${NIVEAUX[a.niveau]}</span><span class="when">Révision ${dansJours(a.revision)}</span></div>`).join('')}</div>` : `<p class="mini">${tu('Rien pour l’instant.', 'Rien.')}</p>`}</section>`;
}
