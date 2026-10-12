import {S,myTurn} from '../../state.js';
import {card} from '../../ui/cards.js';
export const unit='nilai',seatUnit='kartu',leftLabel='nilai tangan';
export const why=r=>({'forty-one':'Mencapai 41!',knock:'Setelah ketukan — nilai tertinggi menang',stock:'Stock habis — nilai tertinggi menang'}[r.reason]||'');
export function table(G){
  return`<div class="piles"><button class="pile" data-act="dStock" aria-label="Ambil dari stock"><div class="pc back"></div>STOCK ${G.stock}</button>
  <div class="pile" data-act="dPile" role="button" tabindex="0" aria-label="Tumpukan buang">${G.top?card(G.top):'<div class="pc empty"></div>'}BUANG</div></div>
  ${G.knocker?'<div class="row" style="justify-content:center"><span class="chip">✋ Sudah ada yang mengetuk — giliran terakhir</span></div>':''}`;
}
export function hand(G){
  const mt=myTurn(),n=S.sel.size;
  const cards=G.myHand.map(c=>card(c,S.sel.has(c.id)?'sel':'',`data-act="dCard" data-id="${c.id}"`)).join('');
  return`<div class="hand">${cards}</div><div class="actions"><span class="chip">Nilai tanganmu: <b>${G.myValue}</b>/41</span>
  <button class="btn sm bad" data-act="dDiscard" ${mt&&G.phase==='discard'&&n===1?'':'disabled'}>Buang kartu</button>
  ${G.canKnock?'<button class="btn sm sec" data-act="dKnock">✋ Ketuk</button>':''}</div>`;
}
export function hint(G){return G.phase==='draw'?'Ambil dari STOCK atau tumpukan BUANG':'Pilih 1 kartu lalu Buang'}
