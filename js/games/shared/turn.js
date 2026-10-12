// Pengatur giliran bersama untuk semua game.
export class TurnManager{
  constructor(ids,turnSec){this.order=ids.slice();this.idx=0;this.turnNo=1;this.turnSec=turnSec;this.startedAt=Date.now()}
  get current(){return this.order[this.idx]}
  setCurrent(id){this.idx=Math.max(0,this.order.indexOf(id));this.startedAt=Date.now()}
  next(){this.idx=(this.idx+1)%this.order.length;this.turnNo++;this.startedAt=Date.now()}
  jump(id){this.setCurrent(id);this.turnNo++}
  get deadline(){return this.startedAt+this.turnSec*1000}
  left(){return Math.max(0,this.deadline-Date.now())}
}
