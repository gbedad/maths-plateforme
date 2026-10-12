// Maths par l'exemple : serveur (Cloudflare Worker + D1)
// Les pages (public/) sont servies par Cloudflare ; ce Worker ne répond qu'aux routes /api/*.

const NOTIONS_PAR_NIVEAU = { '6e': ['table-2', 'table-3', 'table-4', 'table-5', 'table-6', 'table-7', 'table-8', 'table-9', 'tables-multiplication'], '4e': ['ecriture-scientifique'], '2nde': ['entiers-naturels'] };
const ETAPES = ['explorer', 'comprendre', 'ensavoirplus', 'jouer', 'entrainer', 'retenir', 'plusloin'];
const REGLAGES_DEFAUT = (niveau) => ({
  etapes: Object.fromEntries(ETAPES.map((e) => [e, true])),
  auto: true,
  objectif: 50,
  notions: NOTIONS_PAR_NIVEAU[niveau] || ['entiers-naturels'],
});
// Badges de piège : générateur de la variante → nom du badge
const BADGES_PIEGE = { 'valeur(0)': { nom: 'Démineur du zéro', desc: 'Maîtriser la question « 0 est-il un entier naturel ? »' }, 'sci_dix()': { nom: 'Démineur du dix', desc: 'Maîtriser le piège 10 × 10ⁿ' }, 'tm_zero()': { nom: 'Zéro partout', desc: 'Maîtriser « 0 est dans toutes les tables »' }, 'mul_inverse()': { nom: 'Œil de lynx', desc: 'Maîtriser le piège des chiffres inversés' } };
const SESSION_JOURS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      return await route(request, env, url);
    } catch (e) {
      if (e instanceof HttpError) return json({ erreur: e.message }, e.status);
      console.error(e);
      return json({ erreur: 'Erreur du serveur. Réessaie dans un instant.' }, 500);
    }
  },
};

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
async function body(request) { try { return await request.json(); } catch { throw new HttpError(400, 'Requête invalide.'); } }

/* ---------- Routeur ---------- */
async function route(req, env, url) {
  const p = url.pathname, m = req.method;
  let r;

  // Enseignant
  if (p === '/api/prof/login' && m === 'POST') return profLogin(req, env);
  if (p === '/api/logout' && m === 'POST') return deconnecter(req, url);
  if (p.startsWith('/api/prof/')) {
    await exigerSession(req, env, 'prof');
    if (p === '/api/prof/moi' && m === 'GET') return json({ role: 'prof' });
    if (p === '/api/prof/classes' && m === 'GET') return listerClasses(env);
    if (p === '/api/prof/presence' && m === 'GET') return presenceClasses(env, url.searchParams.get('classe'));
    if (p === '/api/prof/classes' && m === 'POST') return creerClasse(req, env);
    if ((r = p.match(/^\/api\/prof\/classes\/(\d+)$/))) {
      if (m === 'GET') return detailClasse(env, +r[1]);
      if (m === 'PATCH') return modifierClasse(req, env, +r[1]);
      if (m === 'DELETE') return supprimer(env, 'classes', +r[1]);
    }
    if ((r = p.match(/^\/api\/prof\/eleves\/(\d+)\/pin$/)) && m === 'DELETE') return reinitPin(env, +r[1]);
    if ((r = p.match(/^\/api\/prof\/eleves\/(\d+)\/fiche$/)) && m === 'GET') return json(await compilerFiche(env, +r[1], url.searchParams.get('notion')));
    if ((r = p.match(/^\/api\/prof\/eleves\/(\d+)$/)) && m === 'DELETE') return supprimer(env, 'eleves', +r[1]);
    if ((r = p.match(/^\/api\/prof\/eleves\/(\d+)$/)) && m === 'PATCH') return modifierEleve(req, env, +r[1]);
    if (p === '/api/prof/banque' && m === 'GET') return lireBanque(env);
    if (p === '/api/prof/banque' && m === 'PUT') return ecrireBanque(req, env);
    if (p === '/api/prof/signalements' && m === 'GET') return listerSignalements(env);
    if ((r = p.match(/^\/api\/prof\/signalements\/(\d+)$/)) && m === 'PATCH') return traiterSignalement(req, env, +r[1]);
  }

  // Élève
  if (p === '/api/eleve/login' && m === 'POST') return eleveLogin(req, env, url);
  if (p.startsWith('/api/eleve/')) {
    const s = await exigerSession(req, env, 'eleve');
    if (p === '/api/eleve/moi' && m === 'GET') return eleveMoi(env, s.id);
    if (p === '/api/eleve/presence' && m === 'POST') return signalerPresence(req, env, s.id);
    if (p === '/api/eleve/nom' && m === 'POST') return enregistrerNom(req, env, s.id);
    // Toute action de l'élève (réponse, progression, jeu…) le garde « en ligne », même sans signal de présence
    if (m === 'POST') await env.DB.prepare("UPDATE eleves SET derniere_activite = datetime('now') WHERE id = ? AND (derniere_activite IS NULL OR derniere_activite < datetime('now', '-20 seconds'))").bind(s.id).run();
    if (p === '/api/eleve/series' && m === 'GET') return eleveSeries(env, s.id, url.searchParams.get('notion'));
    if (p === '/api/eleve/series' && m === 'POST') return enregistrerSerie(req, env, s.id);
    if (p === '/api/eleve/jeux' && m === 'POST') return enregistrerJeu(req, env, s.id);
    if (p === '/api/eleve/signalements' && m === 'POST') return signaler(req, env, s.id);
    if (p === '/api/eleve/reponses' && m === 'POST') return enregistrerReponses(req, env, s.id);
    if (p === '/api/eleve/progression' && m === 'POST') return enregistrerProgression(req, env, s.id);
    if (p === '/api/eleve/fiche' && m === 'GET') return json(await compilerFiche(env, s.id, url.searchParams.get('notion')));
  }
  throw new HttpError(404, 'Route inconnue.');
}

/* ---------- Sessions (jeton signé HMAC dans un cookie HttpOnly) ---------- */
const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s) => b64u(enc.encode(s));
const deb64u = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
async function cle(env) {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 16) throw new HttpError(500, 'SESSION_SECRET manquant ou trop court (16 caractères minimum).');
  return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function signer(env, payload) {
  const data = b64uStr(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('HMAC', await cle(env), enc.encode(data));
  return `${data}.${b64u(sig)}`;
}
async function verifier(env, jeton) {
  const [data, sig] = (jeton || '').split('.');
  if (!data || !sig) return null;
  const attendu = await crypto.subtle.sign('HMAC', await cle(env), enc.encode(data));
  if (!egal(b64u(attendu), sig)) return null;
  const p = JSON.parse(deb64u(data));
  return p.exp > Date.now() ? p : null;
}
function egal(a, b) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
// Un cookie par rôle (mpe_prof, mpe_eleve) : se connecter comme élève dans le même navigateur
// ne déconnecte plus l'enseignant, et inversement. L'ancien cookie commun (mpe_session) reste accepté.
function cookie(valeur, maxAge, url, nom = 'mpe_session') {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${nom}=${valeur}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
const lireCookie = (req, nom) => ((req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${nom}=([^;]+)`)) || [])[1];
async function exigerSession(req, env, role) {
  for (const nom of [`mpe_${role}`, 'mpe_session']) {
    const v = lireCookie(req, nom);
    const s = v && (await verifier(env, v).catch(() => null));
    if (s && s.role === role) return s;
  }
  throw new HttpError(401, 'Connexion nécessaire.');
}
async function ouvrirSession(env, url, payload) {
  const jeton = await signer(env, { ...payload, exp: Date.now() + SESSION_JOURS * 864e5 });
  return cookie(jeton, SESSION_JOURS * 86400, url, `mpe_${payload.role}`);
}
async function deconnecter(req, url) {
  const b = await req.json().catch(() => ({}));
  const roles = ['prof', 'eleve'].includes(b.role) ? [b.role] : ['prof', 'eleve'];
  const h = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  for (const r of roles) h.append('set-cookie', cookie('', 0, url, `mpe_${r}`));
  h.append('set-cookie', cookie('', 0, url)); // ancien cookie commun
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h });
}
async function sha256(s) { return b64u(await crypto.subtle.digest('SHA-256', enc.encode(s))); }
const aleatoire = (n, alphabet) => { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map((x) => alphabet[x % alphabet.length]).join(''); };

/* ---------- Enseignant ---------- */
async function profLogin(req, env) {
  const { motDePasse } = await body(req);
  if (!env.ADMIN_PASSWORD) throw new HttpError(500, "ADMIN_PASSWORD n'est pas configuré sur le serveur.");
  await new Promise((r) => setTimeout(r, 300)); // ralentit les essais en série
  if (!motDePasse || !egal(await sha256(motDePasse), await sha256(env.ADMIN_PASSWORD))) throw new HttpError(401, 'Mot de passe incorrect.');
  const url = new URL(req.url);
  return json({ ok: true }, 200, { 'set-cookie': await ouvrirSession(env, url, { role: 'prof' }) });
}

function lireReglages(classe) {
  let r = {}; try { r = JSON.parse(classe.reglages || '{}'); } catch {}
  const d = REGLAGES_DEFAUT(classe.niveau);
  const anciens = r.onglets || {}; // anciens réglages (3 onglets) repris dans les étapes
  const etapes = { ...d.etapes, ...anciens, ...(r.etapes || {}) };
  delete r.onglets;
  etapes.entrainer = true; // S'entraîner ne se masque pas
  return { ...d, ...r, etapes };
}

/* ---------- Présence : élèves en ligne ----------
   La page de l'élève donne signe de vie toutes les minutes (notion et étape en cours).
   « En ligne » = signe de vie depuis moins de 2 minutes. La colonne « activite » est créée au besoin. */
const EN_LIGNE = "datetime('now', '-2 minutes')";
let colonnesOk = false;
async function assurerColonneActivite(env) {
  if (colonnesOk) return;
  for (const c of ['activite', 'nom']) { try { await env.DB.prepare(`ALTER TABLE eleves ADD COLUMN ${c} TEXT`).run(); } catch { /* elle existe déjà */ } }
  colonnesOk = true;
}
// Nom affiché à l'enseignant : « Prénom I. » (prénom + initiale du nom, rien de plus)
function formerNom(prenom, initiale) {
  const p = String(prenom || '').trim().replace(/\s+/g, ' ').replace(/[<>]/g, '');
  const i = String(initiale || '').trim().replace(/[^\p{L}]/gu, '').slice(0, 1).toUpperCase();
  if (p.length < 2 || p.length > 30) throw new HttpError(400, 'Écris ton prénom (2 à 30 lettres).');
  if (!i) throw new HttpError(400, "Écris l'initiale de ton nom (une lettre).");
  const P = p.split(/([ -])/).map((x) => (x.length > 1 ? x[0].toUpperCase() + x.slice(1).toLowerCase() : x)).join('');
  return `${P} ${i}.`;
}
async function enregistrerNom(req, env, id) {
  const b = await body(req); await assurerColonneActivite(env);
  const nom = formerNom(b.prenom, b.initiale);
  await env.DB.prepare('UPDATE eleves SET nom = ? WHERE id = ?').bind(nom, id).run();
  return json({ ok: true, nom });
}
async function modifierEleve(req, env, id) {
  const b = await body(req); await assurerColonneActivite(env);
  const nom = formerNom(b.prenom, b.initiale);
  await env.DB.prepare('UPDATE eleves SET nom = ? WHERE id = ?').bind(nom, id).run();
  return json({ ok: true, nom });
}
async function signalerPresence(req, env, id) {
  const b = await body(req);
  await assurerColonneActivite(env);
  const activite = `${txt(b.notion, 40)}|${txt(b.etape, 30)}${b.cache ? '|cache' : ''}`;
  await env.DB.prepare("UPDATE eleves SET derniere_activite = datetime('now'), activite = ? WHERE id = ?").bind(activite, id).run();
  return json({ ok: true });
}
async function presenceClasses(env, classe) {
  await assurerColonneActivite(env);
  if (classe) {
    const { results } = await env.DB.prepare(`SELECT id, derniere_activite, activite, (derniere_activite >= ${EN_LIGNE}) AS en_ligne FROM eleves WHERE classe_id = ?`).bind(+classe).all();
    return json(results);
  }
  const { results } = await env.DB.prepare(`SELECT classe_id, COUNT(*) AS n FROM eleves WHERE derniere_activite >= ${EN_LIGNE} GROUP BY classe_id`).all();
  return json(Object.fromEntries(results.map((r) => [r.classe_id, r.n])));
}

async function listerClasses(env) {
  const { results } = await env.DB.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM eleves e WHERE e.classe_id = c.id) AS nb_eleves,
      (SELECT COUNT(*) FROM series s JOIN eleves e ON e.id = s.eleve_id WHERE e.classe_id = c.id) AS nb_series
    FROM classes c ORDER BY c.created_at`).all();
  return json(results.map((c) => ({ ...c, reglages: lireReglages(c) })));
}

async function creerClasse(req, env) {
  const { nom, niveau } = await body(req);
  if (!nom || !String(nom).trim()) throw new HttpError(400, 'Donne un nom à la classe.');
  if (!niveau) throw new HttpError(400, 'Choisis un niveau.');
  for (let essai = 0; essai < 5; essai++) {
    const code = aleatoire(6, 'ABCDEFGHJKMNPQRSTUVWXYZ23456789');
    try {
      const row = await env.DB.prepare('INSERT INTO classes (nom, niveau, code, reglages) VALUES (?, ?, ?, ?) RETURNING *')
        .bind(String(nom).trim().slice(0, 60), niveau, code, JSON.stringify(REGLAGES_DEFAUT(niveau))).first();
      return json({ ...row, reglages: lireReglages(row) }, 201);
    } catch (e) { if (!String(e).includes('UNIQUE')) throw e; }
  }
  throw new HttpError(500, 'Impossible de générer un code de classe.');
}

async function detailClasse(env, id) {
  await assurerColonneActivite(env);
  const c = await env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!c) throw new HttpError(404, 'Classe introuvable.');
  const reglages = lireReglages(c);
  const [el, rep, prog, jx] = await Promise.all([
    env.DB.prepare("SELECT e.id, e.pseudo, e.nom, e.created_at, e.derniere_activite, (e.pin_hash IS NOT NULL) AS a_pin FROM eleves e WHERE e.classe_id = ? ORDER BY (e.nom IS NULL), e.nom COLLATE NOCASE, e.pseudo COLLATE NOCASE").bind(id).all(),
    env.DB.prepare(`SELECT r.eleve_id, r.notion, r.source, r.variante, r.libelle, r.ok1, r.ok2, r.created_at FROM reponses r JOIN eleves e ON e.id = r.eleve_id
      WHERE e.classe_id = ? AND r.source IN ('entrainer','retenir') ORDER BY r.created_at, r.id`).bind(id).all(),
    env.DB.prepare('SELECT p.eleve_id, p.notion, p.etape, p.fait, p.etoiles FROM progression p JOIN eleves e ON e.id = p.eleve_id WHERE e.classe_id = ?').bind(id).all(),
    env.DB.prepare('SELECT j.eleve_id, COUNT(*) AS parties FROM jeux j JOIN eleves e ON e.id = j.eleve_id WHERE e.classe_id = ? GROUP BY j.eleve_id').bind(id).all(),
  ]);
  const groupes = {}, libelles = {};
  for (const r of rep.results) { (groupes[r.eleve_id + '|' + r.notion] ||= []).push(r); libelles[r.notion + '|' + r.variante] = r.libelle; }
  const grille = {};
  let ancrees = 0;
  for (const [k, g] of Object.entries(groupes)) {
    const [eid, notion] = k.split('|'), m = calculerMaitrise(g);
    ((grille[eid] ||= {})[notion] = Object.fromEntries(Object.entries(m).map(([v, x]) => [v, x.niveau])));
    ancrees += Object.values(m).filter((x) => x.niveau >= 4).length;
  }
  const etapes = {};
  for (const p of prog.results) ((etapes[p.eleve_id] ||= {})[p.notion] ||= {})[p.etape] = { fait: p.fait, etoiles: p.etoiles };
  const parties = Object.fromEntries(jx.results.map((j) => [j.eleve_id, j.parties]));
  return json({ classe: { ...c, reglages }, eleves: el.results, grille, etapes, parties, libelles, objectif: { cible: Math.max(1, +reglages.objectif || 50), atteint: ancrees } });
}

async function modifierClasse(req, env, id) {
  const c = await env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!c) throw new HttpError(404, 'Classe introuvable.');
  const b = await body(req);
  const reglages = b.reglages ? { ...lireReglages(c), ...b.reglages } : lireReglages(c);
  const nom = b.nom ? String(b.nom).trim().slice(0, 60) : c.nom;
  await env.DB.prepare('UPDATE classes SET nom = ?, reglages = ? WHERE id = ?').bind(nom, JSON.stringify(reglages), id).run();
  return json({ ok: true, reglages });
}

async function supprimer(env, table, id) {
  await env.DB.prepare(`DELETE FROM ${table === 'classes' ? 'classes' : 'eleves'} WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

async function reinitPin(env, id) {
  await env.DB.prepare('UPDATE eleves SET pin_sel = NULL, pin_hash = NULL WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

async function lireBanque(env) {
  const { results } = await env.DB.prepare('SELECT notion, numero, donnees, updated_at FROM exercices ORDER BY notion, numero').all();
  return json(results.map((r) => ({ ...JSON.parse(r.donnees), updated_at: r.updated_at })));
}

async function ecrireBanque(req, env) {
  const { exercices, config } = await body(req);
  const aConfig = config && typeof config === 'object' && Object.keys(config).length;
  if (!Array.isArray(exercices) || (!exercices.length && !aConfig)) throw new HttpError(400, 'Le fichier ne contient aucun exercice.');
  const notions = [...new Set(exercices.map((e) => e.notion))];
  const stmts = notions.map((n) => env.DB.prepare('DELETE FROM exercices WHERE notion = ?').bind(n));
  for (const e of exercices) {
    if (!e.notion || !e.numero || !Array.isArray(e.variantes) || !e.variantes.length) throw new HttpError(400, `Exercice incomplet (${e.notion || '?'} n°${e.numero || '?'}).`);
    stmts.push(env.DB.prepare('INSERT INTO exercices (notion, numero, donnees) VALUES (?, ?, ?)').bind(e.notion, e.numero, JSON.stringify(e)));
  }
  for (const [notion, c] of Object.entries(config && typeof config === 'object' ? config : {})) {
    // Réglages fusionnés avec ceux déjà enregistrés (seuil d'Explorer, questions des tables…)
    if (JSON.stringify(c).length > 60000) throw new HttpError(400, `Réglages trop volumineux pour la notion ${notion}.`);
    stmts.push(env.DB.prepare("INSERT INTO notions_config (notion, donnees, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(notion) DO UPDATE SET donnees = json_patch(notions_config.donnees, excluded.donnees), updated_at = excluded.updated_at")
      .bind(String(notion).slice(0, 40), JSON.stringify(c)));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, notions, nb: exercices.length });
}

async function listerSignalements(env) {
  await assurerColonneActivite(env);
  const { results } = await env.DB.prepare(`
    SELECT s.*, e.pseudo, e.nom AS nom_eleve, c.nom AS classe FROM signalements s
    LEFT JOIN eleves e ON e.id = s.eleve_id LEFT JOIN classes c ON c.id = e.classe_id
    ORDER BY s.traite, s.created_at DESC LIMIT 200`).all();
  return json(results);
}
async function traiterSignalement(req, env, id) {
  const { traite } = await body(req);
  await env.DB.prepare('UPDATE signalements SET traite = ? WHERE id = ?').bind(traite ? 1 : 0, id).run();
  return json({ ok: true });
}

/* ---------- Élève ---------- */
async function eleveLogin(req, env, url) {
  const b = await body(req);
  const code = String(b.code || '').trim().toUpperCase();
  const pseudo = String(b.pseudo || '').trim().replace(/\s+/g, ' ');
  const pin = String(b.pin || '').trim();
  if (!code) throw new HttpError(400, 'Écris le code de ta classe.');
  if (pseudo.length < 2 || pseudo.length > 24) throw new HttpError(400, 'Ton pseudo doit faire entre 2 et 24 caractères.');
  if (!/^\d{4}$/.test(pin)) throw new HttpError(400, 'Ton code secret doit faire 4 chiffres.');
  await new Promise((r) => setTimeout(r, 200));
  const classe = await env.DB.prepare('SELECT * FROM classes WHERE code = ?').bind(code).first();
  if (!classe) throw new HttpError(404, "Ce code de classe n'existe pas. Vérifie-le avec ton professeur.");
  await assurerColonneActivite(env);
  let eleve = await env.DB.prepare('SELECT * FROM eleves WHERE classe_id = ? AND pseudo = ? COLLATE NOCASE').bind(classe.id, pseudo).first();
  let nouveau = false;
  // Nouveau compte : prénom et initiale du nom obligatoires (l'enseignant les voit, pas les autres élèves)
  let nom = null;
  if (!eleve) {
    if (b.prenom === undefined && b.initiale === undefined) return json({ besoinNom: true, erreur: 'Nouveau compte : écris ton prénom et l’initiale de ton nom.' }, 409);
    nom = formerNom(b.prenom, b.initiale);
  }
  if (!eleve || !eleve.pin_hash) {
    const sel = aleatoire(16, 'abcdefghijklmnopqrstuvwxyz0123456789');
    const hash = await sha256(sel + pin);
    if (eleve) await env.DB.prepare('UPDATE eleves SET pin_sel = ?, pin_hash = ? WHERE id = ?').bind(sel, hash, eleve.id).run();
    else eleve = await env.DB.prepare('INSERT INTO eleves (classe_id, pseudo, pin_sel, pin_hash, nom) VALUES (?, ?, ?, ?, ?) RETURNING *').bind(classe.id, pseudo, sel, hash, nom).first();
    nouveau = true;
  } else if (!egal(await sha256(eleve.pin_sel + pin), eleve.pin_hash)) {
    throw new HttpError(401, "Ce pseudo existe déjà avec un autre code secret. Si c'est bien toi, demande à ton professeur de réinitialiser ton code.");
  }
  return json({ ok: true, nouveau }, 200, { 'set-cookie': await ouvrirSession(env, url, { role: 'eleve', id: eleve.id }) });
}

async function eleveMoi(env, id) {
  await assurerColonneActivite(env);
  const e = await env.DB.prepare('SELECT e.id, e.pseudo, e.nom, c.id AS classe_id, c.nom AS classe, c.niveau, c.reglages FROM eleves e JOIN classes c ON c.id = e.classe_id WHERE e.id = ?').bind(id).first();
  if (!e) throw new HttpError(401, 'Connexion nécessaire.');
  await env.DB.prepare("UPDATE eleves SET derniere_activite = datetime('now') WHERE id = ?").bind(id).run();
  const reglages = lireReglages(e);
  const ph = reglages.notions.map(() => '?').join(',') || "''";
  const [ex, prog, cfg, jeux, rep] = await Promise.all([
    env.DB.prepare(`SELECT donnees FROM exercices WHERE notion IN (${ph}) ORDER BY notion, numero`).bind(...reglages.notions).all(),
    env.DB.prepare('SELECT notion, etape, fait, etoiles, donnees, updated_at FROM progression WHERE eleve_id = ?').bind(id).all(),
    env.DB.prepare(`SELECT notion, donnees FROM notions_config WHERE notion IN (${ph})`).bind(...reglages.notions).all(),
    env.DB.prepare('SELECT notion, jeu, score, created_at FROM jeux WHERE eleve_id = ?').bind(id).all(),
    env.DB.prepare("SELECT notion, source, variante, ok1, ok2, created_at FROM reponses WHERE eleve_id = ? AND source IN ('entrainer','retenir') ORDER BY created_at, id").bind(id).all(),
  ]);
  const exercices = ex.results.map((r) => JSON.parse(r.donnees));
  const progression = prog.results.map((p) => ({ ...p, donnees: JSON.parse(p.donnees || '{}') }));
  const maitrise = {};
  // Notions ouvertes + tables de l'entraînement « Tables mélangées » (leurs calculs comptent aussi)
  const suivies = new Set([...reglages.notions, ...((reglages.melange?.tables || []).map((t) => `table-${t}`))]);
  for (const n of suivies) maitrise[n] = calculerMaitrise(rep.results.filter((r) => r.notion === n));
  return json({
    eleve: { id: e.id, pseudo: e.pseudo, nom: e.nom || null },
    classe: { id: e.classe_id, nom: e.classe, niveau: e.niveau, reglages },
    exercices, progression, maitrise,
    config: Object.fromEntries(cfg.results.map((c) => [c.notion, JSON.parse(c.donnees || '{}')])),
    badges: calculerBadges({ rep: rep.results, progression, jeux: jeux.results, maitrise, exercices }),
    semaine: joursActifs([...rep.results, ...jeux.results, ...prog.results.map((p) => ({ created_at: p.updated_at }))]),
    objectif: await objectifClasse(env, e.classe_id, reglages),
  });
}

/* ---------- Maîtrise : 0 jamais vue · 1 découverte · 2 en cours · 3 maîtrisée · 4 ancrée ---------- */
const H20 = 20 * 3600e3;
const ts = (s) => new Date(String(s).replace(' ', 'T') + 'Z').getTime();
function calculerMaitrise(rows) {
  const out = {};
  for (const r of rows) {
    const v = (out[r.variante] ||= { niveau: 1, serie: 0, maitriseeLe: null, ancree: false, justes: 0, erreurs: 0, rebond: false, dernier: null });
    const t = ts(r.created_at), plein = r.ok1 && (r.ok2 === null || r.ok2 === 1);
    if (plein) {
      v.justes++; v.serie++;
      if (v.erreurs) v.rebond = true;
      if (v.serie >= 3 && !v.maitriseeLe) v.maitriseeLe = t;
      if (r.source === 'retenir' && v.maitriseeLe && t - v.maitriseeLe >= H20) v.ancree = true;
    } else { v.erreurs++; v.serie = 0; v.maitriseeLe = null; v.ancree = false; }
    v.dernier = t;
    v.niveau = v.ancree ? 4 : v.maitriseeLe ? 3 : v.justes ? 2 : 1;
  }
  for (const v of Object.values(out)) v.revision = v.niveau < 4 ? new Date(v.dernier + H20).toISOString() : null;
  return out;
}

function joursActifs(rows) {
  const now = new Date(), jour = (now.getUTCDay() + 6) % 7; // lundi = 0
  const lundi = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - jour);
  const actifs = new Set();
  for (const r of rows) { const t = ts(r.created_at); if (t >= lundi) actifs.add(Math.floor((t - lundi) / 864e5)); }
  return [0, 1, 2, 3, 4, 5, 6].map((i) => actifs.has(i));
}

function calculerBadges({ rep, progression, jeux, maitrise, exercices }) {
  const niveaux = Object.values(maitrise).flatMap((m) => Object.values(m));
  const pourquoiJustes = rep.filter((r) => r.ok2 === 1).length;
  const fait = (etape) => progression.some((p) => p.etape === etape && p.fait);
  const jours = joursActifs([...rep, ...jeux]).filter(Boolean).length;
  const b = [
    { id: 'explorateur', nom: 'Explorateur', desc: 'Découvrir une règle dans Explorer.', got: fait('explorer') },
    { id: 'justificateur', nom: 'Justificateur', desc: 'Choisir 10 bonnes justifications.', got: pourquoiJustes >= 10, prog: `${Math.min(pourquoiJustes, 10)} sur 10` },
    { id: 'rebond', nom: 'Rebond', desc: "Réussir une question sur laquelle tu t'étais trompé.", got: niveaux.some((v) => v.rebond) },
    { id: 'joueur', nom: 'Joueur', desc: 'Terminer 3 parties.', got: jeux.length >= 3, prog: `${Math.min(jeux.length, 3)} sur 3` },
    { id: 'regulier', nom: 'Régulier', desc: 'Être actif 4 jours dans la même semaine.', got: jours >= 4, prog: `${jours} sur 4 cette semaine` },
    { id: 'ancre', nom: 'Bien ancré', desc: 'Ancrer une première compétence.', got: niveaux.some((v) => v.niveau >= 4) },
    { id: 'parcours', nom: 'Parcours complet', desc: "Aller jusqu'au bout d'Aller plus loin.", got: fait('plusloin') },
  ];
  for (const ex of exercices) for (const v of ex.variantes) {
    const p = BADGES_PIEGE[v.generateur]; if (!p) continue;
    const m = maitrise[ex.notion]?.[v.id];
    b.splice(1, 0, { id: 'piege-' + v.generateur, nom: p.nom, desc: p.desc, got: !!m && m.niveau >= 3 });
  }
  return b;
}

async function objectifClasse(env, classeId, reglages) {
  const { results } = await env.DB.prepare(`SELECT r.eleve_id, r.notion, r.source, r.variante, r.ok1, r.ok2, r.created_at FROM reponses r JOIN eleves e ON e.id = r.eleve_id
    WHERE e.classe_id = ? AND r.source IN ('entrainer','retenir') ORDER BY r.created_at, r.id`).bind(classeId).all();
  const groupes = {};
  for (const r of results) (groupes[r.eleve_id + '|' + r.notion] ||= []).push(r);
  let ancrees = 0;
  for (const g of Object.values(groupes)) ancrees += Object.values(calculerMaitrise(g)).filter((v) => v.niveau >= 4).length;
  return { cible: Math.max(1, +reglages.objectif || 50), atteint: ancrees };
}

/* ---------- Réponses et progression ---------- */
const txt = (s, n) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);
async function enregistrerReponses(req, env, id) {
  const b = await body(req);
  if (!b.notion || !['entrainer', 'retenir', 'explorer'].includes(b.source) || !Array.isArray(b.items)) throw new HttpError(400, 'Réponses invalides.');
  const stmts = b.items.slice(0, 20).map((it) => env.DB.prepare('INSERT INTO reponses (eleve_id, notion, source, variante, libelle, question, ok1, ok2, choix, juste, corrige) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, txt(b.notion, 40), b.source, txt(it.variante, 40), txt(it.libelle, 120), txt(it.question, 120), it.ok1 ? 1 : 0, it.ok2 == null ? null : it.ok2 ? 1 : 0, txt(it.choix, 300), txt(it.juste, 300), txt(it.corrige, 600)));
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true }, 201);
}

async function enregistrerProgression(req, env, id) {
  const b = await body(req);
  if (!b.notion || !ETAPES.includes(b.etape)) throw new HttpError(400, 'Étape inconnue.');
  const cur = await env.DB.prepare('SELECT * FROM progression WHERE eleve_id = ? AND notion = ? AND etape = ?').bind(id, b.notion, b.etape).first();
  let donnees = {}; try { donnees = JSON.parse(cur?.donnees || '{}'); } catch {}
  if (b.donnees && typeof b.donnees === 'object') donnees = { ...donnees, ...b.donnees };
  const s = JSON.stringify(donnees); if (s.length > 8000) throw new HttpError(400, 'Données trop volumineuses.');
  const fait = Math.max(cur?.fait || 0, b.fait ? 1 : 0), etoiles = Math.max(cur?.etoiles || 0, Math.min(3, Math.max(0, +b.etoiles || 0)));
  await env.DB.prepare(`INSERT INTO progression (eleve_id, notion, etape, fait, etoiles, donnees, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(eleve_id, notion, etape) DO UPDATE SET fait = excluded.fait, etoiles = excluded.etoiles, donnees = excluded.donnees, updated_at = excluded.updated_at`)
    .bind(id, txt(b.notion, 40), b.etape, fait, etoiles, s).run();
  return json({ ok: true, fait, etoiles, donnees });
}

/* ---------- Fiche mémo : construite à partir des traces de l'élève ---------- */
async function compilerFiche(env, eleveId, notion) {
  if (!notion) throw new HttpError(400, 'Notion manquante.');
  const [prog, rep] = await Promise.all([
    env.DB.prepare("SELECT etape, donnees FROM progression WHERE eleve_id = ? AND notion = ? AND etape IN ('explorer','comprendre')").bind(eleveId, notion).all(),
    env.DB.prepare("SELECT * FROM reponses WHERE eleve_id = ? AND notion = ? AND source IN ('entrainer','retenir') ORDER BY created_at, id").bind(eleveId, notion).all(),
  ]);
  const d = Object.fromEntries(prog.results.map((p) => [p.etape, JSON.parse(p.donnees || '{}')]));
  const m = calculerMaitrise(rep.results);
  const parV = {};
  for (const r of rep.results) (parV[r.variante] ||= []).push(r);
  const justifications = [], pieges = [], ancrer = [];
  for (const [v, rs] of Object.entries(parV)) {
    const bon = [...rs].reverse().find((r) => r.ok2 === 1);
    if (bon && bon.juste) justifications.push({ question: bon.question, juste: bon.juste });
    const faux = [...rs].reverse().find((r) => !r.ok1 || r.ok2 === 0);
    if (faux) pieges.push({ variante: v, question: faux.question, choix: faux.choix, corrige: faux.corrige, juste: faux.juste, niveau: m[v].niveau, depuis: faux.created_at, revision: m[v].revision, corrigeDepuis: m[v].serie > 0 });
    if (m[v].niveau < 4) ancrer.push({ variante: v, libelle: rs[rs.length - 1].libelle, niveau: m[v].niveau, revision: m[v].revision });
  }
  return {
    regle: d.explorer?.regle || null, regleCorrigee: d.comprendre?.regleCorrigee || null,
    exemples: d.comprendre?.exemples || [], justifications: justifications.slice(0, 8), pieges, ancrer,
  };
}

async function eleveSeries(env, id, notion) {
  const q = notion
    ? env.DB.prepare('SELECT id, notion, score, max, details, created_at FROM series WHERE eleve_id = ? AND notion = ? ORDER BY created_at DESC LIMIT 50').bind(id, notion)
    : env.DB.prepare('SELECT id, notion, score, max, details, created_at FROM series WHERE eleve_id = ? ORDER BY created_at DESC LIMIT 50').bind(id);
  const { results } = await q.all();
  return json(results.map((r) => ({ ...r, details: JSON.parse(r.details) })));
}

async function enregistrerSerie(req, env, id) {
  const b = await body(req);
  const score = Math.round(+b.score), max = Math.round(+b.max);
  if (!b.notion || !(max > 0) || !(score >= 0) || score > max) throw new HttpError(400, 'Résultat invalide.');
  const details = Array.isArray(b.details) ? b.details.slice(0, 50).map((d) => ({ variante: String(d.variante).slice(0, 40), libelle: String(d.libelle || '').slice(0, 80), texte: String(d.texte || '').slice(0, 60), pts: Math.max(0, Math.min(2, +d.pts || 0)) })) : [];
  await env.DB.prepare('INSERT INTO series (eleve_id, notion, exercice, score, max, details) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, String(b.notion).slice(0, 40), +b.exercice || 1, score, max, JSON.stringify(details)).run();
  return json({ ok: true }, 201);
}

async function enregistrerJeu(req, env, id) {
  const b = await body(req);
  if (!b.notion || !['attrape', 'intrus', 'relier', 'chrono'].includes(b.jeu) || !(+b.score >= 0)) throw new HttpError(400, 'Score invalide.');
  await env.DB.prepare('INSERT INTO jeux (eleve_id, notion, jeu, score) VALUES (?, ?, ?, ?)').bind(id, String(b.notion).slice(0, 40), b.jeu, Math.min(1000, Math.round(+b.score))).run();
  return json({ ok: true }, 201);
}

async function signaler(req, env, id) {
  const b = await body(req);
  const message = String(b.message || '').trim();
  if (message.length < 3) throw new HttpError(400, 'Décris le problème en quelques mots.');
  await env.DB.prepare('INSERT INTO signalements (eleve_id, notion, question, message) VALUES (?, ?, ?, ?)')
    .bind(id, String(b.notion || '').slice(0, 40), String(b.question || '').slice(0, 200), message.slice(0, 1000)).run();
  return json({ ok: true }, 201);
}
