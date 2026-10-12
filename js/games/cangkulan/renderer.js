import {myTurn,pName} from '../../state.js';
import {esc} from '../../util.js';
import {SUIT_SYM,SUIT_NAME} from '../shared/cards.js';
import {card} from '../../ui/cards.js';
export const unit='poin',seatUnit='kartu';
export function table(G){
  const plays=G.plays.map(x=>`<div class="tplay">${card(x.card,'sm')}<small>${esc(pName(x.pid))}</small></div>`).join('');
  const passed=G.passed.length?`<div class="felt-meta">Pass: ${G.passed.map(id=>esc(pName(id))).join(', ')}</div>`:'';
  return`<div class="piles"><button class="pile" data-act="cDraw" aria-label="Cangkul dari stock"><div class="pc back ${G.canDraw?'playable':''}"></div>STOCK ${G.stock}</button>
  <div class="trick"><span class="chip">${G.lead?'Jenis: '+SUIT_SYM[G.lead]+' '+SUIT_NAME[G.lead]:'Trik baru — pembuka bebas'}</span>
  <div class="tplays">${plays||'<span class="hint">Belum ada kartu di meja</span>'}</div></div></div>${passed}
  ${G.lastTrick?`<div class="felt-meta">Trik #${G.lastTrick.no}: ${esc(pName(G.lastTrick.winner))} menang</div>`:''}`;
}
export function hand(G){
  const mt=myTurn(),ok=new Set(G.myPlayable);
  const cards=G.myHand.map(c=>card(c,mt?(ok.has(c.id)?'playable':'dim'):'',`data-act="cPlay" data-id="${c.id}"`)).join('');
  const acts=(G.canDraw?'<button class="btn sm" data-act="cDraw">Cangkul (ambil stock)</button>':'')+(G.canPass?'<button class="btn sm bad" data-act="cPass">Pass</button>':'');
  return`<div class="hand">${cards||'<span class="hint">Kartu habis</span>'}</div>${acts?`<div class="actions">${acts}</div>`:''}`;
}
export function hint(G){
  if(G.canDraw)return'Tidak punya jenis '+SUIT_NAME[G.lead]+' — cangkul dari stock';
  if(G.canPass)return'Stock habis dan tidak punya jenis itu — Pass';
  return G.lead?'Ikuti jenis '+SUIT_NAME[G.lead]+' (kartu menyala)':'Kamu jalan duluan: buang kartu apa saja';
}
