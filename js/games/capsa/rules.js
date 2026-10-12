// Capsa (susun 13 kartu): 13 kartu dibagi jadi 3 baris: Depan 3, Tengah 5, Belakang 5.
// Syarat: Belakang >= Tengah >= Depan. Semua pemain menyusun serentak, lalu tiap baris dibandingkan dengan tiap lawan.
// Tiap baris menang +1 / kalah -1 per lawan. Menang ketiga baris (scoop) bonus +3.
// Urutan kartu: 2 terendah ... As tertinggi. Kombinasi 5 kartu: High card < Pair < Two pair < Three < Straight < Flush < Full house < Four < Straight flush.
// Depan (3 kartu) hanya High card / Pair / Three.
export const CapsaRules={id:'classic',name:'Capsa',minPlayers:2,maxPlayers:4,scoopBonus:3};
export const CAT_NAME_5=['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'];
export const CAT_NAME_3=['High card','Pair','Three of a kind'];
