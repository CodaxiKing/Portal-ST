/* Ferramentas: ranking de lucro (e ST.effective, usado também pelo plano de fabricação). */
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
