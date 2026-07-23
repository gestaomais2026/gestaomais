/*
# Sistema de Atendimento e Acompanhamento Nutricional - Wanessa Pinheiro Gestão Mais

## Descrição
Migration inicial que cria todas as tabelas necessárias para o sistema de atendimento
e acompanhamento nutricional da nutricionista Wanessa Pinheiro.

## Tabelas Criadas

### 1. profiles
Perfis dos usuários do sistema (nutricionista e assistentes).
- id: referencia auth.users
- full_name: nome completo
- role: papel no sistema (admin, nutritionist, assistant)
- avatar_url: foto de perfil

### 2. patients
Cadastro completo de pacientes.
- id: identificador único
- user_id: dono do registro (nutricionista)
- name, email, phone, birth_date, gender
- weight, height: dados antropométricos iniciais
- objective: objetivo do paciente
- health_history: histórico de saúde
- status: ativo/inativo/pausado

### 3. appointments
Agendamentos de consultas.
- patient_id, user_id
- scheduled_at: data/hora
- duration_minutes: duração
- type: primeira consulta, retorno, emergência
- status: agendado, confirmado, realizado, cancelado
- notes: observações

### 4. consultations
Registros de consultas realizadas.
- appointment_id, patient_id, user_id
- consultation_date
- weight, body_fat_pct, muscle_mass, waist, hip: medidas corporais
- blood_pressure, glucose: dados clínicos
- notes: anotações da consulta
- recommendations: recomendações

### 5. nutritional_plans
Planos nutricionais elaborados.
- patient_id, user_id
- title, description
- start_date, end_date
- calories_target, protein_g, carb_g, fat_g: metas nutricionais
- status: rascunho, ativo, concluído, arquivado
- content: conteúdo detalhado do plano

### 6. follow_ups
Acompanhamentos e mensagens entre consultas.
- patient_id, user_id
- type: mensagem, tarefa, alerta, progresso
- content: conteúdo
- is_completed: para tarefas
- due_date: prazo para tarefas

## Segurança
- RLS habilitado em todas as tabelas
- Políticas scoped para authenticated (sistema tem login)
- user_id com DEFAULT auth.uid() para facilitar inserts
*/

-- ========================
-- PROFILES
-- ========================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'nutritionist' CHECK (role IN ('admin', 'nutritionist', 'assistant')),
  avatar_url text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ========================
-- PATIENTS
-- ========================
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  birth_date date,
  gender text CHECK (gender IN ('female', 'male', 'other')),
  weight_kg numeric(5,2),
  height_cm numeric(5,1),
  objective text,
  health_history text,
  allergies text,
  medications text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paused')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_patients" ON patients;
CREATE POLICY "select_own_patients" ON patients FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_patients" ON patients;
CREATE POLICY "insert_own_patients" ON patients FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_patients" ON patients;
CREATE POLICY "update_own_patients" ON patients FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_patients" ON patients;
CREATE POLICY "delete_own_patients" ON patients FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS patients_user_id_idx ON patients(user_id);
CREATE INDEX IF NOT EXISTS patients_status_idx ON patients(status);

-- ========================
-- APPOINTMENTS
-- ========================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  type text NOT NULL DEFAULT 'return' CHECK (type IN ('first', 'return', 'emergency', 'online')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_appointments" ON appointments;
CREATE POLICY "select_own_appointments" ON appointments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_appointments" ON appointments;
CREATE POLICY "insert_own_appointments" ON appointments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_appointments" ON appointments;
CREATE POLICY "update_own_appointments" ON appointments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_appointments" ON appointments;
CREATE POLICY "delete_own_appointments" ON appointments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS appointments_user_id_idx ON appointments(user_id);
CREATE INDEX IF NOT EXISTS appointments_patient_id_idx ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS appointments_scheduled_at_idx ON appointments(scheduled_at);

-- ========================
-- CONSULTATIONS
-- ========================
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  consultation_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric(5,2),
  body_fat_pct numeric(4,1),
  muscle_mass_kg numeric(5,2),
  waist_cm numeric(5,1),
  hip_cm numeric(5,1),
  blood_pressure text,
  glucose numeric(5,1),
  notes text,
  recommendations text,
  next_consultation_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_consultations" ON consultations;
CREATE POLICY "select_own_consultations" ON consultations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_consultations" ON consultations;
CREATE POLICY "insert_own_consultations" ON consultations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_consultations" ON consultations;
CREATE POLICY "update_own_consultations" ON consultations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_consultations" ON consultations;
CREATE POLICY "delete_own_consultations" ON consultations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS consultations_user_id_idx ON consultations(user_id);
CREATE INDEX IF NOT EXISTS consultations_patient_id_idx ON consultations(patient_id);

-- ========================
-- NUTRITIONAL PLANS
-- ========================
CREATE TABLE IF NOT EXISTS nutritional_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  calories_target integer,
  protein_g integer,
  carb_g integer,
  fat_g integer,
  content text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE nutritional_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_plans" ON nutritional_plans;
CREATE POLICY "select_own_plans" ON nutritional_plans FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_plans" ON nutritional_plans;
CREATE POLICY "insert_own_plans" ON nutritional_plans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_plans" ON nutritional_plans;
CREATE POLICY "update_own_plans" ON nutritional_plans FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_plans" ON nutritional_plans;
CREATE POLICY "delete_own_plans" ON nutritional_plans FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS plans_user_id_idx ON nutritional_plans(user_id);
CREATE INDEX IF NOT EXISTS plans_patient_id_idx ON nutritional_plans(patient_id);

-- ========================
-- FOLLOW UPS
-- ========================
CREATE TABLE IF NOT EXISTS follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'task', 'alert', 'progress')),
  content text NOT NULL,
  is_completed boolean DEFAULT false,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_follow_ups" ON follow_ups;
CREATE POLICY "select_own_follow_ups" ON follow_ups FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_follow_ups" ON follow_ups;
CREATE POLICY "insert_own_follow_ups" ON follow_ups FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_follow_ups" ON follow_ups;
CREATE POLICY "update_own_follow_ups" ON follow_ups FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_follow_ups" ON follow_ups;
CREATE POLICY "delete_own_follow_ups" ON follow_ups FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS follow_ups_user_id_idx ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS follow_ups_patient_id_idx ON follow_ups(patient_id);

-- ========================
-- AUTO-CREATE PROFILE TRIGGER
-- ========================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
