/* Hypermax: o máximo teórico de cada classe — equipamento, encantamentos e habilidades que dão mais poder.
   Rotas: #/hypermax[/<classe>] e #/tumba-ranking[/<classe>] (mesmo motor, com as regras da Tumba dos Titãs);
   #/tumba traz os níveis, a maldição e os modificadores da Tumba.

   Modelo (somente dados e constantes do jogo):
   - item: atributos × qualidade (item_power_*_mult) após Ascensão + Transcendência; bônus "% de itens do tipo X" das habilidades
   - encantamento de elemento e de espírito; afinidade × affinity_stat_bonus ("Todos": metade do bônus)
   - elemento do herói = elemento próprio dos itens + elementos encantados do mesmo elemento (+ bônus de afinidade)
   - habilidades: inata + espaços liberados pelo nível; cada uma no maior tier cujo elemento exigido foi atingido;
     espíritos no equipamento somam suas habilidades (iguais acumulam)
   - poder = ATQ×0,8×(1 + crítico×(dano crítico − 1)) + DEF×1,2 + PV×5 + escudo×3 + ameaça×(DEF×0,008 + PV×0,025) + escudo×evasão×0,025 */
(() => {
  const { t, tr, esc, nf, img, short, dec } = ST;
  ST.addI18n({ pt: { hypermax: 'Hypermax', communityNav: 'Comunidade' }, en: { hypermax: 'Hypermax', communityNav: 'Community' } });
  const QN = [['Normal', 'Common'], ['Superior', 'Uncommon'], ['Magistral', 'Flawless'], ['Épico', 'Epic'], ['Lendário', 'Legendary']];
  // 100 = Parangon 50: herói promovido com a Alma Parangon que voltou ao nível 50 (libera o 5º espaço de habilidade)
  const LEVELS = [100, 50, 40, 35, 23];
  const lvName = (lv) => (lv > 50 ? `${tr('Parangon', 'Paragon')} ${lv - 50}` : String(lv));
  ST.hmLvName = lvName;
  // família da habilidade que ocupa o 5º espaço (só existe com a Alma Parangon), ou null
  // espíritos cujo efeito não acumula entre itens (família base, sem "_plus")
  const NO_STACK = new Set(['i_titan']);
  const fifthOf = (b) => ((b.c.skillSlots || []).length >= 5 && b.chosen.length >= 5 ? b.chosen[4].family : null);
  const PARAGON_TAG = () => `<span class="badge par">${ST.icon('paragonsoul') ? `<img src="${ST.icon('paragonsoul')}" alt="">` : ''}${tr('5º espaço · Alma Parangon', '5th slot · Paragon Soul')}</span>`;

  function readOpts(q) {
    return {
      q: Math.min(4, Math.max(0, +(q.get('q') ?? 4))),
      lv: +(q.get('lv') || 100),
      tr: q.get('tr') !== '0',
      sf: q.get('sf') !== '0', // projeto Forjado nas Estrelas (marcos extras, ex.: atributos base +25%)
      col: q.get('col') !== '0', // Livro de Coleção: cartas da classe aumentam ATQ/DEF/PV (melhor valor)
      en: q.get('en') !== '0',
      sk: q.get('sk') !== '0',
      soon: q.get('soon') === '1',
      ty: q.get('ty') || '',
    };
  }
  const optQuery = (o, extra = {}) => {
    const p = new URLSearchParams();
    if (o.q !== 4) p.set('q', o.q);
    if (o.lv !== 100) p.set('lv', o.lv);
    if (!o.tr) p.set('tr', '0');
    if (!o.sf) p.set('sf', '0');
    if (!o.col) p.set('col', '0');
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
    // perfil de "Minha conta": vem em o.profile (Worker/testes) ou do navegador
    const prof = o.profile !== undefined ? o.profile : (ST.account && ST.account.active() ? ST.account.get() : null);
    const acc = prof && prof.on ? JSON.stringify(prof) : '';
    const key = [o.q, o.tr, o.sf, o.en, o.soon, acc].join('|');
    if (PREP.key === key && PREP.d === d) return PREP.v; // d muda com o idioma
    const qm = [1, K.item_power_uncommon_mult || 1.25, K.item_power_flawless_mult || 1.5, K.item_power_epic_mult || 2, K.item_power_legd_mult || 3][o.q];
    const ok = (i) => (o.soon || !ST.isUnreleased(i)) && (!acc || ST.profileHas(prof, i));
    const nameToCode = {};
    Object.entries(d.types || {}).forEach(([code, ty]) => { if (ty && ty.name && !nameToCode[ty.name]) nameToCode[ty.name] = code; });
    // itens equipáveis com atributos já com qualidade e melhorias
    // tudo que cabe num espaço de herói (inclui feitiços, ervas e sobremesas), exceto encantamentos e materiais
    const items = d.items.filter((i) => !['z', 'm', 'ma'].includes(i.type) && ok(i)).map((it) => {
      const steps = [...(o.sf ? it.starforged || [] : []), ...(o.tr ? [...(it.ascension || []), ...(it.transcendence || [])] : [])];
      const s = steps.length ? ST.applySteps(it, steps).stats : it.stats;
      const core = { atk: s.atk * qm, def: s.def * qm, hp: s.hp * qm, eva: s.eva || 0, crit: s.crit || 0 };
      const codes = [it.type, ...(it.multiType || []).map((n) => nameToCode[n]).filter(Boolean)];
      return { it, core, codes, raw: core.atk * 0.8 + core.def * 1.2 + core.hp * 5 };
    }).filter((x) => x.raw > 0);
    const ench = d.items.filter((i) => i.type === 'z' && ok(i));
    // habilidades por uid de tier (para espíritos) e famílias
    const tierByUid = new Map();
    skills.forEach((f) => f.tiers.forEach((tt) => tierByUid.set(tt.uid, { f, tt })));
    const elements = ench.filter((e) => e.elements.length && (e.stats.atk || e.stats.def || e.stats.hp)).map((e) => ({ e, el: e.elements[0].id, val: e.elements[0].value, s: { atk: e.stats.atk * qm, def: e.stats.def * qm, hp: e.stats.hp * qm } }));
    const spirits = ench.filter((e) => e.skill).map((e) => ({ e, s: { atk: e.stats.atk * qm, def: e.stats.def * qm, hp: e.stats.hp * qm }, sk: tierByUid.get(e.skill.uid) }));
    PREP = { key, d, v: { items, elements, spirits, qm } };
    return PREP.v;
  }

  const parsePairs = (s) => String(s || '').split(';').map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && !isNaN(p[0]));
  const stepVal = (pairs, x) => pairs.reduce((a, [k, v]) => (x >= k ? v : a), 0);

  /* Poder do herói (constantes adventurer_power_*): conferido com o perfil do herói no jogo (0,01%). */
  function powerOf(s, K) {
    const cr = Math.min(s.crit || 0, 1);
    return s.atk * (K.adventurer_power_attack_mult || 0.8) * (1 + cr * ((s.cm || 1) - 1)) + s.def * (K.adventurer_power_defense_mult || 1.2) +
      s.hp * (K.adventurer_power_hp_mult || 5) + (s.shield || 0) * (K.adventurer_power_shieldhp_mult || 3) +
      (s.aggro || 0) * (s.def * (K.adventurer_extra_power_defense_aggro_mult || 0.008) + s.hp * (K.adventurer_extra_power_hp_aggro_mult || 0.025)) +
      (s.shield || 0) * (s.eva || 0) * (K.adventurer_extra_power_shieldhp_eva_mult || 0.025);
  }

  // ---------------------------------------------------------------- avaliação de um herói
  function evaluate(ctx, gear, chosen, trace) {
    const { c, K, base, rankEl, aff, affAll, elBonus } = ctx;
    // 1) elemento do herói
    let E = rankEl;
    // elemento total (runas de qualquer elemento + elemento próprio dos itens), usado pelo ATQ por elemento
    let Eall = rankEl;
    gear.forEach((g) => { if (!g) return; (g.x.it.elements || []).forEach((x) => (Eall += x.value || 0)); if (g.el) Eall += g.el.val; });
    gear.forEach((g) => { // elemento próprio do item (ex.: armas com "Fogo +35") também conta
      if (g) (g.x.it.elements || []).forEach((x) => { if (x.id === c.element || x.id === 'all') E += x.value || 0; });
    });
    gear.forEach((g) => {
      if (!g || !g.el || (g.el.el !== c.element && g.el.el !== 'all')) return;
      const hasAff = g.x.it.elementAffinity.some((a) => a.id === g.el.el || a.id === 'all');
      // bônus de afinidade de elemento (affinity_element_bonus "0,5;25,10"): +5 abaixo do limite 25 (conferido no jogo: 5 runas de 35 + 1 afinidade = 180)
      E += g.el.val + (hasAff ? stepVal(elBonus, g.x.it.tier || 0) : 0);
    });
    // 2) habilidades ativas (maior tier liberado pelo elemento)
    const tierOf = (f) => { let best = null; for (const tt of f.tiers) if ((tt.req || 0) <= E && (!best || tt.tier > best.tier)) best = tt; return best; };
    const active = [];
    if (ctx.innate) { const tt = tierOf(ctx.innate); if (tt) active.push({ f: ctx.innate, tt }); }
    chosen.forEach((f) => { const tt = tierOf(f); if (tt) active.push({ f, tt }); });
    // espíritos: efeito "só no próprio item" (affectItselfOnly) vai para o item; os demais valem uma vez por espírito
    const seenSp = new Set(), selfPct = gear.map(() => 0);
    // espíritos que NÃO acumulam (conferido no jogo: o Espírito de Titã vale uma vez só, com ou sem o "+"):
    // vale só o melhor do grupo; os outros itens com ele ficam sem efeito
    const groupOf = (fam) => { const base = fam.replace(/_plus$/, ''); return NO_STACK.has(base) ? base : null; };
    const keepIdx = new Map();
    gear.forEach((g, idx) => {
      if (!g || !g.sp || !g.sp.sk) return;
      const grp = groupOf(g.sp.sk.f.family); if (!grp) return;
      const plus = /_plus$/.test(g.sp.sk.f.family), cur = keepIdx.get(grp);
      if (cur == null || (plus && !/_plus$/.test(gear[cur].sp.sk.f.family))) keepIdx.set(grp, idx);
    });
    gear.forEach((g, idx) => {
      if (!g || !g.sp || !g.sp.sk) return;
      const tt = g.sp.sk.tt, qm = tt.quest && ctx.tower ? ctx.questMult : 1; // efeito dobrado na Torre/Tumba
      // habilidade restrita a uma missão (ex.: Malevolência Nascida da Tumba) não entra no poder geral do herói
      if (tt.quest && !ctx.tower) { active.push({ f: g.sp.sk.f, tt, spirit: true, off: true }); return; }
      if (tt.self) { selfPct[idx] += ((tt.mods || {}).item || 0) * qm; active.push({ f: g.sp.sk.f, tt, spirit: true, self: true }); return; }
      const grp = groupOf(g.sp.sk.f.family);
      if (grp && keepIdx.get(grp) !== idx) { active.push({ f: g.sp.sk.f, tt, spirit: true, off: true, dup: true }); return; }
      // espíritos iguais acumulam: cada item com o espírito soma a habilidade dele (confirmado no jogo: 6× Leviatã = +18% de crítico)
      seenSp.add(g.sp.sk.f.family);
      active.push({ f: g.sp.sk.f, tt, spirit: true, qm });
    });
    // 3) somatórios
    const pct = { atk: 0, def: 0, hp: 0, shieldHp: 0 }, abs = { atk: 0, def: 0, hp: 0 };
    let eva = c.evasion || 0, crit = c.critical || 0, cm = c.critMult || 2, aggro = c.aggro || 0;
    const itemPct = []; // [{types, v}]
    for (const a of active) {
      if (a.self || a.off) continue;
      const tt = a.tt, q = a.qm || (tt.quest && ctx.tower ? ctx.questMult : 1);
      const m = q === 1 ? (tt.mods || {}) : Object.fromEntries(Object.entries(tt.mods || {}).map(([k, v]) => [k, v * q]));
      pct.atk += m.atk || 0; pct.def += m.def || 0; pct.hp += m.hp || 0; pct.shieldHp += m.shieldHp || 0;
      abs.atk += m.atkAbs || 0; abs.def += m.defAbs || 0; abs.hp += m.hpAbs || 0;
      eva += m.evasion || 0; crit += m.critical || 0; cm += m.critMult || 0; aggro += m.aggro || 0;
      // Geomancia: +1% de ATQ por ponto de elemento de QUALQUER tipo (runas + elemento próprio dos itens).
      // Conferido com o placar: assim o melhor build calculado é o mesmo dos primeiros colocados (runa de afinidade na arma).
      pct.atk += (m.eleAtk || 0) * (ST.HM_ELEALL === false ? E : Eall);
      if (m.item) itemPct.push({ types: tt.itemTypes || [], v: m.item, sec: !!tt.secStat });
    }
    const tot = { atk: base.atk + abs.atk, def: base.def + abs.def, hp: base.hp + abs.hp };
    const crit0 = crit, items = [];
    gear.forEach((g, idx) => {
      if (!g) return;
      const ty = g.x.it.type;
      const hit = (p) => !p.types.length || p.types.includes('*') || p.types.includes(ty);
      const ip = itemPct.reduce((a, p) => a + (hit(p) ? p.v : 0), 0) + selfPct[idx];
      const sp = itemPct.reduce((a, p) => a + (hit(p) && p.sec ? p.v : 0), 0) + selfPct[idx]; // "affectSecStat": também evasão e crítico do item
      for (const k of ['atk', 'def', 'hp']) tot[k] += g.x.core[k] * (1 + ip);
      eva += g.x.core.eva * (1 + sp); crit += g.x.core.crit * (1 + sp);
      const row = trace ? { g, ip, item: {}, ench: [] } : null;
      if (row) for (const k of ['atk', 'def', 'hp']) row.item[k] = g.x.core[k] * (1 + ip);
      for (const en of [g.el, g.sp]) if (en) {
        const am = en === g.el
          ? (g.x.it.elementAffinity.some((a) => a.id === en.el) ? aff : g.x.it.elementAffinity.some((a) => a.id === 'all') ? 1 + (aff - 1) * affAll : 1)
          : (g.x.it.spiritAffinity.some((a) => a.id === en.e.uid) ? aff : 1);
        for (const k of ['atk', 'def', 'hp']) tot[k] += en.s[k] * am;
        if (row) row.ench.push({ en, am, atk: en.s.atk * am, def: en.s.def * am, hp: en.s.hp * am });
      }
      if (row) items.push(row);
    });
    const cb = ctx.colMult || 1; // Livro de Coleção (HeroStatsIncrease)
    const atk = tot.atk * (1 + pct.atk) * cb, def = tot.def * (1 + pct.def) * cb, hp = tot.hp * (1 + pct.hp) * cb;
    const shield = hp * pct.shieldHp;
    eva = Math.min(eva, K.quest_evasion_max || 0.75);
    // Tumba: modificadores dos monstros reduzem o crítico (Pele Adamantina −70%, etc.); "sem crítico" zera
    if (ctx.noCrit) crit = 0; else crit = Math.max(0, crit + (ctx.critAdj || 0));
    cm = Math.max(1, cm + (ctx.critMultAdj || 0));
    const cr = Math.min(crit, 1);
    const power = powerOf({ atk, def, hp, shield, eva, crit: cr, cm, aggro }, K);
    if (trace) Object.assign(trace, { base, abs, items, pct: { ...pct }, cb, tot: { ...tot }, crit0, critItems: crit - crit0,
      critClass: c.critical || 0, cmClass: c.critMult || 2 });
    return { power, atk, def, hp, shield, eva, crit, cm, aggro, E, active };
  }

  /* Tabela "Cálculo dos atributos" da página da classe */
  function calcSection(b, o, P) {
    const T0 = {};
    evaluate(b.ctx, b.gear, b.chosen, T0);
    const n0 = (v) => nf(Math.round(v));
    const three = (x) => `<span class="s-atk">${n0(x.atk)}</span> / <span class="s-def">${n0(x.def)}</span> / <span class="s-hp">${n0(x.hp)}</span>`;
    const add = (a, x) => ({ atk: a.atk + x.atk, def: a.def + x.def, hp: a.hp + x.hp });
    const Z = { atk: 0, def: 0, hp: 0 };
    const STAT_KEYS = ['atk', 'def', 'hp', 'baseStats', 'eva', 'crit'];
    const stage = (base0, prev, steps, on) => { // acumula as etapas a partir da base (arredonda só no fim, como o motor)
      // aplica uma etapa de melhorias e mostra o resultado + o que foi aplicado (ou por que não muda atributos)
      const calc = (list) => ST.applySteps({ stats: base0, resources: [], components: [], value: 0, time: 0 }, list).stats;
      if (!on) return { list: prev, stats: calc(prev), html: `<span class="muted">${tr('desligado', 'off')}</span>` };
      if (!steps.length) { const st0 = calc(prev); return { list: prev, stats: st0, html: `${three(st0)}<div class="small muted">${tr('sem etapas', 'no steps')}</div>` }; }
      const list = [...prev, ...steps];
      const next = calc(list);
      const statSteps = steps.filter((u) => STAT_KEYS.includes(u.key));
      const note = statSteps.length ? statSteps.map((u) => esc(u.text)).join(' · ')
        : `${tr('não muda atributos', 'no stat change')}: ${steps.map((u) => esc(u.text)).join(' · ')}`;
      return { list, stats: next, html: `${three(next)}<div class="small muted">${note}</div>` };
    };
    const rows = T0.items.map((r) => {
      const it = r.g.x.it;
      const s0 = { ...it.stats };
      const sf = stage(s0, [], it.starforged || [], o.sf);
      const asc = stage(s0, sf.list, it.ascension || [], o.tr);
      const trs = stage(s0, asc.list, it.transcendence || [], o.tr);
      const qmul = r.g.qm || P.qm;
      const q = { atk: trs.stats.atk * qmul, def: trs.stats.def * qmul, hp: trs.stats.hp * qmul };
      const enc = r.ench.reduce(add, Z);
      return `<tr><td><a class="cell-item" href="#/item/${it.uid}">${img(it.uid)}<span>${esc(it.name)}<br><span class="small muted">T${it.tier}</span></span></a></td>
        <td class="num">${three(s0)}</td>
        <td class="num">${sf.html}</td>
        <td class="num">${asc.html}</td>
        <td class="num">${trs.html}</td>
        <td class="num">${three(q)}<div class="small muted">×${dec(r.g.qm || P.qm, 2)}</div></td>
        <td class="num">${r.ip ? '+' + dec(r.ip * 100, 0) + '%' : '—'}</td>
        <td class="num"><b>${three(r.item)}</b></td>
        <td class="num">${three(enc)}<div class="small muted">${r.ench.map((e) => `${esc(e.en.e.name)}${e.am > 1 ? ' ×' + dec(e.am, 2) : ''}`).join(' · ')}</div></td></tr>`;
    }).join('');
    const sumItems = T0.items.reduce((a, r) => add(a, r.item), Z);
    const sumEnch = T0.items.reduce((a, r) => r.ench.reduce(add, a), Z);
    const row = (label, val, strong) => `<div class="row"><div class="grow">${strong ? `<b>${label}</b>` : label}</div><div class="r">${strong ? `<b>${val}</b>` : val}</div></div>`;
    const pctTxt = `× <span class="s-atk">${dec(1 + T0.pct.atk, 2)}</span> / <span class="s-def">${dec(1 + T0.pct.def, 2)}</span> / <span class="s-hp">${dec(1 + T0.pct.hp, 2)}</span>`;
    const critTxt = `${dec(T0.critClass * 100, 1)}% ${tr('classe', 'class')} + ${dec((T0.crit0 - T0.critClass) * 100, 1)}% ${tr('habilidades', 'skills')} + ${dec(T0.critItems * 100, 1)}% ${tr('itens', 'items')}`
      + (o.tower && o.noCrit ? ` → 0 (${tr('Tumba', 'Tomb')})` : '') + ` = <b>${dec(Math.min(b.crit, 1) * 100, 1)}%</b>`;
    return `<div class="table-wrap"><table class="data-table hm-calc"><thead><tr><th>${t('items')}</th><th class="num">${tr('Base do jogo', 'Game base')} ATQ/DEF/PV</th>
        <th class="num">${tr('+ Forjado nas Estrelas', '+ Starforged')}</th><th class="num">${tr('+ Ascensão (1–3)', '+ Ascension (1–3)')}</th><th class="num">${tr('+ Transcendência (4–6)', '+ Transcendence (4–6)')}</th>
        <th class="num">${tr('× Qualidade', '× Quality')}</th><th class="num">${tr('Bônus de tipo', 'Type bonus')}</th>
        <th class="num">${tr('Item final', 'Final item')}</th><th class="num">${tr('Encantamentos', 'Enchantments')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="list hm-sum">
        ${row(`${tr('Herói', 'Hero')} (${t('level')} ${lvName(b.lv)})`, three(T0.base))}
        ${T0.abs.atk || T0.abs.def || T0.abs.hp ? row(tr('Valores fixos das habilidades', 'Flat skill values'), '+ ' + three(T0.abs)) : ''}
        ${row(tr('Itens', 'Items'), '+ ' + three(sumItems))}
        ${row(tr('Encantamentos', 'Enchantments'), '+ ' + three(sumEnch))}
        ${row(tr('Soma', 'Sum'), '= ' + three(T0.tot), true)}
        ${row(tr('Habilidades (%)', 'Skills (%)'), pctTxt)}
        ${row(tr('Livro de Coleção', 'Collection book'), '× ' + dec(T0.cb, 2))}
        ${row(tr('Atributos finais', 'Final stats'), three(b), true)}
        ${row(tr('Crítico', 'Crit'), critTxt)}
        ${row(tr('Dano crítico', 'Crit damage'), `×${dec(T0.cmClass, 2)} ${tr('classe', 'class')} + ${dec(b.cm - T0.cmClass, 2)} ${tr('habilidades', 'skills')} = <b>×${dec(b.cm, 2)}</b>`)}
        ${row(tr('Elemento do herói', 'Hero element'), `<b>${n0(b.E)}</b> ${elIcon(b.c.element)}`)}
        ${row(tr('Poder', 'Power'), n0(b.power), true)}</div>`;
  }

  // ---------------------------------------------------------------- otimização por classe
  function makeCtx(c, skills, K, o) {
    const lv = Math.min(o.lv, ST.maxLevel(c) === 100 ? 100 : Math.max(ST.maxLevel(c), 50));
    const base = { atk: ST.statAt(c.stats.atk, lv), def: ST.statAt(c.stats.def, lv), hp: ST.statAt(c.stats.hp, lv) };
    const rankPairs = parsePairs(K.hero_element_rank_and_value);
    return { lv, ctx: { c, K, base, rankEl: ST.HM_RANK_EL ? (rankPairs.length ? rankPairs[rankPairs.length - 1][1] : 0) : 0, aff: K.affinity_stat_bonus || 1.5,
      affAll: K.affinity_all_bonus_mult || 0.5, elBonus: parsePairs(K.affinity_element_bonus),
      innate: o.sk && c.innate ? skills.find((f) => f.family === c.innate.uid) : null,
      colMult: o.col && c.cardBonus && c.cardBonus.length ? Math.max(...c.cardBonus) : 1,
      tower: !!o.tower, questMult: o.questMult || 2, noCrit: !!o.noCrit, critAdj: o.critAdj || 0, critMultAdj: o.critMultAdj || 0 } };
  }

  /* Resultado final de uma classe a partir das escolhas (itens, runas, espíritos e habilidades). */
  function finish(c, lv, ctx, gear, chosen) {
    const r = evaluate(ctx, gear, chosen);
    const prof = evaluate({ ...ctx, colMult: 1 }, gear, chosen); // o perfil do herói no jogo não aplica o Livro de Coleção
    return { c, lv, gear, chosen, ctx, ...r, profile: { power: prof.power, atk: prof.atk, def: prof.def, hp: prof.hp },
      heroOnly: evaluate(ctx, gear.map(() => null), []).power };
  }

  /* Reconstrói um resultado do Worker (só ids) com os objetos desta página. */
  function rebuild(c, P, skills, K, o, choice) {
    const { lv, ctx } = makeCtx(c, skills, K, o);
    const X = new Map(P.items.map((x) => [x.it.uid, x])), EL = new Map(P.elements.map((e) => [e.e.uid, e])), SP = new Map(P.spirits.map((s) => [s.e.uid, s]));
    const gear = choice.gear.map((g) => (g && X.get(g.x) ? { x: X.get(g.x), el: EL.get(g.el) || null, sp: SP.get(g.sp) || null, elTies: (g.ties || []).map((u) => EL.get(u)).filter(Boolean) } : null));
    const chosen = choice.chosen.map((f) => skills.find((s) => s.family === f)).filter(Boolean);
    return finish(c, lv, ctx, gear, chosen);
  }
  /* Só os ids de um resultado (o que o Worker devolve). */
  const toChoice = (b) => ({ c: b.c.uid, gear: b.gear.map((g) => (g ? { x: g.x.it.uid, el: g.el && g.el.e.uid, sp: g.sp && g.sp.e.uid, ties: (g.elTies || []).map((e) => e.e.uid) } : null)), chosen: b.chosen.map((f) => f.family) });

  function optimize(c, P, skills, K, o) {
    const { lv, ctx } = makeCtx(c, skills, K, o);
    const nSlots = o.sk ? (c.skillSlots || []).filter((l) => l <= lv).length : 0;
    const allowed = (tt) => (tt.classes || []).some((x) => x === '*' || x === c.uid || x === c.type);
    const pool = o.sk ? skills.filter((f) => (f.kind === 'hero' || f.kind === 'mastery') && f.tiers.some(allowed)) : [];
    // candidatos por espaço: TODOS os itens permitidos (inclusive "conta como"); crítico, evasão e afinidade
    // podem valer mais que atributos brutos, então não há corte prévio
    const cands = c.slots.map((sl) => {
      const codes = sl.map((x) => x.code);
      return P.items.filter((x) => x.codes.some((cd) => codes.includes(cd))).sort((a, b) => b.raw - a.raw);
    });
    const heroEls = o.en ? P.elements.filter((e) => e.el === c.element).sort((a, b) => b.val - a.val || (b.s.atk + b.s.def) - (a.s.atk + a.s.def)) : [];
    const anyEls = o.en ? P.elements.slice().sort((a, b) => (b.s.atk * 0.8 + b.s.def * 1.2 + b.s.hp * 5) - (a.s.atk * 0.8 + a.s.def * 1.2 + a.s.hp * 5)) : [];
    const spirits = o.en ? P.spirits : [];
    const elOptions = (x) => {
      if (!o.en) return [null];
      const opts = new Set(heroEls.slice(0, 2));
      // elemento do item (afinidade): testa as melhores runas de CADA elemento de afinidade (por atributos e por valor de elemento)
      const affs = x.it.elementAffinity.map((a) => a.id);
      for (const id of affs) {
        const list = id === 'all' ? anyEls : anyEls.filter((e) => e.el === id);
        list.slice(0, 2).forEach((e) => opts.add(e));
        const topVal = list.reduce((m, e) => (!m || e.val > m.val ? e : m), null);
        if (topVal) opts.add(topVal);
      }
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
    // polimento: testa cada espaço com todos os itens/elementos, depois espíritos e habilidades, até nada melhorar
    for (let pass = 0; pass < 5; pass++) {
      let improved = false;
      gear.forEach((g, k) => {
        if (!g) return;
        let best = score(), keep = null;
        for (const x of cands[k]) for (const el of elOptions(x)) {
          gear[k] = { x, el, sp: g.sp };
          const sc = score();
          if (sc > best + 1e-6) { best = sc; keep = { x, el, sp: g.sp }; }
        }
        gear[k] = keep || g;
        if (keep) improved = true;
        if (o.en) {
          const cur = gear[k];
          let bs = score(), ks = cur.sp;
          for (const sp of spirits) { cur.sp = sp; const sc = score(); if (sc > bs + 1e-6) { bs = sc; ks = sp; improved = true; } }
          cur.sp = ks;
        }
      });
      if (nSlots) { // troca uma habilidade por vez
        for (let i = 0; i < chosen.length; i++) {
          let best = score(), keep = chosen[i];
          for (const f of pool) {
            if (chosen.includes(f)) continue;
            const old = chosen[i]; chosen[i] = f;
            const sc = score();
            if (sc > best + 1e-6) { best = sc; keep = f; improved = true; }
            chosen[i] = old;
          }
          chosen[i] = keep;
        }
      }
      if (!improved) break;
    }
    // empates exatos de runa (ex.: Aperture Catalyst tem afinidade com luz e escuridão; Apoteose e Oblívio têm os mesmos atributos):
    // guarda as alternativas e usa a ordem preferida pelos primeiros do placar (escuridão antes de luz)
    if (o.en) {
      const PREF = ['dark', 'light', 'water', 'fire', 'air', 'earth', 'gold', 'all'];
      gear.forEach((g, k) => {
        if (!g || !g.el) return;
        const cur = score();
        const ties = P.elements.filter((e) => e.val === g.el.val && e.e.tier === g.el.e.tier && e !== g.el).filter((e) => {
          gear[k] = { ...g, el: e }; const sc = score(); gear[k] = g; return Math.abs(sc - cur) < 1e-6;
        });
        if (!ties.length) return;
        const all = [g.el, ...ties].sort((a, b) => PREF.indexOf(a.el) - PREF.indexOf(b.el));
        gear[k] = { ...g, el: all[0], elTies: all.slice(1) };
      });
    }
    return finish(c, lv, ctx, gear, chosen);
  }

  // ---------------------------------------------------------------- interface
  const elIcon = (el) => img('icon_global_element_' + el, 'hm-elic');
  const statBox = (k, v) => `<div class="hm-sb"><span>${k}</span><b>${v}</b></div>`;
  const statsGrid = (b) => `<div class="hm-sgrid">${statBox(t('hp').toUpperCase(), nf(Math.round(b.hp)))}${statBox(t('atk').toUpperCase(), nf(Math.round(b.atk)))}
    ${statBox(t('def').toUpperCase(), nf(Math.round(b.def)))}${statBox(tr('ESCUDO', 'SHIELD'), nf(Math.round(b.shield)))}
    ${statBox(tr('EVA', 'EVA'), Math.round(b.eva * 100) + '%')}${statBox(tr('CRÍT', 'CRIT'), Math.round(Math.min(b.crit, 1) * 100) + '%')}
    ${statBox(tr('DANO CRÍT', 'CRIT DMG'), '×' + dec(b.cm, 2))}${statBox(tr('AMEAÇA', 'THREAT'), nf(b.aggro))}</div>`;
  const skillRow = (b) => { const fifth = fifthOf(b); return `<div class="hm-skills">${b.active.filter((a) => !a.spirit).map((a, k) => {
    const par = fifth && a.f.family === fifth;
    return `<span class="hm-sk ${k === 0 && b.c.innate && a.f.family === b.c.innate.uid ? 'inn' : ''} ${par ? 'par' : ''}" title="${esc(a.tt.name || a.f.name)} · T${a.tt.tier || 1}: ${esc((a.tt.effects || []).join(', '))}${par ? ' · ' + esc(tr('5º espaço · Alma Parangon', '5th slot · Paragon Soul')) : ''}">${img(a.f.icon)}<i>${a.tt.tier || ''}</i>${par && ST.icon('paragonsoul') ? `<em class="hm-par"><img src="${ST.icon('paragonsoul')}" alt=""></em>` : ''}</span>`; }).join('')}</div>`; };
  const mainStat = (x) => { const c = x.core; const m = Math.max(c.atk * 0.8, c.def * 1.2, c.hp * 5); return m === c.atk * 0.8 ? 'atk' : m === c.def * 1.2 ? 'def' : 'hp'; };
  const gearCell = (g, o) => (g ? `<span class="hm-it q${g.q ?? o.q}" title="${esc(g.x.it.name)}${g.el ? ' · ' + esc(g.el.e.name) : ''}${g.sp ? ' · ' + esc(g.sp.e.name) : ''}">
      <span class="hm-tier">${g.x.it.tier}</span>${o.tr ? '<span class="hm-stars">★★★</span>' : ''}
      <span class="hm-ms ${mainStat(g.x)}"></span>${img(g.x.it.uid, 'hm-itimg')}
      <span class="hm-encs">${g.el ? `<span class="hm-rune" title="${esc(g.el.e.name)}">${img(g.el.e.uid)}<em>${elIcon(g.el.el)}</em></span>` : ''}${g.sp ? `<span title="${esc(g.sp.e.name)}">${img(g.sp.e.uid)}</span>` : ''}</span></span>`
    : '<span class="hm-it empty"></span>');

  // regras de crítico na Tumba (modificadores de monstro dos dados do jogo)
  const CRIT_RULES = {
    off: { pt: 'Sem crítico (a Tumba anula)', en: 'No crit (the Tomb negates it)', noCrit: true },
    adam: { pt: 'Pele Adamantina (−70% crítico)', en: 'Adamantine Skin (−70% crit)', critAdj: -0.7 },
    noweak: { pt: 'Sem Fraquezas (−30% crítico)', en: 'No Weakness (−30% crit)', critAdj: -0.3 },
    fort: { pt: 'Fortificado (−20% crítico)', en: 'Fortified (−20% crit)', critAdj: -0.2 },
    heavy: { pt: 'Armado e Protegido (−0,5 dano crítico)', en: 'Heavy Armored (−0.5 crit dmg)', critMultAdj: -0.5 },
    none: { pt: 'Sem modificador', en: 'No modifier' },
  };
  const withMode = (o, mode) => {
    o.route = mode === 'tomb' ? 'tumba-ranking' : 'hypermax';
    if (mode === 'tomb') {
      const r = CRIT_RULES[o.cr] || CRIT_RULES.off;
      Object.assign(o, { tower: true, noCrit: !!r.noCrit, critAdj: r.critAdj || 0, critMultAdj: r.critMultAdj || 0 });
    }
    return o;
  };

  // aviso no topo do Hypermax e dos Heróis da Tumba: os cálculos ainda estão sendo conferidos com o jogo
  const BETA = () => `<div class="beta-note" role="note"><span class="beta-ic" title="${tr('Em testes', 'In testing')}" aria-label="${tr('Em testes', 'In testing')}">${ST.ic('alert')}</span>
    <p>${tr('Estes cálculos ainda estão sendo conferidos com o jogo e podem ter erros: poder, atributos ou a escolha dos itens podem não bater com o que aparece no jogo. Use como referência e confira no jogo antes de gastar recursos.',
      'These calculations are still being checked against the game and may contain errors: power, stats or gear picks can differ from what you see in the game. Use them as a reference and check in the game before spending resources.')}</p></div>`;

  const controls = (o) => `<div class="form-row hm-ctl">
      ${o.tower ? `<label class="field">${tr('Regra de crítico', 'Crit rule')}<select class="inp" data-o="cr" data-str>${Object.entries(CRIT_RULES).map(([k, r]) =>
        `<option value="${k}" ${k === (o.cr || 'off') ? 'selected' : ''}>${tr(r.pt, r.en)}</option>`).join('')}</select></label>` : ''}
      <label class="field">${tr('Qualidade', 'Quality')}<select class="inp" data-o="q">${QN.map((n, k) => `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
      <div class="field">${tr('Alma Parangon', 'Paragon Soul')}<div class="seg hm-par-seg" role="group" title="${tr('Com a Alma Parangon o herói chega ao Parangon 50 e ganha a 5ª habilidade.', 'With the Paragon Soul the hero reaches Paragon 50 and gains the 5th skill.')}">
        <button type="button" data-par="1" class="${o.lv > 50 ? 'on' : ''}" aria-pressed="${o.lv > 50}">${ST.icon('paragonsoul') ? `<img class="cur-img" src="${ST.icon('paragonsoul')}" alt="">` : ''}${tr('Com Parangon', 'With Paragon')}</button>
        <button type="button" data-par="0" class="${o.lv > 50 ? '' : 'on'}" aria-pressed="${o.lv <= 50}">${tr('Sem Parangon', 'Without Paragon')}</button></div></div>
      <label class="field">${t('level')}<select class="inp" data-o="lv" ${o.lv > 50 ? 'disabled' : ''}>${o.lv > 50 ? `<option selected>${lvName(o.lv)}</option>` : LEVELS.filter((l) => l <= 50).map((l) => `<option value="${l}" ${o.lv === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-o="sk" ${o.sk ? 'checked' : ''}> ${tr('Habilidades', 'Skills')}</label>
      <label class="check"><input type="checkbox" data-o="en" ${o.en ? 'checked' : ''}> ${tr('Encantamentos', 'Enchantments')}</label>
      <label class="check"><input type="checkbox" data-o="sf" ${o.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
      <label class="check"><input type="checkbox" data-o="tr" ${o.tr ? 'checked' : ''}> ${tr('Ascensão + Transcendência', 'Ascension + Transcendence')}</label>
      <label class="check"><input type="checkbox" data-o="col" ${o.col ? 'checked' : ''}> ${tr('Livro de Coleção completo', 'Full Collection book')}</label>
      <label class="check"><input type="checkbox" data-o="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label>
      ${ST.accountToggle ? ST.accountToggle(ST.account.active()) : ''}</div>`;
  const bindControls = (el, o, base) => {
    const go = () => { location.hash = base + optQuery(o, { ty: o.ty, cr: o.tower && o.cr !== 'off' ? o.cr : '' }); };
    if (ST.bindAccountToggle) ST.bindAccountToggle(el);
    el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => {
      o[n.dataset.o] = n.type === 'checkbox' ? n.checked : n.hasAttribute('data-str') ? n.value : +n.value;
      go();
    }));
    // com / sem a Alma Parangon: Parangon 50 (5 habilidades) ou nível 50 (4 habilidades)
    el.querySelectorAll('[data-par]').forEach((n) => n.addEventListener('click', () => {
      const lv = n.dataset.par === '1' ? 100 : 50;
      if ((o.lv > 50) === (lv > 50)) return;
      o.lv = lv; go();
    }));
  };
  const NOTE = () => tr('Calculado só com os dados do jogo: atributos × qualidade (constantes item_power), Forjado nas Estrelas, Ascensão + Transcendência, encantamentos com afinidade (affinity_stat_bonus), elemento do herói (encantamentos e elemento próprio dos itens do mesmo elemento) liberando o tier das habilidades, habilidade inata + habilidades dos espaços do nível, bônus por tipo de item (inclusive em evasão/crítico quando a habilidade afeta atributos secundários), ATQ por ponto de elemento, espíritos (efeitos “só no próprio item” por item) e Livro de Coleção (melhor carta da classe). Poder = ATQ×0,8×(1 + crítico×(dano crítico−1)) + DEF×1,2 + PV×5 + escudo×3 + ameaça×(DEF×0,008 + PV×0,025). Não entram: campeões, sementes e boosters, que dependem da missão.',
    'Computed only from game data: stats × quality (item_power constants), Starforged, Ascension + Transcendence, enchantments with affinity (affinity_stat_bonus), hero element (enchantments and the items’ own element of the same element) unlocking skill tiers, innate skill + level-unlocked skill slots, item-type bonuses (also on evasion/crit when the skill affects secondary stats), ATK per element point, spirits ("this item only" effects per item) and Collection book (best class card). Power = ATK×0.8×(1 + crit×(crit dmg−1)) + DEF×1.2 + HP×5 + shield×3 + threat×(DEF×0.008 + HP×0.025). Not included: champions, seeds and boosters, which depend on the quest.');
  const qExtra = (o) => (o.tower && o.cr && o.cr !== 'off' ? { cr: o.cr } : {});

  /* Para cada espaço: poder com a melhor runa do elemento do HERÓI × com a melhor runa do elemento do ITEM (afinidade),
     mantendo o resto do build. Mostra qual rende mais e quanto. */
  function runeCheck(b, P) {
    if (!b.gear.some((g) => g && g.el)) return '';
    const best = (k, list) => {
      let top = null;
      for (const e of list) {
        const gear = b.gear.slice(); gear[k] = { ...b.gear[k], el: e };
        const p = evaluate(b.ctx, gear, b.chosen).power;
        if (!top || p > top.p) top = { e, p };
      }
      return top;
    };
    const rows = b.gear.map((g, k) => {
      if (!g) return '';
      const affs = g.x.it.elementAffinity.map((a) => a.id);
      const heroL = P.elements.filter((e) => e.el === b.c.element);
      const itemL = affs.includes('all') ? P.elements : P.elements.filter((e) => affs.includes(e.el));
      const h = best(k, heroL), it = itemL.length ? best(k, itemL) : null;
      const cell = (x) => (x ? `<span class="cell-item"><span class="hm-rune">${img(x.e.e.uid)}<em>${elIcon(x.e.el)}</em></span><span>${esc(x.e.e.name)}<br><span class="small muted">${nf(Math.round(x.p))}</span></span></span>` : `<span class="muted">${tr('sem afinidade', 'no affinity')}</span>`);
      const win = !it ? 'hero' : it.p > h.p + 0.5 ? 'item' : h.p > it.p + 0.5 ? 'hero' : 'tie';
      const diff = it ? Math.abs(it.p - h.p) : 0;
      const verdict = win === 'tie' ? `<span class="muted">${tr('igual', 'same')}</span>`
        : `<b class="ok">${win === 'item' ? tr('elemento do item', 'item element') : tr('elemento do herói', 'hero element')}</b>${it ? `<div class="small muted">+${nf(Math.round(diff))} (${dec(diff / Math.min(h.p, it.p) * 100, 2)}%)</div>` : ''}`;
      return `<tr><td><span class="cell-item">${img(g.x.it.uid)}<span>${esc(g.x.it.name)}<br><span class="small muted">${affs.map((a) => elIcon(a)).join(' ') || '—'}</span></span></span></td>
        <td>${cell(h)}</td><td>${cell(it)}</td><td>${verdict}</td></tr>`;
    }).join('');
    return ST.sec(tr('Runa: elemento do herói × elemento do item', 'Rune: hero element × item element'),
      `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('items')}</th><th>${tr('Melhor runa do herói', 'Best hero rune')} ${elIcon(b.c.element)}</th><th>${tr('Melhor runa do item (afinidade)', 'Best item rune (affinity)')}</th><th>${tr('Rende mais', 'Gives more')}</th></tr></thead><tbody>${rows}</tbody></table></div>`,
      tr('Troca só a runa daquele espaço e mantém o resto do build. A runa do elemento do item ganha o bônus de afinidade (atributos ×1,5 e +5 de elemento); a do herói soma elemento para liberar o tier das habilidades. O Hypermax já escolhe a melhor; esta tabela mostra a conta.',
        'Swaps only that slot’s rune and keeps the rest of the build. The item-element rune gets the affinity bonus (stats ×1.5 and +5 element); the hero rune adds element to unlock skill tiers. Hypermax already picks the best; this table shows the math.'));
  }

  function card(b, rank, o) {
    return `<a class="hm-card2" href="${o.href || `#/${o.route}/${b.c.uid}${optQuery(o, qExtra(o))}`}">
      <div class="hm-h"><div class="hm-cls">${img(b.c.icon)}</div><div class="hm-hn"><b>${esc(b.c.name)}</b>
        <span class="hm-pw2" title="${tr('Poder do placar de líderes (com Livro de Coleção)', 'Leaderboard power (with Collection book)')}">${ST.ic('star')} ${nf(Math.round(b.power))}</span>
        ${b.ctx.colMult > 1 ? `<span class="hm-prof" title="${tr('Poder mostrado no perfil do herói, sem o Livro de Coleção', 'Power shown on the hero profile, without the Collection book')}">${tr('perfil', 'profile')} ${nf(Math.round(b.profile.power))}</span>` : ''}</div>
        <div class="hm-side"><span class="hm-rk">#${rank}</span><span class="hm-el">${nf(Math.round(b.E))} ${elIcon(b.c.element)}</span></div></div>
      ${skillRow(b)}${statsGrid(b)}
      <div class="hm-gear">${b.gear.map((g) => gearCell(g, o)).join('')}</div></a>`;
  }

  ST.hmDebug = { evaluate, optimize, prepare, powerOf, rebuild, toChoice, makeCtx, finish };
  ST.hmUI = { card: (b, rank, o) => card(b, rank, o), calc: (b, o, P) => calcSection(b, o, P), elIcon: (el) => elIcon(el), statsGrid: (b) => statsGrid(b),
    gear: (g, o) => gearCell(g, o), skills: (b) => skillRow(b), fifthOf: (b) => fifthOf(b) };

  /* Calcula todas as classes. Com servidor (http), roda num Web Worker e a página não trava; abrindo o arquivo
     direto (file://) ou sem suporte, calcula aqui mesmo. onProgress(feitas, total) atualiza a barra. */
  ST.hmComputeAll = function (classes, P, skills, K, o, onProgress) {
    const local = () => new Promise((res) => {
      const out = [];
      let i = 0;
      const stepFn = () => { // em fatias, para a barra de progresso aparecer
        const end = Math.min(classes.length, i + 4);
        for (; i < end; i++) out.push(optimize(classes[i], P, skills, K, o));
        if (onProgress) onProgress(i, classes.length);
        if (i < classes.length) setTimeout(stepFn, 0); else res(out);
      };
      stepFn();
    });
    if (typeof Worker === 'undefined' || !/^https?:/.test(location.protocol)) return local();
    return new Promise((res) => {
      let w;
      const tag = typeof document !== 'undefined' && document.querySelector('script[src*="pages/hypermax.js"]');
      const codeV = tag ? (tag.getAttribute('src').split('v=')[1] || '') : '';
      try { w = new Worker('assets/hm-worker.js?c=' + encodeURIComponent(codeV)); } catch (e) { return local().then(res); }
      const fail = () => { try { w.terminate(); } catch (e) {} local().then(res); };
      w.onerror = fail;
      w.onmessage = (ev) => {
        const m = ev.data;
        if (m.type === 'progress') { if (onProgress) onProgress(m.done, m.total); return; }
        if (m.type === 'error') return fail();
        w.terminate();
        const byUid = new Map(classes.map((c) => [c.uid, c]));
        res(m.choices.map((ch) => rebuild(byUid.get(ch.c), P, skills, K, o, ch)));
      };
      const { profile, ...rest } = o;
      w.postMessage({ lang: ST.lang, v: (ST.meta && ST.meta.generatedAt) || '', opts: { ...rest, profile: profile !== undefined ? profile : (ST.account && ST.account.active() ? ST.account.get() : null) },
        classes: classes.map((c) => c.uid) });
    });
  };

  // ---------------------------------------------------------------- Tumba: informações do evento
  const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;
  const EFF = {
    critical: ['Crítico dos heróis', 'Hero crit'], critMult: ['Dano crítico dos heróis', 'Hero crit dmg'], atk: ['Dano dos heróis', 'Hero damage'],
    def: ['Defesa dos heróis', 'Hero defense'], hp: ['PV dos heróis', 'Hero HP'], evasion: ['Evasão dos heróis', 'Hero evasion'], aggro: ['Ameaça', 'Threat'],
    regen: ['Cura', 'Healing'], mHp: ['PV do monstro', 'Monster HP'], mDmg: ['Dano do monstro', 'Monster damage'], mCrit: ['Crítico do monstro', 'Monster crit'],
    mCritMult: ['Dano crítico do monstro', 'Monster crit dmg'], mEva: ['Evasão do monstro', 'Monster evasion'], mAoe: ['Dano em área', 'AoE damage'],
    mAoeOdds: ['Chance de área', 'AoE chance'], mDmgPerRound: ['Dano por rodada', 'Damage per round'], barrierPowerExtra: ['Barreira elemental', 'Elemental barrier'],
  };
  function tombInfo(ev, builds) {
    const T = ev.tower;
    const curseRows = (() => {
      const parse = (s) => String(s || '').split(';').map((p) => p.split(',').map(Number));
      const hp = parse(T.curse.hp), atk = parse(T.curse.atk), df = parse(T.curse.def);
      const depths = [...new Set([...hp, ...atk, ...df].map((p) => p[0]))].sort((a, b) => a - b);
      const at = (arr, d) => arr.reduce((a, [k, v]) => (d >= k ? v : a), 0);
      return depths.map((dp) => ({ dp, hp: at(hp, dp), atk: at(atk, dp), def: at(df, dp) }));
    })();
    const top4 = builds.slice(0, 4), party = top4.reduce((a, b) => a + b.power, 0);
    const critMods = T.mods.filter((m) => m.eff.critical || m.eff.critMult);
    const others = T.mods.filter((m) => !(m.eff.critical || m.eff.critMult));
    const modRow = (m) => `<div class="row"><div class="grow"><b>${esc(m.name)}</b> <span class="muted small">${m.minTier ? `${tr('a partir do tier', 'from tier')} ${m.minTier}` : tr('todos os tiers', 'all tiers')}${m.minFloor ? ` · ${tr('andar', 'floor')} ${m.minFloor}+` : ''}${m.classes.length ? ' · ' + esc(m.classes.join(', ')) : ''}</span>
      <div class="small">${esc(m.desc || '')}</div></div><div class="r">${Object.entries(m.eff).map(([k, v]) => `${tr(...(EFF[k] || [k, k]))} ${k === 'regen' || k === 'aggro' ? (v > 0 ? '+' : '') + v : pct(v)}`).join(' · ')}</div></div>`;
    return `<div class="two-col">
      ${ST.sec(tr('Níveis da Tumba', 'Tomb tiers'), ST.table(T.tomb, [
        { key: 'name', label: tr('Tumba', 'Tomb') },
        { key: 'power', label: tr('Poder recomendado', 'Recommended power'), num: true, fmt: (r) => nf(r.power) },
        { key: 'party', label: tr('Grupo', 'Party'), num: true },
        { key: 'monsterHp', label: tr('PV do chefe', 'Boss HP'), num: true, fmt: (r) => short(r.monsterHp) },
        { key: 'dmg', label: tr('Dano', 'Damage'), num: true, fmt: (r) => nf(r.dmg) },
        { key: 'ok', label: tr('Top 4 daqui', 'Top 4 here'), num: true, fmt: (r) => (party >= r.power * r.party ? `<span class="ok">${ST.ic('check')}</span>` : '—'), sort: (r) => r.power }]),
        ST.trf(`Os 4 melhores de Heróis da Tumba somam {0} de poder. "Top 4" compara com poder recomendado × tamanho do grupo.`, `The top 4 in Tomb heroes add up to {0} power. "Top 4" compares with recommended power × party size.`, nf(Math.round(party))))}
      ${ST.sec(tr('Maldição da Tumba (chefes)', 'Tomb\'s Curse (bosses)'), ST.table(curseRows, [
        { key: 'dp', label: tr('A partir da profundidade', 'From depth'), num: true },
        { key: 'hp', label: tr('PV', 'HP'), num: true, fmt: (r) => `+${r.hp}%` }, { key: 'def', label: tr('Defesa', 'Defense'), num: true, fmt: (r) => `+${r.def}%` },
        { key: 'atk', label: tr('Ataque', 'Attack'), num: true, fmt: (r) => `+${r.atk}%` }]), tr('Os itens “Maldição da Tumba” reduzem esses bônus em 30%, 50% ou 90%.', 'Tomb\'s Curse items reduce these bonuses by 30%, 50% or 90%.'))}
    </div>
    ${ST.sec(tr('Modificadores que cortam o crítico', 'Modifiers that cut crit'), `<div class="list">${critMods.map(modRow).join('')}</div>`, tr('Por isso a página Heróis da Tumba ignora o crítico por padrão. Lá dá para trocar a regra e simular um modificador específico.', 'That is why the Tomb heroes page ignores crit by default. There you can change the rule to simulate a specific modifier.'))}
    <details class="sec"><summary><b>${tr('Outros modificadores dos andares', 'Other floor modifiers')} (${others.length})</b></summary><div class="list" style="margin-top:8px">${others.map(modRow).join('')}</div></details>`;
  }

  // ---------------------------------------------------------------- páginas (Hypermax e Heróis da Tumba usam o mesmo motor)
  // calcula (ou reaproveita) os builds das 42 classes; devolve null se o usuário saiu da página no meio do cálculo
  async function allBuilds(el, mode, o, classes, P, skills, K) {
      const ck = JSON.stringify([mode, o.cr, o.q, o.lv, o.tr, o.sf, o.col, o.en, o.sk, o.soon, ST.account && ST.account.active() ? JSON.stringify(ST.account.get()) : '']);
      ST._hmCaches = ST._hmCaches || {};
      if (!ST._hmCaches[ck]) {
        el.innerHTML = `<div class="hm-progress"><p>${tr('Calculando o melhor equipamento das 42 classes…', 'Computing the best gear for all 42 classes…')}</p>
          <div class="hm-pbar"><i style="--w:0%"></i></div><span class="small muted" id="hmPct">0 / ${classes.length}</span></div>` + ST.skeleton();
        const myKey = location.hash;
        const res = await ST.hmComputeAll(classes, P, skills, K, o, (done, total) => {
          const bar = el.querySelector('.hm-pbar i'), t0 = el.querySelector('#hmPct');
          if (bar) bar.style.setProperty('--w', (done / total * 100).toFixed(0) + '%');
          if (t0) t0.textContent = `${done} / ${total}`;
        });
        ST._hmCaches[ck] = res.sort((a, b) => b.power - a.power);
        if (location.hash !== myKey) return null; // o usuário mudou de página enquanto calculava
      }
      ST._hmCache = { k: ck, builds: ST._hmCaches[ck] };
      return ST._hmCaches[ck];
  }

  function hmPage(mode) {
    return async (el, [uid], query) => {
      const [classes, skills, prog] = await ST.need('classes', 'skills', 'progression');
      const ev = mode === 'tomb' ? (await ST.need('events'))[0] : null;
      const { d } = await ST.itemsIndex();
      const o = withMode(readOpts(query), mode);
      if (mode === 'tomb') { o.cr = query.get('cr') || 'off'; withMode(o, mode); o.questMult = ev.tower.spiritQuestMult || 2; }
      const K = prog.constants || {};
      const P = prepare(d, skills, K, o);
      if (uid && !classes.some((c) => c.uid === uid)) { el.innerHTML = ST.notFound(); return; }
      const builds = await allBuilds(el, mode, o, classes, P, skills, K);
      if (!builds) return;
      const rankOf = (b) => builds.indexOf(b) + 1;
      const base = '#/' + o.route, title = mode === 'tomb' ? t('tombRank') : t('hypermax');

      if (uid) {
        const b = builds.find((x) => x.c.uid === uid);
        const gearRows = b.gear.map((g, k) => (g ? `<tr><td><a class="cell-item" href="#/item/${g.x.it.uid}">${img(g.x.it.uid)}<span>${esc(g.x.it.name)}<br>
          <span class="small muted">T${g.x.it.tier} · ${esc(b.c.slots[k].map((x) => x.name).join(' / '))}</span></span></a></td>
          <td>${g.el ? `<a class="cell-item" href="#/item/${g.el.e.uid}"><span class="hm-rune lg">${img(g.el.e.uid)}<em>${elIcon(g.el.el)}</em></span><span>${esc(g.el.e.name)} <span class="small muted">+${g.el.val}</span>${g.elTies && g.elTies.length ? `<br><span class="small muted">${tr('empate exato com', 'exact tie with')} ${g.elTies.map((e) => esc(e.e.name)).join(', ')}</span>` : ''}</span></a>` : '—'}</td>
          <td>${g.sp ? `<a class="cell-item" href="#/item/${g.sp.e.uid}">${img(g.sp.e.uid)}<span>${esc(g.sp.e.name)}</span></a>` : '—'}</td></tr>` : '')).join('');
        const seen = new Set(), fifth = fifthOf(b);
        const skillRows = b.active.filter((a) => { const k = a.f.family; if (a.spirit && seen.has(k)) return false; seen.add(k); return true; }).map((a) => {
          const n = a.spirit ? b.active.filter((x) => x.f.family === a.f.family && !x.dup).length : 1;
          const dups = a.spirit ? b.active.filter((x) => x.f.family === a.f.family && x.dup).length : 0;
          const doubled = a.tt.quest && o.tower;
          return `<div class="row">${img(a.f.icon)}<div class="grow"><b>${esc(a.tt.name || a.f.name)}</b>${n > 1 ? ` <span class="badge">×${n}</span>` : ''}${dups ? ` <span class="badge" title="${tr('Este espírito não acumula: só um item conta', 'This spirit does not stack: only one item counts')}">${tr('não acumula', 'does not stack')}</span>` : ''}${doubled ? ` <span class="badge">${tr('dobrado na Tumba', 'doubled in Tomb')}</span>` : ''}${!a.spirit && fifth && a.f.family === fifth ? ' ' + PARAGON_TAG() : ''}
          <span class="muted small">${a.spirit ? tr('espírito', 'spirit') : a.f.kind === 'innate' ? tr('inata', 'innate') : a.f.kind === 'mastery' ? tr('maestria', 'mastery') : tr('herói', 'hero')}${a.tt.tier ? ' · T' + a.tt.tier : ''}${a.tt.req ? ` · ${nf(a.tt.req)} ${tr('de elemento', 'element')}` : ''}${a.self ? ' · ' + tr('só no próprio item', 'this item only') : ''}</span>
          <div class="small">${esc((a.tt.effects || []).join(' · '))}</div></div></div>`;
        }).join('');
        const builder = `#/montador?c=${b.c.uid}&lv=${Math.min(b.lv, ST.maxLevel(b.c))}&` + b.gear.map((g, k) => (g ? `s${k}=${g.x.it.uid}:${o.q}:${g.el ? g.el.e.uid : ''}:${g.sp ? g.sp.e.uid : ''}` : '')).filter(Boolean).join('&') + `&sk=${b.chosen.map((f) => f.family).join(',')}` + (o.tr ? '' : '&tr=0') + (o.sf ? '' : '&sf=0') + (o.col ? '' : '&col=0');
        el.innerHTML = `<a class="crumb" href="${base}${optQuery(o, qExtra(o))}">${ST.ic('left')} ${title}</a>
          ${BETA()}
          ${controls(o)}
          <div class="hm-detail">${card(b, rankOf(b), o)}
            <div>${ST.sec(tr('Habilidades', 'Skills'), skillRows ? `<div class="list">${skillRows}</div>` : `<p class="muted">${t('none')}</p>`,
                fifth ? tr('A 5ª habilidade só existe com a Alma Parangon: o herói precisa estar no nível 50 e já promovido com a Alma de Titã; ao usar a Alma Parangon ele volta ao nível 1 e o 5º espaço libera quando chega de novo ao nível 50 (Parangon 50). O espaço tem as mesmas chances de raridade do 4º. Use o botão “Sem Parangon” acima para ver o build com 4 habilidades.', 'The 5th skill only exists with the Paragon Soul: the hero must be level 50 and already promoted with a Titan Soul; after using the Paragon Soul it goes back to level 1 and the 5th slot unlocks when it reaches level 50 again (Paragon 50). The slot has the same rarity odds as the 4th. Use the “Without Paragon” button above to see the build with 4 skills.') : '')}
              ${ST.sec(tr('Equipamento', 'Gear'), `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('items')}</th><th>${tr('Elemento', 'Element')}</th><th>${tr('Espírito', 'Spirit')}</th></tr></thead><tbody>${gearRows}</tbody></table></div>`)}
              ${runeCheck(b, P)}
              ${ST.stats([ST.stat(tr('Poder no placar', 'Leaderboard power'), nf(Math.round(b.power))),
                ST.stat(tr('Poder no perfil do herói', 'Hero profile power'), nf(Math.round(b.profile.power))),
                ST.stat(tr('ATQ / DEF / PV no perfil', 'ATK / DEF / HP on profile'), `${short(Math.round(b.profile.atk))} / ${short(Math.round(b.profile.def))} / ${short(Math.round(b.profile.hp))}`),
                ST.stat(tr('Herói sem nada', 'Bare hero'), nf(Math.round(b.heroOnly))), ST.stat(tr('Elemento do herói', 'Hero element'), `${nf(Math.round(b.E))} ${elIcon(b.c.element)}`), ST.stat(t('level'), lvName(b.lv))])}
              <p class="note">${tr('No jogo, o perfil do herói mostra atributos e poder sem o Livro de Coleção; o placar de líderes aplica o melhor bônus da classe (+25%). Por isso o mesmo herói aparece com 1.399.539 no perfil e 1.749.428 no placar (×1,25).',
                'In the game, the hero profile shows stats and power without the Collection book; the leaderboard applies the best class bonus (+25%). That is why the same hero shows 1,399,539 on the profile and 1,749,428 on the leaderboard (×1.25).')}</p>
              <div class="tags" style="margin-top:12px"><a class="chip" href="${builder}">${ST.ic('swords')} ${tr('Abrir no montador', 'Open in builder')}</a><a class="chip" href="#/classes/${b.c.uid}">${ST.ic('info')} ${esc(b.c.name)}</a>
                <button class="chip" id="hmLink">${tr('Copiar link', 'Copy link')}</button><button class="chip" id="hmImg">${tr('Compartilhar imagem', 'Share image')}</button><span class="small muted" id="hmMsg"></span></div></div></div>
          ${ST.sec(tr('Cálculo dos atributos', 'Stat calculation'), calcSection(b, o, P), tr('Cada item: atributos base do jogo → melhorias do projeto (Forjado nas Estrelas, Ascensão, Transcendência) → × qualidade → × (1 + bônus de tipo das habilidades e espíritos). Depois soma herói + itens + encantamentos e aplica as porcentagens das habilidades e o Livro de Coleção.', 'Each item: game base stats → blueprint upgrades (Starforged, Ascension, Transcendence) → × quality → × (1 + type bonus from skills and spirits). Then hero + items + enchantments are added and skill percentages and the Collection book are applied.'))}
          <p class="note">${NOTE()}</p>`;
        bindControls(el, o, base + '/' + b.c.uid);
        const hmMsg = (x) => { el.querySelector('#hmMsg').textContent = x; };
        el.querySelector('#hmLink').addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(location.href); hmMsg(tr('Link copiado.', 'Link copied.')); } catch (e) { prompt('URL', location.href); }
        });
        el.querySelector('#hmImg').addEventListener('click', async () => {
          if (!ST.shareBuild) return;
          hmMsg(tr('Gerando imagem…', 'Generating image…'));
          const r = await ST.shareBuild(b, o, location.href, 'Portal Shop Titans · ' + title);
          hmMsg(r === 'shared' ? tr('Compartilhado.', 'Shared.') : tr('Imagem baixada.', 'Image downloaded.'));
        });
        return;
      }
      const types = [...new Map(classes.map((c) => [c.type, c.typeName])).entries()];
      const shown = builds.filter((b) => !o.ty || b.c.type === o.ty);
      const ex = qExtra(o);
      el.innerHTML = ST.pageHead(title, mode === 'tomb'
        ? tr('Os melhores heróis para a Tumba dos Titãs. Os monstros da Tumba anulam o crítico (Pele Adamantina, Sem Fraquezas, Fortificado), então o ranking usa poder sem crítico, e o espírito “Malevolência Nascida da Tumba” vale em dobro aqui.',
          'The best heroes for the Tomb of Titans. Tomb monsters negate crit (Adamantine Skin, No Weakness, Fortified), so the ranking uses power without crit, and the “Tomb-Born Malevolence” spirit counts double here.')
        : tr('O máximo teórico de cada classe: equipamento, encantamentos e habilidades que dão mais poder. Clique numa classe para ver os detalhes.',
          'The theoretical maximum for each class: the gear, enchantments and skills that give the most power. Click a class for details.')) +
        BETA() + controls(o) +
        (mode === 'tomb' ? `<div class="tags" style="margin-bottom:12px"><a class="chip" href="#/tumba">${ST.ic('info')} ${tr('Níveis, maldição e modificadores da Tumba', 'Tomb tiers, curse and modifiers')}</a></div>` : '') +
        ST.tabs([[base + optQuery(o, ex), t('all')], ...types.map(([k, n]) => [base + optQuery(o, { ...ex, ty: k }), esc(n)])], base + optQuery(o, { ...ex, ty: o.ty })) +
        `<div class="hm-grid">${shown.map((b) => card(b, rankOf(b), o)).join('')}</div><p class="note">${NOTE()}</p>`;
      bindControls(el, o, base);
    };
  }

  ST.page('hypermax', { nav: 'hypermax', title: () => t('hypermax'), render: hmPage('hyper') });
  ST.addI18n({ pt: { tomb: 'Tumba dos Titãs' }, en: { tomb: 'Tomb of Titans' } });
  ST.addI18n({ pt: { tombRank: 'Heróis da Tumba' }, en: { tombRank: 'Tomb heroes' } });
  ST.page('tumba-ranking', { nav: 'tumba-ranking', title: () => t('tombRank'), render: hmPage('tomb') });
  // Tumba dos Titãs: níveis, maldição e modificadores. O ranking de heróis fica em #/tumba-ranking (Comunidade).
  ST.page('tumba', {
    nav: 'tumba', title: () => t('tomb'),
    render: async (el, [uid], query) => {
      // links antigos (#/tumba/<classe> ou com opções do ranking) vão para a página nova
      if (uid || [...query.keys()].length) { location.replace('#/tumba-ranking' + (uid ? '/' + uid : '') + ([...query.keys()].length ? '?' + query.toString() : '')); return; }
      const [classes, skills, prog] = await ST.need('classes', 'skills', 'progression');
      const ev = (await ST.need('events'))[0];
      const { d } = await ST.itemsIndex();
      const o = readOpts(new URLSearchParams());
      o.cr = 'off'; withMode(o, 'tomb'); o.questMult = ev.tower.spiritQuestMult || 2;
      const K = prog.constants || {};
      const builds = await allBuilds(el, 'tomb', o, classes, prepare(d, skills, K, o), skills, K);
      if (!builds) return;
      el.innerHTML = ST.pageHead(t('tomb'), tr('Níveis da Tumba, a maldição dos chefes e os modificadores dos andares. Os monstros da Tumba anulam o crítico (Pele Adamantina, Sem Fraquezas, Fortificado), e o espírito “Malevolência Nascida da Tumba” vale em dobro aqui.',
        'Tomb tiers, the bosses\' curse and the floor modifiers. Tomb monsters negate crit (Adamantine Skin, No Weakness, Fortified), and the “Tomb-Born Malevolence” spirit counts double here.')) +
        `<div class="tags" style="margin-bottom:12px"><a class="chip" href="#/tumba-ranking">${ST.ic('swords')} ${tr('Ver o ranking de heróis para a Tumba', 'See the hero ranking for the Tomb')}</a></div>` +
        tombInfo(ev, builds);
    },
  });
})();
