const Auth = (() => {
  let currentUser = null;
  const get = () => currentUser;
  const isAdmin = () => currentUser?.is_admin === true;

  // ── Carrega turmas no select do cadastro ──────────────────────
  async function carregarTurmas() {
    try {
      const turmas = await Api.getTurmas();
      const sel    = document.getElementById('r-turma');
      sel.innerHTML = '<option value="">Selecione a turma...</option>';
      turmas.forEach(t => {
        const o = document.createElement('option');
        o.value = t.id;
        o.textContent = `${t.ano}º Ano — Turma ${t.letra}`;
        sel.appendChild(o);
      });
    } catch {}
  }

  // ── Registro ──────────────────────────────────────────────────
  async function register() {
    const email    = _v('r-email');
    const nome     = _v('r-nome');
    const username = _v('r-username');
    const turma_id = document.getElementById('r-turma')?.value || '';
    const senha    = _v('r-senha');
    const confirma = _v('r-confirma');

    _hideErr('r-err');

    if (!nome)          return _err('r-err', 'Informe seu nome completo.');
    if (!email)         return _err('r-err', 'Informe seu e-mail.');
    if (!username)      return _err('r-err', 'Informe um nome de usuário.');
    if (!turma_id)      return _err('r-err', 'Selecione sua turma.');
    if (!senha)         return _err('r-err', 'Crie uma senha.');
    if (senha.length < 6)   return _err('r-err', 'A senha deve ter pelo menos 6 caracteres.');
    if (senha !== confirma) return _err('r-err', 'As senhas não coincidem.');

    // Validações ok — mostra termos antes de criar a conta
    Termos.mostrar('cadastro', { email, nome, username, turma_id, senha }, _criarConta);
  }

  async function _criarConta(termosId) {
    const btn = document.querySelector('#pg-register .btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Criando conta...'; }

    const email    = _v('r-email');
    const nome     = _v('r-nome');
    const username = _v('r-username');
    const turma_id = document.getElementById('r-turma')?.value || '';
    const senha    = _v('r-senha');

    try {
      const res = await Api.register({ email, nome, username, turma_id, senha });
      localStorage.setItem('token', res.token);
      currentUser = res.user;

      // Registra aceite dos termos após criação da conta
      if (termosId) {
        try { await Api.aceitarTermos(termosId); } catch (_) {}
      }

      _entrarApp();
    } catch (e) {
      _err('r-err', _friendlyError(e.message));
      UI.show('pg-register');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Criar conta'; }
    }
  }

  // ── Login ─────────────────────────────────────────────────────
  async function login() {
    const email = _v('l-email');
    const senha = _v('l-senha');

    _hideErr('l-err');

    if (!email) return _err('l-err', 'Informe seu e-mail.');
    if (!senha) return _err('l-err', 'Informe sua senha.');

    const btn = document.querySelector('#pg-login .btn');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const res = await Api.login(email, senha);
      localStorage.setItem('token', res.token);
      currentUser = res.user;

      // Verifica se precisa aceitar versão nova dos termos
      await Termos.verificarAposLogin(() => _entrarApp());
    } catch (e) {
      _err('l-err', _friendlyError(e.message));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  }

  // ── Config + Perfil ──────────────────────────────────────────
  async function salvarConfig2() {
    const dias      = parseInt(document.getElementById('cfg2-dias').value);
    const atencao   = UI.getChecked('cfg2-materias');
    const username  = document.getElementById('cfg2-username')?.value.trim() || '';
    const senhaAtual= document.getElementById('cfg2-senha-atual')?.value || '';
    const senhaNova = document.getElementById('cfg2-senha-nova')?.value || '';
    const senhaConf = document.getElementById('cfg2-senha-conf')?.value || '';
    const errEl     = document.getElementById('cfg2-err');
    if (errEl) errEl.style.display = 'none';

    // Valida senha antes de salvar
    if (senhaNova && senhaNova !== senhaConf) {
      if (errEl) { errEl.textContent = 'As senhas não coincidem.'; errEl.style.display = 'block'; }
      return;
    }
    if (senhaNova && senhaNova.length < 6) {
      if (errEl) { errEl.textContent = 'A nova senha deve ter pelo menos 6 caracteres.'; errEl.style.display = 'block'; }
      return;
    }

    try {
      // Salva preferências
      currentUser = await Api.updateConfig(dias, atencao);

      // Salva perfil se houve alteração
      const perfilPayload = {};
      if (username && username !== currentUser.username) perfilPayload.username = username;
      if (senhaNova) { perfilPayload.senha_atual = senhaAtual; perfilPayload.senha_nova = senhaNova; }

      if (Object.keys(perfilPayload).length > 0) {
        const res = await Api.updateProfile(perfilPayload);
        currentUser = res.user;
        // Atualiza token com novo username
        if (res.token) localStorage.setItem('token', res.token);
        // Atualiza exibição na topbar
        document.getElementById('av-nome').textContent = currentUser.username;
      }

      // Limpa campos de senha
      ['cfg2-senha-atual','cfg2-senha-nova','cfg2-senha-conf'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      UI.fecharCfg();
      UI.render();
    } catch (e) {
      if (errEl) { errEl.textContent = e.message; errEl.style.display = 'block'; }
      else alert(e.message);
    }
  }

  // ── Logout ────────────────────────────────────────────────────
  function sair() {
    Tasks.pararPolling();
    currentUser = null;
    localStorage.removeItem('token');
    document.getElementById('fab').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';
    UI.show('pg-login');
  }

  // ── Restaurar sessão ──────────────────────────────────────────
  async function tentarRestaurar() {
    if (!localStorage.getItem('token')) return false;
    try {
      currentUser = await Api.getMe();
      // Verifica termos antes de entrar no app
      await Termos.verificarAposLogin(() => _entrarApp());
      return true;
    } catch {
      localStorage.removeItem('token');
      return false;
    }
  }

  // ── privado ───────────────────────────────────────────────────
  function _entrarApp() {
    const u        = currentUser;
    const initials = u.nome.split(' ').slice(0,2).map(x => x[0].toUpperCase()).join('');
    document.getElementById('av').textContent       = initials;
    document.getElementById('av-nome').textContent  = u.username;
    document.getElementById('av-turma').textContent =
      `${u.turma_id[0]}º Ano · Turma ${u.turma_id[1]}`;

    if (u.is_admin) {
      document.getElementById('admin-menu-wrap').style.display = 'flex';
    }

    document.getElementById('bottom-nav').style.display = 'flex';
    document.getElementById('fab').style.display = 'flex';
    UI.montarSelectMaterias();
    UI.show('pg-app');
    UI.setSection('tarefas');

    // Carrega dados APÓS a UI estar visível e inicia polling.
    // setTimeout garante que o browser renderiza a tela primeiro,
    // evitando tela em branco no celular na primeira entrada.
    setTimeout(() => {
      Tasks.carregar().then(() => Tasks.iniciarPolling());
      Registros.carregar();
      Avaliacoes.carregar();
    }, 0);
  }

  const _v       = id => document.getElementById(id)?.value?.trim() || '';
  const _hideErr = id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
  const _err     = (id, msg) => {
    const el = document.getElementById(id);
    el.textContent = msg; el.style.display = 'block';
  };

  // Traduz erros técnicos para mensagens amigáveis
  function _friendlyError(msg) {
    if (!msg || msg.includes('fetch') || msg.includes('network') || msg.includes('Failed'))
      return 'Não foi possível conectar ao servidor. Tente novamente.';
    if (msg.includes('não encontrado') || msg.includes('not found'))
      return 'E-mail não cadastrado. Verifique ou crie uma conta.';
    if (msg.includes('Senha incorreta') || msg.includes('incorreta'))
      return 'Senha incorreta. Tente novamente.';
    if (msg.includes('já cadastrado') || msg.includes('already'))
      return 'E-mail ou nome de usuário já está em uso.';
    if (msg.includes('Turma inválida'))
      return 'Selecione uma turma válida.';
    return msg;
  }

  return { get, isAdmin, carregarTurmas, register, login, salvarConfig2, sair, tentarRestaurar };
})();