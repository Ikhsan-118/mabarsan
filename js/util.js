import {CODE_CHARS} from './config.js';
export const $=(s,r=document)=>r.querySelector(s);
export const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rid=(n=6)=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';crypto.getRandomValues(new Uint8Array(n)).forEach(b=>s+=a[b%a.length]);return s};
export const genCode=()=>{let s='';crypto.getRandomValues(new Uint8Array(6)).forEach(b=>s+=CODE_CHARS[b%CODE_CHARS.length]);return s};
export const normCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
export const lsGet=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
export const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
export const lsDel=k=>{try{localStorage.removeItem(k)}catch(e){}};
export function fallbackCopy(t,ok,fail){const x=document.createElement('textarea');x.value=t;document.body.appendChild(x);x.select();try{document.execCommand('copy');ok()}catch(e){fail()}x.remove()}
export function copyText(t,okFn,failFn){
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(okFn).catch(()=>fallbackCopy(t,okFn,failFn));
  else fallbackCopy(t,okFn,failFn);
}
/* Hash password sebelum dikirim/disimpan (password tidak pernah plaintext di jaringan). */
export async function pwDigest(code,pw){
  if(!pw)return '';
  try{
    if(crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mabarroom:'+code+':'+pw));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  }catch(e){}
  return 'plain:'+pw;
}
