import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {SUITS,SUIT_NAME,buildDeck} from '../shared/cards.js';

class CangkulanPlayer{constructor(id,name){this.id=id;this.name=name;this.hand=[]}}

export class CangkulanScoreManager{
  constructor(rules){this.rules=rules}
  power(c){return c.n===1&&this.rules.aceHigh?14:c.n}
  value(c){return c.n===1?this.rules.aceValue:c.n>=11?this.rules.faceValue:c.n}
  handValue(h){return h.reduce((s,c)=>s+this.value(c),0)}
  round(players,winner){const r={};players.forEach(p=>r[p.id]=0);if(winner)r[winner]=players.filter(p=>p.id!==winner).reduce((s,p)=>s+this.handValue(p.hand),0);return r}
}

export class CangkulanGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='cangkulan';this.score=new CangkulanScoreManager(rules);
    this.players=players.map(p=>new CangkulanPlayer(p.id,p.name));
    this.stock=buildDeck();
    this.players.forEach(p=>{for(let i=0;i<rules.handSize;i++)p.hand.push(this.stock.pop())});
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=crypto.getRandomValues(new Uint32Array(1))[0]%this.players.length;
    this.lead=null;this.plays=[];this.passed=[];this.trickNo=1;this.lastTrick=null;
    this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  hasLead(p){return this.lead&&p.hand.some(c=>c.s===this.lead)}
  canDraw(pid){const p=this.P(pid);return !!p&&!this.finished&&pid===this.turn.current&&!!this.lead&&!this.hasLead(p)&&this.stock.length>0}
  canPass(pid){const p=this.P(pid);return !!p&&!this.finished&&pid===this.turn.current&&!!this.lead&&!this.hasLead(p)&&this.stock.length===0}
  playable(pid){
    const p=this.P(pid);if(!p||this.finished||pid!==this.turn.current)return[];
    return (this.lead?p.hand.filter(c=>c.s===this.lead):p.hand).map(c=>c.id);
  }
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid);
    if(a.type==='draw'){
      if(!this.lead)return no('Kamu jalan duluan. Mainkan satu kartu.');
      if(this.hasLead(p))return no('Kamu masih punya jenis '+SUIT_NAME[this.lead]+'. Mainkan kartu itu.');
      if(!this.stock.length)return no('Stock habis. Tekan Pass.');
      p.hand.push(this.stock.pop());return OK;
    }
    if(a.type==='pass'){
      if(!this.lead)return no('Kamu jalan duluan. Mainkan satu kartu.');
      if(this.hasLead(p))return no('Kamu masih punya jenis '+SUIT_NAME[this.lead]+'.');
      if(this.stock.length)return no('Stock belum habis. Cangkul dulu.');
      this.passed.push(pid);return this.advance();
    }
    if(a.type==='play'){
      const c=p.hand.find(x=>x.id===a.card);if(!c)return no('Kartu tidak ada di tanganmu.');
      if(this.lead&&c.s!==this.lead){
        return no(this.hasLead(p)?'Wajib mengikuti jenis '+SUIT_NAME[this.lead]+'.':'Kamu tidak punya jenis '+SUIT_NAME[this.lead]+'. Cangkul dari stock.');
      }
      p.hand=p.hand.filter(x=>x!==c);
      if(!this.lead)this.lead=c.s;
      this.plays.push({pid,card:c});
      if(!p.hand.length)return this.finish('out',pid);
      return this.advance();
    }
    return no('Aksi tidak dikenal.');
  }
  advance(){
    if(this.plays.length+this.passed.length<this.players.length){this.turn.next();return OK}
    const win=this.plays.filter(x=>x.card.s===this.lead).sort((x,y)=>this.score.power(y.card)-this.score.power(x.card))[0];
    this.lastTrick={plays:this.plays,winner:win.pid,no:this.trickNo};
    this.trickNo++;this.lead=null;this.plays=[];this.passed=[];
    this.turn.jump(win.pid);return OK;
  }
  finish(reason,w){
    this.finished=true;
    this.result={winner:w||null,reason,scores:this.score.round(this.players,w),
      left:Object.fromEntries(this.players.map(p=>[p.id,this.score.handValue(p.hand)])),hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand]))};
    return OK;
  }
  autoPlay(){
    const pid=this.turn.current,p=this.P(pid);
    const low=cs=>cs.slice().sort((a,b)=>this.score.power(a)-this.score.power(b))[0];
    if(!this.lead)return this.act(pid,{type:'play',card:low(p.hand).id});
    while(!this.hasLead(p)&&this.stock.length){const r=this.act(pid,{type:'draw'});if(!r.ok)return r}
    if(!this.hasLead(p))return this.act(pid,{type:'pass'});
    return this.act(pid,{type:'play',card:low(p.hand.filter(c=>c.s===this.lead)).id});
  }
  view(pid){
    const p=this.P(pid);
    const hand=p?p.hand.slice().sort((a,b)=>SUITS.indexOf(a.s)-SUITS.indexOf(b.s)||this.score.power(a)-this.score.power(b)):[];
    return{kind:'cangkulan',order:this.players.map(x=>x.id),myHand:hand,myPlayable:this.playable(pid),
      canDraw:this.canDraw(pid),canPass:this.canPass(pid),
      counts:Object.fromEntries(this.players.map(x=>[x.id,x.hand.length])),stock:this.stock.length,
      lead:this.lead,plays:this.plays,passed:this.passed,lastTrick:this.lastTrick,trickNo:this.trickNo,
      current:this.turn.current,finished:this.finished,result:this.result,turnNo:this.turn.turnNo};
  }
}
