/* Núcleo do Portal: idioma, carregamento de dados, roteador e componentes de interface. */
(() => {
  const ST = (window.ST = window.ST || {});

  // ---------------------------------------------------------------- idioma
  // dados do jogo em 13 idiomas; a interface do site é traduzida em pt e en (os demais usam en)
  const LANG_INFO = {
    pt: ['Português', 'pt-BR'], en: ['English', 'en-US'], es: ['Español', 'es-ES'], fr: ['Français', 'fr-FR'],
    de: ['Deutsch', 'de-DE'], it: ['Italiano', 'it-IT'], ru: ['Русский', 'ru-RU'], uk: ['Українська', 'uk-UA'],
    tk: ['Türkçe', 'tr-TR'], ja: ['日本語', 'ja-JP'], ko: ['한국어', 'ko-KR'], zh: ['简体中文', 'zh-CN'], zh_tr: ['繁體中文', 'zh-TW'],
  };
  const LANGS = Object.keys(LANG_INFO);
  const fromNavigator = () => {
    const n = (navigator.language || 'pt').toLowerCase();
    if (/^zh-(tw|hk|hant)/.test(n)) return 'zh_tr';
    if (n.startsWith('tr')) return 'tk';
    return n.slice(0, 2);
  };
  let lang = 'pt';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    lang = LANGS.includes(q) ? q : localStorage.getItem('st_lang') || fromNavigator();
    if (LANGS.includes(q)) localStorage.setItem('st_lang', q);
  } catch (e) {}
  if (!LANGS.includes(lang)) lang = 'en';
  const ui = lang === 'pt' ? 'pt' : 'en';
  ST.lang = lang;
  ST.ui = ui;
  ST.LANG_INFO = LANG_INFO;
  ST.locale = LANG_INFO[lang][1];
  document.documentElement.lang = ST.locale;

  // modo leve: menos animação e brilho, lotes menores. Liga sozinho com "economia de dados" ou conexão 2G/3G;
  // o botão no rodapé força ligado/desligado (localStorage st_lite)
  ST.lite = (() => {
    try { const v = localStorage.getItem('st_lite'); if (v === '1' || v === '0') return v === '1'; } catch (e) { /* ignora */ }
    const c = navigator.connection || {};
    return !!(c.saveData || /(^|-)2g|3g/.test(c.effectiveType || ''));
  })();
  if (ST.lite) document.documentElement.classList.add('lite');

  const I18N = {
    pt: {
      home: 'Início', db: 'Banco de dados', tools: 'Ferramentas', items: 'Itens', champions: 'Campeões', classes: 'Classes',
      skills: 'Habilidades', quests: 'Missões', chests: 'Baús', workers: 'Trabalhadores', furniture: 'Móveis',
      talents: 'Talentos', pets: 'Mascotes', collection: 'Coleção', titles: 'Títulos', guild: 'Guilda',
      progression: 'Progressão', updates: 'Novidades', calculator: 'Calculadora de fabricação', profit: 'Ranking de lucro',
      builder: 'Montador de herói', search: 'Buscar…', all: 'Todos', loading: 'Carregando…', notFound: 'Não encontrado.',
      level: 'Nível', tier: 'Tier', value: 'Valor', time: 'Tempo', atk: 'ATQ', def: 'DEF', hp: 'PV', eva: 'Esquiva',
      crit: 'Crítico', critMult: 'Dano crítico', power: 'Poder', name: 'Nome', type: 'Tipo', cost: 'Custo', gold: 'Ouro',
      gems: 'Gemas', xp: 'XP', element: 'Elemento', quality: 'Qualidade', qty: 'Qtd.', total: 'Total', boss: 'Chefe',
      close: 'Fechar', theme: 'Alternar tema', back: 'Voltar', none: 'Nenhum', yes: 'Sim', no: 'Não', rank: 'Rank',
      footer: 'Dados extraídos dos arquivos locais do jogo', fan: 'Portal de fãs, sem afiliação com a Kabam.',
      version: 'Versão do jogo', grid: 'Grade', table: 'Tabela', sortBy: 'Ordenar', ofItems: 'de', results: 'resultados',
    },
    en: {
      home: 'Home', db: 'Database', tools: 'Tools', items: 'Items', champions: 'Champions', classes: 'Classes',
      skills: 'Skills', quests: 'Quests', chests: 'Chests', workers: 'Workers', furniture: 'Furniture',
      talents: 'Talents', pets: 'Pets', collection: 'Collection', titles: 'Titles', guild: 'Guild',
      progression: 'Progression', updates: "What's new", calculator: 'Crafting calculator', profit: 'Profit ranking',
      builder: 'Hero builder', search: 'Search…', all: 'All', loading: 'Loading…', notFound: 'Not found.',
      level: 'Level', tier: 'Tier', value: 'Value', time: 'Time', atk: 'ATK', def: 'DEF', hp: 'HP', eva: 'Evasion',
      crit: 'Critical', critMult: 'Crit damage', power: 'Power', name: 'Name', type: 'Type', cost: 'Cost', gold: 'Gold',
      gems: 'Gems', xp: 'XP', element: 'Element', quality: 'Quality', qty: 'Qty', total: 'Total', boss: 'Boss',
      close: 'Close', theme: 'Toggle theme', back: 'Back', none: 'None', yes: 'Yes', no: 'No', rank: 'Rank',
      footer: 'Data extracted from the local game files', fan: 'Fan-made portal, not affiliated with Kabam.',
      version: 'Game version', grid: 'Grid', table: 'Table', sortBy: 'Sort', ofItems: 'of', results: 'results',
    },
  };
  // idiomas extras da interface (es, fr, de, it…): assets/i18n.js traz os termos do menu e os rótulos comuns;
  // os textos longos das páginas (ST.tr) ficam em inglês nesses idiomas
  ST.I18N = I18N;
  ST.t = (k, ...args) => {
    let s = (I18N[lang] && I18N[lang][k]) ?? (I18N[ui] && I18N[ui][k]) ?? I18N.en[k] ?? k;
    args.forEach((a, i) => (s = s.replace(`{${i}}`, a)));
    return s;
  };
  ST.addI18n = (dict) => { for (const [l, v] of Object.entries(dict)) Object.assign((I18N[l] = I18N[l] || {}), v); };
  // texto por idioma inline: ST.tr('Olá', 'Hello')
  // textos das páginas em outros idiomas: assets/i18n/<lang>.js registra {texto em inglês: tradução}
  const TRX = {};
  ST.addTr = (l, dict) => Object.assign((TRX[l] = TRX[l] || {}), dict);
  ST.tr = (pt, en) => (ui === 'pt' ? pt : (TRX[lang] && TRX[lang][en]) || en);

  // ---------------------------------------------------------------- formatação
  const locale = ST.locale;
  const nf = new Intl.NumberFormat(locale);
  ST.nf = (n) => (n == null || n === '' ? '—' : nf.format(n));
  ST.dec = (n, d = 2) => (n == null ? '—' : Number(n).toLocaleString(locale, { maximumFractionDigits: d }));
  ST.short = (n) => {
    if (n == null) return '—';
    const a = Math.abs(n);
    if (a >= 1e9) return ST.dec(n / 1e9, 2) + ' B';
    if (a >= 1e6) return ST.dec(n / 1e6, 2) + ' M';
    if (a >= 1e4) return ST.dec(n / 1e3, 1) + (ui === 'pt' ? ' mil' : 'K');
    return nf.format(Math.round(n * 100) / 100);
  };
  ST.pct = (v, d = 1) => (v ? ST.dec(v * 100, d) + '%' : '0%');
  ST.dur = (sec) => {
    if (!sec) return '—';
    sec = Math.round(sec);
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const p = [];
    if (d) p.push(d + 'd');
    if (h) p.push(h + 'h');
    if (m) p.push(m + 'min');
    if (s && !d && !h) p.push(s + 's');
    return p.slice(0, 2).join(' ');
  };
  ST.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ST.clean = (s) => ST.esc(String(s ?? '').replace(/<[^>]+>/g, ''));
  ST.norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  // ---------------------------------------------------------------- ícones
  let ICONS = new Set();
  ST.icon = (name) => (name && ICONS.has(name) ? `img/items/${name}.webp` : null);
  ST.img = (name, cls = '', alt = '') => {
    const src = ST.icon(name);
    return src ? `<img src="${src}" alt="${ST.esc(alt)}" loading="lazy" class="${cls}">` : `<span class="ph ${cls}" aria-hidden="true"></span>`;
  };
  ST.firstIcon = (...names) => names.find((n) => ICONS.has(n));
  ST.ic = (name, cls = '') => `<i class="ic ic-${name} ${cls}" aria-hidden="true"></i>`;

  // ---------------------------------------------------------------- carregamento de dados
  const loaded = {};
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }
  // ST.need('items', 'champions') -> carrega data/<lang>/<nome>.js uma vez
  ST.need = (...names) => Promise.all(names.map((n) => {
    if (!loaded[n]) {
      // meta.js sempre fresco; os demais versionados pela data da extração (evita cache velho após re-extrair)
      const shared = ['diff', 'icons', 'meta', 'notes', 'caravan'].includes(n);
      const v = n === 'meta' || n === 'notes' || n === 'caravan' ? Date.now() : encodeURIComponent((ST.meta && ST.meta.generatedAt) || '');
      loaded[n] = loadScript(`${shared ? `data/${n}.js` : `data/${lang}/${n}.js`}?v=${v}`).then(() => ST[n]);
    }
    return loaded[n];
  }));

  // ---------------------------------------------------------------- componentes
  ST.sec = (title, body, note) => (body ? `<section class="sec"><h3>${title}</h3>${body}${note ? `<p class="note">${note}</p>` : ''}</section>` : '');
  ST.stat = (k, v, cls = '') => `<div class="stat"><div class="k">${k}</div><div class="v ${cls}">${v}</div></div>`;
  ST.stats = (arr) => `<div class="stat-grid">${arr.filter(Boolean).join('')}</div>`;
  ST.tag = (txt, cls = '') => `<span class="tag ${cls}">${txt}</span>`;
  ST.tags = (arr) => (arr.length ? `<div class="tags">${arr.join('')}</div>` : '');
  /* Estado vazio / erro: ícone, título, dica e ações opcionais */
  ST.empty = (title, hint = '', acts = '', opts = {}) => `<div class="empty ${opts.err ? 'err' : ''}" role="${opts.err ? 'alert' : 'status'}">
    <div class="empty-ic">${ST.ic(opts.icon || (opts.err ? 'alert' : 'search'))}</div><h4>${title}</h4>${hint ? `<p>${hint}</p>` : ''}${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
  ST.notFound = () => ST.empty(ST.t('notFound'), ST.tr('O link pode estar desatualizado depois de um patch.', 'The link may be outdated after a patch.'),
    `<a class="chip" href="#/">${ST.ic('left')} ${ST.t('home')}</a>`, { icon: 'box' });
  ST.skeleton = () => `<div class="skel-page" aria-busy="true" aria-label="${ST.t('loading')}"><div class="skel skel-title"></div>
    <div class="skel skel-line" style="width:min(520px,90%)"></div><div class="skel skel-line" style="width:min(380px,70%)"></div>
    <div class="skel-grid">${'<div class="skel skel-card"></div>'.repeat(9)}</div></div>`;
  /* Entrada escalonada dos filhos de grades e listas (só transform/opacity) */
  const STAGGER = '.tiles,.grid,.bento,.zig,.hm-grid,.stat-grid,.slot-grid,.list,.tags,.mosaic';
  ST.stagger = (root, from = 0) => {
    root.querySelectorAll(STAGGER).forEach((g) => {
      [...g.children].slice(from).forEach((c, i) => {
        if (c.classList.contains('stagger')) return;
        c.style.setProperty('--i', Math.min(i, 18));
        c.classList.add('stagger');
      });
    });
  };
  ST.pageHead = (title, sub, extra = '') => `<header class="page-head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${extra}</header>`;

  /* Tabela ordenável. cols: [{key, label, num, fmt(row), sort(row)}] */
  ST.table = (rows, cols, opts = {}) => {
    const id = 'tb' + Math.random().toString(36).slice(2, 8);
    const state = { key: opts.sortKey || null, dir: opts.sortDir || 1 };
    const body = () => {
      let r = rows.slice();
      if (state.key) {
        const c = cols.find((x) => x.key === state.key);
        const f = c.sort || ((x) => x[c.key]);
        r.sort((a, b) => {
          const va = f(a), vb = f(b);
          return (typeof va === 'string' ? va.localeCompare(vb) : (va ?? -Infinity) - (vb ?? -Infinity)) * state.dir;
        });
      }
      return r.map((row) => `<tr ${opts.rowAttr ? opts.rowAttr(row) : ''}>${cols.map((c) =>
        `<td class="${c.num ? 'num' : ''} ${c.cls || ''}">${c.fmt ? c.fmt(row) : ST.esc(row[c.key] ?? '')}</td>`).join('')}</tr>`).join('');
    };
    setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.querySelector('thead').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-k]');
        if (!th) return;
        state.dir = state.key === th.dataset.k ? -state.dir : (cols.find((c) => c.key === th.dataset.k).num ? -1 : 1);
        state.key = th.dataset.k;
        el.querySelector('tbody').innerHTML = body();
        el.querySelectorAll('th').forEach((x) => x.classList.toggle('sorted', x.dataset.k === state.key));
      });
    });
    return `<div class="table-wrap"><table class="data-table" id="${id}"><thead><tr>${cols.map((c) =>
      `<th data-k="${c.key}" class="${c.num ? 'num' : ''}">${c.label}</th>`).join('')}</tr></thead><tbody>${body()}</tbody></table></div>`;
  };

  /* Lista com abas */
  ST.tabs = (tabs, active) => `<nav class="tabs">${tabs.map(([id, label]) =>
    `<a href="${id}" class="${id === active ? 'active' : ''}">${label}</a>`).join('')}</nav>`;

  // ---------------------------------------------------------------- gaveta (detalhes)
  ST.drawer = {
    open(html, title) {
      const d = document.getElementById('drawer');
      document.getElementById('detail').innerHTML = html;
      d.scrollTop = 0;
      d.classList.add('open');
      d.setAttribute('aria-hidden', 'false');
      document.getElementById('backdrop').hidden = false;
      if (title) document.title = `${title} · Portal Shop Titans`;
    },
    close() {
      const d = document.getElementById('drawer');
      d.classList.remove('open');
      d.setAttribute('aria-hidden', 'true');
      document.getElementById('backdrop').hidden = true;
    },
  };

  // ---------------------------------------------------------------- roteador
  // ST.page('itens', {nav:'items', group:'db', render(el, args, query)})
  const PAGES = {};
  const OVERLAYS = {}; // rotas que abrem a gaveta sobre a página atual (ex.: item/<uid>)
  ST.page = (path, def) => (PAGES[path] = def);
  ST.overlay = (path, fn) => (OVERLAYS[path] = fn);
  let currentPage = null;
  let lastPageHash = '#/';

  function parse() {
    let h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { parts, query: new URLSearchParams(qs || '') };
  }
  ST.go = (hash) => { location.hash = hash; };
  ST.setQuery = (obj) => {
    const { parts, query } = parse();
    for (const [k, v] of Object.entries(obj)) (v === '' || v == null ? query.delete(k) : query.set(k, v));
    const qs = query.toString();
    history.replaceState(null, '', '#/' + parts.map(encodeURIComponent).join('/') + (qs ? '?' + qs : ''));
  };

  async function route() {
    const { parts, query } = parse();
    const head = parts[0] || '';
    if (OVERLAYS[head]) {
      // abre por cima; se nada foi renderizado ainda, mostra a lista de itens embaixo
      if (!currentPage) { lastPageHash = '#/itens'; await render('itens', [], new URLSearchParams()); }
      try { await OVERLAYS[head](parts.slice(1), query); } catch (e) { console.error(e); }
      return;
    }
    ST.drawer.close();
    lastPageHash = location.hash || '#/';
    await render(head, parts.slice(1), query);
  }
  ST.rerender = () => { const { parts, query } = parse(); return render(parts[0] || '', parts.slice(1), query, true); };

  async function render(head, args, query, force) {
    const def = PAGES[head] || PAGES[''];
    const el = document.getElementById('view');
    const key = head + '/' + args.join('/') + '?' + query.toString();
    if (key === currentPage && !force) return;
    currentPage = key;
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === (def.nav || head)));
    const act = document.querySelector('[data-nav].active');
    if (act) ST.openNavGroup(+act.closest('.nav-group').dataset.g);
    else if (!ST.navTouched && !document.querySelector('.nav-group.open')) ST.openNavGroup(0);
    document.title = (def.title ? def.title() + ' · ' : '') + 'Portal Shop Titans';
    el.innerHTML = ST.skeleton();
    try {
      await def.render(el, args, query);
      if (currentPage === key) ST.stagger(el);
    } catch (e) {
      console.error(e);
      el.innerHTML = ST.empty(ST.tr('Não foi possível abrir esta página', 'This page could not be opened'), ST.esc(e.message),
        `<button class="chip" onclick="ST.rerender()">${ST.tr('Tentar de novo', 'Try again')}</button>`, { err: true });
    }
    if (!OVERLAYS[(parse().parts[0] || '')]) window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- shell
  const NAV = [
    ['db', [['itens', 'items'], ['campeoes', 'champions'], ['classes', 'classes'], ['habilidades', 'skills'],
      ['missoes', 'quests'], ['baus', 'chests'], ['trabalhadores', 'workers'], ['moveis', 'furniture'],
      ['talentos', 'talents'], ['mascotes', 'pets'], ['colecao', 'collection'], ['titulos', 'titles'],
      ['guilda', 'guild'], ['progressao', 'progression'], ['historias', 'stories'], ['skins', 'skins'], ['novidades', 'updates']]],
    ['rewardsNav', [['passes', 'passes'], ['recompensas', 'evRewards'], ['quadro', 'bounties'], ['loja', 'store'], ['expansoes', 'expansions'], ['sorte', 'luck']]],
    ['eventsNav', [['calendario', 'calendar'], ['cidadeouro', 'goldcity'], ['capricho', 'caprice'], ['comunidade-eventos', 'commEvents'], ['caravana', 'caravan'], ['invasao', 'airship'], ['tumba', 'tomb']]],
    ['communityNav', [['hypermax', 'hypermax'], ['tumba-ranking', 'tombRank'], ['lancamentos', 'releases']]],
    ['tools', [['simulador', 'simulator'], ['qualidade', 'qualityCalc'], ['lucro', 'profit'], ['onde', 'whereToGet'],
      ['montador', 'builder'], ['grupos', 'partyByArea'], ['plano', 'craftPlan'], ['melhorias', 'upgradeCalc'], ['planejador', 'talentPlanner'], ['custos', 'upgradeCosts']]],
  ];
  ST.NAV = NAV;
  ST.openNavGroup = (gi) => {
    document.querySelectorAll('.nav-group').forEach((g) => {
      const on = +g.dataset.g === gi;
      g.classList.toggle('open', on);
      g.querySelector('.nav-title').setAttribute('aria-expanded', on);
      g.querySelectorAll('a').forEach((a) => (a.tabIndex = on ? 0 : -1));
    });
  };

  function shell() {
    // menu em sanfona: só um grupo aberto por vez
    document.getElementById('nav').innerHTML = NAV.map(([g, links], gi) => `<div class="nav-group" data-g="${gi}">
      <button class="nav-title" type="button" aria-expanded="false" aria-controls="ng${gi}"><span>${ST.t(g)}</span><span class="nav-count">${links.length}</span>${ST.ic('chev', 'nav-chev')}</button>
      <div class="nav-links" id="ng${gi}"><div>${links.map(([p, k]) => `<a href="#/${p}" data-nav="${p}" tabindex="-1">${ST.t(k)}</a>`).join('')}</div></div></div>`).join('');
    document.getElementById('nav').addEventListener('click', (e) => {
      const b = e.target.closest('.nav-title');
      if (!b) return;
      // clicar no grupo aberto fecha; em outro, abre esse e fecha o anterior
      const g = b.parentElement;
      ST.navTouched = true;
      ST.openNavGroup(g.classList.contains('open') ? -1 : +g.dataset.g);
    });
    const sel = document.getElementById('langSel');
    const avail = (ST.meta && ST.meta.langs) || ['pt', 'en'];
    sel.innerHTML = avail.filter((l) => LANG_INFO[l]).map((l) => `<option value="${l}" ${l === lang ? 'selected' : ''}>${LANG_INFO[l][0]}</option>`).join('');
    sel.title = ST.tr('Idioma', 'Language');
    sel.addEventListener('change', () => {
      try { localStorage.setItem('st_lang', sel.value); } catch (e) {}
      location.search = '';
      location.reload();
    });
    try { const t = localStorage.getItem('st_theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
    document.getElementById('themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('st_theme', next); } catch (e) {}
    });
    document.getElementById('menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    document.getElementById('nav').addEventListener('click', (e) => { if (e.target.closest('a')) document.body.classList.remove('nav-open'); });
    const closeDrawer = () => {
      const { parts } = parse();
      if (OVERLAYS[parts[0]]) location.hash = lastPageHash; else ST.drawer.close();
    };
    document.getElementById('closeBtn').addEventListener('click', closeDrawer);
    document.getElementById('backdrop').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('drawer').classList.contains('open')) closeDrawer(); });
    // borda iluminada que segue o cursor nos cartões
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.card,.tile');
      if (!c) return;
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
    const m = ST.meta || {};
    if (m.gameVersion) {
      document.getElementById('verTxt').textContent = 'v' + m.gameVersion.split(' ')[0];
      document.getElementById('verPill').hidden = false;
      document.getElementById('verPill').title = m.gameVersion;
    }
    document.getElementById('foot').innerHTML = `${ST.t('footer')} · ${ST.t('version')}: ${ST.esc(m.gameVersion || '?')} · ${
      m.generatedAt ? new Date(m.generatedAt).toLocaleString(locale) : ''} · ${ST.t('fan')} · <button class="linkish" id="liteBtn" type="button">${
      ST.tr('Modo leve', 'Lite mode')}: ${ST.lite ? ST.tr('ligado', 'on') : ST.tr('desligado', 'off')}</button>`;
    document.getElementById('liteBtn').addEventListener('click', () => {
      try { localStorage.setItem('st_lite', ST.lite ? '0' : '1'); } catch (e) { /* sem armazenamento */ }
      location.reload();
    });
  }

  ST.start = async () => {
    await ST.need('meta');
    await ST.need('icons');
    ICONS = new Set(ST.icons || []);
    shell();
    window.addEventListener('hashchange', route);
    if (/^#item\//.test(location.hash)) history.replaceState(null, '', '#/' + location.hash.slice(1));
    route();
  };
})();
