/* Calcula o Hypermax de todas as classes com o MESMO motor do site (site/assets/pages/hypermax.js) e grava um
   resumo em JSON para as páginas estáticas (p/<lang>/class/<uid>.html), que os buscadores indexam.
   Uso: node extractor/hm_static.js <saída.json> [idiomas...]   (chamado pelo extract.py; precisa do Node 16+) */
const fs = require('fs');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');
const out = process.argv[2] || path.join(__dirname, 'hm_static.json');
const langs = process.argv.slice(3).length ? process.argv.slice(3) : ['pt', 'en'];
global.window = globalThis;
global.self = globalThis;
require(path.join(SITE, 'assets', 'st-pure.js'));
const ST = globalThis.ST;
Object.assign(ST, { addI18n() {}, page() {}, overlay() {}, account: { active: () => false, get: () => null } });
require(path.join(SITE, 'assets', 'pages', 'hypermax.js'));

const OPT = { q: 4, lv: 50, tr: true, sf: true, col: true, en: true, sk: true, soon: false, profile: null };
const result = {};
for (const lang of langs) {
  for (const f of ['items', 'classes', 'skills', 'progression']) {
    const file = path.join(SITE, 'data', lang, f + '.js');
    delete require.cache[require.resolve(file)];
    require(file);
  }
  const E = ST.hmDebug, K = ST.progression.constants || {};
  const P = E.prepare(ST.items, ST.skills, K, OPT);
  const builds = ST.classes.map((c) => E.optimize(c, P, ST.skills, K, OPT)).sort((a, b) => b.power - a.power);
  result[lang] = {};
  builds.forEach((b, i) => {
    result[lang][b.c.uid] = {
      rank: i + 1, of: builds.length, lv: b.lv, power: Math.round(b.power), profile: Math.round(b.profile.power),
      atk: Math.round(b.atk), def: Math.round(b.def), hp: Math.round(b.hp), crit: +Math.min(b.crit, 1).toFixed(3), cm: +b.cm.toFixed(2),
      eva: +b.eva.toFixed(3), E: Math.round(b.E),
      gear: b.gear.map((g) => (g ? { uid: g.x.it.uid, name: g.x.it.name, tier: g.x.it.tier, rune: g.el ? g.el.e.name : null, spirit: g.sp ? g.sp.e.name : null } : null)),
      skills: b.active.filter((a) => !a.spirit).map((a) => ({ name: a.tt.name || a.f.name, tier: a.tt.tier || 0 })),
      link: `hypermax/${b.c.uid}`,
    };
  });
}
fs.writeFileSync(out, JSON.stringify(result));
console.log(`hypermax estático: ${langs.map((l) => `${l} ${Object.keys(result[l]).length}`).join(', ')} -> ${out}`);
