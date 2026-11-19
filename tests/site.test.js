/* Testes das partes do site que não dependem do navegador: .ics do calendário, montador (mesmo resultado do
   Hypermax a partir das escolhas), dados do calendário e dos eventos, e índice de busca.
   Rodar:  node tests/site.test.js */
const assert = require('assert');
const path = require('path');

const SITE = path.join(__dirname, '..', 'site');
global.window = globalThis;
global.self = globalThis;
require(path.join(SITE, 'assets', 'st-pure.js'));
const ST = globalThis.ST;
Object.assign(ST, { addI18n() {}, page() {}, overlay() {}, account: { active: () => false, get: () => null } });
require(path.join(SITE, 'assets', 'pages', 'hypermax.js'));
for (const f of ['items', 'classes', 'skills', 'progression', 'calendar', 'events', 'search', 'quests', 'eventrewards']) require(path.join(SITE, 'data', 'pt', f + '.js'));
require(path.join(SITE, 'data', 'icons.js'));

let pass = 0;
const test = (name, fn) => { fn(); pass++; console.log('ok -', name); };
const ICONS = new Set(ST.icons);

test('.ics: cabeçalho, evento de dia inteiro, escapes e linhas dobradas', () => {
  const txt = ST.icsText([{ uid: 'x', date: '2026-12-31', title: 'Teste, com; vírgula', desc: 'a\nb'.repeat(40) }], new Date('2026-11-09T00:00:00Z'));
  assert.ok(txt.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'));
  assert.ok(txt.includes('DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101'), 'virada de ano');
  assert.ok(txt.includes('SUMMARY:Teste\\, com\\; vírgula'), 'escapes');
  assert.ok(txt.split('\r\n').every((l) => l.length <= 75), 'linhas até 75 caracteres');
  assert.ok(txt.endsWith('END:VCALENDAR\r\n'));
});

test('montador: as escolhas do Hypermax reconstruídas dão o mesmo poder', () => {
  const E = ST.hmDebug, K = ST.progression.constants;
  const o = { q: 4, lv: 50, tr: true, sf: true, col: true, en: true, sk: true, soon: false, profile: null };
  const P = E.prepare(ST.items, ST.skills, K, o);
  for (const uid of ['astramancer', 'knight', 'ninja']) {
    const c = ST.classes.find((x) => x.uid === uid);
    const b = E.optimize(c, P, ST.skills, K, o);
    const again = E.rebuild(c, P, ST.skills, K, o, E.toChoice(b)); // o mesmo caminho do link do montador
    assert.ok(Math.abs(again.power - b.power) < 1e-6, `${uid}: ${again.power} vs ${b.power}`);
  }
});

test('calendário: eventos de login com data, dias e ícone exportado', () => {
  const L = ST.calendar.logins;
  assert.ok(L.length >= 10);
  for (const g of L) {
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(g.d), g.id + ' data');
    assert.ok(g.days.length > 0, g.id + ' dias');
    assert.ok(ICONS.has(g.icon), g.id + ' ícone ' + g.icon);
    for (const d of g.days) for (const r of d.r) assert.ok(r.t !== 'gems' || r.q > 0, g.id + ' gemas');
  }
});

test('eventos: recorrentes e de comunidade com ícone; Cidade Perdida de Ouro com níveis e recompensas', () => {
  for (const r of ST.events.recurring) assert.ok(ICONS.has(r.icon), 'recorrente ' + r.id);
  assert.ok(ST.events.community.filter((c) => ICONS.has(c.icon)).length >= 8, 'banners de comunidade');
  const z = ST.quests.find((x) => x.id === 'goldcity');
  assert.ok(z && z.levels.length >= 20, 'níveis');
  assert.ok(ST.eventrewards.events.find((e) => e.id === 'goldcity').families.length > 0, 'trilhas de recompensa');
});

test('Capricho do Rei: loja com data de entrada = lançamento + atraso, e regras dos pedidos', () => {
  const K = ST.events.king;
  assert.ok(K.shop.length > 1000, 'itens na loja');
  for (const x of K.shop) assert.strictEqual(x.e, ST.addDays(x.r, x.d), x.u);
  assert.strictEqual(K.shop.find((x) => x.u === 'fairytalesword').e, '2026-11-15', 'Contos de Fadas: 19/05 + 180 dias');
  assert.deepStrictEqual(K.rules.slots, [3600, 7200, 10800]);
  assert.ok(K.rules.types.length >= 20 && K.rules.shop.max === 6);
});

test('Caravana: datas a partir do dia marcado (com e sem pausa entre rotas)', () => {
  const D = ST.events.caravan.days;
  const p = ST.caravanProject(D, { date: '2026-11-10', uid: 'caravan1_03', gap: 0 }, '2026-11-10', 12);
  assert.deepStrictEqual(p.slice(0, 4).map((x) => x.day.uid), ['caravan1_03', 'caravan1_04', 'caravan1_05', 'caravan2_01']);
  assert.strictEqual(p[10].day.uid, 'caravan1_03', 'ciclo de 10 dias');
  const g = ST.caravanProject(D, { date: '2026-11-10', uid: 'caravan1_05', gap: 2 }, '2026-11-10', 3);
  assert.deepStrictEqual(g.map((x) => x.date), ['2026-11-10', '2026-11-13', '2026-11-14'], '2 dias sem caravana depois da rota');
});

test('Caravana: montador respeita a grade, o formato e o limite de lugares', () => {
  const C = ST.events.caravan, grid = C.maps.caravan01, free = String(grid.map).split(',');
  const items = ST.items.items.filter((i) => i.value > 0 && !['z', 'm', 'ma'].includes(i.type)).slice(0, 300);
  const cands = items.map((i) => ({ id: i.uid, s: i.value, sh: C.shapes[i.uid] || C.shapes[i.type] || { w: 1, l: 1, map: '1' }, cats: [] }));
  const r = ST.caravanPack(grid, cands, { maxItems: 10, stack: 3, wanted: [], rotate: false, repeat: true, iters: 30 });
  assert.ok(r.placements.length <= 10 && r.placements.length > 0);
  const used = new Set();
  for (const pl of r.placements) for (const c of pl.cells) { assert.strictEqual(free[c], '1', 'só quadrados livres'); assert.ok(!used.has(c), 'sem sobreposição'); used.add(c); }
  for (const pl of r.placements) assert.strictEqual(pl.cells.length, String((cands.find((x) => x.id === pl.id).sh.map || '1')).split(',').filter((x) => x === '1').length, 'formato inteiro');
});

test('busca: inclui passes, histórias, skins e eventos de login', () => {
  const kinds = new Set(ST.search.map((e) => e[0]));
  for (const k of ['i', 'k', 'a', 'h', 'n', 'l']) assert.ok(kinds.has(k), 'tipo ' + k);
});

test('traduções: os 11 idiomas além de pt/en cobrem os textos das páginas (ST.tr)', () => {
  const fs = require('fs');
  const dir = path.join(SITE, 'assets');
  const files = fs.readdirSync(path.join(dir, 'pages')).map((f) => path.join(dir, 'pages', f)).concat([path.join(dir, 'core.js'), path.join(dir, 'search.js')]);
  const re = /trf?\(\s*(["'`])((?:\\.|(?!\1).)*)\1\s*,\s*(["'`])((?:\\.|(?!\3).)*)\3\s*[,)]/gs;
  const en = new Set();
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(s))) {
      if (m[3] === '`' && m[4].includes('${')) continue;
      en.add(m[3] === "'" ? m[4].replace(/\\'/g, "'") : m[3] === '"' ? m[4].replace(/\\"/g, '"') : m[4]);
    }
  }
  const TR = {};
  ST.addTr = (l, d) => (TR[l] = d);
  for (const l of ['es', 'fr', 'de', 'it', 'ru', 'uk', 'tk', 'ja', 'ko', 'zh', 'zh_tr']) {
    require(path.join(dir, 'i18n', l + '.js'));
    const missing = [...en].filter((x) => !TR[l][x]);
    if (missing.length) console.log(`   ${l}: ${missing.length} texto(s) sem tradução:\n     - ${missing.join('\n     - ')}`);
    assert.ok(missing.length <= en.size * 0.05, `${l}: ${missing.length} sem tradução`);
  }
});

console.log(`\n${pass} testes passaram`);
