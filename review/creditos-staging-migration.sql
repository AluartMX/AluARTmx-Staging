-- AluARTmx STAGING: propuesta de migración de créditos y activación.
-- REVISIÓN: NO EJECUTADA. No usar en producción.
-- Requiere revisar políticas RLS y funciones existentes antes de aplicar.
create table if not exists public.movimientos_creditos_staging (
 id uuid primary key default gen_random_uuid(),
 empresa_id uuid not null references public.empresas(id),
 operacion_id uuid not null unique,
 tipo text not null check (tipo in ('asignacion','consumo','reversion')),
 cantidad integer not null check (cantidad > 0),
 referencia text,
 actor_id uuid not null references auth.users(id),
 creado_en timestamptz not null default now()
);
alter table public.movimientos_creditos_staging enable row level security;
revoke all on public.movimientos_creditos_staging from anon, authenticated;
-- La función se invocaría solo desde el Worker con service_role tras
-- verificar JWT, UUID superadmin y perfil en public.usuarios.
-- No publicar RPC a clientes antes de revisión y pruebas de concurrencia.
create or replace function public.aluartmx_admin_creditos_staging(
 p_empresa uuid, p_operacion uuid, p_cantidad integer, p_actor uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.empresas%rowtype; m public.movimientos_creditos_staging%rowtype;
begin
 if auth.role() <> 'service_role' then raise exception 'No autorizado'; end if;
 if p_cantidad < 1 or p_cantidad > 100000 then raise exception 'Cantidad inválida'; end if;
 select * into v from public.empresas where id=p_empresa for update;
 if not found then raise exception 'Empresa inexistente'; end if;
 select * into m from public.movimientos_creditos_staging where operacion_id=p_operacion;
 if found then
   if m.empresa_id<>p_empresa or m.cantidad<>p_cantidad or m.tipo<>'asignacion' or m.actor_id<>p_actor
     then raise exception 'Idempotencia incompatible'; end if;
   return jsonb_build_object('idempotente',true,'limite',v.limite_cuadros);
 end if;
 if v.limite_cuadros > 1000000-p_cantidad then raise exception 'Límite excedido'; end if;
 update public.empresas set limite_cuadros=limite_cuadros+p_cantidad where id=p_empresa;
 insert into public.movimientos_creditos_staging(empresa_id,operacion_id,tipo,cantidad,actor_id)
 values(p_empresa,p_operacion,'asignacion',p_cantidad,p_actor);
 return jsonb_build_object('idempotente',false,'limite',v.limite_cuadros+p_cantidad);
end $$;
revoke all on function public.aluartmx_admin_creditos_staging(uuid,uuid,integer,uuid) from public, anon, authenticated;
grant execute on function public.aluartmx_admin_creditos_staging(uuid,uuid,integer,uuid) to service_role;
