// Application élève : parcours en 7 étapes
import { $, $$, rnd, shuffle, esc, api, toast, htmlToTxt } from './outils.js';
import { tirerSerie, tirerQuestion } from './moteur.js';
import { ETAPES, REGLES_ETOILES, NIVEAUX, COUL_NIV, REGLE_NIV, etatEtapes, etoilesHTML, ficheHTML, dansJours } from './parcours.js';
import naturels from './notions/entiers-naturels.js';
import scientifique from './notions/ecriture-scientifique.js';
import tables from './notions/tables-multiplication.js';
import { TABLES } from './notions/table.js';

const CATALOGUE = { ...Object.fromEntries(TABLES.map((x) => [x.id, x])), [tables.id]: tables, [scientifique.id]: scientifique, [naturels.id]: naturels };
const LET = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
let ME = null, N = null, DISPO = [], EXOS = [], PROG = {}, MAIT = {}, REVEALED = {};
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const main = () => $('#main');

/* ---------- Démarrage, connexion ---------- */
async function charger() {
  ME = await api('/api/eleve/moi');
  DISPO = ME.classe.reglages.notions.filter((id) => CATALOGUE[id]);
}
async function demarrer() {
  try { await charger(); } catch (e) { if (e.status === 401) return afficherLogin(); $('#loading').textContent = e.message; return; }
  $('#loading').hidden = true; $('#login').hidden = true; $('#app').hidden = false; $('#who').hidden = false;
  if (!DISPO.length) { main().innerHTML = '<div class="card empty">Aucune notion n\'est encore ouverte pour ta classe.</div>'; return; }
  const pref = store.get('mpe-notion');
  const ouvertes = DISPO.filter((id) => notionOuverte(id));
  choisirNotion(ouvertes.includes(pref) ? pref : ouvertes[ouvertes.length - 1] || DISPO[0]);
}
function afficherLogin() { $('#loading').hidden = true; $('#app').hidden = true; $('#who').hidden = true; $('#login').hidden = false; $('#lgCode').focus(); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#lgErr').textContent = '';
  const btn = $('#loginForm button'); btn.disabled = true;
  try {
    const r = await api('/api/eleve/login', { method: 'POST', body: { code: $('#lgCode').value, pseudo: $('#lgPseudo').value, pin: $('#lgPin').value } });
    if (r.nouveau) toast('Bienvenue ! Retiens bien ton pseudo et ton code secret.');
    await demarrer();
  } catch (err) { $('#lgErr').textContent = err.message; } finally { btn.disabled = false; }
});
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logout') { await api('/api/logout', { method: 'POST' }).catch(() => {}); location.reload(); }
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); const v = go.dataset.go; if (v === 'parcours') vueParcours(); else if (v === 'maitrise') vueMaitrise(); else ouvrirEtape(v); }
  const nt = e.target.closest('[data-notion]');
  if (nt && !nt.disabled) choisirNotion(nt.dataset.notion);
});

/* ---------- État ---------- */
const progDe = (id) => Object.fromEntries(ME.progression.filter((p) => p.notion === id).map((p) => [p.etape, p]));
const etatDe = (id, reveles = {}) => etatEtapes(progDe(id), ME.classe.reglages.etapes, reveles);
function notionOuverte(id) { const i = DISPO.indexOf(id); return i <= 0 || etatDe(DISPO[i - 1]).termine; }
const etat = () => etatDe(N.id, REVEALED);
const variantes = () => (EXOS.length ? EXOS.flatMap((x) => x.variantes.map((v) => ({ ...v, exo: x }))) : (N.competences || []));
// Contexte donné aux notions qui définissent leurs propres étapes (ex. tables de multiplication)
const ctx = () => ({
  prog: PROG, maitrise: MAIT, toast, suite, etoiles: etoilesHTML,
  sauver: (etape, data) => sauverEtape(etape, data),
  recharger: async () => { await recharger(); return MAIT; },
  reponses: (source, items) => api('/api/eleve/reponses', { method: 'POST', body: { notion: N.id, source, items } }).catch(() => toast("Ta réponse n'a pas pu être enregistrée.")),
  finPartie: (jeu, score) => finPartie(jeu, score),
});

function choisirNotion(id) {
  stopJeux(); REVEALED = {};
  N = CATALOGUE[id]; store.set('mpe-notion', id);
  rafraichirEtat();
  vueParcours();
}
function rafraichirEtat() {
  EXOS = ME.exercices.filter((x) => x.notion === N.id);
  PROG = progDe(N.id);
  MAIT = ME.maitrise[N.id] || {};
  renderEntete(); renderCarte(); renderObjectif();
}
async function recharger() { try { await charger(); rafraichirEtat(); } catch (e) { toast(e.message); } }
async function sauverEtape(etape, data) {
  try {
    const r = await api('/api/eleve/progression', { method: 'POST', body: { notion: N.id, etape, ...data } });
    const p = ME.progression.find((x) => x.notion === N.id && x.etape === etape);
    if (p) Object.assign(p, { fait: r.fait, etoiles: r.etoiles, donnees: r.donnees }); else ME.progression.push({ notion: N.id, etape, fait: r.fait, etoiles: r.etoiles, donnees: r.donnees });
    PROG = progDe(N.id); renderCarte();
    return r;
  } catch (e) { toast("Ta progression n'a pas pu être enregistrée : " + e.message); return null; }
}

/* ---------- En-tête, carte, objectif ---------- */
function renderEntete() {
  $('.brand .logo').textContent = N.symbole.length > 2 ? 'ℕ' : N.symbole;
  const actifs = ME.semaine.filter(Boolean).length;
  $('#who').innerHTML = `<span class="week" aria-label="${actifs} jour${actifs > 1 ? 's' : ''} actif${actifs > 1 ? 's' : ''} cette semaine">${ME.semaine.map((a, i) => `<span class="${a ? 'on' : ''}">${JOURS[i]}</span>`).join('')}</span>
    <button class="linkbtn" data-go="maitrise">Ma maîtrise</button><span><b>${esc(ME.eleve.pseudo)}</b> · ${esc(ME.classe.nom)}</span><button class="linkbtn" id="logout">Se déconnecter</button>`;
}
function renderCarte() {
  $('#carte').innerHTML = DISPO.map((id) => {
    const n = CATALOGUE[id], ouv = notionOuverte(id), et = etatDe(id), etoiles = et.etapes.reduce((a, e) => a + (e.etoiles || 0), 0);
    const txt = !ouv ? "S'ouvre à la fin de la notion précédente" : et.termine ? `Parcours terminé · ${etoiles} étoile${etoiles > 1 ? 's' : ''} sur 9` : `En cours · ${etoiles} étoile${etoiles > 1 ? 's' : ''} sur 9`;
    return `<li><button class="notion ${id === N.id ? 'active' : ''}" data-notion="${id}" ${ouv ? '' : 'disabled'}><span class="sym" style="${n.symbole.length > 2 ? 'font-size:1rem' : ''}">${n.symbole}</span><span class="nm">${n.titreCourt}<span>${txt}</span></span><span class="tag">${ouv ? '' : 'Bientôt'}</span></button></li>`;
  }).join('') + N.parcours.filter((p) => !p.id).map((p) => `<li><button class="notion" disabled><span class="sym" style="${p.sym.length > 2 ? 'font-size:1rem' : ''}">${p.sym}</span><span class="nm">${p.nom}<span>Pas encore disponible</span></span><span class="tag">Bientôt</span></button></li>`).join('');
}
function renderObjectif() {
  const o = ME.objectif, pc = Math.min(100, Math.round((o.atteint / o.cible) * 100));
  $('#objectif').innerHTML = `<div class="eyebrow">Objectif de la classe</div><b>Ancrer ${o.cible} compétences ensemble</b>
    <div class="bar" style="margin:8px 0 6px"><i style="width:${pc}%"></i></div><span class="mini">${o.atteint} sur ${o.cible}</span>`;
}

/* ---------- Vue parcours ---------- */
function vueParcours() {
  stopJeux();
  const et = etat(), cur = et.etapes.find((e) => e.courant);
  main().innerHTML = `
    <div class="head"><div class="eyebrow">${esc(N.niveau)} · ${esc(N.sousTheme)}</div>
      <h1>${N.titre} <span class="m">${N.symbole.replace('×10ⁿ', 'a × 10ⁿ')}</span></h1>
      <p>Sept étapes, chacune ouvre la suivante. Les quatre premières se font librement, sans note ni étoile. À partir de S'entraîner, chaque étape rapporte jusqu'à trois étoiles.</p></div>
    ${cur ? `<div class="next-banner"><div><b>Prochaine étape : ${cur.nom}</b><span class="mini">${esc(cur.desc)}</span></div><button class="btn" data-go="${cur.id}">Continuer →</button></div>`
      : `<div class="next-banner"><div><b>Parcours terminé</b><span class="mini">Tu peux refaire chaque étape quand tu veux, et réviser dans Retenir.</span></div><button class="btn ghost" data-go="maitrise">Voir ma maîtrise</button></div>`}
    <ol class="parcours">${et.etapes.filter((e) => e.visible).map((e, i) => {
      const st = e.fait ? 'fait' : e.courant ? 'cours' : e.ouvert ? 'ouvert' : 'verrou';
      const lab = { fait: 'Terminé', cours: 'À faire maintenant', ouvert: 'Ouvert', verrou: 'Verrouillé' }[st];
      return `<li class="etape ${st}"><span class="node">${e.fait ? '✓' : i + 1}</span>
        <button class="etape-card" data-go="${e.id}" ${e.ouvert ? '' : 'disabled'}>
          <span class="etape-l1"><b>${e.nom}</b>${e.etoiles !== false && ETAPES.find((x) => x.id === e.id).etoiles ? etoilesHTML(e.etoiles) : ''}</span>
          <span class="mini">${esc(e.desc)}</span><span class="pill">${lab}</span></button></li>`;
    }).join('')}</ol>`;
  window.scrollTo({ top: 0 });
}

/* ---------- Ouvrir une étape ---------- */
function ouvrirEtape(id) {
  const e = etat().etapes.find((x) => x.id === id);
  if (!e || !e.ouvert) { toast('Cette étape n’est pas encore ouverte.'); return; }
  stopJeux();
  const idx = etat().etapes.filter((x) => x.visible).findIndex((x) => x.id === id) + 1;
  const regles = (N.reglesEtoiles || {})[id] || REGLES_ETOILES[id];
  main().innerHTML = `
    <div class="etape-head"><button class="linkbtn" data-go="parcours">← Parcours</button>
      <div class="eyebrow">Étape ${idx} · ${N.titreCourt}</div>
      <h1>${e.nom}${regles ? ' ' + etoilesHTML(PROG[id]?.etoiles || 0) : ''}</h1>
      ${regles ? `<ul class="regles">${regles.map((r, i) => `<li class="${(PROG[id]?.etoiles || 0) > i ? 'ok' : ''}">${'★'.repeat(i + 1)} ${r}</li>`).join('')}</ul>` : ''}</div>
    <div id="etape" class="etape-body"></div>`;
  const root = $('#etape');
  ({ explorer, comprendre, ensavoirplus, jouer, entrainer, retenir, plusloin })[id](root);
  window.scrollTo({ top: 0 });
}
const suite = (id) => { const et = etat().etapes, i = et.findIndex((e) => e.id === id), n = et.slice(i + 1).find((e) => e.visible); return n ? `<button class="btn" data-go="${n.id}">Continuer : ${n.nom} →</button>` : '<button class="btn" data-go="parcours">Retour au parcours</button>'; };

/* ---------- Constructeur de phrase (règle en mes mots) ---------- */
function phraseHTML(parts, pre = []) {
  let k = 0;
  return `<p class="phrase">${parts.map((p) => typeof p === 'string' ? esc(p) : `<select class="slot" data-k="${k}" aria-label="Choix ${k + 1}"><option value="">…</option>${p.options.map((o, j) => `<option value="${j}" ${pre[k] === j ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${(k++, '')}`).join('')}</p>`;
}
function lirePhrase(root, parts) {
  const sel = $$('.slot', root).map((s) => s.value);
  if (sel.some((v) => v === '')) return null;
  let k = 0;
  return { texte: parts.map((p) => (typeof p === 'string' ? p : p.options[+sel[k++]])).join(''), choix: sel.map(Number) };
}

/* ---------- 1. Explorer ---------- */
function explorer(root) {
  if (N.explorerCustom) return N.explorerCustom(root, ctx());
  const X = N.explorer, seuil = (ME.config[N.id] || {}).seuilExplorer || 6, d = PROG.explorer?.donnees || {};
  let justes = 0, cur = null;
  const fam = { oui: [...X.exemplesOui], non: [...X.exemplesNon] };
  const familles = () => `<div class="grid2 familles">
      <div class="card fam"><h3>${X.oui}</h3><div class="chips">${fam.oui.map((s, i) => `<span class="chip-n ${i >= X.exemplesOui.length ? 'new' : ''}">${N.affiche(s)}</span>`).join('')}</div></div>
      <div class="card fam"><h3>${X.non}</h3><div class="chips">${fam.non.map((s, i) => `<span class="chip-n ${i >= X.exemplesNon.length ? 'new' : ''}">${N.affiche(s)}</span>`).join('')}</div></div></div>`;
  const indice = () => justes >= seuil ? 'Tu sembles avoir trouvé la règle.' : justes >= seuil / 2 ? 'Tu commences à voir la règle… continue.' : "Continue d'explorer.";
  const regleBloc = () => `<div class="card regle-card"><h3>Écris la règle avec tes mots</h3><p class="mini">Choisis les morceaux de phrase qui décrivent la famille. Tu pourras la comparer à la définition officielle dans Comprendre.</p>
      ${phraseHTML(X.regle, d.choix || [])}<div class="row"><button class="btn" id="saveRegle">Enregistrer ma règle</button></div><p class="err" id="regleErr"></p></div>`;
  function render() {
    if (PROG.explorer?.fait && !cur) {
      root.innerHTML = `<p class="lead">${esc(X.consigne)}</p>${familles()}
        <div class="card"><h3>Ta règle</h3><p class="phrase-done">« ${esc(d.regle || '')} »</p><div class="row">${suite('explorer')}<button class="btn ghost" id="refaire">Reformuler ma règle</button></div></div>`;
      return;
    }
    root.innerHTML = `<p class="lead">${esc(X.consigne)}</p>${familles()}
      ${justes >= seuil ? regleBloc() : `<div class="card trier"><div class="eyebrow">Nouveau</div><div class="statement"><span class="num">${cur.html}</span></div>
        <div class="answers"><button class="btn" data-f="oui">${X.oui}</button><button class="btn ghost" data-f="non">${X.non}</button></div>
        <p class="feedback-line" id="fb" role="status"></p><p class="mini">${indice()}</p></div>`}`;
  }
  function suivant() { let it; do { it = (X.gen || N.jeu.gen)(); } while ([...fam.oui, ...fam.non].includes(it.s.replace(/-/g, '−')) || [...fam.oui, ...fam.non].includes(it.s)); cur = it; render(); }
  root.onclick = async (e) => {
    const f = e.target.closest('[data-f]');
    if (f && cur && !cur.repondu) {
      cur.repondu = true;
      const bon = (f.dataset.f === 'oui') === cur.ok;
      if (bon) justes++;
      fam[cur.ok ? 'oui' : 'non'].push(cur.s);
      $$('[data-f]', root).forEach((b) => (b.disabled = true));
      $('#fb').innerHTML = bon ? '<b style="color:var(--ok)">Oui, il va bien là.</b>' : `<b style="color:var(--ko)">Non : celui-ci va dans « ${f.dataset.f === 'oui' ? X.non : X.oui} ».</b>`;
      setTimeout(() => (justes >= seuil ? (cur = { repondu: true }, render()) : suivant()), bon ? 700 : 1600);
    }
    if (e.target.id === 'refaire') { cur = { repondu: true }; justes = seuil; render(); }
    if (e.target.id === 'saveRegle') {
      const r = lirePhrase(root, X.regle);
      if (!r) { $('#regleErr').textContent = 'Complète chaque morceau de la phrase.'; return; }
      await sauverEtape('explorer', { fait: true, donnees: { regle: r.texte, choix: r.choix } });
      Object.assign(d, { regle: r.texte, choix: r.choix }); cur = null; render();
      toast('Ta règle est enregistrée. Comprendre est ouvert.');
    }
  };
  if (PROG.explorer?.fait) render(); else suivant();
}

/* ---------- 2. Comprendre ---------- */
function comprendre(root) {
  const dx = PROG.explorer?.donnees || {}, dc = PROG.comprendre?.donnees || {};
  let exemples = [...(dc.exemples || [])];
  root.innerHTML = `
    <section class="fiche-top">
      <div class="fiche-off"><div class="eyebrow">La définition officielle</div>${N.definition}</div>
      <div class="fiche-moi"><div class="eyebrow">Ta règle, trouvée dans Explorer</div>
        <div class="fiche-regle" id="maRegle">${dx.regle ? `« ${esc(dc.regleCorrigee || dx.regle)} »` : 'Tu n’as pas encore formulé de règle.'}</div>
        ${dx.regle ? '<button class="linkbtn" id="corriger" style="color:#f0b874;padding:0;margin-top:6px">Corriger ma règle</button><div id="corrBox"></div>' : ''}</div>
    </section>
    <p class="mini" id="testHint"></p>
    <div id="modContenu" style="display:grid;gap:18px"></div>
    <div class="row" id="compSuite"></div>`;
  N.comprendre($('#modContenu'));
  $('#modContenu .sheet.def')?.remove(); // la définition est déjà affichée en haut
  const maj = () => {
    const r = Math.max(0, 3 - exemples.length);
    $('#testHint').textContent = r ? `Teste ${r === 3 ? 'au moins 3 nombres' : `encore ${r} nombre${r > 1 ? 's' : ''}`} de ton choix : ils iront dans ta fiche mémo.` : 'Tes exemples sont dans ta fiche mémo. Tu peux continuer.';
    $('#compSuite').innerHTML = PROG.comprendre?.fait ? suite('comprendre') : '';
  };
  $('#modContenu')._onTest = async (saisie, resultat) => {
    if (exemples.some((x) => x.saisie === saisie)) return;
    exemples = [{ saisie: saisie.slice(0, 40), resultat: resultat.slice(0, 200) }, ...exemples].slice(0, 6);
    await sauverEtape('comprendre', { fait: exemples.length >= 3, donnees: { exemples } });
    maj();
  };
  maj();
  root.addEventListener('click', async (e) => {
    if (e.target.id === 'corriger') { $('#corrBox').innerHTML = `<div class="corr-box">${phraseHTML(N.explorer.regle, dc.choixCorr || dx.choix || [])}<button class="btn sm" id="saveCorr">Enregistrer</button></div>`; }
    if (e.target.id === 'saveCorr') {
      const r = lirePhrase($('#corrBox'), N.explorer.regle); if (!r) return toast('Complète chaque morceau de la phrase.');
      await sauverEtape('comprendre', { donnees: { regleCorrigee: r.texte, choixCorr: r.choix } });
      dc.regleCorrigee = r.texte; dc.choixCorr = r.choix;
      $('#maRegle').textContent = `« ${r.texte} »`; $('#corrBox').innerHTML = ''; toast('Ta règle corrigée ira dans ta fiche mémo.');
    }
  });
}

/* ---------- 3. En savoir plus ---------- */
function ensavoirplus(root) {
  root.innerHTML = '<div id="modContenu" style="display:grid;gap:18px"></div><div class="row" id="esSuite"></div>';
  N.ensavoirplus($('#modContenu'));
  const maj = () => ($('#esSuite').innerHTML = PROG.ensavoirplus?.fait ? suite('ensavoirplus') : '<button class="btn" id="finiES">J’ai terminé</button>');
  maj();
  root.addEventListener('click', async (e) => { if (e.target.id === 'finiES') { await sauverEtape('ensavoirplus', { fait: true }); maj(); } });
}

/* ---------- 4. Jouer ---------- */
const G1 = { running: false }, G2 = {};
function stopJeux() { clearInterval(G1.spawn); clearInterval(G1.timer); G1.running = false; clearInterval(G2.tick); }
function jouer(root) {
  const extras = N.jeuxExtra || [];
  root.innerHTML = `
    <div class="games">
      <button class="game-pick sel" data-game="g1"><span class="t">Attrape-les</span><span class="d">${esc(N.jeu.description1)} 30 secondes, 3 vies.</span></button>
      ${N.sansIntrus ? '' : `<button class="game-pick" data-game="g2"><span class="t">Trouve l'intrus</span><span class="d">4 nombres, un seul ne va pas avec les autres. 8 manches.</span></button>`}
      ${extras.map((x) => `<button class="game-pick" data-game="x-${x.id}"><span class="t">${esc(x.titre)}</span><span class="d">${esc(x.desc)}</span></button>`).join('')}
    </div>
    <div class="card" id="g1"><div class="hud"><span><span class="k">Vies</span><span class="v lives" id="g1lives">♥♥♥</span></span><span><span class="k">Temps</span><span class="v" id="g1time">30 s</span></span></div>
      <div class="arena" id="arena"></div><div class="gmsg" id="g1msg" role="status"></div></div>
    <div class="card" id="g2" hidden></div>
    ${extras.map((x) => `<div class="card jeu-x" id="x-${x.id}" hidden></div>`).join('')}
    <div class="row" id="jSuite">${PROG.jouer?.fait ? suite('jouer') : ''}</div>`;
  $('.games', root).addEventListener('click', (e) => {
    const b = e.target.closest('.game-pick'); if (!b) return;
    $$('.game-pick', root).forEach((x) => x.classList.toggle('sel', x === b));
    stopJeux();
    const g = b.dataset.game;
    $('#g1').hidden = g !== 'g1'; $('#g2').hidden = g !== 'g2';
    $$('.jeu-x', root).forEach((c) => { clearInterval(c._tick); c.hidden = c.id !== g; });
    if (g === 'g1') g1Intro(); else if (g === 'g2') g2Intro();
    else { const x = extras.find((j) => 'x-' + j.id === g); x.render($('#' + g), ctx()); }
  });
  $('#g1').addEventListener('click', (e) => { if (e.target.id === 'g1go') g1Start(); });
  $('#g2').addEventListener('click', (e) => {
    const card = e.target.closest('.icard');
    if (e.target.id === 'g2go') g2Start();
    else if (card && G2.cur && !G2.cur.answered) g2Answer(+card.dataset.i);
    else if (e.target.id === 'g2next') { G2.round++; if (G2.round < G2.total) g2Round(); else g2End(); }
  });
  g1Intro();
}
async function finPartie(jeu, score) {
  api('/api/eleve/jeux', { method: 'POST', body: { notion: N.id, jeu, score } }).catch(() => {});
  if (!PROG.jouer?.fait) { await sauverEtape('jouer', { fait: true }); const s = $('#jSuite'); if (s) s.innerHTML = suite('jouer'); }
}
const uniq = (arr) => arr.filter((x, i, a) => a.findIndex((y) => y.s === x.s) === i);
function g1Hud() { const l = Math.max(0, G1.lives ?? 3); $('#g1lives').textContent = '♥'.repeat(l) + '♡'.repeat(3 - l); $('#g1time').textContent = (G1.left ?? 30) + ' s'; }
function g1Intro() { Object.assign(G1, { lives: 3, left: 30 }); g1Hud(); $('#g1msg').textContent = ''; $('#arena').innerHTML = `<div class="arena-msg"><div class="prompt">${N.jeu.consigne1}</div><p style="margin:0;color:var(--ink-soft);max-width:44ch">${N.jeu.piege1}</p><button class="btn" id="g1go">Commencer</button></div>`; }
function g1Start() {
  stopJeux(); Object.assign(G1, { score: 0, lives: 3, left: 30, errors: [], missed: [], running: true });
  $('#arena').innerHTML = ''; $('#g1msg').textContent = ''; g1Hud();
  G1.spawn = setInterval(g1Spawn, 800);
  G1.timer = setInterval(() => { G1.left--; g1Hud(); if (G1.left <= 0) g1End(); }, 1000);
  g1Spawn();
}
function g1Spawn() {
  const arena = $('#arena'); if (!arena) return stopJeux();
  if ($$('.bub:not(.gone)', arena).length >= 6) return;
  const it = N.jeu.gen(), b = document.createElement('button'), large = it.label.length > 6;
  b.className = 'bub'; b.innerHTML = it.html; b.setAttribute('aria-label', it.label);
  if (large) { b.style.width = '130px'; b.style.fontSize = '1.05rem'; }
  b.style.left = `calc((100% - ${large ? 132 : 92}px) * ${Math.random().toFixed(3)})`; b.style.top = `calc((100% - 62px) * ${Math.random().toFixed(3)})`;
  b.addEventListener('click', () => {
    if (!G1.running || b.dataset.done) return; b.dataset.done = 1; clearTimeout(b._t);
    if (it.ok) { G1.score += it.trap ? 2 : 1; b.classList.add('hit'); $('#g1msg').textContent = ''; }
    else { G1.lives--; G1.errors.push(it); b.classList.add('miss'); $('#g1msg').innerHTML = it.why; }
    g1Hud(); setTimeout(() => b.remove(), 400);
    if (G1.lives <= 0) g1End();
  });
  b._t = setTimeout(() => { if (!b.dataset.done) { b.dataset.done = 1; if (it.ok) G1.missed.push(it); b.classList.add('gone'); setTimeout(() => b.remove(), 300); } }, 2800);
  arena.appendChild(b);
}
function g1End() {
  if (!G1.running) return; stopJeux();
  const err = uniq(G1.errors).slice(0, 4), miss = uniq(G1.missed.filter((x) => x.trap)).slice(0, 3);
  const lesson = err.map((x) => `<div>✗ <span class="m">${x.html}</span> : ${x.why}</div>`).join('') + miss.map((x) => `<div>Tu as laissé passer <span class="m">${x.html}</span>, ${N.jeu.laisse}. ${x.why}</div>`).join('');
  $('#arena').innerHTML = `<div class="arena-msg"><div class="qnum">${G1.lives <= 0 ? 'Plus de vies' : 'Temps écoulé'}</div><div class="prompt">${lesson ? 'Regarde ce qui t’a piégé, puis rejoue.' : 'Aucun piège ne t’a eu. Bien joué !'}</div><button class="btn" id="g1go">Rejouer</button></div>`;
  $('#g1msg').innerHTML = lesson ? `<div class="lesson">${lesson}</div>` : '';
  finPartie('attrape', G1.score);
}
function g2Intro() { clearInterval(G2.tick); $('#g2').innerHTML = `<div class="qnum">Trouve l'intrus</div><p class="prompt">Parmi 4 nombres, un seul n'est pas de la même famille que les autres.</p><p style="color:var(--ink-soft);max-width:56ch">Lis bien la consigne de chaque manche : elle change. 10 secondes par manche.</p><button class="btn" id="g2go">Commencer</button>`; }
function g2Start() { Object.assign(G2, { round: 0, total: 8, log: [] }); g2Round(); }
function g2Round() {
  clearInterval(G2.tick);
  const lookFor = Math.random() < 0.5 ? 'non' : 'oui', other = lookFor === 'oui' ? 'non' : 'oui';
  const items = [N.jeu.gen(lookFor)], seen = new Set([items[0].s]);
  let trap = true, n = 0;
  while (items.length < 4 && n++ < 60) { const it = N.jeu.gen(other, trap); if (seen.has(it.s)) continue; seen.add(it.s); items.push(it); trap = Math.random() < 0.3; }
  G2.cur = { items, order: shuffle(items.map((_, i) => i)), lookFor, left: 10, answered: false };
  g2Render();
  G2.tick = setInterval(() => { G2.cur.left = Math.max(0, G2.cur.left - 0.1); const bar = $('#g2bar'); if (bar) bar.style.width = G2.cur.left * 10 + '%'; if (G2.cur.left <= 0) g2Answer(-1); }, 100);
}
function g2Render() {
  const c = G2.cur;
  let h = `<div class="ex-top"><span class="qnum">Manche ${G2.round + 1} sur ${G2.total}</span></div>
    <p class="prompt">${c.lookFor === 'non' ? N.jeu.consigneNon : N.jeu.consigneOui}</p><div class="timebar"><i id="g2bar" style="width:${c.left * 10}%"></i></div>
    <div class="intrus">${c.order.map((i) => { let cls = ''; if (c.answered) { if (i === 0) cls = 'good'; else if (i === c.pick) cls = 'bad'; } return `<button class="icard ${cls}" data-i="${i}" ${c.answered ? 'disabled' : ''} aria-label="${esc(c.items[i].label)}" style="${c.items[i].label.length > 6 ? 'font-size:1.15rem' : ''}">${c.items[i].html}</button>`; }).join('')}</div>`;
  if (c.answered) {
    const ok = c.pick === 0, intr = c.items[0];
    h += `<div class="feedback"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? 'Bien vu' : c.pick === -1 ? 'Temps écoulé' : 'Raté'}</div><p>L'intrus était <span class="m">${intr.html}</span>. ${intr.why}</p>${!ok && c.pick > 0 ? `<p><span class="m">${c.items[c.pick].html}</span> : ${c.items[c.pick].why}</p>` : ''}</div>
      <div class="next"><button class="btn" id="g2next">${G2.round + 1 < G2.total ? 'Manche suivante →' : 'Terminer'}</button></div>`;
  }
  $('#g2').innerHTML = h;
}
function g2Answer(i) { const c = G2.cur; if (c.answered) return; clearInterval(G2.tick); c.answered = true; c.pick = i; G2.log.push({ ok: i === 0, html: c.items[0].html }); g2Render(); }
function g2End() {
  $('#g2').innerHTML = `<div class="qnum">Partie terminée</div><p class="prompt">Les intrus de la partie</p>
    <div class="recap">${G2.log.map((x) => `<div><span class="dot ${x.ok ? 'ok' : 'ko'}"></span><span>Intrus : <span class="m">${x.html}</span></span><span>${x.ok ? 'trouvé' : 'manqué'}</span></div>`).join('')}</div><button class="btn" id="g2go">Rejouer</button>`;
  finPartie('intrus', G2.log.filter((x) => x.ok).length);
}

/* ---------- Questions oui/non + pourquoi (S'entraîner et Retenir) ---------- */
function serie(root, questions, { source, titre, onFin }) {
  const S = { seq: questions, i: 0, res: [], phase: 'q1', err: 0 };
  const steps = () => `<div class="steps" aria-hidden="true">${S.seq.map((q, k) => { const r = S.res[k]; let c = ''; if (r) c = r.plein ? 'ok' : r.ok1 ? 'half' : 'ko'; else if (k === S.i) c = 'cur'; return `<i class="${c}"></i>`; }).join('')}</div>`;
  const enonce = (q) => enonceHTML(q.exo.enonce, q);
  function render() {
    const q = S.seq[S.i];
    let h = '';
    if (S.banner) { h += `<div class="reveal" role="status"><p>Deux erreurs : l'étape <b>Comprendre</b> est maintenant ouverte pour t'aider.</p><button class="btn sm ghost" data-go="comprendre">Aller voir</button></div>`; S.banner = false; }
    h += `<div class="ex-top">${steps()}<span class="mini">${esc(titre)}</span></div><div class="qnum">Question ${S.i + 1} sur ${S.seq.length}</div><div class="statement">${enonce(q)} ?</div>`;
    // Oui / Non : l'élève choisit, peut changer d'avis, puis valide
    const repBtn = (v, lab) => {
      if (S.phase === 'q1') return `<button class="rep ${S.sel === v ? 'sel' : ''}" data-a="${v}" aria-pressed="${S.sel === v}">${lab}</button>`;
      const r = S.cur, choisi = r.a1 === v, juste = q.correct === v;
      const cls = choisi ? (r.ok1 ? 'good' : 'bad') : juste ? 'good-ghost' : 'dim';
      const marque = choisi ? `<span class="rep-tag">${r.ok1 ? '✓' : '✗'} Ta réponse</span>` : juste ? '<span class="rep-tag">✓ Bonne réponse</span>' : '';
      return `<button class="rep ${cls}" disabled>${lab}${marque}</button>`;
    };
    h += `<div class="answers">${repBtn('oui', 'Oui')}${repBtn('non', 'Non')}</div>`;
    if (S.phase === 'q1') h += `<div class="next"><span class="mini">${S.sel ? 'Tu peux encore changer d\'avis.' : 'Choisis oui ou non.'}</span><button class="btn" id="validerA" ${S.sel ? '' : 'disabled'}>Valider ma réponse</button></div>`;
    else {
      const r = S.cur;
      if (!r.ok1) h += fb(false, `La bonne réponse était « ${q.correct} ».`, q);
      else if (!q.pourquoi.length) h += fb(true, null, q);
      else {
        h += '<div class="why-title">Bien. Mais pourquoi ?</div><div class="choices">' + S.order.map((idx, k) => {
          const cls = S.phase === 'done' ? (idx === q.juste ? 'good' : idx === r.pick ? 'bad' : 'dim') : idx === r.pick ? 'sel' : '';
          const marque = S.phase !== 'done' ? '' : idx === r.pick ? `<span class="rep-tag">${idx === q.juste ? '✓' : '✗'} Ta réponse</span>` : idx === q.juste ? '<span class="rep-tag">✓ Bonne réponse</span>' : '';
          return `<button class="choice ${cls}" data-p="${idx}" ${S.phase === 'done' ? 'disabled' : `aria-pressed="${idx === r.pick}"`}><span class="l">${LET[k]})</span><span>${q.pourquoi[idx]}${marque}</span></button>`;
        }).join('') + '</div>';
        // Tant que l'élève n'a pas validé, il peut changer de justification
        if (S.phase === 'q2') h += `<div class="next"><span class="mini">${r.pick === undefined ? 'Choisis une justification.' : 'Tu peux encore changer d\'avis.'}</span><button class="btn" id="validerP" ${r.pick === undefined ? 'disabled' : ''}>Valider ma justification</button></div>`;
        if (S.phase === 'done') h += fb(r.pick === q.juste, null, q);
      }
      if (S.phase === 'done') h += `<div class="next"><button class="btn" id="nextBtn">${S.i === S.seq.length - 1 ? 'Terminer' : 'Question suivante →'}</button></div>`;
    }
    h += '<details class="signal"><summary>Signaler un problème sur cette question</summary><form id="sigForm"><textarea id="sigMsg" placeholder="Qu\'est-ce qui ne va pas ?" aria-label="Description du problème"></textarea><div><button class="btn sm ghost" type="submit">Envoyer</button></div></form></details>';
    root.innerHTML = h;
    const nb = $('#nextBtn', root); if (nb) nb.focus({ preventScroll: true });
  }
  const fb = (ok, extra, q) => `<div class="feedback" role="status"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? 'Correct' : 'Incorrect'}</div>${extra ? `<p>${esc(extra)}</p>` : ''}${q.texte ? `<div class="lab">Corrigé</div><p>${q.texte}</p>` : ''}</div>`;
  root.onclick = (e) => {
    const a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]'), q = S.seq[S.i];
    if (a && S.phase === 'q1') { S.sel = a.dataset.a; render(); $(`[data-a="${S.sel}"]`, root)?.focus({ preventScroll: true }); }
    else if (e.target.id === 'validerA' && S.phase === 'q1' && S.sel) {
      const ok1 = S.sel === q.correct;
      S.cur = { a1: S.sel, ok1 }; S.sel = null; S.order = shuffle(q.pourquoi.map((_, k) => k));
      S.phase = ok1 && q.pourquoi.length ? 'q2' : 'done'; render();
    } else if (p && S.phase === 'q2') { S.cur.pick = +p.dataset.p; render(); $(`[data-p="${S.cur.pick}"]`, root)?.focus({ preventScroll: true }); }
    else if (e.target.id === 'validerP' && S.phase === 'q2' && S.cur.pick !== undefined) { S.phase = 'done'; render(); }
    else if (e.target.id === 'nextBtn') {
      const r = S.cur, ok2 = q.pourquoi.length && r.ok1 ? r.pick === q.juste : null;
      const plein = r.ok1 && (ok2 === null || ok2);
      S.res.push({ ok1: r.ok1, ok2, plein, html: q.html, vars: q.vars, exo: q.exo, aPourquoi: !!q.pourquoi.length });
      api('/api/eleve/reponses', { method: 'POST', body: { notion: N.id, source, items: [{
        variante: q.variante, libelle: q.libelle, question: htmlToTxt(enonceHTML(q.exo.enonce, q)), ok1: r.ok1, ok2,
        choix: r.ok1 ? (q.pourquoi.length ? htmlToTxt(q.pourquoi[r.pick]) : r.a1) : r.a1,
        juste: q.pourquoi.length ? htmlToTxt(q.pourquoi[q.juste]) : '', corrige: htmlToTxt(q.texte),
      }] } }).catch(() => toast("Ta réponse n'a pas pu être enregistrée."));
      if (!plein) {
        S.err++;
        const vis = ME.classe.reglages.etapes;
        if (S.err >= 2 && vis.comprendre === false && ME.classe.reglages.auto && !REVEALED.comprendre) { REVEALED.comprendre = true; S.banner = true; }
      }
      if (S.i < S.seq.length - 1) { S.i++; S.phase = 'q1'; render(); } else onFin(S.res);
    }
  };
  root.onsubmit = async (e) => {
    if (e.target.id !== 'sigForm') return; e.preventDefault();
    const q = S.seq[S.i];
    try { await api('/api/eleve/signalements', { method: 'POST', body: { notion: N.id, question: `${q.libelle} : ${q.text}`, message: $('#sigMsg', root).value } }); $('.signal', root).open = false; toast('Merci, ton signalement a été envoyé.'); } catch (err) { toast(err.message); }
  };
  render();
}
const enonceHTML = (enonce, q, cls = 'num') => esc(enonce).replace(/\{(\w*)\}/g, (_, k) => (k === '' ? `<span class="${cls}">${q.html}</span>` : esc(q.vars?.[k] ?? '')));
const recapHTML = (res, exo) => `<div class="recap">${res.map((r) => `<div><span class="dot ${r.plein ? 'ok' : r.ok1 ? 'half' : 'ko'}"></span><span>${enonceHTML(r.exo?.enonce || exo.enonce, r, 'm')}</span><span class="mini">${r.plein ? 'juste et justifié' : r.ok1 ? 'juste, mal justifié' : 'à revoir'}</span></div>`).join('')}</div>`;

/* ---------- 5. S'entraîner ---------- */
function entrainer(root) {
  if (N.entrainerCustom) return N.entrainerCustom(root, ctx());
  if (!EXOS.length) { root.innerHTML = '<div class="card">Aucun exercice n\'est encore disponible. Ton professeur doit importer la banque d\'exercices.</div>'; return; }
  const lancer = (exo) => {
    let seq; try { seq = tirerSerie(exo).map((q) => ({ ...q, exo })); } catch (e) { root.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
    root.innerHTML = '<div class="sheet" id="serie"></div>';
    serie($('#serie'), seq, { source: 'entrainer', titre: "S'entraîner", onFin: async (res) => {
      const n = res.length, ok1 = res.filter((r) => r.ok1).length, avecP = res.filter((r) => r.aPourquoi && r.ok1), ok2 = avecP.filter((r) => r.ok2).length;
      const et = 1 + (ok1 / n >= 0.75 ? 1 : 0) + (ok1 / n >= 0.75 && (avecP.length ? ok2 / avecP.length >= 0.75 : true) ? 1 : 0);
      const avant = PROG.entrainer?.etoiles || 0;
      api('/api/eleve/series', { method: 'POST', body: { notion: N.id, exercice: exo.numero, score: res.filter((r) => r.plein).length, max: n, details: [] } }).catch(() => {});
      await sauverEtape('entrainer', { fait: true, etoiles: et });
      await recharger();
      $('#serie').innerHTML = `<div class="qnum">Série terminée</div><div class="final-stars">${etoilesHTML(et)}</div>
        <p>${et === 3 ? 'Juste et bien justifié : trois étoiles !' : et === 2 ? 'Tes réponses sont justes. Pour la 3e étoile, soigne les justifications.' : 'Relis les corrigés, puis refais une série pour gagner des étoiles.'}${et > avant ? ' <b>Nouvelle étoile gagnée.</b>' : ''}</p>
        ${recapHTML(res, exo)}<div class="answers"><button class="btn ghost" id="again">Nouvelle série</button>${suite('entrainer')}</div>`;
      $('#again').onclick = () => lancer(exo);
    } });
  };
  if (EXOS.length === 1) return lancer(EXOS[0]);
  root.innerHTML = `<div class="card"><h3>Choisis un exercice</h3><div class="choices">${EXOS.map((x, i) => `<button class="choice" data-exo="${i}"><span class="l">${x.numero}</span><span>${esc(x.enonce.replace(/\{\w*\}/g, '…'))}</span></button>`).join('')}</div></div>`;
  root.onclick = (e) => { const b = e.target.closest('[data-exo]'); if (b) { root.onclick = null; lancer(EXOS[+b.dataset.exo]); } };
}

/* ---------- 6. Retenir ---------- */
async function retenir(root) {
  const vs = variantes(), now = Date.now();
  const vues = vs.filter((v) => MAIT[v.id]);
  const dues = vues.filter((v) => MAIT[v.id].niveau < 4 && new Date(MAIT[v.id].revision).getTime() <= now);
  const prochaines = vues.filter((v) => MAIT[v.id].niveau < 4).map((v) => new Date(MAIT[v.id].revision).getTime()).sort((a, b) => a - b);
  root.innerHTML = `
    <div class="card revision" id="revision">
      ${dues.length ? `<h3>Révision du jour</h3><p class="mini">${dues.length} question${dues.length > 1 ? 's' : ''} t'attend${dues.length > 1 ? 'ent' : ''}, choisie${dues.length > 1 ? 's' : ''} parmi ce que tu dois encore ancrer.</p><button class="btn" id="reviser">Réviser maintenant</button>`
        : `<h3>Rien à réviser pour l'instant</h3><p class="mini">${prochaines.length ? `Prochaine révision ${dansJours(new Date(prochaines[0]).toISOString())}. Une compétence s'ancre quand tu la réussis encore au moins un jour après l'avoir maîtrisée.` : vues.length ? 'Toutes tes compétences sont ancrées. Bravo !' : "Fais d'abord une série dans S'entraîner."}</p>${vues.length ? '<button class="btn ghost" id="reviser">Réviser quand même</button>' : ''}`}
    </div>
    <div class="row" id="retSuite">${PROG.retenir?.fait ? suite('retenir') : ''}</div>
    <div class="fiche" id="fiche"><div class="loading">Chargement de ta fiche…</div></div>`;
  $('#reviser', root)?.addEventListener('click', () => {
    let choix = dues.length ? dues : vues.filter((v) => MAIT[v.id].niveau < 4);
    if (!choix.length) choix = vues;
    choix = shuffle(choix).sort((a, b) => MAIT[a.id].niveau - MAIT[b.id].niveau).slice(0, 5);
    $('#revision').innerHTML = '<div id="serieR"></div>';
    const finRevision = async (res, recap) => {
      await recharger();
      const total = vs.length, ancrees = vs.filter((v) => (MAIT[v.id] || {}).niveau >= 4).length;
      const et = 1 + (ancrees >= 1 ? 1 : 0) + (ancrees >= Math.ceil(total / 2) ? 1 : 0);
      await sauverEtape('retenir', { fait: true, etoiles: et });
      $('#revision').innerHTML = `<div class="qnum">Révision terminée</div><div class="final-stars">${etoilesHTML(PROG.retenir?.etoiles || et)}</div><p>${ancrees} compétence${ancrees > 1 ? 's' : ''} ancrée${ancrees > 1 ? 's' : ''} sur ${total}.</p>${recap(res)}`;
      $('#retSuite').innerHTML = suite('retenir');
      chargerFiche();
    };
    if (N.reviser) return N.reviser($('#serieR'), choix.map((v) => v.id), ctx(), (res) => finRevision(res, (r) => `<div class="recap">${r.map((x) => `<div><span class="dot ${x.plein ? 'ok' : 'ko'}"></span><span class="m">${esc(x.html)}</span><span></span></div>`).join('')}</div>`));
    const seq = choix.map((v) => ({ ...tirerQuestion(v), exo: v.exo }));
    serie($('#serieR'), seq, { source: 'retenir', titre: 'Révision', onFin: (res) => finRevision(res, (r) => recapHTML(r, seq[0].exo)) });
  });
  const chargerFiche = async () => {
    try { const f = await api('/api/eleve/fiche?notion=' + encodeURIComponent(N.id)); $('#fiche').innerHTML = `<h2 class="fiche-titre">Ma fiche mémo</h2>${ficheHTML(f, N.definition)}`; }
    catch (e) { $('#fiche').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  };
  chargerFiche();
}

/* ---------- 7. Aller plus loin ---------- */
async function plusloin(root) {
  const d = PROG.plusloin?.donnees || {}, res = d.defis || [];
  root.innerHTML = `<div id="modContenu" style="display:grid;gap:18px"></div>
    <section class="card"><h3>Défis</h3><div id="defis" style="display:grid;gap:16px"></div></section><div class="row">${suite('plusloin')}</div>`;
  N.allerplusloin($('#modContenu'));
  if (!PROG.plusloin?.fait) await sauverEtape('plusloin', { fait: true, etoiles: 1 });
  const render = () => {
    $('#defis').innerHTML = N.defis.map((df, i) => `<div class="defi"><b>Défi ${i + 1}.</b> ${esc(df.q)}<div class="choices" style="margin-top:8px">${df.options.map((o, j) => {
      const cls = res[i] != null ? (j === df.juste ? 'good' : j === res[i] ? 'bad' : 'dim') : '';
      return `<button class="choice ${cls}" data-d="${i}" data-o="${j}" ${res[i] != null ? 'disabled' : ''}><span class="l">${LET[j]})</span><span>${esc(o)}</span></button>`;
    }).join('')}</div>${res[i] != null ? `<p class="mini" style="margin-top:6px">${res[i] === df.juste ? '✓ ' : '✗ '}${esc(df.expl)}</p>${res[i] !== df.juste ? `<button class="linkbtn" data-retry="${i}">Réessayer</button>` : ''}` : ''}</div>`).join('');
  };
  $('#defis').onclick = async (e) => {
    const b = e.target.closest('[data-d]'), r = e.target.closest('[data-retry]');
    if (b) { res[+b.dataset.d] = +b.dataset.o; render(); }
    else if (r) { res[+r.dataset.retry] = null; render(); return; }
    else return;
    const reussis = N.defis.filter((df, i) => res[i] === df.juste).length;
    await sauverEtape('plusloin', { donnees: { defis: res }, etoiles: 1 + reussis });
    if (reussis) toast(reussis === 2 ? 'Les deux défis sont réussis : trois étoiles !' : 'Défi réussi : une étoile de plus.');
  };
  render();
}

/* ---------- Ma maîtrise ---------- */
function vueMaitrise() {
  stopJeux();
  const vs = variantes();
  main().innerHTML = `
    <div class="etape-head"><button class="linkbtn" data-go="parcours">← Parcours</button><div class="eyebrow">${N.titreCourt}</div><h1>Ma maîtrise</h1>
      <p class="mini">Pas de note : chaque type de question est une compétence qui monte de niveau quand tu réponds juste et que tu sais dire pourquoi.</p></div>
    <div class="niveaux">${[1, 2, 3, 4].map((n) => `<div class="card"><b><span class="dotn" style="background:${COUL_NIV[n]}"></span>${NIVEAUX[n]}</b><span class="mini">${REGLE_NIV[n]}</span></div>`).join('')}</div>
    <section class="card"><h3>Mes compétences</h3>${vs.length ? vs.map((v) => { const m = MAIT[v.id], n = m ? m.niveau : 0;
      return `<div class="skill"><div><b>${esc(v.variable)}</b><span class="mini">${NIVEAUX[n]}${m && n < 4 ? ' · révision ' + dansJours(m.revision) : ''}</span></div><div class="segs">${[1, 2, 3, 4].map((k) => `<span style="background:${n >= k ? COUL_NIV[k] : 'var(--line-strong)'}"></span>`).join('')}</div></div>`; }).join('') : '<p class="mini">Aucune compétence pour l’instant.</p>'}</section>
    <section><h3>Mes badges</h3><div class="badges">${ME.badges.map((b) => `<div class="badge ${b.got ? 'got' : ''}"><span class="medal" aria-hidden="true">${b.got ? '★' : '☆'}</span><b>${esc(b.nom)}</b><span class="mini">${esc(b.desc)}</span><span class="pill ${b.got ? 'ok' : ''}">${b.got ? 'Obtenu' : esc(b.prog || 'À obtenir')}</span></div>`).join('')}</div></section>`;
  window.scrollTo({ top: 0 });
}

demarrer();
