import {S,myTurn} from '../../state.js';
import {domTile} from '../../ui/cards.js';
export const unit='pip',seatUnit='ubin';
export function table(G){
  const b=G.board;let inner;
  if(!b.length)inner=`<div class="startmsg">${myTurn()?'Kamu jalan duluan! Mainkan':'Menunggu pemain memainkan'} <b>${G.startTile.replace('-','|')}</b></div><div class="dz one" data-drop="R">TARUH DI SINI</div>`;
  else inner=`<div class="dz" data-drop="L">◀</div>${b.map(t=>domTile(t.l,t.r,t.l===t.r,34)).join('')}<div class="dz" data-drop="R">▶</div>`;
  return`<div class="board">${inner}</div><div class="felt-meta">Ubin tidur: ${G.sleeping} · Pass beruntun: ${G.passStreak}</div>`;
}
export function hand(G){
  const mt=myTurn(),mv=G.myMoves;
  const tiles=G.myHand.map(t=>{
    const can=mt&&mv.some(m=>m.id===t.id);
    return domTile(t.a,t.b,true,40,'button',`data-act="domClick" data-id="${t.id}" ${can?'draggable="true" data-drag="dom:'+t.id+'"':''} aria-label="Ubin ${t.a}-${t.b}"`).replace('class="dom v"',`class="dom v ${can?'playable':''} ${S.pick===t.id?'pick':''}"`);
  }).join('');
  let extra='';
  if(S.pick&&mt){const e=G.ends;extra=`<div class="actions"><span class="hint">Taruh di sisi mana?</span><button class="btn sm" data-act="domSide" data-side="L">◀ Kiri (${e.l})</button><button class="btn sm" data-act="domSide" data-side="R">Kanan (${e.r}) ▶</button></div>`}
  if(mt&&!mv.length)extra=`<div class="actions"><button class="btn bad" data-act="domPass">Pass / Lewat</button></div>`;
  return`<div class="hand">${tiles||'<span class="hint">Kartu habis</span>'}</div>${extra}`;
}
export function hint(G){return G.myMoves.length?'Pilih ubin yang menyala (atau seret ke meja)':'Tidak ada ubin cocok — tekan Pass'}
