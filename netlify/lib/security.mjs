// Hash password (scrypt bawaan Node, tanpa dependensi) + token bertanda tangan HMAC.
import {scrypt,randomBytes,timingSafeEqual,createHmac} from 'node:crypto';
import {promisify} from 'node:util';
const scryptP=promisify(scrypt);
const N=16384,R=8,P=1,KL=64;

export async function hashPassword(pw){
  const salt=randomBytes(16);
  const h=await scryptP(pw,salt,KL,{N,r:R,p:P,maxmem:64*1024*1024});
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${h.toString('base64')}`;
}
export async function verifyPassword(pw,stored){
  try{
    const [alg,n,r,p,s,h]=String(stored).split('$');
    if(alg!=='scrypt')return false;
    const want=Buffer.from(h,'base64');
    const got=await scryptP(pw,Buffer.from(s,'base64'),want.length,{N:+n,r:+r,p:+p,maxmem:64*1024*1024});
    return got.length===want.length&&timingSafeEqual(got,want);
  }catch(e){return false}
}
// Hash palsu agar waktu respons tidak membocorkan apakah username ada.
let dummy=null;
export const dummyHash=async()=>dummy||(dummy=await hashPassword('mabarroom-dummy-password'));

export function sign(payload,secret){
  const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');
}
export function verifyToken(token,secret,typ){
  if(typeof token!=='string'||token.length>1024)return null;
  const [body,sig]=token.split('.');if(!body||!sig)return null;
  const want=createHmac('sha256',secret).update(body).digest();
  let got;try{got=Buffer.from(sig,'base64url')}catch(e){return null}
  if(got.length!==want.length||!timingSafeEqual(got,want))return null;
  try{
    const p=JSON.parse(Buffer.from(body,'base64url').toString());
    if(!p||p.typ!==typ||typeof p.exp!=='number'||p.exp<Date.now())return null;
    return p;
  }catch(e){return null}
}
export function parseCookies(h){
  const o={};String(h||'').split(';').forEach(x=>{const i=x.indexOf('=');if(i>0)o[x.slice(0,i).trim()]=decodeURIComponent(x.slice(i+1).trim())});return o;
}
