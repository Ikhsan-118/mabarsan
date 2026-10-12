// Aturan Cangkulan (varian umum Indonesia).
// - Tiap pemain 7 kartu, sisanya jadi stock.
// - Pemain pertama membuang 1 kartu; lawan WAJIB mengikuti jenis (suit) yang sama.
// - Tidak punya jenis itu? "Cangkul" (ambil) dari stock sampai dapat, lalu mainkan.
//   Stock habis dan tetap tidak punya? Pass.
// - Kartu tertinggi dari jenis pembuka memenangkan trik dan jalan duluan di trik berikutnya.
// - Siapa yang kartunya habis lebih dulu menang.
export const CangkulanRules={id:'classic',name:'Cangkulan',handSize:7,minPlayers:2,maxPlayers:4,aceHigh:true,faceValue:10,aceValue:11};
