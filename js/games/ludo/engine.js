import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {randInt,pick} from '../shared/rand.js';

/* progress token: -1 = kandang, 0..50 jalur luar (abs=(start+p)%52), 51..55 lorong rumah, 56 = tujuan */
export const absPos=(rules,colorIdx,p)=>(rules.starts[colorIdx]+p)%rules.trackLen;
export class LudoGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='ludo';this.moveNo=0;
    this.players=players.map((p,i)=>({id:p.id,name:p.name,color:players.length===2?i*2:i,tokens:Array(rules.tokens).fill(-1)}));
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=randInt(this.players.length);
    this.rolled=null;this.sixes=0;this.lastRoll=null;this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  legalTokens(p,v){
    const R=this.rules,out=[];
    p.tokens.forEach((t,i)=>{
      if(t===-1){if(v===6)out.push(i)}
      else if(t<R.goal&&t+v<=R.goal)out.push(i);
    });
    return out;
  }
  legal(pid){const p=this.P(pid);return p&&!this.finished&&pid===this.turn.current&&this.rolled?this.legalTokens(p,this.rolled):[]}
  nextTurn(extra){
    this.rolled=null;
    if(extra){this.turn.jump(this.turn.current)}else{this.sixes=0;this.turn.next()}
  }
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid),R=this.rules;
    if(a.type==='roll'){
      if(this.rolled)return no('Dadu sudah dilempar. Pilih pion.');
      const v=1+randInt(6);this.moveNo++;
      if(v===6)this.sixes++;
      if(v===6&&this.sixes>=R.maxSixes){this.lastRoll={pid,v,note:'Tiga angka 6 beruntun — giliran hangus'};this.nextTurn(false);return OK}
      const legal=this.legalTokens(p,v);
      if(!legal.length){this.lastRoll={pid,v,note:'Tidak ada pion yang bisa jalan'};this.nextTurn(false);return OK}
      this.rolled=v;this.lastRoll={pid,v,note:''};return OK;
    }
    if(a.type==='move'){
      if(!this.rolled)return no('Lempar dadu dulu.');
      const i=a.token;if(!this.legalTokens(p,this.rolled).includes(i))return no('Pion itu tidak bisa jalan.');
      const v=this.rolled;let t=p.tokens[i];t=t===-1?0:t+v;p.tokens[i]=t;this.moveNo++;
      // makan: hanya di jalur luar dan kotak tidak aman
      if(t<=50){
        const abs=absPos(R,p.color,t);
        if(!R.safe.includes(abs))this.players.forEach(o=>{if(o===p)return;o.tokens.forEach((ot,k)=>{if(ot>=0&&ot<=50&&absPos(R,o.color,ot)===abs)o.tokens[k]=-1})});
      }
      if(p.tokens.every(x=>x===R.goal))return this.finish(pid);
      this.nextTurn(v===6);return OK;
    }
    return no('Aksi tidak dikenal.');
  }
  remaining(p){return p.tokens.reduce((s,t)=>s+(t===-1?this.rules.goal+1:this.rules.goal-t),0)}
  finish(w){
    this.finished=true;
    const left=Object.fromEntries(this.players.map(p=>[p.id,this.remaining(p)]));
    const sc=Object.fromEntries(this.players.map(p=>[p.id,0]));sc[w]=this.players.filter(p=>p.id!==w).reduce((s,p)=>s+left[p.id],0);
    this.result={winner:w,reason:'out',scores:sc,left,hands:{}};return OK;
  }
  autoPlay(){
    const pid=this.turn.current,p=this.P(pid),R=this.rules;
    if(!this.rolled){const r=this.act(pid,{type:'roll'});if(!r.ok||this.turn.current!==pid||!this.rolled||this.finished)return r}
    const legal=this.legalTokens(p,this.rolled);
    const score=i=>{
      const t=p.tokens[i],nt=t===-1?0:t+this.rolled;let s=nt;
      if(nt===R.goal)s+=200;
      if(t===-1)s+=100;
      if(nt<=50){const abs=absPos(R,p.color,nt);
        if(!R.safe.includes(abs)&&this.players.some(o=>o!==p&&o.tokens.some(ot=>ot>=0&&ot<=50&&absPos(R,o.color,ot)===abs)))s+=150;
        if(R.safe.includes(abs))s+=20}
      return s;
    };
    legal.sort((a,b)=>score(b)-score(a));
    return this.act(pid,{type:'move',token:legal[0]});
  }
  view(pid){
    return{kind:'ludo',order:this.players.map(x=>x.id),tokens:Object.fromEntries(this.players.map(p=>[p.id,p.tokens.slice()])),
      colors:Object.fromEntries(this.players.map(p=>[p.id,p.color])),rolled:this.rolled,lastRoll:this.lastRoll,
      myLegal:this.legal(pid),canRoll:!this.finished&&pid===this.turn.current&&!this.rolled,
      counts:Object.fromEntries(this.players.map(p=>[p.id,p.tokens.filter(t=>t===this.rules.goal).length])),
      current:this.turn.current,finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
