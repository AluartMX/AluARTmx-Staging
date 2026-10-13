'use strict';
const SB='https://bndefaelluvhivrqtalf.supabase.co';
const API='https://aluartmx-admin-staging.jinscout6.workers.dev';
const $=id=>document.getElementById(id);
let token='',currentRequestId='';
const status=s=>{$('status').textContent=s};
function busy(id,on){$(id).disabled=on}
async function call(path,method='GET',body,idem){const headers={Authorization:'Bearer '+token};if(body!==undefined)headers['Content-Type']='application/json';if(idem)headers['Idempotency-Key']=idem;const res=await fetch(API+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});let data;try{data=await res.json()}catch{throw Error('Respuesta no JSON del Worker ('+res.status+')')}if(!res.ok)throw Error(data.error||'Error HTTP '+res.status);return data}
async function load(){busy('refresh',true);try{
 const data=await call('/admin/companies');const root=$('companies');root.replaceChildren();
 const list=data.empresas||[];if(!list.length){root.textContent='Todavía no hay empresas.';return}
 const names=new Map();for(const x of list){const k=String(x.nombre||'').trim().toLocaleLowerCase('es');names.set(k,(names.get(k)||0)+1)}
 const summary=document.createElement('p');summary.className='hint';summary.textContent=list.length+' empresas registradas · '+list.filter(x=>x.activa).length+' activas · '+list.filter(x=>!x.activa).length+' inactivas';root.append(summary);
 for(const x of list){
  const d=document.createElement('div');d.className='item';const title=document.createElement('strong');title.textContent=x.nombre||'Sin nombre';
  const info=document.createElement('small');info.textContent=[x.tipo,x.plan_comercial,x.activa?'Activa':'Inactiva','ID: '+x.id].filter(Boolean).join(' · ');
  const details=document.createElement('small');const total=Number(x.limite_cuadros),used=Number(x.creditos_demo_consumidos);
  details.textContent=Number.isFinite(total)&&Number.isFinite(used)?'Créditos: '+Math.max(0,total-used)+' disponibles / '+total+' asignados · '+used+' consumidos':'Créditos: sin datos suficientes';
  d.append(title,info,details);
  if((names.get(String(x.nombre||'').trim().toLocaleLowerCase('es'))||0)>1){const warning=document.createElement('small');warning.textContent='⚠ Nombre repetido; revisar identificadores antes de modificar';d.append(warning)}
  root.append(d)
 }
}catch(e){status(e.message)}finally{busy('refresh',false)}}
$('loginForm').addEventListener('submit',async e=>{e.preventDefault();busy('connect',true);status('Verificando credenciales de staging…');const email=$('email').value.trim();try{const cfg=await fetch(API+'/public-config',{cache:'no-store'});if(!cfg.ok)throw Error('Configuración de acceso no disponible: espera a que termine el despliegue del Worker');const publicConfig=await cfg.json();if(publicConfig.supabase_url!==SB||!publicConfig.publishable_key)throw Error('Configuración pública de staging inválida');const r=await fetch(SB+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'Content-Type':'application/json',apikey:publicConfig.publishable_key},body:JSON.stringify({email,password:$('password').value}),cache:'no-store'});const auth=await r.json();if(!r.ok||!auth.access_token)throw Error(auth.msg||auth.error_description||auth.error||'Credenciales inválidas');token=auth.access_token;const me=await call('/admin/me');if(me.autorizado!==true||me.rol!=='superadmin')throw Error('La cuenta no tiene permisos de superadministrador en staging');$('password').value='';$('login').hidden=true;$('dashboard').hidden=false;$('account').textContent='Conectado como '+email+' (staging)';status('Conexión administrativa verificada');await load()}catch(err){token='';status(err.message)}finally{busy('connect',false)}});
$('refresh').addEventListener('click',load);
$('logout').addEventListener('click',()=>{token='';$('dashboard').hidden=true;$('login').hidden=false;$('companies').replaceChildren();status('Sesión cerrada')});
$('createForm').addEventListener('submit',async e=>{e.preventDefault();const nombre=$('companyName').value.trim(),tipo=$('companyType').value;if(!nombre)return;if(!confirm('¿Crear la empresa DEMO INACTIVA «'+nombre+'» en Supabase staging?'))return;busy('create',true);status('Creando empresa inactiva…');try{if(!currentRequestId)currentRequestId=crypto.randomUUID();const r=await call('/admin/companies','POST',{nombre,tipo},currentRequestId);currentRequestId='';$('companyName').value='';status(r.nota||'Empresa de prueba creada');await load()}catch(err){status(err.message+' · Si hubo error de red, reintenta sin cambiar nombre o tipo.')}finally{busy('create',false)}});
$('companyName').addEventListener('input',()=>{currentRequestId=''});$('companyType').addEventListener('change',()=>{currentRequestId=''});
