-- Investitore — dati utente sincronizzati.
-- Una riga per chiave (es. 'investment_tracker_transactions'), isolata per utente.
-- Esegui questo script UNA volta in Supabase → SQL Editor → New query → Run.

create table if not exists public.user_data (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 120),
  value      text        not null check (octet_length(value) <= 5000000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Sicurezza: ogni utente vede e modifica SOLO le proprie righe.
alter table public.user_data enable row level security;

-- Nessun accesso senza login.
revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

drop policy if exists "user_data_select_own" on public.user_data;
drop policy if exists "user_data_insert_own" on public.user_data;
drop policy if exists "user_data_update_own" on public.user_data;
drop policy if exists "user_data_delete_own" on public.user_data;

create policy "user_data_select_own" on public.user_data
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_data_insert_own" on public.user_data
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_data_update_own" on public.user_data
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_data_delete_own" on public.user_data
  for delete to authenticated
  using (user_id = (select auth.uid()));
