# Checklist de seguridad — aluartmx-admin-staging

Estado: **NO DESPLEGAR**. Cloudflare Workers Builds debe permanecer desactivado.

## Entornos separados
- Sitio Pages: https://aluartmx-staging.pages.dev
- Worker staging: https://aluartmx-admin-staging.jinscout6.workers.dev
- Supabase staging: bndefaelluvhivrqtalf
- No modificar ni publicar el Worker de producción.

## Antes de habilitar builds
1. Incorporar a `worker/src/index.js` la versión **completa** y revisada del Worker staging (v6.1.4.1 + CORS). No sustituir por un Worker mínimo: debe conservar `/activar`, `/cliente`, `/cliente/resumen`, `/health`, `/admin/me`, `/admin/companies`, `/admin/invitations` y `/admin/invitations/status`.
2. Validar `node --check worker/src/index.js` y pruebas de CORS.
3. Configurar Worker Builds con **root directory `worker`**; deploy command `npx wrangler deploy`. Confirmar que Pages continúa desplegando la raíz del repositorio y no el Worker.
4. Comprobar variables existentes en Cloudflare: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret), `SUPERADMIN_USER_ID`; agregar `ALUARTMX_STAGING_ORIGIN=https://aluartmx-staging.pages.dev`. Nunca poner service role key en GitHub.
5. Probar preflight OPTIONS con Origin permitido, denegar Origin null y orígenes externos. Confirmar CORS en respuestas GET/POST, incluso errores.
6. Probar autenticación: sin JWT → 401; cliente → 403; superadmin staging → 200. Probar que una empresa no acceda a otra.
7. Verificar flujo de empresas e invitaciones con registros ficticios y reintentos; no enviar invitaciones reales.
8. Recién después, pedir autorización para activar builds/desplegar staging. Mantener producción intacta.

**Nota:** El archivo `worker/wrangler.toml` apunta a `src/index.js`, que todavía no existe en GitHub. Por lo tanto, habilitar builds ahora produciría un despliegue fallido. No activarlos hasta completar este checklist.
