// Notion : les entiers naturels ℕ (2nde)
import { $, rnd, esc, fmt, fracHTML, isInt } from '../outils.js';

export function parseNum(raw) {
  const s = String(raw).trim().replace(/[\s  ]/g, '').replace(/−/g, '-');
  if (!s) return { err: 'Écris un nombre, par exemple 7, 2,5, -3 ou 12/4.' };
  const num = '-?\\d+(?:[.,]\\d+)?';
  const m = s.match(new RegExp(`^(${num})/(${num})$`));
  if (m) { const a = +m[1].replace(',', '.'), b = +m[2].replace(',', '.'); if (b === 0) return { err: "Division par 0 : ce n'est pas un nombre." }; return { v: a / b, kind: 'fraction', a, b }; }
  if (new RegExp(`^${num}$`).test(s)) return { v: +s.replace(',', '.'), kind: /[.,]/.test(s) ? 'decimal' : 'entier', raw: s };
  return { err: 'Je ne reconnais pas ce nombre. Essaie 7, 2,5, -3 ou 12/4.' };
}
export function explain(p) {
  const v = p.v, shown = p.kind === 'fraction' ? `${fmt(p.a)}/${fmt(p.b)}` : p.kind === 'decimal' ? p.raw.replace('.', ',').replace('-', '−') : fmt(v);
  if (isInt(v) && v >= 0) {
    const n = Math.round(v);
    if (p.kind === 'fraction') return { ok: true, t: `${shown} = ${fmt(n)} : la division tombe juste. Sa valeur est un entier positif, c'est un entier naturel écrit sous forme de fraction.` };
    if (p.kind === 'decimal') return { ok: true, t: `${shown} s'écrit avec une virgule, mais sa partie décimale est nulle : ${shown} = ${fmt(n)}, qui est un entier naturel.` };
    if (n === 0) return { ok: true, t: '0 est un entier naturel : ℕ commence à 0. Il est entier et positif ou nul.' };
    if (n <= 9) return { ok: true, t: `${fmt(n)} est un chiffre, et aussi un nombre entier positif : il est dans ℕ.` };
    return { ok: true, t: `${fmt(n)} est entier (sans virgule ni partie fractionnaire) et positif : il est dans ℕ.` };
  }
  if (isInt(v)) return { ok: false, t: `${shown}${p.kind !== 'entier' ? ' = ' + fmt(Math.round(v)) : ''} est un entier, mais il est négatif. Il appartient à ℤ (entiers relatifs), pas à ℕ.` };
  const neg = v < 0 ? ' Il est en plus négatif.' : '';
  if (p.kind === 'fraction') return { ok: false, t: `${shown} ≈ ${fmt(Math.round(v * 1000) / 1000)} : la division ne tombe pas juste, sa valeur n'est pas entière.${neg}` };
  return { ok: false, t: `${shown} est compris entre ${fmt(Math.floor(v))} et ${fmt(Math.floor(v) + 1)} : sa partie décimale n'est pas nulle, ce n'est pas un entier.${neg}` };
}
const affiche = (s) => { const p = parseNum(s); return p.kind === 'fraction' ? fracHTML(p.a, p.b) : esc(s.replace(/-/g, '−')); };

/* Jeux : nombres dans ℕ (« oui ») ou hors de ℕ (« non ») */
const NATP = [() => String(rnd(0, 20)), () => String(rnd(21, 999))];
const NATT = [() => '0', () => `${rnd(1, 9)},0`, () => { const b = rnd(2, 6); return `${b * rnd(1, 9)}/${b}`; }];
const NONP = [() => `-${rnd(1, 50)}`, () => `${rnd(0, 30)},${rnd(1, 9)}`, () => { let a, b; do { b = rnd(2, 9); a = rnd(1, 40); } while (a % b === 0); return `${a}/${b}`; }];
const NONT = [() => { const b = rnd(2, 5); return `-${b * rnd(1, 6)}/${b}`; }, () => `-${rnd(1, 9)},${rnd(1, 9)}`, () => `0,${rnd(1, 9)}`];
function genJeu(kind, trap) {
  if (!kind) kind = Math.random() < 0.55 ? 'oui' : 'non';
  if (trap === undefined) trap = Math.random() < 0.3;
  const pool = kind === 'oui' ? (trap ? NATT : NATP) : (trap ? NONT : NONP);
  const s = pool[rnd(0, pool.length - 1)]();
  const r = explain(parseNum(s));
  return { s, html: affiche(s), label: s.replace(/-/g, '−'), ok: r.ok, why: esc(r.t), trap };
}

/* Droite graduée */
function drawLine(svg, val, label) {
  const min = -4, max = 10, x0 = 30, x1 = 690, X = (v) => x0 + ((v - min) / (max - min)) * (x1 - x0), y = 52;
  let h = `<line class="axis" x1="${x0 - 14}" y1="${y}" x2="${x1 + 14}" y2="${y}"/><path d="M${x1 + 14} ${y} l-8 -5 v10z" style="fill:var(--ink-soft)"/>`;
  for (let i = min; i <= max; i++) {
    h += `<line class="tick" x1="${X(i)}" y1="${y - 6}" x2="${X(i)}" y2="${y + 6}"/><text class="lbl ${i >= 0 ? 'natlbl' : ''}" x="${X(i)}" y="${y + 26}" text-anchor="middle">${i < 0 ? '−' + -i : i}</text>`;
    if (i >= 0) h += `<circle class="natpt" cx="${X(i)}" cy="${y}" r="5"/>`;
  }
  h += `<text class="lbl natlbl" x="${X(max)}" y="${y - 14}" text-anchor="end" style="font-size:13px">… ℕ continue</text>`;
  if (val !== undefined && val !== null) {
    if (val >= min && val <= max) h += `<path class="mk" d="M${X(val)} ${y - 9} l-7 -14 h14z"/><text class="mkl" x="${Math.min(Math.max(X(val), 40), 680)}" y="14" text-anchor="middle">${esc(label)}</text>`;
    else { const right = val > max; h += `<text class="mkl" x="${right ? x1 - 4 : x0 + 4}" y="14" text-anchor="${right ? 'end' : 'start'}">${esc(label)} ${right ? '→ plus loin à droite' : '← plus loin à gauche'}</text>`; }
  }
  svg.innerHTML = h;
}

const EXEMPLES = [['7', 'Un chiffre est aussi un nombre'], ['0', 'ℕ commence à 0'], ['4 527', 'La taille ne compte pas'], ['−3', 'Entier, mais négatif'], ['2,5', 'Partie décimale non nulle'], ['4,0', '4,0 = 4'], ['12/4', '12 ÷ 4 = 3, ça tombe juste'], ['7/2', '7 ÷ 2 = 3,5']];

function comprendre(root) {
  root.innerHTML = `
  <div class="sheet def">
    <div class="eyebrow">Définition</div>
    <div class="big">ℕ = {0 ; 1 ; 2 ; 3 ; …}</div>
    <p>Un <b>entier naturel</b> est un nombre <b>entier</b> (sans virgule ni partie fractionnaire) et <b>positif ou nul</b>. L'ensemble commence à 0 et n'a pas de plus grand élément.</p>
  </div>
  <div class="grid2">
    <div class="card tester">
      <h3>Teste un nombre</h3>
      <form class="t-form" autocomplete="off"><input class="t-in" aria-label="Nombre à tester" value="12/4"><button class="btn" type="submit">Vérifier</button></form>
      <div class="t-out"></div>
      <div class="line-wrap"><svg class="t-line" viewBox="0 0 720 96" role="img" aria-label="Droite graduée"></svg></div>
    </div>
    <div class="card"><h3>Les pièges fréquents</h3><ul class="traps">
      <li><span class="k">0</span><span>est bien un entier naturel. « Différent de 0 » ne fait pas partie de la définition.</span></li>
      <li><span class="k">7</span><span>est un chiffre, et un chiffre est aussi un nombre. Il est dans ℕ.</span></li>
      <li><span class="k">4,0</span><span>s'écrit avec une virgule mais vaut 4 : c'est un entier naturel.</span></li>
      <li><span class="k">12/4</span><span>est une fraction qui tombe juste : elle vaut 3, donc elle est dans ℕ.</span></li>
      <li><span class="k">−3</span><span>est entier, mais négatif : il est dans ℤ, pas dans ℕ.</span></li>
    </ul></div>
  </div>
  <div class="card"><h3>Par l'exemple</h3><p style="margin:-4px 0 14px;color:var(--ink-soft)">Clique sur un nombre pour le placer sur la droite et lire l'explication.</p>
    <div class="examples">${EXEMPLES.map(([s, cap]) => { const r = explain(parseNum(s)); return `<button class="ex" data-ex="${esc(s)}"><span class="n">${affiche(s)}</span><span class="s ${r.ok ? 'yes' : 'no'}">${r.ok ? '✓ dans ℕ' : '✗ pas dans ℕ'}</span><span class="why">${esc(cap)}</span></button>`; }).join('')}</div>
  </div>`;
  const run = (raw) => {
    const p = parseNum(raw), out = $('.t-out', root);
    if (p.err) { out.innerHTML = `<div class="verdict"><div class="v">À corriger</div>${esc(p.err)}</div>`; drawLine($('.t-line', root)); return; }
    const r = explain(p);
    out.innerHTML = `<div class="verdict ${r.ok ? 'yes' : 'no'}" role="status"><div class="v">${r.ok ? "Oui, c'est un entier naturel" : "Non, ce n'est pas un entier naturel"}</div>${esc(r.t)}</div>`;
    drawLine($('.t-line', root), p.v, raw.trim().replace(/-/g, '−'));
    if (root._onTest) root._onTest(raw.trim().replace(/-/g, '−'), (r.ok ? 'Oui : ' : 'Non : ') + r.t);
  };
  $('.t-form', root).addEventListener('submit', (e) => { e.preventDefault(); run($('.t-in', root).value); });
  $('.examples', root).addEventListener('click', (e) => { const b = e.target.closest('.ex'); if (!b) return; $('.t-in', root).value = b.dataset.ex; run(b.dataset.ex); $('.tester', root).scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  run($('.t-in', root).value);
}

function plusloin(root) {
  root.innerHTML = `
  <div class="sheet intro-pl"><div class="eyebrow">Pour la culture</div><h3 style="font-size:1.4rem;margin-top:4px">Pourquoi les entiers naturels existent</h3>
    <p class="lead">Les hommes ont compté bien avant de savoir définir ce qu'est un nombre. Voici d'où viennent les entiers, à quoi ils servent aujourd'hui, et pourquoi ils ne suffisent pas.</p></div>
  <div class="card" data-bloc="1"><div class="block-head"><span class="q">1</span><h3>D'où ils viennent : compter</h3></div>
    <div class="prose"><p>Le premier besoin est de compter : des bêtes, des jours, des objets échangés. Pour cela, pas besoin de chiffres. Une entaille par objet suffit.</p></div>
    <div class="tally" aria-live="polite"></div>
    <div class="row"><button class="btn sm b-add">+ 1 entaille</button><button class="btn sm ghost b-reset">Effacer</button><span style="font-size:.85rem;color:var(--ink-soft)">Grouper par 5 rend le comptage plus rapide à lire.</span></div>
    <ol class="tl" style="margin-top:14px">
      <li><span class="yr">vers −20 000</span><span><b>L'os d'Ishango</b>Trouvé au Congo et conservé à Bruxelles, il porte des séries d'entailles alignées. On pense qu'il s'agit de comptages, mais leur sens exact reste discuté.</span></li>
      <li><span class="yr">Antiquité</span><span><b>Des chiffres, mais pas encore de zéro</b>Les Babyloniens écrivent les nombres en base 60. Pendant longtemps, une position vide est simplement laissée en blanc, ce qui crée des confusions.</span></li>
      <li><span class="yr">628</span><span><b>Le zéro devient un nombre</b>En Inde, Brahmagupta donne des règles de calcul avec zéro, par exemple a + 0 = a.</span></li>
      <li><span class="yr">1202</span><span><b>Les chiffres arrivent en Europe</b>Fibonacci fait connaître les chiffres indo-arabes 0 à 9 et la numération de position.</span></li>
    </ol></div>
  <div class="card" data-bloc="2"><div class="block-head"><span class="q">2</span><h3>Pourquoi une définition précise</h3></div>
    <div class="prose"><p>À la fin du XIXe siècle, les mathématiciens veulent tout reconstruire sur des bases solides. Dedekind (1888) puis Peano (1889) décrivent les entiers naturels avec une idée simple : on part d'un premier nombre, et <b>chaque entier a un suivant</b>.</p></div>
    <div class="succ"></div><div class="row"><button class="btn sm b-succ">Prendre le suivant (+1)</button></div>
    <div class="prose" style="margin-top:12px"><p>Peano commençait d'abord à 1, puis il a ajouté 0. La convention varie encore selon les pays. <b>En France, 0 est un entier naturel</b>. Pour parler des entiers sans 0, on écrit <span class="m">ℕ*</span>.</p></div>
    <details class="defi" style="margin-top:12px"><summary>Défi : quel est le plus grand entier naturel ?</summary><p>Il n'existe pas. Si quelqu'un propose un nombre n, il suffit de prendre n + 1 : c'est encore un entier naturel, et il est plus grand.</p></details></div>
  <div class="card" data-bloc="3"><div class="block-head"><span class="q">3</span><h3>Où on s'en sert aujourd'hui</h3></div>
    <div class="prose"><p>Un ordinateur ne manipule que des 0 et des 1. Tout entier naturel peut s'écrire ainsi, en <b>binaire</b> : on le décompose en puissances de 2.</p></div>
    <div class="row" style="margin-top:6px"><label for="binIn">Écris un entier de 0 à 1023 :</label><input class="small-input b-in" id="binIn" type="number" min="0" max="1023" value="13"></div>
    <div class="bin"></div><p class="b-txt" style="margin:8px 0 0;font-size:.92rem"></p>
    <div class="uses">
      <div class="use"><b>Numéroter et classer</b><p>Pages, places, rangs : on ne parle pas de la 2,5e place ni de la page −3.</p></div>
      <div class="use"><b>Informatique</b><p>Pixels, abonnés, compteurs : les logiciels stockent tout cela comme des entiers naturels en binaire.</p></div>
      <div class="use"><b>Paiements sécurisés</b><p>Multiplier deux très grands nombres premiers est facile. Retrouver ces deux nombres à partir du produit est extrêmement long. Le chiffrement des paiements en ligne repose sur cette difficulté.</p></div>
    </div></div>
  <div class="card" data-bloc="4"><div class="block-head"><span class="q">4</span><h3>Ce qui manque à ℕ</h3></div>
    <div class="prose"><p>Prends deux entiers naturels et fais une opération. Le résultat est-il encore dans ℕ ?</p></div>
    <div class="row"><input class="small-input o-a" type="number" min="0" value="3" aria-label="Premier entier"><span class="m">et</span><input class="small-input o-b" type="number" min="0" value="5" aria-label="Second entier"></div>
    <div class="ops"></div><p class="o-txt" style="margin:12px 0 0;max-width:64ch"></p>
    <div class="ladder"><span class="set here">ℕ</span><span class="why">3 − 5 impossible →</span><span class="set">ℤ</span><span class="why">7 ÷ 2 impossible →</span><span class="set">ℚ</span><span class="why">la diagonale d'un carré de côté 1 (√2) →</span><span class="set">ℝ</span></div>
    <p style="margin:12px 0 0;max-width:64ch">Chaque nouvel ensemble de nombres a été inventé pour faire une opération que le précédent ne permettait pas.</p></div>
  <p class="sources">Repères : Muséum des Sciences naturelles de Belgique (os d'Ishango) ; R. Dedekind, <i>Was sind und was sollen die Zahlen?</i> (1888) ; G. Peano, <i>Arithmetices principia</i> (1889) ; Brahmagupta (628) ; Fibonacci, <i>Liber abaci</i> (1202).</p>`;

  let T = 7, S = 3;
  const tally = () => {
    const g = []; for (let i = 0; i < T; i += 5) { const k = Math.min(5, T - i); let l = ''; for (let j = 0; j < Math.min(k, 4); j++) l += `<line x1="${6 + j * 9}" y1="4" x2="${6 + j * 9}" y2="36"/>`; if (k === 5) l += '<line x1="0" y1="30" x2="40" y2="10"/>'; g.push(`<svg viewBox="-2 0 44 40" aria-hidden="true">${l}</svg>`); }
    $('.tally', root).innerHTML = (g.join('') || '<span style="color:var(--ink-soft)">Aucune entaille</span>') + `<span class="total">${T}</span>`;
  };
  const succ = () => { let h = ''; for (let i = 0; i <= S; i++) h += `<span>${i}</span>${i < S ? '<i>→</i>' : ''}`; $('.succ', root).innerHTML = h + '<i>→ …</i>'; };
  const bin = () => {
    let n = Math.floor(+$('.b-in', root).value); if (!isFinite(n) || n < 0) n = 0; if (n > 1023) n = 1023;
    const bits = n.toString(2).padStart(4, '0'), L = bits.length;
    $('.bin', root).innerHTML = [...bits].map((b, i) => `<div class="bit ${b === '1' ? 'on' : ''}"><span class="d">${b}</span><span class="w">${2 ** (L - 1 - i)}</span></div>`).join('');
    const parts = [...bits].map((b, i) => (b === '1' ? 2 ** (L - 1 - i) : null)).filter((x) => x !== null);
    $('.b-txt', root).innerHTML = `<span class="m">${n}</span> s'écrit <b class="m">${n.toString(2)}</b> en binaire${parts.length > 1 ? ` : ${parts.join(' + ')} = ${n}` : ''}.`;
  };
  const ops = () => {
    const a = Math.max(0, Math.floor(+$('.o-a', root).value || 0)), b = Math.max(0, Math.floor(+$('.o-b', root).value || 0));
    const res = [{ s: `${a} + ${b}`, v: a + b }, { s: `${a} × ${b}`, v: a * b }, { s: `${a} − ${b}`, v: a - b }, { s: `${a} ÷ ${b}`, v: b === 0 ? null : a / b }];
    $('.ops', root).innerHTML = res.map((r) => { const ok = r.v !== null && isInt(r.v) && r.v >= 0; return `<div class="op ${ok ? 'yes' : 'no'}"><div class="s">${r.s}</div><div>= ${r.v === null ? '?' : esc(fmt(Math.round(r.v * 1000) / 1000))}${r.v !== null && !isInt(r.v) ? ' (environ)' : ''}</div><div class="r">${ok ? '✓ dans ℕ' : '✗ hors de ℕ'}</div></div>`; }).join('');
    const msgs = [];
    if (a - b < 0) msgs.push(`${a} − ${b} est négatif : pour ce calcul, il faut les entiers relatifs ℤ.`);
    if (b === 0) msgs.push('Diviser par 0 est impossible, dans tous les ensembles de nombres.');
    else if (a % b !== 0) msgs.push(`${a} ÷ ${b} ne tombe pas juste : pour ce calcul, il faut les fractions, donc ℚ.`);
    $('.o-txt', root).innerHTML = "L'addition et la multiplication donnent <b>toujours</b> un entier naturel. " + (msgs.length ? esc(msgs.join(' ')) : 'Ici la soustraction et la division tombent juste, mais essaie avec 3 et 5.');
  };
  $('.b-add', root).addEventListener('click', () => { if (T < 60) T++; tally(); });
  $('.b-reset', root).addEventListener('click', () => { T = 0; tally(); });
  $('.b-succ', root).addEventListener('click', () => { S = S < 15 ? S + 1 : 3; succ(); });
  $('.b-in', root).addEventListener('input', bin);
  root.querySelectorAll('.o-a,.o-b').forEach((i) => i.addEventListener('input', ops));
  tally(); succ(); bin(); ops();
}

function ensavoirplus(root) { plusloin(root); root.querySelectorAll('[data-bloc="4"]').forEach((n) => n.remove()); }
function allerplusloin(root) { plusloin(root); root.querySelectorAll('[data-bloc]:not([data-bloc="4"]), .intro-pl, .sources').forEach((n) => n.remove()); root.querySelectorAll('.q').forEach((n) => n.remove()); }

export default {
  id: 'entiers-naturels',
  affiche,
  definition: '<div class="big m">ℕ = {0 ; 1 ; 2 ; 3 ; …}</div><p>Un entier naturel est un nombre <b>entier</b> (sans virgule ni partie fractionnaire) et <b>positif ou nul</b>.</p>',
  explorer: {
    consigne: "Ces nombres sont rangés en deux familles. Observe-les bien, puis range les nouveaux nombres. Personne ne t'a encore donné la règle : c'est à toi de la trouver.",
    oui: 'Dans la famille', non: 'Hors de la famille',
    exemplesOui: ['3', '0', '12', '150', '7', '2024'], exemplesNon: ['−4', '2,5', '1/3', '−10', '0,7', '7/2'],
    regle: ['Un nombre est dans la famille quand il est ', { options: ['entier', 'décimal', 'une fraction'] }, ' et ', { options: ['positif ou nul', 'strictement positif', 'négatif'] }, '.'],
  },
  defis: [
    { q: '3 − 5 donne −2. Quel ensemble faut-il pour pouvoir écrire ce résultat ?', options: ['ℕ suffit', 'Il faut les entiers relatifs ℤ', 'Il faut les décimaux 𝔻'], juste: 1, expl: '−2 est négatif : il n’est pas dans ℕ. Les entiers relatifs ℤ ajoutent les nombres négatifs.' },
    { q: 'Parmi ces opérations sur deux entiers naturels, laquelle donne toujours un entier naturel ?', options: ['La soustraction', 'La division', 'La multiplication'], juste: 2, expl: 'Le produit de deux entiers naturels est toujours un entier naturel. La soustraction peut donner un négatif, la division un nombre non entier.' },
  ],
  ensavoirplus, allerplusloin,
  niveau: '2nde',
  symbole: 'ℕ',
  titre: 'Les entiers naturels',
  titreCourt: 'Entiers naturels',
  theme: 'Calcul dans ℝ',
  sousTheme: 'Classification des ensembles de nombres',
  intro: 'Une définition, des exemples à tester soi-même, puis des questions où il faut dire <b>oui ou non</b>, et surtout <b>pourquoi</b>.',
  parcours: [
    { sym: 'ℕ', nom: 'Entiers naturels', id: 'entiers-naturels' },
    { sym: 'ℤ', nom: 'Entiers relatifs' }, { sym: '𝔻', nom: 'Nombres décimaux' }, { sym: 'ℚ', nom: 'Nombres rationnels' }, { sym: 'ℝ', nom: 'Nombres réels' },
  ],
  schema: `<svg viewBox="0 0 240 150" role="img" aria-label="ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ"><g fill="none" stroke-width="1.5">
    <rect x="2" y="2" width="236" height="146" rx="12" style="stroke:var(--border);fill:var(--paper)"/><rect x="22" y="20" width="198" height="120" rx="11" style="stroke:var(--border)"/>
    <rect x="42" y="38" width="160" height="94" rx="10" style="stroke:var(--border)"/><rect x="62" y="56" width="122" height="68" rx="9" style="stroke:var(--border)"/>
    <rect x="82" y="74" width="84" height="42" rx="8" style="stroke:var(--accent);fill:var(--accent-soft)"/></g>
    <g style="font-family:var(--f-math);font-size:14px;fill:var(--ink-soft)"><text x="10" y="17">ℝ</text><text x="30" y="35">ℚ</text><text x="50" y="53">𝔻</text><text x="70" y="71">ℤ</text>
    <text x="124" y="100" text-anchor="middle" style="fill:var(--accent);font-weight:700;font-size:17px">ℕ</text></g></svg>
    <p>ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ : chaque notion débloquera la suivante.</p>`,
  jeu: {
    gen: genJeu,
    consigne1: 'Clique sur les entiers naturels, évite les autres.',
    piege1: 'Attention aux pièges : 0, 4,0 ou 12/4 sont bien dans ℕ.',
    description1: 'Des nombres apparaissent. Clique seulement sur ceux qui sont dans ℕ.',
    consigneOui: 'Clique sur le seul nombre qui <b>est</b> dans ℕ',
    consigneNon: "Clique sur le seul nombre qui n'est <b>pas</b> dans ℕ",
    laisse: 'qui était bien dans ℕ',
  },
  comprendre,
  plusloin,
};
