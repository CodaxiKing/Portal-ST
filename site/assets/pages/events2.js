/* Eventos: Cidade Perdida de Ouro (níveis, Ouro Puro, baús, recompensas da guilda, títulos e o melhor grupo pelo
   motor do Hypermax) e eventos de comunidade (tarefas, metas e recompensas). */
(() => {
  const { t, tr, esc, nf, short, img, dec } = ST;
  ST.addI18n({ pt: { goldcity: 'Cidade Perdida de Ouro', commEvents: 'Eventos de comunidade' }, en: { goldcity: 'Lost City of Gold', commEvents: 'Community events' },
    es: { goldcity: 'Ciudad Perdida de Oro', commEvents: 'Eventos de comunidad' }, fr: { goldcity: "Cité d'or perdue", commEvents: 'Événements communautaires' },
    de: { goldcity: 'Verlorene Stadt aus Gold', commEvents: 'Community-Events' }, it: { goldcity: "Città perduta dell'oro", commEvents: 'Eventi della comunità' } });

  const rw = (r) => {
    if (!r) return '<span class="muted">—</span>';
    const q = r.q > 1 || ['gems', 'gold'].includes(r.k) ? `${short(r.q)}× ` : '';
    const icon = r.k === 'gems' || r.id === 'gems' ? ST.ic('gem') : r.k === 'gold' ? ST.ic('coin') : img(r.id);
    const inner = `${icon}<span>${q}${esc(r.n || r.id)}</span>`;
    return r.k === 'item' || r.k === 'bp' ? `<a class="chip-item rw" href="#/item/${r.id}">${inner}</a>` : `<span class="chip-item rw">${inner}</span>`;
  };
  const infoCards = (info, icons) => (info && info.length ? `<div class="ev-info">${info.map(([h, b], i) =>
    `<div class="ev-card">${icons[i] && ST.icon(icons[i]) ? img(icons[i]) : ''}<div><b>${esc(h || '')}</b><p>${esc(b || '')}</p></div></div>`).join('')}</div>` : '');
  const HM_OPT = { q: 4, lv: 50, tr: true, sf: true, col: true, en: true, sk: true, soon: false };

  // ================================================================ Cidade Perdida de Ouro
  ST.page('cidadeouro', {
    nav: 'cidadeouro', title: () => t('goldcity'),
    async render(el, args, query) {
      const [evs, zones, chests, E, titles, classes, skills, prog] = await ST.need('events', 'quests', 'chests', 'eventrewards', 'titles', 'classes', 'skills', 'progression');
      const { d } = await ST.itemsIndex();
      const z = zones.find((x) => x.id === 'goldcity');
      const ev = E.events.find((x) => x.id === 'goldcity');
      const fam = ev && (ev.families.find((f) => f.id === query.get('f')) || ev.families[ev.families.length - 1]);
      const R = (pair) => (pair ? rw({ id: pair[0], q: pair[1], n: (E.names[pair[0]] || [])[0], k: (E.names[pair[0]] || [])[1] }) : '—');
      const gc = evs.goldcity || {};
      const ch = chests.filter((c) => c.zone === 'goldcity' || /goldcity/.test(c.uid));
      const tl = (titles.titles || titles || []).filter ? (titles.titles || titles).filter((x) => x.family === 'lcog' || x.family === 'craft_goldcity') : [];
      const items = d.items.filter((i) => /^lcog/.test(i.uid));
      const levels = (z ? z.levels : []).map((l, i) => {
        const gold = (l.comps || []).find((c) => c.id === 'puregold');
        return { i: i + 1, l, gold: gold ? gold.qty.replace(',', '–') : '—' };
      });
      el.innerHTML = ST.pageHead(`${ST.icon('icon_quest_goldcity') ? `<span class="ev-hico">${img('icon_quest_goldcity')}</span>` : ''}${t('goldcity')}`,
        tr('Masmorra de guilda por tempo limitado: os heróis coletam Ouro Puro e o total da guilda libera recompensas para todos. Dados dos arquivos do jogo; as datas vêm do servidor.',
          'Limited-time guild dungeon: heroes collect Pure Gold and the guild total unlocks rewards for everyone. Data from the game files; dates come from the server.')) +
        infoCards(gc.info, ['icon_news_header_goldcity', 'icon_lostcityofgold_puregold', 'icon_global_grand_prize_goldcity_blueprint']) + `
        <div class="hm-progress" id="gcProg"><div class="hm-pbar"><i style="--w:0%"></i></div><span class="small muted">${tr('Calculando o melhor grupo (Hypermax)…', 'Computing the best party (Hypermax)…')} <span id="gcPct">0%</span></span></div>
        <div id="gcParty"></div>
        ${ST.sec(tr('Níveis da masmorra', 'Dungeon levels'), `<div id="gcLevels"></div>`, tr('Poder por herói = poder recomendado ÷ tamanho do grupo. A coluna “Grupo Hypermax” compara com os 5 heróis mais fortes do Hypermax.', 'Per-hero power = recommended power ÷ party size. The “Hypermax party” column compares with the 5 strongest Hypermax heroes.'))}
        <div class="two-col">
          ${ST.sec(tr('Baús da Cidade', 'City chests'), `<div class="list">${ch.map((c) => `<a class="row" href="#/baus">${img(c.uid)}<div class="grow"><b>${esc(c.name)}</b><div class="small muted">${esc(c.keyName || '')} · ${tr('itens nível', 'item level')} ${(c.itemLevel || []).join('–')}</div></div></a>`).join('')}</div>`)}
          ${ST.sec(tr('Títulos e itens do evento', 'Event titles and items'), `<div class="list">${tl.map((x) => `<div class="row">${ST.icon('icon_goldcity_endless_event_' + ['bronze', 'silver', 'gold'][Math.min(2, (x.tier || 1) - 1)]) ? img('icon_goldcity_endless_event_' + ['bronze', 'silver', 'gold'][Math.min(2, (x.tier || 1) - 1)]) : ''}<div class="grow"><b>${esc(x.name)}</b> <span class="small muted">T${x.tier}</span><div class="small muted">${esc(x.desc || nf(x.threshold))}</div></div></div>`).join('')}
            ${items.map((i) => `<a class="row" href="#/item/${i.uid}">${img(i.uid)}<div class="grow"><b>${esc(i.name)}</b> <span class="small muted">T${i.tier}</span></div></a>`).join('')}</div>`)}
        </div>
        ${fam ? ST.sec(tr('Recompensas da guilda por Ouro Puro', 'Guild rewards by Pure Gold'), `<div class="form-row"><label class="field">${tr('Trilha de recompensas', 'Reward track')} (${ev.families.length})<select class="inp" id="gcFam">${ev.families.map((f) => `<option ${f === fam ? 'selected' : ''}>${esc(f.id)}</option>`).join('')}</select></label></div>` +
          ST.table(fam.rows.map((r) => ({ i: r[0], pts: r[1], lvl: r[2], r: r[3], vip: r[4] })), [
            { key: 'i', label: '#', num: true }, { key: 'pts', label: tr('Ouro Puro da guilda', 'Guild Pure Gold'), num: true, fmt: (x) => nf(x.pts) },
            { key: 'lvl', label: tr('Contribuição mín.', 'Min contribution'), num: true }, { key: 'r', label: tr('Recompensa', 'Reward'), fmt: (x) => R(x.r) },
            { key: 'vip', label: 'VIP', fmt: (x) => R(x.vip) }]), tr('Os arquivos têm várias trilhas (uma por edição do evento); a última é a mais recente.', 'The files hold several tracks (one per event edition); the last one is the most recent.')) : ''}`;
      const sel = el.querySelector('#gcFam');
      if (sel) sel.addEventListener('change', () => (location.hash = '#/cidadeouro?f=' + encodeURIComponent(sel.value)));
      const drawLevels = (party) => {
        el.querySelector('#gcLevels').innerHTML = ST.table(levels, [
          { key: 'i', label: '#', num: true },
          { key: 'power', label: tr('Poder recomendado', 'Recommended power'), num: true, sort: (r) => r.l.power, fmt: (r) => (r.l.power ? nf(r.l.power) : '—') },
          { key: 'per', label: tr('Por herói', 'Per hero'), num: true, sort: (r) => r.l.power / (r.l.party || 1), fmt: (r) => (r.l.power ? nf(Math.ceil(r.l.power / (r.l.party || 1))) : '—') },
          { key: 'party', label: tr('Grupo', 'Party'), num: true, fmt: (r) => r.l.party },
          { key: 'gold', label: tr('Ouro Puro', 'Pure Gold'), num: true, sort: (r) => parseFloat(r.gold) || 0, fmt: (r) => `${ST.icon('puregold') ? img('puregold') : ''} ${esc(r.gold)}` },
          { key: 'boss', label: tr('Chefe', 'Boss'), fmt: (r) => (r.l.boss ? `<span class="badge">${tr('chefe', 'boss')}</span>` : '') },
          { key: 'ok', label: tr('Grupo Hypermax', 'Hypermax party'), fmt: (r) => (!party ? '…' : !r.l.power || party.slice(0, r.l.party || 5).reduce((a, b) => a + b.power, 0) >= r.l.power ? `<span class="ok">${ST.ic('check')}</span>` : `<span class="bad">${tr('fraco', 'short')}</span>`) }]);
      };
      drawLevels(null);
      const hash = location.hash;
      const P = ST.hmDebug.prepare(d, skills, prog.constants || {}, HM_OPT);
      const builds = (await ST.hmComputeAll(classes, P, skills, prog.constants || {}, HM_OPT, (n, tot) => {
        const pct = Math.round((n / tot) * 100), bar = el.querySelector('#gcProg i'), lab = el.querySelector('#gcPct');
        if (bar) bar.style.setProperty('--w', pct + '%'); if (lab) lab.textContent = pct + '%';
      })).sort((a, b) => b.power - a.power);
      if (location.hash !== hash) return;
      el.querySelector('#gcProg').remove();
      const top = builds.slice(0, 5);
      el.querySelector('#gcParty').innerHTML = ST.sec(tr('Melhor grupo (Hypermax)', 'Best party (Hypermax)'),
        `<div class="hm-grid">${top.map((b, i) => ST.hmUI.card(b, i + 1, { ...HM_OPT, href: '#/hypermax/' + b.c.uid })).join('')}</div>`,
        ST.trf(`Poder somado: {0}. Os 5 heróis mais fortes pelo motor do Hypermax (qualidade Lendária, melhorias completas).`, `Total power: {0}. The 5 strongest heroes by the Hypermax engine (Legendary, full upgrades).`, nf(Math.round(top.reduce((a, b) => a + b.power, 0)))));
      drawLevels(top);
    },
  });

  // ================================================================ eventos de comunidade
  ST.page('comunidade-eventos', {
    nav: 'comunidade-eventos', title: () => t('commEvents'),
    async render(el, args, query) {
      const [evs, P, cal] = await ST.need('events', 'passes', 'calendar');
      await ST.itemsIndex();
      const meta = new Map((evs.community || []).map((c) => [c.id, c]));
      const list = P.community;
      const cur = list.find((c) => c.id === query.get('id')) || list[list.length - 1];
      const m = meta.get(cur.id) || {};
      const login = cal.logins.find((g) => g.id === m.theme || g.id === cur.id);
      const TASKN = { craftitem: ['Fabricar', 'Craft'], craft: ['Fabricar', 'Craft'], sell: ['Vender', 'Sell'], quest: ['Missões', 'Quests'], openchest: ['Abrir baús', 'Open chests'],
        investcity: ['Investir na cidade', 'Invest in the city'], fusion: ['Fundir itens', 'Fuse items'], enchant: ['Encantar', 'Enchant'], login: ['Entrar no jogo', 'Log in'],
        craftitemtiers: ['Fabricar itens (pontos por tier)', 'Craft items (points per tier)'], craftenchantmenttiers: ['Fabricar encantamentos (por tier)', 'Craft enchantments (per tier)'],
        itemselltiers: ['Vender itens (por tier)', 'Sell items (per tier)'], questdifficulty: ['Missões (por dificuldade)', 'Quests (by difficulty)'],
        questsuccess: ['Missões concluídas', 'Successful quests'], questfail: ['Missões fracassadas', 'Failed quests'], defeatboss: ['Derrotar chefes', 'Defeat bosses'],
        components: ['Coletar componentes', 'Gather components'], resources: ['Coletar recursos', 'Gather resources'], marketsell: ['Vender no mercado', 'Sell on market'],
        smalltalk: ['Conversar com clientes', 'Small talk'], fulfillchampionrequest: ['Pedidos de campeões', 'Champion requests'] };
      const ELN = { fire: ['Fogo', 'Fire'], water: ['Água', 'Water'], dark: ['Escuridão', 'Dark'], air: ['Ar', 'Air'], earth: ['Terra', 'Earth'], light: ['Luz', 'Light'], gold: ['Ouro', 'Gold'] };
      const subName = (x) => (x.type === 'enchant' && ELN[x.sub] ? tr(...ELN[x.sub]) : ST.typeName ? ST.typeName(x.sub) : x.sub);
      el.innerHTML = ST.pageHead(t('commEvents'), tr('Todos os jogadores somam pontos juntos; ao bater cada meta, todos ganham a recompensa.', 'All players add points together; each goal reached gives everyone the reward.')) + `
        <div class="ev-tiles">${list.map((c) => { const mm = meta.get(c.id) || {}; return `<a class="ev-tile ${c === cur ? 'on' : ''}" href="#/comunidade-eventos?id=${c.id}">${ST.icon(mm.icon) ? img(mm.icon) : `<span class="cal-ph">${ST.ic('star')}</span>`}<span>${esc(c.name)}</span></a>`; }).join('')}</div>
        <section class="sec ev-head">${ST.icon(m.icon) ? `<div class="ev-banner">${img(m.icon)}</div>` : ''}<div><h2>${esc(cur.name)}</h2>
          ${m.desc ? `<p>${esc(m.desc)}</p>` : ''}${m.progress ? `<p class="muted">${esc(m.progress)}</p>` : ''}
          ${login ? `<p class="small">${ST.ic('calendar')} ${tr('Mesmo tema do evento de login', 'Same theme as login event')} <a href="#/calendario?m=${login.d.slice(0, 7)}&d=${login.d}">${esc(login.n)}</a> (${new Date(login.d + 'T12:00').toLocaleDateString(ST.locale)})</p>` : ''}
          ${m.min ? `<p class="small muted">${tr('Contribuição mínima para receber', 'Minimum contribution to qualify')}: ${nf(m.min)}</p>` : ''}</div></section>
        <div class="two-col">
          ${ST.sec(tr('Tarefas que dão pontos', 'Tasks that give points'), cur.tasks.length ? `<div class="list">${cur.tasks.map((x) => `<div class="row"><div class="grow">${esc(TASKN[x.type] ? tr(...TASKN[x.type]) : x.type)}${x.sub && x.sub !== 'any' && x.sub !== 'null' ? ` <span class="small muted">${esc(subName(x))}</span>` : ''}</div><div class="r">+${nf(x.pts)} pt</div></div>`).join('')}</div>` : `<p class="muted">${t('none')}</p>`)}
          ${ST.sec(tr('Metas e recompensas', 'Goals and rewards'), `<div class="list">${cur.rewards.map((x, i) => `<div class="row"><span class="cv-rank">${i + 1}</span><div class="grow">${rw(x.r)}${x.alt ? ` <span class="small muted">${tr('ou', 'or')}</span> ${rw(x.alt)}` : ''}</div><div class="r">${short(x.goal)}</div></div>`).join('')}</div>`)}
        </div>`;
    },
  });

  // ================================================================ Capricho do Rei
  ST.addI18n({ pt: { caprice: 'Capricho do Rei' }, en: { caprice: "King's Caprice" }, es: { caprice: 'Capricho del Rey' }, fr: { caprice: 'Caprice du Roi' },
    de: { caprice: 'Laune des Königs' }, it: { caprice: 'Capriccio del Re' } });
  const KK = { item: ['Item', 'Item'], furniture: ['Móvel', 'Furniture'], look: ['Visual', 'Look'], deco: ['Decoração', 'Decoration'] };
  const CATN = { w: ['Armas', 'Weapons'], armors: ['Armaduras', 'Armor'], x: ['Acessórios', 'Accessories'], enchantments: ['Encantamentos', 'Enchantments'], stones: ['Pedras', 'Stones'],
    spirits: ['Espíritos', 'Spirits'], elements: ['Elementos', 'Elements'] };
  ST.page('capricho', {
    nav: 'capricho', title: () => t('caprice'),
    async render(el, args, query) {
      const [evs, E] = await ST.need('events', 'eventrewards');
      await ST.itemsIndex();
      const K = evs.king, R = K.rules, today = ST.today();
      const kind = KK[query.get('k')] ? query.get('k') : '', tmin = +(query.get('tmin') || 0), q = ST.norm(query.get('q') || '');
      const filt = (x) => (!kind || x.k === kind) && (!tmin || x.t >= tmin) && (!q || ST.norm(x.n).includes(q));
      const showAll = query.get('all') === '1';
      const soon = K.shop.filter((x) => x.e > today && filt(x));
      const now = K.shop.filter((x) => x.e <= today && filt(x)).sort((a, b) => b.e.localeCompare(a.e));
      const recent = now.filter((x) => x.e >= ST.addDays(today, -30));
      const byDay = new Map();
      soon.forEach((x) => { if (!byDay.has(x.e)) byDay.set(x.e, []); byDay.get(x.e).push(x); });
      const icon = (x) => (ST.icon(x.u) ? img(x.u) : `<span class="cal-ph">${ST.ic('star')}</span>`);
      const shard = ST.icon('antique_shard') ? `<img class="cur-img" src="${ST.icon('antique_shard')}" alt="">` : ST.ic('shard');
      const fmt = (d) => new Date(d + 'T12:00').toLocaleDateString(ST.locale, { day: '2-digit', month: 'short', year: 'numeric' });
      const row = (x) => `<${x.k === 'item' ? `a href="#/item/${x.u}"` : 'div'} class="row">${icon(x)}<div class="grow"><b>${esc(x.n)}</b> <span class="badge">${esc(tr(...KK[x.k]))}</span>${x.t ? ` <span class="small muted">T${x.t}</span>` : ''}
        <div class="small muted">${tr('lançado em', 'released')} ${fmt(x.r)} · +${x.d} ${tr('dias', 'days')}</div></div><div class="r">${shard} ${nf(x.p)}</div></${x.k === 'item' ? 'a' : 'div'}>`;
      const ev = E.events.find((x) => x.id === 'king');
      const fam = ev && (ev.families.find((f) => f.id === query.get('f')) || ev.families[ev.families.length - 1]);
      const RW = (pair) => (pair ? rw({ id: pair[0], q: pair[1], n: (E.names[pair[0]] || [])[0], k: (E.names[pair[0]] || [])[1] }) : '—');
      const hrs = (s) => (s >= 3600 ? `${s / 3600} h` : `${Math.round(s / 60)} min`);
      const typeChips = (list) => list.map(([c]) => `<span class="chip">${esc(CATN[c] ? tr(...CATN[c]) : ST.typeName(c))}</span>`).join('');
      const qs2 = (extra) => {
        const p = new URLSearchParams();
        if (kind) p.set('k', kind); if (tmin) p.set('tmin', tmin); if (query.get('q')) p.set('q', query.get('q'));
        for (const [a, b] of Object.entries(extra)) if (b === '' || b === 0) p.delete(a); else p.set(a, b);
        const s2 = p.toString(); return '#/capricho' + (s2 ? '?' + s2 : '');
      };
      el.innerHTML = ST.pageHead(`${ST.icon('icon_event_reward_dialog') ? `<span class="ev-hico">${img('icon_event_reward_dialog')}</span>` : ''}${t('caprice')}`,
        tr('O Rei pede itens para fabricar; cada entrega dá Graça para você e para a guilda. Os pedidos são sorteados, então não dá para saber quais itens virão. A loja de Fichas de Antiguidade dá: cada projeto entra no sorteio da loja um tempo depois de lançado, e as datas estão abaixo.',
          'The King asks for items to craft; each delivery gives Favor to you and your guild. Requests are drawn at random, so which items will come cannot be known. The Antique Shard shop can: each blueprint enters the shop draw some time after release, and the dates are below.')) + `
        ${R.info ? `<p class="note">${esc(R.info)}</p>` : ''}
        <div class="two-col">
          ${ST.sec(tr('Como o Rei escolhe os pedidos', 'How the King picks requests'), `<div class="list">
            <div class="row"><div class="grow">${tr('Vagas de pedido (trocam a cada)', 'Request slots (change every)')}</div><div class="r">${R.slots.map(hrs).join(' · ')}</div></div>
            <div class="row"><div class="grow">${tr('Item em destaque troca a cada', 'Hot item changes every')}</div><div class="r">${hrs(R.hot)}</div></div>
            <div class="row"><div class="grow">${tr('Item já pedido fica fora do sorteio por', 'An item already asked stays out of the draw for')}</div><div class="r">${R.usedReset} ${tr('pedidos', 'requests')}</div></div>
            <div class="row"><div class="grow">${tr('Qualidade multiplica a Graça', 'Quality multiplies Favor')}</div><div class="r">${R.q.slice(1).map((m) => '×' + dec(m, 2)).join(' · ')}</div></div>
            ${R.freePack ? `<div class="row"><div class="grow">${tr('Pacote grátis por dia', 'Free pack per day')}</div><div class="r">${esc(String(R.freePack).replace('antique_shard,', ''))} ${shard}</div></div>` : ''}</div>
            <p class="small"><b>${tr('Categorias', 'Categories')}:</b></p><div class="tags">${typeChips(R.cats)}${typeChips(R.premiumCats)}</div>
            <p class="small"><b>${tr('Tipos (todos com o mesmo peso)', 'Types (all with the same weight)')}:</b></p><div class="tags">${typeChips(R.types)}</div>
            <p class="small"><b>${tr('Tipos premium', 'Premium types')}:</b></p><div class="tags">${typeChips(R.premiumTypes)}</div>`,
            tr('Pesos lidos das constantes quest_event_king_* do jogo. Os itens exatos são sorteados entre os seus projetos.', 'Weights read from the game quest_event_king_* constants. Exact items are drawn among your blueprints.'))}
          ${ST.sec(tr('Loja de Fichas de Antiguidade', 'Antique Shard shop'), `<div class="list">
            <div class="row"><div class="grow">${tr('Itens à venda por vez', 'Items on sale at a time')}</div><div class="r">${R.shop.max} (${tr('espaço', 'slot')} ${R.shop.vip} VIP)</div></div>
            <div class="row"><div class="grow">${tr('Troca a cada', 'Refreshes every')}</div><div class="r">${Math.round(R.shop.cycle / 3600000)} h · ${tr('trocar agora', 'reroll')}: ${R.shop.reroll} ${ST.ic('gem')}</div></div>
            <div class="row"><div class="grow">${tr('Tier mínimo do 1º espaço', 'Min tier of slot 1')}</div><div class="r">T${R.shop.minTier0}</div></div>
            <div class="row"><div class="grow">${tr('Nível mínimo do comerciante', 'Min merchant level')}</div><div class="r">${R.shop.minLevel}</div></div>
            <div class="row"><div class="grow">${tr('Entra no sorteio da loja após o lançamento', 'Enters the shop draw after release')}</div><div class="r">${R.shop.delay} ${tr('dias (ou 240 em alguns)', 'days (or 240 for some)')}</div></div>
            <div class="row"><div class="grow">${tr('No sorteio hoje / com data futura', 'In the draw today / future date')}</div><div class="r">${nf(K.shop.filter((x) => x.e <= today).length)} / ${nf(K.shop.filter((x) => x.e > today).length)}</div></div></div>
            <div class="tags" style="margin-top:10px">${K.trophies.map((x) => `<span class="chip kc-tro">${img(x.u)} ${esc(x.n)}</span>`).join('')}</div>`,
            tr('A unidade “dias” do atraso é deduzida dos dados (bate com as coleções sazonais entrando cerca de 6 meses depois); confira no jogo.', 'The “days” unit of the delay is inferred from the data (matches seasonal collections entering about 6 months later); check in game.'))}
        </div>
        <div class="form-row">
          <label class="field">${tr('Buscar', 'Search')}<input class="inp" id="kq" value="${esc(query.get('q') || '')}" placeholder="${tr('Nome…', 'Name…')}"></label>
          <label class="field">${tr('Tipo', 'Type')}<select class="inp" id="kk"><option value="">${t('all')}</option>${Object.entries(KK).map(([k2, n]) => `<option value="${k2}" ${k2 === kind ? 'selected' : ''}>${esc(tr(...n))}</option>`).join('')}</select></label>
          <label class="field">${tr('Tier mínimo', 'Min tier')}<select class="inp" id="kt">${[0, 4, 7, 10, 13, 15, 16].map((v) => `<option value="${v}" ${v === tmin ? 'selected' : ''}>${v || t('all')}</option>`).join('')}</select></label>
          <button class="chip" id="kics" ${soon.length ? '' : 'disabled'}>${ST.ic('calendar')} ${tr('Exportar datas (.ics)', 'Export dates (.ics)')}</button></div>
        ${ST.sec(`${tr('Entram na loja em breve', 'Entering the shop soon')} (${nf(soon.length)})`, byDay.size ? [...byDay.entries()].map(([d, list]) =>
          `<div class="cal-day"><h4>${esc(fmt(d))} <span class="badge soon">${list.length}</span></h4><div class="list">${list.map(row).join('')}</div></div>`).join('') : `<p class="muted">${tr('Nada com esses filtros.', 'Nothing with these filters.')}</p>`)}
        ${ST.sec(`${tr('Entraram nos últimos 30 dias', 'Entered in the last 30 days')} (${nf(recent.length)})`, recent.length ? `<div class="list">${recent.map(row).join('')}</div>` : `<p class="muted">${t('none')}</p>`)}
        ${ST.sec(`${tr('Todos no sorteio da loja hoje', 'Everything in the shop draw today')} (${nf(now.length)})`, ST.table(showAll ? now : now.slice(0, 200), [
          { key: 'n', label: t('name'), sort: (x) => x.n, fmt: (x) => (x.k === 'item' ? `<a class="cell-item" href="#/item/${x.u}">${icon(x)}<span>${esc(x.n)}</span></a>` : `<span class="cell-item">${icon(x)}<span>${esc(x.n)}</span></span>`) },
          { key: 'k', label: tr('Tipo', 'Type'), sort: (x) => x.k, fmt: (x) => esc(tr(...KK[x.k])) }, { key: 't', label: 'T', num: true, fmt: (x) => x.t || '—' },
          { key: 'p', label: tr('Fichas', 'Shards'), num: true, fmt: (x) => nf(x.p) }, { key: 'e', label: tr('Entrou em', 'Entered'), sort: (x) => x.e, fmt: (x) => esc(fmt(x.e)) }], { sortKey: 'e', sortDir: -1 }) + (!showAll && now.length > 200 ? `<p><a class="chip" href="${qs2({ all: '1' })}">${tr('Mostrar todos', 'Show all')} (${nf(now.length)})</a></p>` : ''))}
        ${fam ? ST.sec(tr('Recompensas por Graça', 'Rewards by Favor'), `<div class="form-row"><label class="field">${tr('Trilha de recompensas', 'Reward track')} (${ev.families.length})<select class="inp" id="kf">${ev.families.map((f) => `<option ${f === fam ? 'selected' : ''}>${esc(f.id)}</option>`).join('')}</select></label></div>` +
          ST.table(fam.rows.map((r) => ({ i: r[0], pts: r[1], lvl: r[2], r: r[3], vip: r[4] })), [
            { key: 'i', label: '#', num: true }, { key: 'pts', label: tr('Pontos', 'Points'), num: true, fmt: (x) => nf(x.pts) },
            { key: 'lvl', label: tr('Nível mín.', 'Min level'), num: true }, { key: 'r', label: tr('Recompensa', 'Reward'), fmt: (x) => RW(x.r) }, { key: 'vip', label: 'VIP', fmt: (x) => RW(x.vip) }]),
          tr('Os arquivos têm várias trilhas (uma por edição do evento); a última é a mais recente.', 'The files hold several tracks (one per event edition); the last one is the most recent.')) : ''}`;
      const go = () => { location.hash = qs2({ q: el.querySelector('#kq').value.trim(), k: el.querySelector('#kk').value, tmin: +el.querySelector('#kt').value }); };
      el.querySelector('#kk').addEventListener('change', go);
      el.querySelector('#kt').addEventListener('change', go);
      el.querySelector('#kq').addEventListener('change', go);
      const kf = el.querySelector('#kf');
      if (kf) kf.addEventListener('change', () => (location.hash = qs2({ f: kf.value })));
      el.querySelector('#kics').addEventListener('click', () => ST.icsFile(ST.icsFromEntries(soon.map((x) => ({ d: x.e, k: 'caprice', n: x.n })), 'caprice'), 'capricho-do-rei.ics'));
    },
  });
})();
