import {S,myTurn,pName} from '../../state.js';
import {esc} from '../../util.js';
export const unit='materi',seatUnit='bidak',leftLabel='materi';
export const why=r=>({checkmate:'Skakmat!',stalemate:'Stalemate — seri',resign:'Lawan menyerah',agreement:'Seri atas kesepakatan',repetition:'Seri: posisi berulang 3x',fifty:'Seri: aturan 50 langkah',insufficient:'Seri: materi tidak cukup'}[r.reason]||'');
// Paksa tampilan teks (\uFE0E) agar tidak berubah jadi emoji berwarna. Pion digambar SVG karena ♟ paling sering jadi emoji hitam.
const GL={k:'♚\uFE0E',q:'♛\uFE0E',r:'♜\uFE0E',b:'♝\uFE0E',n:'♞\uFE0E'};
const PAWN='<svg viewBox="0 0 45 45" aria-hidden="true"><path stroke-width="1.8" stroke-linejoin="round" d="M22.5 8a5.5 5.5 0 0 0-3.2 10c-3 1.6-5.3 4.7-5.3 9.2 0 2 .6 3.6 1.6 4.8H11v4h23v-4h-4.6c1-1.2 1.6-2.8 1.6-4.8 0-4.5-2.3-7.6-5.3-9.2A5.5 5.5 0 0 0 22.5 8z"/></svg>';
const glyph=p=>p.toLowerCase()==='p'?PAWN:GL[p.toLowerCase()];
export function table(G){
  const flip=G.myColor==='b',idx=[...Array(64).keys()];if(flip)idx.reverse();
  const mt=myTurn(),from=S.pickSq;
  const targets=new Set(from!==null?G.myMoves.filter(m=>m.from===from).map(m=>m.to):[]);
  const movable=new Set(G.myMoves.map(m=>m.from));
  const cells=idx.map(i=>{
    const r=i>>3,c=i&7,dark=(r+c)%2===1,p=G.board[i];
    const cls=['sq',dark?'dark':'light',i===from?'sel':'',targets.has(i)?(p?'target cap':'target'):'',G.last&&(G.last.from===i||G.last.to===i)?'last':'',mt&&movable.has(i)&&from===null?'movable':''].join(' ');
    const piece=p?`<span class="cs ${p===p.toUpperCase()?'cw':'cb'}">${glyph(p)}</span>`:'';
    const file=(flip?(7-(i&7)):(i&7)),showF=(flip?(i>>3)===0:(i>>3)===7),showR=(flip?(i&7)===7:(i&7)===0);
    const drag=mt&&movable.has(i)?` draggable="true" data-drag="sq:${i}"`:'';
    return`<button class="${cls}" data-act="chSq" data-i="${i}" data-drop="sq:${i}"${drag} aria-label="${'abcdefgh'[c]}${8-r}${p?' '+p:''}">${piece}${showF?`<i class="cf">${'abcdefgh'[c]}</i>`:''}${showR?`<i class="cr">${8-r}</i>`:''}</button>`;
  }).join('');
  let promo='';
  if(S.promo&&mt)promo=`<div class="actions"><span class="hint">Promosi ke:</span>${[['q','♛ Menteri'],['r','♜ Benteng'],['b','♝ Gajah'],['n','♞ Kuda']].map(([k,l])=>`<button class="btn sm" data-act="chPromo" data-p="${k}">${l}</button>`).join('')}</div>`;
  const mover=G.order.find(id=>G.colors[id]===(G.current&&G.colors[G.current]));
  return`<div class="bd" data-kind="chess">${cells}</div>${promo}
  <div class="felt-meta">${G.myColor?`Kamu: ${G.myColor==='w'?'Putih':'Hitam'} · `:''}${G.check?'<b style="color:var(--bad)">SKAK!</b> · ':''}Giliran: ${esc(pName(G.current))} (${G.colors[G.current]==='w'?'Putih':'Hitam'})</div>
  ${G.log.length?`<div class="felt-meta">Langkah: ${G.log.join(' ')}</div>`:''}`;
}
export function hand(G){
  const me=S.me,offer=G.drawOffer;
  let draw='';
  if(!offer)draw='<button class="btn sm ghost" data-act="chDrawOffer">🤝 Tawar seri</button>';
  else if(offer!==me)draw=`<span class="chip">${esc(pName(offer))} menawarkan seri</span><button class="btn sm sec" data-act="chDrawAccept">Terima</button><button class="btn sm ghost" data-act="chDrawDecline">Tolak</button>`;
  else draw='<span class="hint">Tawaran seri terkirim…</span>';
  return`<div class="actions">${draw}<button class="btn sm bad" data-act="resign">🏳 Menyerah</button></div>`;
}
export function hint(G){return G.check?'Skak! Selamatkan rajamu':'Pilih bidak lalu kotak tujuan'}
