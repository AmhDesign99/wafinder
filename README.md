# Business WhatsApp Finder — Apify Edition

Versi online ringan untuk GitHub Pages. User memasukkan:
- Keyword
- Lokasi
- Jumlah tempat
- Apify API Token

Aplikasi menjalankan Actor `compass/crawler-google-places` melalui endpoint `run-sync-get-dataset-items`, lalu:
1. mengambil field phone/contact yang tersedia,
2. menormalisasi nomor Indonesia ke format `62...`,
3. menyaring pola nomor seluler Indonesia,
4. menghapus duplikat,
5. menyediakan copy dan export Excel.

## Pengaturan Actor yang dipakai

- `searchStringsArray`
- `locationQuery`
- `maxCrawledPlacesPerSearch`
- `language: id`
- mematikan social enrichment dan image enrichment.

Dokumentasi Actor:
https://apify.com/compass/crawler-google-places/input-schema

## Penting soal gratis

Apify Free saat ini memberikan $5/bulan untuk penggunaan platform/Store. Actor Google Maps Scraper yang dipakai di sini memiliki harga Store sendiri (halaman Actor menunjukkan mulai dari $1.50 / 1,000 scraped places). Pada paket Free, jika kredit habis, akses diblok sampai siklus berikutnya; tidak otomatis menagihkan overage pada paket Free. Tetap cek halaman Billing sebelum penggunaan besar.

## Keamanan token

Versi GitHub Pages ini meminta token di browser. Token tidak boleh ditaruh di source code atau di-commit ke GitHub. Untuk penggunaan publik, arsitektur yang lebih aman adalah GitHub Pages + Cloudflare Worker/serverless proxy sehingga token disimpan sebagai secret di serverless.

## WhatsApp

Nomor seluler bukan bukti bahwa nomor memiliki akun WhatsApp. Tombol `wa.me` hanya shortcut berdasarkan nomor yang ditemukan. Gunakan data untuk kontak bisnis yang sah dan patuhi ketentuan sumber.
