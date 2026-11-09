/* Hypermax: para cada classe, o equipamento (e encantamentos) que dá o maior poder possível em cada espaço.
   Poder = ATQ×0,8 + DEF×1,2 + PV×5 (constantes do jogo). Rotas: #/hypermax e #/hypermax/<classe>. */
(() => {
  const { t, tr, esc, nf, img, short } = ST;
  ST.addI18n({ pt: { hypermax: 'Hypermax' }, en: { hypermax: 'Hypermax' } });
  const AFF = 1.5, AFF_ALL = 0.5; // affinity_stat_bonus / affinity_all_bonus_mult
  const STATS = ['atk', 'def', 'hp'];

  function readOpts(q) {
    return {
      q: Math.min(4, Math.max(0, +(q.get('q') ?? 4))),
      lv: q.get('lv') ? +q.get('lv') : 0, // 0 = nível máximo da classe
      tr: q.get('tr') !== '0', // Ascensão + Transcendência completas
      en: q.get('en') !== '0', // encantamentos (elemento + espírito)
      soon: q.get('soon') === '1', // incluir itens ainda não lançados
      ty: q.get('ty') || '',
    };
  }
  const optQuery = (o, extra = {}) => {
    const p = new URLSearchParams();
    if (o.q !== 4) p.set('q', o.q);
    if (o.lv) p.set('lv', o.lv);
    if (!o.tr) p.set('tr', '0');
    if (!o.en) p.set('en', '0');
    if (o.soon) p.set('soon', '1');
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v); else p.delete(k);
    const s = p.toString();
    return s ? '?' + s : '';
  };

  /* Melhor combinação de cada item (independe da classe): atributos com qualidade, melhorias e encantamentos. */
  let CACHE = { key: '', map: null };
  function itemTable(d, o) {
    const key = [o.q, o.tr, o.en, o.soon].join('|');
    if (CACHE.key === key) return CACHE.map;
    const m = ST.QUALITY[o.q][0];
    const ench = d.items.filter((i) => i.type === 'z' && (o.soon || !ST.isUnreleased(i)) && STATS.some((k) => i.stats[k]));
    const elements = ench.filter((i) => i.elements.length), spirits = ench.filter((i) => i.skill);
    const pw = (s) => s.atk * 0.8 + s.def * 1.2 + s.hp * 5;
    const bestEnch = (it, list, isEl) => {
      let best = null;
      for (const e of list) {
        let k = 1;
        if (isEl) {
          const ids = it.elementAffinity.map((a) => a.id);
          k = ids.includes(e.elements[0].id) ? AFF : ids.includes('all') ? 1 + (AFF - 1) * AFF_ALL : 1;
        } else if (it.spiritAffinity.some((a) => a.id === e.uid)) k = AFF;
        const s = { atk: e.stats.atk * m * k, def: e.stats.def * m * k, hp: e.stats.hp * m * k };
        const p = pw(s);
        if (!best || p > best.p) best = { e, s, p, aff: k > 1 ? k : 0 };
      }
      return best;
    };
    const map = new Map();
    for (const it of d.items) {
      if (!['weapon', 'armor', 'accessory'].includes(it.cat) || (!o.soon && ST.isUnreleased(it))) continue;
      const up = o.tr ? ST.applySteps(it, [...(it.ascension || []), ...(it.transcendence || [])]).stats : it.stats;
      const base = { atk: up.atk * m, def: up.def * m, hp: up.hp * m };
      if (!pw(base)) continue;
      const el = o.en ? bestEnch(it, elements, true) : null, sp = o.en ? bestEnch(it, spirits, false) : null;
      const tot = { ...base };
      for (const x of [el, sp]) if (x) STATS.forEach((k) => (tot[k] += x.s[k]));
      map.set(it.uid, { it, base, el, sp, tot, p: pw(tot) });
    }
    CACHE = { key, map };
    return map;
  }

  /* Monta a classe: melhor item por espaço (sem repetir item único). */
  function buildClass(c, table, o) {
    const lv = o.lv ? Math.min(o.lv, ST.maxLevel(c)) : ST.maxLevel(c);
    const hero = { atk: ST.statAt(c.stats.atk, lv), def: ST.statAt(c.stats.def, lv), hp: ST.statAt(c.stats.hp, lv) };
    const slots = c.slots.map((sl) => {
      const codes = sl.map((x) => x.code);
      let best = null;
      for (const r of table.values()) if (codes.includes(r.it.type) && (!best || r.p > best.p)) best = r;
      return { sl, best };
    });
    const tot = { ...hero };
    slots.forEach((s) => s.best && STATS.forEach((k) => (tot[k] += s.best.tot[k])));
    const power = tot.atk * 0.8 + tot.def * 1.2 + tot.hp * 5;
    return { c, lv, hero, slots, tot, power };
  }

  const controls = (o, extra = '') => `<div class="form-row hm-ctl">
      <label class="field">${tr('Qualidade', 'Quality')}<select class="inp" data-o="q">${ST.QUALITY.map(([m, n], k) =>
        `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)} (×${ST.dec(m)})</option>`).join('')}</select></label>
      <label class="field">${t('level')}<select class="inp" data-o="lv"><option value="0">${tr('Máximo', 'Max')}</option>${[40, 30, 20, 10].map((l) =>
        `<option value="${l}" ${o.lv === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-o="tr" ${o.tr ? 'checked' : ''}> ${tr('Ascensão + Transcendência', 'Ascension + Transcendence')}</label>
      <label class="check"><input type="checkbox" data-o="en" ${o.en ? 'checked' : ''}> ${tr('Encantamentos (elemento + espírito)', 'Enchantments (element + spirit)')}</label>
      <label class="check"><input type="checkbox" data-o="soon" ${o.soon ? 'checked' : ''}> ${tr('Incluir itens em breve', 'Include upcoming items')}</label>${extra}</div>`;
  const bindControls = (el, o, base) => el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => {
    const k = n.dataset.o;
    o[k] = n.type === 'checkbox' ? n.checked : +n.value;
    location.hash = base + optQuery(o, { ty: o.ty });
  }));
  const enchIcons = (r) => [r.el, r.sp].filter(Boolean).map((x) => `<span class="hm-en ${x.aff ? 'aff' : ''}" title="${esc(x.e.name)}${x.aff ? ' · ' + tr('afinidade', 'affinity') : ''}">${img(x.e.uid)}</span>`).join('');
  const NOTE = () => tr('Poder = ATQ×0,8 + DEF×1,2 + PV×5, pelas constantes do jogo. Qualidade usa os multiplicadores da comunidade (×1 a ×3) e vale também para os encantamentos; afinidade multiplica o encantamento por 1,5 (“Todos”: 1,25). Não entram: habilidades, sementes, bônus de campeão, evasão e crítico. Pedras e Pedras Lunares não dão atributos, por isso não aparecem.',
    'Power = ATK×0.8 + DEF×1.2 + HP×5, from the game constants. Quality uses the community multipliers (×1 to ×3) and also applies to enchantments; affinity multiplies the enchantment by 1.5 (“All”: 1.25). Not included: skills, seeds, champion bonuses, evasion and crit. Runestones and Moonstones give no stats, so they are not shown.');

  ST.page('hypermax', {
    nav: 'hypermax', title: () => t('hypermax'),
    async render(el, [uid], query) {
      const [classes] = await ST.need('classes');
      const { d } = await ST.itemsIndex();
      const o = readOpts(query);
      const table = itemTable(d, o);
      const builds = classes.map((c) => buildClass(c, table, o)).sort((a, b) => b.power - a.power);

      if (uid) {
        const b = builds.find((x) => x.c.uid === uid);
        if (!b) { el.innerHTML = ST.notFound(); return; }
        const rank = builds.indexOf(b) + 1;
        const builder = `#/montador?c=${b.c.uid}&lv=${b.lv}&` + b.slots.map((s, k) => (s.best ? `s${k}=${s.best.it.uid}:${o.q}` : '')).filter(Boolean).join('&');
        const rows = b.slots.map((s) => {
          const r = s.best;
          if (!r) return `<tr><td colspan="6" class="muted">${esc(s.sl.map((x) => x.name).join(' / '))} — ${t('none')}</td></tr>`;
          const en = (x) => (x ? `<a class="cell-item" href="#/item/${x.e.uid}">${img(x.e.uid)}<span>${esc(x.e.name)}${x.aff ? ` <span class="badge">×${ST.dec(x.aff, 2)}</span>` : ''}</span></a>` : '—');
          return `<tr><td><a class="cell-item" href="#/item/${r.it.uid}">${img(r.it.uid)}<span>${esc(r.it.name)}<br><span class="small muted">T${r.it.tier} · ${esc(s.sl.map((x) => x.name).join(' / '))}</span></span></a></td>
            <td>${en(r.el)}</td><td>${en(r.sp)}</td>
            <td class="num s-atk">${nf(Math.round(r.tot.atk))}</td><td class="num s-def">${nf(Math.round(r.tot.def))}</td><td class="num s-hp">${nf(Math.round(r.tot.hp))}</td></tr>`;
        }).join('');
        el.innerHTML = `<a class="crumb" href="#/hypermax${optQuery(o)}">${ST.ic('left')} ${t('hypermax')}</a>
          <header class="detail-head hm-head"><div class="thumb">${img(b.c.icon)}</div><div>
            <h1 class="d-title">${esc(b.c.name)} <span class="hm-rank">#${rank}</span></h1>
            <div class="d-sub">${esc(b.c.typeName)} · ${t('level')} ${b.lv} · ${tr(...ST.QUALITY[o.q][1])}</div>
            <div class="hm-power">${nf(Math.round(b.power))} <span>${t('power')}</span></div></div></header>
          ${controls(o)}
          ${ST.stats([ST.stat(t('atk'), nf(Math.round(b.tot.atk)), 's-atk'), ST.stat(t('def'), nf(Math.round(b.tot.def)), 's-def'), ST.stat(t('hp'), nf(Math.round(b.tot.hp)), 's-hp'),
            ST.stat(tr('Herói (sem itens)', 'Hero (no gear)'), nf(Math.round(b.hero.atk * 0.8 + b.hero.def * 1.2 + b.hero.hp * 5))),
            ST.stat(tr('Equipamento', 'Gear'), nf(Math.round(b.power - (b.hero.atk * 0.8 + b.hero.def * 1.2 + b.hero.hp * 5))))])}
          <div class="tags" style="margin:14px 0"><a class="chip primary" href="${builder}">${ST.ic('swords')} ${tr('Abrir no montador', 'Open in builder')}</a>
            <a class="chip" href="#/classes/${b.c.uid}">${ST.ic('info')} ${esc(b.c.name)}</a>
            <span class="small muted">${tr('O montador leva só os itens e a qualidade; encantamentos e Transcendência ficam fora de lá.', 'The builder only takes items and quality; enchantments and Transcendence are not included there.')}</span></div>
          ${ST.sec(tr('Equipamento por espaço', 'Gear per slot'), `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('items')}</th>
            <th>${tr('Elemento', 'Element')}</th><th>${tr('Espírito', 'Spirit')}</th><th class="num">${t('atk')}</th><th class="num">${t('def')}</th><th class="num">${t('hp')}</th></tr></thead>
            <tbody>${rows}</tbody></table></div>`, NOTE())}`;
        bindControls(el, o, '#/hypermax/' + b.c.uid);
        return;
      }

      const types = [...new Map(classes.map((c) => [c.type, c.typeName])).entries()];
      const shown = builds.filter((b) => !o.ty || b.c.type === o.ty);
      const top = builds[0] ? builds[0].power : 1;
      el.innerHTML = ST.pageHead(t('hypermax'), tr('O máximo teórico de cada classe: em cada espaço, o item e os encantamentos que dão mais poder. Clique numa classe para ver o equipamento completo.',
        'The theoretical maximum for each class: in every slot, the item and enchantments that give the most power. Click a class to see the full gear.')) +
        controls(o) +
        ST.tabs([['#/hypermax' + optQuery(o), t('all')], ...types.map(([k, n]) => ['#/hypermax' + optQuery(o, { ty: k }), esc(n)])], '#/hypermax' + optQuery(o, { ty: o.ty })) +
        `<div class="hm-grid">${shown.map((b) => `<a class="tile hm-card" href="#/hypermax/${b.c.uid}${optQuery(o)}">
          <div class="hm-top"><span class="hm-rank">#${builds.indexOf(b) + 1}</span><div class="thumb">${img(b.c.icon)}</div>
            <div class="tile-body"><div class="tile-title">${esc(b.c.name)}</div><div class="tile-sub">${esc(b.c.typeName)} · ${t('level')} ${b.lv}</div></div>
            <div class="hm-pw">${short(Math.round(b.power))}<span>${t('power')}</span></div></div>
          <div class="hm-bar"><i style="--w:${(b.power / top * 100).toFixed(1)}%"></i></div>
          <div class="hm-slots">${b.slots.map((s) => (s.best ? `<span class="hm-slot" title="${esc(s.best.it.name)}">${img(s.best.it.uid)}<span class="hm-ens">${enchIcons(s.best)}</span></span>` : '<span class="hm-slot empty"></span>')).join('')}</div>
          <div class="hm-stats"><span class="s-atk">${t('atk')} ${short(Math.round(b.tot.atk))}</span><span class="s-def">${t('def')} ${short(Math.round(b.tot.def))}</span><span class="s-hp">${t('hp')} ${short(Math.round(b.tot.hp))}</span></div></a>`).join('')}</div>
        <p class="note">${NOTE()}</p>`;
      bindControls(el, o, '#/hypermax');
    },
  });
})();
