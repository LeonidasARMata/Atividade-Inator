-- ================================================================
-- migration_v5.sql — Termos e Condições
-- Execute no SQL Editor do Supabase
-- ================================================================

-- ── Versões dos termos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS termos (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  versao     INTEGER NOT NULL UNIQUE,   -- 1, 2, 3...
  titulo     TEXT    NOT NULL DEFAULT 'Termos e Condições de Uso',
  conteudo   TEXT    NOT NULL,
  ativo      BOOLEAN NOT NULL DEFAULT true,  -- só um ativo por vez
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Aceites dos usuários ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS termos_aceite (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  termos_id  UUID    NOT NULL REFERENCES termos(id),
  aceito_em  TIMESTAMPTZ NOT NULL DEFAULT now(),  -- timestamp completo
  UNIQUE (user_id, termos_id)
);

CREATE INDEX IF NOT EXISTS idx_termos_aceite_user   ON termos_aceite(user_id);
CREATE INDEX IF NOT EXISTS idx_termos_aceite_termos ON termos_aceite(termos_id);

ALTER TABLE termos        DISABLE ROW LEVEL SECURITY;
ALTER TABLE termos_aceite DISABLE ROW LEVEL SECURITY;

-- ── Insere a versão inicial dos termos ────────────────────────────
INSERT INTO termos (versao, conteudo) VALUES (1, $TERMOS$
TERMOS E CONDIÇÕES DE USO — ATIVIDATOR

Última atualização: abril de 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SOBRE O SERVIÇO

O Atividator é uma plataforma digital criada com o objetivo de auxiliar alunos na organização e compartilhamento de atividades escolares. A plataforma permite que usuários registrem tarefas, organizem suas atividades pessoais e compartilhem informações com outros alunos da mesma turma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. NATUREZA NÃO OFICIAL

O Atividator é uma ferramenta comunitária independente, desenvolvida por alunos. Por isso:

• Não possui qualquer vínculo oficial com a escola ou seus sistemas institucionais, incluindo a plataforma Iônica.
• Não representa professores, coordenação ou qualquer órgão institucional.
• Não substitui informações oficiais fornecidas pela escola ou em sala de aula.

As informações oficiais devem sempre ser confirmadas pelos canais da escola.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. CADASTRO E DADOS PESSOAIS

Para utilizar a plataforma, o usuário deve fornecer nome completo, e-mail e turma. Esses dados são utilizados exclusivamente para identificação, organização das atividades e funcionamento da plataforma.

O uso do site implica concordância com a Lei Geral de Proteção de Dados Pessoais (LGPD).

Sobre o acesso aos dados:
• O responsável técnico pela plataforma pode ter acesso aos dados armazenados, incluindo atividades privadas, exclusivamente para fins de manutenção e segurança.
• Administradores (representantes) têm acesso apenas a conteúdos públicos, para fins de moderação. Atividades privadas não são visíveis a administradores.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. USO DA PLATAFORMA

Ao utilizar o Atividator, o usuário concorda em utilizá-lo de forma responsável e ética, não inserir informações falsas, enganosas ou prejudiciais, e respeitar os demais usuários.

O usuário pode criar atividades públicas (visíveis para a turma) e atividades privadas (de uso pessoal).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. CONTEÚDO E RESPONSABILIDADE

Todo conteúdo inserido na plataforma é de responsabilidade do próprio usuário. O Atividator não garante a veracidade, precisão ou completude das atividades publicadas, e não se responsabiliza por erros, omissões ou informações incorretas. Professores e canais oficiais continuam sendo a fonte principal de informação.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. MODERAÇÃO E ADMINISTRAÇÃO

A plataforma possui administradores (representantes de turma) responsáveis por manter o ambiente adequado. Eles podem remover conteúdos inadequados, suspender ou banir usuários e intervir em publicações públicas.

O responsável técnico do sistema possui acesso ampliado ao banco de dados exclusivamente para manutenção, segurança e moderação.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. CONTEÚDO PROIBIDO

É expressamente proibido utilizar a plataforma para publicar conteúdo ofensivo, discriminatório ou abusivo; spam ou mensagens irrelevantes; conteúdo impróprio, incluindo material de cunho sexual; ou qualquer material que viole leis ou normas escolares.

O descumprimento pode resultar em suspensão ou banimento da plataforma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. LIMITAÇÃO DE RESPONSABILIDADE

O Atividator é fornecido "como está", sem garantias de funcionamento contínuo ou livre de erros. O serviço pode apresentar instabilidades, ser modificado, suspenso ou encerrado a qualquer momento. A equipe não se responsabiliza por perda de informações ou prejuízos decorrentes do uso da plataforma.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9. MENORES DE IDADE

A plataforma é destinada principalmente a estudantes, incluindo menores de idade. Ao utilizar o serviço, entende-se que o uso ocorre com ciência do próprio usuário e/ou de seus responsáveis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10. EXCLUSÃO DE DADOS

O usuário pode solicitar a exclusão de sua conta e dados a qualquer momento pelo e-mail leonidas.armata@gmail.com. A solicitação será atendida em prazo razoável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

11. CONTATO

Para dúvidas, sugestões ou solicitações: leonidas.armata@gmail.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

12. DISPOSIÇÕES FINAIS

Este documento pode ser atualizado a qualquer momento. Alterações entram em vigor após notificação aos usuários pelo próprio sistema. O uso contínuo da plataforma após a notificação implica concordância com os termos atualizados.

O Atividator não possui qualquer afiliação com marcas, empresas ou obras externas.
$TERMOS$);