// Penyimpanan key-value: Netlify Blobs (gratis, bawaan Netlify). Mode memori hanya untuk test lokal.
import {getStore} from '@netlify/blobs';
const mem={};
function memStore(name){
  const m=mem[name]||(mem[name]=new Map());
  return{
    get:async k=>m.has(k)?JSON.parse(m.get(k)):null,
    put:async(k,v)=>{m.set(k,JSON.stringify(v))},
    putNew:async(k,v)=>{if(m.has(k))return false;m.set(k,JSON.stringify(v));return true},
    del:async k=>{m.delete(k)},
    _raw:m
  };
}
export function openStore(name){
  if(process.env.MABAR_MEMORY_STORE==='1')return memStore(name);
  const s=getStore({name,consistency:'strong'});
  return{
    get:k=>s.get(k,{type:'json'}),
    put:async(k,v)=>{await s.set(k,JSON.stringify(v))},
    putNew:async(k,v)=>{const r=await s.set(k,JSON.stringify(v),{onlyIfNew:true});return !!(r&&r.modified)},
    del:k=>s.delete(k)
  };
}
