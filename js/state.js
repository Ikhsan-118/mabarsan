// State terpusat. DOM bukan sumber kebenaran; semua view dirender dari S.
export const S={user:null,authTab:'login',profile:null,screen:'landing',room:null,game:null,me:null,role:null,code:null,pw:'',chat:[],unread:0,
  deadline:0,turnTotal:1,pick:null,sel:new Set(),sortMode:null,pickGame:'domino',counted:new Set(),reconn:0,leaving:false,
  joining:false,afterAuth:null,asSpec:false,filter:'all',histFilter:'all',prefill:'',netMsg:'',pickSq:null,promo:null,pickWild:null,capsa:null,lastResult:null};
export const net={peer:null,hostConn:null,HS:null};
/* Hook diisi app.js agar modul jaringan tidak perlu mengimpor view (hindari import melingkar). */
export const hooks={render(){},renderChat(){},toast(){},sfx(){},toHost(){},clientMsg(){},leaveRoom(){},react(){}};
export const meP=()=>S.room&&S.room.players.find(p=>p.id===S.me);
export const isSpec=()=>!!(S.room&&(S.room.spectators||[]).some(p=>p.id===S.me));
export const isHostMe=()=>!!(S.room&&S.room.hostId===S.me);
export const myTurn=()=>!!(S.game&&!S.game.finished&&S.game.current===S.me);
export const pName=id=>{const p=S.room&&S.room.players.find(x=>x.id===id);return p?p.name:'?'};
