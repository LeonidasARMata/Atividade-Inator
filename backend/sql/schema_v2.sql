-- ================================================================
-- schema_v2.sql — Atividator — Schema completo
-- Execute no SQL Editor do Supabase em um projeto limpo,
-- ou use as seções ALTER/ADD para atualizar um banco existente.
-- ================================================================

-- ── Turmas ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS turmas (
  id    TEXT    PRIMARY KEY,
  ano   INTEGER NOT NULL,
  letra TEXT    NOT NULL,
  UNIQUE (ano, letra)
);

-- ── Usuários ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT    UNIQUE NOT NULL,
  nome             TEXT    NOT NULL,
  username         TEXT    UNIQUE NOT NULL,
  turma_id         TEXT    NOT NULL REFERENCES turmas(id),
  senha_hash       TEXT    NOT NULL,
  is_admin         BOOLEAN NOT NULL DEFAULT false,
  dias_urgencia    INTEGER NOT NULL DEFAULT 3,
  materias_atencao TEXT[]  NOT NULL DEFAULT '{}',
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Tarefas ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id               UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT  NOT NULL,
  materia          TEXT  NOT NULL,
  data_entrega     DATE  NOT NULL,
  data_atribuicao  DATE  NOT NULL DEFAULT CURRENT_DATE,
  visibilidade     TEXT  NOT NULL DEFAULT 'publica'
                         CHECK (visibilidade IN ('publica','privada')),
  turma_id         TEXT  NOT NULL REFERENCES turmas(id),
  owner_id         UUID  REFERENCES users(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Conclusões ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_done (
  task_id  UUID REFERENCES tasks(id)  ON DELETE CASCADE,
  user_id  UUID REFERENCES users(id)  ON DELETE CASCADE,
  feito_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

-- ── Registros ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registros (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           TEXT    NOT NULL,
  materia          TEXT    NOT NULL,
  descricao        TEXT,
  fixado           BOOLEAN NOT NULL DEFAULT false,
  data_atribuicao  DATE    NOT NULL DEFAULT CURRENT_DATE,
  arquivo_path     TEXT,
  turma_id         TEXT    NOT NULL REFERENCES turmas(id),
  owner_id         UUID    REFERENCES users(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Imagens dos registros ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS registro_imagens (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id  UUID  NOT NULL REFERENCES registros(id) ON DELETE CASCADE,
  storage_path TEXT  NOT NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Avaliações ────────────────────────────────────────────────────
-- tipo: simulado | somativa | segunda_chamada_simulado
--       | segunda_chamada_somativa | avaliacao_especifica
-- materia para simulados: HUMANAS | MATEMÁTICA | NATUREZA | LINGUAGENS
-- materia para outros: lista normal de disciplinas
CREATE TABLE IF NOT EXISTS avaliacoes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo    TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN (
              'simulado',
              'somativa',
              'segunda_chamada_simulado',
              'segunda_chamada_somativa',
              'avaliacao_especifica'
            )),
  materia   TEXT NOT NULL,
  data      DATE NOT NULL,
  horario   TEXT NOT NULL,
  conteudo  TEXT NOT NULL,
  dicas     TEXT,
  material  TEXT,
  turma_id  TEXT NOT NULL REFERENCES turmas(id),
  owner_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Índices ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_turma          ON users(turma_id);
CREATE INDEX IF NOT EXISTS idx_tasks_turma          ON tasks(turma_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entrega        ON tasks(data_entrega);
CREATE INDEX IF NOT EXISTS idx_registros_turma      ON registros(turma_id);
CREATE INDEX IF NOT EXISTS idx_registros_fixado     ON registros(fixado);
CREATE INDEX IF NOT EXISTS idx_registros_data       ON registros(data_atribuicao DESC);
CREATE INDEX IF NOT EXISTS idx_reg_imgs             ON registro_imagens(registro_id);
CREATE INDEX IF NOT EXISTS idx_task_done_user       ON task_done(user_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma     ON avaliacoes(turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data      ON avaliacoes(data);

-- ── RLS desativado (acesso via service key no backend) ────────────
ALTER TABLE turmas           DISABLE ROW LEVEL SECURITY;
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_done        DISABLE ROW LEVEL SECURITY;
ALTER TABLE registros        DISABLE ROW LEVEL SECURITY;
ALTER TABLE registro_imagens DISABLE ROW LEVEL SECURITY;
ALTER TABLE avaliacoes       DISABLE ROW LEVEL SECURITY;

-- ── Storage ───────────────────────────────────────────────────────
-- Crie manualmente no painel:
-- Storage > New Bucket > nome: "registros" > Public: false

-- ── Primeiro admin ────────────────────────────────────────────────
-- Após criar sua conta pelo app:
-- UPDATE users SET is_admin = true WHERE email = 'seu@email.com';

-- ================================================================
-- SE JÁ TEM O BANCO RODANDO (migrações incrementais):
-- Execute apenas o bloco abaixo em vez do schema completo acima
-- ================================================================

/*
-- Adiciona coluna data_atribuicao nas tasks (migration v3)
ALTER TABLE tasks RENAME COLUMN data_envio TO data_atribuicao;
ALTER TABLE tasks ALTER COLUMN data_atribuicao SET DEFAULT CURRENT_DATE;

-- Adiciona campos nos registros (migration v4)
ALTER TABLE registros ADD COLUMN IF NOT EXISTS data_atribuicao DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE registros ADD COLUMN IF NOT EXISTS arquivo_path TEXT;
ALTER TABLE registros ALTER COLUMN descricao DROP NOT NULL;

-- Cria tabela de avaliações (migration v5 — NOVO)
CREATE TABLE IF NOT EXISTS avaliacoes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo    TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN (
              'simulado','somativa',
              'segunda_chamada_simulado',
              'segunda_chamada_somativa',
              'avaliacao_especifica'
            )),
  materia   TEXT NOT NULL,
  data      DATE NOT NULL,
  horario   TEXT NOT NULL,
  conteudo  TEXT NOT NULL,
  dicas     TEXT,
  material  TEXT,
  turma_id  TEXT NOT NULL REFERENCES turmas(id),
  owner_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_turma ON avaliacoes(turma_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data  ON avaliacoes(data);
ALTER TABLE avaliacoes DISABLE ROW LEVEL SECURITY;
*/