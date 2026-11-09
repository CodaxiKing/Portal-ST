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
  const pw = (s) => (s.atk || 0) * 0.8 + (s.def || 0) * 1.2 + (s.hp || 0) * 5;
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

  // ================================================================ lista de fabricação
  const LIST = 'st_craftlist';
  ST.listAdd = (uid, qty = 1) => {
    const l = store.get(LIST, []);
    const x = l.find((e) => e.uid === uid);
    if (x) x.qty += qty; else l.push({ uid, qty });
    store.set(LIST, l);
    return l.length;
  };
  function totalsFor(entries, opt, by) {
    const T = { res: {}, quest: {}, crafts: {}, time: 0, worker: {}, value: 0 };
    const add = (o, k, v) => (o[k] = (o[k] || 0) + v);
    const go = (it, qty, depth) => {
      const e = ST.effective(it, opt);
      T.time += e.time * qty;
      if (depth === 0) T.value += e.value * qty;
      if (e.time) it.workers.forEach((w) => add(T.worker, w.id, e.time * qty));
      if (depth > 0) add(T.crafts, it.uid, qty);
      e.res.filter((r) => r.qty > 0).forEach((r) => add(T.res, r.id, r.qty * qty));
      e.comps.filter((c) => c.qty > 0).forEach((c) => {
        const sub = by.get(c.id);
        if (sub && opt.expand && !sub.nonCraftable && (sub.resources.length || sub.components.length) && depth < 8) go(sub, c.qty * qty, depth + 1);
        else add(T.quest, c.id, c.qty * qty);
      });
    };
    entries.forEach((x) => by.get(x.uid) && go(by.get(x.uid), x.qty, 0));
    return T;
  }

  ST.page('lista', {
    nav: 'lista', title: () => t('craftList'),
    async render(el, args, query) {
      const { d, by } = await ST.itemsIndex();
      if (query.get('l')) { // importar de link compartilhado
        const imported = query.get('l').split(',').map((p) => p.split(':')).filter(([u]) => by.has(u)).map(([uid, q]) => ({ uid, qty: Math.max(1, +q || 1) }));
        store.set(LIST, imported);
        ST.setQuery({ l: '' });
      }
      const list = store.get(LIST, []).filter((x) => by.has(x.uid));
      const opt = store.get('st_listopt', { ms: true, sf: false, asc: false, expand: true });
      const craftable = d.items.filter((i) => !i.nonCraftable && (i.resources.length || i.components.length));
      const T = totalsFor(list, opt, by);
      const rows = (o, fmt) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="row">${icon(k) ? `<img src="${icon(k)}" alt="">` : ''}
        <div class="grow">${by.has(k) ? `<a href="#/item/${k}">${esc(ST.refName(k))}</a>` : esc(ST.refName(k))}</div><div class="r">${fmt(v)}</div></div>`).join('');
      const share = '#/lista?l=' + list.map((x) => `${x.uid}:${x.qty}`).join(',');
      el.innerHTML = ST.pageHead(t('craftList'), tr('Junte vários itens e veja todos os materiais somados. A lista fica salva neste navegador.',
        'Combine several items and see every material added up. The list is saved in this browser.')) + `
        <div class="form-row"><label class="field">${tr('Adicionar item', 'Add item')}${picker(craftable, 'add')}</label>
          <label class="check"><input type="checkbox" data-o="ms" ${opt.ms ? 'checked' : ''}> ${tr('Marcos', 'Milestones')}</label>
          <label class="check"><input type="checkbox" data-o="sf" ${opt.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
          <label class="check"><input type="checkbox" data-o="asc" ${opt.asc ? 'checked' : ''}> ${tr('Ascensão', 'Ascension')}</label>
          <label class="check"><input type="checkbox" data-o="expand" ${opt.expand ? 'checked' : ''}> ${tr('Fabricar sub-itens', 'Craft sub-items')}</label></div>
        ${list.length ? `<div class="list">${list.map((x) => { const it = by.get(x.uid); return `<div class="row">${img(it.uid)}
          <div class="grow"><a href="#/item/${it.uid}">${esc(it.name)}</a> <span class="muted small">T${it.tier}</span></div>
          <input class="inp" type="number" min="1" value="${x.qty}" data-q="${it.uid}" style="width:84px;font-family:var(--mono)">
          <a class="chip" href="#/calculadora/${it.uid}?qty=${x.qty}" title="${t('calculator')}">${ST.ic('hammer')}</a>
          <button class="chip" data-del="${it.uid}" aria-label="${tr('Remover', 'Remove')}">${ST.ic('close')}</button></div>`; }).join('')}</div>
          <div class="tags" style="margin-top:10px"><button class="chip" id="copy">${tr('Copiar link da lista', 'Copy list link')}</button><button class="chip" id="clear">${tr('Limpar lista', 'Clear list')}</button></div>
          ${ST.stats([ST.stat(tr('Valor de venda', 'Sale value'), nf(Math.round(T.value)) + ' ' + coin, 'gold'), ST.stat(tr('Tempo total', 'Total time'), dur(T.time)),
            ST.stat(tr('Fabricações', 'Crafts'), nf(list.reduce((a, x) => a + x.qty, 0) + Object.values(T.crafts).reduce((a, b) => a + b, 0)))])}
          <div class="two-col">
            ${ST.sec(tr('Recursos brutos', 'Raw resources'), `<div class="list">${rows(T.res, nf)}</div>`)}
            ${ST.sec(tr('Componentes e drops', 'Components and drops'), Object.keys(T.quest).length ? `<div class="list">${rows(T.quest, nf)}</div>` : `<p class="muted">${t('none')}</p>`)}
            ${ST.sec(tr('Itens intermediários', 'Intermediate items'), Object.keys(T.crafts).length ? `<div class="list">${rows(T.crafts, nf)}</div>` : `<p class="muted">${t('none')}</p>`)}
            ${ST.sec(tr('Tempo por trabalhador', 'Time per worker'), `<div class="list">${rows(T.worker, dur)}</div>`)}
          </div>` : ST.empty(tr('Sua lista está vazia', 'Your list is empty'), tr('Adicione itens pelo campo acima ou pelo botão “Adicionar à lista” na ficha de um item.',
            'Add items with the field above or the “Add to list” button on an item card.'), '', { icon: 'hammer' })}`;
      const save = (l) => { store.set(LIST, l); ST.rerender(); };
      onPick(el, 'add', craftable, (it) => { ST.listAdd(it.uid, 1); ST.rerender(); });
      el.querySelectorAll('[data-o]').forEach((c) => c.addEventListener('change', () => { opt[c.dataset.o] = c.checked; store.set('st_listopt', opt); ST.rerender(); }));
      el.querySelectorAll('[data-q]').forEach((n) => n.addEventListener('change', () => save(list.map((x) => (x.uid === n.dataset.q ? { ...x, qty: Math.max(1, +n.value || 1) } : x)))));
      el.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => save(list.filter((x) => x.uid !== b.dataset.del))));
      const clr = el.querySelector('#clear'); if (clr) clr.addEventListener('click', () => save([]));
      const cp = el.querySelector('#copy');
      if (cp) cp.addEventListener('click', async () => {
        const url = location.href.split('#')[0] + share;
        try { await navigator.clipboard.writeText(url); cp.textContent = tr('Link copiado', 'Link copied'); } catch (e) { prompt('URL', url); }
      });
    },
  });

  // ================================================================ comparador
  const CMP = 'st_compare';
  ST.compareAdd = (uid) => {
    const l = store.get(CMP, []).filter((x) => x !== uid);
    l.push(uid);
    store.set(CMP, l.slice(-4));
    return '#/comparar?ids=' + l.slice(-4).join(',');
  };
  ST.page('comparar', {
    nav: 'comparar', title: () => t('compare'),
    async render(el, args, query) {
      const { d, by } = await ST.itemsIndex();
      let ids = (query.get('ids') || store.get(CMP, []).join(',')).split(',').filter((u) => by.has(u)).slice(0, 4);
      store.set(CMP, ids);
      const its = ids.map((u) => by.get(u));
      const go = (l) => { store.set(CMP, l); location.hash = '#/comparar?ids=' + l.join(','); };
      const F = [
        ['tier', t('tier')], ['level', t('level')], ['value', t('value'), (i) => i.value, 'max', (v) => nf(v) + ' ' + coin],
        ['time', t('time'), (i) => i.time, 'min', dur], ['vph', tr('Ouro por hora', 'Gold per hour'), (i) => (i.time ? i.value / (i.time / 3600) : 0), 'max', (v) => short(v)],
        ['atk', t('atk'), (i) => i.stats.atk, 'max'], ['def', t('def'), (i) => i.stats.def, 'max'], ['hp', t('hp'), (i) => i.stats.hp, 'max'],
        ['eva', t('eva'), (i) => i.stats.eva, 'max', (v) => (v ? dec(v * 100, 1) + '%' : '—')], ['crit', t('crit'), (i) => i.stats.crit, 'max', (v) => (v ? dec(v * 100, 1) + '%' : '—')],
        ['power', t('power'), (i) => pw(i.stats), 'max', (v) => nf(Math.round(v))], ['xp', tr('XP do comerciante', 'Merchant XP'), (i) => i.xp, 'max'],
        ['craftXp', tr('XP de fabricação', 'Crafting XP'), (i) => i.craftXp, 'max'], ['favor', tr('Graça', 'Favor'), (i) => i.favor, 'max'],
        ['surcharge', tr('Energia da sobretaxa', 'Surcharge energy'), (i) => i.energy.surcharge, 'min'],
      ];
      const head = its.map((i) => `<th class="num"><a class="cmp-head" href="#/item/${i.uid}">${img(i.uid)}<span>${esc(i.name)}</span></a>
        <button class="chip" data-rm="${i.uid}" aria-label="${tr('Remover', 'Remove')}">${ST.ic('close')}</button></th>`).join('');
      const body = F.map(([k, label, get, best, fmt]) => {
        const vals = its.map((i) => (get ? get(i) : i[k]));
        if (vals.every((v) => !v)) return '';
        const nums = vals.filter((v) => v > 0);
        const b = best === 'max' ? Math.max(...nums) : best === 'min' ? Math.min(...nums) : null;
        return `<tr><th>${label}</th>${vals.map((v) => `<td class="num ${b != null && v === b && its.length > 1 ? 'cmp-best' : ''}">${v ? (fmt ? fmt(v) : nf(Math.round(v * 100) / 100)) : '—'}</td>`).join('')}</tr>`;
      }).join('');
      const recipe = its.map((i) => `<td>${[...i.resources.map((r) => `${nf(r.qty)} ${esc(ST.refName(r.id))}`), ...i.components.map((c) => `${nf(c.qty)} ${esc(ST.refName(c.id))}`)].join('<br>') || '—'}</td>`).join('');
      el.innerHTML = ST.pageHead(t('compare'), tr('Até quatro itens lado a lado. O melhor valor de cada linha fica destacado.', 'Up to four items side by side. The best value in each row is highlighted.')) +
        `<div class="form-row"><label class="field">${tr('Adicionar item', 'Add item')}${picker(d.items, 'add')}</label>${its.length ? `<button class="chip" id="clr">${tr('Limpar', 'Clear')}</button>` : ''}</div>` +
        (its.length ? `<div class="table-wrap"><table class="data-table cmp"><thead><tr><th></th>${head}</tr></thead><tbody>${body}
          <tr><th>${tr('Receita', 'Recipe')}</th>${recipe}</tr></tbody></table></div>`
          : ST.empty(tr('Nenhum item para comparar', 'No items to compare'), tr('Escolha itens no campo acima ou use “Comparar” na ficha de um item.', 'Pick items above or use “Compare” on an item card.'), '', { icon: 'box' }));
      onPick(el, 'add', d.items, (it) => go([...ids.filter((x) => x !== it.uid), it.uid].slice(-4)));
      el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); go(ids.filter((x) => x !== b.dataset.rm)); }));
      const c = el.querySelector('#clr'); if (c) c.addEventListener('click', () => go([]));
    },
  });

  // ================================================================ encantamentos
  // constantes do jogo: affinity_stat_bonus = 1.5; affinity_all_bonus_mult = 0.5 (afinidade "todos" recebe metade do bônus)
  const AFF = 1.5, AFF_ALL = 0.5;
  ST.page('encantamentos', {
    nav: 'encantamentos', title: () => t('enchantPlanner'),
    async render(el, args, query) {
      const { d, by } = await ST.itemsIndex();
      const ench = d.items.filter((i) => i.type === 'z');
      const elements = ench.filter((i) => i.elements.length), spirits = ench.filter((i) => i.skill);
      const gear = d.items.filter((i) => ['weapon', 'armor', 'accessory'].includes(i.cat));
      const item = by.get(query.get('i')), en = by.get(query.get('e'));
      const tab = query.get('m') || 'item';
      let body = '';
      const mult = (it, e) => {
        if (e.elements.length) {
          const ids = it.elementAffinity.map((a) => a.id);
          if (ids.includes(e.elements[0].id)) return AFF;
          if (ids.includes('all')) return 1 + (AFF - 1) * AFF_ALL;
          return 1;
        }
        return it.spiritAffinity.some((a) => a.id === e.uid) ? AFF : 1;
      };
      const statCols = (get) => ['atk', 'def', 'hp'].map((k) => ({ key: k, label: t(k), num: true, fmt: (r) => nf(Math.round(get(r)[k])), sort: (r) => get(r)[k] }));
      if (tab === 'item') {
        if (item) {
          const rows = [...elements, ...spirits].map((e) => {
            const m = mult(item, e);
            return { e, m, s: { atk: e.stats.atk * m, def: e.stats.def * m, hp: e.stats.hp * m }, tot: pw({ atk: e.stats.atk * m, def: e.stats.def * m, hp: e.stats.hp * m }) };
          });
          body = `<div class="detail-head" style="margin:8px 0 6px"><div class="thumb">${img(item.uid)}</div><div><h2 class="d-title">${esc(item.name)}</h2>
            <div class="tags">${item.elementAffinity.map((a) => ST.tag(esc(a.name), 'hl')).join('')}${item.spiritAffinity.map((a) => ST.tag(esc(a.name), 'hl')).join('')}
            ${!item.elementAffinity.length && !item.spiritAffinity.length ? `<span class="muted small">${tr('Sem afinidades.', 'No affinities.')}</span>` : ''}</div></div></div>` +
            ST.table(rows, [
              { key: 'e', label: tr('Encantamento', 'Enchantment'), fmt: (r) => `<a class="cell-item" href="#/item/${r.e.uid}">${img(r.e.uid)}<span>${esc(r.e.name)}</span></a>`, sort: (r) => r.e.name },
              { key: 'kind', label: t('type'), fmt: (r) => (r.e.elements.length ? `${esc(r.e.elements[0].name)} +${r.e.elements[0].value}` : tr('Espírito', 'Spirit')), sort: (r) => (r.e.elements.length ? 0 : 1) },
              { key: 'tier', label: 'T', num: true, fmt: (r) => r.e.tier, sort: (r) => r.e.tier },
              { key: 'm', label: tr('Afinidade', 'Affinity'), num: true, fmt: (r) => (r.m > 1 ? `<span class="ok">×${dec(r.m, 2)}</span>` : '—') },
              ...statCols((r) => r.s), { key: 'tot', label: t('power'), num: true, fmt: (r) => nf(Math.round(r.tot)) }], { sortKey: 'tot', sortDir: -1 });
        } else body = ST.empty(tr('Escolha um equipamento', 'Pick a piece of gear'), tr('Mostra quanto cada elemento e espírito adiciona ao item, já com o bônus de afinidade.', 'Shows what each element and spirit adds to the item, including the affinity bonus.'), '', { icon: 'search' });
      } else {
        if (en) {
          const matches = gear.filter((i) => mult(i, en) > 1).map((i) => ({ i, m: mult(i, en) }));
          body = `<p class="muted">${tr(`${nf(matches.length)} itens recebem bônus de afinidade com`, `${nf(matches.length)} items get an affinity bonus with`)} <b>${esc(en.name)}</b>.</p>` + ST.table(matches, [
            { key: 'i', label: t('items'), fmt: (r) => `<a class="cell-item" href="#/item/${r.i.uid}">${img(r.i.uid)}<span>${esc(r.i.name)}</span></a>`, sort: (r) => r.i.name },
            { key: 'type', label: t('type'), fmt: (r) => esc(ST.typeName(r.i.type)), sort: (r) => ST.typeName(r.i.type) },
            { key: 'tier', label: 'T', num: true, fmt: (r) => r.i.tier, sort: (r) => r.i.tier },
            { key: 'm', label: tr('Afinidade', 'Affinity'), num: true, fmt: (r) => `×${dec(r.m, 2)}` }], { sortKey: 'tier', sortDir: -1 });
        } else body = ST.empty(tr('Escolha um encantamento', 'Pick an enchantment'), tr('Lista os itens que têm afinidade com ele.', 'Lists the items that have an affinity with it.'), '', { icon: 'search' });
      }
      el.innerHTML = ST.pageHead(t('enchantPlanner'), tr('Combine equipamentos com elementos e espíritos. Afinidade multiplica os atributos do encantamento por 1,5 (afinidade “Todos”: 1,25), segundo as constantes do jogo.',
        'Match gear with elements and spirits. Affinity multiplies the enchantment stats by 1.5 (“All” affinity: 1.25), per the game constants.')) +
        ST.tabs([['#/encantamentos?m=item', tr('Por equipamento', 'By gear')], ['#/encantamentos?m=ench', tr('Por encantamento', 'By enchantment')]], `#/encantamentos?m=${tab}`) +
        `<div class="form-row"><label class="field">${tab === 'item' ? tr('Equipamento', 'Gear') : tr('Encantamento', 'Enchantment')}${picker(tab === 'item' ? gear : ench, 'pk')}</label></div>` + body;
      onPick(el, 'pk', tab === 'item' ? gear : ench, (it) => { location.hash = `#/encantamentos?m=${tab}&${tab === 'item' ? 'i' : 'e'}=${it.uid}`; });
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
