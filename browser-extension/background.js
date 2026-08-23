importScripts('config.js');

// Semua panggilan jaringan dijalankan di sini, bukan di content script:
// permintaan dari service worker tidak membawa Origin halaman, sehingga
// lolos CORS backend tanpa perlu mengizinkan threads.com/x.com.

let cachedToken = null;

async function backendToken() {
  if (cachedToken) return cachedToken;

  const response = await fetch(`${CONFIG.BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: CONFIG.BACKEND_EMAIL,
      password: CONFIG.BACKEND_PASSWORD,
    }),
  });

  const body = await response.json();
  const token = body?.data?.access_token;
  if (!token) throw new Error('Login backend gagal');

  cachedToken = token;
  return token;
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  // Dipotong per blok: memanggil fromCharCode dengan ratusan ribu argumen
  // sekaligus melebihi batas argumen dan melempar RangeError.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Mengambil media memakai sesi browser (cookie ikut terkirim), lalu
// menitipkannya ke backend supaya punya URL publik. CDN Threads/Instagram
// menolak permintaan dari server luar, jadi langkah ini tidak bisa dilewati.
async function uploadMedia(mediaUrl) {
  const response = await fetch(mediaUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Gagal mengambil media (${response.status})`);
  }

  const contentType = (response.headers.get('content-type') || '')
    .split(';')[0]
    .trim();
  const buffer = await response.arrayBuffer();

  const token = await backendToken();
  const upload = await fetch(
    `${CONFIG.BACKEND_URL}/api/repliz-sync/media-upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contentType,
        dataBase64: bufferToBase64(buffer),
      }),
    },
  );

  const body = await upload.json();
  if (!upload.ok || !body?.data?.url) {
    throw new Error(body?.message || 'Gagal menyimpan media di server');
  }
  return body.data.url;
}

function replizAuthHeader() {
  return `Basic ${btoa(
    `${CONFIG.REPLIZ_ACCESS_KEY}:${CONFIG.REPLIZ_SECRET_KEY}`,
  )}`;
}

async function createSchedule({ accountId, description, medias, publishAt }) {
  // Repliz menolak `reel` saat menerbitkan meski menerimanya saat dibuat,
  // jadi video selalu dikirim sebagai `video`.
  let type = 'text';
  if (medias.length === 1) type = medias[0].type;
  else if (medias.length > 1) type = 'album';

  const response = await fetch('https://api.repliz.com/public/schedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: replizAuthHeader(),
    },
    body: JSON.stringify({
      title: '',
      description,
      type,
      medias,
      accountId,
      scheduleAt: publishAt,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `Repliz membalas HTTP ${response.status}`);
  }
  return body;
}

// Daftar akun diambil langsung dari Repliz, bukan dari daftar tetap di
// config: akun baru yang dihubungkan akan langsung muncul tanpa perlu
// menyunting berkas apa pun.
let cachedAccounts = null;

async function listThreadsAccounts() {
  if (cachedAccounts) return cachedAccounts;

  const response = await fetch(
    'https://api.repliz.com/public/account?page=1&limit=100',
    { headers: { Authorization: replizAuthHeader() } },
  );
  if (!response.ok) {
    throw new Error(`Gagal mengambil akun (HTTP ${response.status})`);
  }

  const body = await response.json();
  const accounts = (body?.docs ?? [])
    .filter((item) => item?.type === 'threads')
    .map((item) => ({
      id: item._id,
      name: item.name || `@${item.username ?? ''}`,
    }));

  cachedAccounts = accounts;
  return accounts;
}

async function handleClone(payload) {
  const accountId = payload.accountId;
  if (!accountId) throw new Error('Akun tujuan belum dipilih');

  const medias = [];
  for (const item of payload.media.slice(0, 10)) {
    const url = await uploadMedia(item.url);
    medias.push({ url, type: item.type });
  }

  const publishAt = new Date(
    Date.now() + CONFIG.PUBLISH_DELAY_MINUTES * 60 * 1000,
  ).toISOString();

  await createSchedule({
    accountId,
    description: payload.text,
    medias,
    publishAt,
  });

  return publishAt;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.kind === 'accounts') {
    listThreadsAccounts()
      .then((accounts) => sendResponse({ ok: true, accounts }))
      .catch((error) =>
        sendResponse({ ok: false, error: error?.message ?? String(error) }),
      );
    return true;
  }

  if (message?.kind !== 'clone') return false;

  handleClone(message.payload)
    .then((publishAt) =>
      sendResponse({
        ok: true,
        publishAt: new Date(publishAt).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }),
    )
    .catch((error) => {
      // Token bisa kedaluwarsa; dibuang agar percobaan berikutnya login ulang.
      cachedToken = null;
      sendResponse({ ok: false, error: error?.message ?? String(error) });
    });

  // true = respons dikirim asinkron.
  return true;
});
