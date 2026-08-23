// Setelan extension. Kunci Repliz ditanam di sini sesuai permintaan —
// PERLU DIINGAT: siapa pun yang bisa membuka folder extension ini (atau
// perangkat tempat ia terpasang) bisa membaca kuncinya. Jangan bagikan
// folder ini, dan rotasi kuncinya di Repliz bila perangkat berpindah tangan.
const CONFIG = {
  // Basis URL backend kita — dipakai untuk menitipkan media agar punya URL
  // publik yang bisa diunduh Repliz.
  BACKEND_URL: 'https://api.woipan.tech',

  // Login backend, dipakai mengambil token untuk endpoint media-upload.
  BACKEND_EMAIL: 'admin@example.com',
  BACKEND_PASSWORD: 'GANTI_PASSWORD',

  // Kredensial Repliz (Basic Auth: base64(ACCESS_KEY:SECRET_KEY)).
  REPLIZ_ACCESS_KEY: 'GANTI_ACCESS_KEY',
  REPLIZ_SECRET_KEY: 'GANTI_SECRET_KEY',

  // Akun Threads tujuan. Isi id-nya dari daftar akun Repliz.
  TARGET_ACCOUNTS: [
    { id: '6a85ba7162caae1e04feba27', name: 'Cucicuci | Kasir Laundry' },
  ],

  // Jeda sebelum terbit. Repliz berbasis jadwal, jadi "posting sekarang"
  // diwujudkan sebagai jadwal beberapa menit ke depan — sekaligus menyisakan
  // waktu membatalkan dari dashboard Repliz bila salah klik.
  PUBLISH_DELAY_MINUTES: 2,
};
