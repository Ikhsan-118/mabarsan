// API auth MabarRoom. Rute: /api/register|login|logout|me|profile|ticket|verify-ticket
import {randomBytes} from 'node:crypto';
import {openStore} from '../lib/store.mjs';
import {hashPassword,verifyPassword,dummyHash,sign,verifyToken,parseCookies} from '../lib/security.mjs';

export const config={path:'/api/*'};

const AVATARS=['🦊','🐼','🐯','🐸','🦁','🐙','👾','🤖','🐲','🦄','🐧','🐵'];
const SESSION_MS=30*24*3600*1000,TICKET_MS=90*1000,COOKIE='mabar_session';
const MAX_BODY=200*1024,MAX_DATA=100*1024;
const USER_RE=/^[A-Za-z0-9_]{3,20}$/,CODE_RE=/^[A-Z0-9]{6}$/;

const json=(obj,status=200,headers={})=>new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const fail=(status,error)=>json({error},status);
const cookie=(val,maxAge)=>`${COOKIE}=${val}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

const pub=u=>({id:u.id,username:u.username,name:u.name,avatar:u.avatar,data:u.data||{},createdAt:u.createdAt});
const cleanName=(s,fb)=>{const n=String(s==null?'':s).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,16);return n||fb};
const cleanData=d=>{
  if(d==null)return {};
  if(typeof d!=='object'||Array.isArray(d))throw Object.assign(new Error('Format data profil salah.'),{status:400});
  const clone=JSON.parse(JSON.stringify(d));delete clone.name;delete clone.avatar;
  if(JSON.stringify(clone).length>MAX_DATA)throw Object.assign(new Error('Data profil terlalu besar.'),{status:413});
  return clone;
};

/* Rate limit sederhana (best-effort) per IP — melindungi dari brute force. */
async function limited(store,key,max,windowMs){
  const k='rl:'+key,now=Date.now();
  let r=await store.get(k);
  if(!r||r.reset<now)r={n:0,reset:now+windowMs};
  r.n++;await store.put(k,r);
  return r.n>max?Math.ceil((r.reset-now)/1000):0;
}

async function readBody(req){
  const ct=req.headers.get('content-type')||'';
  if(!ct.includes('application/json'))throw Object.assign(new Error('Content-Type harus application/json.'),{status:415});
  const t=await req.text();
  if(t.length>MAX_BODY)throw Object.assign(new Error('Permintaan terlalu besar.'),{status:413});
  try{const b=JSON.parse(t||'{}');if(!b||typeof b!=='object')throw 0;return b}
  catch(e){throw Object.assign(new Error('JSON tidak valid.'),{status:400})}
}

export default async function handler(req,context){
  const secret=process.env.AUTH_SECRET;
  if(!secret||secret.length<32)return fail(500,'Server belum dikonfigurasi (AUTH_SECRET).');
  try{
    const url=new URL(req.url),route=url.pathname.replace(/^\/api\/?/,'').replace(/\/$/,'');
    const method=req.method;

    // Proteksi CSRF: request ubah-data harus berasal dari origin yang sama.
    if(method!=='GET'&&method!=='HEAD'){
      const o=req.headers.get('origin');
      if(o&&new URL(o).host!==url.host)return fail(403,'Origin tidak diizinkan.');
    }
    const users=openStore('mabar-users');
    const ip=(context&&context.ip)||req.headers.get('x-nf-client-connection-ip')||'unknown';

    const sessionUser=async()=>{
      const tok=parseCookies(req.headers.get('cookie'))[COOKIE];
      const p=verifyToken(tok,secret,'s');if(!p)return null;
      const u=await users.get('id:'+p.sub);
      return u&&u.ver===p.ver?u:null;
    };
    const requireUser=async()=>{const u=await sessionUser();if(!u)throw Object.assign(new Error('Belum login.'),{status:401});return u};
    const startSession=u=>cookie(sign({typ:'s',sub:u.id,ver:u.ver,exp:Date.now()+SESSION_MS},secret),SESSION_MS/1000);

    if(route==='register'&&method==='POST'){
      const wait=await limited(users,'reg:'+ip,10,3600*1000);if(wait)return fail(429,`Terlalu banyak percobaan. Coba lagi ${wait} detik lagi.`);
      const b=await readBody(req);
      const username=String(b.username||'').trim(),password=typeof b.password==='string'?b.password:'';
      if(!USER_RE.test(username))return fail(400,'Username 3-20 karakter: huruf, angka, atau underscore.');
      if(password.length<8||password.length>128)return fail(400,'Password minimal 8 karakter (maks 128).');
      if(password.toLowerCase()===username.toLowerCase())return fail(400,'Password tidak boleh sama dengan username.');
      const id='u'+randomBytes(8).toString('hex');
      if(!(await users.putNew('name:'+username.toLowerCase(),{id})))return fail(409,'Username sudah dipakai.');
      const user={id,username,name:cleanName(b.name,username),avatar:AVATARS.includes(b.avatar)?b.avatar:AVATARS[0],
        data:cleanData(b.data),passHash:await hashPassword(password),ver:1,createdAt:Date.now()};
      await users.put('id:'+id,user);
      return json({user:pub(user)},201,{'set-cookie':startSession(user)});
    }

    if(route==='login'&&method==='POST'){
      const b=await readBody(req);
      const username=String(b.username||'').trim().toLowerCase(),password=typeof b.password==='string'?b.password:'';
      const wait=await limited(users,'login:'+ip+':'+username.slice(0,20),10,15*60*1000);
      if(wait)return fail(429,`Terlalu banyak percobaan login. Coba lagi ${Math.ceil(wait/60)} menit lagi.`);
      const ref=USER_RE.test(username)?await users.get('name:'+username):null;
      const user=ref?await users.get('id:'+ref.id):null;
      const ok=await verifyPassword(password.slice(0,128),user?user.passHash:await dummyHash());
      if(!user||!ok)return fail(401,'Username atau password salah.');
      return json({user:pub(user)},200,{'set-cookie':startSession(user)});
    }

    if(route==='logout'&&method==='POST')return json({ok:true},200,{'set-cookie':cookie('',0)});

    if(route==='me'&&method==='GET'){
      const u=await sessionUser();
      return u?json({user:pub(u)}):fail(401,'Belum login.');
    }

    if(route==='profile'&&method==='PATCH'){
      const u=await requireUser(),b=await readBody(req);
      if(b.name!==undefined)u.name=cleanName(b.name,u.username);
      if(b.avatar!==undefined&&AVATARS.includes(b.avatar))u.avatar=b.avatar;
      if(b.data!==undefined)u.data=cleanData(b.data);
      await users.put('id:'+u.id,u);
      return json({user:pub(u)});
    }

    // Tiket singkat terikat ke satu Team Code. Dipakai guest untuk membuktikan identitas ke host.
    if(route==='ticket'&&method==='POST'){
      const u=await requireUser(),b=await readBody(req),code=String(b.code||'').toUpperCase();
      if(!CODE_RE.test(code))return fail(400,'Team Code tidak valid.');
      return json({ticket:sign({typ:'t',sub:u.id,code,ver:u.ver,exp:Date.now()+TICKET_MS},secret)});
    }
    // Host memverifikasi tiket; hanya mengembalikan info publik (bukan data sensitif).
    if(route==='verify-ticket'&&method==='POST'){
      const wait=await limited(users,'vt:'+ip,120,60*1000);if(wait)return fail(429,'Terlalu banyak permintaan.');
      const b=await readBody(req),p=verifyToken(b.ticket,secret,'t');
      if(!p||p.code!==String(b.code||'').toUpperCase())return fail(401,'Tiket tidak valid atau kedaluwarsa.');
      const u=await users.get('id:'+p.sub);
      if(!u||u.ver!==p.ver)return fail(401,'Akun tidak ditemukan.');
      return json({id:u.id,name:u.name,avatar:u.avatar});
    }

    return fail(404,'Endpoint tidak ditemukan.');
  }catch(e){
    if(e&&e.status)return fail(e.status,e.message);
    console.error('api error',e&&e.message);
    return fail(500,'Terjadi kesalahan server.');
  }
}
