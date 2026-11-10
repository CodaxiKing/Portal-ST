/* Ferramentas extras: onde conseguir, lista de fabricação, comparador, encantamentos,
   planejador de talentos, custos até o nível N e calendário de lançamentos. */
(() => {
  const { t, tr, esc, nf, short, dur, dec, img, icon } = ST;
  ST.addI18n({
    pt: { craftList: 'Lista de fabricação', compare: 'Comparador', whereToGet: 'Onde conseguir', enchantPlanner: 'Encantamentos',
      talentPlanner: 'Planejador de talentos', upgradeCosts: 'Custos de melhoria', releases: 'Lançamentos' },
    en: { craftList: 'Crafting list', compare: 'Compare items', whereToGet: 'Where to get', enchantPlanner: 'Enchantments',
      talentPlanner: 'Talent planner', upgradeCosts: 'Upgrade costs', releases: 'Releases' },
  });
  const coin = ST.ic('coin'), gem = ST.ic('gem');
  // poder de herói pelas constantes do jogo (ATQ×0,8 + DEF×1,2 + PV×5)
  const store = {
    get(k, def) { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const picker = (items, id, ph) => `<input class="inp" id="${id}" list="${id}-list" placeholder="${ph || tr('Digite o nome do item…', 'Type an item name…')}" style="min-width:260px">
    <datalist id="${id}-list">${items.map((i) => `<option value="${esc(i.name)}">T${i.tier} · ${esc(ST.typeName(i.type))}</option>`).join('')}</datalist>`;
  const onPick = (el, id, items, fn) => el.querySelector('#' + id).addEventListener('change', (e) => {
    const it = items.find((i) => i.name === e.target.value);
    if (it) fn(it);
  });
  const avgQty = (q) => { const p = String(q).split(',').map(Number).filter((x) => !isNaN(x)); return p.length ? p.reduce((a, b) => a + b, 0) / p.length : 0; };
  const qtyTxt = (q) => String(q).split(',').map((x) => dec(+x, 1)).join('–');

  // ================================================================ onde conseguir
  /* Fontes de um material: níveis de missão que o derrubam e baús que o contêm. */
  let SRC_CACHE = null;
  async function sourcesIndex() {
    if (SRC_CACHE) return SRC_CACHE;
    const [zones, chests] = await ST.need('quests', 'chests');
    const map = new Map();
    const push = (id, x) => { if (!map.has(id)) map.set(id, { quests: [], chests: [] }); map.get(id)[x.kind].push(x); };
    for (const z of zones) z.levels.forEach((l, n) => (l.comps || []).forEach((c) => push(c.id, {
      kind: 'quests', zone: z, level: l, n: n + 1, qty: c.qty, avg: avgQty(c.qty), perHour: l.time ? avgQty(c.qty) / ((l.time + (l.rest || 0)) / 3600) : 0,
    })));
    for (const b of chests) (b.comps || []).forEach((c) => push(c.id, { kind: 'chests', chest: b, qty: c.qty, avg: avgQty(c.qty) }));
    return (SRC_CACHE = map);
  }
  ST.sourcesIndex = sourcesIndex;
  ST.sourcesHTML = (src) => {
    if (!src) return '';
    const q = src.quests.slice().sort((a, b) => b.perHour - a.perHour);
    return `${q.length ? `<div class="list">${q.slice(0, 8).map((s, i) => `<a class="row" href="#/missoes/${s.zone.id}">${img(s.zone.icon)}
      <div class="grow">${esc(s.zone.name)} <span class="muted small">${t('level')} ${s.n}${s.level.boss ? ' · ' + tr('chefe', 'boss') : ''}</span>
      ${i === 0 ? ` <span class="badge">${tr('melhor', 'best')}</span>` : ''}</div>
      <div class="r">${qtyTxt(s.qty)} · ${dec(s.perHour, 1)}/h</div></a>`).join('')}</div>` : ''}
      ${src.chests.length ? `<div class="list" style="margin-top:8px">${src.chests.map((s) => `<a class="row" href="#/baus">${img(s.chest.icon)}
      <div class="grow">${esc(s.chest.name)}</div><div class="r">${qtyTxt(s.qty)}</div></a>`).join('')}</div>` : ''}`;
  };

  ST.page('onde', {
    nav: 'onde', title: () => t('whereToGet'),
    async render(el, [id]) {
      const [{ d, by }, map] = await Promise.all([ST.itemsIndex(), sourcesIndex()]);
      const mats = [...map.keys()].map((k) => by.get(k) || { uid: k, name: ST.refName(k), tier: 0, type: 'm' });
      if (id) {
        const m = by.get(id), src = map.get(id);
        if (!src) { el.innerHTML = ST.notFound(); return; }
        const used = d.items.filter((i) => i.components.some((c) => c.id === id));
        el.innerHTML = `<a class="crumb" href="#/onde">${ST.ic('left')} ${t('whereToGet')}</a>
          <header class="detail-head" style="margin-top:14px"><div class="thumb">${img(id)}</div><div>
          <h1 class="d-title">${esc(m ? m.name : ST.refName(id))}</h1><p class="d-sub">${tr('Ordenado pela quantidade por hora (missão + descanso).', 'Sorted by quantity per hour (quest + rest).')}</p></div></header>
          ${ST.sec(tr('Missões', 'Quests'), ST.table(src.quests, [
            { key: 'zone', label: tr('Área', 'Area'), fmt: (s) => `<a class="cell-item" href="#/missoes/${s.zone.id}">${img(s.zone.icon)}<span>${esc(s.zone.name)}</span></a>`, sort: (s) => s.zone.name },
            { key: 'n', label: t('level'), num: true, fmt: (s) => s.n + (s.level.boss ? ` <span class="badge">${tr('chefe', 'boss')}</span>` : '') },
            { key: 'power', label: t('power'), num: true, fmt: (s) => nf(s.level.power), sort: (s) => s.level.power },
            { key: 'qty', label: tr('Qtd. por missão', 'Qty per quest'), num: true, fmt: (s) => qtyTxt(s.qty), sort: (s) => s.avg },
            { key: 'time', label: t('time'), num: true, fmt: (s) => dur(s.level.time), sort: (s) => s.level.time },
            { key: 'perHour', label: tr('Por hora', 'Per hour'), num: true, fmt: (s) => dec(s.perHour, 1) }], { sortKey: 'perHour', sortDir: -1 }))}
          ${src.chests.length ? ST.sec(t('chests'), ST.sourcesHTML({ quests: [], chests: src.chests })) : ''}
          ${used.length ? ST.sec(`${tr('Usado em', 'Used in')} (${used.length})`, `<div class="tags">${used.map((i) => ST.itemChip(i.uid, ` <span class="muted">T${i.tier}</span>`)).join('')}</div>`) : ''}`;
        return;
      }
      const rows = mats.map((m) => {
        const s = map.get(m.uid), best = s.quests.slice().sort((a, b) => b.perHour - a.perHour)[0];
        return { m, best, n: s.quests.length, c: s.chests.length, ph: best ? best.perHour : 0, name: m.name };
      });
      el.innerHTML = ST.pageHead(t('whereToGet'), tr('Todos os materiais que caem em missões e baús, com a melhor área para farmar cada um.',
        'Every material dropped by quests and chests, with the best area to farm each one.')) +
        ST.table(rows, [
          { key: 'name', label: tr('Material', 'Material'), fmt: (r) => `<a class="cell-item" href="#/onde/${r.m.uid}">${img(r.m.uid)}<span>${esc(r.name)}</span></a>` },
          { key: 'best', label: tr('Melhor área', 'Best area'), fmt: (r) => (r.best ? `${esc(r.best.zone.name)} <span class="muted small">${t('level')} ${r.best.n}</span>` : '—'), sort: (r) => (r.best ? r.best.zone.name : '') },
          { key: 'ph', label: tr('Por hora', 'Per hour'), num: true, fmt: (r) => (r.ph ? dec(r.ph, 1) : '—') },
          { key: 'n', label: tr('Níveis de missão', 'Quest levels'), num: true },
          { key: 'c', label: t('chests'), num: true }], { sortKey: 'name', rowAttr: (r) => `data-href="#/onde/${r.m.uid}"` });
      el.querySelector('tbody').addEventListener('click', (e) => { const tr_ = e.target.closest('tr[data-href]'); if (tr_ && !e.target.closest('a')) location.hash = tr_.dataset.href; });
    },
  });

  // ================================================================ planejador de talentos
  ST.page('planejador', {
    nav: 'planejador', title: () => t('talentPlanner'),
    async render(el, args, query) {
      const [tree] = await ST.need('skilltree');
      const trees = tree.trees;
      const cur = trees.find((x) => x.id === query.get('t')) || trees[0];
      const ranks = {};
      (query.get('r') || '').split(',').filter(Boolean).forEach((p) => { const [f, n] = p.split(':'); ranks[f] = +n || 0; });
      const all = trees.flatMap((tr_) => tr_.nodes.map((n) => ({ tree: tr_, n })));
      let pts = 0, gold = 0, gems = 0, bp = 0;
      const picked = [];
      for (const { tree: tt, n } of all) {
        const r = Math.min(ranks[n.family] || 0, n.ranks.length);
        if (!r) continue;
        pts += r;
        n.ranks.slice(0, r).forEach((x) => { gold += x.gold || 0; gems += x.gems || 0; bp += x.bp || 0; });
        picked.push({ tt, n, r });
      }
      const ptCost = tree.points.slice(0, Math.max(0, pts)).reduce((a, p) => ({ g: a.g + p.goldCost, m: a.m + p.gemsCost }), { g: 0, m: 0 });
      const enc = () => Object.entries(ranks).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(',');
      el.innerHTML = ST.pageHead(t('talentPlanner'), tr('Distribua pontos nas árvores e veja o total gasto e os bônus. O link da página guarda o plano.',
        'Spend points across the trees and see the totals and bonuses. The page link stores the plan.')) +
        ST.tabs(trees.map((x) => [`#/planejador?t=${x.id}${enc() ? '&r=' + enc() : ''}`, esc(x.name)]), `#/planejador?t=${cur.id}${enc() ? '&r=' + enc() : ''}`) +
        `<div class="two-col"><div>
          <div class="tiles">${cur.nodes.map((n) => { const r = Math.min(ranks[n.family] || 0, n.ranks.length), rk = n.ranks[r - 1];
            return `<div class="tile tp-node ${r ? 'on' : ''}" style="align-items:flex-start"><div class="thumb">${img(n.icon)}</div><div class="tile-body">
              <div class="tile-title">${esc(n.title)}${n.epic ? ' <span class="badge">epic</span>' : ''}</div><div class="tile-sub">${esc(n.desc || '')}</div>
              <div class="tp-ctl"><button class="chip" data-f="${n.family}" data-d="-1" ${r ? '' : 'disabled'} aria-label="-">−</button>
              <span class="tp-r">${r}/${n.ranks.length}</span><button class="chip" data-f="${n.family}" data-d="1" ${r < n.ranks.length ? '' : 'disabled'} aria-label="+">+</button>
              ${rk ? `<span class="tp-v">${esc(rk.value)}</span>` : ''}</div></div></div>`; }).join('')}</div>
        </div><div>
          ${ST.stats([ST.stat(tr('Pontos gastos', 'Points spent'), nf(pts)), ST.stat(tr('Ouro dos nós', 'Node gold'), short(gold) + ' ' + coin, 'gold'), ST.stat(tr('Gemas dos nós', 'Node gems'), nf(gems) + ' ' + gem)])}
          ${ST.sec(tr('Custo dos pontos', 'Point cost'), `<p class="small">${tr(`Comprar ${nf(pts)} pontos, na ordem da tabela do jogo:`, `Buying ${nf(pts)} points, in the game table order:`)} <b>${short(ptCost.g)}</b> ${coin} · <b>${nf(ptCost.m)}</b> ${gem}</p>`,
            pts > tree.points.length ? tr('Mais pontos do que a tabela do jogo lista.', 'More points than the game table lists.') : '')}
          ${ST.sec(tr('Bônus escolhidos', 'Chosen bonuses'), picked.length ? `<div class="list">${picked.map(({ tt, n, r }) => `<div class="row">${img(n.icon)}<div class="grow">${esc(n.title)} <span class="muted small">${esc(tt.name)}</span></div><div class="r">${esc(n.ranks[r - 1].value)}</div></div>`).join('')}</div>` : `<p class="muted">${t('none')}</p>`)}
          ${picked.length ? `<p><button class="chip" id="reset">${tr('Zerar plano', 'Reset plan')}</button></p>` : ''}
        </div></div>`;
      const set = () => ST.setQuery({ r: enc() }) || ST.rerender();
      el.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => {
        const n = cur.nodes.find((x) => x.family === b.dataset.f);
        ranks[n.family] = Math.max(0, Math.min(n.ranks.length, (ranks[n.family] || 0) + +b.dataset.d));
        set();
      }));
      const rs = el.querySelector('#reset'); if (rs) rs.addEventListener('click', () => { for (const k in ranks) ranks[k] = 0; set(); });
    },
  });

  // ================================================================ custos até o nível N
  ST.page('custos', {
    nav: 'custos', title: () => t('upgradeCosts'),
    async render(el, args, query) {
      const [furn, city, tree] = await ST.need('furniture', 'city', 'skilltree');
      const kind = query.get('k') || 'w';
      // cada fonte vira uma lista de passos {label, gold, gems, time, other}
      const SRC = {
        w: { label: tr('Construções', 'Buildings'), list: (city.buildings || []).filter((x) => x.levels.length > 1).map((x) => ({ id: x.family, name: x.name, icon: x.icon,
          steps: x.levels.slice(1).map((l) => ({ label: `${t('level')} ${l.level}`, ticks: l.ticks, note: l.bonus ? `${tr('bônus', 'bonus')} ${l.bonus}` : '' })) })) },
        f: { label: t('furniture'), list: furn.map((x) => ({ id: x.family, name: x.name, icon: (x.levels[0] || {}).uid,
          steps: x.levels.flatMap((l, li) => (l.costs || []).map((c, ci) => ({ label: `${li + 1}.${ci + 1}`, gold: c.gold, gems: c.gems, time: c.time }))) })).filter((x) => x.steps.length) },
        g: { label: t('guild'), list: city.upgrades.map((x) => ({ id: x.family, name: x.name, icon: '',
          steps: x.levels.map((l) => ({ label: `${t('level')} ${l.level}`, other: l.cost, note: (x.desc || '').replace('{0}', l.value) })) })) },
        p: { label: tr('Pontos de talento', 'Talent points'), list: [{ id: 'points', name: tr('Pontos de talento', 'Talent points'), icon: 'icon_skilltree_maxEnergy',
          steps: tree.points.map((p, i) => ({ label: `#${i + 1} (${t('level')} ${p.minLevel})`, gold: p.goldCost, gems: p.gemsCost })) }] },
      };
      const S = SRC[kind] || SRC.w;
      const ent = S.list.find((x) => x.id === query.get('id')) || S.list[0];
      const n = ent ? ent.steps.length : 0;
      const from = Math.max(0, Math.min(n, +(query.get('a') || 0))), to = Math.max(from, Math.min(n, +(query.get('b') || n)));
      const steps = ent ? ent.steps.slice(from, to) : [];
      const sum = (k) => steps.reduce((a, s) => a + (s[k] || 0), 0);
      el.innerHTML = ST.pageHead(t('upgradeCosts'), tr('Some o custo de vários níveis de uma vez: trabalhadores, móveis, guilda e pontos de talento.', 'Add up several levels at once: workers, furniture, guild and talent points.')) +
        ST.tabs(Object.entries(SRC).map(([k, v]) => [`#/custos?k=${k}`, v.label]), `#/custos?k=${kind}`) +
        (ent ? `<div class="form-row">
          <label class="field">${tr('Escolha', 'Pick')}<select class="inp" id="ent">${S.list.map((x) => `<option value="${esc(x.id)}" ${x === ent ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="field">${tr('Do passo', 'From step')}<select class="inp" id="a">${Array.from({ length: n + 1 }, (_, i) => `<option value="${i}" ${i === from ? 'selected' : ''}>${i ? esc(ent.steps[i - 1].label) : tr('início', 'start')}</option>`).join('')}</select></label>
          <label class="field">${tr('Até', 'To')}<select class="inp" id="b">${Array.from({ length: n + 1 }, (_, i) => `<option value="${i}" ${i === to ? 'selected' : ''}>${i ? esc(ent.steps[i - 1].label) : tr('início', 'start')}</option>`).join('')}</select></label></div>
          ${ST.stats([sum('gold') && ST.stat(tr('Ouro', 'Gold'), nf(sum('gold')) + ' ' + coin, 'gold'), sum('gems') && ST.stat(tr('Gemas', 'Gems'), nf(sum('gems')) + ' ' + gem),
            sum('time') && ST.stat(t('time'), dur(sum('time'))), sum('other') && ST.stat(tr('Recursos de guilda', 'Guild resources'), nf(sum('other'))),
            sum('ticks') && ST.stat(tr('Pontos de investimento', 'Investment points'), nf(sum('ticks'))),
            ST.stat(tr('Passos', 'Steps'), nf(steps.length))])}
          ${steps.length ? ST.sec(tr('Passo a passo', 'Step by step'), ST.table(steps.map((s, i) => ({ ...s, i })), [
            { key: 'label', label: t('level'), sort: (s) => s.i },
            ...(sum('gold') ? [{ key: 'gold', label: tr('Ouro', 'Gold'), num: true, fmt: (s) => nf(s.gold) }] : []),
            ...(sum('gems') ? [{ key: 'gems', label: tr('Gemas', 'Gems'), num: true, fmt: (s) => nf(s.gems) }] : []),
            ...(sum('time') ? [{ key: 'time', label: t('time'), num: true, fmt: (s) => dur(s.time) }] : []),
            ...(sum('other') ? [{ key: 'other', label: tr('Recursos', 'Resources'), num: true, fmt: (s) => nf(s.other) }] : []),
            ...(sum('ticks') ? [{ key: 'ticks', label: tr('Investimento', 'Investment'), num: true, fmt: (s) => nf(s.ticks) }] : []),
            { key: 'note', label: tr('Detalhe', 'Detail'), fmt: (s) => esc(s.note || '') }])) : ''}`
          : ST.empty(t('none'), ''));
      const nav = (o) => { ST.setQuery(o); ST.rerender(); };
      const q = (s) => el.querySelector(s);
      if (q('#ent')) {
        q('#ent').addEventListener('change', (e) => nav({ id: e.target.value, a: '', b: '' }));
        q('#a').addEventListener('change', (e) => nav({ a: e.target.value }));
        q('#b').addEventListener('change', (e) => nav({ b: e.target.value }));
      }
    },
  });

  // ================================================================ lançamentos
  ST.page('lancamentos', {
    nav: 'lancamentos', title: () => t('releases'),
    async render(el, args, query) {
      const { d } = await ST.itemsIndex();
      const [furn] = await ST.need('furniture');
      const today = new Date().toISOString().slice(0, 10);
      const mode = query.get('v') || 'next';
      const all = [
        ...d.items.filter((i) => i.releaseAt).map((i) => ({ date: i.releaseAt, name: i.name, icon: i.uid, sub: `T${i.tier} · ${ST.typeName(i.type)}`, href: `#/item/${i.uid}` })),
        ...furn.filter((f) => f.releaseAt).map((f) => ({ date: f.releaseAt, name: f.name, icon: (f.levels[0] || {}).uid, sub: t('furniture'), href: `#/moveis?t=${f.type}` })),
      ];
      const undated = (x) => x.date >= '2090';
      const rows = all.filter((x) => (mode === 'next' ? x.date > today : mode === 'past' ? x.date <= today : true)).sort((a, b) => (mode === 'past' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));
      const groups = new Map();
      rows.forEach((x) => { const k = undated(x) ? '~' : x.date.slice(0, 7); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
      const month = (k) => (k === '~' ? tr('Sem data definida', 'No date set') : new Date(k + '-15').toLocaleDateString(ST.locale, { month: 'long', year: 'numeric' }));
      const days = (dt) => Math.round((new Date(dt) - new Date(today)) / 864e5);
      el.innerHTML = ST.pageHead(t('releases'), tr('Datas de lançamento gravadas nos arquivos do jogo. Itens futuros já existem nos dados, mas ainda não estão disponíveis.',
        'Release dates stored in the game files. Upcoming items already exist in the data but are not available yet.')) +
        ST.tabs([['#/lancamentos?v=next', tr('Próximos', 'Upcoming')], ['#/lancamentos?v=past', tr('Já lançados', 'Released')], ['#/lancamentos?v=all', tr('Todos', 'All')]], `#/lancamentos?v=${mode}`) +
        (rows.length ? [...groups].map(([k, list]) => `<h2 class="group-title">${esc(month(k))} <span class="muted small">${list.length}</span></h2>
          <div class="tiles">${list.map((x) => `<a class="tile" href="${x.href}"><div class="thumb">${img(x.icon)}</div><div class="tile-body">
            <div class="tile-title">${esc(x.name)}</div><div class="tile-sub">${esc(x.sub)}</div>
            <div class="small" style="margin-top:4px;font-family:var(--mono)">${undated(x) ? '—' : new Date(x.date + 'T12:00').toLocaleDateString(ST.locale)}${
              !undated(x) && x.date > today ? ` <span class="badge">${tr(`em ${days(x.date)} d`, `in ${days(x.date)} d`)}</span>` : ''}</div></div></a>`).join('')}</div>`).join('')
          : ST.empty(tr('Nada por aqui', 'Nothing here'), tr('Não há itens com data nesse filtro.', 'No dated items in this filter.'), '', { icon: 'box' }));
    },
  });
})();
