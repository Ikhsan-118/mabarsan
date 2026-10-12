import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
import {pick} from '../shared/rand.js';

const N=8,rc=i=>[Math.floor(i/N),i%N],ix=(r,c)=>r*N+c,inb=(r,c)=>r>=0&&r<N&&c>=0&&c<N;
export class CheckersGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='checkers';this.moveNo=0;
    this.players=players.map(p=>({id:p.id,name:p.name}));
    this.colors={[this.players[0].id]:'w',[this.players[1].id]:'b'}; // putih jalan duluan, bergerak ke atas
    this.board=Array(64).fill(null);
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if((r+c)%2===1){if(r<3)this.board[ix(r,c)]={c:'b',k:false};else if(r>4)this.board[ix(r,c)]={c:'w',k:false}}
    this.turn=new TurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.mustFrom=null;this.sinceCapture=0;this.last=null;this.finished=false;this.result=null;
  }
  P(id){return this.players.find(p=>p.id===id)}
  dirs(pc){return pc.k?[[-1,-1],[-1,1],[1,-1],[1,1]]:pc.c==='w'?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]}
  jumpsFrom(i,color){
    const pc=this.board[i],[r,c]=rc(i),out=[];
    this.dirs(pc).forEach(([dr,dc])=>{
      const mr=r+dr,mc=c+dc,tr=r+2*dr,tc=c+2*dc;
      if(inb(tr,tc)&&this.board[ix(mr,mc)]&&this.board[ix(mr,mc)].c!==color&&!this.board[ix(tr,tc)])out.push({from:i,to:ix(tr,tc),cap:ix(mr,mc)});
    });
    return out;
  }
  movesFor(color){
    if(this.mustFrom!==null)return this.jumpsFrom(this.mustFrom,color);
    let jumps=[],steps=[];
    for(let i=0;i<64;i++){
      const pc=this.board[i];if(!pc||pc.c!==color)continue;
      jumps=jumps.concat(this.jumpsFrom(i,color));
      const [r,c]=rc(i);
      this.dirs(pc).forEach(([dr,dc])=>{if(inb(r+dr,c+dc)&&!this.board[ix(r+dr,c+dc)])steps.push({from:i,to:ix(r+dr,c+dc),cap:null})});
    }
    return jumps.length?jumps:steps; // makan wajib
  }
  legal(pid){return this.finished||pid!==this.turn.current?[]:this.movesFor(this.colors[pid])}
  count(color){return this.board.filter(p=>p&&p.c===color).length}
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(a.type==='resign'&&this.P(pid))return this.finish('resign',this.players.find(p=>p.id!==pid).id);
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    if(a.type!=='move')return no('Aksi tidak dikenal.');
    const color=this.colors[pid],mv=this.movesFor(color).find(m=>m.from===a.from&&m.to===a.to);
    if(!mv){return no(this.movesFor(color).some(m=>m.cap!==null)?'Kamu wajib makan bidak lawan.':'Langkah tidak valid.')}
    const pc=this.board[mv.from];this.board[mv.from]=null;this.board[mv.to]=pc;
    if(mv.cap!==null){this.board[mv.cap]=null;this.sinceCapture=0}else this.sinceCapture++;
    const [r]=rc(mv.to);let promoted=false;
    if(!pc.k&&((pc.c==='w'&&r===0)||(pc.c==='b'&&r===N-1))){pc.k=true;promoted=true}
    this.last={from:mv.from,to:mv.to};this.moveNo++;
    if(mv.cap!==null&&!promoted&&this.jumpsFrom(mv.to,color).length){this.mustFrom=mv.to;return OK} // lanjut makan
    this.mustFrom=null;
    const opp=this.players.find(p=>p.id!==pid),oc=this.colors[opp.id];
    if(!this.count(oc)||!this.movesFor(oc).length)return this.finish('blocked',pid);
    if(this.sinceCapture>=this.rules.drawPlies)return this.finish('draw',null);
    this.turn.next();return OK;
  }
  finish(reason,w){
    this.finished=true;
    const left=Object.fromEntries(this.players.map(p=>[p.id,this.count(this.colors[p.id])]));
    const sc=Object.fromEntries(this.players.map(p=>[p.id,0]));if(w)sc[w]=left[w];
    this.result={winner:w||null,reason,scores:sc,left,hands:{}};return OK;
  }
  autoPlay(){
    const pid=this.turn.current,mv=this.legal(pid);
    const promo=mv.filter(m=>{const pc=this.board[m.from];const [r]=rc(m.to);return !pc.k&&((pc.c==='w'&&r===0)||(pc.c==='b'&&r===N-1))});
    const m=promo.length?pick(promo):pick(mv);
    return this.act(pid,{type:'move',from:m.from,to:m.to});
  }
  view(pid){
    const p=this.P(pid);
    return{kind:'checkers',order:this.players.map(x=>x.id),board:this.board.map(b=>b?(b.c==='w'?(b.k?'W':'w'):(b.k?'B':'b')):''),
      myColor:this.colors[pid]||null,colors:this.colors,myMoves:this.legal(pid),mustFrom:this.mustFrom,last:this.last,
      counts:Object.fromEntries(this.players.map(x=>[x.id,this.count(this.colors[x.id])])),
      current:this.turn.current,finished:this.finished,result:this.result,turnNo:this.turn.turnNo,moveNo:this.moveNo};
  }
}
