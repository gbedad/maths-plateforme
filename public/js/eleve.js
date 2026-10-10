// Application élève
import { $, $$, rnd, shuffle, esc, api, toast, dateFr } from './outils.js';
import { tirerSerie } from './moteur.js';
import naturels from './notions/entiers-naturels.js';
import scientifique from './notions/ecriture-scientifique.js';

const CATALOGUE = { [naturels.id]: naturels, [scientifique.id]: scientifique };
let ME = null, N = null, EXOS = [], VIS = {}, REVEALED = {}, S = null;
const LET = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

/* ---------- Démarrage et connexion ---------- */
async function demarrer() {
  try { ME = await api('/api/eleve/moi'); } catch (e) { if (e.status === 401) return afficherLogin(); $('#loading').textContent = e.message; return; }
  $('#loading').hidden = true; $('#login').hidden = true; $('#app').hidden = false;
  $('#who').hidden = false;
  $('#who').innerHTML = `<span><b>${esc(ME.eleve.pseudo)}</b> · ${esc(ME.classe.nom)}</span><button class="linkbtn" id="logout">Se déconnecter</button>`;
  const dispo = ME.classe.reglages.notions.filter((id) => CATALOGUE[id]);
  if (!dispo.length) { $('#app').innerHTML = '<div class="card empty">Aucune notion n\'est encore ouverte pour ta classe.</div>'; return; }
  const pref = store.get('mpe-notion');
  choisirNotion(dispo.includes(pref) ? pref : dispo[0], dispo);
}
function afficherLogin() { $('#loading').hidden = true; $('#app').hidden = true; $('#who').hidden = true; $('#login').hidden = false; $('#lgCode').focus(); }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#lgErr').textContent = '';
  const btn = e.submitter || $('#loginForm button'); btn.disabled = true;
  try {
    const r = await api('/api/eleve/login', { method: 'POST', body: { code: $('#lgCode').value, pseudo: $('#lgPseudo').value, pin: $('#lgPin').value } });
    if (r.nouveau) toast('Bienvenue ! Retiens bien ton pseudo et ton code secret.');
    await demarrer();
  } catch (err) { $('#lgErr').textContent = err.message; } finally { btn.disabled = false; }
});
document.addEventListener('click', async (e) => {
  if (e.target.id === 'logout') { await api('/api/logout', { method: 'POST' }).catch(() => {}); location.reload(); }
});

/* ---------- Notion courante ---------- */
function choisirNotion(id, dispo) {
  g1Stop(); g2Stop(); S = null; REVEALED = {};
  N = CATALOGUE[id]; store.set('mpe-notion', id);
  EXOS = ME.exercices.filter((x) => x.notion === id);
  $('.brand .logo').textContent = N.symbole.length > 2 ? 'ℕ' : N.symbole;
  $('#notionSwitch').innerHTML = dispo.length > 1 ? `<div class="eyebrow">Mes notions</div>${dispo.map((d) => `<button class="notion ${d === id ? 'active' : ''}" data-notion="${d}"><span class="sym" style="${CATALOGUE[d].symbole.length > 2 ? 'font-size:1rem' : ''}">${CATALOGUE[d].symbole}</span><span class="nm">${CATALOGUE[d].titreCourt}<span>${CATALOGUE[d].niveau}</span></span><span></span></button>`).join('')}` : '';
  $('#pTheme').textContent = 'Thème · ' + N.theme;
  $('#pSousTheme').textContent = N.sousTheme;
  const best = (ME.meilleurs.find((m) => m.notion === id) || {}).meilleur || 0;
  $('#pNotions').innerHTML = N.parcours.map((p) => p.id
    ? `<li><button class="notion active" aria-current="true"><span class="sym" style="${p.sym.length > 2 ? 'font-size:1rem' : ''}">${p.sym}</span><span class="nm">${p.nom}<span>${best ? `Meilleur score ${Math.round(best * 100)} %` : 'Disponible'}</span><span class="progress"><i style="width:${Math.round(best * 100)}%"></i></span></span><span></span></button></li>`
    : `<li><button class="notion" disabled><span class="sym" style="${p.sym.length > 2 ? 'font-size:1rem' : ''}">${p.sym}</span><span class="nm">${p.nom}<span>Verrouillé</span></span><span class="tag">Bientôt</span></button></li>`).join('');
  $('#pSchema').innerHTML = N.schema;
  $('#hEyebrow').textContent = `${N.niveau} · ${N.sousTheme}`;
  $('#hTitre').innerHTML = `${N.titre} <span class="m">${N.symbole.replace('×10ⁿ', 'a × 10ⁿ')}</span>`;
  $('#hIntro').innerHTML = N.intro;
  N.comprendre($('#v-comprendre'));
  $('#v-comprendre').insertAdjacentHTML('beforeend', `<div class="row"><button class="btn" data-go="entrainer">Je m'entraîne →</button><button class="btn ghost" data-go="jouer">Ou je joue</button></div>`);
  N.plusloin($('#v-plusloin'));
  $('#g1desc').textContent = N.jeu.description1 + ' 30 secondes, 3 vies.';
  renderBest();
  VIS = { ...ME.classe.reglages.onglets, auto: ME.classe.reglages.auto };
  applyVis();
  show(isVisible('comprendre') ? 'comprendre' : 'entrainer');
}
$('#notionSwitch').addEventListener('click', (e) => { const b = e.target.closest('[data-notion]'); if (b) choisirNotion(b.dataset.notion, ME.classe.reglages.notions.filter((id) => CATALOGUE[id])); });

/* ---------- Onglets ---------- */
const isVisible = (t) => t === 'entrainer' || t === 'suivi' || !!(VIS[t] || REVEALED[t]);
function applyVis() {
  ['comprendre', 'jouer', 'plusloin'].forEach((t) => {
    $('#t-' + t).hidden = !isVisible(t);
    $$(`[data-go="${t}"]`).forEach((b) => { if (!b.closest('.reveal')) b.hidden = !isVisible(t); });
  });
}
function show(view) {
  if (!isVisible(view)) view = 'entrainer';
  $$('.tab').forEach((t) => t.setAttribute('aria-selected', t.dataset.view === view));
  $$('.view').forEach((s) => (s.hidden = s.id !== 'v-' + view));
  if (view === 'entrainer' && !S) debutEntrainement();
  if (view === 'suivi') renderSuivi();
  if (view !== 'jouer') { g1Stop(); g2Stop(); } else if (!$('#g2').hidden) g2Intro(); else if (!G1.running && !G1.done) g1Intro();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('.tab').forEach((t) => t.addEventListener('click', () => show(t.dataset.view)));
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });

/* ---------- S'entraîner ---------- */
function debutEntrainement() {
  if (!EXOS.length) { $('#exercise').innerHTML = '<p>Aucun exercice n\'est encore disponible pour cette notion. Ton professeur doit importer la banque d\'exercices.</p>'; return; }
  if (EXOS.length === 1) return startSession(EXOS[0]);
  $('#exercise').innerHTML = `<div class="qnum">Choisis un exercice</div><div class="choices" style="margin-top:12px">${EXOS.map((x, i) => `<button class="choice" data-exo="${i}"><span class="l">${x.numero}</span><span>${esc(x.enonce.replace('{}', '…'))}</span></button>`).join('')}</div>`;
}
function startSession(exo) {
  try { S = { exo, seq: tirerSerie(exo), i: 0, res: [], phase: 'q1', err: 0 }; }
  catch (e) { $('#exercise').innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  renderQ();
}
const scoreNow = () => S.res.reduce((a, r) => a + r.pts, 0);
const maxPts = () => S.seq.reduce((a, q) => a + (q.pourquoi.length ? 2 : 1), 0);
function stepsHTML() {
  return `<div class="steps" aria-hidden="true">${S.seq.map((q, k) => { const r = S.res[k]; let c = ''; if (r) c = r.pts === r.max ? 'ok' : r.pts > 0 ? 'half' : 'ko'; else if (k === S.i) c = 'cur'; return `<i class="${c}"></i>`; }).join('')}</div>`;
}
function renderQ() {
  const q = S.seq[S.i];
  let h = '';
  if (S.banner) { h += `<div class="reveal" role="status"><p>Deux erreurs : l'onglet <b>Comprendre</b> est maintenant ouvert pour t'aider.</p><button class="btn sm ghost" data-go="comprendre">Aller voir</button></div>`; S.banner = false; }
  h += `<div class="ex-top">${stepsHTML()}<span class="score">Score ${scoreNow()} / ${maxPts()}</span></div>
    <div class="qnum">Question ${S.i + 1} sur ${S.seq.length}</div>
    <div class="statement">${esc(S.exo.enonce).replace('{}', `<span class="num">${q.html}</span>`)} ?</div>`;
  if (S.phase === 'q1') {
    h += '<div class="answers"><button class="btn" data-a="oui">Oui</button><button class="btn ghost" data-a="non">Non</button></div>';
  } else {
    const r = S.cur;
    h += `<div class="answers"><button class="btn" disabled style="${r.a1 === 'oui' ? '' : 'opacity:.35'}">Oui</button><button class="btn ghost" disabled style="${r.a1 === 'non' ? '' : 'opacity:.35'}">Non</button></div>`;
    if (!r.ok1) h += feedback(false, `La bonne réponse était « ${q.correct} ».`, q);
    else if (!q.pourquoi.length) h += feedback(true, null, q);
    else {
      h += '<div class="why-title">Bien. Mais pourquoi ?</div><div class="choices">' + S.order.map((idx, k) => {
        let cls = '';
        if (S.phase === 'done') cls = idx === q.juste ? 'good' : idx === r.pick ? 'bad' : 'dim';
        return `<button class="choice ${cls}" data-p="${idx}" ${S.phase === 'done' ? 'disabled' : ''}><span class="l">${LET[k]})</span><span>${q.pourquoi[idx]}</span></button>`;
      }).join('') + '</div>';
      if (S.phase === 'done') h += feedback(r.pick === q.juste, null, q);
    }
    if (S.phase === 'done') h += `<div class="next"><button class="btn" id="nextBtn">${S.i === S.seq.length - 1 ? 'Voir mon résultat' : 'Question suivante →'}</button></div>`;
  }
  h += `<details class="signal"><summary>Signaler un problème sur cette question</summary><form id="sigForm"><textarea id="sigMsg" placeholder="Qu'est-ce qui ne va pas ? (énoncé, réponse, explication…)" aria-label="Description du problème"></textarea><div><button class="btn sm ghost" type="submit">Envoyer</button></div></form></details>`;
  $('#exercise').innerHTML = h;
  const nb = $('#nextBtn'); if (nb) nb.focus({ preventScroll: true });
}
function feedback(ok, extra, q) {
  return `<div class="feedback" role="status"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? 'Correct' : 'Incorrect'}</div>${extra ? `<p>${esc(extra)}</p>` : ''}${q.texte ? `<div class="lab">Corrigé</div><p>${q.texte}</p>` : ''}</div>`;
}
$('#exercise').addEventListener('click', (e) => {
  const ex = e.target.closest('[data-exo]'); if (ex) return startSession(EXOS[+ex.dataset.exo]);
  if (!S) return;
  const a = e.target.closest('[data-a]'), p = e.target.closest('[data-p]');
  const q = S.seq[S.i];
  if (a && S.phase === 'q1') {
    const ok1 = a.dataset.a === q.correct;
    S.cur = { a1: a.dataset.a, ok1, max: q.pourquoi.length ? 2 : 1 };
    S.order = shuffle(q.pourquoi.map((_, k) => k));
    if (!ok1) { S.cur.pts = 0; S.phase = 'done'; }
    else if (!q.pourquoi.length) { S.cur.pts = 1; S.phase = 'done'; }
    else S.phase = 'q2';
    renderQ();
  } else if (p && S.phase === 'q2') {
    S.cur.pick = +p.dataset.p; S.cur.pts = 1 + (S.cur.pick === q.juste ? 1 : 0); S.phase = 'done'; renderQ();
  } else if (e.target.id === 'nextBtn') {
    S.res.push({ pts: S.cur.pts, max: S.cur.max, variante: q.variante, libelle: q.libelle, texte: q.text, html: q.html });
    if (S.cur.pts < S.cur.max) {
      S.err++;
      if (S.err >= 2 && VIS.auto && !VIS.comprendre && !REVEALED.comprendre) { REVEALED.comprendre = true; applyVis(); S.banner = true; }
    }
    if (S.i < S.seq.length - 1) { S.i++; S.phase = 'q1'; renderQ(); } else finish();
  } else if (e.target.id === 'againBtn') startSession(S.exo);
});
$('#exercise').addEventListener('submit', async (e) => {
  if (e.target.id !== 'sigForm') return;
  e.preventDefault();
  const q = S && S.seq[S.i];
  try {
    await api('/api/eleve/signalements', { method: 'POST', body: { notion: N.id, question: q ? `${q.libelle} : ${q.text}` : '', message: $('#sigMsg').value } });
    $('.signal').open = false; $('#sigMsg').value = ''; toast('Merci, ton signalement a été envoyé.');
  } catch (err) { toast(err.message); }
});
async function finish() {
  const tot = scoreNow(), max = maxPts(), pct = tot / max;
  const msg = pct >= 0.85 ? 'La notion est acquise : tu sais répondre et justifier.' : pct >= 0.5 ? "C'est en bonne voie. Relis les corrigés, puis refais une série."
    : isVisible('comprendre') ? 'Repasse par « Comprendre » et teste quelques exemples avant de recommencer.' : 'Relis bien chaque corrigé, puis refais une série. Ton professeur peut aussi t\'ouvrir la partie « Comprendre ».';
  $('#exercise').innerHTML = `<div class="ex-top">${stepsHTML()}</div><div class="qnum">Série terminée</div>
    <div class="final">${tot}<small> / ${max} points</small></div><p style="max-width:60ch">${msg}</p>
    <div class="recap">${S.res.map((r) => `<div><span class="dot ${r.pts === r.max ? 'ok' : r.pts ? 'half' : 'ko'}"></span><span>${esc(S.exo.enonce).replace('{}', `<span class="m">${r.html}</span>`)}</span><span class="pt">${r.pts} / ${r.max}</span></div>`).join('')}</div>
    <p style="font-size:.85rem;color:var(--ink-soft);margin-top:-6px">1 point pour le oui/non, 1 point pour le bon « pourquoi ».</p>
    <p class="save" style="font-size:.85rem;color:var(--ink-soft)">Enregistrement…</p>
    <div class="answers"><button class="btn" id="againBtn">Nouvelle série</button><button class="btn ghost" data-go="suivi">Voir mon suivi</button></div>`;
  try {
    await api('/api/eleve/series', { method: 'POST', body: { notion: N.id, exercice: S.exo.numero, score: tot, max, details: S.res.map(({ html, ...r }) => r) } });
    $('.save').textContent = 'Résultat enregistré.';
    const m = ME.meilleurs.find((x) => x.notion === N.id);
    if (m) { m.meilleur = Math.max(m.meilleur, pct); m.nb++; } else ME.meilleurs.push({ notion: N.id, meilleur: pct, nb: 1 });
  } catch (e) { $('.save').textContent = "Le résultat n'a pas pu être enregistré : " + e.message; }
}

/* ---------- Mon suivi ---------- */
async function renderSuivi() {
  const el = $('#suivi'); el.innerHTML = '<div class="card loading">Chargement…</div>';
  let H = [];
  try { H = await api('/api/eleve/series?notion=' + encodeURIComponent(N.id)); } catch (e) { el.innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  if (!H.length) { el.innerHTML = `<div class="card empty"><span class="m">${N.symbole}</span><h3>Pas encore de série terminée</h3><p style="max-width:44ch;margin:0 auto 16px">Chaque série s'enregistre ici avec ton score, et ce que tu maîtrises question par question.</p><button class="btn" data-go="entrainer">Commencer une série</button></div>`; return; }
  const stats = {};
  H.forEach((h) => h.details.forEach((r) => { const s = (stats[r.variante] ||= { lib: r.libelle || r.variante, p: 0, m: 0 }); s.p += r.pts; s.m += r.max || 2; }));
  el.innerHTML = `<div class="card"><h3>Séries terminées</h3><div class="hist">${H.slice(0, 15).map((h) => `<div class="hrow"><span>${dateFr(h.created_at)}</span><span class="bar"><i style="width:${(h.score / h.max) * 100}%"></i></span><span class="pt">${h.score}/${h.max}</span></div>`).join('')}</div></div>
    <div class="card"><h3>Réussite par type de question</h3><div class="vstats">${Object.values(stats).map((s) => { const pc = Math.round((s.p / s.m) * 100); return `<div class="hrow"><span>${esc(s.lib)}</span><span class="bar"><i style="width:${pc}%;${pc < 50 ? 'background:var(--ko)' : ''}"></i></span><span class="pt">${pc} %</span></div>`; }).join('')}</div></div>`;
}

/* ---------- Jouer ---------- */
function record(jeu) { const r = ME.records.find((x) => x.notion === N.id && x.jeu === jeu); return r ? r.record : 0; }
function renderBest() { $('#best-g1').textContent = record('attrape') ? `Record : ${record('attrape')} points` : 'Pas encore de record'; $('#best-g2').textContent = record('intrus') ? `Record : ${record('intrus')} points` : 'Pas encore de record'; }
async function saveScore(jeu, score) {
  const ancien = record(jeu), nouveau = score > ancien;
  if (nouveau) { const r = ME.records.find((x) => x.notion === N.id && x.jeu === jeu); if (r) r.record = score; else ME.records.push({ notion: N.id, jeu, record: score }); }
  renderBest();
  api('/api/eleve/jeux', { method: 'POST', body: { notion: N.id, jeu, score } }).catch(() => toast("Le score n'a pas pu être enregistré."));
  return nouveau;
}
$('.games').addEventListener('click', (e) => {
  const b = e.target.closest('.game-pick'); if (!b) return;
  $$('.game-pick').forEach((x) => x.classList.toggle('sel', x === b));
  g1Stop(); g2Stop();
  $('#g1').hidden = b.dataset.game !== 'g1'; $('#g2').hidden = b.dataset.game !== 'g2';
  if (b.dataset.game === 'g1') g1Intro(); else g2Intro();
});
const uniq = (arr) => arr.filter((x, i, a) => a.findIndex((y) => y.s === x.s) === i);

const G1 = { running: false, done: false };
function g1Hud() { const l = Math.max(0, G1.lives ?? 3); $('#g1score').textContent = G1.score || 0; $('#g1lives').textContent = '♥'.repeat(l) + '♡'.repeat(3 - l); $('#g1time').textContent = (G1.left ?? 30) + ' s'; }
function g1Intro() { G1.done = false; G1.score = 0; G1.lives = 3; G1.left = 30; g1Hud(); $('#g1msg').textContent = ''; $('#arena').innerHTML = `<div class="arena-msg"><div class="prompt">${N.jeu.consigne1}</div><p style="margin:0;color:var(--ink-soft);max-width:44ch">${N.jeu.piege1}</p><button class="btn" id="g1go">Commencer</button></div>`; }
function g1Stop() { clearInterval(G1.spawn); clearInterval(G1.timer); G1.running = false; }
function g1Start() {
  g1Stop(); Object.assign(G1, { score: 0, lives: 3, left: 30, errors: [], missed: [], running: true, done: false });
  $('#arena').innerHTML = ''; $('#g1msg').textContent = ''; g1Hud();
  G1.spawn = setInterval(g1Spawn, 800);
  G1.timer = setInterval(() => { G1.left--; g1Hud(); if (G1.left <= 0) g1End(); }, 1000);
  g1Spawn();
}
function g1Spawn() {
  const arena = $('#arena'); if ($$('.bub:not(.gone)', arena).length >= 6) return;
  const it = N.jeu.gen(), b = document.createElement('button');
  b.className = 'bub'; b.innerHTML = it.html; b.setAttribute('aria-label', it.label);
  if (it.label.length > 6) { b.style.width = '130px'; b.style.fontSize = '1.05rem'; }
  b.style.left = `calc((100% - ${it.label.length > 6 ? 132 : 92}px) * ${Math.random().toFixed(3)})`; b.style.top = `calc((100% - 62px) * ${Math.random().toFixed(3)})`;
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
async function g1End() {
  if (!G1.running) return; g1Stop(); G1.done = true;
  const err = uniq(G1.errors).slice(0, 4), miss = uniq(G1.missed.filter((x) => x.trap)).slice(0, 3);
  const lesson = err.map((x) => `<div>✗ <span class="m">${x.html}</span> : ${x.why}</div>`).join('') + miss.map((x) => `<div>Tu as laissé passer <span class="m">${x.html}</span>, ${N.jeu.laisse}. ${x.why}</div>`).join('');
  $('#arena').innerHTML = `<div class="arena-msg"><div class="qnum">${G1.lives <= 0 ? 'Plus de vies' : 'Temps écoulé'}</div><div class="big">${G1.score} points</div><div style="color:var(--ink-soft)" class="g1rec">Les pièges attrapés valent 2 points.</div><button class="btn" id="g1go">Rejouer</button></div>`;
  $('#g1msg').innerHTML = lesson ? `<div class="lesson">${lesson}</div>` : '';
  const nouveau = await saveScore('attrape', G1.score);
  $('.g1rec').textContent = (nouveau ? 'Nouveau record ! ' : `Record : ${record('attrape')} · `) + 'Les pièges attrapés valent 2 points.';
}
$('#g1').addEventListener('click', (e) => { if (e.target.id === 'g1go') g1Start(); });

const G2 = {};
function g2Stop() { clearInterval(G2.tick); }
function g2Intro() { g2Stop(); $('#g2').innerHTML = `<div class="qnum">Trouve l'intrus</div><p class="prompt">Parmi 4 nombres, un seul n'est pas de la même famille que les autres.</p><p style="color:var(--ink-soft);max-width:56ch">Lis bien la consigne de chaque manche : elle change. 10 secondes par manche.</p><button class="btn" id="g2go">Commencer</button>`; }
function g2Start() { Object.assign(G2, { round: 0, score: 0, total: 8, log: [] }); g2Round(); }
function g2Round() {
  g2Stop();
  const lookFor = Math.random() < 0.5 ? 'non' : 'oui', other = lookFor === 'oui' ? 'non' : 'oui';
  const items = [N.jeu.gen(lookFor)], seen = new Set([items[0].s]);
  let trap = true, n = 0;
  while (items.length < 4 && n++ < 60) { const it = N.jeu.gen(other, trap); if (seen.has(it.s)) continue; seen.add(it.s); items.push(it); trap = Math.random() < 0.3; }
  G2.cur = { items, order: shuffle([0, 1, 2, 3].slice(0, items.length)), lookFor, left: 10, answered: false };
  g2Render();
  G2.tick = setInterval(() => { G2.cur.left = Math.max(0, G2.cur.left - 0.1); const bar = $('#g2bar'); if (bar) bar.style.width = G2.cur.left * 10 + '%'; if (G2.cur.left <= 0) g2Answer(-1); }, 100);
}
function g2Render() {
  const c = G2.cur;
  let h = `<div class="ex-top"><span class="qnum">Manche ${G2.round + 1} sur ${G2.total}</span><span class="score">Score ${G2.score}</span></div>
    <p class="prompt">${c.lookFor === 'non' ? N.jeu.consigneNon : N.jeu.consigneOui}</p><div class="timebar"><i id="g2bar" style="width:${c.left * 10}%"></i></div>
    <div class="intrus">${c.order.map((i) => { let cls = ''; if (c.answered) { if (i === 0) cls = 'good'; else if (i === c.pick) cls = 'bad'; } return `<button class="icard ${cls}" data-i="${i}" ${c.answered ? 'disabled' : ''} aria-label="${esc(c.items[i].label)}" style="${c.items[i].label.length > 6 ? 'font-size:1.15rem' : ''}">${c.items[i].html}</button>`; }).join('')}</div>`;
  if (c.answered) {
    const ok = c.pick === 0, intr = c.items[0];
    h += `<div class="feedback"><div class="hand ${ok ? 'ok' : 'ko'}">${ok ? `Bien vu, +${c.pts}` : c.pick === -1 ? 'Temps écoulé' : 'Raté'}</div><p>L'intrus était <span class="m">${intr.html}</span>. ${intr.why}</p>${!ok && c.pick > 0 ? `<p><span class="m">${c.items[c.pick].html}</span> : ${c.items[c.pick].why}</p>` : ''}</div>
      <div class="next"><button class="btn" id="g2next">${G2.round + 1 < G2.total ? 'Manche suivante →' : 'Voir mon score'}</button></div>`;
  }
  $('#g2').innerHTML = h;
  const nb = $('#g2next'); if (nb) nb.focus({ preventScroll: true });
}
function g2Answer(i) { const c = G2.cur; if (c.answered) return; g2Stop(); c.answered = true; c.pick = i; c.pts = i === 0 ? 1 + Math.ceil(c.left) : 0; G2.score += c.pts; G2.log.push({ ok: i === 0, html: c.items[0].html }); g2Render(); }
async function g2End() {
  const good = G2.log.filter((x) => x.ok).length;
  $('#g2').innerHTML = `<div class="qnum">Partie terminée</div><div class="final">${G2.score}<small> points</small></div><p class="g2rec">${good} intrus trouvés sur ${G2.total}.</p>
    <div class="recap">${G2.log.map((x) => `<div><span class="dot ${x.ok ? 'ok' : 'ko'}"></span><span>Intrus : <span class="m">${x.html}</span></span><span></span></div>`).join('')}</div><button class="btn" id="g2go">Rejouer</button>`;
  const nouveau = await saveScore('intrus', G2.score);
  $('.g2rec').textContent = `${good} intrus trouvés sur ${G2.total}. ` + (nouveau ? 'Nouveau record !' : `Record : ${record('intrus')} points.`);
}
$('#g2').addEventListener('click', (e) => {
  const card = e.target.closest('.icard');
  if (e.target.id === 'g2go') g2Start();
  else if (card && G2.cur && !G2.cur.answered) g2Answer(+card.dataset.i);
  else if (e.target.id === 'g2next') { G2.round++; if (G2.round < G2.total) g2Round(); else g2End(); }
});

demarrer();
