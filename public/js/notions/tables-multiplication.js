// Notion : les tables de multiplication (6e)
import { $, $$, rnd, esc } from '../outils.js';

const dansTable = (n, t) => n >= 0 && n % t === 0 && n / t <= 10;
function verdict(n, t) {
  if (dansTable(n, t)) {
    const k = n / t;
    if (n === 0) return { ok: true, t: `0 = ${t} × 0 : zéro est dans toutes les tables.` };
    if (k === 1) return { ok: true, t: `${n} = ${t} × 1 : un nombre est toujours dans sa propre table.` };
    return { ok: true, t: `${n} = ${t} × ${k}, et aussi ${k} × ${t}.` };
  }
  if (n % t === 0) return { ok: false, t: `${n} = ${t} × ${n / t} : c'est un multiple de ${t}, mais il dépasse ${t} × 10 = ${t * 10}, la fin de la table.` };
  const k1 = Math.floor(n / t);
  return { ok: false, t: `${n} est entre ${t} × ${k1} = ${t * k1} et ${t} × ${k1 + 1} = ${t * (k1 + 1)} : ce n'est pas un résultat de la table de ${t}.` };
}

/* Jeux : calculs justes (« oui ») ou faux (« non ») */
function genJeu(kind, trap) {
  if (!kind) kind = Math.random() < 0.5 ? 'oui' : 'non';
  if (trap === undefined) trap = Math.random() < 0.35;
  const a = rnd(2, 9), b = rnd(2, 9), r = a * b;
  let n = r, why = `${a} × ${b} = ${r}.`;
  if (kind === 'non') {
    if (!trap) { const b2 = b + (Math.random() < 0.5 ? 1 : -1); n = a * b2; why = `${a} × ${b} = ${r}. ${n}, c'est ${a} × ${b2}.`; }
    else {
      const inv = +String(r).split('').reverse().join('');
      if (r > 11 && r % 10 && inv !== r) { n = inv; why = `${a} × ${b} = ${r} : les chiffres sont inversés.`; }
      else { n = a + b; why = `${n} = ${a} + ${b}, c'est une addition. ${a} × ${b} = ${r}.`; }
    }
    if (n === r) { n = r + 1; why = `${a} × ${b} = ${r}.`; }
  } else if (trap) why = `${a} × ${b} = ${r}, comme ${b} × ${a}.`;
  const s = `${a} × ${b} = ${n}`;
  return { s, html: esc(s), label: s, ok: kind === 'oui', why, trap };
}

/* Explorer : la famille cachée est la table de 6 */
function genExplorer(kind, trap) {
  if (!kind) kind = Math.random() < 0.5 ? 'oui' : 'non';
  if (trap === undefined) trap = Math.random() < 0.4;
  let n;
  if (kind === 'oui') n = 6 * rnd(0, 10);
  else if (trap) { const p = [16, 26, 46, 56, 9, 15, 21, 27, 33, 39, 45, 51, 57, 8, 14, 20, 22, 28, 32, 38]; do { n = p[rnd(0, p.length - 1)]; } while (n % 6 === 0); }
  else do { n = rnd(1, 60); } while (n % 6 === 0);
  return { s: String(n), html: String(n), label: String(n), ok: n % 6 === 0 && n <= 60, why: '', trap };
}

const EXEMPLES = [[56, 7, 'Un résultat de la table'], [0, 8, 'Zéro est partout'], [27, 7, 'Se termine par 7…'], [45, 9, 'Table de 9'], [24, 6, 'Table de 6'], [35, 5, 'Table de 5'], [84, 7, 'Au-delà de 7 × 10'], [42, 6, '6 × 7']];
const PIEGES = [
  ['0', 'est dans toutes les tables : 7 × 0 = 0.'],
  ['27', "se termine par 7 mais n'est pas dans la table de 7 : elle passe par 21 puis 28."],
  ['7 × 8', '= 8 × 7 = 56 : on peut retourner une multiplication.'],
  ['6 × 7', '= 42, et non 48 : 48 c’est 6 × 8.'],
  ['7 × 8', '≠ 65 : ne pas inverser les chiffres de 56.'],
];

function grilleHTML(min, max, cls) {
  let h = `<div class="pyth ${cls}" style="grid-template-columns:repeat(${max - min + 2},minmax(0,1fr))"><span class="ph">×</span>`;
  for (let b = min; b <= max; b++) h += `<span class="ph" data-col="${b}">${b}</span>`;
  for (let a = min; a <= max; a++) {
    h += `<span class="ph" data-row="${a}">${a}</span>`;
    for (let b = min; b <= max; b++) h += `<button type="button" class="pc" data-a="${a}" data-b="${b}" aria-label="${a} fois ${b}">${a * b}</button>`;
  }
  return h + '</div>';
}

function comprendre(root) {
  root.innerHTML = `
  <div class="sheet def">
    <div class="eyebrow">Définition</div>
    <div class="big">7 × 8 = 56</div>
    <p>Un nombre est dans la <b>table de 7</b> quand il s'écrit <b>7 × k</b>, avec k un entier de 0 à 10. Comme 7 × 8 = 8 × 7, le nombre 56 est aussi dans la table de 8.</p>
  </div>
  <div class="card"><h3>La table de Pythagore</h3><p class="mini" style="margin:-4px 0 12px">Clique sur une case : la ligne et la colonne s'allument.</p>
    <div class="tbl-wrap" style="border:0;background:none">${grilleHTML(1, 10, 'grand')}</div>
    <p class="pyth-out" role="status" style="margin:10px 0 0;font-size:1.1rem"></p></div>
  <div class="grid2">
    <div class="card tester"><h3>Teste un nombre</h3>
      <form class="t-form" autocomplete="off"><input class="t-in" aria-label="Nombre" value="56" inputmode="numeric" style="flex:1 1 90px"><span style="align-self:center">dans la table de</span><input class="t-tb small-input" aria-label="Table" value="7" inputmode="numeric" style="width:4em"><button class="btn" type="submit">Vérifier</button></form>
      <div class="t-out"></div></div>
    <div class="card"><h3>Les pièges fréquents</h3><ul class="traps">${PIEGES.map(([k, t]) => `<li><span class="k">${k}</span><span>${esc(t)}</span></li>`).join('')}</ul></div>
  </div>
  <div class="card"><h3>Par l'exemple</h3><p style="margin:-4px 0 14px;color:var(--ink-soft)">Clique sur un exemple pour le tester.</p>
    <div class="examples">${EXEMPLES.map(([n, t, cap]) => { const r = verdict(n, t); return `<button class="ex" data-n="${n}" data-t="${t}"><span class="n">${n}</span><span class="s ${r.ok ? 'yes' : 'no'}">${r.ok ? '✓' : '✗'} table de ${t}</span><span class="why">${esc(cap)}</span></button>`; }).join('')}</div></div>`;
  const run = (n, t, rapporter) => {
    const out = $('.t-out', root);
    if (!(n >= 0) || !(t >= 1) || t > 12 || !Number.isInteger(n) || !Number.isInteger(t)) { out.innerHTML = '<div class="verdict"><div class="v">À corriger</div>Écris un nombre entier positif et une table de 1 à 12.</div>'; return; }
    const r = verdict(n, t);
    out.innerHTML = `<div class="verdict ${r.ok ? 'yes' : 'no'}" role="status"><div class="v">${r.ok ? `Oui, ${n} est dans la table de ${t}` : `Non, ${n} n'est pas dans la table de ${t}`}</div>${esc(r.t)}</div>`;
    if (rapporter && root._onTest) root._onTest(`${n} · table de ${t}`, (r.ok ? 'Oui : ' : 'Non : ') + r.t);
  };
  $('.t-form', root).addEventListener('submit', (e) => { e.preventDefault(); run(+$('.t-in', root).value, +$('.t-tb', root).value, true); });
  $('.examples', root).addEventListener('click', (e) => { const b = e.target.closest('.ex'); if (!b) return; $('.t-in', root).value = b.dataset.n; $('.t-tb', root).value = b.dataset.t; run(+b.dataset.n, +b.dataset.t, true); $('.tester', root).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('.pyth', root).addEventListener('click', (e) => {
    const c = e.target.closest('.pc'); if (!c) return;
    const a = +c.dataset.a, b = +c.dataset.b;
    $$('.pc', root).forEach((x) => x.classList.toggle('lit', +x.dataset.a === a || +x.dataset.b === b));
    $$('.pc', root).forEach((x) => x.classList.toggle('sel', x === c || (+x.dataset.a === b && +x.dataset.b === a)));
    $('.pyth-out', root).innerHTML = `<b class="m">${a} × ${b} = ${a * b}</b>${a !== b ? ` <span class="mini">· et aussi ${b} × ${a} = ${a * b} (l'autre case en couleur)</span>` : ' <span class="mini">· un carré, sur la diagonale</span>'}`;
  });
  run(56, 7, false);
}

const ASTUCES = [
  [2, 'Le double.', (k) => `${k} + ${k} = ${2 * k}`],
  [4, 'Le double du double.', (k) => `${k} → ${2 * k} → ${4 * k}`],
  [5, 'La moitié de × 10.', (k) => `${k} × 10 = ${10 * k}, la moitié : ${5 * k}`],
  [8, 'Le double de × 4.', (k) => `${k} × 4 = ${4 * k}, le double : ${8 * k}`],
  [9, '× 10 puis on enlève le nombre.', (k) => `${k} × 10 − ${k} = ${10 * k} − ${k} = ${9 * k}`],
];

function plusloin(root) {
  root.innerHTML = `
  <div class="sheet intro-pl"><div class="eyebrow">Pour aller plus vite</div><h3 style="font-size:1.4rem;margin-top:4px">Les tables, sans tout apprendre par cœur</h3>
    <p class="lead">Il y a moins de résultats à retenir qu'on ne le croit, et beaucoup se retrouvent avec des astuces.</p></div>
  <div class="card" data-bloc="1"><div class="block-head"><span class="q">1</span><h3>Moins à apprendre qu'on ne croit</h3></div>
    <div class="prose"><p>Les tables de 2 à 9 contiennent 8 × 8 = <b>64</b> calculs. Mais 7 × 8 et 8 × 7 donnent le même résultat : il suffit d'en retenir un.</p></div>
    <div class="row"><button class="btn sm b-dbl">Montrer les doublons</button></div>
    <div class="tbl-wrap" style="border:0;background:none;margin-top:10px">${grilleHTML(2, 9, 'petit')}</div>
    <p class="b-dbl-txt" style="margin:8px 0 0"></p></div>
  <div class="card" data-bloc="2"><div class="block-head"><span class="q">2</span><h3>Des astuces pour certaines tables</h3></div>
    <div class="row"><label for="astK">Choisis un nombre de 1 à 10 :</label><input class="small-input a-k" id="astK" type="number" min="1" max="10" value="7"></div>
    <div class="uses a-list" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))"></div></div>
  <div class="card" data-bloc="3"><div class="block-head"><span class="q">3</span><h3>À quoi ça sert</h3></div>
    <div class="prose"><p>Un rectangle de <b class="r-a">4</b> carreaux sur <b class="r-b">6</b> en contient <b class="r-p">24</b> : on ne les compte pas un par un, on multiplie.</p></div>
    <div class="row"><label>Largeur <input class="small-input r-in-a" type="range" min="1" max="10" value="4" aria-label="Largeur"></label><label>Hauteur <input class="small-input r-in-b" type="range" min="1" max="10" value="6" aria-label="Hauteur"></label></div>
    <svg class="r-svg" viewBox="0 0 220 220" style="width:220px;max-width:100%;height:auto;margin-top:10px" role="img" aria-label="Rectangle de carreaux"></svg>
    <div class="uses">
      <div class="use"><b>Faire ses courses</b><p>3 cahiers à 4 € : 3 × 4 = 12 €, sans additionner 4 + 4 + 4.</p></div>
      <div class="use"><b>Simplifier une fraction</b><p>42/56 : 42 = 14 × 3 et 56 = 14 × 4, donc 42/56 = 3/4.</p></div>
      <div class="use"><b>Calculer une aire</b><p>Une pièce de 4 m sur 5 m mesure 4 × 5 = 20 m².</p></div>
    </div></div>
  <div class="card" data-bloc="4"><div class="block-head"><span class="q">4</span><h3>Au-delà de 10</h3></div>
    <div class="prose"><p>Pour 7 × 12, pas besoin d'une table de 12 : on découpe 12 en 10 + 2.</p></div>
    <div class="row"><input class="small-input d-a" type="number" min="2" max="9" value="7" aria-label="Premier nombre"><b>×</b><input class="small-input d-b" type="number" min="11" max="20" value="12" aria-label="Second nombre, entre 11 et 20"></div>
    <div class="verdict yes d-out" style="margin-top:12px"></div>
    <p style="margin:12px 0 0;max-width:64ch">Tous les nombres qu'on obtient en multipliant 7 par un entier, même au-delà de 70, s'appellent les <b>multiples de 7</b>. C'est la suite du parcours.</p></div>`;

  let dbl = false;
  $('.b-dbl', root).addEventListener('click', () => {
    dbl = !dbl;
    $$('.pyth.petit .pc', root).forEach((c) => c.classList.toggle('dup', dbl && +c.dataset.a > +c.dataset.b));
    $('.b-dbl', root).textContent = dbl ? 'Cacher les doublons' : 'Montrer les doublons';
    $('.b-dbl-txt', root).innerHTML = dbl ? 'Les cases grisées répètent une case de l’autre côté de la diagonale. Il reste <b>36 résultats</b> à connaître : 28 paires et 8 carrés.' : '';
  });
  const ast = () => {
    let k = Math.round(+$('.a-k', root).value); if (!(k >= 1 && k <= 10)) k = 7;
    $('.a-list', root).innerHTML = ASTUCES.map(([t, d, f]) => `<div class="use"><b>Table de ${t}</b><p>${d}<br><span class="m">${t} × ${k} : ${f(k)}</span></p></div>`).join('');
  };
  $('.a-k', root).addEventListener('input', ast); ast();
  const rect = () => {
    const a = +$('.r-in-a', root).value, b = +$('.r-in-b', root).value, s = 20;
    $('.r-a', root).textContent = a; $('.r-b', root).textContent = b; $('.r-p', root).textContent = a * b;
    let h = '';
    for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) h += `<rect x="${5 + i * (s + 1)}" y="${5 + j * (s + 1)}" width="${s}" height="${s}" rx="3" style="fill:var(--accent-soft);stroke:var(--accent)"/>`;
    $('.r-svg', root).innerHTML = h;
  };
  $$('.r-in-a,.r-in-b', root).forEach((i) => i.addEventListener('input', rect)); rect();
  const dec = () => {
    const a = Math.round(+$('.d-a', root).value), b = Math.round(+$('.d-b', root).value), out = $('.d-out', root);
    if (!(a >= 2 && a <= 9 && b >= 11 && b <= 20)) { out.className = 'verdict d-out'; out.textContent = 'Choisis un premier nombre de 2 à 9 et un second de 11 à 20.'; return; }
    out.className = 'verdict yes d-out';
    out.innerHTML = `<span class="m">${a} × ${b} = ${a} × 10 + ${a} × ${b - 10} = ${a * 10} + ${a * (b - 10)} = <b>${a * b}</b></span>`;
  };
  $$('.d-a,.d-b', root).forEach((i) => i.addEventListener('input', dec)); dec();
}
function ensavoirplus(root) { plusloin(root); root.querySelectorAll('[data-bloc="4"]').forEach((n) => n.remove()); }
function allerplusloin(root) { plusloin(root); root.querySelectorAll('[data-bloc]:not([data-bloc="4"]), .intro-pl').forEach((n) => n.remove()); root.querySelectorAll('.q').forEach((n) => n.remove()); }

export default {
  id: 'tables-multiplication',
  niveau: '6e',
  symbole: '×',
  titre: 'Les tables de multiplication',
  titreCourt: 'Tables de multiplication',
  theme: 'Nombres et calculs',
  sousTheme: 'Calcul mental : les tables',
  affiche: (s) => esc(s),
  definition: '<div class="big m">7 × 8 = 56</div><p>Un nombre est dans la <b>table de 7</b> quand il s’écrit <b>7 × k</b>, avec k entier de 0 à 10. Et 7 × 8 = 8 × 7.</p>',
  parcours: [
    { sym: '×', nom: 'Tables de multiplication', id: 'tables-multiplication' },
    { sym: 'k·n', nom: 'Multiples et diviseurs' }, { sym: '÷', nom: 'Division euclidienne' }, { sym: '%', nom: 'Critères de divisibilité' },
  ],
  schema: `<svg viewBox="0 0 240 130" role="img" aria-label="7 fois 8 égale 8 fois 7 égale 56">
    <rect x="2" y="2" width="236" height="126" rx="12" style="fill:var(--paper);stroke:var(--border)"/>
    <text x="120" y="58" text-anchor="middle" style="font-family:var(--f-math);font-size:28px;font-weight:700;fill:var(--ink)">7 × 8 = <tspan style="fill:var(--accent)">56</tspan></text>
    <text x="120" y="96" text-anchor="middle" style="font-family:var(--f-math);font-size:20px;fill:var(--accent2)">= 8 × 7</text></svg>
    <p>On peut toujours retourner une multiplication.</p>`,
  explorer: {
    consigne: "Ces nombres sont rangés en deux familles. Observe-les bien, puis range les nouveaux nombres. Personne ne t'a encore donné la règle : c'est à toi de la trouver.",
    oui: 'Dans la famille', non: 'Hors de la famille',
    exemplesOui: ['12', '30', '0', '54', '18', '42'], exemplesNon: ['16', '9', '40', '25', '34', '15'],
    gen: genExplorer,
    regle: ['Un nombre est dans la famille quand il est dans la table de ', { options: ['6', '2', '3', '4'] }, '.'],
  },
  defis: [
    { q: 'Les tables de 2 à 9 contiennent 64 calculs. Combien de résultats faut-il vraiment retenir, sachant que 7 × 8 = 8 × 7 ?', options: ['64', '36', '32'], juste: 1, expl: 'Chaque calcul a × b avec a ≠ b a un jumeau b × a : 28 paires. Il faut ajouter les 8 carrés (2 × 2 … 9 × 9) : 28 + 8 = 36.' },
    { q: 'Quel calcul permet de trouver 8 × 13 de tête ?', options: ['8 × 10 + 8 × 3', '8 × 10 + 3', '8 + 13'], juste: 0, expl: '13 = 10 + 3, donc 8 × 13 = 8 × 10 + 8 × 3 = 80 + 24 = 104.' },
  ],
  jeu: {
    gen: genJeu,
    consigne1: 'Clique sur les calculs justes, évite les faux.',
    piege1: 'Attention aux résultats voisins et aux chiffres inversés : 6 × 7 = 42, pas 48 ni 24.',
    description1: 'Des multiplications apparaissent. Clique seulement sur celles qui sont justes.',
    consigneOui: 'Clique sur le seul calcul <b>juste</b>',
    consigneNon: 'Clique sur le seul calcul <b>faux</b>',
    laisse: 'qui était juste',
  },
  comprendre,
  plusloin,
  ensavoirplus, allerplusloin,
};
