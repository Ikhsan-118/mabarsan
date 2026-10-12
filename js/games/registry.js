// Game Registry: hanya menghubungkan ID game -> metadata + pembuat engine.
// Tidak ada logic game di sini. Menambah game baru = tambah 1 entri.
import {DominoGameEngine} from './domino/engine.js';
import {DominoRules} from './domino/rules.js';
import {RummyGameEngine} from './rummy/engine.js';
import {RummyRules} from './rummy/rules.js';
import {CangkulanGameEngine} from './cangkulan/engine.js';
import {CangkulanRules} from './cangkulan/rules.js';
import {UnoGameEngine} from './uno/engine.js';
import {UnoRules} from './uno/rules.js';
import {FortyOneGameEngine} from './forty-one/engine.js';
import {FortyOneRules} from './forty-one/rules.js';
import {RemiGameEngine} from './remi/engine.js';
import {RemiRules} from './remi/rules.js';
import {CapsaGameEngine} from './capsa/engine.js';
import {CapsaRules} from './capsa/rules.js';
import {CheckersGameEngine} from './checkers/engine.js';
import {CheckersRules} from './checkers/rules.js';
import {LudoGameEngine} from './ludo/engine.js';
import {LudoRules} from './ludo/rules.js';
import {ChessGameEngine} from './chess/engine.js';
import {ChessRules} from './chess/rules.js';

/* status: implemented | beta | coming-soon | disabled   category: card | board | party | strategy */
export const GAMES=[
  {id:'domino',name:'Domino Gaple',short:'Domino',category:'board',minPlayers:2,maxPlayers:4,status:'implemented',turnTime:30,
    blurb:'Gaple klasik Indonesia. 28 ubin, 6|6 jalan duluan.',create:(l,s)=>new DominoGameEngine(l,DominoRules,s)},
  {id:'rummy',name:'Rummy Klasik',short:'Rummy',category:'card',minPlayers:2,maxPlayers:4,status:'implemented',turnTime:60,
    blurb:'Ambil, susun set & run, tempel, buang.',create:(l,s)=>new RummyGameEngine(l,RummyRules,s)},
  {id:'cangkulan',name:'Cangkulan',short:'Cangkulan',category:'card',minPlayers:2,maxPlayers:4,status:'beta',turnTime:45,
    blurb:'Ikuti jenis kartu, cangkul kalau tidak punya. Habiskan kartu duluan.',create:(l,s)=>new CangkulanGameEngine(l,CangkulanRules,s)},
  {id:'forty-one',name:'41',short:'41',category:'card',minPlayers:2,maxPlayers:4,status:'beta',turnTime:45,
    blurb:'4 kartu, kumpulkan satu jenis sampai bernilai 41. Ketuk kalau sudah dekat.',create:(l,s)=>new FortyOneGameEngine(l,FortyOneRules,s)},
  {id:'capsa',name:'Capsa',short:'Capsa',category:'card',minPlayers:2,maxPlayers:4,status:'beta',turnTime:90,
    blurb:'Susun 13 kartu jadi 3 baris (3-5-5). Adu tiap baris dengan lawan.',create:(l,s)=>new CapsaGameEngine(l,CapsaRules,s)},
  {id:'ludo',name:'Ludo',short:'Ludo',category:'board',minPlayers:2,maxPlayers:4,status:'beta',turnTime:30,
    blurb:'Lempar dadu, keluarkan pion dengan angka 6, bawa semua pulang.',create:(l,s)=>new LudoGameEngine(l,LudoRules,s)},
  {id:'chess',name:'Catur',short:'Catur',category:'strategy',minPlayers:2,maxPlayers:2,status:'beta',turnTime:120,
    blurb:'Catur lengkap: rokade, en passant, promosi, skakmat, seri, menyerah.',create:(l,s)=>new ChessGameEngine(l,ChessRules,s)},
  {id:'checkers',name:'Dam',short:'Dam',category:'strategy',minPlayers:2,maxPlayers:2,status:'beta',turnTime:60,
    blurb:'Dam 8x8: makan wajib, makan beruntun, bidak jadi Raja.',create:(l,s)=>new CheckersGameEngine(l,CheckersRules,s)},
  {id:'uno',name:'Uno-style',short:'Uno',category:'party',minPlayers:2,maxPlayers:4,status:'beta',turnTime:30,
    blurb:'Skip, Reverse, Draw 2, Wild. Habiskan kartu duluan.',create:(l,s)=>new UnoGameEngine(l,UnoRules,s)},
  {id:'remi',name:'Remi',short:'Remi',category:'card',minPlayers:2,maxPlayers:4,status:'beta',turnTime:60,
    blurb:'7 kartu + Joker. Tutup saat semua kartu habis jadi set/run.',create:(l,s)=>new RemiGameEngine(l,RemiRules,s)}
];
export const gameById=id=>GAMES.find(g=>g.id===id);
export const isPlayable=g=>!!g&&(g.status==='implemented'||g.status==='beta');
export const playableGames=()=>GAMES.filter(isPlayable);
export const createEngine=(id,players,settings)=>{const g=gameById(id);if(!g||!g.create)throw new Error('Game tidak tersedia: '+id);return g.create(players,settings)};
export const STATUS_LABEL={implemented:'MAIN',beta:'BETA','coming-soon':'COMING SOON',disabled:'NONAKTIF'};
