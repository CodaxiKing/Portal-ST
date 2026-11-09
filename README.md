# Portal Shop Titans

Banco de dados e ferramentas do Shop Titans, gerados a partir dos arquivos do jogo instalado (Steam).
Site estático: abra `site/index.html` no navegador (não precisa de servidor).
Dados do jogo em 13 idiomas (pt, en, es, fr, de, it, ru, uk, tr, ja, ko, zh, zh-TW); a interface do site é
traduzida em português e inglês, e os demais idiomas usam a interface em inglês.

## Seções

**Banco de dados:** Itens · Campeões · Classes · Habilidades · Missões · Baús · Trabalhadores · Móveis ·
Talentos (árvore, pesquisa avançada, estandarte) · Mascotes · Coleção · Títulos e conquistas · Guilda ·
Progressão · Novidades (diferenças entre extrações + notas de atualização)

**Recompensas e loja:** Passes de conteúdo (recompensas grátis/completas e tarefas) · Recompensas dos eventos de missão
(Torre, Cidade Dourada, Reinhold, Invasão; com VIP) · Eventos de comunidade · Quadro de recompensas · Loja de gemas
(gemas por dólar) · Expansões (loja, vertical, porão) · Sorte (Lua Cheia, roleta, recompensas aleatórias).
Também no banco de dados: **Histórias** dos campeões (diálogos) e **Skins** (heróis, móveis, mascotes).

**Eventos:**
- **Caravana de Pharoway**: para cada tema/dia, os itens que mais rendem em cada categoria procurada, com formato na grade.
- **Invasão Dracônica**: itens mais fortes para abastecer as tropas da Aeronave, no geral e por categoria.
- **Tumba dos Titãs**: ranking de heróis sem crítico (os monstros anulam), espírito da Tumba dobrado, níveis, maldição e modificadores.

**Comunidade (cadastrada no portal):**
- **Guildas**: busca, membros, cargos, investimento total e por membro, níveis das construções da cidade, histórico e card de última atualização.
- **Jogadores**: busca, guilda, nível, ouro investido, poder, histórico de atualizações.
- Os dados ficam no navegador até você clicar em **Exportar arquivo** e substituir `site/data/community.js` (é esse arquivo que vai publicado).
  Jogadores e guildas não existem nos arquivos do jogo; ficam nos servidores da Kabam.

**Ferramentas:**
- **Minha conta**: projetos (até o tier X + exceções) e nível dos trabalhadores; lucro, Caravana, Invasão, Hypermax, Tumba e
  simulador passam a usar só o que você tem (com um botão para desligar). Salvo no navegador.
- **Simulador de missão**: 400 simulações do grupo contra uma área ou andar da Tumba (com a maldição da profundidade):
  chance de sucesso, chance de morte e nota SSS–D; “Melhor grupo” testa combinações dos heróis mais fortes. Modelo aproximado.
- **Calculadora de qualidade**: chance de cada qualidade por fabricação (constantes do jogo + bônus do projeto e extras).
- **Busca global** (Ctrl+K ou `/`): itens, classes, campeões, habilidades, missões, baús, móveis, mascotes e talentos.
- **Calculadora de fabricação**: árvore completa de materiais, com marcos, Forjado nas Estrelas e ascensão.
- **Lista de fabricação**: vários itens somados; salva no navegador e compartilhável por link.
- **Comparador**: até 4 itens lado a lado, com o melhor valor destacado.
- **Ranking de lucro**: ouro/h, XP/h e ouro por recurso, ajustados pelo nível do trabalhador.
- **Onde conseguir**: melhor área de missão (quantidade por hora) e baús para cada material.
- **Encantamentos**: elementos e espíritos por equipamento, com o bônus de afinidade das constantes do jogo.
- **Montador de herói**: classe + nível + equipamentos → atributos finais, poder e missões ao alcance.
- **Hypermax**: ficha de herói por classe com o equipamento, os encantamentos (elemento + espírito) e as habilidades (inata, espaços por nível, espíritos) de maior poder; ranking das 42 classes com HP, ATQ, DEF, escudo, evasão, crítico, dano crítico, ameaça e elemento.
- **Planejador de talentos**: pontos por árvore, custo total e bônus; o plano fica no link.
- **Custos de melhoria**: soma de vários níveis de móveis, construções, guilda e pontos de talento.
- **Lançamentos**: itens e móveis com data de lançamento, incluindo os que ainda vão sair.

**Para fora do site:**
- Uma página estática por item, classe, campeão e área (`site/p/pt|en/...`), indexável por buscadores.
- Imagem de prévia 1200×630 por item (`site/og/`), usada no Discord, WhatsApp etc.
- App instalável e com cache offline (PWA: `manifest.webmanifest` + `sw.js`, só quando servido por http/https).

## Estrutura

```
shoptitans-portal/
├─ extractor/
│  ├─ extract.py           # ponto de entrada
│  ├─ st/common.py         # leitura dos assets, textos, rótulos PT/EN
│  ├─ st/items.py          # itens
│  ├─ st/sections.py       # demais seções
│  ├─ st/icons.py          # sprites -> WebP
│  ├─ st/snapshots.py      # retrato por extração + diff
│  ├─ st/search.py         # índice da busca global
│  ├─ st/static.py         # páginas estáticas, prévias, ícones do app
│  ├─ update.ps1, register-task.ps1  # atualização automática
│  └─ snapshots/           # um JSON por versão de dados (usado em "Novidades")
└─ site/
   ├─ index.html
   ├─ assets/core.js       # roteador, idioma, carregamento de dados, componentes
   ├─ assets/pages/*.js    # home, itens, banco de dados, ferramentas
   ├─ data/meta.js, icons.js, diff.js
   ├─ data/pt/*.js, data/en/*.js
   └─ img/items/*.webp
```

## Publicar (GitHub Pages)

O workflow `.github/workflows/pages.yml` publica a pasta `site/` a cada push na `main`.
Defina o endereço público em `extractor/config.json` (`"baseUrl": "https://usuario.github.io/shoptitans-portal/"`)
para gerar `sitemap.xml`, `robots.txt` e links absolutos nas prévias.

## VPS (Linux) e aviso no Discord

Veja `deploy/README.md`: SteamCMD baixa o jogo, `extractor/update.sh` extrai quando o build muda e publica
(cópia para o servidor web e/ou push), com timer do systemd a cada 6 h. Com `"discordWebhook"` em `extractor/config.json`,
cada patch com mudanças gera um resumo no Discord (uma vez por patch).

## Atualização automática

`extractor/update.ps1` compara o build da Steam com o último extraído, roda o extrator quando muda,
faz commit e push (se houver remoto). Para rodar todo dia às 9h e após o logon:

```powershell
powershell -ExecutionPolicy Bypass -File extractor
egister-task.ps1          # registrar
powershell -ExecutionPolicy Bypass -File extractor
egister-task.ps1 -Remove  # remover
```

## Atualizar manualmente após um patch do jogo

```powershell
cd extractor
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python extract.py
```

Só os ícones e as imagens de prévia novos ou alterados são gerados (`--force-icons`, `--force-og` refazem tudo;
`--no-icons` e `--no-pages` pulam essas etapas; `--base-url` sobrepõe o `config.json`).
Cada extração com dados diferentes cria um retrato em `extractor/snapshots/`, e a página **Novidades**
passa a mostrar itens novos, removidos e alterados.

## De onde vêm os dados

| Arquivo do jogo | Conteúdo |
|---|---|
| `ShopTitan_Data/resources.assets` (TextAssets JSON) | `items`, `heroes`, `classes`, `skills`, `quests`, `chestodds`, `furniture`, `skillTreeNodes`, `texts_pt`, `texts_en`… |
| `ShopTitan_Data/globalgamemanagers` + `appmanifest_1258080.acf` | versão do jogo e build da Steam |
| `StreamingAssets/ui`, `ui_shop_furnitures`, `ui_card_*` (AssetBundles) | ícones e artes das cartas |

## Limitações conhecidas

- Atributos dos itens são valores base (qualidade Normal). Os multiplicadores de qualidade (1 / 1,25 / 1,5 / 2 / 3)
  vêm das constantes do jogo (`item_power_*_mult`).
- Hypermax é calculado só com os dados do jogo: Forjado nas Estrelas, Ascensão + Transcendência, encantamentos com afinidade,
  elemento do herói (encantamentos + elemento próprio dos itens) liberando o tier das habilidades, Livro de Coleção (melhor carta
  da classe), espíritos acumulando por item (6× Leviatã = +18% de crítico, conferido no jogo), espírito da Tumba só na
  Torre/Tumba e poder com crítico e ameaça. Campeões, sementes e boosters não entram (dependem da missão). As fórmulas exatas
  ficam no código compilado do jogo; os nomes dos métodos (CalculateAttackPower, CalculateCriticalRatePower...) confirmam os
  componentes usados, mas os pesos de crítico e evasão são estimados.
- Caravana: a pontuação mostrada é relativa (valor × qualidade × bônus de procurado); a conversão exata em Vales não está
  nos arquivos.
- O montador interpola os atributos da classe entre os níveis 1, 40, 50 e 100 e não considera habilidades,
  encantamentos nem elementos.
- Prateleiras, mesas, balcões e baús de loja são modelos 3D sem ícone 2D no jogo.
- Itens com `releaseAt` no futuro ainda não foram lançados: ficam na aba "Em breve" da lista de itens (e fora das outras abas e do ranking de lucro). Datas em 2099 significam "sem data".
- As 6 melhorias especiais de cada projeto são divididas em Ascensão (1–3, Estilhaços) e Transcendência (4–6, Selos; aumentam atributos). A ficha do item tem um seletor Base / Ascensão / Transcendência com a etapa 1–3.
- Encantamentos: o bônus de afinidade (×1,5; "Todos" ×1,25) vem das constantes do jogo; o bônus de valor elemental não entra na conta.
- Custos de construções da cidade estão em pontos de investimento, como no jogo; a conversão para ouro depende do tier.
- Preços de mercado e simulação exata de combate não existem nos arquivos locais.
