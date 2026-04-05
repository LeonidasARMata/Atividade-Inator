document.addEventListener('DOMContentLoaded', async () => {

  // Acorda o servidor imediatamente (warm-up).
  // O Render hiberna após 15min — essa chamada roda em segundo plano
  // enquanto o usuário ainda está digitando, então o servidor já
  // está de pé quando ele clicar em "Entrar".
  _warmup();

  // Tenta restaurar sessão existente via token salvo.
  // Se restaurar, _entrarApp() já chama Tasks.carregar() e Registros.carregar().
  await Auth.tentarRestaurar();

  // Carrega turmas no formulário de cadastro
  await Auth.carregarTurmas();

  // Enter no campo de senha faz login
  document.getElementById('l-senha')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') Auth.login();
  });

  // Fechar overlays clicando fora do modal
  ['ov-tarefa','ov-registro','ov-cfg','ov-imagem','ov-confirma','ov-reg-detalhe','ov-avaliacao','ov-av-detalhe'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        if (id === 'ov-tarefa')   UI.fecharModalTarefa();
        if (id === 'ov-registro') UI.fecharModalRegistro();
        if (id === 'ov-cfg')      UI.fecharCfg();
        if (id === 'ov-imagem')      UI.fecharImagem();
        if (id === 'ov-confirma')    UI.fecharConfirma();
        if (id === 'ov-reg-detalhe')  UI.fecharDetalheRegistro();
        if (id === 'ov-avaliacao')    UI.fecharModalAvaliacao();
        if (id === 'ov-av-detalhe')   UI.fecharDetalheAvaliacao();
      }
    });
  });

  // Fechar com Esc
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    UI.fecharModalTarefa();
    UI.fecharModalRegistro();
    UI.fecharCfg();
    UI.fecharImagem();
    UI.fecharConfirma();
    UI.fecharDetalheRegistro();
    UI.fecharModalAvaliacao();
    UI.fecharDetalheAvaliacao();
  });
});

// Chama /health silenciosamente para acordar o servidor.
// Não bloqueia nada — roda em paralelo com o resto da página.
function _warmup() {
  fetch(CONFIG.API_URL + '/health', { method: 'GET' }).catch(() => {});
}