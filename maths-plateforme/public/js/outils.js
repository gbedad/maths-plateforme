// Petits outils partagés (élève, enseignant, notions)
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const isInt = (v) => Math.abs(v - Math.round(v)) < 1e-9;
export const NNBSP = ' ';
export const fmt = (n) => { const s = Math.abs(n).toLocaleString('fr-FR', { maximumFractionDigits: 6 }).replace(/[  ]/g, NNBSP); return (n < 0 ? '−' : '') + s; };
export const fracHTML = (a, b) => `<span class="frac"><span>${fmt(a)}</span><span>${fmt(b)}</span></span>`;

/* Nombres décimaux exacts : valeur = D × 10^e, D chaîne de chiffres */
export function norm(D, e) { D = String(D).replace(/^0+/, ''); if (!D) return { D: '0', e: 0 }; while (D.length > 1 && D.endsWith('0')) { D = D.slice(0, -1); e++; } return { D, e }; }
export function decStr(D, e) {
  D = String(D).replace(/^0+/, '') || '0';
  let ip, fp = '';
  if (e >= 0) ip = D + '0'.repeat(e);
  else { const s = D.padStart(-e + 1, '0'); ip = s.slice(0, s.length + e); fp = s.slice(s.length + e).replace(/0+$/, ''); }
  ip = ip.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  return ip + (fp ? ',' + fp : '');
}
export function sciParts(D, e) { const n = norm(D, e); return { a: n.D[0] + (n.D.length > 1 ? ',' + n.D.slice(1) : ''), n: n.e + n.D.length - 1 }; }
export const expo = (n) => (n < 0 ? '−' + -n : String(n));
export const puiss = (a, b, n) => `<span class="sci">${a}${NNBSP}×${NNBSP}${b}<sup>${expo(n)}</sup></span>`;
export const puissTxt = (a, b, n) => `${a} × ${b}^${expo(n)}`;

/* Appels au serveur */
export async function api(chemin, options = {}) {
  const opts = { method: options.method || 'GET', headers: {}, credentials: 'same-origin' };
  if (options.body !== undefined) { opts.headers['content-type'] = 'application/json'; opts.body = JSON.stringify(options.body); }
  let res;
  try { res = await fetch(chemin, opts); } catch { throw new Error('Pas de connexion au serveur. Vérifie ta connexion internet.'); }
  let data = null; try { data = await res.json(); } catch {}
  if (!res.ok) { const e = new Error((data && data.erreur) || `Erreur ${res.status}`); e.status = res.status; throw e; }
  return data;
}
let toastTimer;
export function toast(msg) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 3500);
}
export const dateFr = (s) => { if (!s) return '—'; const d = new Date(s.replace(' ', 'T') + (s.endsWith('Z') ? '' : 'Z')); return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };

/* HTML produit par la plateforme → texte brut (exposants en caractères Unicode), pour l'enregistrer */
const SUPS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '−': '⁻', '-': '⁻', n: 'ⁿ' };
export function htmlToTxt(html) {
  return String(html ?? '')
    .replace(/<sup>(.*?)<\/sup>/g, (_, x) => [...x].map((c) => SUPS[c] ?? c).join(''))
    .replace(/<span class="frac"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, '$1/$2')
    .replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
}
