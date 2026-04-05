const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ──────────────────────────────────────
// Cria conta nova. is_admin só pode ser definido via banco de dados.
router.post('/register', async (req, res) => {
  const { email, nome, username, turma_id, senha } = req.body;

  if (!email || !nome || !username || !turma_id || !senha)
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });

  // Valida turma
  const { data: turma } = await supabase
    .from('turmas').select('id').eq('id', turma_id).single();
  if (!turma) return res.status(400).json({ error: 'Turma inválida.' });

  // Checa duplicatas
  const { data: dup } = await supabase
    .from('users')
    .select('id')
    .or(`email.eq.${email.toLowerCase()},username.eq.${username}`)
    .maybeSingle();
  if (dup) return res.status(409).json({ error: 'E-mail ou nome de usuário já cadastrado.' });

  const hash = await bcrypt.hash(senha, 10);
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: email.toLowerCase(),
      nome,
      username,
      turma_id,
      senha_hash: hash,
      is_admin: false,           // ← nunca aceita is_admin do body
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const token = _token(user);
  res.status(201).json({ token, user: _pub(user) });
});

// ── POST /api/auth/login ─────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

  const { data: user } = await supabase
    .from('users').select('*').eq('email', email.toLowerCase()).single();

  if (!user) return res.status(401).json({ error: 'Usuário não encontrado.' });

  const ok = await bcrypt.compare(senha, user.senha_hash);
  if (!ok) return res.status(401).json({ error: 'Senha incorreta.' });

  res.json({ token: _token(user), user: _pub(user) });
});

// ── GET /api/auth/me ─────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,nome,username,turma_id,is_admin,dias_urgencia,materias_atencao')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json(data);
});

// ── PATCH /api/auth/config ───────────────────────────────────────
router.patch('/config', authMiddleware, async (req, res) => {
  const { dias_urgencia, materias_atencao } = req.body;
  const { data, error } = await supabase
    .from('users')
    .update({ dias_urgencia, materias_atencao })
    .eq('id', req.user.id)
    .select('id,email,nome,username,turma_id,is_admin,dias_urgencia,materias_atencao')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /api/auth/turmas ─────────────────────────────────────────
// Retorna todas as turmas (usado no formulário de cadastro)
router.get('/turmas', async (_req, res) => {
  const { data, error } = await supabase
    .from('turmas').select('*').order('ano').order('letra');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── PATCH /api/auth/profile ─────────────────────────────────────
// Atualiza nome de exibição (username) e/ou senha do usuário logado
router.patch('/profile', authMiddleware, async (req, res) => {
  const { username, senha_atual, senha_nova } = req.body;
  const update = {};

  // Atualiza username se fornecido
  if (username) {
    const u = username.trim();
    if (u.length < 3)
      return res.status(400).json({ error: 'Nome de usuário deve ter pelo menos 3 caracteres.' });

    // Verifica duplicata (excluindo o próprio usuário)
    const { data: dup } = await supabase
      .from('users').select('id').eq('username', u).neq('id', req.user.id).maybeSingle();
    if (dup)
      return res.status(409).json({ error: 'Nome de usuário já está em uso.' });

    update.username = u;
  }

  // Atualiza senha se fornecida
  if (senha_nova) {
    if (!senha_atual)
      return res.status(400).json({ error: 'Informe a senha atual para alterá-la.' });
    if (senha_nova.length < 6)
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });

    // Valida senha atual
    const { data: user } = await supabase
      .from('users').select('senha_hash').eq('id', req.user.id).single();
    const ok = await bcrypt.compare(senha_atual, user.senha_hash);
    if (!ok)
      return res.status(401).json({ error: 'Senha atual incorreta.' });

    update.senha_hash = await bcrypt.hash(senha_nova, 10);
  }

  if (!Object.keys(update).length)
    return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

  const { data, error } = await supabase
    .from('users')
    .update(update)
    .eq('id', req.user.id)
    .select('id, email, nome, username, turma_id, is_admin, dias_urgencia, materias_atencao')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Gera novo token com username atualizado
  const token = _token(data);
  res.json({ user: _pub(data), token });
});

// ── helpers ──────────────────────────────────────────────────────
function _token(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nome: user.nome,
      username: user.username, turma_id: user.turma_id, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function _pub(user) {
  const { senha_hash, ...pub } = user;
  return pub;
}

module.exports = router;