import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {buildDeck,SUITS} from '../shared/cards.js';

const rk=c=>c.n===1?14:c.n; // As tertinggi
const B=15;
const enc=(cat,t)=>{let k=cat;for(let i=0;i<5;i++)k=k*B+(t[i]||0);return k};
/* Kekuatan tangan sebagai angka (lebih besar = lebih kuat). 3 atau 5 kartu. */
export function strength(cs){
  const r=cs.map(rk).sort((a,b)=>b-a),cnt={};r.forEach(x=>cnt[x]=(cnt[x]||0)+1);
  const groups=Object.entries(cnt).map(([x,c])=>[+x,c]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  if(cs.length===3){
    if(groups[0][1]===3)return{cat:2,key:enc(2,[groups[0][0]])};
    if(groups[0][1]===2)return{cat:1,key:enc(1,[groups[0][0],groups[1][0]])};
    return{cat:0,key:enc(0,r)};
  }
  const flush=cs.every(c=>c.s===cs[0].s);
  let straightHigh=0;
  const u=[...new Set(r)];
  if(u.length===5){if(u[0]-u[4]===4)straightHigh=u[0];else if(u.join()==='14,5,4,3,2')straightHigh=5}
  if(straightHigh&&flush)return{cat:8,key:enc(8,[straightHigh])};
  if(groups[0][1]===4)return{cat:7,key:enc(7,[groups[0][0],groups[1][0]])};
  if(groups[0][1]===3&&groups[1][1]===2)return{cat:6,key:enc(6,[groups[0][0],groups[1][0]])};
  if(flush)return{cat:5,key:enc(5,r)};
  if(straightHigh)return{cat:4,key:enc(4,[straightHigh])};
  if(groups[0][1]===3)return{cat:3,key:enc(3,[groups[0][0],groups[1][0],groups[2][0]])};
  if(groups[0][1]===2&&groups[1][1]===2)return{cat:2,key:enc(2,[groups[0][0],groups[1][0],groups[2][0]])};
  if(groups[0][1]===2)return{cat:1,key:enc(1,[groups[0][0],groups[1][0],groups[2][0],groups[3][0]])};
  return{cat:0,key:enc(0,r)};
}
const combos=(arr,k)=>{const out=[];const rec=(s,cur)=>{if(cur.length===k){out.push(cur.slice());return}for(let i=s;i<arr.length;i++){cur.push(arr[i]);rec(i+1,cur);cur.pop()}};rec(0,[]);return out};
/* Susunan terbaik yang valid (Belakang>=Tengah>=Depan). Dipakai auto-play dan tombol "Susun otomatis". */
export function bestArrangement(hand){
  const fronts=combos(hand,3).map(f=>({cards:f,s:strength(f)}));
  const memo=new Map(),S5=cs=>{const k=cs.map(c=>c.id).sort().join();let v=memo.get(k);if(!v){v=strength(cs);memo.set(k,v)}return v};
  let best=null,bestObj=-1;
  for(const f of fronts){
    const rest=hand.filter(c=>!f.cards.includes(c));
    for(const mid of combos(rest,5)){
      const back=rest.filter(c=>!mid.includes(c));
      let sm=S5(mid),sb=S5(back),a=mid,b=back;
      if(sm.key>sb.key){[sm,sb]=[sb,sm];[a,b]=[b,a]}
      if(f.s.key>sm.key)continue;
      const obj=sb.key*3+sm.key*2+f.s.key;
      if(obj>bestObj){bestObj=obj;best={front:f.cards,mid:a,back:b}}
    }
  }
  return best;
}

export class CapsaGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='capsa';this.simultaneous=true;this.moveNo=0;
    this.players=players.map(p=>({id:p.id,name:p.name,hand:[],rows:null}));
    const deck=buildDeck();this.players.forEach(p=>{p.hand=deck.splice(0,13)});
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    const p=this.P(pid);if(!p)return no('Kamu bukan pemain.');
    if(a.type!=='arrange')return no('Aksi tidak dikenal.');
    if(p.rows)return no('Susunanmu sudah dikunci.');
    const rows={front:a.front,mid:a.mid,back:a.back};
    if(!Array.isArray(a.front)||!Array.isArray(a.mid)||!Array.isArray(a.back)||a.front.length!==3||a.mid.length!==5||a.back.length!==5)return no('Susunan harus 3 kartu depan, 5 tengah, 5 belakang.');
    const ids=[...a.front,...a.mid,...a.back];
    if(new Set(ids).size!==13||!ids.every(id=>p.hand.some(c=>c.id===id)))return no('Kartu tidak valid.');
    const get=arr=>arr.map(id=>p.hand.find(c=>c.id===id));
    const f=get(rows.front),m=get(rows.mid),b=get(rows.back);
    const sf=strength(f),sm=strength(m),sb=strength(b);
    if(!(sb.key>=sm.key&&sm.key>=sf.key))return no('Susunan salah: Belakang harus ≥ Tengah ≥ Depan.');
    p.rows={front:f,mid:m,back:b,s:{front:sf,mid:sm,back:sb}};this.moveNo++;
    if(this.players.every(x=>x.rows))return this.resolve();
    return OK;
  }
  resolve(){
    const tot=Object.fromEntries(this.players.map(p=>[p.id,0]));
    for(let i=0;i<this.players.length;i++)for(let j=i+1;j<this.players.length;j++){
      const A=this.players[i],Bp=this.players[j];let wa=0,wb=0;
      ['front','mid','back'].forEach(r=>{const d=A.rows.s[r].key-Bp.rows.s[r].key;if(d>0){wa++;tot[A.id]++;tot[Bp.id]--}else if(d<0){wb++;tot[Bp.id]++;tot[A.id]--}});
      if(wa===3){tot[A.id]+=this.rules.scoopBonus;tot[Bp.id]-=this.rules.scoopBonus}
      if(wb===3){tot[Bp.id]+=this.rules.scoopBonus;tot[A.id]-=this.rules.scoopBonus}
    }
    const max=Math.max(...Object.values(tot)),tops=Object.keys(tot).filter(k=>tot[k]===max);
    const winner=tops.length===1?tops[0]:null;
    this.finished=true;
    this.result={winner,reason:'capsa',scores:Object.fromEntries(Object.entries(tot).map(([k,v])=>[k,Math.max(0,v)])),left:tot,
      hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand])),
      rows:Object.fromEntries(this.players.map(p=>[p.id,{front:p.rows.front,mid:p.rows.mid,back:p.rows.back,cats:{front:p.rows.s.front.cat,mid:p.rows.s.mid.cat,back:p.rows.s.back.cat}}]))};
    return OK;
  }
  autoPlay(){return this.autoPlayAll()}
  /* Dipanggil host saat waktu habis: susun otomatis untuk semua pemain yang belum menyusun. */
  autoPlayAll(){
    let last=OK;
    for(const p of this.players){
      if(this.finished)break;if(p.rows)continue;
      const b=bestArrangement(p.hand);
      last=this.act(p.id,{type:'arrange',front:b.front.map(c=>c.id),mid:b.mid.map(c=>c.id),back:b.back.map(c=>c.id)});
    }
    return last;
  }
  view(pid){
    const p=this.P(pid);
    return{kind:'capsa',simul:true,order:this.players.map(x=>x.id),current:null,
      myHand:p?p.hand.slice().sort((a,b)=>rk(b)-rk(a)||SUITS.indexOf(a.s)-SUITS.indexOf(b.s)):[],
      myRows:p&&p.rows?{front:p.rows.front.map(c=>c.id),mid:p.rows.mid.map(c=>c.id),back:p.rows.back.map(c=>c.id)}:null,
      done:this.players.filter(x=>x.rows).map(x=>x.id),counts:Object.fromEntries(this.players.map(x=>[x.id,13])),
      finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
