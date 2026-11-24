/* Ranking de venda (Comunidade): XP de comerciante por venda e lucro da sobretaxa por energia.
   Constantes do jogo: item_xp_*_mult e item_price_*_mult (qualidade), visitor_surcharge_multiplier (sobretaxa = valor × 2).
   Bônus de sobretaxa e XP vêm dos dados: Forjado nas Estrelas (surchargeOne / surchargeOneEnergy do item), estandartes
   (SurchargeAll, SurchargeEnergy, Value), pesquisa avançada dos tiers 14–16 (EnergyCost, XpBonus) e o talento Fidelidade
   à marca (freeSurcharge). Rotas: #/venda (XP) e #/venda?v=sobretaxa. */
(function () {
  'use strict';
  const { t, tr, esc, nf, short, img } = ST;
  ST.addI18n({ pt: { sellRank: 'Ranking de venda' }, en: { sellRank: 'Sales ranking' }, es: { sellRank: 'Ranking de ventas' }, fr: { sellRank: 'Classement des ventes' },
    de: { sellRank: 'Verkaufsrangliste' }, it: { sellRank: 'Classifica di vendita' }, ru: { sellRank: 'Рейтинг продаж' }, uk: { sellRank: 'Рейтинг продажів' },
    tk: { sellRank: 'Satış sıralaması' }, ja: { sellRank: '販売ランキング' }, ko: { sellRank: '판매 순위' }, zh: { sellRank: '销售排行' }, zh_tr: { sellRank: '銷售排行' } });

  const QUAL = [['', ['Comum', 'Common']], ['uncommon', ['Superior', 'Uncommon']], ['flawless', ['Magistral', 'Flawless']], ['epic', ['Épico', 'Epic']], ['legd', ['Lendário', 'Legendary']]];
  const pct = (s) => { const m = /([+-]?\d+(?:\.\d+)?)\s*%/.exec(String(s || '')); return m ? +m[1] / 100 : 0; };
  const fx = (v) => (v >= 10 ? nf(Math.round(v)) : ST.dec(v, 1));
  const big = (v) => (v >= 1e4 ? short(v) : fx(v));

  ST.page('venda', {
    nav: 'venda', title: () => t('sellRank'),
    async render(el, args, query) {
      const { d } = await ST.itemsIndex();
      const [prog, tree] = await ST.need('progression', 'skilltree');
      const K = prog.constants || {};
      const view = { sobretaxa: 'sur', energia: 'energy', nivel: 'level' }[query.get('v')] || 'xp';
      const o = {
        q: Math.min(4, Math.max(0, +(query.get('q') ?? 0))), tmax: +(query.get('tmax') || 99), cat: query.get('cat') || '',
        sf: query.get('sf') === '1', ban: Math.max(0, +(query.get('ban') || 0)), act: query.get('act') || '',
        res: +(query.get('res') || 0), loy: Math.max(0, +(query.get('loy') || 0)), soon: query.get('soon') === '1',
        // planejador de energia
        me: Math.max(1, +(query.get('me') || 1000)), n: Math.max(1, +(query.get('n') || 200)), ch: Math.max(0, +(query.get('ch') || 0)),
        // nível de comerciante
        lv: Math.min(99, Math.max(1, +(query.get('lv') || 30))), lt: Math.min(100, Math.max(2, +(query.get('lt') || 40))), lp: Math.max(0, +(query.get('lp') || 0)),
      };
      const qk = QUAL[o.q][0];
      const priceMult = qk ? K[`item_price_${qk}_mult`] || 1 : 1;
      const xpMult = qk ? K[`item_xp_${qk}_mult`] || 1 : 1;
      const surMult = K.visitor_surcharge_multiplier || 2;

      // bônus dos dados
      const banners = tree.banner || [];
      const banNode = (b, mod) => (b.nodes || []).find((n) => n.mod === mod);
      const banAllPer = pct((banners.map((b) => banNode(b, 'SurchargeAll')).find(Boolean) || {}).value) || 0.01;
      const active = banners.find((b) => b.type === o.act);
      const actEnergy = active ? pct((banNode(active, 'SurchargeEnergy') || {}).value) : 0; // negativo
      const actValue = active ? pct((banNode(active, 'Value') || {}).value) : 0;
      // pesquisa avançada: nós t14_<tipo>EnergyCost / t15_… / t16_… (vale só para itens daquele tipo e tier)
      const research = {};
      for (const w of tree.research || []) for (const br of w.branches || []) for (const n of br.nodes || []) {
        const m = /^t(\d+)_([a-z0-9]+?)(EnergyCost|XpBonus)$/.exec(n.uid || '');
        if (m) research[`${m[2]}|${m[1]}|${m[3]}`] = [pct(n.value), pct(n.empowered)];
      }
      const resBonus = (i, mod) => { const r = o.res && research[`${i.type}|${i.tier}|${mod}`]; return r ? r[o.res - 1] || 0 : 0; };
      const loyNode = (tree.trees || []).flatMap((x) => x.nodes || []).find((n) => n.family === 'freeSurcharge');
      const loyRanks = loyNode ? loyNode.ranks : [];
      const loyChance = o.loy ? pct((loyRanks[Math.min(o.loy, loyRanks.length) - 1] || {}).value) : 0;
      const sfOf = (i, key) => (o.sf ? (i.starforged || []).filter((u) => u.key === key && u.op === '*').reduce((a, u) => a * u.v, 1) : 1);

      const base = d.items.filter((i) => !i.nonCraftable && (o.soon || !(ST.isUnreleased && ST.isUnreleased(i))) && i.tier <= o.tmax && (!o.cat || i.cat === o.cat));
      const tiers = [...new Set(d.items.map((i) => i.tier))].sort((a, b) => a - b);
      const nameCell = (r) => `<a class="cell-item" href="#/item/${r.i.uid}">${img(r.i.uid)}<span>${esc(r.i.name)}<br><span class="small muted">${esc(ST.typeName(r.i.type))}</span></span></a>`;
      const cols0 = [{ key: 'name', label: t('name'), sort: (r) => r.i.name, fmt: nameCell }, { key: 'tier', label: 'T', num: true, sort: (r) => r.i.tier, fmt: (r) => r.i.tier }];

      // energia da sobretaxa do item com os bônus escolhidos (as duas abas usam)
      const energyOf = (i) => {
        if (!i.energy || !(i.energy.surcharge > 0)) return null;
        const full = i.energy.surcharge * sfOf(i, 'surchargeOneEnergy') * (1 + (active && i.type === o.act ? actEnergy : 0) + resBonus(i, 'EnergyCost'));
        return Math.max(0, full) * (1 - loyChance);
      };
      const resOpts = [tr('Nenhuma', 'None'), tr('Normal', 'Normal'), tr('Potencializada', 'Empowered')];
      const bonusCtl = (withBanners) => `<label class="check"><input type="checkbox" id="sf" ${o.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
          ${withBanners ? `<label class="field">${tr('Estandartes com “Maestria da sobretaxa”', 'Banners with “Surcharge Mastery”')}<input class="inp" type="number" id="ban" min="0" max="${banners.length}" value="${o.ban}" style="width:92px"></label>` : ''}
          <label class="field">${tr('Estandarte ativo', 'Active banner')}<select class="inp" id="act"><option value="">${tr('Nenhum', 'None')}</option>${banners.map((b) => `<option value="${b.type}" ${b.type === o.act ? 'selected' : ''}>${esc(ST.typeName(b.type))}</option>`).join('')}</select></label>
          <label class="field">${tr('Pesquisa avançada (tiers 14–16)', 'Advanced research (tiers 14–16)')}<select class="inp" id="res">${resOpts.map((x, k) => `<option value="${k}" ${k === o.res ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          ${loyRanks.length ? `<label class="field">${esc(loyNode.title || tr('Fidelidade à marca', 'Brand Loyalty'))}<select class="inp" id="loy"><option value="0">${tr('Sem o talento', 'No talent')}</option>${loyRanks.map((r, k) => `<option value="${k + 1}" ${k + 1 === o.loy ? 'selected' : ''}>${tr('Nível', 'Rank')} ${k + 1} (${esc(r.value)})</option>`).join('')}</select></label>` : ''}`;
      let table, note, extra = '';
      let stats = '';
      if (view === 'energy') {
        // Planejador: em N vendas por dia, quantas dar desconto (ganha energia) e quantas sobretaxar (gasta) para o máximo de ouro a mais
        const discMult = K.visitor_discount_multiplier ?? 0.5;
        const chNode = (tree.trees || []).flatMap((x) => x.nodes || []).find((n) => n.family === 'sellEnergy');
        const chRanks = chNode ? chNode.ranks : [];
        const perSale = o.ch ? +String((chRanks[Math.min(o.ch, chRanks.length) - 1] || {}).value || 0).replace(/[^\d.-]/g, '') || 0 : 0;
        const disc = base.filter((i) => i.energy && i.energy.discount > 0 && i.value > 0).map((i) => {
          const value = i.value * priceMult, loss = value * (1 - discMult);
          return { i, value, loss, energy: i.energy.discount, epg: i.energy.discount / loss * 1000 };
        }).sort((a, b) => b.epg - a.epg);
        const sur = base.map((i) => ({ i, e: energyOf(i) })).filter((x) => x.e != null && x.e > 0 && x.e <= o.me).map(({ i, e }) => {
          const value = i.value * priceMult * (1 + (active && i.type === o.act ? actValue : 0));
          const gain = value * surMult * sfOf(i, 'surchargeOne') * (1 + o.ban * banAllPer) - value;
          return { i, value, gain, energy: e, gpe: gain / e };
        }).sort((a, b) => b.gpe - a.gpe);
        const D = disc[0], S = sur[0], N = o.n;
        let plan = null;
        if (S) {
          const onlyTalent = { x: 0, y: Math.min(N, N * perSale / S.energy) };
          const cands = [onlyTalent];
          if (D) { const x = Math.min(N, Math.max(0, N * (S.energy - perSale) / (D.energy + S.energy))); cands.push({ x, y: N - x }); }
          for (const c of cands) c.gold = c.y * S.gain - c.x * (D ? D.loss : 0);
          plan = cands.sort((a, b) => b.gold - a.gold)[0];
        }
        // frequência: "12× por dia" ou "1 a cada 3 dias" quando não dá uma por dia
        const freq = (v) => (v >= 1 ? `<b>${nf(Math.floor(v))}×</b> ${tr('por dia', 'per day')}` : v > 0 ? `<b>1</b> ${ST.trf('a cada {0} dias', 'every {0} days', nf(Math.ceil(1 / v)))}` : '—');
        const itemLine = (r) => `<a class="cell-item" href="#/item/${r.i.uid}">${img(r.i.uid)}<span>${esc(r.i.name)}<br><span class="small muted">T${r.i.tier} · ${esc(ST.typeName(r.i.type))}</span></span></a>`;
        stats = plan ? ST.stats([
          ST.stat(tr('Ouro a mais por dia', 'Extra gold per day'), short(plan.gold)),
          ST.stat(tr('Sobretaxas por dia', 'Surcharges per day'), plan.y >= 1 ? nf(Math.floor(plan.y)) : ST.dec(plan.y, 2)),
          ST.stat(tr('Descontos por dia', 'Discounts per day'), nf(Math.round(plan.x))),
          ST.stat(tr('Energia ganha por dia', 'Energy gained per day'), nf(Math.round(plan.x * (D ? D.energy : 0) + N * perSale))),
        ]) + `<div class="two-col" style="margin-top:14px">
          ${ST.sec(tr('Dar desconto em', 'Discount'), plan.x >= 0.5 && D ? `<div class="list"><div class="row">${itemLine(D)}<div class="r">${freq(plan.x)}<div class="small muted">+${nf(D.energy)} ${tr('energia', 'energy')} · −${short(D.loss)} ${tr('ouro', 'gold')}</div></div></div></div>` : `<p class="muted">${tr('Não compensa dar desconto: a energia extra por venda já basta ou o desconto custa mais do que a sobretaxa rende.', 'Discounting does not pay off: the extra energy per sale is enough, or the discount costs more than the surcharge earns.')}</p>`)}
          ${ST.sec(tr('Sobretaxar', 'Surcharge'), `<div class="list"><div class="row">${itemLine(S)}<div class="r">${freq(plan.y)}<div class="small muted">−${fx(S.energy)} ${tr('energia', 'energy')} · +${short(S.gain)} ${tr('ouro', 'gold')}</div></div></div></div>`)}
        </div>` : ST.empty(tr('Nenhum item cabe na sua energia máxima', 'No item fits your max energy'), tr('Aumente a energia máxima ou o tier máximo.', 'Raise max energy or the max tier.'));
        table = `<div class="two-col">
          ${ST.sec(tr('Melhores para dar desconto', 'Best to discount'), ST.table(disc.slice(0, 10), [...cols0,
            { key: 'energy', label: tr('Energia', 'Energy'), num: true, fmt: (r) => nf(r.energy) },
            { key: 'loss', label: tr('Ouro perdido', 'Gold lost'), num: true, fmt: (r) => short(r.loss) },
            { key: 'epg', label: tr('Energia por mil de ouro', 'Energy per 1,000 gold'), num: true, cls: 'gold', fmt: (r) => fx(r.epg) }], { sortKey: 'epg', sortDir: -1 }))}
          ${ST.sec(tr('Melhores para sobretaxar', 'Best to surcharge'), ST.table(sur.slice(0, 10), [...cols0,
            { key: 'energy', label: tr('Energia', 'Energy'), num: true, fmt: (r) => fx(r.energy) },
            { key: 'gain', label: tr('Ouro a mais', 'Extra gold'), num: true, fmt: (r) => short(r.gain) },
            { key: 'gpe', label: tr('Ouro a mais por energia', 'Extra gold per energy'), num: true, cls: 'gold', fmt: (r) => big(r.gpe) }], { sortKey: 'gpe', sortDir: -1 }))}
        </div>`;
        extra = `<label class="field">${tr('Energia máxima', 'Max energy')}<input class="inp" type="number" id="me" min="1" value="${o.me}" style="width:110px"></label>
          <label class="field">${tr('Vendas por dia', 'Sales per day')}<input class="inp" type="number" id="n" min="1" value="${o.n}" style="width:110px"></label>
          ${chRanks.length ? `<label class="field">${esc(chNode.title || tr('Cativante', 'Charismatic'))}<select class="inp" id="ch"><option value="0">${tr('Sem o talento', 'No talent')}</option>${chRanks.map((r, k) => `<option value="${k + 1}" ${k + 1 === o.ch ? 'selected' : ''}>${tr('Nível', 'Rank')} ${k + 1} (${esc(r.value)})</option>`).join('')}</select></label>` : ''}
          ${bonusCtl(true)}`;
        note = ST.trf('Modelo simplificado de um dia: cada cliente compra um item e você escolhe o que fazer com ele. Descontar vende por × {0} do valor e devolve a energia do desconto do item; sobretaxar usa a energia (já com os bônus marcados) para vender por mais. A energia máxima só limita quais itens dá para sobretaxar (o custo não pode passar dela). Na prática os clientes pedem tipos específicos e há outras fontes de energia (conversa, elogio, sugestão, mascotes), então use como guia de quais itens priorizar.',
          'Simplified one-day model: each customer buys one item and you choose what to do with it. Discounting sells at × {0} of the value and returns the item’s discount energy; surcharging spends energy (with the selected bonuses) to sell for more. Max energy only limits which items can be surcharged (the cost cannot exceed it). In practice customers ask for specific types and there are other energy sources (small talk, compliments, suggestions, pets), so use it as a guide to which items to prioritise.', discMult);
      } else if (view === 'level') {
        // XP para ir do nível atual ao desejado (a tabela do jogo traz o XP de cada nível)
        const L = prog.levels || [];
        const lt = Math.max(o.lt, o.lv + 1);
        const need = Math.max(0, L.filter((x) => x.level > o.lv && x.level <= lt).reduce((a, x) => a + x.xp, 0) - o.lp);
        const rows = base.filter((i) => i.xp > 0).map((i) => {
          const xp = i.xp * xpMult * (1 + resBonus(i, 'XpBonus'));
          return { i, xp, sales: Math.ceil(need / xp), gold: Math.ceil(need / xp) * i.value * priceMult };
        });
        const tgt = L.find((x) => x.level === lt) || {};
        stats = ST.stats([ST.stat(tr('XP que falta', 'XP needed'), nf(Math.round(need))), ST.stat(tr('Níveis', 'Levels'), `${o.lv} → ${lt}`),
          ST.stat(tr('Tier de equipamento no nível desejado', 'Equipment tier at target level'), tgt.etier ? 'T' + tgt.etier : '—')]);
        table = ST.table(rows, [...cols0,
          { key: 'xp', label: tr('XP por venda', 'XP per sale'), num: true, fmt: (r) => nf(Math.round(r.xp)) },
          { key: 'sales', label: tr('Vendas necessárias', 'Sales needed'), num: true, cls: 'gold', fmt: (r) => nf(r.sales) },
          { key: 'gold', label: tr('Ouro dessas vendas', 'Gold from those sales'), num: true, fmt: (r) => short(r.gold) }], { sortKey: 'sales', sortDir: 1 });
        const lvOpts = (from, to, cur) => L.filter((x) => x.level >= from && x.level <= to).map((x) => `<option ${x.level === cur ? 'selected' : ''}>${x.level}</option>`).join('');
        extra = `<label class="field">${tr('Nível atual', 'Current level')}<select class="inp" id="lv">${lvOpts(1, 99, o.lv)}</select></label>
          <label class="field">${tr('Nível desejado', 'Target level')}<select class="inp" id="lt">${lvOpts(2, 100, lt)}</select></label>
          <label class="field">${tr('XP já feito no nível atual', 'XP already earned this level')}<input class="inp" type="number" id="lp" min="0" value="${o.lp}" style="width:130px"></label>
          <label class="field">${tr('Pesquisa avançada (tiers 14–16)', 'Advanced research (tiers 14–16)')}<select class="inp" id="res">${resOpts.map((x, k) => `<option value="${k}" ${k === o.res ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`;
        note = tr('XP de cada nível vem da tabela do jogo (a mesma da página Progressão). “Vendas necessárias” supõe vender só aquele item, na qualidade escolhida, para clientes (o mercado não dá XP). Na prática você mistura itens; use a lista para ver quais rendem mais XP por venda.',
          'XP per level comes from the game table (the same as the Progression page). “Sales needed” assumes selling only that item, at the chosen quality, to customers (the market gives no XP). In practice you mix items; use the list to see which give the most XP per sale.');
      } else if (view === 'xp') {
        const rows = base.filter((i) => i.xp > 0).map((i) => {
          const xp = i.xp * xpMult * (1 + resBonus(i, 'XpBonus'));
          return { i, xp, value: i.value * priceMult, energy: energyOf(i) };
        });
        table = ST.table(rows, [...cols0,
          { key: 'xp', label: tr('XP por venda', 'XP per sale'), num: true, cls: 'gold', fmt: (r) => nf(Math.round(r.xp)) },
          { key: 'value', label: t('value'), num: true, fmt: (r) => short(r.value) },
          { key: 'energy', label: tr('Energia da sobretaxa', 'Surcharge energy'), num: true, fmt: (r) => (r.energy != null ? fx(r.energy) : '—') },
        ], { sortKey: 'xp', sortDir: -1 });
        extra = bonusCtl(false);
        note = tr('XP de comerciante ganho ao vender o item para um cliente, multiplicado pela qualidade (constantes item_xp_*_mult do jogo: ×1,25 / ×2 / ×3 / ×5) e pela pesquisa avançada de XP do tipo do item nos tiers 14–16 (+10% normal, +20% potencializada). “Energia da sobretaxa” é quanto custa sobretaxar o item, já com os bônus marcados: Forjado nas Estrelas do item, estandarte ativo do tipo, pesquisa avançada de energia (−10% / −20%) e a chance do talento de sair de graça (média). A sobretaxa e o desconto mudam o preço, não o XP. Encantamentos somam o XP deles ao item e não entram aqui; vender no mercado não dá XP.',
          'Merchant XP earned when selling the item to a customer, multiplied by quality (game constants item_xp_*_mult: ×1.25 / ×2 / ×3 / ×5) and by the item type’s advanced XP research on tiers 14–16 (+10% normal, +20% empowered). “Surcharge energy” is what it costs to surcharge the item, with the selected bonuses: the item’s Starforged, the active banner of its type, advanced energy research (−10% / −20%) and the talent’s chance of a free surcharge (on average). Surcharge and discount change the price, not the XP. Enchantments add their own XP to the item and are not counted here; selling on the market gives no XP.');
      } else {
        const rows = base.filter((i) => i.energy && i.energy.surcharge > 0).map((i) => {
          const value = i.value * priceMult * (1 + (active && i.type === o.act ? actValue : 0));
          const mult = surMult * sfOf(i, 'surchargeOne') * (1 + o.ban * banAllPer);
          const price = value * mult, gain = price - value;
          const energy = energyOf(i);
          return { i, value, price, gain, energy, gpe: energy > 0 ? gain / energy : null, disc: i.energy.discount };
        });
        table = ST.table(rows, [...cols0,
          { key: 'value', label: tr('Valor normal', 'Normal price'), num: true, fmt: (r) => short(r.value) },
          { key: 'price', label: tr('Com sobretaxa', 'Surcharged'), num: true, fmt: (r) => short(r.price) },
          { key: 'gain', label: tr('Ouro a mais', 'Extra gold'), num: true, fmt: (r) => short(r.gain) },
          { key: 'energy', label: tr('Energia', 'Energy'), num: true, fmt: (r) => fx(r.energy) },
          { key: 'gpe', label: tr('Ouro a mais por energia', 'Extra gold per energy'), num: true, cls: 'gold', fmt: (r) => (r.gpe != null ? big(r.gpe) : '—') },
          { key: 'disc', label: tr('Energia do desconto', 'Discount energy'), num: true, fmt: (r) => nf(r.disc) },
        ], { sortKey: 'gpe', sortDir: -1 });
        extra = bonusCtl(true);
        note = ST.trf('Sobretaxa vende pelo valor × {0} (constante visitor_surcharge_multiplier do jogo); “ouro a mais” é a diferença para a venda normal, e “por energia” mostra quais itens aproveitam melhor a sua energia. Bônus: Forjado nas Estrelas do próprio item (valor e energia da sobretaxa), +{1}% no valor da sobretaxa por estandarte com Maestria da sobretaxa, estandarte ativo (energia e valor do tipo), pesquisa avançada do tipo nos tiers 14–16 e a chance do talento de a sobretaxa sair de graça (média). Assumimos que os bônus de valor se multiplicam sobre o ×{0}; o jogo não diz se somam ou multiplicam.',
          'Surcharge sells at value × {0} (game constant visitor_surcharge_multiplier); “extra gold” is the difference to a normal sale, and “per energy” shows which items make the best use of your energy. Bonuses: the item’s own Starforged (surcharge value and energy), +{1}% surcharge value per banner with Surcharge Mastery, active banner (energy and value of that type), advanced research for the type on tiers 14–16 and the talent’s chance of a free surcharge (on average). We assume value bonuses multiply on top of ×{0}; the game does not say whether they add or multiply.',
          surMult, Math.round(banAllPer * 100));
      }

      el.innerHTML = ST.pageHead(t('sellRank'), tr('Quais itens dão mais XP de comerciante na venda e quais rendem mais ouro por energia gasta com sobretaxa.', 'Which items give the most merchant XP when sold and which earn the most gold per energy spent on surcharge.')) +
        ST.tabs([['#/venda', tr('XP por venda', 'XP per sale')], ['#/venda?v=sobretaxa', tr('Sobretaxa', 'Surcharge')], ['#/venda?v=energia', tr('Planejador de energia', 'Energy planner')], ['#/venda?v=nivel', tr('Nível de comerciante', 'Merchant level')]],
          { xp: '#/venda', sur: '#/venda?v=sobretaxa', energy: '#/venda?v=energia', level: '#/venda?v=nivel' }[view]) +
        `<div class="form-row">
          <label class="field">${t('quality')}<select class="inp" id="q">${QUAL.map(([, n], k) => `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
          <label class="field">${tr('Tier máximo', 'Max tier')}<select class="inp" id="tmax">${tiers.map((x) => `<option ${x === Math.min(o.tmax, tiers[tiers.length - 1]) ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="field">${tr('Categoria', 'Category')}<select class="inp" id="cat"><option value="">${t('all')}</option>${Object.entries(d.categories).map(([k, v]) => `<option value="${k}" ${k === o.cat ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          ${extra}
          <label class="check"><input type="checkbox" id="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label>
        </div>${stats}${table}<p class="note">${note}</p>`;

      el.querySelectorAll('.form-row select, .form-row input').forEach((n) => n.addEventListener('change', () => {
        const g = (id) => el.querySelector('#' + id);
        const v = (id, def) => (g(id) && g(id).value !== String(def) ? g(id).value : '');
        ST.setQuery({ q: v('q', 0), tmax: v('tmax', tiers[tiers.length - 1]), cat: v('cat', ''), res: v('res', 0), soon: g('soon').checked ? '1' : '',
          ...(g('sf') ? { sf: g('sf').checked ? '1' : '', act: v('act', ''), loy: v('loy', 0) } : {}), ...(g('ban') ? { ban: v('ban', 0) } : {}),
          ...(view === 'energy' ? { me: v('me', 1000), n: v('n', 200), ch: v('ch', 0) } : {}),
          ...(view === 'level' ? { lv: v('lv', 30), lt: v('lt', 40), lp: v('lp', 0) } : {}) });
        ST.rerender();
      }));
    },
  });
})();
