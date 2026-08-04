create or replace function public.admin_delete_user(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede eliminar usuarios';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta administradora';
  end if;

  delete from public.draws
  where winner_user_id = p_user_id;

  delete from auth.users
  where id = p_user_id;

  return found;
end;
$$;

revoke all
on function public.admin_delete_user(uuid)
from public;

grant execute
on function public.admin_delete_user(uuid)
to authenticated;

select 'Eliminación segura de usuarios activada' as resultado;
