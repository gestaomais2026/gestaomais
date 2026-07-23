/*
# Corrigir erro de cadastro - Database error saving new user

## Descrição
O cadastro de novos usuários falhava com o erro
"Database error saving new user". A causa mais provavel e a ausencia
de um `search_path` explicito na funcao trigger `handle_new_user`,
que e SECURITY DEFINER. Sem search_path explicito, a funcao pode
falhar ao resolver o schema `public` em determinados contextos.

## Alteracoes
1. Recria a funcao `handle_new_user()` com `search_path = public`
   explicito, mantendo SECURITY DEFINER.
2. Remove e recria o trigger `on_auth_user_created` para usar a
   funcao atualizada.
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
