import {S,myTurn} from '../../state.js';
export const unit='bidak',seatUnit='bidak',leftLabel='sisa';
export const why=r=>({blocked:'Lawan tidak bisa bergerak / habis',resign:'Lawan menyerah',draw:'Seri: 80 langkah tanpa makan'}[r.reason]||'');
export function table(G){
  const flip=G.myColor==='b',idx=[...Array(64).keys()];if(flip)idx.reverse();
  const mt=myTurn(),from=S.pickSq!==null?S.pickSq:(mt&&G.mustFrom!==null?G.mustFrom:null);
  const targets=new Set(from!==null?G.myMoves.filter(m=>m.from===from).map(m=>m.to):[]);
  const movable=new Set(G.myMoves.map(m=>m.from));
  const cells=idx.map(i=>{
    const r=i>>3,c=i&7,dark=(r+c)%2===1,p=G.board[i];
    const cls=['sq',dark?'dark':'light',i===from?'sel':'',targets.has(i)?'target':'',G.last&&(G.last.from===i||G.last.to===i)?'last':'',mt&&movable.has(i)&&from===null?'movable':''].join(' ');
    const piece=p?`<span class="ck ${p.toLowerCase()==='w'?'cw':'cb'} ${p===p.toUpperCase()?'king':''}">${p===p.toUpperCase()?'♛':''}</span>`:'';
    const drag=mt&&movable.has(i)?` draggable="true" data-drag="sq:${i}"`:'';
    return`<button class="${cls}" data-act="ckSq" data-i="${i}" data-drop="sq:${i}"${drag} aria-label="Kotak ${r+1},${c+1}">${piece}</button>`;
  }).join('');
  const names=G.order.map(id=>G.colors[id]).join('');
  return`<div class="bd" data-kind="checkers">${cells}</div><div class="felt-meta">${G.myColor?`Kamu: ${G.myColor==='w'?'Putih':'Hitam'} · `:''}${G.mustFrom!==null&&mt?'Lanjutkan makan!':'Makan wajib'}</div>`;
}
export function hand(G){return`<div class="actions"><button class="btn sm bad" data-act="resign">🏳 Menyerah</button></div>`}
export function hint(G){return G.mustFrom!==null?'Lanjutkan makan dengan bidak yang sama':G.myMoves.some(m=>m.cap!==null)?'Kamu wajib makan':'Pilih bidak lalu kotak tujuan'}
