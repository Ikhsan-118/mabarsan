import {shuffle} from '../shared/shuffle.js';
import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {SUITS,buildDeck} from '../shared/cards.js';
class RummyTurnManager extends TurnManager{}
class RummyDeck{
  constructor(){this.cards=buildDeck()}
}
class RummyPlayer{constructor(id,name){this.id=id;this.name=name;this.hand=[]}}
class RummyScoreManager{
  constructor(rules){this.rules=rules}
  value(c){return c.n===1?this.rules.aceValue:c.n>=11?this.rules.faceValue:c.n}
  handValue(h){return h.reduce((s,c)=>s+this.value(c),0)}
  round(players,winner){const r={};players.forEach(p=>r[p.id]=0);if(winner)r[winner]=players.filter(p=>p.id!==winner).reduce((s,p)=>s+this.handValue(p.hand),0);return r}
}
class RummyMeldValidator{
  constructor(rules){this.rules=rules}
  validate(cards){
    const R=this.rules;
    if(cards.length<R.minMeld)return{ok:false};
    if(cards.every(c=>c.r===cards[0].r)){
      const suits=new Set(cards.map(c=>c.s));
      if(cards.length<=4&&suits.size===cards.length)return{ok:true,type:'set',cards:cards.slice().sort((a,b)=>SUITS.indexOf(a.s)-SUITS.indexOf(b.s))};
      return{ok:false};
    }
    if(cards.every(c=>c.s===cards[0].s)){
      const fns=[];if(R.aceLow)fns.push(c=>c.n);if(R.aceHigh)fns.push(c=>c.n===1?14:c.n);
      for(const f of fns){
        const s=cards.slice().sort((a,b)=>f(a)-f(b));
        if(s.every((c,i)=>i===0||f(c)===f(s[i-1])+1))return{ok:true,type:'run',cards:s};
      }
    }
    return{ok:false};
  }
}
export class RummyGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='rummy';this.validator=new RummyMeldValidator(rules);this.score=new RummyScoreManager(rules);
    this.players=players.map(p=>new RummyPlayer(p.id,p.name));
    this.stock=new RummyDeck().cards;
    const hs=rules.handSize[this.players.length]||7;
    this.players.forEach(p=>{for(let i=0;i<hs;i++)p.hand.push(this.stock.pop())});
    this.discard=[this.stock.pop()];this.melds=[];this.meldSeq=0;
    this.turn=new RummyTurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=crypto.getRandomValues(new Uint32Array(1))[0]%this.players.length;
    this.phase='draw';this.drewDiscard=null;this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  refill(){
    if(this.stock.length||!this.rules.reshuffle||this.discard.length<2)return;
    const top=this.discard.pop();this.stock=shuffle(this.discard.splice(0));this.discard=[top];
  }
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid);
    if(a.type==='draw'){
      if(this.phase!=='draw')return no('Kamu sudah mengambil kartu. Susun meld atau buang kartu.');
      if(a.source==='discard'){
        if(!this.discard.length)return no('Tumpukan buang kosong.');
        const c=this.discard.pop();p.hand.push(c);this.drewDiscard=c.id;
      }else{
        this.refill();
        if(!this.stock.length)return this.finish('stalemate');
        p.hand.push(this.stock.pop());this.drewDiscard=null;
      }
      this.phase='play';return OK;
    }
    if(this.phase!=='play')return no('Ambil kartu dulu dari stock atau tumpukan buang.');
    const pick=ids=>{
      if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)return null;
      const cs=ids.map(id=>p.hand.find(c=>c.id===id));return cs.some(c=>!c)?null:cs;
    };
    const take=cs=>{p.hand=p.hand.filter(c=>!cs.includes(c))};
    if(a.type==='meld'){
      const cs=pick(a.cards);if(!cs)return no('Kartu tidak valid.');
      const v=this.validator.validate(cs);if(!v.ok)return no('Kombinasi bukan set (3-4 angka sama, beda jenis) atau run (3+ berurutan, jenis sama).');
      take(cs);this.melds.push({id:'m'+(++this.meldSeq),type:v.type,cards:v.cards,owner:pid});
      if(!p.hand.length&&this.rules.goOutWithoutDiscard)return this.finish('out',pid);
      return OK;
    }
    if(a.type==='layoff'){
      const cs=pick(a.cards),m=this.melds.find(x=>x.id===a.meldId);
      if(!cs||!m)return no('Kartu atau meld tidak valid.');
      const v=this.validator.validate(m.cards.concat(cs));if(!v.ok)return no('Kartu itu tidak cocok dengan meld tersebut.');
      take(cs);m.cards=v.cards;m.type=v.type;
      if(!p.hand.length&&this.rules.goOutWithoutDiscard)return this.finish('out',pid);
      return OK;
    }
    if(a.type==='discard'){
      const c=p.hand.find(x=>x.id===a.card);if(!c)return no('Kartu tidak ada di tanganmu.');
      if(this.rules.noRediscardDrawn&&c.id===this.drewDiscard)return no('Kartu yang baru diambil dari tumpukan buang tidak boleh langsung dibuang lagi.');
      take([c]);this.discard.push(c);
      if(!p.hand.length)return this.finish('out',pid);
      this.phase='draw';this.drewDiscard=null;this.turn.next();return OK;
    }
    return no('Aksi tidak dikenal.');
  }
  finish(reason,w){
    this.finished=true;let winner=w||null;
    if(reason==='stalemate'){
      const s=this.players.map(p=>[p.id,this.score.handValue(p.hand)]).sort((x,y)=>x[1]-y[1]);
      winner=(s.length>1&&s[0][1]===s[1][1])?null:s[0][0];
    }
    this.result={winner,reason,scores:this.score.round(this.players,winner),
      left:Object.fromEntries(this.players.map(p=>[p.id,this.score.handValue(p.hand)])),hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand]))};
    return OK;
  }
  /* Cari satu kombinasi valid dari kartu (set dulu, lalu run). Dipakai autoplay/bot. */
  findMeld(hand){
    const R=this.rules,byRank={},bySuit={};
    hand.forEach(c=>{(byRank[c.r]=byRank[c.r]||[]).push(c);(bySuit[c.s]=bySuit[c.s]||[]).push(c)});
    for(const r in byRank){const g=byRank[r];if(g.length>=R.minMeld){const cs=g.slice(0,4);if(this.validator.validate(cs).ok)return cs}}
    for(const s in bySuit){
      const g=bySuit[s];
      for(const f of [c=>c.n,c=>c.n===1?14:c.n]){
        const sorted=g.slice().sort((a,b)=>f(a)-f(b));let run=[];
        for(const c of sorted){
          if(run.length&&f(c)===f(run[run.length-1])+1)run.push(c);else run=[c];
          if(run.length>=R.minMeld&&this.validator.validate(run).ok)return run.slice();
        }
      }
    }
    return null;
  }
  autoPlay(){
    const pid=this.turn.current,p=this.P(pid);
    if(this.phase==='draw'){const r=this.act(pid,{type:'draw',source:'stock'});if(this.finished||!r.ok)return r}
    // 1) turunkan semua meld yang bisa (selama masih menyisakan >=1 kartu untuk dibuang, kecuali go-out)
    for(let guard=0;guard<10;guard++){
      const m=this.findMeld(p.hand);if(!m)break;
      const r=this.act(pid,{type:'meld',cards:m.map(c=>c.id)});if(this.finished||!r.ok)return r;
    }
    // 2) tempel kartu ke meld yang sudah ada
    for(let guard=0;guard<10;guard++){
      let done=false;
      for(const c of p.hand.slice()){
        const m=this.melds.find(x=>this.validator.validate(x.cards.concat([c])).ok);
        if(m){const r=this.act(pid,{type:'layoff',cards:[c.id],meldId:m.id});if(this.finished||!r.ok)return r;done=true;break}
      }
      if(!done)break;
    }
    // 3) buang kartu bernilai tertinggi
    const cand=p.hand.filter(c=>c.id!==this.drewDiscard).sort((a,b)=>this.score.value(b)-this.score.value(a));
    return this.act(pid,{type:'discard',card:(cand[0]||p.hand[0]).id});
  }
  view(pid){
    const p=this.P(pid);
    return{kind:'rummy',order:this.players.map(x=>x.id),myHand:p?p.hand:[],counts:Object.fromEntries(this.players.map(x=>[x.id,x.hand.length])),
      stock:this.stock.length,top:this.discard[this.discard.length-1]||null,melds:this.melds,phase:this.phase,current:this.turn.current,
      drewDiscard:this.drewDiscard,finished:this.finished,result:this.result,turnNo:this.turn.turnNo};
  }
}
