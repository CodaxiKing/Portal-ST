/* Busca global: Ctrl+K (ou "/") abre uma caixa que procura em itens, classes, campeões, habilidades,
   missões, baús, trabalhadores, móveis, mascotes e talentos. Índice gerado pelo extrator (data/<lang>/search.js). */
(() => {
  const { tr, esc, img } = ST;
  const KIND = {
    i: ['Item', 'Item'], c: ['Campeão', 'Champion'], k: ['Classe', 'Class'], s: ['Habilidade', 'Skill'], q: ['Missão', 'Quest'],
    b: ['Baú', 'Chest'], w: ['Trabalhador', 'Worker'], f: ['Móvel', 'Furniture'], p: ['Mascote', 'Pet'], t: ['Talento', 'Talent'],
    a: ['Passe', 'Pass'], h: ['História', 'Story'], n: ['Skin', 'Skin'], l: ['Evento de login', 'Login event'], g: ['Página', 'Page'],
  };
  const ORDER = 'gikcqsahbwfpnlt';
  let index = null, box = null, results = [], sel = 0;

  async function load() {
    if (index) return index;
    const [list] = await ST.need('search');
    const ft = ST.FTYPE || {};
    index = list.map((e) => {
      const sub = e[0] === 'f' && ft[e[2]] ? tr(...ft[e[2]]) : e[2];
      return { k: e[0], name: e[1], sub, icon: e[3], href: e[4], n: ST.norm(e[1]), s: ST.norm(sub) };
    });
    // páginas do menu (Hypermax, Calendário, Caravana, ferramentas…): o nome vem da tradução da interface
    (ST.NAV || []).forEach(([g, links]) => links.forEach(([route, key]) => {
      const name = ST.t(key), sub = ST.t(g);
      index.push({ k: 'g', name, sub, icon: '', href: '#/' + route, n: ST.norm(name), s: ST.norm(sub) });
    }));
    return index;
  }

  function score(e, words, full) {
    if (!words.every((w) => e.n.includes(w) || e.s.includes(w))) return -1;
    let sc = 0;
    if (e.n === full) sc += 100;
    else if (e.n.startsWith(full)) sc += 60;
    else if (e.n.split(/\s+/).some((p) => p.startsWith(words[0]))) sc += 30;
    if (words.every((w) => e.n.includes(w))) sc += 20;
    sc += (ORDER.length - ORDER.indexOf(e.k)) * 0.5;
    return sc - e.name.length * 0.02;
  }

  function render(q) {
    const list = box.querySelector('.gs-list');
    const full = ST.norm(q.trim());
    if (!full) {
      results = [];
      list.innerHTML = `<div class="gs-hint">${tr('Digite o nome de um item, classe, campeão, missão, habilidade ou móvel.',
        'Type the name of an item, class, champion, quest, skill or furniture.')}<div class="gs-keys"><kbd>↑</kbd><kbd>↓</kbd> ${tr('navegar', 'move')} <kbd>Enter</kbd> ${tr('abrir', 'open')} <kbd>Esc</kbd> ${tr('fechar', 'close')}</div></div>`;
      return;
    }
    const words = full.split(/\s+/).filter(Boolean);
    results = index.map((e) => [score(e, words, full), e]).filter((x) => x[0] >= 0).sort((a, b) => b[0] - a[0]).slice(0, 40).map((x) => x[1]);
    sel = 0;
    list.innerHTML = results.length
      ? results.map((e, i) => `<a class="gs-row ${i === 0 ? 'on' : ''}" href="${e.href}" data-i="${i}">
          <span class="gs-ic">${e.icon && ST.icon(e.icon) ? img(e.icon) : ST.ic(e.k === 'g' ? 'right' : e.k === 'l' ? 'calendar' : 'star')}</span><span class="gs-main"><b>${esc(e.name)}</b><span>${esc(e.sub || '')}</span></span>
          <span class="gs-kind">${tr(...KIND[e.k])}</span></a>`).join('')
      : ST.empty(tr('Nada encontrado', 'Nothing found'), tr(`Nenhum resultado para “${esc(q)}”.`, `No results for “${esc(q)}”.`));
  }

  function move(d) {
    if (!results.length) return;
    sel = (sel + d + results.length) % results.length;
    box.querySelectorAll('.gs-row').forEach((r, i) => r.classList.toggle('on', i === sel));
    box.querySelector('.gs-row.on').scrollIntoView({ block: 'nearest' });
  }

  function close() {
    if (!box) return;
    box.classList.remove('open');
    document.body.classList.remove('gs-lock');
  }

  async function open(initial = '') {
    if (!box) {
      box = document.createElement('div');
      box.className = 'gs';
      box.innerHTML = `<div class="gs-panel" role="dialog" aria-modal="true" aria-label="${tr('Busca', 'Search')}">
        <label class="gs-field">${ST.ic('search')}<input type="search" autocomplete="off" spellcheck="false" placeholder="${tr('Buscar em todo o portal…', 'Search the whole portal…')}"><kbd>Esc</kbd></label>
        <div class="gs-list"></div></div>`;
      document.body.appendChild(box);
      const input = box.querySelector('input');
      box.addEventListener('click', (e) => { if (e.target === box) close(); });
      box.querySelector('.gs-list').addEventListener('click', (e) => { if (e.target.closest('.gs-row')) close(); });
      input.addEventListener('input', async () => { await load(); render(input.value); }); // o índice pode ainda estar carregando
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); location.hash = results[sel].href; close(); }
        else if (e.key === 'Escape') close();
      });
    }
    box.classList.add('open');
    document.body.classList.add('gs-lock');
    const input = box.querySelector('input');
    input.value = initial;
    input.focus();
    box.querySelector('.gs-list').innerHTML = `<div class="gs-hint"><div class="skel skel-line" style="width:60%"></div><div class="skel skel-line" style="width:40%"></div></div>`;
    try {
      await load();
      render(input.value);
    } catch (e) {
      box.querySelector('.gs-list').innerHTML = ST.empty(tr('Índice de busca indisponível', 'Search index unavailable'),
        tr('Rode o extrator de novo para gerar data/&lt;idioma&gt;/search.js.', 'Run the extractor again to generate data/&lt;lang&gt;/search.js.'), '', { err: true });
    }
  }
  ST.search = open;

  document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
  });
  const init = () => {
    const b = document.getElementById('searchBtn');
    if (!b) return;
    b.addEventListener('click', () => open());
    b.querySelector('.sb-txt').textContent = tr('Buscar', 'Search');
    b.setAttribute('aria-label', tr('Buscar', 'Search'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
