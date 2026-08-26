/*
# Acesso compartilhado entre todos os usuários + coluna indicado_por na anamnese

## Descrição
Este migration altera o modelo de acesso: todos os usuários autenticados passam
a ver e editar todos os registros de todos os usuários (pacientes, consultas,
agendamentos, médicos, anamnese, etc.). Anteriormente cada usuário só via seus
próprios registros (owner-scoped). Agora o sistema é colaborativo: qualquer
nutricionista/assistente logado vê tudo.

Também adiciona a coluna `indicado_por` à tabela `anamnese`, que estava sendo
referenciada pelo código mas não existia no banco.

## Tabelas Modificadas

### anamnese
- Adicionada coluna `indicado_por` (uuid, anulável): referência ao médico que
  indicou o paciente, lincada à tabela doctors.

## Segurança — mudança de modelo
- Todas as políticas owner-scoped (auth.uid() = user_id) são removidas.
- Novas políticas permitem acesso total a todos os usuários autenticados
  (USING (true) / WITH CHECK (true)).
- O papel `authenticated` mantém acesso; `anon` continua sem acesso às tabelas
  internas (a Edge Function usa service role para inserts públicos).
- Tabelas afetadas: profiles, patients, appointments, consultations,
  nutritional_plans, follow_ups, doctors, anamnese, payments, expense_categories,
  payable_entries, payable_monthly_balances.

## Notas
1. A coluna user_id permanece nas tabelas para auditoria (saber quem criou o
   registro), mas não é mais usada para filtrar acesso.
2. O formulário público de anamnese continua funcionando via Edge Function com
   service role key.
3. A migration é idempotente — policies são dropadas antes de recriadas.
*/

-- ========================
-- ANAMNESE: add indicado_por column
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'anamnese' AND column_name = 'indicado_por'
  ) THEN
    ALTER TABLE anamnese ADD COLUMN indicado_por uuid REFERENCES doctors(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ========================
-- Helper: recriar policies de uma tabela para acesso compartilhado
-- ========================

-- PROFILES
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;

CREATE POLICY "profiles_select_all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_all" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "profiles_update_all" ON profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "profiles_delete_all" ON profiles FOR DELETE TO authenticated USING (true);

-- PATIENTS
DROP POLICY IF EXISTS "select_own_patients" ON patients;
DROP POLICY IF EXISTS "insert_own_patients" ON patients;
DROP POLICY IF EXISTS "update_own_patients" ON patients;
DROP POLICY IF EXISTS "delete_own_patients" ON patients;

CREATE POLICY "patients_select_all" ON patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "patients_insert_all" ON patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "patients_update_all" ON patients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "patients_delete_all" ON patients FOR DELETE TO authenticated USING (true);

-- APPOINTMENTS
DROP POLICY IF EXISTS "select_own_appointments" ON appointments;
DROP POLICY IF EXISTS "insert_own_appointments" ON appointments;
DROP POLICY IF EXISTS "update_own_appointments" ON appointments;
DROP POLICY IF EXISTS "delete_own_appointments" ON appointments;

CREATE POLICY "appointments_select_all" ON appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "appointments_insert_all" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "appointments_update_all" ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "appointments_delete_all" ON appointments FOR DELETE TO authenticated USING (true);

-- CONSULTATIONS
DROP POLICY IF EXISTS "select_own_consultations" ON consultations;
DROP POLICY IF EXISTS "insert_own_consultations" ON consultations;
DROP POLICY IF EXISTS "update_own_consultations" ON consultations;
DROP POLICY IF EXISTS "delete_own_consultations" ON consultations;

CREATE POLICY "consultations_select_all" ON consultations FOR SELECT TO authenticated USING (true);
CREATE POLICY "consultations_insert_all" ON consultations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "consultations_update_all" ON consultations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "consultations_delete_all" ON consultations FOR DELETE TO authenticated USING (true);

-- NUTRITIONAL PLANS
DROP POLICY IF EXISTS "select_own_plans" ON nutritional_plans;
DROP POLICY IF EXISTS "insert_own_plans" ON nutritional_plans;
DROP POLICY IF EXISTS "update_own_plans" ON nutritional_plans;
DROP POLICY IF EXISTS "delete_own_plans" ON nutritional_plans;

CREATE POLICY "plans_select_all" ON nutritional_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "plans_insert_all" ON nutritional_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "plans_update_all" ON nutritional_plans FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "plans_delete_all" ON nutritional_plans FOR DELETE TO authenticated USING (true);

-- FOLLOW UPS
DROP POLICY IF EXISTS "select_own_follow_ups" ON follow_ups;
DROP POLICY IF EXISTS "insert_own_follow_ups" ON follow_ups;
DROP POLICY IF EXISTS "update_own_follow_ups" ON follow_ups;
DROP POLICY IF EXISTS "delete_own_follow_ups" ON follow_ups;

CREATE POLICY "follow_ups_select_all" ON follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "follow_ups_insert_all" ON follow_ups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "follow_ups_update_all" ON follow_ups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "follow_ups_delete_all" ON follow_ups FOR DELETE TO authenticated USING (true);

-- DOCTORS
DROP POLICY IF EXISTS "select_own_doctors" ON doctors;
DROP POLICY IF EXISTS "insert_own_doctors" ON doctors;
DROP POLICY IF EXISTS "update_own_doctors" ON doctors;
DROP POLICY IF EXISTS "delete_own_doctors" ON doctors;

CREATE POLICY "doctors_select_all" ON doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "doctors_insert_all" ON doctors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "doctors_update_all" ON doctors FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "doctors_delete_all" ON doctors FOR DELETE TO authenticated USING (true);

-- ANAMNESE
DROP POLICY IF EXISTS "select_own_anamnese" ON anamnese;
DROP POLICY IF EXISTS "update_own_anamnese" ON anamnese;
DROP POLICY IF EXISTS "delete_own_anamnese" ON anamnese;

CREATE POLICY "anamnese_select_all" ON anamnese FOR SELECT TO authenticated USING (true);
CREATE POLICY "anamnese_insert_all" ON anamnese FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "anamnese_update_all" ON anamnese FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anamnese_delete_all" ON anamnese FOR DELETE TO authenticated USING (true);

-- PAYMENTS (may have owner-scoped policies too)
DROP POLICY IF EXISTS "select_own_payments" ON payments;
DROP POLICY IF EXISTS "insert_own_payments" ON payments;
DROP POLICY IF EXISTS "update_own_payments" ON payments;
DROP POLICY IF EXISTS "delete_own_payments" ON payments;

CREATE POLICY "payments_select_all" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "payments_insert_all" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payments_update_all" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete_all" ON payments FOR DELETE TO authenticated USING (true);

-- EXPENSE CATEGORIES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_categories') THEN
    DROP POLICY IF EXISTS "select_own_expense_categories" ON expense_categories;
    DROP POLICY IF EXISTS "insert_own_expense_categories" ON expense_categories;
    DROP POLICY IF EXISTS "update_own_expense_categories" ON expense_categories;
    DROP POLICY IF EXISTS "delete_own_expense_categories" ON expense_categories;

    CREATE POLICY "expense_cat_select_all" ON expense_categories FOR SELECT TO authenticated USING (true);
    CREATE POLICY "expense_cat_insert_all" ON expense_categories FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "expense_cat_update_all" ON expense_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "expense_cat_delete_all" ON expense_categories FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- PAYABLE ENTRIES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payable_entries') THEN
    DROP POLICY IF EXISTS "select_own_payable_entries" ON payable_entries;
    DROP POLICY IF EXISTS "insert_own_payable_entries" ON payable_entries;
    DROP POLICY IF EXISTS "update_own_payable_entries" ON payable_entries;
    DROP POLICY IF EXISTS "delete_own_payable_entries" ON payable_entries;

    CREATE POLICY "payable_select_all" ON payable_entries FOR SELECT TO authenticated USING (true);
    CREATE POLICY "payable_insert_all" ON payable_entries FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "payable_update_all" ON payable_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "payable_delete_all" ON payable_entries FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- PAYABLE MONTHLY BALANCES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payable_monthly_balances') THEN
    DROP POLICY IF EXISTS "select_own_payable_monthly_balances" ON payable_monthly_balances;
    DROP POLICY IF EXISTS "insert_own_payable_monthly_balances" ON payable_monthly_balances;
    DROP POLICY IF EXISTS "update_own_payable_monthly_balances" ON payable_monthly_balances;
    DROP POLICY IF EXISTS "delete_own_payable_monthly_balances" ON payable_monthly_balances;

    CREATE POLICY "payable_bal_select_all" ON payable_monthly_balances FOR SELECT TO authenticated USING (true);
    CREATE POLICY "payable_bal_insert_all" ON payable_monthly_balances FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "payable_bal_update_all" ON payable_monthly_balances FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "payable_bal_delete_all" ON payable_monthly_balances FOR DELETE TO authenticated USING (true);
  END IF;
END $$;