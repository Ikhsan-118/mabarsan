// Klien auth: bicara ke /api (Netlify Functions). Sesi memakai cookie HttpOnly (tidak terbaca JS).
import {S} from '../state.js';
import {migrate} from '../profile/profile.js';

async function call(method,path,body){
  const r=await fetch('/api'+path,{method,credentials:'same-origin',cache:'no-store',
    headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  let j=null;try{j=await r.json()}catch(e){}
  if(!r.ok)throw Object.assign(new Error((j&&j.error)||'Gagal ('+r.status+')'),{status:r.status});
  return j;
}
export const register=(username,password,extra)=>call('POST','/register',Object.assign({username,password},extra));
export const login=(username,password)=>call('POST','/login',{username,password});
export const logoutApi=()=>call('POST','/logout',{});
export const ticketFor=code=>call('POST','/ticket',{code});
export const verifyTicket=(ticket,code)=>call('POST','/verify-ticket',{ticket,code}).catch(()=>null);
/* Cek sesi saat boot. Server tidak ada / belum login → null (mode tamu tetap jalan). */
export const me=()=>call('GET','/me').then(r=>r.user).catch(()=>null);

export const userToProfile=u=>migrate(Object.assign({},u.data||{},{name:u.name,avatar:u.avatar}));
const toPayload=p=>{const {name,avatar,...data}=p;return{name,avatar,data}};

/* Sinkronisasi profil ke server (debounce). Dipanggil lewat syncHook di profile.js. */
let timer=null,pending=null;
async function flushNow(keepalive){
  if(!pending||!S.user)return;const p=pending;pending=null;
  try{await fetch('/api/profile',{method:'PATCH',credentials:'same-origin',keepalive:!!keepalive,
    headers:{'content-type':'application/json'},body:JSON.stringify(toPayload(p))})}catch(e){pending=pending||p}
}
export function queueSync(p){
  if(!S.user)return;pending=p;clearTimeout(timer);timer=setTimeout(()=>flushNow(false),1500);
}
export const flush=()=>{clearTimeout(timer);return flushNow(false)};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){clearTimeout(timer);flushNow(true)}});
