/* Página "Apoiar o site": doação voluntária por Pix (QR code + chave + copia e cola). */
(function () {
  'use strict';
  const { tr, esc } = ST;
  const PIX_KEY = '98f5640f-a226-4b5c-941d-9a36429bd94c';
  const PIX_NAME = 'Diego Tavares de Melo';
  // "Pix copia e cola" (o mesmo conteúdo do QR code em img/brand/pix-qr.svg)
  const PIX_CODE = '00020126580014BR.GOV.BCB.PIX013698f5640f-a226-4b5c-941d-9a36429bd94c5204000053039865802BR5921Diego Tavares de Melo6009SAO PAULO62140510KvDGKHV0QH6304B048';
  ST.addI18n({ pt: { support: 'Apoiar o site' }, en: { support: 'Support the site' } });

  ST.page('apoiar', {
    nav: 'apoiar', title: () => ST.t('support'),
    render(el) {
      el.innerHTML = ST.pageHead(ST.t('support'), tr('O Portal ST é gratuito, sem anúncios e feito por um fã. Se ele te ajuda no jogo, uma doação de qualquer valor ajuda a pagar o servidor e o domínio e a manter as atualizações.',
        'Portal ST is free, ad-free and made by a fan. If it helps you in the game, a donation of any amount helps pay for the server and the domain and keeps the updates coming.')) +
        `<div class="sup-grid">
          <section class="panel sup-pix">
            <h3>Pix</h3>
            <img class="sup-qr" src="img/brand/pix-qr.svg" alt="${tr('QR code do Pix', 'Pix QR code')}" width="220" height="220">
            <p class="small muted">${tr('Abra o app do seu banco, escolha Pix → Ler QR code e aponte a câmera. Você escolhe o valor.', 'Open your bank app, choose Pix → Scan QR code and point the camera. You choose the amount.')}</p>
          </section>
          <section class="panel">
            <h3>${tr('Ou copie a chave', 'Or copy the key')}</h3>
            <label class="field">${tr('Chave Pix (aleatória)', 'Pix key (random)')}
              <span class="sup-copy"><input class="inp" readonly value="${esc(PIX_KEY)}" aria-label="${tr('Chave Pix', 'Pix key')}"><button class="btn primary" type="button" data-copy="${esc(PIX_KEY)}">${tr('Copiar chave', 'Copy key')}</button></span></label>
            <label class="field" style="margin-top:14px">${tr('Pix copia e cola', 'Pix copy and paste')}
              <span class="sup-copy"><input class="inp" readonly value="${esc(PIX_CODE)}" aria-label="${tr('Pix copia e cola', 'Pix copy and paste')}"><button class="btn" type="button" data-copy="${esc(PIX_CODE)}">${tr('Copiar código', 'Copy code')}</button></span></label>
            <p class="small" id="supMsg" role="status" style="min-height:1.4em;margin:10px 0 0"></p>
            <p class="small muted">${tr('Confira o nome do recebedor antes de confirmar:', 'Check the recipient name before confirming:')} <b>${esc(PIX_NAME)}</b>.</p>
          </section>
        </div>
        <p class="note">${tr('A doação é voluntária e não dá nenhuma vantagem no jogo nem acesso a conteúdo extra: o site continua igual para todo mundo. Portal de fãs, sem afiliação com a Kabam.',
          'Donations are voluntary and give no in-game advantage or extra content: the site stays the same for everyone. Fan portal, not affiliated with Kabam.')}</p>`;
      const msg = el.querySelector('#supMsg');
      el.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(b.dataset.copy); msg.textContent = tr('Copiado. Agora é só colar no app do banco.', 'Copied. Now paste it into your bank app.'); }
        catch (e) { const i = b.parentElement.querySelector('input'); i.focus(); i.select(); msg.textContent = tr('Selecionei o texto: copie com Ctrl+C.', 'Text selected: copy it with Ctrl+C.'); }
      }));
      el.querySelectorAll('.sup-copy input').forEach((i) => i.addEventListener('focus', () => i.select()));
    },
  });
})();
