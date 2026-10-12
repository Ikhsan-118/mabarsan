import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {shuffle} from '../shared/shuffle.js';
import {buildDeck} from '../shared/cards.js';

const isJ=c=>!!c.joker;
/* Apakah kumpulan kartu ini 1 meld sah (jumlah >= 3)? */
export function isMeld(cs,minMeld=3){
  if(cs.length<minMeld)return false;
  const real=cs.filter(c=>!isJ(c)),jk=cs.length-real.length;
  if(!real.length)return false;
  // set: angka sama, jenis berbeda, maks 4 kartu
  if(real.every(c=>c.r===real[0].r)&&cs.length<=4&&new Set(real.map(c=>c.s)).size===real.length)return true;
  // run: jenis sama, angka berbeda, bisa diisi joker
  if(real.every(c=>c.s===real[0].s)&&new Set(real.map(c=>c.n)).size===real.length){
    for(const f of [c=>c.n,c=>c.n===1?14:c.n]){
      const vals=real.map(f),mn=Math.min(...vals),mx=Math.max(...vals);
      const lowB=f({n:2})===2&&f({n:1})===14?2:1,highB=lowB===2?14:13;
      if(mx-mn+1>cs.length)continue;
      for(let lo=mn;lo>=lowB;lo--){const hi=lo+cs.length-1;if(hi>highB)continue;if(hi>=mx&&lo<=mn)return true}
    }
  }
  return false;
}
/* Bisakah semua kartu dibagi habis menjadi meld? (backtracking, <= 8 kartu) */
export function canPartition(cards,minMeld=3){
  if(!cards.length)return true;
  if(cards.length<minMeld)return false;
  const [first,...rest]=cards;
  const n=rest.length;
  for(let mask=0;mask<(1<<n);mask++){
    let bits=0;for(let i=0;i<n;i++)if(mask&(1<<i))bits++;
    if(bits+1<minMeld)continue;
    const grp=[first],others=[];
    for(let i=0;i<n;i++)(mask&(1<<i)?grp:others).push(rest[i]);
    if(isMeld(grp,minMeld)&&canPartition(others,minMeld))return true;
  }
  return false;
}

export class RemiGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='remi';this.moveNo=0;
    this.players=players.map(p=>({id:p.id,name:p.name,hand:[]}));
    this.stock=buildDeck();
    for(let i=1;i<=rules.jokers;i++)this.stock.push({id:'JK'+i,r:'JK',s:'x',n:0,joker:true});
    shuffle(this.stock);
    this.players.forEach(p=>{for(let i=0;i<rules.handSize;i++)p.hand.push(this.stock.pop())});
    this.discard=[this.stock.pop()];
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=crypto.getRandomValues(new Uint32Array(1))[0]%this.players.length;
    this.phase='draw';this.drewDiscard=null;this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  val(c){return isJ(c)?this.rules.jokerValue:c.n===1?this.rules.aceValue:c.n>=11?this.rules.faceValue:c.n}
  handValue(h){return h.reduce((s,c)=>s+this.val(c),0)}
  /* kartu mana yang bisa dibuang sehingga sisanya habis jadi meld (untuk Tutup) */
  closeOptions(hand){return hand.filter(c=>c.id!==this.drewDiscard&&canPartition(hand.filter(x=>x!==c),this.rules.minMeld))}
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid);
    if(a.type==='draw'){
      if(this.phase!=='draw')return no('Kamu sudah mengambil kartu. Buang 1 kartu atau Tutup.');
      if(a.source==='discard'){
        if(!this.discard.length)return no('Tumpukan buang kosong.');
        const c=this.discard.pop();p.hand.push(c);this.drewDiscard=c.id;
      }else{
        if(!this.stock.length)return this.finishLow();
        p.hand.push(this.stock.pop());this.drewDiscard=null;
      }
      this.moveNo++;this.phase='discard';return OK;
    }
    if(this.phase!=='discard')return no('Ambil kartu dulu dari stock atau tumpukan buang.');
    if(a.type==='close'){
      const c=p.hand.find(x=>x.id===a.card);if(!c)return no('Pilih kartu yang dibuang untuk menutup.');
      if(c.id===this.drewDiscard)return no('Kartu yang baru diambil dari tumpukan buang tidak boleh dibuang.');
      const rest=p.hand.filter(x=>x!==c);
      if(!canPartition(rest,this.rules.minMeld))return no('Belum bisa Tutup: ketujuh kartu sisa harus habis menjadi set/run.');
      p.hand=rest;this.discard.push(c);this.moveNo++;return this.finish('close',pid);
    }
    if(a.type==='discard'){
      const c=p.hand.find(x=>x.id===a.card);if(!c)return no('Kartu tidak ada di tanganmu.');
      if(c.id===this.drewDiscard)return no('Kartu yang baru diambil dari tumpukan buang tidak boleh langsung dibuang lagi.');
      p.hand=p.hand.filter(x=>x!==c);this.discard.push(c);this.phase='draw';this.drewDiscard=null;this.moveNo++;this.turn.next();return OK;
    }
    return no('Aksi tidak dikenal.');
  }
  finishLow(){
    const s=this.players.map(p=>[p.id,this.handValue(p.hand)]).sort((x,y)=>x[1]-y[1]);
    return this.finish('stock',(s.length>1&&s[0][1]===s[1][1])?null:s[0][0]);
  }
  finish(reason,w){
    this.finished=true;
    const left=Object.fromEntries(this.players.map(p=>[p.id,this.handValue(p.hand)]));
    const sc=Object.fromEntries(this.players.map(p=>[p.id,0]));
    if(w)sc[w]=this.players.filter(p=>p.id!==w).reduce((s,p)=>s+left[p.id],0)*(reason==='close'?2:1);
    this.result={winner:w||null,reason,scores:sc,left,hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand]))};return OK;
  }
  /* seberapa "nyambung" sebuah kartu dengan kartu lain di tangan */
  synergy(c,hand){
    if(isJ(c))return 99;
    return hand.filter(x=>x!==c&&!isJ(x)&&((x.r===c.r&&x.s!==c.s)||(x.s===c.s&&Math.abs(x.n-c.n)<=2&&x.n!==c.n))).length;
  }
  autoPlay(){
    const pid=this.turn.current,p=this.P(pid);
    if(this.phase==='draw'){
      const top=this.discard[this.discard.length-1];let src='stock';
      if(top){const sim=p.hand.concat([top]);if(sim.some(c=>canPartition(sim.filter(x=>x!==c),this.rules.minMeld)))src='discard'}
      const r=this.act(pid,{type:'draw',source:src});if(this.finished||!r.ok)return r;
    }
    const opts=this.closeOptions(p.hand);
    if(opts.length)return this.act(pid,{type:'close',card:opts[0].id});
    const cand=p.hand.filter(c=>c.id!==this.drewDiscard).sort((a,b)=>this.synergy(a,p.hand)-this.synergy(b,p.hand)||this.val(b)-this.val(a));
    return this.act(pid,{type:'discard',card:(cand[0]||p.hand[0]).id});
  }
  view(pid){
    const p=this.P(pid);
    const order=['s','h','d','c','x'];
    return{kind:'remi',order:this.players.map(x=>x.id),myHand:p?p.hand.slice().sort((a,b)=>order.indexOf(a.s)-order.indexOf(b.s)||a.n-b.n):[],
      counts:Object.fromEntries(this.players.map(x=>[x.id,x.hand.length])),stock:this.stock.length,top:this.discard[this.discard.length-1]||null,
      phase:this.phase,drewDiscard:this.drewDiscard,
      closeIds:(p&&pid===this.turn.current&&this.phase==='discard'&&!this.finished)?this.closeOptions(p.hand).map(c=>c.id):[],
      current:this.turn.current,finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
