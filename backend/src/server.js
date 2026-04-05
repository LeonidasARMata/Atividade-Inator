require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes       = require('./routes/auth');
const tasksRoutes      = require('./routes/tasks');
const registrosRoutes  = require('./routes/registros');
const avaliacoesRoutes = require('./routes/avaliacoes');
const adminRoutes      = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth',       authRoutes);
app.use('/api/tasks',      tasksRoutes);
app.use('/api/registros',  registrosRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/admin',      adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));