// Voice chat WebRTC (mesh via PeerJS): mute, deafen, indikator bicara, permission handling.
import {S,net,hooks,isSpec} from '../state.js';
import {$} from '../util.js';

export const V={stream:null,muted:false,deaf:false,calls:{},an:{},speak:{},ctx:null};
const send=m=>hooks.toHost(m);

export async function voiceJoin(){
  if(V.stream)return;
  if(isSpec())return hooks.toast('Penonton tidak bisa memakai voice.');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return hooks.toast('Voice butuh browser modern dengan HTTPS.');
  try{V.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}
  catch(e){return hooks.toast('Izin mikrofon ditolak. Aktifkan di pengaturan browser.')}
  V.muted=false;watchStream(V.stream,net.peer&&net.peer.id);send({t:'voice',v:true,m:false});hooks.toast('Voice aktif 🎙');hooks.render();
}
export function voiceLeave(silent){
  if(V.stream){V.stream.getTracks().forEach(t=>t.stop());V.stream=null}
  Object.keys(V.calls).forEach(closeCall);
  Object.keys(V.an).forEach(k=>delete V.an[k]);
  if(!silent&&S.room){send({t:'voice',v:false,m:false});hooks.render()}
}
export function voiceMute(){
  if(!V.stream)return;V.muted=!V.muted;V.stream.getAudioTracks().forEach(t=>t.enabled=!V.muted);
  send({t:'voice',v:true,m:V.muted});hooks.render();
}
export function voiceDeafen(){
  V.deaf=!V.deaf;document.querySelectorAll('#audio audio').forEach(a=>{a.muted=V.deaf});hooks.render();
}
function closeCall(k){const c=V.calls[k];delete V.calls[k];delete V.an[k];if(c){try{c.close()}catch(e){}}const a=document.getElementById('au-'+k);if(a)a.remove()}
export function voiceSync(){
  const R=S.room;if(!R)return;
  const me=R.players.find(p=>p.id===S.me);
  Object.keys(V.calls).forEach(k=>{
    const pl=R.players.find(p=>p.peerId===k),c=V.calls[k];
    if(!V.stream||!pl||(!pl.voice&&Date.now()-(c._t||0)>4000))closeCall(k);
  });
  if(!V.stream||!me||!me.voice||!net.peer)return;
  R.players.forEach(p=>{
    if(p.id===S.me||!p.voice||!p.peerId||V.calls[p.peerId])return;
    if(me.voiceAt>p.voiceAt||(me.voiceAt===p.voiceAt&&me.id>p.id))attachCall(net.peer.call(p.peerId,V.stream));
  });
}
function attachCall(c){
  if(!c)return;const old=V.calls[c.peer];c._t=Date.now();V.calls[c.peer]=c;if(old&&old!==c){try{old.close()}catch(e){}}
  c.on('stream',st=>playRemote(c.peer,st));
  c.on('close',()=>{if(V.calls[c.peer]===c){delete V.calls[c.peer];delete V.an[c.peer];const a=document.getElementById('au-'+c.peer);if(a)a.remove()}});
  c.on('error',()=>{});
}
export function onCall(c){if(!V.stream){try{c.close()}catch(e){}return}c.answer(V.stream);attachCall(c)}
function playRemote(k,st){
  let a=document.getElementById('au-'+k);
  if(!a){a=document.createElement('audio');a.id='au-'+k;a.autoplay=true;a.setAttribute('playsinline','');$('#audio').appendChild(a)}
  a.srcObject=st;a.muted=V.deaf;const p=a.play();if(p&&p.catch)p.catch(()=>{});watchStream(st,k);
}
function watchStream(st,key){
  if(!key)return;
  try{V.ctx=V.ctx||new(window.AudioContext||window.webkitAudioContext)();
    const an=V.ctx.createAnalyser();an.fftSize=256;V.ctx.createMediaStreamSource(st).connect(an);V.an[key]=an}catch(e){}
}
/* Indikator bicara + timer giliran. Dipanggil app.js tiap 250ms. */
export function tickSpeaking(){
  const me=net.peer&&net.peer.id;
  for(const k in V.an){
    const an=V.an[k],d=new Uint8Array(an.frequencyBinCount);an.getByteFrequencyData(d);
    V.speak[k]=(d.reduce((a,b)=>a+b,0)/d.length>14)&&!(k===me&&V.muted);
  }
  document.querySelectorAll('[data-peer]').forEach(el=>el.classList.toggle('speaking',!!V.speak[el.dataset.peer]));
}
