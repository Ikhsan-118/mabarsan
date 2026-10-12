# MabarRoom — Login & Register

Backend auth = Netlify Functions + Netlify Blobs (gratis, tanpa layanan database tambahan). Gameplay tetap P2P (PeerJS).

## Deploy (Netlify, deploy dari Git — bukan drag-and-drop, karena Functions perlu build)
1. Push folder ini ke GitHub, lalu Netlify → *Add new site → Import from Git*. Pengaturan build sudah ada di `netlify.toml`.
2. Site configuration → Environment variables:
   - `AUTH_SECRET` (wajib): `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `METERED_APP`, `METERED_API_KEY` (opsional, TURN). **Rotasi API key lama** — sebelumnya pernah ada di `turn-config.json` (publik).
3. Deploy. Test lokal backend: `npm install && npm test`. Test penuh: `npx netlify dev`.

## Cara kerja identitas di room
Akun login → `S.user.id` (`u`+16 hex) dipakai sebagai id pemain di lobby/room/reconnect.
Saat join, klien minta **tiket** 90 detik terikat Team Code (`POST /api/ticket`); host memverifikasinya (`/api/verify-ticket`)
sehingga nama/id tidak bisa dipalsukan. Tanpa login = tamu (tetap didukung); tamu tidak bisa memakai id akun.

## Endpoint
`POST /api/register|login|logout|ticket|verify-ticket` · `GET /api/me` · `PATCH /api/profile`
Password: scrypt + salt. Session: cookie HttpOnly/Secure/SameSite=Lax. Ada rate limit login/register dan cek Origin (CSRF).

## Batasan yang diketahui
Statistik/rating masih dilaporkan oleh klien/host (P2P), jadi belum tahan manipulasi. Perlu fase terpisah.
