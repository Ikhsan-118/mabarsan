import {S,pName} from '../../state.js';
import {esc} from '../../util.js';
import {card} from '../../ui/cards.js';
import {strength,bestArrangement} from './engine.js';
import {CAT_NAME_5,CAT_NAME_3} from './rules.js';
export const simul=true,unit='poin',seatUnit='kartu',leftLabel='skor';
export const why=()=>'Semua baris dibandingkan dengan setiap lawan';
const CAP={front:3,mid:5,back:5},ROWS=[['front','Depan (3)'],['mid','Tengah (5)'],['back','Belakang (5)']];
export function ensure(G){
  const key=G.myHand.map(c=>c.id).join();
  if(!S.capsa||S.capsa.key!==key)S.capsa={key,front:[],mid:[],back:[]};
  return S.capsa;
}
export const placedIds=c=>new Set([...c.front,...c.mid,...c.back]);
export const autoRows=G=>{const b=bestArrangement(G.myHand);return{front:b.front.map(c=>c.id),mid:b.mid.map(c=>c.id),back:b.back.map(c=>c.id)}};
function rowLabel(cards,row){
  if(cards.length!==CAP[row])return'';
  const s=strength(cards);return(row==='front'?CAT_NAME_3:CAT_NAME_5)[s.cat];
}
export function table(G){
  const done=G.done.map(id=>esc(pName(id)));
  let h=`<div class="felt-meta">Sudah menyusun: ${done.length?done.join(', '):'belum ada'} (${G.done.length}/${G.order.length})</div>`;
  if(G.finished&&G.result.rows){
    h+=`<div class="capsa-reveal">`+G.order.map(id=>{const r=G.result.rows[id];return`<div class="cp-player"><b>${esc(pName(id))}</b>${ROWS.map(([k,l])=>`<div class="cp-row"><small>${l.split(' ')[0]} · ${(k==='front'?CAT_NAME_3:CAT_NAME_5)[r.cats[k]]}</small><div class="tplays">${r[k].map(c=>card(c,'sm')).join('')}</div></div>`).join('')}</div>`}).join('')+`</div>`;
  }else h+='<div class="hint" style="text-align:center">Susun 13 kartumu: Belakang ≥ Tengah ≥ Depan</div>';
  return h;
}
export function hand(G){
  if(G.finished)return'';
  const byId=Object.fromEntries(G.myHand.map(c=>[c.id,c]));
  if(G.myRows){
    return`<div class="capsa-rows">${ROWS.map(([k,l])=>`<div class="cp-row"><small>${l} · ${rowLabel(G.myRows[k].map(i=>byId[i]),k)}</small><div class="tplays">${G.myRows[k].map(i=>card(byId[i],'sm')).join('')}</div></div>`).join('')}</div><p class="hint" style="text-align:center">🔒 Susunanmu terkunci. Menunggu pemain lain…</p>`;
  }
  const c=ensure(G),placed=placedIds(c),free=G.myHand.filter(x=>!placed.has(x.id));
  const rows=ROWS.map(([k,l])=>{
    const cs=c[k].map(i=>byId[i]);
    return`<div class="cp-row"><div class="row" style="gap:8px"><small>${l} · ${rowLabel(cs,k)||'…'}</small><button class="btn sm ghost" data-act="cpPut" data-row="${k}" ${S.sel.size&&c[k].length+S.sel.size<=CAP[k]?'':'disabled'}>Taruh di sini</button></div>
    <div class="tplays slots">${cs.map(x=>card(x,'sm',`data-act="cpBack" data-id="${x.id}" title="Kembalikan"`)).join('')}${Array.from({length:CAP[k]-cs.length},()=>'<div class="pc sm empty"></div>').join('')}</div></div>`;
  }).join('');
  const full=placed.size===13;let warn='';
  if(full){const s=k=>strength(c[k].map(i=>byId[i])).key;if(!(s('back')>=s('mid')&&s('mid')>=s('front')))warn='<p class="hint" style="color:var(--bad);text-align:center">Susunan belum valid: Belakang ≥ Tengah ≥ Depan.</p>'}
  return`<div class="capsa-rows">${rows}</div>${warn}
  <div class="hand">${free.map(x=>card(x,S.sel.has(x.id)?'sel':'',`data-act="cpSel" data-id="${x.id}"`)).join('')||'<span class="hint">Semua kartu sudah ditaruh</span>'}</div>
  <div class="actions"><button class="btn sm sec" data-act="cpAuto">✨ Susun otomatis</button><button class="btn sm ghost" data-act="cpReset">Reset</button><button class="btn sm pri" data-act="cpSubmit" ${full?'':'disabled'}>Kunci susunan</button></div>`;
}
export function hint(G){return G.myRows?'Menunggu pemain lain menyusun…':'Pilih kartu → "Taruh di sini" pada baris. Atau Susun otomatis.'}
