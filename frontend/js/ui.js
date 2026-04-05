/**
 * ui.js — renderização e controle da interface
 */

const MATERIAS = [
  'Matemática','Física','Química','Biologia','História','Geografia',
  'Sociologia','Filosofia','Língua Portuguesa','Produção Textual','Literatura',
  'Inglês','Arte','Interioridade',
  'Itinerário Humanas e Linguagens','Itinerário Exatas',
  'Itinerário Natureza I','Itinerário Natureza II',
  'Projeto Prepara Humanas','Projeto Prepara Linguagens',
  'Projeto Prepara Exatas','Projeto Prepara Naturezas',
];

const UI = (() => {
  let currentTab     = 'pendentes';
  let currentSection = 'tarefas';
  let _confirmaCallback = null;   // função a executar ao confirmar

  // ─── Páginas ──────────────────────────────────────────────────────────────

  function show(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
    document.getElementById(pageId).classList.add('on');
  }

  // ─── Seções da bottom nav ─────────────────────────────────────────────────

  function setSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('on'));
    document.querySelector(`.nav-btn[data-section="${section}"]`)?.classList.add('on');

    document.querySelectorAll('.section').forEach(s => s.classList.remove('on'));
    document.getElementById(`sec-${section}`)?.classList.add('on');

    const fab = document.getElementById('fab');
    const isAdmin = Auth.isAdmin();
    if (section === 'tarefas') fab.style.display = 'flex';
    else if (section === 'registros' || section === 'avaliacoes') fab.style.display = isAdmin ? 'flex' : 'none';
    else fab.style.display = 'none';

    if (section === 'admin-users')  Admin.carregarUsuarios();
    if (section === 'admin-tasks')  Admin.carregarTarefasAdmin();
    if (section === 'admin-turmas') Admin.carregarTurmas();
    if (section === 'avaliacoes')   { Avaliacoes.montarSelectTipo('av-tipo'); UI.renderAvaliacoes(); }
  }

  // ─── Abas Pendentes / Concluídas ─────────────────────────────────────────

  function setTab(tab, el) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    el.classList.add('on');
    renderTarefas();
  }

  // ─── Menu admin (topbar) ─────────────────────────────────────────────────

  function toggleAdminMenu() {
    const btn  = document.getElementById('btn-admin-top');
    const drop = document.getElementById('admin-dropdown');
    const open = drop.classList.toggle('open');
    btn.classList.toggle('open', open);
  }

  function _fecharAdminMenu() {
    document.getElementById('admin-dropdown')?.classList.remove('open');
    document.getElementById('btn-admin-top')?.classList.remove('open');
  }

  function abrirSecaoAdmin(section) {
    _fecharAdminMenu();
    setSection(section);
  }

  function voltarDaAdmin() {
    setSection('tarefas');
  }

  // ─── Modais: Tarefas ──────────────────────────────────────────────────────

  function abrirModalTarefa()  { Tasks.abrirParaCriar(); }
  function fecharModalTarefa() { document.getElementById('ov-tarefa').classList.remove('on'); }

  // ─── Modais: Registros ────────────────────────────────────────────────────

  function abrirModalRegistro()  { Registros.abrirParaCriar(); }
  function fecharModalRegistro() { document.getElementById('ov-registro').classList.remove('on'); }

  function abrirModalAvaliacao()  { Avaliacoes.abrirParaCriar(); }
  function fecharModalAvaliacao() { document.getElementById('ov-avaliacao').classList.remove('on'); }

  function fecharDetalheAvaliacao() {
    document.getElementById('ov-av-detalhe').classList.remove('on');
  }

  // ─── Modal: Config ────────────────────────────────────────────────────────

  // ─── Modal: Confirmação ──────────────────────────────────────────────────

  function abrirConfirma(titulo, sub, callback) {
    document.getElementById('confirma-titulo').textContent = titulo;
    document.getElementById('confirma-sub').textContent   = sub || 'Essa ação não pode ser desfeita.';
    _confirmaCallback = callback;

    // Se não há callback (ex: exibir erro), esconde botão de confirmar
    const footer = document.getElementById('confirma-footer');
    const btnOk  = document.getElementById('btn-confirma-ok');
    if (callback) {
      footer.style.display = '';
      btnOk.textContent = titulo.toLowerCase().includes('remov') ? 'Remover'
                        : titulo.toLowerCase().includes('exclu') ? 'Excluir'
                        : 'Confirmar';
    } else {
      // Modo erro: só botão "Fechar"
      btnOk.style.display = 'none';
      footer.querySelector('.btn-ghost').textContent = 'Fechar';
    }

    document.getElementById('ov-confirma').classList.add('on');
  }

  function fecharConfirma() {
    _confirmaCallback = null;
    document.getElementById('ov-confirma').classList.remove('on');
    // Restaura estado padrão
    const btnOk = document.getElementById('btn-confirma-ok');
    btnOk.style.display = '';
    const cancelBtn = document.getElementById('confirma-footer')?.querySelector('.btn-ghost');
    if (cancelBtn) cancelBtn.textContent = 'Cancelar';
  }



  async function confirmarAcao() {
    if (_confirmaCallback) {
      const btn = document.getElementById('btn-confirma-ok');
      btn.disabled    = true;
      btn.textContent = 'Aguarde...';
      try   { await _confirmaCallback(); }
      catch (e) { console.error(e); }
      finally { btn.disabled = false; }
    }
    fecharConfirma();
  }

  // ─── Modal: Config ────────────────────────────────────────────────────────

  function abrirCfg() {
    const u = Auth.get();
    document.getElementById('cfg2-dias').value = u.dias_urgencia;
    _updateRange('cfg2-dias', 'cfg2-dias-val');
    montarMultiSelect('cfg2-materias', u.materias_atencao || []);
    document.getElementById('ov-cfg').classList.add('on');
  }
  function fecharCfg() { document.getElementById('ov-cfg').classList.remove('on'); }

  // ─── FAB dispatcher ───────────────────────────────────────────────────────

  function fabClick() {
    if (currentSection === 'tarefas')   abrirModalTarefa();
    if (currentSection === 'registros') abrirModalRegistro();
  }

  // ─── Helpers de formulário ────────────────────────────────────────────────

  function updateRangeLabel(inputId, labelId) { _updateRange(inputId, labelId); }

  function montarMultiSelect(containerId, selecionadas) {
    const c = document.getElementById(containerId);
    c.innerHTML = '';
    MATERIAS.forEach(m => {
      const label = document.createElement('label');
      label.className = 'ms-opt';
      const chk = document.createElement('input');
      chk.type    = 'checkbox';
      chk.value   = m;
      chk.checked = selecionadas.includes(m);
      label.appendChild(chk);
      label.appendChild(document.createTextNode(m));
      c.appendChild(label);
    });
  }

  function getChecked(containerId) {
    return [...document.querySelectorAll(`#${containerId} input:checked`)].map(i => i.value);
  }

  function montarSelectMaterias() {
    ['m-mat', 'rg-mat'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Selecione...</option>';
      MATERIAS.forEach(m => _addOpt(sel, m));
    });

    const filSel = document.getElementById('fil-mat');
    if (!filSel) return;
    const mats = [...new Set(Tasks.getCache().map(t => t.materia))].sort();
    filSel.innerHTML = '<option value="">Todas as matérias</option>';
    mats.forEach(m => _addOpt(filSel, m));
  }

  function render() { renderTarefas(); }

  // ─── Renderização: Tarefas ────────────────────────────────────────────────

  function renderTarefas() {
    const user    = Auth.get();
    const matFil  = document.getElementById('fil-mat')?.value || '';
    const ord     = document.getElementById('fil-ord')?.value || 'entrega';
    const atencao = user.materias_atencao || [];

    const visFil = document.getElementById('fil-vis')?.value || '';

    let visible = Tasks.getCache().filter(task => {
      // Tarefas privadas só visíveis para o dono
      if (task.visibilidade === 'privada' && task.owner_id !== user.id) return false;
      if (matFil && task.materia !== matFil) return false;
      if (visFil && task.visibilidade !== visFil) return false;
      const isDone = task.done_by.includes(user.id);
      return currentTab === 'concluidas' ? isDone : !isDone;
    });

    visible.sort((a, b) => {
      const aAt = atencao.includes(a.materia);
      const bAt = atencao.includes(b.materia);
      if (aAt && !bAt) return -1;
      if (!aAt && bAt) return  1;
      if (ord === 'entrega') return (a.data_entrega || '').localeCompare(b.data_entrega || '');
      if (ord === 'atribuicao') return (a.data_atribuicao || '').localeCompare(b.data_atribuicao || '');
      return a.materia.localeCompare(b.materia);
    });

    const list = document.getElementById('task-list');
    if (visible.length === 0) {
      list.innerHTML = '<div class="empty">Nenhuma tarefa aqui ainda.</div>';
      return;
    }
    list.innerHTML = '';
    visible.forEach(task => _renderTaskCard(task, user, atencao, list));
  }

  function _renderTaskCard(task, user, atencao, container) {
    const isDone    = task.done_by.includes(user.id);
    const status    = isDone ? 'concluida' : Dates.taskStatus(task, user);
    const isAtencao = atencao.includes(task.materia);
    const isOwner   = task.owner_id === user.id;

    let sideClass = 'ok';
    if (status === 'atrasada')     sideClass = 'atrasada';
    else if (status === 'urgente') sideClass = 'urgente';
    else if (isAtencao && !isDone) sideClass = 'atencao';

    let statusBadge = '';
    if (status === 'concluida') {
      statusBadge = '<span class="badge b-ok">Concluída</span>';
    } else if (status === 'atrasada') {
      const d = Math.abs(Dates.daysUntil(task.data_entrega));
      statusBadge = `<span class="badge b-atrasada">Atrasada · ${d}d</span>`;
    } else if (status === 'urgente') {
      const d = Dates.daysUntil(task.data_entrega);
      statusBadge = `<span class="badge b-urgente">Urgente · ${d}d</span>`;
    } else {
      statusBadge = '<span class="badge b-ok">Em tempo</span>';
    }
    if (!isDone && isAtencao) statusBadge += '<span class="badge b-atencao">Atenção</span>';

    // Dono ou admin pode editar clicando no card
    const canEdit = isOwner || Auth.isAdmin();
    const card = document.createElement('div');
    card.className = `tc ${sideClass}${isDone ? ' concluida' : ''}${canEdit ? ' owner-card' : ''}`;
    card.innerHTML = `
      <div class="chk${isDone ? ' on' : ''}" onclick="event.stopPropagation();Tasks.toggleDone('${task.id}')">${isDone ? '✓' : ''}</div>
      <div class="tb">
        <div class="tn${isDone ? ' riscado' : ''}">${task.nome}</div>
        <div class="meta">
          <span class="badge b-materia">${task.materia}</span>
          <span class="badge b-entrega">entrega: ${Dates.fmt(task.data_entrega)}</span>
          ${task.data_atribuicao ? `<span class="badge b-atribuicao">atribuída: ${Dates.fmt(task.data_atribuicao)}</span>` : ''}
          ${task.visibilidade === 'privada' ? '<span class="badge b-privada">privada</span>' : ''}
          ${statusBadge}
          <span class="badge b-user">@${task.owner_username || '?'}</span>
          ${canEdit ? '<span class="badge b-delete-hint">toque para editar</span>' : ''}
        </div>
      </div>`;

    if (canEdit) {
      card.addEventListener('click', () => Tasks.abrirParaEditar(task.id));
    }

    container.appendChild(card);
  }

  // ─── Renderização: Registros ──────────────────────────────────────────────

  function renderRegistros() {
    const cache   = Registros.getCache();
    const busca   = (document.getElementById('reg-busca')?.value || '').toLowerCase();
    const filMat  = document.getElementById('fil-reg-mat')?.value || '';
    const ord     = document.getElementById('fil-reg-ord')?.value || 'data';
    const list    = document.getElementById('reg-list');
    if (!list) return;

    // Popula filtro de matéria dinamicamente
    const mats = [...new Set(cache.map(r => r.materia))].sort();
    const selMat = document.getElementById('fil-reg-mat');
    if (selMat) {
      const cur = selMat.value;
      selMat.innerHTML = '<option value="">Todas as matérias</option>';
      mats.forEach(m => _addOpt(selMat, m));
      selMat.value = cur;
    }

    let visible = cache.filter(r => {
      if (filMat && r.materia !== filMat) return false;
      if (busca && !r.titulo.toLowerCase().includes(busca)) return false;
      return true;
    });

    // Fixados no topo, depois ordena pelo critério
    visible.sort((a, b) => {
      if (a.fixado && !b.fixado) return -1;
      if (!a.fixado && b.fixado)  return  1;
      if (ord === 'materia') return a.materia.localeCompare(b.materia);
      // ord === 'data' — mais recente primeiro
      return (b.data_atribuicao || '').localeCompare(a.data_atribuicao || '');
    });

    list.innerHTML = '';
    if (visible.length === 0) {
      list.innerHTML = '<div class="empty">Nenhum registro encontrado.</div>';
      return;
    }

    visible.forEach(r => _renderRegCard(r, list));
  }

  function _renderRegCard(r, container) {
    // Badge "novo" — criado nos últimos 7 dias
    const criado    = new Date(r.criado_em);
    const diasAtras = Math.round((new Date() - criado) / 86_400_000);
    const isNovo    = diasAtras <= 7;

    // Indicadores de conteúdo
    const indicators = [];
    if (r.descricao)           indicators.push('<span class="reg-ind" title="Tem descrição">Desc.</span>');
    if (r.imagens?.length > 0) indicators.push(`<span class="reg-ind reg-ind-img" title="Tem imagem">Img (${r.imagens.length})</span>`);
    if (r.arquivo_url)         indicators.push('<span class="reg-ind reg-ind-arq" title="Tem arquivo">Arquivo</span>');

    const card = document.createElement('div');
    card.className = 'reg-card-compact' + (r.fixado ? ' fixado' : '');
    card.innerHTML = `
      <div class="reg-card-left">
        <div class="reg-card-title-row">
          ${r.fixado ? '<span class="pin-icon">📌</span>' : ''}
          <span class="reg-card-titulo">${r.titulo}</span>
          ${isNovo ? '<span class="badge-novo">Novo</span>' : ''}
        </div>
        <div class="reg-card-sub">
          <span class="badge b-materia" style="font-size:11px">${r.materia}</span>
          <span class="reg-data">${Dates.fmt(r.data_atribuicao)}</span>
          ${indicators.join('')}
        </div>
      </div>
      <svg class="reg-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    card.addEventListener('click', () => abrirDetalheRegistro(r));
    container.appendChild(card);
  }

  // ─── Overlay de detalhe do registro ──────────────────────────────────────

  function abrirDetalheRegistro(r) {
    Registros.setDetalheId(r.id);

    document.getElementById('det-titulo').textContent = r.titulo;

    // Meta
    const meta = document.getElementById('det-meta');
    meta.innerHTML = `
      <span class="badge b-materia">${r.materia}</span>
      <span class="reg-data">${Dates.fmt(r.data_atribuicao)}</span>
      <span class="badge b-user">@${r.owner_username || '?'}</span>
      ${r.fixado ? '<span class="badge b-atencao">Fixado</span>' : ''}`;

    // Descrição
    const desc = document.getElementById('det-desc');
    if (r.descricao) {
      desc.textContent = r.descricao;
      desc.style.display = '';
    } else {
      desc.style.display = 'none';
    }

    // Imagens
    const imgsEl = document.getElementById('det-imgs');
    if (r.imagens?.length > 0) {
      imgsEl.innerHTML = r.imagens.map(img =>
        `<img src="${img.url}" class="reg-img" alt="imagem" onclick="UI.abrirImagem('${img.url}')" />`
      ).join('');
      imgsEl.style.display = '';
    } else {
      imgsEl.innerHTML = '';
      imgsEl.style.display = 'none';
    }

    // Arquivo
    const arquivoEl = document.getElementById('det-arquivo');
    if (r.arquivo_url) {
      const nome = r.arquivo_url.split('/').pop().replace(/^arq-\d+-/, '');
      arquivoEl.innerHTML = `
        <a class="btn-arquivo" href="${r.arquivo_url}" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <path d="M4 4h8l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 4v5h5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          ${nome}
        </a>`;
      arquivoEl.style.display = '';
    } else {
      arquivoEl.innerHTML = '';
      arquivoEl.style.display = 'none';
    }

    // Botão editar — só para admin
    const btnEdit = document.getElementById('btn-editar-registro');
    btnEdit.style.display = Auth.isAdmin() ? '' : 'none';

    document.getElementById('ov-reg-detalhe').classList.add('on');
  }

  function fecharDetalheRegistro() {
    document.getElementById('ov-reg-detalhe').classList.remove('on');
  }

    // ─── Renderização: Avaliações ───────────────────────────────────────────────

  function renderAvaliacoes() {
    const cache  = Avaliacoes.getCache();
    const busca  = (document.getElementById('av-busca')?.value || '').toLowerCase();
    const filTipo= document.getElementById('fil-av-tipo')?.value || '';
    const filMat = document.getElementById('fil-av-mat')?.value  || '';
    const ord    = document.getElementById('fil-av-ord')?.value  || 'data';
    const list   = document.getElementById('av-list');
    if (!list) return;

    // Popula filtro de matéria
    const mats   = [...new Set(cache.map(a => a.materia))].sort();
    const selMat = document.getElementById('fil-av-mat');
    if (selMat) {
      const cur = selMat.value;
      selMat.innerHTML = '<option value="">Todas as matérias</option>';
      mats.forEach(m => _addOpt(selMat, m));
      selMat.value = cur;
    }

    let visible = cache.filter(a => {
      if (filTipo && a.tipo    !== filTipo) return false;
      if (filMat  && a.materia !== filMat)  return false;
      if (busca   && !a.titulo.toLowerCase().includes(busca)) return false;
      return true;
    });

    visible.sort((a, b) => {
      if (ord === 'materia') return a.materia.localeCompare(b.materia);
      if (ord === 'tipo')    return a.tipo.localeCompare(b.tipo);
      return (a.data || '').localeCompare(b.data || '');
    });

    list.innerHTML = '';
    if (visible.length === 0) {
      list.innerHTML = '<div class="empty">Nenhuma avaliação encontrada.</div>';
      return;
    }
    visible.forEach(av => _renderAvCard(av, list));
  }

  function _renderAvCard(av, container) {
    const hoje    = Dates.hojeISO();
    const passada = av.data && av.data < hoje;
    const card    = document.createElement('div');
    card.className = 'reg-card-compact' + (passada ? ' av-passada' : '');
    card.innerHTML = `
      <div class="reg-card-left">
        <div class="reg-card-title-row">
          <span class="reg-card-titulo">${av.titulo}</span>
          <span class="badge av-tipo-badge av-tipo-${av.tipo}">${Avaliacoes.tipoLabel(av.tipo)}</span>
        </div>
        <div class="reg-card-sub">
          <span class="badge b-materia" style="font-size:11px">${av.materia}</span>
          <span class="reg-data">${Dates.fmt(av.data)}</span>
          ${av.horario ? `<span class="reg-data">· ${av.horario}</span>` : ''}
          ${av.dicas    ? '<span class="reg-ind">Dicas</span>' : ''}
          ${av.material ? '<span class="reg-ind reg-ind-arq">Material</span>' : ''}
        </div>
      </div>
      <svg class="reg-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    card.addEventListener('click', () => _abrirDetalheAvaliacao(av));
    container.appendChild(card);
  }

  function _abrirDetalheAvaliacao(av) {
    Avaliacoes.setDetalheId(av.id);

    document.getElementById('avd-titulo').textContent = av.titulo;

    document.getElementById('avd-meta').innerHTML = `
      <span class="badge b-materia">${av.materia}</span>
      <span class="badge av-tipo-badge av-tipo-${av.tipo}">${Avaliacoes.tipoLabel(av.tipo)}</span>
      <span class="reg-data">${Dates.fmt(av.data)}</span>
      ${av.horario ? `<span class="reg-data">· ${av.horario}</span>` : ''}`;

    document.getElementById('avd-conteudo').textContent = av.conteudo || '';

    const dicasWrap = document.getElementById('avd-dicas-wrap');
    if (av.dicas) {
      document.getElementById('avd-dicas').textContent = av.dicas;
      dicasWrap.style.display = '';
    } else { dicasWrap.style.display = 'none'; }

    const matWrap = document.getElementById('avd-material-wrap');
    if (av.material) {
      const link = document.getElementById('avd-material');
      link.href = av.material;
      matWrap.style.display = '';
    } else { matWrap.style.display = 'none'; }

    document.getElementById('btn-editar-av').style.display = Auth.isAdmin() ? '' : 'none';
    document.getElementById('ov-av-detalhe').classList.add('on');
  }

  // ─── privado ──────────────────────────────────────────────────────────────

  function _updateRange(inputId, labelId) {
    const val = document.getElementById(inputId).value;
    document.getElementById(labelId).textContent = val + ' dia' + (val > 1 ? 's' : '');
  }

  function _addOpt(sel, val) {
    const o = document.createElement('option');
    o.value = o.textContent = val;
    sel.appendChild(o);
  }

  // ─── Visualizador de imagem ──────────────────────────────────────────────

  function abrirImagem(url) {
    const el = document.getElementById('img-overlay-src');
    if (el) el.src = url;
    document.getElementById('ov-imagem').classList.add('on');
  }

  function fecharImagem() {
    document.getElementById('ov-imagem').classList.remove('on');
    const el = document.getElementById('img-overlay-src');
    if (el) el.src = '';
  }

  // Fecha o dropdown admin ao clicar em qualquer lugar fora dele
  document.addEventListener('click', e => {
    const wrap = document.getElementById('admin-menu-wrap');
    if (wrap && !wrap.contains(e.target)) _fecharAdminMenu();
  });

  // ─── Toast de atualização ────────────────────────────────────────────────

  function mostrarToastAtualizacao() {
    const t = document.getElementById('toast-update');
    if (t) t.style.display = 'flex';
  }

  function ocultarToastAtualizacao() {
    const t = document.getElementById('toast-update');
    if (t) t.style.display = 'none';
  }

  function atualizarTarefas() {
    Tasks.aplicarAtualizacao();
  }

  return {
    show, setSection, setTab,
    toggleAdminMenu, abrirSecaoAdmin, voltarDaAdmin,
    abrirModalTarefa, fecharModalTarefa,
    abrirModalRegistro, fecharModalRegistro,
    abrirCfg, fecharCfg,
    abrirConfirma, fecharConfirma, confirmarAcao,
    fabClick,
    updateRangeLabel, montarMultiSelect, getChecked, montarSelectMaterias,
    render, renderTarefas, renderRegistros,
    mostrarToastAtualizacao, ocultarToastAtualizacao, atualizarTarefas,
    abrirDetalheRegistro, fecharDetalheRegistro,
    abrirModalAvaliacao, fecharModalAvaliacao, fecharDetalheAvaliacao,
    renderAvaliacoes,
    abrirImagem, fecharImagem,
  };
})();