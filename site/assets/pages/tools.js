/* Ferramentas: calculadora de fabricação, ranking de lucro e montador de herói. */
(() => {
  const { t, tr, esc, nf, short, dur, pct, dec, img, icon } = ST;

  // ---------------------------------------------------------------- efeitos de melhoria
  /* Aplica marcos / forjado / ascensão a um item: devolve receita e economia efetivas. */
  function effective(i, opt) {
    const res = i.resources.map((r) => ({ ...r }));
    const comps = i.components.map((c) => ({ ...c }));
    let time = i.time, value = i.value;
    const lists = [opt.ms && i.milestones, opt.sf && i.starforged, opt.asc && i.ascension].filter(Boolean);
    for (const list of lists) for (const u of list) {
      if (!u.key) continue;
      const m = u.key.match(/^(resource|component)(\d)$/);
      if (m) {
        const arr = m[1] === 'resource' ? res : comps;
        const target = arr[+m[2] - 1];
        if (!target) continue;
        if (u.op === '-') target.qty = Math.max(0, target.qty - u.v);
        else if (u.op === '*') target.qty = target.qty * u.v;
      } else if (u.key === 'time' && u.op === '*') time *= u.v;
      else if (u.key === 'value' && u.op === '*') value *= u.v;
    }
    res.forEach((r) => (r.qty = Math.ceil(r.qty)));
    comps.forEach((c) => (c.qty = Math.ceil(c.qty)));
    return { res, comps, time, value };
  }
  ST.effective = effective;

  const itemPicker = (items, current, id = 'pick') => `<input class="inp" id="${id}" list="${id}-list" placeholder="${tr('Digite o nome do item…', 'Type an item name…')}" value="${esc(current ? current.name : '')}" style="min-width:260px">
    <datalist id="${id}-list">${items.map((i) => `<option value="${esc(i.name)}">T${i.tier} · ${esc(ST.typeName(i.type))}</option>`).join('')}</datalist>`;

  // ================================================================ calculadora
  ST.page('calculadora', {
    nav: 'calculadora', title: () => t('calculator'),
    async render(el, [uid], query) {
      const { d, by } = await ST.itemsIndex();
      const craftable = d.items.filter((i) => !i.nonCraftable && (i.resources.length || i.components.length));
      const item = by.get(uid);
      const opt = { qty: Math.max(1, +(query.get('qty') || 1)), ms: query.get('ms') !== '0', sf: query.get('sf') === '1', asc: query.get('asc') === '1', expand: query.get('x') !== '0' };
      const ctl = `<div class="form-row">
        <label class="field">${t('items')}${itemPicker(craftable, item)}</label>
        <label class="field">${t('qty')}<input type="number" id="qty" min="1" value="${opt.qty}"></label>
        <label class="check"><input type="checkbox" id="ms" ${opt.ms ? 'checked' : ''}> ${tr('Marcos do projeto', 'Milestones')}</label>
        <label class="check"><input type="checkbox" id="sf" ${opt.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
        <label class="check"><input type="checkbox" id="asc" ${opt.asc ? 'checked' : ''}> ${tr('Ascensão', 'Ascension')}</label>
        <label class="check"><input type="checkbox" id="x" ${opt.expand ? 'checked' : ''}> ${tr('Fabricar sub-itens', 'Craft sub-items')}</label></div>`;
      if (!item) {
        el.innerHTML = ST.pageHead(t('calculator'), tr('Escolha um item para ver todos os materiais, do item final até os recursos brutos.', 'Pick an item to see every material, from the final item down to raw resources.')) + ctl;
      } else {
        const totals = { res: {}, quest: {}, crafts: {}, time: 0, workerTime: {}, value: 0 };
        const add = (o, k, v) => (o[k] = (o[k] || 0) + v);
        const expand = (it, qty, depth) => {
          const e = effective(it, opt);
          totals.time += e.time * qty;
          if (e.time) it.workers.forEach((w) => add(totals.workerTime, w.id, e.time * qty));
          if (depth > 0) add(totals.crafts, it.uid, qty);
          e.res.filter((r) => r.qty > 0).forEach((r) => add(totals.res, r.id, r.qty * qty));
          const kids = e.comps.filter((c) => c.qty > 0).map((c) => {
            const sub = by.get(c.id);
            const n = c.qty * qty;
            if (sub && opt.expand && !sub.nonCraftable && (sub.resources.length || sub.components.length) && depth < 8) {
              return `<li>${expand(sub, n, depth + 1)}</li>`;
            }
            add(totals.quest, c.id, n);
            return `<li><span class="node">${img(c.id)} ${esc(ST.refName(c.id))} <b>× ${nf(n)}</b>${sub ? '' : ` <span class="small muted">${tr('drop de missão', 'quest drop')}</span>`}</span></li>`;
          });
          return `<span class="node">${img(it.uid)} <a href="#/item/${it.uid}">${esc(it.name)}</a> <b>× ${nf(qty)}</b>
            <span class="small muted">${[...e.res.filter((r) => r.qty > 0).map((r) => `${nf(r.qty * qty)} ${esc(ST.refName(r.id))}`), e.time ? dur(e.time * qty) : ''].filter(Boolean).join(' · ')}</span></span>
            ${kids.length ? `<ul>${kids.join('')}</ul>` : ''}`;
        };
        const tree = expand(item, opt.qty, 0);
        const eTop = effective(item, opt);
        const list = (o, fmt) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="row">${icon(k) ? `<img src="${icon(k)}" alt="">` : ''}<div class="grow">${by.has(k) ? `<a href="#/item/${k}">${esc(ST.refName(k))}</a>` : esc(ST.refName(k))}</div><div class="r">${fmt(v)}</div></div>`).join('');
        el.innerHTML = ST.pageHead(t('calculator'), '') + ctl + `
          ${ST.stats([ST.stat(tr('Valor de venda', 'Sale value'), nf(Math.round(eTop.value * opt.qty)) + ' <i class="ic ic-coin"></i>', 'gold'),
            ST.stat(tr('Tempo total de fabricação', 'Total crafting time'), dur(totals.time)), ST.stat(tr('Fabricações intermediárias', 'Intermediate crafts'), nf(Object.values(totals.crafts).reduce((a, b) => a + b, 0)))])}
          <div class="two-col">
            ${ST.sec(tr('Recursos brutos', 'Raw resources'), `<div class="list">${list(totals.res, nf)}</div>`)}
            ${ST.sec(tr('Componentes (drops e itens não expandidos)', 'Components (drops and unexpanded items)'), Object.keys(totals.quest).length ? `<div class="list">${list(totals.quest, nf)}</div>` : `<p class="muted">${t('none')}</p>`)}
            ${ST.sec(tr('Itens intermediários a fabricar', 'Intermediate items to craft'), Object.keys(totals.crafts).length ? `<div class="list">${list(totals.crafts, nf)}</div>` : `<p class="muted">${t('none')}</p>`)}
            ${ST.sec(tr('Tempo por trabalhador', 'Time per worker'), `<div class="list">${list(totals.workerTime, dur)}</div>`, tr('Soma sequencial, sem bônus de nível do trabalhador.', 'Sequential sum, without worker level bonuses.'))}
          </div>
          ${ST.sec(tr('Árvore de fabricação', 'Crafting tree'), `<div class="tree"><ul><li>${tree}</li></ul></div>`)}`;
      }
      const sync = () => ST.setQuery({ qty: el.querySelector('#qty').value !== '1' ? el.querySelector('#qty').value : '', ms: el.querySelector('#ms').checked ? '' : '0',
        sf: el.querySelector('#sf').checked ? '1' : '', asc: el.querySelector('#asc').checked ? '1' : '', x: el.querySelector('#x').checked ? '' : '0' });
      el.querySelectorAll('#qty,#ms,#sf,#asc,#x').forEach((n) => n.addEventListener('change', () => { sync(); ST.rerender(); }));
      el.querySelector('#pick').addEventListener('change', (e) => {
        const it = craftable.find((i) => i.name === e.target.value);
        if (it) { const qs = location.hash.split('?')[1]; location.hash = `#/calculadora/${it.uid}${qs ? '?' + qs : ''}`; }
      });
    },
  });

  // ================================================================ lucro
  ST.page('lucro', {
    nav: 'lucro', title: () => t('profit'),
    async render(el, args, query) {
      const { d } = await ST.itemsIndex();
      const [w] = await ST.need('workers');
      const lvl = Math.max(1, +(query.get('wl') || 1));
      const wl = w.wlevels.find((x) => x.level === lvl) || w.wlevels[0];
      const opt = { ms: query.get('ms') !== '0', sf: query.get('sf') === '1', tmax: +(query.get('tmax') || 99), cat: query.get('cat') || '', worker: query.get('w') || '' };
      const tiers = [...new Set(d.items.map((i) => i.tier))].sort((a, b) => a - b);
      const acc = ST.account && ST.account.active();
      const wmult = (i) => { // conta ativa: média do multiplicador de tempo dos trabalhadores do item no nível de cada um
        if (!acc) return wl.craftingTime / 100;
        const ms = i.workers.map((x) => { const lv = ST.account.workerLevel(x.id); const r = lv && w.wlevels.find((y) => y.level === lv); return (r || wl).craftingTime / 100; });
        return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : wl.craftingTime / 100;
      };
      const rows = d.items.filter((i) => !i.nonCraftable && !(ST.isUnreleased && ST.isUnreleased(i)) && (!acc || ST.account.has(i)) && i.time > 0 && i.tier <= opt.tmax && (!opt.cat || i.cat === opt.cat) &&
        (!opt.worker || i.workers.some((x) => x.id === opt.worker))).map((i) => {
        const e = effective(i, opt);
        const time = e.time * wmult(i);
        const resTotal = e.res.reduce((a, r) => a + r.qty, 0);
        return { i, value: e.value, time, gph: e.value / time * 3600, xph: i.xp / time * 3600, vpr: resTotal ? e.value / resTotal : null, favor: i.favor };
      });
      el.innerHTML = ST.pageHead(t('profit'), tr('Quanto cada item rende por hora de fabricação. Clique nos títulos das colunas para ordenar.', 'How much each item earns per crafting hour. Click column headers to sort.')) + `
        <div class="form-row">
          <label class="field">${tr('Nível do trabalhador', 'Worker level')}<select id="wl">${w.wlevels.map((x) => `<option value="${x.level}" ${x.level === lvl ? 'selected' : ''}>${x.level} (${x.craftingTime}%)</option>`).join('')}</select></label>
          <label class="field">${tr('Tier máximo', 'Max tier')}<select id="tmax">${tiers.map((x) => `<option ${x === Math.min(opt.tmax, tiers[tiers.length - 1]) ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="field">${tr('Categoria', 'Category')}<select id="cat"><option value="">${t('all')}</option>${Object.entries(d.categories).map(([k, v]) => `<option value="${k}" ${k === opt.cat ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          <label class="field">${tr('Trabalhador', 'Worker')}<select id="w"><option value="">${t('all')}</option>${w.workers.map((x) => `<option value="${x.uid}" ${x.uid === opt.worker ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="check"><input type="checkbox" id="ms" ${opt.ms ? 'checked' : ''}> ${tr('Marcos do projeto', 'Milestones')}</label>
          <label class="check"><input type="checkbox" id="sf" ${opt.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
          ${ST.accountToggle ? ST.accountToggle(acc) : ''}
        </div>
        <p class="count">${nf(rows.length)} ${t('results')}</p>
        ${ST.table(rows, [
          { key: 'name', label: t('name'), sort: (r) => r.i.name, fmt: (r) => `<a class="cell-item" href="#/item/${r.i.uid}">${img(r.i.uid)}<span>${esc(r.i.name)}</span></a>` },
          { key: 'tier', label: 'T', num: true, sort: (r) => r.i.tier, fmt: (r) => r.i.tier },
          { key: 'value', label: t('value'), num: true, fmt: (r) => nf(Math.round(r.value)) },
          { key: 'time', label: t('time'), num: true, fmt: (r) => dur(r.time) },
          { key: 'gph', label: tr('Ouro/h', 'Gold/h'), num: true, cls: 'gold', fmt: (r) => short(r.gph) },
          { key: 'xph', label: tr('XP/h', 'XP/h'), num: true, fmt: (r) => short(r.xph) },
          { key: 'vpr', label: tr('Ouro por recurso', 'Gold per resource'), num: true, fmt: (r) => (r.vpr ? short(r.vpr) : '—') },
          { key: 'favor', label: tr('Graça', 'Favor'), num: true, fmt: (r) => nf(r.favor) },
        ], { sortKey: 'gph', sortDir: -1 })}
        <p class="note">${tr('Tempo ajustado pelo nível do trabalhador (tabela do jogo). Não considera fabricação múltipla, bônus de talentos, eventos nem o preço dos componentes.', 'Time adjusted by worker level (game table). Does not account for multicraft, talent bonuses, events or component prices.')}</p>`;
      if (ST.bindAccountToggle) ST.bindAccountToggle(el);
      el.querySelectorAll('select,input:not([data-acc])').forEach((n) => n.addEventListener('change', () => {
        ST.setQuery({ wl: el.querySelector('#wl').value === '1' ? '' : el.querySelector('#wl').value, tmax: el.querySelector('#tmax').value, cat: el.querySelector('#cat').value,
          w: el.querySelector('#w').value, ms: el.querySelector('#ms').checked ? '' : '0', sf: el.querySelector('#sf').checked ? '1' : '' });
        ST.rerender();
      }));
    },
  });

})();
