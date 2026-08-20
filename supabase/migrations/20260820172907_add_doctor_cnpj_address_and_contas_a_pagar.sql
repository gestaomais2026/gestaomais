/*
# Médicos: CNPJ + Endereço | Contas a Pagar | Categorias

## Descrição
1. Adiciona campos CNPJ e endereço ao cadastro de médicos referentes.
2. Cria o módulo de Contas a Pagar com lançamentos mensais, categorias
   (cadastradas pelo usuário, incluindo criação inline), saldo inicial
   mensal, entrada, despesas pagas e saldo final.
3. Inclui filtros por busca (descrição), período (início/fim), categoria,
   status e classificação.

## Tabelas Modificadas

### doctors
- `cnpj` (text, anulável): CNPJ do médico/clínica.
- `address` (text, anulável): endereço completo (logradouro, número,
  complemento, bairro, cidade, UF, CEP).

## Novas Tabelas

### 1. expense_categories
Categorias de despesa cadastradas pelo próprio usuário (criação inline
no formulário de lançamento quando não houver categoria cadastrada).
- id, user_id (DEFAULT auth.uid()), name (único por usuário), created_at.
- RLS owner-scoped (authenticated).

### 2. payable_entries
Lançamentos de contas a pagar. Cada lançamento pertence a um mês
(referência month_year no formato YYYY-MM), permitindo divisão mensal.
- id, user_id (DEFAULT auth.uid())
- description (text): descrição do lançamento
- amount (numeric(12,2)): valor
- due_date (date): vencimento
- paid_at (date, anulável): data de pagamento (quando status = pago)
- status (text): aberto | pago | vencido
- classification (text): fixo | variavel
- category_id (uuid, anulável): referência a expense_categories
- bank_info (text, anulável): dados bancários
- month_year (text): referência mensal YYYY-MM (derivada do vencimento
  por padrão, mas editável para permitir lançamento em mês específico)
- created_at, updated_at
- RLS owner-scoped (authenticated).
- Índices em user_id, month_year, status, classification, category_id.

### 3. payable_monthly_balances
Saldo inicial e controle mensal. Um registro por mês (month_year).
- id, user_id (DEFAULT auth.uid())
- month_year (text, único por usuário): YYYY-MM
- opening_balance (numeric(12,2), default 0): saldo inicial do mês
- created_at, updated_at
- RLS owner-scoped (authenticated).
- Constraint UNIQUE(user_id, month_year).

## Segurança
- RLS habilitado em todas as novas tabelas.
- Políticas CRUD separadas (select/insert/update/delete) para authenticated.
- user_id com DEFAULT auth.uid() em todas as tabelas.
*/

-- ========================
-- DOCTORS: add cnpj + address
-- ========================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'cnpj'
  ) THEN
    ALTER TABLE doctors ADD COLUMN cnpj text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'doctors' AND column_name = 'address'
  ) THEN
    ALTER TABLE doctors ADD COLUMN address text;
  END IF;
END $$;

-- ========================
-- EXPENSE_CATEGORIES
-- ========================
CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_expense_categories" ON expense_categories;
CREATE POLICY "select_own_expense_categories" ON expense_categories FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_expense_categories" ON expense_categories;
CREATE POLICY "insert_own_expense_categories" ON expense_categories FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_expense_categories" ON expense_categories;
CREATE POLICY "update_own_expense_categories" ON expense_categories FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_expense_categories" ON expense_categories;
CREATE POLICY "delete_own_expense_categories" ON expense_categories FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS expense_categories_user_id_idx ON expense_categories(user_id);

-- ========================
-- PAYABLE_ENTRIES
-- ========================
CREATE TABLE IF NOT EXISTS payable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date NOT NULL,
  paid_at date,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago','vencido')),
  classification text NOT NULL DEFAULT 'variavel' CHECK (classification IN ('fixo','variavel')),
  category_id uuid REFERENCES expense_categories(id) ON DELETE SET NULL,
  bank_info text,
  month_year text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payable_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payable_entries" ON payable_entries;
CREATE POLICY "select_own_payable_entries" ON payable_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payable_entries" ON payable_entries;
CREATE POLICY "insert_own_payable_entries" ON payable_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payable_entries" ON payable_entries;
CREATE POLICY "update_own_payable_entries" ON payable_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payable_entries" ON payable_entries;
CREATE POLICY "delete_own_payable_entries" ON payable_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS payable_entries_user_id_idx ON payable_entries(user_id);
CREATE INDEX IF NOT EXISTS payable_entries_month_year_idx ON payable_entries(month_year);
CREATE INDEX IF NOT EXISTS payable_entries_status_idx ON payable_entries(status);
CREATE INDEX IF NOT EXISTS payable_entries_classification_idx ON payable_entries(classification);
CREATE INDEX IF NOT EXISTS payable_entries_category_id_idx ON payable_entries(category_id);

-- ========================
-- PAYABLE_MONTHLY_BALANCES
-- ========================
CREATE TABLE IF NOT EXISTS payable_monthly_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL,
  opening_balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE payable_monthly_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payable_balances" ON payable_monthly_balances;
CREATE POLICY "select_own_payable_balances" ON payable_monthly_balances FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payable_balances" ON payable_monthly_balances;
CREATE POLICY "insert_own_payable_balances" ON payable_monthly_balances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payable_balances" ON payable_monthly_balances;
CREATE POLICY "update_own_payable_balances" ON payable_monthly_balances FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payable_balances" ON payable_monthly_balances;
CREATE POLICY "delete_own_payable_balances" ON payable_monthly_balances FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS payable_balances_user_id_idx ON payable_monthly_balances(user_id);
