// Ludo: 2-4 pemain, 4 pion. Lempar dadu; angka 6 untuk keluar kandang dan dapat giliran tambahan (6 tiga kali beruntun = hangus).
// Jalur luar 52 kotak; tiap warna masuk lorong rumah (5 kotak) lalu tujuan. Harus pas untuk masuk tujuan.
// Pion lawan yang diinjak di kotak biasa kembali ke kandang. Kotak bertanda bintang (aman) tidak bisa dimakan.
export const LudoRules={id:'classic',name:'Ludo',tokens:4,trackLen:52,homeStart:51,goal:56,starts:[0,13,26,39],safe:[0,8,13,21,26,34,39,47],maxSixes:3,minPlayers:2,maxPlayers:4};
export const LUDO_COLORS=['Merah','Hijau','Kuning','Biru'];
