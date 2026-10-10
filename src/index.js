// Maths par l'exemple : serveur (Cloudflare Worker + D1)
// Les pages (public/) sont servies par Cloudflare ; ce Worker ne répond qu'aux routes /api/*.

const NOTIONS_PAR_NIVEAU = { '4e': ['ecriture-scientifique'], '2nde': ['entiers-naturels'] };
const REGLAGES_DEFAUT = (niveau) => ({
  onglets: { comprendre: true, jouer: true, plusloin: true },
  auto: true,
  notions: NOTIONS_PAR_NIVEAU[niveau] || ['entiers-naturels'],
});
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
  if (p === '/api/logout' && m === 'POST') return json({ ok: true }, 200, { 'set-cookie': cookie('', 0, url) });
  if (p.startsWith('/api/prof/')) {
    await exigerSession(req, env, 'prof');
    if (p === '/api/prof/moi' && m === 'GET') return json({ role: 'prof' });
    if (p === '/api/prof/classes' && m === 'GET') return listerClasses(env);
    if (p === '/api/prof/classes' && m === 'POST') return creerClasse(req, env);
    if ((r = p.match(/^\/api\/prof\/classes\/(\d+)$/))) {
      if (m === 'GET') return detailClasse(env, +r[1]);
      if (m === 'PATCH') return modifierClasse(req, env, +r[1]);
      if (m === 'DELETE') return supprimer(env, 'classes', +r[1]);
    }
    if ((r = p.match(/^\/api\/prof\/eleves\/(\d+)\/pin$/)) && m === 'DELETE') return reinitPin(env, +r[1]);
    if ((r = p.match(/^\/api\/prof\/eleves\/(\d+)$/)) && m === 'DELETE') return supprimer(env, 'eleves', +r[1]);
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
    if (p === '/api/eleve/series' && m === 'GET') return eleveSeries(env, s.id, url.searchParams.get('notion'));
    if (p === '/api/eleve/series' && m === 'POST') return enregistrerSerie(req, env, s.id);
    if (p === '/api/eleve/jeux' && m === 'POST') return enregistrerJeu(req, env, s.id);
    if (p === '/api/eleve/signalements' && m === 'POST') return signaler(req, env, s.id);
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
function cookie(valeur, maxAge, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `mpe_session=${valeur}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
async function exigerSession(req, env, role) {
  const c = (req.headers.get('cookie') || '').match(/(?:^|;\s*)mpe_session=([^;]+)/);
  const s = c && (await verifier(env, c[1]));
  if (!s || s.role !== role) throw new HttpError(401, 'Connexion nécessaire.');
  return s;
}
async function ouvrirSession(env, url, payload) {
  const jeton = await signer(env, { ...payload, exp: Date.now() + SESSION_JOURS * 864e5 });
  return cookie(jeton, SESSION_JOURS * 86400, url);
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
  return { ...d, ...r, onglets: { ...d.onglets, ...(r.onglets || {}) } };
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
  const c = await env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
  if (!c) throw new HttpError(404, 'Classe introuvable.');
  const { results: eleves } = await env.DB.prepare(`
    SELECT e.id, e.pseudo, e.created_at, e.derniere_activite, (e.pin_hash IS NOT NULL) AS a_pin,
      COUNT(s.id) AS nb_series, MAX(CAST(s.score AS REAL) / s.max) AS meilleur, AVG(CAST(s.score AS REAL) / s.max) AS moyenne
    FROM eleves e LEFT JOIN series s ON s.eleve_id = e.id
    WHERE e.classe_id = ? GROUP BY e.id ORDER BY e.pseudo COLLATE NOCASE`).bind(id).all();
  const { results: series } = await env.DB.prepare(`
    SELECT s.eleve_id, s.notion, s.details FROM series s JOIN eleves e ON e.id = s.eleve_id WHERE e.classe_id = ?`).bind(id).all();
  // Réussite par variante (toute la classe et par élève)
  const parVariante = {}, parEleve = {};
  for (const s of series) {
    let d = []; try { d = JSON.parse(s.details); } catch {}
    for (const q of d) {
      const k = `${s.notion}|${q.variante}`;
      const a = (parVariante[k] ||= { notion: s.notion, variante: q.variante, libelle: q.libelle || q.variante, points: 0, max: 0 });
      a.points += q.pts; a.max += 2;
      const b = ((parEleve[s.eleve_id] ||= {})[k] ||= { points: 0, max: 0 });
      b.points += q.pts; b.max += 2;
    }
  }
  const { results: jeux } = await env.DB.prepare(`
    SELECT j.eleve_id, j.jeu, MAX(j.score) AS record, COUNT(*) AS parties FROM jeux j JOIN eleves e ON e.id = j.eleve_id
    WHERE e.classe_id = ? GROUP BY j.eleve_id, j.jeu`).bind(id).all();
  return json({ classe: { ...c, reglages: lireReglages(c) }, eleves, parVariante: Object.values(parVariante), parEleve, jeux });
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
  const { exercices } = await body(req);
  if (!Array.isArray(exercices) || !exercices.length) throw new HttpError(400, 'Le fichier ne contient aucun exercice.');
  const notions = [...new Set(exercices.map((e) => e.notion))];
  const stmts = notions.map((n) => env.DB.prepare('DELETE FROM exercices WHERE notion = ?').bind(n));
  for (const e of exercices) {
    if (!e.notion || !e.numero || !Array.isArray(e.variantes) || !e.variantes.length) throw new HttpError(400, `Exercice incomplet (${e.notion || '?'} n°${e.numero || '?'}).`);
    stmts.push(env.DB.prepare('INSERT INTO exercices (notion, numero, donnees) VALUES (?, ?, ?)').bind(e.notion, e.numero, JSON.stringify(e)));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, notions, nb: exercices.length });
}

async function listerSignalements(env) {
  const { results } = await env.DB.prepare(`
    SELECT s.*, e.pseudo, c.nom AS classe FROM signalements s
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
  let eleve = await env.DB.prepare('SELECT * FROM eleves WHERE classe_id = ? AND pseudo = ? COLLATE NOCASE').bind(classe.id, pseudo).first();
  let nouveau = false;
  if (!eleve || !eleve.pin_hash) {
    const sel = aleatoire(16, 'abcdefghijklmnopqrstuvwxyz0123456789');
    const hash = await sha256(sel + pin);
    if (eleve) await env.DB.prepare('UPDATE eleves SET pin_sel = ?, pin_hash = ? WHERE id = ?').bind(sel, hash, eleve.id).run();
    else eleve = await env.DB.prepare('INSERT INTO eleves (classe_id, pseudo, pin_sel, pin_hash) VALUES (?, ?, ?, ?) RETURNING *').bind(classe.id, pseudo, sel, hash).first();
    nouveau = true;
  } else if (!egal(await sha256(eleve.pin_sel + pin), eleve.pin_hash)) {
    throw new HttpError(401, "Ce pseudo existe déjà avec un autre code secret. Si c'est bien toi, demande à ton professeur de réinitialiser ton code.");
  }
  return json({ ok: true, nouveau }, 200, { 'set-cookie': await ouvrirSession(env, url, { role: 'eleve', id: eleve.id }) });
}

async function eleveMoi(env, id) {
  const e = await env.DB.prepare('SELECT e.id, e.pseudo, c.id AS classe_id, c.nom AS classe, c.niveau, c.reglages FROM eleves e JOIN classes c ON c.id = e.classe_id WHERE e.id = ?').bind(id).first();
  if (!e) throw new HttpError(401, 'Connexion nécessaire.');
  await env.DB.prepare("UPDATE eleves SET derniere_activite = datetime('now') WHERE id = ?").bind(id).run();
  const reglages = lireReglages(e);
  const ph = reglages.notions.map(() => '?').join(',') || "''";
  const { results: ex } = await env.DB.prepare(`SELECT donnees FROM exercices WHERE notion IN (${ph}) ORDER BY notion, numero`).bind(...reglages.notions).all();
  const { results: records } = await env.DB.prepare('SELECT notion, jeu, MAX(score) AS record FROM jeux WHERE eleve_id = ? GROUP BY notion, jeu').bind(id).all();
  const { results: meilleurs } = await env.DB.prepare('SELECT notion, MAX(CAST(score AS REAL) / max) AS meilleur, COUNT(*) AS nb FROM series WHERE eleve_id = ? GROUP BY notion').bind(id).all();
  return json({
    eleve: { id: e.id, pseudo: e.pseudo },
    classe: { id: e.classe_id, nom: e.classe, niveau: e.niveau, reglages },
    exercices: ex.map((r) => JSON.parse(r.donnees)),
    records, meilleurs,
  });
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
  if (!b.notion || !['attrape', 'intrus'].includes(b.jeu) || !(+b.score >= 0)) throw new HttpError(400, 'Score invalide.');
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
