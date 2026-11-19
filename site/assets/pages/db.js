/* Seções do banco de dados. */
(() => {
  const { t, tr, esc, clean, nf, short, dur, pct, dec, img, icon } = ST;
  const back = (href, label) => `<a class="crumb" href="${href}"><i class="ic ic-left"></i> ${esc(label)}</a>`;
  const stars = (n) => (n ? '<i class="ic ic-star"></i>'.repeat(n) : '—');
  const searchBox = (id, ph) => `<input class="inp" id="${id}" type="search" placeholder="${esc(ph || t('search'))}" style="flex:1 1 260px">`;
  const bindSearch = (el, id, selector, textOf) => {
    el.querySelector('#' + id).addEventListener('input', (e) => {
      const q = ST.norm(e.target.value);
      el.querySelectorAll(selector).forEach((n) => { n.hidden = q && !ST.norm(textOf ? textOf(n) : n.textContent).includes(q); });
    });
  };
  const levelStatsTable = (stats) => {
    const lv = ['1', '40', '50', '100'].filter((l) => ['hp', 'atk', 'def'].some((s) => stats[s][l]));
    return ST.table(['atk', 'def', 'hp'].map((s) => ({ s, ...stats[s] })), [
      { key: 's', label: '', fmt: (r) => `<b class="s-${r.s}">${t(r.s)}</b>` },
      ...lv.map((l) => ({ key: l, label: `${t('level')} ${l}`, num: true, fmt: (r) => nf(r[l]) })),
    ]);
  };
  const power = (atk, def, hp, k) => atk * (k.adventurer_power_attack_mult ?? 0.8) + def * (k.adventurer_power_defense_mult ?? 1.2) + hp * (k.adventurer_power_hp_mult ?? 5);
  ST.power = power;

  // ================================================================ campeões
  ST.page('campeoes', {
    title: () => t('champions'),
    async render(el, [uid]) {
      const [list] = await ST.need('champions');
      if (!uid) {
        el.innerHTML = ST.pageHead(t('champions'), tr('Campeões lideram grupos e concedem bônus para toda a equipe.', 'Champions lead parties and grant bonuses to the whole team.')) +
          `<div class="tiles">${list.map((c) => `<a class="tile big" href="#/campeoes/${c.uid}"><div class="thumb">${img(ST.firstIcon(c.card, c.icon))}</div>
            <div class="tile-body"><div class="tile-title">${esc(c.name)}</div><div class="tile-sub">${esc(c.className)} · ${esc(c.elementName)}</div>
            <div class="tile-sub">${t('atk')} ${nf(c.stats.atk['40'])} · ${t('def')} ${nf(c.stats.def['40'])} · ${t('hp')} ${nf(c.stats.hp['40'])}</div></div></a>`).join('')}</div>`;
        return;
      }
      const c = list.find((x) => x.uid === uid);
      if (!c) { el.innerHTML = ST.notFound(); return; }
      el.innerHTML = `${back('#/campeoes', t('champions'))}
        <div class="detail-head" style="margin-top:12px">${ST.icon(c.card) ? `<img class="hero-art" src="${ST.icon(c.card)}" alt="">` : `<div class="thumb">${img(c.icon)}</div>`}
          <div style="flex:1;min-width:240px">${ST.pageHead(esc(c.name), c.quote ? `<i>${esc(c.quote)}</i>` : '')}
          ${ST.tags([ST.tag(esc(c.className), 'hl'), ST.tag(`${t('element')}: ${esc(c.elementName)}`), ST.tag(`${tr('Desbloqueio', 'Unlock')}: ${t('level')} ${c.unlockedAt}`)])}
          ${ST.stats([ST.stat(t('eva'), pct(c.evasion)), ST.stat(t('crit'), pct(c.critical)), ST.stat(t('critMult'), 'x' + dec(c.critMult)), ST.stat(tr('Ameaça', 'Threat'), nf(c.aggro))])}</div></div>
        ${ST.sec(tr('Atributos por nível', 'Stats by level'), levelStatsTable(c.stats))}
        ${ST.sec(tr('Habilidade de líder (por rank)', 'Leader skill (by rank)'), `<div class="list">${c.skills.map((s) => `<div class="row">${ST.icon(s.icon) ? `<img src="${ST.icon(s.icon)}" alt="">` : ''}
          <div class="req">${t('rank')} ${s.rank}</div><div class="grow"><b>${esc(s.name)}</b>${s.desc ? ` <span class="muted small">${esc(s.desc)}</span>` : ''}
          ${ST.tags(s.effects.map((e) => ST.tag(esc(e))))}</div></div>`).join('')}</div>`)}
        ${ST.sec(tr('Melhorias com fichas', 'Token upgrades'), ST.table(c.upgrades, [
          { key: 'rank', label: '#', num: true }, { key: 'tokens', label: tr('Fichas', 'Tokens'), num: true, fmt: (r) => nf(r.tokens) },
          { key: 'text', label: tr('Efeito', 'Effect') }]))}
        ${ST.sec(tr('Pode equipar', 'Can equip'), ST.tags(c.equip.map((e) => `<a class="pill-link" href="#/itens?type=${e.code}">${ST.tag(esc(e.name))}</a>`)))}`;
    },
  });

  // ================================================================ classes
  ST.page('classes', {
    title: () => t('classes'),
    async render(el, [uid]) {
      const [list, skills, prog] = await ST.need('classes', 'skills', 'progression');
      const by = new Map(list.map((c) => [c.uid, c]));
      if (!uid) {
        const groups = {};
        list.forEach((c) => (groups[c.typeName] = groups[c.typeName] || []).push(c));
        el.innerHTML = ST.pageHead(t('classes'), tr('Classes de heróis: atributos, equipamentos e promoções.', 'Hero classes: stats, equipment and promotions.'),
          `<div class="form-row">${searchBox('cq')}</div>`) +
          Object.entries(groups).map(([g, cs]) => `<h2 class="group-title">${esc(g)}</h2><div class="tiles">${cs.map((c) =>
            `<a class="tile" href="#/classes/${c.uid}" data-s="${esc(c.name)}"><div class="thumb">${img(ST.firstIcon(c.icon, 'icon_global_class_' + c.uid, c.card))}</div>
            <div class="tile-body"><div class="tile-title">${esc(c.name)}${c.promotedFrom ? ' <span class="badge">' + tr('Promoção', 'Promoted') + '</span>' : ''}</div>
            <div class="tile-sub">${esc(c.elementName)} · ${t('power')} ${nf(Math.round(power(c.stats.atk['40'], c.stats.def['40'], c.stats.hp['40'], prog.constants)))} (${t('level')} 40)</div></div></a>`).join('')}</div>`).join('');
        bindSearch(el, 'cq', '.tile');
        return;
      }
      const c = by.get(uid);
      if (!c) { el.innerHTML = ST.notFound(); return; }
      const avail = skills.filter((s) => s.kind === 'hero' && s.classes.some((x) => x.id === c.uid || x.id === c.type));
      const link = (u) => (by.get(u) ? `<a href="#/classes/${u}">${esc(by.get(u).name)}</a>` : '—');
      el.innerHTML = `${back('#/classes', t('classes'))}
        <div class="detail-head" style="margin-top:12px">${ST.icon(c.card) ? `<img class="hero-art" src="${ST.icon(c.card)}" alt="">` : `<div class="thumb">${img(c.icon)}</div>`}
        <div style="flex:1;min-width:240px">${ST.pageHead(esc(c.name), clean(c.desc))}
          ${ST.tags([ST.tag(esc(c.typeName), 'hl'), ST.tag(`${t('element')}: ${esc(c.elementName)}`)])}
          <dl class="kv" style="margin-top:12px">
            <dt>${tr('Contratação', 'Hire')}</dt><dd>${c.hire.gold ? nf(c.hire.gold) + ' <i class="ic ic-coin"></i> ' : ''}${c.hire.gems ? nf(c.hire.gems) + ' <i class="ic ic-gem"></i> ' : ''}${t('level')} ${c.hire.level}</dd>
            <dt>${tr('Promove para', 'Promotes to')}</dt><dd>${link(c.promotesTo)}</dd>
            <dt>${tr('Promovida de', 'Promoted from')}</dt><dd>${link(c.promotedFrom)}</dd>
            <dt>${tr('Espaços de habilidade', 'Skill slots')}</dt><dd>${c.skillSlots.map((l) => (l > 50 ? `${tr('Parangon', 'Paragon')} ${l - 50} (${tr('Alma Parangon', 'Paragon Soul')})` : `${t('level')} ${l}`)).join(', ') || '—'}</dd>
          </dl></div></div>
        <div class="two-col">
          ${ST.sec(tr('Atributos por nível', 'Stats by level'), levelStatsTable(c.stats))}
          ${ST.sec(tr('Afinidades', 'Affinities'), `<dl class="kv"><dt>${t('hp')}</dt><dd class="stars">${stars(c.stars.hp)}</dd><dt>${t('atk')}</dt><dd class="stars">${stars(c.stars.atk)}</dd>
            <dt>${t('def')}</dt><dd class="stars">${stars(c.stars.def)}</dd><dt>${t('eva')}</dt><dd class="stars">${stars(c.stars.eva)}</dd>
            <dt>${t('skills')}</dt><dd class="stars">${stars(c.stars.skill)}</dd>
            <dt>${t('eva')}</dt><dd>${pct(c.evasion)}</dd><dt>${t('crit')}</dt><dd>${pct(c.critical)} · x${dec(c.critMult)}</dd><dt>${tr('Ameaça', 'Threat')}</dt><dd>${c.aggro}</dd></dl>`)}
        </div>
        ${c.innate ? ST.sec(tr('Habilidade inata', 'Innate skill'), `<div class="list"><div class="row">${ST.icon(c.innate.icon) ? `<img src="${ST.icon(c.innate.icon)}" alt="">` : ''}
          <div class="grow"><b>${esc(c.innate.names.join(' → '))}</b><div class="note">${esc(c.innate.effect || '')}</div></div></div></div>`) : ''}
        ${ST.sec(tr('Espaços de equipamento', 'Equipment slots'), `<div class="list">${c.slots.map((sl, k) => `<div class="row"><div class="req">${k + 1}</div>
          <div class="grow">${ST.tags(sl.map((x) => `<a class="pill-link" href="#/itens?type=${x.code}">${ST.tag(esc(x.name))}</a>`))}</div></div>`).join('')}</div>`)}
        ${ST.sec(tr('Itens iniciais', 'Starting items'), c.startItems.length ? `<div class="tags">${c.startItems.map((x) => `<a class="pill-link" href="#/item/${x.id}">${ST.tag(esc(x.name))}</a>`).join('')}</div>` : '')}
        ${ST.sec(`${tr('Habilidades disponíveis', 'Available skills')} (${avail.length})`, avail.length ? `<div class="tiles">${avail.map((s) =>
          `<a class="tile" href="#/habilidades?k=hero&q=${encodeURIComponent(s.name)}"><div class="thumb">${img(s.icon)}</div><div class="tile-body"><div class="tile-title">${esc(s.name)}</div>
          <div class="tile-sub">${esc((s.tiers[0] || {}).effects?.join(' · ') || '')}</div></div></a>`).join('')}</div>` : '')}
        <p class="note"><a href="#/montador?c=${c.uid}"><i class="ic ic-swords"></i> ${t('builder')}</a></p>`;
    },
  });

  // ================================================================ habilidades
  const KIND = { hero: ['Habilidades de herói', 'Hero skills'], mastery: ['Maestrias', 'Masteries'], innate: ['Inatas de classe', 'Class innates'],
    spirit: ['Espíritos', 'Spirits'], artifact: ['Artefatos', 'Artifacts'], item: ['Itens', 'Items'], other: ['Outras', 'Other'] };
  ST.page('habilidades', {
    title: () => t('skills'),
    async render(el, args, query) {
      const [list] = await ST.need('skills');
      const kinds = [...new Set(list.map((s) => s.kind))];
      const k = query.get('k') || 'hero';
      const rows = list.filter((s) => s.kind === k);
      el.innerHTML = ST.pageHead(t('skills'), tr('Efeitos por nível de cada habilidade.', 'Effects per tier for each skill.'), `<div class="form-row">${searchBox('sq')}</div>`) +
        ST.tabs(kinds.map((x) => [`#/habilidades?k=${x}`, tr(...KIND[x])]), `#/habilidades?k=${k}`) +
        `<div class="tiles">${rows.map((s) => `<div class="tile" style="align-items:flex-start" data-s="${esc(s.name + ' ' + s.classes.map((c) => c.name).join(' '))}">
          <div class="thumb">${img(s.icon)}</div><div class="tile-body"><div class="tile-title">${esc(s.name)}</div>
          ${s.classes.length ? `<div class="tile-sub">${esc(s.classes.map((c) => c.name).join(', '))}</div>` : ''}
          ${s.tiers.map((x) => `<div class="small" style="margin-top:6px"><span class="badge">${x.tier ? 'T' + x.tier : '•'}</span> ${x.name && x.name !== s.name ? `<b>${esc(x.name)}</b> · ` : ''}${esc(x.effects.join(' · ') || '—')}</div>`).join('')}
          </div></div>`).join('')}</div>`;
      const box = el.querySelector('#sq');
      box.value = query.get('q') || '';
      bindSearch(el, 'sq', '.tile', (n) => n.dataset.s);
      if (box.value) box.dispatchEvent(new Event('input'));
    },
  });

  // ================================================================ missões
  ST.page('missoes', {
    title: () => t('quests'),
    async render(el, [zid]) {
      const [zones] = await ST.need('quests');
      if (!zid) {
        el.innerHTML = ST.pageHead(t('quests'), tr('Áreas de missão com monstros, chefes, recompensas e baús.', 'Quest areas with monsters, bosses, rewards and chests.')) +
          `<div class="tiles">${zones.map((z) => {
            const pw = z.levels.map((l) => l.power).filter(Boolean);
            return `<a class="tile big" href="#/missoes/${z.id}"><div class="thumb">${img(z.icon)}</div><div class="tile-body">
            <div class="tile-title">${esc(z.name)}</div><div class="tile-sub">${z.boss ? `${t('boss')}: ${esc(z.boss)}` : ''}</div>
            <div class="tile-sub">${z.levels.length} ${tr('níveis', 'levels')}${pw.length ? ` · ${t('power')} ${short(Math.min(...pw))}–${short(Math.max(...pw))}` : ''}</div></div></a>`;
          }).join('')}</div>`;
        return;
      }
      const z = zones.find((x) => x.id === zid);
      if (!z) { el.innerHTML = ST.notFound(); return; }
      const compStr = (l) => l.comps.map((c) => `${icon(c.id) ? `<img src="${icon(c.id)}" alt="" title="${esc(c.name)}">` : esc(c.name)} <span class="small muted">${esc(String(c.qty).replace(',', '–'))}</span>`).join(' ');
      el.innerHTML = `${back('#/missoes', t('quests'))}
        <div class="detail-head" style="margin-top:12px"><div class="thumb">${img(z.icon)}</div><div>${ST.pageHead(esc(z.name), clean(z.desc))}
        ${z.boss ? ST.tags([ST.tag(`${t('boss')}: ${esc(z.boss)}`, 'hl')]) : ''}</div></div>
        ${ST.sec(tr('Níveis e monstros', 'Levels and monsters'), ST.table(z.levels, [
          { key: 'uid', label: '#', fmt: (l) => `${l.boss ? `<span class="badge">${t('boss')}</span> ` : ''}${l.titan ? '<span class="badge">Titã</span> ' : ''}${tr('Dif.', 'Diff.')} ${l.difficulty ?? 0}` },
          { key: 'power', label: t('power'), num: true, fmt: (l) => nf(l.power) },
          { key: 'monsterHp', label: tr('PV do monstro', 'Monster HP'), num: true, fmt: (l) => nf(l.monsterHp) },
          { key: 'dmg', label: tr('Dano', 'Damage'), num: true, fmt: (l) => nf(l.dmg) },
          { key: 'tdef', label: tr('DEF alvo', 'Target DEF'), num: true, fmt: (l) => nf(l.tdef) },
          { key: 'party', label: tr('Grupo', 'Party'), num: true },
          { key: 'time', label: t('time'), num: true, fmt: (l) => dur(l.time) },
          { key: 'rest', label: tr('Descanso', 'Rest'), num: true, fmt: (l) => dur(l.rest) },
          { key: 'xp', label: t('xp'), num: true, fmt: (l) => nf(l.xp) },
          { key: 'elementName', label: t('element'), fmt: (l) => esc(l.elementName || '') + (l.barrier ? ` <span class="small muted">(${tr('barreira', 'barrier')} ${nf(l.barrier)})</span>` : '') },
          { key: 'comps', label: tr('Componentes', 'Components'), fmt: compStr },
          { key: 'itemLevel', label: tr('Nível dos itens', 'Item level'), fmt: (l) => `${l.itemLevel[0]}–${l.itemLevel[1]}` },
          { key: 'chest', label: tr('Baú / chave', 'Chest / key'), fmt: (l) => (l.chest ? `${dec(l.chest.odds)}% · <i class="ic ic-key"></i> ${dec(l.keyOdds)}%` : '') },
          { key: 'unlock', label: tr('Desbloqueio', 'Unlock'), fmt: (l) => [l.unlock.gold && nf(l.unlock.gold) + ' <i class="ic ic-coin"></i>', l.unlock.gems && nf(l.unlock.gems) + ' <i class="ic ic-gem"></i>'].filter(Boolean).join(' / ') },
        ]), tr('Poder = poder mínimo recomendado do grupo. Quantidades de componentes por missão (mín–máx).', 'Power = recommended minimum party power. Component quantities per quest (min–max).'))}
        ${z.progress.length ? ST.sec(tr('Progressão da área', 'Area progression'), ST.table(z.progress, [
          { key: 'level', label: t('level'), num: true }, { key: 'xp', label: tr('Missões', 'Quests'), num: true },
          { key: 'type', label: tr('Bônus', 'Bonus'), fmt: (r) => esc([r.type, r.value].filter(Boolean).join(': ')) }])) : ''}`;
    },
  });

  // ================================================================ baús
  ST.page('baus', {
    title: () => t('chests'),
    async render(el) {
      const [list] = await ST.need('chests');
      await ST.itemsIndex();
      const Q = { uncommon: tr('Superior', 'Uncommon'), flawless: tr('Magistral', 'Flawless'), epic: tr('Épico', 'Epic'), legendary: tr('Lendário', 'Legendary') };
      el.innerHTML = ST.pageHead(t('chests'), tr('Conteúdo dos baús de cada área e chances de qualidade.', 'Contents of each area chest and quality odds.')) +
        list.map((c) => `<section class="panel" style="margin-bottom:14px">
          <div class="detail-head"><div class="thumb">${img(c.icon)}</div><div style="flex:1;min-width:220px">
            <h2 class="d-title">${esc(c.name)}</h2><div class="d-sub">${esc(c.zoneName)} · ${icon(c.keyIcon) ? `<img src="${icon(c.keyIcon)}" alt="" style="width:20px;vertical-align:middle">` : ''} ${esc(c.keyName)}</div>
            ${c.desc ? `<p class="d-desc">${esc(c.desc)}</p>` : ''}</div>
            <dl class="kv"><dt>${tr('Itens por baú', 'Items per chest')}</dt><dd>${c.contentSize}</dd><dt>${tr('Nível dos itens', 'Item level')}</dt><dd>${c.itemLevel.join('–')}</dd>
            <dt>${tr('Campeões', 'Champions')}</dt><dd>${c.championsCount || '—'}</dd></dl></div>
          <div class="two-col">
            ${ST.sec(tr('Chance de qualidade', 'Quality odds'), ST.tags(Object.entries(c.quality).filter(([, v]) => v).map(([q, v]) => ST.tag(`${Q[q]}: ${dec(v * 100)}%`))),
              tr('Peso relativo de cada qualidade conforme a tabela do jogo.', 'Relative weight of each quality as stored in the game table.'))}
            ${ST.sec(tr('Componentes', 'Components'), `<div class="tags">${c.comps.map((x) => ST.itemChip(x.id, ` <span class="muted">${esc(String(x.qty).replace(',', '–'))}</span>`)).join('')}</div>`)}
          </div>
          ${ST.sec(tr('Consumíveis possíveis', 'Possible consumables'), `<div class="tags">${c.consumables.map((x) => ST.itemChip(x.id)).join('')}
            ${c.runestones ? ST.itemChip(c.runestones.id, ` <span class="muted">${esc(c.runestones.qty)}</span>`) : ''}${c.moonstones ? ST.itemChip(c.moonstones.id, ` <span class="muted">${esc(c.moonstones.qty)}</span>`) : ''}</div>`)}
          ${ST.sec(`${tr('Projetos exclusivos', 'Exclusive blueprints')} (${c.blueprints.length})`, `<div class="tags">${c.blueprints.map((b) => ST.itemChip(b.id)).join('')}</div>`)}
        </section>`).join('');
    },
  });

  // ================================================================ trabalhadores
  ST.page('trabalhadores', {
    title: () => t('workers'),
    async render(el, [uid]) {
      const [w] = await ST.need('workers');
      const { d } = await ST.itemsIndex();
      const crafted = (id) => d.items.filter((i) => i.workers.some((x) => x.id === id));
      if (!uid) {
        el.innerHTML = ST.pageHead(t('workers'), tr('Trabalhadores, construções e quantos projetos cada um fabrica.', 'Workers, buildings and how many blueprints each one crafts.')) +
          `<div class="tiles">${w.workers.map((x) => `<a class="tile" href="#/trabalhadores/${x.uid}"><div class="thumb">${img(ST.firstIcon(x.card, x.icon, x.uid))}</div>
            <div class="tile-body"><div class="tile-title">${esc(x.name)}</div><div class="tile-sub">${esc(x.npc || '')}${x.building ? ' · ' + esc(x.building) : ''}</div>
            <div class="tile-sub">${crafted(x.uid).length} ${tr('projetos', 'blueprints')} · ${x.levels.length} ${tr('níveis', 'levels')}</div></div></a>`).join('')}</div>
          <h2 class="group-title">${tr('Recursos', 'Resources')}</h2>
          <div class="tiles">${w.resources.map((r) => `<div class="tile"><div class="thumb">${img(r.icon)}</div><div class="tile-body"><div class="tile-title">${esc(r.name)}</div>
            <div class="tile-sub">Tier ${r.tier} · ${esc(r.desc || '')}</div></div></div>`).join('')}</div>
          ${ST.sec(tr('Nível do trabalhador × tempo de fabricação', 'Worker level × crafting time'), ST.table(w.wlevels, [
            { key: 'level', label: t('level'), num: true }, { key: 'xp', label: t('xp'), num: true, fmt: (r) => nf(r.xp) },
            { key: 'craftingTime', label: tr('Tempo de fabricação', 'Crafting time'), num: true, fmt: (r) => r.craftingTime + '%' }]))}`;
        return;
      }
      const x = w.workers.find((y) => y.uid === uid);
      if (!x) { el.innerHTML = ST.notFound(); return; }
      const items = crafted(uid).sort((a, b) => a.tier - b.tier || a.level - b.level);
      el.innerHTML = `${back('#/trabalhadores', t('workers'))}
        <div class="detail-head" style="margin-top:12px">${ST.icon(x.card) ? `<img class="hero-art" src="${ST.icon(x.card)}" alt="">` : `<div class="thumb">${img(x.icon)}</div>`}
        <div style="flex:1;min-width:240px">${ST.pageHead(esc(x.name), esc(x.desc || ''))}${ST.tags([x.npc && ST.tag(esc(x.npc), 'hl'), x.building && ST.tag(esc(x.building))].filter(Boolean))}</div></div>
        ${ST.sec(tr('Níveis da construção', 'Building levels'), ST.table(x.levels, [
          { key: 'level', label: t('level'), num: true }, { key: 'userLevel', label: tr('Nível do comerciante', 'Merchant level'), num: true },
          { key: 'gold', label: t('gold'), num: true, fmt: (r) => nf(r.gold) }, { key: 'gems', label: t('gems'), num: true, fmt: (r) => nf(r.gems) },
          { key: 'unlock', label: tr('Desbloqueia', 'Unlocks'), fmt: (r) => (r.unlock ? ST.itemChip(r.unlock.id) : '') }]))}
        ${ST.sec(`${tr('Projetos fabricados', 'Blueprints crafted')} (${items.length})`, ST.table(items, [
          { key: 'name', label: t('name'), fmt: (i) => `<a class="cell-item" href="#/item/${i.uid}">${img(i.uid)}<span>${esc(i.name)}</span></a>` },
          { key: 'tier', label: 'T', num: true }, { key: 'lvl', label: tr('Construção', 'Building'), num: true, sort: (i) => i.workers.find((y) => y.id === uid).lvl, fmt: (i) => i.workers.find((y) => y.id === uid).lvl },
          { key: 'value', label: t('value'), num: true, fmt: (i) => nf(i.value) }, { key: 'time', label: t('time'), num: true, fmt: (i) => dur(i.time) }]))}`;
    },
  });

  // ================================================================ móveis
  const FTYPE = ST.FTYPE = { rack: ['Prateleiras', 'Racks'], bin: ['Depósitos de recursos', 'Resource bins'], chest: ['Baús', 'Trunks'], counter: ['Balcão', 'Counter'],
    pethouse: ['Casas de mascote', 'Pet houses'], indoordeco: ['Decoração interna', 'Indoor decor'], outdoordeco: ['Decoração externa', 'Outdoor decor'],
    walldeco: ['Decoração de parede', 'Wall decor'], floordeco: ['Pisos', 'Floors'] };
  ST.page('moveis', {
    title: () => t('furniture'),
    async render(el, args, query) {
      const [list] = await ST.need('furniture');
      const types = Object.keys(FTYPE).filter((k) => list.some((f) => f.type === k));
      const ty = query.get('t') || 'rack';
      const rows = list.filter((f) => f.type === ty);
      const functional = ['rack', 'bin', 'chest', 'counter'].includes(ty);
      el.innerHTML = ST.pageHead(t('furniture'), tr('Móveis da loja, capacidades e custos por nível.', 'Shop furniture, capacities and costs per level.'), `<div class="form-row">${searchBox('fq')}</div>`) +
        ST.tabs(types.map((k) => [`#/moveis?t=${k}`, `${tr(...FTYPE[k])} (${list.filter((f) => f.type === k).length})`]), `#/moveis?t=${ty}`) +
        (functional ? rows.map((f) => `<section class="panel" style="margin-bottom:14px" data-s="${esc(f.name)}">
          <div class="detail-head"><div class="thumb">${img(ST.firstIcon(...f.levels.map((l) => l.uid).reverse()))}</div><div style="flex:1"><h2 class="d-title">${esc(f.name)}</h2>
          ${f.desc ? `<p class="d-desc">${esc(f.desc)}</p>` : ''}${f.slots.length ? ST.tags(f.slots.map((s) => ST.tag(esc(s.name)))) : ''}</div></div>
          ${ST.table(f.levels, [
            { key: 'level', label: t('level'), num: true },
            ...(ty === 'rack' || ty === 'counter' ? [{ key: 'energyCap', label: tr('Energia', 'Energy'), num: true }, { key: 'maxItems', label: tr('Itens', 'Items'), num: true }] : []),
            ...(ty === 'bin' || ty === 'chest' ? [{ key: 'storageBase', label: tr('Capacidade', 'Capacity'), fmt: (r) => esc(r.storageBase.join(' / ')) }] : []),
            { key: 'size', label: tr('Tamanho', 'Size'), fmt: (r) => r.size.join('×') },
            { key: 'reqLevel', label: tr('Nível req.', 'Req. level'), num: true },
            ...[1, 2, 3, 4, 5].map((k) => ({ key: 'c' + k, label: `${tr('Custo', 'Cost')} ${k}`, num: true,
              fmt: (r) => { const c = r.costs[k - 1]; return c && (c.gold || c.gems) ? `${short(c.gold)} <i class="ic ic-coin"></i>${c.gems ? ` · ${nf(c.gems)} <i class="ic ic-gem"></i>` : ''}${c.time ? `<br><span class="small muted">${dur(c.time)}</span>` : ''}` : ''; } })),
          ])}</section>`).join('') + `<p class="note">${tr('“Custo 1–5” são as colunas de custo da tabela do jogo para cada nível (ouro, gemas e tempo).', '“Cost 1–5” are the game table cost columns for each level (gold, gems and time).')}</p>`
          : `<div class="tiles">${rows.map((f) => `<div class="tile" data-s="${esc(f.name)}"><div class="thumb">${img(f.icon)}</div><div class="tile-body">
            <div class="tile-title">${esc(f.name)}</div><div class="tile-sub">${f.levels[0].size.join('×')}${f.levels[0].costs[0].gold ? ' · ' + short(f.levels[0].costs[0].gold) + ' <i class="ic ic-coin"></i>' : ''}${f.levels[0].costs[0].gems ? ' · ' + nf(f.levels[0].costs[0].gems) + ' <i class="ic ic-gem"></i>' : ''}${f.event ? ' · ' + esc(f.event) : ''}</div></div></div>`).join('')}</div>`);
      bindSearch(el, 'fq', '[data-s]', (n) => n.dataset.s);
    },
  });

  // ================================================================ talentos
  ST.page('talentos', {
    title: () => t('talents'),
    async render(el, args, query) {
      const [st] = await ST.need('skilltree');
      const tab = query.get('t') || 'tree';
      const tabs = [['tree', tr('Árvore de talentos', 'Talent tree')], ['research', tr('Pesquisa avançada', 'Advanced research')],
        ['banner', tr('Estandarte', 'Banner')], ['points', tr('Pontos de talento', 'Talent points')]];
      let body = '';
      if (tab === 'tree') {
        body = st.trees.map((tr_) => `<h2 class="group-title">${esc(tr_.name)}</h2>${tr_.desc ? `<p class="muted">${esc(tr_.desc)}</p>` : ''}
          <div class="tiles">${tr_.nodes.map((n) => `<div class="tile" style="align-items:flex-start"><div class="thumb">${img(n.icon)}</div><div class="tile-body">
            <div class="tile-title">${esc(n.title)} ${n.epic ? '<span class="badge">Épico</span>' : ''}</div><div class="tile-sub">${esc(n.desc || '')}</div>
            <div class="small" style="margin-top:6px">${n.ranks.map((r) => `<span class="badge">${esc(r.value || '')}</span>`).join(' ')}</div>
            ${n.ranks.some((r) => r.empowered) ? `<div class="small muted" style="margin-top:4px">${tr('Fortalecido', 'Empowered')}: ${n.ranks.map((r) => esc(r.empowered || '')).join(' / ')}</div>` : ''}
            ${n.ranks.some((r) => r.gold || r.gems) ? `<div class="small muted">${tr('Custo', 'Cost')}: ${n.ranks.map((r) => [r.gold && short(r.gold) + ' <i class="ic ic-coin"></i>', r.gems && nf(r.gems) + ' <i class="ic ic-gem"></i>'].filter(Boolean).join(' ') || '—').join(' / ')}</div>` : ''}
          </div></div>`).join('')}</div>`).join('');
      } else if (tab === 'research') {
        body = `<p class="muted">${tr('Melhorias disponíveis ao alcançar projetos de tier 14+, por trabalhador e tipo de item.', 'Upgrades available once you reach tier 14+ blueprints, per worker and item type.')}</p>` +
          st.research.map((w) => `<h2 class="group-title">${img(w.icon, '', '')} ${esc(w.name)}</h2>${w.branches.map((b) => `<h3 class="small muted">${esc(b.name)}</h3>${ST.table(b.nodes, [
            { key: 'title', label: tr('Melhoria', 'Upgrade'), fmt: (n) => esc(n.title) }, { key: 'value', label: tr('Efeito', 'Effect'), fmt: (n) => esc(n.value || '') + (n.empowered ? ` <span class="muted">(${esc(n.empowered)})</span>` : '') },
            { key: 'gold', label: t('gold'), num: true, fmt: (n) => short(n.gold) }, { key: 'gems', label: t('gems'), num: true, fmt: (n) => nf(n.gems) },
            { key: 'bp', label: tr('Pergaminhos', 'Scrolls'), num: true, fmt: (n) => nf(n.bp) }])}`).join('')}`).join('');
      } else if (tab === 'banner') {
        body = `<p class="muted">${tr('Melhorias do Estandarte da loja por tipo de item, pagas com emblemas.', 'Shop Banner upgrades per item type, paid with emblems.')}</p>` +
          `<div class="tiles">${st.banner.map((b) => `<div class="panel"><h3>${esc(b.name)}</h3>${b.nodes.map((n) => `<div class="small" style="margin:4px 0"><b>${esc(n.title)}</b> ${esc(n.value || '')} <span class="muted">· ${nf(n.emblems)} ${tr('emblemas', 'emblems')}</span></div>`).join('')}</div>`).join('')}</div>`;
      } else {
        body = ST.table(st.points, [{ key: 'minLevel', label: tr('Nível mínimo', 'Min. level'), num: true }, { key: 'goldCost', label: t('gold'), num: true, fmt: (r) => nf(r.goldCost) },
          { key: 'gemsCost', label: t('gems'), num: true, fmt: (r) => nf(r.gemsCost) }]);
      }
      el.innerHTML = ST.pageHead(t('talents'), '') + ST.tabs(tabs.map(([k, l]) => [`#/talentos?t=${k}`, l]), `#/talentos?t=${tab}`) + body;
    },
  });

  // ================================================================ mascotes
  ST.page('mascotes', {
    title: () => t('pets'),
    async render(el) {
      const [p] = await ST.need('pets');
      const FOOD = { normal: tr('Comum', 'Normal'), superior: tr('Superior', 'Superior'), premium: 'Premium' };
      el.innerHTML = ST.pageHead(t('pets'), tr('Mascotes da loja, preço e desbloqueios de visual.', 'Shop pets, price and cosmetic unlocks.')) +
        `<div class="tiles">${p.pets.map((x) => `<div class="tile"><div class="thumb">${img(x.icon)}</div><div class="tile-body"><div class="tile-title">${esc(x.name)}</div>
          <div class="tile-sub">${x.gold ? short(x.gold) + ' <i class="ic ic-coin"></i>' : ''}${x.gems ? ' · ' + nf(x.gems) + ' <i class="ic ic-gem"></i>' : ''} · ${t('level')} ${x.levelReq}${x.event ? ' · ' + esc(x.event) : ''}</div>
          <div class="tile-sub">${esc(x.houseName || '')}${x.unlocks.length ? ` · ${tr('Visuais nos níveis', 'Cosmetics at levels')} ${x.unlocks.map((u) => u.req).join(', ')}` : ''}</div></div></div>`).join('')}</div>
        <div class="two-col">${ST.sec(tr('Comida', 'Food'), ST.table(p.food, [{ key: 'uid', label: tr('Tipo', 'Type'), fmt: (r) => FOOD[r.uid] || r.uid }, { key: 'xp', label: t('xp'), num: true }]))}
        ${ST.sec(tr('XP por nível', 'XP per level'), ST.table(p.levels, [{ key: 'level', label: t('level'), num: true }, { key: 'xp', label: t('xp'), num: true }]))}</div>`;
    },
  });

  // ================================================================ coleção
  const SET = { champions: ['Campeões', 'Champions'], heroes: ['Heróis', 'Heroes'], workers: ['Trabalhadores', 'Workers'], premiumworkers: ['Trabalhadores premium', 'Premium workers'],
    resourceworkers: ['Trabalhadores de recursos', 'Resource workers'], cityfolks: ['Moradores', 'Townsfolk'] };
  ST.page('colecao', {
    title: () => t('collection'),
    async render(el) {
      const [co, st] = await ST.need('collection', 'skilltree');
      await ST.itemsIndex();
      const bonus = {};
      st.cards.forEach((c) => (bonus[c.family] = bonus[c.family] || []).push(c));
      el.innerHTML = ST.pageHead(t('collection'), tr('Cartas colecionáveis, bônus que concedem e recompensas do livro.', 'Collectible cards, the bonuses they grant and book rewards.'), `<div class="form-row">${searchBox('kq')}</div>`) +
        co.sets.map((s) => `<h2 class="group-title">${esc(tr(...(SET[s.id] || [s.id, s.id])))}</h2><div class="tiles">${
          Object.values(s.cards.reduce((m, c) => ((m[c.family] = m[c.family] || []).push(c), m), {})).map((cards) => {
            const c = cards[0], b = bonus[c.family] || [];
            return `<div class="tile" style="align-items:flex-start" data-s="${esc(c.name)}"><div class="thumb">${img(ST.firstIcon('cc_' + c.family, 'icon_global_' + c.family, c.family + '_head', 'icon_global_class_' + c.family + '_128'))}</div>
              <div class="tile-body"><div class="tile-title">${esc(c.name)}</div><div class="tile-sub">${cards.map((x) => `${esc(x.quality)} (${x.score})`).join(' · ')}</div>
              ${b.map((x) => `<div class="small" style="margin-top:4px">• ${esc(x.text)}</div>`).join('')}</div></div>`;
          }).join('')}</div>`).join('') +
        ST.sec(tr('Recompensas do livro', 'Book rewards'), ST.table(co.rewards, [{ key: 'points', label: tr('Pontos', 'Points'), num: true },
          { key: 'type', label: tr('Recompensa', 'Reward'), fmt: (r) => (r.type === 'item' ? ST.itemChip(r.id, ` × ${esc(r.value)}`) : `${nf(+r.value)} ${r.type === 'gold' ? '<i class="ic ic-coin"></i>' : r.type === 'gems' ? '<i class="ic ic-gem"></i>' : esc(r.type)}`) }]));
      bindSearch(el, 'kq', '.tile', (n) => n.dataset.s);
    },
  });

  // ================================================================ títulos e conquistas
  ST.page('titulos', {
    title: () => t('titles'),
    async render(el, args, query) {
      const [d] = await ST.need('titles');
      const tab = query.get('t') || 'titles';
      const rows = tab === 'titles' ? d.titles.filter((x) => !x.hidden) : d.achievements;
      el.innerHTML = ST.pageHead(t('titles'), '', `<div class="form-row">${searchBox('tq')}</div>`) +
        ST.tabs([['#/titulos?t=titles', `${t('titles')} (${d.titles.filter((x) => !x.hidden).length})`], ['#/titulos?t=ach', `${tr('Conquistas', 'Achievements')} (${d.achievements.length})`]], `#/titulos?t=${tab}`) +
        ST.table(rows, tab === 'titles' ? [
          { key: 'name', label: t('name'), fmt: (r) => `<b>${esc(r.name)}</b>` }, { key: 'family', label: tr('Família', 'Family') },
          { key: 'tier', label: 'Tier', num: true }, { key: 'threshold', label: tr('Meta', 'Goal'), num: true, fmt: (r) => nf(r.threshold) },
        ] : [
          { key: 'name', label: t('name'), fmt: (r) => `<b>${esc(r.name)}</b>` }, { key: 'family', label: tr('Família', 'Family') },
          { key: 'level', label: t('level'), num: true }, { key: 'threshold', label: tr('Meta', 'Goal'), num: true, fmt: (r) => nf(r.threshold) },
          { key: 'reward', label: tr('Recompensa', 'Reward'), fmt: (r) => `${esc(r.rewardVal || '')} ${r.reward === 'gems' ? '<i class="ic ic-gem"></i>' : esc(r.reward || '')}` },
        ]);
      bindSearch(el, 'tq', 'tbody tr');
    },
  });

  // ================================================================ guilda
  ST.page('guilda', {
    title: () => t('guild'),
    async render(el) {
      const [c] = await ST.need('city');
      el.innerHTML = ST.pageHead(t('guild'), tr('Vantagens de guilda: custo e efeito por nível.', 'Guild perks: cost and effect per level.')) +
        `<div class="tiles" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${c.upgrades.map((u) => `<div class="panel"><h3>${esc(u.name)}</h3>
          ${u.desc ? `<p class="note">${esc(u.desc.replace('{0}', 'X'))}</p>` : ''}${ST.table(u.levels, [{ key: 'level', label: t('level'), num: true },
          { key: 'levelReq', label: tr('Nível da guilda', 'Guild level'), num: true }, { key: 'cost', label: t('cost'), num: true, fmt: (r) => nf(r.cost) },
          { key: 'value', label: 'X', num: true }])}</div>`).join('')}</div>`;
    },
  });

  // ================================================================ progressão
  ST.page('progressao', {
    title: () => t('progression'),
    async render(el) {
      const [p] = await ST.need('progression');
      let acc = 0;
      const levels = p.levels.map((l) => ({ ...l, total: (acc += l.xp) }));
      el.innerHTML = ST.pageHead(t('progression'), '') + `<div class="two-col">
        ${ST.sec(tr('Nível do comerciante', 'Merchant level'), ST.table(levels, [{ key: 'level', label: t('level'), num: true },
          { key: 'xp', label: tr('XP para o nível', 'XP for level'), num: true, fmt: (r) => nf(r.xp) },
          { key: 'total', label: tr('XP acumulada', 'Total XP'), num: true, fmt: (r) => nf(r.total) },
          { key: 'etier', label: tr('Tier liberado', 'Unlocked tier'), num: true }]))}
        <div>${ST.sec(tr('Fusão de qualidade', 'Quality fusion'), ST.table(p.fusion, [{ key: 'name', label: t('quality') },
          { key: 'qty', label: tr('Itens necessários', 'Items needed'), num: true }, { key: 'reqQuality', label: tr('Qualidade exigida', 'Required quality') },
          { key: 'successOdds', label: tr('Sucesso', 'Success'), num: true, fmt: (r) => pct(+r.successOdds, 0) }]))}
        ${ST.sec(tr('Amizade', 'Friendship'), ST.table(p.friendship, [{ key: 'level', label: t('level'), num: true }, { key: 'xp', label: t('xp'), num: true },
          { key: 'energyBonus', label: tr('Bônus de energia', 'Energy bonus'), num: true }, { key: 'category', label: tr('Categoria', 'Category') }]))}
        ${ST.sec(tr('Fórmula de poder do herói', 'Hero power formula'), `<p><code>${t('power')} = ${t('atk')} × ${p.constants.adventurer_power_attack_mult} + ${t('def')} × ${p.constants.adventurer_power_defense_mult} + ${t('hp')} × ${p.constants.adventurer_power_hp_mult}</code></p>`,
          tr('Multiplicadores lidos da tabela de constantes do jogo.', 'Multipliers read from the game constants table.'))}</div></div>`;
    },
  });

  // ================================================================ novidades
  ST.page('novidades', {
    title: () => t('updates'),
    async render(el) {
      const [logs, diff] = await ST.need('updates', 'diff');
      await ST.itemsIndex();
      const nm = (x) => esc((x.names && (x.names[ST.lang] || x.names.en || x.names.pt)) || x.uid);
      const FIELD = { value: t('value'), time: t('time'), tier: 'Tier', level: t('level'), xp: t('xp'), favor: tr('Graça', 'Favor'), atk: t('atk'), def: t('def'), hp: t('hp'),
        eva: t('eva'), crit: t('crit'), shieldHp: tr('PV de escudo', 'Shield HP'), resources: tr('Recursos', 'Resources'), components: tr('Componentes', 'Components') };
      const v = (x) => (x && typeof x === 'object' ? esc(Object.entries(x).map(([k, q]) => `${ST.refName(k)} ×${q}`).join(', ')) : nf(x));
      const diffHTML = diff.from ? `<p class="muted">${tr('Comparando', 'Comparing')} ${esc(diff.from.version || diff.from.date)} → ${esc(diff.to.version || diff.to.date)}</p>
        ${ST.sec(`${tr('Itens novos', 'New items')} (${diff.added.length})`, diff.added.length ? `<div class="tags">${diff.added.map((x) => ST.itemChip(x.uid, ` <span class="muted">T${x.tier}</span>`)).join('')}</div>` : `<p class="muted">${t('none')}</p>`)}
        ${ST.sec(`${tr('Itens removidos', 'Removed items')} (${diff.removed.length})`, diff.removed.length ? ST.tags(diff.removed.map((x) => ST.tag(nm(x)))) : `<p class="muted">${t('none')}</p>`)}
        ${ST.sec(`${tr('Itens alterados', 'Changed items')} (${diff.changed.length})`, diff.changed.length ? ST.table(diff.changed, [
          { key: 'uid', label: t('name'), fmt: (x) => ST.itemChip(x.uid) },
          { key: 'diffs', label: tr('Mudanças', 'Changes'), fmt: (x) => x.diffs.map((d) => `<div class="small">${FIELD[d.field] || d.field}: <span class="diff-old">${v(d.old)}</span> → <span class="diff-new">${v(d.new)}</span></div>`).join('') }]) : `<p class="muted">${t('none')}</p>`)}`
        : `<div class="panel"><p>${tr('Esta é a primeira extração registrada. Depois do próximo patch, rode o extrator de novo e esta página vai mostrar automaticamente os itens novos, removidos e com valores alterados.',
          'This is the first recorded extraction. After the next patch, run the extractor again and this page will automatically list new, removed and changed items.')}</p>
          <p class="muted small">${tr('Retrato atual', 'Current snapshot')}: ${esc(diff.to.version || '')} · ${esc(diff.to.date || '')}</p></div>`;
      el.innerHTML = ST.pageHead(t('updates'), '') + ST.sec(tr('Mudanças entre extrações', 'Changes between extractions'), diffHTML) +
        ST.sec(tr('Notas de atualização do jogo', 'Game patch notes'), logs.filter((l) => l.body).map((l) => `<details class="panel" style="margin-bottom:8px"><summary><b>${esc(l.title)}</b></summary>
          <p class="body-text">${clean(l.body.replace(/<br\s*\/?>/gi, '\n'))}</p></details>`).join('') || `<p class="muted">${t('none')}</p>`);
    },
  });
})();
