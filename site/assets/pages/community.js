/* Comunidade: guildas e jogadores cadastrados pelo próprio portal.
   - dados publicados: data/community.js (ST.community)
   - edições locais: localStorage "st_community" (mescladas por id, a mais recente vence)
   - "Exportar arquivo" gera um community.js novo para publicar junto com o site. */
(() => {
  const { t, tr, esc, nf, short, img } = ST;
  ST.addI18n({ pt: { communityNav: 'Comunidade', guilds: 'Guildas', players: 'Jogadores' }, en: { communityNav: 'Community', guilds: 'Guilds', players: 'Players' } });
  const KEY = 'st_community';
  const ROLES = [['leader', 'Líder', 'Leader'], ['officer', 'Oficial', 'Officer'], ['member', 'Membro', 'Member']];
  const roleName = (r) => { const x = ROLES.find((y) => y[0] === r) || ROLES[2]; return tr(x[1], x[2]); };

  // ---------------------------------------------------------------- armazenamento
  const local = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { guilds: [], players: [], deleted: [] }; } catch (e) { return { guilds: [], players: [], deleted: [] }; } };
  const saveLocal = (db) => { try { localStorage.setItem(KEY, JSON.stringify(db)); return true; } catch (e) { return false; } };
  async function load() {
    const [pub] = await ST.need('community').catch(() => [{ guilds: [], players: [] }]);
    const loc = local();
    const merge = (a = [], b = []) => {
      const m = new Map(a.map((x) => [x.id, x]));
      b.forEach((x) => { const cur = m.get(x.id); if (!cur || (x.updatedAt || '') >= (cur.updatedAt || '')) m.set(x.id, { ...x, _local: true }); });
      return [...m.values()].filter((x) => !(loc.deleted || []).includes(x.id));
    };
    return { guilds: merge(pub.guilds, loc.guilds), players: merge(pub.players, loc.players), pubAt: pub.exportedAt, localCount: loc.guilds.length + loc.players.length };
  }
  const upsert = (kind, obj) => {
    const db = local();
    obj.updatedAt = new Date().toISOString();
    db[kind] = (db[kind] || []).filter((x) => x.id !== obj.id);
    db[kind].push(obj);
    db.deleted = (db.deleted || []).filter((x) => x !== obj.id);
    saveLocal(db);
  };
  const remove = (kind, id) => {
    const db = local();
    db[kind] = (db[kind] || []).filter((x) => x.id !== id);
    db.deleted = [...new Set([...(db.deleted || []), id])];
    saveLocal(db);
  };
  const newId = (name) => (ST.norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'x') + '-' + Math.random().toString(36).slice(2, 6);

  // ---------------------------------------------------------------- utilidades
  const ago = (iso) => {
    if (!iso) return tr('nunca', 'never');
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    const f = (n, pt, en) => tr(`há ${n} ${pt}`, `${n} ${en} ago`);
    if (s < 60) return tr('agora mesmo', 'just now');
    if (s < 3600) return f(Math.floor(s / 60), 'min', 'min');
    if (s < 86400) return f(Math.floor(s / 3600), 'h', 'h');
    const d = Math.floor(s / 86400);
    return d < 60 ? f(d, d === 1 ? 'dia' : 'dias', d === 1 ? 'day' : 'days') : f(Math.floor(d / 30), 'meses', 'months');
  };
  const fresh = (iso) => { if (!iso) return 'old'; const d = (Date.now() - new Date(iso).getTime()) / 864e5; return d < 7 ? 'new' : d < 30 ? 'mid' : 'old'; };
  const fullDate = (iso) => (iso ? new Date(iso).toLocaleString(ST.locale, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
  const updatedCard = (iso, label) => `<div class="cm-upd ${fresh(iso)}"><span class="pulse"></span><div><span class="small muted">${label || tr('Última atualização', 'Last updated')}</span>
    <b>${ago(iso)}</b><span class="small muted">${fullDate(iso)}</span></div></div>`;
  const totalInvest = (g, players) => players.filter((p) => p.guildId === g.id).reduce((a, p) => a + (+p.invest || 0), 0);
  const lastOf = (g, players) => [g.updatedAt, ...players.filter((p) => p.guildId === g.id).map((p) => p.updatedAt)].filter(Boolean).sort().pop();
  const toolbar = (data) => `<div class="tags cm-tools">
      <button class="chip" data-x="export">${ST.ic('down')} ${tr('Exportar arquivo', 'Export file')}</button>
      <label class="chip">${ST.ic('up')} ${tr('Importar', 'Import')}<input type="file" accept=".js,.json" data-x="import" hidden></label>
      ${data.localCount ? `<span class="small muted">${tr(`${data.localCount} alterações salvas só neste navegador`, `${data.localCount} changes saved only in this browser`)}</span>` : ''}</div>`;
  function bindTools(el) {
    el.querySelectorAll('[data-x="export"]').forEach((b) => b.addEventListener('click', async () => {
      const d = await load();
      const out = { version: 1, exportedAt: new Date().toISOString(), guilds: d.guilds.map(({ _local, ...x }) => x), players: d.players.map(({ _local, ...x }) => x) };
      const js = `/* Dados de comunidade exportados pelo Portal Shop Titans em ${out.exportedAt}. Coloque em site/data/community.js */\n(window.ST = window.ST || {}).community = ${JSON.stringify(out, null, 1)};\n`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
      a.download = 'community.js';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }));
    el.querySelectorAll('[data-x="import"]').forEach((inp) => inp.addEventListener('change', async () => {
      const f = inp.files[0]; if (!f) return;
      const txt = await f.text();
      try {
        const json = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
        const db = local();
        for (const kind of ['guilds', 'players']) (json[kind] || []).forEach((x) => { db[kind] = (db[kind] || []).filter((y) => y.id !== x.id); db[kind].push(x); });
        saveLocal(db); ST.rerender();
      } catch (e) { alert(tr('Arquivo inválido.', 'Invalid file.')); }
    }));
  }

  // ---------------------------------------------------------------- formulários (modal)
  function modal(title, fields, onSave, onDelete) {
    const wrap = document.createElement('div');
    wrap.className = 'gs open cm-modal';
    wrap.innerHTML = `<form class="gs-panel cm-form" novalidate><h3>${title}</h3>${fields}
      <p class="cm-err small" hidden></p>
      <div class="tags"><button class="chip primary" type="submit">${tr('Salvar', 'Save')}</button><button class="chip" type="button" data-cancel>${tr('Cancelar', 'Cancel')}</button>
      ${onDelete ? `<button class="chip cm-del" type="button" data-del>${tr('Excluir', 'Delete')}</button>` : ''}</div></form>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', (e) => { if (e.target === wrap || e.target.closest('[data-cancel]')) close(); });
    const del = wrap.querySelector('[data-del]');
    if (del) del.addEventListener('click', () => { if (confirm(tr('Excluir? Isso não pode ser desfeito.', 'Delete? This cannot be undone.'))) { onDelete(); close(); ST.rerender(); } });
    wrap.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = Object.fromEntries(new FormData(e.target).entries());
      const err = onSave(fd);
      if (err) { const p = wrap.querySelector('.cm-err'); p.textContent = err; p.hidden = false; return; }
      close(); ST.rerender();
    });
    setTimeout(() => { const i = wrap.querySelector('input'); if (i) i.focus(); }, 30);
  }
  const field = (name, label, value = '', type = 'text', hint = '') => `<label class="field">${label}<input class="inp" name="${name}" type="${type}" value="${esc(value ?? '')}" ${type === 'number' ? 'min="0" step="any"' : ''}>${hint ? `<span class="small muted">${hint}</span>` : ''}</label>`;

  function guildForm(g, city) {
    const blds = (city.buildings || []).filter((b) => b.levels.length > 1);
    modal(g ? tr('Editar guilda', 'Edit guild') : tr('Nova guilda', 'New guild'),
      `${field('name', tr('Nome da guilda', 'Guild name'), g && g.name)}
      <div class="cm-row">${field('level', tr('Nível da guilda', 'Guild level'), g && g.level, 'number')}${field('renown', tr('Renome', 'Renown'), g && g.renown, 'number')}</div>
      ${field('leader', tr('Líder', 'Leader'), g && g.leader)}
      <label class="field">${tr('Observações', 'Notes')}<textarea class="inp" name="notes" rows="2">${esc((g && g.notes) || '')}</textarea></label>
      <details><summary class="small">${tr('Níveis das construções da cidade', 'City building levels')}</summary><div class="cm-blds">${blds.map((b) =>
        `<label class="field small">${esc(b.name)}<input class="inp" type="number" min="0" max="${b.levels.length}" name="b_${b.family}" value="${esc((g && g.buildings && g.buildings[b.family]) ?? '')}"></label>`).join('')}</div></details>`,
      (fd) => {
        if (!fd.name.trim()) return tr('Informe o nome da guilda.', 'Enter the guild name.');
        const buildings = {};
        Object.entries(fd).forEach(([k, v]) => { if (k.startsWith('b_') && v !== '') buildings[k.slice(2)] = +v; });
        upsert('guilds', { ...(g || {}), id: (g && g.id) || newId(fd.name), name: fd.name.trim(), level: +fd.level || 0, renown: +fd.renown || 0,
          leader: fd.leader.trim(), notes: fd.notes.trim(), buildings, history: [...((g && g.history) || []), { at: new Date().toISOString(), level: +fd.level || 0, renown: +fd.renown || 0 }].slice(-60) });
      }, g ? () => remove('guilds', g.id) : null);
  }
  function playerForm(p, guilds, guildId) {
    modal(p ? tr('Editar jogador', 'Edit player') : tr('Novo jogador', 'New player'),
      `${field('name', tr('Nome do jogador', 'Player name'), p && p.name)}
      <label class="field">${tr('Guilda', 'Guild')}<select class="inp" name="guildId"><option value="">${tr('Sem guilda', 'No guild')}</option>${guilds.map((g) =>
        `<option value="${g.id}" ${(p ? p.guildId : guildId) === g.id ? 'selected' : ''}>${esc(g.name)}</option>`).join('')}</select></label>
      <div class="cm-row"><label class="field">${tr('Cargo', 'Role')}<select class="inp" name="role">${ROLES.map(([k, pt, en]) => `<option value="${k}" ${((p && p.role) || 'member') === k ? 'selected' : ''}>${tr(pt, en)}</option>`).join('')}</select></label>
      ${field('level', tr('Nível do comerciante', 'Merchant level'), p && p.level, 'number')}</div>
      <div class="cm-row">${field('invest', tr('Ouro investido na cidade', 'Gold invested in the city'), p && p.invest, 'number', tr('Total acumulado', 'Running total'))}
      ${field('power', tr('Poder do melhor herói', 'Best hero power'), p && p.power, 'number')}</div>
      <label class="field">${tr('Observações', 'Notes')}<textarea class="inp" name="notes" rows="2">${esc((p && p.notes) || '')}</textarea></label>`,
      (fd) => {
        if (!fd.name.trim()) return tr('Informe o nome do jogador.', 'Enter the player name.');
        const snap = { at: new Date().toISOString(), level: +fd.level || 0, invest: +fd.invest || 0, power: +fd.power || 0 };
        upsert('players', { ...(p || {}), id: (p && p.id) || newId(fd.name), name: fd.name.trim(), guildId: fd.guildId || '', role: fd.role,
          level: snap.level, invest: snap.invest, power: snap.power, notes: fd.notes.trim(), history: [...((p && p.history) || []), snap].slice(-60) });
      }, p ? () => remove('players', p.id) : null);
  }

  const empty = (title, hint, btn) => ST.empty(title, hint, btn, { icon: 'box' });
  const search = (id, ph, val) => `<input class="inp cm-search" id="${id}" type="search" placeholder="${ph}" value="${esc(val || '')}" autocomplete="off">`;
  const bindSearch = (el, id, param) => {
    let timer;
    el.querySelector('#' + id).addEventListener('input', (e) => { clearTimeout(timer); timer = setTimeout(() => { ST.setQuery({ [param]: e.target.value }); ST.rerender(); }, 200); });
  };
  const keepFocus = (el, id) => { const i = el.querySelector('#' + id); if (i && i.value) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
  const spark = (hist, key) => {
    const v = (hist || []).map((h) => +h[key] || 0); if (v.length < 2) return '';
    const max = Math.max(...v), min = Math.min(...v), w = 120, h = 28;
    const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - ((x - min) / ((max - min) || 1)) * (h - 4) - 2}`).join(' ');
    return `<svg class="cm-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  };

  // ================================================================ Guildas
  ST.page('guildas', {
    nav: 'guildas', title: () => t('guilds'),
    async render(el, [gid], query) {
      const [city] = await ST.need('city');
      const data = await load();
      const { guilds, players } = data;
      if (gid) {
        const g = guilds.find((x) => x.id === gid);
        if (!g) { el.innerHTML = ST.notFound(); return; }
        const mem = players.filter((p) => p.guildId === g.id).sort((a, b) => (+b.invest || 0) - (+a.invest || 0));
        const inv = totalInvest(g, players), last = lastOf(g, players);
        const blds = Object.entries(g.buildings || {}).map(([fam, lv]) => ({ b: (city.buildings || []).find((x) => x.family === fam), lv })).filter((x) => x.b);
        el.innerHTML = `<a class="crumb" href="#/guildas">${ST.ic('left')} ${t('guilds')}</a>
          <header class="cm-head"><div class="cm-crest">${esc(g.name.slice(0, 2).toUpperCase())}</div><div class="grow"><h1 class="d-title">${esc(g.name)}</h1>
            <div class="d-sub">${g.leader ? `${tr('Líder', 'Leader')}: ${esc(g.leader)} · ` : ''}${nf(mem.length)} ${tr('membros', 'members')}</div></div>${updatedCard(last)}</header>
          ${ST.stats([ST.stat(tr('Nível', 'Level'), nf(g.level)), ST.stat(tr('Renome', 'Renown'), nf(g.renown)), ST.stat(tr('Investimento total', 'Total invested'), nf(inv) + ' ' + ST.ic('coin'), 'gold'),
            ST.stat(tr('Média por membro', 'Average per member'), mem.length ? short(inv / mem.length) : '—')])}
          <div class="tags" style="margin:14px 0"><button class="chip primary" data-a="addp">${tr('Adicionar jogador', 'Add player')}</button><button class="chip" data-a="edit">${tr('Editar guilda', 'Edit guild')}</button></div>
          ${ST.sec(`${tr('Jogadores', 'Players')} (${mem.length})`, mem.length ? ST.table(mem, [
            { key: 'name', label: tr('Jogador', 'Player'), fmt: (p) => `<a href="#/players/${p.id}">${esc(p.name)}</a>${p._local ? ' <span class="badge">local</span>' : ''}` },
            { key: 'role', label: tr('Cargo', 'Role'), fmt: (p) => roleName(p.role), sort: (p) => ROLES.findIndex((r) => r[0] === p.role) },
            { key: 'level', label: t('level'), num: true, fmt: (p) => nf(p.level) },
            { key: 'invest', label: tr('Investido', 'Invested'), num: true, fmt: (p) => nf(p.invest) },
            { key: 'share', label: '%', num: true, fmt: (p) => (inv ? ST.dec(((+p.invest || 0) / inv) * 100, 1) + '%' : '—'), sort: (p) => +p.invest || 0 },
            { key: 'updatedAt', label: tr('Atualizado', 'Updated'), num: true, fmt: (p) => `<span class="cm-dot ${fresh(p.updatedAt)}"></span>${ago(p.updatedAt)}` }], { sortKey: 'invest', sortDir: -1 })
            : empty(tr('Nenhum jogador nesta guilda', 'No players in this guild'), tr('Adicione os membros para acompanhar os investimentos.', 'Add members to track their investments.'), `<button class="chip primary" data-a="addp">${tr('Adicionar jogador', 'Add player')}</button>`))}
          ${blds.length ? ST.sec(tr('Construções da cidade', 'City buildings'), `<div class="tiles">${blds.map(({ b, lv }) => `<div class="tile"><div class="thumb">${img(b.icon)}</div><div class="tile-body"><div class="tile-title">${esc(b.name)}</div>
            <div class="tile-sub">${t('level')} ${lv} / ${b.levels.length}</div><div class="hm-bar"><i style="--w:${(lv / b.levels.length * 100).toFixed(0)}%"></i></div></div></div>`).join('')}</div>`) : ''}
          ${(g.history || []).length > 1 ? ST.sec(tr('Histórico', 'History'), `<div class="list">${g.history.slice().reverse().map((h) => `<div class="row"><div class="grow">${fullDate(h.at)}</div><div class="r">${t('level')} ${nf(h.level)} · ${tr('renome', 'renown')} ${nf(h.renown)}</div></div>`).join('')}</div>`) : ''}
          ${g.notes ? `<p class="note">${esc(g.notes)}</p>` : ''}`;
        el.querySelectorAll('[data-a="addp"]').forEach((b) => b.addEventListener('click', () => playerForm(null, guilds, g.id)));
        el.querySelector('[data-a="edit"]').addEventListener('click', () => guildForm(g, city));
        return;
      }
      const q = ST.norm(query.get('q') || '');
      const list = guilds.filter((g) => !q || ST.norm(g.name + ' ' + (g.leader || '')).includes(q))
        .map((g) => ({ g, inv: totalInvest(g, players), n: players.filter((p) => p.guildId === g.id).length, last: lastOf(g, players) }))
        .sort((a, b) => b.inv - a.inv || a.g.name.localeCompare(b.g.name));
      const lastAll = [...guilds, ...players].map((x) => x.updatedAt).filter(Boolean).sort().pop();
      el.innerHTML = `<header class="page-head cm-ph"><div><h1>${t('guilds')}</h1><p class="sub">${tr('Pesquise uma guilda para ver os jogadores, os investimentos e a última atualização. Os dados são cadastrados por você aqui no portal.',
          'Search a guild to see its players, investments and last update. The data is entered by you here in the portal.')}</p></div>${updatedCard(lastAll, tr('Dados atualizados', 'Data updated'))}</header>
        <div class="form-row">${search('gq', tr('Buscar guilda ou líder…', 'Search guild or leader…'), query.get('q'))}<button class="chip primary" data-a="newg">${tr('Nova guilda', 'New guild')}</button></div>
        ${toolbar(data)}
        ${list.length ? `<div class="cm-grid">${list.map(({ g, inv, n, last }) => `<a class="tile cm-card" href="#/guildas/${g.id}">
            <div class="cm-crest sm">${esc(g.name.slice(0, 2).toUpperCase())}</div><div class="tile-body"><div class="tile-title">${esc(g.name)}${g._local ? ' <span class="badge">local</span>' : ''}</div>
            <div class="tile-sub">${t('level')} ${nf(g.level)} · ${nf(n)} ${tr('membros', 'members')}</div>
            <div class="cm-inv">${short(inv)} ${ST.ic('coin')}</div></div><span class="cm-dot ${fresh(last)}" title="${esc(fullDate(last))}"></span><span class="cm-ago">${ago(last)}</span></a>`).join('')}</div>`
          : guilds.length ? empty(tr('Nenhuma guilda encontrada', 'No guild found'), tr(`Nada para “${esc(query.get('q'))}”.`, `Nothing for “${esc(query.get('q'))}”.`), '')
            : empty(tr('Nenhuma guilda cadastrada', 'No guilds yet'), tr('Cadastre a sua guilda para acompanhar jogadores e investimentos.', 'Add your guild to track players and investments.'), `<button class="chip primary" data-a="newg">${tr('Nova guilda', 'New guild')}</button>`)}`;
      el.querySelectorAll('[data-a="newg"]').forEach((b) => b.addEventListener('click', () => guildForm(null, city)));
      bindSearch(el, 'gq', 'q'); keepFocus(el, 'gq'); bindTools(el);
    },
  });

  // ================================================================ Jogadores
  ST.page('players', {
    nav: 'players', title: () => t('players'),
    async render(el, [pid], query) {
      const data = await load();
      const { guilds, players } = data;
      const gName = (id) => (guilds.find((g) => g.id === id) || {}).name;
      if (pid) {
        const p = players.find((x) => x.id === pid);
        if (!p) { el.innerHTML = ST.notFound(); return; }
        const h = p.history || [];
        const prev = h.length > 1 ? h[h.length - 2] : null;
        const delta = (k) => (prev ? (+p[k] || 0) - (+prev[k] || 0) : 0);
        const dl = (k) => { const v = delta(k); return v ? ` <span class="delta ${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : '−'}${short(Math.abs(v))}</span>` : ''; };
        el.innerHTML = `<a class="crumb" href="#/players">${ST.ic('left')} ${t('players')}</a>
          <header class="cm-head"><div class="cm-crest">${esc(p.name.slice(0, 2).toUpperCase())}</div><div class="grow"><h1 class="d-title">${esc(p.name)}</h1>
            <div class="d-sub">${roleName(p.role)}${p.guildId ? ` · <a href="#/guildas/${p.guildId}">${esc(gName(p.guildId) || '')}</a>` : ''}</div></div>${updatedCard(p.updatedAt)}</header>
          ${ST.stats([ST.stat(tr('Nível', 'Level'), nf(p.level) + dl('level')), ST.stat(tr('Ouro investido', 'Gold invested'), nf(p.invest) + ' ' + ST.ic('coin') + dl('invest'), 'gold'),
            ST.stat(tr('Poder do melhor herói', 'Best hero power'), nf(p.power) + dl('power'))])}
          <div class="tags" style="margin:14px 0"><button class="chip primary" data-a="edit">${tr('Atualizar dados', 'Update data')}</button></div>
          ${h.length ? ST.sec(tr('Histórico de atualizações', 'Update history'), `<div class="cm-sparks"><span>${tr('Investimento', 'Investment')} ${spark(h, 'invest')}</span><span>${t('level')} ${spark(h, 'level')}</span></div>
            ${ST.table(h.slice().reverse().map((x, i) => ({ ...x, i })), [
              { key: 'at', label: tr('Data', 'Date'), fmt: (x) => fullDate(x.at), sort: (x) => x.at },
              { key: 'level', label: t('level'), num: true, fmt: (x) => nf(x.level) },
              { key: 'invest', label: tr('Investido', 'Invested'), num: true, fmt: (x) => nf(x.invest) },
              { key: 'power', label: tr('Poder', 'Power'), num: true, fmt: (x) => nf(x.power) }])}`) : ''}
          ${p.notes ? `<p class="note">${esc(p.notes)}</p>` : ''}`;
        el.querySelector('[data-a="edit"]').addEventListener('click', () => playerForm(p, guilds));
        return;
      }
      const q = ST.norm(query.get('q') || '');
      const list = players.filter((p) => !q || ST.norm(p.name + ' ' + (gName(p.guildId) || '')).includes(q));
      el.innerHTML = `<header class="page-head cm-ph"><div><h1>${t('players')}</h1><p class="sub">${tr('Todos os jogadores cadastrados, com guilda, nível, investimento e data da última atualização.', 'Every registered player with guild, level, investment and last update date.')}</p></div>
          ${updatedCard(players.map((p) => p.updatedAt).filter(Boolean).sort().pop(), tr('Dados atualizados', 'Data updated'))}</header>
        <div class="form-row">${search('pq', tr('Buscar jogador ou guilda…', 'Search player or guild…'), query.get('q'))}<button class="chip primary" data-a="newp">${tr('Novo jogador', 'New player')}</button></div>
        ${toolbar(data)}
        ${list.length ? ST.table(list, [
          { key: 'name', label: tr('Jogador', 'Player'), fmt: (p) => `<a href="#/players/${p.id}">${esc(p.name)}</a>${p._local ? ' <span class="badge">local</span>' : ''}` },
          { key: 'guild', label: tr('Guilda', 'Guild'), fmt: (p) => (p.guildId ? `<a href="#/guildas/${p.guildId}">${esc(gName(p.guildId) || '')}</a>` : '—'), sort: (p) => gName(p.guildId) || '' },
          { key: 'role', label: tr('Cargo', 'Role'), fmt: (p) => roleName(p.role) },
          { key: 'level', label: t('level'), num: true, fmt: (p) => nf(p.level) },
          { key: 'invest', label: tr('Investido', 'Invested'), num: true, fmt: (p) => nf(p.invest) },
          { key: 'power', label: tr('Poder', 'Power'), num: true, fmt: (p) => nf(p.power) },
          { key: 'updatedAt', label: tr('Atualizado', 'Updated'), num: true, fmt: (p) => `<span class="cm-dot ${fresh(p.updatedAt)}"></span>${ago(p.updatedAt)}` }], { sortKey: 'invest', sortDir: -1 })
          : players.length ? empty(tr('Nenhum jogador encontrado', 'No player found'), '', '')
            : empty(tr('Nenhum jogador cadastrado', 'No players yet'), tr('Cadastre jogadores aqui ou dentro de uma guilda.', 'Add players here or inside a guild.'), `<button class="chip primary" data-a="newp">${tr('Novo jogador', 'New player')}</button>`)}`;
      el.querySelectorAll('[data-a="newp"]').forEach((b) => b.addEventListener('click', () => playerForm(null, guilds)));
      bindSearch(el, 'pq', 'q'); keepFocus(el, 'pq'); bindTools(el);
    },
  });
})();
