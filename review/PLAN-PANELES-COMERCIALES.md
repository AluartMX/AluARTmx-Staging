# AluARTmx Studio AR — preparación comercial (STAGING)

Estado: diseño y migración preparados; **no se ha ejecutado SQL ni se han activado clientes**.

## Panel superadministrador
- Acceso por correo/contraseña con JWT verificado por Worker.
- Empresas: consulta, búsqueda, créditos visibles, duplicados señalados.
- Creación Demo inactiva: implementada y probada.
- Invitaciones: consulta de estado disponible; envío existente en Worker, **no probado extremo a extremo**.
- Pendiente: activación segura, asignación de créditos, historial y suspensión, tras migración y pruebas.

## Panel cliente
- Ruta `/cliente`: login y resumen de empresa con consultas bajo RLS.
- Pendiente: alta/invitación probada con usuario ficticio, sesión renovable, galería propia, creación AR integrada, consumo atómico, límites de tamaño, gestión de videos y QR.

## Pruebas obligatorias antes de habilitar créditos
1. Revisar políticas RLS y triggers existentes en staging.
2. Revisar `review/creditos-staging-migration.sql` y corregir conflictos con tablas existentes.
3. Probar doble envío con misma `operacion_id`: exactamente un movimiento.
4. Probar solicitudes concurrentes con distintos IDs: no perder incrementos.
5. Probar JWT ausente, usuario cliente y empresa ajena: 401/403 sin cambios.
6. Probar `cantidad` inválida y overflow: transacción revertida.
7. Probar invitación con cuenta ficticia, sin usar clientes reales.
8. Probar consumo y reembolso con transacciones y auditoría antes de habilitar creación AR.
9. Revisar que producción nunca se usa como URL ni como credencial.

## Seguridad y despliegue
- Producción `AluartMX/AluART`, Worker principal y Supabase principal: intocables.
- No guardar secretos en GitHub ni frontend.
- Nunca llamar al RPC de créditos desde navegador; solo Worker autenticado con control de rol.
- No activar créditos comerciales hasta revisar el esquema completo y la migración.
