/* Calculadora de fusão (Ferramentas): quantos itens de uma qualidade são precisos para chegar a outra, o tempo de fabricação
   desses itens e se vale a pena (ouro e XP de comerciante na venda: o resultado × os itens usados).
   Tabela de fusão do jogo (progression.fusion: qualidade exigida, quantidade e chance de sucesso) e multiplicadores
   item_price_*_mult / item_xp_*_mult das constantes. Rota: #/fusao?i=<item>&from=0&to=4 */
(function () {
  'use strict';
  const { t, tr, esc, nf, short, img } = ST;
  ST.addI18n({ pt: { fusionCalc: 'Calculadora de fusão' }, en: { fusionCalc: 'Fusion calculator' }, es: { fusionCalc: 'Calculadora de fusión' },
    fr: { fusionCalc: 'Calculateur de fusion' }, de: { fusionCalc: 'Fusionsrechner' }, it: { fusionCalc: 'Calcolatore di fusione' }, ru: { fusionCalc: 'Калькулятор слияния' },
    uk: { fusionCalc: 'Калькулятор злиття' }, tk: { fusionCalc: 'Birleştirme hesaplayıcı' }, ja: { fusionCalc: '融合計算機' }, ko: { fusionCalc: '융합 계산기' },
    zh: { fusionCalc: '融合计算器' }, zh_tr: { fusionCalc: '融合計算器' } });
  // qualidades na ordem do jogo e a chave das constantes item_price_<k>_mult / item_xp_<k>_mult
  const Q = [['common', '', ['Comum', 'Common']], ['uncommon', 'uncommon', ['Superior', 'Uncommon']], ['flawless', 'flawless', ['Magistral', 'Flawless']],
    ['epic', 'epic', ['Épico', 'Epic']], ['legendary', 'legd', ['Lendário', 'Legendary']]];

  ST.page('fusao', {
    nav: 'fusao', title: () => t('fusionCalc'),
    async render(el, args, query) {
      const { d } = await ST.itemsIndex();
      const [prog] = await ST.need('progression');
      const K = prog.constants || {};
      const items = d.items.filter((i) => !i.nonCraftable && i.time > 0).sort((a, b) => b.tier - a.tier || a.name.localeCompare(b.name));
      const it = items.find((i) => i.uid === query.get('i')) || items.find((i) => i.uid === 'shortsword') || items[0];
      const from = Math.min(3, Math.max(0, +(query.get('from') || 0)));
      const to = Math.min(4, Math.max(from + 1, +(query.get('to') || 4)));
      const step = Object.fromEntries((prog.fusion || []).map((f) => [f.uid, f]));
      const mult = (k, kind) => (Q[k][1] ? K[`item_${kind}_${Q[k][1]}_mult`] || 1 : 1);

      // cadeia de fusões, da qualidade de origem até a desejada; a chance de sucesso < 1 aumenta a média de itens gastos
      let per = 1; // itens de origem por 1 item da qualidade atual (média)
      const chain = [];
      for (let k = from + 1; k <= to; k++) {
        const f = step[Q[k][0]] || { qty: 0, successOdds: 1 };
        const odds = Math.max(0.0001, +f.successOdds || 1);
        per = per * (f.qty || 0) / odds;
        chain.push({ k, qty: f.qty, odds, per });
      }
      const n = per;
      const totalTime = n * it.time;
      const valFrom = it.value * mult(from, 'price'), valTo = it.value * mult(to, 'price');
      const xpFrom = it.xp * mult(from, 'xp'), xpTo = it.xp * mult(to, 'xp');
      const qn = (k) => tr(...Q[k][2]);
      const opt = (sel) => Q.map((q, k) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${tr(...q[2])}</option>`).join('');

      el.innerHTML = ST.pageHead(t('fusionCalc'), tr('Quantos itens são precisos para fundir até a qualidade desejada, quanto tempo leva para fabricá-los e se vale mais vender o resultado ou os itens usados.',
        'How many items you need to fuse up to the target quality, how long they take to craft, and whether selling the result beats selling the items used.')) +
        `<div class="form-row">
          <label class="field">${tr('Item', 'Item')}<input class="inp" id="fi" list="fiList" value="${esc(it.name)}" style="min-width:260px"><datalist id="fiList">${items.map((i) => `<option value="${esc(i.name)}">T${i.tier}</option>`).join('')}</datalist></label>
          <label class="field">${tr('De', 'From')}<select class="inp" id="from">${opt(from).replace(/<option value="4"[^<]*<\/option>/, '')}</select></label>
          <label class="field">${tr('Até', 'To')}<select class="inp" id="to">${opt(to)}</select></label>
        </div>
        <div class="fu-head"><a class="cell-item" href="#/item/${it.uid}">${img(it.uid)}<span><b>${esc(it.name)}</b><br><span class="small muted">T${it.tier} · ${esc(ST.typeName(it.type))}</span></span></a></div>
        ${ST.stats([
          ST.stat(ST.trf('Itens {0} necessários', '{0} items needed', qn(from)), nf(Math.ceil(n))),
          ST.stat(tr('Tempo de fabricação deles', 'Their crafting time'), ST.dur(totalTime)),
          ST.stat(ST.trf('Valor de 1 {0}', 'Value of 1 {0}', qn(to)), short(valTo)),
          ST.stat(tr('Valor dos itens usados', 'Value of the items used'), short(valFrom * n)),
        ])}
        ${ST.sec(tr('Etapas', 'Steps'), ST.table(chain, [
          { key: 'k', label: t('quality'), fmt: (r) => `${qn(r.k - 1)} → <b>${qn(r.k)}</b>` },
          { key: 'qty', label: tr('Itens por fusão', 'Items per fusion'), num: true, fmt: (r) => nf(r.qty) },
          { key: 'odds', label: tr('Chance de sucesso', 'Success chance'), num: true, fmt: (r) => Math.round(r.odds * 100) + '%' },
          { key: 'per', label: ST.trf('Itens {0} por 1 desta qualidade (média)', '{0} items per 1 of this quality (average)', qn(from)), num: true, fmt: (r) => nf(Math.ceil(r.per)) },
        ]))}
        ${ST.sec(tr('Vale a pena?', 'Is it worth it?'), ST.table([
          { k: tr('Ouro na venda', 'Gold when sold'), a: valTo, b: valFrom * n },
          { k: tr('XP de comerciante na venda', 'Merchant XP when sold'), a: xpTo, b: xpFrom * n },
        ], [
          { key: 'k', label: '' },
          { key: 'a', label: ST.trf('1 {0} (fundido)', '1 {0} (fused)', qn(to)), num: true, fmt: (r) => `<b>${short(r.a)}</b>` },
          { key: 'b', label: ST.trf('{0} × {1} (sem fundir)', '{0} × {1} (not fused)', nf(Math.ceil(n)), qn(from)), num: true, fmt: (r) => short(r.b) },
        ]), tr('Fundir costuma render menos ouro e XP na venda do que vender os itens separados; compensa quando você quer o item de qualidade alta para equipar heróis (o poder do item cresce com a qualidade) ou para pedidos e eventos.',
          'Fusing usually earns less gold and XP on sale than selling the items separately; it pays off when you want the high-quality item to equip heroes (item power grows with quality) or for requests and events.'))}
        <p class="note">${tr('Quantidades e chances de sucesso da tabela de fusão do jogo (a mesma da página Progressão); com chance de 50%, metade das tentativas falha e consome os itens, então a média dobra. Tempo = tempo base de fabricação × itens, sem bônus de trabalhador, de fabricação múltipla nem o tempo da própria fusão. Ouro e XP usam os multiplicadores de qualidade do jogo (item_price_*_mult e item_xp_*_mult). O XP de trabalhador da fusão não entra: os arquivos trazem os multiplicadores, mas não a fórmula.',
          'Quantities and success chances from the game’s fusion table (the same as the Progression page); with a 50% chance, half the attempts fail and consume the items, so the average doubles. Time = base crafting time × items, without worker, multicraft or fusion-time bonuses. Gold and XP use the game’s quality multipliers (item_price_*_mult and item_xp_*_mult). Worker XP from fusion is not included: the files have the multipliers but not the formula.')}</p>`;

      const go = () => {
        const name = el.querySelector('#fi').value.trim().toLowerCase();
        const pick = items.find((i) => i.name.toLowerCase() === name) || it;
        ST.setQuery({ i: pick.uid, from: el.querySelector('#from').value === '0' ? '' : el.querySelector('#from').value, to: el.querySelector('#to').value === '4' ? '' : el.querySelector('#to').value });
        ST.rerender();
      };
      el.querySelectorAll('#from, #to, #fi').forEach((n) => n.addEventListener('change', go));
    },
  });
})();
