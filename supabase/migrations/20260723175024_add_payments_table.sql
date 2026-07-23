/*
# Add Payments / Accounts Receivable Table

## Purpose
Adds a `payments` table to track accounts receivable for the nutritionist clinic.
This replaces the concept of a standalone "Reports" page with a financial control
module that tracks each consultation's payment status.

## New Tables

### payments
Tracks one payment record per consultation/appointment:
- `id` – UUID primary key
- `user_id` – owner (authenticated nutritionist)
- `patient_id` – linked patient
- `appointment_id` – optional link to a scheduled appointment
- `consultation_id` – optional link to a recorded consultation
- `service_date` – date the service was (or will be) provided
- `description` – service description (e.g. "Consulta de Retorno")
- `amount` – charged value in BRL
- `payment_method` – pix, dinheiro, cartão débito, cartão crédito, convênio, outro
- `payment_status` – pending | paid | cancelled | overdue
- `insurance_plan` – name of the health plan / convenio, if applicable
- `notes` – free text observations
- `paid_at` – timestamp when payment was confirmed
- `created_at` / `updated_at`

## Security
- RLS enabled; authenticated users see only their own rows.
- `user_id` defaults to `auth.uid()` so the frontend never needs to pass it.
*/

CREATE TABLE IF NOT EXISTS payments (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id        uuid        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id    uuid        REFERENCES appointments(id) ON DELETE SET NULL,
  consultation_id   uuid        REFERENCES consultations(id) ON DELETE SET NULL,
  service_date      date        NOT NULL,
  description       text,
  amount            numeric(10,2) NOT NULL DEFAULT 0,
  payment_method    text        CHECK (payment_method IN ('pix','dinheiro','cartão débito','cartão crédito','convênio','outro')) DEFAULT 'pix',
  payment_status    text        NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','cancelled','overdue')),
  insurance_plan    text,
  notes             text,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx      ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_patient_id_idx   ON payments(patient_id);
CREATE INDEX IF NOT EXISTS payments_service_date_idx ON payments(service_date);
CREATE INDEX IF NOT EXISTS payments_status_idx       ON payments(payment_status);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payments" ON payments;
CREATE POLICY "update_own_payments" ON payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payments" ON payments;
CREATE POLICY "delete_own_payments" ON payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
