/* Testes do motor do Hypermax com números conferidos no jogo (perfil e placar do Astromante).
   Rodar:  node tests/engine.test.js   (usa os dados em site/data/pt e o mesmo código do site) */
const assert = require('assert');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');
global.window = globalThis;
global.self = globalThis;
require(path.join(SITE, 'assets', 'st-pure.js'));
const ST = globalThis.ST;
// o motor vive no mesmo arquivo da página; a parte de interface só é registrada, nunca executada aqui
Object.assign(ST, { addI18n() {}, page() {}, overlay() {}, account: { active: () => false, get: () => null } });
require(path.join(SITE, 'assets', 'pages', 'hypermax.js'));
for (const f of ['items', 'classes', 'skills', 'progression']) require(path.join(SITE, 'data', 'pt', f + '.js'));

const E = ST.hmDebug, K = ST.progression.constants, D = ST.items, skills = ST.skills;
const astro = ST.classes.find((c) => c.uid === 'astramancer');
const OPT = { q: 4, lv: 50, tr: true, sf: true, col: true, en: true, sk: true, soon: false, profile: null };
const P = E.prepare(D, skills, K, OPT);
const fam = (f) => skills.find((s) => s.family === f);
const near = (a, b, rel, msg) => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel, `${msg}: ${a} vs ${b}`);

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };

test('fórmula de poder = perfil do herói no jogo (Astromante 1.399.539)', () => {
  const p = E.powerOf({ atk: 305201, def: 16387, hp: 1248, crit: 0.84, cm: 6.5, aggro: 10 }, K);
  near(p, 1399539, 0.0005, 'poder');
});

test('placar = perfil × Livro de Coleção (1.749.428 / 1.399.539 = 1,25)', () => {
  assert.ok(astro.cardBonus.includes(1.25), 'cartas da classe');
  near(1399539 * Math.max(...astro.cardBonus), 1749428, 0.00001, 'placar');
});

test('build do jogo: crítico 84%, dano crítico ×6,5, elemento 180', () => {
  const r0 = E.optimize(astro, P, skills, K, OPT);
  const X = (u) => P.items.find((x) => x.it.uid === u);
  const lev = P.spirits.find((s) => s.e.uid === 'leviathan');
  const obl = P.elements.find((e) => e.e.uid === 't14dark'), turb = P.elements.find((e) => e.e.uid === 't14water');
  const gear = ['eclipsecatalyst', 'roserobe', 'artifactmagehat', 'hauntedgloves', 't16scroll', 'boarshield'].map((u, k) => ({ x: X(u), el: k === 0 ? obl : turb, sp: lev }));
  const r = E.evaluate(r0.ctx, gear, ['s_megacritmult', 's_arcanemaster', 's_megacrit', 'p_doublecast'].map(fam));
  near(r.crit, 0.84, 0.002, 'crítico');
  assert.strictEqual(r.cm, 6.5, 'dano crítico');
  assert.strictEqual(Math.round(r.E), 180, 'elemento');
  near(r.power / r0.ctx.colMult, 1399539, 0.03, 'poder no perfil (margem conhecida de ~2%)');
});

let builds;
test('melhor build do Astromante = build dos primeiros do placar', () => {
  const b = E.optimize(astro, P, skills, K, OPT);
  assert.deepStrictEqual([...new Set(b.gear.map((g) => g.sp.e.uid))], ['leviathan'], 'Leviatã em todos');
  assert.deepStrictEqual(b.chosen.map((f) => f.family).sort(), ['p_doublecast', 's_arcanemaster', 's_megacrit', 's_megacritmult'], 'habilidades');
  assert.strictEqual(b.gear[0].x.it.uid, 'eclipsecatalyst', 'arma');
  assert.ok(['dark', 'light'].includes(b.gear[0].el.el), 'runa de afinidade na arma');
  assert.strictEqual(b.gear.slice(1).filter((g) => g.el.el === 'water').length, 5, '5 runas de água');
});

test('Astromante é o 1º do ranking (como no placar global)', () => {
  builds = ST.classes.map((c) => E.optimize(c, P, skills, K, OPT)).sort((a, b) => b.power - a.power);
  assert.strictEqual(builds[0].c.uid, 'astramancer');
});

test('auditoria: nenhuma troca de item, runa ou espírito melhora alguma classe', () => {
  const issues = [];
  for (const b of builds) b.gear.forEach((g, k) => {
    if (!g) return;
    const codes = b.c.slots[k].map((x) => x.code), cur = E.evaluate(b.ctx, b.gear, b.chosen).power;
    const els = [g.el, ...P.elements.filter((e) => e.el === b.c.element).sort((x, y) => y.val - x.val).slice(0, 2)];
    for (const x of P.items) if (x.codes.some((cd) => codes.includes(cd))) for (const el of els) {
      const gg = b.gear.slice(); gg[k] = { x, el, sp: g.sp };
      if (E.evaluate(b.ctx, gg, b.chosen).power > cur * 1.0005) { issues.push(`${b.c.uid} ${k} ${x.it.uid}`); return; }
    }
    for (const sp of P.spirits) {
      const gg = b.gear.slice(); gg[k] = { ...g, sp };
      if (E.evaluate(b.ctx, gg, b.chosen).power > cur * 1.0005) { issues.push(`${b.c.uid} ${k} espírito ${sp.e.uid}`); return; }
    }
  });
  assert.deepStrictEqual(issues, [], 'trocas melhores encontradas');
});

console.log(`\n${pass} testes passaram`);
