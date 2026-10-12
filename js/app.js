// Titik masuk aplikasi: boot, render, event delegation, aksi UI.
import {S,net,hooks,myTurn,isHostMe,meP} from './state.js';
import {$,esc,normCode,copyText} from './util.js';
import {AVATARS} from './config.js';
import {gameById,isPlayable,playableGames} from './games/registry.js';
import {loadProfile,saveProfile,clearProfile,migrate,toggleFavorite,setProfileKey,syncHook} from './profile/profile.js';
import * as Auth from './auth/auth.js';
import {toast,floatReaction} from './ui/toast.js';
import {play,setSound,soundCfg} from './ui/sound.js';
import {landing,lobby,createScreen,joinScreen,profileScreen,waiting,gameScreen} from './ui/views.js';
import {hostCreate} from './multiplayer/host.js';
import {iceReady} from './multiplayer/net.js';
import {joinRoom,leaveRoom,toHost,act} from './multiplayer/client.js';
import {voiceJoin,voiceLeave,voiceMute,voiceDeafen,tickSpeaking} from './voice/voice.js';
import {lsGet,lsSet} from './util.js';
import {ensure as capsaEnsure,autoRows as capsaAuto,placedIds as capsaPlaced} from './games/capsa/renderer.js';

syncHook.fn=Auth.queueSync;
hooks.toast=toast;hooks.sfx=play;hooks.react=(n,e)=>{floatReaction(n,e);play('notify')};hooks.render=render;hooks.renderChat=renderChat;

/* ---------------- render ---------------- */
const SCREENS={landing,lobby,create:createScreen,join:joinScreen,profile:profileScreen};
function render(){
  let html;
  if(S.room)html=S.room.status==='waiting'?waiting():gameScreen();
  else html=(SCREENS[S.screen]||landing)();
  const ae=document.activeElement,active=ae&&ae.id,val=active?ae.value:null,chk=active&&ae.type==='checkbox'?ae.checked:null;
  $('#app').innerHTML=html;
  document.body.classList.toggle('hasnav',!!(S.profile&&!S.room));
  if(active&&val!==null){const el=document.getElementById(active);if(el&&el.tagName==='INPUT'){if(chk!==null)el.checked=chk;else if(el.type!=='range')el.value=val;el.focus()}}
  const b=$('.chatBadge');if(b)b.hidden=!S.unread;
}
function renderChat(){
  const box=$('#msgs');
  box.innerHTML=S.chat.map(c=>`<div class="m ${c.sys?'sys':''}">${c.sys?esc(c.text):`<b>${esc(c.name)}</b>${c.spec?' <small class="hint">👀</small>':''} ${esc(c.text)}`}</div>`).join('');
  box.scrollTop=box.scrollHeight;
  document.querySelectorAll('.chatBadge').forEach(b=>{b.textContent=S.unread;b.hidden=!S.unread});
}

/* ---------------- auth (akun + mode tamu) ---------------- */
const avPicker=(name,cur)=>`<div class="avpick">${AVATARS.map((a,i)=>`<label><input type="radio" name="${name}" value="${a}" ${(cur?cur===a:i===0)?'checked':''}><span>${a}</span></label>`).join('')}</div>`;
const fld=(id,label,type,extra='')=>`<label class="l" for="${id}">${label}</label><input id="${id}" class="inp" type="${type}" ${extra}>`;
function openAuth(next,tab){
  S.afterAuth=typeof next==='function'?next:null;
  const p=S.profile||loadProfile()||{};
  let inner,title='Mulai main';
  if(S.user){
    title='Ubah profil';
    inner=`<p class="hint">Akun: @${esc(S.user.username)}</p>${fld('an','Nama panggilan','text',`maxlength="16" value="${esc(p.name||'')}" autocomplete="off"`)}
    <label class="l">Avatar</label>${avPicker('aa',p.avatar)}
    <div class="row" style="margin-top:20px"><button class="btn pri" data-act="doAuth">Simpan</button><button class="btn ghost" data-act="closeAuth">Batal</button></div>`;
  }else{
    const t=S.authTab=tab||S.authTab||'login';
    const tabs=`<div class="authtabs" role="tablist">${[['login','Masuk'],['register','Daftar'],['guest','Tamu']].map(([k,l])=>`<button class="btn sm ${t===k?'pri':'ghost'}" role="tab" aria-selected="${t===k}" data-act="authTab" data-t="${k}">${l}</button>`).join('')}</div>`;
    if(t==='login')inner=`${tabs}<p class="hint">Masuk dengan akunmu. Statistik, rating, dan identitas tersimpan di semua perangkat.</p>
      ${fld('lu','Username','text','maxlength="20" autocomplete="username"')}${fld('lp','Password','password','maxlength="128" autocomplete="current-password"')}
      <div class="row" style="margin-top:20px"><button class="btn pri" data-act="doLogin">Masuk</button><button class="btn ghost" data-act="closeAuth">Batal</button></div>`;
    else if(t==='register')inner=`${tabs}<p class="hint">Buat akun gratis. Tanpa email. Data profil tamu di perangkat ini otomatis dibawa ke akun barumu.</p>
      ${fld('ru','Username (3-20: huruf, angka, _)','text','maxlength="20" autocomplete="username"')}
      ${fld('rn','Nama panggilan (tampil di room)','text',`maxlength="16" value="${esc(p.name||'')}" autocomplete="off"`)}
      ${fld('rp','Password (min. 8 karakter)','password','maxlength="128" autocomplete="new-password"')}${fld('rp2','Ulangi password','password','maxlength="128" autocomplete="new-password"')}
      <label class="l">Avatar</label>${avPicker('ra',p.avatar)}
      <div class="row" style="margin-top:20px"><button class="btn pri" data-act="doRegister">Daftar</button><button class="btn ghost" data-act="closeAuth">Batal</button></div>`;
    else inner=`${tabs}<p class="hint">Tanpa akun: cukup nama dan avatar. Data hanya tersimpan di browser ini dan identitasmu tidak terverifikasi.</p>
      ${fld('an','Nama panggilan','text',`maxlength="16" value="${esc(p.name||'')}" placeholder="mis. Ikhsan" autocomplete="off"`)}
      <label class="l">Avatar</label>${avPicker('aa',p.avatar)}
      <div class="row" style="margin-top:20px"><button class="btn pri" data-act="doAuth">Main sebagai tamu</button><button class="btn ghost" data-act="closeAuth">Batal</button></div>`;
  }
  $('#modal').innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="glass card"><h2 style="font-size:34px">${title}</h2>${inner}</div></div>`;
  setTimeout(()=>{const e=$('#lu')||$('#ru')||$('#an');e&&e.focus()},50);
}
/* Terapkan akun dari server ke state + profil lokal. Data server menang; jika kosong, impor profil tamu. */
function applyUser(u,silent){
  S.user={id:u.id,username:u.username};
  const guest=lsGet('mabar_profile');
  setProfileKey('mabar_profile_'+u.id);
  const hasData=u.data&&Object.keys(u.data).length;
  if(hasData){S.profile=Auth.userToProfile(u);lsSet('mabar_profile_'+u.id,S.profile)}
  else{
    S.profile=migrate(Object.assign({},guest||{},{name:u.name,avatar:u.avatar}));
    if(!silent||guest)saveProfile(S.profile);
  }
}
function finishAuth(){$('#modal').innerHTML='';const n=S.afterAuth;S.afterAuth=null;if(n)n();else render()}
const needProfile=fn=>S.profile?fn():openAuth(fn);
function go(s){S.screen=s;render();window.scrollTo(0,0)}
const shareUrl=code=>new URL('join/'+code,document.baseURI).href;

/* ---------------- aksi ---------------- */
const A={
  goLanding:()=>go('landing'),
  goLobby:()=>needProfile(()=>go('lobby')),
  goCreate:()=>needProfile(()=>go('create')),
  goJoin:()=>needProfile(()=>{S.prefill='';go('join')}),
  goProfile:()=>needProfile(()=>go('profile')),
  playGame:el=>needProfile(()=>{const g=gameById(el.dataset.g);if(!isPlayable(g))return toast('Game ini belum tersedia.');S.pickGame=g.id;go('create')}),
  filter:el=>{S.filter=el.dataset.f;render()},
  fav:el=>{toggleFavorite(S.profile,el.dataset.g);render()},
  openAuth:()=>openAuth(()=>go('lobby')),
  editProfile:()=>openAuth(()=>render()),
  closeAuth:()=>{$('#modal').innerHTML='';S.afterAuth=null},
  authTab:el=>openAuth(S.afterAuth,el.dataset.t),
  doAuth:()=>{
    const name=($('#an').value||'').trim().slice(0,16);if(!name)return toast('Isi nama panggilan dulu.');
    const a=($('input[name=aa]:checked')||{}).value||AVATARS[0];
    S.profile=migrate(Object.assign({},S.profile||loadProfile()||{},{name,avatar:a}));saveProfile(S.profile);lsSet('mabar_session',true);
    finishAuth();
  },
  doLogin:async()=>{
    const u=($('#lu').value||'').trim(),p=$('#lp').value||'';if(!u||!p)return toast('Isi username dan password.');
    try{const r=await Auth.login(u,p);applyUser(r.user);toast('Selamat datang, '+r.user.name+'!');finishAuth()}
    catch(e){toast(e.status?e.message:'Server tidak dapat dihubungi. Coba lagi atau main sebagai tamu.')}
  },
  doRegister:async()=>{
    const u=($('#ru').value||'').trim(),p=$('#rp').value||'',n=($('#rn').value||'').trim().slice(0,16);
    if(!u||!p)return toast('Isi username dan password.');
    if(p!==$('#rp2').value)return toast('Konfirmasi password tidak sama.');
    const a=($('input[name=ra]:checked')||{}).value||AVATARS[0];
    const g=lsGet('mabar_profile');let data;if(g){const {name:_n,avatar:_a,...rest}=migrate(g);data=rest}
    try{const r=await Auth.register(u,p,{name:n||u,avatar:a,data});applyUser(r.user);toast('Akun dibuat. Selamat bermain!');finishAuth()}
    catch(e){toast(e.status?e.message:'Server tidak dapat dihubungi. Coba lagi nanti.')}
  },
  resetData:()=>{if(!confirm('Hapus semua data profil (statistik, rating, riwayat, achievement)? Tidak bisa dibatalkan.'))return;
    if(S.user){S.profile=migrate({name:S.profile.name,avatar:S.profile.avatar});saveProfile(S.profile);render();return}
    clearProfile();S.profile=null;go('landing')},
  toggleSound:()=>{setSound({on:!soundCfg().on});play('click');render()},
  doCreate:()=>{
    const game=$('input[name=cg]:checked').value,name=($('#cn').value||'').trim().slice(0,24)||'Mabar Room';
    if(!isPlayable(gameById(game)))return toast('Game ini belum tersedia.');
    hostCreate({game,name,max:+$('#cm').value,type:'private',pw:($('#cp').value||'').trim()});
    S.netMsg='Membuat room…';render();
  },
  doJoin:()=>joinRoom($('#jc').value,$('#jp').value,$('#js')&&$('#js').checked),
  rejoin:el=>needProfile(()=>{S.prefill=el.dataset.code;go('join')}),
  copyCode:()=>copyText(S.room.code,()=>toast('Team Code disalin!'),()=>toast('Salin manual: '+S.room.code)),
  share:()=>{
    const url=shareUrl(S.room.code),g=gameById(S.room.game),text=`Mabar ${g?g.short:''} yuk! Team Code: ${S.room.code}`;
    if(navigator.share)navigator.share({title:'MabarRoom',text,url}).catch(()=>{});
    else copyText(text+'\n'+url,()=>toast('Link ajakan disalin!'),()=>toast('Salin manual: '+url));
  },
  toggleReady:()=>toHost({t:'ready',v:!(meP()||{}).ready}),
  start:()=>{toast('Memulai game…');toHost({t:'start'})},
  kick:el=>toHost({t:'kick',id:el.dataset.id}),
  closeRoom:()=>{if(confirm('Tutup room untuk semua pemain?'))leaveRoom(false)},
  leave:()=>leaveRoom(false),
  leaveConfirm:()=>{if(confirm(isHostMe()?'Kamu host. Keluar akan menutup room untuk semua. Lanjut?':'Keluar dari permainan?'))leaveRoom(false)},
  rematch:()=>toHost({t:'rematch'}),
  react:el=>toHost({t:'react',e:el.dataset.e}),
  vJoin:()=>voiceJoin(),vLeave:()=>voiceLeave(false),vMute:()=>voiceMute(),vDeafen:()=>voiceDeafen(),
  toggleChat:()=>{const b=$('#chatBox');b.hidden=!b.hidden;if(!b.hidden){S.unread=0;renderChat();setTimeout(()=>$('#chatIn').focus(),50)}},
  sendChat:()=>{const i=$('#chatIn'),t=i.value.trim();if(!t)return;toHost({t:'chat',text:t});i.value=''},
  /* domino */
  domClick:el=>{
    const id=el.dataset.id;if(!myTurn())return toast('Action rejected: It is not your turn.');
    const mv=S.game.myMoves.filter(m=>m.id===id);if(!mv.length)return toast('Ubin ini belum bisa dimainkan.');
    const sides=[...new Set(mv.map(m=>m.side))];
    if(sides.length===1||!S.game.board.length){S.pick=null;act({type:'play',id,side:sides[0]})}else{S.pick=id;render()}
  },
  domSide:el=>{const id=S.pick;S.pick=null;if(id)act({type:'play',id,side:el.dataset.side})},
  domPass:()=>act({type:'pass'}),
  /* rummy */
  rStock:()=>{if(!myTurn())return toast('Action rejected: It is not your turn.');act({type:'draw',source:'stock'})},
  rPile:()=>{
    if(!myTurn())return toast('Action rejected: It is not your turn.');
    if(S.game.phase==='draw')act({type:'draw',source:'discard'});
    else if(S.sel.size===1)act({type:'discard',card:[...S.sel][0]});
    else toast('Pilih 1 kartu lalu klik tumpukan BUANG.');
  },
  rCard:el=>{const id=el.dataset.id;S.sel.has(id)?S.sel.delete(id):S.sel.add(id);render()},
  rMeld:()=>act({type:'meld',cards:[...S.sel]}),
  rDiscardBtn:()=>act({type:'discard',card:[...S.sel][0]}),
  rLay:el=>{if(!S.sel.size)return toast('Pilih kartu di tanganmu dulu, lalu klik meld.');act({type:'layoff',cards:[...S.sel],meldId:el.dataset.id})},
  rSort:()=>{S.sortMode=S.sortMode===null?'rank':S.sortMode==='rank'?'suit':null;render()},
  /* cangkulan */
  cPlay:el=>{if(!myTurn())return toast('Action rejected: It is not your turn.');act({type:'play',card:el.dataset.id})},
  cDraw:()=>{if(!myTurn())return toast('Action rejected: It is not your turn.');act({type:'draw'})},
  cPass:()=>act({type:'pass'}),
  /* uno */
  unoPlay:el=>{
    if(!myTurn())return toast('Action rejected: It is not your turn.');
    const c=S.game.myHand.find(x=>x.id===el.dataset.id);if(!c)return;
    if(c.c==='W'){S.pickWild=c.id;render()}else act({type:'play',card:c.id})
  },
  unoColor:el=>{const id=S.pickWild;S.pickWild=null;if(id)act({type:'play',card:id,color:el.dataset.c})},
  unoDraw:()=>{if(!myTurn())return toast('Action rejected: It is not your turn.');act({type:'draw'})},
  unoPass:()=>act({type:'pass'}),
  /* 41 & remi (ambil/buang kartu tunggal) */
  dStock:()=>{if(!myTurn())return toast('Action rejected: It is not your turn.');act({type:'draw',source:'stock'})},
  dPile:()=>{
    if(!myTurn())return toast('Action rejected: It is not your turn.');
    if(S.game.phase==='draw')act({type:'draw',source:'discard'});
    else if(S.sel.size===1)act({type:'discard',card:[...S.sel][0]});
    else toast('Pilih 1 kartu lalu klik tumpukan BUANG.');
  },
  dCard:el=>{const id=el.dataset.id;if(S.sel.has(id))S.sel.delete(id);else{S.sel.clear();S.sel.add(id)}render()},
  dDiscard:()=>act({type:'discard',card:[...S.sel][0]}),
  dKnock:()=>act({type:'knock'}),
  dClose:()=>act({type:'close',card:[...S.sel][0]}),
  /* capsa */
  cpSel:el=>{const id=el.dataset.id;S.sel.has(id)?S.sel.delete(id):S.sel.add(id);render()},
  cpPut:el=>{const c=capsaEnsure(S.game),row=el.dataset.row,cap={front:3,mid:5,back:5}[row],ids=[...S.sel];
    if(c[row].length+ids.length>cap)return toast('Baris itu hanya muat '+cap+' kartu.');c[row].push(...ids);S.sel.clear();render()},
  cpBack:el=>{const c=capsaEnsure(S.game);['front','mid','back'].forEach(k=>{c[k]=c[k].filter(i=>i!==el.dataset.id)});render()},
  cpAuto:()=>{const c=capsaEnsure(S.game),r=capsaAuto(S.game);c.front=r.front;c.mid=r.mid;c.back=r.back;S.sel.clear();render()},
  cpReset:()=>{const c=capsaEnsure(S.game);c.front=[];c.mid=[];c.back=[];S.sel.clear();render()},
  cpSubmit:()=>{const c=capsaEnsure(S.game);if(capsaPlaced(c).size!==13)return toast('Taruh semua 13 kartu dulu.');act({type:'arrange',front:c.front,mid:c.mid,back:c.back})},
  /* dam / checkers */
  ckSq:el=>{
    if(!myTurn())return toast('Action rejected: It is not your turn.');
    const G=S.game,i=+el.dataset.i,from=S.pickSq!==null?S.pickSq:G.mustFrom;
    if(from!==null&&G.myMoves.some(m=>m.from===from&&m.to===i)){S.pickSq=null;act({type:'move',from,to:i})}
    else if(G.mustFrom!==null&&i!==G.mustFrom)toast('Lanjutkan makan dengan bidak yang sama.');
    else if(G.myMoves.some(m=>m.from===i)){S.pickSq=i;render()}
    else{S.pickSq=null;render()}
  },
  /* catur */
  chSq:el=>{
    if(!myTurn())return toast('Action rejected: It is not your turn.');
    const G=S.game,i=+el.dataset.i,from=S.pickSq;
    const mv=from!==null?G.myMoves.filter(m=>m.from===from&&m.to===i):[];
    if(mv.length){if(mv.length>1){S.promo={from,to:i};render()}else{S.pickSq=null;S.promo=null;act({type:'move',from,to:i})}}
    else if(G.myMoves.some(m=>m.from===i)){S.pickSq=i;S.promo=null;render()}
    else{S.pickSq=null;S.promo=null;render()}
  },
  chPromo:el=>{const p=S.promo;S.promo=null;S.pickSq=null;if(p)act({type:'move',from:p.from,to:p.to,promo:el.dataset.p})},
  chDrawOffer:()=>act({type:'draw-offer'}),chDrawAccept:()=>act({type:'draw-accept'}),chDrawDecline:()=>act({type:'draw-decline'}),
  resign:()=>{if(confirm('Yakin menyerah?'))act({type:'resign'})},
  /* ludo */
  ludoRoll:()=>{if(!myTurn())return toast('Action rejected: It is not your turn.');act({type:'roll'})},
  ludoMove:el=>act({type:'move',token:+el.dataset.t})
};

/* ---------------- event delegation ---------------- */
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-act]');if(!el)return;
  const f=A[el.dataset.act];if(f){if(el.tagName==='A')e.preventDefault();if(el.tagName==='BUTTON')play('click');f(el,e)}
});
document.addEventListener('change',e=>{
  const t=e.target;
  const ds=t.closest&&t.closest('[data-change]');
  if(ds){toHost({t:'settings',[ds.dataset.change]:+ds.value});return}
  if(t.id==='hf'){S.histFilter=t.value;render();return}
  if(t.id==='sndOn'){setSound({on:t.checked});play('click');return}
  if(t.name==='cg'){ // ganti game di layar Create: sesuaikan opsi maks pemain tanpa render ulang
    const g=gameById(t.value),sel=$('#cm');if(!g||!sel)return;
    sel.innerHTML='';for(let i=2;i<=g.maxPlayers;i++){const o=document.createElement('option');o.textContent=i;if(i===g.maxPlayers)o.selected=true;sel.appendChild(o)}
    S.pickGame=g.id;
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    if(e.target.id==='chatIn')A.sendChat();
    else if(e.target.id==='jc'||e.target.id==='jp')A.doJoin();
    else if(e.target.id==='an')A.doAuth();
    else if(e.target.id==='lu'||e.target.id==='lp')A.doLogin();
    else if(['ru','rn','rp','rp2'].includes(e.target.id))A.doRegister();
    else if(e.target.dataset&&e.target.dataset.act==='rPile')A.rPile();
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='jc')e.target.value=normCode(e.target.value);
  if(e.target.id==='vol')setSound({volume:+e.target.value/100});
});
document.addEventListener('dragstart',e=>{const el=e.target.closest('[data-drag]');if(!el)return;e.dataTransfer.setData('text/plain',el.dataset.drag);e.dataTransfer.effectAllowed='move'});
document.addEventListener('dragover',e=>{const d=e.target.closest('[data-drop]');if(d){e.preventDefault();d.classList.add('over')}});
document.addEventListener('dragleave',e=>{const d=e.target.closest('[data-drop]');if(d)d.classList.remove('over')});
document.addEventListener('drop',e=>{
  const d=e.target.closest('[data-drop]');if(!d)return;e.preventDefault();d.classList.remove('over');
  const [kind,id]=(e.dataTransfer.getData('text/plain')||'').split(':'),to=d.dataset.drop;
  if(!myTurn())return toast('Action rejected: It is not your turn.');
  if(kind==='sq'&&to.startsWith('sq:')&&S.game){ // seret bidak catur/dam: pilih asal lalu tujuan
    S.pickSq=+id;const target={dataset:{i:to.slice(3)}};
    if(+id===+target.dataset.i){render();return}
    (S.game.kind==='chess'?A.chSq:A.ckSq)(target);return;
  }
  if(kind==='dom'&&(to==='L'||to==='R')){S.pick=null;act({type:'play',id,side:to})}
  else if(kind==='card'&&to==='discard')act({type:'discard',card:id});
  else if(kind==='card'&&to.startsWith('meld:'))act({type:'layoff',cards:[...new Set([id,...S.sel])],meldId:to.slice(5)});
});
window.addEventListener('beforeunload',e=>{if(S.room&&S.room.status==='playing'&&!S.asSpec){e.preventDefault();e.returnValue=''}});

/* timer giliran + indikator bicara */
setInterval(()=>{
  tickSpeaking();
  const tb=$('#tbar');
  if(tb&&S.game&&!S.game.finished){
    const left=Math.max(0,S.deadline-Date.now()),pct=left/S.turnTotal*100;
    tb.style.width=pct+'%';tb.style.background=pct<25?'var(--bad)':pct<50?'var(--acc)':'var(--ok)';
    const ts=$('#tsec');if(ts)ts.textContent=Math.ceil(left/1000)+'s';
  }
},250);

/* ---------------- boot ---------------- */
iceReady.then(()=>render());
(async function boot(){
  const user=await Promise.race([Auth.me(),new Promise(r=>setTimeout(()=>r(null),4000))]);
  if(user)applyUser(user,true);
  else if(lsGet('mabar_session')!==false)S.profile=loadProfile();
  const m=location.pathname.match(/\/join\/([A-Za-z0-9]{6})\/?$/);
  const code=normCode(m?m[1]:new URLSearchParams(location.search).get('code'));
  if(code.length===6){S.prefill=code;S.screen='join';needProfile(()=>go('join'))}
  else if(S.profile&&S.profile.name)S.screen='landing';
  render();
})();
