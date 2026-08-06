/*
# Anamnese Nutricional — tabela + novos campos de paciente

## Descrição
Cria a tabela `anamnese` para armazenar o formulário de anamnese nutricional
preenchido publicamente (sem login) pelo paciente, e adiciona à tabela
`patients` os campos de dados pessoais que o formulário coleta mas que ainda
não existiam (profissão e flag de origem).

O formulário público é processado por uma Edge Function (`submit-anamnese`)
que usa a service-role key para criar o paciente (com `user_id` da nutricionista)
e o registro de anamnese em uma única operação. Desta forma a tabela
`anamnese` não precisa expor INSERT público — apenas a Edge Function escreve.

## Novas Tabelas

### anamnese
Armazena todos os dados clínicos e de estilo de vida do formulário:
- id (uuid PK)
- patient_id (FK → patients, CASCADE)
- motivo_consulta, acompanhamento_anterior, patologia, historia_familiar
- cirurgia, qual_cirurgia, medicamento_continuo, qual_medicamento
- queixas (text — lista separada por vírgula), outras_queixas, alergia
- atividade_fisica, suplemento, consumo_agua, restricao_alimentar
- intolerancia, alcool, moradia, habitos_cozinhar, alimentos_nao_gosta
- qualidade_sono, horas_sono, funcionamento_intestino, tipo_fezes
- dificuldade_evacuar, cor_urina, avaliacao_alimentar
- dificuldades_alimentacao, motivacao (0–10), exames_recentes, encaminhar_exames
- created_at, updated_at

## Tabelas Modificadas

### patients
- Adicionada coluna `profession` (text, anulável) — profissão do paciente.
- Adicionada coluna `from_anamnese` (boolean, default false) — indica que o
  cadastro foi criado automaticamente a partir do formulário público de
  anamnese, permitindo à nutricionista distinguir pacientes que ainda não
  passaram por cadastro manual.

## Segurança
- RLS habilitado em `anamnese`.
- SELECT/UPDATE/DELETE para authenticated, escopado via patient ownership:
  `EXISTS (SELECT 1 FROM patients p WHERE p.id = anamnese.patient_id AND p.user_id = auth.uid())`.
- INSERT apenas via Edge Function (service role) — nenhuma policy INSERT para
  anon/authenticated na tabela anamnese, pois o fluxo público passa pela Edge Function.
- A migração é idempotente (IF NOT EXISTS / DO $$ blocks).
*/

-- ========================
-- PATIENTS: add profession + from_anamnese
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'profession'
  ) THEN
    ALTER TABLE patients ADD COLUMN profession text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'from_anamnese'
  ) THEN
    ALTER TABLE patients ADD COLUMN from_anamnese boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ========================
-- ANAMNESE
-- ========================
CREATE TABLE IF NOT EXISTS anamnese (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id                uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  -- Motivo e histórico
  motivo_consulta           text,
  acompanhamento_anterior   text CHECK (acompanhamento_anterior IN ('Sim','Não')),
  patologia                 text,
  historia_familiar         text,
  cirurgia                  text CHECK (cirurgia IN ('Sim','Não')),
  qual_cirurgia             text,
  medicamento_continuo      text CHECK (medicamento_continuo IN ('Sim','Não')),
  qual_medicamento          text,

  -- Queixas e sintomas
  queixas                   text,
  outras_queixas            text,
  alergia                   text,

  -- Estilo de vida
  atividade_fisica          text,
  suplemento                text,
  consumo_agua              text,
  restricao_alimentar       text,
  intolerancia              text,
  alcool                    text,
  moradia                   text,
  habitos_cozinhar          text CHECK (habitos_cozinhar IN ('Sim','Não','Às vezes')),
  alimentos_nao_gosta       text,

  -- Sono, intestino e urina
  qualidade_sono            text CHECK (qualidade_sono IN ('Ótima','Boa','Regular','Ruim','Péssima')),
  horas_sono                numeric(4,1),
  funcionamento_intestino   text,
  tipo_fezes                text,
  dificuldade_evacuar       text CHECK (dificuldade_evacuar IN ('Sim','Não')),
  cor_urina                 text,

  -- Avaliação alimentar e motivação
  avaliacao_alimentar       text,
  dificuldades_alimentacao  text,
  motivacao                 integer CHECK (motivacao >= 0 AND motivacao <= 10),
  exames_recentes           text CHECK (exames_recentes IN ('Sim','Não')),
  encaminhar_exames         text,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE anamnese ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_anamnese" ON anamnese;
CREATE POLICY "select_own_anamnese" ON anamnese FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = anamnese.patient_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_anamnese" ON anamnese;
CREATE POLICY "update_own_anamnese" ON anamnese FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = anamnese.patient_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = anamnese.patient_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_anamnese" ON anamnese;
CREATE POLICY "delete_own_anamnese" ON anamnese FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.id = anamnese.patient_id AND p.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS anamnese_patient_id_idx ON anamnese(patient_id);
