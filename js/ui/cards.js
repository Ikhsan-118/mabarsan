// Helper tampilan kartu / ubin / avatar (dipakai semua renderer).
import {esc} from '../util.js';
import {SUIT_SYM} from '../games/shared/cards.js';
export const av=(p,c='')=>`<span class="av ${c}">${esc((p&&p.avatar)||'🙂')}</span>`;
export function halfPips(n){const P=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]][n]||[];let h='';for(let i=0;i<9;i++)h+=`<i class="${P.includes(i)?'on':''}"></i>`;return`<div class="half">${h}</div>`}
export function domTile(l,r,vertical,size,tag='div',attrs=''){return`<${tag} class="dom ${vertical?'v':'h'}" style="--s:${size}px" ${attrs}>${halfPips(l)}${halfPips(r)}</${tag}>`}
export function card(c,cls='',attrs=''){
  const red=c.s==='h'||c.s==='d'?'red':'';
  return`<div class="pc ${red} ${cls}" ${attrs} aria-label="${c.r} ${SUIT_SYM[c.s]}"><span class="tl"><b>${c.r}</b>${SUIT_SYM[c.s]}</span><span class="mid">${SUIT_SYM[c.s]}</span><span class="br"><b>${c.r}</b>${SUIT_SYM[c.s]}</span></div>`;
}
/* Kartu Uno */
export const UNO_LABEL={S:'⊘',REV:'⇄',D2:'+2',W:'★',W4:'+4',...Object.fromEntries('0123456789'.split('').map(d=>[d,d]))};
export const UNO_NAME={R:'Merah',Y:'Kuning',G:'Hijau',B:'Biru',W:'Wild'};
export const unoCard=(c,cls='',attrs='')=>`<div class="uc c-${c.c} ${cls}" ${attrs} aria-label="${UNO_NAME[c.c]} ${UNO_LABEL[c.v]}"><span>${UNO_LABEL[c.v]}</span></div>`;
