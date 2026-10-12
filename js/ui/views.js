// Semua tampilan (HTML string dari state). Tidak ada logic jaringan di sini.
import {S,meP,isSpec,isHostMe,myTurn,pName} from '../state.js';
import {esc} from '../util.js';
import {GAMES,gameById,playableGames,isPlayable,STATUS_LABEL} from '../games/registry.js';
import {RENDERERS} from '../games/renderers.js';
import {av,card,domTile} from './cards.js';
import {V} from '../voice/voice.js';
import {REACTIONS} from '../config.js';
import {ACHIEVEMENTS,rankOf,levelProgress,winRate} from '../profile/profile.js';
import {soundCfg} from './sound.js';
import {turnState} from '../multiplayer/net.js';

const EMOJI={domino:'🎲',rummy:'🃏',cangkulan:'♠️','forty-one':'4️⃣','capsa':'🎴',ludo:'🎯',chess:'♟️',checkers:'⚫',uno:'🌈',remi:'🀄'};
const CAT={card:'Kartu',board:'Papan',party:'Party',strategy:'Strategi'};
const gname=id=>(gameById(id)||{}).name||id;

/* ---------- komponen umum ---------- */
function topbar(){
  const p=S.profile,inRoom=!!S.room,snd=soundCfg();
  const nav=(a,l,scr)=>`<button class="navbtn ${S.screen===scr?'on':''}" data-act="${a}">${l}</button>`;
  return`<header class="top"><button class="brand" data-act="${p?'goLobby':'goLanding'}"><i>MR</i>MabarRoom</button>
  <nav>${!p&&!inRoom?'<a href="#game">Game</a><a href="#cara">Cara main</a><a href="#fitur">Fitur</a><a href="#faq">FAQ</a>':''}
  ${p&&!inRoom?nav('goLobby','Home','lobby')+nav('goCreate','Play','create')+nav('goJoin','Join','join')+nav('goProfile','Profil','profile'):''}
  <button class="btn sm ghost" data-act="toggleSound" aria-label="Suara ${snd.on?'aktif':'mati'}">${snd.on?'🔊':'🔇'}</button>
  ${p?`<span class="chip">${av(p,'sm')}${esc(p.name)}</span>${!inRoom?'<button class="btn sm ghost" data-act="logout">Keluar akun</button>':''}`:'<button class="btn sm pri" data-act="openAuth">Masuk / Mulai</button>'}</nav></header>${netbar()}`;
}
export const turnChip=()=>turnState.on?'<span class="chip turnchip" title="Relay TURN aktif">🛰 Relay: aktif</span>':'<span class="chip turnchip" title="Tanpa TURN, beda jaringan bisa gagal">⚠ Relay TURN mati — beda jaringan bisa gagal</span>';
function netbar(){return S.netMsg?`<div class="netbar" role="status">${esc(S.netMsg)}</div>`:''}
export function bottomNav(){
  if(!S.profile||S.room)return'';
  const it=(a,i,l,scr)=>`<button class="${S.screen===scr?'on':''}" data-act="${a}" aria-label="${l}"><span>${i}</span>${l}</button>`;
  return`<nav class="bottomnav" aria-label="Navigasi utama">${it('goLobby','🏠','Home','lobby')}${it('goCreate','🎮','Play','create')}${it('goJoin','🔑','Join','join')}${it('goProfile','👤','Profil','profile')}</nav>`;
}
function badgeFor(g){return`<span class="badge st-${g.status}">${STATUS_LABEL[g.status]}</span>`}

/* ---------- landing ---------- */
export function landing(){
  const n=playableGames().length;
  return`${topbar()}
  <section class="hero"><div>
    <div class="tag">10 game · Domino, Rummy, Capsa, Ludo, Catur, Uno · voice chat</div>
    <h1>MABAR,<br><span class="hl">TAPI ONLINE.</span></h1>
    <p class="lead">Pilih game. Buat room. Bagikan Team Code. Main bareng teman.</p>
    <div class="row"><button class="btn pri big" data-act="goCreate">Create Room</button><button class="btn sec big" data-act="goJoin">Join with Code</button></div>
  </div>
  <div class="glass preview"><div class="row" style="justify-content:space-between"><span class="chip">🟢 MENUNGGU 3/4</span><span class="chip">Domino Gaple</span></div>
    <div class="hint" style="margin-top:12px">TEAM CODE</div><div class="code">AB7KQX</div>
    <div class="pv-pl"><span class="pv-p">${av({avatar:'🦊'},'sm')}Ikhsan <span class="badge host">HOST</span></span><span class="pv-p">${av({avatar:'🐼'},'sm')}Budi <span class="eq"><i></i><i></i><i></i></span></span><span class="pv-p">${av({avatar:'🐙'},'sm')}Andi <span class="badge no">BELUM</span></span></div>
    <div class="float f1">${domTile(6,6,true,34)}</div><div class="float f2">${card({r:'A',s:'s',n:1})}</div></div></section>
  <div class="marquee"><div>${'SATU KODE ✦ SATU ROOM ✦ MABAR BARENG ✦ '.repeat(8)}</div></div>
  <section class="sec" id="game"><h2>${n} game siap main</h2><div class="gamegrid">${GAMES.map(gameCard).join('')}</div></section>
  <section class="sec" id="cara"><h2>Cara main</h2><div class="grid3">
    <div class="glass step"><b>1</b><h3>Buat room</h3><p class="hint">Pilih game dan jumlah pemain. Team Code 6 karakter langsung jadi.</p></div>
    <div class="glass step"><b>2</b><h3>Bagikan kode</h3><p class="hint">Salin kode atau kirim link ke grup WhatsApp. Teman tinggal klik dan masuk.</p></div>
    <div class="glass step"><b>3</b><h3>Mabar!</h3><p class="hint">Semua siap, host menekan start. Nyalakan voice dan ngobrol sambil main.</p></div></div></section>
  <section class="sec" id="fitur"><h2>Fitur</h2><div class="grid3">
    <div class="glass feat"><h3>Real-time</h3><p>Langkah muncul seketika di layar semua pemain. Aksi divalidasi engine, bukan klien.</p></div>
    <div class="glass feat"><h3>Voice chat</h3><p>Voice langsung di browser. Ada indikator bicara, mute, dan deafen.</p></div>
    <div class="glass feat"><h3>Spectator</h3><p>Room sudah jalan? Masuk sebagai penonton dan ikut chat serta reaksi.</p></div>
    <div class="glass feat"><h3>Rating per game</h3><p>Statistik, rating, rank, dan riwayat terpisah untuk tiap game, plus achievement.</p></div>
    <div class="glass feat"><h3>Timer &amp; auto-play</h3><p>Terlambat? Langkah dimainkan otomatis supaya permainan tidak macet.</p></div>
    <div class="glass feat"><h3>Tanpa data pribadi</h3><p>Cukup nama panggilan dan avatar. Password room di-hash, tidak dikirim polos.</p></div></div></section>
  <section class="sec" id="faq"><h2>FAQ</h2>
    <details class="glass faq"><summary>Berapa pemain per room?</summary><p>2 sampai 4 pemain untuk game kartu, Domino, dan Ludo. Catur dan Dam untuk 2 pemain. Ditambah penonton.</p></details>
    <details class="glass faq"><summary>Kenapa voice tidak terdengar?</summary><p>Pastikan izin mikrofon diizinkan dan kamu menekan Join voice. Pada jaringan tertentu (data seluler dengan NAT ketat) koneksi suara bisa gagal; coba pindah Wi-Fi.</p></details>
    <details class="glass faq"><summary>Apa yang terjadi kalau host keluar?</summary><p>Browser host berfungsi sebagai server room, jadi room ditutup saat host keluar. Pilih host yang koneksinya stabil.</p></details>
    <details class="glass faq"><summary>Apakah rating dan statistik aman dari curang?</summary><p>Belum. Data tersimpan di browser masing-masing dan hasil dihitung oleh host. Leaderboard global baru bisa dipercaya setelah ada server pusat.</p></details>
    <details class="glass faq"><summary>Apa arti label BETA?</summary><p>Game sudah bisa dimainkan dan aturannya dites otomatis, tapi belum banyak dicoba pemain sungguhan. Kalau menemukan bug, kabari ya.</p></details></section>
  <footer>MabarRoom · Satu Kode. Satu Room. Mabar Bareng.</footer>`;
}

/* ---------- kartu game & lobby ---------- */
function gameCard(g){
  const ok=isPlayable(g),p=S.profile,fav=p&&p.favorites.includes(g.id);
  const st=p&&p.games[g.id];
  return`<div class="glass gc ${ok?'':'soon'}"><div class="gc-top"><span class="gc-emoji" aria-hidden="true">${EMOJI[g.id]||'🎮'}</span>
    ${p&&ok?`<button class="star ${fav?'on':''}" data-act="fav" data-g="${g.id}" aria-label="${fav?'Hapus dari favorit':'Tambah ke favorit'}">${fav?'★':'☆'}</button>`:''}</div>
    <h3>${esc(g.name)}</h3><div class="row" style="gap:6px"><span class="chip">${CAT[g.category]}</span><span class="chip">${g.minPlayers}–${g.maxPlayers} pemain</span>${badgeFor(g)}</div>
    <p class="hint">${esc(g.blurb)}</p>
    ${st&&st.played?`<p class="hint">Rating ${st.rating} · ${rankOf(st.rating)} · ${st.wins}/${st.played} menang</p>`:''}
    ${ok?`<button class="btn pri" data-act="playGame" data-g="${g.id}">Main ${esc(g.short)}</button>`:`<button class="btn ghost" disabled>Segera hadir</button>`}</div>`;
}
const FILTERS=[['all','Semua'],['recent','Terakhir main'],['fav','Favorit'],['card','Kartu'],['board','Papan'],['strategy','Strategi'],['party','Party'],['soon','Coming Soon']];
function filtered(){
  const p=S.profile,f=S.filter;
  if(f==='all')return GAMES;
  if(f==='recent')return GAMES.filter(g=>p.lastPlayed[g.id]).sort((a,b)=>p.lastPlayed[b.id]-p.lastPlayed[a.id]);
  if(f==='fav')return GAMES.filter(g=>p.favorites.includes(g.id));
  if(f==='soon')return GAMES.filter(g=>g.status==='coming-soon');
  return GAMES.filter(g=>g.category===f);
}
export function lobby(){
  const p=S.profile,lp=levelProgress(p.xp),list=filtered();
  const best=playableGames().map(g=>({g,s:p.games[g.id]})).sort((a,b)=>b.s.rating-a.s.rating)[0];
  const empty=S.filter==='recent'?'Belum ada game yang dimainkan.':S.filter==='fav'?'Belum ada favorit. Tekan ☆ pada game.':'Tidak ada game di kategori ini.';
  return`${topbar()}<div class="wrap"><h2 style="margin-top:10px">Welcome back,<br>${esc(p.name)}</h2>
  <div class="lobby-grid"><div>
    <div class="filters" role="tablist" aria-label="Filter game">${FILTERS.map(([id,l])=>`<button class="fchip ${S.filter===id?'on':''}" role="tab" aria-selected="${S.filter===id}" data-act="filter" data-f="${id}">${l}</button>`).join('')}</div>
    <div class="gamegrid">${list.length?list.map(gameCard).join(''):`<p class="hint">${empty}</p>`}</div>
    <div style="margin-top:12px">${turnChip()}</div><div class="row" style="margin-top:22px"><button class="btn big" data-act="goCreate">Create Room</button><button class="btn sec big" data-act="goJoin">Join Room</button></div>
    <div class="glass card" style="margin-top:22px"><h3>Room terakhir</h3><div class="recent">${(p.recent||[]).length?p.recent.map(r=>`<div class="row"><span class="chip code">${r.code}</span><span>${esc(r.name)}</span><button class="btn sm ghost" style="margin-left:auto" data-act="rejoin" data-code="${r.code}">Masuk lagi</button></div>`).join(''):'<span class="hint">Belum ada. Buat room pertamamu!</span>'}</div></div>
    <div class="glass card" style="margin-top:22px"><h3>Rooms</h3><p class="hint" style="margin-top:8px">Public Room (daftar room terbuka) butuh server pusat dan belum tersedia. Sementara ini bagikan Team Code atau link undangan ke temanmu.</p></div>
  </div>
  <div class="glass card"><div class="row">${av(p,'lg')}<div><b style="font-size:20px">${esc(p.name)}</b><div class="hint">Level ${lp.level} · ${p.xp} XP</div></div></div>
    <div class="xpbar" aria-label="Progres level ${lp.pct}%"><i style="width:${lp.pct}%"></i></div>
    <div class="stat"><div><b>${p.stats.played}</b><span class="hint">Main</span></div><div><b>${p.stats.wins}</b><span class="hint">Menang</span></div><div><b>${p.stats.losses}</b><span class="hint">Kalah</span></div></div>
    ${best&&best.s.played?`<p class="hint" style="margin-top:12px">Terbaik: <b>${esc(best.g.short)}</b> · ${best.s.rating} (${rankOf(best.s.rating)})</p>`:''}
    <button class="btn sm sec" style="margin-top:14px" data-act="goProfile">Lihat profil</button>
    <p class="hint" style="margin-top:14px">Data tersimpan di browser ini.</p></div></div></div>${bottomNav()}`;
}

/* ---------- create / join ---------- */
export function createScreen(){
  const list=playableGames(),g=gameById(S.pickGame)&&isPlayable(gameById(S.pickGame))?gameById(S.pickGame):list[0];
  const maxOpts=[];for(let i=2;i<=g.maxPlayers;i++)maxOpts.push(`<option ${i===g.maxPlayers?'selected':''}>${i}</option>`);
  return`${topbar()}<div class="wrap"><div class="glass card narrow"><h2>Create room</h2>
  <label class="l">Game</label><div class="choice c3">${list.map(x=>`<label><input type="radio" name="cg" value="${x.id}" ${x.id===g.id?'checked':''}><span>${esc(x.short)}${x.status==='beta'?' <small>BETA</small>':''}</span></label>`).join('')}</div>
  <label class="l" for="cn">Nama room</label><input id="cn" class="inp" maxlength="24" value="Mabar Malam">
  <label class="l" for="cm">Maks pemain</label><select id="cm" class="inp">${maxOpts.join('')}</select>
  <label class="l">Tipe room</label><div class="choice"><label><input type="radio" name="ct" value="private" checked><span>Private</span></label><label class="dis"><input type="radio" name="ct" value="public" disabled><span>Public · segera</span></label></div>
  <p class="hint" style="margin-top:6px">Daftar public room butuh server pusat. Saat ini semua room dibagikan lewat Team Code atau link undangan.</p>
  <label class="l" for="cp">Password (opsional)</label><input id="cp" class="inp" maxlength="20" placeholder="Kosongkan jika tanpa password" autocomplete="off">
  <div class="row" style="margin-top:22px"><button class="btn pri big" data-act="doCreate" id="cbtn">Create room</button><button class="btn ghost" data-act="goLobby">Batal</button></div></div></div>${bottomNav()}`;
}
export function joinScreen(){
  return`${topbar()}<div class="wrap"><div class="glass card narrow"><h2>Join room</h2>
  <label class="l" for="jc">Masukkan Team Code</label><input id="jc" class="inp codein" maxlength="6" placeholder="AB7KQX" value="${esc(S.prefill||'')}" autocomplete="off" autocapitalize="characters" spellcheck="false">
  <label class="l" for="jp">Password (jika ada)</label><input id="jp" class="inp" maxlength="20" autocomplete="off">
  <label class="check"><input type="checkbox" id="js"> <span>Masuk sebagai penonton (spectator)</span></label>
  <div class="row" style="margin-top:22px"><button class="btn pri big" data-act="doJoin" ${S.joining?'disabled':''}>${S.joining?'Menyambung…':'Join room'}</button><button class="btn ghost" data-act="goLobby">Batal</button></div>
  <p class="hint" style="margin-top:14px">Kode tidak peduli huruf besar/kecil. Error umum: kode salah, room penuh, atau ditutup. Room yang sudah dimulai bisa ditonton.</p></div></div>${bottomNav()}`;
}

/* ---------- profil ---------- */
export function profileScreen(){
  const p=S.profile,lp=levelProgress(p.xp),snd=soundCfg(),pg=playableGames();
  const hist=p.history.filter(h=>S.histFilter==='all'||h.game===S.histFilter);
  const fmtDur=ms=>ms?Math.max(1,Math.round(ms/60000))+' mnt':'-';
  return`${topbar()}<div class="wrap"><div class="glass card"><div class="row">${av(p,'lg')}<div style="flex:1;min-width:200px"><h2 style="margin:0 0 6px;font-size:34px">${esc(p.name)}</h2>${S.user?`<div class="hint">@${esc(S.user.username)} · akun terverifikasi ✓</div>`:`<div class="hint">Mode tamu · <a href="#" data-act="openAuth">Daftar/Masuk</a> untuk menyimpan progres</div>`}
    <div class="hint">Level ${lp.level} · ${p.xp} XP · ${lp.next} XP ke level berikutnya</div><div class="xpbar"><i style="width:${lp.pct}%"></i></div></div>
    <button class="btn sm ghost" data-act="editProfile">Ubah nama/avatar</button></div>
    <div class="stat"><div><b>${p.stats.played}</b><span class="hint">Main</span></div><div><b>${p.stats.wins}</b><span class="hint">Menang</span></div><div><b>${p.stats.losses}</b><span class="hint">Kalah</span></div><div><b>${p.stats.played?Math.round(p.stats.wins/p.stats.played*100):0}%</b><span class="hint">Win rate</span></div></div></div>
  <h3 style="margin:26px 0 12px">Statistik &amp; rating per game</h3>
  <div class="gamegrid">${pg.map(g=>{const s=p.games[g.id];return`<div class="glass gc"><div class="gc-top"><span class="gc-emoji">${EMOJI[g.id]}</span><span class="chip">${rankOf(s.rating)}</span></div><h3>${esc(g.name)}</h3>
    <div class="ratingbig">${s.rating}<small>rating</small></div>
    <div class="kv"><span>Main</span><b>${s.played}</b><span>Menang</span><b>${s.wins}</b><span>Kalah</span><b>${s.losses}</b><span>Seri</span><b>${s.draws}</b><span>Win rate</span><b>${winRate(s)}%</b><span>Streak</span><b>${s.streak} (maks ${s.bestStreak})</b><span>Skor rata-rata</span><b>${s.played?Math.round(s.totalScore/s.played):0}</b><span>Skor terbaik</span><b>${s.bestScore}</b></div></div>`}).join('')}</div>
  <p class="hint" style="margin-top:10px">Rating dihitung per game (Elo multi-pemain) dan disimpan di browser ini. Leaderboard global antar-pemain butuh server pusat dan belum tersedia.</p>
  <h3 style="margin:26px 0 12px">Achievement (${Object.keys(p.achievements).length}/${ACHIEVEMENTS.length})</h3>
  <div class="achgrid">${ACHIEVEMENTS.map(a=>{const on=!!p.achievements[a.id];return`<div class="glass ach ${on?'on':''}"><span class="ai">${on?a.icon:'🔒'}</span><div><b>${esc(a.name)}</b><div class="hint">${esc(a.desc)}</div></div></div>`}).join('')}</div>
  <div class="row" style="margin:26px 0 12px;justify-content:space-between"><h3>Riwayat pertandingan</h3>
    <select class="inp" id="hf" style="width:auto" aria-label="Filter riwayat"><option value="all">Semua game</option>${pg.map(g=>`<option value="${g.id}" ${S.histFilter===g.id?'selected':''}>${esc(g.short)}</option>`).join('')}</select></div>
  <div class="hist">${hist.length?hist.map(h=>`<div class="glass hrow ${h.outcome}"><span class="badge ${h.outcome==='win'?'ok':h.outcome==='loss'?'st-loss':'no'}">${h.outcome==='win'?'MENANG':h.outcome==='loss'?'KALAH':'SERI'}</span>
    <div style="min-width:0"><b>${esc(gname(h.game))}</b> · ${esc(h.room||'')}<div class="hint">${h.players.map(esc).join(', ')} · ${new Date(h.at).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})} · ${fmtDur(h.durationMs)}</div></div>
    <span class="delta ${h.delta>=0?'up':'down'}">${h.delta>=0?'+':''}${h.delta}</span></div>`).join(''):'<p class="hint">Belum ada pertandingan.</p>'}</div>
  <h3 style="margin:26px 0 12px">Pengaturan</h3>
  <div class="glass card"><label class="check"><input type="checkbox" id="sndOn" ${snd.on?'checked':''}> <span>Efek suara</span></label>
    <label class="l" for="vol">Volume</label><input type="range" id="vol" min="0" max="100" value="${Math.round(snd.volume*100)}" style="width:100%">
    <div class="row" style="margin-top:16px"><button class="btn sm bad" data-act="resetData">Hapus semua data profil</button></div></div></div>${bottomNav()}`;
}

/* ---------- voice & reaksi ---------- */
function voicePanel(){
  const on=!!V.stream,spec=isSpec();
  const voice=spec?'<span class="chip">👀 Penonton: chat &amp; reaksi saja</span>':on
    ?`<button class="btn sm ${V.muted?'bad':'sec'}" data-act="vMute">${V.muted?'🔇 Unmute':'🎙 Mute'}</button><button class="btn sm ${V.deaf?'bad':'ghost'}" data-act="vDeafen" aria-pressed="${V.deaf}">${V.deaf?'🔕 Undeafen':'🎧 Deafen'}</button><button class="btn sm ghost" data-act="vLeave">Keluar voice</button>`
    :`<button class="btn sm sec" data-act="vJoin">🎙 Join voice</button>`;
  return`<div class="bar">${voice}<button class="btn sm ghost" data-act="toggleChat">💬 Chat<span class="cb chatBadge" ${S.unread?'':'hidden'}>${S.unread}</span></button></div>
  <div class="bar reacts" aria-label="Reaksi">${REACTIONS.map(e=>`<button class="rbtn" data-act="react" data-e="${e}" aria-label="Reaksi ${e}">${e}</button>`).join('')}</div>`;
}

/* ---------- waiting room ---------- */
export function waiting(){
  const R=S.room,host=isHostMe(),m=meP()||{},spec=isSpec(),g=gameById(R.game)||{};
  const min=g.minPlayers||2,can=R.players.length>=min&&R.players.every(p=>p.ready);
  const slots=[];for(let i=0;i<R.max;i++){
    const p=R.players[i];
    slots.push(p?`<div class="glass pl" data-peer="${p.peerId}">${av(p)}<div style="min-width:0"><b>${esc(p.name)}${p.id===S.me?' (kamu)':''}</b><div class="badges">${p.id===R.hostId?'<span class="badge host">HOST</span>':''}${p.ready?'<span class="badge ok">READY</span>':'<span class="badge no">NOT READY</span>'}${p.voice?`<span class="badge">${p.muted?'🔇':'🎙'}</span>`:''}<span class="badge no">⭐ ${p.rating}</span></div></div>${host&&p.id!==S.me?`<button class="btn sm bad" style="margin-left:auto" data-act="kick" data-id="${p.id}" aria-label="Kick ${esc(p.name)}">✕</button>`:''}</div>`
      :`<div class="glass pl empty"><span class="av">?</span><div class="hint">Menunggu pemain…</div></div>`);
  }
  const specs=R.spectators||[];
  const maxOpts=[];for(let v=2;v<=(g.maxPlayers||4);v++)if(v>=R.players.length)maxOpts.push(`<option ${v===R.max?'selected':''}>${v}</option>`);
  return`${topbar()}<div class="wrap"><div class="row"><span class="chip">${esc((g.name||R.game).toUpperCase())}</span><span class="chip">${R.type==='private'?'🔒 Private':'🌐 Public'}${R.hasPw?' + password':''}</span>${spec?'<span class="badge host">SPECTATOR</span>':''}${turnChip()}</div>
  <h2 style="margin-top:14px">Room: ${esc(R.name)}</h2>
  <div class="glass card"><div class="hint">TEAM CODE</div><div class="bigcode">${R.code}</div>
  <div class="row" style="margin-top:14px"><button class="btn" data-act="copyCode">Copy code</button><button class="btn sec" data-act="share">Share link</button></div></div>
  <h3 style="margin-top:26px">Players ${R.players.length}/${R.max}</h3><div class="pl-grid">${slots.join('')}</div>
  ${specs.length?`<p class="hint">👀 Penonton (${specs.length}): ${specs.map(s=>esc(s.name)).join(', ')}</p>`:''}
  ${host?`<div class="glass card"><h3 style="font-size:18px">Pengaturan host</h3><div class="row" style="margin-top:10px"><label>Waktu giliran <select class="inp" style="width:auto" data-change="turnTime">${[15,30,45,60,90,120].map(v=>`<option ${v===R.turnTime?'selected':''}>${v}</option>`).join('')}</select> detik</label>
  <label>Maks pemain <select class="inp" style="width:auto" data-change="max">${maxOpts.join('')}</select></label></div></div>`:''}
  <div class="bar">${host?`<button class="btn pri big" data-act="start" ${can?'':'disabled'}>Start game</button><button class="btn bad" data-act="closeRoom">Close room</button>`
    :spec?`<button class="btn bad" data-act="leave">Berhenti menonton</button>`
    :`<button class="btn ${m.ready?'ghost':'pri'} big" data-act="toggleReady">${m.ready?'Batal ready':'Ready'}</button><button class="btn bad" data-act="leave">Leave room</button>`}</div>
  ${host&&!can?`<p class="hint" style="text-align:center">${R.players.length<min?'Butuh minimal '+min+' pemain.':'Menunggu semua pemain ready.'}</p>`:''}
  ${spec?'<p class="hint" style="text-align:center">Kamu menonton. Game akan terlihat saat host menekan Start.</p>':''}
  ${voicePanel()}</div>`;
}

/* ---------- meja game ---------- */
function seat(p,pos,G,unit){
  if(!p)return'';
  const cur=G.current===p.id&&!G.finished;
  return`<div class="seat pos-${pos} ${cur?'turn':''} ${p.connected?'':'off'}" data-peer="${p.peerId}">${av(p)}<div style="min-width:0"><b>${esc(p.name)}</b><small>${G.counts[p.id]} ${unit}${p.connected?'':' · offline'}</small>${p.voice?` <small>${p.muted?'🔇':'🎙'}</small>`:''}${cur?'<div class="badge">GILIRAN</div>':''}${G.done&&G.done.includes(p.id)?'<div class="badge ok">SIAP</div>':''}</div></div>`;
}
function hintText(G,rd){
  if(G.finished)return'Ronde selesai';
  if(rd.simul)return rd.hint(G);
  if(!myTurn())return'Menunggu '+pName(G.current)+'…';
  return rd.hint(G);
}
export function gameScreen(){
  const R=S.room,G=S.game,me=meP()||{},spec=isSpec();
  if(!G)return`${topbar()}<div class="wrap"><p>Memuat…</p></div>`;
  const rd=RENDERERS[G.kind],g=gameById(R.game)||{};
  const ord=G.order;let seats;
  if(spec)seats=`<div class="seatrow">${ord.map(id=>seat(R.players.find(p=>p.id===id),'spec',G,rd.seatUnit)).join('')}</div>`;
  else{
    const i=ord.indexOf(S.me),rot=ord.slice(i+1).concat(ord.slice(0,i));
    const pos={1:['top'],2:['left','right'],3:['left','top','right']}[rot.length]||['top'];
    seats=rot.map((id,k)=>seat(R.players.find(p=>p.id===id),pos[k],G,rd.seatUnit)).join('');
  }
  const specs=(R.spectators||[]).length;
  const mine=spec
    ?`<div class="mine"><div class="mehead"><span class="badge host">SPECTATOR</span><span class="hint">Kamu menonton · giliran: ${esc(pName(G.current))}${specs>1?' · '+specs+' penonton':''}</span></div></div>`
    :`<div class="mine ${myTurn()?'turn':''}" data-peer="${me.peerId}"><div class="mehead">${av(me)}<b>${esc(me.name)}</b>${myTurn()?'<span class="badge">GILIRANMU</span>':''}<span class="hint">${esc(hintText(G,rd))}</span></div>${rd.hand(G)}</div>`;
  const bar=voicePanel().replace('<div class="bar">','<div class="bar"><button class="btn sm bad" data-act="leaveConfirm">Keluar</button>');
  return`<div class="wrap game">${netbar()}<div class="gtop"><span class="chip">${esc(R.name)}</span><span class="chip code">${R.code}</span><span class="chip">${esc((g.name||'').toUpperCase())}</span><div class="tbar"><i id="tbar"></i></div><b id="tsec"></b></div>
  <div class="arena ${spec?'spec':''}">${seats}<div class="felt">${rd.table(G)}</div></div>
  ${mine}${bar}${G.finished?resultOverlay(rd):''}</div>`;
}
function resultOverlay(rd){
  const R=S.room,G=S.game,res=G.result,w=res.winner,spec=isSpec(),lr=S.lastResult;
  const title=!w?'SERI!':w===S.me?'KAMU MENANG! 🏆':esc(pName(w))+' MENANG!';
  const why=rd.why?rd.why(res):({out:'Kartu habis lebih dulu',blocked:'Permainan buntu — pip terkecil menang',draw:'Buntu dan pip sama — seri',stalemate:'Stock habis — nilai tangan terkecil menang'}[res.reason]||'');
  const rows=G.order.map(id=>{const p=R.players.find(x=>x.id===id)||{};return`<div class="${id===w?'w':''}">${av(p,'sm')}<b>${esc(p.name)}</b>${id===w?'<span class="badge">WIN</span>':''}<span>${rd.leftLabel||'sisa'} ${res.left[id]} ${rd.unit}<br><small class="hint">+${res.scores[id]} · total menang ${(R.wins&&R.wins[id])||0}</small></span></div>`}).join('');
  const rate=lr?`<p class="ratingline">Rating ${esc(gameById(R.game).short)}: <b>${lr.rating}</b> <span class="delta ${lr.delta>=0?'up':'down'}">${lr.delta>=0?'+':''}${lr.delta}</span> · +${lr.xpGain} XP</p>`:'';
  return`<div class="over-res" role="dialog" aria-modal="true" aria-label="Hasil ronde"><div class="glass"><h2>${title}</h2><p class="hint">${why}</p><div class="rtable">${rows}</div>${spec?'':rate}
  <div class="row" style="justify-content:center">${isHostMe()?'<button class="btn pri big" data-act="rematch">Rematch</button>':'<span class="hint">Menunggu host memulai rematch…</span>'}<button class="btn ghost" data-act="leave">Keluar</button></div></div></div>`;
}
