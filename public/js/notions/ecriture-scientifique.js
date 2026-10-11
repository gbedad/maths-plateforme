// Notion : l'écriture scientifique a × 10ⁿ (4e)
import { $, rnd, esc, decStr, sciParts, puiss, expo, htmlToTxt } from '../outils.js';
import { GEN } from '../moteur.js';

const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
function splitDec(t) { const neg = t.startsWith('-'); t = t.replace('-', ''); const [ip, fp = ''] = t.split(/[.,]/); return { D: (ip + fp).replace(/^0+/, '') || '0', k: fp.length, neg }; }
export function parseSci(raw) {
  let s = String(raw).trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/g, (m) => '^' + [...m].map((c) => SUP[c]).join(''));
  s = s.replace(/[\s  ]/g, '').replace(/−/g, '-').replace(/\*\*/g, '^');
  let m = s.match(/^(-?\d+(?:[.,]\d+)?)[x×*·](\d+)\^\(?(-?\d+)\)?$/i);
  if (!m) { const e = s.match(/^(-?\d+(?:[.,]\d+)?)e(-?\d+)$/i); if (e) m = [null, e[1], '10', e[2]]; }
  if (m) return { forme: 'puissance', ...splitDec(m[1]), base: +m[2], n: +m[3] };
  const p = s.match(/^(\d+)\^\(?(-?\d+)\)?$/);
  if (p) return { forme: 'puissance-seule', D: '1', k: 0, neg: false, base: +p[1], n: +p[2] };
  if (/^-?\d+(?:[.,]\d+)?$/.test(s)) return { forme: 'decimal', ...splitDec(s) };
  return { err: 'Écris un nombre (45 300 ou 0,0072) ou une écriture comme 2,5 × 10^4.' };
}
const signe = (p) => (p.neg ? '−' : '');

/** Analyse une saisie : verdict, écriture correcte et étapes */
export function analyse(p) {
  if (p.D === '0') return { ok: false, titre: "0 n'a pas d'écriture scientifique", texte: 'Le nombre a doit être compris entre 1 et 10, et a × 10ⁿ ne vaut jamais 0.', etapes: [] };
  if (p.forme === 'decimal') {
    const s = sciParts(p.D, -p.k), first = p.D[0];
    const etapes = [`On repère le premier chiffre non nul : <b>${first}</b>.`, `On place la virgule juste après lui : a = <b>${s.a}</b>, qui est bien entre 1 et 10.`];
    if (s.n > 0) etapes.push(`La virgule s'est déplacée de <b>${s.n} rang${s.n > 1 ? 's' : ''} vers la gauche</b> : on a divisé par 10<sup>${s.n}</sup>, il faut donc multiplier par 10<sup>${s.n}</sup>.`);
    else if (s.n < 0) etapes.push(`La virgule s'est déplacée de <b>${-s.n} rang${-s.n > 1 ? 's' : ''} vers la droite</b> : on a multiplié par 10<sup>${-s.n}</sup>, l'exposant est donc négatif : n = ${expo(s.n)}.`);
    else etapes.push("La virgule n'a pas bougé : n = 0, car 10<sup>0</sup> = 1.");
    return { ok: null, titre: 'Écriture décimale', texte: `${signe(p)}${decStr(p.D, -p.k)} = ${signe(p)}${puiss(s.a, 10, s.n)}`, etapes };
  }
  const a = decStr(p.D, -p.k), saisie = signe(p) + puiss(a, p.base, p.n);
  if (p.base !== 10) return { ok: false, titre: "Ce n'est pas une écriture scientifique", texte: `${saisie} utilise une puissance de ${p.base}. L'écriture scientifique utilise toujours une puissance de 10.`, etapes: [] };
  const s = sciParts(p.D, p.n - p.k), juste = signe(p) + puiss(s.a, 10, s.n);
  if (p.forme === 'puissance-seule') return { ok: false, titre: 'Presque', texte: `10<sup>${expo(p.n)}</sup> est une puissance de 10. Son écriture scientifique est ${juste} : le nombre a vaut 1.`, etapes: [] };
  const avant = p.D.length - p.k; // nombre de chiffres avant la virgule
  if (avant === 1) return { ok: true, titre: "Oui, c'est une écriture scientifique", texte: `${a} est compris entre 1 et 10. Ce nombre vaut ${signe(p)}${decStr(p.D, p.n - p.k)}.`, etapes: [] };
  const raison = avant > 1 ? `${a} est supérieur ou égal à 10` : `${a} est inférieur à 1`;
  return { ok: false, titre: "Non, ce n'est pas une écriture scientifique", texte: `${raison}. Le même nombre s'écrit ${juste}.`, etapes: [] };
}

/* Jeux : écritures scientifiques (« oui ») ou non (« non ») */
const J = {
  valide: () => { const q = GEN.sci_valide(2, 9); return { ...q, ok: true, why: `${q.vars.a} est compris entre 1 et 10 : c'est une écriture scientifique.` }; },
  unite: () => { const q = GEN.sci_unite(); return { ...q, ok: true, why: `${q.vars.a} est compris entre 1 et 10, pas besoin de virgule.` }; },
  neg: () => { const q = GEN.sci_valide(-9, -2); return { ...q, ok: true, why: "L'exposant peut être négatif : c'est bien une écriture scientifique." }; },
  grand: () => { const q = GEN.sci_grand(); return { ...q, ok: false, why: `${q.vars.a} est supérieur ou égal à 10. On écrit ${q.vars.sci}.` }; },
  decimale: () => { const q = GEN.ecriture_decimale(); return { ...q, ok: false, why: `Il n'y a pas de puissance de 10. On écrit ${q.vars.sci}.` }; },
  dix: () => { const q = GEN.sci_dix(); return { ...q, ok: false, why: `10 n'est pas strictement inférieur à 10. On écrit ${q.vars.sci}.` }; },
  petit: () => { const q = GEN.sci_petit(); return { ...q, ok: false, why: `${q.vars.a} est inférieur à 1. On écrit ${q.vars.sci}.` }; },
  autre: () => { const q = GEN.autre_base(); return { ...q, ok: false, why: `Ce n'est pas une puissance de 10, mais une puissance de ${q.vars.b}.` }; },
};
function genJeu(kind, trap) {
  if (!kind) kind = Math.random() < 0.5 ? 'oui' : 'non';
  if (trap === undefined) trap = Math.random() < 0.35;
  const pool = kind === 'oui' ? (trap ? ['unite', 'neg'] : ['valide']) : (trap ? ['dix', 'petit', 'autre'] : ['grand', 'decimale']);
  const q = J[pool[rnd(0, pool.length - 1)]]();
  return { s: q.text, html: q.html, label: q.text, ok: q.ok, why: q.why, trap };
}

const EXEMPLES = [['45 300', 'Écriture décimale'], ['0,0072', 'Un petit nombre'], ['23,5 × 10^4', '23,5 ≥ 10'], ['0,8 × 10^6', '0,8 < 1'], ['10 × 10^3', "10 n'est pas < 10"], ['7 × 10^4', 'Pas besoin de virgule'], ['3,2 × 10^-5', 'Exposant négatif'], ['6,02 × 10^23', "Le nombre d'Avogadro"]];
const afficheSaisie = (s) => { const p = parseSci(s); return p.err ? esc(s) : p.forme === 'decimal' ? esc(s) : signe(p) + puiss(decStr(p.D, -p.k), p.base, p.n); };
const NOMS = { 9: 'un milliard', 6: 'un million', 3: 'mille', 2: 'cent', 1: 'dix', 0: 'un', '-1': 'un dixième', '-2': 'un centième', '-3': 'un millième', '-6': 'un millionième', '-9': 'un milliardième' };

function comprendre(root) {
  root.innerHTML = `
  <div class="sheet def">
    <div class="eyebrow">Définition</div>
    <div class="big">a × 10<sup>n</sup></div>
    <p>Un nombre est en <b>écriture scientifique</b> quand il s'écrit a × 10<sup>n</sup>, avec <b>1 ≤ a &lt; 10</b> (un seul chiffre non nul avant la virgule) et <b>n un entier relatif</b> : positif, négatif ou nul.</p>
  </div>
  <div class="card"><h3>Rappel : les puissances de 10</h3>
    <div class="scale"><input type="range" class="p-range" min="-9" max="9" value="3" aria-label="Exposant"><div class="obj"><span class="p p-pow"></span><span class="p-dec m" style="font-size:1.3rem"></span><span class="p-nom" style="color:var(--ink-soft)"></span></div></div>
    <p style="margin:8px 0 0;color:var(--ink-soft);font-size:.92rem">L'exposant indique de combien de rangs se décale la virgule : vers la droite s'il est positif, vers la gauche s'il est négatif.</p>
  </div>
  <div class="grid2">
    <div class="card tester">
      <h3>Teste une écriture</h3>
      <form class="t-form" autocomplete="off"><input class="t-in" aria-label="Nombre ou écriture à tester" value="45 300"><button class="btn" type="submit">Vérifier</button></form>
      <p style="margin:6px 0 0;font-size:.82rem;color:var(--ink-soft)">Exemples : 45 300, 0,0072, 23,5 × 10^4 ou 3,2 x 10^-5</p>
      <div class="t-out"></div>
    </div>
    <div class="card"><h3>Les pièges fréquents</h3><ul class="traps">
      <li><span class="k">${puiss('10', 10, 3)}</span><span>n'est pas une écriture scientifique : a doit être <b>strictement</b> inférieur à 10. On écrit 1 × 10<sup>4</sup>.</span></li>
      <li><span class="k">${puiss('0,8', 10, 6)}</span><span>non plus : a doit être au moins égal à 1. On écrit 8 × 10<sup>5</sup>.</span></li>
      <li><span class="k">${puiss('7', 10, 4)}</span><span>est une écriture scientifique : pas besoin de virgule.</span></li>
      <li><span class="k">${puiss('3,2', 10, -5)}</span><span>aussi : l'exposant peut être négatif, pour les petits nombres.</span></li>
      <li><span class="k">${puiss('3,2', 2, 5)}</span><span>non : il faut une puissance de 10.</span></li>
    </ul></div>
  </div>
  <div class="card"><h3>Par l'exemple</h3><p style="margin:-4px 0 14px;color:var(--ink-soft)">Clique sur une écriture pour lire l'explication.</p>
    <div class="examples">${EXEMPLES.map(([s, cap]) => { const r = analyse(parseSci(s)); return `<button class="ex" data-ex="${esc(s)}"><span class="n" style="font-size:1.2rem">${afficheSaisie(s)}</span><span class="s ${r.ok === false ? 'no' : 'yes'}">${r.ok === null ? '→ à convertir' : r.ok ? '✓ scientifique' : '✗ pas scientifique'}</span><span class="why">${esc(cap)}</span></button>`; }).join('')}</div>
  </div>`;
  const run = (raw) => {
    const p = parseSci(raw), out = $('.t-out', root);
    if (p.err) { out.innerHTML = `<div class="verdict"><div class="v">À corriger</div>${esc(p.err)}</div>`; return; }
    const r = analyse(p);
    out.innerHTML = `<div class="verdict ${r.ok === false ? 'no' : 'yes'}" role="status"><div class="v">${r.titre}</div>${r.texte}${r.etapes.length ? `<ol class="steps-list">${r.etapes.map((e) => `<li>${e}</li>`).join('')}</ol>` : ''}</div>`;

    if (root._onTest) root._onTest(raw.trim(), r.titre + ' : ' + htmlToTxt(r.texte));
  };
  const pow = () => { const n = +$('.p-range', root).value; $('.p-pow', root).innerHTML = `10<sup>${expo(n)}</sup>`; $('.p-dec', root).textContent = '= ' + decStr('1', n); $('.p-nom', root).textContent = NOMS[n] ? `(${NOMS[n]})` : ''; };
  $('.p-range', root).addEventListener('input', pow); pow();
  $('.t-form', root).addEventListener('submit', (e) => { e.preventDefault(); run($('.t-in', root).value); });
  $('.examples', root).addEventListener('click', (e) => { const b = e.target.closest('.ex'); if (!b) return; $('.t-in', root).value = b.dataset.ex; run(b.dataset.ex); $('.tester', root).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  run($('.t-in', root).value);
}

const ECHELLE = [
  ['Un atome', '1', -10, 'environ'], ['Un virus', '1', -7, 'environ'], ['Un globule rouge', '7', -6, 'environ'], ['Un grain de sable', '1', -3, 'environ'],
  ['Un élève de 4e', '1,6', 0, 'environ'], ['La tour Eiffel', '3,3', 2, ''], ["L'Everest", '8,849', 3, ''], ['Le diamètre de la Terre', '1,27', 7, ''],
  ['La distance Terre–Soleil', '1,5', 11, 'environ'], ['Une année-lumière', '9,46', 15, ''],
];
const PREFIXES = [['nano', 'n', -9], ['micro', 'µ', -6], ['milli', 'm', -3], ['kilo', 'k', 3], ['méga', 'M', 6], ['giga', 'G', 9], ['téra', 'T', 12], ['ronna', 'R', 27, true], ['quetta', 'Q', 30, true]];

function plusloin(root) {
  root.innerHTML = `
  <div class="sheet intro-pl"><div class="eyebrow">Pour la culture</div><h3 style="font-size:1.4rem;margin-top:4px">Pourquoi écrire les nombres autrement</h3>
    <p class="lead">Les sciences manipulent des nombres immenses et minuscules. Écrits en entier, ils sont illisibles et on se trompe en comptant les zéros.</p></div>
  <div class="card" data-bloc="1"><div class="block-head"><span class="q">1</span><h3>Trop de zéros</h3></div>
    <div class="tbl-wrap"><table style="min-width:560px"><tr><th>Grandeur</th><th>Écriture décimale</th><th>Écriture scientifique</th></tr>
      <tr><td>Masse de la Terre</td><td class="m">5 970 000 000 000 000 000 000 000 kg</td><td>${puiss('5,97', 10, 24)} kg</td></tr>
      <tr><td>Vitesse de la lumière</td><td class="m">299 792 458 m/s</td><td>environ ${puiss('3', 10, 8)} m/s</td></tr>
      <tr><td>Taille d'un atome</td><td class="m">environ 0,000 000 000 1 m</td><td>${puiss('1', 10, -10)} m</td></tr></table></div>
    <details class="defi" style="margin-top:12px"><summary>Défi : combien de zéros dans « un milliard de milliards » ?</summary><p>Un milliard, c'est 10<sup>9</sup>. Un milliard de milliards, c'est 10<sup>9</sup> × 10<sup>9</sup> = 10<sup>18</sup> : un 1 suivi de 18 zéros. Les exposants s'additionnent.</p></details></div>
  <div class="card" data-bloc="2"><div class="block-head"><span class="q">2</span><h3>D'où vient l'idée</h3></div>
    <ol class="tl">
      <li><span class="yr">IIIe s. av. J.-C.</span><span><b>Archimède compte les grains de sable</b>Dans <i>L'Arénaire</i>, il veut montrer qu'aucun nombre n'est trop grand pour être nommé. Les Grecs n'avaient pas de nom au-delà de la myriade (10 000). Archimède construit des nombres toujours plus grands à partir de la « myriade de myriades » (10<sup>8</sup>), et estime qu'il faudrait moins de 10<sup>63</sup> grains de sable pour remplir l'Univers tel qu'on l'imaginait alors.</span></li>
      <li><span class="yr">Aujourd'hui</span><span><b>Sur ta calculatrice</b>Quand un résultat est trop long, la calculatrice affiche par exemple <span class="m">3.7E5</span> : cela veut dire 3,7 × 10<sup>5</sup>. Le E signifie « exposant ».</span></li>
      <li><span class="yr">2022</span><span><b>De nouveaux préfixes</b>Les données du monde entier deviennent si nombreuses que de nouveaux préfixes ont été adoptés : ronna (10<sup>27</sup>) et quetta (10<sup>30</sup>).</span></li>
    </ol></div>
  <div class="card" data-bloc="3"><div class="block-head"><span class="q">3</span><h3>Du plus petit au plus grand</h3></div>
    <div class="prose"><p>Déplace le curseur : chaque cran change l'ordre de grandeur.</p></div>
    <div class="scale"><input type="range" class="e-range" min="0" max="${ECHELLE.length - 1}" value="4" aria-label="Objet"><div class="obj"><span class="p e-val"></span><span class="e-nom" style="font-weight:600"></span></div></div>
    <div class="prose" style="margin-top:14px"><p>Les préfixes des unités sont des puissances de 10 : 1 km = 10<sup>3</sup> m, 1 µm = 10<sup>−6</sup> m.</p></div>
    <div class="prefixes">${PREFIXES.map(([n, s, e, neuf]) => `<div class="${neuf ? 'new' : ''}"><b>${n} (${s})</b>10<sup>${expo(e)}</sup>${neuf ? '<br><small>adopté en 2022</small>' : ''}</div>`).join('')}</div></div>
  <div class="card" data-bloc="4"><div class="block-head"><span class="q">4</span><h3>Et ensuite : calculer avec</h3></div>
    <div class="prose"><p>Pour multiplier deux nombres en écriture scientifique, on multiplie les nombres a entre eux et on additionne les exposants. Parfois, il faut ensuite rectifier.</p></div>
    <div class="row"><input class="small-input m-a1" value="5" aria-label="Premier nombre a"><span>× 10^</span><input class="small-input m-n1" type="number" value="3" style="width:5em" aria-label="Premier exposant"><b>×</b><input class="small-input m-a2" value="4" aria-label="Second nombre a"><span>× 10^</span><input class="small-input m-n2" type="number" value="2" style="width:5em" aria-label="Second exposant"></div>
    <div class="verdict m-out" style="margin-top:12px"></div>
    <p style="margin:12px 0 0;max-width:64ch">C'est ce que tu feras en 3e : calculer directement avec les écritures scientifiques, sans repasser par l'écriture décimale.</p></div>
  <p class="sources">Repères : Archimède, <i>L'Arénaire</i> ; Bureau international des poids et mesures, nouveaux préfixes du SI (CGPM, novembre 2022). Les tailles marquées « environ » sont des ordres de grandeur.</p>`;
  const echelle = () => { const [nom, a, n, env] = ECHELLE[+$('.e-range', root).value]; $('.e-val', root).innerHTML = puiss(a, 10, n) + ' m'; $('.e-nom', root).textContent = nom + (env ? ' (environ)' : ''); };
  $('.e-range', root).addEventListener('input', echelle); echelle();
  const mult = () => {
    const out = $('.m-out', root);
    const p1 = parseSci(`${$('.m-a1', root).value}x10^${$('.m-n1', root).value}`), p2 = parseSci(`${$('.m-a2', root).value}x10^${$('.m-n2', root).value}`);
    if (p1.err || p2.err || p1.neg || p2.neg) { out.className = 'verdict m-out'; out.innerHTML = 'Écris deux nombres positifs, par exemple 5 et 4, et deux exposants entiers.'; return; }
    const D = (BigInt(p1.D) * BigInt(p2.D)).toString(), k = p1.k + p2.k, n = p1.n + p2.n;
    const a1 = decStr(p1.D, -p1.k), a2 = decStr(p2.D, -p2.k), prod = decStr(D, -k), s = sciParts(D, n - k);
    const ok = D.length - k === 1;
    out.className = 'verdict yes m-out';
    out.innerHTML = `(${a1} × ${a2}) × 10<sup>${expo(p1.n)} + ${expo(p2.n)}</sup> = ${puiss(prod, 10, n)}` + (ok ? '<br>C\'est déjà une écriture scientifique.' : `<br>${prod} n'est pas entre 1 et 10, on rectifie : ${puiss(s.a, 10, s.n)}`);
  };
  root.querySelectorAll('.m-a1,.m-n1,.m-a2,.m-n2').forEach((i) => i.addEventListener('input', mult)); mult();
}

function ensavoirplus(root) { plusloin(root); root.querySelectorAll('[data-bloc="4"]').forEach((n) => n.remove()); }
function allerplusloin(root) { plusloin(root); root.querySelectorAll('[data-bloc]:not([data-bloc="4"]), .intro-pl, .sources').forEach((n) => n.remove()); root.querySelectorAll('.q').forEach((n) => n.remove()); }

export default {
  id: 'ecriture-scientifique',
  affiche: afficheSaisie,
  definition: '<div class="big m">a × 10<sup>n</sup></div><p>avec <b>1 ≤ a &lt; 10</b> (un seul chiffre non nul avant la virgule) et <b>n un entier relatif</b>.</p>',
  explorer: {
    consigne: "Ces écritures sont rangées en deux familles. Observe-les bien, puis range les nouvelles. Personne ne t'a encore donné la règle : c'est à toi de la trouver.",
    oui: 'Dans la famille', non: 'Hors de la famille',
    exemplesOui: ['3,7 × 10^5', '1,2 × 10^-3', '7 × 10^4', '9,05 × 10^2', '2,5 × 10^8'], exemplesNon: ['23 × 10^4', '0,5 × 10^3', '10 × 10^2', '45 300', '3,1 × 2^5'],
    regle: ["Une écriture est dans la famille quand elle s'écrit a × ", { options: ['10ⁿ', '2ⁿ', 'n'] }, ' avec a ', { options: ['entre 1 (inclus) et 10 (exclu)', 'plus grand que 10', 'entre 0 et 1'] }, '.'],
  },
  defis: [
    { q: 'Quelle est l’écriture scientifique de (5 × 10³) × (4 × 10²) ?', options: ['20 × 10⁵', '2 × 10⁶', '2 × 10⁵'], juste: 1, expl: '5 × 4 = 20 et 10³ × 10² = 10⁵, donc 20 × 10⁵. Mais 20 n’est pas entre 1 et 10 : 20 × 10⁵ = 2 × 10⁶.' },
    { q: 'Un milliard de milliards, c’est…', options: ['10¹⁸', '10¹²', '10⁸¹'], juste: 0, expl: 'Un milliard = 10⁹. 10⁹ × 10⁹ = 10¹⁸ : les exposants s’additionnent.' },
  ],
  ensavoirplus, allerplusloin,
  niveau: '4e',
  symbole: '×10ⁿ',
  titre: "L'écriture scientifique",
  titreCourt: 'Écriture scientifique',
  theme: 'Nombres et calculs',
  sousTheme: 'Puissances de 10 et écriture scientifique',
  intro: 'Écrire les très grands et les très petits nombres sous la forme a × 10<sup>n</sup>. Des exemples à tester, puis des questions où il faut dire <b>oui ou non</b>, et surtout <b>pourquoi</b>.',
  parcours: [
    { sym: '×10ⁿ', nom: 'Écriture scientifique', id: 'ecriture-scientifique' },
    { sym: 'k·M', nom: 'Préfixes et ordres de grandeur' }, { sym: 'aⁿ', nom: "Puissances d'un nombre" }, { sym: '×', nom: 'Calculer en écriture scientifique' },
  ],
  schema: `<svg viewBox="0 0 240 120" role="img" aria-label="a × 10 puissance n, avec a entre 1 et 10 et n entier relatif">
    <rect x="2" y="2" width="236" height="116" rx="12" style="fill:var(--paper);stroke:var(--border)"/>
    <text x="120" y="62" text-anchor="middle" style="font-family:var(--f-math);font-size:34px;font-weight:700;fill:var(--ink)"><tspan style="fill:var(--accent)">a</tspan> × 10<tspan dy="-14" style="font-size:20px;fill:var(--accent2)">n</tspan></text>
    <text x="62" y="96" text-anchor="middle" style="font-family:var(--f-math);font-size:13px;fill:var(--accent)">1 ≤ a &lt; 10</text>
    <text x="178" y="96" text-anchor="middle" style="font-family:var(--f-math);font-size:13px;fill:var(--accent2)">n entier relatif</text></svg>
    <p>Un seul chiffre non nul avant la virgule, et une puissance de 10.</p>`,
  jeu: {
    gen: genJeu,
    consigne1: 'Clique sur les écritures scientifiques, évite les autres.',
    piege1: 'Attention : 7 × 10⁴ et 3,2 × 10⁻⁵ sont valables, 10 × 10³ ne l’est pas.',
    description1: 'Des écritures apparaissent. Clique seulement sur les écritures scientifiques.',
    consigneOui: 'Clique sur la seule <b>écriture scientifique</b>',
    consigneNon: "Clique sur la seule écriture qui n'est <b>pas</b> scientifique",
    laisse: 'qui était bien une écriture scientifique',
  },
  comprendre,
  plusloin,
};
