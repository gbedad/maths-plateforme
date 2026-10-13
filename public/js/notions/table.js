// Modèle de notion « Table de t » (6e), d'après le cahier des charges manuscrit (table de 8).
// creerTable(t) renvoie une notion complète : Explorer en 3 séquences, jeux, entraînement chronométré…
import { $, $$, rnd, shuffle, esc } from '../outils.js';

// Étoile d'Explorer : gagnée à la séquence 2 (la séquence 1, découverte des méthodes, ne rapporte rien)
const SEUIL_ETOILE_S2 = 10;
export const ORDRE_EXPLORER = [0, 1, 10, 2, 5, 3, 4, 11, 8, 6, 7, 9, 12]; // ordre imposé des 13 questions (séquence 1)
const FAITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const COUL_UNITES = ['#e9e1d6', '#d6efd9', '#f6d6de', '#f8ecc9', '#dcdcf6', '#d6ecef', '#efe0f6', '#f3e2d2', '#dfeedd', '#f2d9cf'];

/* ---------- Stratégies (le « pourquoi » de la séquence 1) ----------
   Plusieurs réponses peuvent être valables : l'élève choisit celle qui explique le mieux comment il a trouvé. */
// modele = true : textes avec repères ({×10}, {autre}) pour le fichier Excel, au lieu des calculs écrits dans le sens de l'élève
export function strategies(t, k, sens, modele = false) {
  const r = t * k;
  const ecr = modele ? (a) => `{×${a}}` : (a, b) => (sens === 'tk' ? `${b} × ${a}` : `${a} × ${b}`);
  const autre = modele ? '{autre}' : sens === 'tk' ? `${k} × ${t}` : `${t} × ${k}`;
  const V = (texte, cat) => ({ texte, cat, ok: true }), F = (texte, expl) => ({ texte, ok: false, expl });
  const coeur = V('Je connais le résultat par cœur.', 'coeur');
  if (k === 0) return [F('On n’a pas le droit de multiplier un nombre par 0.', 'On peut multiplier par 0 : le résultat vaut 0.'), F(`${t} est plus grand que 0.`, 'C’est vrai, mais ça n’explique pas le résultat.'), V('N’importe quel nombre multiplié par 0 est égal à 0.', 'zero')];
  if (k === 1) return [F(`${t} est plus grand que 1.`, 'C’est vrai, mais ça n’explique pas le résultat.'), F('N’importe quel nombre multiplié par 1 est égal à 1.', `Non : ${ecr(1, t)} = ${t}, pas 1.`), V('N’importe quel nombre multiplié par 1 est égal à lui-même.', 'un')];
  if (k === 2) return [V(`${t} + ${t} = ${r} : c’est le double.`, 'double'), V(`${autre} = ${r}.`, 'commute'), F(t % 2 === 0 ? `${t} et 2 sont pairs.` : 'Le résultat se termine par 2.', 'Ça ne permet pas de trouver le résultat.')];
  if (k === 5) return [F('Le résultat doit finir par 0 ou 5.', 'C’est vrai pour la table de 5, mais ça ne donne pas le résultat.'), V(`${t * 10} ÷ 2 = ${r} : c’est la moitié de ${ecr(10, t)}.`, 'moitie10'), V(`${autre} = ${r}.`, 'commute')];
  if (k === 10) return [V('Multiplier un nombre par 10 revient à écrire un 0 à sa droite.', 'dix'), coeur, F(`Il faut ajouter 10 à ${t}.`, `Non : ${t} + 10 = ${t + 10}, alors que ${ecr(10, t)} = ${r}.`)];
  if (k === 11) return [V(`${t * 10} + ${t} = ${r} : 10 fois ${t}, plus encore ${t}.`, 'dixplus'), V(`${autre} = ${r}.`, 'commute'), coeur,
    F(`${t * 10} + 11 = ${r}.`, `Non : ${t * 10} + 11 = ${t * 10 + 11}. On part de ${t * 10} et on ajoute ${t} : ${t * 10} + ${t} = ${r}.`)];
  if (k === 12) { const p = t * 10 + 12 === r ? 2 : 12; return [V(`${t * 11} + ${t} = ${r} : j’ajoute ${t} au résultat précédent.`, 'ajout'), V(`${t * 10} + ${t * 2} = ${r} : 10 fois ${t} plus 2 fois ${t}.`, 'dixplus'), V(`J’ai obtenu ${r} en posant la multiplication ou en la calculant en ligne.`, 'pose'),
    F(`${t * 10} + ${p} = ${r}.`, `Non : ${t * 10} + ${p} = ${t * 10 + p}. On découpe 12 en 10 + 2 : ${t * 10} + ${t * 2} = ${r}.`)]; }
  const opts = [V(`${t * (k - 1)} + ${t} = ${r} : j’ajoute ${t} au résultat précédent.`, 'ajout')];
  if (k % 2 === 0 && k >= 4) opts.push(V(`2 × ${t * k / 2} = ${r} : c’est le double de ${ecr(k / 2, t)}.`, 'double'));
  else opts.push(k === t ? coeur : V(`${autre} = ${r}.`, 'commute'));
  opts.push(V(`${t * (k + 1)} − ${t} = ${r} : j’enlève ${t} au résultat suivant.`, 'retrait'));
  if (k === 3) opts.push(F(`${t * 2} × 3 = ${r}.`, `Non : ${t * 2} × 3 = ${t * 6}. Il fallait ${t * 2} + ${t} = ${r}.`));
  // Erreur fréquente : ajouter le facteur au lieu de la table (ou additionner au lieu de multiplier)
  else if (k === t) opts.push(F(`${t} + ${t} = ${r}.`, `Non : ${t} + ${t} = ${2 * t}, c’est ${ecr(2, t)}. Pour ${r}, il faut prendre ${t} fois ${t}.`));
  else opts.push(F(`${t * (k - 1)} + ${k} = ${r}.`, `Non : ${t * (k - 1)} + ${k} = ${t * (k - 1) + k}. Dans la table de ${t}, on ajoute ${t}, pas ${k} : ${t * (k - 1)} + ${t} = ${r}.`));
  return opts;
}
const PHRASES_STRAT = {
  ajout: (t) => `j’ajoute ${t} au résultat précédent`, retrait: (t) => `j’enlève ${t} au résultat suivant`, commute: () => 'je retourne la multiplication',
  double: () => 'je prends le double', moitie10: () => 'je prends la moitié de 10 fois', dixplus: (t) => `je pars de 10 × ${t}`, coeur: () => 'je connais le résultat par cœur',
  pose: () => 'je pose la multiplication', zero: () => 'je sais que × 0 donne 0', un: () => 'je sais que × 1 ne change rien', dix: () => 'j’écris un 0 à droite pour × 10',
};

/* ---------- Commentaire après une bonne explication (séquence 1) ----------
   Pourquoi la méthode marche, avec les nombres de la question. */
function commentaire(cat, t, k, sens) {
  const r = t * k, c = ecrire(sens, t, k), autre = ecrire(sens === 'tk' ? 'kt' : 'tk', t, k), e = (n) => ecrire(sens, t, n);
  switch (cat) {
    case 'zero': return `Multiplier par 0, c'est prendre ${t} zéro fois : il ne reste rien. ${c} = 0, et c'est vrai pour tous les nombres.`;
    case 'un': return `Prendre ${t} une seule fois, c'est ${t}. Multiplier par 1 ne change jamais un nombre.`;
    case 'dix': return `Avec × 10, chaque unité devient une dizaine : le ${t} glisse d'un rang et on écrit un 0 à droite. ${t} devient ${t * 10}.`;
    case 'ajout': return `Chaque ligne de la table, c'est la précédente + ${t} : ${e(k - 1)} = ${t * (k - 1)}, plus ${t}, donne ${r}. ${["Pratique quand tu connais le résultat d'avant.", `On avance de ${t} en ${t}, comme sur une frise.`, "C'est comme ça que la table se construit, ligne après ligne."][k % 3]}`;
    case 'retrait': return `Tu pars du résultat suivant et tu recules de ${t} : ${e(k + 1)} = ${t * (k + 1)}, moins ${t}, donne ${r}.${[5, 10].includes(k + 1) ? ` Bien vu : ${e(k + 1)} est facile à trouver.` : ''}`;
    case 'commute': return `${c} et ${autre}, ce sont les mêmes points, rangés en ${k} rangées de ${t} ou en ${t} rangées de ${k}. ${k >= 2 && k <= 9 ? `Ce que tu sais de la table de ${k} te sert déjà.` : "L'ordre de la multiplication ne change pas le résultat."}`;
    case 'double': return `${c}, c'est ${e(k / 2)} pris deux fois : 2 × ${t * k / 2} = ${r}.${t === 8 ? ' Pour la table de 8 : double, double, double.' : t === 4 ? ' Pour la table de 4 : le double du double.' : ''}`;
    case 'moitie10': return `× 5, c'est la moitié de × 10 : ${t * 10} ÷ 2 = ${r}. Ça marche pour tous les nombres.`;
    case 'dixplus': return k === 11 ? `× 11, c'est × 10 et encore une fois : ${t * 10} + ${t} = ${r}.` : `Découper ${k} en 10 + ${k - 10} : ${t * 10} + ${t * (k - 10)} = ${r}. Ça marche pour tous les grands nombres.`;
    case 'coeur': return k === 10 ? "C'est le but ! Et si un jour tu hésites, il y a une règle très simple pour × 10." : `C'est le but ! Si un jour tu hésites, tu peux vérifier : ${k < 12 ? `${t * (k + 1)} − ${t} = ${r}` : `${t * (k - 1)} + ${t} = ${r}`}.`;
    case 'pose': return `Ça marche toujours, mais c'est long. Plus rapide : ${t * (k - 1)} + ${t} = ${r}.`;
    default: return '';
  }
}

/* ---------- Retour après l'explication (séquence 1) ----------
   Fonction pure (testable) : titre, pourquoi ça marche, une autre façon qui n'est ni la méthode choisie
   ni une méthode déjà citée dans le commentaire, et de temps en temps la méthode préférée. */
const normTxt = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[x×]/g, '×').replace(/-/g, '−').replace(/[^\p{L}\p{N}+−×÷=]/gu, '');
const equations = (s) => (String(s || '').replace(/[x×]/g, '×').replace(/-/g, '−').match(/\d+\s*[+−×÷]\s*\d+\s*=\s*\d+/g) || []).map(normTxt);
const dejaDit = (opt, ...textes) => {
  const nt = normTxt(opt.texte), eq = equations(opt.texte);
  return textes.some((tx) => { const n = normTxt(tx), e = equations(tx); return (nt && n.includes(nt)) || eq.some((x) => e.includes(x)); });
};
export function retourExplication({ opts, pick, ok, t, k, sens, strats = [], alea = Math.random }) {
  const o = opts[pick];
  const candidats = (pourquoi) => opts.filter((x, j) => x.ok && j !== pick && !['coeur', 'pose'].includes(x.cat)
    && !(o.ok && x.cat && x.cat !== 'autre' && x.cat === o.cat) && !dejaDit(x, o.texte, pourquoi));
  if (o.ok) {
    const pourquoi = o.expl || commentaire(o.cat, t, k, sens);
    const liste = o.expl ? [] : candidats(pourquoi); // le commentaire de l'enseignant propose déjà une autre méthode
    const autre = liste.length ? { label: 'Autre façon', texte: liste[Math.floor(alea() * liste.length)].texte } : null;
    const fois = strats.filter((c) => c === o.cat).length;
    const pref = fois >= 3 && fois % 3 === 0 && PHRASES_STRAT[o.cat] && !['zero', 'un', 'dix'].includes(o.cat) ? `C'est la ${fois}e fois que tu choisis cette méthode : c'est ta méthode préférée pour l'instant.` : '';
    return { ok: true, titre: ok ? '✓ Bonne explication.' : '✓ Ta méthode est la bonne, mais le calcul a glissé : refais-le avec elle.', pourquoi, autre, pref };
  }
  const liste = candidats(o.expl);
  const bonne = liste.length ? liste[Math.floor(alea() * liste.length)] : (dejaDit(opts.find((x) => x.ok) || { texte: '' }, o.expl) ? null : opts.find((x) => x.ok));
  return { ok: false, titre: `✗ ${o.expl}`, pourquoi: '', autre: bonne ? { label: 'Une bonne façon', texte: bonne.texte } : null, pref: '' };
}
export { commentaire, remplirRep };

/* ---------- Petits composants ---------- */
const ecrire = (sens, t, k) => (sens === 'tk' ? `${t} × ${k}` : `${k} × ${t}`);
// Repères des textes venant de l'Excel : {calc} le calcul, {autre} le calcul retourné, {×N} t × N écrit dans le sens de l'élève, {t} {k} {r}
const remplirRep = (txt, t, k, sens) => String(txt || '')
  .replace(/\{calc\}/g, ecrire(sens, t, k)).replace(/\{autre\}/g, ecrire(sens === 'tk' ? 'kt' : 'tk', t, k))
  .replace(/\{\s*[×xX]\s*(\d+)\s*\}/g, (_, n) => ecrire(sens, t, +n)).replace(/\{t\}/g, t).replace(/\{k\}/g, k).replace(/\{r\}/g, t * k);
// Séquence 1 : questions de l'Excel (feuille « Tables ») si l'enseignant en a importé, sinon le modèle par défaut
function questionsSeq1(t, config) {
  const xl = Array.isArray(config?.sequence1) ? config.sequence1.filter((q) => FAITS.includes(q.k) && q.options?.some((o) => o.ok)) : [];
  const parK = new Map(xl.map((q) => [q.k, q]));
  const ordre = xl.length ? [...xl].sort((a, b) => a.ordre - b.ordre).map((q) => q.k) : [...ORDRE_EXPLORER];
  ORDRE_EXPLORER.forEach((k) => { if (!ordre.includes(k)) ordre.push(k); });
  const options = (k, sens) => {
    const q = parK.get(k);
    if (!q) return strategies(t, k, sens);
    return q.options.map((o) => ({ texte: remplirRep(o.texte, t, k, sens), ok: !!o.ok, cat: o.cat || 'autre', expl: remplirRep(o.expl || (o.ok ? '' : 'Ça ne permet pas de trouver le résultat.'), t, k, sens) }));
  };
  return { ordre, options };
}
function tableHTML(t, sens, etat = {}, actif = null) {
  return `<div class="tbl-t">${FAITS.map((k) => {
    const e = etat[k] || {};
    return `<div class="tl-row ${k === actif ? 'actif' : ''} ${e.ok === true ? 'juste' : e.ok === false ? 'faux' : ''}"><span class="tl-calc">${ecrire(sens, t, k)} =</span><span class="tl-box">${e.val ?? ''}</span>${e.ok === false ? '<span class="tl-x" title="Erreur sur ce calcul" aria-label="erreur">✗</span>' : ''}</div>`;
  }).join('')}</div>`;
}
// Points rangés en lignes régulières, chaque rangée posée sur une bande légère (« tant de rangées de tant de points »)
function pointsSVG(lignes, colonnes) {
  const s = 22, pos = (i) => 11 + i * s;
  const w = pos(colonnes - 1) + 11, h = pos(lignes - 1) + 11;
  let c = '';
  for (let i = 0; i < lignes; i++) c += `<rect x="1" y="${pos(i) - 10}" width="${w - 2}" height="20" rx="10" style="fill:color-mix(in srgb,var(--accent) 10%,var(--surface));stroke:color-mix(in srgb,var(--accent) 25%,var(--surface))"/>`;
  for (let i = 0; i < lignes; i++) for (let j = 0; j < colonnes; j++) c += `<circle cx="${pos(j)}" cy="${pos(i)}" r="7" style="fill:var(--accent)"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" style="width:${Math.min(w * 1.15, 440)}px;max-width:100%;height:auto" role="img" aria-label="${lignes} rangées de ${colonnes} points">${c}</svg>`;
}
// Durée d'affichage : 3 s minimum, puis environ 1 s de plus par tranche de 10 points (8 s au maximum)
export const dureePoints = (nb) => Math.min(8, Math.max(3, Math.round(1.5 + nb / 10)));
const nombre = (v) => { const s = String(v).trim(); return /^\d{1,4}$/.test(s) ? +s : NaN; };
const chrono = () => { const d = Date.now(); return () => (Date.now() - d) / 1000; };
const sec = (x) => x.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' s';

/* ---------- Série de calculs à compléter (S'entraîner, Retenir) ---------- */
function serieCalcul(root, t0, faits, { source, titre, ctx, onFin, chronoVisible = true, enregistrer }) {
  // faits : des facteurs k (table t0), ou des objets { t, k } pour mélanger les tables
  const qs = faits.map((f) => ({ ...(typeof f === 'object' ? f : { t: t0, k: f }), sens: Math.random() < 0.5 ? 'kt' : 'tk' }));
  const res = [];
  let i = 0, top;
  function render() {
    const q = qs[i], t = q.t;
    root.innerHTML = `<div class="ex-top"><div class="steps" aria-hidden="true">${qs.map((_, j) => `<i class="${res[j] ? (res[j].ok ? 'ok' : 'ko') : j === i ? 'cur' : ''}"></i>`).join('')}</div><span class="mini">${esc(titre)}</span></div>
      <div class="qnum">Calcul ${i + 1} sur ${qs.length}</div>
      <form class="calc-form" autocomplete="off"><span class="statement" style="margin:0">${ecrire(q.sens, t, q.k)} =</span><input class="calc-in" inputmode="numeric" aria-label="Résultat" maxlength="4"><button class="btn">Valider</button></form>
      ${chronoVisible ? '<p class="mini chrono" aria-live="off">0,0 s</p>' : ''}<div class="calc-fb" role="status"></div>`;
    const inp = $('.calc-in', root); inp.focus();
    top = chrono();
    if (chronoVisible) { clearInterval(root._tick); root._tick = setInterval(() => { const c = $('.chrono', root); if (c) c.textContent = sec(top()); }, 100); }
    $('.calc-form', root).onsubmit = (e) => {
      e.preventDefault();
      const v = nombre(inp.value); if (Number.isNaN(v)) { $('.calc-fb', root).innerHTML = '<p class="err">Écris un nombre.</p>'; return; }
      clearInterval(root._tick);
      const temps = top(), ok = v === t * q.k, calc = ecrire(q.sens, t, q.k);
      res.push({ t: q.t, k: q.k, ok, temps, v, calc, r: t * q.k });
      (enregistrer || ((it) => ctx.reponses(source, [it])))({ variante: 'k' + q.k, libelle: `${q.k} × ${t}`, question: `${calc} = ?`, ok1: ok, ok2: null, choix: `${v} (en ${sec(temps)})`, juste: `${calc} = ${t * q.k}`, corrige: `${calc} = ${t * q.k}` }, q.t);
      inp.disabled = true; $('.calc-form button', root).disabled = true;
      $('.calc-fb', root).innerHTML = `<div class="feedback"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? 'Correct' : 'Incorrect'}</div><p>${calc} = <b>${t * q.k}</b>${ok ? ` · en ${sec(temps)}` : ''}</p></div><div class="next"><button class="btn" id="calcNext">${i === qs.length - 1 ? 'Terminer' : 'Suivant →'}</button></div>`;
      $('#calcNext', root).focus();
      $('#calcNext', root).onclick = () => { if (i < qs.length - 1) { i++; render(); } else onFin(res); };
    };
  }
  render();
}
const recapCalc = (res) => `<div class="recap">${res.map((r) => `<div><span class="dot ${r.ok ? 'ok' : 'ko'}"></span><span class="m">${r.calc} = ${r.ok ? r.v : `<s>${r.v}</s> → ${r.r}`}</span><span class="mini">${sec(r.temps)}</span></div>`).join('')}</div>`;
const mediane = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };

/* ---------- Explorer : 3 séquences ---------- */
function explorerTable(t) {
  return function explorer(root, ctx) {
    const d = { ...(ctx.prog.explorer?.donnees || {}) };
    const sauver = (donnees, fait, etoiles) => ctx.sauver('explorer', { donnees, ...(fait ? { fait: true } : {}), ...(etoiles ? { etoiles } : {}) }).then(() => Object.assign(d, donnees));
    const intro = (titre, txt) => `<div class="seq-head"><div class="eyebrow">${titre}</div><p class="lead" style="margin:4px 0 0">${txt}</p></div>`;

    const ex = t === 3 ? 4 : 3; // exemple qui montre bien l'ordre (éviter 3 × 3)
    function choixSens() {
      root.innerHTML = `${intro('Avant de commencer', `Pour apprendre la table de ${t}, que préfères-tu écrire ?`)}
        <div class="answers"><button class="btn ghost big-choice" data-sens="tk">${t} × ${ex}</button><button class="btn ghost big-choice" data-sens="kt">${ex} × ${t}</button></div>
        <p class="mini">Ce choix sera gardé pendant tout le parcours. Les deux donnent le même résultat.</p>`;
      root.onclick = async (e) => {
        const b = e.target.closest('[data-sens]'); if (!b) return; root.onclick = null;
        if (d.phase >= 2) { await sauver({ sens: b.dataset.sens }); if (d.phase === 4) fin(); else reprise(); return; }
        await sauver({ sens: b.dataset.sens, phase: 1 }); sequence1();
      };
    }

    // Séquence 1 : reconstituer la table dans l'ordre imposé, avec un « pourquoi » à chaque question
    function sequence1() {
      const sens = d.sens, etat = {}, strats = [], S1 = questionsSeq1(t, ctx.config), ORDRE = S1.ordre;
      let n = 0;
      function question() {
        const k = ORDRE[n];
        root.innerHTML = `${intro(`Séquence 1 sur 3 · question ${n + 1} sur ${ORDRE.length}`, `Reconstitue la table de ${t}. Les questions ne viennent pas dans l'ordre : complète la case en couleur.`)}
          <div class="seq-grid">${tableHTML(t, sens, etat, k)}<div class="seq-side">
            <form class="calc-form" autocomplete="off"><span class="statement" style="margin:0">${ecrire(sens, t, k)} =</span><input class="calc-in" inputmode="numeric" maxlength="4" aria-label="Résultat"><button class="btn">Valider</button></form>
            <div id="s1fb" role="status"></div></div></div>`;
        const inp = $('.calc-in', root); inp.focus();
        $('.calc-form', root).onsubmit = (e) => {
          e.preventDefault();
          const v = nombre(inp.value); if (Number.isNaN(v)) return;
          const ok = v === t * k; etat[k] = { val: ok ? v : t * k, ok };
          inp.disabled = true; $('.calc-form button', root).disabled = true;
          $('.tbl-t', root).outerHTML = tableHTML(t, sens, etat, k);
          const opts = shuffle(S1.options(k, sens));
          const bilanCalc = ok
            ? `<div class="calc-bilan"><span class="cb good">✓ ${ecrire(sens, t, k)} = ${v}</span></div>`
            : `<div class="calc-bilan"><span class="cb bad">✗ Ta réponse : ${v}</span><span class="cb good-ghost">✓ ${ecrire(sens, t, k)} = ${t * k}</span></div>`;
          $('#s1fb').innerHTML = `<div class="feedback"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? 'Correct' : 'Incorrect'}</div>${bilanCalc}</div>
            <div class="why-title">Pourquoi ?</div><p class="mini" style="margin:-6px 0 8px">Choisis une seule réponse : celle qui explique le mieux <i>comment</i> ${ok ? 'tu as trouvé' : 'on trouve'} le résultat.</p>
            <div class="choices">${opts.map((o, j) => `<button class="choice" data-o="${j}" aria-pressed="false"><span class="l">${'abcd'[j]})</span><span>${esc(o.texte)}</span></button>`).join('')}</div>
            <div class="next" id="s1valBox"><span class="mini" id="s1valMsg">Choisis une explication.</span><button class="btn" id="s1val" disabled>Valider mon explication</button></div><div id="s1why"></div>`;
          let pick = null, premier = null; // premier : index du 1er essai raté (deuxième chance)
          $('#s1fb').onclick = (ev) => {
            const b = ev.target.closest('[data-o]');
            if (b && !b.disabled) {
              pick = +b.dataset.o;
              $$('#s1fb .choice').forEach((c, j) => { c.classList.toggle('sel', j === pick); c.setAttribute('aria-pressed', String(j === pick)); });
              $('#s1val').disabled = false; $('#s1valMsg').textContent = "Tu peux encore changer d'avis.";
              return;
            }
            if (ev.target.id !== 's1val' || pick === null) return;
            const o = opts[pick];
            // Résultat juste mais explication fausse : une deuxième chance, sans montrer la correction
            if (ok && !o.ok && premier === null) {
              premier = pick; pick = null;
              const c = $$('#s1fb .choice')[premier];
              c.disabled = true; c.classList.remove('sel'); c.removeAttribute('aria-pressed'); c.classList.add('essaye');
              c.lastElementChild.insertAdjacentHTML('beforeend', '<span class="rep-tag">Ton premier essai</span>');
              $('#s1val').disabled = true; $('#s1valMsg').textContent = '';
              $('#s1valBox').insertAdjacentHTML('beforebegin', '<div class="deuxieme-chance" role="status"><b>Ton résultat est juste.</b> Mais cette explication n’est pas la meilleure : essaie une autre réponse.</div>');
              return;
            }
            $('#s1valBox').remove(); $('#s1fb .deuxieme-chance')?.remove();
            $$('#s1fb .choice').forEach((c, j) => {
              c.disabled = true; c.classList.remove('sel', 'essaye'); c.removeAttribute('aria-pressed');
              const choisi = j === pick, bon = opts[j].ok;
              // Bonnes réponses en vert, mauvaises en rouge ; seule la réponse de l'élève est marquée
              c.classList.add(bon ? 'good' : 'bad');
              if (choisi) { c.classList.add('choisi'); c.lastElementChild.insertAdjacentHTML('beforeend', '<span class="rep-tag">Ton explication</span>'); }
            });
            if (o.ok) strats.push(o.cat);
            ctx.reponses('explorer', [{ variante: 'k' + k, libelle: `${k} × ${t}`, question: `${ecrire(sens, t, k)} = ?`, ok1: ok, ok2: o.ok && premier === null, choix: premier === null ? o.texte : `${opts[premier].texte} → 2e essai : ${o.texte}`, juste: o.ok ? o.texte : (opts.find((x) => x.ok) || {}).texte, corrige: `${ecrire(sens, t, k)} = ${t * k}` }]);
            // La correction : uniquement l'explication liée au choix de l'élève (« Explication si choisi »), en noir
            const texte = o.ok ? (o.expl || commentaire(o.cat, t, k, sens)) : o.expl;
            $('#s1why').innerHTML = `${texte ? `<div class="why-verdict correction"><p>${esc(texte)}</p></div>` : ''}<div class="next"><button class="btn" id="s1next">${n === ORDRE.length - 1 ? 'Séquence suivante →' : 'Question suivante →'}</button></div>`;
            $('#s1next').focus();
            $('#s1next').onclick = async () => { if (n < ORDRE.length - 1) { n++; question(); } else { const freq = {}; strats.forEach((c) => (freq[c] = (freq[c] || 0) + 1)); await sauver({ phase: Math.max(d.phase || 1, 2), strategies: freq }); continuer(); } };
          };
        };
      }
      question();
    }

    // Séquence 2 : la même chose, sans pourquoi et dans l'ordre
    function sequence2() {
      const sens = d.sens, etat = {};
      let k = 0;
      function question() {
        root.innerHTML = `${intro('Séquence 2 sur 3', `Cette fois, dans l'ordre et sans pourquoi : complète toute la table de ${t}.`)}
          <div class="seq-grid">${tableHTML(t, sens, etat, k)}<div class="seq-side">
            <form class="calc-form" autocomplete="off"><span class="statement" style="margin:0">${ecrire(sens, t, k)} =</span><input class="calc-in" inputmode="numeric" maxlength="4" aria-label="Résultat"><button class="btn">Valider</button></form><div id="s2fb" role="status"></div></div></div>`;
        const inp = $('.calc-in', root); inp.focus();
        $('.calc-form', root).onsubmit = (e) => {
          e.preventDefault();
          const v = nombre(inp.value); if (Number.isNaN(v)) return;
          const ok = v === t * k; etat[k] = { val: t * k, ok };
          ctx.reponses('explorer', [{ variante: 'k' + k, libelle: `${k} × ${t}`, question: `${ecrire(sens, t, k)} = ?`, ok1: ok, ok2: null, choix: String(v), juste: '', corrige: `${ecrire(sens, t, k)} = ${t * k}` }]);
          const suite = async () => {
            if (k < 12) { k++; question(); return; }
            const justes = Object.values(etat).filter((x) => x.ok).length, etoile = justes >= SEUIL_ETOILE_S2;
            await sauver({ phase: Math.max(d.phase || 1, 3), justesS2: justes }, false, etoile ? 1 : 0);
            if (etoile) {
              ctx.toast(`★ Étoile gagnée : ${justes} calculs justes sur 13 !`);
              const h = document.querySelector('.etape-head h1 .stars'); if (h) h.outerHTML = ctx.etoiles(1, true, 1);
              document.querySelector('.etape-head .regles li')?.classList.add('ok');
            } else ctx.toast(`${justes} calculs justes sur 13. Il en faut ${SEUIL_ETOILE_S2} pour l'étoile : tu pourras refaire la séquence 2.`);
            continuer();
          };
          if (ok) { suite(); return; }
          inp.disabled = true; $('.calc-form button', root).disabled = true;
          $('#s2fb').innerHTML = `<div class="feedback"><div class="hand ko">Incorrect</div><p>${ecrire(sens, t, k)} = <b>${t * k}</b></p></div><div class="next"><button class="btn" id="s2next">Continuer →</button></div>`;
          $('#s2next').focus(); $('#s2next').onclick = suite;
        };
      }
      question();
    }

    // Séquence 3 : nuages de points montrés quelques secondes (selon leur nombre)
    function sequence3() {
      const ks = shuffle([2, 3, 4, 5, 6, 7, 8, 9]);
      let n = 0;
      function question() {
        const k = ks[n], lignes = Math.random() < 0.5 ? k : t, colonnes = lignes === k ? t : k, duree = dureePoints(t * k);
        root.innerHTML = `${intro(`Séquence 3 sur 3 · image ${n + 1} sur ${ks.length}`, `Regarde bien : l'image disparaît au bout de ${duree} secondes. Compte les rangées et les points par rangée. Combien y a-t-il de points ?`)}
          <div class="card points-box"><div class="points">${pointsSVG(lignes, colonnes)}</div><div class="points-temps" aria-hidden="true"><i style="animation-duration:${duree}s"></i></div></div>
          <form class="calc-form" autocomplete="off" hidden><label for="ptsIn">Nombre de points :</label><input id="ptsIn" class="calc-in" inputmode="numeric" maxlength="4"><button class="btn">Valider</button></form><div id="s3fb" role="status"></div>`;
        setTimeout(() => {
          const p = $('.points', root); if (!p) return;
          $('.points-temps', root)?.remove();
          p.innerHTML = '<div class="points-cache">?</div>';
          const f = $('.calc-form', root); f.hidden = false; $('#ptsIn').focus();
          f.onsubmit = (e) => {
            e.preventDefault();
            const v = nombre($('#ptsIn').value); if (Number.isNaN(v)) return;
            const ok = v === t * k; f.querySelectorAll('input,button').forEach((x) => (x.disabled = true));
            p.innerHTML = pointsSVG(lignes, colonnes);
            ctx.reponses('explorer', [{ variante: 'k' + k, libelle: `${k} × ${t}`, question: `Nuage de ${lignes} × ${colonnes} points`, ok1: ok, ok2: null, choix: String(v), juste: '', corrige: `${lignes} × ${colonnes} = ${t * k}` }]);
            $('#s3fb').innerHTML = `<div class="feedback"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? 'Correct' : 'Incorrect'}</div><p>Il y avait ${lignes} rangées de ${colonnes} points : ${lignes} × ${colonnes} = <b>${t * k}</b>.</p></div><div class="next"><button class="btn" id="s3next">${n === ks.length - 1 ? 'Terminer Explorer' : 'Image suivante →'}</button></div>`;
            $('#s3next').focus();
            $('#s3next').onclick = async () => { if (n < ks.length - 1) { n++; question(); } else fin(); };
          };
        }, duree * 1000);
      }
      question();
    }

    // Après une séquence : la suivante si Explorer n'est pas fini, sinon retour au bilan
    function continuer() { if (d.phase === 2) sequence2(); else if (d.phase === 3) sequence3(); else fin(); }

    // Retour en cours de route : continuer ou refaire une séquence déjà faite
    function reprise() {
      const faites = d.phase - 1;
      root.innerHTML = `${intro('Explorer en cours', `Tu as terminé ${faites === 1 ? 'la séquence 1' : 'les séquences 1 et 2'} sur 3.`)}
        <div class="card"><div class="row"><button class="btn" data-seq="${d.phase}">Continuer : séquence ${d.phase} →</button></div>
        <p class="mini" style="margin-top:14px">Tu peux aussi refaire une séquence déjà terminée :</p>
        <div class="row">${[1, 2].filter((n) => n <= faites).map((n) => `<button class="btn ghost" data-seq="${n}">Refaire la séquence ${n}</button>`).join('')}</div></div>`;
      root.onclick = (e) => lancerSeq(e);
    }
    function lancerSeq(e) {
      const b = e.target.closest('[data-seq]'); if (!b) return; root.onclick = null;
      const n = +b.dataset.seq;
      if (n === 1) sequence1(); else if (n === 2) sequence2(); else sequence3();
    }

    async function fin() {
      const dejaFini = d.phase === 4;
      const freq = d.strategies || {}, top = Object.entries(freq).filter(([c]) => PHRASES_STRAT[c] && !['zero', 'un', 'dix'].includes(c)).sort((a, b) => b[1] - a[1])[0];
      const regle = `Je préfère écrire ${d.sens === 'tk' ? `${t} × ${ex}` : `${ex} × ${t}`}. ${top ? `Pour retrouver un résultat, le plus souvent, ${PHRASES_STRAT[top[0]](t)}.` : ''}`;
      await sauver({ phase: 4, regle }, true);
      termine();
      if (!dejaFini) ctx.toast('Explorer est terminé : Comprendre est ouvert.');
    }
    function termine() {
      root.innerHTML = `${intro('Explorer terminé', `Tu as reconstitué la table de ${t}, dans le désordre puis dans l'ordre, et compté des nuages de points.`)}
        <div class="card"><h3>Ta façon de faire</h3><p class="phrase-done">« ${esc(d.regle || '')} »</p><p class="mini">Elle apparaîtra dans ta fiche mémo.</p>
        <div class="row">${ctx.suite('explorer')}</div></div>
        <div class="card"><h3>Refaire</h3><p class="mini">Choisis ce que tu veux refaire. Ta façon de faire sera mise à jour.</p>
        <div class="row"><button class="btn ghost" data-seq="1">Séquence 1 · dans le désordre</button><button class="btn ghost" data-seq="2">Séquence 2 · dans l'ordre</button><button class="btn ghost" data-seq="3">Séquence 3 · les points</button><button class="btn ghost" id="refaireSens">Changer ${t} × ${ex} / ${ex} × ${t}</button></div></div>`;
      root.onclick = (e) => { if (e.target.id === 'refaireSens') { root.onclick = null; choixSens(); } else lancerSeq(e); };
    }

    if (ctx.prog.explorer?.fait) { d.phase = 4; termine(); }
    else if (!d.sens) choixSens();
    else if (d.phase === 2 || d.phase === 3) reprise();
    else sequence1();
  };
}

/* ---------- Comprendre ---------- */
function comprendreTable(t) {
  return function comprendre(root) {
    const verdict = (n) => {
      if (n % t === 0 && n / t <= 12) return { ok: true, txt: `Oui : ${n} = ${n / t} × ${t}.` };
      if (n % t === 0) return { ok: true, txt: `${n} = ${n / t} × ${t} : c'est un multiple de ${t}, au-delà de 12 × ${t}.` };
      const q = Math.floor(n / t); return { ok: false, txt: `Non : ${n} est entre ${q} × ${t} = ${q * t} et ${q + 1} × ${t} = ${(q + 1) * t}.` };
    };
    root.innerHTML = `
      <div class="sheet def"><div class="eyebrow">Définition</div><div class="big">k × ${t}</div>
        <p>Les résultats de la table de ${t} s'obtiennent en multipliant ${t} par 0, 1, 2… On passe d'un résultat au suivant en <b>ajoutant ${t}</b>. Et ${t} × k = k × ${t}.</p></div>
      <div class="grid2">
        <div class="card"><h3>La table de ${t}</h3><p class="mini" style="margin:-4px 0 10px">Chaque ligne, c'est la précédente + ${t}.</p>
          <div class="tbl-t lecture">${FAITS.map((k) => `<div class="tl-row"><span class="tl-calc">${k} × ${t} =</span><span class="tl-box juste">${k * t}</span><span class="mini">${k ? `= ${(k - 1) * t} + ${t}` : ''}</span></div>`).join('')}</div></div>
        <div style="display:grid;gap:18px;align-content:start">
          <div class="card tester"><h3>Ce nombre est-il dans la table de ${t} ?</h3>
            <form class="t-form" autocomplete="off"><input class="t-in" inputmode="numeric" value="${t * 7}" aria-label="Nombre"><button class="btn">Vérifier</button></form><div class="t-out"></div></div>
          <div class="card"><h3>Les pièges fréquents</h3><ul class="traps">
            <li><span class="k">0 × ${t}</span><span>= 0, pas ${t}.</span></li>
            <li><span class="k">1 × ${t}</span><span>= ${t} : multiplier par 1 ne change rien.</span></li>
            <li><span class="k">7 × ${t}</span><span>= ${7 * t}, à ne pas confondre avec ses voisins ${6 * t} et ${8 * t}.</span></li>
            <li><span class="k">${t} × 10</span><span>= ${t * 10} : on écrit un 0 à droite de ${t}.</span></li>
          </ul></div></div></div>`;
    const run = (raw, rapporter) => {
      const n = nombre(raw), out = $('.t-out', root);
      if (Number.isNaN(n)) { out.innerHTML = '<div class="verdict">Écris un nombre entier positif.</div>'; return; }
      const v = verdict(n);
      out.innerHTML = `<div class="verdict ${v.ok ? 'yes' : 'no'}" role="status">${esc(v.txt)}</div>`;
      if (rapporter && root._onTest) root._onTest(`${n} · table de ${t}`, v.txt);
    };
    $('.t-form', root).onsubmit = (e) => { e.preventDefault(); run($('.t-in', root).value, true); };
    run(String(t * 7), false);
  };
}

/* ---------- En savoir plus / Aller plus loin ---------- */
const ASTUCES = {
  2: [['Le double', (k) => `${k} × 2, c'est ${k} + ${k} = ${2 * k}.`]],
  3: [['Le triple', (k) => `${k} × 3 = ${k} + ${k} + ${k} = ${3 * k}.`], ['× 2 puis + le nombre', (k) => `${k} × 3 = ${k * 2} + ${k} = ${3 * k}.`]],
  4: [['Le double du double', (k) => `${k} → ${2 * k} → ${4 * k}.`]],
  5: [['La moitié de × 10', (k) => `${k} × 10 = ${10 * k}, la moitié : ${5 * k}.`], ['Toujours 0 ou 5 au bout', () => 'Les résultats se terminent tous par 0 ou par 5.']],
  6: [['× 5 puis + le nombre', (k) => `${k} × 6 = ${5 * k} + ${k} = ${6 * k}.`], ['Le double de × 3', (k) => `${k} × 3 = ${3 * k}, le double : ${6 * k}.`]],
  7: [['× 5 puis + × 2', (k) => `${k} × 7 = ${5 * k} + ${2 * k} = ${7 * k}.`], ['5, 6, 7, 8', () => '56 = 7 × 8 : on récite 5, 6, 7, 8 dans l’ordre.']],
  8: [['× 10 moins 2 fois le nombre', (k) => `${k} × 8 = ${10 * k} − ${2 * k} = ${8 * k}.`], ['5, 6, 7, 8', () => '56 = 7 × 8 : on récite 5, 6, 7, 8 dans l’ordre.']],
  9: [['× 10 moins le nombre', (k) => `${k} × 9 = ${10 * k} − ${k} = ${9 * k}.`], ['La somme des chiffres', () => 'De 9 à 90, les chiffres de chaque résultat s’additionnent pour faire 9 : 7 × 9 = 63 et 6 + 3 = 9.']],
};
function plusloinTable(t) {
  return function plusloin(root) {
    const unites = FAITS.map((k) => k * t);
    const dbl = t === 8 || t === 4;
    const astuces = ASTUCES[t] || [], varie = astuces.some(([, f]) => f.length > 0); // une astuce dépend-elle du nombre choisi ?
    let num = 0; const q = () => ++num;   // numérotation des parties sans trou
    root.innerHTML = `
      <div class="sheet intro-pl"><div class="eyebrow">Des techniques</div><h3 style="font-size:1.4rem;margin-top:4px">Retrouver la table de ${t} sans tout apprendre par cœur</h3></div>
      ${dbl ? `<div class="card" data-bloc="1"><div class="block-head"><span class="q">${q()}</span><h3>La technique du ${t === 8 ? 'double, double, double' : 'double du double'}</h3></div>
        <div class="prose"><p>Multiplier par ${t}, c'est prendre le double ${t === 8 ? '3 fois' : '2 fois'}. Complète les cases.</p></div>
        <div class="row"><label for="dbK">Nombre de départ :</label><input id="dbK" class="small-input db-k" type="number" min="1" max="12" value="6"></div>
        <div class="dbl"></div><p class="db-out" role="status" style="margin:8px 0 0"></p></div>` : ''}
      <div class="card" data-bloc="2"><div class="block-head"><span class="q">${q()}</span><h3>Le rythme des unités</h3></div>
        <div class="prose"><p>Regarde le dernier chiffre des résultats : il revient toujours dans le même ordre.</p></div>
        <div class="rythme">${unites.map((n) => `<span style="--c:${COUL_UNITES[n % 10]}">${Math.floor(n / 10) || ''}<b>${n % 10}</b></span>`).join('')}</div>
        <p style="margin:10px 0 0">${t % 2 === 0 ? `Ce ne sont que des nombres pairs, car ${t} est un nombre pair.` : `Les résultats sont tour à tour pairs et impairs, car ${t} est impair.`} Les chiffres des unités se suivent : ${[...new Set(unites.slice(0, 10).map((n) => n % 10))].join(', ')}…</p></div>
      ${astuces.length ? `<div class="card" data-bloc="3"><div class="block-head"><span class="q">${q()}</span><h3>Astuces</h3></div>
        ${varie ? `<div class="prose"><p>Change le nombre : l'astuce marche à chaque fois.</p></div>
        <div class="row"><label for="asK">Choisis un nombre de 1 à 12 :</label><input id="asK" class="small-input as-k" type="number" min="1" max="12" value="7"></div>` : ''}
        <div class="uses as-list" style="grid-template-columns:repeat(auto-fill,minmax(220px,1fr))"></div></div>` : ''}
      <div class="card" data-bloc="4"><div class="block-head"><span class="q">${q()}</span><h3>Au-delà de 12</h3></div>
        <div class="prose"><p>Pour ${t} × 15, on découpe 15 en 10 + 5.</p></div>
        <div class="row"><input class="small-input d-b" type="number" min="13" max="30" value="15" aria-label="Nombre entre 13 et 30"><span>× ${t}</span></div>
        <div class="verdict yes d-out" style="margin-top:12px"></div>
        <p style="margin:12px 0 0">Tous ces nombres, ${t}, ${2 * t}, ${3 * t}… sans limite, s'appellent les <b>multiples de ${t}</b>.</p></div>`;
    if (dbl) {
      const maj = () => {
        let k = Math.round(+$('.db-k', root).value); if (!(k >= 1 && k <= 12)) k = 6;
        const etapes = t === 8 ? [k, 2 * k, 4 * k, 8 * k] : [k, 2 * k, 4 * k];
        $('.dbl', root).innerHTML = etapes.slice(0, -1).map((a, i) => `<div class="db-l">Le double de <b>${a}</b>, c'est <input class="small-input db-in" data-r="${etapes[i + 1]}" inputmode="numeric" aria-label="Le double de ${a}" style="width:5em"></div>`).join('');
        $('.db-out', root).textContent = '';
      };
      $('.db-k', root).addEventListener('input', maj); maj();
      root.addEventListener('input', (e) => {
        if (!e.target.classList.contains('db-in')) return;
        const ok = +e.target.value === +e.target.dataset.r; e.target.style.borderColor = e.target.value ? (ok ? 'var(--ok)' : 'var(--ko)') : '';
        const tous = $$('.db-in', root); if (tous.every((x) => +x.value === +x.dataset.r)) { const k = Math.round(+$('.db-k', root).value) || 6; $('.db-out', root).innerHTML = `<b>Donc ${k} × ${t} = ${k * t}.</b>`; }
      });
    }
    if ($('.as-list', root)) {
      const ast = () => { let k = Math.round(+($('.as-k', root)?.value ?? 7)); if (!(k >= 1 && k <= 12)) k = 7; $('.as-list', root).innerHTML = astuces.map(([n, f]) => `<div class="use"><b>${n}</b><p class="m">${f(k)}</p></div>`).join(''); };
      $('.as-k', root)?.addEventListener('input', ast); ast();
    }
    const dec = () => { const b = Math.round(+$('.d-b', root).value), o = $('.d-out', root); if (!(b >= 13 && b <= 30)) { o.className = 'verdict d-out'; o.textContent = 'Choisis un nombre de 13 à 30.'; return; } o.className = 'verdict yes d-out'; o.innerHTML = `<span class="m">${b} × ${t} = 10 × ${t} + ${b - 10} × ${t} = ${10 * t} + ${(b - 10) * t} = <b>${b * t}</b></span>`; };
    $('.d-b', root).addEventListener('input', dec); dec();
  };
}

/* ---------- Jeux ---------- */
function genJeu(t) {
  return (kind, trap) => {
    if (!kind) kind = Math.random() < 0.5 ? 'oui' : 'non';
    if (trap === undefined) trap = Math.random() < 0.35;
    let n;
    if (kind === 'oui') n = t * rnd(trap ? 0 : 2, trap ? 12 : 10);
    else if (trap) { do { n = t * rnd(2, 10) + (Math.random() < 0.5 ? 1 : -1) * (t > 2 ? rnd(1, 2) : 1); } while (n % t === 0); }
    else do { n = rnd(1, 12 * t); } while (n % t === 0);
    const ok = n % t === 0 && n <= 12 * t;
    const why = ok ? `${n} = ${n / t} × ${t}.` : `${n} n'est pas un résultat de la table de ${t} : il est entre ${Math.floor(n / t) * t} et ${(Math.floor(n / t) + 1) * t}.`;
    return { s: String(n), html: String(n), label: String(n), ok, why, trap };
  };
}
function jeuxExtra(t) {
  const sens = (ctx) => ctx.prog.explorer?.donnees?.sens || 'kt';
  return [
    { id: 'relier', titre: 'Relier', desc: `Relie chaque calcul de la table de ${t} à son résultat.`, render(root, ctx) {
      let paires, choisi, erreurs;
      const manche = () => {
        const ks = shuffle(FAITS).slice(0, 6);
        paires = ks.map((k) => ({ k, ok: false })); choisi = null; erreurs = 0;
        const droite = shuffle(ks);
        root.innerHTML = `<p class="prompt">Clique sur un calcul, puis sur son résultat.</p><div class="relier"><div class="col">${ks.map((k) => `<button class="rl" data-g="${k}">${ecrire(sens(ctx), t, k)}</button>`).join('')}</div><div class="col">${droite.map((k) => `<button class="rl" data-d="${k}">${k * t}</button>`).join('')}</div></div><p class="gmsg" id="rlMsg" role="status"></p>`;
      };
      root.onclick = (e) => {
        const g = e.target.closest('[data-g]'), dd = e.target.closest('[data-d]');
        if (g && !g.disabled) { $$('[data-g]', root).forEach((x) => x.classList.toggle('sel', x === g)); choisi = +g.dataset.g; }
        else if (dd && !dd.disabled && choisi !== null) {
          const k = +dd.dataset.d, gb = $(`[data-g="${choisi}"]`, root);
          if (k === choisi) { [gb, dd].forEach((x) => { x.disabled = true; x.classList.remove('sel'); x.classList.add('good'); }); paires.find((p) => p.k === k).ok = true; choisi = null; $('#rlMsg').textContent = ''; }
          else { erreurs++; dd.classList.add('bad'); setTimeout(() => dd.classList.remove('bad'), 500); $('#rlMsg').textContent = `${ecrire(sens(ctx), t, choisi)} ne fait pas ${k * t}.`; }
          if (paires.every((p) => p.ok)) { $('#rlMsg').innerHTML = `Tout est relié${erreurs ? '' : ' du premier coup'} ! <button class="btn sm" id="rlNew">Nouvelle manche</button>`; ctx.finPartie('relier', 6 - Math.min(6, erreurs)); }
        } else if (e.target.id === 'rlNew') manche();
      };
      manche();
    } },
    { id: 'chrono', titre: 'Contre la montre', desc: `Reconstitue toute la table de ${t} le plus vite possible : dans l'ordre, à l'envers ou au hasard.`, render(root, ctx) {
      const meilleurs = {};
      const menu = () => {
        root.innerHTML = `<p class="prompt">Choisis un ordre, puis complète la table le plus vite possible.</p><div class="answers"><button class="btn" data-m="ordre">Dans l'ordre</button><button class="btn ghost" data-m="inverse">À l'envers</button><button class="btn ghost" data-m="hasard">Au hasard</button></div>`;
      };
      const partie = (mode) => {
        const ks = mode === 'ordre' ? [...FAITS] : mode === 'inverse' ? [...FAITS].reverse() : shuffle(FAITS);
        const etat = {}; let i = 0, top = null;
        const s = sens(ctx);
        const render = () => {
          const k = ks[i];
          root.innerHTML = `<div class="ex-top"><span class="qnum">${{ ordre: "Dans l'ordre", inverse: "À l'envers", hasard: 'Au hasard' }[mode]}</span><span class="chrono-big" aria-live="off">${top ? sec(top()) : '0 s'}</span></div>
            <div class="seq-grid">${tableHTML(t, s, etat, k)}<form class="calc-form" autocomplete="off"><span class="statement" style="margin:0">${ecrire(s, t, k)} =</span><input class="calc-in" inputmode="numeric" maxlength="4" aria-label="Résultat"><button class="btn">OK</button></form></div>`;
          const inp = $('.calc-in', root); inp.focus();
          $('.calc-form', root).onsubmit = (e) => {
            e.preventDefault();
            if (!top) { top = chrono(); root._tick = setInterval(() => { const c = $('.chrono-big', root); if (c) c.textContent = sec(top()); }, 100); }
            if (+inp.value !== t * k || inp.value === '') { inp.classList.add('err-in'); inp.select(); return; }
            etat[k] = { val: t * k, ok: true };
            if (i < ks.length - 1) { i++; render(); return; }
            clearInterval(root._tick);
            const temps = top(), rec = !meilleurs[mode] || temps < meilleurs[mode]; if (rec) meilleurs[mode] = temps;
            root.innerHTML = `<div class="qnum">Table complète</div><div class="final">${sec(temps)}</div><p>${rec ? 'C’est ton meilleur temps pour cet ordre aujourd’hui.' : `Ton meilleur temps : ${sec(meilleurs[mode])}.`}</p><button class="btn" id="chMenu">Rejouer</button>`;
            ctx.finPartie('chrono', Math.round(temps));
          };
        };
        render();
      };
      root.onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) partie(b.dataset.m); if (e.target.id === 'chMenu') menu(); };
      menu();
    } },
  ];
}

/* ---------- S'entraîner et Retenir ---------- */
function entrainerTable(t) {
  return function entrainer(root, ctx) {
    const lancer = () => {
      const faits = []; while (faits.length < 12) { const k = FAITS[rnd(0, 12)]; if (faits[faits.length - 1] !== k) faits.push(k); }
      root.innerHTML = '<div class="sheet" id="serie"></div>';
      serieCalcul($('#serie'), t, faits, { source: 'entrainer', titre: "S'entraîner", ctx, onFin: async (res) => {
        const justes = res.filter((r) => r.ok).length, med = mediane(res.filter((r) => r.ok).map((r) => r.temps));
        const et = 1 + (justes >= 9 ? 1 : 0) + (justes >= 9 && med <= 5 ? 1 : 0);
        const avant = ctx.prog.entrainer?.etoiles || 0;
        await ctx.sauver('entrainer', { fait: true, etoiles: et });
        await ctx.recharger();
        $('#serie').innerHTML = `<div class="qnum">Série terminée</div><div class="final-stars">${ctx.etoiles(et)}</div>
          <p>${justes} calcul${justes > 1 ? 's' : ''} juste${justes > 1 ? 's' : ''} sur 12${justes ? `, en ${sec(med)} en moyenne` : ''}. ${et === 3 ? 'Juste et rapide : trois étoiles !' : et === 2 ? 'Pour la 3e étoile, essaie de répondre en moins de 5 secondes.' : 'Pour la 2e étoile, il faut au moins 9 calculs justes.'}${et > avant ? ' <b>Nouvelle étoile gagnée.</b>' : ''}</p>
          ${recapCalc(res)}<div class="answers"><button class="btn ghost" id="again">Nouvelle série</button>${ctx.suite('entrainer')}</div>`;
        $('#again').onclick = lancer;
      } });
    };
    lancer();
  };
}
function reviserTable(t) { return (root, ids, ctx, onFin) => serieCalcul(root, t, ids.map((id) => +id.slice(1)), { source: 'retenir', titre: 'Révision', ctx, onFin: (res) => onFin(res.map((r) => ({ plein: r.ok, ok1: r.ok, html: `${r.calc} = ${r.v}`, calc: r.calc }))) }); }

/* ---------- Tables mélangées : calculs tirés au hasard dans les tables choisies par l'enseignant ---------- */
export function serieMelangee(root, tables, nb, { api, toast, onFin }) {
  const faits = [];
  while (faits.length < nb) {
    const f = { t: tables[rnd(0, tables.length - 1)], k: rnd(0, 12) };
    const p = faits[faits.length - 1];
    if (!p || p.t !== f.t || p.k !== f.k) faits.push(f);
  }
  const enregistrer = (item, t) => api('/api/eleve/reponses', { method: 'POST', body: { notion: `table-${t}`, source: 'entrainer', items: [item] } }).catch(() => toast("Ta réponse n'a pas pu être enregistrée."));
  serieCalcul(root, tables[0], faits, { source: 'entrainer', titre: 'Tables mélangées', ctx: null, enregistrer, onFin: (res) => {
    const justes = res.filter((r) => r.ok).length, med = mediane(res.filter((r) => r.ok).map((r) => r.temps));
    const parTable = tables.map((t) => { const rs = res.filter((r) => r.t === t); return rs.length ? `<span class="pill ${rs.every((r) => r.ok) ? 'ok' : rs.some((r) => r.ok) ? 'mid' : 'ko'}">× ${t} : ${rs.filter((r) => r.ok).length}/${rs.length}</span>` : ''; }).join(' ');
    root.innerHTML = `<div class="qnum">Série terminée</div><div class="final">${justes} / ${res.length}</div>
      <p>${justes ? `Calculs justes en ${sec(med)} en moyenne.` : ''} ${justes === res.length ? 'Tout juste !' : 'Regarde les calculs en rouge, puis refais une série.'}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0 12px">${parTable}</div>${recapCalc(res)}`;
    onFin?.(res);
  } });
}

/* ---------- La notion ---------- */
export function creerTable(t) {
  return {
    id: `table-${t}`, type: 'table', t,
    niveau: '6e', symbole: `×${t}`,
    titre: `La table de ${t}`, titreCourt: `Table de ${t}`,
    theme: 'Nombres et calculs', sousTheme: 'Les tables de multiplication',
    intro: `Reconstitue la table de ${t}, découvre comment retrouver chaque résultat, puis entraîne-toi à répondre juste et vite.`,
    definition: `<div class="big m">k × ${t} = ${t} × k</div><p>On passe d'un résultat de la table de ${t} au suivant en <b>ajoutant ${t}</b>.</p>`,
    parcours: [{ sym: `×${t}`, nom: `Table de ${t}`, id: `table-${t}` }, { sym: 'k·n', nom: 'Multiples et diviseurs' }],
    schema: `<svg viewBox="0 0 240 120" role="img" aria-label="Nuage de 4 rangées de ${t} points"><rect x="2" y="2" width="236" height="116" rx="12" style="fill:var(--paper);stroke:var(--border)"/>
      ${Array.from({ length: 4 }, (_, i) => Array.from({ length: t }, (_, j) => `<circle cx="${120 - (t - 1) * 9 + j * 18}" cy="${30 + i * 18}" r="6" style="fill:var(--accent)"/>`).join('')).join('')}
      <text x="120" y="112" text-anchor="middle" style="font-family:var(--f-math);font-size:14px;fill:var(--ink-soft)">4 × ${t} = ${4 * t}</text></svg><p>4 rangées de ${t} points.</p>`,
    competences: FAITS.map((k) => ({ id: 'k' + k, variable: `${k} × ${t}` })),
    descEtapes: {
      explorer: `Reconstitue la table de ${t}, dis comment tu trouves chaque résultat, puis compte des nuages de points.`,
      comprendre: `La table complète, le testeur « ce nombre est-il dans la table ? » et les pièges.`,
      ensavoirplus: `Des techniques pour retrouver la table de ${t} sans tout apprendre par cœur.`,
      jouer: 'Attrape les multiples, relie calculs et résultats, complète la table contre la montre.',
      entrainer: '12 calculs à compléter, chronométrés.',
      plusloin: `Au-delà de 12 × ${t} et deux défis.`,
    },
    etoilesMax: { explorer: 1 },
    reglesEtoiles: { explorer: [`Séquence 2 : au moins ${SEUIL_ETOILE_S2} calculs justes sur 13`], entrainer: ['Faire une série de 12 calculs', 'Au moins 9 calculs justes', 'Et répondre en moins de 5 secondes en moyenne'] },
    affiche: (s) => esc(s),
    explorerCustom: explorerTable(t),
    entrainerCustom: entrainerTable(t),
    reviser: reviserTable(t),
    jeuxExtra: jeuxExtra(t), sansIntrus: true,
    comprendre: comprendreTable(t),
    plusloin: plusloinTable(t),
    ensavoirplus(root) { plusloinTable(t)(root); root.querySelectorAll('[data-bloc="4"]').forEach((n) => n.remove()); },
    allerplusloin(root) { plusloinTable(t)(root); root.querySelectorAll('[data-bloc]:not([data-bloc="4"]), .intro-pl').forEach((n) => n.remove()); root.querySelectorAll('.q').forEach((n) => n.remove()); },
    defis: [
      { q: `Combien font ${t} × 15 ?`, options: [String(t * 15), String(t * 15 + t), String(t * 10 + 5)], juste: 0, expl: `${t} × 15 = ${t} × 10 + ${t} × 5 = ${t * 10} + ${t * 5} = ${t * 15}.` },
      { q: `Parmi ces nombres, lequel est un multiple de ${t} ?`, options: [String(t * 13 + 1), String(t * 13), String(t * 13 - 2)], juste: 1, expl: `${t * 13} = 13 × ${t}. Les deux autres ne tombent pas juste.` },
    ],
    jeu: {
      gen: genJeu(t),
      consigne1: `Clique sur les résultats de la table de ${t}, évite les autres.`,
      piege1: `Attention aux nombres voisins : ${7 * t} est dans la table, ${7 * t + 1} non.`,
      description1: `Des nombres apparaissent. Clique seulement sur les résultats d'une multiplication par ${t}.`,
      consigneOui: '', consigneNon: '', laisse: `qui était bien dans la table de ${t}`,
    },
  };
}
export const TABLES = [2, 3, 4, 5, 6, 7, 8, 9].map(creerTable);
