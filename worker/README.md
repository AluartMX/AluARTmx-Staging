# AluARTmx admin staging Worker

Este directorio reserva la configuración para el Worker de pruebas `aluartmx-admin-staging`.

**No ejecutar despliegues todavía.** Falta incorporar el código Worker revisado a `worker/src/index.js`, comprobar las variables en Cloudflare y autorizar el despliegue. El repositorio público no debe contener claves privadas.

- Pages: https://aluartmx-staging.pages.dev
- Supabase staging: bndefaelluvhivrqtalf
- Worker de producción `aluartmx-api-v4-prueba`: intocable.
- La ruta `/admin/me` exige JWT de staging y autorización superadmin.
- CORS debe aceptar únicamente `https://aluartmx-staging.pages.dev` y responder preflight OPTIONS.
- No ejecutar SQL ni activar creación/eliminación de empresas durante esta preparación.

El archivo de configuración se mantiene separado de la raíz publicada por Pages.
