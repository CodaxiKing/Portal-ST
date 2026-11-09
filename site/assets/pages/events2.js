/* Eventos: Cidade Perdida de Ouro (níveis, Ouro Puro, baús, recompensas da guilda, títulos e o melhor grupo pelo
   motor do Hypermax) e eventos de comunidade (tarefas, metas e recompensas). */
(() => {
  const { t, tr, esc, nf, short, img } = ST;
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
        tr(`Poder somado: ${nf(Math.round(top.reduce((a, b) => a + b.power, 0)))}. Os 5 heróis mais fortes pelo motor do Hypermax (qualidade Lendária, melhorias completas). Ative “Minha conta” para usar só o que você tem.`,
          `Total power: ${nf(Math.round(top.reduce((a, b) => a + b.power, 0)))}. The 5 strongest heroes by the Hypermax engine (Legendary, full upgrades). Turn on “My account” to use only what you own.`));
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
})();
