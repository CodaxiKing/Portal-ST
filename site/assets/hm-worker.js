/* Web Worker do Hypermax: calcula todas as classes fora da página (a interface não trava).
   Recebe {lang, v, opts, classes} e devolve só ids (itens, runas, espíritos, habilidades); a página reconstrói. */
self.window = self;
// mesma versão de código da página (?c=...), para não usar uma cópia antiga em cache
const CODE_V = new URLSearchParams(self.location.search).get('c') || '';
importScripts('st-pure.js?v=' + CODE_V);
const ST = self.ST;
Object.assign(ST, { addI18n() {}, page() {}, overlay() {}, account: { active: () => false, get: () => null } });
importScripts('pages/hypermax.js?v=' + CODE_V);
let loaded = null;
self.onmessage = (ev) => {
  const { lang, v, opts, classes } = ev.data;
  try {
    if (loaded !== lang) {
      const q = '?v=' + encodeURIComponent(v || '');
      importScripts(...['items', 'classes', 'skills', 'progression'].map((f) => `../data/${lang}/${f}.js${q}`));
      loaded = lang;
    }
    const E = ST.hmDebug, K = ST.progression.constants || {};
    const P = E.prepare(ST.items, ST.skills, K, opts);
    const list = classes.map((u) => ST.classes.find((c) => c.uid === u)).filter(Boolean);
    const choices = [];
    list.forEach((c, i) => {
      choices.push(E.toChoice(E.optimize(c, P, ST.skills, K, opts)));
      self.postMessage({ type: 'progress', done: i + 1, total: list.length });
    });
    self.postMessage({ type: 'done', choices });
  } catch (e) {
    self.postMessage({ type: 'error', message: String(e && e.message || e) });
  }
};
