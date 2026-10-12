// Catur standar FIDE: langkah legal, skak, skakmat, stalemate, rokade, en passant, promosi,
// seri (remis 50 langkah, pengulangan 3x, materi kurang), menyerah, tawaran seri.
// Waktu: batas waktu per langkah (pengaturan host); jika habis, langkah dimainkan otomatis.
export const ChessRules={id:'standard',name:'Catur',startFen:'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',minPlayers:2,maxPlayers:2};
export const PIECE_VALUE={p:1,n:3,b:3,r:5,q:9,k:0};
