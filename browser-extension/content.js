// Berjalan DI DALAM halaman Threads/X. Membaca isi postingan langsung dari
// DOM — bukan lewat API pihak ketiga — karena downloader publik untuk Threads
// mengembalikan teks navigasi UI dan foto profil, bukan isi postingannya.
// Membaca DOM juga memakai sesi login pengguna, jadi tidak kena tembok login.

const BUTTON_CLASS = 'repliz-clone-btn';
const SELECT_CLASS = 'repliz-clone-select';
const STORAGE_KEY = 'replizLastAccountId';

// Daftar akun diambil sekali per halaman lalu dipakai ulang oleh semua
// tombol — memanggilnya per postingan akan membanjiri Repliz saat linimasa
// digulir.
let accountsPromise = null;

function loadAccounts() {
  if (!accountsPromise) {
    accountsPromise = chrome.runtime
      .sendMessage({ kind: 'accounts' })
      .then((res) => (res?.ok ? res.accounts : []))
      .catch(() => []);
  }
  return accountsPromise;
}

function detectPlatform() {
  const host = location.hostname;
  if (host.includes('threads.com') || host.includes('threads.net')) {
    return 'threads';
  }
  if (host.includes('x.com') || host.includes('twitter.com')) return 'x';
  return null;
}

// Membuang elemen yang bukan bagian dari isi postingan. Tanpa ini, teks
// tombol ("Suka", "Balas", jumlah reaksi) ikut terbawa ke caption.
const NOISE_SELECTOR = [
  'button',
  '[role="button"]',
  'time',
  '[role="group"]',
  'svg',
  // Dropdown milik extension sendiri: tanpa ini nama akun ikut terbaca
  // sebagai bagian caption.
  'select',
].join(',');

function extractText(article) {
  const clone = article.cloneNode(true);
  clone.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove());
  clone.querySelectorAll(`.${BUTTON_CLASS}, .${SELECT_CLASS}`).forEach((el) =>
    el.remove(),
  );

  // X menandai isi tweet secara eksplisit; Threads tidak, jadi seluruh teks
  // yang tersisa dipakai.
  const tweetText = clone.querySelector('[data-testid="tweetText"]');
  const source = tweetText ?? clone;

  // innerText mengikuti tata letak dan memberi baris baru yang rapi, tapi
  // nilainya kosong bila elemen tidak sedang dirender. textContent selalu
  // terisi, jadi dipakai sebagai cadangan.
  const raw = source.innerText || source.textContent || '';

  return [raw]
    .join('\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

// Hanya media milik postingan yang diambil. Avatar dan emoji ikut muncul
// sebagai <img>, jadi disaring lewat pola URL-nya: t51.2885-19 adalah foto
// profil Instagram/Threads, dan /emoji/ adalah ikon.
// Foto profil di Threads/Instagram memakai akhiran "-19" pada segmen jenis
// berkas (t51.2885-19 DAN t51.82787-19), sedangkan media postingan memakai
// "-15". Menyaring hanya t51.2885-19 tidak cukup — varian 82787-19 lolos dan
// avatar ikut terkirim.
function isProfilePicture(src) {
  return /t51\.\d+-19\//.test(src);
}

function isContentImage(src, img) {
  if (!src || !/^https?:/i.test(src)) return false;
  if (isProfilePicture(src)) return false;
  if (/\/emoji\//.test(src)) return false;
  if (/profile_images/.test(src)) return false;
  if (/\/svg\//.test(src)) return false;

  if (img) {
    // Avatar selalu kecil dan persegi. Ukuran dipakai sebagai penyaring
    // kedua karena pola URL bisa berubah sewaktu-waktu, sedangkan bentuk
    // avatar tidak.
    const width = img.naturalWidth || img.width || 0;
    const height = img.naturalHeight || img.height || 0;
    if (width && height && width <= 160 && height <= 160) return false;

    // Threads/X memberi label pada avatar; teks alt-nya menyebut foto profil.
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    if (/profile picture|foto profil|avatar/.test(alt)) return false;

    // Avatar berada di dalam tautan menuju profil, bukan menuju postingan.
    const link = img.closest('a[href]');
    const href = link?.getAttribute('href') ?? '';
    if (href && /^\/@[^/]+\/?$/.test(href)) return false;
  }

  return true;
}

// Threads dan X memutar video lewat MediaSource, sehingga <video>.src berisi
// "blob:..." — bukan berkas yang bisa diunduh, dan blob terikat pada dokumen
// pembuatnya sehingga service worker pun tidak bisa mengambilnya. URL asli
// biasanya masih tersedia di <source> atau atribut lain, jadi itu yang dicari
// lebih dulu.
function findVideoUrl(video) {
  const candidates = [
    video.getAttribute('src'),
    ...Array.from(video.querySelectorAll('source')).map((source) =>
      source.getAttribute('src'),
    ),
    video.getAttribute('data-src'),
  ];

  for (const candidate of candidates) {
    if (candidate && /^https?:/i.test(candidate)) return candidate;
  }
  return null;
}

function extractMedia(article) {
  const media = [];
  const seen = new Set();
  let blockedVideo = false;

  article.querySelectorAll('video').forEach((video) => {
    const src = findVideoUrl(video);
    if (!src) {
      // Ada video tapi URL-nya tidak bisa diambil (blob/MediaSource).
      blockedVideo = true;
      return;
    }
    if (!seen.has(src)) {
      seen.add(src);
      media.push({ type: 'video', url: src });
    }
  });

  // Video diprioritaskan: bila postingan berisi video, <img> yang ada hanyalah
  // sampulnya dan tidak boleh ikut terkirim sebagai foto terpisah.
  if (media.length > 0) return media;

  // Postingan video yang URL-nya tidak terbaca TIDAK boleh diam-diam jatuh ke
  // gambar: yang terkirim akan berupa sampulnya saja, dan pengguna mengira
  // videonya sudah ikut. Lebih baik dilaporkan sebagai gagal.
  if (blockedVideo) {
    // Ditandai pada array agar bentuk kembaliannya tetap sama bagi pemanggil.
    media.blockedVideo = true;
    return media;
  }

  article.querySelectorAll('img').forEach((img) => {
    const src = img.src || '';
    if (isContentImage(src, img) && !seen.has(src)) {
      seen.add(src);
      media.push({ type: 'image', url: src });
    }
  });

  return media;
}

function findPostUrl(article) {
  const anchors = Array.from(article.querySelectorAll('a[href]'));
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (/\/post\/|\/status\//.test(href)) {
      return new URL(href, location.origin).href;
    }
  }
  return location.href;
}

function setButtonState(button, text, disabled) {
  button.textContent = text;
  button.disabled = Boolean(disabled);
  button.style.opacity = disabled ? '0.6' : '1';
}

// Pratinjau sebelum mengirim. Yang ditampilkan adalah hasil ekstraksi yang
// SEBENARNYA akan dikirim — bukan tampilan aslinya — supaya kesalahan
// pembacaan DOM (caption terpotong, gambar salah) terlihat sebelum terbit,
// bukan setelahnya.
function confirmDialog({ text, media, accountName }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(0,0,0,.55)',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:16px',
    ].join(';');

    const panel = document.createElement('div');
    panel.style.cssText = [
      'background:#fff',
      'color:#212529',
      'border-radius:10px',
      'max-width:460px',
      'width:100%',
      'max-height:80vh',
      'overflow:auto',
      'padding:16px',
      'font-family:system-ui,sans-serif',
      'box-shadow:0 10px 40px rgba(0,0,0,.3)',
    ].join(';');

    const title = document.createElement('div');
    title.textContent = 'Kirim ke Threads?';
    title.style.cssText = 'font-weight:700;font-size:15px;margin-bottom:10px';
    panel.appendChild(title);

    const target = document.createElement('div');
    target.style.cssText = 'font-size:12px;margin-bottom:10px';
    target.innerHTML = `<b>Akun tujuan:</b> ${escapeHtml(accountName)}`;
    panel.appendChild(target);

    const capLabel = document.createElement('div');
    capLabel.style.cssText =
      'font-size:12px;font-weight:600;margin:10px 0 4px';
    capLabel.textContent = `Caption (${text.length} karakter)`;
    panel.appendChild(capLabel);

    // Caption ditaruh di textarea agar bisa disunting sebelum kirim —
    // pembacaan DOM tidak selalu sempurna.
    const capBox = document.createElement('textarea');
    capBox.value = text;
    capBox.style.cssText = [
      'width:100%',
      'min-height:90px',
      'font-size:12px',
      'font-family:inherit',
      'padding:8px',
      'border:1px solid #ced4da',
      'border-radius:6px',
      'box-sizing:border-box',
    ].join(';');
    panel.appendChild(capBox);

    const mediaLabel = document.createElement('div');
    mediaLabel.style.cssText =
      'font-size:12px;font-weight:600;margin:12px 0 6px';
    mediaLabel.textContent =
      media.length === 0
        ? 'Media: tidak ada (akan dikirim sebagai teks)'
        : `Media: ${media.length} ${media[0].type === 'video' ? 'video' : 'foto'}`;
    panel.appendChild(mediaLabel);

    if (media.length > 0) {
      const strip = document.createElement('div');
      strip.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
      for (const item of media) {
        if (item.type === 'video') {
          const vid = document.createElement('video');
          vid.src = item.url;
          vid.controls = true;
          vid.style.cssText =
            'width:150px;border-radius:6px;border:1px solid #dee2e6';
          strip.appendChild(vid);
        } else {
          const img = document.createElement('img');
          img.src = item.url;
          img.style.cssText =
            'width:84px;height:84px;object-fit:cover;border-radius:6px;border:1px solid #dee2e6';
          strip.appendChild(img);
        }
      }
      panel.appendChild(strip);
    }

    const actions = document.createElement('div');
    actions.style.cssText =
      'display:flex;gap:8px;justify-content:flex-end;margin-top:16px';

    const cancel = document.createElement('button');
    cancel.textContent = 'Batal';
    cancel.style.cssText =
      'padding:6px 14px;font-size:13px;border-radius:6px;border:1px solid #ced4da;background:#fff;cursor:pointer';

    const confirm = document.createElement('button');
    confirm.textContent = 'Kirim';
    confirm.style.cssText =
      'padding:6px 14px;font-size:13px;border-radius:6px;border:1px solid #4c6ef5;background:#4c6ef5;color:#fff;cursor:pointer;font-weight:600';

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    cancel.addEventListener('click', () => close(null));
    confirm.addEventListener('click', () => close({ text: capBox.value }));
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close(null);
    });

    actions.appendChild(cancel);
    actions.appendChild(confirm);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
}

async function handleClone(button, select, article, platform) {
  const accountId = select.value;
  if (!accountId) {
    setButtonState(button, 'Pilih akun dulu', true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 2500);
    return;
  }

  const text = extractText(article);
  const media = extractMedia(article);

  if (media.blockedVideo) {
    setButtonState(button, 'Video tidak bisa diambil', true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 4000);
    return;
  }

  if (!text && media.length === 0) {
    setButtonState(button, 'Kosong — tidak ada isi', true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 2500);
    return;
  }

  const accountName =
    select.options[select.selectedIndex]?.textContent ?? accountId;
  const confirmed = await confirmDialog({ text, media, accountName });
  if (!confirmed) return;

  setButtonState(button, 'Mengirim…', true);

  const response = await chrome.runtime.sendMessage({
    kind: 'clone',
    payload: {
      text: confirmed.text,
      media,
      accountId,
      sourceUrl: findPostUrl(article),
      platform,
    },
  });

  if (response?.ok) {
    setButtonState(button, `Terjadwal ✓ ${response.publishAt ?? ''}`.trim(), true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 6000);
  } else {
    setButtonState(button, `Gagal: ${(response?.error ?? '').slice(0, 40)}`, true);
    setTimeout(() => setButtonState(button, 'Clone to Threads', false), 6000);
  }
}

function buildSelect() {
  const select = document.createElement('select');
  select.className = SELECT_CLASS;
  select.style.cssText = [
    'margin:8px 6px 8px 0',
    'padding:4px 6px',
    'font-size:12px',
    'border-radius:6px',
    'border:1px solid #ced4da',
    'background:#fff',
    'color:#212529',
    'max-width:190px',
    'position:relative',
    'z-index:9999',
  ].join(';');

  const loading = document.createElement('option');
  loading.textContent = 'Memuat akun…';
  loading.value = '';
  select.appendChild(loading);

  // Klik pada dropdown tidak boleh merambat: di Threads/X, klik di area
  // postingan membuka halaman detail.
  select.addEventListener('click', (event) => event.stopPropagation());

  void loadAccounts().then((accounts) => {
    select.innerHTML = '';

    if (accounts.length === 0) {
      const empty = document.createElement('option');
      empty.textContent = 'Tidak ada akun Threads';
      empty.value = '';
      select.appendChild(empty);
      return;
    }

    for (const account of accounts) {
      const option = document.createElement('option');
      option.value = account.id;
      option.textContent = account.name;
      select.appendChild(option);
    }

    // Pilihan terakhir diingat supaya kloning beruntun tidak perlu memilih
    // akun berulang kali.
    chrome.storage?.local?.get(STORAGE_KEY, (stored) => {
      const last = stored?.[STORAGE_KEY];
      if (last && accounts.some((account) => account.id === last)) {
        select.value = last;
      }
    });
  });

  select.addEventListener('change', () => {
    chrome.storage?.local?.set({ [STORAGE_KEY]: select.value });
    // Semua dropdown lain ikut disamakan agar pilihannya konsisten
    // sepanjang linimasa.
    document.querySelectorAll(`.${SELECT_CLASS}`).forEach((other) => {
      if (other !== select) other.value = select.value;
    });
  });

  return select;
}

function buildButton(article, platform, select) {
  const button = document.createElement('button');
  button.className = BUTTON_CLASS;
  button.textContent = 'Clone to Threads';
  button.style.cssText = [
    'margin:8px 0',
    'padding:4px 10px',
    'font-size:12px',
    'font-weight:600',
    'border-radius:6px',
    'border:1px solid #4c6ef5',
    'background:#4c6ef5',
    'color:#fff',
    'cursor:pointer',
    'position:relative',
    'z-index:9999',
  ].join(';');

  // Klik pada postingan biasanya membuka halaman detail; dihentikan supaya
  // menekan tombol tidak ikut berpindah halaman.
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    void handleClone(button, select, article, platform);
  });

  return button;
}

function injectButtons(platform) {
  const articles = document.querySelectorAll('article, [data-pressable-container]');
  for (const article of articles) {
    if (article.querySelector(`.${BUTTON_CLASS}`)) continue;
    // Postingan yang belum ter-render penuh dilewati; akan dicoba lagi pada
    // pemindaian berikutnya.
    const content = article.innerText || article.textContent || '';
    if (content.trim().length < 2) continue;

    // Dropdown dan tombol dibungkus satu wadah supaya tata letak halaman
    // tidak menyisipkan elemen lain di antara keduanya.
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap';

    const select = buildSelect();
    bar.appendChild(select);
    bar.appendChild(buildButton(article, platform, select));
    article.appendChild(bar);
  }
}

const platform = detectPlatform();
if (platform) {
  injectButtons(platform);
  // Threads dan X memuat postingan sambil digulir, jadi tombol harus dipasang
  // ulang untuk elemen yang baru muncul. Diberi jeda supaya tidak memindai
  // pada setiap perubahan kecil.
  let pending = null;
  new MutationObserver(() => {
    if (pending) return;
    pending = setTimeout(() => {
      pending = null;
      injectButtons(platform);
    }, 600);
  }).observe(document.body, { childList: true, subtree: true });
}
