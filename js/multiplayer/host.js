// HOST: browser pembuat room menjalankan engine game dan memvalidasi semua aksi.
// (Tanpa backend, host adalah sumber kebenaran. Lihat catatan di README.)
import {S,net,hooks} from '../state.js';
import {genCode,rid,pwDigest} from '../util.js';
import {AVATARS,REACTIONS,PEER_PREFIX,MAX_SPECTATORS,CHAT_MIN_GAP_MS} from '../config.js';
import {gameById,createEngine,isPlayable} from '../games/registry.js';
import {newPeer,iceReady} from './net.js';
import {onCall} from '../voice/voice.js';
import {pushRecent,ratingsOf,START_RATING} from '../profile/profile.js';
import {verifyTicket} from '../auth/auth.js';

const HS=()=>net.HS;
const everyone=()=>HS().players.concat(HS().spectators);

export function publicRoom(){
  const h=HS();
  return{code:h.code,name:h.name,game:h.game,max:h.max,type:h.type,hasPw:!!h.passHash,status:h.status,hostId:h.hostId,
    turnTime:h.turnTime,round:h.round,wins:h.wins,startedAt:h.startedAt,
    players:h.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,ready:p.ready,connected:p.connected,verified:!!p.verified,voice:p.voice,muted:p.muted,voiceAt:p.voiceAt,peerId:p.peerId,rating:(p.ratings||{})[h.game]||START_RATING})),
    spectators:h.spectators.filter(s=>s.connected).map(s=>({id:s.id,name:s.name,avatar:s.avatar}))};
}
export function toPlayer(p,msg){
  if(p.id===HS().hostId)hooks.clientMsg(msg);
  else{try{p.conn&&p.conn.open&&p.conn.send(msg)}catch(e){}}
}
export function hostBroadcast(){
  if(!HS())return;const room=publicRoom(),e=HS().engine;
  everyone().forEach(p=>{
    if(!p.connected&&p.id!==HS().hostId)return;
    toPlayer(p,{t:'state',room,game:e?e.view(p.id):null,turnLeft:e&&!e.finished?e.turn.left():0,turnTotal:HS().turnTime*1000});
  });
}
function pushChat(c){const h=HS();h.chat.push(c);h.chat=h.chat.slice(-60);everyone().forEach(p=>toPlayer(p,{t:'chat',c}))}
export function hostSys(text){pushChat({sys:true,text,at:Date.now()})}

export function hostCreate(opts){
  S.role='host';S.me=S.user?S.user.id:rid(6);S.leaving=false;S.asSpec=false;
  const g=gameById(opts.game);
  const tryOpen=n=>{
    const code=genCode();const pr=newPeer(PEER_PREFIX+code);net.peer=pr;
    pr.on('open',async()=>{
      S.code=code;const passHash=await pwDigest(code,opts.pw);
      net.HS={code,name:opts.name,game:opts.game,max:opts.max,type:opts.type,passHash,turnTime:g.turnTime||30,status:'waiting',hostId:S.me,
        players:[{id:S.me,name:S.profile.name,avatar:S.profile.avatar,ratings:ratingsOf(S.profile),verified:!!S.user,ready:true,connected:true,voice:false,muted:false,voiceAt:0,peerId:pr.id,conn:null}],
        spectators:[],chat:[],wins:{},engine:null,timer:null,round:0,lastTurn:-1,startedAt:0,lastChatAt:{},lastReactAt:{}};
      S.chat=[];pushRecent(S.profile,code,opts.name,opts.game);hostSys('Room dibuat. Bagikan Team Code ke temanmu!');hostBroadcast();
    });
    pr.on('connection',hostAccept);
    pr.on('call',onCall);
    pr.on('error',e=>{
      if(e.type==='unavailable-id'&&n<6){try{pr.destroy()}catch(_){}tryOpen(n+1)}
      else if(!HS()){hooks.toast('Gagal membuat room ('+e.type+'). Coba lagi.');hooks.leaveRoom(true)}
    });
  };
  iceReady.then(()=>tryOpen(0));
}
function hostAccept(conn){
  conn.on('data',m=>{
    if(!HS()||!m)return;
    if(m.t==='hello')return hostHello(conn,m);
    const p=everyone().find(x=>x.conn===conn);if(p)hostMsg(p.id,m);
  });
  conn.on('close',()=>hostDrop(conn));
  conn.on('error',()=>{});
}
function hostReject(conn,msg,code){try{conn.send({t:'reject',m:msg,code})}catch(e){}setTimeout(()=>{try{conn.close()}catch(e){}},400)}
async function hostHello(conn,m){
  let h=HS();if(!h)return;
  if(h.passHash&&m.pwh!==h.passHash)return hostReject(conn,'Password room salah.','pw');
  if(h.status==='closed')return hostReject(conn,'Room sudah ditutup.','closed');
  /* Identitas: tiket dari server membuktikan akun. Tanpa tiket = tamu (id akun 'u'+16 hex tidak boleh dipakai tamu). */
  let vuser=null;
  if(m.ticket){
    vuser=await verifyTicket(m.ticket,h.code);
    if(!vuser)return hostReject(conn,'Sesi login tidak valid. Masuk ulang lalu coba lagi.','auth');
    m.pid=vuser.id;
  }else if(!m.pid||/^u[a-z0-9]{16}$/.test(String(m.pid)))return hostReject(conn,'Identitas tidak valid.','auth');
  h=HS();if(!h||h.status==='closed')return;
  m.pid=String(m.pid).slice(0,40);
  const name=String(vuser?vuser.name:(m.name||'Pemain')).slice(0,16),avatar=AVATARS.includes(vuser?vuser.avatar:m.avatar)?(vuser?vuser.avatar:m.avatar):'🙂';
  const existingPlayer=h.players.find(x=>x.id===m.pid);
  /* --- spectator --- */
  if(m.spec&&!existingPlayer){
    let s=h.spectators.find(x=>x.id===m.pid),isNew=false;
    if(s){s.conn=conn;s.connected=true;s.peerId=conn.peer}
    else{
      if(h.spectators.length>=MAX_SPECTATORS)return hostReject(conn,'Ruang penonton penuh.','specfull');
      s={id:m.pid,name,avatar,verified:!!vuser,connected:true,peerId:conn.peer,conn};h.spectators.push(s);isNew=true;
    }
    try{conn.send({t:'welcome',pid:s.id,spec:true})}catch(e){}
    try{conn.send({t:'chatlog',log:h.chat})}catch(e){}
    hostSys(s.name+(isNew?' menonton.':' kembali menonton.'));hostBroadcast();return;
  }
  /* --- pemain --- */
  let p=existingPlayer,isNew=false;
  if(p){p.conn=conn;p.connected=true;p.peerId=conn.peer}
  else{
    if(h.status!=='waiting')return hostReject(conn,'Room sudah dimulai.','started');
    if(h.players.length>=h.max)return hostReject(conn,'Room penuh.','full');
    const ratings=(m.ratings&&typeof m.ratings==='object')?m.ratings:{};
    const r=Math.max(100,Math.min(4000,+ratings[h.game]||START_RATING));
    p={id:m.pid,name,avatar,verified:!!vuser,ratings:{[h.game]:r},ready:false,connected:true,voice:false,muted:false,voiceAt:0,peerId:conn.peer,conn};
    h.players.push(p);isNew=true;
  }
  try{conn.send({t:'welcome',pid:p.id,spec:false})}catch(e){}
  try{conn.send({t:'chatlog',log:h.chat})}catch(e){}
  hostSys(p.name+(isNew?' bergabung.':' tersambung kembali.'));
  hostBroadcast();
}
function hostDrop(conn){
  const h=HS();if(!h)return;
  const sp=h.spectators.find(x=>x.conn===conn);
  if(sp&&sp.conn===conn){h.spectators=h.spectators.filter(x=>x!==sp);hostSys(sp.name+' berhenti menonton.');hostBroadcast();return}
  const p=h.players.find(x=>x.conn===conn);if(!p||p.conn!==conn)return;
  p.connected=false;p.voice=false;
  if(h.status==='waiting')h.players=h.players.filter(x=>x!==p);
  hostSys(p.name+' terputus.');hostBroadcast();
}
function chatFrom(a,text){
  const h=HS(),t=String(text||'').slice(0,200).trim();if(!t)return;
  const now=Date.now();
  if(now-(h.lastChatAt[a.id]||0)<CHAT_MIN_GAP_MS)return toPlayer(a,{t:'err',m:'Pelan-pelan, jangan spam chat.'});
  h.lastChatAt[a.id]=now;
  pushChat({name:a.name,avatar:a.avatar,text:t,at:now,spec:!h.players.includes(a)});
}
function reactFrom(a,e){
  const h=HS();if(!REACTIONS.includes(e))return;
  const now=Date.now();if(now-(h.lastReactAt[a.id]||0)<400)return;h.lastReactAt[a.id]=now;
  everyone().forEach(p=>toPlayer(p,{t:'react',name:a.name,e}));
}
export function hostMsg(pid,m){
  const h=HS();if(!h)return;
  const p=h.players.find(x=>x.id===pid),sp=p?null:h.spectators.find(x=>x.id===pid);
  if(sp){
    if(m.t==='chat')chatFrom(sp,m.text);
    else if(m.t==='react')reactFrom(sp,m.e);
    else if(m.t==='leave'){h.spectators=h.spectators.filter(x=>x!==sp);hostSys(sp.name+' berhenti menonton.');hostBroadcast();try{sp.conn&&sp.conn.close()}catch(e){}}
    return;
  }
  if(!p)return;
  const isHost=pid===h.hostId;
  switch(m.t){
    case 'ready':if(h.status==='waiting'){p.ready=!!m.v;hostBroadcast()}break;
    case 'voice':{const was=p.voice;p.voice=!!m.v;p.muted=!!m.m;if(p.voice&&!was)p.voiceAt=Date.now();hostBroadcast();break}
    case 'chat':chatFrom(p,m.text);break;
    case 'react':reactFrom(p,m.e);break;
    case 'leave':if(h.status==='waiting')h.players=h.players.filter(x=>x!==p);else{p.connected=false;p.voice=false}hostSys(p.name+' keluar.');hostBroadcast();try{p.conn&&p.conn.close()}catch(e){}break;
    case 'settings':if(!isHost||h.status!=='waiting')break;
      if(m.turnTime)h.turnTime=Math.min(120,Math.max(10,+m.turnTime|0));
      if(m.max&&+m.max>=h.players.length&&+m.max<=gameById(h.game).maxPlayers&&+m.max>=2)h.max=+m.max;
      hostBroadcast();break;
    case 'kick':{if(!isHost||h.status!=='waiting')break;const t=everyone().find(x=>x.id===m.id);if(!t||t===p)break;
      toPlayer(t,{t:'kicked'});h.players=h.players.filter(x=>x!==t);h.spectators=h.spectators.filter(x=>x!==t);hostSys(t.name+' dikeluarkan oleh host.');hostBroadcast();setTimeout(()=>{try{t.conn.close()}catch(e){}},400);break}
    case 'close':if(isHost)hooks.leaveRoom(false);break;
    case 'start':{
      if(!isHost||h.status!=='waiting')break;
      const g=gameById(h.game);if(!isPlayable(g))return toPlayer(p,{t:'err',m:'Game ini belum tersedia.'});
      if(h.players.length<g.minPlayers)return toPlayer(p,{t:'err',m:'Minimal '+g.minPlayers+' pemain untuk mulai.'});
      if(h.players.some(x=>!x.ready))return toPlayer(p,{t:'err',m:'Masih ada pemain yang belum siap.'});
      const list=h.players.map(x=>({id:x.id,name:x.name}));
      h.engine=createEngine(h.game,list,{turnTime:h.turnTime});
      h.status='playing';h.round++;h.lastTurn=-1;h.startedAt=Date.now();hostSys('Game dimulai! Selamat bermain.');afterAction();break;
    }
    case 'rematch':if(!isHost||h.status!=='finished')break;
      h.status='waiting';h.engine=null;h.players=h.players.filter(x=>x.connected);h.players.forEach(x=>x.ready=x.id===h.hostId);hostBroadcast();break;
    case 'action':{
      if(h.status!=='playing'||!h.engine)break;
      const r=h.engine.act(pid,m.a||{});
      if(!r.ok)return toPlayer(p,{t:'err',m:r.error});
      afterAction();break;
    }
  }
}
function afterAction(){
  const h=HS(),e=h.engine;
  if(e.finished){
    h.status='finished';clearTimeout(h.timer);
    const w=e.result.winner;
    if(w){h.wins[w]=(h.wins[w]||0)+1;const wp=h.players.find(x=>x.id===w);hostSys((wp?wp.name:'?')+' menang ronde ini!')}
    else hostSys('Ronde berakhir seri.');
  }else if(e.turn.turnNo!==h.lastTurn)scheduleTurn();
  hostBroadcast();
}
function scheduleTurn(){
  const h=HS(),e=h.engine;clearTimeout(h.timer);h.lastTurn=e.turn.turnNo;
  const no_=e.turn.turnNo,cur=h.players.find(x=>x.id===e.turn.current);
  const ms=e.simultaneous?e.turn.turnSec*1000:((cur&&cur.connected)?e.turn.turnSec*1000:2500);
  h.timer=setTimeout(()=>{
    const hh=HS();if(!hh||!hh.engine||hh.engine.finished||hh.engine.turn.turnNo!==no_)return;
    if(hh.engine.simultaneous){hostSys('Waktu habis — susunan otomatis untuk pemain yang belum selesai.');hh.engine.autoPlayAll();afterAction();return}
    if(cur&&cur.connected)hostSys(cur.name+' kehabisan waktu — giliran dimainkan otomatis.');
    hh.engine.autoPlay();afterAction();
  },ms);
}
/* Dipanggil saat host menutup room. */
export function hostShutdown(){
  const h=HS();if(!h)return;
  clearTimeout(h.timer);
  everyone().forEach(p=>{if(p.id!==h.hostId)try{p.conn.send({t:'closed'})}catch(e){}});
}
