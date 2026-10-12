// Angka acak aman (crypto) untuk dadu, pilihan acak, dll.
export const randInt=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
export const pick=a=>a[randInt(a.length)];
