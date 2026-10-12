import {S,myTurn,pName} from '../../state.js';
import {esc} from '../../util.js';
import {LudoRules,LUDO_COLORS} from './rules.js';
import {absPos} from './engine.js';
export const unit='langkah',seatUnit='pion di tujuan',leftLabel='sisa';
export const why=()=>'Semua pion sampai di tujuan';
/* Papan 15x15: koordinat 52 kotak jalur luar (searah jarum jam) mulai dari kotak start Merah. */
const TRACK=[];
(function build(){
  const p=(r,c)=>TRACK.push([r,c]);
  for(let c=1;c<=5;c++)p(6,c);for(let r=5;r>=0;r--)p(r,6);p(0,7);p(0,8);for(let r=1;r<=5;r++)p(r,8);
  for(let c=9;c<=14;c++)p(6,c);p(7,14);p(8,14);for(let c=13;c>=9;c--)p(8,c);
  for(let r=9;r<=14;r++)p(r,8);p(14,7);p(14,6);for(let r=13;r>=9;r--)p(r,6);
  for(let c=5;c>=0;c--)p(8,c);p(7,0);p(6,0);
})();
const HOME=[[...Array(5)].map((_,i)=>[7,1+i]),[...Array(5)].map((_,i)=>[1+i,7]),[...Array(5)].map((_,i)=>[7,13-i]),[...Array(5)].map((_,i)=>[13-i,7])];
const GOAL=[[7,6],[6,7],[7,8],[8,7]];
const BASE=[[[2,2],[2,3],[3,2],[3,3]],[[2,11],[2,12],[3,11],[3,12]],[[11,11],[11,12],[12,11],[12,12]],[[11,2],[11,3],[12,2],[12,3]]];
const BASEBOX=[[1,1],[1,10],[10,10],[10,1]];
const DIE=['','⚀','⚁','⚂','⚃','⚄','⚅'];
export function table(G){
  const cellsMap={};const at=(r,c)=>cellsMap[r+','+c]||(cellsMap[r+','+c]={cls:[],tokens:[]});
  TRACK.forEach(([r,c],i)=>{const e=at(r,c);e.cls.push('trk');if(LudoRules.safe.includes(i))e.cls.push('safe');LudoRules.starts.forEach((s,k)=>{if(s===i)e.cls.push('st'+k)})});
  HOME.forEach((cells,k)=>cells.forEach(([r,c])=>at(r,c).cls.push('hm','h'+k)));
  GOAL.forEach(([r,c],k)=>at(r,c).cls.push('gl','h'+k));
  BASEBOX.forEach(([r0,c0],k)=>{for(let r=r0;r<r0+4;r++)for(let c=c0;c<c0+4;c++)at(r,c).cls.push('bs','b'+k)});
  BASE.forEach((cells,k)=>cells.forEach(([r,c])=>at(r,c).cls.push('bslot')));
  const legal=new Set(G.myLegal);
  G.order.forEach(pid=>{
    const col=G.colors[pid];
    G.tokens[pid].forEach((p,i)=>{
      let rc;
      if(p===-1)rc=BASE[col][i];else if(p<=50)rc=TRACK[absPos(LudoRules,col,p)];else if(p<56)rc=HOME[col][p-51];else rc=GOAL[col];
      at(rc[0],rc[1]).tokens.push({pid,i,col,mine:pid===S.me,can:pid===S.me&&legal.has(i)});
    });
  });
  let out='';
  for(let r=0;r<15;r++)for(let c=0;c<15;c++){
    const e=cellsMap[r+','+c];
    if(!e){out+=`<div class="lc void"></div>`;continue}
    const toks=e.tokens.map(t=>t.can?`<button class="tk lc${t.col} can" data-act="ludoMove" data-t="${t.i}" aria-label="Pion ${t.i+1}"></button>`:`<span class="tk lc${t.col}"></span>`).join('');
    out+=`<div class="lc ${e.cls.join(' ')}">${e.cls.includes('safe')?'<i class="star">★</i>':''}${toks}</div>`;
  }
  const lr=G.lastRoll;
  const who=lr?esc(pName(lr.pid)):'';
  return`<div class="ludo">${out}</div>
  <div class="diebox"><span class="die ${G.canRoll?'ready':''}" aria-label="Dadu">${DIE[(G.rolled||(lr&&lr.v))||0]||'🎲'}</span>
  <div>${lr?`<b>${who}</b> dapat ${lr.v}${lr.note?' — '+esc(lr.note):''}`:'Lempar dadu untuk mulai'}<div class="hint">${G.order.map(id=>`<span class="chip lcc${G.colors[id]}">${LUDO_COLORS[G.colors[id]]}: ${esc(pName(id))}</span>`).join(' ')}</div></div></div>`;
}
export function hand(G){
  return`<div class="actions"><button class="btn pri big" data-act="ludoRoll" ${G.canRoll?'':'disabled'}>🎲 Lempar dadu</button></div>`;
}
export function hint(G){return G.canRoll?'Lempar dadu':G.myLegal.length?'Pilih pion yang menyala':'Menunggu…'}
