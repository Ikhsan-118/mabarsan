// Remi (gaya Indonesia): 54 kartu (2 Joker = wild), tiap pemain 7 kartu.
// Ambil 1 (stock/buangan), lalu buang 1 ATAU "Tutup": ketujuh kartu tersisa harus habis tersusun menjadi
// set (3-4 angka sama beda jenis) dan/atau run (3+ berurutan sejenis). Joker boleh jadi kartu apa saja.
// Server mencari susunannya otomatis. Stock habis tanpa ada yang tutup: nilai tangan terkecil menang.
export const RemiRules={id:'classic',name:'Remi',handSize:7,jokers:2,minMeld:3,aceValue:11,faceValue:10,jokerValue:25,minPlayers:2,maxPlayers:4};
