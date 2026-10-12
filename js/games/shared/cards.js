// Utilitas kartu bersama. Hanya operasi umum, tanpa aturan khusus game.
import {shuffle} from './shuffle.js';
export const RANKS=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
export const SUITS=['s','h','d','c'];
export const SUIT_SYM={s:'♠',h:'♥',d:'♦',c:'♣',x:'★'};
export const SUIT_NAME={s:'Sekop',h:'Hati',d:'Wajik',c:'Keriting'};
export function buildDeck(){const cards=[];SUITS.forEach(s=>RANKS.forEach((r,i)=>cards.push({id:r+s,r,s,n:i+1})));return shuffle(cards)}
export const bySuitThen=(power)=>(a,b)=>SUITS.indexOf(a.s)-SUITS.indexOf(b.s)||power(a)-power(b);
