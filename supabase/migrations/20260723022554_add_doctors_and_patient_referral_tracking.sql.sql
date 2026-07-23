/*
# Médicos Referentes + Vinculação Paciente × Médico

## Descrição
Adiciona controle de pacientes indicados por médicos referentes, permitindo
a prestação de contas paciente × médico × atendimento. Esta migration cria
a tabela `doctors` (médicos que indicam pacientes à nutricionista) e vincula
cada paciente ao médico que o indicou.

## Novas Tabelas

### 1. doctors
Cadastro de médicos referentes (médicos que indicam pacientes).
- id: identificador único
- user_id: dono do registro (nutricionista que cadastrou o médico)
- name: nome do médico
- specialty: especialidade médica
- crm: registro no conselho
- email, phone: contatos
- notes: observações
- status: ativo/inativo
- created_at, updated_at

## Tabelas Modificadas

### patients
- Adicionada coluna `doctor_id` (uuid, anulável): referência ao médico que
  indicou o paciente. Quando preenchido, permite rastrear a origem do
  paciente e gerar relatórios de prestação de contas.

## Segurança
- RLS habilitado na tabela `doctors` (owner-scoped via user_id).
- Políticas CRUD separadas (select/insert/update/delete) para authenticated.
- `user_id` com DEFAULT auth.uid() para facilitar inserts.
- A coluna `doctor_id` em patients é opcional (anulável) para não quebrar
  pacientes já cadastrados.
*/

-- ========================
-- DOCTORS (Médicos Referentes)
-- ========================
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  crm text,
  email text,
  phone text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_doctors" ON doctors;
CREATE POLICY "select_own_doctors" ON doctors FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_doctors" ON doctors;
CREATE POLICY "insert_own_doctors" ON doctors FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_doctors" ON doctors;
CREATE POLICY "update_own_doctors" ON doctors FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_doctors" ON doctors;
CREATE POLICY "delete_own_doctors" ON doctors FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS doctors_user_id_idx ON doctors(user_id);
CREATE INDEX IF NOT EXISTS doctors_status_idx ON doctors(status);

-- ========================
-- PATIENTS: add doctor_id column
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'doctor_id'
  ) THEN
    ALTER TABLE patients ADD COLUMN doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS patients_doctor_id_idx ON patients(doctor_id);
