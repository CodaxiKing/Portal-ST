/* Eventos: Caravana de Pharoway (itens procurados por categoria) e Invasão Dracônica (Poder da Aeronave). */
(() => {
  const { t, tr, esc, nf, short, img, dec } = ST;
  ST.addI18n({ pt: { caravan: 'Caravana', airship: 'Invasão Dracônica', tomb: 'Tumba dos Titãs', eventsNav: 'Eventos' }, en: { caravan: 'Caravan', airship: 'Dragon Invasion', tomb: 'Tomb of Titans', eventsNav: 'Events' } });
  const QN = [['Normal', 'Common'], ['Superior', 'Uncommon'], ['Magistral', 'Flawless'], ['Épico', 'Epic'], ['Lendário', 'Legendary']];
  const ELN = { fire: ['Fogo', 'Fire'], water: ['Água', 'Water'], air: ['Ar', 'Air'], earth: ['Terra', 'Earth'], light: ['Luz', 'Light'], dark: ['Escuridão', 'Dark'], gold: ['Ouro', 'Gold'], all: ['Todos', 'All'] };
  const SELLABLE = (i) => !['z', 'm', 'ma'].includes(i.type);

  function readOpts(q, defTmax) {
    return { q: Math.min(4, Math.max(0, +(q.get('q') ?? 4))), tmin: +(q.get('tmin') || 1), tmax: +(q.get('tmax') || defTmax), soon: q.get('soon') === '1',
      up: q.get('up') !== '0' };
  }
  const qs = (o, extra = {}) => {
    const p = new URLSearchParams();
    if (o.q !== 4) p.set('q', o.q);
    if (o.tmin !== 1) p.set('tmin', o.tmin);
    if (o.tmax !== o.defTmax) p.set('tmax', o.tmax);
    if (o.soon) p.set('soon', '1');
    if (!o.up) p.set('up', '0');
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? '?' + s : '';
  };
  const controls = (o, tiers, extraHTML = '', upLabel) => `<div class="form-row">
    <label class="field">${tr('Qualidade', 'Quality')}<select class="inp" data-o="q">${QN.map((n, k) => `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
    <label class="field">Tier<span style="display:flex;gap:6px;align-items:center"><select class="inp" data-o="tmin">${tiers.map((x) => `<option ${x === o.tmin ? 'selected' : ''}>${x}</option>`).join('')}</select>–<select class="inp" data-o="tmax">${tiers.map((x) => `<option ${x === o.tmax ? 'selected' : ''}>${x}</option>`).join('')}</select></span></label>
    ${upLabel ? `<label class="check"><input type="checkbox" data-o="up" ${o.up ? 'checked' : ''}> ${upLabel}</label>` : ''}
    <label class="check"><input type="checkbox" data-o="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label>${extraHTML}
    ${ST.accountToggle ? ST.accountToggle(ST.account.active()) : ''}</div>`;
  const bind = (el, o, base, extra) => (ST.bindAccountToggle && ST.bindAccountToggle(el), el.querySelectorAll('[data-o]')).forEach((n) => n.addEventListener('change', () => {
    o[n.dataset.o] = n.type === 'checkbox' ? n.checked : +n.value;
    location.hash = base + qs(o, extra());
  }));

  // ================================================================ Caravana
  /* Dia marcado da Caravana: o do navegador vale mais que o publicado em data/caravan.js (para a guilda toda). */
  const CAR_KEY = 'st_caravan';
  ST.caravanAnchor = async () => {
    try { const v = JSON.parse(localStorage.getItem(CAR_KEY) || 'null'); if (v && v.uid && v.date) return { ...v, src: 'local' }; } catch (e) { /* sem armazenamento */ }
    try { const [pub] = await ST.need('caravan'); if (pub && pub.anchor && pub.anchor.uid) return { ...pub.anchor, src: 'pub' }; } catch (e) { /* sem arquivo */ }
    return null;
  };
  const PACK_COLORS = ['#d9764a', '#4a8fd9', '#6cbf8a', '#c05a7a', '#d7a24a', '#8a7ad9', '#4abfbf', '#bf8a4a', '#7a9a3a', '#c94a9a'];
  ST.page('caravana', {
    nav: 'caravana', title: () => t('caravan'),
    async render(el, args, query) {
      const [ev] = await ST.need('events');
      const { d } = await ST.itemsIndex();
      const C = ev.caravan, K = C.k;
      const tiers = [...new Set(d.items.map((i) => i.tier))].filter(Boolean).sort((a, b) => a - b);
      const o = readOpts(query, tiers[tiers.length - 1]); o.defTmax = tiers[tiers.length - 1];
      const anchor0 = await ST.caravanAnchor();
      const today0 = anchor0 ? ST.caravanProject(C.days, anchor0, ST.today(), 1)[0] : null; // abre no tema de hoje quando há dia marcado
      const theme = C.pools.find((p) => p.id === query.get('t')) || (today0 && today0.date === ST.today() && C.pools.find((p) => p.id === today0.day.theme)) || C.pools[0];
      const priceMult = [1, K.item_price_uncommon_mult || 1.25, K.item_price_flawless_mult || 2, K.item_price_epic_mult || 3, K.item_price_legd_mult || 5][o.q];
      const wantedBonus = K.caravan_wanted_item_multiplier || 0.5;
      const shape = (i) => C.shapes[i.uid] || C.shapes[i.type] || { n: 1, w: 1, l: 1, map: '1' };
      const acc = ST.account && ST.account.active();
      const pool = d.items.filter((i) => SELLABLE(i) && i.value > 0 && i.tier >= o.tmin && i.tier <= o.tmax && (o.soon || !ST.isUnreleased(i)) && (!acc || ST.account.has(i)));
      const matches = (i, cat) => (cat === 'spirit' ? i.spiritAffinity.length > 0 : ELN[cat] ? i.elementAffinity.some((a) => a.id === cat) : i.type === cat || i.multiType.includes(cat));
      const catName = (cat) => (cat === 'spirit' ? tr('Afinidade com espírito', 'Spirit affinity') : ELN[cat] ? `${tr('Afinidade', 'Affinity')}: ${tr(...ELN[cat])}` : ST.typeName(cat));
      const catIcon = (cat) => (cat === 'spirit' ? img('wolf') : ELN[cat] ? img('icon_global_element_' + cat) : img((pool.filter((i) => i.type === cat).sort((a, b) => b.tier - a.tier)[0] || {}).uid));
      const score = (i) => i.value * priceMult * (1 + wantedBonus);
      const miniShape = (sh) => {
        const cells = String(sh.map || '1').split(','); const w = sh.w || 1;
        return `<span class="cv-shape" style="--w:${w}">${cells.map((c) => `<i class="${c === '1' ? 'on' : ''}"></i>`).join('')}</span>`;
      };
      const sections = theme.wanted.map((cat) => {
        const list = pool.filter((i) => matches(i, cat)).map((i) => ({ i, sc: score(i), sh: shape(i) })).sort((a, b) => b.sc - a.sc).slice(0, 8);
        return `<section class="cv-cat"><h3 class="cv-h">${catIcon(cat)}<span>${esc(catName(cat))}</span><span class="muted small">${tr('procurado', 'wanted')} +${Math.round(wantedBonus * 100)}%</span></h3>
          ${list.length ? `<div class="list">${list.map((x, k) => `<a class="row" href="#/item/${x.i.uid}"><span class="cv-rank">${k + 1}</span>${img(x.i.uid)}
            <div class="grow">${esc(x.i.name)} <span class="muted small">T${x.i.tier}</span></div>
            ${miniShape(x.sh)}<div class="r cv-r"><b>${short(Math.round(x.sc))}</b><span>${short(Math.round(x.sc / x.sh.n))}/${tr('quad.', 'sq.')}</span></div></a>`).join('')}</div>`
            : `<p class="muted small">${tr('Nenhum item nesse intervalo de tier.', 'No items in this tier range.')}</p>`}</section>`;
      }).join('');
      const days = ST.caravanOrder(C.days);
      const anchor = anchor0;
      const today = ST.today();
      const proj = anchor ? ST.caravanProject(C.days, anchor, today, 40) : [];
      const nextDate = {};
      proj.forEach((x) => { if (!nextDate[x.day.uid]) nextDate[x.day.uid] = x.date; });
      const todayDay = proj.length && proj[0].date === today ? proj[0].day : null;
      const pick = C.days.find((x) => x.uid === query.get('dia') && x.theme === theme.id)
        || (todayDay && todayDay.theme === theme.id ? todayDay : null) || days.find((x) => x.theme === theme.id) || days[0];
      const fmtD = (d) => new Date(d + 'T12:00').toLocaleDateString(ST.locale, { weekday: 'short', day: '2-digit', month: '2-digit' });
      const themeName = (id) => (C.pools.find((p) => p.id === id) || {}).name || id;
      // "tela" de um dia: moldura do tema (metade esquerda + espelho), faixa com o nome, categorias pedidas e a grade do carroção
      const used = new Set(C.days.map((x) => x.map));
      const unused = Object.entries(C.maps).filter(([id]) => !used.has(id)).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
      const scene = (th, m, label, on, uid) => {
        const bg = ST.icon('img_caravanBG_' + (th || 'default')), ban = ST.icon('img_caravan_minigame_banner_' + (th || 'default'));
        const cells = String((m && m.map) || '').split(',');
        const p = th && C.pools.find((x) => x.id === th);
        const inner = `<div class="cvs-scene">${bg ? `<img class="cvs-bg l" src="${bg}" alt=""><img class="cvs-bg r" src="${bg}" alt="">` : ''}
          <div class="cvs-ban">${ban ? `<img src="${ban}" alt="">` : ''}<span>${esc(p ? p.name.replace(/^(A )?Caravana (d[aoe]s? |do |de )?/i, '') : label)}</span></div>
          <div class="cvs-map" style="--w:${(m && m.w) || 1}">${cells.map((c) => `<i class="${c === '1' ? 'on' : ''}"></i>`).join('')}</div>
          ${p ? `<div class="cvs-want">${p.wanted.map((c) => `<span title="${esc(catName(c))}">${catIcon(c)}</span>`).join('')}</div>` : ''}</div>
          <div class="cvs-cap"><b>${esc(label)}</b> · ${(m && m.n) || '?'} ${tr('quad.', 'sq.')}${m ? ` · ${m.w}×${m.l}` : ''}${uid && nextDate[uid] ? `<div class="cvs-date ${nextDate[uid] === today ? 'now' : ''}">${nextDate[uid] === today ? tr('hoje', 'today') : esc(fmtD(nextDate[uid]))}</div>` : ''}</div>`;
        return th ? `<a class="cvs-card ${on ? 'on' : ''}" href="#/caravana${qs(o, { t: th, dia: uid || '' })}">${inner}</a>` : `<div class="cvs-card">${inner}</div>`;
      };
      const grid = C.maps[pick.map];
      const rot = query.get('rot') === '1', repeat = query.get('rep') !== '0';
      const cands = pool.map((i) => { const cats = theme.wanted.filter((c) => matches(i, c)); return { id: i.uid, i, s: i.value * priceMult * (cats.length ? 1 + wantedBonus : 1), sh: shape(i), cats }; })
        .sort((a, b) => b.s - a.s).slice(0, 400);
      const packed = grid ? ST.caravanPack(grid, cands, { maxItems: pick.maxItems || 10, stack: pick.maxStack || 1, wanted: theme.wanted, allBonus: K.caravan_all_wanted_item_match || 0, rotate: rot, repeat }) : null;
      const byId = new Map(cands.map((x) => [x.id, x]));
      const packHTML = !packed ? '' : (() => {
        const owner = {};
        packed.placements.forEach((pl, k) => pl.cells.forEach((c) => (owner[c] = k)));
        const first = new Set(packed.placements.map((pl) => Math.min(...pl.cells)));
        const cells = String(grid.map).split(',').map((v, idx) => {
          if (v !== '1') return '<i class="x"></i>';
          const k = owner[idx];
          if (k === undefined) return '<i class="f"></i>';
          const it = byId.get(packed.placements[k].id).i;
          return `<i class="p" style="--c:${PACK_COLORS[k % PACK_COLORS.length]}" title="${esc(it.name)}">${first.has(idx) ? `<b>${k + 1}</b>` : ''}</i>`;
        }).join('');
        return ST.sec(`${tr('Montador do carroção', 'Wagon builder')} · ${esc(themeName(theme.id))} · ${tr('Dia', 'Day')} ${pick.day} (${esc(pick.family.replace('caravan', tr('rota ', 'route ')))})`,
          `<div class="cvp">
            <div><div class="cvp-grid" style="--w:${grid.w}">${cells}</div>
              <div class="tags" style="margin-top:10px">
                <a class="chip ${rot ? 'primary' : ''}" href="#/caravana${qs(o, { t: theme.id, dia: pick.uid, rot: rot ? '' : '1', rep: repeat ? '' : '0' })}">${tr('Permitir girar', 'Allow rotation')}</a>
                <a class="chip ${repeat ? 'primary' : ''}" href="#/caravana${qs(o, { t: theme.id, dia: pick.uid, rot: rot ? '1' : '', rep: repeat ? '0' : '' })}">${tr('Repetir o mesmo item', 'Repeat the same item')}</a></div></div>
            <div>${ST.stats([ST.stat(tr('Pontuação', 'Score'), short(Math.round(packed.total)), 'gold'), ST.stat(tr('Quadrados', 'Squares'), `${packed.used}/${packed.free}`),
              ST.stat(tr('Lugares', 'Spots'), `${packed.placements.length}/${pick.maxItems}`), ST.stat(tr('Procurados', 'Wanted'), `${packed.covered.length}/${theme.wanted.length}${packed.allWanted ? ' +' + Math.round((K.caravan_all_wanted_item_match || 0) * 100) + '%' : ''}`)])}
              <div class="list">${packed.placements.map((pl, k) => { const x = byId.get(pl.id); return `<a class="row" href="#/item/${x.i.uid}"><span class="cvp-n" style="--c:${PACK_COLORS[k % PACK_COLORS.length]}">${k + 1}</span>${img(x.i.uid)}
                <div class="grow">${esc(x.i.name)} <span class="small muted">T${x.i.tier} · ×${pick.maxStack}</span>${x.cats.length ? `<div class="small muted">${x.cats.map((c) => esc(catName(c))).join(' · ')}</div>` : ''}</div>
                <div class="r cv-r"><b>${short(Math.round(pl.s))}</b><span>${pl.cells.length} ${tr('quad.', 'sq.')}</span></div></a>`; }).join('')}</div></div></div>`,
          ST.trf(`Encaixe automático nos quadrados livres do dia (formatos do caravanItems), até {0} lugares com {1} cópias empilhadas em cada um (maxItems/maxItemStack do caravanDays). Pontuação relativa, como na lista abaixo, com o bônus de +{2}% quando há pelo menos 1 de cada procurado. No jogo, confira se dá para girar os itens.`, `Automatic fit into the day's free squares (caravanItems shapes), up to {0} spots with {1} stacked copies each (caravanDays maxItems/maxItemStack). Relative score, as in the list below, with the +{2}% bonus when there is at least 1 of each wanted. In game, check whether items can be rotated.`, pick.maxItems, pick.maxStack, Math.round((K.caravan_all_wanted_item_match || 0) * 100)));
      })();
      // dia de hoje: marcar, ver os próximos, exportar
      const todayHTML = ST.sec(tr('Caravana de hoje', 'Today’s caravan'), anchor && proj.length ? `<div class="cvt">
          <div class="cvt-days">${proj.slice(0, 10).map((x, k) => `<a class="cvt-day ${k === 0 && x.date === today ? 'now' : ''}" href="#/caravana${qs(o, { t: x.day.theme, dia: x.day.uid })}">
            ${ST.icon('img_caravan_minigame_banner_' + x.day.theme) ? `<img src="${ST.icon('img_caravan_minigame_banner_' + x.day.theme)}" alt="">` : ''}
            <b>${x.date === today ? tr('Hoje', 'Today') : esc(fmtD(x.date))}</b><span>${esc(themeName(x.day.theme).replace(/^(A )?Caravana (d[aoe]s? |do |de )?/i, ''))}</span>
            <small>${tr('Dia', 'Day')} ${x.day.day} · ${esc(x.day.family.replace('caravan', tr('rota ', 'route ')))}</small></a>`).join('')}</div>
          <div class="tags" style="margin-top:10px"><span class="small muted">${anchor.src === 'pub' ? tr('Marcado pela guilda (data/caravan.js)', 'Set by the guild (data/caravan.js)') : tr('Marcado neste navegador', 'Set in this browser')}: ${esc(fmtD(anchor.date))} = ${tr('Dia', 'Day')} ${(C.days.find((x) => x.uid === anchor.uid) || {}).day} ${esc(anchor.uid.split('_')[0].replace('caravan', tr('rota ', 'route ')))}</span>
            <button class="chip" id="cvChange">${tr('Mudar', 'Change')}</button><button class="chip" id="cvIcs">${ST.ic('calendar')} ${tr('Exportar 30 dias (.ics)', 'Export 30 days (.ics)')}</button>
            <button class="chip" id="cvPub">${ST.ic('down')} ${tr('Arquivo para a guilda (caravan.js)', 'File for the guild (caravan.js)')}</button>
            ${anchor.src === 'local' ? `<button class="chip" id="cvClear">${tr('Limpar', 'Clear')}</button>` : ''}</div></div>` : '',
          tr('Os arquivos não dizem em que dia a Caravana está. Marque o dia de hoje uma vez e o portal calcula os próximos, supondo que as rotas seguem em sequência (1 → 2 → 1…). Se houver dias sem Caravana entre as rotas, informe a pausa.',
            'The files do not say which day the Caravan is on. Set today once and the portal works out the next ones, assuming routes run in sequence (1 → 2 → 1…). If there are days without a Caravan between routes, set the gap.'))
        + `<div class="form-row cvt-form" id="cvForm" ${anchor && proj.length ? 'hidden' : ''}>
            <label class="field">${tr('Hoje a Caravana está em', 'Today the Caravan is on')}<select class="inp" id="cvDay">${days.map((x) => `<option value="${x.uid}" ${anchor && anchor.uid === x.uid ? 'selected' : ''}>${esc(x.family.replace('caravan', tr('Rota ', 'Route ')))} · ${tr('Dia', 'Day')} ${x.day} · ${esc(themeName(x.theme).replace(/^(A )?Caravana (d[aoe]s? |do |de )?/i, ''))}</option>`).join('')}</select></label>
            <label class="field">${tr('Data', 'Date')}<input class="inp" type="date" id="cvDate" value="${today}"></label>
            <label class="field">${tr('Dias de pausa entre rotas', 'Gap days between routes')}<input class="inp" type="number" min="0" max="30" id="cvGap" value="${(anchor && anchor.gap) || 0}"></label>
            <button class="chip primary" id="cvSave">${tr('Salvar', 'Save')}</button></div>`;
      el.innerHTML = ST.pageHead(t('caravan'), tr('Caravana de Pharoway (Stahl): cada dia pede “Itens Procurados” de algumas categorias. Aqui estão os itens que mais rendem em cada categoria pedida, pela qualidade e faixa de tier escolhidas.',
        'Pharoway Caravan (Stahl): each day asks for “Wanted Items” from a few categories. These are the items that pay the most in each requested category, for the chosen quality and tier range.')) +
        todayHTML +
        ST.sec(tr('Padrão das caravanas (caravanDays)', 'Caravan pattern (caravanDays)'), `<div class="cvs-routes">${[...new Set(days.map((x) => x.family))].map((fam) => `<div class="cvs-route"><h4>${esc(fam.replace('caravan', tr('Rota ', 'Route ')))}</h4>
          <div class="cvs-strip">${days.filter((x) => x.family === fam).map((x) => scene(x.theme, C.maps[x.map], `${tr('Dia', 'Day')} ${x.day}`, x.uid === pick.uid, x.uid)).join('')}</div></div>`).join('')}</div>`,
          tr('O arquivo caravanDays define, para cada rota e dia, o tema (categorias pedidas) e a grade do carroção usada. As rotas se alternam e cada uma tem 5 dias; a data de início vem do servidor da Kabam. Clique num dia para ver os melhores itens dele.',
            'The caravanDays file sets, for each route and day, the theme (wanted categories) and the wagon grid used. Routes alternate and each has 5 days; the start date comes from Kabam’s server. Click a day to see its best items.')) +
        controls(o, tiers) +
        ST.tabs(C.pools.map((p) => [`#/caravana${qs(o, { t: p.id })}`, esc(p.name.replace(/^(A )?Caravana (d[aoe]s? |do |de )?/i, ''))]), `#/caravana${qs(o, { t: theme.id })}`) +
        packHTML +
        `<div class="cv-grid">${sections}</div>
        <div class="two-col" style="margin-top:20px">
          ${ST.sec(tr('Regras da Caravana (dados do jogo)', 'Caravan rules (game data)'), `<div class="list">
            <div class="row"><div class="grow">${tr('Item procurado', 'Wanted item')}</div><div class="r">+${Math.round(wantedBonus * 100)}% ${tr('Vales', 'Vouchers')}</div></div>
            <div class="row"><div class="grow">${tr('Pelo menos 1 de cada procurado', 'At least 1 of each wanted')}</div><div class="r">+${Math.round((K.caravan_all_wanted_item_match || 0) * 100)}% ${tr('em todos', 'on all')}</div></div>
            <div class="row"><div class="grow">${tr('Bônus por quadrado ocupado', 'Bonus per occupied square')}</div><div class="r">+${Math.round((K.caravan_per_square_bonus || 0) * 100)}%</div></div>
            <div class="row"><div class="grow">${tr('Pontos mínimos por item', 'Minimum points per item')}</div><div class="r">${K.caravan_minimum_item_points}</div></div>
            <div class="row"><div class="grow">${tr('Pacotes por dia / itens por pacote', 'Bundles per day / items per bundle')}</div><div class="r">${(days[0] || {}).maxItems} / ${(days[0] || {}).maxStack}</div></div></div>`,
            ST.trf(`A pontuação aqui é relativa: valor do item × qualidade (×{0} no preço) × bônus de procurado. A conversão exata em Vales não está nos arquivos. “/quad.” ajuda a escolher o que cabe melhor na grade.`, `Scores here are relative: item value × quality (×{0} price) × wanted bonus. The exact Voucher conversion is not in the files. “/sq.” helps pick what fits best in the grid.`, dec(priceMult, 2)))}
          ${ST.sec(tr('Calendário dos dias', 'Day schedule'), `<div class="list">${days.map((x) => `<a class="row link" href="#/caravana${qs(o, { t: x.theme })}"><span class="cv-rank">${x.day}</span>
            <div class="grow">${esc(themeName(x.theme))}</div><div class="r">${esc(x.family.replace('caravan', tr('rota ', 'route ')))} · ${(C.maps[x.map] || {}).n || '?'} ${tr('quad.', 'sq.')}</div></a>`).join('')}</div>`)}
        </div>
        ${unused.length ? ST.sec(`${tr('Grades nos arquivos que ainda não estão em nenhum dia', 'Grids in the files not used by any day yet')} (${unused.length})`,
          `<div class="cvs-grid">${unused.map(([id, m]) => scene('', m, id.replace('caravan', '#'), false)).join('')}</div>`,
          tr('Grades que existem nos arquivos mas que nenhum dia do caravanDays usa: podem ser de caravanas futuras (ou antigas).', 'Grids in the files that no caravanDays entry uses: they may belong to future (or old) caravans.')) : ''}`;
      bind(el, o, '#/caravana', () => ({ t: theme.id, dia: pick.uid }));
      const $ = (id) => el.querySelector('#' + id);
      if ($('cvChange')) $('cvChange').addEventListener('click', () => { $('cvForm').hidden = false; });
      $('cvSave').addEventListener('click', () => {
        const v = { uid: $('cvDay').value, date: $('cvDate').value || today, gap: Math.max(0, +$('cvGap').value || 0) };
        try { localStorage.setItem(CAR_KEY, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ }
        ST.rerender();
      });
      if ($('cvClear')) $('cvClear').addEventListener('click', () => { try { localStorage.removeItem(CAR_KEY); } catch (e) { /* ignora */ } ST.rerender(); });
      if ($('cvIcs')) $('cvIcs').addEventListener('click', () => ST.icsFile(ST.caravanProject(C.days, anchor, today, 30).map((x) => ({
        uid: 'caravan-' + x.date, date: x.date, title: `Caravana: ${themeName(x.day.theme)}`, desc: `${tr('Dia', 'Day')} ${x.day.day} · ${x.day.family}` })), 'caravana.ics'));
      if ($('cvPub')) $('cvPub').addEventListener('click', () => {
        const out = { exportedAt: new Date().toISOString(), anchor: { uid: anchor.uid, date: anchor.date, gap: anchor.gap || 0 } };
        const js = `/* Dia marcado da Caravana, exportado pelo Portal Shop Titans em ${out.exportedAt}. Coloque em site/data/caravan.js */\n(window.ST = window.ST || {}).caravan = ${JSON.stringify(out, null, 1)};\n`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([js], { type: 'text/javascript' })); a.download = 'caravan.js'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    },
  });

  // ================================================================ Invasão Dracônica (Aeronave)
  const AGE = { young: ['Jovem', 'Young'], adult: ['Adulto', 'Adult'], greater: ['Grande', 'Greater'], elder: ['Ancião', 'Elder'], ancient: ['Ancestral', 'Ancient'] };
  const COLOR = { red: ['Vermelho', 'Red'], blue: ['Azul', 'Blue'], green: ['Verde', 'Green'], white: ['Branco', 'White'], black: ['Preto', 'Black'], gold: ['Dourado', 'Gold'] };
  const hms = (sec) => (sec >= 3600 ? `${Math.round(sec / 360) / 10} h` : `${Math.round(sec / 60)} min`);
  function dragonHTML(DR, mecha, o) {
    if (!DR) return '';
    const R = DR.rules, v = mecha ? 'mechadragon_' : '';
    const grid = `<div class="dr-grid" style="--n:${DR.colors.length}"><span></span>${DR.colors.map((c) => `<span class="dr-h">${esc(tr(...COLOR[c]))}</span>`).join('')}
      ${DR.ages.map((a) => `<span class="dr-age">${esc(tr(...AGE[a]))}</span>${DR.colors.map((c) => { const id = `icon_dragoninvasion_${a}_${v}${c}_portrait`;
        return `<span class="dr-cell" title="${esc(tr(...AGE[a]))} · ${esc(tr(...COLOR[c]))}">${ST.icon(id) ? img(id) : '—'}</span>`; }).join('')}`).join('')}</div>`;
    const lim = R.limits || {};
    return `<div class="two-col">
      ${ST.sec(tr('Os dragões', 'The dragons'), `<div class="tags" style="margin-bottom:10px">
          <a class="chip ${mecha ? '' : 'primary'}" href="#/invasao${qs(o, {})}">${tr('Dragões', 'Dragons')}</a>
          <a class="chip ${mecha ? 'primary' : ''}" href="#/invasao${qs(o, { mecha: '1' })}">${tr('Mecadragões', 'Mechadragons')}</a></div>${grid}`,
        tr('Retratos dos arquivos do jogo: 5 idades × 6 cores, em versão normal e mecânica. A vida e o poder de cada dragão vêm do servidor da Kabam e não estão nos arquivos locais.',
          'Portraits from the game files: 5 ages × 6 colors, in normal and mechanical versions. Each dragon’s HP and power come from Kabam’s server and are not in the local files.'))}
      ${ST.sec(tr('Regras do evento (dados do jogo)', 'Event rules (game data)'), `<div class="list">
        <div class="row"><div class="grow">${tr('Fase de preparação', 'Preparation phase')}</div><div class="r">${hms(R.prep)}</div></div>
        <div class="row"><div class="grow">${tr('Fase de ataque', 'Assault phase')}</div><div class="r">${hms(R.attack)}</div></div>
        <div class="row"><div class="grow">${tr('Ciclos (preparação + ataque)', 'Cycles (preparation + assault)')}</div><div class="r">${R.cycles}</div></div>
        <div class="row"><div class="grow">${tr('Dragões no evento', 'Dragons in the event')}</div><div class="r">${R.dragons}</div></div>
        <div class="row"><div class="grow">${tr('Heróis / reforços na Aeronave', 'Heroes / boosters on the Airship')}</div><div class="r">${R.heroes} / ${R.boosters}</div></div>
        <div class="row"><div class="grow">${tr('Tempo de cura dos heróis', 'Hero heal time')}</div><div class="r">${hms(R.heal)}</div></div>
        <div class="row"><div class="grow">${tr('Itens por pedido de suprimento (fácil / médio / difícil / extremo)', 'Items per supply request (easy / medium / hard / extreme)')}</div><div class="r">${lim.easy} / ${lim.medium} / ${lim.hard} / ${lim.extreme}</div></div>
        <div class="row"><div class="grow">${tr('Nível mínimo do comerciante', 'Min merchant level')}</div><div class="r">${R.minLevel}</div></div></div>
        ${R.curve && R.curve.length ? `<p class="small"><b>${tr('Curva de poder do herói na Invasão', 'Hero power curve in the Invasion')}</b> <span class="muted">(character_power_dragon_invasion_curve)</span></p>
          <div class="tags">${R.curve.map(([a, b]) => `<span class="chip">${nf(a)} → ${b}</span>`).join('')}</div>` : ''}`,
        tr('Durações e limites lidos das constantes quest_event_dragon_* do jogo.', 'Durations and limits read from the game quest_event_dragon_* constants.'))}
    </div>`;
  }
  ST.page('invasao', {
    nav: 'invasao', title: () => t('airship'),
    async render(el, args, query) {
      const [skills, prog, evs] = await ST.need('skills', 'progression', 'events');
      const { d } = await ST.itemsIndex();
      const K = prog.constants || {};
      const DR = evs.dragon;
      const tiers = [...new Set(d.items.map((i) => i.tier))].filter(Boolean).sort((a, b) => a - b);
      const o = readOpts(query, tiers[tiers.length - 1]); o.defTmax = tiers[tiers.length - 1];
      const qm = [1, K.item_power_uncommon_mult || 1.25, K.item_power_flawless_mult || 1.5, K.item_power_epic_mult || 2, K.item_power_legd_mult || 3][o.q];
      const skillMods = new Map();
      skills.forEach((f) => f.tiers.forEach((tt) => skillMods.set(tt.uid, tt.mods || {})));
      const cat = query.get('c') || 'all';
      const acc = ST.account && ST.account.active();
      const rows = d.items.filter((i) => ['weapon', 'armor', 'accessory'].includes(i.cat) && i.tier >= o.tmin && i.tier <= o.tmax && (o.soon || !ST.isUnreleased(i)) && (!acc || ST.account.has(i))).map((i) => {
        const steps = o.up ? [...(i.starforged || []), ...(i.ascension || []), ...(i.transcendence || [])] : [];
        const s = steps.length ? ST.applySteps(i, steps).stats : i.stats;
        let air = 1; // melhorias "Poder da Aeronave" do projeto
        [...i.milestones, ...(o.up ? steps : [])].forEach((u) => { if (u.key === 'airshippower') air = u.op === '*' ? air * u.v : air + u.v; });
        const don = i.skill ? (skillMods.get(i.skill.uid) || {}).airshipDonationPowerMultiplier || 0 : 0;
        const base = (s.atk * 0.8 + s.def * 1.2 + s.hp * 5) * qm;
        return { i, base, air, don, power: base * air * (1 + don) * (K.quest_event_dragon_donate_power_mult || 1) };
      }).filter((r) => r.power > 0);
      const cats = [['all', tr('Todos', 'All')], ['weapon', tr('Armas', 'Weapons')], ['armor', tr('Armaduras', 'Armor')], ['accessory', tr('Acessórios', 'Accessories')]];
      const shown = rows.filter((r) => cat === 'all' || r.i.cat === cat).sort((a, b) => b.power - a.power);
      const types = [...new Set(shown.map((r) => r.i.type))];
      const perType = types.map((ty) => ({ ty, list: shown.filter((r) => r.i.type === ty).slice(0, 5) })).sort((a, b) => b.list[0].power - a.list[0].power);
      el.innerHTML = ST.pageHead(t('airship'), tr('Abastecer tropas da Aeronave: cada integrante equipa 4 itens e itens mais fortes dão mais Poder da Aeronave. Aqui estão os itens mais fortes, no geral e por categoria, na qualidade e tier escolhidos.',
        'Supplying the Airship troops: each trooper equips 4 items and stronger items give more Airship Power. These are the strongest items, overall and per category, for the chosen quality and tier.')) +
        dragonHTML(DR, query.get('mecha') === '1', o) +
        controls(o, tiers, '', tr('Melhorias do projeto (Forjado, Ascensão, Transcendência)', 'Blueprint upgrades (Starforged, Ascension, Transcendence)')) +
        ST.tabs(cats.map(([k, n]) => [`#/invasao${qs(o, { c: k === 'all' ? '' : k })}`, n]), `#/invasao${qs(o, { c: cat === 'all' ? '' : cat })}`) +
        `<div class="two-col">
          ${ST.sec(tr('Top 20 itens', 'Top 20 items'), ST.table(shown.slice(0, 20), [
            { key: 'i', label: t('items'), fmt: (r) => `<a class="cell-item" href="#/item/${r.i.uid}">${img(r.i.uid)}<span>${esc(r.i.name)}${r.don ? ` <span class="badge">+${Math.round(r.don * 100)}%</span>` : ''}</span></a>`, sort: (r) => r.i.name },
            { key: 'tier', label: 'T', num: true, fmt: (r) => r.i.tier, sort: (r) => r.i.tier },
            { key: 'type', label: t('type'), fmt: (r) => esc(ST.typeName(r.i.type)), sort: (r) => ST.typeName(r.i.type) },
            { key: 'power', label: tr('Poder da Aeronave', 'Airship Power'), num: true, fmt: (r) => nf(Math.round(r.power)) }], { sortKey: 'power', sortDir: -1 }),
            tr('Poder = (ATQ×0,8 + DEF×1,2 + PV×5) × qualidade, com as melhorias de Poder da Aeronave do projeto e o bônus de doação de itens especiais (ex.: arma de artefato +20%). Suprimentos contam como venda pelo valor cheio em ouro.',
              'Power = (ATK×0.8 + DEF×1.2 + HP×5) × quality, with the blueprint\'s Airship Power upgrades and the donation bonus of special items (e.g. artifact gun +20%). Supplies count as a sale at full gold value.'))}
          ${ST.sec(tr('Melhor por categoria', 'Best per category'), `<div class="list">${perType.map(({ ty, list }) => `<div class="row cv-type">
            <div class="grow"><b>${esc(ST.typeName(ty))}</b><div class="cv-chips">${list.map((r, k) => `<a class="chip-item" href="#/item/${r.i.uid}" title="${esc(r.i.name)} · ${nf(Math.round(r.power))}">${img(r.i.uid)}<span>${k === 0 ? esc(r.i.name) : 'T' + r.i.tier}</span></a>`).join('')}</div></div>
            <div class="r">${short(Math.round(list[0].power))}</div></div>`).join('')}</div>`)}
        </div>`;
      bind(el, o, '#/invasao', () => ({ c: cat === 'all' ? '' : cat }));
    },
  });
})();
