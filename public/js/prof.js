// Espace enseignant (administrateur unique)
import { $, $$, esc, api, toast, dateFr } from './outils.js';
import { lireBanque } from './banque.js';
import { tirerQuestion } from './moteur.js';
import naturels from './notions/entiers-naturels.js';
import scientifique from './notions/ecriture-scientifique.js';

const CATALOGUE = { [naturels.id]: naturels, [scientifique.id]: scientifique };
const NIVEAUX = ['6e', '5e', '4e', '3e', '2nde', '1re', 'Tle'];
let CLASSES = [], VUE = 'classes', IMPORT = null;
const pc = (x) => (x == null ? '—' : Math.round(x * 100) + ' %');
const pill = (x) => (x == null ? '<span class="pill">—</span>' : `<span class="pill ${x >= 0.85 ? 'ok' : x >= 0.5 ? 'mid' : 'ko'}">${pc(x)}</span>`);

async function demarrer() {
  try { await api('/api/prof/moi'); } catch (e) { $('#loading').hidden = true; if (e.status === 401) { $('#login').hidden = false; $('#lgPass').focus(); } else $('#loading').textContent = e.message; return; }
  $('#loading').hidden = true; $('#login').hidden = true; $('#app').hidden = false; $('#who').hidden = false;
  await chargerClasses();
  aller(location.hash.slice(1) || 'classes');
}
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault(); $('#lgErr').textContent = '';
  try { await api('/api/prof/login', { method: 'POST', body: { motDePasse: $('#lgPass').value } }); await demarrer(); } catch (err) { $('#lgErr').textContent = err.message; }
});
$('#logout').addEventListener('click', async () => { await api('/api/logout', { method: 'POST' }).catch(() => {}); location.reload(); });

async function chargerClasses() { CLASSES = await api('/api/prof/classes'); renderNav(); }
function renderNav() {
  $('#nav').innerHTML = `<button data-vue="classes">Mes classes</button>
    ${CLASSES.length ? '<div class="sep">Classes</div>' : ''}${CLASSES.map((c) => `<button data-vue="classe-${c.id}"><span>${esc(c.nom)}</span><span class="pill">${esc(c.niveau)}</span></button>`).join('')}
    <div class="sep">Contenu</div><button data-vue="banque">Banque d'exercices</button><button data-vue="signalements">Signalements</button>`;
  $$('#nav button').forEach((b) => b.setAttribute('aria-current', b.dataset.vue === VUE));
}
$('#nav').addEventListener('click', (e) => { const b = e.target.closest('[data-vue]'); if (b) aller(b.dataset.vue); });
function aller(vue) {
  VUE = vue; $('#main').onclick = null; history.replaceState(null, '', '#' + vue); renderNav();
  const m = vue.match(/^classe-(\d+)$/);
  if (m) return vueClasse(+m[1]);
  if (vue === 'banque') return vueBanque();
  if (vue === 'signalements') return vueSignalements();
  vueClasses();
}
// Confirmation en deux clics (les boîtes de dialogue sont évitées)
function confirmer(btn, texte) { if (btn.dataset.armed) return true; btn.dataset.armed = 1; const t = btn.textContent; btn.textContent = texte; setTimeout(() => { delete btn.dataset.armed; btn.textContent = t; }, 3000); return false; }

/* ---------- Classes ---------- */
function vueClasses() {
  $('#main').innerHTML = `
    <div class="head"><div class="eyebrow">Administration</div><h1>Mes classes</h1><p>Crée une classe, puis donne son code aux élèves. Ils se connectent sur la page d'accueil avec ce code, un pseudo et un code secret à 4 chiffres.</p></div>
    <form class="card inline-form" id="newClasse">
      <div class="field"><label for="ncNom">Nom de la classe</label><input id="ncNom" required maxlength="60" placeholder="ex. 4e B"></div>
      <div class="field" style="flex:0 1 140px"><label for="ncNiv">Niveau</label><select id="ncNiv">${NIVEAUX.map((n) => `<option ${n === '4e' ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <button class="btn" type="submit">Créer la classe</button>
    </form>
    <div class="kpis">${CLASSES.map((c) => `<button class="kpi" data-vue="classe-${c.id}" style="text-align:left;cursor:pointer;display:grid;gap:4px">
      <span class="k">${esc(c.niveau)}</span><span class="v" style="font-size:1.2rem">${esc(c.nom)}</span><span class="code" style="font-size:1.1rem">${esc(c.code)}</span>
      <span style="color:var(--ink-soft);font-size:.85rem">${c.nb_eleves} élève${c.nb_eleves > 1 ? 's' : ''} · ${c.nb_series} série${c.nb_series > 1 ? 's' : ''}</span></button>`).join('') || '<div class="card empty">Aucune classe pour l\'instant.</div>'}</div>`;
  $('#main .kpis').addEventListener('click', (e) => { const b = e.target.closest('[data-vue]'); if (b) aller(b.dataset.vue); });
  $('#newClasse').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { const c = await api('/api/prof/classes', { method: 'POST', body: { nom: $('#ncNom').value, niveau: $('#ncNiv').value } }); await chargerClasses(); toast(`Classe créée. Code : ${c.code}`); aller('classe-' + c.id); } catch (err) { toast(err.message); }
  });
}

async function vueClasse(id) {
  $('#main').innerHTML = '<div class="loading">Chargement…</div>';
  let d; try { d = await api('/api/prof/classes/' + id); } catch (e) { $('#main').innerHTML = `<div class="card">${esc(e.message)}</div>`; return; }
  const c = d.classe, r = c.reglages;
  const records = {}; d.jeux.forEach((j) => ((records[j.eleve_id] ||= {})[j.jeu] = j.record));
  const nbSeries = d.eleves.reduce((a, e) => a + e.nb_series, 0);
  const moy = d.eleves.filter((e) => e.moyenne != null);
  const moyenne = moy.length ? moy.reduce((a, e) => a + e.moyenne, 0) / moy.length : null;
  $('#main').innerHTML = `
    <div class="head"><div class="eyebrow">Classe · ${esc(c.niveau)}</div><h1>${esc(c.nom)}</h1><p>Code à donner aux élèves : <span class="code">${esc(c.code)}</span></p></div>
    <div class="kpis"><div class="kpi"><div class="k">Élèves</div><div class="v">${d.eleves.length}</div></div><div class="kpi"><div class="k">Séries terminées</div><div class="v">${nbSeries}</div></div><div class="kpi"><div class="k">Réussite moyenne</div><div class="v">${pc(moyenne)}</div></div></div>
    <div class="card"><h3>Élèves</h3>${d.eleves.length ? `<div class="tbl-wrap"><table><tr><th>Pseudo</th><th>Séries</th><th>Meilleur</th><th>Moyenne</th><th>Jeux (records)</th><th>Dernière activité</th><th></th></tr>
      ${d.eleves.map((e) => `<tr><td><b>${esc(e.pseudo)}</b>${e.a_pin ? '' : ' <span class="pill mid">code à choisir</span>'}</td><td>${e.nb_series}</td><td>${pill(e.meilleur)}</td><td><span class="meter"><i style="width:${(e.moyenne || 0) * 100}%"></i></span>${pc(e.moyenne)}</td>
      <td style="font-size:.85rem">Attrape : ${records[e.id]?.attrape ?? '—'} · Intrus : ${records[e.id]?.intrus ?? '—'}</td><td style="font-size:.85rem">${dateFr(e.derniere_activite)}</td>
      <td><div class="actions"><button class="btn sm ghost" data-pin="${e.id}">Réinitialiser le code</button><button class="btn sm danger" data-del="${e.id}">Supprimer</button></div></td></tr>`).join('')}</table></div>`
      : `<p style="color:var(--ink-soft);margin:0">Aucun élève connecté pour l'instant. Donne-leur le code <b>${esc(c.code)}</b> et l'adresse de la page d'accueil.</p>`}</div>
    ${d.parVariante.length ? `<div class="card"><h3>Réussite par type de question</h3><div class="tbl-wrap"><table><tr><th>Notion</th><th>Question</th><th>Réussite</th></tr>${d.parVariante.sort((a, b) => a.points / a.max - b.points / b.max).map((v) => `<tr><td>${esc(CATALOGUE[v.notion]?.titreCourt || v.notion)}</td><td>${esc(v.libelle)}</td><td><span class="meter"><i style="width:${(v.points / v.max) * 100}%"></i></span>${pc(v.points / v.max)}</td></tr>`).join('')}</table></div></div>` : ''}
    <div class="card"><h3>Ce que voient les élèves</h3>
      <div class="vis" id="vis">
        <label class="vrow"><input type="checkbox" data-k="comprendre" ${r.onglets.comprendre ? 'checked' : ''}><span><b>Comprendre</b><small>Définition, testeur, exemples et pièges</small></span></label>
        <label class="vrow sub" style="${r.onglets.comprendre ? 'opacity:.5' : ''}"><input type="checkbox" data-k="auto" ${r.auto ? 'checked' : ''} ${r.onglets.comprendre ? 'disabled' : ''}><span><b>Dévoiler « Comprendre » après 2 erreurs</b><small>Si l'onglet est masqué, il s'ouvre pour l'élève dès qu'il se trompe deux fois dans une série.</small></span></label>
        <label class="vrow"><input type="checkbox" data-k="jouer" ${r.onglets.jouer ? 'checked' : ''}><span><b>Jouer</b><small>Attrape-les, Trouve l'intrus</small></span></label>
        <label class="vrow"><input type="checkbox" data-k="plusloin" ${r.onglets.plusloin ? 'checked' : ''}><span><b>Aller plus loin</b><small>Contexte, usages, et ce qui vient ensuite</small></span></label>
      </div>
      <h3 style="margin-top:18px">Notions ouvertes</h3>
      <div class="vis" id="notions">${Object.values(CATALOGUE).map((n) => `<label class="vrow"><input type="checkbox" data-n="${n.id}" ${r.notions.includes(n.id) ? 'checked' : ''}><span><b>${n.titreCourt}</b><small>${n.niveau} · ${n.sousTheme}</small></span></label>`).join('')}</div>
    </div>
    <div><button class="btn danger" id="delClasse">Supprimer la classe et ses résultats</button></div>`;

  const sauver = async (reglages) => { try { await api('/api/prof/classes/' + id, { method: 'PATCH', body: { reglages } }); toast('Réglage enregistré.'); const cl = CLASSES.find((x) => x.id === id); if (cl) cl.reglages = { ...cl.reglages, ...reglages }; } catch (e) { toast(e.message); } };
  $('#vis').addEventListener('change', async (e) => {
    const k = e.target.dataset.k; if (!k) return;
    if (k === 'auto') r.auto = e.target.checked; else r.onglets[k] = e.target.checked;
    const sub = $('#vis .sub'), auto = $('#vis [data-k="auto"]'); auto.disabled = r.onglets.comprendre; sub.style.opacity = r.onglets.comprendre ? 0.5 : 1;
    await sauver({ onglets: r.onglets, auto: r.auto });
  });
  $('#notions').addEventListener('change', async () => {
    const n = $$('#notions input:checked').map((i) => i.dataset.n);
    if (!n.length) { toast('Garde au moins une notion ouverte.'); aller(VUE); return; }
    r.notions = n; await sauver({ notions: n });
  });
  $('#main').onclick = async (e) => {
    const pin = e.target.closest('[data-pin]'), del = e.target.closest('[data-del]');
    if (pin && confirmer(pin, 'Confirmer ?')) { await api(`/api/prof/eleves/${pin.dataset.pin}/pin`, { method: 'DELETE' }); toast("Code réinitialisé : l'élève en choisira un nouveau à sa prochaine connexion."); vueClasse(id); }
    if (del && confirmer(del, 'Confirmer ?')) { await api(`/api/prof/eleves/${del.dataset.del}`, { method: 'DELETE' }); toast('Élève supprimé.'); vueClasse(id); }
    if (e.target.id === 'delClasse' && confirmer(e.target, 'Cliquer encore pour confirmer')) { await api('/api/prof/classes/' + id, { method: 'DELETE' }); await chargerClasses(); toast('Classe supprimée.'); aller('classes'); }
  };
}

/* ---------- Banque d'exercices ---------- */
async function vueBanque() {
  $('#main').innerHTML = '<div class="loading">Chargement…</div>';
  let banque = []; try { banque = await api('/api/prof/banque'); } catch (e) { toast(e.message); }
  $('#main').innerHTML = `
    <div class="head"><div class="eyebrow">Contenu</div><h1>Banque d'exercices</h1><p>Les exercices viennent de ton fichier Excel. Une ligne = une variante de question. Importer un fichier remplace les exercices des notions qu'il contient.</p></div>
    <div class="card"><h3>Importer un fichier Excel</h3>
      <div class="drop"><input type="file" id="xl" accept=".xlsx,.xlsb,.xls" aria-label="Fichier Excel"><p style="margin:8px 0 0;font-size:.85rem">Formats acceptés : .xlsx, .xlsb, .xls. La première feuille est lue.</p></div>
      <div id="apercu"></div></div>
    ${banque.length ? banque.map(tableExercice).join('') : '<div class="card empty">La banque est vide. Importe ton fichier Excel ci-dessus.</div>'}`;
  $('#xl').addEventListener('change', lireFichier);
}
function tableExercice(ex) {
  const n = CATALOGUE[ex.notion];
  return `<div class="card"><div class="eyebrow">${esc(n ? n.titreCourt : ex.notion)} · ${esc(ex.niveau)} · exercice n°${ex.numero}${ex.updated_at ? ' · mis à jour ' + dateFr(ex.updated_at) : ''}</div>
    <h3 style="margin-top:4px">« ${esc(ex.enonce)} »</h3>
    <div class="tbl-wrap"><table><tr><th>Ligne</th><th>Variable</th><th>Exemple tiré</th><th>Occ.</th><th>Corrigé</th><th>Pourquoi (bonne réponse en vert)</th></tr>
    ${ex.variantes.map((v) => { let exemple = '—'; try { exemple = tirerQuestion(v).html; } catch (e) { exemple = `<span class="pill ko">${esc(e.message)}</span>`; }
      return `<tr><td>${v.ligne}</td><td>${esc(v.variable)}<br><small style="color:var(--ink-soft);font-family:var(--f-mono)">${esc(v.generateur)}</small></td><td class="m">${exemple}</td><td>${v.occ}</td><td>${v.corrige}</td>
      <td>${v.pourquoi.length ? `<ol>${v.pourquoi.map((t, k) => `<li class="${k === v.juste ? 'right' : ''}">${esc(t)}</li>`).join('')}</ol>` : '<small style="color:var(--ink-soft)">Pas de « Pourquoi ? » : oui/non seulement</small>'}</td></tr>`; }).join('')}
    </table></div></div>`;
}
async function lireFichier(e) {
  const f = e.target.files[0]; if (!f) return;
  const out = $('#apercu');
  try {
    const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    IMPORT = lireBanque(rows);
    const inconnues = IMPORT.exercices.filter((x) => !CATALOGUE[x.notion]).map((x) => x.notion);
    out.innerHTML = `<div class="verdict ${IMPORT.avertissements.length ? '' : 'yes'}" style="margin-top:14px"><div class="v">${IMPORT.exercices.length} exercice(s) trouvé(s) dans « ${esc(f.name)} »</div>
      ${IMPORT.exercices.map((x) => `${esc(CATALOGUE[x.notion]?.titreCourt || x.notion)} n°${x.numero} : ${x.variantes.length} variantes, ${x.variantes.reduce((a, v) => a + v.occ, 0)} questions par série`).join('<br>')}
      ${inconnues.length ? `<p class="err">Notion inconnue de la plateforme : ${esc(inconnues.join(', '))}. Ces exercices seront enregistrés mais pas affichés.</p>` : ''}
      ${IMPORT.avertissements.length ? `<p style="margin:10px 0 4px;font-weight:600">À vérifier :</p><ul style="margin:0;padding-left:20px">${IMPORT.avertissements.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}</div>
      <div class="actions" style="margin-top:12px"><button class="btn" id="saveImport">Enregistrer dans la plateforme</button><button class="btn ghost" id="cancelImport">Annuler</button></div>
      ${IMPORT.exercices.map(tableExercice).join('')}`;
    $('#saveImport').addEventListener('click', async () => {
      try { const r = await api('/api/prof/banque', { method: 'PUT', body: { exercices: IMPORT.exercices } }); toast(`${r.nb} exercice(s) enregistré(s).`); IMPORT = null; vueBanque(); } catch (err) { toast(err.message); }
    });
    $('#cancelImport').addEventListener('click', () => { IMPORT = null; vueBanque(); });
  } catch (err) { out.innerHTML = `<p class="err" style="margin-top:12px">${esc(err.message)}</p>`; }
}

/* ---------- Signalements ---------- */
async function vueSignalements() {
  $('#main').innerHTML = '<div class="loading">Chargement…</div>';
  let s = []; try { s = await api('/api/prof/signalements'); } catch (e) { toast(e.message); }
  $('#main').innerHTML = `<div class="head"><div class="eyebrow">Retours des testeurs</div><h1>Signalements</h1><p>Les élèves peuvent signaler un problème sur chaque question.</p></div>
    ${s.length ? `<div class="tbl-wrap"><table><tr><th>Date</th><th>Élève</th><th>Question</th><th>Message</th><th></th></tr>${s.map((x) => `<tr style="${x.traite ? 'opacity:.55' : ''}"><td style="font-size:.85rem">${dateFr(x.created_at)}</td><td>${esc(x.pseudo || '—')}<br><small>${esc(x.classe || '')}</small></td><td style="font-size:.85rem">${esc(CATALOGUE[x.notion]?.titreCourt || x.notion || '')}<br>${esc(x.question)}</td><td>${esc(x.message)}</td><td><button class="btn sm ghost" data-sig="${x.id}" data-t="${x.traite ? 0 : 1}">${x.traite ? 'Rouvrir' : 'Traité'}</button></td></tr>`).join('')}</table></div>` : '<div class="card empty">Aucun signalement pour l\'instant.</div>'}`;
  $('#main').onclick = async (e) => { const b = e.target.closest('[data-sig]'); if (!b) return; await api('/api/prof/signalements/' + b.dataset.sig, { method: 'PATCH', body: { traite: b.dataset.t === '1' } }); vueSignalements(); };
}

demarrer();
