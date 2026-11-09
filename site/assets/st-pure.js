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
  ST.isUnreleased = (i) => !!i.releaseAt && String(i.releaseAt).slice(0, 10) > ST.today();

  /* Projeto desbloqueado segundo um perfil de "Minha conta" (sem perfil ativo: tudo liberado). */
  ST.profileHas = (a, i) => {
    if (!a || !a.on) return true;
    if ((a.hidden || []).includes(i.uid)) return false;
    if ((a.extra || []).includes(i.uid)) return true;
    return i.tier <= (a.maxTier || 0) && (!a.merchant || !i.level || i.level <= a.merchant + 5);
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
