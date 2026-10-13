// Tests de seguridad CORS para el Worker de staging. Ejecutar: node --test worker/tests/cors.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../src/index.js', import.meta.url),'utf8');
const { default: worker } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const env={ALUARTMX_STAGING_ORIGIN:'https://aluartmx-staging.pages.dev'};
function req(origin,method='OPTIONS'){return new Request('https://aluartmx-admin-staging.jinscout6.workers.dev/admin/me',{method,headers:origin?{Origin:origin}:undefined});}
test('Preflight de Pages permitido',async()=>{const r=await worker.fetch(req(env.ALUARTMX_STAGING_ORIGIN),env);assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),env.ALUARTMX_STAGING_ORIGIN);assert.match(r.headers.get('access-control-allow-headers'),/Authorization/);});
for(const origin of ['null','https://evil.example','http://aluartmx-staging.pages.dev'])test('Rechazar origen '+origin,async()=>{const r=await worker.fetch(req(origin),env);assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);});
test('Sin variable permitida se deniega',async()=>{const r=await worker.fetch(req(env.ALUARTMX_STAGING_ORIGIN),{});assert.equal(r.status,403);});
test('Sin cabecera Origin se deniega preflight',async()=>{const r=await worker.fetch(req(null),env);assert.equal(r.status,403);});
