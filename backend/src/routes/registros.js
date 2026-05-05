const express  = require('express');
const multer   = require('multer');
const supabase = require('../config/supabase');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Multer processa APENAS campos de arquivo — não interfere com JSON
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },  // 10MB por arquivo
});

const SIGNED_URL_TTL = 60 * 60 * 4;  // 4 horas

router.use(authMiddleware);

// ── Gera URL assinada (funciona direto no browser) ────────────────
async function _signedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from('registros')
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) {
    console.error('[Storage] Erro ao gerar signed URL para', path, ':', error.message);
    return null;
  }
  return data.signedUrl;
}

async function _signImagens(imagens) {
  return Promise.all(
    imagens.map(async img => ({
      id:  img.id,
      url: await _signedUrl(img.storage_path),
    }))
  );
}

// ── GET /api/registros ───────────────────────────────────────────
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('registros')
    .select(`
      id, titulo, materia, descricao, fixado,
      data_atribuicao, arquivo_path, turma_id, owner_id, criado_em,
      users!owner_id(username),
      registro_imagens(id, storage_path)
    `)
    .eq('turma_id', req.user.turma_id)
    .order('fixado',          { ascending: false })
    .order('data_atribuicao', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const mapped = await Promise.all(data.map(async r => ({
    ...r,
    owner_username:   r.users?.username || null,
    imagens:          await _signImagens(r.registro_imagens || []),
    arquivo_url:      await _signedUrl(r.arquivo_path),
    arquivo_nome:     r.arquivo_path
      ? r.arquivo_path.split('/').pop().replace(/^arq-\d+-/, '')
      : null,
    users:            undefined,
    registro_imagens: undefined,
  })));

  res.json(mapped);
});

// ── POST /api/registros ──────────────────────────────────────────
router.post('/',
  adminMiddleware,
  upload.fields([{ name: 'imagens', maxCount: 10 }, { name: 'arquivo', maxCount: 1 }]),
  async (req, res) => {
    console.log('[POST /registros] body:', JSON.stringify(req.body));
    console.log('[POST /registros] files:', Object.keys(req.files || {}),
      'imagens:', req.files?.imagens?.length || 0,
      'arquivo:', req.files?.arquivo?.length || 0);

    const { titulo, materia, descricao, data_atribuicao } = req.body;

    if (!titulo || !materia)
      return res.status(400).json({ error: 'titulo e materia são obrigatórios.' });

    const temDescricao = descricao && descricao.trim().length > 0;
    const temImagem    = (req.files?.imagens?.length || 0) > 0;
    const temArquivo   = (req.files?.arquivo?.length  || 0) > 0;

    if (!temDescricao && !temImagem && !temArquivo)
      return res.status(400).json({ error: 'Preencha pelo menos descrição, imagem ou arquivo.' });

    const { data: registro, error: rErr } = await supabase
      .from('registros')
      .insert({
        titulo,
        materia,
        descricao:       descricao || null,
        data_atribuicao: data_atribuicao || new Date().toISOString().split('T')[0],
        turma_id:        req.user.turma_id,
        owner_id:        req.user.id,
      })
      .select().single();

    if (rErr) return res.status(500).json({ error: rErr.message });

    // Upload de imagens
    const imagensSalvas = [];
    for (const file of (req.files?.imagens || [])) {
      const path = `registros/${req.user.turma_id}/${registro.id}/img-${Date.now()}-${file.originalname}`;
      console.log('[Storage] Uploading image:', path, 'size:', file.size);
      const { error: upErr } = await supabase.storage
        .from('registros').upload(path, file.buffer, { contentType: file.mimetype });
      if (upErr) {
        console.error('[Storage] Image upload error:', upErr.message);
      } else {
        const { data: img } = await supabase
          .from('registro_imagens')
          .insert({ registro_id: registro.id, storage_path: path })
          .select().single();
        if (img) imagensSalvas.push(img);
      }
    }

    // Upload de arquivo
    let arquivo_path = null;
    if (req.files?.arquivo?.[0]) {
      const file = req.files.arquivo[0];
      const path = `registros/${req.user.turma_id}/${registro.id}/arq-${Date.now()}-${file.originalname}`;
      console.log('[Storage] Uploading file:', path, 'size:', file.size);
      const { error: upErr } = await supabase.storage
        .from('registros').upload(path, file.buffer, { contentType: file.mimetype });
      if (upErr) {
        console.error('[Storage] File upload error:', upErr.message);
      } else {
        await supabase.from('registros').update({ arquivo_path: path }).eq('id', registro.id);
        arquivo_path = path;
      }
    }

    res.status(201).json({
      ...registro,
      owner_username: req.user.username,
      imagens:        await _signImagens(imagensSalvas),
      arquivo_url:    await _signedUrl(arquivo_path),
      arquivo_nome:   arquivo_path
        ? arquivo_path.split('/').pop().replace(/^arq-\d+-/, '')
        : null,
    });
  }
);

// ── PATCH /api/registros/:id ─────────────────────────────────────
router.patch('/:id',
  adminMiddleware,
  upload.fields([{ name: 'imagens', maxCount: 10 }, { name: 'arquivo', maxCount: 1 }]),
  async (req, res) => {
    const { titulo, materia, descricao, data_atribuicao } = req.body;
    const update = {};
    if (titulo)                  update.titulo          = titulo;
    if (materia)                 update.materia         = materia;
    if (descricao !== undefined) update.descricao       = descricao || null;
    if (data_atribuicao)         update.data_atribuicao = data_atribuicao;

    const { data, error } = await supabase
      .from('registros').update(update).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    const novasImagens = [];
    for (const file of (req.files?.imagens || [])) {
      const path = `registros/${req.user.turma_id}/${req.params.id}/img-${Date.now()}-${file.originalname}`;
      const { error: upErr } = await supabase.storage
        .from('registros').upload(path, file.buffer, { contentType: file.mimetype });
      if (upErr) {
        console.error('[Storage] Image upload error:', upErr.message);
      } else {
        const { data: img } = await supabase
          .from('registro_imagens')
          .insert({ registro_id: req.params.id, storage_path: path })
          .select().single();
        if (img) novasImagens.push(img);
      }
    }

    let arquivo_path = data.arquivo_path;
    if (req.files?.arquivo?.[0]) {
      if (data.arquivo_path)
        await supabase.storage.from('registros').remove([data.arquivo_path]);
      const file = req.files.arquivo[0];
      const path = `registros/${req.user.turma_id}/${req.params.id}/arq-${Date.now()}-${file.originalname}`;
      const { error: upErr } = await supabase.storage
        .from('registros').upload(path, file.buffer, { contentType: file.mimetype });
      if (upErr) {
        console.error('[Storage] File upload error:', upErr.message);
      } else {
        await supabase.from('registros').update({ arquivo_path: path }).eq('id', req.params.id);
        arquivo_path = path;
      }
    }

    res.json({
      ...data,
      imagens:     await _signImagens(novasImagens),
      arquivo_url: await _signedUrl(arquivo_path),
      arquivo_nome: arquivo_path
        ? arquivo_path.split('/').pop().replace(/^arq-\d+-/, '')
        : null,
    });
  }
);

// ── DELETE /api/registros/:id ────────────────────────────────────
router.delete('/:id', adminMiddleware, async (req, res) => {
  const { data: imgs } = await supabase
    .from('registro_imagens').select('storage_path').eq('registro_id', req.params.id);
  const { data: reg } = await supabase
    .from('registros').select('arquivo_path').eq('id', req.params.id).single();

  const paths = (imgs || []).map(i => i.storage_path);
  if (reg?.arquivo_path) paths.push(reg.arquivo_path);
  if (paths.length) await supabase.storage.from('registros').remove(paths);

  await supabase.from('registros').delete().eq('id', req.params.id);
  res.status(204).send();
});

// ── DELETE /api/registros/imagens/:imgId ─────────────────────────
router.delete('/imagens/:imgId', adminMiddleware, async (req, res) => {
  const { data: img } = await supabase
    .from('registro_imagens').select('*').eq('id', req.params.imgId).single();
  if (!img) return res.status(404).json({ error: 'Imagem não encontrada.' });
  await supabase.storage.from('registros').remove([img.storage_path]);
  await supabase.from('registro_imagens').delete().eq('id', req.params.imgId);
  res.status(204).send();
});

module.exports = router;