import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {shuffle} from '../shared/shuffle.js';
import {pick} from '../shared/rand.js';

function buildUnoDeck(colors){
  const d=[];let k=0;
  colors.forEach(c=>{
    d.push({id:c+'0-'+k++,c,v:'0'});
    for(let r=0;r<2;r++){for(let n=1;n<=9;n++)d.push({id:c+n+'-'+k++,c,v:String(n)});['S','REV','D2'].forEach(v=>d.push({id:c+v+'-'+k++,c,v}))}
  });
  for(let i=0;i<4;i++){d.push({id:'W-'+k++,c:'W',v:'W'});d.push({id:'W4-'+k++,c:'W',v:'W4'})}
  return shuffle(d);
}
const cardValue=c=>/^\d$/.test(c.v)?+c.v:c.c==='W'?50:20;

export class UnoGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='uno';this.moveNo=0;
    this.players=players.map(p=>({id:p.id,name:p.name,hand:[]}));
    this.stock=buildUnoDeck(rules.colors);
    this.players.forEach(p=>{for(let i=0;i<rules.handSize;i++)p.hand.push(this.stock.pop())});
    // kartu pembuka harus angka biasa
    let first;do{first=this.stock.pop();if(!/^\d$/.test(first.v))this.stock.unshift(first)}while(!/^\d$/.test(first.v));
    this.discard=[first];this.color=first.c;this.dir=1;this.drawnId=null;
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=crypto.getRandomValues(new Uint32Array(1))[0]%this.players.length;
    this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  get top(){return this.discard[this.discard.length-1]}
  playableCard(c){return c.c==='W'||c.c===this.color||c.v===this.top.v}
  refill(){
    if(this.stock.length||this.discard.length<2)return;
    const t=this.discard.pop();this.stock=shuffle(this.discard.splice(0));this.discard=[t];
  }
  drawN(p,n){for(let i=0;i<n;i++){this.refill();if(!this.stock.length)break;p.hand.push(this.stock.pop())}}
  step(k=1){const n=this.players.length;this.turn.idx=((this.turn.idx+this.dir*k)%n+n)%n;this.turn.turnNo++;this.turn.startedAt=Date.now();this.drawnId=null}
  playable(pid){
    const p=this.P(pid);if(!p||this.finished||pid!==this.turn.current)return[];
    const hand=this.drawnId?p.hand.filter(c=>c.id===this.drawnId):p.hand;
    return hand.filter(c=>this.playableCard(c)).map(c=>c.id);
  }
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid);
    if(a.type==='draw'){
      if(this.drawnId)return no('Kamu sudah mengambil kartu. Mainkan atau Pass.');
      this.refill();if(!this.stock.length){this.moveNo++;this.step();return OK}
      const c=this.stock.pop();p.hand.push(c);this.moveNo++;
      if(this.playableCard(c))this.drawnId=c.id;else this.step();
      return OK;
    }
    if(a.type==='pass'){
      if(!this.drawnId)return no('Ambil kartu dulu.');
      this.moveNo++;this.step();return OK;
    }
    if(a.type==='play'){
      const c=p.hand.find(x=>x.id===a.card);if(!c)return no('Kartu tidak ada di tanganmu.');
      if(this.drawnId&&c.id!==this.drawnId)return no('Setelah mengambil, hanya kartu yang baru diambil yang boleh dimainkan.');
      if(!this.playableCard(c))return no('Kartu harus cocok warna atau angka/aksi.');
      let col=c.c;
      if(c.c==='W'){if(!this.rules.colors.includes(a.color))return no('Pilih warna untuk kartu Wild.');col=a.color}
      p.hand=p.hand.filter(x=>x!==c);this.discard.push(c);this.color=col;this.moveNo++;
      if(!p.hand.length)return this.finish(pid);
      const n=this.players.length;
      if(c.v==='REV'){this.dir*=-1;this.step(n===2?2:1)}
      else if(c.v==='S')this.step(2);
      else if(c.v==='D2'){this.step();this.drawN(this.P(this.turn.current),2);this.step()}
      else if(c.v==='W4'){this.step();this.drawN(this.P(this.turn.current),4);this.step()}
      else this.step();
      return OK;
    }
    return no('Aksi tidak dikenal.');
  }
  finish(w){
    this.finished=true;
    const left=Object.fromEntries(this.players.map(p=>[p.id,p.hand.reduce((s,c)=>s+cardValue(c),0)]));
    const sc=Object.fromEntries(this.players.map(p=>[p.id,0]));sc[w]=this.players.filter(p=>p.id!==w).reduce((s,p)=>s+left[p.id],0);
    this.result={winner:w,reason:'out',scores:sc,left,hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand]))};return OK;
  }
  autoPlay(){
    const pid=this.turn.current,p=this.P(pid);
    const choose=ids=>{
      const cs=p.hand.filter(c=>ids.includes(c.id)),non=cs.filter(c=>c.c!=='W');
      const c=non.length?pick(non):cs[0];
      let color=c.c;
      if(c.c==='W'){const cnt={};p.hand.forEach(x=>{if(x.c!=='W')cnt[x.c]=(cnt[x.c]||0)+1});color=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0]||pick(this.rules.colors)}
      return this.act(pid,{type:'play',card:c.id,color});
    };
    if(this.drawnId){const ok=this.playable(pid);return ok.length?choose(ok):this.act(pid,{type:'pass'})}
    const ok=this.playable(pid);if(ok.length)return choose(ok);
    const r=this.act(pid,{type:'draw'});if(!r.ok||this.finished)return r;
    if(this.turn.current===pid&&this.drawnId)return choose(this.playable(pid));
    return r;
  }
  view(pid){
    const p=this.P(pid);
    return{kind:'uno',order:this.players.map(x=>x.id),myHand:p?p.hand.slice().sort((a,b)=>a.c.localeCompare(b.c)||a.v.localeCompare(b.v)):[],myPlayable:this.playable(pid),
      canDraw:!!p&&!this.finished&&pid===this.turn.current&&!this.drawnId,canPass:!!p&&!this.finished&&pid===this.turn.current&&!!this.drawnId,
      counts:Object.fromEntries(this.players.map(x=>[x.id,x.hand.length])),stock:this.stock.length,top:this.top,color:this.color,dir:this.dir,
      current:this.turn.current,finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
