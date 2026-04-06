/**
 * termos.js — gerencia exibição e aceite dos Termos e Condições
 *
 * Dois fluxos:
 *   1. Cadastro  → mostra termos, usuário aceita, depois cria a conta
 *   2. Login     → após autenticar, verifica se aceitou versão atual;
 *                  se não, mostra termos antes de entrar no app
 */
const Termos = (() => {

  let _termosAtual   = null;   // { id, versao, titulo, conteudo }
  let _modo          = null;   // 'cadastro' | 'login'
  let _dadosCadastro = null;   // payload guardado enquanto mostra termos
  let _onConfirmar   = null;   // callback após aceite

  // ── Exibe o modal ──────────────────────────────────────────────
  async function mostrar(modo, dados, onConfirmar) {
    _modo          = modo;
    _dadosCadastro = dados;
    _onConfirmar   = onConfirmar;

    try {
      _termosAtual = await Api.getTermosAtual();
    } catch {
      // Se não conseguir buscar os termos, permite prosseguir
      if (_onConfirmar) _onConfirmar(null);
      return;
    }

    // Preenche o modal
    document.getElementById('termos-titulo').textContent =
      _termosAtual.titulo || 'Termos e Condições de Uso';
    document.getElementById('termos-versao').textContent =
      `Versão ${_termosAtual.versao}`;

    // Renderiza o conteúdo formatado
    const body = document.getElementById('termos-body');
    body.innerHTML = _termosAtual.conteudo
      .split('\n')
      .map(linha => {
        if (linha.startsWith('━'))
          return `<hr class="termos-hr">`;
        if (/^\d+\./.test(linha) && linha.length < 60)
          return `<p class="termos-secao">${linha}</p>`;
        if (linha.startsWith('•'))
          return `<p class="termos-item">${linha}</p>`;
        if (linha.trim() === '')
          return '';
        return `<p class="termos-p">${linha}</p>`;
      })
      .join('');

    // Configura botões conforme o modo
    const btnCancelar  = document.getElementById('btn-termos-cancelar');
    const btnConfirmar = document.getElementById('btn-termos-confirmar');

    btnConfirmar.textContent = modo === 'cadastro' ? 'Cadastrar-se' : 'Confirmar e entrar';
    btnCancelar.style.display = modo === 'login' ? 'none' : '';  // no login não pode cancelar

    // Reseta o checkbox
    document.getElementById('termos-check').checked = false;
    btnConfirmar.disabled = true;

    document.getElementById('ov-termos').classList.add('on');
    body.scrollTop = 0;
  }

  // ── Checkbox alterado ──────────────────────────────────────────
  function onCheckChange() {
    const checked = document.getElementById('termos-check').checked;
    document.getElementById('btn-termos-confirmar').disabled = !checked;
  }

  // ── Confirmar aceite ───────────────────────────────────────────
  async function confirmar() {
    const btn = document.getElementById('btn-termos-confirmar');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    try {
      // Aceite só registra se o usuário já estiver logado (modo login)
      // No cadastro, o aceite é registrado após a criação da conta
      if (_modo === 'login' && _termosAtual) {
        await Api.aceitarTermos(_termosAtual.id);
      }

      document.getElementById('ov-termos').classList.remove('on');
      if (_onConfirmar) _onConfirmar(_termosAtual?.id);
    } catch (e) {
      btn.disabled = false;
      btn.textContent = _modo === 'cadastro' ? 'Cadastrar-se' : 'Confirmar e entrar';
      alert('Erro ao registrar aceite: ' + e.message);
    }
  }

  // ── Cancelar (só no cadastro) ──────────────────────────────────
  function cancelar() {
    document.getElementById('ov-termos').classList.remove('on');
    _dadosCadastro = null;
    _onConfirmar   = null;
  }

  // ── Verificação no login ───────────────────────────────────────
  // Chamado após autenticar — verifica se precisa aceitar novos termos
  async function verificarAposLogin(onOk) {
    try {
      const status = await Api.getTermosStatus();
      if (status.aceito) {
        onOk();   // tudo certo, entra no app
      } else {
        // Precisa aceitar a nova versão
        mostrar('login', null, async () => {
          onOk();
        });
        // Preenche com os termos recebidos no status (evita 2ª requisição)
        if (status.termos) _termosAtual = status.termos;
      }
    } catch {
      onOk();   // em caso de erro, não bloqueia o login
    }
  }

  return { mostrar, onCheckChange, confirmar, cancelar, verificarAposLogin };
})();