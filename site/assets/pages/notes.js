/* Notas por item: cada pessoa escreve dicas na ficha do item (salvas no navegador). "Exportar notas" gera um
   data/notes.js com todas as notas; publicado junto com o site, elas aparecem para todos como "Notas da guilda". */
(() => {
  const { tr, esc } = ST;
  const KEY = 'st_notes';
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* navegador sem armazenamento */ } };
  ST.notesLocal = read;

  ST.itemNotes = async (i) => {
    const host = document.getElementById('detail');
    if (!host) return;
    let pub = {};
    try { const [N] = await ST.need('notes'); pub = (N && N.items) || {}; } catch (e) { /* sem arquivo publicado */ }
    const mine = read()[i.uid] || '';
    const shared = pub[i.uid];
    const sec = document.createElement('section');
    sec.className = 'sec notes';
    sec.innerHTML = `<h3>${tr('Notas', 'Notes')}</h3>
      ${shared ? `<div class="note-pub"><div class="small muted">${tr('Notas da guilda', 'Guild notes')}</div><p>${esc(shared).replace(/\n/g, '<br>')}</p></div>` : ''}
      <label class="field">${tr('Minha nota (fica neste navegador)', 'My note (stays in this browser)')}
        <textarea class="inp" rows="3" maxlength="2000" placeholder="${tr('Ex.: melhor arma para o Astromante na Tumba…', 'E.g. best weapon for Astramancer in the Tomb…')}">${esc(mine)}</textarea></label>
      <div class="tags"><span class="small muted" data-st></span>
        <button class="chip" type="button" data-exp>${ST.ic('down')} ${tr('Exportar notas (notes.js)', 'Export notes (notes.js)')}</button></div>
      <p class="note">${tr('Para todos verem, exporte e substitua site/data/notes.js antes de publicar. As notas publicadas e as suas são juntadas no arquivo.', 'For everyone to see, export and replace site/data/notes.js before publishing. Published notes and yours are merged into the file.')}</p>`;
    host.appendChild(sec);
    const ta = sec.querySelector('textarea'), st = sec.querySelector('[data-st]');
    let timer = 0;
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const all = read();
        if (ta.value.trim()) all[i.uid] = ta.value.trim(); else delete all[i.uid];
        write(all);
        st.textContent = tr('Salvo.', 'Saved.');
      }, 400);
    });
    sec.querySelector('[data-exp]').addEventListener('click', () => {
      const items = { ...pub, ...read() };
      const out = { exportedAt: new Date().toISOString(), items };
      const js = `/* Notas por item exportadas pelo Portal Shop Titans em ${out.exportedAt}. Coloque em site/data/notes.js */\n(window.ST = window.ST || {}).notes = ${JSON.stringify(out, null, 1)};\n`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([js], { type: 'text/javascript' }));
      a.download = 'notes.js'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      st.textContent = `${Object.keys(items).length} ${tr('notas exportadas', 'notes exported')}`;
    });
  };
})();
