require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes       = require('./routes/auth');
const tasksRoutes      = require('./routes/tasks');
const registrosRoutes  = require('./routes/registros');
const avaliacoesRoutes = require('./routes/avaliacoes');
const termosRoutes     = require('./routes/termos');
const adminRoutes      = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

// Log de todas as requisições — remova após diagnosticar
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.path} | content-type: ${req.headers['content-type'] || 'none'}`);
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',       authRoutes);
app.use('/api/tasks',      tasksRoutes);
app.use('/api/registros',  registrosRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/termos',     termosRoutes);
app.use('/api/admin',      adminRoutes);

// Captura erros do multer e outros
app.use((err, req, res, _next) => {
  console.error(`[ERR] ${req.method} ${req.path}:`, err.message);
  res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));