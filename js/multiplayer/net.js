// Koneksi PeerJS + kredensial TURN (relay) supaya pemain beda jaringan bisa terhubung.
// Urutan sumber kredensial:
//  1) Netlify Function /.netlify/functions/turn   (paling aman: API key hanya di server)
//  Tanpa fungsi server, hanya STUN yang dipakai (API key tidak boleh ada di frontend).
let ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:global.stun.twilio.com:3478'}];
export const turnState={on:false,source:''};
const add=(list,source)=>{if(Array.isArray(list)&&list.length&&list.some(s=>/^turns?:/.test(s.urls||''))){ICE=ICE.concat(list);turnState.on=true;turnState.source=source;return true}return false};
async function viaFunction(){
  try{const r=await fetch('/.netlify/functions/turn',{cache:'no-store'});if(r.ok)return add(await r.json(),'function')}catch(e){}
  return false;
}
export const iceReady=Promise.race([
  viaFunction(),
  new Promise(r=>setTimeout(r,5000))
]);
export const newPeer=id=>new window.Peer(id,{debug:0,config:{iceServers:ICE}});
