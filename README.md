# Gerai PPIM — Dashboard Puteri Slayy 🍜

Dashboard kewangan mudah alih untuk Gerai No. 2 Puteri Islam, Hari Kokurikulum SMK Bandar Baru Sungai Lalang 2026.

## Ciri-ciri

- Mengurus menu, harga, sasaran jualan dan jumlah yang benar-benar terjual.
- Mencatat setiap pembelian/barang dan modal penyumbang.
- Mengira secara automatik jumlah kos, hasil jualan, untung/rugi, kos seunit dan baki modal.
- Membezakan **Unjuran** (sasaran jualan) dengan **Sebenar** (unit yang telah dijual).
- Mengagihkan **untung bersih positif** kepada sekolah (60%) dan simpanan (40%). Kadar boleh diubah.
- Butang **+1 / −1** untuk merekod jualan secara pantas menggunakan telefon.
- Laporan WhatsApp, eksport CSV, serta eksport/import sandaran JSON.
- Simpan data secara automatik pada pelayar/peranti yang digunakan (localStorage).

## Cara guna

1. Buka `index.html` dalam pelayar atau buka laman melalui GitHub Pages.
2. Pada **Rekod Jualan**, isikan harga dan sasaran yang diperlukan (jualan air bermula kosong kerana harga dan kuantitinya belum diberikan).
3. Semak atau edit perbelanjaan dan sumber modal.
4. Semasa Hari Kokurikulum, tekan **+1** pada setiap jualan atau isi `Terjual` secara manual.
5. Gunakan mod **Sebenar** untuk melihat keuntungan semasa, kemudian buka **Laporan & Eksport** untuk menghantar laporan WhatsApp.

Data permulaan ialah RM642.32 kos dan modal, 150 bekas ramen × RM6.00 serta 100 batang aiskrim × RM1.50. Keuntungan awal ramen + aiskrim ialah RM461.18, tetapi **keuntungan keseluruhan** pada unjuran awal ialah RM407.68 kerana RM53.50 kos air telah dibelanjakan sedangkan hasil jualan air belum dimasukkan. Agihan 60/40 dibuat berdasarkan keuntungan keseluruhan itu dan akan dikira semula selepas data air diisi.

## Terbitkan sebagai GitHub Pages

Di GitHub, buka **Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/ (root)` → Save**. Laman biasanya akan tersedia di:

`https://farshoffs.github.io/geraippim/`

Tiada build, package manager atau API diperlukan.

## Penting: Penyimpanan data

Data disimpan dalam *localStorage*, bukan terus dalam GitHub. Ia berbeza bagi setiap pelayar dan peranti dan boleh hilang jika data pelayar dipadam. Gunakan **Sandaran data JSON** untuk berpindah telefon/komputer dan **Import sandaran JSON** untuk memulihkannya. Jika memerlukan rekod diselaraskan serentak di beberapa telefon, perlu tambah storan awan/backend.
