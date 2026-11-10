/* Página inicial: apresentação assimétrica, mosaico de ícones e atalhos para todas as seções. */
(() => {
  const { t, tr, esc, nf, img } = ST;
  const ICON = {
    itens: 'shortsword', campeoes: 'icon_global_argon', classes: 'icon_global_class_knight_128', habilidades: 'icon_global_skill_p_cleave',
    missoes: 'forest_boss', baus: 'chest_forest', trabalhadores: 'blacksmith_head', moveis: 'vertrack1', talentos: 'icon_skilltree_maxEnergy',
    mascotes: 'doghouse', colecao: 'img_collectionbook_book_quality_epic_big', titulos: 'img_player_titles_01', guilda: 'icon_global_upgrade_rareresregen',
    progressao: 'icon_achievements_gold04', novidades: 'icon_event_reward_dialog', calculadora: 'custom_handheld_wallacehammer',
    lucro: 'img_shop_item_sitems_gold1', montador: 'icon_global_class_swordmaster_128', lista: 'goldshell', comparar: 'icon_global_quality_legendary',
    onde: 'elvenwood', encantamentos: 't14fire', planejador: 'crystalegg', hypermax: 'cc_sundragon', caravana: 'caravanbanner', conta: 'img_player_titles_01', simulador: 'forest_boss', qualidade: 'icon_global_quality_legendary', passes: 'zephyrbow', recompensas: 'chest_goldcity', quadro: 'icon_achievements_gold04', loja: 'img_shop_item_sitems_gold1', expansoes: 'vertrack1', sorte: 'greatermoon', historias: 'cc_argon', skins: 'totempole01', guildas: 'icon_global_upgrade_rareresregen', players: 'img_player_titles_01', invasao: 'airshipcannon', tumba: 'chest_tomb', custos: 'timecrystal', lancamentos: 'wolf',
  };
  const DESC = {
    lista: ['Junte vários itens e veja todos os materiais somados.', 'Combine several items and see every material added up.'],
    comparar: ['Até quatro itens lado a lado, com o melhor valor destacado.', 'Up to four items side by side, best value highlighted.'],
    onde: ['Melhor área para farmar cada material.', 'Best area to farm each material.'],
    encantamentos: ['Elementos e espíritos com bônus de afinidade.', 'Elements and spirits with affinity bonuses.'],
    players: ['Jogadores, nível, investimento e histórico.', 'Players, level, investment and history.'],
    passes: ['Recompensas e tarefas de cada passe.', 'Rewards and tasks of every pass.'],
    recompensas: ['Recompensas por pontos dos eventos de missão.', 'Points rewards of quest events.'],
    quadro: ['Tarefas, metas e troféus do quadro.', 'Bounty tasks, goals and trophies.'],
    loja: ['Gemas por dólar e pacotes.', 'Gems per dollar and packs.'],
    expansoes: ['Custo de cada expansão, somado.', 'Every expansion cost, added up.'],
    sorte: ['Lua Cheia, roleta e recompensas aleatórias.', 'Full Moon, spin wheel and random rewards.'],
    historias: ['Os diálogos de cada campeão.', 'Every champion’s dialogue.'],
    skins: ['Visuais de heróis, móveis e mascotes.', 'Hero, furniture and pet cosmetics.'],
    conta: ['Seus projetos e trabalhadores, usados por todas as ferramentas.', 'Your blueprints and workers, used by every tool.'],
    simulador: ['Chance de sucesso de um grupo numa missão ou na Tumba.', 'Success chance of a party in a quest or the Tomb.'],
    qualidade: ['Chance de cada qualidade por fabricação.', 'Chance of each quality per craft.'],
    caravana: ['Itens que mais rendem em cada categoria pedida por Stahl.', 'Best-paying items for each category Stahl asks for.'],
    invasao: ['Itens mais fortes para abastecer as tropas da Aeronave.', 'Strongest items to supply the Airship troops.'],
    tumba: ['Melhores heróis para a Tumba dos Titãs, sem crítico.', 'Best heroes for the Tomb of Titans, without crit.'],
    hypermax: ['O equipamento de maior poder para cada classe.', 'The highest-power gear for every class.'],
    planejador: ['Distribua pontos nas árvores de talento.', 'Spend points across talent trees.'],
    custos: ['Custo somado de vários níveis de uma vez.', 'Total cost of several levels at once.'],
    lancamentos: ['Itens que ainda vão sair, com data.', 'Upcoming items with their dates.'],
    itens: ['Atributos, receitas e melhorias de todos os projetos do jogo, com busca e filtros por tier.', 'Stats, recipes and upgrades for every blueprint, with search and tier filters.'],
    campeoes: ['Atributos, habilidades de líder e ranks', 'Stats, leader skills and ranks'],
    classes: ['Atributos, espaços de equipamento e promoções', 'Stats, equipment slots and promotions'],
    habilidades: ['Habilidades de herói, maestrias e espíritos', 'Hero skills, masteries and spirits'],
    missoes: ['Áreas, monstros, chefes e drops', 'Areas, monsters, bosses and drops'],
    baus: ['O que cada baú pode dar', 'What each chest can drop'],
    trabalhadores: ['Níveis de construção e desbloqueios', 'Building levels and unlocks'],
    moveis: ['Prateleiras, baús, balcões e decoração', 'Racks, bins, counters and decor'],
    talentos: ['Árvore de talentos, pesquisa e estandarte', 'Talent tree, research and banner'],
    mascotes: ['Preços, comida e desbloqueios', 'Prices, food and unlocks'],
    colecao: ['Cartas e recompensas do livro', 'Cards and book rewards'],
    titulos: ['Títulos e conquistas', 'Titles and achievements'],
    guilda: ['Vantagens de guilda e custos', 'Guild perks and costs'],
    progressao: ['XP por nível, amizade e fusão', 'XP per level, friendship and fusion'],
    novidades: ['Notas de atualização e mudanças entre versões', 'Patch notes and changes between versions'],
    calculadora: ['Escolha um item e veja a árvore inteira até os recursos brutos, com marcos, Forjado nas Estrelas e ascensão.',
      'Pick an item and see the whole tree down to raw resources, with milestones, Starforged and ascension.'],
    lucro: ['Ouro por hora, XP por hora e ouro por recurso, ajustados pelo nível dos trabalhadores.',
      'Gold per hour, XP per hour and gold per resource, adjusted for worker level.'],
    montador: ['Classe, nível e equipamento: veja os atributos finais, o poder e quais missões o grupo alcança.',
      'Class, level and gear: see final stats, power and which quests the party can reach.'],
  };
  const FEATURED = ['hypermax', 'simulador', 'calendario'];
  // ícones do mosaico (os que não existirem são ignorados)
  const MOSAIC = ['aegiraxe', 'cc_sundragon', 'anubisstaff', 'celestialhelm', 'arcadesword', 'aegirshield', 'blossombow', 'castlestaff',
    'berserkerhelm', 'cc_moondragon', 'artifactsword', 'battleaxe', 'chest_forest', 'shortsword', 'beeshield', 'christmasstaff'];

  const counts = {}; // preenchidos de forma preguiçosa
  const num = (k) => (counts[k] != null ? nf(counts[k]) : '<span class="skel skel-num"></span>');

  ST.page('', {
    title: () => t('home'),
    async render(el) {
      const m = ST.meta || {};
      const ver = (m.gameVersion || '').split(' ')[0];
      const when = m.generatedAt ? new Date(m.generatedAt).toLocaleDateString(ST.locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      counts.icons = (ST.icons || []).length;
      const tiles = (links) => links.map(([p, k], i) => {
        const feat = p === 'itens', wide = p === 'missoes' || p === 'novidades';
        return `<a class="tile home-tile ${feat ? 'feat' : ''} ${wide ? 'wide' : ''}" href="#/${p}"><div class="thumb">${img(ICON[p])}</div><div class="tile-body">
          <div class="tile-title">${esc(t(k))}</div><div class="tile-sub">${esc(tr(...(DESC[p] || ['', ''])))}</div></div>
          ${feat ? `<span class="cnt" data-count="items">${num('items')}</span>` : ''}</a>`;
      }).join('');
      const NAVK = Object.fromEntries(ST.NAV.map((g) => [g[0], g]));
      const db = NAVK.db, events = NAVK.eventsNav, comm = NAVK.communityNav, tools = NAVK.tools;
      const rew = NAVK.rewardsNav;
      const mosaic = MOSAIC.filter((n) => ST.icon(n)).slice(0, 16);

      el.innerHTML = `<section class="home-hero">
          <div>
            <span class="eyebrow"><span class="pulse"></span>${tr('Dados do jogo', 'Game data')} v${esc(ver)}${when ? `<span class="eb-date"> · ${esc(when)}</span>` : ''}</span>
            <h1>${tr('Todo o Shop Titans, <em>direto dos arquivos</em> do jogo.', 'All of Shop Titans, <em>straight from</em> the game files.')}</h1>
            <p>${tr('Itens, heróis, missões, baús e talentos lidos da instalação local, mais calculadoras de fabricação, lucro e montagem de heróis.',
              'Items, heroes, quests, chests and talents read from the local install, plus crafting, profit and hero-building calculators.')}</p>
            <div class="hero-acts">
              <a class="btn primary" href="#/itens">${tr('Explorar itens', 'Browse items')} ${ST.ic('right')}</a>
              <a class="btn" href="#/hypermax">${ST.ic('star')} ${t('hypermax')}</a>
            </div>
            <div class="hero-stats">
              <div><b data-count="items">${num('items')}</b><span>${t('items')}</span></div>
              <div><b data-count="classes">${num('classes')}</b><span>${t('classes')}</span></div>
              <div><b data-count="quests">${num('quests')}</b><span>${tr('Áreas de missão', 'Quest areas')}</span></div>
              <div><b>${nf(counts.icons)}</b><span>${tr('Ícones extraídos', 'Extracted icons')}</span></div>
            </div>
          </div>
          <div class="mosaic" aria-hidden="true">${mosaic.map((n, i) => `<div class="m ${i === 5 || i === 10 ? 'hot' : ''}" style="--i:${i}">${img(n)}</div>`).join('')}</div>
        </section>
        <div class="home-sec-head"><h2>${t(db[0])}</h2><span>${db[1].length} ${tr('seções', 'sections')}</span></div>
        <div class="bento">${tiles(db[1])}</div>
        <div class="home-sec-head"><h2>${t(events[0])}</h2><span>${events[1].length} ${tr('eventos', 'events')}</span></div>
        <div class="tiles">${events[1].map(([p, k]) => `<a class="tile home-tile" href="#/${p}"><div class="thumb">${img(ICON[p])}</div><div class="tile-body"><div class="tile-title">${esc(t(k))}</div><div class="tile-sub">${esc(tr(...(DESC[p] || ['', ''])))}</div></div></a>`).join('')}</div>
        <div class="home-sec-head"><h2>${t(rew[0])}</h2><span>${rew[1].length} ${tr('seções', 'sections')}</span></div>
        <div class="tiles">${rew[1].map(([p, k]) => `<a class="tile home-tile" href="#/${p}"><div class="thumb">${img(ICON[p])}</div><div class="tile-body"><div class="tile-title">${esc(t(k))}</div><div class="tile-sub">${esc(tr(...(DESC[p] || ['', ''])))}</div></div></a>`).join('')}</div>
        <div class="home-sec-head"><h2>${t(comm[0])}</h2><span>${tr('cadastrado por você', 'entered by you')}</span></div>
        <div class="tiles">${comm[1].map(([p, k]) => `<a class="tile home-tile" href="#/${p}"><div class="thumb">${img(ICON[p])}</div><div class="tile-body"><div class="tile-title">${esc(t(k))}</div><div class="tile-sub">${esc(tr(...(DESC[p] || ['', ''])))}</div></div></a>`).join('')}</div>
        <div class="home-sec-head"><h2>${t(tools[0])}</h2><span>${tools[1].length} ${tr('ferramentas', 'tools')}</span></div>
        <div class="zig">${tools[1].filter(([p]) => FEATURED.includes(p)).map(([p, k]) => `<a href="#/${p}"><div class="zthumb">${img(ICON[p])}</div>
          <div class="zbody"><h3>${esc(t(k))}</h3><p>${esc(tr(...DESC[p]))}</p></div><span class="go">${ST.ic('right')}</span></a>`).join('')}</div>
        <div class="tiles" style="margin-top:12px">${tools[1].filter(([p]) => !FEATURED.includes(p)).map(([p, k]) => `<a class="tile home-tile" href="#/${p}">
          <div class="thumb">${img(ICON[p])}</div><div class="tile-body"><div class="tile-title">${esc(t(k))}</div><div class="tile-sub">${esc(tr(...(DESC[p] || ['', ''])))}</div></div></a>`).join('')}</div>`;

      // contagens: dados pequenos primeiro; itens (arquivo grande) quando o navegador estiver ocioso
      const fill = (k, v) => {
        counts[k] = v;
        el.querySelectorAll(`[data-count="${k}"]`).forEach((x) => { x.innerHTML = nf(v); x.classList.add('stagger'); });
      };
      ST.need('classes', 'quests').then(([c, q]) => { fill('classes', c.length); fill('quests', q.length); }).catch(() => {});
      const later = window.requestIdleCallback || ((f) => setTimeout(f, 300));
      if (counts.items == null) later(() => ST.need('items').then(([d]) => fill('items', d.items.length)).catch(() => {}));
    },
  });
})();
