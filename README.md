# Business WhatsApp Finder V4 — Free Multi-Source

Web app static untuk mencari **nomor telepon seluler bisnis yang dipublikasikan secara terbuka**, lalu menormalkannya menjadi format Indonesia `62xxxxxxxxxx`.

## Sumber

1. **Geoapify Places + Place data berbasis OpenStreetMap**.
2. **OpenStreetMap/Overpass** secara langsung sebagai jalur sumber kedua.

Kedua jalur dapat menghasilkan data yang berasal dari OpenStreetMap; label sumber dipisahkan supaya pengguna tahu jalur pengambilannya.

## Kenapa bukan langsung Google Maps?

Project ini ditujukan untuk biaya **Rp0 dalam batas layanan gratis**, sehingga tidak menggunakan Google Places API.

## Cara pakai

1. Buat akun Geoapify gratis.
2. Buat API key.
3. Batasi key menggunakan HTTP referrer/origin pada dashboard Geoapify.
4. Upload semua file ke repository GitHub public.
5. Aktifkan GitHub Pages.
6. Buka URL Pages.
7. Masukkan API key di browser.
8. Isi keyword dan lokasi.
9. Klik **Cari Nomor**.

API key tidak ditulis ke source code. Namun karena aplikasi static memanggil Geoapify langsung dari browser, key secara teknis tetap terlihat pada network request. Karena itu gunakan pembatasan HTTP referrer/origin dan jangan memakai key untuk aplikasi lain.

## Penting

- Aplikasi hanya mengambil nomor kontak yang tersedia secara publik.
- Aplikasi **tidak** menguji apakah nomor tertentu memiliki akun WhatsApp.
- Link `wa.me` dibentuk sebagai shortcut dari nomor telepon bisnis yang ditemukan; ini **bukan bukti** bahwa akun WhatsApp tersebut aktif.
- Coverage bergantung pada data OpenStreetMap dan pembaruan kontributor.
- Geoapify free plan saat ini menyediakan 3.000 credits/hari; biaya Places bergantung pada jumlah hasil. Jangan mengakali kuota atau melakukan bulk harvesting.
- Overpass adalah layanan publik bersama. Gunakan secara wajar.

## GitHub Pages

Settings → Pages → Deploy from branch → `main` → `/ (root)` → Save.

## Disclaimer

Project ini adalah alat pencarian data bisnis publik. Gunakan hanya untuk kebutuhan yang sah, hormati ketentuan sumber data, privasi, dan kebijakan anti-spam.
