const Registros = (() => {
  let cache      = [];
  let _editingId = null;
  let _detalheId = null;   // registro atualmente aberto no detalhe

  const getCache = () => cache;

  async function carregar() {
    try { cache = await Api.getRegistros(); UI.renderRegistros(); }
    catch (e) { console.error(e.message); }
  }

  // ── Abre modal no modo CRIAR (só admin) ────────────────────────
  function abrirParaCriar() {
    if (!Auth.isAdmin()) return;
    _editingId = null;
    document.getElementById('rg-titulo-modal').textContent         = 'Novo registro';
    document.getElementById('btn-add-registro').textContent        = 'Publicar';
    document.getElementById('btn-excluir-registro').style.display  = 'none';
    _limpar();
    const d = document.getElementById('rg-data');
    if (d) d.value = Dates.hojeISO();   // sempre começa com hoje, editável
    document.getElementById('ov-registro').classList.add('on');
  }

  // ── Abre modal no modo EDITAR (só admin) ───────────────────────
  function abrirParaEditar(id) {
    if (!Auth.isAdmin()) return;
    const rid = id || _detalheId;
    const reg = cache.find(r => r.id === rid);
    if (!reg) return;

    _editingId = rid;
    document.getElementById('rg-titulo-modal').textContent        = 'Editar registro';
    document.getElementById('btn-add-registro').textContent       = 'Salvar';
    document.getElementById('btn-excluir-registro').style.display = '';

    document.getElementById('rg-titulo').value = reg.titulo || '';
    document.getElementById('rg-desc').value   = reg.descricao || '';
    document.getElementById('rg-data').value   = reg.data_atribuicao || '';

    const selMat = document.getElementById('rg-mat');
    [...selMat.options].forEach(o => { o.selected = o.value === reg.materia; });

    document.getElementById('rg-imgs').value = '';
    document.getElementById('rg-arq').value  = '';
    document.getElementById('rg-err').style.display = 'none';

    // Fecha o detalhe e abre o modal
    UI.fecharDetalheRegistro();
    document.getElementById('ov-registro').classList.add('on');
  }

  // ── Salvar (criar ou editar) ───────────────────────────────────
  async function salvar() {
    const titulo = document.getElementById('rg-titulo').value.trim();
    const materia = document.getElementById('rg-mat').value;
    const data_atribuicao = document.getElementById('rg-data').value || Dates.hojeISO();
    const descricao = document.getElementById('rg-desc').value.trim();
    const imgs = document.getElementById('rg-imgs').files;
    const arq  = document.getElementById('rg-arq').files;
    const err  = document.getElementById('rg-err');
    const btn  = document.getElementById('btn-add-registro');

    if (!titulo || !materia) {
      err.textContent = 'Preencha título e matéria.'; err.style.display = 'block'; return;
    }
    // Valida: precisa de pelo menos um conteúdo
    const temDesc = descricao.length > 0;
    const temImg  = imgs.length > 0;
    const temArq  = arq.length > 0;
    // Em edição, já pode ter imagens/arquivo existentes
    const jaTemConteudo = _editingId && cache.find(r => r.id === _editingId)
      && (cache.find(r => r.id === _editingId).imagens?.length > 0
       || cache.find(r => r.id === _editingId).arquivo_url
       || cache.find(r => r.id === _editingId).descricao);

    if (!temDesc && !temImg && !temArq && !jaTemConteudo) {
      err.textContent = 'Preencha pelo menos um: descrição, imagem ou arquivo.';
      err.style.display = 'block'; return;
    }
    err.style.display = 'none';
    btn.disabled = true;
    btn.textContent = _editingId ? 'Salvando...' : 'Publicando...';

    try {
      const fd = new FormData();
      fd.append('titulo', titulo);
      fd.append('materia', materia);
      fd.append('data_atribuicao', data_atribuicao);
      fd.append('descricao', descricao);
      for (const f of imgs) fd.append('imagens', f);
      if (arq[0]) fd.append('arquivo', arq[0]);

      if (_editingId) {
        const updated = await Api.updateRegistro(_editingId, fd);
        const idx = cache.findIndex(r => r.id === _editingId);
        if (idx >= 0) cache[idx] = { ...cache[idx], ...updated };
      } else {
        const novo = await Api.createRegistro(fd);
        cache.unshift(novo);
      }
      UI.fecharModalRegistro();
      _limpar();
      UI.renderRegistros();
    } catch (e) {
      err.textContent = e.message; err.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = _editingId ? 'Salvar' : 'Publicar';
    }
  }

  // ── Excluir pelo botão do modal ────────────────────────────────
  function excluirDoModal() {
    if (!_editingId) return;
    const reg = cache.find(r => r.id === _editingId);
    const titulo = reg?.titulo || 'este registro';
    UI.fecharModalRegistro();
    UI.abrirConfirma(
      'Excluir registro?',
      `"${titulo}" e todos os seus arquivos serão removidos permanentemente.`,
      () => _excluir(_editingId)
    );
  }

  async function _excluir(id) {
    try {
      await Api.deleteRegistro(id);
      cache = cache.filter(r => r.id !== id);
      UI.renderRegistros();
    } catch (e) { UI.abrirConfirma('Erro ao excluir', e.message, null); }
  }

  // Guarda o id do registro aberto no detalhe (para o botão Editar do detalhe)
  function setDetalheId(id) { _detalheId = id; }
  function getDetalheId()   { return _detalheId; }

  function _limpar() {
    ['rg-titulo','rg-desc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('rg-mat').value  = '';
    document.getElementById('rg-data').value = '';
    document.getElementById('rg-imgs').value = '';
    document.getElementById('rg-arq').value  = '';
    document.getElementById('rg-err').style.display = 'none';
    _editingId = null;
  }

  return { getCache, carregar, abrirParaCriar, abrirParaEditar, salvar, excluirDoModal, setDetalheId, getDetalheId };
})();