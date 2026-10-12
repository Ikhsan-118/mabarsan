import {$} from '../util.js';
export function toast(m){const d=document.createElement('div');d.className='t';d.textContent=m;$('#toast').appendChild(d);setTimeout(()=>d.remove(),3400)}
export function floatReaction(name,e){
  const d=document.createElement('div');d.className='react';d.innerHTML='<span></span><small></small>';
  d.firstChild.textContent=e;d.lastChild.textContent=name;d.style.left=(15+Math.random()*70)+'%';
  document.body.appendChild(d);setTimeout(()=>d.remove(),2300);
}
