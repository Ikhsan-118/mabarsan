import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {pick} from '../shared/rand.js';
import {PIECE_VALUE} from './rules.js';

const isW=ch=>ch!=='.'&&ch===ch.toUpperCase();
const sideOf=ch=>isW(ch)?'w':'b';
const inB=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
const KN=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],KG=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const BD=[[-1,-1],[-1,1],[1,-1],[1,1]],RD=[[-1,0],[1,0],[0,-1],[0,1]];

export function fromFen(fen){
  const [pl,turn,castling,ep,half,full]=fen.trim().split(/\s+/);
  const b=[];
  pl.split('/').forEach(row=>{for(const ch of row){if(/\d/.test(ch))for(let i=0;i<+ch;i++)b.push('.');else b.push(ch)}});
  return{b,turn,castling:castling==='-'?'':castling,ep:ep&&ep!=='-'?(8-+ep[1])*8+'abcdefgh'.indexOf(ep[0]):-1,half:+half||0,full:+full||1};
}
export function attacked(b,sq,by){
  const r=sq>>3,c=sq&7,P=ch=>by==='w'?ch.toUpperCase():ch.toLowerCase();
  const pr=by==='w'?r+1:r-1;
  for(const dc of [-1,1]){const cc=c+dc;if(inB(pr,cc)&&b[pr*8+cc]===P('p'))return true}
  for(const [dr,dc] of KN)if(inB(r+dr,c+dc)&&b[(r+dr)*8+c+dc]===P('n'))return true;
  for(const [dr,dc] of KG)if(inB(r+dr,c+dc)&&b[(r+dr)*8+c+dc]===P('k'))return true;
  for(const [dirs,set] of [[BD,'bq'],[RD,'rq']])for(const [dr,dc] of dirs){
    let rr=r+dr,cc=c+dc;
    while(inB(rr,cc)){const ch=b[rr*8+cc];if(ch!=='.'){if(sideOf(ch)===by&&set.includes(ch.toLowerCase()))return true;break}rr+=dr;cc+=dc}
  }
  return false;
}
function pseudo(pos){
  const {b,turn,castling,ep}=pos,white=turn==='w',out=[];
  const enemy=ch=>ch!=='.'&&sideOf(ch)!==turn;
  for(let sq=0;sq<64;sq++){
    const ch=b[sq];if(ch==='.'||sideOf(ch)!==turn)continue;
    const t=ch.toLowerCase(),r=sq>>3,c=sq&7;
    if(t==='p'){
      const dir=white?-1:1,startRow=white?6:1,promoRow=white?0:7;
      const add=(to,extra)=>{if((to>>3)===promoRow)['q','r','b','n'].forEach(pr=>out.push({from:sq,to,promo:pr,...extra}));else out.push({from:sq,to,...extra})};
      const one=sq+dir*8;
      if(inB(r+dir,c)&&b[one]==='.'){add(one);if(r===startRow&&b[one+dir*8]==='.')out.push({from:sq,to:one+dir*8,dbl:true})}
      for(const dc of [-1,1]){const cc=c+dc;if(!inB(r+dir,cc))continue;const to=one-c+cc;if(enemy(b[to]))add(to);else if(to===ep)out.push({from:sq,to,ep:true})}
    }else if(t==='n'||t==='k'){
      for(const [dr,dc] of (t==='n'?KN:KG)){const rr=r+dr,cc=c+dc;if(!inB(rr,cc))continue;const to=rr*8+cc;if(b[to]==='.'||enemy(b[to]))out.push({from:sq,to})}
      if(t==='k'){
        const opp=white?'b':'w',home=white?60:4;
        if(sq===home&&!attacked(b,home,opp)){
          if(castling.includes(white?'K':'k')&&b[home+1]==='.'&&b[home+2]==='.'&&!attacked(b,home+1,opp)&&!attacked(b,home+2,opp))out.push({from:sq,to:home+2,castle:'K'});
          if(castling.includes(white?'Q':'q')&&b[home-1]==='.'&&b[home-2]==='.'&&b[home-3]==='.'&&!attacked(b,home-1,opp)&&!attacked(b,home-2,opp))out.push({from:sq,to:home-2,castle:'Q'});
        }
      }
    }else{
      const dirs=t==='b'?BD:t==='r'?RD:BD.concat(RD);
      for(const [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(inB(rr,cc)){const to=rr*8+cc;if(b[to]==='.')out.push({from:sq,to});else{if(enemy(b[to]))out.push({from:sq,to});break}rr+=dr;cc+=dc}}
    }
  }
  return out;
}
export function make(pos,m){
  const b=pos.b.slice(),white=pos.turn==='w',piece=b[m.from];let cap=b[m.to];
  b[m.to]=m.promo?(white?m.promo.toUpperCase():m.promo):piece;b[m.from]='.';
  if(m.ep){b[m.to+(white?8:-8)]='.';cap='p'}
  if(m.castle==='K'){b[m.to-1]=b[m.to+1];b[m.to+1]='.'}
  if(m.castle==='Q'){b[m.to+1]=b[m.to-2];b[m.to-2]='.'}
  let cs=pos.castling;
  if(piece==='K')cs=cs.replace(/[KQ]/g,'');if(piece==='k')cs=cs.replace(/[kq]/g,'');
  for(const [s,x] of [[63,'K'],[56,'Q'],[7,'k'],[0,'q']])if(m.from===s||m.to===s)cs=cs.replace(x,'');
  return{b,turn:white?'b':'w',castling:cs,ep:m.dbl?(m.from+m.to)/2:-1,half:(piece.toLowerCase()==='p'||cap!=='.')?0:pos.half+1,full:pos.full+(white?0:1)};
}
const kingSq=(b,color)=>b.indexOf(color==='w'?'K':'k');
export const inCheck=(pos,color=pos.turn)=>attacked(pos.b,kingSq(pos.b,color),color==='w'?'b':'w');
export function legalMoves(pos){
  const opp=pos.turn==='w'?'b':'w';
  return pseudo(pos).filter(m=>{const np=make(pos,m);return !attacked(np.b,kingSq(np.b,pos.turn),opp)});
}
export function perft(pos,d){
  if(d===0)return 1;
  const ms=legalMoves(pos);if(d===1)return ms.length;
  return ms.reduce((s,m)=>s+perft(make(pos,m),d-1),0);
}
const key=pos=>pos.b.join('')+pos.turn+pos.castling+pos.ep;
function insufficient(b){
  const rest=b.filter(x=>x!=='.'&&x.toLowerCase()!=='k');
  if(!rest.length)return true;
  if(rest.length===1&&'bn'.includes(rest[0].toLowerCase()))return true;
  return false;
}
export const sqName=s=>'abcdefgh'[s&7]+(8-(s>>3));

export class ChessGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='chess';this.moveNo=0;
    this.players=players.map(p=>({id:p.id,name:p.name}));
    this.colors={[this.players[0].id]:'w',[this.players[1].id]:'b'};
    this.pos=fromFen(settings.fen||rules.startFen);
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.turn.idx=this.pos.turn==='w'?0:1;
    this.seen={[key(this.pos)]:1};this.last=null;this.drawOffer=null;this.log=[];this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  idOf(color){return this.players.find(p=>this.colors[p.id]===color).id}
  legal(){return legalMoves(this.pos)}
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    const me=this.P(pid);if(!me)return no('Kamu bukan pemain.');
    const opp=this.players.find(p=>p.id!==pid).id;
    if(a.type==='resign')return this.finish('resign',opp);
    if(a.type==='draw-offer'){if(this.drawOffer)return no('Tawaran seri sudah ada.');this.drawOffer=pid;return OK}
    if(a.type==='draw-decline'){if(!this.drawOffer||this.drawOffer===pid)return no('Tidak ada tawaran seri untukmu.');this.drawOffer=null;return OK}
    if(a.type==='draw-accept'){if(!this.drawOffer||this.drawOffer===pid)return no('Tidak ada tawaran seri untukmu.');return this.finish('agreement',null)}
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    if(a.type!=='move')return no('Aksi tidak dikenal.');
    const ms=this.legal().filter(m=>m.from===a.from&&m.to===a.to);
    if(!ms.length)return no('Langkah tidak legal.');
    const m=ms.length===1?ms[0]:(ms.find(x=>x.promo===(a.promo||'q'))||ms.find(x=>x.promo==='q'));
    const piece=this.pos.b[m.from];
    this.pos=make(this.pos,m);this.last={from:m.from,to:m.to};this.drawOffer=null;this.moveNo++;
    this.log.push(sqName(m.from)+sqName(m.to)+(m.promo||''));
    const k=key(this.pos);this.seen[k]=(this.seen[k]||0)+1;
    const moves=this.legal(),chk=inCheck(this.pos);
    if(!moves.length)return chk?this.finish('checkmate',pid):this.finish('stalemate',null);
    if(insufficient(this.pos.b))return this.finish('insufficient',null);
    if(this.seen[k]>=3)return this.finish('repetition',null);
    if(this.pos.half>=100)return this.finish('fifty',null);
    this.turn.next();return OK;
  }
  material(color){return this.pos.b.reduce((s,ch)=>ch!=='.'&&sideOf(ch)===color?s+PIECE_VALUE[ch.toLowerCase()]:s,0)}
  finish(reason,w){
    this.finished=true;
    const left=Object.fromEntries(this.players.map(p=>[p.id,this.material(this.colors[p.id])]));
    const sc=Object.fromEntries(this.players.map(p=>[p.id,0]));if(w)sc[w]=left[w];
    this.result={winner:w||null,reason,scores:sc,left,hands:{}};return OK;
  }
  autoPlay(){
    const pid=this.turn.current,ms=this.legal(),opp=this.pos.turn==='w'?'b':'w';
    let best=[],bestS=-1e9;
    for(const m of ms){
      const np=make(this.pos,m);let s=Math.random()*0.3;
      const cap=this.pos.b[m.to]!=='.'?PIECE_VALUE[this.pos.b[m.to].toLowerCase()]:(m.ep?1:0);
      s+=cap*10;if(m.promo==='q')s+=80;
      const pv=PIECE_VALUE[this.pos.b[m.from].toLowerCase()];
      if(attacked(np.b,m.to,opp))s-=pv*10-(cap*10>pv*10?0:0);
      if(inCheck(np,np.turn)){s+=3;if(!legalMoves(np).length)s+=10000}
      if(s>bestS){bestS=s;best=[m]}else if(Math.abs(s-bestS)<1e-9)best.push(m);
    }
    const m=best.length?pick(best):pick(ms);
    return this.act(pid,{type:'move',from:m.from,to:m.to,promo:m.promo});
  }
  view(pid){
    const cur=this.turn.current,mine=pid===cur&&!this.finished;
    return{kind:'chess',order:this.players.map(x=>x.id),board:this.pos.b.map(x=>x==='.'?'':x),myColor:this.colors[pid]||null,colors:this.colors,
      myMoves:mine?this.legal().map(m=>({from:m.from,to:m.to,promo:m.promo||null})):[],check:!this.finished&&inCheck(this.pos),last:this.last,drawOffer:this.drawOffer,
      counts:Object.fromEntries(this.players.map(x=>[x.id,this.pos.b.filter(ch=>ch!=='.'&&sideOf(ch)===this.colors[x.id]).length])),
      log:this.log.slice(-12),current:cur,finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
