import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {SUITS,buildDeck} from '../shared/cards.js';

export class FortyOneGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='forty-one';this.moveNo=0;
    this.players=players.map(p=>({id:p.id,name:p.name,hand:[]}));
    this.stock=buildDeck();
    this.players.forEach(p=>{for(let i=0;i<rules.handSize;i++)p.hand.push(this.stock.pop())});
    this.discard=[this.stock.pop()];
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=crypto.getRandomValues(new Uint32Array(1))[0]%this.players.length;
    this.phase='draw';this.drewDiscard=null;this.knocker=null;this.finalLeft=0;this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  cardVal(c){return c.n===1?this.rules.aceValue:c.n>=11?this.rules.faceValue:c.n}
  /* nilai terbaik: jumlah (maks 4) kartu tertinggi dari satu jenis */
  handValue(h){
    let best=0;
    SUITS.forEach(s=>{const v=h.filter(c=>c.s===s).map(c=>this.cardVal(c)).sort((a,b)=>b-a).slice(0,this.rules.handSize);best=Math.max(best,v.reduce((a,b)=>a+b,0))});
    return best;
  }
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid);
    if(a.type==='draw'){
      if(this.phase!=='draw')return no('Kamu sudah mengambil kartu. Buang 1 kartu.');
      if(a.source==='discard'){
        if(!this.discard.length)return no('Tumpukan buang kosong.');
        const c=this.discard.pop();p.hand.push(c);this.drewDiscard=c.id;
      }else{
        if(!this.stock.length)return this.endCompare('stock');
        p.hand.push(this.stock.pop());this.drewDiscard=null;
      }
      this.moveNo++;
      if(this.handValue(p.hand)>=this.rules.target)return this.finish('forty-one',pid);
      this.phase='discard';return OK;
    }
    if(a.type==='knock'){
      if(this.phase!=='draw')return no('Ketuk hanya bisa sebelum mengambil kartu.');
      if(this.knocker)return no('Sudah ada yang mengetuk.');
      if(this.handValue(p.hand)<this.rules.knockMin)return no('Nilai tanganmu harus minimal '+this.rules.knockMin+' untuk mengetuk.');
      this.knocker=pid;this.finalLeft=this.players.length-1;this.moveNo++;this.turn.next();return OK;
    }
    if(a.type==='discard'){
      if(this.phase!=='discard')return no('Ambil kartu dulu dari stock atau tumpukan buang.');
      const c=p.hand.find(x=>x.id===a.card);if(!c)return no('Kartu tidak ada di tanganmu.');
      if(c.id===this.drewDiscard)return no('Kartu yang baru diambil dari tumpukan buang tidak boleh langsung dibuang lagi.');
      p.hand=p.hand.filter(x=>x!==c);this.discard.push(c);this.phase='draw';this.drewDiscard=null;this.moveNo++;
      if(this.knocker){this.finalLeft--;if(this.finalLeft<=0)return this.endCompare('knock')}
      this.turn.next();return OK;
    }
    return no('Aksi tidak dikenal.');
  }
  endCompare(reason){
    const vals=this.players.map(p=>({id:p.id,v:this.handValue(p.hand)})).sort((a,b)=>b.v-a.v);
    let w=vals[0].id;
    if(vals.length>1&&vals[0].v===vals[1].v){
      if(this.knocker&&vals.filter(x=>x.v===vals[0].v).some(x=>x.id===this.knocker))w=this.knocker;
      else w=null;
    }
    return this.finish(reason,w);
  }
  finish(reason,w){
    this.finished=true;
    const left=Object.fromEntries(this.players.map(p=>[p.id,this.handValue(p.hand)]));
    const sc=Object.fromEntries(this.players.map(p=>[p.id,0]));
    if(w)sc[w]=this.players.filter(p=>p.id!==w).reduce((s,p)=>s+Math.max(0,left[w]-left[p.id]),0);
    this.result={winner:w||null,reason,scores:sc,left,hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand]))};return OK;
  }
  autoPlay(){
    const pid=this.turn.current,p=this.P(pid);
    if(this.phase==='draw'){
      if(!this.knocker&&this.handValue(p.hand)>=36)return this.act(pid,{type:'knock'});
      const top=this.discard[this.discard.length-1];
      let src='stock';
      if(top){const sim=p.hand.concat([top]);const gain=Math.max(...sim.map((_,i)=>this.handValue(sim.filter((_,j)=>j!==i))));if(gain>this.handValue(p.hand))src='discard'}
      const r=this.act(pid,{type:'draw',source:src});if(this.finished||!r.ok)return r;
    }
    let bestC=null,bestV=-1;
    p.hand.filter(c=>c.id!==this.drewDiscard).forEach(c=>{const v=this.handValue(p.hand.filter(x=>x!==c));if(v>bestV){bestV=v;bestC=c}});
    return this.act(pid,{type:'discard',card:(bestC||p.hand[0]).id});
  }
  view(pid){
    const p=this.P(pid);
    return{kind:'forty-one',order:this.players.map(x=>x.id),myHand:p?p.hand.slice().sort((a,b)=>SUITS.indexOf(a.s)-SUITS.indexOf(b.s)||b.n-a.n):[],
      myValue:p?this.handValue(p.hand):0,counts:Object.fromEntries(this.players.map(x=>[x.id,x.hand.length])),stock:this.stock.length,
      top:this.discard[this.discard.length-1]||null,phase:this.phase,drewDiscard:this.drewDiscard,knocker:this.knocker,
      canKnock:!!p&&!this.finished&&pid===this.turn.current&&this.phase==='draw'&&!this.knocker&&this.handValue(p.hand)>=this.rules.knockMin,
      current:this.turn.current,finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
