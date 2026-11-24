/* Itens: lista com filtros + detalhes na gaveta (#/item/<uid>). */
(() => {
  const { t, tr, esc, clean, nf, short, dur, pct, img, icon } = ST;
  let IDX = null;

  // índice compartilhado com outras páginas
  ST.itemsIndex = async () => {
    if (IDX) return IDX;
    const d = (await ST.need('items'))[0];
    const by = new Map(d.items.map((i) => [i.uid, i]));
    const usedIn = new Map();
    for (const it of d.items) for (const c of it.components) {
      if (!usedIn.has(c.id)) usedIn.set(c.id, []);
      usedIn.get(c.id).push(it);
    }
    for (const it of d.items) {
      it._s = ST.norm([it.name, it.uid, (d.types[it.type] || {}).name, ...it.resources.map((r) => ref(d, r.id)),
        ...it.components.map((c) => ref(d, c.id)), ...it.workers.map((w) => ref(d, w.id)), it.skill && it.skill.name,
        it.chest && it.chest.name].filter(Boolean).join(' '));
    }
    IDX = { d, by, usedIn };
    return IDX;
  };
  const ref = (d, id) => (d.refs[id] && d.refs[id].name) || id;
  ST.refName = (id) => (IDX ? ref(IDX.d, id) : id);
  ST.typeName = (code) => (IDX && IDX.d.types[code] ? IDX.d.types[code].name : code);
  ST.itemChip = (uid, extra = '') => {
    const it = IDX && IDX.by.get(uid);
    const name = it ? it.name : ST.refName(uid);
    const inner = `${icon(uid) ? `<img src="${icon(uid)}" alt="" loading="lazy">` : ''}<span>${esc(name)}</span>${extra}`;
    return it ? `<a class="chip-item" href="#/item/${uid}">${inner}</a>` : `<span class="chip-item">${inner}</span>`;
  };

  // ---------------------------------------------------------------- lista
  const PAGE = ST.lite ? 40 : 120; // modo leve: lotes menores
  const SOON = '__soon';
  // já existe nos arquivos, mas a data de lançamento ainda não chegou (2099 = sem data definida)
  const today = ST.today; // ST.isUnreleased vem de st-pure.js
  const relDate = (i) => (String(i.releaseAt) >= '2090' ? tr('sem data', 'no date') : new Date(String(i.releaseAt).slice(0, 10) + 'T12:00').toLocaleDateString(ST.locale));
  // moedas das melhorias especiais, com o sprite do jogo quando existir
  const cur = (sprite, ic) => (icon(sprite) ? `<img class="cur-img" src="${icon(sprite)}" alt="">` : `<i class="ic ic-${ic}"></i>`);
  const SHARD = () => cur('bp_upgrade', 'shard'), SEAL = () => cur('bp_upgrade02', 'seal');
  const state = { cat: '', type: '', q: '', tmin: null, tmax: null, sort: 'tier', dir: 1, view: 'grid', shown: 0, list: [] };
  try { state.view = localStorage.getItem('st_view') || 'grid'; } catch (e) {}

  const statsMini = (i) => {
    const s = i.stats, out = [`<span class="gold"><i class="ic ic-coin"></i>${short(i.value)}</span>`];
    const st = (k, label, v) => `<span class="s-${k}" title="${esc(label)}"><i class="ic ic-st-${k}"></i>${v}</span>`;
    if (s.atk) out.push(st('atk', t('atk'), nf(s.atk)));
    if (s.def) out.push(st('def', t('def'), nf(s.def)));
    if (s.hp) out.push(st('hp', t('hp'), nf(s.hp)));
    if (s.eva) out.push(st('eva', tr('Esquiva', 'Evasion'), pct(s.eva)));
    if (s.crit) out.push(st('crit', tr('Crítico', 'Crit'), pct(s.crit)));
    return out.join('');
  };
  const cardHTML = (i, d) => `<a class="card" href="#/item/${i.uid}">
      <div class="thumb">${img(i.uid)}<span class="tier-badge">T${i.tier}</span></div>
      <div class="card-body"><div class="card-name">${esc(i.name)}</div>
      <div class="card-type">${esc(d.types[i.type].name)} · ${t('level')} ${i.level}${ST.isUnreleased(i) ? ` <span class="badge soon">${relDate(i)}</span>` : ''}</div>
      <div class="card-stats">${statsMini(i)}</div></div></a>`;
  const rowHTML = (i, d) => `<tr data-href="#/item/${i.uid}"><td>${icon(i.uid) ? `<img src="${icon(i.uid)}" alt="" loading="lazy">` : ''}</td>
      <td>${esc(i.name)}${ST.isUnreleased(i) ? ` <span class="badge soon">${relDate(i)}</span>` : ''}</td><td>${esc(d.types[i.type].name)}</td><td class="num">${i.tier}</td>
      <td class="num gold">${nf(i.value)}</td><td class="num s-atk">${i.stats.atk || ''}</td><td class="num s-def">${i.stats.def || ''}</td>
      <td class="num s-hp">${i.stats.hp || ''}</td><td class="num">${dur(i.time)}</td></tr>`;

  ST.page('itens', {
    nav: 'itens', title: () => t('items'),
    async render(el, args, query) {
      const { d } = await ST.itemsIndex();
      const tiers = [...new Set(d.items.map((i) => i.tier))].sort((a, b) => a - b);
      state.tmin = +(query.get('tmin') || tiers[0]);
      state.tmax = +(query.get('tmax') || tiers[tiers.length - 1]);
      state.q = query.get('q') || '';
      state.cat = query.get('cat') || '';
      state.type = query.get('type') || '';
      const tierOpts = tiers.map((x) => `<option value="${x}">${x}</option>`).join('');
      el.innerHTML = `${ST.pageHead(t('items'), tr('Todos os projetos do jogo, com atributos, receitas e melhorias.', 'Every blueprint in the game with stats, recipes and upgrades.'))}
        <nav class="cats" id="cats">${[['', t('all')], ...Object.entries(d.categories)].map(([k, v]) =>
          `<button data-cat="${k}" class="${k === state.cat ? 'active' : ''}">${esc(v)}</button>`).join('')}
          <button data-cat="${SOON}" class="cat-soon ${state.cat === SOON ? 'active' : ''}">${tr('Em breve', 'Coming soon')} <span class="cnt-pill">${d.items.filter(ST.isUnreleased).length}</span></button></nav>
        <p class="note" id="soonNote" ${state.cat === SOON ? '' : 'hidden'}>${tr('Itens que já estão nos arquivos do jogo, mas cuja data de lançamento ainda não chegou. Eles não aparecem nas outras abas.',
          'Items already in the game files whose release date has not arrived yet. They are left out of the other tabs.')}
          <button class="chip" id="soonIcs" type="button">${ST.ic('calendar')} ${tr('Adicionar as datas ao calendário (.ics)', 'Add the dates to your calendar (.ics)')}</button>
          <a class="chip" href="#/calendario">${tr('Ver calendário', 'Open calendar')}</a></p>
        <section class="toolbar">
          <input id="q" type="search" placeholder="${tr('Buscar item, recurso, componente…', 'Search item, resource, component…')}" value="${esc(state.q)}" autocomplete="off">
          <select id="type"></select>
          <label class="tier"><span>${t('tier')}</span><select id="tierMin">${tierOpts}</select><span>–</span><select id="tierMax">${tierOpts}</select></label>
          <select id="sort">
            <option value="tier">${t('sortBy')}: ${t('tier')}</option><option value="value">${t('value')}</option>
            <option value="atk">${t('atk')}</option><option value="def">${t('def')}</option><option value="hp">${t('hp')}</option>
            <option value="time">${t('time')}</option><option value="name">${t('name')}</option></select>
          <button class="chip" id="dir" aria-label="${tr('Ordem', 'Order')}"><i class="ic ic-down"></i></button>
          <div class="view-toggle"><button class="chip" data-view="grid">${t('grid')}</button><button class="chip" data-view="table">${t('table')}</button></div>
        </section>
        <p class="count" id="count"></p>
        <div id="empty" hidden></div>
        <section id="grid" class="grid"></section>
        <section id="tableWrap" class="table-wrap" hidden><table class="items-table"><thead><tr>
          <th></th><th>${t('name')}</th><th>${t('type')}</th><th>T</th><th>${t('value')}</th><th>${t('atk')}</th><th>${t('def')}</th><th>${t('hp')}</th><th>${t('time')}</th>
          </tr></thead><tbody id="tbody"></tbody></table></section>
        <div id="sentinel" class="sentinel"></div>`;
      const $ = (s) => el.querySelector(s);
      const inCat = (i) => (state.cat === SOON ? ST.isUnreleased(i) : !ST.isUnreleased(i) && (!state.cat || i.cat === state.cat));
      const fillTypes = () => {
        const codes = [...new Set(d.items.filter(inCat).map((i) => i.type))]
          .sort((a, b) => d.types[a].name.localeCompare(d.types[b].name));
        $('#type').innerHTML = `<option value="">${tr('Todos os tipos', 'All types')}</option>` +
          codes.map((c) => `<option value="${c}">${esc(d.types[c].plural)}</option>`).join('');
        $('#type').value = state.type;
      };
      fillTypes();
      $('#tierMin').value = state.tmin; $('#tierMax').value = state.tmax; $('#sort').value = state.sort;
      const syncDir = () => ($('#dir').innerHTML = state.dir > 0 ? '<i class="ic ic-down"></i>' : '<i class="ic ic-up"></i>');
      const syncView = () => {
        el.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
        $('#grid').hidden = state.view !== 'grid';
        $('#tableWrap').hidden = state.view !== 'table';
      };
      const render = (reset) => {
        if (reset) { state.shown = 0; $('#grid').innerHTML = ''; $('#tbody').innerHTML = ''; }
        const next = state.list.slice(state.shown, state.shown + PAGE);
        const from = state.shown;
        if (state.view === 'grid') $('#grid').insertAdjacentHTML('beforeend', next.map((i) => cardHTML(i, d)).join(''));
        else $('#tbody').insertAdjacentHTML('beforeend', next.map((i) => rowHTML(i, d)).join(''));
        state.shown += next.length;
        if (state.view === 'grid') ST.stagger(el, from);
        const none = !state.list.length;
        $('#empty').hidden = !none;
        if (none) $('#empty').innerHTML = ST.empty(tr('Nenhum item com esses filtros', 'No items match these filters'),
          state.q ? ST.trf(`Nada encontrado para “{0}”. Tente outro termo ou amplie o tier.`, `Nothing found for “{0}”. Try another term or widen the tier range.`, esc(state.q))
            : tr('Amplie o intervalo de tier ou escolha outra categoria.', 'Widen the tier range or pick another category.'),
          `<button class="chip primary" id="clearF">${tr('Limpar filtros', 'Clear filters')}</button>`);
      };
      const key = { tier: (i) => i.tier * 1000 + i.level, value: (i) => i.value, atk: (i) => i.stats.atk, def: (i) => i.stats.def, hp: (i) => i.stats.hp, time: (i) => i.time };
      const apply = () => {
        const words = ST.norm(state.q).split(/\s+/).filter(Boolean);
        const lo = Math.min(state.tmin, state.tmax), hi = Math.max(state.tmin, state.tmax);
        const list = d.items.filter((i) => inCat(i) && (!state.type || i.type === state.type) &&
          i.tier >= lo && i.tier <= hi && words.every((w) => i._s.includes(w)));
        if (state.cat === SOON && state.sort === 'tier') list.sort((a, b) => String(a.releaseAt).localeCompare(String(b.releaseAt)) * state.dir);
        else if (state.sort === 'name') list.sort((a, b) => state.dir * a.name.localeCompare(b.name));
        else { const k = key[state.sort]; list.sort((a, b) => state.dir * (k(a) - k(b)) || a.name.localeCompare(b.name)); }
        state.list = list;
        const pool = d.items.filter((i) => (state.cat === SOON) === ST.isUnreleased(i)).length;
        $('#count').textContent = `${nf(list.length)} ${t('ofItems')} ${nf(pool)} ${t('items').toLowerCase()}`;
        $('#soonNote').hidden = state.cat !== SOON;
        ST.setQuery({ q: state.q, cat: state.cat, type: state.type, tmin: state.tmin !== tiers[0] ? state.tmin : '', tmax: state.tmax !== tiers[tiers.length - 1] ? state.tmax : '' });
        render(true);
      };
      $('#soonIcs').addEventListener('click', () => { // datas definidas (2099 = sem data) das próximas novidades
        const list = d.items.filter((i) => ST.isUnreleased(i) && String(i.releaseAt) < '2090').map((i) => ({ d: String(i.releaseAt).slice(0, 10), k: 'item', n: i.name }));
        if (ST.icsFile) ST.icsFile(ST.icsFromEntries(list, 'soon'), 'shop-titans-em-breve.ics');
      });
      $('#cats').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        state.cat = b.dataset.cat; state.type = '';
        el.querySelectorAll('#cats button').forEach((x) => x.classList.toggle('active', x === b));
        fillTypes(); apply();
      });
      let timer;
      $('#q').addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { state.q = e.target.value; apply(); }, 120); });
      $('#type').addEventListener('change', (e) => { state.type = e.target.value; apply(); });
      $('#tierMin').addEventListener('change', (e) => { state.tmin = +e.target.value; apply(); });
      $('#tierMax').addEventListener('change', (e) => { state.tmax = +e.target.value; apply(); });
      $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; state.dir = ['tier', 'name'].includes(state.sort) ? 1 : -1; syncDir(); apply(); });
      $('#dir').addEventListener('click', () => { state.dir *= -1; syncDir(); apply(); });
      $('#empty').addEventListener('click', (e) => {
        if (!e.target.closest('#clearF')) return;
        state.q = ''; state.cat = ''; state.type = ''; state.tmin = tiers[0]; state.tmax = tiers[tiers.length - 1];
        $('#q').value = ''; $('#tierMin').value = state.tmin; $('#tierMax').value = state.tmax;
        el.querySelectorAll('#cats button').forEach((x) => x.classList.toggle('active', !x.dataset.cat));
        fillTypes(); apply();
      });
      el.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
        state.view = b.dataset.view;
        try { localStorage.setItem('st_view', state.view); } catch (e) {}
        syncView(); render(true);
      }));
      $('#tbody').addEventListener('click', (e) => { const r = e.target.closest('[data-href]'); if (r) location.hash = r.dataset.href; });
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && state.shown < state.list.length) render(false); }, { rootMargin: '600px' });
      io.observe($('#sentinel'));
      syncView(); syncDir(); apply();
    },
  });

  // ---------------------------------------------------------------- melhorias aplicadas
  /* Aplica uma lista de efeitos (na ordem do jogo) ao item: atributos, receita, valor, tempo e efeitos extras. */
  const applySteps = ST.applySteps; // definida em st-pure.js (compartilhada com o Worker e os testes)

  /* Painel "Valores": Base / Ascensão / Transcendência + etapa 1–3, com marcos opcionais. */
  function valuesPanel(i, mode, step, ms) {
    const A = i.ascension || [], X = i.transcendence || [];
    const mil = ms ? i.milestones.filter((u) => u.key) : [];
    const applied = mode === 'asc' ? A.slice(0, step) : mode === 'tr' ? [...A, ...X.slice(0, step)] : [];
    const b = applySteps(i, mil), v = applySteps(i, [...mil, ...applied]);
    const delta = (a, c, f = nf) => (c !== a ? ` <span class="delta ${c > a ? 'up' : 'down'}">${c > a ? '+' : '−'}${f(Math.abs(c - a))}</span>` : '');
    const pctf = (x) => ST.dec(x * 100, 1) + '%';
    const S = [['atk', tr('Ataque', 'Attack'), nf], ['def', tr('Defesa', 'Defense'), nf], ['hp', tr('Vida (PV)', 'Health (HP)'), nf],
      ['eva', t('eva'), pctf], ['crit', t('crit'), pctf], ['shieldHp', tr('PV de escudo', 'Shield HP'), nf]]
      .filter(([k]) => b.stats[k] || v.stats[k]).map(([k, label, f]) => ST.stat(label, f(v.stats[k]) + delta(b.stats[k], v.stats[k], f), 's-' + k));
    const E = [ST.stat(t('value'), nf(v.value) + ' <i class="ic ic-coin"></i>' + delta(b.value, v.value), 'gold'),
      i.time && ST.stat(tr('Tempo de fabricação', 'Crafting time'), dur(v.time) + (v.time !== b.time ? ` <span class="delta up">−${dur(b.time - v.time)}</span>` : ''))];
    const R = [...v.res.map((r, k) => [r, b.res[k]]), ...v.comps.map((c, k) => [c, b.comps[k]])].filter(([x]) => x.qty > 0).map(([x, y]) =>
      `<div class="row">${icon(x.id) ? `<img src="${icon(x.id)}" alt="" loading="lazy">` : ''}<div class="grow">${esc(ST.refName(x.id))}</div>
        <div class="r">× ${nf(x.qty)}${x.qty !== y.qty ? ` <span class="delta up">−${nf(y.qty - x.qty)}</span>` : ''}</div></div>`).join('');
    const costA = (mode === 'asc' ? A.slice(0, step) : mode === 'tr' ? A : []).reduce((a, u) => a + (u.cost || 0), 0);
    const costX = mode === 'tr' ? X.slice(0, step).reduce((a, u) => a + (u.cost || 0), 0) : 0;
    return `${S.length ? ST.stats(S) : ''}${ST.stats(E)}
      ${R ? `<div class="list" style="margin-top:8px">${R}</div>` : ''}
      ${costA || costX ? `<div class="vp-cost">${costA ? `<span>${SHARD()} ${nf(costA)} ${tr('Estilhaços de Ascensão', 'Ascension Shards')}</span>` : ''}
        ${costX ? `<span>${SEAL()} ${nf(costX)} ${tr('Selos da Transcendência', 'Transcendence Seals')}</span>` : ''}</div>` : ''}
      ${applied.length ? `<div class="vp-applied">${applied.map((u, k) => `<span class="tag ${k >= A.length ? 'tr' : 'asc'}">${esc(u.text)}</span>`).join('')}</div>` : ''}
      ${v.other.length ? `<p class="note">${tr('Outros efeitos', 'Other effects')}: ${esc(v.other.join(' · '))}</p>` : ''}`;
  }

  // ---------------------------------------------------------------- detalhes
  const QUALS = () => [tr('Normal', 'Common'), tr('Superior', 'Uncommon'), tr('Magistral', 'Flawless'), tr('Épico', 'Epic'), tr('Lendário', 'Legendary')];

  async function detailHTML(i) {
    const src = ST.sourcesIndex ? (await ST.sourcesIndex().catch(() => new Map())).get(i.uid) : null;
    const { d, by, usedIn } = IDX;
    const [classes, chests] = await ST.need('classes', 'chests');
    const s = i.stats, ty = d.types[i.type] || {};
    const refRow = (id, right, extra = '') => {
      const isItem = by.has(id);
      return `<${isItem ? `a href="#/item/${id}"` : 'div'} class="row ${isItem ? 'link' : ''}">
        ${icon(id) ? `<img src="${icon(id)}" alt="" loading="lazy">` : ''}
        <div class="grow">${esc(ref(d, id))}${extra}</div><div class="r">${right}</div></${isItem ? 'a' : 'div'}>`;
    };
    const upgradeList = (arr, left) => (arr.length ? `<div class="list">${arr.map((u) => {
      const link = u.bp && by.has(u.bp);
      return `<${link ? `a href="#/item/${u.bp}"` : 'div'} class="row ${link ? 'link' : ''}"><div class="req">${left(u)}</div>
        ${u.bp && icon(u.bp) ? `<img src="${icon(u.bp)}" alt="" loading="lazy">` : ''}<div class="grow">${esc(u.text)}</div></${link ? 'a' : 'div'}>`;
    }).join('')}</div>` : '');

    const tags = [ST.tag(`Tier ${i.tier}`, 'hl'), ST.tag(`${t('level')} ${i.level}`), ST.tag(esc(d.categories[i.cat]))];
    if (i.source) tags.push(ST.tag(esc(i.source)));
    if (i.titan) tags.push(ST.tag(tr('Titã', 'Titan'), 'hl'));
    if (i.nonCraftable) tags.push(ST.tag(tr('Não fabricável', 'Not craftable')));
    if (ST.isUnreleased(i)) tags.push(ST.tag(`${tr('Em breve', 'Coming soon')}: ${relDate(i)}`, 'hl'));
    else if (i.releaseAt) tags.push(ST.tag(`${tr('Lançamento', 'Release')}: ${esc(String(i.releaseAt).slice(0, 10))}`));

    const combat = [s.atk && ST.stat(tr('Ataque', 'Attack'), nf(s.atk), 's-atk'), s.def && ST.stat(tr('Defesa', 'Defense'), nf(s.def), 's-def'),
      s.hp && ST.stat(tr('Vida (PV)', 'Health (HP)'), nf(s.hp), 's-hp'), s.eva && ST.stat(t('eva'), pct(s.eva), 's-eva'),
      s.crit && ST.stat(t('crit'), pct(s.crit), 's-crit'), s.shieldHp && ST.stat(tr('PV de escudo', 'Shield HP'), nf(s.shieldHp))].filter(Boolean);
    const econ = [ST.stat(t('value'), nf(i.value) + ' <i class="ic ic-coin"></i>', 'gold'), i.time && ST.stat(tr('Tempo de fabricação', 'Crafting time'), dur(i.time)),
      i.xp && ST.stat(tr('XP do comerciante', 'Merchant XP'), nf(i.xp)), i.craftXp && ST.stat(tr('XP de fabricação', 'Worker XP'), nf(i.craftXp)),
      i.favor && ST.stat(tr('Graça', 'Favor'), nf(i.favor))];
    const hasUp = (i.ascension && i.ascension.length) || (i.transcendence && i.transcendence.length);
    const e = i.energy;
    const energy = e.discount || e.surcharge || e.suggest || e.speedup ? ST.stats([ST.stat(tr('Desconto', 'Discount'), nf(e.discount)),
      ST.stat(tr('Sobretaxa', 'Surcharge'), nf(e.surcharge)), ST.stat(tr('Sugerir', 'Suggest'), nf(e.suggest)), ST.stat(tr('Acelerar', 'Speed up'), nf(e.speedup))]) : '';
    const craft = i.workers.length || i.resources.length || i.components.length ? `<div class="list">
      ${i.workers.map((w) => refRow(w.id, `${tr('Construção nv.', 'Building lv.')} ${w.lvl}`)).join('')}
      ${i.resources.map((r) => refRow(r.id, `× ${nf(r.qty)}`)).join('')}
      ${i.components.map((c) => refRow(c.id, `× ${nf(c.qty)}`, c.quality ? ' ' + ST.tag(c.quality === 'uncommon' ? tr('Superior+', 'Uncommon+') : tr('Qualquer qualidade', 'Any quality')) : '')).join('')}
    </div>` : '';
    const ench = [...i.elements.map((x) => ST.tag(`${esc(x.name)} +${x.value}`, 'hl')),
      ...i.elementAffinity.map((x) => ST.tag(`${tr('Afinidade', 'Affinity')}: ${esc(x.name)}`)),
      ...i.spiritAffinity.map((x) => ST.tag(`${tr('Espírito', 'Spirit')}: ${esc(x.name)}`))];
    const skill = i.skill ? `<div class="list"><div class="row">${icon(i.skill.icon) ? `<img src="${icon(i.skill.icon)}" alt="">` : ''}
      <div class="grow"><b>${esc(i.skill.name)}</b>${i.skill.desc ? `<div class="note">${clean(i.skill.desc)}</div>` : ''}
      ${ST.tags(i.skill.effects.map((x) => ST.tag(esc(x))))}</div></div></div>` : '';
    const trade = i.trade ? `<div class="list">${QUALS().map((q, k) =>
      `<div class="row"><div class="grow">${q}</div><div class="r">${nf(i.trade.min[k] ?? 0)} – ${nf(i.trade.max[k] ?? 0)} <i class="ic ic-coin"></i></div></div>`).join('')}</div>` : '';
    const used = usedIn.get(i.uid) || [];
    const usedHTML = used.length ? `<div class="list">${used.map((x) => refRow(x.uid, `T${x.tier} · × ${x.components.find((c) => c.id === i.uid).qty}`)).join('')}</div>` : '';
    const eqClasses = classes.filter((c) => c.slots.some((sl) => sl.some((x) => x.code === i.type)));
    const classHTML = eqClasses.length ? ST.tags(eqClasses.map((c) => `<a class="pill-link" href="#/classes/${c.uid}">${ST.tag(esc(c.name))}</a>`)) : '';
    const inChests = chests.filter((c) => c.blueprints.some((b) => b.id === i.uid));
    const origin = [i.chest && `<div class="row">${icon('chest_' + i.chest.id) ? `<img src="${icon('chest_' + i.chest.id)}" alt="">` : ''}<div class="grow">${esc(i.chest.name)}</div></div>`,
      ...inChests.map((c) => `<a class="row link" href="#/baus">${icon(c.icon) ? `<img src="${icon(c.icon)}" alt="">` : ''}<div class="grow">${esc(c.name)}</div><div class="r">${tr('projeto exclusivo', 'exclusive blueprint')}</div></a>`)].filter(Boolean);

    return `<div class="d-head"><div class="thumb">${img(i.uid)}</div><div>
        <h2 class="d-title">${esc(i.name)}</h2>
        <div class="d-sub">${esc(ty.name || i.type)}${ty.slot ? ' · slot ' + esc(ty.slot) : ''}${i.multiType.length ? ' · ' + tr('conta como', 'counts as') + ' ' + esc(i.multiType.join(', ')) : ''}</div>
      </div></div>
      ${i.desc ? `<p class="d-desc">${clean(i.desc)}</p>` : ''}
      ${ST.tags(tags)}
      ${ty.effect ? `<p class="note">${clean(ty.effect).replace('{0}', '')}</p>` : ''}
      <div class="tags" style="margin-top:12px">
        <a class="chip" href="p/${ST.ui}/item/${i.uid}.html" title="${tr('Página para compartilhar', 'Shareable page')}">${tr('Compartilhar', 'Share')}</a></div>
      ${hasUp ? `<section class="sec vp" data-uid="${i.uid}"><h3>${tr('Valores', 'Values')}</h3>
        <div class="seg" role="tablist">${[['base', 'Base'], ['asc', tr('Ascensão', 'Ascension')], ['tr', tr('Transcendência', 'Transcendence')]]
          .filter(([k]) => k === 'base' || (k === 'asc' ? i.ascension.length : (i.transcendence || []).length))
          .map(([k, l]) => `<button role="tab" data-mode="${k}" class="${k === 'base' ? 'on' : ''}" aria-selected="${k === 'base'}">${k === 'asc' ? SHARD() : k === 'tr' ? SEAL() : ''}${l}</button>`).join('')}</div>
        <div class="vp-steps" hidden><span class="small muted">${tr('Etapa', 'Step')}</span>${[1, 2, 3].map((n) => `<button data-step="${n}" class="${n === 3 ? 'on' : ''}">${n}</button>`).join('')}</div>
        <label class="check vp-ms"><input type="checkbox" data-ms> ${tr('Incluir marcos do projeto', 'Include blueprint milestones')}</label>
        <div class="vp-body">${valuesPanel(i, 'base', 3, false)}</div>
        <p class="note">${tr('Valores em qualidade Normal. A Transcendência inclui as 3 etapas de Ascensão; os efeitos são aplicados na ordem do jogo.',
          'Values at Common quality. Transcendence includes all 3 Ascension steps; effects are applied in game order.')}</p></section>`
        : `${ST.sec(tr('Atributos de combate', 'Combat stats'), combat.length ? ST.stats(combat) : '', tr('Valores base em qualidade Normal.', 'Base values at Common quality.'))}
      ${ST.sec(tr('Economia', 'Economy'), ST.stats(econ))}`}
      ${ST.sec(tr('Custos de energia', 'Energy costs'), energy)}
      ${ST.sec(tr('Fabricação', 'Crafting'), craft)}
      ${ST.sec(tr('Classes que podem equipar', 'Classes that can equip'), classHTML)}
      ${ST.sec(tr('Elementos e espíritos', 'Elements and spirits'), ench.length ? ST.tags(ench) : '')}
      ${ST.sec(tr('Habilidade / efeito especial', 'Skill / special effect'), skill)}
      ${ST.sec(tr('Marcos do projeto', 'Blueprint milestones'), upgradeList(i.milestones, (u) => u.req + '×'), tr('Desbloqueados ao fabricar o item N vezes.', 'Unlocked after crafting the item N times.'))}
      ${ST.sec(tr('Forjado nas Estrelas', 'Starforged'), upgradeList(i.starforged, (u) => u.req + '×'))}
      ${ST.sec(tr('Ascensão', 'Ascension'), upgradeList(i.ascension, (u) => `${u.cost} ${SHARD()}`), `${SHARD()} ${tr('Estilhaços de Ascensão por etapa.', 'Ascension Shards per step.')}`)}
      ${ST.sec(tr('Transcendência', 'Transcendence'), upgradeList(i.transcendence || [], (u) => `${u.cost} ${SEAL()}`),
        `${SEAL()} ${tr('Selos da Transcendência por etapa. Liberada no nível 50 do comerciante.', 'Transcendence Seals per step. Unlocks at merchant level 50.')}`)}
      ${ST.sec(tr('Faixa de preço no Mercado', 'Market price range'), trade, tr('Preço mínimo – máximo em ouro, por qualidade.', 'Minimum – maximum price in gold, per quality.'))}
      ${ST.sec(`${tr('Usado como componente em', 'Used as component in')} (${used.length})`, usedHTML)}
      ${src ? ST.sec(tr('Onde conseguir', 'Where to get'), ST.sourcesHTML(src), `<a href="#/onde/${i.uid}">${tr('Ver todas as fontes', 'See every source')}</a>`) : ''}
      ${ST.sec(tr('Origem', 'Source'), origin.length ? `<div class="list">${origin.join('')}</div>` : '')}
      <p class="note">ID: <code>${esc(i.uid)}</code></p>`;
  }

  ST.overlay('item', async ([uid]) => {
    await ST.itemsIndex();
    const i = IDX.by.get(uid);
    if (!i) return ST.drawer.open(ST.notFound());
    vpState.mode = 'base'; vpState.step = 3; vpState.ms = false;
    ST.drawer.open(await detailHTML(i), i.name);
    if (ST.itemNotes) ST.itemNotes(i);
  });
  // botões da ficha: lista de fabricação e comparador
  const vpState = { mode: 'base', step: 3, ms: false };
  const vpRender = (root) => {
    const i = IDX.by.get(root.dataset.uid);
    const max = vpState.mode === 'asc' ? i.ascension.length : vpState.mode === 'tr' ? (i.transcendence || []).length : 0;
    vpState.step = Math.min(vpState.step, max || 3);
    root.querySelectorAll('[data-mode]').forEach((x) => { x.classList.toggle('on', x.dataset.mode === vpState.mode); x.setAttribute('aria-selected', x.dataset.mode === vpState.mode); });
    const stepsEl = root.querySelector('.vp-steps');
    stepsEl.hidden = vpState.mode === 'base';
    stepsEl.querySelectorAll('[data-step]').forEach((x) => { x.hidden = +x.dataset.step > max; x.classList.toggle('on', +x.dataset.step === vpState.step); });
    const body = root.querySelector('.vp-body');
    body.innerHTML = valuesPanel(i, vpState.mode, vpState.step, vpState.ms);
    body.classList.remove('flash'); void body.offsetWidth; body.classList.add('flash');
  };
  document.getElementById('detail').addEventListener('change', (e) => {
    const root = e.target.closest('.vp');
    if (root && e.target.matches('[data-ms]')) { vpState.ms = e.target.checked; vpRender(root); }
  });
  document.getElementById('detail').addEventListener('click', (e) => {
    const vp = e.target.closest('.vp');
    if (vp) {
      const m = e.target.closest('[data-mode]'), st = e.target.closest('[data-step]');
      if (m) { vpState.mode = m.dataset.mode; vpState.step = 3; vpRender(vp); return; }
      if (st) { vpState.step = +st.dataset.step; vpRender(vp); return; }
    }
  });
})();
