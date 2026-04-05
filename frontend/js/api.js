/**
 * api.js — camada HTTP do frontend
 */
const Api = (() => {
  const t = () => localStorage.getItem('token');

  // Guarda requisições em andamento — impede duplicatas do mesmo endpoint
  const _inflight = new Map();

  async function _req(method, path, body, isForm = false) {
    const key = `${method}:${path}`;

    // Só deduplifica GET — métodos que modificam dados (POST/PATCH/DELETE)
    // nunca devem ser bloqueados ou retornar resultado de chamada anterior
    const canDedup = method === 'GET';
    if (canDedup && _inflight.has(key)) return _inflight.get(key);

    const headers = {};
    const token   = t();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isForm) headers['Content-Type'] = 'application/json';

    // Timeout de 30s — evita travar se o servidor Render estiver hibernando
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);

    const promise = fetch(CONFIG.API_URL + path, {
      method,
      headers,
      signal: controller.signal,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
    })
      .then(async res => {
        clearTimeout(timer);
        if (res.status === 204) return null;
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro desconhecido.');
        return data;
      })
      .catch(err => {
        clearTimeout(timer);
        if (err.name === 'AbortError')
          throw new Error('O servidor demorou muito para responder. Tente novamente.');
        throw err;
      })
      .finally(() => _inflight.delete(key));

    if (canDedup) _inflight.set(key, promise);
    return promise;
  }

  // ── Auth ─────────────────────────────────────────────────────────
  const register     = (payload)       => _req('POST',  '/api/auth/register', payload);
  const login        = (email, senha)  => _req('POST',  '/api/auth/login',    { email, senha });
  const getMe        = ()              => _req('GET',   '/api/auth/me');
  const getTurmas    = ()              => _req('GET',   '/api/auth/turmas');
  const updateConfig  = (d, a)          => _req('PATCH', '/api/auth/config',   { dias_urgencia: d, materias_atencao: a });
  const updateProfile = (p)             => _req('PATCH', '/api/auth/profile',  p);

  // ── Tasks ─────────────────────────────────────────────────────────
  const getTasks   = ()       => _req('GET',    '/api/tasks');
  const createTask = (p)      => _req('POST',   '/api/tasks', p);
  const updateTask = (id, p)  => _req('PATCH',  `/api/tasks/${id}`, p);
  const deleteTask = (id)     => _req('DELETE', `/api/tasks/${id}`);
  const markDone   = (id)     => _req('POST',   `/api/tasks/${id}/done`);
  const unmarkDone = (id)     => _req('DELETE', `/api/tasks/${id}/done`);

  // ── Registros ────────────────────────────────────────────────────
  const getRegistros   = ()         => _req('GET',    '/api/registros');
  const deleteRegistro = (id)       => _req('DELETE', `/api/registros/${id}`);
  // Recebe FormData diretamente (imagens + arquivo)
  const createRegistro = (fd)       => _req('POST',   '/api/registros', fd, true);
  const updateRegistro = (id, fd)   => _req('PATCH',  `/api/registros/${id}`, fd, true);
  const deleteImagem   = (imgId)    => _req('DELETE', `/api/registros/imagens/${imgId}`);

  // ── Avaliações ───────────────────────────────────────────────────
  const getAvaliacoes    = ()      => _req('GET',    '/api/avaliacoes');
  const createAvaliacao  = (p)     => _req('POST',   '/api/avaliacoes', p);
  const updateAvaliacao  = (id, p) => _req('PATCH',  `/api/avaliacoes/${id}`, p);
  const deleteAvaliacao  = (id)    => _req('DELETE', `/api/avaliacoes/${id}`);

  // ── Admin ────────────────────────────────────────────────────────
  const adminGetUsers      = ()            => _req('GET',    '/api/admin/users');
  const adminPatchUser     = (id, p)       => _req('PATCH',  `/api/admin/users/${id}`, p);
  const adminDeleteUser    = (id)          => _req('DELETE', `/api/admin/users/${id}`);
  const adminGetTurmas     = ()            => _req('GET',    '/api/admin/turmas');
  const adminCreateTurma   = (ano, letra)  => _req('POST',   '/api/admin/turmas', { ano, letra });
  const adminDeleteTurma   = (id)          => _req('DELETE', `/api/admin/turmas/${id}`);
  const adminGetTasks      = ()            => _req('GET',    '/api/admin/tasks');
  const adminDeleteTask    = (id)          => _req('DELETE', `/api/admin/tasks/${id}`);
  const adminFixarRegistro = (id)          => _req('PATCH',  `/api/admin/registros/${id}/fixar`);

  return {
    register, login, getMe, getTurmas, updateConfig, updateProfile,
    getTasks, createTask, updateTask, deleteTask, markDone, unmarkDone,
    getRegistros, createRegistro, updateRegistro, deleteRegistro,
    deleteImagem,
    getAvaliacoes, createAvaliacao, updateAvaliacao, deleteAvaliacao,
    adminGetUsers, adminPatchUser, adminDeleteUser,
    adminGetTurmas, adminCreateTurma, adminDeleteTurma,
    adminGetTasks, adminDeleteTask,
    adminFixarRegistro,
  };
})();