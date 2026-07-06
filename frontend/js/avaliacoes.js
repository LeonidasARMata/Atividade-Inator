/**
 * avaliacoes.js — módulo de avaliações
 * Só admins podem criar/editar/excluir.
 * Todos os usuários da turma podem visualizar.
 */
const Avaliacoes = (() => {

  const TIPOS = [
    { value: 'simulado',                   label: 'Simulado' },
    { value: 'somativa',                   label: 'Somativa' },
    { value: 'segunda_chamada_simulado',   label: '2ª Chamada – Simulado' },
    { value: 'segunda_chamada_somativa',   label: '2ª Chamada – Somativa' },
    { value: 'avaliacao_especifica',       label: 'Avaliação Específica' },
  ];

  const MATERIAS_SIMULADO = ['Humanas', 'Matemática', 'Natureza', 'Linguagens'];

  const MATERIAS_NORMAIS = [
    'Matemática','Física','Química','Biologia','História','Geografia',
    'Sociologia','Filosofia','Língua Portuguesa','Produção Textual','Literatura',
    'Inglês','Arte','Interioridade',
    'Itinerário Humanas e Linguagens','Itinerário Exatas',
    'Itinerário Natureza I','Itinerário Natureza II',
    'Projeto Prepara Humanas','Projeto Prepara Linguagens',
    'Projeto Prepara Exatas','Projeto Prepara Naturezas',
  ];

  let cache      = [];
  let _editingId = null;
  let _detalheId = null;

  const getCache = () => cache;

  function isSimulado(tipo) {
    return tipo === 'simulado' || tipo === 'segunda_chamada_simulado';
  }

  // ── Carrega avaliações do servidor ─────────────────────────────
  async function carregar() {
    try {
      cache = await Api.getAvaliacoes();
      UI.renderAvaliacoes();
    } catch (e) { console.error('Erro ao carregar avaliações:', e.message); }
  }

  // ── Popula o select de tipo ────────────────────────────────────
  function montarSelectTipo(selId) {
    const sel = document.getElementById(selId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Selecione o tipo...</option>';
    TIPOS.forEach(t => {
      const o = document.createElement('option');
      o.value = t.value; o.textContent = t.label;
      sel.appendChild(o);
    });
  }

  // ── Atualiza matérias conforme tipo selecionado ────────────────
  function atualizarMateriasModal() {
    const tipo = document.getElementById('av-tipo')?.value || '';
    const sel  = document.getElementById('av-mat');
    if (!sel) return;
    const materias = isSimulado(tipo) ? MATERIAS_SIMULADO : MATERIAS_NORMAIS;
    sel.innerHTML = '<option value="">Selecione a matéria...</option>';
    materias.forEach(m => {
      const o = document.createElement('option');
      o.value = o.textContent = m;
      sel.appendChild(o);
    });
    sel.disabled = !tipo;
  }

  // ── Abre modal CRIAR ───────────────────────────────────────────
  function abrirParaCriar() {
    try {
      if (!Auth.isAdmin()) {
        console.warn('[Avaliacoes] abrirParaCriar: usuário não é admin.', Auth.get());
        return;
      }
      _editingId = null;
      document.getElementById('av-titulo-modal').textContent  = 'Nova avaliação';
      document.getElementById('btn-salvar-av').textContent    = 'Cadastrar';
      document.getElementById('btn-excluir-av').style.display = 'none';
      _limpar();
      montarSelectTipo('av-tipo');
      document.getElementById('ov-avaliacao').classList.add('on');
    } catch (e) {
      console.error('[Avaliacoes] Erro ao abrir modal:', e);
    }
  }

  // ── Abre modal EDITAR ──────────────────────────────────────────
  function abrirParaEditar(id) {
    if (!Auth.isAdmin()) return;
    const rid = id || _detalheId;
    const av  = cache.find(a => a.id === rid);
    if (!av) return;

    _editingId = rid;
    document.getElementById('av-titulo-modal').textContent      = 'Editar avaliação';
    document.getElementById('btn-salvar-av').textContent        = 'Salvar';
    document.getElementById('btn-excluir-av').style.display     = '';

    montarSelectTipo('av-tipo');
    document.getElementById('av-tipo').value    = av.tipo;
    atualizarMateriasModal();
    document.getElementById('av-mat').value     = av.materia;
    document.getElementById('av-titulo').value  = av.titulo;
    document.getElementById('av-data').value    = av.data || '';
    document.getElementById('av-horario').value = av.horario || '';
    document.getElementById('av-conteudo').value= av.conteudo || '';
    document.getElementById('av-dicas').value   = av.dicas || '';
    document.getElementById('av-material').value= av.material || '';
    document.getElementById('av-err').style.display = 'none';

    UI.fecharDetalheAvaliacao();
    document.getElementById('ov-avaliacao').classList.add('on');
  }

  // ── Salvar ────────────────────────────────────────────────────
  async function salvar() {
    const tipo     = document.getElementById('av-tipo').value;
    const materia  = document.getElementById('av-mat').value;
    const titulo   = document.getElementById('av-titulo').value.trim();
    const data     = document.getElementById('av-data').value;
    const horario  = document.getElementById('av-horario').value.trim();
    const conteudo = document.getElementById('av-conteudo').value.trim();
    const dicas    = document.getElementById('av-dicas').value.trim();
    const material = document.getElementById('av-material').value.trim();
    const err      = document.getElementById('av-err');
    const btn      = document.getElementById('btn-salvar-av');

    if (!tipo || !materia || !titulo || !data || !horario || !conteudo) {
      err.textContent = 'Preencha tipo, matéria, título, data, horário e conteúdo.';
      err.style.display = 'block'; return;
    }
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = _editingId ? 'Salvando...' : 'Cadastrando...';

    const payload = { tipo, materia, titulo, data, horario, conteudo,
                      dicas: dicas || null, material: material || null };

    try {
      if (_editingId) {
        const updated = await Api.updateAvaliacao(_editingId, payload);
        const idx = cache.findIndex(a => a.id === _editingId);
        if (idx >= 0) cache[idx] = { ...cache[idx], ...updated };
      } else {
        const nova = await Api.createAvaliacao(payload);
        cache.push(nova);
      }
      UI.fecharModalAvaliacao();
      _limpar();
      UI.renderAvaliacoes();
    } catch (e) {
      err.textContent = e.message; err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = _editingId ? 'Salvar' : 'Cadastrar';
    }
  }

  // ── Excluir pelo modal ─────────────────────────────────────────
  function excluirDoModal() {
    if (!_editingId) return;
    const av = cache.find(a => a.id === _editingId);
    UI.fecharModalAvaliacao();
    UI.abrirConfirma(
      'Excluir avaliação?',
      `"${av?.titulo || 'esta avaliação'}" será removida permanentemente.`,
      () => _excluir(_editingId)
    );
  }

  async function _excluir(id) {
    try {
      await Api.deleteAvaliacao(id);
      cache = cache.filter(a => a.id !== id);
      UI.renderAvaliacoes();
    } catch (e) { UI.abrirConfirma('Erro ao excluir', e.message, null); }
  }

  function setDetalheId(id) { _detalheId = id; }
  function getDetalheId()   { return _detalheId; }

  function tipoLabel(tipo) {
    return TIPOS.find(t => t.value === tipo)?.label || tipo;
  }

  function _limpar() {
    ['av-titulo','av-horario','av-conteudo','av-dicas','av-material','av-data']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('av-tipo').value = '';
    document.getElementById('av-mat').value  = '';
    document.getElementById('av-mat').disabled = true;
    document.getElementById('av-err').style.display = 'none';
    _editingId = null;
  }

  return {
    getCache, carregar, TIPOS, MATERIAS_SIMULADO, MATERIAS_NORMAIS,
    montarSelectTipo, atualizarMateriasModal,
    abrirParaCriar, abrirParaEditar, salvar, excluirDoModal,
    setDetalheId, getDetalheId, tipoLabel, isSimulado,
  };
})();