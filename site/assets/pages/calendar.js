/* Calendário de eventos: datas que estão nos arquivos do jogo (lançamento de itens, móveis, skins, decorações,
   visuais, mascotes e eventos de login), em grade do mês + lista, com exportação .ics.
   Rota: #/calendario?m=2026-11&k=item,furniture  (k vazio = todos os tipos) */
(() => {
  const { t, tr, esc, nf, img } = ST;
  ST.addI18n({ pt: { calendar: 'Calendário' }, en: { calendar: 'Calendar' }, es: { calendar: 'Calendario' }, fr: { calendar: 'Calendrier' },
    de: { calendar: 'Kalender' }, it: { calendar: 'Calendario' } });

  /* ---------------------------------------------------------------- .ics: texto gerado por ST.icsText (st-pure.js) */
  ST.icsFile = function (events, name) {
    const blob = new Blob([ST.icsText(events)], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name || 'shop-titans.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  /* Um evento por dia, juntando o que sai naquele dia. */
  ST.icsFromEntries = (entries, label) => {
    const byDay = new Map();
    entries.forEach((e) => { if (!byDay.has(e.d)) byDay.set(e.d, []); byDay.get(e.d).push(e); });
    return [...byDay.entries()].map(([d, list]) => ({
      uid: `${label || 'st'}-${d}`, date: d,
      title: `Shop Titans: ${list.length === 1 ? list[0].n : `${list.length} ${tr('novidades', 'new things')}`}`,
      desc: list.map((e) => `${KIND[e.k] ? tr(...KIND[e.k]) : e.k}: ${e.n}`).join('\n'),
    }));
  };

  const KIND = {
    item: ['Item', 'Item'], furniture: ['Móvel', 'Furniture'], skin: ['Skin de item', 'Item skin'], fskin: ['Skin de móvel', 'Furniture skin'],
    deco: ['Decoração', 'Decoration'], look: ['Visual de herói', 'Hero look'], pet: ['Mascote', 'Pet'], login: ['Evento de login', 'Login event'],
    community: ['Evento de comunidade', 'Community event'], caprice: ['Loja do Capricho do Rei', 'King’s Caprice shop'], caravan: ['Caravana', 'Caravan'],
  };
  const KIND_IC = { item: 'swords', furniture: 'box', skin: 'star', fskin: 'star', deco: 'star', look: 'star', pet: 'star', login: 'calendar' };
  const noDate = (d) => !d || d >= '2090';
  const fmtDate = (d, opt) => new Date(d + 'T12:00').toLocaleDateString(ST.locale, opt || { day: '2-digit', month: 'short', year: 'numeric' });

  ST.page('calendario', {
    nav: 'calendario', title: () => t('calendar'),
    async render(el, args, query) {
      const [furniture, misc, cal, evs] = await ST.need('furniture', 'misc', 'calendar', 'events');
      const { d } = await ST.itemsIndex();
      // tudo vira {d, k, u, n, href?}
      const all = [];
      d.items.forEach((i) => { if (i.releaseAt) all.push({ d: String(i.releaseAt).slice(0, 10), k: 'item', u: i.uid, n: i.name, href: '#/item/' + i.uid, tier: i.tier }); });
      furniture.forEach((f) => { if (f.releaseAt) all.push({ d: String(f.releaseAt).slice(0, 10), k: 'furniture', u: f.icon, n: f.name, href: '#/moveis' }); });
      (misc.skins.hero || []).forEach((s) => { if (s.release && s.n) all.push({ d: s.release.slice(0, 10), k: 'skin', u: s.id, n: s.n, href: '#/skins' }); });
      (misc.skins.furniture || []).forEach((s) => { if (s.release && s.n) all.push({ d: s.release.slice(0, 10), k: 'fskin', u: s.id, n: s.n, href: '#/skins' }); });
      cal.releases.forEach((r) => all.push({ ...r }));
      cal.logins.forEach((g) => all.push({ d: g.d, k: 'login', u: ST.icon(g.icon) ? g.icon : 'icon_login_event_default', n: g.n, login: g }));
      // eventos de comunidade: sem data nos arquivos; quando o tema é o mesmo de um evento de login, vão para a mesma data (aproximada)
      const loginByTheme = new Map(cal.logins.map((g) => [g.id, g]));
      (evs.community || []).forEach((c) => {
        const g = loginByTheme.get(c.theme) || loginByTheme.get(c.id);
        if (g) all.push({ d: g.d, k: 'community', u: ST.icon(c.icon) ? c.icon : 'icon_news_header_community_event', n: c.name, comm: c, href: '#/comunidade-eventos?id=' + c.id });
      });
      // loja de Fichas do Capricho do Rei: data em que cada projeto entra no sorteio (só dos últimos 30 dias em diante)
      const capFrom = ST.addDays(ST.today(), -30);
      ((evs.king || {}).shop || []).forEach((x) => { if (x.e >= capFrom) all.push({ d: x.e, k: 'caprice', u: x.u, n: x.n, href: '#/capricho' }); });
      // Caravana: dias calculados a partir do dia marcado (60 dias)
      const car = ST.caravanAnchor ? await ST.caravanAnchor() : null;
      if (car) ST.caravanProject(evs.caravan.days, car, ST.addDays(ST.today(), -15), 75).forEach((x) => {
        const pl = evs.caravan.pools.find((p2) => p2.id === x.day.theme);
        all.push({ d: x.date, k: 'caravan', u: 'img_caravan_minigame_banner_' + x.day.theme, n: (pl ? pl.name : x.day.theme) + ` (${x.day.day})`, href: '#/caravana?t=' + x.day.theme + '&dia=' + x.day.uid });
      });
      // eventos primeiro, depois quem tem ícone (para a grade e a lista mostrarem os ícones dos eventos)
      const PRI = { login: 0, community: 0.5, caravan: 0.7, item: 1, caprice: 8, furniture: 2, skin: 3, fskin: 4, deco: 5, look: 6, pet: 7 };
      all.sort((a, b) => (PRI[a.k] ?? 9) - (PRI[b.k] ?? 9) || (ST.icon(b.u) ? 1 : 0) - (ST.icon(a.u) ? 1 : 0));
      const EV = (e) => e.k === 'login' || e.k === 'community' || e.k === 'caravan';
      const icons = (list, n) => list.filter((e) => ST.icon(e.u)).slice(0, n);
      const dated = all.filter((e) => !noDate(e.d)), undated = all.length - dated.length;
      const today = ST.today();
      const kinds = Object.keys(KIND).filter((k) => dated.some((e) => e.k === k));
      const sel = new Set((query.get('k') || '').split(',').filter((k) => KIND[k]));
      const on = (e) => !sel.size || sel.has(e.k);
      // mês mostrado: ?m=, senão o mês atual
      const m0 = /^\d{4}-\d{2}$/.test(query.get('m') || '') ? query.get('m') : today.slice(0, 7);
      const [Y, M] = m0.split('-').map(Number);
      const monthKey = (y, m) => `${y}-${String(m).padStart(2, '0')}`;
      const prev = M === 1 ? monthKey(Y - 1, 12) : monthKey(Y, M - 1), next = M === 12 ? monthKey(Y + 1, 1) : monthKey(Y, M + 1);
      const inMonth = dated.filter((e) => e.d.startsWith(m0) && on(e));
      const byDay = new Map();
      inMonth.forEach((e) => { const k = +e.d.slice(8, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(e); });
      const days = new Date(Y, M, 0).getDate(), first = (new Date(Y, M - 1, 1).getDay() + 6) % 7; // semana começa na segunda
      const wd = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(ST.locale, { weekday: 'short' }));
      const cells = [];
      for (let i = 0; i < first; i++) cells.push('<div class="cal-cell empty"></div>');
      for (let dd = 1; dd <= days; dd++) {
        const list = byDay.get(dd) || [], key = monthKey(Y, M) + '-' + String(dd).padStart(2, '0');
        const cnt = {};
        list.forEach((e) => (cnt[e.k] = (cnt[e.k] || 0) + 1));
        cells.push(`<${list.length ? `a href="#cal-${key}"` : 'div'} class="cal-cell ${key === today ? 'today' : ''} ${list.length ? 'has' : ''} ${key > today ? 'future' : ''}">
          <span class="cal-n">${dd}</span>${list.length ? `<span class="cal-ics">${(list.some((e) => EV(e)) ? list.filter(EV).slice(0, 2) : icons(list, 2)).map((e) =>
            `<span class="cal-ic ${EV(e) ? 'ev' : ''}" title="${esc(e.n)}">${img(e.u)}</span>`).join('')}</span>` : ''}${Object.entries(cnt).map(([k, n]) => `<span class="cal-dot k-${k}" title="${esc(tr(...KIND[k]))}">${n}</span>`).join('')}</${list.length ? 'a' : 'div'}>`);
      }
      const q = (extra) => {
        const p = new URLSearchParams({ m: m0 });
        if (sel.size) p.set('k', [...sel].join(','));
        for (const [k, v] of Object.entries(extra)) if (v === '') p.delete(k); else p.set(k, v);
        return '#/calendario?' + p.toString();
      };
      const entryHTML = (e) => {
        const icon = ST.icon(e.u) ? (EV(e) ? `<span class="cal-evic">${img(e.u)}</span>` : img(e.u)) : `<span class="cal-ph">${ST.ic(KIND_IC[e.k] || 'star')}</span>`;
        const rw = (x) => (x.t === 'gems' ? `<span class="cal-rw" title="${nf(x.q)} ${t('gems')}">${ST.ic('gem')}<em>${nf(x.q)}</em></span>`
          : ST.icon(x.id) ? `<span class="cal-rw" title="${esc(x.id)}">${img(x.id)}${x.q > 1 ? `<em>${nf(x.q)}</em>` : ''}</span>` : '');
        const extra = e.login ? `<div class="cal-rws">${e.login.days.map((d) => `<span class="cal-dayrw ${d.sp ? 'sp' : ''}"><b>${d.n}</b>${d.r.map(rw).join('')}</span>`).join('')}</div>
          <div class="small muted">${e.login.days.length} ${tr('dias', 'days')} · ${tr('data de criação nos arquivos; o evento costuma começar depois', 'creation date in the files; the event usually starts later')}</div>` : '';
        const commTxt = e.comm ? `<div class="small muted">${esc(e.comm.desc || '')} · ${tr('data aproximada: mesmo tema do evento de login', 'approximate date: same theme as the login event')}</div>` : '';
        const inner = `${icon}<div class="grow"><b>${esc(e.n)}</b> <span class="badge k-${e.k}">${esc(tr(...KIND[e.k]))}</span>${e.tier ? ` <span class="small muted">T${e.tier}</span>` : ''}${extra}${commTxt}</div>`;
        return e.href ? `<a class="row" href="${e.href}">${inner}</a>` : `<div class="row">${inner}</div>`;
      };
      const dayList = [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([dd, list]) => {
        const key = monthKey(Y, M) + '-' + String(dd).padStart(2, '0');
        return `<div class="cal-day" id="cal-${key}"><h4>${esc(fmtDate(key, { weekday: 'long', day: 'numeric', month: 'long' }))}${key > today ? ` <span class="badge soon">${tr('em breve', 'upcoming')}</span>` : ''}</h4>
          <div class="list">${list.slice(0, 60).map(entryHTML).join('')}${list.length > 60 ? `<p class="muted small">+${list.length - 60}</p>` : ''}</div></div>`;
      }).join('');
      const upcoming = dated.filter((e) => e.d > today && on(e)).sort((a, b) => a.d.localeCompare(b.d));
      const upDays = [...new Set(upcoming.map((e) => e.d))];
      const monthName = new Date(Y, M - 1, 15).toLocaleDateString(ST.locale, { month: 'long', year: 'numeric' });
      el.innerHTML = ST.pageHead(t('calendar'), tr('Datas que estão nos arquivos do jogo: lançamentos de itens, móveis, skins, decorações, visuais e mascotes, e os eventos de login. Datas futuras são as programadas pelo jogo e podem mudar.',
        'Dates found in the game files: releases of items, furniture, skins, decorations, looks and pets, plus login events. Future dates are scheduled by the game and may change.')) + `
        <div class="tags" style="margin-bottom:10px">${[['', t('all')], ...kinds.map((k) => [k, tr(...KIND[k])])].map(([k, label]) => {
          const active = k ? sel.has(k) : !sel.size;
          const nextSel = k ? (sel.has(k) ? [...sel].filter((x) => x !== k) : [...sel, k]) : [];
          return `<a class="chip ${active ? 'primary' : ''}" href="${q({ k: nextSel.join(',') })}">${esc(label)}</a>`;
        }).join('')}</div>
        <div class="cal-wrap">
          <section class="sec cal-month">
            <div class="cal-head"><a class="chip" href="${q({ m: prev })}" aria-label="${tr('Mês anterior', 'Previous month')}">${ST.ic('left')}</a>
              <h3>${esc(monthName)}</h3>
              <a class="chip" href="${q({ m: next })}" aria-label="${tr('Próximo mês', 'Next month')}">${ST.ic('right')}</a>
              ${m0 !== today.slice(0, 7) ? `<a class="chip" href="${q({ m: today.slice(0, 7) })}">${tr('Hoje', 'Today')}</a>` : ''}</div>
            <div class="cal-grid">${wd.map((w) => `<div class="cal-wd">${esc(w)}</div>`).join('')}${cells.join('')}</div>
            <div class="tags" style="margin-top:12px"><button class="chip" id="icsMonth" ${inMonth.length ? '' : 'disabled'}>${ST.ic('calendar')} ${tr('Exportar este mês (.ics)', 'Export this month (.ics)')}</button>
              <button class="chip" id="icsNext" ${upcoming.length ? '' : 'disabled'}>${ST.ic('calendar')} ${tr('Exportar próximos lançamentos (.ics)', 'Export upcoming releases (.ics)')}</button></div>
            <p class="note">${tr('O arquivo .ics abre no Google Agenda, Outlook e no calendário do celular (um evento de dia inteiro por data).', 'The .ics file opens in Google Calendar, Outlook and phone calendars (one all-day event per date).')}
              ${undated ? ` ${nf(undated)} ${tr('registros nos arquivos ainda não têm data definida (2099) e ficam fora do calendário.', 'entries in the files have no set date yet (2099) and are left out.')}` : ''}</p>
          </section>
          <section class="sec cal-next"><h3>${tr('Próximos lançamentos', 'Upcoming releases')}</h3>
            ${upDays.length ? `<div class="list">${upDays.slice(0, 12).map((dd) => {
              const list = upcoming.filter((e) => e.d === dd), cnt = {};
              list.forEach((e) => (cnt[e.k] = (cnt[e.k] || 0) + 1));
              return `<a class="row" href="${q({ m: dd.slice(0, 7), d: dd })}"><div class="cal-date"><b>${esc(fmtDate(dd, { day: '2-digit' }))}</b><span>${esc(fmtDate(dd, { month: 'short' }))}</span></div>
                <div class="grow">${list.slice(0, 3).map((e) => esc(e.n)).join(' · ')}
                <span class="cal-ics up">${icons(list, 6).map((e) => `<span class="cal-ic ${EV(e) ? 'ev' : ''}" title="${esc(e.n)}">${img(e.u)}</span>`).join('')}</span>${list.length > 3 ? ` <span class="muted">+${list.length - 3}</span>` : ''}
                <div class="small muted">${Object.entries(cnt).map(([k, n]) => `${n} ${esc(tr(...KIND[k]).toLowerCase())}`).join(' · ')}</div></div></a>`;
            }).join('')}</div>` : `<p class="muted">${tr('Nenhuma data futura nos arquivos atuais.', 'No future dates in the current files.')}</p>`}
          </section>
          <section class="sec cal-rec"><h3>${tr('Eventos recorrentes', 'Recurring events')}</h3>
            <div class="list">${(evs.recurring || []).map((r) => `<a class="row" href="#/${r.route}">${ST.icon(r.icon) ? `<span class="cal-evic">${img(r.icon)}</span>` : ''}
              <div class="grow"><b>${esc(r.id === 'caravan' ? t('caravan') : r.name)}</b><div class="small muted">${esc(r.desc || (r.info && r.info[0] ? r.info[0].filter(Boolean).join(': ') : ''))}</div></div></a>`).join('')}</div>
            <p class="note">${tr('Estes eventos voltam de tempos em tempos, mas a programação vem do servidor da Kabam: os arquivos do jogo não trazem as datas.', 'These events come back from time to time, but the schedule comes from Kabam’s server: the game files have no dates.')}</p>
          </section>
        </div>
        ${dayList ? ST.sec(esc(monthName), dayList) : `<p class="muted">${tr('Nada neste mês com os filtros atuais.', 'Nothing this month with the current filters.')}</p>`}`;
      el.querySelector('#icsMonth').addEventListener('click', () => ST.icsFile(ST.icsFromEntries(inMonth, 'm' + m0), `shop-titans-${m0}.ics`));
      el.querySelector('#icsNext').addEventListener('click', () => ST.icsFile(ST.icsFromEntries(upcoming, 'next'), 'shop-titans-proximos.ics'));
      // link #cal-AAAA-MM-DD dentro da página (o roteador usa o hash, então rola manualmente)
      el.querySelectorAll('a[href^="#cal-"]').forEach((a) => a.addEventListener('click', (ev) => {
        ev.preventDefault();
        const tgt = el.querySelector(a.getAttribute('href'));
        if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
      const jump = /^\d{4}-\d{2}-\d{2}$/.test(query.get('d') || '') ? query.get('d') : '';
      if (jump) setTimeout(() => { const tgt = el.querySelector('#cal-' + jump); if (tgt) tgt.scrollIntoView({ block: 'start' }); }, 50);
    },
  });
})();
