/* Hypermax: o máximo teórico de cada classe — equipamento, encantamentos e habilidades que dão mais poder.
   Rotas: #/hypermax e #/hypermax/<classe>.

   Modelo (dados e constantes do jogo):
   - item: atributos × qualidade (item_power_*_mult) após Ascensão + Transcendência; bônus "% de itens do tipo X" das habilidades
   - encantamento de elemento e de espírito; afinidade × affinity_stat_bonus ("Todos": metade do bônus)
   - elemento do herói = elementos encantados do mesmo elemento (+ bônus de afinidade); o rank não soma (calibrado com o titansdb)
   - habilidades: inata + espaços liberados pelo nível; cada uma no maior tier cujo elemento exigido foi atingido;
     espíritos no equipamento somam suas habilidades (iguais acumulam)
   - poder = ATQ×0,8×(1 + crítico×(dano crítico − 1)) + DEF×1,2 + PV×5 + escudo×3 + ameaça×(DEF×0,008 + PV×0,025) + escudo×evasão×0,025 */
(() => {
  const { t, tr, esc, nf, img, short, dec } = ST;
  ST.addI18n({ pt: { hypermax: 'Hypermax' }, en: { hypermax: 'Hypermax' } });
  const QN = [['Normal', 'Common'], ['Superior', 'Uncommon'], ['Magistral', 'Flawless'], ['Épico', 'Epic'], ['Lendário', 'Legendary']];
  const LEVELS = [50, 40, 35, 23, 100];

  function readOpts(q) {
    return {
      q: Math.min(4, Math.max(0, +(q.get('q') ?? 4))),
      lv: +(q.get('lv') || 50),
      tr: q.get('tr') !== '0',
      sf: q.get('sf') !== '0', // projeto Forjado nas Estrelas (marcos extras, ex.: atributos base +25%)
      en: q.get('en') !== '0',
      sk: q.get('sk') !== '0',
      soon: q.get('soon') === '1',
      ty: q.get('ty') || '',
    };
  }
  const optQuery = (o, extra = {}) => {
    const p = new URLSearchParams();
    if (o.q !== 4) p.set('q', o.q);
    if (o.lv !== 50) p.set('lv', o.lv);
    if (!o.tr) p.set('tr', '0');
    if (!o.sf) p.set('sf', '0');
    if (!o.en) p.set('en', '0');
    if (!o.sk) p.set('sk', '0');
    if (o.soon) p.set('soon', '1');
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? '?' + s : '';
  };

  // ---------------------------------------------------------------- preparação (uma vez por conjunto de opções)
  let PREP = { key: '', v: null };
  function prepare(d, skills, K, o) {
    const key = [o.q, o.tr, o.sf, o.en, o.soon].join('|');
    if (PREP.key === key) return PREP.v;
    const qm = [1, K.item_power_uncommon_mult || 1.25, K.item_power_flawless_mult || 1.5, K.item_power_epic_mult || 2, K.item_power_legd_mult || 3][o.q];
    const ok = (i) => o.soon || !ST.isUnreleased(i);
    // itens equipáveis com atributos já com qualidade e melhorias
    // tudo que cabe num espaço de herói (inclui feitiços, ervas e sobremesas), exceto encantamentos e materiais
    const items = d.items.filter((i) => !['z', 'm', 'ma'].includes(i.type) && ok(i)).map((it) => {
      const steps = [...(o.sf ? it.starforged || [] : []), ...(o.tr ? [...(it.ascension || []), ...(it.transcendence || [])] : [])];
      const s = steps.length ? ST.applySteps(it, steps).stats : it.stats;
      const core = { atk: s.atk * qm, def: s.def * qm, hp: s.hp * qm, eva: s.eva || 0, crit: s.crit || 0 };
      return { it, core, raw: core.atk * 0.8 + core.def * 1.2 + core.hp * 5 };
    }).filter((x) => x.raw > 0);
    const ench = d.items.filter((i) => i.type === 'z' && ok(i));
    // habilidades por uid de tier (para espíritos) e famílias
    const tierByUid = new Map();
    skills.forEach((f) => f.tiers.forEach((tt) => tierByUid.set(tt.uid, { f, tt })));
    const elements = ench.filter((e) => e.elements.length && (e.stats.atk || e.stats.def || e.stats.hp)).map((e) => ({ e, el: e.elements[0].id, val: e.elements[0].value, s: { atk: e.stats.atk * qm, def: e.stats.def * qm, hp: e.stats.hp * qm } }));
    const spirits = ench.filter((e) => e.skill).map((e) => ({ e, s: { atk: e.stats.atk * qm, def: e.stats.def * qm, hp: e.stats.hp * qm }, sk: tierByUid.get(e.skill.uid) }));
    PREP = { key, v: { items, elements, spirits, qm } };
    return PREP.v;
  }

  const parsePairs = (s) => String(s || '').split(';').map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && !isNaN(p[0]));
  const stepVal = (pairs, x) => pairs.reduce((a, [k, v]) => (x >= k ? v : a), 0);

  // ---------------------------------------------------------------- avaliação de um herói
  function evaluate(ctx, gear, chosen) {
    const { c, K, base, rankEl, aff, affAll, elBonus } = ctx;
    // 1) elemento do herói
    let E = rankEl;
    gear.forEach((g) => {
      if (!g || !g.el || (g.el.el !== c.element && g.el.el !== 'all')) return;
      const hasAff = g.x.it.elementAffinity.some((a) => a.id === g.el.el || a.id === 'all');
      E += g.el.val + (hasAff ? stepVal(elBonus, g.el.val) : 0);
    });
    // 2) habilidades ativas (maior tier liberado pelo elemento)
    const tierOf = (f) => { let best = null; for (const tt of f.tiers) if ((tt.req || 0) <= E && (!best || tt.tier > best.tier)) best = tt; return best; };
    const active = [];
    if (ctx.innate) { const tt = tierOf(ctx.innate); if (tt) active.push({ f: ctx.innate, tt }); }
    chosen.forEach((f) => { const tt = tierOf(f); if (tt) active.push({ f, tt }); });
    const seenSp = new Set();
    gear.forEach((g) => {
      if (!g || !g.sp || !g.sp.sk) return;
      if (ST.HM_SPIRIT_UNIQUE && seenSp.has(g.sp.sk.f.family)) return;
      seenSp.add(g.sp.sk.f.family);
      active.push({ f: g.sp.sk.f, tt: g.sp.sk.tt, spirit: true });
    });
    // 3) somatórios
    const pct = { atk: 0, def: 0, hp: 0, shieldHp: 0 }, abs = { atk: 0, def: 0, hp: 0 };
    let eva = c.evasion || 0, crit = c.critical || 0, cm = c.critMult || 2, aggro = c.aggro || 0;
    const itemPct = []; // [{types, v}]
    for (const { tt } of active) {
      const m = tt.mods || {};
      pct.atk += m.atk || 0; pct.def += m.def || 0; pct.hp += m.hp || 0; pct.shieldHp += m.shieldHp || 0;
      abs.atk += m.atkAbs || 0; abs.def += m.defAbs || 0; abs.hp += m.hpAbs || 0;
      eva += m.evasion || 0; crit += m.critical || 0; cm += m.critMult || 0; aggro += m.aggro || 0;
      pct.atk += (m.eleAtk || 0) * E; // ex.: Geomancia — +1% de ATQ por ponto de elemento
      if (m.item) itemPct.push({ types: tt.itemTypes || [], v: m.item, sec: !!tt.secStat });
    }
    const tot = { atk: base.atk + abs.atk, def: base.def + abs.def, hp: base.hp + abs.hp };
    gear.forEach((g) => {
      if (!g) return;
      const ty = g.x.it.type;
      const hit = (p) => !p.types.length || p.types.includes('*') || p.types.includes(ty);
      const ip = itemPct.reduce((a, p) => a + (hit(p) ? p.v : 0), 0);
      const sp = itemPct.reduce((a, p) => a + (hit(p) && p.sec ? p.v : 0), 0); // "affectSecStat": também evasão e crítico do item
      for (const k of ['atk', 'def', 'hp']) tot[k] += g.x.core[k] * (1 + ip);
      eva += g.x.core.eva * (1 + sp); crit += g.x.core.crit * (1 + sp);
      for (const en of [g.el, g.sp]) if (en) {
        const am = en === g.el
          ? (g.x.it.elementAffinity.some((a) => a.id === en.el) ? aff : g.x.it.elementAffinity.some((a) => a.id === 'all') ? 1 + (aff - 1) * affAll : 1)
          : (g.x.it.spiritAffinity.some((a) => a.id === en.e.uid) ? aff : 1);
        for (const k of ['atk', 'def', 'hp']) tot[k] += en.s[k] * am;
      }
    });
    const atk = tot.atk * (1 + pct.atk), def = tot.def * (1 + pct.def), hp = tot.hp * (1 + pct.hp);
    const shield = hp * pct.shieldHp;
    eva = Math.min(eva, K.quest_evasion_max || 0.75);
    const cr = Math.min(crit, 1);
    const power = atk * (K.adventurer_power_attack_mult || 0.8) * (1 + cr * (cm - 1)) + def * (K.adventurer_power_defense_mult || 1.2) +
      hp * (K.adventurer_power_hp_mult || 5) + shield * (K.adventurer_power_shieldhp_mult || 3) +
      aggro * (def * (K.adventurer_extra_power_defense_aggro_mult || 0.008) + hp * (K.adventurer_extra_power_hp_aggro_mult || 0.025)) +
      shield * eva * (K.adventurer_extra_power_shieldhp_eva_mult || 0.025);
    return { power, atk, def, hp, shield, eva, crit, cm, aggro, E, active };
  }

  // ---------------------------------------------------------------- otimização por classe
  function optimize(c, P, skills, K, o) {
    const lv = Math.min(o.lv, ST.maxLevel(c) === 100 ? 100 : Math.max(ST.maxLevel(c), 50));
    const base = { atk: ST.statAt(c.stats.atk, lv), def: ST.statAt(c.stats.def, lv), hp: ST.statAt(c.stats.hp, lv) };
    const rankPairs = parsePairs(K.hero_element_rank_and_value);
    const ctx = { c, K, base, rankEl: ST.HM_RANK_EL ? (rankPairs.length ? rankPairs[rankPairs.length - 1][1] : 0) : 0, aff: K.affinity_stat_bonus || 1.5,
      affAll: K.affinity_all_bonus_mult || 0.5, elBonus: parsePairs(K.affinity_element_bonus),
      innate: o.sk && c.innate ? skills.find((f) => f.family === c.innate.uid) : null };
    const nSlots = o.sk ? (c.skillSlots || []).filter((l) => l <= lv).length : 0;
    const allowed = (tt) => (tt.classes || []).some((x) => x === '*' || x === c.uid || x === c.type);
    const pool = o.sk ? skills.filter((f) => (f.kind === 'hero' || f.kind === 'mastery') && f.tiers.some(allowed)) : [];
    // candidatos por espaço: os melhores pelo valor bruto + o melhor de cada tipo (para bônus de tipo)
    const cands = c.slots.map((sl) => {
      const codes = sl.map((x) => x.code);
      const list = P.items.filter((x) => codes.includes(x.it.type)).sort((a, b) => b.raw - a.raw);
      const pick = new Set(list.slice(0, 10));
      codes.forEach((cd) => list.filter((x) => x.it.type === cd).slice(0, 3).forEach((x) => pick.add(x)));
      return [...pick];
    });
    const heroEls = o.en ? P.elements.filter((e) => e.el === c.element).sort((a, b) => b.val - a.val || (b.s.atk + b.s.def) - (a.s.atk + a.s.def)) : [];
    const anyEls = o.en ? P.elements.slice().sort((a, b) => (b.s.atk * 0.8 + b.s.def * 1.2 + b.s.hp * 5) - (a.s.atk * 0.8 + a.s.def * 1.2 + a.s.hp * 5)) : [];
    const spirits = o.en ? P.spirits : [];
    const elOptions = (x) => {
      if (!o.en) return [null];
      const opts = new Set(heroEls.slice(0, 2));
      const affs = x.it.elementAffinity.map((a) => a.id);
      const aff = anyEls.find((e) => affs.includes(e.el)); if (aff) opts.add(aff);
      if (anyEls[0]) opts.add(anyEls[0]);
      return [...opts];
    };
    // estado inicial
    let gear = cands.map((cs) => (cs[0] ? { x: cs[0], el: elOptions(cs[0])[0] || null, sp: null } : null));
    let chosen = [];
    const score = () => evaluate(ctx, gear, chosen).power;
    let bestAll = null;
    const snap = () => { const p = score(); if (!bestAll || p > bestAll.p) bestAll = { p, gear: gear.map((g) => g && { ...g }), chosen: chosen.slice() }; };
    for (let round = 0; round < 4; round++) {
      // espíritos e elementos por espaço
      if (o.en) gear.forEach((g, k) => {
        if (!g) return;
        let best = score(), keep = g.sp;
        for (const sp of spirits) { g.sp = sp; const s = score(); if (s > best) { best = s; keep = sp; } }
        g.sp = keep;
      });
      // habilidades: busca exaustiva entre as candidatas mais fortes (pega combinações como crítico + dano crítico)
      const prev = chosen;
      chosen = [];
      if (nSlots) {
        const solo = pool.map((f) => { chosen = [f]; return { f, s: score() }; }).sort((x, y) => y.s - x.s);
        const synergy = pool.filter((f) => f.tiers.some((tt) => tt.mods && (tt.mods.critical || tt.mods.critMult || tt.mods.eleAtk)));
        const cand = [...new Set([...prev, ...solo.slice(0, 10).map((x) => x.f), ...synergy])].slice(0, 18);
        const k = Math.min(nSlots, cand.length);
        let best = -1, bestSet = [];
        const pickSet = [];
        const rec = (start) => {
          if (pickSet.length === k) { chosen = pickSet.slice(); const sc = score(); if (sc > best) { best = sc; bestSet = pickSet.slice(); } return; }
          for (let i = start; i <= cand.length - (k - pickSet.length); i++) { pickSet.push(cand[i]); rec(i + 1); pickSet.pop(); }
        };
        rec(0);
        chosen = bestSet;
      }
      // equipamento por espaço
      let changed = false;
      gear.forEach((g, k) => {
        if (!g) return;
        let best = score(), keep = { x: g.x, el: g.el };
        for (const x of cands[k]) for (const el of elOptions(x)) {
          gear[k] = { x, el, sp: g.sp };
          const s = score();
          if (s > best + 1e-6) { best = s; keep = { x, el }; }
        }
        if (keep.x !== g.x || keep.el !== g.el) changed = true;
        gear[k] = { x: keep.x, el: keep.el, sp: g.sp };
      });
      snap();
      if (!changed && round > 0) break;
    }
    gear = bestAll.gear; chosen = bestAll.chosen;
    const r = evaluate(ctx, gear, chosen);
    return { c, lv, gear, chosen, ctx, ...r, heroOnly: evaluate(ctx, gear.map(() => null), []).power };
  }

  // ---------------------------------------------------------------- interface
  const elIcon = (el) => img('icon_global_element_' + el, 'hm-elic');
  const statBox = (k, v) => `<div class="hm-sb"><span>${k}</span><b>${v}</b></div>`;
  const statsGrid = (b) => `<div class="hm-sgrid">${statBox(t('hp').toUpperCase(), nf(Math.round(b.hp)))}${statBox(t('atk').toUpperCase(), nf(Math.round(b.atk)))}
    ${statBox(t('def').toUpperCase(), nf(Math.round(b.def)))}${statBox(tr('ESCUDO', 'M.SHIELD'), nf(Math.round(b.shield)))}
    ${statBox(tr('EVA', 'EVA'), Math.round(b.eva * 100) + '%')}${statBox(tr('CRÍT', 'CRIT'), Math.round(Math.min(b.crit, 1) * 100) + '%')}
    ${statBox(tr('DANO CRÍT', 'CRIT DMG'), '×' + dec(b.cm, 2))}${statBox(tr('AMEAÇA', 'THREAT'), nf(b.aggro))}</div>`;
  const skillRow = (b) => `<div class="hm-skills">${b.active.filter((a) => !a.spirit).map((a, k) =>
    `<span class="hm-sk ${k === 0 && b.c.innate && a.f.family === b.c.innate.uid ? 'inn' : ''}" title="${esc(a.tt.name || a.f.name)} · T${a.tt.tier || 1}: ${esc((a.tt.effects || []).join(', '))}">${img(a.f.icon)}<i>${a.tt.tier || ''}</i></span>`).join('')}</div>`;
  const mainStat = (x) => { const c = x.core; const m = Math.max(c.atk * 0.8, c.def * 1.2, c.hp * 5); return m === c.atk * 0.8 ? 'atk' : m === c.def * 1.2 ? 'def' : 'hp'; };
  const gearCell = (g, o) => (g ? `<span class="hm-it q${o.q}" title="${esc(g.x.it.name)}${g.el ? ' · ' + esc(g.el.e.name) : ''}${g.sp ? ' · ' + esc(g.sp.e.name) : ''}">
      <span class="hm-tier">${g.x.it.tier}</span>${o.tr ? '<span class="hm-stars">★★★</span>' : ''}
      <span class="hm-ms ${mainStat(g.x)}"></span>${img(g.x.it.uid, 'hm-itimg')}
      <span class="hm-encs">${g.el ? `<span class="hm-rune" title="${esc(g.el.e.name)}">${img(g.el.e.uid)}<em>${elIcon(g.el.el)}</em></span>` : ''}${g.sp ? `<span title="${esc(g.sp.e.name)}">${img(g.sp.e.uid)}</span>` : ''}</span></span>`
    : '<span class="hm-it empty"></span>');

  const controls = (o) => `<div class="form-row hm-ctl">
      <label class="field">${tr('Qualidade', 'Quality')}<select class="inp" data-o="q">${QN.map((n, k) => `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
      <label class="field">${t('level')}<select class="inp" data-o="lv">${LEVELS.map((l) => `<option value="${l}" ${o.lv === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-o="sk" ${o.sk ? 'checked' : ''}> ${tr('Habilidades', 'Skills')}</label>
      <label class="check"><input type="checkbox" data-o="en" ${o.en ? 'checked' : ''}> ${tr('Encantamentos', 'Enchantments')}</label>
      <label class="check"><input type="checkbox" data-o="sf" ${o.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
      <label class="check"><input type="checkbox" data-o="tr" ${o.tr ? 'checked' : ''}> ${tr('Ascensão + Transcendência', 'Ascension + Transcendence')}</label>
      <label class="check"><input type="checkbox" data-o="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label></div>`;
  const bindControls = (el, o, base) => el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => {
    o[n.dataset.o] = n.type === 'checkbox' ? n.checked : +n.value;
    location.hash = base + optQuery(o, { ty: o.ty });
  }));
  const NOTE = () => tr('Estimativa a partir dos dados do jogo, calibrada com o titansdb: atributos × qualidade (constantes item_power), Forjado nas Estrelas (atributos base +25%), Ascensão + Transcendência, encantamentos com afinidade, habilidade inata + habilidades dos espaços liberados pelo nível (tier liberado pelo elemento do herói, que soma os encantamentos do mesmo elemento), bônus de tipo de item (também em evasão/crítico quando o jogo indica), ATQ por ponto de elemento (Geomancia) e habilidades dos espíritos (espíritos iguais acumulam). Poder = ATQ×0,8×(1 + crítico×(dano crítico−1)) + DEF×1,2 + PV×5 + escudo×3 + ameaça×(DEF×0,008 + PV×0,025). Não entram: campeões, sementes, boosters e efeitos condicionais.',
    'Estimate from the game data, calibrated against titansdb: stats × quality (item_power constants), Starforged (base stats +25%), Ascension + Transcendence, enchantments with affinity, innate skill + skills for the slots unlocked by level (tier unlocked by hero element, the sum of same-element enchantments), item-type bonuses (also on evasion/crit when the game says so), ATK per element point (Geomancy) and spirit skills (identical spirits stack). Power = ATK×0.8×(1 + crit×(crit dmg−1)) + DEF×1.2 + HP×5 + shield×3 + threat×(DEF×0.008 + HP×0.025). Not included: champions, seeds, boosters and conditional effects.');

  function card(b, rank, o) {
    return `<a class="hm-card2" href="#/hypermax/${b.c.uid}${optQuery(o)}">
      <div class="hm-h"><div class="hm-cls">${img(b.c.icon)}</div><div class="hm-hn"><b>${esc(b.c.name)}</b>
        <span class="hm-pw2">${ST.ic('star')} ${nf(Math.round(b.power))}</span></div>
        <div class="hm-side"><span class="hm-rk">#${rank}</span><span class="hm-el">${nf(Math.round(b.E))} ${elIcon(b.c.element)}</span></div></div>
      ${skillRow(b)}${statsGrid(b)}
      <div class="hm-gear">${b.gear.map((g) => gearCell(g, o)).join('')}</div></a>`;
  }

  ST.hmDebug = { evaluate, optimize, prepare };

  ST.page('hypermax', {
    nav: 'hypermax', title: () => t('hypermax'),
    async render(el, [uid], query) {
      const [classes, skills, prog] = await ST.need('classes', 'skills', 'progression');
      const { d } = await ST.itemsIndex();
      const o = readOpts(query);
      const K = prog.constants || {};
      const P = prepare(d, skills, K, o);
      const list = uid ? classes.filter((c) => c.uid === uid) : classes.filter((c) => !o.ty || c.type === o.ty);
      if (uid && !list.length) { el.innerHTML = ST.notFound(); return; }
      // ranking geral precisa de todas as classes; cache por opções
      const ck = JSON.stringify([o.q, o.lv, o.tr, o.sf, o.en, o.sk, o.soon]);
      if (!ST._hmCache || ST._hmCache.k !== ck) {
        el.innerHTML = ST.skeleton();
        await new Promise((r) => setTimeout(r, 20));
        ST._hmCache = { k: ck, builds: classes.map((c) => optimize(c, P, skills, K, o)).sort((a, b) => b.power - a.power) };
      }
      const builds = ST._hmCache.builds;
      const rankOf = (b) => builds.indexOf(b) + 1;

      if (uid) {
        const b = builds.find((x) => x.c.uid === uid);
        const gearRows = b.gear.map((g, k) => (g ? `<tr><td><a class="cell-item" href="#/item/${g.x.it.uid}">${img(g.x.it.uid)}<span>${esc(g.x.it.name)}<br>
          <span class="small muted">T${g.x.it.tier} · ${esc(b.c.slots[k].map((x) => x.name).join(' / '))}</span></span></a></td>
          <td>${g.el ? `<a class="cell-item" href="#/item/${g.el.e.uid}"><span class="hm-rune lg">${img(g.el.e.uid)}<em>${elIcon(g.el.el)}</em></span><span>${esc(g.el.e.name)} <span class="small muted">+${g.el.val}</span></span></a>` : '—'}</td>
          <td>${g.sp ? `<a class="cell-item" href="#/item/${g.sp.e.uid}">${img(g.sp.e.uid)}<span>${esc(g.sp.e.name)}</span></a>` : '—'}</td></tr>` : '')).join('');
        const skillRows = b.active.map((a) => `<div class="row">${img(a.f.icon)}<div class="grow"><b>${esc(a.tt.name || a.f.name)}</b>
          <span class="muted small">${a.spirit ? tr('espírito', 'spirit') : a.f.kind === 'innate' ? tr('inata', 'innate') : a.f.kind === 'mastery' ? tr('maestria', 'mastery') : tr('herói', 'hero')}${a.tt.tier ? ' · T' + a.tt.tier : ''}${a.tt.req ? ` · ${nf(a.tt.req)} ${tr('de elemento', 'element')}` : ''}</span>
          <div class="small">${esc((a.tt.effects || []).join(' · '))}</div></div></div>`).join('');
        const builder = `#/montador?c=${b.c.uid}&lv=${Math.min(b.lv, ST.maxLevel(b.c))}&` + b.gear.map((g, k) => (g ? `s${k}=${g.x.it.uid}:${o.q}` : '')).filter(Boolean).join('&');
        el.innerHTML = `<a class="crumb" href="#/hypermax${optQuery(o)}">${ST.ic('left')} ${t('hypermax')}</a>
          ${controls(o)}
          <div class="hm-detail">${card(b, rankOf(b), o)}
            <div>${ST.sec(tr('Habilidades', 'Skills'), skillRows ? `<div class="list">${skillRows}</div>` : `<p class="muted">${t('none')}</p>`)}
              ${ST.sec(tr('Equipamento', 'Gear'), `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('items')}</th><th>${tr('Elemento', 'Element')}</th><th>${tr('Espírito', 'Spirit')}</th></tr></thead><tbody>${gearRows}</tbody></table></div>`)}
              ${ST.stats([ST.stat(tr('Herói sem nada', 'Bare hero'), nf(Math.round(b.heroOnly))), ST.stat(tr('Elemento do herói', 'Hero element'), `${nf(Math.round(b.E))} ${elIcon(b.c.element)}`), ST.stat(t('level'), b.lv)])}
              <div class="tags" style="margin-top:12px"><a class="chip" href="${builder}">${ST.ic('swords')} ${tr('Abrir no montador', 'Open in builder')}</a><a class="chip" href="#/classes/${b.c.uid}">${ST.ic('info')} ${esc(b.c.name)}</a></div></div></div>
          <p class="note">${NOTE()}</p>`;
        bindControls(el, o, '#/hypermax/' + b.c.uid);
        return;
      }
      const types = [...new Map(classes.map((c) => [c.type, c.typeName])).entries()];
      const shown = builds.filter((b) => !o.ty || b.c.type === o.ty);
      el.innerHTML = ST.pageHead(t('hypermax'), tr('O máximo teórico de cada classe: equipamento, encantamentos e habilidades que dão mais poder. Clique numa classe para ver os detalhes.',
        'The theoretical maximum for each class: the gear, enchantments and skills that give the most power. Click a class for details.')) +
        controls(o) +
        ST.tabs([['#/hypermax' + optQuery(o), t('all')], ...types.map(([k, n]) => ['#/hypermax' + optQuery(o, { ty: k }), esc(n)])], '#/hypermax' + optQuery(o, { ty: o.ty })) +
        `<div class="hm-grid">${shown.map((b) => card(b, rankOf(b), o)).join('')}</div><p class="note">${NOTE()}</p>`;
      bindControls(el, o, '#/hypermax');
    },
  });
})();
