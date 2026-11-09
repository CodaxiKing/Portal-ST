/* Ferramentas: plano de fabricação do dia, custo de Forjado/Ascensão/Transcendência, comparador de builds,
   grupos por área de missão (motor do Hypermax) e ficha pública de build. */
(() => {
  const { t, tr, esc, nf, short, dur, img, dec } = ST;
  ST.addI18n({
    pt: { craftPlan: 'Plano de fabricação', upgradeCalc: 'Custo de melhorias', buildCompare: 'Comparar builds', partyByArea: 'Grupos por área', buildCard: 'Ficha de build' },
    en: { craftPlan: 'Crafting plan', upgradeCalc: 'Upgrade costs (items)', buildCompare: 'Compare builds', partyByArea: 'Parties by area', buildCard: 'Build card' },
    es: { craftPlan: 'Plan de fabricación', upgradeCalc: 'Coste de mejoras', buildCompare: 'Comparar builds', partyByArea: 'Grupos por zona', buildCard: 'Ficha de build' },
    fr: { craftPlan: 'Plan de fabrication', upgradeCalc: 'Coût des améliorations', buildCompare: 'Comparer des builds', partyByArea: 'Groupes par zone', buildCard: 'Fiche de build' },
    de: { craftPlan: 'Herstellungsplan', upgradeCalc: 'Verbesserungskosten', buildCompare: 'Builds vergleichen', partyByArea: 'Gruppen nach Gebiet', buildCard: 'Build-Karte' },
    it: { craftPlan: 'Piano di creazione', upgradeCalc: 'Costo potenziamenti', buildCompare: 'Confronta build', partyByArea: 'Gruppi per zona', buildCard: 'Scheda build' },
  });
  const cur = (sprite, ic) => (ST.icon(sprite) ? `<img class="cur-img" src="${ST.icon(sprite)}" alt="">` : ST.ic(ic));
  const SHARD = () => cur('bp_upgrade', 'shard'), SEAL = () => cur('bp_upgrade02', 'seal');
  const itemPicker = (items, id) => `<input class="inp" id="${id}" list="${id}-list" placeholder="${tr('Digite o nome do item…', 'Type an item name…')}" style="min-width:240px">
    <datalist id="${id}-list">${items.map((i) => `<option value="${esc(i.name)}">T${i.tier}</option>`).join('')}</datalist>`;

  // ================================================================ plano de fabricação do dia
  /* Escolhe o que fabricar em cada espaço de fabricação para a janela de tempo informada, maximizando ouro ou XP,
     respeitando (se informado) um limite de recursos por hora. Guloso: ordena por rendimento e aloca espaço a espaço. */
  ST.page('plano', {
    nav: 'plano', title: () => t('craftPlan'),
    async render(el, args, query) {
      const { d } = await ST.itemsIndex();
      const [w] = await ST.need('workers');
      const P = { h: Math.max(0.5, +(query.get('h') || 8)), slots: Math.min(30, Math.max(1, +(query.get('n') || 10))), goal: query.get('g') === 'xp' ? 'xp' : 'gold',
        tmax: +(query.get('tmax') || 99), wl: Math.max(1, +(query.get('wl') || 1)), cap: +(query.get('cap') || 0), sf: query.get('sf') === '1' };
      const wl = w.wlevels.find((x) => x.level === P.wl) || w.wlevels[0];
      const acc = ST.account && ST.account.active();
      const tiers = [...new Set(d.items.map((i) => i.tier))].sort((a, b) => a - b);
      const cand = d.items.filter((i) => !i.nonCraftable && !ST.isUnreleased(i) && (!acc || ST.account.has(i)) && i.time > 0 && i.tier <= P.tmax && !i.components.some((c) => c.isItem))
        .map((i) => {
          const e = ST.effective(i, { ms: true, sf: P.sf });
          const time = e.time * (wl.craftingTime / 100);
          const res = e.res.reduce((a, r) => a + r.qty, 0);
          return { i, e, time, gold: e.value, xp: i.xp, res, rate: (P.goal === 'xp' ? i.xp : e.value) / time };
        }).sort((a, b) => b.rate - a.rate);
      // limite de recursos: total por hora (soma de todos os tipos) que você consegue gerar; 0 = sem limite
      const budget = P.cap ? P.cap * P.h : Infinity;
      const win = P.h * 3600;
      let used = 0;
      const plan = [];
      for (let s = 0; s < P.slots; s++) {
        const pick = cand.find((x) => {
          const n = Math.max(1, Math.floor(win / x.time));
          return used + x.res * Math.min(n, Math.max(1, Math.floor((budget - used) / Math.max(1, x.res)))) <= budget;
        });
        if (!pick) break;
        let n = Math.max(1, Math.floor(win / pick.time));
        if (budget !== Infinity) n = Math.min(n, Math.floor((budget - used) / Math.max(1, pick.res)));
        if (n < 1) break;
        used += pick.res * n;
        plan.push({ ...pick, n, slot: s + 1 });
      }
      const sum = (k) => plan.reduce((a, x) => a + x[k] * x.n, 0);
      const resUse = {};
      plan.forEach((x) => x.e.res.forEach((r) => (resUse[r.id] = (resUse[r.id] || 0) + r.qty * x.n)));
      el.innerHTML = ST.pageHead(t('craftPlan'), tr('Diga quanto tempo vai ficar fora e quantos espaços de fabricação tem: o portal monta a fila que mais rende ouro ou XP nesse período.',
        'Tell how long you will be away and how many crafting slots you have: the portal builds the queue that earns the most gold or XP in that window.')) + `
        <div class="form-row">
          <label class="field">${tr('Horas', 'Hours')}<input class="inp" type="number" id="h" min="0.5" step="0.5" value="${P.h}"></label>
          <label class="field">${tr('Espaços de fabricação', 'Crafting slots')}<input class="inp" type="number" id="n" min="1" max="30" value="${P.slots}"></label>
          <label class="field">${tr('Objetivo', 'Goal')}<select class="inp" id="g"><option value="gold">${tr('Ouro', 'Gold')}</option><option value="xp" ${P.goal === 'xp' ? 'selected' : ''}>XP</option></select></label>
          <label class="field">${tr('Tier máximo', 'Max tier')}<select class="inp" id="tmax">${tiers.map((x) => `<option ${x === Math.min(P.tmax, tiers[tiers.length - 1]) ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label class="field">${tr('Nível dos trabalhadores', 'Worker level')}<select class="inp" id="wl">${w.wlevels.map((x) => `<option value="${x.level}" ${x.level === P.wl ? 'selected' : ''}>${x.level}</option>`).join('')}</select></label>
          <label class="field">${tr('Recursos por hora (0 = sem limite)', 'Resources per hour (0 = no limit)')}<input class="inp" type="number" id="cap" min="0" value="${P.cap}"></label>
          <label class="check"><input type="checkbox" id="sf" ${P.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
          ${ST.accountToggle ? ST.accountToggle(acc) : ''}</div>
        ${ST.stats([ST.stat(tr('Ouro no período', 'Gold in window'), short(sum('gold')), 'gold'), ST.stat(tr('XP no período', 'XP in window'), short(sum('xp'))),
          ST.stat(tr('Recursos usados', 'Resources used'), short(used)), ST.stat(tr('Fabricações', 'Crafts'), nf(plan.reduce((a, x) => a + x.n, 0)))])}
        ${ST.sec(tr('Fila por espaço', 'Queue per slot'), plan.length ? ST.table(plan, [
          { key: 'slot', label: '#', num: true },
          { key: 'name', label: t('name'), sort: (r) => r.i.name, fmt: (r) => `<a class="cell-item" href="#/item/${r.i.uid}">${img(r.i.uid)}<span>${esc(r.i.name)}<br><span class="small muted">T${r.i.tier}</span></span></a>` },
          { key: 'n', label: tr('Vezes', 'Times'), num: true }, { key: 'time', label: t('time'), num: true, fmt: (r) => dur(r.time) },
          { key: 'gold', label: tr('Ouro', 'Gold'), num: true, cls: 'gold', sort: (r) => r.gold * r.n, fmt: (r) => short(r.gold * r.n) },
          { key: 'xp', label: 'XP', num: true, sort: (r) => r.xp * r.n, fmt: (r) => short(r.xp * r.n) },
          { key: 'res', label: tr('Recursos', 'Resources'), fmt: (r) => r.e.res.map((x) => `${img(x.id)} ${nf(x.qty * r.n)}`).join(' ') }]) : `<p class="muted">${tr('Nada cabe nesses limites.', 'Nothing fits these limits.')}</p>`)}
        ${Object.keys(resUse).length ? ST.sec(tr('Recursos necessários', 'Resources needed'), `<div class="tags">${Object.entries(resUse).map(([id, q]) => `<span class="chip">${img(id)} ${esc(ST.refName(id))} ${nf(q)}</span>`).join('')}</div>`) : ''}
        <p class="note">${tr('Só itens sem componentes de outros itens (não depende de estoque). Tempo ajustado pelo nível do trabalhador; marcos do projeto incluídos. Não conta fabricação múltipla, talentos, eventos nem a capacidade dos depósitos.',
          'Only items without item components (no stock needed). Time adjusted by worker level; milestones included. Ignores multicraft, talents, events and bin capacity.')}</p>`;
      if (ST.bindAccountToggle) ST.bindAccountToggle(el);
      el.querySelectorAll('.form-row input:not([data-acc]),.form-row select').forEach((n) => n.addEventListener('change', () => {
        const v = (id) => el.querySelector('#' + id);
        ST.setQuery({ h: v('h').value, n: v('n').value, g: v('g').value === 'xp' ? 'xp' : '', tmax: v('tmax').value, wl: v('wl').value === '1' ? '' : v('wl').value,
          cap: +v('cap').value ? v('cap').value : '', sf: v('sf').checked ? '1' : '' });
        ST.rerender();
      }));
    },
  });

  // ================================================================ custo de melhorias dos itens
  /* Lista de itens com a meta de cada um (Forjado nas Estrelas, Ascensão 0–3, Transcendência 0–3): soma de
     Estilhaços e Selos, fabricações para o Forjado e o efeito nos atributos. Link: ?i=uid:asc:trans:sf,... */
  ST.page('melhorias', {
    nav: 'melhorias', title: () => t('upgradeCalc'),
    async render(el, args, query) {
      const { d, by } = await ST.itemsIndex();
      const rows = (query.get('i') || '').split(',').filter(Boolean).map((s) => {
        const [uid, a, x, sf] = s.split(':');
        return by.has(uid) ? { it: by.get(uid), a: Math.min(3, +a || 0), x: Math.min(3, +x || 0), sf: sf === '1' } : null;
      }).filter(Boolean);
      const save = () => { ST.setQuery({ i: rows.map((r) => `${r.it.uid}:${r.a}:${r.x}:${r.sf ? 1 : 0}`).join(',') }); ST.rerender(); };
      const calc = (r) => {
        const A = (r.it.ascension || []).slice(0, r.a), X = (r.it.transcendence || []).slice(0, r.x), S = r.sf ? r.it.starforged || [] : [];
        const after = ST.applySteps(r.it, [...S, ...(r.it.ascension || []).slice(0, r.a), ...X]).stats;
        return { shards: A.reduce((s, u) => s + (u.cost || 0), 0), seals: X.reduce((s, u) => s + (u.cost || 0), 0),
          sfCrafts: r.sf && S.length ? Math.max(...S.map((u) => u.req || 0)) : 0, after, effects: [...S, ...A, ...X].map((u) => u.text) };
      };
      const C = rows.map(calc);
      const tot = C.reduce((a, c) => ({ shards: a.shards + c.shards, seals: a.seals + c.seals, sf: a.sf + c.sfCrafts }), { shards: 0, seals: 0, sf: 0 });
      const opts = (n, v) => Array.from({ length: n + 1 }, (_, i) => `<option ${i === v ? 'selected' : ''}>${i}</option>`).join('');
      el.innerHTML = ST.pageHead(t('upgradeCalc'), tr('Some o custo de levar vários itens até a Ascensão, a Transcendência e o Forjado nas Estrelas, e veja os atributos depois.',
        'Add up the cost of taking several items to Ascension, Transcendence and Starforged, and see the stats afterwards.')) + `
        <div class="form-row">${itemPicker(d.items.filter((i) => (i.ascension || []).length), 'up')}<button class="chip primary" id="add">${tr('Adicionar', 'Add')}</button>
          ${rows.length ? `<button class="chip" id="clr">${tr('Limpar', 'Clear')}</button>` : ''}</div>
        ${ST.stats([ST.stat(`${SHARD()} ${tr('Estilhaços de Ascensão', 'Ascension Shards')}`, nf(tot.shards)), ST.stat(`${SEAL()} ${tr('Selos da Transcendência', 'Transcendence Seals')}`, nf(tot.seals)),
          ST.stat(tr('Fabricações para o Forjado', 'Crafts for Starforged'), nf(tot.sf))])}
        ${rows.length ? `<div class="list">${rows.map((r, k) => { const c = C[k]; return `<div class="row up-row">${img(r.it.uid)}<div class="grow"><b><a href="#/item/${r.it.uid}">${esc(r.it.name)}</a></b> <span class="small muted">T${r.it.tier}</span>
            <div class="form-row" style="margin:6px 0"><label class="field">${tr('Ascensão', 'Ascension')}<select class="inp" data-k="${k}" data-f="a">${opts(3, r.a)}</select></label>
            <label class="field">${tr('Transcendência', 'Transcendence')}<select class="inp" data-k="${k}" data-f="x">${opts(3, r.x)}</select></label>
            <label class="check"><input type="checkbox" data-k="${k}" data-f="sf" ${r.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
            <button class="chip" data-del="${k}">${ST.ic('close')}</button></div>
            <div class="small">${SHARD()} ${nf(c.shards)} · ${SEAL()} ${nf(c.seals)}${c.sfCrafts ? ` · ${nf(c.sfCrafts)} ${tr('fabricações Forjadas', 'starforged crafts')}` : ''}
              · <span class="s-atk">${t('atk')} ${nf(r.it.stats.atk)}→${nf(c.after.atk)}</span> <span class="s-def">${t('def')} ${nf(r.it.stats.def)}→${nf(c.after.def)}</span> <span class="s-hp">${t('hp')} ${nf(r.it.stats.hp)}→${nf(c.after.hp)}</span></div>
            ${c.effects.length ? `<div class="small muted">${c.effects.map(esc).join(' · ')}</div>` : ''}</div></div>`; }).join('')}</div>`
          : ST.empty ? ST.empty(tr('Nenhum item', 'No items'), tr('Digite o nome de um item acima e clique em Adicionar.', 'Type an item name above and click Add.')) : ''}
        <p class="note">${tr('Custos por etapa dos arquivos do jogo (Ascensão em Estilhaços, Transcendência em Selos). “Fabricações Forjadas” é o maior marco de Forjado nas Estrelas. Atributos em qualidade Normal.',
          'Per-step costs from the game files (Ascension in Shards, Transcendence in Seals). “Starforged crafts” is the highest Starforged milestone. Stats at Common quality.')}</p>`;
      el.querySelector('#add').addEventListener('click', () => {
        const v = el.querySelector('#up').value.trim().toLowerCase();
        const it = d.items.find((i) => i.name.toLowerCase() === v) || d.items.find((i) => i.name.toLowerCase().includes(v) && (i.ascension || []).length);
        if (it) { rows.push({ it, a: 3, x: 3, sf: true }); save(); }
      });
      const clr = el.querySelector('#clr'); if (clr) clr.addEventListener('click', () => { rows.length = 0; save(); });
      el.querySelectorAll('[data-f]').forEach((n) => n.addEventListener('change', () => {
        const r = rows[+n.dataset.k]; if (n.dataset.f === 'sf') r.sf = n.checked; else r[n.dataset.f] = +n.value; save();
      }));
      el.querySelectorAll('[data-del]').forEach((n) => n.addEventListener('click', () => { rows.splice(+n.dataset.del, 1); save(); }));
    },
  });

  // ================================================================ comparador de builds
  const toQuery = (link) => new URLSearchParams(String(link || '').split('?')[1] || '');
  ST.page('comparar-builds', {
    nav: 'comparar-builds', title: () => t('buildCompare'),
    async render(el, args, query) {
      const A = query.get('a') || '', B = query.get('b') || '';
      const RA = A ? await ST.buildFromQuery(toQuery(A)) : null, RB = B ? await ST.buildFromQuery(toQuery(B)) : null;
      const stats = [['power', tr('Poder no placar', 'Leaderboard power'), (b) => b.power], ['profile', tr('Poder no perfil', 'Profile power'), (b) => b.profile.power],
        ['atk', t('atk'), (b) => b.atk], ['def', t('def'), (b) => b.def], ['hp', t('hp'), (b) => b.hp], ['crit', tr('Crítico', 'Crit'), (b) => Math.min(b.crit, 1) * 100],
        ['cm', tr('Dano crítico', 'Crit dmg'), (b) => b.cm], ['eva', tr('Evasão', 'Evasion'), (b) => b.eva * 100], ['E', tr('Elemento', 'Element'), (b) => b.E]];
      const diff = (a, b) => { const dlt = b - a; const p = a ? (dlt / a) * 100 : 0; return dlt === 0 ? '<span class="muted">=</span>' : `<span class="${dlt > 0 ? 'ok' : 'bad'}">${dlt > 0 ? '+' : ''}${nf(Math.round(dlt * 100) / 100)} (${dlt > 0 ? '+' : ''}${dec(p, 1)}%)</span>`; };
      const gearDiff = RA && RB ? RA.b.gear.map((g, k) => ({ k, a: g, b: RB.b.gear[k] })).filter((x) => (x.a && x.a.x.it.uid) !== (x.b && x.b.x.it.uid) || (x.a && x.a.el && x.a.el.e.uid) !== (x.b && x.b.el && x.b.el.e.uid) || (x.a && x.a.sp && x.a.sp.e.uid) !== (x.b && x.b.sp && x.b.sp.e.uid)) : [];
      const gname = (g) => (g ? `${img(g.x.it.uid)} ${esc(g.x.it.name)}${g.el ? ` · ${esc(g.el.e.name)}` : ''}${g.sp ? ` · ${esc(g.sp.e.name)}` : ''}` : '—');
      el.innerHTML = ST.pageHead(t('buildCompare'), tr('Cole dois links do Montador (botão “Copiar link do build”) para ver os builds lado a lado e a diferença de cada atributo.',
        'Paste two Builder links (“Copy build link” button) to see the builds side by side and the difference in each stat.')) + `
        <div class="form-row"><label class="field" style="flex:1">Build A<input class="inp" id="la" value="${esc(A)}" placeholder="#/montador?c=…"></label>
          <label class="field" style="flex:1">Build B<input class="inp" id="lb" value="${esc(B)}" placeholder="#/montador?c=…"></label>
          <button class="chip primary" id="cmp">${tr('Comparar', 'Compare')}</button></div>
        ${RA || RB ? `<div class="two-col">${[RA, RB].map((R, i) => (R ? `<div>${ST.hmUI.card(R.b, i ? 'B' : 'A', { ...R.o, href: (i ? B : A).replace(/^.*#/, '#') })}</div>` : '<div></div>')).join('')}</div>` : ''}
        ${RA && RB ? ST.sec(tr('Diferença (B − A)', 'Difference (B − A)'), `<div class="table-wrap"><table class="data-table"><thead><tr><th></th><th class="num">A</th><th class="num">B</th><th class="num">B − A</th></tr></thead><tbody>${stats.map(([k, label, f]) =>
          `<tr><td>${label}</td><td class="num">${nf(Math.round(f(RA.b) * 100) / 100)}</td><td class="num">${nf(Math.round(f(RB.b) * 100) / 100)}</td><td class="num">${diff(f(RA.b), f(RB.b))}</td></tr>`).join('')}</tbody></table></div>`)
          + (gearDiff.length ? ST.sec(tr('Peças diferentes', 'Different pieces'), `<div class="list">${gearDiff.map((x) => `<div class="row"><div class="grow"><div>A: ${gname(x.a)}</div><div>B: ${gname(x.b)}</div></div></div>`).join('')}</div>`) : '') : ''}`;
      el.querySelector('#cmp').addEventListener('click', () => {
        const clean = (v) => { const s = v.trim(); const i = s.indexOf('#/'); return i >= 0 ? s.slice(i) : s; };
        ST.setQuery({ a: clean(el.querySelector('#la').value), b: clean(el.querySelector('#lb').value) }); ST.rerender();
      });
    },
  });

  // ================================================================ grupos por área de missão
  ST.page('grupos', {
    nav: 'grupos', title: () => t('partyByArea'),
    async render(el) {
      const [zones] = await ST.need('quests');
      el.innerHTML = ST.pageHead(t('partyByArea'), tr('Para cada área de missão: o nível mais alto que o grupo mais forte (Hypermax, ou só os seus itens com “Minha conta” ligada) alcança, e quem entra no grupo.',
        'For each quest area: the highest level the strongest party reaches (Hypermax, or only your items with “My account” on), and who is in it.')) +
        `<div class="hm-progress"><div class="hm-pbar"><i style="--w:30%"></i></div><span class="small muted">${tr('Calculando os heróis…', 'Computing heroes…')}</span></div>`;
      const hash = location.hash;
      const builds = await ST.hmBuildsCached(false);
      if (location.hash !== hash) return;
      const rows = zones.filter((z) => z.levels.some((l) => l.power)).map((z) => {
        const lv = z.levels.filter((l) => l.power);
        const ok = lv.filter((l) => builds.slice(0, l.party || 4).reduce((a, b) => a + b.power, 0) >= l.power);
        const top = ok[ok.length - 1], next = lv.find((l) => !ok.includes(l));
        const party = builds.slice(0, (top || lv[0]).party || 4);
        return { z, ok: ok.length, total: lv.length, top, next, party };
      });
      el.innerHTML = ST.pageHead(t('partyByArea'), tr('Para cada área de missão: o nível mais alto que o grupo mais forte alcança e quem entra no grupo. Usa o motor do Hypermax; com “Minha conta” ligada, só os seus itens.',
        'For each quest area: the highest level the strongest party reaches and who is in it. Uses the Hypermax engine; with “My account” on, only your items.')) +
        ST.table(rows, [
          { key: 'z', label: tr('Área', 'Area'), sort: (r) => r.z.name, fmt: (r) => `<a class="cell-item" href="#/missoes/${r.z.id}">${img(r.z.icon)}<span>${esc(r.z.name)}</span></a>` },
          { key: 'ok', label: tr('Níveis', 'Levels'), num: true, fmt: (r) => `<span class="${r.ok === r.total ? 'ok' : r.ok ? '' : 'bad'}">${r.ok}/${r.total}</span>` },
          { key: 'need', label: tr('Próximo: poder', 'Next: power'), num: true, sort: (r) => (r.next ? r.next.power : 0), fmt: (r) => (r.next ? nf(r.next.power) : ST.ic('check')) },
          { key: 'party', label: tr('Grupo', 'Party'), fmt: (r) => `<span class="gp-party">${r.party.map((b) => `<a href="#/hypermax/${b.c.uid}" title="${esc(b.c.name)} · ${nf(Math.round(b.power))}">${img(b.c.icon)}</a>`).join('')}</span>` }])
        + `<p class="note">${tr('Compara a soma do poder do grupo com o poder recomendado de cada nível (como o jogo mostra). Não simula a luta; para isso use o Simulador de missão.', 'Compares the party’s total power with each level’s recommended power (as the game shows). It does not simulate combat; use the Quest simulator for that.')}</p>`;
    },
  });

  // ================================================================ ficha pública de build
  /* Versão limpa do build para mandar a alguém: #/build?<mesmos parâmetros do montador> */
  ST.page('build', {
    nav: 'montador', title: () => t('buildCard'),
    async render(el, args, query) {
      const R = await ST.buildFromQuery(query);
      const b = R.b;
      const editLink = '#/montador?' + query.toString();
      el.innerHTML = `<div class="bc-wrap">${ST.hmUI.card(b, '★', { ...R.o, href: editLink })}
        <div>${ST.stats([ST.stat(tr('Poder no placar', 'Leaderboard power'), nf(Math.round(b.power)), 'gold'), ST.stat(tr('Poder no perfil', 'Profile power'), nf(Math.round(b.profile.power))),
          ST.stat(t('level'), b.lv), ST.stat(tr('Elemento', 'Element'), Math.round(b.E))])}
          <div class="list">${b.gear.map((g) => (g ? `<a class="row" href="#/item/${g.x.it.uid}">${img(g.x.it.uid)}<div class="grow"><b>${esc(g.x.it.name)}</b> <span class="small muted">T${g.x.it.tier}</span>
            <div class="small muted">${g.el ? esc(g.el.e.name) : '—'} · ${g.sp ? esc(g.sp.e.name) : '—'}</div></div></a>` : '')).join('')}</div>
          <div class="tags" style="margin-top:12px"><a class="chip primary" href="${editLink}">${tr('Editar no montador', 'Edit in builder')}</a>
            <button class="chip" id="bcCopy">${tr('Copiar link', 'Copy link')}</button><button class="chip" id="bcImg">${tr('Baixar imagem', 'Download image')}</button><span class="small muted" id="bcMsg"></span></div></div></div>`;
      const msg = (x) => (el.querySelector('#bcMsg').textContent = x);
      el.querySelector('#bcCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); msg(tr('Link copiado.', 'Link copied.')); } catch (e) { prompt('URL', location.href); } });
      el.querySelector('#bcImg').addEventListener('click', async () => { msg('…'); const r = await ST.shareBuild(b, R.o, location.href, 'Portal Shop Titans'); msg(r === 'shared' ? tr('Compartilhado.', 'Shared.') : tr('Imagem baixada.', 'Image downloaded.')); });
    },
  });
})();
