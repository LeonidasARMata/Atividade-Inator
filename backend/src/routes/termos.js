const express  = require('express');
const supabase = require('../config/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/termos/atual ────────────────────────────────────────
// Retorna a versão ativa dos termos (público — usado no cadastro)
router.get('/atual', async (_req, res) => {
  const { data, error } = await supabase
    .from('termos')
    .select('id, versao, titulo, conteudo, criado_em')
    .eq('ativo', true)
    .order('versao', { ascending: false })
    .limit(1)
    .single();

  if (error) return res.status(404).json({ error: 'Nenhum termo ativo encontrado.' });
  res.json(data);
});

// ── POST /api/termos/aceitar ─────────────────────────────────────
// Registra o aceite do usuário logado com timestamp exato
router.post('/aceitar', authMiddleware, async (req, res) => {
  const { termos_id } = req.body;
  if (!termos_id)
    return res.status(400).json({ error: 'termos_id é obrigatório.' });

  // Verifica se o termo existe
  const { data: termo } = await supabase
    .from('termos').select('id, versao').eq('id', termos_id).single();
  if (!termo)
    return res.status(404).json({ error: 'Termo não encontrado.' });

  // Upsert — se já aceitou esta versão, atualiza o timestamp
  const { data, error } = await supabase
    .from('termos_aceite')
    .upsert(
      { user_id: req.user.id, termos_id, aceito_em: new Date().toISOString() },
      { onConflict: 'user_id,termos_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// ── GET /api/termos/status ───────────────────────────────────────
// Retorna se o usuário logado já aceitou a versão atual
// Usado no login para verificar se precisa mostrar novos termos
router.get('/status', authMiddleware, async (req, res) => {
  const { data: atual } = await supabase
    .from('termos')
    .select('id, versao, titulo, conteudo, criado_em')
    .eq('ativo', true)
    .order('versao', { ascending: false })
    .limit(1)
    .single();

  if (!atual) return res.json({ aceito: true });  // sem termos cadastrados = ok

  const { data: aceite } = await supabase
    .from('termos_aceite')
    .select('aceito_em')
    .eq('user_id', req.user.id)
    .eq('termos_id', atual.id)
    .maybeSingle();

  res.json({
    aceito:    !!aceite,
    aceito_em: aceite?.aceito_em || null,
    termos:    aceite ? null : atual,   // envia o termo só se precisar aceitar
  });
});

// ── POST /api/termos/novo ────────────────────────────────────────
// Admin cria nova versão dos termos (desativa a anterior)
router.post('/novo', authMiddleware, adminMiddleware, async (req, res) => {
  const { conteudo, titulo } = req.body;
  if (!conteudo)
    return res.status(400).json({ error: 'conteudo é obrigatório.' });

  // Busca última versão
  const { data: ultima } = await supabase
    .from('termos')
    .select('versao')
    .order('versao', { ascending: false })
    .limit(1)
    .single();

  const novaVersao = (ultima?.versao || 0) + 1;

  // Desativa versão anterior
  await supabase.from('termos').update({ ativo: false }).eq('ativo', true);

  // Insere nova versão
  const { data, error } = await supabase
    .from('termos')
    .insert({ versao: novaVersao, titulo: titulo || 'Termos e Condições de Uso', conteudo, ativo: true })
    .select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

module.exports = router;