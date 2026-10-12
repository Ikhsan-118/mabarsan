// Profil lokal: statistik per game, rating per game, riwayat, achievement, favorit.
// CATATAN: tanpa server, data ini tersimpan di browser dan tidak terverifikasi.
import {lsGet,lsSet,lsDel} from '../util.js';
import {GAMES} from '../games/registry.js';

let KEY='mabar_profile';
/* Profil akun disimpan per user (cache lokal) agar tidak tercampur antar akun di perangkat yang sama. */
export const setProfileKey=k=>{KEY=k||'mabar_profile'};
export const syncHook={fn:null};
export const START_RATING=1000;
export const HISTORY_MAX=60;

const blankGame=()=>({played:0,wins:0,losses:0,draws:0,streak:0,bestStreak:0,totalScore:0,bestScore:0,rating:START_RATING});

export const ACHIEVEMENTS=[
  {id:'first-match',name:'First Match',desc:'Selesaikan 1 pertandingan',icon:'🎮',check:p=>p.stats.played>=1},
  {id:'first-win',name:'First Win',desc:'Menang 1 kali',icon:'🏆',check:p=>p.stats.wins>=1},
  {id:'games-10',name:'10 Games',desc:'Main 10 pertandingan',icon:'🔟',check:p=>p.stats.played>=10},
  {id:'games-100',name:'100 Games',desc:'Main 100 pertandingan',icon:'💯',check:p=>p.stats.played>=100},
  {id:'streak-5',name:'Win Streak 5',desc:'Menang 5 kali beruntun di satu game',icon:'🔥',check:p=>maxStreak(p)>=5},
  {id:'streak-10',name:'Win Streak 10',desc:'Menang 10 kali beruntun di satu game',icon:'☄️',check:p=>maxStreak(p)>=10},
  ...GAMES.filter(g=>g.status==='implemented'||g.status==='beta').map(g=>({
    id:g.id+'-master',name:g.short+' Master',desc:'Menang 10 kali di '+g.short,icon:'👑',check:p=>(p.games[g.id]||{}).wins>=10}))
];
const maxStreak=p=>Math.max(0,...Object.values(p.games).map(g=>g.bestStreak||0));

export const RANKS=[[0,'Bronze'],[1050,'Silver'],[1150,'Gold'],[1300,'Platinum'],[1450,'Diamond'],[1650,'Master']];
export const rankOf=r=>RANKS.filter(x=>r>=x[0]).pop()[1];
export const levelOf=xp=>Math.floor(Math.sqrt(Math.max(0,xp)/50))+1;
export const levelProgress=xp=>{const l=levelOf(xp),a=(l-1)**2*50,b=l**2*50;return{level:l,pct:Math.round((xp-a)/(b-a)*100),next:b-xp}};

export function migrate(p){
  if(!p)return null;
  p.stats=Object.assign({played:0,wins:0,losses:0},p.stats||{});
  p.recent=p.recent||[];p.xp=p.xp||0;p.history=p.history||[];p.achievements=p.achievements||{};
  p.favorites=p.favorites||[];p.lastPlayed=p.lastPlayed||{};p.games=p.games||{};
  GAMES.forEach(g=>{p.games[g.id]=Object.assign(blankGame(),p.games[g.id]||{})});
  return p;
}
export const loadProfile=()=>migrate(lsGet(KEY));
export const saveProfile=p=>{lsSet(KEY,p);if(syncHook.fn)syncHook.fn(p)};
export const clearProfile=()=>lsDel(KEY);
export const ratingsOf=p=>Object.fromEntries(GAMES.map(g=>[g.id,(p.games[g.id]||{}).rating||START_RATING]));
export const winRate=g=>g.played?Math.round(g.wins/g.played*100):0;

export function pushRecent(p,code,name,game){
  const r=(p.recent||[]).filter(x=>x.code!==code);r.unshift({code,name,game,at:Date.now()});p.recent=r.slice(0,5);saveProfile(p);
}
export function toggleFavorite(p,id){
  p.favorites=p.favorites.includes(id)?p.favorites.filter(x=>x!==id):p.favorites.concat(id);saveProfile(p);
}

/* Elo untuk N pemain: peluang menang tiap pemain = bobot 10^(R/400) dibagi total bobot. */
export function eloDelta(myRating,allRatings,outcome,K=32){
  const w=r=>Math.pow(10,r/400),total=allRatings.reduce((s,r)=>s+w(r),0);
  const expected=w(myRating)/total,n=allRatings.length;
  const actual=outcome==='win'?1:outcome==='draw'?1/n:0;
  return Math.round(K*(actual-expected));
}

/* Catat hasil 1 ronde. Mengembalikan ringkasan untuk ditampilkan di UI. */
export function recordResult(p,r){
  const g=p.games[r.game]||(p.games[r.game]=blankGame());
  const outcome=!r.winner?'draw':r.winner===r.me?'win':'loss';
  const ratings=r.players.map(x=>x.id===r.me?g.rating:(x.rating||START_RATING));
  const delta=eloDelta(g.rating,ratings,outcome);
  g.rating=Math.max(100,g.rating+delta);
  g.played++;p.stats.played++;
  const score=(r.scores&&r.scores[r.me])||0;g.totalScore+=score;
  if(outcome==='win'){g.wins++;p.stats.wins++;g.streak++;g.bestStreak=Math.max(g.bestStreak,g.streak);g.bestScore=Math.max(g.bestScore,score)}
  else if(outcome==='loss'){g.losses++;p.stats.losses++;g.streak=0}
  else{g.draws++;g.streak=0}
  const xpGain=outcome==='win'?30:outcome==='draw'?15:10;p.xp+=xpGain;
  p.lastPlayed[r.game]=Date.now();
  const names=Object.fromEntries(r.players.map(x=>[x.id,x.name]));
  p.history.unshift({id:r.matchId,game:r.game,room:r.roomName,at:Date.now(),durationMs:r.durationMs||0,outcome,score,delta,
    winner:r.winner?names[r.winner]||'?':null,players:r.players.map(x=>x.name),round:r.round});
  p.history=p.history.slice(0,HISTORY_MAX);
  const unlocked=ACHIEVEMENTS.filter(a=>!p.achievements[a.id]&&a.check(p));
  unlocked.forEach(a=>p.achievements[a.id]=Date.now());
  saveProfile(p);
  return{outcome,delta,rating:g.rating,xpGain,unlocked};
}
