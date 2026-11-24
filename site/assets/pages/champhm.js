/* Hypermax dos campeões (Comunidade): mesmo motor do Hypermax. Campeões só equipam Familiar (pet) e Canção da Aura
   (os únicos tipos de item "só para campeões" nos arquivos do jogo), os atributos do campeão por nível e as melhorias de rank ("Atributos +x%" somadas até o rank).
   A habilidade de líder do rank aparece na ficha (é bônus de grupo, não entra no poder do próprio campeão).
   Rotas: #/campeoes-hm e #/campeoes-hm/<campeão>?q=&lv=&rk=&sf=&tr=&en=&soon= */
(function () {
  'use strict';
  const { t, tr, esc, nf, img } = ST;
  ST.addI18n({ pt: { champHm: 'Hypermax dos campeões' }, en: { champHm: 'Champion Hypermax' }, es: { champHm: 'Hypermax de campeones' },
    fr: { champHm: 'Hypermax des champions' }, de: { champHm: 'Champion-Hypermax' }, it: { champHm: 'Hypermax dei campioni' }, ru: { champHm: 'Hypermax защитников' },
    uk: { champHm: 'Hypermax чемпіонів' }, tk: { champHm: 'Şampiyon Hypermax' }, ja: { champHm: 'チャンピオンのHypermax' }, ko: { champHm: '챔피언 Hypermax' },
    zh: { champHm: '勇士 Hypermax' }, zh_tr: { champHm: '勇士 Hypermax' } });
  const QN = [['Normal', 'Common'], ['Superior', 'Uncommon'], ['Magistral', 'Flawless'], ['Épico', 'Epic'], ['Lendário', 'Legendary']];
  const statPct = (u) => { const m = /([\d.,]+)\s*%/.exec(u.text || ''); return m ? +m[1].replace(',', '.') / 100 : 0; };
  const isSkill = (u) => !/%/.test(u.text || '');
  const CACHE = {};

  // campeão no formato de "classe" que o motor do Hypermax entende
  function asClass(ch, base, rk) {
    const ups = (ch.upgrades || []).filter((u) => u.rank <= rk);
    const bonus = ups.reduce((a, u) => a + statPct(u), 0);
    const sc = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, v * (1 + bonus)]));
    return {
      ...base, uid: ch.uid, name: ch.name, icon: ST.firstIcon(ch.icon, ch.card) || ch.icon, card: ch.card, element: ch.element,
      stats: { atk: sc(ch.stats.atk), def: sc(ch.stats.def), hp: sc(ch.stats.hp) },
      evasion: ch.evasion, critical: ch.critical, critMult: ch.critMult, aggro: ch.aggro,
      slots: [[{ code: 'xf', name: ST.typeName('xf') }], [{ code: 'xx', name: ST.typeName('xx') }]],
      skillSlots: [], innate: null, cardBonus: [], _bonus: bonus, _skillLv: Math.min((ch.skills || []).length, 1 + ups.filter(isSkill).length),
    };
  }

  ST.page('campeoes-hm', {
    nav: 'campeoes-hm', title: () => t('champHm'),
    async render(el, [uid], query) {
      const [classes, skills, prog, champs] = await ST.need('classes', 'skills', 'progression', 'champions');
      const { d } = await ST.itemsIndex();
      const K = prog.constants || {};
      const E = ST.hmDebug;
      const maxRank = Math.max(...champs.flatMap((c) => (c.upgrades || []).map((u) => u.rank)), 1);
      const o = {
        q: Math.min(4, Math.max(0, +(query.get('q') ?? 4))), lv: [40, 50, 100].includes(+query.get('lv')) ? +query.get('lv') : 50,
        rk: Math.min(maxRank, Math.max(1, +(query.get('rk') || maxRank))), sf: query.get('sf') !== '0', tr: query.get('tr') !== '0',
        en: query.get('en') !== '0', soon: query.get('soon') === '1', col: false, sk: false, profile: null,
      };
      const key = JSON.stringify([o.q, o.lv, o.rk, o.sf, o.tr, o.en, o.soon, d.items.length]);
      if (!CACHE[key]) {
        el.innerHTML = ST.skeleton();
        await new Promise((r) => setTimeout(r, 30));
        const P = E.prepare(d, skills, K, o);
        const byCls = new Map(classes.map((c) => [c.uid, c]));
        CACHE[key] = champs.filter((ch) => byCls.has(ch.class) && ch.stats && ch.stats.atk).map((ch) => {
          const c = asClass(ch, byCls.get(ch.class), o.rk);
          const b = E.optimize(c, P, skills, K, o);
          b.ch = ch;
          return b;
        }).sort((a, b) => b.power - a.power);
      }
      const builds = CACHE[key];
      const qs = () => {
        const p = new URLSearchParams();
        if (o.q !== 4) p.set('q', o.q); if (o.lv !== 50) p.set('lv', o.lv); if (o.rk !== maxRank) p.set('rk', o.rk);
        if (!o.sf) p.set('sf', '0'); if (!o.tr) p.set('tr', '0'); if (!o.en) p.set('en', '0'); if (o.soon) p.set('soon', '1');
        const s = p.toString(); return s ? '?' + s : '';
      };
      const controls = `<div class="form-row hm-ctl">
        <label class="field">${t('quality')}<select class="inp" data-o="q">${QN.map((n, k) => `<option value="${k}" ${k === o.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
        <label class="field">${t('level')}<select class="inp" data-o="lv">${[50, 40, 100].map((l) => `<option value="${l}" ${l === o.lv ? 'selected' : ''}>${l > 50 ? `${tr('Parangon', 'Paragon')} 50` : l}</option>`).join('')}</select></label>
        <label class="field">${tr('Rank', 'Rank')}<select class="inp" data-o="rk">${Array.from({ length: maxRank }, (_, i) => i + 1).map((r) => `<option ${r === o.rk ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" data-o="en" ${o.en ? 'checked' : ''}> ${tr('Encantamentos', 'Enchantments')}</label>
        <label class="check"><input type="checkbox" data-o="sf" ${o.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
        <label class="check"><input type="checkbox" data-o="tr" ${o.tr ? 'checked' : ''}> ${tr('Ascensão + Transcendência', 'Ascension + Transcendence')}</label>
        <label class="check"><input type="checkbox" data-o="soon" ${o.soon ? 'checked' : ''}> ${tr('Itens em breve', 'Upcoming items')}</label></div>`;
      const beta = `<div class="beta-note" role="note"><span class="beta-ic" title="${tr('Em testes', 'In testing')}">${ST.ic('alert')}</span>
        <p>${tr('Estes cálculos ainda estão sendo conferidos com o jogo e podem ter erros: poder, atributos ou a escolha dos itens podem não bater com o que aparece no jogo. Use como referência e confira no jogo antes de gastar recursos.',
          'These calculations are still being checked against the game and may contain errors: power, stats or gear picks can differ from what you see in the game. Use them as a reference and check in the game before spending resources.')}</p></div>`;
      const note = tr('Mesmo motor do Hypermax. Campeões só equipam um Familiar (pet) e uma Canção da Aura, os dois tipos de item que os arquivos do jogo marcam como “só para campeões”; os atributos da Aura somam no próprio campeão. Atributos do campeão por nível vêm dos arquivos do jogo, com as melhorias de rank “Atributos +x%” somadas até o rank escolhido. A habilidade de líder é bônus para o grupo e não entra no poder do campeão.',
        'Same engine as Hypermax. Champions only equip a Familiar (pet) and an Aura Song, the two item types the game files mark as “champions only”; the Aura’s stats add to the champion. Champion stats per level come from the game files, with the rank upgrades “Stats +x%” added up to the chosen rank. The leader skill is a party bonus and does not count toward the champion’s power.');
      const bind = (base) => el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => {
        o[n.dataset.o] = n.type === 'checkbox' ? n.checked : +n.value;
        location.hash = base + qs();
      }));
      const leader = (b) => { const s = (b.ch.skills || [])[b.c._skillLv - 1]; return s ? { s, lv: b.c._skillLv } : null; };

      if (uid) {
        const b = builds.find((x) => x.ch.uid === uid);
        if (!b) { el.innerHTML = ST.notFound(); return; }
        const L = leader(b);
        const gearRows = b.gear.map((g, k) => `<tr><td>${g ? `<a class="cell-item" href="#/item/${g.x.it.uid}">${img(g.x.it.uid)}<span>${esc(g.x.it.name)}<br><span class="small muted">T${g.x.it.tier} · ${esc(b.c.slots[k].map((x) => x.name).join(' / '))}</span></span></a>` : `<span class="muted">${esc(b.c.slots[k].map((x) => x.name).join(' / '))}: —</span>`}</td>
          <td>${g && g.el ? `<a class="cell-item" href="#/item/${g.el.e.uid}"><span class="hm-rune lg">${img(g.el.e.uid)}<em>${ST.hmUI.elIcon(g.el.el)}</em></span><span>${esc(g.el.e.name)}</span></a>` : '—'}</td>
          <td>${g && g.sp ? `<a class="cell-item" href="#/item/${g.sp.e.uid}">${img(g.sp.e.uid)}<span>${esc(g.sp.e.name)}</span></a>` : '—'}</td></tr>`).join('');
        el.innerHTML = `<a class="crumb" href="#/campeoes-hm${qs()}">${ST.ic('left')} ${t('champHm')}</a>${beta}${controls}
          <div class="hm-detail">${ST.hmUI.card(b, builds.indexOf(b) + 1, { ...o, href: '#/campeoes/' + b.ch.uid })}
            <div>${L ? ST.sec(tr('Habilidade de líder', 'Leader skill'), `<div class="list"><div class="row">${ST.icon(L.s.icon) ? `<img src="${ST.icon(L.s.icon)}" alt="">` : ''}<div class="grow"><b>${esc(L.s.name)}</b> <span class="badge">${tr('Nível', 'Rank')} ${L.lv}</span><div class="small">${esc((L.s.effects || []).join(' · '))}</div></div></div></div>`,
              tr('Bônus para o grupo inteiro; sobe de nível com as melhorias de rank.', 'Bonus for the whole party; it levels up with rank upgrades.')) : ''}
              ${ST.sec(tr('Equipamento', 'Gear'), `<div class="table-wrap"><table class="data-table"><thead><tr><th>${t('items')}</th><th>${tr('Elemento', 'Element')}</th><th>${tr('Espírito', 'Spirit')}</th></tr></thead><tbody>${gearRows}</tbody></table></div>`)}
              ${ST.stats([ST.stat(tr('Poder', 'Power'), nf(Math.round(b.power))), ST.stat(tr('Bônus de rank nos atributos', 'Rank bonus to stats'), '+' + Math.round(b.c._bonus * 100) + '%'),
                ST.stat(t('level'), o.lv > 50 ? `${tr('Parangon', 'Paragon')} 50` : o.lv), ST.stat(tr('Rank', 'Rank'), o.rk)])}</div></div>
          ${ST.sec(tr('Cálculo dos atributos', 'Stat calculation'), ST.hmUI.calc(b, o, E.prepare(d, skills, K, o)))}
          <p class="note">${note}</p>`;
        bind('#/campeoes-hm/' + uid);
        return;
      }
      el.innerHTML = ST.pageHead(t('champHm'), tr('O Familiar (pet) e a Canção da Aura de maior poder para cada campeão, com runas, espíritos e as melhorias de rank.',
        'The highest-power Familiar (pet) and Aura Song for each champion, with runes, spirits and rank upgrades.')) + beta + controls +
        `<div class="hm-grid">${builds.map((b, i) => ST.hmUI.card(b, i + 1, { ...o, href: `#/campeoes-hm/${b.ch.uid}${qs()}` })).join('')}</div><p class="note">${note}</p>`;
      bind('#/campeoes-hm');
    },
  });
})();
