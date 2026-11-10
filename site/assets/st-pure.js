/* Funções puras (sem página/DOM) compartilhadas pela página, pelo Web Worker do Hypermax e pelos testes em Node.
   Carregar antes de core.js. */
(function (root) {
  const ST = (root.ST = root.ST || {});

  /* Aplica uma lista de efeitos (na ordem do jogo) ao item: atributos, receita, valor, tempo e efeitos extras. */
  const STAT_KEYS = ['atk', 'def', 'hp', 'eva', 'crit', 'shieldHp'];
  ST.applySteps = function applySteps(i, steps) {
    const st = { ...i.stats }, res = (i.resources || []).map((r) => ({ ...r })), comps = (i.components || []).map((c) => ({ ...c }));
    let value = i.value || 0, time = i.time || 0;
    const other = [];
    const num = (x, u) => (u.op === '-' ? Math.max(0, x - u.v) : u.op === '*' ? x * u.v : x + u.v);
    for (const u of steps) {
      const m = u.key && u.key.match(/^(resource|component)(\d)$/);
      if (m) { const tgt = (m[1] === 'resource' ? res : comps)[+m[2] - 1]; if (tgt) tgt.qty = num(tgt.qty, u); }
      else if (STAT_KEYS.includes(u.key)) st[u.key] = num(st[u.key] || 0, u);
      else if (u.key === 'baseStats' && u.op === '*') ['atk', 'def', 'hp'].forEach((k) => (st[k] = (st[k] || 0) * u.v));
      else if (u.key === 'value') value = num(value, u);
      else if (u.key === 'time') time = num(time, u);
      else other.push(u.text);
    }
    ['atk', 'def', 'hp', 'shieldHp'].forEach((k) => (st[k] = Math.round(st[k] || 0)));
    res.forEach((r) => (r.qty = Math.ceil(r.qty)));
    comps.forEach((c) => (c.qty = Math.ceil(c.qty)));
    return { stats: st, res, comps, value: Math.round(value), time, other };
  };

  /* Atributo da classe num nível (interpola os pontos 1/40/50/100 do jogo). */
  ST.statAt = function statAt(points, lv) {
    const pts = Object.entries(points).map(([l, v]) => [+l, v]).filter(([l, v]) => l === 1 || v).sort((a, b) => a[0] - b[0]);
    if (lv <= pts[0][0]) return pts[0][1];
    for (let k = 1; k < pts.length; k++) {
      const [l0, v0] = pts[k - 1], [l1, v1] = pts[k];
      if (lv <= l1) return v0 + (v1 - v0) * (lv - l0) / (l1 - l0);
    }
    return pts[pts.length - 1][1];
  };
  ST.maxLevel = (c) => (c.stats.atk['100'] ? 100 : c.stats.atk['50'] ? 50 : 40);
  ST.QUALITY = [[1, ['Normal', 'Common']], [1.25, ['Superior', 'Uncommon']], [1.5, ['Magistral', 'Flawless']], [2, ['Épico', 'Epic']], [3, ['Lendário', 'Legendary']]];

  /* Já está nos arquivos, mas a data de lançamento ainda não chegou (2099 = sem data definida). */
  ST.today = () => new Date().toISOString().slice(0, 10);
  ST.addDays = (d, n) => { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  ST.isUnreleased = (i) => !!i.releaseAt && String(i.releaseAt).slice(0, 10) > ST.today();

  /* Projeto desbloqueado segundo um perfil de "Minha conta" (sem perfil ativo: tudo liberado). */
  ST.profileHas = (a, i) => {
    if (!a || !a.on) return true;
    if ((a.hidden || []).includes(i.uid)) return false;
    if ((a.extra || []).includes(i.uid)) return true;
    return i.tier <= (a.maxTier || 0) && (!a.merchant || !i.level || i.level <= a.merchant + 5);
  };

  /* ---------------------------------------------------------------- Caravana */
  /* Ordem dos dias (rota 1 dias 1–5, rota 2 dias 1–5, …) e a data de cada um a partir de um dia marcado.
     anchor = {date: 'AAAA-MM-DD', uid: 'caravan1_03', gap: dias sem caravana entre uma rota e outra}. */
  ST.caravanOrder = (days) => days.slice().sort((a, b) => a.family.localeCompare(b.family, undefined, { numeric: true }) || a.day - b.day);
  ST.caravanProject = function (days, anchor, from, count) {
    const seq = ST.caravanOrder(days), n = seq.length, gap = Math.max(0, +(anchor && anchor.gap) || 0);
    const k0 = seq.findIndex((x) => x.uid === (anchor && anchor.uid));
    if (k0 < 0 || !anchor.date) return [];
    // posição de cada dia num ciclo com "gap" dias vazios depois de cada rota
    const fams = [...new Set(seq.map((x) => x.family))];
    const slots = [];
    fams.forEach((f) => { seq.filter((x) => x.family === f).forEach((x) => slots.push(x)); for (let g = 0; g < gap; g++) slots.push(null); });
    const L = slots.length, s0 = slots.indexOf(seq[k0]);
    const diff = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);
    const out = [];
    for (let i = 0; out.length < count && i < count * 4 + L; i++) {
      const date = ST.addDays(from, i);
      const off = diff(date, anchor.date);
      const x = slots[(((s0 + off) % L) + L) % L];
      if (x) out.push({ date, day: x });
    }
    return n ? out : [];
  };

  /* Monta o carroção: encaixa itens (formatos do caravanItems) na grade do dia, até maxItems lugares com até "stack"
     cópias em cada um. cands: [{id, s (pontos por cópia), sh: {w, l, map}, cats: [categorias procuradas que ele cumpre]}].
     Guloso com várias ordens (densidade, valor, procurados primeiro) + reinícios aleatórios; fica com o melhor total. */
  const shapeCells = (sh) => {
    const m = String(sh.map || '1').split(','), w = +sh.w || 1, l = +sh.l || 1, out = [];
    for (let r = 0; r < l; r++) for (let c = 0; c < w; c++) if (m[r * w + c] === '1') out.push([r, c]);
    return out.length ? out : [[0, 0]];
  };
  const rotations = (cells, rotate) => {
    const norm = (cs) => { const mr = Math.min(...cs.map((x) => x[0])), mc = Math.min(...cs.map((x) => x[1])); return cs.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); };
    const out = [norm(cells)];
    if (rotate) { let cur = cells; for (let k = 0; k < 3; k++) { cur = cur.map(([r, c]) => [c, -r]); out.push(norm(cur)); } }
    const seen = new Set();
    return out.filter((cs) => { const key = JSON.stringify(cs); if (seen.has(key)) return false; seen.add(key); return true; });
  };
  ST.caravanPack = function (grid, cands, opt) {
    const W = +grid.w, H = +grid.l, cellsMap = String(grid.map || '').split(',').map((x) => x === '1');
    const maxItems = opt.maxItems || 10, stack = opt.stack || 1, wanted = opt.wanted || [], allBonus = opt.allBonus || 0;
    const C = cands.map((x) => ({ ...x, rots: rotations(shapeCells(x.sh), opt.rotate), n: shapeCells(x.sh).length }));
    const tryPlace = (free, it) => {
      for (const rot of it.rots) for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
        let ok = true;
        for (const [dr, dc] of rot) { const rr = r + dr, cc = c + dc; if (rr >= H || cc >= W || !free[rr * W + cc]) { ok = false; break; } }
        if (ok) return rot.map(([dr, dc]) => (r + dr) * W + (c + dc));
      }
      return null;
    };
    const run = (order) => {
      const free = cellsMap.slice(), placed = [];
      for (const it of order) {
        if (placed.length >= maxItems) break;
        if (!opt.repeat && placed.some((p) => p.id === it.id)) continue;
        const cells = tryPlace(free, it);
        if (!cells) continue;
        cells.forEach((k) => (free[k] = false));
        placed.push({ id: it.id, cells, s: it.s * stack, cats: it.cats });
      }
      const covered = wanted.filter((w) => placed.some((p) => p.cats.includes(w)));
      const all = wanted.length > 0 && covered.length === wanted.length;
      const base = placed.reduce((a, p) => a + p.s, 0);
      return { placements: placed, base, total: base * (all ? 1 + allBonus : 1), allWanted: all, covered, used: placed.reduce((a, p) => a + p.cells.length, 0) };
    };
    const byDensity = C.slice().sort((a, b) => b.s / b.n - a.s / a.n), byValue = C.slice().sort((a, b) => b.s - a.s);
    const wantedFirst = [];
    wanted.forEach((w) => { const best = byDensity.find((x) => x.cats.includes(w) && !wantedFirst.includes(x)); if (best) wantedFirst.push(best); });
    const orders = [byDensity, byValue, [...wantedFirst, ...byDensity], [...wantedFirst, ...byValue]];
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const top = byDensity.slice(0, 40);
    for (let k = 0; k < (opt.iters ?? 150); k++) {
      const o = top.slice().sort((a, b) => b.s / b.n * (0.6 + rnd()) - a.s / a.n * (0.6 + rnd()));
      orders.push(rnd() < 0.5 ? [...wantedFirst, ...o] : o);
    }
    let best = null;
    for (const o of orders) { const r = run(o); if (!best || r.total > best.total) best = r; }
    best.free = cellsMap.filter(Boolean).length;
    return best;
  };

  /* iCalendar (RFC 5545) com eventos de dia inteiro: [{uid, date: 'AAAA-MM-DD', title, desc}] */
  const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const fold = (line) => { // linhas de no máximo 75 caracteres
    const out = [];
    for (let i = 0; i < line.length; i += 74) out.push((i ? ' ' : '') + line.slice(i, i + 74));
    return out.join('\r\n');
  };
  const ymd = (d) => d.replace(/-/g, '');
  const nextDay = (d) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); };
  ST.icsText = function (events, now) {
    const stamp = (now || new Date()).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Portal Shop Titans//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Shop Titans'];
    for (const e of events) {
      lines.push('BEGIN:VEVENT', `UID:${e.uid}@portal-shoptitans`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(e.date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(e.date))}`,
        fold('SUMMARY:' + icsEsc(e.title)), ...(e.desc ? [fold('DESCRIPTION:' + icsEsc(e.desc))] : []), 'TRANSP:TRANSPARENT', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  };
})(typeof self !== 'undefined' ? self : globalThis);
