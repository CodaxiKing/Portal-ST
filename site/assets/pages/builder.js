/* Montador de herói no mesmo motor do Hypermax: item + qualidade + runa + espírito por espaço, habilidades,
   Forjado nas Estrelas / Transcendência / Livro de Coleção, poder de perfil e de placar, tabela de cálculo,
   missões ao alcance e compartilhamento (link e imagem). Rota: #/montador?c=&lv=&s0=uid:q:runa:espírito&sk=a,b */
(() => {
  const { t, tr, esc, nf, img, short, dec } = ST;
  const QN = [['Normal', 'Common'], ['Superior', 'Uncommon'], ['Magistral', 'Flawless'], ['Épico', 'Epic'], ['Lendário', 'Legendary']];

  /* ---------------------------------------------------------------- imagem para compartilhar (canvas) */
  const loadImg = (src) => new Promise((res) => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  ST.buildImage = async function (b, o, title) {
    const W = 1080, H = 1350, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#d7a24a';
    g.fillStyle = '#121214'; g.fillRect(0, 0, W, H);
    const grd = g.createRadialGradient(W * 0.75, 140, 40, W * 0.75, 140, 700); grd.addColorStop(0, 'rgba(215,162,74,.18)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    const font = (w, s) => `${w} ${s}px Geist, system-ui, sans-serif`;
    const mono = (w, s) => `${w} ${s}px "Geist Mono", ui-monospace, monospace`;
    const round = (x, y, w, h, r, fill, stroke) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } };
    // cabeçalho
    round(60, 60, 150, 150, 32, '#1e1e22');
    const cls = await loadImg(ST.icon(b.c.icon)); if (cls) g.drawImage(cls, 75, 75, 120, 120);
    g.fillStyle = '#f2f2f4'; g.font = font(700, 64); g.fillText(b.c.name, 240, 125);
    g.fillStyle = accent; g.font = mono(700, 54); g.fillText('★ ' + nf(Math.round(b.power)), 240, 195);
    g.fillStyle = '#9a9aa5'; g.font = mono(500, 28); g.fillText(`${tr('perfil', 'profile')} ${nf(Math.round(b.profile.power))} · ${t('level')} ${b.lv} · ${tr('elemento', 'element')} ${Math.round(b.E)}`, 240, 240);
    // habilidades
    let x = 60;
    for (const a of b.active.filter((a) => !a.spirit)) {
      round(x, 290, 96, 96, 20, '#1e1e22');
      const im = await loadImg(ST.icon(a.f.icon)); if (im) g.drawImage(im, x + 6, 296, 84, 84);
      x += 112;
    }
    // atributos
    const stats = [[t('hp'), nf(Math.round(b.hp))], [t('atk'), nf(Math.round(b.atk))], [t('def'), nf(Math.round(b.def))], [tr('ESCUDO', 'SHIELD'), nf(Math.round(b.shield))],
      ['EVA', Math.round(b.eva * 100) + '%'], [tr('CRÍT', 'CRIT'), Math.round(Math.min(b.crit, 1) * 100) + '%'], [tr('DANO CRÍT', 'CRIT DMG'), '×' + dec(b.cm, 2)], [tr('AMEAÇA', 'THREAT'), nf(b.aggro)]];
    stats.forEach(([k, v], i) => {
      const cx = 60 + (i % 4) * 245, cy = 420 + Math.floor(i / 4) * 120;
      round(cx, cy, 230, 104, 18, '#1e1e22');
      g.fillStyle = '#9a9aa5'; g.font = mono(600, 22); g.fillText(String(k).toUpperCase(), cx + 20, cy + 38);
      g.fillStyle = '#f2f2f4'; g.font = mono(700, 34); g.fillText(v, cx + 20, cy + 82);
    });
    // equipamento
    for (let i = 0; i < b.gear.length; i++) {
      const it = b.gear[i]; if (!it) continue;
      const cx = 60 + (i % 3) * 330, cy = 690 + Math.floor(i / 3) * 300;
      round(cx, cy, 310, 280, 26, '#1e1e22', accent);
      const im = await loadImg(ST.icon(it.x.it.uid)); if (im) g.drawImage(im, cx + 75, cy + 40, 160, 160);
      g.fillStyle = '#5a2a1c'; g.beginPath(); g.arc(cx + 38, cy + 38, 24, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.font = mono(700, 22); g.textAlign = 'center'; g.fillText(String(it.x.it.tier), cx + 38, cy + 46); g.textAlign = 'left';
      if (it.el) { const r = await loadImg(ST.icon(it.el.e.uid)); if (r) g.drawImage(r, cx + 250, cy + 150, 44, 44); }
      if (it.sp) { const r = await loadImg(ST.icon(it.sp.e.uid)); if (r) g.drawImage(r, cx + 250, cy + 205, 44, 44); }
      g.fillStyle = '#d0d0d6'; g.font = font(600, 24);
      const name = it.x.it.name.length > 22 ? it.x.it.name.slice(0, 21) + '…' : it.x.it.name;
      g.fillText(name, cx + 20, cy + 255);
    }
    g.fillStyle = '#9a9aa5'; g.font = font(600, 26); g.fillText(title || 'Portal Shop Titans', 60, H - 50);
    return new Promise((res) => c.toBlob(res, 'image/png'));
  };
  ST.shareBuild = async function (b, o, url, title) {
    const blob = await ST.buildImage(b, o, title);
    const file = new File([blob], `${b.c.uid}-build.png`, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: b.c.name, url }); return 'shared'; } catch (e) { /* cancelado: cai para download */ }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    return 'downloaded';
  };

  /* ---------------------------------------------------------------- página */
  /* Build a partir dos parâmetros do link (#/montador?c=&lv=&s0=uid:q:runa:espírito&sk=...). Usado pelo montador,
     pelo comparador e pela ficha pública. */
  ST.buildFromQuery = async function (query) {
    const [classes, skills, prog, zones] = await ST.need('classes', 'skills', 'progression', 'quests');
    const { d } = await ST.itemsIndex();
    const K = prog.constants || {};
    const c = classes.find((x) => x.uid === query.get('c')) || classes.find((x) => x.uid === 'astramancer') || classes[0];
    const o = { q: 4, lv: Math.min(+(query.get('lv') || 50), 100), tr: query.get('tr') !== '0', sf: query.get('sf') !== '0', col: query.get('col') !== '0',
      en: true, sk: true, soon: query.get('soon') === '1' };
    const E = ST.hmDebug;
    const P = E.prepare(d, skills, K, o); // runas e espíritos na qualidade Lendária; ajustados por espaço abaixo
    const QM = [1, K.item_power_uncommon_mult || 1.25, K.item_power_flawless_mult || 1.5, K.item_power_epic_mult || 2, K.item_power_legd_mult || 3];
    const { lv, ctx } = E.makeCtx(c, skills, K, o);
    const nSlots = (c.skillSlots || []).filter((l) => l <= lv).length;
    const allowed = (tt) => (tt.classes || []).some((x) => x === '*' || x === c.uid || x === c.type);
    const pool = skills.filter((f) => (f.kind === 'hero' || f.kind === 'mastery') && f.tiers.some(allowed)).sort((a, b) => a.name.localeCompare(b.name));
    const byFam = new Map(skills.map((f) => [f.family, f]));
    const elems = P.elements.slice().sort((a, b) => b.e.tier - a.e.tier || a.e.name.localeCompare(b.e.name));
    const spirits = P.spirits.slice().sort((a, b) => (b.e.tier || 0) - (a.e.tier || 0) || a.e.name.localeCompare(b.e.name));
    const itemOf = (uid, q) => { // item com melhorias e a qualidade deste espaço
      const it = d.items.find((i) => i.uid === uid); if (!it) return null;
      const base = P.items.find((x) => x.it.uid === uid);
      const steps = [...(o.sf ? it.starforged || [] : []), ...(o.tr ? [...(it.ascension || []), ...(it.transcendence || [])] : [])];
      const s = steps.length ? ST.applySteps(it, steps).stats : it.stats;
      const m = QM[q];
      return { it, codes: base ? base.codes : [it.type], core: { atk: s.atk * m, def: s.def * m, hp: s.hp * m, eva: s.eva || 0, crit: s.crit || 0 } };
    };
    const scaleEnch = (e, q) => e && { ...e, s: { atk: e.s.atk / P.qm * QM[q], def: e.s.def / P.qm * QM[q], hp: e.s.hp / P.qm * QM[q] } };
    // escolhas vindas do link
    const picks = c.slots.map((sl, k) => {
      const [uid, q, ru, sp] = (query.get('s' + k) || '').split(':');
      return { uid: uid || '', q: Math.min(4, Math.max(0, q === undefined || q === '' ? 4 : +q)), ru: ru || '', sp: sp || '' };
    });
    const chosenF = (query.get('sk') || '').split(',').filter((f) => byFam.has(f)).slice(0, nSlots);
    const gear = picks.map((p) => {
      const x = p.uid ? itemOf(p.uid, p.q) : null;
      if (!x) return null;
      return { x, q: p.q, qm: QM[p.q], el: scaleEnch(P.elements.find((e) => e.e.uid === p.ru), p.q) || null, sp: scaleEnch(P.spirits.find((s) => s.e.uid === p.sp), p.q) || null };
    });
    const b = E.finish(c, lv, ctx, gear, chosenF.map((f) => byFam.get(f)));
    return { classes, skills, prog, zones, d, K, c, o, E, P, lv, nSlots, pool, byFam, elems, spirits, picks, chosenF, b };
  };

  ST.page('montador', {
    nav: 'montador', title: () => t('builder'),
    async render(el, args, query) {
      const R0 = await ST.buildFromQuery(query);
      const { classes, zones, c, o, E, P, lv, nSlots, pool, elems, spirits, picks, b, skills, K } = R0;
      let chosenF = R0.chosenF.slice();
      const share = () => {
        const q = new URLSearchParams({ c: c.uid, lv: String(lv) });
        if (!o.tr) q.set('tr', '0'); if (!o.sf) q.set('sf', '0'); if (!o.col) q.set('col', '0');
        picks.forEach((p, k) => { if (p.uid) q.set('s' + k, [p.uid, p.q, p.ru, p.sp].join(':')); });
        if (chosenF.length) q.set('sk', chosenF.join(','));
        return location.href.split('#')[0] + '#/build?' + q.toString(); // ficha pública (tem botão para editar)
      };
      const slotHTML = c.slots.map((sl, k) => {
        const codes = sl.map((x) => x.code);
        const opts = P.items.filter((x) => x.codes.some((cd) => codes.includes(cd))).sort((a, b2) => b2.it.tier - a.it.tier || a.it.name.localeCompare(b2.it.name));
        const p = picks[k];
        return `<div class="bd-slot"><div class="bd-ic">${p.uid ? img(p.uid) : '<span class="ph"></span>'}</div><div class="bd-f">
          <select class="inp" data-k="${k}" data-f="uid"><option value="">— ${esc(sl.map((x) => x.name).join(' / '))} —</option>${opts.map((x) =>
            `<option value="${x.it.uid}" ${x.it.uid === p.uid ? 'selected' : ''}>T${x.it.tier} · ${esc(x.it.name)}</option>`).join('')}</select>
          <div class="bd-row"><select class="inp" data-k="${k}" data-f="q">${QN.map((n, qi) => `<option value="${qi}" ${qi === p.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select>
          <select class="inp" data-k="${k}" data-f="ru"><option value="">${tr('Sem runa', 'No rune')}</option>${elems.map((e) => `<option value="${e.e.uid}" ${e.e.uid === p.ru ? 'selected' : ''}>T${e.e.tier} · ${esc(e.e.name)}</option>`).join('')}</select>
          <select class="inp" data-k="${k}" data-f="sp"><option value="">${tr('Sem espírito', 'No spirit')}</option>${spirits.map((s) => `<option value="${s.e.uid}" ${s.e.uid === p.sp ? 'selected' : ''}>${esc(s.e.name)}</option>`).join('')}</select></div></div></div>`;
      }).join('');
      const skillHTML = Array.from({ length: nSlots }, (_, i) => `<select class="inp" data-sk="${i}"><option value="">— ${tr('Habilidade', 'Skill')} ${i + 1}${i === 4 ? ` (${tr('Alma Parangon', 'Paragon Soul')})` : ''} —</option>${pool.map((f) =>
        `<option value="${f.family}" ${chosenF[i] === f.family ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>`).join('');
      const party = (l) => b.profile.power * (l.party || 1);
      const best = zones.map((z) => {
        const ok = z.levels.filter((l) => l.power && l.power <= party(l));
        return { z, ok: ok.length, total: z.levels.filter((l) => l.power).length };
      }).filter((r) => r.total);
      el.innerHTML = ST.pageHead(t('builder'), tr('Monte o seu herói peça por peça: item, qualidade, runa e espírito em cada espaço, e as habilidades. O cálculo é o mesmo do Hypermax.',
        'Build your hero piece by piece: item, quality, rune and spirit in each slot, plus skills. Same calculation as Hypermax.')) + `
        <div class="form-row">
          <label class="field">${t('classes')}<select class="inp" id="cls">${Object.entries(classes.reduce((m, x) => ((m[x.typeName] = m[x.typeName] || []).push(x), m), {})).map(([gname, cs]) =>
            `<optgroup label="${esc(gname)}">${cs.map((x) => `<option value="${x.uid}" ${x.uid === c.uid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
          <label class="field">${t('level')}<input class="inp" type="number" id="lv" min="1" max="${ST.maxLevel(c) === 100 ? 100 : 50}" value="${lv}"></label>
          <label class="check"><input type="checkbox" data-o="sf" ${o.sf ? 'checked' : ''}> ${tr('Forjado nas Estrelas', 'Starforged')}</label>
          <label class="check"><input type="checkbox" data-o="tr" ${o.tr ? 'checked' : ''}> ${tr('Ascensão + Transcendência', 'Ascension + Transcendence')}</label>
          <label class="check"><input type="checkbox" data-o="col" ${o.col ? 'checked' : ''}> ${tr('Livro de Coleção', 'Collection book')}</label></div>
        <div class="tags" style="margin-bottom:14px"><button class="chip primary" id="hyper">${ST.ic('star')} ${tr('Carregar build Hypermax', 'Load Hypermax build')}</button>
          <button class="chip" id="clear">${tr('Limpar', 'Clear')}</button>
          <button class="chip" id="copy">${tr('Copiar link do build', 'Copy build link')}</button>
          <button class="chip" id="img">${tr('Compartilhar imagem', 'Share image')}</button><span class="small muted" id="msg"></span></div>
        <div class="bd-grid">
          <div>${ST.sec(tr('Equipamento', 'Gear'), `<div class="bd-slots">${slotHTML}</div>`)}
            ${ST.sec(tr('Habilidades', 'Skills'), `<div class="bd-skills">${skillHTML || `<p class="muted small">${tr('Nenhum espaço de habilidade neste nível.', 'No skill slots at this level.')}</p>`}</div>`,
              c.innate ? `${tr('Inata', 'Innate')}: ${esc(c.innate.names && c.innate.names[0] || '')}` : '')}</div>
          <div>${ST.hmUI.card(b, '—', { ...o, href: '#/classes/' + c.uid })}
            ${ST.stats([ST.stat(tr('Poder no placar', 'Leaderboard power'), nf(Math.round(b.power))), ST.stat(tr('Poder no perfil', 'Profile power'), nf(Math.round(b.profile.power)))])}</div>
        </div>
        ${b.gear.some(Boolean) ? ST.sec(tr('Cálculo dos atributos', 'Stat calculation'), ST.hmUI.calc(b, o, P)) : ''}
        ${ST.sec(tr('Missões ao alcance', 'Quests within reach'), ST.table(best, [
          { key: 'z', label: tr('Área', 'Area'), sort: (r) => r.z.name, fmt: (r) => `<a href="#/missoes/${r.z.id}">${esc(r.z.name)}</a>` },
          { key: 'ok', label: tr('Níveis ok', 'Levels ok'), num: true, fmt: (r) => `<span class="${r.ok === r.total ? 'ok' : r.ok ? '' : 'bad'}">${r.ok}/${r.total}</span>` }]),
          tr('Compara o poder recomendado com um grupo de heróis iguais a este (poder de perfil × tamanho do grupo).', 'Compares recommended power with a party of heroes like this one (profile power × party size).'))}`;
      const go = (extra = {}) => {
        const q = new URLSearchParams({ c: c.uid, lv: String(el.querySelector('#lv').value || lv) });
        ['sf', 'tr', 'col'].forEach((k) => { if (!el.querySelector(`[data-o="${k}"]`).checked) q.set(k, '0'); });
        picks.forEach((p, k) => { if (p.uid) q.set('s' + k, [p.uid, p.q, p.ru, p.sp].join(':')); });
        if (chosenF.filter(Boolean).length) q.set('sk', chosenF.filter(Boolean).join(','));
        for (const [k, v] of Object.entries(extra)) if (v === '') q.delete(k); else q.set(k, v);
        location.hash = '#/montador?' + q.toString();
      };
      el.querySelector('#cls').addEventListener('change', (e) => { location.hash = '#/montador?c=' + e.target.value; });
      el.querySelector('#lv').addEventListener('change', () => go());
      el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => go()));
      el.querySelectorAll('[data-f]').forEach((n) => n.addEventListener('change', () => {
        const p = picks[+n.dataset.k]; p[n.dataset.f] = n.dataset.f === 'q' ? +n.value : n.value; go();
      }));
      el.querySelectorAll('[data-sk]').forEach((n) => n.addEventListener('change', () => { chosenF[+n.dataset.sk] = n.value; go(); }));
      el.querySelector('#clear').addEventListener('click', () => { location.hash = `#/montador?c=${c.uid}&lv=${lv}`; });
      el.querySelector('#hyper').addEventListener('click', () => { // melhor build do motor para esta classe
        const r = E.optimize(c, P, skills, K, o);
        r.gear.forEach((g2, k) => { picks[k] = g2 ? { uid: g2.x.it.uid, q: 4, ru: g2.el ? g2.el.e.uid : '', sp: g2.sp ? g2.sp.e.uid : '' } : { uid: '', q: 4, ru: '', sp: '' }; });
        chosenF = r.chosen.map((f) => f.family);
        go();
      });
      const msg = (txt) => { el.querySelector('#msg').textContent = txt; };
      el.querySelector('#copy').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(share()); msg(tr('Link copiado.', 'Link copied.')); } catch (e) { prompt('URL', share()); }
      });
      el.querySelector('#img').addEventListener('click', async () => {
        msg(tr('Gerando imagem…', 'Generating image…'));
        const r = await ST.shareBuild(b, o, share(), 'Portal Shop Titans · ' + t('builder'));
        msg(r === 'shared' ? tr('Compartilhado.', 'Shared.') : tr('Imagem baixada.', 'Image downloaded.'));
      });
    },
  });
})();
