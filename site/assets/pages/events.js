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
    <label class="check"><input type="checkbox" data-o="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label>${extraHTML}</div>`;
  const bind = (el, o, base, extra) => el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => {
    o[n.dataset.o] = n.type === 'checkbox' ? n.checked : +n.value;
    location.hash = base + qs(o, extra());
  }));

  // ================================================================ Caravana
  ST.page('caravana', {
    nav: 'caravana', title: () => t('caravan'),
    async render(el, args, query) {
      const [ev] = await ST.need('events');
      const { d } = await ST.itemsIndex();
      const C = ev.caravan, K = C.k;
      const tiers = [...new Set(d.items.map((i) => i.tier))].filter(Boolean).sort((a, b) => a - b);
      const o = readOpts(query, tiers[tiers.length - 1]); o.defTmax = tiers[tiers.length - 1];
      const theme = C.pools.find((p) => p.id === query.get('t')) || C.pools[0];
      const priceMult = [1, K.item_price_uncommon_mult || 1.25, K.item_price_flawless_mult || 2, K.item_price_epic_mult || 3, K.item_price_legd_mult || 5][o.q];
      const wantedBonus = K.caravan_wanted_item_multiplier || 0.5;
      const shape = (i) => C.shapes[i.uid] || C.shapes[i.type] || { n: 1, w: 1, l: 1, map: '1' };
      const pool = d.items.filter((i) => SELLABLE(i) && i.value > 0 && i.tier >= o.tmin && i.tier <= o.tmax && (o.soon || !ST.isUnreleased(i)));
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
      const days = C.days.slice().sort((a, b) => a.family.localeCompare(b.family) || a.day - b.day);
      const themeName = (id) => (C.pools.find((p) => p.id === id) || {}).name || id;
      el.innerHTML = ST.pageHead(t('caravan'), tr('Caravana de Pharoway (Stahl): cada dia pede “Itens Procurados” de algumas categorias. Aqui estão os itens que mais rendem em cada categoria pedida, pela qualidade e faixa de tier escolhidas.',
        'Pharoway Caravan (Stahl): each day asks for “Wanted Items” from a few categories. These are the items that pay the most in each requested category, for the chosen quality and tier range.')) +
        controls(o, tiers) +
        ST.tabs(C.pools.map((p) => [`#/caravana${qs(o, { t: p.id })}`, esc(p.name.replace(/^(A )?Caravana (d[aoe]s? |do |de )?/i, ''))]), `#/caravana${qs(o, { t: theme.id })}`) +
        `<div class="cv-grid">${sections}</div>
        <div class="two-col" style="margin-top:20px">
          ${ST.sec(tr('Regras da Caravana (dados do jogo)', 'Caravan rules (game data)'), `<div class="list">
            <div class="row"><div class="grow">${tr('Item procurado', 'Wanted item')}</div><div class="r">+${Math.round(wantedBonus * 100)}% ${tr('Vales', 'Vouchers')}</div></div>
            <div class="row"><div class="grow">${tr('Pelo menos 1 de cada procurado', 'At least 1 of each wanted')}</div><div class="r">+${Math.round((K.caravan_all_wanted_item_match || 0) * 100)}% ${tr('em todos', 'on all')}</div></div>
            <div class="row"><div class="grow">${tr('Bônus por quadrado ocupado', 'Bonus per occupied square')}</div><div class="r">+${Math.round((K.caravan_per_square_bonus || 0) * 100)}%</div></div>
            <div class="row"><div class="grow">${tr('Pontos mínimos por item', 'Minimum points per item')}</div><div class="r">${K.caravan_minimum_item_points}</div></div>
            <div class="row"><div class="grow">${tr('Pacotes por dia / itens por pacote', 'Bundles per day / items per bundle')}</div><div class="r">${(days[0] || {}).maxItems} / ${(days[0] || {}).maxStack}</div></div></div>`,
            tr(`A pontuação aqui é relativa: valor do item × qualidade (×${dec(priceMult, 2)} no preço) × bônus de procurado. A conversão exata em Vales não está nos arquivos. “/quad.” ajuda a escolher o que cabe melhor na grade.`,
              `Scores here are relative: item value × quality (×${dec(priceMult, 2)} price) × wanted bonus. The exact Voucher conversion is not in the files. “/sq.” helps pick what fits best in the grid.`))}
          ${ST.sec(tr('Calendário dos dias', 'Day schedule'), `<div class="list">${days.map((x) => `<a class="row link" href="#/caravana${qs(o, { t: x.theme })}"><span class="cv-rank">${x.day}</span>
            <div class="grow">${esc(themeName(x.theme))}</div><div class="r">${esc(x.family.replace('caravan', tr('rota ', 'route ')))} · ${(C.maps[x.map] || {}).n || '?'} ${tr('quad.', 'sq.')}</div></a>`).join('')}</div>`)}
        </div>`;
      bind(el, o, '#/caravana', () => ({ t: theme.id }));
    },
  });

  // ================================================================ Invasão Dracônica (Aeronave)
  ST.page('invasao', {
    nav: 'invasao', title: () => t('airship'),
    async render(el, args, query) {
      const [skills, prog] = await ST.need('skills', 'progression');
      const { d } = await ST.itemsIndex();
      const K = prog.constants || {};
      const tiers = [...new Set(d.items.map((i) => i.tier))].filter(Boolean).sort((a, b) => a - b);
      const o = readOpts(query, tiers[tiers.length - 1]); o.defTmax = tiers[tiers.length - 1];
      const qm = [1, K.item_power_uncommon_mult || 1.25, K.item_power_flawless_mult || 1.5, K.item_power_epic_mult || 2, K.item_power_legd_mult || 3][o.q];
      const skillMods = new Map();
      skills.forEach((f) => f.tiers.forEach((tt) => skillMods.set(tt.uid, tt.mods || {})));
      const cat = query.get('c') || 'all';
      const rows = d.items.filter((i) => ['weapon', 'armor', 'accessory'].includes(i.cat) && i.tier >= o.tmin && i.tier <= o.tmax && (o.soon || !ST.isUnreleased(i))).map((i) => {
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
