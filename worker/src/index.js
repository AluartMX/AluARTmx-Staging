// AluARTmx Staging v6.1.4.1 + CORS restringido (REVISIÓN, NO DESPLEGADO) - LISTADO ADMINISTRATIVO SOLO LECTURA, NO PUBLICAR SIN AUTORIZACION. Requiere migracion SQL v6.1.1.
// AluARTmx STAGING v6.0 — panel cliente solo lectura, invitacion staging + pagina /activar, mantiene creacion Demo existente.
// Seguro para desplegar en el Worker NUEVO aluartmx-admin-staging.
// La ruta /activar cambia contraseña solo con token valido de Supabase. Solo /admin/invitations envia invitaciones tras autorizacion superadmin.
const headers = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
const respond = (body,status=200) => new Response(JSON.stringify(body),{status,headers});
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default {
  async fetch(request,env) {
    // CORS restringido al panel HTTPS de pruebas. Nunca autorizar Origin: null.
    const origin = request.headers.get('Origin');
    const allowed = (env.ALUARTMX_STAGING_ORIGIN || '').trim();
    const trusted = Boolean(allowed && allowed.startsWith('https://') && origin === allowed);
    if (request.method === 'OPTIONS') {
      if (!trusted) return new Response(null, {status: 403, headers: {'cache-control':'no-store'}});
      return new Response(null, {status: 204, headers: {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin',
        'cache-control':'no-store'
      }});
    }
    const response = await this.handle(request,env);
    if (!trusted) return response;
    const out = new Response(response.body, response);
    out.headers.set('Access-Control-Allow-Origin',allowed);
    out.headers.set('Vary','Origin');
    return out;
  },
  async handle(request,env) {
    const url = new URL(request.url);


    if (request.method === 'GET' && url.pathname === '/activar') {
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
        return respond({error:'Configuracion incompleta'},503);
      const sbUrl=JSON.stringify(env.SUPABASE_URL).replace(/</g,'\\u003c');
      const sbKey=JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY).replace(/</g,'\\u003c');
      const html=`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AluARTmx - Activar cuenta de prueba</title>
<style>body{font:16px system-ui;background:#0d1b30;color:#eef6ff;max-width:520px;margin:50px auto;padding:20px}main{background:#142844;border-radius:16px;padding:25px}input,button{box-sizing:border-box;width:100%;padding:12px;margin:9px 0;font:inherit;border-radius:8px}button{background:#18a4ba;color:#fff;border:0;cursor:pointer}button:disabled{opacity:.55}#msg{white-space:pre-wrap;overflow-wrap:anywhere;background:#0a172b;padding:12px;border-radius:8px}small{color:#b7c8dd}</style></head>
<body><main><h2>Activar cuenta AluARTmx</h2><p>Entorno de pruebas. Establece tu contraseña para la cuenta invitada.</p>
<p id="msg" role="status">Comprobando invitación...</p>
<form id="form" hidden><label>Nueva contraseña<input id="pass" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
<label>Repetir contraseña<input id="repeat" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label>
<button id="save" type="submit">Establecer contraseña</button></form>
<small>Usa únicamente el enlace que recibiste de Supabase Staging. Esta página no activa empresas ni concede permisos.</small></main>
<script>
const SB=${sbUrl},KEY=${sbKey},msg=document.getElementById('msg'),form=document.getElementById('form');
let token=null;
(async()=>{
try {
const fragment=new URLSearchParams(location.hash.slice(1));
const query=new URLSearchParams(location.search);
history.replaceState(null,'',location.pathname);
if(fragment.get('error')||query.get('error'))throw Error('El enlace no es válido o expiró.');
if(fragment.get('access_token') && (fragment.get('type')==='invite'||fragment.get('type')==='recovery')){
token=fragment.get('access_token');
}else if(query.get('token_hash') && (query.get('type')==='invite'||query.get('type')==='recovery')){
const response=await fetch(SB.replace(/\\/$/,'')+'/auth/v1/verify',{method:'POST',
headers:{'content-type':'application/json',apikey:KEY},
body:JSON.stringify({token_hash:query.get('token_hash'),type:query.get('type')})});
if(!response.ok)throw Error('No se pudo verificar el enlace de invitación.');
const payload=await response.json();token=payload.access_token;
}
if(!token)throw Error('No encontramos una invitación válida. Solicita un enlace nuevo al administrador.');
const check=await fetch(SB.replace(/\\/$/,'')+'/auth/v1/user',{headers:{apikey:KEY,authorization:'Bearer '+token}});
if(!check.ok)throw Error('La invitación ya expiró o no es válida.');
msg.textContent='Invitación verificada. Elige una contraseña de al menos 12 caracteres.';
form.hidden=false;
}catch(e){msg.textContent=e.message||'No se pudo verificar la invitación.';}
})();
form.addEventListener('submit',async(e)=>{
e.preventDefault();const p=document.getElementById('pass'),r=document.getElementById('repeat'),save=document.getElementById('save');
if(p.value!==r.value){msg.textContent='Las contraseñas no coinciden.';return;}
if(p.value.length<12){msg.textContent='Usa al menos 12 caracteres.';return;}
save.disabled=true;msg.textContent='Guardando contraseña...';
try{
const response=await fetch(SB.replace(/\\/$/,'')+'/auth/v1/user',{method:'PUT',
headers:{apikey:KEY,authorization:'Bearer '+token,'content-type':'application/json'},
body:JSON.stringify({password:p.value})});
p.value='';r.value='';
if(!response.ok)throw Error('No se pudo actualizar la contraseña. Solicita ayuda al administrador.');
token=null;form.hidden=true;
msg.textContent='Contraseña establecida. La empresa todavía requiere autorización del administrador para utilizar AluARTmx.';
}catch(e){p.value='';r.value='';msg.textContent=e.message;}finally{save.disabled=false;}
});
</script></body></html>`;
      return new Response(html,{headers:{
        'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src "+new URL(env.SUPABASE_URL).origin+"; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"
      }});
    }
    if (request.method === 'GET' && url.pathname === '/test') {
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
        return respond({error:'Configuracion incompleta'},503);
      const supabaseUrl=JSON.stringify(env.SUPABASE_URL).replace(/</g,'\\u003c');
      const publishableKey=JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY).replace(/</g,'\\u003c');
      const html=`<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AluARTmx staging - Verificacion admin</title>
<style>body{font:16px system-ui;background:#0d1b30;color:#edf6ff;max-width:550px;margin:45px auto;padding:20px}main{background:#142844;padding:24px;border-radius:16px}input,button,select{font:inherit;padding:12px;border-radius:8px;box-sizing:border-box;width:100%;margin:8px 0}button{background:#18a4ba;color:white;border:0;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#091526;padding:15px;border-radius:8px}small{color:#adc3da}</style>
</head><body><main><h2>AluARTmx Staging</h2><p>Prueba de acceso de superadministrador (staging).</p>
<form id="login"><label>Correo<input id="email" type="email" autocomplete="username" required></label>
<label>Contraseña<input id="password" type="password" autocomplete="current-password" required></label>
<button type="submit">Verificar acceso</button></form>
<pre id="result" aria-live="polite">Sin iniciar sesión.</pre>
<section id="companies-list" hidden><h3>Empresas registradas (solo lectura)</h3>
<button id="load-companies" type="button">Consultar empresas</button>
<pre id="companies-result" aria-live="polite">Pulsa consultar para cargar hasta 100 empresas.</pre></section>
<section id="company" hidden><h3>Crear empresa Demo real (staging)</h3>
<label>Nombre de empresa<input id="company-name" maxlength="100" placeholder="Fotografia Prueba Uno"></label>
<label>Tipo<select id="company-type"><option value="fotografo">Fotografo</option><option value="empresa">Empresa</option></select></label>
<p>Plan: Demo · 2 cuadros · Empresa inactiva · Sin invitación.</p>
<button id="create-company" type="button">Crear empresa Demo de prueba</button></section>
<section id="invite" hidden><h3>Invitar cliente de empresa de prueba (staging)</h3>
<p>ATENCIÓN: envía correo REAL. Usa una empresa ficticia sin cliente vinculado; no uses Riviera Foto.</p><label>ID de empresa de prueba<input id="invite-company" required placeholder="UUID de empresa ficticia"></label>
<label>Correo de prueba<input id="invite-email" type="email" autocomplete="off" placeholder="segundo-correo@ejemplo.com"></label>
<button id="invite-send" type="button">Enviar invitación real</button>
</section>
<small>Solo usa tu cuenta del proyecto de pruebas. La contraseña no se guarda en este navegador.</small></main>
<script>
const SUPABASE_URL=${supabaseUrl},PUBLISHABLE_KEY=${publishableKey};
let accessToken=null;let pendingId=null;
document.getElementById('login').addEventListener('submit',async(e)=>{
e.preventDefault();const result=document.getElementById('result'),pass=document.getElementById('password');
result.textContent='Comprobando...';
try{
const r=await fetch(SUPABASE_URL.replace(/\\/$/,'')+'/auth/v1/token?grant_type=password',{
method:'POST',headers:{'content-type':'application/json','apikey':PUBLISHABLE_KEY},
body:JSON.stringify({email:document.getElementById('email').value,password:pass.value})
});
pass.value='';
if(!r.ok){result.textContent='No se pudo iniciar sesión en Supabase Staging ('+r.status+'). Revisa correo y contraseña.';return;}
const auth=await r.json();
const check=await fetch('/admin/me',{headers:{authorization:'Bearer '+auth.access_token}});
const data=await check.json();
result.textContent=JSON.stringify({http_status:check.status,...data},null,2);
accessToken=check.ok&&data.autorizado?auth.access_token:null;
document.getElementById('company').hidden=!accessToken;
document.getElementById('companies-list').hidden=!accessToken;
document.getElementById('invite').hidden=!accessToken;
}catch(err){pass.value='';result.textContent='Error de red: '+String(err.message||err);}
});
document.getElementById('load-companies').addEventListener('click',async()=>{
const output=document.getElementById('companies-result');
if(!accessToken){output.textContent='Primero inicia sesion';return;}
output.textContent='Consultando empresas...';
try{
const r=await fetch('/admin/companies',{headers:{authorization:'Bearer '+accessToken}});
const data=await r.json();
if(!r.ok){output.textContent='Error '+r.status+': '+String(data.error||'No disponible');return;}
output.textContent=(data.empresas||[]).map(e=>
  e.nombre+' | '+e.plan_comercial+' | '+(e.activa?'Activa':'Pendiente')+' | cuadros: '+e.limite_cuadros+' | ID: '+e.id
).join('\\n')||'No hay empresas registradas.';
}catch(e){output.textContent='Error de red: '+String(e.message||e);}
});
document.getElementById('invite-send').addEventListener('click',async()=>{
const email=document.getElementById('invite-email').value.trim(),companyId=document.getElementById('invite-company').value.trim(),result=document.getElementById('result'),btn=document.getElementById('invite-send');
if(!accessToken){result.textContent='Primero verifica tu acceso';return;}
if(!email||!companyId){result.textContent='Introduce correo e ID de empresa de prueba';return;}
if(!confirm('Enviar una invitación REAL a '+email+' para empresa '+companyId+' en staging?'))return;
btn.disabled=true;result.textContent='Enviando invitación y vinculando usuario...';
try{
const r=await fetch('/admin/invitations',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+accessToken},
body:JSON.stringify({email,empresa_id:companyId})});
const data=await r.json();
result.textContent=JSON.stringify({http_status:r.status,...data},null,2);
if(!r.ok)btn.disabled=false;
}catch(err){result.textContent='Resultado incierto: NO vuelvas a pulsar enviar. Revisa Authentication > Users. '+String(err.message||err);}
});
document.getElementById('create-company').addEventListener('click',async()=>{
const result=document.getElementById('result');
const nombre=document.getElementById('company-name').value.trim();
if(!nombre){result.textContent='Escribe el nombre de empresa';return;}
if(!accessToken){result.textContent='Primero verifica tu acceso';return;}
if(!pendingId)pendingId=crypto.randomUUID();
result.textContent='Creando empresa Demo de staging...';
try{
const r=await fetch('/admin/companies',{method:'POST',headers:{'content-type':'application/json',
'authorization':'Bearer '+accessToken,'idempotency-key':pendingId},body:JSON.stringify({nombre,tipo:document.getElementById('company-type').value})});
const data=await r.json();result.textContent=JSON.stringify({http_status:r.status,...data},null,2);
if(r.ok)pendingId=null;
}catch(err){result.textContent='Error de red; no cambies datos antes de reintentar: '+String(err.message||err);}
});
</script></body></html>`;
      return new Response(html,{headers:{
        'content-type':'text/html; charset=utf-8','cache-control':'no-store',
        'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
        'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self' "+new URL(env.SUPABASE_URL).origin+"; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
      }});
    }
    if (request.method === 'GET' && url.pathname === '/cliente') {
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)
        return respond({error:'Configuracion incompleta'},503);
      const sb=JSON.stringify(env.SUPABASE_URL).replace(/</g,'\\u003c');
      const pk=JSON.stringify(env.SUPABASE_PUBLISHABLE_KEY).replace(/</g,'\\u003c');
      const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AluARTmx | Mi empresa (Staging)</title>
<style>body{background:#0d1b30;color:#eff6ff;font:16px system-ui;margin:0;padding:24px}main{max-width:560px;margin:40px auto;background:#142844;padding:26px;border-radius:18px}input,button{box-sizing:border-box;width:100%;padding:12px;margin:8px 0;border-radius:8px;font:inherit}button{border:0;background:#169db1;color:white;cursor:pointer}button:disabled{opacity:.6}section{margin-top:22px}#notice{padding:12px;background:#0a182c;border-radius:8px;white-space:pre-wrap}dl{display:grid;grid-template-columns:1fr 1fr;gap:12px}dt{color:#afc6dc}dd{margin:0;font-weight:700}small{color:#afc6dc}</style></head><body><main><h2>AluARTmx · Mi empresa</h2><small>Entorno de pruebas · Consulta sin cambios</small>
<form id="login"><label>Correo<input id="email" type="email" autocomplete="username" required></label><label>Contraseña<input id="password" type="password" autocomplete="current-password" required></label><button type="submit">Entrar</button></form>
<p id="notice" role="status">Inicia sesión con tu cuenta de cliente.</p>
<section id="dashboard" hidden><h3 id="company-name"></h3><dl><div><dt>Plan</dt><dd id="plan"></dd></div><div><dt>Estado</dt><dd id="status"></dd></div><div><dt>Cuadros permitidos</dt><dd id="limit"></dd></div><div><dt>Créditos Demo utilizados</dt><dd id="used"></dd></div><div><dt>Créditos disponibles</dt><dd id="remaining"></dd></div></dl><p>La administración de cuadros estará disponible después de las pruebas de seguridad y la autorización de la empresa.</p><button id="logout" type="button">Cerrar sesión</button></section></main>
<script>
const SB=${sb},PK=${pk},form=document.getElementById('login'),notice=document.getElementById('notice'),panel=document.getElementById('dashboard');let token=null;
form.addEventListener('submit',async e=>{e.preventDefault();panel.hidden=true;notice.textContent='Comprobando acceso...';const pass=document.getElementById('password');try{
const auth=await fetch(SB.replace(/\\/$/,'')+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:PK,'content-type':'application/json'},body:JSON.stringify({email:document.getElementById('email').value,password:pass.value})});pass.value='';if(!auth.ok)throw Error('Correo o contraseña incorrectos.');const session=await auth.json();token=session.access_token;
const r=await fetch('/cliente/resumen',{headers:{authorization:'Bearer '+token}});const data=await r.json();if(!r.ok){token=null;throw Error(data.error||'Acceso no autorizado');}
const fields={'company-name':data.empresa.nombre,plan:data.empresa.plan_comercial,status:data.empresa.activa?'Activa':'Pendiente de autorización',limit:data.empresa.limite_cuadros,used:data.empresa.creditos_demo_consumidos,remaining:data.creditos_disponibles};for(const [id,value] of Object.entries(fields))document.getElementById(id).textContent=String(value);notice.textContent=data.empresa.activa?'Cuenta activa.':'Cuenta en espera de autorización del administrador.';form.hidden=true;panel.hidden=false;
}catch(err){token=null;notice.textContent=err.message||'No fue posible iniciar sesión.';}});
document.getElementById('logout').addEventListener('click',()=>{token=null;panel.hidden=true;form.hidden=false;notice.textContent='Sesión cerrada en este panel.';});
</script></body></html>`;
      return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self' "+new URL(env.SUPABASE_URL).origin+"; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
    }
    if (request.method === 'GET' && url.pathname === '/cliente/resumen') {
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY)return respond({error:'Configuracion incompleta'},503);
      const authorization=request.headers.get('authorization')||'';
      if (!/^Bearer [^\s]+$/.test(authorization))return respond({error:'Inicia sesion'},401);
      const base=env.SUPABASE_URL.replace(/\/$/,'');
      const apikey=env.SUPABASE_PUBLISHABLE_KEY;
      try{
        const auth=await fetch(base+'/auth/v1/user',{headers:{apikey,authorization}});
        if(!auth.ok)return respond({error:'Sesion no valida'},401);
        const user=await auth.json();if(!uuid.test(user.id||''))return respond({error:'Sesion no valida'},401);
        // Importante: usar el JWT del usuario para las consultas RLS.
        // No usar la service role en esta ruta de cliente.
        const scoped={apikey,authorization};
        const pr=await fetch(base+'/rest/v1/usuarios?id=eq.'+encodeURIComponent(user.id)+'&select=rol,empresa_id',{headers:scoped});
        if(!pr.ok)return respond({error:'No se pudo verificar el perfil'},503);
        const profiles=await pr.json();
        if(!Array.isArray(profiles)||profiles.length!==1||profiles[0].rol!=='cliente'||!uuid.test(profiles[0].empresa_id||''))
          return respond({error:'No tienes una empresa de cliente asignada'},403);
        const companyId=profiles[0].empresa_id;
        const cr=await fetch(base+'/rest/v1/empresas?id=eq.'+encodeURIComponent(companyId)+'&select=id,nombre,plan_comercial,limite_cuadros,creditos_demo_consumidos,activa',{headers:scoped});
        if(!cr.ok)return respond({error:'No se pudo consultar la empresa'},503);
        const companies=await cr.json();if(!Array.isArray(companies)||companies.length!==1||companies[0].id!==companyId)return respond({error:'Empresa no disponible'},403);
        const company=companies[0];
        return respond({empresa:company,creditos_disponibles:company.plan_comercial==='demo'?Math.max(0,company.limite_cuadros-company.creditos_demo_consumidos):null,modo:'solo_lectura'});
      }catch{return respond({error:'No fue posible conectar con Supabase'},503)}
    }
    if (request.method === 'GET' && url.pathname === '/health') {
      return respond({
        servicio:'aluartmx-admin-staging',
        estado:'activo',
        modo:'staging',
        configuracion:{
          supabase_url:!!env.SUPABASE_URL,
          publishable_key:!!env.SUPABASE_PUBLISHABLE_KEY,
          admin_secret:!!env.SUPABASE_SERVICE_ROLE_KEY,
          superadmin_id:uuid.test(env.SUPERADMIN_USER_ID||'')
        }
      });
    }
    if ((request.method === 'GET' && url.pathname === '/admin/me') ||
        (request.method === 'POST' && url.pathname === '/admin/companies') ||
        (request.method === 'GET' && url.pathname === '/admin/companies') ||
        (request.method === 'POST' && url.pathname === '/admin/invitations') ||
        (request.method === 'GET' && url.pathname === '/admin/invitations/status')) {
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY ||
          !env.SUPABASE_SERVICE_ROLE_KEY || !uuid.test(env.SUPERADMIN_USER_ID||''))
        return respond({error:'Configuracion incompleta'},503);
      const authorization=request.headers.get('authorization')||'';
      if (!/^Bearer \S+$/.test(authorization)) return respond({error:'Sesion requerida'},401);
      const base=env.SUPABASE_URL.replace(/\/$/,'');
      try {
        const a=await fetch(base+'/auth/v1/user',{headers:{
          apikey:env.SUPABASE_PUBLISHABLE_KEY,authorization
        }});
        if (!a.ok) return respond({error:'Sesion invalida'},401);
        const user=await a.json();
        if (!user.id || user.id!==env.SUPERADMIN_USER_ID) return respond({error:'Sin permisos'},403);
        const key=env.SUPABASE_SERVICE_ROLE_KEY;
        const privilegedHeaders={apikey:key,authorization:'Bearer '+key};
        const r=await fetch(base+'/rest/v1/usuarios?id=eq.'+encodeURIComponent(user.id)+'&select=rol',{headers:privilegedHeaders});
        if (!r.ok) return respond({error:'No se pudo consultar el perfil administrador'},503);
        const rows=await r.json();
        if (!Array.isArray(rows) || rows.length!==1 || rows[0].rol!=='superadmin')
          return respond({error:'Sin permisos'},403);
        if (request.method==='GET' && url.pathname==='/admin/companies') {
          const q=base+'/rest/v1/empresas?select=id,nombre,tipo,plan_comercial,limite_cuadros,creditos_demo_consumidos,activa,creada_en&order=creada_en.desc&limit=100';
          const result=await fetch(q,{headers:privilegedHeaders});
          if(!result.ok)return respond({error:'No se pudo consultar empresas'},503);
          const list=await result.json();
          if(!Array.isArray(list))return respond({error:'Respuesta de empresas invalida'},503);
          return respond({empresas:list,solo_lectura:true,limite:100});
        }
        if (request.method==='GET' && url.pathname==='/admin/invitations/status') {
          const empresaId=url.searchParams.get('empresa_id')||'';
          if (!uuid.test(empresaId)) return respond({error:'empresa_id UUID requerido'},400);
          const q=base+'/rest/v1/invitaciones_empresas?empresa_id=eq.'+encodeURIComponent(empresaId)+
            '&select=id,empresa_id,correo,estado,usuario_invitado_id,detalle_error,creada_en,actualizada_en';
          const result=await fetch(q,{headers:privilegedHeaders});
          if(!result.ok)return respond({error:'No se pudo consultar la reserva'},503);
          const list=await result.json();
          if(!Array.isArray(list))return respond({error:'Respuesta de reserva invalida'},503);
          return respond({reservas:list,solo_lectura:true});
        }
        if (request.method==='GET') return respond({autorizado:true,rol:'superadmin',modo:'staging'});

        if (request.method==='POST' && url.pathname==='/admin/invitations') {
          if (!(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
            return respond({error:'Se requiere JSON'},415);
          const raw=await request.text();
          if(raw.length>1024)return respond({error:'Solicitud demasiado grande'},413);
          let payload;try{payload=JSON.parse(raw)}catch{return respond({error:'JSON invalido'},400)}
          const email=typeof payload?.email==='string'?payload.email.trim().toLowerCase():'';
          const empresaId=payload?.empresa_id;
          if(!uuid.test(empresaId||'') || email.length>254 ||
             !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return respond({error:'Correo o empresa invalidos'},400);
          const co=await fetch(base+'/rest/v1/empresas?id=eq.'+encodeURIComponent(empresaId)+'&select=id,nombre,plan_comercial,limite_cuadros,activa',{headers:privilegedHeaders});
          if(!co.ok)return respond({error:'No se pudo verificar empresa'},503);
          const companies=await co.json();
          if(!Array.isArray(companies)||companies.length!==1)return respond({error:'Empresa no encontrada'},404);
          if(companies[0].plan_comercial!=='demo'||companies[0].limite_cuadros!==2)
            return respond({error:'Esta prueba solo permite empresas Demo de 2 cuadros'},409);
          // Reserva atomica en Postgres; no enviar correo si no se obtuvo.
          const rpc=async(name,body)=>{
            const r=await fetch(base+'/rest/v1/rpc/'+name,{
              method:'POST',headers:{...privilegedHeaders,'content-type':'application/json'},
              body:JSON.stringify(body)
            });
            if(!r.ok)throw Error('RPC '+name+' HTTP '+r.status);
            return r.json();
          };
          let reserva;
          try {
            const rows=await rpc('aluartmx_reservar_invitacion_v611',{p_empresa:empresaId,p_correo:email});
            if(!Array.isArray(rows)||rows.length!==1||!uuid.test(rows[0].reserva_id||''))throw Error('Reserva no confirmada');
            reserva=rows[0].reserva_id;
          } catch {
            return respond({error:'Reserva no disponible: invitacion existente, usuario vinculado o error de base. NO reenviar.',revision_manual:true},409);
          }
          const avanzar=async(anterior,nuevo,usuario=null,error=null)=>
            rpc('aluartmx_avanzar_invitacion_v611',{p_id:reserva,p_anterior:anterior,p_nuevo:nuevo,p_usuario:usuario,p_error:error});
          try {
            if(await avanzar('reservada','enviando')!==true)throw Error('Transicion a enviando no confirmada');
          } catch {
            return respond({error:'Reserva creada pero estado no confirmado. REVISION MANUAL: no reenviar.',revision_manual:true},503);
          }
          const redirect=new URL('/activar',request.url).toString();
          // Supabase Auth Admin invite: envia correo y crea auth.users.
          // Si el alta del perfil falla, NO reintentar a ciegas ni invitar de nuevo.
          // La reserva queda en "enviando" ANTES de llamar a Auth.
          // Si la respuesta se pierde, NO se vuelve a invitar automáticamente.
          let invite, invited;
          try {
            invite=await fetch(base+'/auth/v1/invite?redirect_to='+encodeURIComponent(redirect),{
              method:'POST',
              headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},
              body:JSON.stringify({email})
            });
            if (!invite.ok) {
              try { await avanzar('enviando','revision_manual',null,'Auth HTTP '+invite.status); } catch {}
              return respond({error:'Invitacion pendiente de revision manual; no reenviar.',revision_manual:true,reserva_id:reserva},409);
            }
            invited=await invite.json();
          } catch {
            try { await avanzar('enviando','revision_manual',null,'Respuesta de Auth incierta'); } catch {}
            return respond({error:'Resultado de Auth incierto. NO reenviar; revisar en Supabase Auth.',revision_manual:true,reserva_id:reserva},503);
          }
          if(!uuid.test(invited?.id||'') || String(invited.email||'').trim().toLowerCase()!==email){
            try{await avanzar('enviando','revision_manual',null,'Identidad Auth no confirmada')}catch{}
            return respond({error:'Identidad invitada no confirmada. NO reenviar.',revision_manual:true,reserva_id:reserva},502);
          }
          try{
            if(await avanzar('enviando','enviada',invited.id)!==true)throw Error('Estado no confirmado');
          }catch{
            return respond({error:'Invitacion emitida, registro pendiente de revision manual.',revision_manual:true,reserva_id:reserva},503);
          }
          let link, linked;
          try {
            link=await fetch(base+'/rest/v1/usuarios?on_conflict=id',{
              method:'POST',
              headers:{...privilegedHeaders,'content-type':'application/json',prefer:'resolution=ignore-duplicates,return=representation'},
              body:JSON.stringify({id:invited.id,empresa_id:empresaId,rol:'cliente'})
            });
            if (!link.ok) throw Error('Error HTTP '+link.status);
            linked=await link.json();
          } catch {
            try{await avanzar('enviada','revision_manual',null,'Error de vinculo o respuesta incierta')}catch{}
            return respond({error:'Invitacion enviada, vinculo requiere revision manual. NO reenviar.',revision_manual:true,reserva_id:reserva},503);
          }
          // No basta con que PostgREST devuelva una fila: comprobar su pertenencia.
          if(!Array.isArray(linked)||linked.length!==1 || linked[0].id!==invited.id ||
             linked[0].empresa_id!==empresaId || linked[0].rol!=='cliente'){
            try{await avanzar('enviada','revision_manual',null,'Vinculo no coincide con empresa o usuario')}catch{}
            return respond({error:'Vinculacion no verificada. NO reenviar.',revision_manual:true,reserva_id:reserva},503);
          }
          try{if(await avanzar('enviada','vinculada',invited.id)!==true)throw Error('Estado final no confirmado')}
          catch{return respond({error:'Usuario vinculado, estado pendiente de revision manual.',revision_manual:true},503)}
          return respond({invitacion:'emitida',vinculacion:'confirmada',empresa_id:empresaId,
            usuario_id:invited.id,empresa_activa:companies[0].activa,
            nota:'La cuenta fue vinculada. Empresa permanece inactiva hasta autorizacion posterior.'},201);
        }

        const ct=request.headers.get('content-type')||'';
        if (!ct.toLowerCase().startsWith('application/json')) return respond({error:'Se requiere JSON'},415);
        const idem=request.headers.get('idempotency-key')||'';
        if (!uuid.test(idem)) return respond({error:'Idempotency-Key UUID requerida'},400);
        const raw=await request.text();
        if (raw.length>2048) return respond({error:'Solicitud demasiado grande'},413);
        let data;try{data=JSON.parse(raw)}catch{return respond({error:'JSON invalido'},400)}
        const nombre=typeof data?.nombre==='string'?data.nombre.trim():'';
        const tipo=data?.tipo;
        if (!nombre || nombre.length>100 || !['fotografo','empresa'].includes(tipo))
          return respond({error:'Nombre o tipo invalidos'},400);
        // La demo se asigna exclusivamente por el superadministrador.
        // La empresa se crea INACTIVA, sin cliente ni invitacion.
        const expected={nombre,tipo,plan_comercial:'demo',limite_cuadros:2};
        const query='alta_solicitud_id=eq.'+encodeURIComponent(idem)+'&select=id,nombre,tipo,plan_comercial,limite_cuadros,activa';
        const existing=async()=>{
          const rr=await fetch(base+'/rest/v1/empresas?'+query,{headers:privilegedHeaders});
          if (!rr.ok) throw Error('lookup');
          const list=await rr.json();
          if (!Array.isArray(list)) throw Error('lookup');
          return list;
        };
        const matches=x=>x && x.nombre===expected.nombre && x.tipo===expected.tipo &&
          x.plan_comercial==='demo' && x.limite_cuadros===2;
        const previous=await existing();
        if (previous.length) return matches(previous[0])?
          respond({creada:false,empresa:previous[0],nota:'Solicitud ya registrada'},200):
          respond({error:'Solicitud reutilizada con datos distintos'},409);
        const slug='staging-demo-'+idem.replace(/-/g,'');
        const create=await fetch(base+'/rest/v1/empresas?on_conflict=alta_solicitud_id',{
          method:'POST',headers:{...privilegedHeaders,'content-type':'application/json',
          prefer:'resolution=ignore-duplicates,return=representation'},
          body:JSON.stringify({...expected,slug,plan:'generico',activa:false,alta_solicitud_id:idem})
        });
        if (!create.ok) return respond({error:'No se pudo crear empresa en staging',status_supabase:create.status},503);
        const created=await create.json();
        if (Array.isArray(created) && created.length===1)
          return respond({creada:true,empresa:created[0],nota:'Inactiva: aun no se invita al cliente'},201);
        const retry=await existing();
        if (retry.length===1 && matches(retry[0]))
          return respond({creada:false,empresa:retry[0],nota:'Solicitud ya registrada'},200);
        return respond({error:'No se pudo confirmar el alta'},503);
      } catch {
        return respond({error:'Fallo de conexion o configuracion'},503);
      }
    }
    return respond({error:'Ruta no disponible'},404);
  }
};