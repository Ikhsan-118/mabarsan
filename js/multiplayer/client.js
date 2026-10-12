// CLIENT: koneksi ke host, reconnect, sinkronisasi state dari host, statistik hasil.
import {S,net,hooks,meP} from '../state.js';
import {rid,normCode,pwDigest,$} from '../util.js';
import {PEER_PREFIX} from '../config.js';
import {newPeer,iceReady} from './net.js';
import {hostMsg,hostShutdown} from './host.js';
import {onCall,voiceSync,voiceLeave} from '../voice/voice.js';
import {recordResult,pushRecent,ratingsOf} from '../profile/profile.js';
import {ticketFor} from '../auth/auth.js';

export function toHost(m){
  if(S.role==='host')hostMsg(S.me,m);
  else if(net.hostConn&&net.hostConn.open)net.hostConn.send(m);
  else hooks.toast('Tidak terhubung ke host.');
}
export const act=a=>toHost({t:'action',a});

export function joinRoom(code,pw,spec){
  code=normCode(code);
  if(code.length!==6)return hooks.toast('Team Code harus 6 karakter.');
  if(S.joining)return;
  cleanupNet();
  S.role='guest';S.code=code;S.pw=pw||'';S.leaving=false;S.reconn=0;S.asSpec=!!spec;
  let pid=null;
  if(S.user)pid=S.user.id; // akun: identitas tetap sama di semua room & saat reconnect
  else{try{pid=sessionStorage.getItem('mabar_pid_'+code)}catch(e){}
    if(!pid){pid=rid(6);try{sessionStorage.setItem('mabar_pid_'+code,pid)}catch(e){}}}
  S.me=pid;S.joining=true;S.netMsg=spec?'Masuk sebagai penonton…':'Menyambung ke room…';hooks.render();startGuest(code,pid,S.pw,0,false);
}
function startGuest(code,pid,pw,attempt,re){iceReady.then(()=>startGuestNow(code,pid,pw,attempt,re))}
function startGuestNow(code,pid,pw,attempt,re){
  if(net.peer){try{net.peer.destroy()}catch(e){}}
  const pr=newPeer(`${PEER_PREFIX}${code}-${pid}`);net.peer=pr;
  let settled=false;
  const fail=m=>{
    if(settled)return;settled=true;clearTimeout(to);
    if(re)return scheduleReconnect();
    hooks.toast(m);cleanupNet();S.joining=false;S.role=null;S.netMsg='';hooks.render();
  };
  const to=setTimeout(()=>fail('Room tidak merespons. Cek Team Code dan pastikan host masih online.'),25000);
  pr.on('error',e=>{
    if(e.type==='peer-unavailable')fail('Team Code tidak ditemukan atau room sudah ditutup.');
    else if(e.type==='unavailable-id'&&attempt<5){clearTimeout(to);setTimeout(()=>{if(net.peer===pr)startGuestNow(code,pid,pw,attempt+1,re)},2500)}
    else if(!settled&&!S.room)fail('Gagal terhubung ('+e.type+').');
  });
  pr.on('call',onCall);
  pr.on('open',()=>{
    const c=pr.connect(`${PEER_PREFIX}${code}`,{reliable:true});net.hostConn=c;
    c.on('open',async()=>{
      const pwh=await pwDigest(code,pw);
      let ticket='';
      if(S.user){try{ticket=(await ticketFor(code)).ticket}catch(e){return fail(e.status===401?'Sesi login berakhir. Silakan masuk lagi.':'Gagal memverifikasi akun.')}}
      c.send({t:'hello',pid,ticket,name:S.profile.name,avatar:S.profile.avatar,pwh,spec:S.asSpec,ratings:ratingsOf(S.profile)});
    });
    c.on('data',m=>{
      if(m.t==='welcome'){settled=true;clearTimeout(to);S.joining=false;S.reconn=0;S.netMsg='';S.asSpec=!!m.spec;pushRecent(S.profile,code,'Room '+code,'')}
      clientOnMessage(m);
    });
    c.on('close',()=>{if(net.hostConn===c&&!S.leaving&&S.room)scheduleReconnect()});
  });
}
function scheduleReconnect(){
  if(S.leaving||S.role!=='guest')return;
  S.reconn++;
  if(S.reconn>8){hooks.toast('Gagal tersambung kembali ke room.');return leaveRoom(true)}
  S.netMsg='Koneksi terputus. Menyambung ulang… ('+S.reconn+'/8)';hooks.render();
  setTimeout(()=>{if(!S.leaving&&S.room&&S.role==='guest')startGuest(S.code,S.me,S.pw,0,true)},2500);
}
export function cleanupNet(){
  voiceLeave(true);
  if(net.peer){try{net.peer.destroy()}catch(e){}net.peer=null}
  net.hostConn=null;
}
export function leaveRoom(local){
  S.leaving=true;
  if(!local){
    if(S.role==='host'&&net.HS){
      hostShutdown();const pr=net.peer;net.peer=null;setTimeout(()=>{try{pr.destroy()}catch(e){}},500);
    }else if(net.hostConn&&net.hostConn.open){try{net.hostConn.send({t:'leave'})}catch(e){}const pr=net.peer;net.peer=null;setTimeout(()=>{try{pr.destroy()}catch(e){}},400)}
  }
  try{if(S.code)sessionStorage.removeItem('mabar_pid_'+S.code)}catch(e){}
  voiceLeave(true);
  if(net.peer){try{net.peer.destroy()}catch(e){}net.peer=null}
  if(net.HS)clearTimeout(net.HS.timer);
  net.HS=null;net.hostConn=null;S.room=null;S.game=null;S.chat=[];S.unread=0;S.role=null;S.joining=false;S.asSpec=false;S.netMsg='';S.lastResult=null;S.sel.clear();S.pick=null;S.pickSq=null;S.promo=null;S.pickWild=null;S.capsa=null;
  const cb=$('#chatBox');if(cb)cb.hidden=true;
  S.screen=S.profile?'lobby':'landing';S.leaving=false;hooks.render();
}

/* Suara berdasarkan perubahan state (join, giliran, kartu, menang/kalah). */
function stateSfx(pr,pg,room,g){
  if(!pr||pr.code!==room.code)return;
  if(room.players.length>pr.players.length)hooks.sfx('join');
  else if(room.players.length<pr.players.length)hooks.sfx('leave');
  else if(room.status==='waiting'&&room.players.filter(p=>p.ready).length>pr.players.filter(p=>p.ready).length)hooks.sfx('ready');
  if(!g)return;
  if(g.finished){if(!pg||!pg.finished)hooks.sfx(g.result&&g.result.winner===S.me?'win':g.result&&g.result.winner?'lose':'notify');return}
  if(pg&&pg.kind===g.kind){
    if(g.kind==='domino'&&g.board.length>pg.board.length)hooks.sfx('tile');
    else if(g.kind==='rummy'){if(g.stock<pg.stock||(g.drewDiscard&&!pg.drewDiscard))hooks.sfx('draw');else if((g.top&&g.top.id)!==(pg.top&&pg.top.id))hooks.sfx('discard')}
    else if(g.kind==='cangkulan'){if(g.stock<pg.stock)hooks.sfx('draw');else if(g.plays.length>pg.plays.length||g.trickNo>pg.trickNo)hooks.sfx('discard')}
    else if(g.stock!==undefined&&g.stock<pg.stock)hooks.sfx('draw');
    else if(g.moveNo>pg.moveNo)hooks.sfx(['chess','checkers','ludo'].includes(g.kind)?'tile':'discard');
  }
  if(g.current===S.me&&(!pg||pg.current!==S.me||pg.turnNo!==g.turnNo))hooks.sfx('turn');
}

export function clientOnMessage(m){
  switch(m.t){
    case 'state':{
      const pr=S.room,pg=S.game;
      S.room=m.room;S.game=m.game;S.deadline=Date.now()+m.turnLeft;S.turnTotal=m.turnTotal||1;
      if(!m.game||m.room.status==='waiting'){S.pick=null;S.lastResult=null;S.pickSq=null;S.promo=null;S.pickWild=null;S.capsa=null}
      else if(pg&&pg.turnNo!==m.game.turnNo){S.pickSq=null;S.promo=null;S.pickWild=null}
      if(m.game&&m.game.myHand){const ids=new Set(m.game.myHand.map(c=>c.id));[...S.sel].forEach(i=>{if(!ids.has(i))S.sel.delete(i)})}
      if(m.game&&m.game.finished&&m.game.result&&meP()){
        const key=m.room.code+'#'+m.room.round;
        if(!S.counted.has(key)){
          S.counted.add(key);
          const res=m.game.result;
          S.lastResult=recordResult(S.profile,{game:m.room.game,matchId:key,roomName:m.room.name,round:m.room.round,me:S.me,winner:res.winner,scores:res.scores,
            players:m.room.players.map(p=>({id:p.id,name:p.name,rating:p.rating})),durationMs:Date.now()-(m.room.startedAt||Date.now())});
          S.lastResult.unlocked.forEach(a=>hooks.toast('🏅 Achievement: '+a.name));
        }
      }
      stateSfx(pr,pg,m.room,m.game);
      voiceSync();hooks.render();break;
    }
    case 'chat':S.chat.push(m.c);S.chat=S.chat.slice(-60);if($('#chatBox').hidden){S.unread++;if(!m.c.sys)hooks.sfx('chat')}hooks.renderChat();break;
    case 'chatlog':S.chat=m.log||[];hooks.renderChat();break;
    case 'react':hooks.react(m.name,m.e);break;
    case 'err':hooks.toast(m.m);break;
    case 'reject':{
      hooks.toast(m.m);cleanupNet();S.joining=false;S.role=null;S.room=null;S.netMsg='';hooks.render();
      if(m.code==='started'&&confirm('Room sudah dimulai. Masuk sebagai penonton?'))joinRoom(S.code,S.pw,true);
      break;
    }
    case 'kicked':hooks.toast('Kamu dikeluarkan oleh host.');leaveRoom(true);break;
    case 'closed':hooks.toast('Room ditutup oleh host.');leaveRoom(true);break;
  }
}
hooks.toHost=toHost;hooks.clientMsg=clientOnMessage;hooks.leaveRoom=leaveRoom;
