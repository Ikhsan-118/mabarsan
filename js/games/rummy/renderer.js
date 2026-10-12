import {S,myTurn,pName} from '../../state.js';
import {esc} from '../../util.js';
import {SUITS} from '../shared/cards.js';
import {card} from '../../ui/cards.js';
export const unit='poin',seatUnit='kartu';
export function table(G){
  return`<div class="piles"><button class="pile" data-act="rStock" aria-label="Ambil dari stock"><div class="pc back"></div>STOCK ${G.stock}</button>
  <div class="pile" data-act="rPile" data-drop="discard" role="button" tabindex="0" aria-label="Tumpukan buang">${G.top?card(G.top):'<div class="pc empty"></div>'}BUANG</div></div>
  <div class="melds">${G.melds.length?G.melds.map(m=>`<div class="meld" data-act="rLay" data-id="${m.id}" data-drop="meld:${m.id}" title="Tempel kartu terpilih">${m.cards.map(c=>card(c,'sm')).join('')}<small>${m.type==='set'?'SET':'RUN'} · ${esc(pName(m.owner))}</small></div>`).join(''):'<span class="hint">Belum ada meld di meja</span>'}</div>`;
}
function sortedHand(G){
  const h=G.myHand.slice();
  if(S.sortMode==='rank')h.sort((a,b)=>a.n-b.n||SUITS.indexOf(a.s)-SUITS.indexOf(b.s));
  else if(S.sortMode==='suit')h.sort((a,b)=>SUITS.indexOf(a.s)-SUITS.indexOf(b.s)||a.n-b.n);
  return h;
}
export function hand(G){
  const mt=myTurn();
  const cards=sortedHand(G).map(c=>card(c,S.sel.has(c.id)?'sel':'',`data-act="rCard" data-id="${c.id}" draggable="true" data-drag="card:${c.id}"`)).join('');
  const n=S.sel.size;
  return`<div class="hand">${cards||'<span class="hint">Kartu habis</span>'}</div>
  <div class="actions"><button class="btn sm" data-act="rMeld" ${mt&&G.phase==='play'&&n>=3?'':'disabled'}>Meld (${n})</button>
  <button class="btn sm bad" data-act="rDiscardBtn" ${mt&&G.phase==='play'&&n===1?'':'disabled'}>Discard</button>
  <button class="btn sm ghost" data-act="rSort">Urutkan: ${S.sortMode==='rank'?'angka':S.sortMode==='suit'?'jenis':'asli'}</button></div>`;
}
export function hint(G){return G.phase==='draw'?'Ambil kartu: klik STOCK atau tumpukan BUANG':'Susun meld, tempel ke meld, lalu buang 1 kartu'}
