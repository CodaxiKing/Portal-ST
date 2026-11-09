/* Minha conta (perfil salvo no navegador), simulador de missão com montador de grupo e calculadora de qualidade. */
(() => {
  const { t, tr, esc, nf, short, dur, img, dec } = ST;
  ST.addI18n({
    pt: { account: 'Minha conta', simulator: 'Simulador de missão', quality: 'Calculadora de qualidade' },
    en: { account: 'My account', simulator: 'Quest simulator', quality: 'Quality calculator' },
  });

  // ---------------------------------------------------------------- perfil
  const KEY = 'st_account';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } };
  const write = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
  ST.account = {
    get: read,
    active: () => { const a = read(); return !!(a && a.on); },
    /* projeto desbloqueado? (sem perfil ativo: tudo liberado) */
    has(i) { return ST.profileHas(read(), i); },
    workerLevel(id) { const a = read(); return (a && a.on && a.workers && a.workers[id]) || null; },
  };
  const toggleHTML = (on) => (ST.account.get() ? `<label class="check acc-tg"><input type="checkbox" data-acc ${on ? 'checked' : ''}> ${tr('Só o que eu tenho (Minha conta)', 'Only what I own (My account)')}</label>` : '');
  ST.accountToggle = toggleHTML;
  ST.bindAccountToggle = (el) => {
    const c = el.querySelector('[data-acc]');
    if (c) c.addEventListener('change', () => { const a = read() || {}; a.on = c.checked; write(a); ST._hmCaches = {}; ST.rerender(); });
  };

  ST.page('conta', {
    nav: 'conta', title: () => t('account'),
    async render(el) {
      const { d, by } = await ST.itemsIndex();
      const [w] = await ST.need('workers');
      const a = read() || { on: true, maxTier: 0, merchant: 0, workers: {}, extra: [], hidden: [], heroes: [] };
      const tiers = [...new Set(d.items.map((i) => i.tier))].filter(Boolean).sort((x, y) => x - y);
      const maxW = (w.wlevels || []).length || 40;
      const owned = d.items.filter((i) => ST.account.has(i) || !a.on);
      el.innerHTML = ST.pageHead(t('account'), tr('Diga o que você já tem no jogo. As ferramentas (lucro, Caravana, Invasão, Hypermax, Tumba, simulador) passam a considerar só os seus projetos e trabalhadores. Fica salvo neste navegador.',
        'Tell the portal what you already have in the game. The tools (profit, Caravan, Invasion, Hypermax, Tomb, simulator) then only use your blueprints and workers. Saved in this browser.')) + `
        <form class="acc-form" id="acc">
          <label class="check"><input type="checkbox" name="on" ${a.on ? 'checked' : ''}> ${tr('Usar meu perfil nas ferramentas', 'Use my profile in the tools')}</label>
          <div class="form-row">
            <label class="field">${tr('Nível do comerciante', 'Merchant level')}<input class="inp" type="number" min="0" max="120" name="merchant" value="${a.merchant || ''}"><span class="small muted">${tr('Opcional: esconde projetos de nível muito acima do seu.', 'Optional: hides blueprints far above your level.')}</span></label>
            <label class="field">${tr('Tenho todos os projetos até o tier', 'I own every blueprint up to tier')}<select class="inp" name="maxTier"><option value="0">—</option>${tiers.map((x) => `<option ${x === a.maxTier ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          </div>
          ${ST.sec(tr('Exceções', 'Exceptions'), `<div class="form-row"><label class="field">${tr('Também tenho (acima do tier)', 'I also own (above the tier)')}<input class="inp" list="acc-items" id="addx" placeholder="${tr('Nome do projeto…', 'Blueprint name…')}"></label>
            <label class="field">${tr('Não tenho (abaixo do tier)', 'I do not own (below the tier)')}<input class="inp" list="acc-items" id="addh" placeholder="${tr('Nome do projeto…', 'Blueprint name…')}"></label></div>
            <datalist id="acc-items">${d.items.map((i) => `<option value="${esc(i.name)}">T${i.tier}</option>`).join('')}</datalist>
            <div class="tags">${(a.extra || []).map((u) => by.get(u)).filter(Boolean).map((i) => `<span class="chip-item">${img(i.uid)}<span>+ ${esc(i.name)}</span><button type="button" class="acc-x" data-rmx="${i.uid}" aria-label="x">${ST.ic('close')}</button></span>`).join('')}
            ${(a.hidden || []).map((u) => by.get(u)).filter(Boolean).map((i) => `<span class="chip-item acc-no">${img(i.uid)}<span>− ${esc(i.name)}</span><button type="button" class="acc-x" data-rmh="${i.uid}" aria-label="x">${ST.ic('close')}</button></span>`).join('')}</div>`)}
          ${ST.sec(tr('Nível dos trabalhadores', 'Worker levels'), `<div class="acc-workers">${w.workers.map((x) => `<label class="field small"><span class="acc-wk">${img(x.icon)}${esc(x.name)}</span>
            <input class="inp" type="number" min="1" max="${maxW}" name="w_${x.uid}" value="${(a.workers || {})[x.uid] || ''}"></label>`).join('')}</div>`, tr('Usado no ranking de lucro: o tempo de fabricação cai conforme o nível de cada trabalhador.', 'Used in the profit ranking: crafting time drops with each worker level.'))}
          <div class="tags"><button class="chip primary" type="submit">${tr('Salvar perfil', 'Save profile')}</button><button class="chip" type="button" id="accClear">${tr('Apagar perfil', 'Delete profile')}</button>
            <span class="small muted" id="accMsg"></span></div>
        </form>
        ${ST.stats([ST.stat(tr('Projetos considerados', 'Blueprints counted'), `${nf(owned.length)} / ${nf(d.items.length)}`), ST.stat(tr('Trabalhadores com nível', 'Workers with level'), nf(Object.keys(a.workers || {}).length))])}`;
      const f = el.querySelector('#acc');
      const save = (extra = {}) => {
        const fd = new FormData(f);
        const workers = {};
        for (const [k, v] of fd.entries()) if (k.startsWith('w_') && v) workers[k.slice(2)] = Math.max(1, Math.min(maxW, +v));
        write({ ...a, ...extra, on: !!fd.get('on'), merchant: +fd.get('merchant') || 0, maxTier: +fd.get('maxTier') || 0, workers });
        ST._hmCaches = {};
      };
      f.addEventListener('submit', (e) => { e.preventDefault(); save(); el.querySelector('#accMsg').textContent = tr('Perfil salvo.', 'Profile saved.'); setTimeout(() => ST.rerender(), 400); });
      const addBy = (inp, key) => inp.addEventListener('change', () => {
        const it = d.items.find((i) => i.name === inp.value); if (!it) return;
        save({ [key]: [...new Set([...(a[key] || []), it.uid])] }); ST.rerender();
      });
      addBy(el.querySelector('#addx'), 'extra'); addBy(el.querySelector('#addh'), 'hidden');
      el.querySelectorAll('[data-rmx],[data-rmh]').forEach((b) => b.addEventListener('click', () => {
        const key = b.dataset.rmx ? 'extra' : 'hidden', u = b.dataset.rmx || b.dataset.rmh;
        save({ [key]: (a[key] || []).filter((x) => x !== u) }); ST.rerender();
      }));
      el.querySelector('#accClear').addEventListener('click', () => { if (confirm(tr('Apagar o perfil deste navegador?', 'Delete the profile from this browser?'))) { localStorage.removeItem(KEY); ST._hmCaches = {}; ST.rerender(); } });
    },
  });

  // ---------------------------------------------------------------- simulador de missão
  /* Modelo aproximado (o jogo também simula 50 vezes; regras de combate exatas não estão nos arquivos):
     heróis atacam em ordem; monstro ataca um alvo escolhido pela ameaça (ou todos, no ataque em área);
     acerto = 1 − (evasão − precisão do monstro); dano recebido × multiplicador de defesa (DEF do herói vs DEF-alvo da missão:
     abaixo = até ×2, igual = ×1, acima = até ×0,5) × crítico do monstro. Sucesso = monstro derrotado antes de 50 rodadas. */
  const RATINGS = [['SSS', 0], ['S', 0.05], ['A', 0.15], ['B', 0.4], ['C', 0.6], ['D', 1]];
  function simulate(party, mon, runs = 200) {
    let wins = 0, deaths = 0, rounds = 0;
    for (let r = 0; r < runs; r++) {
      const hs = party.map((h) => ({ ...h, cur: h.hp }));
      let mhp = mon.hp, rd = 0, died = false;
      while (mhp > 0 && hs.some((h) => h.cur > 0) && rd < 50) {
        rd++;
        const red = 1 - (mon.dmgRed || 0); // redução de dano do monstro (ex.: Tumba do Terror 95%)
        for (const h of hs) if (h.cur > 0 && mhp > 0) mhp -= h.atk * red * (Math.random() < Math.min(1, h.crit) ? h.cm : 1);
        if (mhp <= 0) break;
        const alive = hs.filter((h) => h.cur > 0);
        const aoe = Math.random() < (mon.aoeOdds || 0);
        const targets = aoe ? alive : (() => { const tot = alive.reduce((a, h) => a + Math.max(1, h.aggro), 0); let x = Math.random() * tot; for (const h of alive) { x -= Math.max(1, h.aggro); if (x <= 0) return [h]; } return [alive[0]]; })();
        for (const h of targets) {
          if (Math.random() < Math.max(0, Math.min(0.75, h.eva) - (mon.accuracy || 0))) continue;
          const ratio = h.def / Math.max(1, mon.tdef);
          const dm = ratio < 1 ? 2 - ratio : Math.max(0.5, 1 / ratio);
          const base = aoe ? (mon.aoe || mon.dmg) : mon.dmg;
          h.cur -= base * dm * (Math.random() < (mon.crit || 0) ? (mon.critMult || 1.5) : 1);
          if (h.cur <= 0) died = true;
        }
      }
      if (mhp <= 0) wins++;
      if (died) deaths++;
      rounds += rd;
    }
    const dc = deaths / runs;
    return { win: wins / runs, death: dc, rounds: rounds / runs, rating: (RATINGS.find(([, th]) => dc <= th) || RATINGS[RATINGS.length - 1])[0] };
  }
  ST.simulate = simulate;

  async function hmBuilds(tomb) {
    // usa o mesmo motor do Hypermax (ou da Tumba) com as opções padrão
    const key = tomb ? '#/tumba' : '#/hypermax';
    const [classes, skills, prog] = await ST.need('classes', 'skills', 'progression');
    const { d } = await ST.itemsIndex();
    const ev = tomb ? (await ST.need('events'))[0] : null;
    const o = { q: 4, lv: 50, tr: true, sf: true, en: true, sk: true, soon: false, tower: tomb, noCrit: tomb, questMult: ev ? ev.tower.spiritQuestMult : 2 };
    const ck = 'sim|' + key + '|' + (ST.account.active() ? 'acc' : '');
    ST._hmCaches = ST._hmCaches || {};
    if (!ST._hmCaches[ck]) {
      const P = ST.hmDebug.prepare(d, skills, prog.constants || {}, o);
      ST._hmCaches[ck] = (await ST.hmComputeAll(classes, P, skills, prog.constants || {}, o)).sort((a, b) => b.power - a.power);
    }
    return ST._hmCaches[ck];
  }
  const heroStats = (b) => ({ id: b.c.uid, name: b.c.name, icon: b.c.icon, atk: b.atk, def: b.def, hp: b.hp, eva: b.eva, crit: b.crit, cm: b.cm, aggro: b.aggro || 1 });

  ST.page('simulador', {
    nav: 'simulador', title: () => t('simulator'),
    async render(el, args, query) {
      const [zones, ev] = await ST.need('quests', 'events');
      const mode = query.get('m') || 'quest';
      const tomb = mode === 'tomb';
      let mon, party, title;
      if (tomb) {
        const T = ev.tower, tt = T.tomb.find((x) => x.uid === query.get('t')) || T.tomb[T.tomb.length - 1];
        const depth = Math.max(0, +(query.get('d') || 0));
        const step = (s, d0) => String(s || '').split(';').map((p) => p.split(',').map(Number)).reduce((a, [k, v]) => (d0 >= k ? v : a), 0) / 100;
        mon = { hp: tt.monsterHp * (1 + step(T.curse.hp, depth)), dmg: tt.dmg * (1 + step(T.curse.atk, depth)), tdef: tt.tdef * (1 + step(T.curse.def, depth)),
          crit: tt.crit, critMult: 1.5, aoe: tt.aoe, aoeOdds: 0.25, accuracy: tt.accuracy || 0, dmgRed: tt.dmgRed || 0, party: tt.party || 4, power: tt.power };
        title = `${tt.name} · ${tr('profundidade', 'depth')} ${depth}`;
        party = tt.party || 4;
        mon.sel = `<label class="field">${tr('Tumba', 'Tomb')}<select class="inp" data-q="t">${T.tomb.map((x) => `<option value="${x.uid}" ${x === tt ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="field">${tr('Profundidade', 'Depth')}<input class="inp" type="number" min="0" max="200" data-q="d" value="${depth}"></label>`;
      } else {
        const z = zones.find((x) => x.id === query.get('z')) || zones[0];
        const li = Math.min(z.levels.length - 1, Math.max(0, +(query.get('l') || z.levels.length - 1)));
        const L = z.levels[li];
        mon = { hp: L.monsterHp, dmg: L.dmg, tdef: L.tdef, crit: L.crit, critMult: L.critMult, aoe: L.aoe, aoeOdds: L.aoeOdds, accuracy: L.accuracy || 0, party: L.party, power: L.power };
        title = `${z.name} · ${t('level')} ${li + 1}${L.boss ? ' · ' + tr('chefe', 'boss') : ''}`;
        party = L.party || 3;
        mon.sel = `<label class="field">${tr('Área', 'Area')}<select class="inp" data-q="z">${zones.map((x) => `<option value="${x.id}" ${x === z ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
          <label class="field">${t('level')}<select class="inp" data-q="l">${z.levels.map((x, i) => `<option value="${i}" ${i === li ? 'selected' : ''}>${i + 1}${x.boss ? ' ★' : ''} · ${short(x.power)}</option>`).join('')}</select></label>`;
      }
      el.innerHTML = ST.skeleton();
      const builds = await hmBuilds(tomb);
      const byId = new Map(builds.map((b) => [b.c.uid, b]));
      let picks = (query.get('p') || '').split(',').filter((u) => byId.has(u)).slice(0, party);
      let auto = null;
      if (query.get('auto') === '1' || !picks.length) {
        // montador de grupo: testa combinações entre os 12 mais fortes + os 4 maiores em ameaça (tanques)
        const tanks = builds.slice().sort((a, b) => (b.aggro * b.def) - (a.aggro * a.def)).slice(0, 4);
        const cand = [...new Set([...builds.slice(0, 12), ...tanks])];
        let best = null;
        const comb = [];
        const rec = (s) => {
          if (comb.length === party) {
            const res = simulate(comb.map(heroStats), mon, 40);
            const sc = res.win * 1000 - res.death * 100;
            if (!best || sc > best.sc) best = { sc, ids: comb.map((b) => b.c.uid), res };
            return;
          }
          for (let i = s; i <= cand.length - (party - comb.length); i++) { comb.push(cand[i]); rec(i + 1); comb.pop(); }
        };
        rec(0);
        picks = best ? best.ids : builds.slice(0, party).map((b) => b.c.uid);
        auto = true;
      }
      const P = picks.map((u) => byId.get(u)).filter(Boolean);
      const res = simulate(P.map(heroStats), mon, 400);
      const pw = P.reduce((a, b) => a + b.power, 0);
      const qsBase = (extra) => { const q = new URLSearchParams(query); for (const [k, v] of Object.entries(extra)) if (v === '' || v == null) q.delete(k); else q.set(k, v); q.delete('auto'); return '#/simulador?' + q.toString(); };
      el.innerHTML = ST.pageHead(t('simulator'), tr('Escolha uma missão (ou um andar da Tumba) e um grupo: o portal simula a luta 400 vezes e dá a chance de sucesso, a chance de alguém morrer e a nota (SSS a D), como o “Sucesso estimado” do jogo. O botão “Melhor grupo” testa as combinações dos heróis mais fortes.',
        'Pick a quest (or a Tomb floor) and a party: the portal simulates the fight 400 times and gives the success chance, the chance of someone dying and the grade (SSS to D), like the game\'s “Estimated Success”. “Best party” tests combinations of the strongest heroes.')) +
        ST.tabs([['#/simulador', tr('Missões', 'Quests')], ['#/simulador?m=tomb', tr('Tumba dos Titãs', 'Tomb of Titans')]], tomb ? '#/simulador?m=tomb' : '#/simulador') +
        `<div class="form-row">${mon.sel}<button class="chip primary" id="best">${tr('Melhor grupo', 'Best party')}</button></div>
        <div class="sim-top">
          <div class="sim-res r-${res.rating.toLowerCase()}"><span class="small muted">${esc(title)}</span><b>${dec(res.win * 100, 1)}%</b><span>${tr('de sucesso', 'success')}</span>
            <div class="sim-grade">${res.rating}</div></div>
          ${ST.stats([ST.stat(tr('Chance de morte', 'Death chance'), dec(res.death * 100, 1) + '%'), ST.stat(tr('Rodadas (média)', 'Rounds (avg)'), dec(res.rounds, 1)),
            ST.stat(tr('Poder do grupo', 'Party power'), short(pw)), ST.stat(tr('Poder recomendado', 'Recommended power'), short((mon.power || 0) * (mon.party || 1)))])}
        </div>
        ${ST.sec(`${tr('Grupo', 'Party')} (${P.length}/${party})${auto ? ' · ' + tr('montado automaticamente', 'built automatically') : ''}`, `<div class="sim-party">${Array.from({ length: party }, (_, k) => {
          const b = P[k];
          return `<div class="sim-slot">${b ? `<div class="thumb">${img(b.c.icon)}</div>` : '<div class="thumb"><span class="ph"></span></div>'}
            <select class="inp" data-slot="${k}"><option value="">—</option>${builds.map((x) => `<option value="${x.c.uid}" ${b && x.c.uid === b.c.uid ? 'selected' : ''}>${esc(x.c.name)} · ${short(x.power)}</option>`).join('')}</select>
            ${b ? `<div class="small muted">${t('atk')} ${short(b.atk)} · ${t('def')} ${short(b.def)} · ${t('hp')} ${short(b.hp)} · ${tr('ameaça', 'threat')} ${nf(b.aggro)}</div>` : ''}</div>`;
        }).join('')}</div>`, tr('Cada herói usa o equipamento do Hypermax' + (tomb ? ' da Tumba (sem crítico)' : '') + (ST.account.active() ? ', só com os seus projetos.' : '.'), 'Each hero uses the ' + (tomb ? 'Tomb (no crit) ' : '') + 'Hypermax gear' + (ST.account.active() ? ', limited to your blueprints.' : '.')))}
        ${ST.sec(tr('Monstro', 'Monster'), ST.stats([ST.stat(tr('PV', 'HP'), short(mon.hp)), ST.stat(tr('Dano', 'Damage'), nf(Math.round(mon.dmg))), ST.stat(tr('DEF-alvo', 'Target DEF'), nf(Math.round(mon.tdef))),
          ST.stat(tr('Crítico', 'Crit'), dec((mon.crit || 0) * 100, 0) + '%'), ST.stat(tr('Área', 'AoE'), `${nf(mon.aoe || 0)} · ${dec((mon.aoeOdds || 0) * 100, 0)}%`),
          mon.dmgRed ? ST.stat(tr('Redução de dano', 'Damage reduction'), dec(mon.dmgRed * 100, 0) + '%') : '', mon.accuracy ? ST.stat(tr('Precisão', 'Accuracy'), dec(mon.accuracy * 100, 0) + '%') : '']),
          tr('Modelo aproximado: as regras exatas de combate ficam no código do jogo, não nos dados. Use para comparar grupos, não como garantia.', 'Approximate model: the exact combat rules live in the game code, not the data. Use it to compare parties, not as a guarantee.'))}`;
      el.querySelectorAll('[data-q]').forEach((n) => n.addEventListener('change', () => (location.hash = qsBase({ [n.dataset.q]: n.value, ...(n.dataset.q === 'z' ? { l: '' } : {}), p: '' }))));
      el.querySelectorAll('[data-slot]').forEach((n) => n.addEventListener('change', () => { const p = picks.slice(); p[+n.dataset.slot] = n.value; location.hash = qsBase({ p: p.filter(Boolean).join(',') }); }));
      el.querySelector('#best').addEventListener('click', () => (location.hash = qsBase({ p: '' }) + '&auto=1'));
    },
  });

  // ---------------------------------------------------------------- calculadora de qualidade
  ST.page('qualidade', {
    nav: 'qualidade', title: () => t('quality'),
    async render(el, args, query) {
      const { d, by } = await ST.itemsIndex();
      const [prog] = await ST.need('progression');
      const K = (prog && prog.constants) || {};
      const it = by.get(query.get('i'));
      const extra = +(query.get('x') || 0), n = Math.max(1, +(query.get('n') || 100));
      const ups = it ? [...it.milestones, ...(query.get('sf') === '1' ? it.starforged : []), ...(query.get('asc') === '1' ? it.ascension : [])].filter((u) => u.key === 'quality') : [];
      const bonus = ups.reduce((a, u) => a + u.v, 0) + extra / 100;
      const base = [['uncommon', K.craft_uncommon_odds ?? 0.04, ['Superior', 'Uncommon']], ['flawless', K.craft_flawless_odds ?? 0.007, ['Magistral', 'Flawless']],
        ['epic', K.craft_epic_odds ?? 0.0025, ['Épico', 'Epic']], ['legendary', K.craft_legendary_odds ?? 0.0005, ['Lendário', 'Legendary']]];
      const rows = base.map(([k, p, nm]) => { const pq = Math.min(1, p * (1 + bonus)); return { k, nm: tr(...nm), base: p, p: pq, atLeast: 1 - Math.pow(1 - pq, n), exp: 1 / pq }; });
      const common = Math.max(0, 1 - rows.reduce((a, r) => a + r.p, 0));
      const craftable = d.items.filter((i) => !i.nonCraftable && (i.resources.length || i.components.length));
      el.innerHTML = ST.pageHead(t('quality'), tr('Chance de cada qualidade por fabricação, com os bônus de “Chance de qualidade” do projeto (+1 = dobra a chance) e bônus extras (talentos, eventos).', 'Chance of each quality per craft, with the blueprint\'s “Quality chance” bonuses (+1 = double) and extra bonuses (talents, events).')) +
        `<div class="form-row">
          <label class="field">${t('items')}<input class="inp" id="qi" list="qi-list" placeholder="${tr('Opcional: escolha um projeto…', 'Optional: pick a blueprint…')}" value="${esc(it ? it.name : '')}" style="min-width:240px"></label>
          <datalist id="qi-list">${craftable.map((i) => `<option value="${esc(i.name)}">T${i.tier}</option>`).join('')}</datalist>
          <label class="check"><input type="checkbox" data-k="sf" ${query.get('sf') === '1' ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
          <label class="check"><input type="checkbox" data-k="asc" ${query.get('asc') === '1' ? 'checked' : ''}> ${tr('Ascensão', 'Ascension')}</label>
          <label class="field">${tr('Bônus extra (%)', 'Extra bonus (%)')}<input class="inp" type="number" min="0" step="5" data-k="x" value="${extra || ''}"></label>
          <label class="field">${tr('Fabricações', 'Crafts')}<input class="inp" type="number" min="1" data-k="n" value="${n}"></label></div>
        ${ST.stats([ST.stat(tr('Bônus total de qualidade', 'Total quality bonus'), '+' + dec(bonus * 100, 0) + '%'), ST.stat(tr('Normal', 'Common'), dec(common * 100, 2) + '%')])}
        ${ST.table(rows, [
          { key: 'nm', label: tr('Qualidade', 'Quality') }, { key: 'base', label: tr('Base do jogo', 'Game base'), num: true, fmt: (r) => dec(r.base * 100, 3) + '%' },
          { key: 'p', label: tr('Por fabricação', 'Per craft'), num: true, fmt: (r) => dec(r.p * 100, 3) + '%' },
          { key: 'atLeast', label: tr(`Pelo menos 1 em ${n}`, `At least 1 in ${n}`), num: true, fmt: (r) => dec(r.atLeast * 100, 1) + '%' },
          { key: 'exp', label: tr('Fabricações em média', 'Crafts on average'), num: true, fmt: (r) => nf(Math.round(r.exp)) }])}
        ${ups.length ? `<p class="note">${tr('Melhorias de qualidade do projeto', 'Blueprint quality upgrades')}: ${ups.map((u) => esc(u.text)).join(' · ')}</p>` : ''}`;
      const go = (o) => { const q = new URLSearchParams(query); for (const [k, v] of Object.entries(o)) if (v === '' || v === false) q.delete(k); else q.set(k, v === true ? '1' : v); location.hash = '#/qualidade?' + q.toString(); };
      el.querySelector('#qi').addEventListener('change', (e) => { const x = craftable.find((i) => i.name === e.target.value); if (x) go({ i: x.uid }); });
      el.querySelectorAll('[data-k]').forEach((n2) => n2.addEventListener('change', () => go({ [n2.dataset.k]: n2.type === 'checkbox' ? n2.checked : n2.value })));
    },
  });
})();
