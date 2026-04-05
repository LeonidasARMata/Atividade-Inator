const express  = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ── GET /api/avaliacoes ──────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select('*, users!owner_id(username)')
    .eq('turma_id', req.user.turma_id)
    .order('data', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json(data.map(a => ({
    ...a,
    owner_username: a.users?.username || null,
    users: undefined,
  })));
});

// ── POST /api/avaliacoes ─────────────────────────────────────────
router.post('/', adminMiddleware, async (req, res) => {
  const { titulo, tipo, materia, data, horario, conteudo, dicas, material } = req.body;

  if (!titulo || !tipo || !materia || !data || !horario || !conteudo)
    return res.status(400).json({ error: 'titulo, tipo, materia, data, horario e conteudo são obrigatórios.' });

  const { data: av, error } = await supabase
    .from('avaliacoes')
    .insert({ titulo, tipo, materia, data, horario, conteudo,
              dicas: dicas || null, material: material || null,
              turma_id: req.user.turma_id, owner_id: req.user.id })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ...av, owner_username: req.user.username });
});

// ── PATCH /api/avaliacoes/:id ────────────────────────────────────
router.patch('/:id', adminMiddleware, async (req, res) => {
  const allowed = ['titulo','tipo','materia','data','horario','conteudo','dicas','material'];
  const update  = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (!Object.keys(update).length)
    return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });

  const { data, error } = await supabase
    .from('avaliacoes').update(update).eq('id', req.params.id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /api/avaliacoes/:id ───────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  const { error } = await supabase.from('avaliacoes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

module.exports = router;