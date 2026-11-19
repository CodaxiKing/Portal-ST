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
      const view = query.get('v') === 'sobretaxa' ? 'sur' : 'xp';
      const o = {
        q: Math.min(4, Math.max(0, +(query.get('q') ?? 0))), tmax: +(query.get('tmax') || 99), cat: query.get('cat') || '',
        sf: query.get('sf') === '1', ban: Math.max(0, +(query.get('ban') || 0)), act: query.get('act') || '',
        res: +(query.get('res') || 0), loy: Math.max(0, +(query.get('loy') || 0)), soon: query.get('soon') === '1',
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
      if (view === 'xp') {
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
        ST.tabs([['#/venda', tr('XP por venda', 'XP per sale')], ['#/venda?v=sobretaxa', tr('Sobretaxa', 'Surcharge')]], view === 'xp' ? '#/venda' : '#/venda?v=sobretaxa') +
        `<div class="form-row">
          <label class="field">${t('quality')}<select class="inp" id="q">${QUAL.map(([, n], k) => `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
          <label class="field">${tr('Tier máximo', 'Max tier')}<select class="inp" id="tmax">${tiers.map((x) => `<option ${x === Math.min(o.tmax, tiers[tiers.length - 1]) ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="field">${tr('Categoria', 'Category')}<select class="inp" id="cat"><option value="">${t('all')}</option>${Object.entries(d.categories).map(([k, v]) => `<option value="${k}" ${k === o.cat ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
          ${extra}
          <label class="check"><input type="checkbox" id="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label>
        </div>${table}<p class="note">${note}</p>`;

      el.querySelectorAll('.form-row select, .form-row input').forEach((n) => n.addEventListener('change', () => {
        const g = (id) => el.querySelector('#' + id);
        const v = (id, def) => (g(id) && g(id).value !== String(def) ? g(id).value : '');
        ST.setQuery({ q: v('q', 0), tmax: v('tmax', tiers[tiers.length - 1]), cat: v('cat', ''), res: v('res', 0), soon: g('soon').checked ? '1' : '',
          sf: g('sf').checked ? '1' : '', act: v('act', ''), loy: v('loy', 0), ...(view === 'sur' ? { ban: v('ban', 0) } : {}) });
        ST.rerender();
      }));
    },
  });
})();
