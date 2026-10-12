import {S,myTurn} from '../../state.js';
import {card} from '../../ui/cards.js';
export const unit='poin',seatUnit='kartu',leftLabel='sisa';
export const why=r=>({close:'TUTUP! Semua kartu tersusun (skor ×2)',stock:'Stock habis — nilai tangan terkecil menang'}[r.reason]||'');
export function table(G){
  return`<div class="piles"><button class="pile" data-act="dStock" aria-label="Ambil dari stock"><div class="pc back"></div>STOCK ${G.stock}</button>
  <div class="pile" data-act="dPile" role="button" tabindex="0" aria-label="Tumpukan buang">${G.top?card(G.top):'<div class="pc empty"></div>'}BUANG</div></div>
  <div class="felt-meta">Joker ★ = kartu bebas · Tutup saat 7 kartu sisa habis jadi set/run</div>`;
}
export function hand(G){
  const mt=myTurn(),n=S.sel.size,sel=[...S.sel][0];
  const close=new Set(G.closeIds);
  const cards=G.myHand.map(c=>card(c,(S.sel.has(c.id)?'sel ':'')+(close.has(c.id)?'playable':''),`data-act="dCard" data-id="${c.id}"`)).join('');
  return`<div class="hand">${cards}</div><div class="actions">
  <button class="btn sm bad" data-act="dDiscard" ${mt&&G.phase==='discard'&&n===1?'':'disabled'}>Buang kartu</button>
  <button class="btn sm sec" data-act="dClose" ${mt&&G.phase==='discard'&&n===1&&close.has(sel)?'':'disabled'}>🏁 TUTUP</button></div>
  ${close.size?`<p class="hint" style="text-align:center">Kartu menyala = jika dibuang, kamu bisa TUTUP sekarang!</p>`:''}`;
}
export function hint(G){return G.phase==='draw'?'Ambil dari STOCK atau tumpukan BUANG':'Buang 1 kartu, atau TUTUP kalau sudah bisa'}
