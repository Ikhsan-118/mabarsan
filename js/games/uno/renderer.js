import {S,myTurn} from '../../state.js';
import {unoCard,UNO_NAME} from '../../ui/cards.js';
export const unit='poin',seatUnit='kartu';
export const why=()=>'Kartu habis lebih dulu';
export function table(G){
  return`<div class="piles"><button class="pile" data-act="unoDraw" aria-label="Ambil kartu"><div class="uc back ${G.canDraw?'playable':''}"><span>UNO</span></div>STOCK ${G.stock}</button>
  <div class="pile">${unoCard(G.top)}TERATAS</div></div>
  <div class="row" style="justify-content:center"><span class="chip color-chip c-${G.color}">Warna: ${UNO_NAME[G.color]}</span><span class="chip">${G.dir===1?'Arah ⟳':'Arah ⟲'}</span></div>`;
}
export function hand(G){
  const mt=myTurn(),ok=new Set(G.myPlayable);
  const cards=G.myHand.map(c=>unoCard(c,mt?(ok.has(c.id)?'playable':'dim'):'',`data-act="unoPlay" data-id="${c.id}"`)).join('');
  let extra='';
  if(S.pickWild&&mt)extra=`<div class="actions"><span class="hint">Pilih warna:</span>${['R','Y','G','B'].map(k=>`<button class="btn sm colorbtn c-${k}" data-act="unoColor" data-c="${k}">${UNO_NAME[k]}</button>`).join('')}</div>`;
  const acts=(G.canDraw?'<button class="btn sm" data-act="unoDraw">Ambil kartu</button>':'')+(G.canPass?'<button class="btn sm bad" data-act="unoPass">Pass</button>':'');
  return`<div class="hand">${cards||'<span class="hint">Kartu habis</span>'}</div>${extra}${acts&&!extra?`<div class="actions">${acts}</div>`:''}`;
}
export function hint(G){
  if(G.canPass)return'Kartu yang diambil cocok — mainkan atau Pass';
  return G.canDraw?'Mainkan kartu menyala, atau ambil dari stock':'Menunggu…';
}
