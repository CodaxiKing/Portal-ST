/* Montador de herói no mesmo motor do Hypermax: item + qualidade + runa + espírito por espaço, habilidades,
   Forjado nas Estrelas / Transcendência / Livro de Coleção, poder de perfil e de placar, tabela de cálculo,
   missões ao alcance e compartilhamento (link e imagem). Rota: #/montador?c=&lv=&s0=uid:q:runa:espírito&sk=a,b */
(() => {
  const { t, tr, esc, nf, img, short, dec } = ST;
  const QN = [['Normal', 'Common'], ['Superior', 'Uncommon'], ['Magistral', 'Flawless'], ['Épico', 'Epic'], ['Lendário', 'Legendary']];
  // ficha no estilo do jogo: espaço em edição e aba aberta continuam iguais entre uma mudança e outra
  const UI = { slot: 0, tab: 'info', cls: '' };
  // ícones dos atributos (SVG simples, na cor de cada atributo)
  const SVG = {
    hp: '<path d="M12 20.6 4.3 13a5 5 0 0 1 7.1-7.1l.6.6.6-.6A5 5 0 0 1 19.7 13z"/>',
    atk: '<path d="M14.5 3H21v6.5L10 20.5 6.5 17 3 20.5 1.5 19 5 15.5 3.5 14l11-11z"/>',
    def: '<path d="M12 2.5 20 6v6.2c0 4.4-3.4 7.7-8 9.3-4.6-1.6-8-4.9-8-9.3V6z"/>',
    eva: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8"/>',
    crit: '<path d="m12 2 2.6 6.3L21 9l-4.9 4.3L17.6 20 12 16.6 6.4 20l1.5-6.7L3 9l6.4-.7z"/>',
  };
  const sIc = (k) => `<svg viewBox="0 0 24 24" class="hs-sic ${k}" ${k === 'eva' ? 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"' : 'fill="currentColor"'}>${SVG[k]}</svg>`;

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
      if (UI.cls !== c.uid) { UI.cls = c.uid; UI.slot = 0; }
      UI.slot = Math.min(UI.slot, c.slots.length - 1);
      const slotName = (k) => c.slots[k].map((x) => x.name).join(' / ');
      // editor do espaço escolhido: item, qualidade, runa e espírito
      const slotEditor = (k) => {
        const sl = c.slots[k], codes = sl.map((x) => x.code), p = picks[k];
        const opts = P.items.filter((x) => x.codes.some((cd) => codes.includes(cd))).sort((a, b2) => b2.it.tier - a.it.tier || a.it.name.localeCompare(b2.it.name));
        return `<div class="hs-ed"><div class="hs-ed-h"><b>${esc(slotName(k))}</b><span class="small muted">${tr('Espaço', 'Slot')} ${k + 1}/${c.slots.length}</span></div>
          <div class="hs-ed-f"><label class="field">${tr('Item', 'Item')}<select class="inp" data-k="${k}" data-f="uid"><option value="">— ${tr('Vazio', 'Empty')} —</option>${opts.map((x) =>
            `<option value="${x.it.uid}" ${x.it.uid === p.uid ? 'selected' : ''}>T${x.it.tier} · ${esc(x.it.name)}</option>`).join('')}</select></label>
          <label class="field">${t('quality')}<select class="inp" data-k="${k}" data-f="q">${QN.map((n, qi) => `<option value="${qi}" ${qi === p.q ? 'selected' : ''}>${tr(...n)}</option>`).join('')}</select></label>
          <label class="field">${tr('Runa de elemento', 'Element rune')}<select class="inp" data-k="${k}" data-f="ru"><option value="">${tr('Sem runa', 'No rune')}</option>${elems.map((e) => `<option value="${e.e.uid}" ${e.e.uid === p.ru ? 'selected' : ''}>T${e.e.tier} · ${esc(e.e.name)}</option>`).join('')}</select></label>
          <label class="field">${tr('Espírito', 'Spirit')}<select class="inp" data-k="${k}" data-f="sp"><option value="">${tr('Sem espírito', 'No spirit')}</option>${spirits.map((x) => `<option value="${x.e.uid}" ${x.e.uid === p.sp ? 'selected' : ''}>${esc(x.e.name)}</option>`).join('')}</select></label></div></div>`;
      };
      const gearGrid = c.slots.map((sl, k) => `<button type="button" class="hs-slot ${k === UI.slot ? 'on' : ''}" data-slot="${k}" title="${esc(slotName(k))}">
          ${b.gear[k] ? ST.hmUI.gear(b.gear[k], o) : `<span class="hm-it empty"><span class="hs-slot-n">${esc(sl[0].name)}</span></span>`}</button>`).join('');
      const fifth = ST.hmUI.fifthOf ? ST.hmUI.fifthOf(b) : null;
      const actOf = (fam) => b.active.find((a) => !a.spirit && a.f.family === fam);
      const skillHTML = Array.from({ length: nSlots }, (_, i) => {
        const a = chosenF[i] && actOf(chosenF[i]);
        return `<div class="hs-skl ${i === 4 ? 'par' : ''}"><span class="hs-skl-ic">${a ? img(a.f.icon) : `<b>${i + 1}</b>`}${a && a.tt.tier ? `<i>${a.tt.tier}</i>` : ''}</span>
          <div class="hs-skl-b"><select class="inp" data-sk="${i}"><option value="">— ${tr('Habilidade', 'Skill')} ${i + 1}${i === 4 ? ` (${tr('Alma Parangon', 'Paragon Soul')})` : ''} —</option>${pool.map((f) =>
            `<option value="${f.family}" ${chosenF[i] === f.family ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
          ${a ? `<div class="small muted">${esc((a.tt.effects || []).join(' · '))}</div>` : ''}</div></div>`;
      }).join('');
      const innA = c.innate && b.active.find((a) => a.f.kind === 'innate');
      const statRow = (k, label, v, cls) => `<div class="hs-st ${cls || k}">${k === 'el' ? ST.hmUI.elIcon(c.element) : sIc(k)}<span>${label}</span><b>${v}</b></div>`;
      const sheet = `<div class="hs">
          <div class="hs-art"><span class="hs-art-bg" style="background-image:url('${ST.icon(c.card || ('cc_' + c.uid)) || ''}')"></span>${img(c.card || ('cc_' + c.uid))}<span class="hs-lv">${lv > 50 ? `P${lv - 50}` : lv}</span>
            <div class="hs-art-sk">${ST.hmUI.skills(b)}</div></div>
          <div class="hs-card">
            <div class="hs-top"><span class="hs-cls">${img(c.icon)}<em>${lv > 50 ? `P${lv - 50}` : lv}</em></span><div><b>${esc(c.name)}</b><span class="small muted">${esc(c.typeName || '')}</span></div></div>
            <div class="hs-tabs" role="tablist"><button type="button" data-tab="info" class="${UI.tab === 'info' ? 'on' : ''}">${tr('Info', 'Info')}</button><button type="button" data-tab="skills" class="${UI.tab === 'skills' ? 'on' : ''}">${tr('Habilidades', 'Skills')}</button></div>
            <div class="hs-body" data-pane="info" ${UI.tab === 'info' ? '' : 'hidden'}>
              <div class="hs-left">
                <div class="hs-pw">${ST.ic('star')}<b>${nf(Math.round(b.profile.power))}</b></div>
                <div class="small muted hs-pw2">${tr('Placar', 'Leaderboard')}: ${nf(Math.round(b.power))}</div>
                ${statRow('hp', t('hp'), nf(Math.round(b.profile.hp)))}${statRow('atk', t('atk'), nf(Math.round(b.profile.atk)))}${statRow('def', t('def'), nf(Math.round(b.profile.def)))}
                ${statRow('eva', tr('Esquiva', 'Evasion'), Math.round(b.eva * 100) + '%')}${statRow('crit', tr('Crítico', 'Crit'), Math.round(Math.min(b.crit, 1) * 100) + '%')}
                ${statRow('el', tr('Elemento', 'Element'), nf(Math.round(b.E)))}
              </div>
              <div class="hs-gear">${gearGrid}</div>
            </div>
            <div class="hs-body sk" data-pane="skills" ${UI.tab === 'skills' ? '' : 'hidden'}>
              ${innA ? `<div class="hs-skl inn"><span class="hs-skl-ic">${img(innA.f.icon)}${innA.tt.tier ? `<i>${innA.tt.tier}</i>` : ''}</span><div class="hs-skl-b"><b>${esc(innA.tt.name || innA.f.name)}</b> <span class="small muted">${tr('inata', 'innate')}</span><div class="small muted">${esc((innA.tt.effects || []).join(' · '))}</div></div></div>` : ''}
              ${skillHTML || `<p class="muted small">${tr('Nenhum espaço de habilidade neste nível.', 'No skill slots at this level.')}</p>`}
            </div>
          </div>
        </div>`;
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
        ${sheet}
        ${slotEditor(UI.slot)}
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
      el.querySelectorAll('[data-slot]').forEach((n) => n.addEventListener('click', () => {
        UI.slot = +n.dataset.slot;
        el.querySelectorAll('[data-slot]').forEach((x) => x.classList.toggle('on', x === n));
        const ed = el.querySelector('.hs-ed'); ed.outerHTML = slotEditor(UI.slot);
        bindSlotFields(); el.querySelector('.hs-ed').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }));
      el.querySelectorAll('[data-tab]').forEach((n) => n.addEventListener('click', () => {
        UI.tab = n.dataset.tab;
        el.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === n));
        el.querySelectorAll('[data-pane]').forEach((x) => { x.hidden = x.dataset.pane !== UI.tab; });
      }));
      el.querySelector('#lv').addEventListener('change', () => go());
      el.querySelectorAll('[data-o]').forEach((n) => n.addEventListener('change', () => go()));
      const bindSlotFields = () => el.querySelectorAll('.hs-ed [data-f]').forEach((n) => n.addEventListener('change', () => {
        const p = picks[+n.dataset.k]; p[n.dataset.f] = n.dataset.f === 'q' ? +n.value : n.value; go();
      }));
      bindSlotFields();
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
