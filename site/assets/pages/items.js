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
  const PAGE = 120;
  const state = { cat: '', type: '', q: '', tmin: null, tmax: null, sort: 'tier', dir: 1, view: 'grid', shown: 0, list: [] };
  try { state.view = localStorage.getItem('st_view') || 'grid'; } catch (e) {}

  const statsMini = (i) => {
    const s = i.stats, out = [`<span class="gold">${short(i.value)} <i class="ic ic-coin"></i></span>`];
    if (s.atk) out.push(`<span class="s-atk">${t('atk')} ${nf(s.atk)}</span>`);
    if (s.def) out.push(`<span class="s-def">${t('def')} ${nf(s.def)}</span>`);
    if (s.hp) out.push(`<span class="s-hp">${t('hp')} ${nf(s.hp)}</span>`);
    if (s.eva) out.push(`<span class="s-eva">ESQ ${pct(s.eva)}</span>`);
    if (s.crit) out.push(`<span class="s-crit">CRIT ${pct(s.crit)}</span>`);
    return out.join('');
  };
  const cardHTML = (i, d) => `<a class="card" href="#/item/${i.uid}">
      <div class="thumb">${img(i.uid)}<span class="tier-badge">T${i.tier}</span></div>
      <div class="card-body"><div class="card-name">${esc(i.name)}</div>
      <div class="card-type">${esc(d.types[i.type].name)} · ${t('level')} ${i.level}</div>
      <div class="card-stats">${statsMini(i)}</div></div></a>`;
  const rowHTML = (i, d) => `<tr data-href="#/item/${i.uid}"><td>${icon(i.uid) ? `<img src="${icon(i.uid)}" alt="" loading="lazy">` : ''}</td>
      <td>${esc(i.name)}</td><td>${esc(d.types[i.type].name)}</td><td class="num">${i.tier}</td>
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
          `<button data-cat="${k}" class="${k === state.cat ? 'active' : ''}">${esc(v)}</button>`).join('')}</nav>
        <section class="toolbar">
          <input id="q" type="search" placeholder="${tr('Buscar item, recurso, componente…', 'Search item, resource, component…')}" value="${esc(state.q)}" autocomplete="off">
          <select id="type"></select>
          <label class="tier"><span>${t('tier')}</span><select id="tierMin">${tierOpts}</select><span>–</span><select id="tierMax">${tierOpts}</select></label>
          <select id="sort">
            <option value="tier">${t('sortBy')}: ${t('tier')}</option><option value="value">${t('value')}</option>
            <option value="atk">${t('atk')}</option><option value="def">${t('def')}</option><option value="hp">${t('hp')}</option>
            <option value="time">${t('time')}</option><option value="name">${t('name')}</option></select>
          <button class="chip" id="dir" aria-label="Ordem"><i class="ic ic-down"></i></button>
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
      const fillTypes = () => {
        const codes = [...new Set(d.items.filter((i) => !state.cat || i.cat === state.cat).map((i) => i.type))]
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
          state.q ? tr(`Nada encontrado para “${esc(state.q)}”. Tente outro termo ou amplie o tier.`, `Nothing found for “${esc(state.q)}”. Try another term or widen the tier range.`)
            : tr('Amplie o intervalo de tier ou escolha outra categoria.', 'Widen the tier range or pick another category.'),
          `<button class="chip primary" id="clearF">${tr('Limpar filtros', 'Clear filters')}</button>`);
      };
      const key = { tier: (i) => i.tier * 1000 + i.level, value: (i) => i.value, atk: (i) => i.stats.atk, def: (i) => i.stats.def, hp: (i) => i.stats.hp, time: (i) => i.time };
      const apply = () => {
        const words = ST.norm(state.q).split(/\s+/).filter(Boolean);
        const lo = Math.min(state.tmin, state.tmax), hi = Math.max(state.tmin, state.tmax);
        const list = d.items.filter((i) => (!state.cat || i.cat === state.cat) && (!state.type || i.type === state.type) &&
          i.tier >= lo && i.tier <= hi && words.every((w) => i._s.includes(w)));
        if (state.sort === 'name') list.sort((a, b) => state.dir * a.name.localeCompare(b.name));
        else { const k = key[state.sort]; list.sort((a, b) => state.dir * (k(a) - k(b)) || a.name.localeCompare(b.name)); }
        state.list = list;
        $('#count').textContent = `${nf(list.length)} ${t('ofItems')} ${nf(d.items.length)} ${t('items').toLowerCase()}`;
        ST.setQuery({ q: state.q, cat: state.cat, type: state.type, tmin: state.tmin !== tiers[0] ? state.tmin : '', tmax: state.tmax !== tiers[tiers.length - 1] ? state.tmax : '' });
        render(true);
      };
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
    if (i.releaseAt) tags.push(ST.tag(`${tr('Lançamento', 'Release')}: ${esc(String(i.releaseAt).slice(0, 10))}`));

    const combat = [s.atk && ST.stat(tr('Ataque', 'Attack'), nf(s.atk), 's-atk'), s.def && ST.stat(tr('Defesa', 'Defense'), nf(s.def), 's-def'),
      s.hp && ST.stat(tr('Vida (PV)', 'Health (HP)'), nf(s.hp), 's-hp'), s.eva && ST.stat(t('eva'), pct(s.eva), 's-eva'),
      s.crit && ST.stat(t('crit'), pct(s.crit), 's-crit'), s.shieldHp && ST.stat(tr('PV de escudo', 'Shield HP'), nf(s.shieldHp))].filter(Boolean);
    const econ = [ST.stat(t('value'), nf(i.value) + ' <i class="ic ic-coin"></i>', 'gold'), i.time && ST.stat(tr('Tempo de fabricação', 'Crafting time'), dur(i.time)),
      i.xp && ST.stat(tr('XP do comerciante', 'Merchant XP'), nf(i.xp)), i.craftXp && ST.stat(tr('XP de fabricação', 'Worker XP'), nf(i.craftXp)),
      i.favor && ST.stat(tr('Graça', 'Favor'), nf(i.favor))];
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
      <div class="tags" style="margin-top:12px">${!i.nonCraftable && (i.resources.length || i.components.length) ? `<a class="chip" href="#/calculadora/${i.uid}"><i class="ic ic-hammer"></i> ${t('calculator')}</a>
        <button class="chip" data-act="list" data-uid="${i.uid}">${tr('Adicionar à lista', 'Add to list')}</button>` : ''}
        <button class="chip" data-act="cmp" data-uid="${i.uid}">${tr('Comparar', 'Compare')}</button>
        ${['weapon', 'armor', 'accessory'].includes(i.cat) && (i.elementAffinity.length || i.spiritAffinity.length) ? `<a class="chip" href="#/encantamentos?m=item&i=${i.uid}">${tr('Encantamentos', 'Enchantments')}</a>` : ''}
        <a class="chip" href="p/${ST.ui}/item/${i.uid}.html" title="${tr('Página para compartilhar', 'Shareable page')}">${tr('Compartilhar', 'Share')}</a></div>
      ${ST.sec(tr('Atributos de combate', 'Combat stats'), combat.length ? ST.stats(combat) : '', tr('Valores base em qualidade Normal.', 'Base values at Common quality.'))}
      ${ST.sec(tr('Economia', 'Economy'), ST.stats(econ))}
      ${ST.sec(tr('Custos de energia', 'Energy costs'), energy)}
      ${ST.sec(tr('Fabricação', 'Crafting'), craft)}
      ${ST.sec(tr('Classes que podem equipar', 'Classes that can equip'), classHTML)}
      ${ST.sec(tr('Elementos e espíritos', 'Elements and spirits'), ench.length ? ST.tags(ench) : '')}
      ${ST.sec(tr('Habilidade / efeito especial', 'Skill / special effect'), skill)}
      ${ST.sec(tr('Marcos do projeto', 'Blueprint milestones'), upgradeList(i.milestones, (u) => u.req + '×'), tr('Desbloqueados ao fabricar o item N vezes.', 'Unlocked after crafting the item N times.'))}
      ${ST.sec(tr('Forjado nas Estrelas', 'Starforged'), upgradeList(i.starforged, (u) => u.req + '×'))}
      ${ST.sec(tr('Ascensão', 'Ascension'), upgradeList(i.ascension, (u) => u.cost + ' <i class="ic ic-shard"></i>'), tr('<i class="ic ic-shard"></i> = Estilhaços de Ascensão por etapa.', '<i class="ic ic-shard"></i> = Ascension Shards per step.'))}
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
    ST.drawer.open(await detailHTML(i), i.name);
  });
  // botões da ficha: lista de fabricação e comparador
  document.getElementById('detail').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'list') { const n = ST.listAdd(b.dataset.uid, 1); b.innerHTML = `${ST.ic('check')} ${ST.tr('Na lista', 'In list')} (${n}) · <u>${ST.tr('abrir', 'open')}</u>`; b.onclick = () => (location.hash = '#/lista'); }
    if (b.dataset.act === 'cmp') location.hash = ST.compareAdd(b.dataset.uid);
  });
})();
