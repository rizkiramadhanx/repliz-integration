// Fungsi ini dijalankan DI DALAM halaman profil, bukan di popup — karena itu
// ia memakai sesi login browser yang sedang aktif. Inilah yang membuatnya
// lolos dari CAPTCHA yang memblokir scraping otomatis dari server.
async function collectUrls(limit) {
  const host = location.hostname;
  const seen = new Set();
  const urls = [];

  const push = (url) => {
    if (!url || seen.has(url) || urls.length >= limit) return;
    seen.add(url);
    urls.push(url);
  };

  // Satu putaran pemindaian atas tautan yang SEDANG ada di DOM.
  const scan = () => {
  const anchors = Array.from(document.querySelectorAll('a[href]'));

  if (host.includes('tiktok.com')) {
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      // Hanya tautan video milik profil, bukan tautan musik/tag.
      const match = href.match(/\/@([^/]+)\/video\/(\d{15,25})/);
      if (match) push(`https://www.tiktok.com/@${match[1]}/video/${match[2]}`);
    }
  } else if (host.includes('instagram.com')) {
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/(p|reel)\/([A-Za-z0-9_-]+)/);
      if (match) push(`https://www.instagram.com/${match[1]}/${match[2]}/`);
    }
  } else if (host.includes('facebook.com')) {
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      // Reel dan video punya bentuk URL berbeda; keduanya dinormalkan ke
      // bentuk kanonik supaya sisi server tidak perlu menebak.
      const reel = href.match(/\/reel\/(\d+)/);
      if (reel) {
        push(`https://www.facebook.com/reel/${reel[1]}/`);
        continue;
      }
      const video = href.match(/\/videos\/(\d+)/);
      if (video) push(`https://www.facebook.com/watch/?v=${video[1]}`);
    }
  } else {
    return false;
  }
  return true;
  };

  if (!scan()) {
    return { error: 'Halaman ini bukan TikTok, Instagram, atau Facebook.' };
  }

  // Ketiga situs memuat konten sambil digulir DAN membuang postingan yang
  // sudah jauh di luar layar. Sekali pindai hanya menangkap yang kebetulan
  // sedang dirender — untuk ratusan URL halaman harus digulir sambil
  // dikumpulkan berulang, kalau tidak hasilnya berhenti di angka kecil
  // berapa pun batas yang diminta.
  let idle = 0;
  const MAX_IDLE = 6;
  const MAX_SCROLL = 400;

  // Penanda dibaca dari `window` halaman, bukan variabel lokal, supaya popup
  // bisa menghentikan penggulingan yang sedang berjalan lewat skrip terpisah.
  window.__replizStop = false;
  let stopped = false;

  for (let i = 0; i < MAX_SCROLL && urls.length < limit; i += 1) {
    if (window.__replizStop) {
      stopped = true;
      break;
    }

    const before = urls.length;
    const height = document.body.scrollHeight;

    window.scrollTo(0, height);
    await new Promise((r) => setTimeout(r, 900));
    scan();

    // Berhenti bila beberapa putaran berturut-turut tidak menambah URL baru
    // dan halaman tidak lagi bertambah panjang — tanda sudah mentok.
    const stalled =
      urls.length === before && document.body.scrollHeight === height;
    idle = stalled ? idle + 1 : 0;
    if (idle >= MAX_IDLE) break;
  }

  return {
    urls,
    host,
    reachedLimit: urls.length >= limit,
    stopped: stopped || window.__replizStop === true,
  };
}

const statusEl = document.getElementById('status');
const outEl = document.getElementById('out');
const copyBtn = document.getElementById('copy');

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

const grabBtn = document.getElementById('grab');
const stopBtn = document.getElementById('stop');

// Menyetel penanda di halaman. Penggulingan berhenti pada putaran berikutnya
// dan TETAP mengembalikan URL yang sudah terkumpul — bukan membatalkan.
stopBtn.addEventListener('click', async () => {
  stopBtn.disabled = true;
  setStatus('Menghentikan… menunggu putaran berjalan selesai.');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      window.__replizStop = true;
    },
  });
});

grabBtn.addEventListener('click', async () => {
  setStatus('Mengambil… halaman digulir otomatis. Tekan Berhenti kapan saja.');
  copyBtn.disabled = true;
  grabBtn.disabled = true;
  stopBtn.disabled = false;
  outEl.value = '';

  // Selaras dengan MAX_URLS_PER_IMPORT di backend: mengambil lebih banyak
  // dari yang bisa diimpor hanya membuat sisanya ditolak saat ditempel.
  const limit = Math.max(
    1,
    Math.min(2000, Number(document.getElementById('limit').value) || 25),
  );

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('Tab aktif tidak ditemukan.');

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: collectUrls,
      args: [limit],
    });

    const data = result?.result;
    if (data?.error) {
      setStatus(data.error, 'err');
      return;
    }

    const urls = data?.urls ?? [];
    if (urls.length === 0) {
      // Nol URL hampir selalu berarti kontennya belum ter-render, bukan
      // profilnya kosong — jadi sarannya scroll, bukan ganti halaman.
      setStatus(
        'Tidak ada URL ditemukan. Pastikan ini halaman profil dan kontennya sudah tampil.',
        'err',
      );
      return;
    }

    outEl.value = urls.join('\n');
    copyBtn.disabled = false;
    // Dibedakan supaya jelas apakah angkanya dibatasi oleh permintaan atau
    // memang segitu yang tersedia — tanpa ini, hasil 25 dari 500 postingan
    // terbaca seolah profilnya cuma punya 25.
    setStatus(
      data?.stopped
        ? `${urls.length} URL terkumpul sebelum dihentikan.`
        : data?.reachedLimit
          ? `${urls.length} URL diambil (mencapai batas yang diminta).`
          : `${urls.length} URL ditemukan — seluruh profil sudah tergulir.`,
      'ok',
    );
  } catch (error) {
    setStatus('Gagal: ' + (error?.message ?? error), 'err');
  } finally {
    grabBtn.disabled = false;
    stopBtn.disabled = true;
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(outEl.value);
    setStatus('Tersalin ke clipboard.', 'ok');
  } catch {
    // Sebagian versi Chrome menolak clipboard API di popup; pilih teksnya
    // supaya pengguna tetap bisa menyalin manual.
    outEl.removeAttribute('readonly');
    outEl.select();
    setStatus('Tekan Cmd/Ctrl+C untuk menyalin.', 'ok');
  }
});
