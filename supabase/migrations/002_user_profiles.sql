-- Investitore — profilo utente: modalità assegnata dall'amministratore.
-- Esegui in Supabase → SQL Editor → New query → Run (dopo 001_user_data.sql).
--
-- Il cliente può LEGGERE il proprio profilo ma non modificarlo: la modalità
-- (guided / advanced / pro) la decide l'amministratore dal Table Editor.

create table if not exists public.user_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  mode       text not null default 'guided' check (mode in ('guided', 'advanced', 'pro')),
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

-- Solo lettura, solo del proprio profilo. Nessuna scrittura dall'app.
revoke all on public.user_profiles from anon, authenticated;
grant select on public.user_profiles to authenticated;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own" on public.user_profiles
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Ogni nuovo utente parte in modalità Guidata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Utenti già esistenti: profilo in modalità Guidata.
insert into public.user_profiles (user_id)
select id from auth.users
on conflict do nothing;

-- Amministratore: vede tutto e può cambiare la propria visualizzazione.
update public.user_profiles
set is_admin = true, mode = 'advanced'
where user_id = (select id from auth.users where lower(email) = 'tonypezzella.fa@gmail.com');
