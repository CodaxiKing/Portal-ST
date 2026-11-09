/* Páginas extras: passes, recompensas de eventos, quadro de recompensas, loja de gemas, expansões, sorte,
   histórias dos campeões e skins. */
(() => {
  const { t, tr, esc, nf, short, dur, img, dec } = ST;
  ST.addI18n({
    pt: { rewardsNav: 'Recompensas e loja', passes: 'Passes de conteúdo', evRewards: 'Recompensas de eventos', bounties: 'Quadro de recompensas',
      store: 'Loja de gemas', expansions: 'Expansões', luck: 'Sorte e Lua Cheia', stories: 'Histórias', skins: 'Skins' },
    en: { rewardsNav: 'Rewards & store', passes: 'Content passes', evRewards: 'Event rewards', bounties: 'Bounty board',
      store: 'Gem store', expansions: 'Expansions', luck: 'Luck & Full Moon', stories: 'Stories', skins: 'Skins' },
  });
  const TASK = {
    login: ['Entrar no jogo', 'Log in'], smalltalk: ['Conversar com clientes', 'Small talk'], bountytrophies: ['Troféus de recompensa', 'Bounty trophies'],
    surcharge: ['Sobretaxar', 'Surcharge'], discount: ['Dar desconto', 'Discount'], gathercomponent: ['Coletar componentes', 'Gather components'],
    marketsell: ['Vender no mercado', 'Sell on market'], kingsell: ['Vender ao rei', 'Sell to the King'], fulfillchampionrequest: ['Pedidos de campeões', 'Champion requests'],
    craftsuperioritems: ['Fabricar itens superiores', 'Craft superior items'], quest: ['Missões', 'Quests'], itemsell: ['Vender itens', 'Sell items'],
    fusion: ['Fundir itens', 'Fuse items'], craftitem: ['Fabricar', 'Craft'], craft: ['Fabricar', 'Craft'], sell: ['Vender', 'Sell'], suggest: ['Sugerir', 'Suggest'],
    enchant: ['Encantar', 'Enchant'], openchest: ['Abrir baús', 'Open chests'], investcity: ['Investir na cidade', 'Invest in the city'],
  };
  const taskName = (type, sub) => {
    const base = TASK[type] ? tr(...TASK[type]) : type;
    if (!sub || sub === 'any') return base;
    const s = ST.typeName ? ST.typeName(sub) : sub;
    return `${base}: ${s}`;
  };
  const rw = (r, cls = '') => {
    if (!r) return '<span class="muted">—</span>';
    const q = r.q > 1 || ['gems', 'gold'].includes(r.k) ? `${short(r.q)}× ` : '';
    const icon = r.k === 'gems' ? ST.ic('gem') : r.k === 'gold' ? ST.ic('coin') : img(r.id);
    const inner = `${icon}<span>${q}${esc(r.n || r.id)}</span>`;
    return r.k === 'item' || r.k === 'bp' ? `<a class="chip-item rw ${cls}" href="#/item/${r.id}">${inner}</a>` : `<span class="chip-item rw ${cls}">${inner}</span>`;
  };
  const pickTabs = (list, cur, base, label) => `<label class="field">${label}<select class="inp" id="pk">${list.map((x) => `<option value="${esc(x.id)}" ${x === cur ? 'selected' : ''}>${esc(x.name || x.id)}</option>`).join('')}</select></label>`;
  const bindPick = (el, base, param = 'id') => { const s = el.querySelector('#pk'); if (s) s.addEventListener('change', () => (location.hash = `${base}?${param}=${encodeURIComponent(s.value)}`)); };

  // ================================================================ passes de conteúdo
  ST.page('passes', {
    nav: 'passes', title: () => t('passes'),
    async render(el, args, query) {
      const [P] = await ST.need('passes');
      await ST.itemsIndex();
      const cur = P.passes.find((p) => p.id === query.get('id')) || P.passes[0];
      const tab = query.get('v') || 'rewards';
      const groups = {};
      cur.tasks.forEach((x) => (groups[x.family] = groups[x.family] || []).push(x));
      el.innerHTML = ST.pageHead(t('passes'), tr(`${P.passes.length} passes nos arquivos do jogo: recompensas grátis e do acesso completo, e as tarefas que dão pontos.`, `${P.passes.length} passes in the game files: free and full-access rewards, and the tasks that give points.`)) +
        `<div class="form-row">${pickTabs(P.passes, cur, '#/passes', tr('Passe', 'Pass'))}</div>` +
        ST.tabs([[`#/passes?id=${cur.id}`, tr('Recompensas', 'Rewards')], [`#/passes?id=${cur.id}&v=tasks`, tr('Tarefas', 'Tasks')], [`#/passes?id=${cur.id}&v=community`, tr('Eventos de comunidade', 'Community events')]],
          `#/passes?id=${cur.id}${tab === 'rewards' ? '' : '&v=' + tab}`) +
        (tab === 'rewards' ? ST.table(cur.rewards, [
          { key: 'i', label: '#', num: true }, { key: 'pts', label: tr('Pontos', 'Points'), num: true, fmt: (x) => nf(x.pts) },
          { key: 'free', label: tr('Grátis', 'Free'), fmt: (x) => rw(x.free) }, { key: 'prem', label: tr('Acesso completo', 'Full access'), fmt: (x) => rw(x.prem, 'prem') + (x.feat ? ' <span class="badge">★</span>' : '') }])
          : tab === 'tasks' ? `<div class="cv-grid">${Object.entries(groups).map(([f, xs]) => `<section class="cv-cat"><h3 class="cv-h"><span>${esc(taskName(xs[0].type, xs[0].sub))}</span><span class="muted small">${xs.length} ${tr('níveis', 'tiers')}</span></h3>
              <div class="list">${xs.map((x) => `<div class="row"><div class="grow">${tr('Meta', 'Goal')} ${nf(x.goal)}${x.premium ? ' <span class="badge">premium</span>' : ''}</div><div class="r">+${nf(x.pts)} ${tr('pts', 'pts')}</div></div>`).join('')}</div></section>`).join('')}</div>`
          : `<div class="cv-grid">${P.community.map((c) => `<section class="cv-cat"><h3 class="cv-h"><span>${esc(c.name)}</span></h3>
              ${c.tasks.length ? `<p class="small muted">${c.tasks.map((x) => `${esc(taskName(x.type, x.sub))} (${nf(x.pts)} pt)`).join(' · ')}</p>` : ''}
              <div class="list">${c.rewards.map((x) => `<div class="row"><span class="cv-rank">${short(x.goal)}</span><div class="grow">${rw(x.r)}</div></div>`).join('')}</div></section>`).join('')}</div>`);
      bindPick(el, '#/passes');
    },
  });

  // ================================================================ recompensas de eventos de missão
  ST.page('recompensas', {
    nav: 'recompensas', title: () => t('evRewards'),
    async render(el, args, query) {
      const [E] = await ST.need('eventrewards');
      await ST.itemsIndex();
      const ev = E.events.find((x) => x.id === query.get('e')) || E.events[0];
      const fam = ev.families.find((f) => f.id === query.get('f')) || ev.families[0];
      const R = (pair) => (pair ? rw({ id: pair[0], q: pair[1], n: (E.names[pair[0]] || [])[0], k: (E.names[pair[0]] || [])[1] }) : '—');
      el.innerHTML = ST.pageHead(t('evRewards'), tr('Recompensas por pontos de cada evento de missão (Torre dos Titãs, Cidade Dourada, Reinhold, Invasão Dracônica), com a versão VIP.', 'Points rewards for each quest event (Tower of Titans, Gold City, Reinhold, Dragon Invasion), with the VIP version.')) +
        ST.tabs(E.events.map((x) => [`#/recompensas?e=${x.id}`, esc(x.name)]), `#/recompensas?e=${ev.id}`) +
        `<div class="form-row"><label class="field">${tr('Trilha de recompensas', 'Reward track')} (${ev.families.length})<select class="inp" id="fam">${ev.families.map((f) => `<option ${f === fam ? 'selected' : ''}>${esc(f.id)}</option>`).join('')}</select></label></div>` +
        ST.table(fam.rows.map((r) => ({ i: r[0], pts: r[1], lvl: r[2], r: r[3], vip: r[4] })), [
          { key: 'i', label: '#', num: true }, { key: 'pts', label: tr('Pontos', 'Points'), num: true, fmt: (x) => nf(x.pts) },
          { key: 'lvl', label: tr('Nível mín.', 'Min level'), num: true }, { key: 'r', label: tr('Recompensa', 'Reward'), fmt: (x) => R(x.r) },
          { key: 'vip', label: 'VIP', fmt: (x) => R(x.vip) }]);
      el.querySelector('#fam').addEventListener('change', (e) => (location.hash = `#/recompensas?e=${ev.id}&f=${encodeURIComponent(e.target.value)}`));
    },
  });

  // ================================================================ quadro de recompensas
  ST.page('quadro', {
    nav: 'quadro', title: () => t('bounties'),
    async render(el, args, query) {
      const [M] = await ST.need('misc');
      await ST.itemsIndex();
      const kind = query.get('k') || 'guild';
      const rows = M.bounties.filter((b) => (kind === 'guild' ? b.guild : kind === 'premium' ? b.premium : !b.guild && !b.premium));
      el.innerHTML = ST.pageHead(t('bounties'), tr('Missões do quadro de recompensas: o que pedem, a meta recomendada, o prazo e quantos troféus dão.', 'Bounty board tasks: what they ask, the recommended goal, the deadline and how many trophies they give.')) +
        ST.tabs([['#/quadro?k=guild', tr('Guilda', 'Guild')], ['#/quadro?k=premium', 'Premium'], ['#/quadro?k=other', tr('Outras', 'Other')]], `#/quadro?k=${kind}`) +
        (rows.length ? ST.table(rows, [
          { key: 'type', label: tr('Tarefa', 'Task'), fmt: (b) => esc(taskName(b.type, b.sub)), sort: (b) => taskName(b.type, b.sub) },
          { key: 'diff', label: tr('Dificuldade', 'Difficulty'), num: true, fmt: (b) => '★'.repeat(Math.max(1, Math.min(5, b.diff || 1))) },
          { key: 'lvl', label: tr('Nível', 'Level'), num: true }, { key: 'goal', label: tr('Meta', 'Goal'), num: true, fmt: (b) => nf(b.goal) },
          { key: 'time', label: tr('Prazo', 'Deadline'), num: true, fmt: (b) => dur(b.time) },
          { key: 'reward', label: tr('Troféus', 'Trophies'), num: true, fmt: (b) => nf(b.reward) }], { sortKey: 'lvl' })
          : ST.empty(t('none'), ''));
    },
  });

  // ================================================================ loja de gemas
  ST.page('loja', {
    nav: 'loja', title: () => t('store'),
    async render(el) {
      const [M] = await ST.need('misc');
      await ST.itemsIndex();
      const packs = M.store.filter((s) => s.usd && s.gems).map((s) => ({ ...s, price: s.usd / 100, per: s.gems / (s.usd / 100) })).sort((a, b) => b.per - a.per);
      const subs = M.store.filter((s) => s.usd && (s.sub || s.days));
      const items = M.store.filter((s) => s.items.length);
      el.innerHTML = ST.pageHead(t('store'), tr('Pacotes de gemas pelo custo-benefício (gemas por dólar), assinaturas e pacotes de itens. Preços em dólar como estão nos arquivos.', 'Gem packs by value (gems per dollar), subscriptions and item packs. USD prices as stored in the files.')) +
        ST.sec(tr('Gemas por dólar', 'Gems per dollar'), packs.length ? ST.table(packs, [
          { key: 'id', label: tr('Pacote', 'Pack') }, { key: 'gems', label: tr('Gemas', 'Gems'), num: true, fmt: (s) => `${nf(s.gems)} ${ST.ic('gem')}` },
          { key: 'first', label: tr('Bônus 1ª compra', 'First-buy bonus'), num: true, fmt: (s) => (s.first ? nf(s.first) : '—') },
          { key: 'price', label: 'USD', num: true, fmt: (s) => '$' + dec(s.price, 2) }, { key: 'per', label: tr('Gemas/US$', 'Gems/USD'), num: true, fmt: (s) => dec(s.per, 1) }], { sortKey: 'per', sortDir: -1 }) : ST.empty(t('none'), '')) +
        (subs.length ? ST.sec(tr('Assinaturas e VIP', 'Subscriptions and VIP'), ST.table(subs, [
          { key: 'id', label: tr('Pacote', 'Pack') }, { key: 'days', label: tr('Dias', 'Days'), num: true }, { key: 'usd', label: 'USD', num: true, fmt: (s) => '$' + dec(s.usd / 100, 2) }])) : '') +
        (items.length ? ST.sec(tr('Pacotes de itens', 'Item packs'), `<div class="list">${items.map((s) => `<div class="row"><div class="grow"><b>${esc(s.id)}</b><div class="tags">${s.items.map((x) => rw(x)).join('')}</div></div>${s.usd ? `<div class="r">$${dec(s.usd / 100, 2)}</div>` : ''}</div>`).join('')}</div>`) : '');
    },
  });

  // ================================================================ expansões
  ST.page('expansoes', {
    nav: 'expansoes', title: () => t('expansions'),
    async render(el, args, query) {
      const [M] = await ST.need('misc');
      const k = query.get('k') || 'shop';
      const rows = M.exp[k] || [];
      let g = 0, m = 0;
      const withSum = rows.map((r) => ({ ...r, cg: (g += r.gold || 0), cm: (m += r.gems || 0) }));
      el.innerHTML = ST.pageHead(t('expansions'), tr('Custo de cada nível de expansão da loja, da expansão vertical e do porão, com o total acumulado.', 'Cost of every shop, vertical and basement expansion level, with the running total.')) +
        ST.tabs([['#/expansoes?k=shop', tr('Loja', 'Shop')], ['#/expansoes?k=vertical', tr('Vertical', 'Vertical')], ['#/expansoes?k=basement', tr('Porão', 'Basement')]], `#/expansoes?k=${k}`) +
        ST.table(withSum, [
          { key: 'lvl', label: t('level'), num: true }, { key: 'min', label: tr('Nível do comerciante', 'Merchant level'), num: true },
          { key: 'gold', label: tr('Ouro', 'Gold'), num: true, fmt: (r) => (r.gold ? nf(r.gold) : '—') }, { key: 'gems', label: tr('Gemas', 'Gems'), num: true, fmt: (r) => (r.gems ? nf(r.gems) : '—') },
          { key: 'time', label: t('time'), num: true, fmt: (r) => (r.time ? dur(r.time) : '—') },
          { key: 'cg', label: tr('Ouro acumulado', 'Total gold'), num: true, fmt: (r) => short(r.cg) }, { key: 'cm', label: tr('Gemas acumuladas', 'Total gems'), num: true, fmt: (r) => nf(r.cm) }]);
    },
  });

  // ================================================================ sorte: roleta, recompensas aleatórias, Lua Cheia
  ST.page('sorte', {
    nav: 'sorte', title: () => t('luck'),
    async render(el, args, query) {
      const [M] = await ST.need('misc');
      await ST.itemsIndex();
      const L = M.luck, tab = query.get('v') || 'moon';
      const features = [...new Set(L.cats.map((c) => c.feature))].filter(Boolean);
      let body = '';
      if (tab === 'moon') {
        body = ST.table(L.moon, [
          { key: 'result', label: tr('Resultado', 'Result'), fmt: (r) => rw({ ...r.result, q: r.qty }), sort: (r) => r.result.n || '' },
          { key: 'lvl', label: t('level'), num: true }, { key: 'full', label: tr('Lua Cheia', 'Full Moon'), fmt: (r) => (r.full ? ST.ic('check') : '') },
          { key: 'comps', label: tr('Ingredientes', 'Ingredients'), fmt: (r) => r.comps.map((c) => `${nf(c.q)}× ${esc(c.n || c.id)}${c.tier ? ` T${c.tier}+` : ''}`).join(', ') },
          { key: 'time', label: t('time'), num: true, fmt: (r) => dur(r.time) }], { sortKey: 'lvl' });
      } else if (tab === 'spin') {
        const tot = L.spin.reduce((a, s) => a + s.odds, 0) || 1;
        body = ST.table(L.spin, [{ key: 'id', label: tr('Símbolo', 'Symbol') }, { key: 'odds', label: tr('Chance', 'Chance'), num: true, fmt: (s) => dec(s.odds / tot * 100, 2) + '%' },
          { key: 'tokens', label: tr('Fichas', 'Tokens'), num: true }], { sortKey: 'odds', sortDir: -1 });
      } else {
        const f = query.get('f') || features[0];
        const cats = L.cats.filter((c) => c.feature === f), tot = cats.reduce((a, c) => a + c.odds, 0) || 1;
        const items = L.items.filter((x) => x.cats.some((c) => c.startsWith(f) || cats.some((k) => k.id === c)));
        body = `<div class="form-row"><label class="field">${tr('Origem', 'Source')}<select class="inp" id="feat">${features.map((x) => `<option ${x === f ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label></div>
          <div class="two-col">${ST.sec(tr('Categorias sorteadas', 'Rolled categories'), ST.table(cats, [{ key: 'id', label: tr('Categoria', 'Category') }, { key: 'type', label: t('type') },
            { key: 'odds', label: tr('Chance', 'Chance'), num: true, fmt: (c) => dec(c.odds / tot * 100, 1) + '%' }], { sortKey: 'odds', sortDir: -1 }))}
          ${ST.sec(tr('Itens possíveis', 'Possible items'), items.length ? `<div class="tags">${items.map((x) => rw({ id: x.item, q: x.qty, n: x.name, k: 'item' })).join('')}</div>` : `<p class="muted">${t('none')}</p>`)}</div>`;
      }
      el.innerHTML = ST.pageHead(t('luck'), tr('Receitas da Lua Cheia, chances da roleta e das recompensas aleatórias, direto das tabelas do jogo.', 'Full Moon recipes, spin wheel and random reward odds, straight from the game tables.')) +
        ST.tabs([['#/sorte', tr('Lua Cheia', 'Full Moon')], ['#/sorte?v=spin', tr('Roleta', 'Spin wheel')], ['#/sorte?v=random', tr('Aleatórios', 'Random rewards')]], `#/sorte${tab === 'moon' ? '' : '?v=' + tab}`) + body;
      const fs = el.querySelector('#feat'); if (fs) fs.addEventListener('change', () => (location.hash = `#/sorte?v=random&f=${fs.value}`));
    },
  });

  // ================================================================ histórias
  ST.page('historias', {
    nav: 'historias', title: () => t('stories'),
    async render(el, [fid], query) {
      const [S] = await ST.need('stories');
      if (!fid) {
        el.innerHTML = ST.pageHead(t('stories'), tr('As histórias de cada campeão, capítulo por capítulo, com os diálogos do jogo.', 'Each champion\'s story, chapter by chapter, with the in-game dialogue.')) +
          `<div class="tiles">${S.map((s) => `<a class="tile" href="#/historias/${s.id}"><div class="thumb">${img(ST.firstIcon(`cc_${s.id}`, `icon_global_${s.id}`))}</div><div class="tile-body">
            <div class="tile-title">${esc(s.name)}</div><div class="tile-sub">${s.chapters.length} ${tr('capítulos', 'chapters')}</div></div></a>`).join('')}</div>`;
        return;
      }
      const s = S.find((x) => x.id === fid);
      if (!s) { el.innerHTML = ST.notFound(); return; }
      const ci = Math.min(s.chapters.length - 1, Math.max(0, +(query.get('c') || 0)));
      const ch = s.chapters[ci];
      el.innerHTML = `<a class="crumb" href="#/historias">${ST.ic('left')} ${t('stories')}</a>
        <header class="detail-head" style="margin-top:12px"><div class="thumb">${img(ST.firstIcon(`cc_${s.id}`, `icon_global_${s.id}`))}</div><div><h1 class="d-title">${esc(s.name)}</h1>
          <div class="d-sub">${tr('Capítulo', 'Chapter')} ${ci + 1} / ${s.chapters.length}${ch.side ? ' · ' + tr('paralelo', 'side') : ''}</div></div></header>
        <div class="st-chs">${s.chapters.map((c, i) => `<a class="chip ${i === ci ? 'active' : ''}" href="#/historias/${s.id}?c=${i}">${esc(c.title || String(i + 1))}</a>`).join('')}</div>
        <div class="st-dlg">${ch.lines.length ? ch.lines.map((l) => `<div class="st-line ${l.a === s.id ? 'me' : ''}"><span class="st-actor">${esc(l.a || '')}</span><p>${ST.clean(l.t)}</p></div>`).join('') : `<p class="muted">${tr('Sem diálogos para este capítulo.', 'No dialogue for this chapter.')}</p>`}</div>
        ${ch.reward ? `<p class="note">${tr('Recompensa', 'Reward')}: ${rw(ch.reward)}</p>` : ''}`;
    },
  });

  // ================================================================ skins
  ST.page('skins', {
    nav: 'skins', title: () => t('skins'),
    async render(el, args, query) {
      const [M] = await ST.need('misc');
      const k = query.get('k') || 'hero';
      const list = (M.skins[k] || []).filter((x) => !ST.isUnreleased || !x.release || !ST.isUnreleased({ releaseAt: x.release }));
      const price = (x) => [x.gold && `${short(x.gold)} ${ST.ic('coin')}`, x.gems && `${nf(x.gems)} ${ST.ic('gem')}`, x.shards && `${nf(x.shards)} ${tr('estilhaços', 'shards')}`].filter(Boolean).join(' · ') || (x.excl ? esc(x.excl) : tr('evento/recompensa', 'event/reward'));
      el.innerHTML = ST.pageHead(t('skins'), tr('Visuais de heróis, skins de móveis e de mascotes, com preço ou origem.', 'Hero cosmetics, furniture and pet skins, with price or source.')) +
        ST.tabs([['#/skins', tr('Heróis', 'Heroes')], ['#/skins?k=furniture', tr('Móveis', 'Furniture')], ['#/skins?k=pets', tr('Mascotes', 'Pets')]], `#/skins${k === 'hero' ? '' : '?k=' + k}`) +
        `<div class="tiles">${list.map((x) => `<div class="tile"><div class="thumb">${img(x.id)}</div><div class="tile-body"><div class="tile-title">${esc(x.n || x.id)}</div>
          <div class="tile-sub">${esc(x.type || x.family || x.pet || '')}${x.lvl ? ` · ${t('level')} ${x.lvl}` : ''}</div><div class="small" style="margin-top:4px">${price(x)}</div></div></div>`).join('')}</div>`;
    },
  });
})();
