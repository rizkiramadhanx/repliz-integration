// Fungsi ini dijalankan DI DALAM halaman profil, bukan di popup — karena itu
// ia memakai sesi login browser yang sedang aktif. Inilah yang membuatnya
// lolos dari CAPTCHA yang memblokir scraping otomatis dari server.
function collectUrls(limit) {
  const host = location.hostname;
  const seen = new Set();
  const urls = [];

  const push = (url) => {
    if (!url || seen.has(url) || urls.length >= limit) return;
    seen.add(url);
    urls.push(url);
  };

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
    return { error: 'Halaman ini bukan TikTok, Instagram, atau Facebook.' };
  }

  return { urls, host };
}

const statusEl = document.getElementById('status');
const outEl = document.getElementById('out');
const copyBtn = document.getElementById('copy');

function setStatus(text, kind) {
  statusEl.textContent = text;
  statusEl.className = 'status' + (kind ? ' ' + kind : '');
}

document.getElementById('grab').addEventListener('click', async () => {
  setStatus('Mengambil…');
  copyBtn.disabled = true;
  outEl.value = '';

  const limit = Math.max(
    1,
    Math.min(200, Number(document.getElementById('limit').value) || 25),
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
        'Tidak ada URL ditemukan. Scroll halaman dulu agar konten dimuat.',
        'err',
      );
      return;
    }

    outEl.value = urls.join('\n');
    copyBtn.disabled = false;
    setStatus(`${urls.length} URL ditemukan.`, 'ok');
  } catch (error) {
    setStatus('Gagal: ' + (error?.message ?? error), 'err');
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
