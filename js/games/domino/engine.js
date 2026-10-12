import {shuffle} from '../shared/shuffle.js';
import {OK,no} from '../shared/result.js';
import {TurnManager} from '../shared/turn.js';
class DominoTurnManager extends TurnManager{}
class DominoDeck{
  constructor(maxPip){this.tiles=[];for(let a=0;a<=maxPip;a++)for(let b=a;b<=maxPip;b++)this.tiles.push({id:a+'-'+b,a,b});shuffle(this.tiles)}
  deal(n){return this.tiles.splice(0,n)}
}
class DominoPlayer{constructor(id,name){this.id=id;this.name=name;this.hand=[]}pips(){return this.hand.reduce((s,t)=>s+t.a+t.b,0)}}
class DominoScoreManager{
  round(players,winner){const r={};players.forEach(p=>r[p.id]=0);if(winner)r[winner]=players.filter(p=>p.id!==winner).reduce((s,p)=>s+p.pips(),0);return r}
}
export class DominoGameEngine{
  constructor(players,rules,settings){
    this.rules=rules;this.kind='domino';
    this.players=players.map(p=>new DominoPlayer(p.id,p.name));
    this.turn=new DominoTurnManager(this.players.map(p=>p.id),settings.turnTime);
    this.score=new DominoScoreManager();
    const deck=new DominoDeck(rules.maxPip);
    this.players.forEach(p=>p.hand=deck.deal(rules.handSize));
    this.sleeping=deck.tiles.length;
    this.board=[];this.passStreak=0;this.finished=false;this.result=null;
    let best=null,bk=-1,owner=null;
    this.players.forEach(p=>p.hand.forEach(t=>{const k=t.a===t.b?100+t.a:t.a+t.b;if(k>bk){bk=k;best=t;owner=p}}));
    this.startTile=best.id;this.turn.setCurrent(owner.id);
  }
  P(id){return this.players.find(p=>p.id===id)}
  ends(){return this.board.length?{l:this.board[0].l,r:this.board[this.board.length-1].r}:null}
  moves(pid){
    const p=this.P(pid);if(!p)return[];
    if(!this.board.length)return p.hand.filter(t=>!this.rules.forceStartTile||t.id===this.startTile).map(t=>({id:t.id,side:'R'}));
    const e=this.ends(),m=[];
    p.hand.forEach(t=>{if(t.a===e.r||t.b===e.r)m.push({id:t.id,side:'R'});if(t.a===e.l||t.b===e.l)m.push({id:t.id,side:'L'})});
    return m;
  }
  act(pid,a){
    if(this.finished)return no('Permainan sudah selesai.');
    if(pid!==this.turn.current)return no('Action rejected: It is not your turn.');
    const p=this.P(pid),mv=this.moves(pid);
    if(a.type==='pass'){
      if(mv.length)return no('Kamu masih punya ubin yang bisa dimainkan.');
      this.passStreak++;
      if(this.passStreak>=this.players.length)return this.finish('blocked');
      this.turn.next();return OK;
    }
    if(a.type==='play'){
      const m=mv.find(x=>x.id===a.id&&(x.side===a.side||!this.board.length));
      if(!m)return no('Langkah tidak valid.');
      const t=p.hand.find(x=>x.id===a.id);p.hand=p.hand.filter(x=>x!==t);
      if(!this.board.length)this.board.push({id:t.id,l:t.a,r:t.b});
      else if(a.side==='R'){const e=this.ends().r;this.board.push({id:t.id,l:e,r:t.a===e?t.b:t.a})}
      else{const e=this.ends().l;this.board.unshift({id:t.id,l:t.a===e?t.b:t.a,r:e})}
      this.passStreak=0;
      if(!p.hand.length)return this.finish('out',pid);
      this.turn.next();return OK;
    }
    return no('Aksi tidak dikenal.');
  }
  finish(reason,w){
    this.finished=true;let winner=w||null;
    if(reason==='blocked'){
      const s=this.players.map(p=>[p.id,p.pips()]).sort((x,y)=>x[1]-y[1]);
      winner=(s.length>1&&s[0][1]===s[1][1])?null:s[0][0];if(!winner)reason='draw';
    }
    this.result={winner,reason,scores:this.score.round(this.players,winner),
      left:Object.fromEntries(this.players.map(p=>[p.id,p.pips()])),hands:Object.fromEntries(this.players.map(p=>[p.id,p.hand]))};
    return OK;
  }
  autoPlay(){
    const pid=this.turn.current,mv=this.moves(pid),p=this.P(pid);
    if(!mv.length)return this.act(pid,{type:'pass'});
    mv.sort((a,b)=>{const ta=p.hand.find(t=>t.id===a.id),tb=p.hand.find(t=>t.id===b.id);return(tb.a+tb.b)-(ta.a+ta.b)});
    return this.act(pid,{type:'play',id:mv[0].id,side:mv[0].side});
  }
  view(pid){
    const p=this.P(pid);
    return{kind:'domino',order:this.players.map(x=>x.id),board:this.board,ends:this.ends(),
      myHand:p?p.hand.slice().sort((a,b)=>(b.a+b.b)-(a.a+a.b)):[],myMoves:this.moves(pid),
      counts:Object.fromEntries(this.players.map(x=>[x.id,x.hand.length])),current:this.turn.current,
      startTile:this.board.length?null:this.startTile,sleeping:this.sleeping,passStreak:this.passStreak,
      finished:this.finished,result:this.result,turnNo:this.turn.turnNo};
  }
}
