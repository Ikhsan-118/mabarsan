// 41: tiap pemain 4 kartu. Nilai tangan = jumlah kartu terbanyak dari SATU jenis (As=11, J/Q/K=10, angka=nilainya).
// Maksimum 41 (As + tiga kartu bernilai 10 sejenis). Ambil 1 (stock/buangan), buang 1.
// Dapat 41 = menang langsung. Nilai >= 30 boleh Ketuk: semua lawan dapat 1 giliran terakhir, nilai tertinggi menang (pengetuk menang jika seri).
// Stock habis: nilai tertinggi menang.
export const FortyOneRules={id:'classic',name:'41',handSize:4,target:41,knockMin:30,minPlayers:2,maxPlayers:4,aceValue:11,faceValue:10};
