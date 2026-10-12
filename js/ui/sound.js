// Sound Manager: efek disintesis dengan WebAudio, tanpa file audio.
import {lsGet,lsSet} from '../util.js';
const KEY='mabar_sound';
const cfg=Object.assign({on:true,volume:.6},lsGet(KEY)||{});
let ctx=null;
const SFX={
  click:[[660,.04]],join:[[520,.07],[780,.1]],leave:[[620,.07],[420,.12]],ready:[[600,.06],[900,.08]],
  turn:[[740,.08],[988,.12]],draw:[[330,.05],[440,.05]],discard:[[300,.06]],tile:[[200,.05,'square'],[160,.06,'square']],
  win:[[523,.1],[659,.1],[784,.1],[1047,.25]],lose:[[392,.14],[330,.14],[262,.28]],notify:[[880,.06],[880,.06]],chat:[[1000,.03]]
};
function ac(){if(!ctx){try{ctx=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx}
export function play(name){
  if(!cfg.on||cfg.volume<=0)return;const c=ac();if(!c)return;const seq=SFX[name];if(!seq)return;
  let t=c.currentTime;
  seq.forEach(([f,d,type])=>{
    const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.value=f;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.25*cfg.volume,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d+.05);
    o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+.08);t+=d;
  });
}
export const soundCfg=()=>({...cfg});
export function setSound(p){Object.assign(cfg,p);lsSet(KEY,cfg)}
